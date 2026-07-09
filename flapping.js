/**
 * flapping.js — BET Tool Physics Engine
 * =======================================
 * Pure, side-effect-free functions for rotor flapping and blade-element
 * aerodynamics.  All inputs/outputs are SI (rad, m, m/s) unless noted.
 *
 * Van Holten diktaat notation:
 *   β(ψ) = a₀ − a₁·cos(ψ) − b₁·sin(ψ)
 *   In code:  β(ψ) = a0 + a1c·cos(ψ) + a1s·sin(ψ)
 *   where  a1c = −a₁,  a1s = −b₁
 *
 * Arc: MIT / free to use
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1.  STATE  (shared mutable object – one source of truth)
   ─────────────────────────────────────────────────────────────
   All tabs read from `BET_STATE`.  Controls write into it and
   call `BET_STATE.onUpdate()` which each tab registers.
*/
const BET_STATE = {
  // ── Rotor geometry ──────────────────────────────────────
  RPM:    258,     // rotations per minute
  R:       6.7,   // blade radius [m]  (diam 13.4 m default)
  // ── Flight condition ────────────────────────────────────
  V:       0,     // forward speed [m/s]
  alt:     0,     // altitude [ft]  (for atmosphere)
  // ── Blade pitch controls ────────────────────────────────
  theta0:  6,     // collective [deg]
  theta1c: 0,     // lateral cyclic A₁ [deg]
  theta1s: 0,     // longitudinal cyclic B₁ [deg]
  twist:  -8,     // linear twist [deg] tip-to-root (negative = washout)
  // ── Blade aerodynamics ──────────────────────────────────
  clAlpha: 5.73,  // lift-curve slope [1/rad]
  cd0:     0.011, // profile drag intercept
  kDrag:   0.03,  // induced-drag factor (Cd = cd0 + k·Cl²)
  stallAoA:14,    // stall AoA [deg]
  Lock:    7.4,   // Lock number γ
  // ── Body rates (hover / manoeuvre) ──────────────────────
  p:  0,          // roll rate [deg/s]
  q:  0,          // pitch rate [deg/s]
  // ── Tab-specific render modes ────────────────────────────
  angleQty: 'aoa',        // Tab 3 contour quantity
  profileMode: 'vs_r',    // Tab 4  'vs_r' | 'vs_psi'
  profileR: 0.75,         // Tab 4 – fixed r/R for vs_psi mode
  profilePsiDeg: 0,       // Tab 4 – fixed ψ for vs_r mode in deg  (unused; selector used)
  profileAzimuths: [0, 90, 180, 270], // Tab 4 – azimuth overlays for vs_r mode
  profileQty: 'aoa',      // Tab 4 plotted quantity
  psi: 90,                // global azimuth scrubber [deg] 0=AFT 90=ADV 180=FWD 270=RET
  // ── Display options – Tab 2 carry-over ──────────────────
  showAzLines: true,
  showIso:     true,
  showRev:     true,
  showTip:     true,

  // ── Listeners ────────────────────────────────────────────
  _listeners: [],
  /** register a callback; called whenever state changes */
  subscribe(fn) { this._listeners.push(fn); },
  /** call after any mutation to propagate update */
  notify() { this._listeners.forEach(fn => fn()); },
};

/* ─────────────────────────────────────────────────────────────
   2.  ATMOSPHERE
   ───────────────────────────────────────────────────────────── */
/** Speed of sound vs altitude [ft] using ISA model */
function sosAtAltFt(altFt) {
  const h = altFt * 0.3048; // m
  const T = Math.max(216.65, 288.15 - 0.0065 * h); // K
  return Math.sqrt(1.4 * 287 * T);
}

/** Air density [kg/m³] vs altitude [ft] */
function rhoAtAltFt(altFt) {
  const h = altFt * 0.3048;
  const T = Math.max(216.65, 288.15 - 0.0065 * h);
  const p = 101325 * Math.pow(T / 288.15, 5.2561);
  return p / (287 * T);
}

