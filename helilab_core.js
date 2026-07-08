/* ===========================================================================
   helilab_core.js — HeliLab physics core
   ===========================================================================
   HeliLab is the v2 learning app. It REUSES the validated, DOM-free engine in
   flapping.js (loaded first) for forward-flight, flapping, and blade-element
   angles, and ADDS the pieces those functions don't cover:

     • axial (vertical) flight inflow with climb / descent / VRS
     • ground effect (Cheeseman–Bennett)
     • power decomposition  P = P_i + P_p + P_par + P_c
     • a single canonical rotor state + derived helpers

   All physics matches the references in CLAUDE.md (Van Holten AE4-314,
   Leishman, Wagtendonk). SI units (rad, m, m/s) unless a name says _deg / _kg.

   Depends on globals from flapping.js:
     tipSpeed, omega, advanceRatio, inflowRatio, thrustCoeff,
     flappingCoeffs, localAoA, rhoAtAltFt, sosAtAltFt
   =========================================================================== */
'use strict';

const HL = (function () {

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* ── Canonical rotor state ───────────────────────────────────────────────
     A light medium twin (EC135-class numbers, consistent with the v1 app).
     Every physics function takes a state object so widgets can hold their own. */
  function defaultState() {
    return {
      // geometry
      RPM: 395, R: 5.1, Nb: 4, chord: 0.30,
      sigma: (4 * 0.30) / (Math.PI * 5.1),   // solidity Nc/πR from geometry (≈0.0749),
                                             // ONE value for axial AND forward flight
      // flight condition
      V: 0, Vc: 0, alt: 0,
      // pitch controls [deg]
      theta0: 8, theta1c: 0, theta1s: 0, twist: -8,
      // aerodynamics
      clAlpha: 5.73, cd0: 0.011, kDrag: 0.03, stallAoA: 14,
      Lock: 7.4, p: 0, q: 0,
      // mass / drag / efficiency
      W_kg: 2800, fEq: 0.9, kappa: 1.15,
      // ground effect
      ige: false, zR: 1.0,
    };
  }

  /* recompute solidity from blade count, chord, radius */
  function solidity(st) { return (st.Nb * st.chord) / (Math.PI * st.R); }

  function area(st)   { return Math.PI * st.R * st.R; }
  function rho(st)    { return rhoAtAltFt(st.alt); }
  function omR(st)    { return tipSpeed(st); }           // Ω·R  [m/s]
  function weightN(st){ return st.W_kg * 9.80665; }

  /* ── Hover induced velocity  v_h = √(T / 2ρA) ──────────────────────────── */
  function viHover(st, thrustN) {
    const T = (thrustN != null) ? thrustN : weightN(st);
    return Math.sqrt(Math.max(0, T) / (2 * rho(st) * area(st)));
  }

  /* ── BET thrust coefficient for AXIAL flight (μ=0) ─────────────────────────
     CT = (σ·clα/6)·(θ₀ − 3λ/2),  λ = total inflow through disc (= λc + λi).
     Identical to flapping.js at hover; twist cancels at the 75%R reference. */
  function ctAxial(st, lamTotal) {
    const s = solidity(st);
    const t0 = st.theta0 * D2R;
    return Math.max(0, (s * st.clAlpha / 6) * (t0 - 1.5 * lamTotal));
  }

  /* ── Axial inflow solve (hover / climb / descent / VRS) ────────────────────
     Couples BET thrust with axial momentum theory.

       climb / hover (λc ≥ 0):   CT = 2·λi·(λc + λi)
       windmill  (λc ≤ −2·v_h):  uses the windmill-brake branch
       in between:               VRS — momentum theory is INVALID (a real,
                                 teachable fact), so we flag it and hold an
                                 approximate high induced velocity.

     Returns { CT, lam, lami, lamc, vi, vih, thrust, power, vrs, branch }. */
  function axialSolve(st, VcOverride) {
    const OmR = omR(st);
    if (OmR < 1) return { CT: 0, lam: 0, lami: 0, lamc: 0, vi: 0, vih: 0, thrust: 0, power: 0, vrs: false, branch: 'idle' };
    const Vc  = (VcOverride != null) ? VcOverride : (st.Vc || 0);
    const lamc = Vc / OmR;
    // Ground effect (Cheeseman–Bennett): near the ground the induced velocity is
    // reduced by K. Applied INSIDE the BET–momentum loop (λi → K·λi) so that at
    // fixed collective λ falls, α rises and thrust rises through the BET — rather
    // than an ad-hoc thrust multiplier. (1/K² remains the separate fixed-POWER
    // statement shown in the Ground Effect lesson.)
    const zRige = Math.max(0.35, st.zR || 1);
    const Kige = st.ige ? Math.sqrt(Math.max(0.05, 1 - 1 / (16 * zRige * zRige))) : 1;

    // Stable HOVER induced-inflow reference (v_h in λ units), solved ONCE at
    // λc=0. This is the fixed yardstick for the descent branch boundaries and
    // the VRS scaling — it must NOT drift with the descent-inflated inflow,
    // otherwise the windmill boundary lands far too steep (a former bug).
    let lamiH = Math.sqrt(Math.max(1e-8, ctAxial(st, 0) / 2));
    for (let i = 0; i < 30; i++) {
      const ctH = ctAxial(st, lamiH);
      lamiH = 0.5 * lamiH + 0.5 * Math.sqrt(Math.max(1e-8, ctH / 2));
    }

    // First find CT & induced inflow by iteration (climb-side momentum).
    let lami = Math.sqrt(Math.max(1e-6, ctAxial(st, Math.max(0, lamc)) / 2));
    let CT = 0.006, branch = 'climb', vrs = false;

    for (let i = 0; i < 40; i++) {
      const lam = lamc + lami;
      CT = ctAxial(st, lam);
      let lami_new;
      if (lamc >= 0) {                               // climb / hover
        branch = 'climb';
        lami_new = Kige * (-lamc + Math.sqrt(Math.max(0, lamc * lamc + 2 * CT))) / 2;
      } else if (lamc <= -1.8 * lamiH) {             // windmill brake / autorotative
        // Steep descent (V_c/v_h ≲ −1.8): the wake is fully below the disc again
        // and momentum theory is valid on the windmill-brake branch. This is the
        // regime that contains steady autorotation (V_c/v_h ≈ −1.8…−2).
        branch = 'windmill';
        lami_new = (-lamc - Math.sqrt(Math.max(0, lamc * lamc - 2 * CT))) / 2;
      } else {                                        // turbulent-wake / VRS region
        branch = 'vrs';
        // Empirical hold: induced velocity stays ~ v_h..1.3 v_h through VRS
        // (V_c/v_h ≈ −0.25…−1.8, the band where momentum theory is invalid).
        lami_new = lamiH * (1.15 + 0.25 * Math.sin((lamc / (-1.8 * lamiH)) * Math.PI));
      }
      const next = 0.5 * lami + 0.5 * lami_new;
      if (Math.abs(next - lami) < 1e-9) { lami = next; break; }
      lami = next;
    }
    const lam = lamc + lami;
    CT = ctAxial(st, lam);
    const thrust = CT * rho(st) * area(st) * OmR * OmR;
    const vi = lami * OmR;
    const vih = lamiH * OmR;
    // VRS flag = the realistic vortex-ring band (V_c/v_h ≈ −0.25…−1.8), keyed off
    // the SAME converged hover inflow used for the branch boundary so the flag and
    // the branch label always agree. A gentle descent (shallower) or a steep
    // windmill/autorotative descent (faster, V_c/v_h ≲ −1.8) is clean.
    const rVH = lamiH > 1e-6 ? lamc / lamiH : 0;
    vrs = (branch === 'vrs') && (rVH < -0.25);

    // axial power  P = P_i + P_p + P_c   (no parasite in pure vertical flight)
    const Pi = st.kappa * thrust * (vi + Math.max(0, Vc));
    const Pp = (solidity(st) * st.cd0 / 8) * rho(st) * area(st) * OmR * OmR * OmR;
    const Pc = thrust * (Vc < 0 ? Vc : 0);   // climb energy already in Pi term
    const power = Math.max(0, Pi + Pp) + Pc;

    return { CT, lam, lami, lamc, vi, vih, thrust, power, vrs, branch };
  }

  /* ── Ground-effect ratios (Cheeseman–Bennett) ──────────────────────────────
     v_i,IGE / v_i,OGE = √(1 − 1/(16 (z/R)²)).  Thrust gain at fixed power
     ≈ inverse. Returns { K, viRatio, thrustRatio }. */
  function groundEffect(zR) {
    const z = Math.max(0.35, zR);
    const K = Math.sqrt(Math.max(0.05, 1 - 1 / (16 * z * z)));
    return { K, viRatio: K, thrustRatio: 1 / (K * K) };  // T/T_OGE at fixed power
  }

  /* ── Forward-flight power curve  P(V) = P_i + P_p + P_par + P_c ─────────────
     Returns array of { V, Pi, Pp, Ppar, Pc, Ptot } over 0..Vmax [m/s].
     Standard momentum/BET decomposition (Leishman ch.5, diktaat eq.15/26/33). */
  function powerCurve(st, Vmax, N) {
    Vmax = Vmax || 90; N = N || 60;
    const A = area(st), r = rho(st), OmR = omR(st);
    const T = weightN(st);
    const vh = viHover(st, T);
    const Pp = (solidity(st) * st.cd0 / 8) * r * A * OmR * OmR * OmR;  // ~const
    const out = [];
    for (let i = 0; i < N; i++) {
      const V = (i / (N - 1)) * Vmax;
      // induced velocity in forward flight: vi = vh² / √((V cosαt)²+vi²) → iterate
      let vi = vh;
      for (let k = 0; k < 30; k++) {
        const vn = vh * vh / Math.sqrt(V * V + vi * vi);
        vi = 0.5 * vi + 0.5 * vn;
      }
      const Pi = st.kappa * T * vi;
      const muSq = Math.pow(V / OmR, 2);
      const Ppv = Pp * (1 + 4.6 * muSq);            // profile power rises with μ²
      const Ppar = 0.5 * r * V * V * V * st.fEq;
      const Pc = T * Math.max(0, st.Vc || 0);
      out.push({ V, Pi, Pp: Ppv, Ppar, Pc, Ptot: Pi + Ppv + Ppar + Pc });
    }
    return out;
  }

  /* min-power (best endurance) and best-range (tangent from origin) speeds */
  function powerMarkers(curve) {
    let endV = 0, endP = Infinity, rngV = 0, rngSlope = Infinity;
    for (const p of curve) {
      if (p.Ptot < endP) { endP = p.Ptot; endV = p.V; }
      if (p.V > 1) { const s = p.Ptot / p.V; if (s < rngSlope) { rngSlope = s; rngV = p.V; } }
    }
    return { enduranceV: endV, enduranceP: endP, rangeV: rngV };
  }

  /* ── Section lift coefficient with simple stall clamp ───────────────────── */
  function clOf(st, aoaRad) {
    const stall = st.stallAoA * D2R;
    if (aoaRad > stall)  return st.clAlpha * stall * Math.max(0, 1 - (aoaRad - stall) * 3);
    if (aoaRad < -stall) return st.clAlpha * -stall * Math.max(0, 1 + (aoaRad + stall) * 3);
    return st.clAlpha * aoaRad;
  }
  function cdOf(st, cl) { return st.cd0 + st.kDrag * cl * cl; }

  return {
    D2R, R2D,
    defaultState, solidity, area, rho, omR, weightN, viHover,
    ctAxial, axialSolve, groundEffect,
    powerCurve, powerMarkers, clOf, cdOf,
  };
})();
