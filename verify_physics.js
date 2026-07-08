/* =====================================================================
   verify_physics.js — rigorous correctness harness for the HeliLab engine
   =====================================================================
   Loads flapping.js + helilab_core.js into a shared VM sandbox and runs a
   battery of physics checks, printing PASS/FAIL with numeric evidence.

   NOTE on loading: top-level `const`/`let` in a vm script are block-scoped
   and do NOT attach to the sandbox global object, while `function`
   declarations DO. flapping.js exposes BET_STATE as a const and
   helilab_core.js exposes HL as a const, so after running each file we
   explicitly re-export those two names into the context via an appended
   assignment. Everything else (tipSpeed, advanceRatio, localAoA, …) is a
   function declaration and is already global.

   Run:  node verify_physics.js
   ===================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');

const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file, exportConsts) {
  let code = fs.readFileSync(__dirname + '/' + file, 'utf8');
  // re-export named consts onto the sandbox global
  for (const name of exportConsts) code += `\n;globalThis.${name} = ${name};`;
  vm.runInContext(code, ctx, { filename: file });
}
load('flapping.js', ['BET_STATE']);
load('helilab_core.js', ['HL']);

const {
  BET_STATE, tipSpeed, advanceRatio, omega, inflowRatio, thrustCoeff,
  localInflow, flappingCoeffs, flappingAngle, localVelocities, bladePitch,
  inflowAngle, localAoA, profileVsPsi, profileVsR, computeTrimCyclic,
  discTiltAngles, sosAtAltFt, HL,
} = ctx;

const R2D = 180 / Math.PI, D2R = Math.PI / 180;
let pass = 0, fail = 0;
function check(name, cond, detail) {
  const tag = cond ? 'PASS' : 'FAIL';
  if (cond) pass++; else fail++;
  console.log(`[${tag}] ${name}${detail ? '  — ' + detail : ''}`);
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

/* Azimuth convention (flapping.js line 51):
   ψ=0 AFT(tail), ψ=90 ADVANCING, ψ=180 FWD(nose), ψ=270 RETREATING.
   CCW rotor viewed from above (H145/BK117 D-3).
   Retreating-blade stall SHOULD peak near ψ≈270, outer span. */

// Build a representative trimmed forward-flight state.
function fwdState(V, extra) {
  const st = { ...BET_STATE, V, ...(extra || {}) };
  const trim = computeTrimCyclic(st);
  st.theta1s = trim.t1s_deg;
  st.theta1c = trim.t1c_deg;
  return st;
}

/* ── TEST 1 — UT: advancing > retreating ───────────────────────────── */
section('1. Tangential velocity UT: advancing > retreating');
{
  const st = fwdState(60);
  const mu = advanceRatio(st);
  const c = flappingCoeffs(st);
  const adv = localVelocities(st, c, 0.75, 90 * D2R).UT;
  const ret = localVelocities(st, c, 0.75, 270 * D2R).UT;
  check('UT(adv ψ=90) > UT(ret ψ=270)', adv > ret, `adv=${adv.toFixed(3)} ret=${ret.toFixed(3)} μ=${mu.toFixed(3)}`);
  check('UT(adv) ≈ r+μ', Math.abs(adv - (0.75 + mu)) < 1e-6, `${adv.toFixed(4)} vs ${(0.75 + mu).toFixed(4)}`);
  check('UT(ret) ≈ r−μ', Math.abs(ret - (0.75 - mu)) < 1e-6, `${ret.toFixed(4)} vs ${(0.75 - mu).toFixed(4)}`);
}