/* ─────────────────────────────────────────────────────────────
   3.  ROTOR KINEMATIC PARAMETERS
   ───────────────────────────────────────────────────────────── */
/** Tip speed Ω·R [m/s] */
function tipSpeed(st) {
  return (st.RPM * Math.PI * 2 * st.R) / 60; // Ω·R
}

/** Advance ratio μ = V / (Ω·R) */
function advanceRatio(st) {
  const OmR = tipSpeed(st);
  return OmR > 0 ? st.V / OmR : 0;
}

/** Angular velocity Ω [rad/s] */
function omega(st) {
  return (st.RPM * Math.PI * 2) / 60;
}

/* ─────────────────────────────────────────────────────────────
   4.  SIMPLE MOMENTUM INFLOW
   ───────────────────────────────────────────────────────────── */
/**
 * TOTAL inflow ratio λ = (V_perp + v_i) / (Ω·R), i.e. the full velocity
 * NORMAL to the tip-path-plane, expressed as a fraction of the tip speed.
 * It has TWO parts (Glauert forward-flight relation, Leishman eq. 2.126):
 *
 *   λ = μ·tan(α_TPP)  +  C_T / (2·√(μ²+λ²))
 *       └─ throughflow ─┘   └──── induced λ_i ────┘
 *
 * • μ·tan(α_TPP)  — the component of the FREE-STREAM velocity that passes
 *   perpendicularly THROUGH the disc because the tip-path-plane is tilted
 *   nose-down (α_TPP < 0) in forward flight. This is the "V_n of the
 *   forward speed" and at 120 kt it already exceeds the induced part.
 * • C_T/(2√…)     — the classical induced inflow from momentum theory.
 *
 * α_TPP is taken as the nose-down body pitch from the drag/weight balance
 *   D = ½ρV²f_eq , W = 2ρA v_h²  →  α_TPP = −arctan(V²·f_eq /(4·A·v_h²))
 *   (identical to computeTrimCyclic's fuselage-pitch derivation, inlined
 *    here to avoid a circular call).
 *
 * BET thrust (75%R twist reference, Van Holten):
 *   CT = (σ·c_lα/4)·[θ₀·(⅔+μ²) − θ_t·(μ²/4) − λ_i]
 *   Note: twist term → 0 at hover (μ=0) — elegant 75%R cancellation.
 *
 * All coupled and iterated together in 15–25 damped iterations.
 */
// Throughflow ratio μ·tan(α_TPP): the free-stream component NORMAL to the
// tilted disc. Nose-down disc in forward flight → negative. Zero at hover.
function throughflowRatio(st) {
  const OmR = tipSpeed(st);
  if (OmR < 1) return 0;
  const mu  = st.V / OmR;
  if (mu <= 1e-4) return 0;
  const sigma = st.sigma   || 0.076;
  const clA   = st.clAlpha || 5.73;
  const t0    = (st.theta0 || 0) * Math.PI / 180;
  const f_eq  = 0.9;                        // flat-plate equivalent area [m²]
  const R_t   = st.R || 6.7;
  const A_t   = Math.PI * R_t * R_t;
  // hover induced velocity for the SAME collective (μ=0, momentum-only)
  let lam_h = Math.sqrt(0.006 / 2);
  for (let k = 0; k < 30; k++) {
    const CTh = Math.max(1e-6, (sigma * clA / 4) * (t0 * (2/3) - lam_h));
    const lh_new = CTh / (2 * Math.max(lam_h, 1e-4));
    if (Math.abs(lh_new - lam_h) < 1e-9) { lam_h = lh_new; break; }
    lam_h = 0.6 * lam_h + 0.4 * lh_new;
  }
  lam_h = Math.max(0.005, lam_h);
  const v_h    = lam_h * OmR;               // hover induced velocity [m/s]
  const DoverW = (st.V * st.V * f_eq) / (4 * A_t * v_h * v_h);
  const alphaTPP = -Math.atan(DoverW);      // nose-down → negative
  return mu * Math.tan(alphaTPP);           // negative in forward flight
}

