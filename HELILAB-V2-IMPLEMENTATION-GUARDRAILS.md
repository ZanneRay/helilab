# HeliLab v2 — Vertical-Slice Implementation Guardrails

**Status:** Approved implementation addendum for issue #61  
**Parent specification:** `HELILAB-V2-ARCHITECTURE-UX-SPEC.md`  
**Applies to:** HeliLab v2 first vertical slice only  
**Source:** technical red-team after architecture review

---

## 1. Decision

**APPROVE WITH CHANGES.**

The HeliLab v2 architecture can be introduced incrementally without rewriting the validated physics or existing widgets.

The implementation strategy is a new v2 presentation/navigation/data-adapter layer over the existing content, widget registry and physics/3D systems.

The existing lesson IDs and legacy `stage` metadata remain temporarily available for compatibility during the vertical slice.

Do not perform a broad M2–M7 migration in this work.

---

## 2. Binding technical guardrails

### 2.1 Preserve legacy IDs and compatibility during the slice

- Keep existing lesson/object IDs stable, including `m1-04`, `bladeelement`, `spanwise` and other current IDs.
- Existing `stage` values may remain in the underlying content model while the v2 shell introduces parallel module/mode metadata.
- The v2 layer points to existing learning objects; existing objects must not be renumbered merely to fit the new architecture.
- Legacy rendering may remain as compatibility/fallback code while Module 1 is migrated.

### 2.2 Single active Three.js renderer ownership

At most **one active Three.js/WebGL renderer/context may be owned by the currently active v2 view**.

Requirements:
- do not leave a homepage renderer actively animating after navigation to the Rotor Lab;
- pause/dispose the teaser when hidden, off-screen or route-unmounted;
- avoid duplicate Three.js scenes/renderers that independently implement the wake;
- route changes must not leave orphaned requestAnimationFrame loops or WebGL contexts;
- the full Rotor Lab remains the authoritative full 3D experience.

### 2.3 Homepage teaser is not the Sandbox

The homepage hero is a constrained instructional teaser, not a duplicate control panel.

For the vertical slice:
- expose one primary interaction only, preferably **airspeed**;
- use the existing renderer and existing derived physics/wake path;
- visibly demonstrate wake skew as speed increases;
- keep labels/telemetry minimal;
- do not expose the full Sandbox control bank;
- respect `prefers-reduced-motion` and provide a useful static/non-WebGL fallback;
- pause rendering when the teaser is outside the viewport where practical.

### 2.4 Guided 3D presets must be serialisable and one-directional

Guided hand-offs from a learning object to the 3D Rotor Lab must use a small serialisable preset/state descriptor rather than duplicate aerodynamic formulas.

Conceptual shape:

```js
{
  preset: 'm1-rotor-flow',
  mode: 'guided',
  controls: ['airspeed']
}
```

Exact schema is developer-owned, but the data-flow rule is binding:

**learning-object preset → existing app/physics state → existing derived quantities → existing `helilab_3d.js` renderer**

Do not calculate a second independent wake, inflow model or BET solution in homepage/module components.

### 2.5 Routing/state safety

The v2 shell must support, at minimum:
- Home
- Module 1 landing
- M1 activity entry
- 3D Rotor Lab full/free mode
- one guided Rotor Lab preset

Deep links and browser back/forward must not produce:
- blank views;
- duplicate mounted widgets;
- duplicate Three.js contexts;
- stale guided-preset state leaking into full Sandbox mode.

The precise route format is developer-owned. A route/query pattern such as `rotor-lab?preset=...` is acceptable if state ownership remains clear.

### 2.6 M1-04 is a protected reference Mission

The v2 slice may change how M1-04 is entered, titled and framed, but must preserve its current pedagogical interaction:

**construct → commit → reveal → explain**

Do not regress it to recognition-only multiple choice. Do not rewrite its physics or BET conventions as part of the shell migration.

Student-facing title:

**MISSION — Build a Blade Element**

Internal ID `m1-04` may remain metadata.

### 2.7 VRS / wake-fidelity communication

The current 3D wake is a physics-driven conceptual visualisation of derived state, not CFD and not a validated free-wake VRS solution.

If a descent/VRS-like preset appears anywhere in the v2 UI, the UI must include a fidelity note equivalent to:

> **Conceptual wake visualisation derived from the lab state; not a CFD or validated free-wake VRS solution.**

Do not use the current trailing-vortex renderer to make claims it cannot support about full turbulent VRS development.

---

## 3. Approved implementation sequence for issue #61

1. **Add a minimal v2 adapter/catalogue**
   - keep `HL_LESSONS` and existing widgets functional;
   - add Module 1/module-mode metadata without deleting old stages.

2. **Add v2 shell and route/state ownership**
   - Home;
   - Module 1;
   - activity entry;
   - 3D Rotor Lab;
   - compatibility with existing views where needed.

3. **Build the homepage**
   - `Understand the rotor. Don’t memorise it.` identity;
   - seven-module journey visible/capable;
   - MODEL / EXPLORE / MISSION / CHALLENGE philosophy;
   - restrained real 3D teaser using the existing renderer;
   - one airspeed interaction demonstrating wake skew;
   - reduced-motion/off-screen/WebGL lifecycle handling.

4. **Build the Module 1 landing page**
   - driving question;
   - `VELOCITIES → ANGLES → FORCES → COMPONENTS → ROTOR`;
   - existing M1 objects grouped by pedagogical mode rather than ordinary lesson numbering;
   - M1-04 presented as the reference Mission.

5. **Implement one guided `View this in 3D` hand-off**
   - constrained preset;
   - uses existing physics/renderer path;
   - clear transition to full free Rotor Lab.

6. **Retain the current Sandbox as Full 3D Rotor Lab**
   - do not remove free exploration;
   - broad control regrouping may be minimal in this slice unless required for coherence.

7. **QA and stop**
   - run `verify_physics.js`;
   - manually inspect approximately 1840, 1280, 768 and 390 px widths;
   - verify no question/action/Next scroll traps;
   - verify renderer lifecycle and no duplicate WebGL contexts;
   - verify M1-04 behavior has not regressed;
   - provide screenshots, changed files, tests and known limitations;
   - **STOP for product/didactic review.**

---

## 4. Explicitly out of scope

For issue #61, do not:
- migrate M2–M7;
- remove all legacy `stage` metadata;
- rewrite physics;
- create a new wake model;
- replace `helilab_3d.js` with decorative animation;
- implement formal assessment/LMS persistence;
- introduce `mastered`, `proficient` or pass/fail claims;
- broadly refactor unrelated widgets;
- complete the future course-map/progress migration tracked separately.

---

## 5. Review gate

The vertical slice is a **product proof**, not the start of automatic full migration.

After the PR is ready, review the following before M2–M7 work begins:
- Does the homepage communicate the new teaching philosophy within ~10 seconds?
- Is the 3D teaser impressive because of real HeliLab behavior rather than visual decoration?
- Does Module 1 feel like a coherent learning journey instead of a reskinned lesson list?
- Are MODEL / EXPLORE / MISSION meaningfully differentiated?
- Does M1-04 still require genuine construction?
- Does the 2D → 3D hand-off add conceptual understanding?
- Is the full Sandbox still powerful and usable?
- Are physics, renderer lifecycle, responsive behavior and model-fidelity claims sound?

Only after this review is approved should the pattern scale to later modules.