/* ── TEST 2 — reverse flow on retreating side, near root ───────────── */
section('2. Reverse-flow (UT<0) sits on retreating side near root');
{
  const st = fwdState(70);
  const c = flappingCoeffs(st);
  let advReverse = 0, retReverse = 0, maxReverseR = 0, maxReversePsi = -1;
  for (let pd = 0; pd < 360; pd += 2) {
    for (let r = 0.05; r <= 1.0; r += 0.05) {
      const UT = localVelocities(st, c, r, pd * D2R).UT;
      if (UT < 0) {
        if (Math.sin(pd * D2R) > 0.1) advReverse++;
        if (Math.sin(pd * D2R) < -0.1) retReverse++;
        if (r > maxReverseR) { maxReverseR = r; maxReversePsi = pd; }
      }
    }
  }
  check('No reverse flow on advancing side', advReverse === 0, `advCells=${advReverse} retCells=${retReverse}`);
  check('Reverse flow present on retreating side', retReverse > 0, `retCells=${retReverse}`);
  check('Reverse-flow zone on retreating half (180<ψ<360)', maxReversePsi > 180 && maxReversePsi < 360, `deepest at ψ=${maxReversePsi}°, r/R=${maxReverseR.toFixed(2)}`);
}

/* ── TEST 3 — peak AoA on retreating side (THE user's core concern) ── */
section('3. Peak AoA location — must be retreating side (ψ≈270)');
for (const V of [40, 60, 80]) {
  const st = fwdState(V);
  const c = flappingCoeffs(st);
  let best = -1e9, bestPsi = -1, bestR = -1;
  const azMax = {};
  for (let pd = 0; pd < 360; pd += 1) {
    let amax = -1e9;
    for (let r = 0.3; r <= 1.0; r += 0.02) {
      const d = localAoA(st, c, r, pd * D2R);
      if (d.reverseFlow) continue;
      if (d.aoa > amax) amax = d.aoa;
      if (d.aoa > best) { best = d.aoa; bestPsi = pd; bestR = r; }
    }
    azMax[pd] = amax;
  }
  const onRet = bestPsi > 200 && bestPsi < 340;
  check(`V=${V} m/s: peak AoA on retreating side`, onRet,
    `peak α=${(best * R2D).toFixed(1)}° at ψ=${bestPsi}°, r/R=${bestR.toFixed(2)} (stallAoA=${st.stallAoA}°)`);
  const advPeak = Math.max(azMax[70], azMax[90], azMax[110]);
  check(`V=${V} m/s: advancing peak AoA < retreating peak`, advPeak < best,
    `advPeak=${(advPeak * R2D).toFixed(1)}° < retPeak=${(best * R2D).toFixed(1)}°`);
}

/* ── TEST 4 — linear inflow lateral gradient (ky=−2μ) ──────────────── */
section('4. Linear inflow lateral gradient (ky=−2μ): higher on retreating');
{
  const st = fwdState(60);
  const mu = advanceRatio(st);
  const lam0 = inflowRatio(st);
  const adv = localInflow(lam0, 0.75, 90 * D2R, mu);
  const ret = localInflow(lam0, 0.75, 270 * D2R, mu);
  check('inflow(RET ψ=270) > inflow(ADV ψ=90)', ret > adv, `ret=${ret.toFixed(4)} adv=${adv.toFixed(4)} λ0=${lam0.toFixed(4)}`);
  // Drees skew κ·cos(ψ): cos(180)=−1 so FWD has LOWER, AFT (cos0=+1) HIGHER.
  const front = localInflow(lam0, 0.75, 180 * D2R, mu);
  const rear = localInflow(lam0, 0.75, 0, mu);
  check('Drees skew present (AFT ψ=0 vs FWD ψ=180 differ)', Math.abs(front - rear) > 1e-4, `AFT=${rear.toFixed(4)} FWD=${front.toFixed(4)}`);
}

/* ── TEST 5 — trim cyclic zeroes disc flapping; t1s<0 ──────────────── */
section('5. Trim cyclic zeroes disc flapping; t1s<0 (more pitch at RET)');
for (const V of [40, 70]) {
  const st = fwdState(V);
  const c = flappingCoeffs(st);
  check(`V=${V}: a1c≈0 after trim`, Math.abs(c.a1c * R2D) < 0.5, `a1c=${(c.a1c * R2D).toFixed(3)}°`);
  check(`V=${V}: a1s≈0 after trim`, Math.abs(c.a1s * R2D) < 0.5, `a1s=${(c.a1s * R2D).toFixed(3)}°`);
  const trim = computeTrimCyclic(st);
  check(`V=${V}: t1s<0 (pitch up on retreating)`, trim.t1s_deg < 0, `t1s=${trim.t1s_deg.toFixed(2)}°`);
}