// INDUCED inflow ratio λ_i only (momentum theory, coupled to CT). This is the
// part that produces blade lift; it is what the BET thrust formula uses.
function inducedInflowRatio(st) {
  const OmR = tipSpeed(st);
  if (OmR < 1) return 0.05;
  const mu    = st.V / OmR;
  const sigma = st.sigma   || 0.076;
  const clA   = st.clAlpha || 5.73;
  const t0    = (st.theta0 || 0) * Math.PI / 180;
  const twst  = (st.twist  || 0) * Math.PI / 180;
  const muTan = throughflowRatio(st);

  const CT0 = 0.006;
  let lam_i = mu > 0.1 ? CT0 / (2 * mu) : Math.sqrt(CT0 / 2);
  for (let iter = 0; iter < 30; iter++) {
    const CT = Math.max(1e-6, (sigma * clA / 4) * (
      t0 * (2/3 + mu * mu) - twst * (mu * mu / 4) - lam_i));
    // total λ enters the √(μ²+λ²) resultant (Glauert), so use λ_i+muTan there
    const lamTot = lam_i + muTan;
    const lam_i_new = CT / (2 * Math.max(Math.sqrt(mu * mu + lamTot * lamTot), 1e-4));
    if (Math.abs(lam_i_new - lam_i) < 1e-8) { lam_i = lam_i_new; break; }
    lam_i = 0.6 * lam_i + 0.4 * lam_i_new;
  }
  return Math.max(0.005, lam_i);
}

// TOTAL inflow ratio λ = μ·tan(α_TPP) + λ_i  — the full velocity normal to
// the disc, used for the blade-element perpendicular velocity U_P.
function inflowRatio(st) {
  return throughflowRatio(st) + inducedInflowRatio(st);
}

/**
 * Blade-element thrust coefficient C_T at the current state.
 * Consistent with inflowRatio() — uses the same BET formula, but on the
 * INDUCED inflow λ_i only (the μ·tan(α_TPP) throughflow does not create
 * blade lift, it just tilts the incoming flow):
 *   CT = (σ·c_lα/4)·[θ₀·(⅔+μ²) − θ_t·(μ²/4) − λ_i]
 */
function thrustCoeff(st) {
  const OmR   = tipSpeed(st);
  if (OmR < 1) return 0.005;
  const mu    = st.V / OmR;
  const lam_i = inducedInflowRatio(st);   // induced part only
  const sigma = st.sigma   || 0.076;
  const clA   = st.clAlpha || 5.73;
  const t0    = (st.theta0 || 0) * Math.PI / 180;
  const twst  = (st.twist  || 0) * Math.PI / 180;
  return Math.max(1e-6, (sigma * clA / 4) * (
    t0 * (2/3 + mu * mu) - twst * (mu * mu / 4) - lam_i));
}

/**
 * Prandtl tip-loss factor B.
 *   B = max(0.85, 1 − √(2·CT) / N)
 * The outer (1−B)·R of each blade generates little thrust due to the
 * vortex sheet rolled up at the tip.  Typically B ≈ 0.95–0.98.
 */
function tipLossB(CT, N_bl) {
  return Math.max(0.85, 1 - Math.sqrt(2 * Math.max(0, CT)) / (N_bl || 4));
}

/**
 * Linear inflow distribution λ(r,ψ) = λ₀ · (1 + κ·r̄·cos(ψ))
 *
 * κ is the Drees wake-skew gradient factor (Van Holten / Drees 1949):
 *   κ = (4/3) · μ / (√(μ²+λ₀²) + λ₀)
 *
 * This correctly vanishes at hover (μ=0) — no front-to-back gradient
 * when there is no wake skew.  At high speed κ → 4/3 ≈ 1.33.
 */
function localInflow(lam0, rBar, psi, mu) {
  mu = mu || 0;
  const Vres  = Math.sqrt(mu * mu + lam0 * lam0);
  const denom = Vres + lam0;
  const kappa = denom > 1e-6 ? (4 / 3) * mu / denom : 0;
  // Lateral gradient k_y = −2μ (Drees 1949; Leishman "Principles" linear-inflow
  // table, same ψ=0-at-tail convention): inflow reduced on the advancing side
  // (ψ=90), increased on the retreating side. Vanishes at hover.
  const ky = -2 * mu;
  return lam0 * (1 + kappa * rBar * Math.cos(psi) + ky * rBar * Math.sin(psi));
}

