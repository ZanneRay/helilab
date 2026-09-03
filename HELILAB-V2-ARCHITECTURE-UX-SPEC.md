# HeliLab v2 — Architecture & UX Specification

**Status:** Architecture freeze candidate v1.0  
**Owner:** ATPL(H) Principles of Flight learning ecosystem  
**Repository:** `ZanneRay/helilab`  
**Umbrella issue:** #60  
**Vertical-slice issue:** #61

---

## 1. Purpose

HeliLab v2 restructures the existing application around the new ATPL(H) Principles of Flight learning philosophy while preserving validated physics, drawing conventions and useful existing widgets.

HeliLab is not a linear e-learning course and is not the formal assessment system of record.

> **HeliLab is the interactive concept laboratory for ATPL(H) Principles of Flight.**

Its purpose is to make invisible aerodynamic mechanisms visible and manipulable so that students learn to reason causally rather than memorise completed diagrams or isolated statements.

The student progression is:

**see → predict → construct → manipulate → explain → transfer**

The wider CBT learning cycle remains:

**ORIENT → PREDICT → BUILD → EXPLORE → EXPLAIN → APPLY → CHECK & REFLECT**

---

## 2. Product principles

1. **One aerodynamic model, reused repeatedly.**
   Students should repeatedly recognise the chain from local flow to aircraft response rather than meet unrelated animations.

2. **Action must match the learning objective.**
   If the target is construction, the interaction must require construction. If the target is prediction, the learner must commit before reveal.

3. **Progressive scaffolding.**
   Early activities show more; later activities remove support.

4. **Interaction is instructional, not decorative.**
   Motion, highlighting and 3D views must reveal causal relationships.

5. **No unnecessary physics rewrite.**
   Existing validated solvers, drawing code and 3D state inputs are assets. Refactor the product layer around them.

6. **HeliLab remains formative.**
   It may store convenience/progress state locally, but must not imply formal mastery or replace LPlus/controlled assessment.

7. **Visual continuity matters.**
   The same variables, vector conventions and colour language must carry through textbook figures, instructor visuals, 2D HeliLab diagrams and 3D views.

8. **No feature should exist only because it is visually impressive.**
   Every major interaction must answer a learning question.

---

## 3. New student-facing architecture

The current five-stage architecture (`Basics`, `Hover & Vertical`, `Forward Flight`, `Safety & Limits`, `Advanced`) is replaced in the primary UI by the seven-module curriculum architecture.

### Module 1 — Building Rotor Lift
**Driving question:** How can a rotating blade create and control rotor thrust?  
**Reasoning character:** construct the local model.

### Module 2 — Hover & Vertical Flow
**Driving question:** How does induced/vertical flow change the rotor state?  
**Reasoning character:** compare flow states.

### Module 3 — Transition, Asymmetry & Rotor Mechanics
**Driving question:** How does the rotor cope with unequal airflow around the disc?  
**Reasoning character:** reason around the rotor disc.

### Module 4 — Performance & Aerodynamic Limits
**Driving question:** What becomes limiting as speed, loading and operating condition change?  
**Reasoning character:** integrate competing limits.

### Module 5 — Stability, Control & Anti-Torque
**Driving question:** How are helicopter forces and moments balanced and disturbed?  
**Reasoning character:** diagnose equilibrium/control problems.

### Module 6 — Autorotation & Rotor Energy
**Driving question:** Where does rotor energy come from without engine torque?  
**Reasoning character:** trace energy flow and local driving/braking force.

### Module 7 — Integration & Mastery
**Driving question:** Can the learner diagnose a new aerodynamic situation from first principles?  
**Reasoning character:** transfer.

`Mastery` in the module title is curriculum language. HeliLab progress UI must still avoid unsupported individual claims such as `mastered` or `proficient`.

---

## 4. HeliLab activity modes

`MODEL → EXPLORE → MISSION → CHALLENGE` is the interaction progression.

It is **not** a quota. A module may contain multiple Explore activities, no Challenge, or a Mission built from several existing widgets.

### MODEL
Purpose: make one relationship visible and build a stable mental model.

Typical pattern:

**question → guided visual → relationship explanation**

Characteristics:
- high scaffolding;
- labels visible;
- few or no free controls;
- one core mechanism per screen;
- no unnecessary quiz layer.

### EXPLORE
Purpose: investigate how changing one or two inputs changes the model.

Typical pattern:

**predict → change input → observe → explain**

Characteristics:
- maximum 1–2 primary learning controls where practical;
- prediction before manipulation for key relationships;
- reset/reference state always available;
- feedback highlights what changed and why;
- avoid uncontrolled slider searching as the learning method.