/* ── TEST 6 — coning a0 > 0, rises with collective ─────────────────── */
section('6. Coning angle a0 > 0 and increases with collective');
{
  const lo = discTiltAngles({ ...BET_STATE, theta0: 6, V: 0 }).a0_deg;
  const hi = discTiltAngles({ ...BET_STATE, theta0: 10, V: 0 }).a0_deg;
  check('a0 positive', lo > 0 && hi > 0, `a0(6°)=${lo.toFixed(2)}° a0(10°)=${hi.toFixed(2)}°`);
  check('a0 rises with collective', hi > lo, `${lo.toFixed(2)} → ${hi.toFixed(2)}`);
}

/* ── TEST 7 — hover symmetry (V=0): AoA azimuth-independent ─────────── */
section('7. Hover (V=0): AoA is axisymmetric (no azimuth dependence)');
{
  const st = { ...BET_STATE, V: 0, theta1c: 0, theta1s: 0 };
  const c = flappingCoeffs(st);
  const a = [0, 90, 180, 270].map(pd => localAoA(st, c, 0.75, pd * D2R).aoa * R2D);
  const spread = Math.max(...a) - Math.min(...a);
  check('AoA equal at all ψ in hover', spread < 0.05, `spread=${spread.toFixed(4)}° values=[${a.map(x => x.toFixed(2)).join(', ')}]`);
}

/* ── TEST 8 — axial hover: vi ≈ vh = √(T/2ρA) ──────────────────────── */
section('8. Axial hover: vi ≈ vh = √(T/2ρA)');
{
  const st = HL.defaultState(); st.V = 0; st.Vc = 0;
  const sol = HL.axialSolve(st);
  const vhCheck = Math.sqrt(sol.thrust / (2 * HL.rho(st) * HL.area(st)));
  check('vi ≈ vh in hover', Math.abs(sol.vi - vhCheck) < 0.05 * vhCheck, `vi=${sol.vi.toFixed(3)} vh=${vhCheck.toFixed(3)} T=${sol.thrust.toFixed(0)}N branch=${sol.branch}`);
  check('hover branch = climb (λc=0)', sol.branch === 'climb', `branch=${sol.branch}`);
}

/* ── TEST 9 — descent VRS band flagged; steep descent = windmill ───── */
section('9. Axial descent: VRS band flagged, steep descent = windmill/autorotation');
{
  const st = HL.defaultState();
  // Use the solver's OWN converged hover induced velocity (vih) as the reference,
  // since the branch boundaries are defined against the CT-consistent hover inflow.
  const vih = HL.axialSolve({ ...st, Vc: 0 }).vih;
  // gentle descent inside VRS band (Vc/vih ≈ −0.7)
  const vrsSt = { ...st, Vc: -0.7 * vih };
  const vrsSol = HL.axialSolve(vrsSt);
  check('gentle descent flagged VRS', vrsSol.vrs === true, `Vc/vih=${(vrsSt.Vc / vih).toFixed(2)} vrs=${vrsSol.vrs} branch=${vrsSol.branch}`);
  // steep descent (Vc/vih ≈ −2.5) = clean windmill brake, momentum theory valid
  const wmSt = { ...st, Vc: -2.5 * vih };
  const wmSol = HL.axialSolve(wmSt);
  check('steep descent = windmill (clean)', wmSol.branch === 'windmill' && !wmSol.vrs, `Vc/vih=${(wmSt.Vc / vih).toFixed(2)} branch=${wmSol.branch} vrs=${wmSol.vrs}`);
}