/* ─────────────────────────────────────────────────────────────
   5.  FIRST-HARMONIC FLAPPING COEFFICIENTS
   ──────────────────────────────────────────────────────────────
   Van Holten eqs. 78–80, fully general (p, q, θ₁s, θ₁c).
   Returns { a0, a1c, a1s } in RADIANS.
*/
function flappingCoeffs(st) {
  const OmR  = tipSpeed(st);
  const Om   = omega(st);
  const mu   = advanceRatio(st);
  const lam  = inflowRatio(st);
  const gam  = st.Lock;

  const t0   = st.theta0  * Math.PI / 180;
  const t1c  = st.theta1c * Math.PI / 180;
  const t1s  = st.theta1s * Math.PI / 180;
  const twst = st.twist   * Math.PI / 180;   // tip-root twist [rad], ref at 75%R
  const p_r  = st.p * Math.PI / 180;
  const q_r  = st.q * Math.PI / 180;

  // Eq. 78 — coning angle a₀  (with linear blade twist, Van Holten derivation)
  // θ(r̄) = θ₀ + θ_t·(r̄−0.75),  averaged aerodynamic moment ∫₀¹(r̄²+μ²/2)·θ·r̄ dr̄:
  //   θ₀ term  → (1/4 + μ²/4)  ×  θ₀   ÷ (γ/8) factor = θ₀·(1+μ²)   [existing]
  //   θ_t term → (1/80 − μ²/48) × θ_t  ÷ (γ/8) factor = θ_t·(1/20 − μ²/12)
  // Note: twist drops out of a₁ and b₁ because ∫₀¹(r̄−0.75)·r̄² dr̄ = 0 (75%R ref cancels).
  const a0 = (gam / 8) * (  t0   * (1 + mu * mu)
                           + twst * (1/20 - mu * mu / 12)
                           - (4/3) * lam);

  // Eq. 79 — longitudinal disc tilt a₁  (rearward blowback positive)
  // Derivation: sin(ψ) balance with θ = θ₀ + t1s·sin(ψ).
  // The t1s·sin(ψ) term contributes +t1s·(1+3μ²/2) to the RHS (positive sign):
  //   sin(ψ) harmonic of sin(ψ)·[x³ + 2μx²sin(ψ) + μ²x·sin²(ψ)] integrated = (2+3μ²)/8
  //   → in γ/8 units: (1+3μ²/2). More pitch at ψ=90° (ADV) increases blowback.
  // Forward cyclic to trim (a₁=0) therefore requires t1s < 0  (more pitch at RET, ψ=270°).
  const denom79 = 1 - mu * mu / 2;
  const a1 = denom79 > 0.01
    ? (8 * mu * t0 / 3 - 2 * mu * lam
       - (16 / (gam * Om)) * q_r
       + p_r / Om
       + t1s * (1 + 3 * mu * mu / 2))
      / denom79
    : 0;
  const a1c = -a1; // code convention: a1c = −a₁

  // Eq. 80 — lateral disc tilt b₁
  // cos(ψ) balance: t1c·cos(ψ) contributes −t1c·(1+μ²/2) (negative sign, different coefficient).
  //   cos(ψ) harmonic of cos(ψ)·[x³ + 2μx²sin(ψ) + μ²x·sin²(ψ)] = (2+μ²)/8
  //   → in γ/8 units: (1+μ²/2). Note this differs from a₁'s (1+3μ²/2).
  // For CCW rotor: more pitch at ψ=0 (AFT) tilts disc to port → b₁ decreases, hence −t1c.
  const denom80 = 1 + mu * mu / 2;
  const b1 = (4 * mu * a0 / 3
              - t1c * (1 + mu * mu / 2)
              - q_r / Om
              - (16 / (gam * Om)) * p_r)
             / denom80;
  const a1s = -b1;

  return { a0, a1c, a1s };
}