### MISSION
Purpose: combine previously learned concepts into a coherent causal model.

Typical pattern:

**construct → commit → reveal → explain**

Characteristics:
- staged interaction;
- visible progress through the reasoning sequence;
- user action physically matches the required reasoning;
- no answer revealed before commitment;
- M1-04 `Build a Blade Element` is the reference implementation.

### CHALLENGE
Purpose: transfer with less scaffolding.

Typical pattern:

**new state → construct/diagnose → commit → feedback on first broken causal link**

Characteristics:
- minimal hints;
- no completed diagram;
- new/unrehearsed conditions;
- formative only;
- must not masquerade as the formal exam or an LMS grade.

---

## 5. Persistent causal spine

Across modules, HeliLab should repeatedly expose the same fundamental reasoning structure:

**LOCAL VELOCITIES → RELATIVE AIRFLOW → ANGLES → LOCAL FORCES → RESOLVED COMPONENTS → ROTOR CONSEQUENCE → AIRCRAFT RESPONSE**

For Module 1 the student-facing short spine is:

**VELOCITIES → ANGLES → FORCES → COMPONENTS → ROTOR**

This should appear on the Module 1 landing page and be reused as a subtle progress/mental-model cue.

---

## 6. Current content inventory — preliminary migration map

A separate reviewed content audit is tracked in #62. The following mapping is the baseline for that audit.

| Current object | Target | Mode / role | Baseline action |
|---|---|---|---|
| `bigpicture` — How a Helicopter Flies | Intro / M1 | MODEL / orientation | Keep, shorten, remove course-dump feel |
| `bladeelement` — The Blade Element | M1 | MODEL + EXPLORE | Pedagogically split/reframe; geometry before formula |
| `m1-04` — Build a Blade Element | M1 | MISSION | Keep as reference Mission; student-facing title drops internal code |
| `spanwise` — Speed Along the Blade | M1/M2 | EXPLORE | M1 keeps `vrot = Ωr`; twist/tip-loss depth moves with 3D rotor-flow scope |
| `hover` — Hover & Induced Flow | M2 | MODEL | Keep, refocus around flow state and causal chain |
| `verticalflight` — Climb, Descent & VRS | M2 | EXPLORE | Likely split conceptually so VRS is not buried in a large page |
| `groundeffect` — Ground Effect | M2 | EXPLORE | Keep with predict-before-change |
| `dissymmetry` | M3 | MODEL | Keep |
| `flapping` | M3 | EXPLORE | Keep; make problem → rotor response relationship explicit |
| `bet-guided` | M3 | MISSION candidate | Reframe as integrated forward-flight rotor reasoning |
| `coriolis` | M3 | EXPLORE / reference | Keep only at required depth |
| `flaproll` | M3 | EXPLORE / CHALLENGE | Likely split mechanisms rather than one dense page |
| `envelope` | M4 | EXPLORE | Keep; separate integrated envelope from prerequisite compressibility model |
| `performance` | M4 | EXPLORE | Move from old `Advanced` stage |
| `lte` | M5 | EXPLORE / Mission component | Integrate with anti-torque/control architecture |
| `dynamicrollover` | M2 or M5 | CHALLENGE / application | Curriculum-home decision required; document rationale |
| `autorotation` | M6 | MODEL + EXPLORE | Keep, strengthen energy-flow framing |
| `betdiagram` | M6 / global reference | MISSION / reference | Reuse as recurring BET model, not just final exam drawing |

Module 7 should mainly contain integrated transfer scenarios and diagnostic challenges, not another theory list.

---

## 7. Global navigation

Primary navigation target:

```text
HELILAB
│
├── Home
│
├── Learning Journey
│   ├── Module 1 · Building Rotor Lift
│   ├── Module 2 · Hover & Vertical Flow
│   ├── Module 3 · Transition, Asymmetry & Rotor Mechanics
│   ├── Module 4 · Performance & Aerodynamic Limits
│   ├── Module 5 · Stability, Control & Anti-Torque
│   ├── Module 6 · Autorotation & Rotor Energy
│   └── Module 7 · Integration & Mastery
│
├── 3D Rotor Lab
│   └── Full Sandbox
│
└── Lab Tools
    ├── BET Explorer / approved reference tools
    └── Maths / Deep Dive
```

The 3D Rotor Lab is a first-class product area and must not be hidden as a minor utility.

Maths/deep-dive material remains secondary/reference and must not disrupt the main learning journey.

---

