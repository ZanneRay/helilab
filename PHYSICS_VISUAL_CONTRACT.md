# HeliLab — Physics & Visual Contract

## Content audit clarification — 2026-10-02

This clarification takes precedence over universal teaching claims below. The
core aerodynamic equations and rotor/azimuth conventions are unchanged.

- Positive **total** U_P reduces alpha at fixed pitch in normal chordwise flow.
  Induced downflow alone does not establish total U_P; upflow can give negative phi.
- The velocity-triangle widget must use the same trimmed state for pitch and
  blade motion, retain signed throughflow, and include the existing induced,
  flap-rate and coning terms from localVelocityDecomposition. Remove its old
  absolute-throughflow/trimmed-pitch/natural-flap blend. This reuses the core
  blade-element equations (Leishman, *Principles of Helicopter Aerodynamics*,
  forward-flight BET, section 3.5.2); no core equation is changed. Check displayed
  U_T/U_P, their sum and atan2 against the core for hover, opposite azimuts and
  negative total U_P. Any optional Foundation map uses a prescribed phi based on
  radius alone: label that different approximation, and do not equate its
  diagnostic alpha with the actual local triangle.
- Use Extended as the initial optional disc approximation. The early velocity
  task starts at 60 kt; keep advanced map/threshold diagnostics collapsed after
  the local triangle and controls. Foundation remains an explicitly different
  optional approximation, not the initial normal-flow explanation.
- A near-90-degree forcing/flapping phase is an idealised rotor response, not
  a universal rigid-gyroscope law. Hinge offset, stiffness and aerodynamic damping
  change phase (NASA TN D-7856, pp. 28–29, DOI record 19750010111).
- Predicted stall cells, assumed critical alpha and the Mach 0.85 comparison line
  are teaching-model diagnostics. They do not compute aircraft V_NE or symptoms.
  Stall position depends on the selected trim, twist and inflow assumptions.
- The Coriolis widget prescribes zeta = gain * d(beta)/d(psi). It does not solve
  radial centre-of-mass geometry, lag damping or coupled rotor dynamics. The
  inward/upward analogy assumes positive coning; real lag phase is not established
  by this prescribed curve.
- Remove the unvalidated LTE margin index and its controllability verdict.
  Keep conventional CCW wind sectors as historical mechanism illustrations,
  with overlapping sectors visible. Weathercock effects act through fuselage/fin
  yaw moments, not an assumed loss of tail-rotor thrust. With zero wind there is
  no active wind mechanism. No tail-rotor authority or yaw motion is computed.
  Sources: FAA AC 90-95, pp. 3 and 7; Airbus SIN 3298-S-00, revision 0 (2019).
- Power-curve markers identify min(P) and min(P/V) in the selected model. Fuel
  endurance/range need fuel-flow and wind assumptions; climb needs available
  power. A powered level-flight curve does not determine autorotation performance.