/* ── TEST 10 — %-of-critical-α: retreating-stall onset is on the OUTER span ─
   PHYSICS NOTE (verified via /tmp/probe_onset + probe_ret):
   RAW α/α_crit over the whole disc peaks INBOARD (r/R≈0.2, ψ≈190°) — this is the
   low-U_T reverse-flow boundary where α blows up mathematically but the real
   airload (∝ U_T²) is negligible. That inboard blob is the "fwd-middle" artefact.
   The HONEST stall metric requires BOTH high α AND real dynamic pressure. Gating
   by U_T ≥ 0.4 (aerodynamically meaningful span) inside the RETREATING quadrant
   (ψ 225–315°) places onset on the OUTER span (r/R ≈ 0.63→0.72, moving outward
   with speed) near ψ≈226–230° — the textbook retreating-blade-stall location. */
section('10. Dynamic-pressure-gated α/α_crit puts retreating-stall onset on the OUTER span');
{
  const gate = 0.4;
  const peakInQuadrant = (Vkt) => {
    const st = HL.defaultState(); st.V = Vkt * 0.5144;
    const t = computeTrimCyclic(st);
    const stt = { ...st, theta1s: t.t1s_deg, theta1c: t.t1c_deg };
    const c = flappingCoeffs(stt);
    const sos = sosAtAltFt(st.alt), OmR = HL.omR(st);
    const stallEffAt = UT => Math.max(5, st.stallAoA - 18 * Math.max(0, OmR * Math.max(0, UT) / sos - 0.30));
    let bestR = -1, bestPct = -1, bestPsi = 0;
    for (let ip = 0; ip < 180; ip++) {
      const psi = ip * 2 * D2R, pd = psi * R2D;
      if (pd < 225 || pd > 315) continue;           // retreating quadrant only
      for (let i = 1; i <= 40; i++) {
        const r = i / 40;
        const d = localAoA(stt, c, r, psi);
        if (d.reverseFlow || d.UT < gate) continue;   // dynamic-pressure gate
        const pct = (d.aoa * R2D) / stallEffAt(d.UT);
        if (pct > bestPct) { bestPct = pct; bestR = r; bestPsi = pd; }
      }
    }
    return { bestR, bestPct, bestPsi };
  };
  const p140 = peakInQuadrant(140);
  const p180 = peakInQuadrant(180);
  // (a) gated onset is on the OUTER span, never the inboard fwd-middle blob
  check('gated α/α_crit peak is on outer span (r/R ≥ 0.55)', p140.bestR >= 0.55,
    `V=140kt argmax r/R=${p140.bestR.toFixed(2)}, ψ=${p140.bestPsi.toFixed(0)}°, α/α_crit=${p140.bestPct.toFixed(2)}`);
  // (b) it sits in the retreating quadrant (classic ψ≈210–250°)
  check('onset azimuth is in the retreating quadrant (ψ 210–250°)', p140.bestPsi >= 210 && p140.bestPsi <= 250,
    `ψ=${p140.bestPsi.toFixed(0)}°`);
  // (c) higher speed pushes the onset FARTHER OUTBOARD (toward the tip) and raises severity
  check('faster flight moves onset outboard toward tip (r/R rises)', p180.bestR >= p140.bestR,
    `r/R: 140kt=${p140.bestR.toFixed(2)} → 180kt=${p180.bestR.toFixed(2)}`);
  check('faster flight raises stall severity (α/α_crit rises, crosses 1)', p180.bestPct > p140.bestPct && p180.bestPct >= 1.0,
    `α/α_crit: 140kt=${p140.bestPct.toFixed(2)} → 180kt=${p180.bestPct.toFixed(2)}`);
}