## 8. Homepage — product and learning brief

### 8.1 Goal

Within approximately 10 seconds, a student should understand:
- this is interactive helicopter aerodynamics;
- the product is about understanding mechanisms, not memorising slides;
- there is a clear learning journey;
- the 3D rotor/wake system is real course functionality, not decorative marketing.

Within approximately 30 seconds, an instructor/reviewer should see that the interface reflects a coherent learning design.

### 8.2 Hero copy

Recommended starting point:

**HELILAB**  
**Understand the rotor. Don’t memorise it.**  
*Interactive Helicopter Aerodynamics for ATPL(H)*

Learning cue:

**PREDICT → BUILD → EXPLORE → EXPLAIN**

Primary actions:
- `CONTINUE LEARNING`
- `EXPLORE THE 3D ROTOR LAB`

### 8.3 Hero visual

Use a lightweight version of the existing real 3D renderer, not a stock helicopter image and not a fake pre-rendered vortex animation.

Preferred constrained interaction:

**AIRSPEED** slider or discrete transition control.

At/near hover:
- tip-vortex wake convects primarily downward.

As forward speed increases:
- wake visibly skews aft according to the existing derived state;
- a minimal cue may show `μ ↑ → wake skew ↑`;
- avoid loading the full engineering control bank into the hero.

The visual must stay restrained: no neon gaming dashboard, no decorative telemetry.

### 8.4 Homepage sections

1. **Hero / 3D teaser**
2. **One model. Seven flight problems.** — module journey
3. **How HeliLab teaches** — MODEL / EXPLORE / MISSION / CHALLENGE
4. **Built into a learning ecosystem** — concise link to pre-study, instructor teaching, retrieval and controlled assessment
5. **Continue** — contextual resume target if progress exists

---

## 9. Module landing page template

A module opens to a learning map, not directly into an old numbered lesson.

### Module 1 reference layout

```text
MODULE 01
BUILDING ROTOR LIFT
How can a rotating blade create and control rotor thrust?

VELOCITIES → ANGLES → FORCES → COMPONENTS → ROTOR

MODEL
Relative Airflow & the Blade
[OPEN]

EXPLORE
Pitch ≠ Angle of Attack
[EXPLORE]

EXPLORE
Cross the Stall Boundary
[EXPLORE]

◆ MISSION
Build a Blade Element
[START MISSION]

◇ CHALLENGE
New blade. New condition. No completed diagram.
[TRY IT]   (only when/if a curriculum-approved HeliLab challenge exists)
```

Student-facing pages should use meaningful titles. Internal curriculum IDs such as `M1-04` may remain metadata but should not lead the page title.

---

## 10. Activity-page UX contract

### Shared requirements

Every activity must make these states obvious where applicable:
- where the learner is;
- what they are expected to do;
- what changed;
- what to do next.

Avoid the previously observed anti-pattern:

**instruction/question → oversized canvas → controls below fold → navigation elsewhere**

The interaction, feedback and next action must remain spatially close to the diagram they affect.

### Desktop target

Prefer:

`visual/model | task + controls + feedback + next`

### Tablet target

Either two-column or stacked depending on available width, but the action loop must remain visible without unnecessary scroll.

### Phone target

Prefer:

`task → visual → action/feedback → next`

Do not preserve desktop proportions blindly.

---

## 11. 3D Rotor Lab — flagship environment

Tracked in #63.

The current Sandbox already acts as a physics-driven system view. HeliLab v2 promotes it into a deliberate learning environment with three levels.

### Level 1 — Homepage teaser

Purpose: communicate HeliLab’s identity and one real aerodynamic relationship.

Rules:
- one constrained interaction;
- minimal labels;
- lightweight state;
- reuse the real renderer/physics-derived inputs;
- no full control bank.

### Level 2 — Guided module preset

Purpose: connect a 2D/local model to whole-rotor/wake behavior.

Entry pattern:

`VIEW THIS IN 3D`

A guided preset should:
- open a known state;
- initially expose only controls relevant to the learning question;
- present a prediction prompt before the key change where appropriate;
- then reveal the 3D consequence;
- ask for a short explanation/selection;
- allow expansion to full Lab after the guided sequence.

Potential examples:
- M1: blade station / relative-flow context;
- M2: hover vs forward/vertical flow and wake orientation;
- M3: forward-flight rotor asymmetry context;
- M6: rotor/wake context for autorotational states only where model fidelity supports the claim.

### Level 3 — Full 3D Rotor Lab

Retain the present Sandbox’s free-exploration capability.

Reorganise the control IA:

