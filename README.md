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
| 1. Building Rotor Lift | Construct and explain a blade-element velocity, angle and force model | 5 |
| 2. Hover & Vertical Flow | Predict demand, induced power, ground effect and flow-regime limitations | 6 |
| 3. Transition & Rotor Mechanics | Explain local velocity asymmetry, flapping and inflow gradients | 4 |
| 4. Performance & Limits | Interpret power demand and distinguish model output from approved limits | 3 |
| 5. Control & Anti-Torque | Explain control moments, ground pivots and anti-torque authority | 4 |
| 6. Autorotation & Rotor Energy | Trace aerodynamic torque and rotor-energy relationships | 3 |
| 7. Integration & Transfer | Apply the mechanism to combined changed conditions | 2 |

There are **27 activities**, including **14 transfer cases** across seven modules. The 19 earlier lessons remain accessible as a separate reference library. The 3D Rotor Lab and maths reference remain available independently.

## What counts as completion

Practice requires a saved prediction, use of a model control, a saved observation, a supported decision, an explanation and explicit self-review against an observable criterion. The blade-element mission additionally requires three actual construction gates; keyboard endpoint selection is an alternative to dragging. Transfer activities require decisions on two changed conditions and an explanation. Wrong decisions receive corrective feedback and can be retried; the first attempts remain recorded.

Navigation never completes an activity. Activity completion records performed learning work, **not assessed competence**. The app does not judge free-text quality. Minimum text lengths encourage an actual explanation but do not assess understanding. Instructor/peer observations are separately recorded, with a rubric covering conditions, prediction, evidence, causal reasoning and limitations. Reviewer names are locally entered and not authenticated. This is a formative training tool, not a formal certification or exam system.

## Learning records and privacy

Use **Learning record** to inspect evidence, export a JSON backup, restore a backup, print the record or enter review observations. Data stays in this browser under `helilab_training_v3`. Export before switching device/browser/address, clearing site data or using a shared computer. Import validates the format, then asks before replacing the current record. Reset asks before deleting evidence and reviews. Up to 100 attempts per activity are retained; explanations and notes are limited to 4,000 characters. A storage-failure notice indicates that work is only in memory and must be exported before closing.

Legacy lesson scores use separate identities and cannot grant new activity completion. There is no server sync, learner administration, LMS integration or verified assessor identity in this standalone release.

## Models and scope

The rotor convention is counter-clockwise viewed from above: ψ=0 aft, ψ=90° advancing, ψ=180° front, ψ=270° retreating. Foundation/Extended labels describe model assumptions. Models use representative geometry and prescribed aerodynamic approximations. They are not aircraft performance data, recovery procedures or a flight simulator.

The physics follows existing Van Holten/Melkert, Leishman and Wagtendonk references. The induced-inflow correction and its verification rationale are recorded in [PHYSICS_VISUAL_CONTRACT.md](PHYSICS_VISUAL_CONTRACT.md). Dynamic-rollover wording was checked against the [FAA Helicopter Flying Handbook, chapter 11](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch11.pdf). The competency-oriented design is informed by [ICAO CBTA](https://www.icao.int/competency-based-training) and [EASA KSA workshop material](https://www.easa.europa.eu/en/downloads/46157/en); it is not a claim of regulatory approval.

## Verification and maintenance

`node verify_physics.js` runs the physics checks; `node tests/learning.cjs` checks curriculum and record integrity. `npm test` runs both. Browser checks require the pinned development-only Playwright dependency: `npm ci`, `npx playwright install chromium`, then `npm run test:browser`. These dependencies are not required to use the app. `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` can point the tests to an existing installation.

Browser tests traverse all 27 activities at desktop, tablet and phone widths and exercise actual completion, keyboard construction, retry, storage/reload, backup/import, reviewer observations, cleanup and no-WebGL fallback. See [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md) for observed results and remaining evaluation limits. The user-directed delivery scope and acceptance criteria are in [DELIVERY-PLAN.md](DELIVERY-PLAN.md), superseding earlier slice-only rollout restrictions.
