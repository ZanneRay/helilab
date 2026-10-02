# HeliLab standalone learning-path revision

User-directed scope, 2026-10-02: execute the full pedagogical and UI/UX review, retain standalone operation, and replace the published app. This supersedes earlier vertical-slice limits. The review identified that technical checks on the previous release did not establish that its task/evidence relationships or navigation were adequate.

## Implemented sequence

- [x] Define one ordered curriculum with a task, evidence contract, criterion and explicit question set for each activity. Remove legacy-check fallback.
- [x] Place the velocity triangle before construction, and guided BET and Coriolis before rotor-response transfer. Retain existing curriculum IDs.
- [x] Require actual controlled model comparisons and native gates. Preserve state, commitments, attempts and snapshots across reload and model switching.
- [x] Version the changed tasks and archive earlier work without awarding new completion. Import/export explanations, limitations and five observation criteria.
- [x] Present a numbered learning path, first-open-step recommendation, clear activity phases, module results and an all-complete course summary.
- [x] Provide targeted mechanism practice, return links, supported retries and changed cases. Separate first-attempt checks from human judgment of explanations.
- [x] Add rotor-energy comparisons and two integrated final cases with changing supplied datasets.
- [x] Correct autorotation region descriptions and the torque comparison weighting; distinguish fixed-RPM state evidence from a time history. Remove universal recovery instructions from explanatory flow/anti-torque widgets.
- [x] Execute curriculum/state, physics and browser checks; inspect desktop, mobile and light-theme screens.
- [x] Prepare the release commit and reviewable pull request. Remote CI and publication results are recorded by the GitHub workflows and pull request.

## Acceptance contract

1. No activity can complete from navigation, an unchanged snapshot, an unrelated check or unperformed native gates.
2. A comparison changes the requested input while holding other inputs and the model layer constant. Specific stations, layers, fixed conditions and task stages are enforced.
3. Earlier open work remains visible; a later viewed task does not become the recommended continuation. Exploration is permitted explicitly.
4. Reload restores the current task phase, model view, controls, construction gates and committed answers. Existing work survives the curriculum update as earlier-version evidence.
5. Each module ends with a result and a clear next step. All current activities complete leads to a course summary, not a repeated final task or free lab.
6. New-case conditions actually change. Revealed question IDs remain supported on reuse. Free explanations require human review and are not automatically judged correct.
7. All runtime assets remain local; no account or other training platform is required.

## Evaluation boundary

The next evaluation is specified in [USER-VALIDATION.md](USER-VALIDATION.md). The app now binds a local observation to its selected case and saved work, preserves earlier notes and ratings, and displays the five criterion outcomes. Changed evidence requires a new observation. Saved numerical comparisons are directly available to an observer. Course-summary cells and optional reference/module-result links are visible after correcting multiple-node DOM insertion. These implementation changes do not claim that the learner pilot or syllabus confirmation has occurred.

Technical acceptance tests the implementation and the specified learning flow. It does not measure training effectiveness or authenticate observers. Before adopting an assessed or approved course, a qualified instructor should observe representative learners, review explanations against the five criteria and test unfamiliar cases without prompts. The app stores that evidence; no such learner study is claimed here.

References informing the design: [ICAO CBTA](https://www.icao.int/competency-based-training), [EASA Area 100 KSA material](https://www.easa.europa.eu/en/downloads/46157/en). This trains aerodynamic reasoning and does not claim complete pilot competency coverage or regulatory approval.
