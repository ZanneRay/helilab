# HeliLab — standalone competency-oriented aerodynamics training

HeliLab is a self-contained browser app for ATPL(H) aerodynamic reasoning. It pairs interactive rotor models with predictions, observed comparisons, explanations, decision checks and transfer tasks. No account, learning platform, API, build step or network service is required at runtime. The existing GitHub Pages address serves the version on its configured deployment branch; a pull request does not update that live version.

## Start the app

Download and extract the release folder. With Python 3 installed:

- Windows: double-click `HeliLab.bat`.
- macOS/Linux: run `python3 start.py` from the folder (or the executable `HeliLab.command`).
- Open **http://localhost:8723/HeliLab.html** if the browser does not open automatically. Keep the server window open; Ctrl+C stops it.

The server binds only to your computer. The fixed address keeps browser-local progress associated with the same origin. All model assets, including Three.js and the helicopter mesh, are bundled. Opening `HeliLab.html` directly supports the 2D activities, but browser restrictions can block the 3D module and local storage. Use the launcher for the full experience. A static HTTPS host can serve the same folder without any backend.

## Learning route

| Module | Observable outcome | Activities |
|---|---|---:|
| 1. Rotor lift & local flow | Construct and interpret velocity, pitch, angle of attack and local forces | 6 |
| 2. Hover & vertical flow | Predict demand and induced-flow changes under stated conditions | 6 |
| 3. Forward flight & rotor response | Explain velocity asymmetry, flapping, cyclic, inflow gradients and Coriolis | 6 |
| 4. Power & aerodynamic limits | Interpret power demand and separate it from other constraints | 3 |
| 5. Constraints & anti-torque | Explain ground-pivot and yaw-moment balance | 3 |
| 6. Autorotation & rotor energy | Connect local torque with the stored-energy relationship | 3 |
| 7. Integrated flight problems | Choose evidence across mechanisms in two supplied cases | 2 |

There are **29 activities**. Modules 1–6 each end with a task containing two changed-condition checks; Module 7 has two integrated cases with three decisions each. The velocity triangle precedes the construction mission, and guided BET and Coriolis precede the rotor-response transfer. Stable activity IDs are retained even when a task moves to an earlier module. The 19 earlier lessons remain a reference library. The 3D Rotor Lab and maths reference are optional tools, outside the numbered route.

Home recommends the **first unfinished activity in curriculum order**. A later visited activity cannot displace earlier open work. Each task shows its module and activity number, current phase and earlier open steps. The primary footer advances only after the current task is complete; the final activity opens the module result. All completed work leads to the course summary. Learners can explicitly explore or revisit other steps, with their status visible.

## What counts as completion

Each activity has its own task, model-evidence requirements and questions. Ordinary practice uses prediction → controlled model comparison → mechanism check and self-review. Native prediction/construction tasks use their existing gates rather than a duplicate prediction form. A saved comparison must use the same model and controlled settings, change the requested input, and include model outputs. Required layers, stations, fixed settings and native gates are checked explicitly. Clicking a tab or writing an arbitrary observation cannot satisfy these requirements.

Transfer also requires a free explanation using the evidence and a stated limitation. The app checks that these were supplied; it **does not grade their quality** or use minimum character counts as evidence of understanding. Incorrect decisions can be retried after feedback. Attempts remain recorded, and the repeated question is labelled as supported. New cases change conditions; both integrated cases have changing datasets. The finite variant bank may repeat: a previously revealed question remains supported even in a later attempt.

Completion records performed practice, **not assessed pilot competence**. Checks before feedback, supported retries, self-review and human observations remain distinct. Locally entered instructor/peer observations use five separate criteria: conditions, prediction, evidence, mechanism and limits. Reviewer identities are not verified. This is a formative standalone training tool.

## Learning records and privacy

**Learning record** provides evidence, JSON backup/import, printing and human observations. Data stays in this browser under `helilab_training_v4`, schema 4. Activity task version 2 introduces the revised evidence requirements. Existing schema 3 records migrate: earlier work is preserved under the previous task version and is not counted as completion of the revised task. Earlier observations remain visible. Export before switching device/browser/address, clearing site data or using a shared computer.

Current phase, model controls, native commitments, construction step, committed options and workspace views resume after reload. Saved model states contain controls, outputs and native gate evidence. Snapshots are copied rather than linked to mutable workspace state. Import validates a backup before asking to replace the current record; invalid imports leave existing work intact. Reset asks before deleting evidence and observations. Up to 100 attempts and 16 snapshots per activity are retained; explanations/notes are limited to 4,000 characters. A storage-failure notice indicates an in-memory session that must be exported before closing.

Legacy lesson scores cannot grant curriculum completion. There is no account, server sync, learner administration, LMS integration or verified assessor identity.

## Models and scope

The rotor convention is counter-clockwise viewed from above: ψ=0 aft, ψ=90° advancing, ψ=180° front, ψ=270° retreating. Foundation/Extended labels describe model assumptions. Models use representative geometry and prescribed aerodynamic approximations. They are not aircraft performance data, recovery procedures or a flight simulator.

The physics follows existing Van Holten/Melkert, Leishman and Wagtendonk references. The induced-inflow correction and its verification rationale are recorded in [PHYSICS_VISUAL_CONTRACT.md](PHYSICS_VISUAL_CONTRACT.md). Autorotation region wording was checked against the [FAA Helicopter Flying Handbook, chapter 2](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch02.pdf). Dynamic-rollover wording was checked against the [FAA Helicopter Flying Handbook, chapter 11](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch11.pdf). The competency-oriented design is informed by [ICAO CBTA](https://www.icao.int/competency-based-training) and [EASA KSA workshop material](https://www.easa.europa.eu/en/downloads/46157/en); it is not a claim of regulatory approval.

## Verification and maintenance

`node verify_physics.js` runs the physics checks; `node tests/learning.cjs` checks curriculum and record integrity. `npm test` runs both. Browser checks require the pinned development-only Playwright dependency: `npm ci`, `npx playwright install chromium`, then `npm run test:browser`. These dependencies are not required to use the app. `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` can point the tests to an existing installation.

Browser tests traverse all 29 activities at desktop, tablet and phone widths and exercise actual completion, keyboard construction, retry, storage/reload, backup/import, reviewer observations, cleanup and no-WebGL fallback. See [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md) for observed results and remaining evaluation limits. The user-directed delivery scope and acceptance criteria are in [DELIVERY-PLAN.md](DELIVERY-PLAN.md), superseding earlier slice-only rollout restrictions.