/** Instantaneous flapping angle β(ψ) [rad] */
function flappingAngle(coeffs, psi) {
  return coeffs.a0 + coeffs.a1c * Math.cos(psi) + coeffs.a1s * Math.sin(psi);
}

/** Flapping rate β̇ = dβ/dt = Ω · dβ/dψ [rad/s] */
function flappingRate(coeffs, psi, Om) {
  return Om * (-coeffs.a1c * Math.sin(psi) + coeffs.a1s * Math.cos(psi));
}

/* ─────────────────────────────────────────────────────────────
   6.  LOCAL BLADE-ELEMENT VELOCITIES
   ───────────────────────────────────────────────────────────── */
/**
 * Returns { UT, UP } normalised by Ω·R.
 * rBar  = r/R  (0…1)
 * psi   = azimuth [rad]
 */
function localVelocities(st, coeffs, rBar, psi) {
  const OmR = tipSpeed(st);
  const Om  = omega(st);
  const mu  = advanceRatio(st);
  const muTan = throughflowRatio(st);       // uniform free-stream throughflow
  const lam_i = inducedInflowRatio(st);     // induced part (gets Drees gradient)

  const beta     = flappingAngle(coeffs, psi);
  const betaDot  = flappingRate(coeffs, psi, Om);

  const p_r = st.p * Math.PI / 180;
  const q_r = st.q * Math.PI / 180;

  // Tangential (in-plane)
  const UT = rBar + mu * Math.sin(psi); // normalised by OmR

  // Perpendicular (out-of-plane): uniform throughflow + azimuthally-varying
  // induced inflow (Drees wake-skew gradient applies to the INDUCED part only).
  const lam_loc = muTan + localInflow(lam_i, rBar, psi, mu);
  const UP = lam_loc
    + (betaDot / Om) * rBar  // flapping velocity (normalised by OmR since betaDot/Om = dβ/dψ)
    - (q_r * Math.cos(psi) + p_r * Math.sin(psi)) * rBar / Om * (Om / OmR) // body rates, normalised
    + mu * Math.cos(psi) * beta; // free-stream × flapping

  return { UT, UP };
}

/* ─────────────────────────────────────────────────────────────
   7.  BLADE-ELEMENT ANGLES
   ───────────────────────────────────────────────────────────── */
/**
 * Blade pitch at (r/R, ψ) including linear twist, collective, and cyclic [rad].
 * Twist reference: 75%-span (standard helicopter convention).
 */
function bladePitch(st, rBar, psi) {
  const t0   = st.theta0  * Math.PI / 180;
  const t1c  = st.theta1c * Math.PI / 180;
  const t1s  = st.theta1s * Math.PI / 180;
  const twst = st.twist   * Math.PI / 180;
  return t0 + twst * (rBar - 0.75) + t1c * Math.cos(psi) + t1s * Math.sin(psi);
}

/**
 * Inflow angle φ = atan2(UP, UT)  [rad]
 * In the reverse-flow region (UT < 0) the sign of AoA must be flipped.
 */
function inflowAngle(UT, UP) {
  if (Math.abs(UT) < 1e-4) return Math.sign(UP) * Math.PI / 2;
  return Math.atan2(UP, UT);
}

/**
 * Angle of attack α = θ − φ  [rad]
 * Guard: AoA is meaningless / reversed when UT < 0 (reverse flow).
 */
function localAoA(st, coeffs, rBar, psi) {
  const { UT, UP } = localVelocities(st, coeffs, rBar, psi);
  const theta = bladePitch(st, rBar, psi);
  const phi   = inflowAngle(UT, UP);
  const reverseFlow = UT < 0;
  return { aoa: theta - phi, phi, theta, UT, UP, reverseFlow };
}

/* ─────────────────────────────────────────────────────────────
   8.  ANGLE CONTOUR QUANTITIES  (Tab 3)
   ───────────────────────────────────────────────────────────── */
