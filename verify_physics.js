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
  localInflow, flappingCoeffs, flappingAngle, flappingRate, localVelocities, localVelocityDecomposition, bladePitch,
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
  // Drees wake-skew gradient applies to the INDUCED inflow only; the uniform
  // throughflow μ·tan(α_TPP) is added separately and does not vary with ψ.
  const lam_i = ctx.inducedInflowRatio(st);
  const adv = localInflow(lam_i, 0.75, 90 * D2R, mu);
  const ret = localInflow(lam_i, 0.75, 270 * D2R, mu);
  check('induced inflow(RET ψ=270) > (ADV ψ=90)', ret > adv, `ret=${ret.toFixed(4)} adv=${adv.toFixed(4)} λ_i=${lam_i.toFixed(4)}`);
  // Drees skew κ·cos(ψ): cos(180)=−1 so FWD has LOWER, AFT (cos0=+1) HIGHER.
  const front = localInflow(lam_i, 0.75, 180 * D2R, mu);
  const rear = localInflow(lam_i, 0.75, 0, mu);
  check('Drees skew present (AFT ψ=0 vs FWD ψ=180 differ)', Math.abs(front - rear) > 1e-4, `AFT=${rear.toFixed(4)} FWD=${front.toFixed(4)}`);
  // NEW: throughflow term is present and negative (nose-down disc) in fwd flight
  const muTan = ctx.throughflowRatio(st);
  check('throughflow μ·tan(α_TPP) present & negative @60kt', muTan < -1e-3, `μ·tanα=${muTan.toFixed(4)}`);
  check('throughflow vanishes at hover', Math.abs(ctx.throughflowRatio({ ...st, V: 0 })) < 1e-9, `hover μ·tanα=${ctx.throughflowRatio({ ...st, V: 0 }).toFixed(6)}`);
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