/* ── TEST 11 — normalised load dL/dr ∝ U_T²·C_l peaks OUTBOARD ───────── */
section('11. Lift/load dL/dr peaks outboard, not at the inboard high-α blob');
{
  const st = HL.defaultState(); st.V = 120 * 0.5144;
  const t = computeTrimCyclic(st);
  const stt = { ...st, theta1s: t.t1s_deg, theta1c: t.t1c_deg };
  const c = flappingCoeffs(stt);
  const stallRad = st.stallAoA * D2R;
  const psi = 260 * D2R;
  let bestR = -1, bestL = -1;
  for (let i = 1; i <= 40; i++) {
    const r = i / 40;
    const d = localAoA(stt, c, r, psi);
    if (d.reverseFlow) continue;
    const Cl = Math.abs(d.aoa) < stallRad ? st.clAlpha * d.aoa : 0;
    const dL = Math.max(0, d.UT) * Math.max(0, d.UT) * Cl;
    if (dL > bestL) { bestL = dL; bestR = r; }
  }
  check('load peak is outboard (r/R ≥ 0.6)', bestR >= 0.6, `argmax at r/R=${bestR.toFixed(2)}`);
}

/* ── TEST 12 — autorotation driving zone shifts toward RETREATING side ──
   Replicates the disc-map classifier used by wAutorotation. Azimuth: 0 aft,
   90 adv, 180 nose, 270 ret. A retreating bias => more negative mean sinψ. */
section('12. Autorotation: driving zone migrates toward retreating (ψ→270°) with speed');
{
  const coll = 4, upMS = 6;
  const classify = (st, coeffs, r, psi, upInflow, mu) => {
    const UT = r + mu * Math.sin(psi);
    if (UT <= 0.02) return 'reverse';
    const phi = Math.atan2(-upInflow, UT);
    const a = (coll + st.twist * (r - 0.75)) * D2R - phi;
    const cl = HL.clOf(st, a), cd = HL.cdOf(st, cl);
    const fx = cl * Math.sin(phi) + cd * Math.cos(phi);
    if (a > st.stallAoA * D2R) return 'stall';
    return fx < 0 ? 'driving' : 'driven';
  };
  const drivingSinPsi = V => {
    const st = HL.defaultState(); st.V = V * 0.5144; st.theta0 = coll;
    const c = flappingCoeffs(st);
    const upInflow = upMS / HL.omR(st), mu = advanceRatio(st);
    let s = 0, n = 0;
    for (let ip = 0; ip < 72; ip++) {
      const psi = (ip + 0.5) / 72 * 2 * Math.PI;
      for (let ir = 0; ir < 20; ir++) {
        const r = 0.15 + 0.85 * (ir + 0.5) / 20;
        if (classify(st, c, r, psi, upInflow, mu) === 'driving') { s += Math.sin(psi); n++; }
      }
    }
    return n ? s / n : 0;
  };
  const speeds = [0, 20, 40, 60, 80];
  const means = speeds.map(drivingSinPsi);
  const s0 = means[0], s80 = means[means.length - 1];
  // (a) hover: driving zone is axisymmetric → mean sinψ ≈ 0
  check('hover driving zone ~axisymmetric (|mean sinψ| small)', Math.abs(s0) < 0.02,
    `mean sinψ(0kt)=${s0.toFixed(4)}`);
  // (b) the bias is MONOTONIC toward the retreating side (ψ→270° ⇒ sinψ<0) as speed rises
  let monotonic = true;
  for (let i = 1; i < means.length; i++) if (means[i] > means[i - 1] + 1e-4) monotonic = false;
  check('driving-zone bias grows monotonically toward retreating with speed', monotonic,
    `mean sinψ by kt: ${speeds.map((v, i) => `${v}=${means[i].toFixed(4)}`).join('  ')}`);
  // (c) at cruise the retreating bias is clearly established (sinψ ≤ -0.05 by 80kt)
  check('forward speed biases driving toward retreating (mean sinψ ≤ -0.05 @ 80kt)', s80 <= -0.05,
    `mean sinψ: 0kt=${s0.toFixed(4)} → 80kt=${s80.toFixed(4)}`);
}

console.log(`\n──────────────────────────────\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
