# Learning-path release validation — 2026-10-02

This revision addresses the subsequent review of PR #85. The previous release's passing technical checks did not establish that its task-specific assessment or learner navigation was adequate. This document describes the revised implementation and the limits of its verification.

## Implemented behavior

Seven ordered modules contain 29 distinct activities with explicit evidence contracts and questions. Modules 1–6 end in changed-condition transfer; Module 7 contains two integrated cases. Velocity triangles, guided BET and Coriolis occur before their dependent tasks. Home selects the first unfinished activity; earlier open work is visible even after a learner explores later steps. Module results and a course summary provide explicit endings.

Completion requires the requested comparisons or native gates, relevant correct decisions and self-review. Ordinary practice does not require repeated generic essays. Transfer requires an explanation and a limitation, whose quality remains ungraded. Supported retries remain distinct from checks before feedback. Finite changed-case variants retain question exposure history. Both final-case datasets change; the energy case requires model evidence at its current supplied RPM.

Schema 4 preserves native model state, workspace views, controls, construction steps, radio commitments, snapshots and five observation criteria. Earlier schema 3 task evidence is archived and does not complete the changed task version. Import validates before replacement; malformed backups do not change current work. Storage failure leaves an exportable session.

## Executed technical checks

- Physics regression: **123 passed, 0 failed**. Existing core physics was not changed by this revision.
- Curriculum/record checks: **29 passed**. Covers all explicit contracts, controlled comparisons, native gates, changed variants, first-open continuation, completion validity, schema migration, backup fidelity, malformed input, blocked storage and reset.
- Browser smoke: **87 activity/viewport combinations** (29 × 1280, 768 and 390 px). Models render without document overflow or application errors.
- Browser acceptance: **114 checks**, including actual model comparisons and completion of every task, keyboard construction, native demand gates, reload, supported retry, module ending, course ending, immutable snapshots, active/inactive workspace persistence, changed integrated cases, review criteria, import, reset, renderer cleanup and no-WebGL fallback.
- Content/visual inspection: numbered desktop and phone paths, native construction, module result, integrated-case data and checks, phone radio layouts and the light theme. Primary-button hover contrast and mobile drawer visibility were corrected after screen inspection.

Chromium with software WebGL was used in the available environment. GitHub CI repeats the physics, curriculum and browser suites. Local results and remote deployment verification are separate release steps. These checks are not cross-browser certification or evidence of a measured learning effect.

## Aerodynamic changes and scope

Autorotation descriptions identify the driven region by braking force, the driving region by force with rotation, and stall by the local model angle. The driven region is not incorrectly labelled as the root or defined by negative angle of attack; the stall panel does not imply that stall must occur at the outer tip. These descriptions were checked against the [FAA Helicopter Flying Handbook, chapter 2](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch02.pdf). Boundaries vary with condition; textbook percentages are not fixed model requirements.

The fixed-RPM torque index includes all non-reverse elements, including stalled elements, and weights in-plane force coefficients by relative speed squared and radial lever arm. Browser regressions check a driving-dominant and braking-dominant state. The index is qualitative: it omits a full drivetrain/load and RPM time integration, and does not establish trajectory or recoverability. Rotor energy is a separate constant-inertia comparison using E/Eref = (RPM/RPMref)²; the live model shows 81% reference energy at 90% RPM.

Flow-regime and anti-torque widgets no longer present a universal recovery instruction. These are explanatory models; approved aircraft data and instruction are needed for operational procedures.

## Human evaluation outstanding

A qualified instructor should review the case explanations and observe representative learners completing the outcomes in the intended classroom/device environment. A useful pilot records whether a learner can identify the next step, detect missing work, resume after interruption and explain a second unfamiliar case without prompts. Record the conditions, support and five criteria, then adjust the tasks where learners struggle. This evaluation has not been performed and cannot be replaced by code tests or self-review.
