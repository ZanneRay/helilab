# HeliLab — Interactive Helicopter Aerodynamics for ATPL(H)

An interactive, browser-based learning app that teaches how a helicopter flies —
from the first blade element to autorotation — for ATPL(H) students and
instructors. Built around Blade Element Theory (BET) with live, manipulable
visualisations instead of static diagrams.

**▶ Use it here: https://zanneray.github.io/helilab/**

## What's inside

- **12 guided lessons** in four stages — Basics → Hover & Vertical Flight →
  Forward Flight → Advanced — each pairing a short pilot-oriented explanation
  with an interactive widget and a comprehension check:
  1. How a Helicopter Flies · 2. The Blade Element (θ, φ, α) · 3. Speed Along
  the Blade · 4. Hover & Induced Flow · 5. Climb, Descent & VRS (animated
  transients) · 6. Ground Effect · 7. Dissymmetry of Lift · 8. Flapping ·
  9. Retreating Stall & the Envelope · 10. Autorotation · 11. Power &
  Performance · 12. The BET Diagram
- **Sandbox** — free exploration: collective, forward speed, vertical speed,
  azimuth, weight and density altitude drive a 3-D rotor (coning, disc tilt,
  tip-vortex wake, reverse-flow vectors) plus live AoA-disc, blade-element,
  power-curve and flapping panels.
- **Exam mode** (🎓) — readouts stay blurred until clicked: predict first,
  then reveal.
- Progress tracking, light/dark theme, tablet-friendly layout,
  colour-vision-safe overlays (hatching on stall / reverse-flow / VRS zones).

## Conventions & sources

- Rotor convention: **counter-clockwise main rotor viewed from above**
  (EC135/H145 style); ψ = 0 over the tail, ψ = 90° on the advancing
  (starboard) side.
- Physics follows Van Holten/Melkert (TU Delft AE4-314), Leishman
  (*Principles of Helicopter Aerodynamics*) and Wagtendonk (*Principles of
  Helicopter Flight*). Simplifications are stated in-app where they matter
  (e.g. the steady rigid-blade stall map vs. real tip-first stall onset).

## Running locally

The 3-D view uses ES modules, which browsers block on `file://`. Serve the
folder over HTTP:

```
python -m http.server        # then open http://localhost:8000/HeliLab.html
```

or on Windows simply double-click **`HeliLab.bat`**.

## Tech

Vanilla JavaScript, Canvas 2D and [Three.js](https://threejs.org/) (bundled
locally, no CDN), no framework, no build step. `flapping.js` is the physics
engine (inflow, flapping coefficients, blade-element angles);
`helilab_core.js` adds axial flight, ground effect and power; the rest is
lesson content, drawing primitives and the app shell.

## License & disclaimer

Educational use. This app is a teaching aid — **not** a flight manual, not
type-specific performance data, and no substitute for approved training
documentation.
