# HeliLab — Physics & Visual Contract

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
  If unsure, stop and verify against `verify_physics.js` (37/37 must stay green).
- Any equation change requires: (a) a citation to Leishman, (b) an updated
  `verify_physics.js` case, (c) this document updated in the same commit.

### Confirmed sign & flapping convention (do not change)

- Perpendicular velocity builds from inflow + flapping:
  `U_P = v_i + v_n + v_flap`, with **`v_flap = +(β̇/Ω)·r̄`** (positive Leishman sign).
- Advancing blade (β̇ > 0) → `U_P` grows → inflow angle φ grows → **α shrinks**.
- Retreating blade (β̇ < 0) → `U_P` shrinks → **α grows**.
- This is why the high-α region sits at the **retreating tip (ψ = 270°, r → 1)**.

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
4. Every commit: `verify_physics.js` stays 37/37; screenshot the affected tab(s).
5. Deploy → wait for Pages `built` → live smoke-test the changed tab before done.

---

## Open decisions (logged, not re-litigated)

- **Decelerate label in pure decel** (tilt≈0, net small): left as-is — net-force is a
  small residual and the readout already says "decel". Documented, not a bug.
- **Net-force arrow scale**: `/WN` (small residual), *not* `/max(ThN,DN)`. Reverted in
  3ac48f4 after the latter made the arrow oversized vs the main forces.