**FLIGHT STATE**
- collective
- forward speed
- vertical speed
- weight
- density altitude

**ROTOR POSITION**
- azimuth ψ / approved station controls

**VISUALISE**
- wake
- fuselage
- relative velocity
- future overlays only after physics/visual QA

**SCENARIO PRESETS**
- Hover
- Transition / Cruise
- Fast forward flight
- Vertical/descent concept where technically appropriate

The Full Lab can remain richer and less constrained than guided learning objects.

---

## 12. 3D physics and communication boundary

`helilab_3d.js` is a renderer of derived physics state. Preserve that separation.

The current wake representation sheds tip-vortex points and convects them based on the supplied inflow/advance state. This is pedagogically powerful and should be reused.

However:
- do not label the visual as CFD;
- do not claim free-wake validation;
- do not imply that a simple trailing-vortex visualization is a complete model of turbulent VRS development;
- any `VRS descent` preset must clearly distinguish between a conceptual/derived visualization and a validated VRS flowfield solution.

The visual should teach what the model genuinely supports.

---

## 13. Visual design direction

Design target:

**dark aviation laboratory + technical glass + restrained glow + high-quality typography**

Avoid:
- generic LMS cards;
- excessive neon;
- game HUD styling;
- decorative aircraft clipart;
- module-specific colours that compete with aerodynamic colour semantics.

Aerodynamic colour language remains semantically primary:
- airflow / wind: cyan
- chord / pitch: orange
- lift: green
- drag: red
- TAF/resultant: purple
- in-plane braking / `FH`: amber

Modules differ through number, hierarchy, iconography, motion motif and layout—not by repainting physical variables.

---

## 14. Motion design contract

Motion must show causality.

Preferred instructional sequence:

**input appears/changes → connecting vector/geometry updates → resultant changes → consequence highlights**

For comparisons:

**old state ghosts briefly → new state appears → changed variables pulse/highlight**

This aligns with the visual-learning sequence:

**GHOST → PREDICT → REVEAL → TRANSFER**

Respect reduced-motion settings; instructional meaning must remain available without animation.

---

## 15. Progress and course map

Tracked in #64.

Remove the five-stage course map as the primary mental model.

Recommended formative states:

**Not started → Viewed → Explored → Mission complete**

Potential homepage wording:

`Continue: Module 1 · Build a Blade Element`

Avoid unsupported individual claims such as:
- Mastered
- Proficient
- Passed

unless future curriculum evidence explicitly supports them.

LocalStorage may continue to support convenience/progress state, but it is not formal evidence.

---

## 16. Technical migration principles

### Preserve unless correctness requires separate change
- `helilab_core.js`
- current physics solvers
- `helilab_draw.js`
- validated widget physics
- `helilab_3d.js`
- BET visual/physics conventions
- existing M1-04 construction behavior

### Refactor/productise
- `helilab_content.js`
- `helilab_app.js`
- `helilab_coursemap.js`
- navigation/routing
- progress presentation
- homepage
- module landing pages
- activity-mode shell/templates
- Sandbox control grouping / entry modes
- CSS/responsive structure

Avoid creating a second set of solvers or a second independent 3D renderer for the homepage.

---

## 17. Target content data model

Exact implementation is developer-owned, but the product model should support module and mode explicitly.

Example module metadata:

```js
{
  id: 'm3',
  number: 3,
  title: 'Transition, Asymmetry & Rotor Mechanics',
  question: 'How does the rotor cope with unequal airflow around the disc?',
  reasoning: 'Reason around the rotor disc',
  activities: [...] 
}
```

Example activity metadata:

```js
{
  id: 'm3-flapping',
  curriculumId: '...',
  module: 'm3',
  mode: 'explore',
  role: 'core',
  title: 'Why the Blade Flaps',
  widget: 'wFlapping',
  prerequisites: ['m3-dissymmetry'],
  threeDPreset: null
}
```

Compatibility adapters are acceptable during migration so the entire application does not need a risky one-shot rewrite.

---

## 18. Implementation strategy

Do not implement HeliLab v2 as one monster PR.

### Phase 0 — Architecture freeze
- review this spec;
- complete #62 content inventory;
- resolve only decisions that block the vertical slice.

### Phase 1 — Data architecture
- introduce module/mode metadata;
- preserve current widget functionality;
- compatibility layer allowed.

### Phase 2 — New application shell
- homepage route;
- seven-module navigation;
- first-class 3D Rotor Lab route;
- Lab Tools route;
- responsive shell.