/**
 * Evaluate a named scalar quantity at (r̄, ψ).
 * Returns { value[rad or deg depending on qty], reverseFlow }.
 *
 * qty one of:
 *   'flapping'  β(ψ)            [deg]
 *   'coning'    a₀ (uniform)    [deg]
 *   'pitch'     θ(r̄,ψ)          [deg]
 *   'inflow'    φ(r̄,ψ)          [deg]
 *   'aoa'       α(r̄,ψ)          [deg]
 *   'disctilt'  disc-tilt angle  [deg]  (indicator only; not spatially varying)
 */
function evalContourQty(qty, st, coeffs, rBar, psi) {
  const deg = r => r * 180 / Math.PI;
  switch (qty) {
    case 'flapping':
      return { value: deg(flappingAngle(coeffs, psi)), reverseFlow: false };
    case 'coning':
      return { value: deg(coeffs.a0), reverseFlow: false };
    case 'pitch': {
      const theta = bladePitch(st, rBar, psi);
      return { value: deg(theta), reverseFlow: false };
    }
    case 'inflow': {
      const d = localAoA(st, coeffs, rBar, psi);
      return { value: deg(d.phi), reverseFlow: d.reverseFlow };
    }
    case 'aoa': {
      const d = localAoA(st, coeffs, rBar, psi);
      return { value: deg(d.aoa), reverseFlow: d.reverseFlow };
    }
    default:
      return { value: 0, reverseFlow: false };
  }
}

/* ─────────────────────────────────────────────────────────────
   9.  BLADE PROFILE QUANTITIES  (Tab 4)
   ───────────────────────────────────────────────────────────── */
/**
 * Compute a profile quantity vs r/R (N points) at fixed ψ.
 * Returns array of { rBar, value }.
 */
function profileVsR(qty, st, coeffs, psiDeg, N) {
  N = N || 100;
  const psi = psiDeg * Math.PI / 180;
  const result = [];
  const stallRad = st.stallAoA * Math.PI / 180;
  const OmR = tipSpeed(st);

  for (let i = 0; i < N; i++) {
    const rBar = 0.05 + (1.05 - 0.05) * i / (N - 1);
    const d = localAoA(st, coeffs, rBar, psi);
    const { UT, UP, aoa, phi, theta, reverseFlow } = d;

    let value;
    switch (qty) {
      case 'aoa':     value = aoa  * 180 / Math.PI; break;
      case 'inflow':  value = phi  * 180 / Math.PI; break;
      case 'pitch':   value = theta * 180 / Math.PI; break;
      case 'flapping':value = flappingAngle(coeffs, psi) * 180 / Math.PI; break;
      case 'mach': {
        const Vlocal = OmR * Math.sqrt(UT * UT + UP * UP);
        value = Vlocal / sosAtAltFt(st.alt);
        break;
      }
      case 'lift': {
        // dCl/dα·α, then dL/dr = ½·ρ·(OmR·UT)²·c·Cl  (normalised by ½·ρ·(OmR)²·c·R)
        if (reverseFlow) { value = 0; break; }
        const Cl = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        value = UT * UT * Cl; // normalised lift per unit span
        break;
      }
      case 'drag': {
        if (reverseFlow) { value = 0; break; }
        const Cl = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        const Cd = st.cd0 + st.kDrag * Cl * Cl;
        value = UT * UT * Cd;
        break;
      }
      case 'torque': {
        // dQ/dr = r̄·(dD/dr − dL/dr·φ) — normalised
        if (reverseFlow) { value = 0; break; }
        const Cl = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        const Cd = st.cd0 + st.kDrag * Cl * Cl;
        const dL = UT * UT * Cl;
        const dD = UT * UT * Cd;
        value = rBar * (dD - dL * phi);
        break;
      }
      default: value = 0;
    }
    // stall: only positive-AoA overshoot (retreating-blade stall).
    // Large negative AoA near the reverse-flow boundary is NOT stall —
    // it is excluded here so the colour scale and stall indicator stay meaningful.
    result.push({ rBar, value, reverseFlow, stall: !reverseFlow && aoa >= stallRad });
  }
  return result;
}

