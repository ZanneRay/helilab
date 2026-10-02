# Standalone release validation — 2026-10-02

## Implemented

- Seven available modules, 27 stable curriculum activity IDs and 14 transfer cases.
- Observable outcomes, explicit performance tasks and explanation criteria.
- Prediction before model/answer feedback; manipulation and observation evidence; corrective retries.
- Local versioned records, safe text rendering, backup validation, replacement/reset confirmation and separately labelled reviewer observations.
- Existing legacy scores do not award curriculum completion. Next/Previous only navigate.
- Fixed-thrust IGE/OGE comparison and axial-regime practice within Module 2.
- Mean-scaled induced-inflow gradient, neutral prediction state, shuffled causal bank, signed inflow visuals, lifecycle cleanup, keyboard mission construction and narrow-screen comparisons.
- Self-contained runtime assets, local launchers and automated CI checks.
- Foundation/Extended wording incorporates the existing work in PR #84.

## Executed verification

- Physics: **123 passed, 0 failed**.
- Learning-state/curriculum tests: **12 passed**.
- Browser smoke: **81 activity/viewport combinations** (27 × 1280, 768, 390 px), no application errors or document overflow.
- Browser acceptance: **17 checks passed**, including actual keyboard construction, wrong answer/retry, complete/reload, two-case transfer, reviewer storage, malformed and valid imports, timer/observer cleanup, blocked storage and a no-WebGL fallback route.
- Visual checks: desktop home and task form; phone IGE comparison and learning-record layout; construction force diagram at desktop and phone widths.

The browser was Chromium with software WebGL in the available execution environment. Results establish these technical checks, not cross-browser certification or a measured learning effect. The GitHub Actions workflow repeats unit/physics/browser checks when run by GitHub; local execution is distinct from a successful remote CI run.

## Content decisions

The UI consistently separates performed practice, self-review and locally entered observations. Free text is never automatically scored as correct. A successful decision after feedback is retained as a retry, not converted into an independent first-attempt result. The record gives a reviewer the evidence needed to judge the explanation in context.

The inflated first-harmonic induced velocity was corrected by restoring the mean-induced scale and aligning the longitudinal prescription with the existing core implementation. Tests of normalised skew replace the incorrect assumption that absolute induced asymmetry always increases with forward speed. See the physics contract for scope and numerical checks.

Dynamic-rollover content no longer gives contradictory universal angle thresholds or a staged “cyclic first” recovery instruction. The widget explicitly labels its moment comparison as illustrative and does not classify a condition as recoverable.

## Human evaluation still required

Before adopting this as an approved or assessed course, a qualified instructor should review the explanations and transfer cases, observe representative learners completing the seven outcomes, and verify usability in the actual classroom/browser/device environment. This cannot be replaced by code tests or by the app's self-review checkbox. Type-specific operational training remains outside the model's scope.

Suggested first-use evaluation: have a learner explain a second, unfamiliar case without prompts; compare the explanation with the five review criteria; record required support and the next practice task. Use that evidence to refine difficulty and scaffolding.