### Phase 3 — Homepage
- restrained visual redesign;
- real/lightweight 3D teaser;
- module journey;
- learning-mode explanation;
- continue state.

### Phase 4 — Module 1 landing page
- driving question;
- causal spine;
- Model/Explore/Mission cards;
- route into M1 activities.

### Phase 5 — Activity templates
- Model shell;
- Explore shell;
- Mission shell;
- Challenge shell only as needed by approved content.

### Phase 6 — Module 1 vertical slice
- migrate M1 presentation;
- retain M1-04 as reference Mission;
- add one guided `View this in 3D` hand-off;
- keep full Sandbox available as free 3D Rotor Lab.

**STOP FOR REVIEW HERE.**

No M2–M7 broad rollout before student/instructor/product review approves the slice.

### Phase 7 — M2/M3 migration
- reuse approved patterns;
- split overly dense pages where necessary;
- add only missing interactions that have clear learning purpose.

### Phase 8 — M4–M6 migration
- performance/limits;
- stability/control/anti-torque;
- autorotation/energy.

### Phase 9 — M7
- integrated diagnostic/transfer challenges;
- avoid theory duplication.

### Phase 10 — Progress/course-map migration
- implement #64 after information architecture is stable.

### Phase 11 — QA / accessibility
- complete #65.

---

## 19. Vertical-slice acceptance criteria

Issue #61 is complete only if:

1. The primary UI no longer presents Module 1 as ordinary `lesson x of n` progression.
2. Seven-module architecture is visible/capable in the new shell, even if only M1 is fully migrated.
3. Homepage visibly communicates HeliLab’s new identity.
4. Homepage uses the real 3D system or a shared lightweight mode, not duplicated fake wake animation.
5. Module 1 has a dedicated landing page with driving question and causal spine.
6. M1 learning objects are visibly classified by learning role/mode.
7. M1-04 appears as **MISSION — Build a Blade Element** and preserves its current construction interaction.
8. One guided transition from learning activity to 3D Rotor Lab is working.
9. Full Sandbox remains available as the free 3D Rotor Lab mode.
10. No physics regression is introduced.
11. No unsupported mastery/proficiency language is added.
12. Desktop, tablet and phone paths are demonstrably usable.
13. Developer stops for review instead of continuing automatically into M2–M7.

---

## 20. QA matrix

Minimum review widths:
- ~1840 px desktop
- ~1280 px laptop
- ~768 px tablet
- ~390 px phone

Check:
- question/action/feedback/next remain spatially coherent;
- no important controls are clipped;
- touch targets work;
- keyboard access for essential interactions where practical;
- reduced-motion mode preserves meaning;
- WebGL failure has an educational fallback path (#46);
- 3D state does not imply fidelity the model does not have;
- existing physics tests pass;
- BET orientation and force/vector conventions remain coherent.

---

## 21. Definition of Done — HeliLab v2

HeliLab v2 is not complete until:

- the seven curriculum modules are the primary student architecture;
- Model / Explore / Mission / Challenge are meaningful interaction types rather than labels on identical pages;
- the old five-stage/lesson-list presentation is no longer the primary journey;
- M1 is fully consistent with the pilot curriculum;
- M1-04 feels like a Mission, not a normal lesson;
- the 3D Rotor Lab operates as teaser + guided preset + full Sandbox;
- progress language remains formative and evidence-safe;
- no physics or BET-visual regression remains;
- responsive and accessibility QA is passed;
- M7 demonstrates integrated transfer rather than another theory list;
- an instructor/reviewer can see the teaching philosophy in the interface without reading an internal design document.

---

## 22. Project governance

### ChatGPT
Lead architecture, curriculum integration, product acceptance criteria and final cross-layer review.

### Perplexity
HeliLab lead developer/reviewer. Review this specification against the live codebase, identify implementation risks, refine technical sequencing and hand bounded implementation tasks to Copilot.

### Copilot
Implement bounded issues/PRs, run tests, capture screenshots and stop at review gates. Do not broaden scope without explicit approval.

### Claude
Independent pedagogical/curriculum red-team where useful after major vertical slices.

---

## 23. Immediate next action

1. Perplexity reviews this spec plus issues #60–#65 against current `main`.
2. Perplexity reports blocking ambiguities and proposes the smallest safe implementation sequence for #61.
3. If no blocking architectural issue exists, Perplexity gives Copilot a bounded first implementation task for the v2 vertical slice.
4. Copilot opens a PR and stops after the defined vertical slice for review.

Do not create a new branch manually unless the implementation workflow itself requires one. Do not begin broad M2–M7 migration before the Module 1 vertical slice is approved.
