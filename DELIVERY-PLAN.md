# HeliLab standalone competency-oriented release

Decision: 2026-10-01, user-directed. Supersedes the vertical-slice-only rollout restriction and ecosystem-first dependency in earlier documents. The product is independently usable now; future shared curriculum mapping is optional metadata.

## Observable training outcomes
1. Construct and explain a blade-element velocity/angle/force model.
2. Predict hover demand, induced power and ground-effect changes under stated constraints.
3. Explain unequal local velocity, flapping and cyclic compensation.
4. Interpret power demand and aerodynamic limits without treating model output as aircraft performance data.
5. Distinguish control/anti-torque mechanisms and recognise model limits.
6. Explain rotor energy and driving/braking regions in autorotation.
7. Transfer the preceding reasoning to combined unfamiliar situations.

## Delivery sequence and acceptance
- [x] Integrate Foundation/Extended naming from PR #84 on an isolated delivery branch.
- [x] All seven modules have working activities, clear outcomes, practice and transfer tasks.
- [x] Stable activity IDs independent of legacy lessons; navigation never creates completion.
- [x] Guided widget evidence, reflection and scenario evidence are distinguishable.
- [x] Local learning record with export, safe import/reset and an instructor review rubric.
- [x] Fix prediction timing, causal-bank ordering, lifecycle and mission layout/accessibility.
- [x] Fix documented induced-inflow scaling defect with source rationale and independent regression checks.
- [x] Automated physics, learning-state and browser acceptance checks; desktop/tablet/phone screenshots.
- [x] README and release evidence describe capabilities and remaining validation limits accurately.

## Pedagogical contract
Training cycle: orient -> predict -> manipulate/construct -> observe -> explain -> transfer -> targeted retry. Incorrect first predictions remain useful evidence. Completion describes performed work. Automatic decision checks do not grade free-text reasoning or certify operational competency. Learners compare explanations with explicit criteria; instructor review records are locally entered observations. All instruction is usable without another platform or account.

References: ICAO competency-based training guidance (https://www.icao.int/competency-based-training); EASA Area 100 KSA workshop materials (https://www.easa.europa.eu/en/downloads/46157/en). These inform design, not a claim of regulatory approval. This release trains aerodynamic reasoning, not the full set of pilot competencies.

## Implementation boundary
Reuse existing physics and visual widgets. Add a versioned curriculum/evidence layer and small scenario engine. No framework migration, external service or login required. Validate technical readiness separately from instructor/student evaluation of training effectiveness.

## Delivery status
Implementation and local verification completed on 2026-10-02. See RELEASE-VALIDATION.md for executed tests and the remaining instructor/learner evaluation, which is separate from technical acceptance.