/**
 * Compute a profile quantity vs ψ (N points) at fixed r̄.
 */
function profileVsPsi(qty, st, coeffs, rBar, N) {
  N = N || 360;
  const result = [];
  const stallRad = st.stallAoA * Math.PI / 180;
  const OmR = tipSpeed(st);
  for (let i = 0; i < N; i++) {
    const psi = (i / (N - 1)) * 2 * Math.PI;
    const d   = localAoA(st, coeffs, rBar, psi);
    const { UT, UP, aoa, phi, theta, reverseFlow } = d;

    let value;
    switch (qty) {
      case 'aoa':     value = aoa   * 180 / Math.PI; break;
      case 'inflow':  value = phi   * 180 / Math.PI; break;
      case 'pitch':   value = theta * 180 / Math.PI; break;
      case 'flapping':value = flappingAngle(coeffs, psi) * 180 / Math.PI; break;
      case 'mach': {
        const Vlocal = OmR * Math.sqrt(UT * UT + UP * UP);
        value = Vlocal / sosAtAltFt(st.alt);
        break;
      }
      case 'lift': {
        if (reverseFlow) { value = 0; break; }
        const Cl = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        value = UT * UT * Cl;
        break;
      }
      case 'drag': {
        if (reverseFlow) { value = 0; break; }
        const Cl  = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        const Cd  = st.cd0 + st.kDrag * Cl * Cl;
        value = UT * UT * Cd;
        break;
      }
      case 'torque': {
        if (reverseFlow) { value = 0; break; }
        const Cl  = Math.abs(aoa) < stallRad ? st.clAlpha * aoa : 0;
        const Cd  = st.cd0 + st.kDrag * Cl * Cl;
        value = rBar * (UT * UT * Cd - UT * UT * Cl * phi);
        break;
      }
      default: value = 0;
    }
    result.push({ psi, value, reverseFlow, stall: !reverseFlow && aoa >= stallRad });
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────
   10.  COLOUR MAP UTILITIES
   ───────────────────────────────────────────────────────────── */
/**
 * Diverging colour map centred at 0 (blue–white–red).
 * value: normalised −1…+1
 */
function divergingColor(value) {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    // 0 → white,  +1 → red
    return [255, Math.round(255 * (1 - v)), Math.round(255 * (1 - v))];
  } else {
    // 0 → white,  −1 → blue
    return [Math.round(255 * (1 + v)), Math.round(255 * (1 + v)), 255];
  }
}

/**
 * Sequential colour map 0…1 (dark → viridis-like)
 */
function sequentialColor(t) {
  t = Math.max(0, Math.min(1, t));
  // simplified viridis: dark-blue → teal → yellow
  const r = Math.round(68  + (253 - 68) * t * t);
  const g = Math.round(1   + (231 - 1)  * t);
  const b = Math.round(84  + (37  - 84) * t);
  return [r, g, b];
}

/**
 * Map a degree value to a diverging [r,g,b] colour.
 * range: half-range in degrees (e.g. 15 → −15° to +15°)
 */
function angleToColor(valueDeg, range) {
  return divergingColor(valueDeg / range);
}

/* ─────────────────────────────────────────────────────────────
   11.  LEVEL-FLIGHT TRIM CYCLIC
   ─────────────────────────────────────────────────────────────
   Inverts Van Holten eqs. 79-80 for steady level flight
   (p = q = 0) to find the θ₁s and θ₁c that simultaneously
   zero longitudinal and lateral flapping:
     a₁c = 0  (no fore/aft disc blowback)
     a₁s = 0  (no lateral disc tilt)
   This keeps the disc level relative to the hub at every speed.

   Derivation:
   Eq. 79:  a₁ = (8μθ₀/3 − 2μλ − θ₁s(1+3μ²/2)) / (1−μ²/2)
            a₁c = −a₁  →  a₁c=0  ⇒  θ₁s = (8μθ₀/3 − 2μλ)/(1+3μ²/2)

   Eq. 80:  b₁ = (4μa₀/3 + θ₁c(1+3μ²/2)) / (1+μ²/2)
            a₁s = −b₁  →  a₁s=0  ⇒  θ₁c = −(4μa₀/3)/(1+3μ²/2)

   Returns { t1s_deg, t1c_deg, a0_deg, fusPitchDeg }
   fusPitchDeg is the nose-down body pitch for drag equilibrium.
*/
function computeTrimCyclic(st) {
  const mu  = advanceRatio(st);
  const lam = inflowRatio(st);
  const gam = st.Lock;
  const t0   = st.theta0 * Math.PI / 180;
  const twst = st.twist  * Math.PI / 180;

  // Coning angle — includes blade twist (same derivation as flappingCoeffs)
  const a0 = (gam / 8) * (  t0   * (1 + mu * mu)
                           + twst * (1/20 - mu * mu / 12)
                           - (4/3) * lam);

  // θ₁s — forward cyclic to zero longitudinal flapping (eq. 79 inverted, a₁=0)
  // With corrected a₁ = [...+ t1s·(1+3μ²/2)] / denom: solving for t1s gives NEGATIVE value.
  // Negative t1s = more pitch at ψ=270° (RET) = less at ψ=90° (ADV).
  // Phase lag: pitch max at RET → flap up at AFT (ψ=0°) → disc tilts forward ✓.
  // This also gives high AoA at the retreating blade — the correct picture for pilot training.
  const t1s = mu > 0.005
    ? -((8 * mu * t0 / 3 - 2 * mu * lam) / (1 + 3 * mu * mu / 2))
    : 0;

  // θ₁c — lateral cyclic to zero lateral flapping (eq. 80 inverted, b₁=0)
  // With corrected b₁ = [... − t1c·(1+μ²/2)] / denom80: solving gives POSITIVE t1c.
  // For CCW rotor in forward flight: b₁_natural > 0 (disc tilts starboard due to inflow roll).
  // Positive t1c (more pitch at AFT) tilts disc to port, correcting the starboard tilt.
  const t1c = mu > 0.005
    ? (4 * mu * a0 / 3) / (1 + mu * mu / 2)
    : 0;

  // Fuselage nose-down pitch — proper drag/weight force balance:
  //   D = ½ρV²f_eq ,  W = 2ρAv_h²  (ρ cancels)
  //   α = −arctan(D/W) = −arctan(V²·f_eq / (4·A·v_h²))
  // f_eq = 0.9 m² flat-plate area; consistent with power curve model.
  const f_eq  = 0.9;
  const R_t   = st.R || 6.7;
  const OmR_t = tipSpeed(st);
  const A_t   = Math.PI * R_t * R_t;
  const lam_h = inflowRatio({ ...st, V: 0 });   // hover inflow
  const v_h   = lam_h * OmR_t;                  // hover induced velocity [m/s]
  const DoverW = (st.V * st.V * f_eq) / (4 * A_t * v_h * v_h);
  const fusPitchRad = -Math.atan(DoverW);

  return {
    t1s_deg:     t1s * 180 / Math.PI,
    t1c_deg:     t1c * 180 / Math.PI,
    a0_deg:      a0  * 180 / Math.PI,
    fusPitchDeg: fusPitchRad * 180 / Math.PI,
  };
}

/* ─────────────────────────────────────────────────────────────
   12.  DISC-TILT VECTOR  (for helicopter schematic)
   ───────────────────────────────────────────────────────────── */
/**
 * Returns { a0, a1c_deg, a1s_deg, discTiltFwd, discTiltLat } in degrees.
 * discTiltFwd: nose-down positive (from a₁ forward blowback)
 * discTiltLat: right-down positive (from b₁)
 */
function discTiltAngles(st) {
  const c = flappingCoeffs(st);
  const d = 180 / Math.PI;
  return {
    a0_deg:        c.a0  * d,
    a1c_deg:       c.a1c * d,
    a1s_deg:       c.a1s * d,
    discTiltFwd:  -c.a1c * d,  // a₁ = − a1c; positive a₁ = rearward = nose-up disc
    discTiltLat:  -c.a1s * d,
  };
}