Primary documents:
[NASA TN D-7856](https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf),
[FAA AC 90-95](https://www.faa.gov/documentLibrary/media/Advisory_Circular/ac90-95.pdf),
[Airbus SIN 3298-S-00](https://www.airbus.com/sites/g/files/jlcbta136/files/2025-01/3298-s-00-rev-0-en.pdf).


> Single source of truth for the conventions every HeliLab tab must obey.
> Authority: the codebase (`helilab_draw.js`, `helilab_widgets.js`, `helilab_core.js`,
> `flapping.js`) + the instructor's confirmed Leishman BET ground truth.
> **If a future change conflicts with this document, update the document FIRST,
> then the code.** This exists to stop re-litigating design choices per commit.

Status: functionally mature — stabilisation phase. v1.0 tag only after the
cross-tab audit (§6) and one instructor/student review pass.

---

## 1. Physics authority — Leishman BET, never invented

- All aerodynamics follow Leishman, *Principles of Helicopter Aerodynamics*,
  Blade-Element Theory with momentum-theory inflow. **Never invent a cos/sin/sign.**
  If unsure, stop and verify against `verify_physics.js` (all checks must stay green).
- Any equation change requires: (a) a citation to Leishman, (b) an updated
  `verify_physics.js` case, (c) this document updated in the same commit.

### Confirmed sign & flapping convention (do not change)

- Perpendicular velocity builds from inflow + flapping:
  `U_P = v_i + v_n + v_flap`, with **`v_flap = +(β̇/Ω)·r̄`** (positive Leishman sign).
- Advancing blade (β̇ > 0) → `U_P` grows → inflow angle φ grows → **α shrinks**.
- Retreating blade (β̇ < 0) → `U_P` shrinks → **α grows**.
- This is why the high-α region sits at the **retreating tip (ψ = 270°, r → 1)**.
- For **Flapback & Inflow Roll**:
  - `Transverse Flow Effect` is used in-course as the pedagogical label for the
    **inflow-roll** mechanism (fore-aft wake-induced inflow asymmetry), not for flapback.
  - **Core mechanism (transverse-flow / inflow roll):** during the hover-to-forward-flight
    transition the front disc encounters progressively less-downwashed air (lower λ) while
    the aft disc remains in rotor downwash (higher λ). This is the λ_c fore-aft gradient.
    Causal chain: Δλ → different U_P → different φ = atan2(U_P,U_T) → different α = θ−φ →
    different lift → flapping with ~90° phase lag → roll tendency → countered by lateral cyclic.
  - **λ_s (lateral gradient):** a separate, optional scenario from lateral wind, sideslip,
    or yaw rate. It creates an ADV/RET inflow asymmetry and an additional roll component.
    Must be labelled explicitly as "additional lateral inflow asymmetry", not as the core
    definition of the Transverse Flow Effect.
  - Coning/blade-motion terms contribute to local normal velocity in the blade
    velocity triangle (`μ cosψ · β`, `(β̇/Ω)·r̄`, body-rate terms where active).
  - These terms modify local `U_P`, `φ`, and `α`, but do **not** by themselves
    create wake/inflow asymmetry (`λ_c`, `λ_s`).
  - **Velocity Triangles visualisation:** station A = front (ψ=180°), station B = aft (ψ=0°).
    At both stations sin(ψ)=0, so U_T = r̄ (no advance-ratio contribution). U_P_A = λ_A·ΩR
    (smaller in fwd flight), U_P_B = λ_B·ΩR (larger). U_P amplified ×8 in display for clarity;
    noted on diagram. Coning overlay shows μ·cos(ψ)·a₀ as a separate dashed contribution.

### Golden-state values (regression anchor)

Free-flap trim, ψ = 90°, 129 kt, r̄ = 0.75:

| quantity | value |
|----------|-------|
| U_P      | +0.0748 |
| v_i      | +0.0161 |
| v_n      | −0.0360 |
| v_flap   | +0.1023 |

These are the regression anchors; any engine change must reproduce them.

---

## 2. Rotor & azimuth convention

- Main rotor spins **counter-clockwise (CCW)** viewed from above — H145 / BK117 D-3.
- Azimuth (ψ), measured CCW from the tail:

| ψ       | position              |
|---------|-----------------------|
| 0°      | tail (STUUR)          |
| 90°     | advancing side (right)|
| 180°    | nose                  |
| 270°    | retreating side (left)|

- The 2D side-view model faces **right** (nose at +x), extracted from
  `Heli_simple.obj` with hub at model `x = 0.6687, y = 0.2771` (`helilab_model2d.js`).
- 3D model: `helilab_3d.js` loads `image/Heli_simple.glb`, rotates +90° Y
  (nose +Z → +X), hides `Circle`/`BLADE` nodes, draws its own NACA-0012 blades.
  `GLB_HUB = (0.031, 1.909, 2.035)`, `GLB_SCALE = 0.34`.

---

## 3. Colour palette (from `helilab_draw.js`)

| role    | hex      | meaning                          |
|---------|----------|----------------------------------|
| ink     | `#e6edf3`| primary text                     |
| dim     | `#8b9bb4`| secondary lines / weight vector  |
| accent  | `#38bdf8`| rotor, highlights, data accents  |
| chord   | `#fb923c`| chord lines                       |
| lift    | `#34d399`| thrust / lift forces (green)     |
| drag    | `#f87171`| drag force (red)                  |
| warn    | `#fbbf24`| net/acceleration force (amber)    |
| wind    | `#38bdf8`| airflow                           |
| bad     | `#f87171`| stall / error                     |
| good    | `#34d399`| confirmation                      |

- **1 accent + neutrals.** A force vector's colour is its meaning; never decorate.
- Light/dark via CSS vars — every visual property must adapt to both.

---

## 4. Force-vector layout (tab 0 / big-picture, the reference)

Two origin clusters — rotor forces at the hub, body forces at the CG:

| force      | origin         | direction              | length (px)                                            |
|------------|----------------|------------------------|--------------------------------------------------------|
| Thrust     | hub (mastTop)  | ⊥ to disc, up-forward  | `max(12, min(tw, 1.6) · WL)`                         |
| Weight     | CG (`cgY=cy−6`)| straight down          | `WL` (fixed reference, = 46 px)                       |
| Drag       | CG             | backward (left)        | `min(DN / max(ThN, WN·0.02) · WL, 1.6·WL)`             |
| Accelerate | hub            | horizontal (net force) | `netN / WN · WL` — **small residual, intentionally NOT proportional** |

- `WL = 46` px (fixed weight-reference length); wireframe scale `WS = W·0.40`;
  `mastTop = cy − 52`. Tab 0 is the reference layout; other tabs may use a local
  `WL`/cap (e.g. tab 12 uses `WL = 40`, cap `1.4`) for canvas sizing, but the
  **origin + scale-reference rules above hold across all tabs**.
- **The net-force arrow is a residual** (`T_h − Drag`) and is deliberately underscaled
  relative to WN so it never exceeds the main forces. This is a *display* choice, not
  a physical proportion. (Decision logged after the 3ac48f4 revert.)
- `nose ▸` label: below the nose tip at `(noseXs, cy + 22)`, outside the fuselage.

### Label-placement rules (apply to every tab)

1. No text-on-text and no text-on-arrow collisions at any slider state.
2. Vectors and labels must fit inside the canvas at **desktop (1280) and mobile (390)**.
3. When a horizontal label would collide with a tilted disc/line above, drop it below.
4. Labels for left-pointing arrows live left of the hub; right-pointing live right
   (so opposite-direction arrows never stack labels on one side).
5. Background-grid text overlap is acceptable; intended force-on-disc overlap
   (thrust from the hub) is acceptable.

---

## 5. Per-tab leading concept (mapping to the EASA 082 POF(H) syllabus)

| #  | tab                              | leading relation / concept                |
|----|----------------------------------|--------------------------------------------|
| 0  | How a Helicopter Flies           | force balance: T·sinθ − D = m·a            |
| 1  | Rotor = spinning wing            | blade as airfoil, U_T = Ω·r                 |
| 2  | The Blade Element                | BET strip integration                       |
| 3  | Where lift is born — θ           | α = θ − φ                                   |
| 4  | Speed along the blade            | U_T = Ωr̄ + μ sinψ                          |
| 5  | Outer blade does the work        | dL ∝ U_T²                                  |
| 6  | Hover & induced flow             | momentum theory, v_i                        |
| 7  | Momentum meets BET               | v_i coupling                                |
| 8  | Climb / vortex ring              | axial inflow states                         |
| 9  | Ground effect                    | reduced induced power                       |
| 10 | Dissymmetry of lift              | U_T(ψ), α peak at ψ = 270°                  |
| 11 | Flapping — automatic fix         | β̇, v_flap sign (§1)                         |
| 12 | Retreating stall / envelope      | V_NE vs stall/speed walls                   |
| 13 | Guided BET                        | layered velocity triangle                   |
| 14 | BET Velocity Triangle            | U_T, U_P, φ, α                              |
| 15 | Retreating blade slow — vectors  | U_P sign at ψ = 270°                        |
| 16 | Coriolis — lead & lag            | flap → drag hinge moment                     |
| 17 | Dynamic Rollover                 | pivot point, mast ⊥ disc (rot() convention)  |
| …  | LTE / Autorotation / Power / BET Diagram | see content.js                  |

(Full title/subtitle list lives in `helilab_content.js`; keep this table in sync
when tabs are renumbered.)

---

## 6. Golden-state QA matrix (template — to be filled per tab)

For each tab, define 2–4 slider states with expected physics + a screenshot
check. This is what turns this document from advice into an enforceable contract.

```
tab: <name>
state 1: collective=__, cyclic=__, pedals=__, V=__
  expected: <key readout / vector behaviour>
  screenshot: desktop + mobile, light + dark
state 2: ...
```

- Fill this matrix during the cross-tab audit (next phase).
- A tab passes when: `verify_physics.js` green AND all golden screenshots clean
  AND no label collisions at any defined state.

---

## 7. Change protocol

1. **Feature freeze** — only correctness, consistency, didactic clarity.
2. Any visual change must reference this contract's rule it obeys (or update the rule).
3. Batch issues into one list per session; fix in focused passes, not piecemeal.
4. Every commit: `verify_physics.js` stays fully green; screenshot the affected tab(s).
5. Deploy → wait for Pages `built` → live smoke-test the changed tab before done.

---

## Open decisions (logged, not re-litigated)

- **Decelerate label in pure decel** (tilt≈0, net small): left as-is — net-force is a
  small residual and the readout already says "decel". Documented, not a bug.
- **Net-force arrow scale**: `/WN` (small residual), *not* `/max(ThN,DN)`. Reverted in
  3ac48f4 after the latter made the arrow oversized vs the main forces.

## 2026-10-01 — induced-inflow harmonic correction

`HL.linearInflowModel` is a prescribed **induced-only** first-harmonic teaching model. Its previous gradient omitted the mean induced ratio, producing front/rear values of about −64/+70 m/s at the reviewed 80 kt condition. It also described the total throughflow as induced flow.

The corrected longitudinal coefficient uses the same prescription already used by `flapping.js:localInflow`: `lambda_c = lambda_i * (4/3) * mu / (hypot(mu,lambda_i) + lambda_i)`. The existing source annotation attributes this longitudinal skew approximation to Drees/Leishman. The optional lateral-wind illustration uses the analogous mean-scaled coefficient with `mu_lat`; it is independent of the longitudinal coefficient. This helper is **not** the full Drees lateral term and **not** Pitt–Peters dynamic inflow. It illustrates steady hover/forward-flight gradients, not VRS or transient wake dynamics.

The old tests demanded monotonically increasing *absolute* asymmetry with speed; that incorrectly suppressed the decrease of mean induced flow. Tests now check normalised skew, the 4/3 mean-relative bound, physically reasonable local speeds and agreement with the established longitudinal core prescription at fore/aft azimuths. Aircraft throughflow remains separate. Signed upwash must be drawn with its sign and must not be silently relabelled zero. No axial, trim, flapping or power equations were changed.