/* ── TEST 6b — coning/blade-motion decomposition signs ─────────────────── */
section('6b. Coning contribution sign/zero conditions and UP decomposition');
{
  const stH = fwdState(0);
  const cH = flappingCoeffs(stH);
  const dH0 = localVelocityDecomposition(stH, cH, 0.75, 0);
  const dH90 = localVelocityDecomposition(stH, cH, 0.75, Math.PI / 2);
  check('coning term = 0 at hover (μ=0)', Math.abs(dH0.coningBladeNormal) < 1e-9 && Math.abs(dH90.coningBladeNormal) < 1e-9,
    `tail=${dH0.coningBladeNormal.toFixed(6)} adv=${dH90.coningBladeNormal.toFixed(6)}`);

  const st = fwdState(80);
  const c = flappingCoeffs(st);
  const dTail = localVelocityDecomposition(st, c, 0.75, 0);
  const dNose = localVelocityDecomposition(st, c, 0.75, Math.PI);
  const dAdv = localVelocityDecomposition(st, c, 0.75, Math.PI / 2);
  const dRet = localVelocityDecomposition(st, c, 0.75, 3 * Math.PI / 2);
  check('coning term flips sign TAIL↔NOSE (cosψ)', dTail.coningBladeNormal > 0 && dNose.coningBladeNormal < 0,
    `tail=${dTail.coningBladeNormal.toFixed(5)} nose=${dNose.coningBladeNormal.toFixed(5)}`);
  check('coning term ≈ 0 on ADV/RET (cos90=cos270=0)',
    Math.abs(dAdv.coningBladeNormal) < 1e-6 && Math.abs(dRet.coningBladeNormal) < 1e-6,
    `adv=${dAdv.coningBladeNormal.toExponential(2)} ret=${dRet.coningBladeNormal.toExponential(2)}`);

  const lv = localVelocities(st, c, 0.75, Math.PI / 3);
  const dd = localVelocityDecomposition(st, c, 0.75, Math.PI / 3);
  check('UP decomposition sum is consistent', Math.abs(dd.UP - (dd.inflowNormal + dd.bladeMotionNormal)) < 1e-12,
    `UP=${dd.UP.toFixed(6)} inflow+blade=${(dd.inflowNormal + dd.bladeMotionNormal).toFixed(6)}`);
  check('localVelocities() matches decomposition UP', Math.abs(lv.UP - dd.UP) < 1e-12,
    `localVel=${lv.UP.toFixed(6)} decomp=${dd.UP.toFixed(6)}`);
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

/* ── TEST 9b — axial power components are exposed cleanly ───────────── */
section('9b. Axial power components preserve combined power without treating total power as induced power');
{
  const st = HL.defaultState();
  const vih = HL.axialSolve({ ...st, Vc: 0 }).vih;
  const cases = [
    { name: 'hover',   st: { ...st, Vc: 0 },          expectBranch: 'climb',    pcSign: 0 },
    { name: 'climb',   st: { ...st, Vc: 2.0 },        expectBranch: 'climb',    pcSign: 1 },
    { name: 'descent', st: { ...st, Vc: -2.5 * vih }, expectBranch: 'windmill', pcSign: -1 },
  ];
  cases.forEach(({ name, st, expectBranch, pcSign }) => {
    const sol = HL.axialSolve(st);
    check(`${name}: Pi_induced exposed`, Number.isFinite(sol.Pi_induced), `Pi=${sol.Pi_induced.toFixed(3)}`);
    check(`${name}: Pp_profile exposed`, Number.isFinite(sol.Pp_profile), `Pp=${sol.Pp_profile.toFixed(3)}`);
    check(`${name}: Pvertical_model_term exposed`, Number.isFinite(sol.Pvertical_model_term), `Pvertical=${sol.Pvertical_model_term.toFixed(3)}`);
    check(`${name}: combined power identity holds`,
      Math.abs(sol.power - (sol.Pi_induced + sol.Pp_profile + sol.Pvertical_model_term)) < 1e-6,
      `P=${sol.power.toFixed(3)} vs sum=${(sol.Pi_induced + sol.Pp_profile + sol.Pvertical_model_term).toFixed(3)}`);
    check(`${name}: branch preserved`, sol.branch === expectBranch, `branch=${sol.branch}`);
    if (pcSign === 0) {
      check(`${name}: Pvertical_model_term = 0 at hover`, Math.abs(sol.Pvertical_model_term) < 1e-9, `Pvertical=${sol.Pvertical_model_term.toFixed(6)}`);
    } else if (pcSign > 0) {
      check(`${name}: Pvertical_model_term = κ·T·Vc in climb`,
        Math.abs(sol.Pvertical_model_term - (st.kappa * sol.thrust * st.Vc)) < 1e-6,
        `Pvertical=${sol.Pvertical_model_term.toFixed(3)} κTVc=${(st.kappa * sol.thrust * st.Vc).toFixed(3)}`);
    } else {
      check(`${name}: Pvertical_model_term = T·Vc in descent`,
        Math.abs(sol.Pvertical_model_term - (sol.thrust * st.Vc)) < 1e-6,
        `Pvertical=${sol.Pvertical_model_term.toFixed(3)} TVc=${(sol.thrust * st.Vc).toFixed(3)}`);
    }
  });
  const hover = HL.axialSolve({ ...st, Vc: 0 });
  check('hover: Pi_induced = κ·T·vi',
    Math.abs(hover.Pi_induced - (st.kappa * hover.thrust * hover.vi)) < 1e-6,
    `Pi=${hover.Pi_induced.toFixed(3)} κTvi=${(st.kappa * hover.thrust * hover.vi).toFixed(3)}`);
  check('hover: combined power remains distinct from induced power',
    Math.abs(hover.power - hover.Pi_induced) > 1e-3,
    `power=${hover.power.toFixed(3)} Pi=${hover.Pi_induced.toFixed(3)}`);
}

/* ── TEST 9c — bounded hover trim reaches target thrust ─────────────── */
section('9c. Hover trim solve is hover-only and hits target thrust within its declared tolerance');
{
  const trimAt = cfg => {
    const st = { ...HL.defaultState(), ...cfg };
    return HL.hoverTrimSolve(st, HL.weightN(st));
  };
  const sea2400 = trimAt({ W_kg: 2400, alt: 0,    ige: false, zR: 1.0 });
  const sea2800 = trimAt({ W_kg: 2800, alt: 0,    ige: false, zR: 1.0 });
  const sea3200 = trimAt({ W_kg: 3200, alt: 0,    ige: false, zR: 1.0 });
  const hot2800 = trimAt({ W_kg: 2800, alt: 6000, ige: false, zR: 1.0 });
  const ige2800 = trimAt({ W_kg: 2800, alt: 6000, ige: true,  zR: 0.5 });
  [sea2400, sea2800, sea3200, hot2800, ige2800].forEach((trim, idx) => {
    const tag = ['sea2400', 'sea2800', 'sea3200', 'hot2800', 'ige2800'][idx];
    check(`${tag}: converged`, trim.converged, `reason=${trim.reason} θ0=${trim.theta0.toFixed(3)}°`);
    check(`${tag}: |T−target| <= tolerance`, Math.abs(trim.residualThrust) <= trim.toleranceN,
      `target=${trim.targetThrust.toFixed(1)} produced=${trim.producedThrust.toFixed(1)} tol=${trim.toleranceN}`);
    check(`${tag}: helper exposes target vs produced thrust`, Math.abs(trim.solution.thrust - trim.producedThrust) < 1e-9,
      `solutionT=${trim.solution.thrust.toFixed(6)} produced=${trim.producedThrust.toFixed(6)}`);
  });
  const forcedHover = HL.hoverTrimSolve({ ...HL.defaultState(), Vc: 3.5 }, HL.weightN(HL.defaultState()));
  check('hoverTrimSolve forces Vc = 0 in the returned trimmed state', forcedHover.state.Vc === 0,
    `returned Vc=${forcedHover.state.Vc}`);
  check('hoverTrimSolve forces Vc = 0 in the solved axial branch', Math.abs(forcedHover.solution.lamc) < 1e-12 && forcedHover.solution.branch === 'climb',
    `lamc=${forcedHover.solution.lamc.toFixed(6)} branch=${forcedHover.solution.branch}`);
  check('heavier hover needs more collective at same density', sea3200.theta0 > sea2400.theta0,
    `θ0: 2400kg=${sea2400.theta0.toFixed(3)}° 3200kg=${sea3200.theta0.toFixed(3)}°`);
  check('higher density altitude needs more collective at same weight', hot2800.theta0 > sea2800.theta0,
    `θ0: sea-level=${sea2800.theta0.toFixed(3)}° 6000ft=${hot2800.theta0.toFixed(3)}°`);
  const impossible = HL.hoverTrimSolve(HL.defaultState(), 80000);
  check('bounded trim reports above-bracket failure cleanly', !impossible.converged && impossible.reason === 'target-above-bracket',
    `reason=${impossible.reason} produced=${impossible.producedThrust.toFixed(1)} target=${impossible.targetThrust.toFixed(1)}`);
}

/* ── TEST 9d — ground-effect semantics stay distinct ─────────────────── */
section('9d. Fixed-thrust IGE/OGE comparison trims both states to the same declared target');
{
  const st = { ...HL.defaultState(), alt: 6000 };
  const cmp = HL.groundEffectFixedThrustComparison(st, 0.5);
  const fixedPower = HL.groundEffect(0.5);
  const fixedControlOge = HL.axialSolve({ ...st, theta0: cmp.oge.theta0, ige: false, zR: 1.0, Vc: 0 });
  const fixedControlIge = HL.axialSolve({ ...st, theta0: cmp.oge.theta0, ige: true,  zR: 0.5, Vc: 0 });
  const fixedControlRatio = fixedControlIge.thrust / fixedControlOge.thrust;
  const fixedThrustRatio = cmp.ige.producedThrust / cmp.oge.producedThrust;

  check('comparison mode is fixed-thrust', cmp.mode === 'fixed-thrust', `mode=${cmp.mode}`);
  check('OGE trimmed state meets its declared target', cmp.oge.converged && cmp.oge.targetThrust === cmp.targetThrust && Math.abs(cmp.oge.residualThrust) <= cmp.oge.toleranceN,
    `residual=${cmp.oge.residualThrust.toFixed(2)} N`);
  check('IGE trimmed state meets the same declared target', cmp.ige.converged && cmp.ige.targetThrust === cmp.targetThrust && Math.abs(cmp.ige.residualThrust) <= cmp.ige.toleranceN,
    `residual=${cmp.ige.residualThrust.toFixed(2)} N`);
  check('canonical comparison holds the same target thrust on both sides', cmp.oge.targetThrust === cmp.ige.targetThrust,
    `OGE target=${cmp.oge.targetThrust.toFixed(1)} IGE target=${cmp.ige.targetThrust.toFixed(1)}`);
  check('canonical comparison holds produced thrust equal within declared tolerance', Math.abs(cmp.ige.producedThrust - cmp.oge.producedThrust) <= Math.max(cmp.ige.toleranceN, cmp.oge.toleranceN),
    `OGE=${cmp.oge.producedThrust.toFixed(1)} IGE=${cmp.ige.producedThrust.toFixed(1)} tol=${Math.max(cmp.ige.toleranceN, cmp.oge.toleranceN)}`);
  check('IGE lowers induced velocity at fixed thrust', cmp.ige.solution.vi < cmp.oge.solution.vi,
    `OGE vi=${cmp.oge.solution.vi.toFixed(3)} IGE vi=${cmp.ige.solution.vi.toFixed(3)}`);
  check('IGE lowers Pi_induced at fixed thrust', cmp.ige.solution.Pi_induced < cmp.oge.solution.Pi_induced,
    `OGE Pi=${(cmp.oge.solution.Pi_induced / 1000).toFixed(1)}kW IGE Pi=${(cmp.ige.solution.Pi_induced / 1000).toFixed(1)}kW`);
  check('IGE needs less collective at fixed thrust', cmp.ige.theta0 < cmp.oge.theta0,
    `OGE θ0=${cmp.oge.theta0.toFixed(3)}° IGE θ0=${cmp.ige.theta0.toFixed(3)}°`);
  check('fixed-power relation still reports thrust gain', fixedPower.thrustRatio > 1.0, `T ratio=${fixedPower.thrustRatio.toFixed(3)}`);
  check('fixed-control path still reports thrust gain', fixedControlRatio > 1.0, `T ratio=${fixedControlRatio.toFixed(3)}`);
  check('canonical fixed-thrust path does not collapse into fixed-power semantics',
    Math.abs(fixedThrustRatio - 1) < 0.002 && Math.abs(fixedPower.thrustRatio - fixedThrustRatio) > 0.2,
    `fixed-thrust=${fixedThrustRatio.toFixed(4)} fixed-power=${fixedPower.thrustRatio.toFixed(4)}`);
  check('canonical fixed-thrust path does not collapse into fixed-control semantics',
    Math.abs(fixedThrustRatio - fixedControlRatio) > 0.02,
    `fixed-thrust=${fixedThrustRatio.toFixed(4)} fixed-control=${fixedControlRatio.toFixed(4)}`);
}

/* ── TEST 9e — z/R guard is shared by both ground-effect paths ───────── */
section('9e. Ground-effect z/R guard clamps below 0.35 in both reference paths');
{
  const geMin = HL.groundEffect(0.35);
  const geLow = HL.groundEffect(0.10);
  check('standalone fixed-power helper clamps z/R<0.35', Math.abs(geLow.K - geMin.K) < 1e-12,
    `K(0.10)=${geLow.K.toFixed(6)} K(0.35)=${geMin.K.toFixed(6)}`);

  const cmpLow = HL.groundEffectFixedThrustComparison(HL.defaultState(), 0.10);
  const cmpMin = HL.groundEffectFixedThrustComparison(HL.defaultState(), 0.35);
  check('canonical fixed-thrust helper reports effective z/R=0.35', Math.abs(cmpLow.effectiveZR - 0.35) < 1e-12,
    `effective z/R=${cmpLow.effectiveZR.toFixed(2)}`);
  check('canonical fixed-thrust helper matches the clamped z/R path',
    Math.abs(cmpLow.ige.theta0 - cmpMin.ige.theta0) < 1e-9 &&
    Math.abs(cmpLow.ige.solution.vi - cmpMin.ige.solution.vi) < 1e-9,
    `θ0 low=${cmpLow.ige.theta0.toFixed(6)} θ0 min=${cmpMin.ige.theta0.toFixed(6)} vi low=${cmpLow.ige.solution.vi.toFixed(6)} vi min=${cmpMin.ige.solution.vi.toFixed(6)}`);
}

/* ── TEST 9f — axial VRS remains separate from wake/inflow rendering ─── */
section('9f. Axial VRS classification stays separate from the wake/inflow model');
{
  const base = HL.defaultState();
  const vih = HL.axialSolve({ ...base, Vc: 0 }).vih;
  const fwd = { ...base, V: 60 * 0.5144, Vlat: 15 * 0.5144 };
  const cleanWake = HL.linearInflowModel({ ...fwd, Vc: 0 });
  const vrsState = { ...fwd, Vc: -0.7 * vih };
  const vrsAxial = HL.axialSolve(vrsState);
  const vrsWake = HL.linearInflowModel(vrsState);
  check('axial solver still flags VRS in the descent case', vrsAxial.vrs === true && vrsAxial.branch === 'vrs',
    `branch=${vrsAxial.branch} vrs=${vrsAxial.vrs}`);
  check('wake λ0 stays independent of Vc/VRS classification', Math.abs(vrsWake.lam0 - cleanWake.lam0) < 1e-12,
    `clean=${cleanWake.lam0.toFixed(6)} vrs=${vrsWake.lam0.toFixed(6)}`);
  check('wake gradients stay independent of Vc/VRS classification',
    Math.abs(vrsWake.lamc - cleanWake.lamc) < 1e-12 && Math.abs(vrsWake.lams - cleanWake.lams) < 1e-12,
    `Δlamc=${(vrsWake.lamc - cleanWake.lamc).toExponential(2)} Δlams=${(vrsWake.lams - cleanWake.lams).toExponential(2)}`);
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

/* ── TEST: linear inflow model (HL.linearInflowModel / HL.linearInflowAt) ── */
section('Linear inflow model — gradient signs and consistency');
{
  const { linearInflowModel, linearInflowAt, inflowRollIndicator, defaultState } = HL;

  // Forward flight only (no lateral wind)
  const st80 = defaultState(); st80.V = 80 * 0.5144;
  const m80 = linearInflowModel(st80);

  // (a) λ₀ should be positive (downward induced velocity)
  check('λ₀ > 0 at 80 kt', m80.lam0 > 0, `lam0=${m80.lam0.toFixed(4)}`);

  // (b) λ_c (longitudinal gradient) should be positive in forward flight
  //     (more inflow at AFT than FWD, as wake tilts aft)
  check('λ_c > 0 in forward flight', m80.lamc > 0, `lamc=${m80.lamc.toFixed(4)}`);

  // (c) λ_s = 0 when there is no lateral wind
  check('λ_s = 0 with no lateral wind', Math.abs(m80.lams) < 1e-9, `lams=${m80.lams}`);

  // (d) λ at AFT (ψ=0) > λ at FWD (ψ=π) due to positive λ_c
  const lamAft = linearInflowAt(m80, 0.75, 0);
  const lamFwd = linearInflowAt(m80, 0.75, Math.PI);
  check('λ(AFT,r=0.75) > λ(FWD,r=0.75) in fwd flight', lamAft > lamFwd,
    `AFT=${lamAft.toFixed(4)} FWD=${lamFwd.toFixed(4)}`);

  // (e) At hover (V=0): λ_c should be ~0 (symmetric wake)
  const st0 = defaultState(); st0.V = 0;
  const m0 = linearInflowModel(st0);
  check('λ_c \u2248 0 at hover', Math.abs(m0.lamc) < 0.01, `lamc=${m0.lamc.toFixed(5)}`);

  // (f) Lateral wind creates a lateral gradient of the correct sign
  //     Positive Vlat (port→ADV) → more inflow on ADV side → λ_s > 0
  const stLat = defaultState(); stLat.V = 80 * 0.5144; stLat.Vlat = 20 * 0.5144;
  const mLat = linearInflowModel(stLat);
  check('Positive Vlat → λ_s > 0 (more inflow on ADV side)', mLat.lams > 0,
    `lams=${mLat.lams.toFixed(4)}`);

  // (g) inflowRollIndicator: with positive λ_s, ADV has more inflow than RET → dLam > 0
  const roll = inflowRollIndicator(mLat);
  check('inflowRollIndicator: dLam > 0 with positive λ_s', roll.dLam > 0,
    `lamAdv=${roll.lamAdv.toFixed(4)} lamRet=${roll.lamRet.toFixed(4)} dLam=${roll.dLam.toFixed(4)}`);

  // (h) Symmetric case: no lateral wind → dLam \u2248 0
  const rollSym = inflowRollIndicator(m80);
  check('inflowRollIndicator: dLam \u2248 0 with no lateral wind', Math.abs(rollSym.dLam) < 1e-9,
    `dLam=${rollSym.dLam}`);

  // (i) Gradients grow with forward speed (more pronounced inflow asymmetry at higher \u03bc)
  const st40 = defaultState(); st40.V = 40 * 0.5144;
  const m40 = linearInflowModel(st40);
  check('\u03bb_c grows with forward speed (80 kt > 40 kt)', m80.lamc > m40.lamc,
    `lamc(80kt)=${m80.lamc.toFixed(4)} lamc(40kt)=${m40.lamc.toFixed(4)}`);

  // (j) Coning/blade flapping terms can change local velocity triangle, but do not
  //     alter the wake-induced inflow map itself (λ-model is independent of coeffs).
  const cBase = flappingCoeffs(st80);
  const cBoost = { ...cBase, a0: cBase.a0 * 1.6 };
  const p = { r: 0.75, psi: 0.3 * Math.PI };
  const dBase = localVelocityDecomposition(st80, cBase, p.r, p.psi);
  const dBoost = localVelocityDecomposition(st80, cBoost, p.r, p.psi);
  check('λ-induced term unchanged when only coning coeff is perturbed',
    Math.abs(dBase.lamInduced - dBoost.lamInduced) < 1e-12,
    `lamInduced base=${dBase.lamInduced.toFixed(6)} boost=${dBoost.lamInduced.toFixed(6)}`);
  check('coning perturbation changes blade-motion normal term',
    Math.abs(dBase.coningBladeNormal - dBoost.coningBladeNormal) > 1e-6,
    `base=${dBase.coningBladeNormal.toFixed(6)} boost=${dBoost.coningBladeNormal.toFixed(6)}`);
}

/* ── TEST: Transverse Flow Effect — fore-aft inflow asymmetry (pedagogical model) ── */
section('Transverse Flow Effect — fore-aft inflow asymmetry');
{
  const { linearInflowModel, linearInflowAt, defaultState } = HL;
  const rBar = 0.75;

  // (a) At hover: fore-aft inflow is symmetric (λ_c ≈ 0 → λ_FWD ≈ λ_AFT)
  const st0  = defaultState(); st0.V = 0;
  const m0   = linearInflowModel(st0);
  const lFwd0 = linearInflowAt(m0, rBar, Math.PI);   // ψ=180° (nose/front)
  const lAft0 = linearInflowAt(m0, rBar, 0);          // ψ=0° (tail/aft)
  check('Hover: front inflow ≈ aft inflow (symmetric disc)',
    Math.abs(lAft0 - lFwd0) < 0.002,
    `FWD=${lFwd0.toFixed(5)} AFT=${lAft0.toFixed(5)} Δ=${(lAft0-lFwd0).toFixed(5)}`);

  // (b) In forward flight: aft disc has more induced flow than front disc
  const st80 = defaultState(); st80.V = 80 * 0.5144;
  const m80  = linearInflowModel(st80);
  const lFwd80 = linearInflowAt(m80, rBar, Math.PI);
  const lAft80 = linearInflowAt(m80, rBar, 0);
  check('Forward flight: λ(AFT) > λ(FWD) — core transverse-flow asymmetry',
    lAft80 > lFwd80,
    `FWD=${lFwd80.toFixed(4)} AFT=${lAft80.toFixed(4)} Δ=${(lAft80-lFwd80).toFixed(4)}`);

  // (c) Fore-aft asymmetry grows monotonically with speed
  const speeds = [0, 20, 40, 60, 80];
  let prev = -Infinity, monotone = true;
  speeds.forEach(V => {
    const st = defaultState(); st.V = V * 0.5144;
    const m  = linearInflowModel(st);
    const dFA = linearInflowAt(m, rBar, 0) - linearInflowAt(m, rBar, Math.PI);
    if (dFA < prev - 1e-6) monotone = false;
    prev = dFA;
  });
  check('Fore-aft Δλ grows monotonically with speed', monotone,
    `speeds checked: ${speeds.join(', ')} kt`);

  // (d) At station A (front, ψ=π) in forward flight:
  //     less inflow → smaller φ_A → larger α_A relative to station B (aft, ψ=0)
  const phiA = inflowAngle(rBar, Math.max(0, lFwd80));
  const phiB = inflowAngle(rBar, Math.max(0, lAft80));
  check('φ_A (front) < φ_B (aft) in forward flight — TFE mechanism',
    phiA < phiB,
    `φ_A=${(phiA*180/Math.PI).toFixed(2)}° φ_B=${(phiB*180/Math.PI).toFixed(2)}°`);

  const thetaA = bladePitch(st80, rBar, Math.PI);
  const thetaB = bladePitch(st80, rBar, 0);
  const alphaA = thetaA - phiA;
  const alphaB = thetaB - phiB;
  check('α_A (front) > α_B (aft) in forward flight — more lift at front',
    alphaA > alphaB,
    `α_A=${(alphaA*180/Math.PI).toFixed(2)}° α_B=${(alphaB*180/Math.PI).toFixed(2)}°`);

  // (e) λ_s remains 0 in pure forward flight (no lateral wind)
  check('λ_s = 0 in pure forward flight (no lateral wind)', Math.abs(m80.lams) < 1e-9,
    `lams=${m80.lams}`);

  // (f) Lateral wind adds λ_s but does NOT change λ_c (fore-aft gradient independent)
  const stLat = defaultState(); stLat.V = 80 * 0.5144; stLat.Vlat = 20 * 0.5144;
  const mLat  = linearInflowModel(stLat);
  check('λ_c unchanged by lateral wind (fore-aft asymmetry is independent)',
    Math.abs(mLat.lamc - m80.lamc) < 0.001,
    `lamc(no lat wind)=${m80.lamc.toFixed(4)} lamc(with lat wind)=${mLat.lamc.toFixed(4)}`);
  check('λ_s > 0 with positive lateral wind (separate roll input)',
    mLat.lams > 0,
    `lams=${mLat.lams.toFixed(4)}`);
}

console.log(`\n──────────────────────────────\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
