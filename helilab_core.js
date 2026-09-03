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
  const GROUND_EFFECT_MIN_ZR = 0.35;
  const AXIAL_TRIM_TOLERANCE_N = 25;
  const AXIAL_TRIM_MAX_ITERATIONS = 32;
  const AXIAL_TRIM_COLLECTIVE_MIN_DEG = 0;
  const AXIAL_TRIM_COLLECTIVE_MAX_DEG = 20;

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
  function clampGroundEffectZR(zR) { return Math.max(GROUND_EFFECT_MIN_ZR, zR == null ? 1 : zR); }
  function groundEffectFactor(zR) {
    const z = clampGroundEffectZR(zR);
    return { zR: z, K: Math.sqrt(Math.max(0.05, 1 - 1 / (16 * z * z))) };
  }

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

     Returns { CT, lam, lami, lamc, vi, vih, thrust,
               Pi_induced, Pp_profile, Pvertical_model_term, power, vrs, branch }.

     `Pi_induced` is the clean induced-power quantity for M2 reasoning:
       Pi_induced = κ · T · v_i

     `Pvertical_model_term` is intentionally model-specific:
       Vc = 0  →  0
       Vc > 0  →  κ · T · Vc   (chosen only to preserve the pre-existing combined
                                axial-power convention)
       Vc < 0  →  T · Vc
     It is NOT a universal/classical climb-power term.

     `power` remains the combined axial power used by existing callers and must
     not be presented as induced power in future M2 UI. */
  function axialSolve(st, VcOverride) {
    const OmR = omR(st);
    if (OmR < 1) {
      return {
        CT: 0, lam: 0, lami: 0, lamc: 0, vi: 0, vih: 0, thrust: 0,
        Pi_induced: 0, Pp_profile: 0, Pvertical_model_term: 0, power: 0,
        vrs: false, branch: 'idle',
      };
    }
    const Vc  = (VcOverride != null) ? VcOverride : (st.Vc || 0);
    const lamc = Vc / OmR;
    // Ground effect (Cheeseman–Bennett): near the ground the induced velocity is
    // reduced by K. Applied INSIDE the BET–momentum loop (λi → K·λi) so that at
    // fixed collective λ falls, α rises and thrust rises through the BET — rather
    // than an ad-hoc thrust multiplier. (1/K² remains the separate fixed-POWER
    // statement shown in the Ground Effect lesson.)
    const zRige = clampGroundEffectZR(st.zR);
    const Kige = st.ige ? groundEffectFactor(zRige).K : 1;

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
    // Preserve the existing combined `power` meaning while exposing clean fields:
    //   Pi_induced           = κ · T · v_i
    //   Pp_profile           = profile power
    //   Pvertical_model_term = model-specific vertical-speed term needed ONLY to
    //                           reconstruct the legacy combined axial-power value;
    //                           it is not a generic/classical climb-power quantity
    const Pi_induced = st.kappa * thrust * vi;
    const Pp_profile = (solidity(st) * st.cd0 / 8) * rho(st) * area(st) * OmR * OmR * OmR;
    const Pvertical_model_term = thrust * (Vc > 0 ? st.kappa * Vc : Vc);
    const power = Pi_induced + Pp_profile + Pvertical_model_term;

    return {
      CT, lam, lami, lamc, vi, vih, thrust,
      Pi_induced, Pp_profile, Pvertical_model_term, power,
      vrs, branch,
    };
  }

  /* ── Ground-effect ratios (Cheeseman–Bennett) ──────────────────────────────
     v_i,IGE / v_i,OGE = √(1 − 1/(16 (z/R)²)).  Thrust gain at fixed power
     ≈ inverse. Returns { K, viRatio, thrustRatio }. */
  function groundEffect(zR) {
    const { zR: z, K } = groundEffectFactor(zR);
    return { K, viRatio: K, thrustRatio: 1 / (K * K) };  // T/T_OGE at fixed power
  }

  /* ── Bounded hover-trim helper (selected comparisons only) ──────────────────
     Solves for collective θ₀ [deg] so axialSolve(...).thrust matches a target
     thrust within a small bounded tolerance. This WRAPS the existing axial model.
     It is hover-only: Vc is forced to 0 inside the helper, even if the caller
     supplies a non-zero vertical speed in `st`.

     Defaults:
       toleranceN    = 25 N
       maxIterations = 32
       θ₀ bracket     = 0..20 deg

     Failure behavior:
       - if the target is not finite, return converged=false / reason=invalid-target
       - if the target lies outside the bounded θ₀ bracket, return the nearest edge
         solve with converged=false and reason=target-below-bracket|target-above-bracket
       - otherwise return the best bounded bisection result. */
  function hoverTrimSolve(st, targetThrustN, opts) {
    const cfg = opts || {};
    const target = targetThrustN != null ? targetThrustN : weightN(st);
    const toleranceN = cfg.toleranceN != null ? Math.max(0, cfg.toleranceN) : AXIAL_TRIM_TOLERANCE_N;
    const maxIterations = cfg.maxIterations != null ? Math.max(1, Math.floor(cfg.maxIterations)) : AXIAL_TRIM_MAX_ITERATIONS;
    const minTheta0 = cfg.minTheta0Deg != null ? cfg.minTheta0Deg : AXIAL_TRIM_COLLECTIVE_MIN_DEG;
    const maxTheta0 = cfg.maxTheta0Deg != null ? cfg.maxTheta0Deg : AXIAL_TRIM_COLLECTIVE_MAX_DEG;
    const baseState = { ...st, Vc: 0 };
    const finish = (theta0, solution, iterations, reason) => {
      const producedThrust = solution.thrust;
      const residualThrust = producedThrust - target;
      return {
        state: { ...baseState, theta0 },
        theta0,
        targetThrust: target,
        producedThrust,
        residualThrust,
        toleranceN,
        iterations,
        converged: Math.abs(residualThrust) <= toleranceN,
        reason,
        solution,
      };
    };

    if (!Number.isFinite(target)) {
      const theta0 = baseState.theta0;
      return finish(theta0, axialSolve({ ...baseState, theta0 }, 0), 0, 'invalid-target');
    }

    let lo = minTheta0, hi = maxTheta0;
    let loSol = axialSolve({ ...baseState, theta0: lo }, 0);
    let hiSol = axialSolve({ ...baseState, theta0: hi }, 0);

    if (target <= loSol.thrust + toleranceN) return finish(lo, loSol, 0, 'target-below-bracket');
    if (target >= hiSol.thrust - toleranceN) return finish(hi, hiSol, 0, 'target-above-bracket');

    let bestTheta0 = baseState.theta0;
    let bestSol = axialSolve({ ...baseState, theta0: bestTheta0 }, 0);
    let bestErr = Math.abs(bestSol.thrust - target);

    for (let i = 1; i <= maxIterations; i++) {
      const theta0 = 0.5 * (lo + hi);
      const sol = axialSolve({ ...baseState, theta0 }, 0);
      const err = Math.abs(sol.thrust - target);
      if (err < bestErr) { bestTheta0 = theta0; bestSol = sol; bestErr = err; }
      if (err <= toleranceN) return finish(theta0, sol, i, 'converged');
      if (sol.thrust < target) { lo = theta0; loSol = sol; }
      else                     { hi = theta0; hiSol = sol; }
    }

    if (Math.abs(loSol.thrust - target) < bestErr) { bestTheta0 = lo; bestSol = loSol; bestErr = Math.abs(loSol.thrust - target); }
    if (Math.abs(hiSol.thrust - target) < bestErr) { bestTheta0 = hi; bestSol = hiSol; }
    return finish(bestTheta0, bestSol, maxIterations, 'max-iterations');
  }

  /* ── Canonical fixed-required-thrust IGE/OGE comparison ─────────────────────
     Hover-only comparison for later Stage 4 use. Both OGE and IGE states are
     trimmed to the SAME declared target thrust within the hover-trim tolerance;
     this is not a fixed-power ratio and not a fixed-control comparison. */
  function groundEffectFixedThrustComparison(st, zR, targetThrustN, opts) {
    const target = targetThrustN != null ? targetThrustN : weightN(st);
    const zReff = clampGroundEffectZR(zR);
    const oge = hoverTrimSolve({ ...st, ige: false, zR: 1, Vc: 0 }, target, opts);
    const ige = hoverTrimSolve({ ...st, ige: true, zR: zReff, Vc: 0 }, target, opts);
    return {
      mode: 'fixed-thrust',
      targetThrust: target,
      requestedZR: zR,
      effectiveZR: zReff,
      oge,
      ige,
    };
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

  /* ── Linear inflow (Pitt-Peters first harmonic) ─────────────────────────────
     Educational model: steady, prescribed first-harmonic inflow (quasi-steady,
     not a free-wake or transient rotor-body coupling model).

     λ(r,ψ) = λ₀  +  λ_c·r·cos(ψ)  +  λ_s·r·sin(ψ)

     Convention (matches flapping.js): ψ=0 AFT, ψ=90 ADV, ψ=180 FWD, ψ=270 RET.
       λ_c > 0  →  more inflow at AFT than FWD (forward-flight longitudinal gradient)
       λ_s > 0  →  more inflow at ADV than RET (lateral / skewed-inflow gradient)

     st.Vlat [m/s] (optional): lateral wind into the advancing (starboard) side.
     Reference: Pitt & Peters (1981); simplified Mangler–Squire approximation. */
  function linearInflowModel(st) {
    const OmR = omR(st);
    if (OmR < 1) return { lam0: 0, lamc: 0, lams: 0 };
    const lam0  = inflowRatio(st);
    const mu    = advanceRatio(st);
    const muLat = (st.Vlat || 0) / OmR;
    const denom = Math.sqrt(mu * mu + lam0 * lam0);
    // Mangler–Squire / Pitt-Peters: gradients scale with wake-skew angle χ.
    // The compact form (4/3π)·component/√(μ²+λ₀²) is numerically stable at hover.
    const lamc = denom > 1e-6 ? (4 / (3 * Math.PI)) * mu    / denom : 0;
    const lams = denom > 1e-6 ? (4 / (3 * Math.PI)) * muLat / denom : 0;
    return { lam0, lamc, lams };
  }

  /** Local induced-velocity ratio at normalised radius r and azimuth ψ [rad]. */
  function linearInflowAt(model, r, psiRad) {
    return model.lam0 + model.lamc * r * Math.cos(psiRad)
                      + model.lams * r * Math.sin(psiRad);
  }

  /** Lateral inflow roll indicator.
   *  dLam = λ(0.75, ADV) − λ(0.75, RET): positive means more inflow on the advancing
   *  (starboard) side → reduced AoA → less lift there → roll toward advancing side. */
  function inflowRollIndicator(model) {
    const r   = 0.75;
    const adv = linearInflowAt(model, r, Math.PI / 2);
    const ret = linearInflowAt(model, r, 3 * Math.PI / 2);
    return { lamAdv: adv, lamRet: ret, dLam: adv - ret };
  }

  return {
    D2R, R2D,
    defaultState, solidity, area, rho, omR, weightN, viHover,
    ctAxial, axialSolve, groundEffect, hoverTrimSolve, groundEffectFixedThrustComparison,
    powerCurve, powerMarkers, clOf, cdOf,
    linearInflowModel, linearInflowAt, inflowRollIndicator,
  };
})();
