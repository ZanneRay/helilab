/* ===========================================================================
   helilab_content.js — the guided learning journey
   ===========================================================================
   Pure data: ordered modules, grouped into stages. Each module pairs a short,
   pilot-oriented explanation (Wagtendonk voice; Greek kept, always glossed)
   with one interactive widget (function name resolved in helilab_widgets.js)
   and a quick comprehension check.

   Physics framing matches CLAUDE.md references (Van Holten AE4-314, Leishman,
   Wagtendonk). This file has NO logic — just content.
   =========================================================================== */
'use strict';

const HL_LESSONS = [
  /* ───────────────────────────── STAGE 1 — BASICS ─────────────────────── */
  {
    id: 'bigpicture', stage: 'Basics', title: "How a Helicopter Flies",
    subtitle: "Controls, rotor thrust and aircraft motion",
    widget: 'wBigPicture',
    body: `
<p>Rotor blades move through air even when the aircraft is stationary. Their distributed aerodynamic forces combine into rotor thrust and in-plane forces. In this introductory picture, the main thrust vector is approximated as normal to the rotor disc.</p>
<p><b>Collective</b> changes blade pitch together; its thrust effect also depends on RPM and flow. <b>Cyclic</b> varies pitch around the revolution and changes rotor response. <b>Pedals</b> change the anti-torque system's balancing moment. These are coupled controls in an aircraft; this model separates them for learning.</p>
<p><b>Velocity is not force.</b> A helicopter can move forward with no forward acceleration. Acceleration depends on the sum of rotor force, weight, drag and other forces. A forward thrust component can balance drag rather than increase speed.</p>
<p>Compare collective alone at fixed airspeed, then airspeed alone at fixed controls. The arrows are a state illustration; they do not solve aircraft trim or a flight trajectory.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Separate geometric pitch, produced thrust and required thrust.", "Rotor orientation, aircraft velocity and net acceleration are different quantities.", "State which controls and flight conditions are held constant."],
    check: {
  "q": "A helicopter moves forward at constant speed and altitude. What must be true?",
  "options": [
    "The total force is approximately balanced; forward rotor force can balance drag.",
    "The total force must point forward because velocity points forward.",
    "The main rotor must provide zero horizontal force."
  ],
  "answer": 0,
  "explain": "At constant velocity, net acceleration and net force are approximately zero. Individual forces can remain nonzero."
},
  },
  {
    id: 'bladeelement', stage: 'Basics', title: "The Blade Element",
    subtitle: "Pitch, signed inflow and local angle of attack",
    widget: 'wBladeElement',
    body: `
<p>Take one small section at radius r. Measure <b>pitch θ</b> from the rotor-plane reference to its chord. Measure <b>inflow angle φ</b> from that reference to the local relative-flow direction. In the normal-flow convention used here, <b>α = θ − φ</b>.</p>
<p><b>Worked example:</b> θ = 10° and φ = 4° give α = 6°. Raising θ alone by 2° raises α by 2°. Raising φ alone by 2° lowers α by 2°. In a coupled hover model, changing collective also changes induced flow, so the final α change need not equal the pitch change.</p>
<p>Positive total perpendicular velocity U_P gives positive φ when U_T is positive. Upflow can give negative φ: θ = 4°, φ = −3° then gives α = 7°. Downwash is one contribution to U_P; aircraft motion and flapping also contribute. Do not assume φ is positive in every flight state.</p>
<p>Local lift is normal to relative airflow; drag opposes relative motion through the air. Their magnitudes depend on <b>½ρU², section area and aerodynamic coefficients</b>. α influences those coefficients, alongside Mach, Reynolds number and unsteady effects. Resolving one section's force is a building block; whole-rotor thrust requires integration.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["α is an aerodynamic angle; θ is a geometric angle.", "Use signed total inflow, including upflow when present.", "Lift magnitude depends on dynamic pressure, area and coefficient."],
    check: {
  "q": "Normal-flow convention: θ = 4° and φ = −3°. What is α?",
  "options": [
    "7°, because subtracting negative inflow adds 3°.",
    "1°, because inflow magnitude is always subtracted.",
    "4°, because pitch defines angle of attack."
  ],
  "answer": 0,
  "explain": "α = θ − φ uses a signed inflow angle. This calculation assumes normal chordwise flow, not reverse flow."
},
  },
  {
    id: 'm1-04', stage: 'Basics', title: "Build a Blade Element",
    subtitle: "Construct, commit and reveal the local force picture",
    widget: 'wM104BladeElement',
    wide: true,
    body: `
<p>Build the resultant of the tangential and perpendicular velocity components before placing the chord. Use the resultant direction to construct α, then place lift normal to relative airflow and drag opposite relative motion.</p>
<p>The final construction resolves the total aerodynamic force into a component normal to the rotor plane and a tangential component. <b>Normal to the rotor plane is not necessarily vertical in the earth frame.</b> The tangential component contributes torque about the shaft.</p>
<p>In the force views, lift, drag, their sum and the two projections use the same scale and actual directions. Drag points along the air motion relative to the section, opposing the section’s motion through air. The earlier angle views enlarge angles for readability.</p>
<p>Commit each gate before the reveal, then compare your construction with it. A correction after feedback is useful learning evidence; the committed attempt remains part of the record. One section cannot establish the entire rotor's thrust or torque.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Construct the local velocity before the aerodynamic angles.", "Resolve force in the stated rotor frame.", "Separate the committed construction from the revealed explanation."],
    check: {
  "q": "The rotor plane tilts relative to the horizon. A local rotor-normal force component is…",
  "options": [
    "Normal to that tilted plane; it is not automatically earth-vertical.",
    "Always earth-vertical.",
    "Always parallel to the blade chord."
  ],
  "answer": 0,
  "explain": "The force-component reference is the rotor plane. Its direction changes in earth axes when that plane tilts."
},
  },
  {
    id: 'spanwise', stage: 'Basics', title: "Speed Along the Blade",
    subtitle: "Radius, dynamic pressure and blade twist",
    widget: 'wSpanwise',
    body: `
<p>All stations share angular speed Ω, but their tangential speed is <b>Ωr</b>. At unchanged RPM, a station at 0.8R has twice the rotational speed of a station at 0.4R. If density and other velocity contributions are unchanged or neglected, its dynamic pressure is four times as large.</p>
<p>That does not guarantee four times the lift. Section lift also depends on chord, α and the lift coefficient. Inflow angle changes with the local velocity triangle. <b>Washout</b> decreases geometric pitch toward the tip and changes the distribution of loading.</p>
<table><caption>Same RPM and density; rotational component only</caption><thead><tr><th>Station</th><th>Speed / tip speed</th><th>q_rot / tip q</th></tr></thead><tbody><tr><td>0.4R</td><td>0.4</td><td>0.16</td></tr><tr><td>0.8R</td><td>0.8</td><td>0.64</td></tr></tbody></table>
<p>For this activity twist starts at zero. Compare two radii with RPM fixed. Explain the observed speed change first. The blue speed fraction r/R and green rotational-pressure fraction (r/R)² share one labelled scale. They exclude induced and translational flow. No lift distribution is calculated here; the optional twist control changes pitch, not rotational speed.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["RPM is shared; tangential speed increases with radius.", "Dynamic pressure scales with local speed squared.", "Actual loading also depends on geometry and aerodynamic coefficients."],
    check: {
  "q": "At the same RPM, density and section area, radius doubles and other flow contributions are neglected. What is established?",
  "options": [
    "Tangential speed doubles and dynamic pressure quadruples; lift still depends on the coefficient.",
    "Tangential speed doubles and lift must double.",
    "Tangential speed stays fixed because RPM is shared."
  ],
  "answer": 0,
  "explain": "Ωr determines rotational speed. The force relation includes q, area and coefficient."
},
  },

  /* ──────────────────────── STAGE 2 — HOVER & VERTICAL ─────────────────── */
  {
    id: 'hover', stage: 'Hover & Vertical', title: "Hover & Induced Flow",
    subtitle: "Required thrust, produced thrust and ideal induced power",
    widget: 'wHover',
    body: `
<p>In a steady, level hover, rotor thrust approximately balances aircraft weight: <b>T ≈ W</b>. The aircraft can be stationary while air flows through the rotor. The rotor transfers momentum and energy to that air.</p>
<p>For an ideal actuator disc in out-of-ground-effect hover, <b>v_i = √(T / 2ρA)</b> and <b>P_i = Tv_i</b>. These assume steady, uniform flow and neglect rotor swirl and losses. Installed power additionally includes profile, tail-rotor and transmission requirements.</p>
<p><b>Mass comparison:</b> at fixed density and disc area, 15% more weight requires approximately 15% more hover thrust and <b>1.15^(3/2) ≈ 1.23</b> times ideal induced power. The 23% increase applies to the induced term, not necessarily total engine power.</p>
<p><b>Density comparison:</b> at the same weight and area, density falling to 81% raises ideal induced velocity and power by <b>1/√0.81 ≈ 1.11</b>. Required thrust has not risen. A trimmed model changes pitch to meet the same demand; a fixed-collective model instead compares produced thrust.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Steady hover demand is approximately weight; collective does not set weight.", "At equal demand, lower density raises ideal induced-flow cost.", "Distinguish ideal induced power from total installed power."],
    check: {
  "q": "At the same weight and rotor area, density falls to 81% in trimmed OGE hover. What changes?",
  "options": [
    "Required thrust is unchanged; ideal induced power rises by about 11%.",
    "Required thrust rises by 19%.",
    "Ideal induced power falls by 19%."
  ],
  "answer": 0,
  "explain": "The ideal induced term scales with 1/√ρ at fixed thrust and area. The model must still trim to the same thrust demand."
},
  },
  {
    id: 'verticalflight', stage: 'Hover & Vertical', title: "Vertical Flow & Model Validity",
    subtitle: "Climb, descent and the limits of simple momentum theory",
    widget: 'wVertical',
    body: `
<p>The course uses positive vertical aircraft velocity V_c for climb and negative V_c for descent. In the simple axial rotor-relative picture, <b>U_P includes V_c + v_i</b>. Induced velocity also changes with the condition; it is not a constant added to every state.</p>
<p>Compare fixed collective with equal-thrust trim carefully. They answer different questions. A snapshot with produced thrust greater than weight establishes an upward acceleration tendency; it does not prove that a steady climb has already developed.</p>
<p>Descending through a recirculating wake can produce vortex ring state: the flow is unsteady and the simple clean-streamtube assumptions are inadequate. The coloured descent bands in this widget are <b>illustrative regime labels</b>. Their endpoints are not aircraft entry limits, and animation through a band does not validate computed thrust there.</p>
<p>Use the manual slider to compare hover and descent and explain where the model loses credibility. This exercise does not determine a recovery manoeuvre; that requires the applicable rotorcraft flight manual and aircraft-specific instruction.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["State the sign convention before interpreting axial flow.", "A thrust imbalance establishes acceleration tendency, not a trajectory.", "Recirculation limits the simple flow model; coloured bands are illustrative."],
    check: {
  "q": "A simple axial model enters a labelled recirculating-wake region. What is the sound interpretation?",
  "options": [
    "Its clean-flow assumptions become unreliable; a computed state is not a validated trajectory.",
    "All computed thrust values remain exact because the diagram still animates.",
    "The label fixes the recovery control sequence for every helicopter."
  ],
  "answer": 0,
  "explain": "The label illustrates a mechanism and a validity boundary. It is not an aircraft-specific operational simulation."
},
  },
  {
    id: 'groundeffect', stage: 'Hover & Vertical', title: "Ground Effect",
    subtitle: "Compare induced power at equal required thrust",
    widget: 'wGroundEffect',
    body: `
<p>A nearby surface changes the rotor wake and generally reduces the induced power needed for a given hover thrust. In a steady hover at unchanged weight, <b>required thrust remains approximately the same</b>; the induced-flow cost changes.</p>
<p>That equal-thrust comparison differs from holding collective or total power fixed. With pitch fixed, reduced induced flow can change α and produced thrust. With power fixed, thrust may increase. Do not mix those experiments into one causal chain.</p>
<p>The height correction shown here is a simplified ground-effect approximation with a restricted low-height domain. Surface shape, slope, wind, rotor geometry and recirculation affect a real aircraft. There is no sharp universal height at which ground effect switches off.</p>
<p>Use <b>rotor height divided by radius (h/R)</b>, not skid height. Save an equal-thrust low/high-height comparison and identify the changed induced velocity and power. Whether a particular aircraft can hover IGE or OGE requires its approved performance data.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["At equal weight in steady hover, compare the power cost at equal thrust.", "Fixed collective, fixed power and trimmed equal thrust are different conditions.", "Ground-effect strength varies continuously and depends on the environment."],
    check: {
  "q": "The same helicopter hovers at two rotor heights with unchanged weight. Which comparison isolates ground-effect power benefit?",
  "options": [
    "Hold required thrust equal and compare induced power.",
    "Hold collective equal and assume thrust must remain equal.",
    "Change mass and rotor height together and attribute all change to height."
  ],
  "answer": 0,
  "explain": "Equal-thrust trim separates the wake/induced-power effect from a change in required lift."
},
  },

  /* ──────────────────────── STAGE 3 — FORWARD FLIGHT ───────────────────── */
  {
    id: 'dissymmetry', stage: 'Forward Flight', title: "Dissymmetry of Lift",
    subtitle: "Local speed before rotor compensation",
    widget: 'wDissymmetry',
    body: `
<p>For the course CCW rotor viewed from above, ψ = 0° is the tail, 90° the advancing/right side, 180° the nose and 270° the retreating/left side. With radial and other corrections neglected, <b>U_T = Ωr + V sinψ</b>.</p>
<p>At the same radius, translation therefore adds to rotational speed at 90° and subtracts at 270°. With the same density, area and coefficient, higher total relative speed gives higher lift through <b>q = ½ρU²</b>. Those equal-coefficient conditions do not generally hold in a trimmed rotor.</p>
<p>The uncorrected comparison exposes unequal local aerodynamic forcing. Flapping, cyclic pitch and inflow redistribution change the response; they do not make every element's speed or force equal. Rotor trim concerns integrated forces and moments.</p>
<p>Reverse flow is a local change in chordwise flow direction, usually first evident inboard on the retreating side. It is different from a loaded section reaching stall at excessive α.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Separate the rotational and translational speed contributions.", "Lift ∝ speed² assumes unchanged density, area and coefficient.", "Local asymmetry, rotor trim and reverse flow are distinct concepts."],
    check: {
  "q": "At a fixed station, Ωr = 150 m/s and forward speed is 30 m/s. What are the simplified 90° and 270° tangential speeds?",
  "options": [
    "180 and 120 m/s respectively.",
    "180 m/s at both positions.",
    "150 m/s at both positions."
  ],
  "answer": 0,
  "explain": "The translational term is +V on the advancing side and −V on the retreating side."
},
  },
  {
    id: 'flapping', stage: 'Forward Flight', title: "Flapping & Angle of Attack",
    subtitle: "Motion → relative flow → inflow angle → angle of attack",
    widget: 'wFlapping',
    body: `
<p><b>Scenario:</b> a retreating blade element moves downward while its geometric pitch stays fixed. Explain why its α can increase before interpreting a rotor stall map.</p>
<p><b>Read the two arrows first.</b> The orange chord stays at pitch θ. The blue arrow shows air relative to the moving blade. The angle between them is α. A vertical velocity contribution changes the direction of this relative air flow; it does not automatically raise α.</p>
<table><thead><tr><th>Blade motion</th><th>Normal component U_P</th><th>Inflow φ</th><th>α at fixed θ</th></tr></thead><tbody><tr><td>Upward, β̇ &gt; 0</td><td>Increases</td><td>Increases</td><td>Decreases</td></tr><tr><td>Downward, β̇ &lt; 0</td><td>Decreases</td><td>Decreases</td><td>Increases</td></tr></tbody></table>
<p>This comparison holds <b>positive U_T, pitch and the other flow terms fixed</b>. Displacement β tells you where the blade is; rate β̇ tells you how fast it moves. At a smooth maximum or minimum of β, β̇ is zero.</p>
<details><summary>ATPL relation and sign convention</summary><p>In this rotor-plane convention, U_P = air-flow normal term + rβ̇ + other motion terms; φ = atan2(U_P,U_T), and α = θ − φ. Positive β̇ denotes upward blade motion. The new comparison sets β = 0 and prescribes the rate, so only rβ̇ changes. It does not solve rotor dynamics. Actual azimuths and phase depend on trim, hinge offset, stiffness and damping.</p></details>
<details class="hl-content-sources"><summary>Sources</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — aerodynamics</a>; <a href="https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf" target="_blank" rel="noopener noreferrer">NASA TN D-7856 — rotor response and phase</a>.</p></details>
    `,
    takeaways: ["Downward rate raises α; upward rate lowers α under the stated controlled conditions.", "Use α = θ − φ; flapping is not a pitch increase.", "Rate and displacement are different."],
    check: {
  "q": "A blade is at its maximum upward flapping displacement. What can you infer about its instantaneous flap rate?",
  "options": [
    "It can be zero at that extremum; maximum displacement is not maximum upward velocity.",
    "It must be at its maximum upward rate.",
    "Its geometric pitch must equal its flap angle."
  ],
  "answer": 0,
  "explain": "Displacement and its time derivative are distinct. Local aerodynamic effects involve the velocity contribution."
},
  },
  {
    id: 'envelope', stage: 'Forward Flight', title: "Retreating Blade Stall & Twist",
    subtitle: "Local angle of attack, washout and advancing-side Mach",
    widget: 'wEnvelope',
    body: `
<p><b>Scenario:</b> forward-flight loading must be maintained while the retreating side has less local speed. Explain the α demand and why a twisted blade need not have its highest α at the tip.</p>
<p><b>1. Lower speed changes the loading requirement.</b> For the same section lift, less dynamic pressure requires a higher lift coefficient. In the normal pre-stall range this usually requires higher α. Flapping and cyclic help redistribute rotor loading. At high forward speed the required retreating α may approach the section stall limit. Lower U_T alone is not proof that actual α increases at fixed pitch and normal flow.</p>
<p><b>2. An untwisted, uniform-flow example can peak outboard.</b> With θ constant and positive U_P fixed, U_T increases with radius. Therefore φ decreases and α = θ − φ increases. The outer region can reach a common critical α first. This explains a tip-first teaching example under explicit assumptions.</p>
<p><b>3. Negative twist changes pitch along the span.</b> With pitch fixed at 0.75R, washout lowers tip pitch and raises inboard pitch. At unchanged flow, tip α falls and inboard α rises. The maximum may move inward. There is no universal “stall begins at midspan” rule: real location depends on pitch, flow, flapping, trim, section critical α and unsteady effects.</p>
<p>First use <b>Twist in isolation</b>; compare the two curves at one radius. Then use <b>Rotor diagnostics</b> to inspect the combined model. Advancing-side Mach is a separate constraint. A positive-α threshold crossing is a teaching diagnostic, not an approved aircraft envelope.</p>
<details><summary>ATPL relations and model assumptions</summary><p>U_T ≈ Ωr + V sinψ; φ = atan2(U_P,U_T); α = θ − φ. Pitch with linear twist is θ(r) = θ(0.75R) + twist × (r/R − 0.75). In the first view, uniform normal flow is prescribed and there is no flapping, cyclic or re-trim. The Foundation map uses actual U_T with uniform inflow and restricted cyclic; Extended uses the core BET flow and trim. Switching map presets changes several assumptions together and cannot isolate twist.</p><p>Map colours and contours use the unweighted α/assumed-critical-α ratio. Loading is a separate proxy. Reverse/near-zero tangential flow lies outside the normal-flow diagnostic. The assumed Mach/critical-α rule does not provide validated airfoil stall loads, aircraft symptoms, V_NE or recovery instructions.</p></details>
<details class="hl-content-sources"><summary>Sources and the twist qualification</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — aerodynamics and hazards</a>. <a href="https://ntrs.nasa.gov/citations/19930082289" target="_blank" rel="noopener noreferrer">NACA TN 1666</a> reported that approximately 8° negative twist reduced tip α in its tested rotor but the maximum still occurred at the tip. That historical case supports the qualification; its location is not universal either.</p></details>
    `,
    takeaways: ["Distinguish high advancing Mach from retreating loading/α demand.", "Stall location depends on the selected rotor and flow assumptions.", "A teaching diagnostic is not an approved operating envelope."],
    check: {
  "q": "An advancing station crosses the model Mach comparison line while the retreating map shows high α. What follows?",
  "options": [
    "Two local aerodynamic concerns are indicated; aircraft V_NE still requires approved data.",
    "The map has calculated a certified V_NE.",
    "Positive engine power margin removes both aerodynamic concerns."
  ],
  "answer": 0,
  "explain": "The model uses assumed thresholds and simplified loads. Certification limits also reflect other aircraft constraints."
},
  },

  {
    id: 'bet-guided', stage: 'Forward Flight', title: "Guided BET \u2014 Rotor Layers",
    subtitle: "Separate speed, flapping and cyclic pitch",
    widget: 'wGuidedBET',
    body: `
<p>Read each layer as a different controlled model, not a complete simulated flight transition. At <b>Hover</b>, rotational speed is independent of azimuth at a fixed radius but still varies with radius. Uniform inflow is an assumption; mean coning can remain.</p>
<p><b>Rigid forward flight</b> suppresses flapping and cyclic to expose the local speed asymmetry. <b>Flapping</b> introduces a prescribed untrimmed response; its rate changes U_P and therefore α. Negative α in this layer is a result of the selected untrimmed state, not proof of a typical trimmed aircraft state.</p>
<p><b>Cyclic</b> changes the pitch distribution to achieve the selected level-disc teaching trim. Level disc does not mean forward thrust: under the disc-normal approximation, thrust is then rotor-normal. Aircraft velocity is separate. Compare θ, φ and α at 90° and 270° rather than assuming pitch equals α.</p>
<p>The <b>Lift proxy</b> map uses a simplified local loading measure; it is not required thrust or a full integrated load solution. Grey cells have no attached-flow proxy beyond the assumed positive or negative α range; grey does not mean zero post-stall lift. Hatching marks positive-α model threshold crossings, and reverse flow is outside the normal section interpretation.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Compare layers at the same speed, station and azimuth.", "Separate imposed pitch from local inflow and flap velocity.", "Level-disc trim does not establish a forward thrust component."],
  },

  {
    id: 'bet-velocity', stage: 'Forward Flight', title: "The BET Velocity Triangle",
    subtitle: "Tangential flow, perpendicular flow and signed angles",
    widget: 'wBetVelocity',
    body: `
<p><b>U_T</b> is the local tangential relative-velocity component in the rotor-plane reference. Its rotational part is Ωr, tangent to the rotation path. It is <b>not defined along the chord</b>: the chord rotates with geometric pitch θ.</p>
<p><b>U_P</b> combines induced flow, aircraft throughflow and flapping velocity in the course sign convention. For positive U_T, <b>φ = atan2(U_P, U_T)</b> and <b>α = θ − φ</b>. Keep the signed components; if total U_P becomes negative, φ can be negative.</p>
<p>At the same radius and RPM, forward speed adds to U_T on the advancing side and subtracts on the retreating side. A smaller U_T does not automatically mean higher α at fixed pitch: the accompanying U_P and φ determine the result. Higher α <i>demand</i> to carry a specified load is a separate trim argument.</p>
<p>Save opposite azimuts and one controlled speed comparison. If U_T reverses, recognise the change of chordwise flow direction. The usual small-angle, attached-flow lift interpretation cannot establish reverse-flow airloads.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Tangential velocity follows the rotation path, not the pitched chord.", "Use total signed U_P and the resultant flow direction.", "Distinguish actual local α from the α needed to carry a specified load."],
    check: {
  "q": "At fixed positive pitch, U_T decreases while U_P remains positive and unchanged. What happens locally?",
  "options": [
    "φ increases and α decreases; this alone says nothing about the α needed to retain the previous lift.",
    "φ decreases and α increases automatically.",
    "Pitch changes by the same amount as U_T."
  ],
  "answer": 0,
  "explain": "For positive components, atan2(U_P,U_T) increases as U_T decreases. A fixed-pitch state and an equal-load trim are different comparisons."
},
  },

  {
    id: 'coriolis', stage: 'Forward Flight', title: "Coriolis Effect \u2014 Lead & Lag",
    subtitle: "Radial mass position and the limits of a prescribed curve",
    widget: 'wCoriolis',
    body: `
<p>When a blade's mass distribution moves radially, its angular momentum changes unless the blade's angular speed or external torque accommodates that motion. For an isolated mass with negligible external torque, inward motion reduces moment of inertia and produces a tendency to lead; outward motion produces a tendency to lag.</p>
<p>The familiar upward-flap → inward-motion analogy assumes <b>positive coning and the stated hinge geometry</b>. It is not valid for every flap angle and head design. Actual lag displacement and phase depend on inertia, hinge stiffness, damping and aerodynamic/structural coupling.</p>
<p>This widget uses <b>ζ = gain × dβ/dψ</b> as an exaggerated teaching curve. It does not calculate radial centre-of-mass motion or solve a lead/lag equation. The two gain settings illustrate a configuration difference; their numerical amplitudes do not quantify real articulated or underslung rotor behaviour.</p>
<p>Compare opposite azimuts and separate β, its rate and the prescribed ζ. Use angular momentum to explain an inward/outward tendency under explicit assumptions, rather than treating the plotted curve as a measured lag response.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf" target="_blank" rel="noopener noreferrer">NASA TN D-7856 — rotor dynamics and phase</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Radial mass movement and external torque govern the angular-momentum argument.", "The upward/inward analogy assumes positive coning and geometry.", "The plotted ζ is prescribed; real damping and lag phase are not solved."],
    check: {
  "q": "An isolated blade mass moves inward while external torque is negligible. What tendency follows?",
  "options": [
    "Angular speed tends to increase to conserve angular momentum.",
    "Angular speed tends to decrease because the mass is closer to the shaft.",
    "Angular momentum must increase without a torque."
  ],
  "answer": 0,
  "explain": "With angular momentum conserved, a smaller moment of inertia requires a higher angular speed."
},
  },

  {
    id: 'flaproll', stage: 'Forward Flight', title: "Flapback & Inflow Roll",
    subtitle: "Distinguish two sources of rotor response",
    widget: 'wFlappingRoll',
    body: `
<p><b>Flapback</b> is a longitudinal disc response to forward-flight aerodynamic asymmetry in the untrimmed model. Advancing/retreating speed differences produce periodic forcing; the phased flapping response changes disc orientation. Cyclic modifies the resulting trim.</p>
<p><b>Inflow roll (transverse-flow effect)</b> starts with a fore-aft induced-flow difference. For the illustrated condition, the front encounters less induced downflow than the rear. At equal pitch and station, smaller front φ gives larger front α. This fore-aft forcing can produce a roll response through rotor dynamics.</p>
<p>Use the course CCW/azimuth convention and distinguish the location of forcing from the location of peak flap displacement. A near-90° phase is an idealisation; configuration and dynamics change the real response.</p>
<p>The widget prescribes a first-harmonic wake-skew approximation. Its <b>normalised skew</b> can grow while mean induced velocity falls; the absolute front/rear difference need not grow monotonically with speed. Coning changes local total U_P but does not itself establish an induced-wake gradient. Velocity-diagram U_P is amplified visually; read the numerical values for comparison.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf" target="_blank" rel="noopener noreferrer">NASA TN D-7856 — rotor dynamics and phase</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Flapback and fore-aft inflow roll start from different asymmetries.", "Trace local φ and α before discussing the phased rotor response.", "Mean inflow, normalised skew and absolute gradient are different measures."],
    check: {
  "q": "At equal pitch and tangential speed, the front has less positive perpendicular inflow than the rear. What local chain follows?",
  "options": [
    "Smaller front φ gives larger front α; the phased response must then be considered.",
    "Smaller front φ gives smaller front α.",
    "The induced-flow gradient directly changes geometric pitch."
  ],
  "answer": 0,
  "explain": "Apply α = θ − φ first. The location of aerodynamic forcing is not automatically the location of peak displacement."
},
  },

  /* ──────────────────────── STAGE 4 — SAFETY & LIMITS ──────────────────── */
  {
    id: 'dynamicrollover', stage: 'Safety & Limits', title: "Dynamic Rollover",
    subtitle: "A ground contact changes the moment balance",
    widget: 'wDynamicRollover',
    body: `
<p>A skid or wheel constrained by ground contact can become a pivot. Moments about that contact differ from the unconstrained aircraft balance. Rotor thrust, weight, geometry and external forces contribute; roll rate and the ability to change those forces affect the subsequent motion.</p>
<p>In the particular pivot geometry shown here, increasing thrust increases its rolling-moment contribution. Compare two collective settings at the same bank angle and pivot. Identify the moment arms and signs rather than assuming thrust is always restoring.</p>
<p>The displayed balance threshold uses assumed geometry and omits roll-rate dynamics and control limits. It is <b>not a safe bank angle</b> and does not establish recoverability. Static tip-over and dynamic rollover are different questions. Aircraft procedures and limits require approved instruction.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Identify the contact pivot before calculating moments.", "Compare moment contributions with geometry held fixed.", "Static balance alone does not determine dynamic recoverability."],
    check: {
  "q": "At a fixed ground pivot, what additional information is needed beyond a static moment balance to assess motion?",
  "options": [
    "Roll rate, inertia, changing forces and control constraints.",
    "Only the current bank angle.",
    "Only whether the aircraft is within a generic safe angle."
  ],
  "answer": 0,
  "explain": "Dynamic motion depends on the moment history and inertia; a single static threshold is insufficient."
},
  },
  {
    id: 'lte', stage: 'Safety & Limits', title: "Unanticipated Yaw & Anti-Torque",
    subtitle: "Torque demand, aerodynamic moments and control authority",
    widget: 'wLTE',
    body: `
<p>Unanticipated yaw concerns an unexpected yaw response. It should not automatically be interpreted as mechanical tail-rotor failure or a proven loss of tail-rotor efficiency. Analyse the <b>whole yaw-moment balance</b>: main-rotor torque, tail-rotor/control response and airframe aerodynamic moments.</p>
<p>The historical conventional-rotor CCW wind-sector picture illustrates different mechanisms. Main-rotor wake interference and tail-rotor recirculating inflow can change tail-rotor forces. <b>Weathercock effects instead arise from fuselage/fin moments tending to turn the nose into the wind.</b> These mechanisms can overlap; they do not all mean reduced tail-rotor thrust.</p>
<p>Collective can change main-rotor torque demand. Wind, power/RPM limits and control response also affect the balance. The degree sectors are examples for the stated conventional arrangement; they are not a validated H145/Fenestron map or universal danger boundaries. Wind direction here is <b>FROM the nose/right/tail/left at 0°/90°/180°/270°</b>, separate from blade azimuth ψ.</p>
<p>The widget identifies possible mechanisms and controlled input changes. It does not compute tail-rotor authority, yaw rate, controllability or a recovery sequence. Use aircraft-specific approved guidance for operational interpretation.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.airbus.com/sites/g/files/jlcbta136/files/2025-01/3298-s-00-rev-0-en.pdf" target="_blank" rel="noopener noreferrer">Airbus SIN 3298-S-00 — unanticipated yaw</a>. The activity uses the simplified model and conditions described above. See also <a href="https://www.faa.gov/documentLibrary/media/Advisory_Circular/ac90-95.pdf" target="_blank" rel="noopener noreferrer">FAA AC 90-95</a> for the historical conventional-rotor sector diagram.</p></details>
    `,
    takeaways: ["Distinguish yaw-moment demand, available authority and actual control response.", "Weathercock moments are not an assumed tail-rotor thrust loss.", "Generic wind sectors do not establish type-specific limits or procedures."],
    check: {
  "q": "A tailwind produces a weathercock yaw moment. Which explanation separates the mechanisms correctly?",
  "options": [
    "The fuselage/fin moment changes the yaw balance; tail-rotor thrust need not have deteriorated.",
    "Every weathercock moment proves tail-rotor vortex ring state.",
    "The tail rotor must have mechanically failed."
  ],
  "answer": 0,
  "explain": "An external yaw moment and a change in tail-rotor force are different contributions to the balance."
},
  },

  /* ─────────────────────────── STAGE 5 — ADVANCED ──────────────────────── */
  {
    id: 'autorotation', stage: 'Advanced', title: "Autorotation",
    subtitle: "Local aerodynamic torque and the aircraft energy budget",
    widget: 'wAutorotation',
    body: `
<p>In autorotation the rotor receives no driving engine torque. Airflow can still produce both <b>driving</b> and <b>braking</b> aerodynamic torque. The energy ultimately comes from the aircraft's gravitational/kinetic energy and can exchange with the rotor's stored rotational energy; a driving blade region is an energy-transfer mechanism, not an unlimited source.</p>
<p>Resolve each section's force tangentially. A component in the direction of rotation contributes driving torque; an opposing component contributes braking torque. Typical diagrams distinguish driving, driven and stalled regions, but their sizes and presence depend on pitch, flow, RPM and geometry. A stalled section can still exert aerodynamic force.</p>
<p>Whole-rotor motion depends on the torque sum, including applicable drivetrain/accessory loads: <b>I dΩ/dt = Q_net</b> for constant inertia. Power transfer is <b>P_net = Q_net Ω</b>, whereas stored energy is <b>E = ½IΩ²</b>. Steady RPM can coexist with ongoing energy transfer when driving and resisting torques balance.</p>
<p>This map holds RPM fixed while you compare collective and prescribed upflow. Its weighted torque index is qualitative; it does not integrate RPM or aircraft motion. Region boundaries cannot determine flare height, safe RPM or recoverability.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Driving and braking local torques can coexist.", "Whole-rotor net torque determines RPM tendency under the stated load assumptions.", "Aircraft energy, power transfer and stored rotor energy are different quantities."],
    check: {
  "q": "At steady autorotative RPM, with engine torque absent and all resisting loads included, what must hold?",
  "options": [
    "Driving and resisting torque approximately balance while energy continues to flow.",
    "Every blade section must produce zero torque.",
    "No energy can be transferred because RPM is constant."
  ],
  "answer": 0,
  "explain": "Constant Ω means approximately zero net torque. Nonzero driving and resisting contributions can balance while exchanging power."
},
  },
  {
    id: 'performance', stage: 'Advanced', title: "Power Required & Performance",
    subtitle: "Components, condition-specific margin and ideal markers",
    widget: 'wPerformance',
    body: `
<p>A level-flight teaching curve combines <b>induced power</b>, <b>profile power</b> from blade drag and <b>parasite power</b> associated with aircraft drag. Climb adds an aircraft energy-rate requirement; tail-rotor and drivetrain terms also matter for installed power.</p>
<p>Induced power generally falls from hover into forward flight for a fixed loading condition. Profile power varies with blade speed and drag. With density and effective drag area held fixed, parasite drag scales approximately with V² and parasite power with <b>V³</b>. Together these produce a minimum in required power.</p>
<p>The model markers locate <b>minimum P</b> and <b>minimum P/V</b>. They approximate fuel endurance/range only with appropriate fuel-flow assumptions; wind alters distance over the ground. Maximum climb needs available-minus-required power versus speed. A powered level-flight curve does not establish an autorotative minimum-descent speed.</p>
<p>The shaded translational-flow band is illustrative, not a universal ETL threshold. Save independent mass and density-altitude comparisons. This widget plots required power only; a numerical margin needs available-power data at the <b>same condition and power reference</b>.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Combine all relevant power components before interpreting total demand.", "A power margin requires matched available and required power data.", "Minimum P and minimum P/V are model markers, with extra assumptions for fuel performance."],
    check: {
  "q": "What does a tangent from the origin to a required-power curve identify?",
  "options": [
    "Minimum P/V for that model; fuel range needs additional fuel-flow and wind assumptions.",
    "Maximum excess power at every altitude.",
    "Minimum descent speed in autorotation."
  ],
  "answer": 0,
  "explain": "The slope from the origin is P/V. Fuel per distance additionally depends on how fuel flow relates to power and on ground speed."
},
  },
  {
    id: 'betdiagram', stage: 'Advanced', title: "The BET Diagram",
    subtitle: "Resolve a section before integrating the rotor",
    widget: 'wBetDiagram',
    body: `
<p>For a chosen radius, azimuth and flow condition, draw the tangential/perpendicular velocity components and their resultant. Add geometric pitch and the signed inflow angle to interpret α in normal chordwise flow.</p>
<p>Place lift normal to relative airflow and drag opposite relative motion through the air. Their resultant is the <b>total aerodynamic force</b>. Resolve it normal and tangential to the stated rotor-plane reference. Rotor-normal is not necessarily earth-vertical; the normal component contributes to rotor thrust after integration.</p>
<p>The tangential component contributes local torque with lever arm r. In the rotation direction it drives; opposite rotation it brakes. The whole rotor's torque is the sum over sections and azimuths plus other applicable loads. One driving section cannot establish constant or rising RPM.</p>
<p>Compare powered and prescribed-upflow cases, retaining the signs. A 2D normal-flow section diagram does not resolve reverse-flow or unsteady stalled-section aerodynamics. Practise reconstructing the diagram from a new stated condition.</p>
<details class="hl-content-sources"><summary>Source and model scope</summary><p><a href="https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook" target="_blank" rel="noopener noreferrer">FAA Helicopter Flying Handbook — source chapters</a>. The activity uses the simplified model and conditions described above.</p></details>
    `,
    takeaways: ["Label the reference frame, radius and flow condition.", "Resolve the total section force before discussing thrust and torque.", "Local torque sign is not the whole-rotor torque balance."],
    check: {
  "q": "One section has a tangential force in the rotation direction. What is established?",
  "options": [
    "That section contributes driving torque; whole-rotor RPM tendency needs the total torque balance.",
    "The whole rotor must accelerate.",
    "No other section can contribute braking torque."
  ],
  "answer": 0,
  "explain": "Local tangential force times radius gives local torque. All contributions must be summed."
},
  },
];


/* Reviewed guides for tasks that use a different context from the reference lesson. */
const HL_LEARNING_GUIDES = {
  "cbt-m2-hover": {
    "bodyHtml": "<p>A stationary aircraft can still transfer energy to moving air. Commit your mechanism before the native reveal, then identify the airflow that carries momentum and energy away. Induced power is one part of the total power requirement; blade drag and other loads remain.</p>",
    "takeaways": [
      "Distinguish aircraft velocity from rotor-induced airflow.",
      "Connect hover thrust with continuous energy transfer."
    ]
  },
  "cbt-m2-verticalflight": {
    "bodyHtml": "<p>This is a pair of hover rotor states with manual collective and trim off, not a time-resolved climb. Collective changes pitch first; the coupled steady solution then changes produced thrust and induced flow. Weight remains fixed. If thrust exceeds weight, infer an upward acceleration tendency rather than a completed climb trajectory.</p>",
    "takeaways": [
      "A coupled steady calculation does not measure the timing of every flow response.",
      "Produced thrust can differ from the unchanged hover demand."
    ]
  },
  "cbt-m2-groundeffect": {
    "bodyHtml": "<p>This task compares mass and density with hover trim on; ground effect is the next activity. In steady hover, T ≈ W. At fixed density and disc area, ideal induced power scales as W^(3/2): 15% more mass gives about 23% more induced power. Lower density at unchanged mass raises the induced-flow cost while required thrust stays the same.</p>",
    "takeaways": [
      "Separate the mass comparison from the density comparison.",
      "The induced-power percentage does not describe every installed power component."
    ]
  },
  "cbt-m2-ige-practice": {
    "bodyHtml": "<p>Compare rotor heights at equal required thrust. Read h/R as rotor height divided by radius. A nearby surface modifies the wake and lowers the induced-power cost in this teaching approximation. A fixed-collective experiment would instead allow produced thrust to change. The surface and wind assumptions limit the comparison.</p>",
    "takeaways": [
      "Equal thrust does not imply equal induced velocity or power.",
      "A height correction is not an aircraft hover-performance approval."
    ]
  },
  "cbt-m2-axial-practice": {
    "bodyHtml": "<p>Use V_c = 0 for hover and V_c < 0 for descent in the manual comparison. Aircraft throughflow and induced flow combine in the local triangle. Recirculation violates the simple clean-streamtube assumption; the coloured bands locate illustrative regimes rather than validated aircraft boundaries. Explain which result you would stop trusting and why.</p>",
    "takeaways": [
      "Interpret the signed vertical-flow convention.",
      "State the model-validity limit rather than deriving a recovery sequence."
    ]
  },
  "cbt-m6-energy": {
    "bodyHtml": "<p>With inertia I fixed, E = ½IΩ². At 90% reference RPM, 0.90² = 0.81, so 81% of reference rotor energy remains. That is an energy state comparison. Torque gives the tendency of RPM change; QΩ is power, the rate of energy transfer. The slider does not simulate the time or manoeuvre needed to change RPM.</p>",
    "takeaways": [
      "Square the RPM fraction to obtain the energy fraction.",
      "Stored energy, torque and power have different meanings."
    ]
  },
  "cbt-m1-transfer": {
    "bodyHtml": "<p>Use the angle convention and local-force direction from Module 1 under changed conditions. Compare pitch at fixed inflow and inflow at fixed pitch. Then move the station at fixed RPM and zero twist: Ωr changes linearly and the rotational dynamic-pressure term quadratically. In your debrief connect each conclusion to one saved comparison, rather than treating speed alone as lift.</p>",
    "takeaways": [
      "Name the changed variable and the controlled variables.",
      "Use local relative airflow for angles and force directions."
    ]
  },
  "cbt-m2-transfer": {
    "bodyHtml": "<p>Combine the separate demand and ground-proximity mechanisms. For ideal OGE hover at fixed area and density, P_i scales with W^(3/2). For the height comparison, keep required thrust fixed and explain the changed induced-flow cost. The percentage in the case applies to induced power; IGE benefit is not a change in aircraft weight.</p>",
    "takeaways": [
      "Separate demand from the power cost of meeting it.",
      "Use the correct controlled condition for each model comparison."
    ]
  },
  "cbt-m3-transfer": {
    "bodyHtml": "<p>Separate imposed pitch, flapping rate and total local flow. Use identical speed, radius and azimuth when comparing rigid and flapping layers. At 90° and 270° in the cyclic layer, compare θ and φ before interpreting α. A level-disc teaching trim does not establish aircraft forward acceleration. If you explore fore-aft inflow, distinguish that mechanism from advancing/retreating speed asymmetry.</p>",
    "takeaways": [
      "Local flow and pitch jointly determine α.",
      "State the selected layer and the limits of its prescribed response."
    ]
  },
  "cbt-m4-transfer": {
    "bodyHtml": "<p>Read required-power components together, then use the supplied matched available/required dataset for margin. The Power curves widget does not supply engine availability. In Rotor limits compare local Mach and α demand at fixed settings. A positive power difference cannot remove a local aerodynamic constraint or certify V_NE.</p>",
    "takeaways": [
      "Calculate margin at one matched condition and power reference.",
      "Distinguish power evidence from local rotor diagnostics."
    ]
  },
  "cbt-m5-transfer": {
    "bodyHtml": "<p>Identify the constrained ground pivot before comparing thrust moments. For the yaw case, distinguish main-rotor torque demand, fuselage/fin moments and tail-rotor balancing response. The wind-sector widget identifies possible mechanisms; it does not calculate authority or yaw motion. Explain each balance separately using your controlled snapshots.</p>",
    "takeaways": [
      "A static pivot threshold does not determine dynamic recoverability.",
      "An external weathercock moment need not mean tail-rotor thrust deterioration."
    ]
  },
  "cbt-m6-transfer": {
    "bodyHtml": "<p>Resolve the signed local aerodynamic torque, then use the supplied whole-rotor torque balance with its stated load assumptions. The map has fixed RPM and does not create an RPM history. In the separate energy view keep inertia fixed and square the RPM fraction. Explain how aerodynamic transfer can change stored energy without confusing a driving region with the original energy source.</p>",
    "takeaways": [
      "Include all stated resisting loads in a net-torque claim.",
      "An instantaneous torque and an energy state do not establish their prior history."
    ]
  },
  "cbt-m7-transfer": {
    "bodyHtml": "<p>Use the supplied mass and density ratios for the numerical ideal-hover estimate: P_i/P_i,ref = mass^(3/2)/√density at unchanged disc area. Model sliders test the separate directions; density altitude is not a direct density-ratio input. Power data are matched at the changed hover condition and one shaft reference. The local angle dataset is a separate forward-flight state. Compute θ − φ for each station and connect it to your saved cyclic-layer comparisons.</p>",
    "takeaways": [
      "Choose evidence at the scale of the question: whole-rotor demand or local flow.",
      "Keep ideal induced power separate from supplied total shaft power."
    ]
  },
  "cbt-m7-energy-case": {
    "bodyHtml": "<p>The supplied driving/braking torques include the stated resisting loads; their difference determines the instantaneous tendency at constant inertia. The RPM pair supplies a separate stored-energy comparison. A positive net torque now can coexist with less stored energy than the reference: energy can be below reference while increasing. Without a time history, do not infer which torque caused the earlier energy difference.</p>",
    "takeaways": [
      "Distinguish a state value from its current rate of change.",
      "Use torque balance, E = ½IΩ² and the supplied conditions together."
    ]
  }
};

/* group order for the sidebar */
const HL_STAGES = ['Basics', 'Hover & Vertical', 'Forward Flight', 'Safety & Limits', 'Advanced'];

const HL_V2_MODULES = [
  {
    id: 'm1',
    number: 1,
    title: 'Building Rotor Lift',
    question: 'How can a rotating blade create and control rotor thrust?',
    reasoning: 'Construct the local model.',
    spine: ['VELOCITIES', 'ANGLES', 'FORCES', 'COMPONENTS', 'ROTOR'],
    available: true,
    activities: [
      {
        lessonId: 'bigpicture',
        mode: 'model',
        title: 'How a Helicopter Flies',
        kicker: 'MODEL',
        summary: 'Start with the rotor as a spinning wing before diving into the blade element.',
        modeLead: 'See the full rotor idea first, with the labels already in place.',
        modeText: 'Follow the first lift story from spinning blade to rotor thrust before you change any variables.',
        actionLabel: 'See the model',
      },
      {
        lessonId: 'bladeelement',
        mode: 'explore',
        title: 'The Blade Element',
        kicker: 'EXPLORE',
        summary: 'Manipulate θ, φ and α and watch the causal chain update live.',
        modeLead: 'Change one local flow picture and watch the blade-element geometry respond.',
        modeText: 'Predict what happens to φ and α, then move the control and compare the new local airflow.',
        modeAction: 'Use the blade-element controls to change the local angle picture and explain what moved first.',
        actionLabel: 'Open activity',
        threeDPreset: 'm1-rotor-flow',
      },
      {
        lessonId: 'spanwise',
        mode: 'explore',
        title: 'Speed Along the Blade',
        kicker: 'EXPLORE',
        summary: 'Slide outward along the blade and connect v_rot = Ωr to local rotor speed.',
        modeLead: 'Track one blade station from root to tip and watch local rotor speed grow.',
        modeText: 'Stay with the same blade element idea, but move it outward along the blade instead of changing the whole rotor state.',
        modeAction: 'Slide the station from root to tip and compare how the local rotor speed changes at the same RPM.',
        actionLabel: 'Slide the station',
        bodyHtml: `
      <p>Keep the same blade-element idea, but now place that small 2D slice at different
      radii on the real rotor. Every point turns at the same RPM, yet the outboard station
      covers a much bigger circle each turn, so its local rotor speed is larger:
      <b>v<sub>rot</sub> = Ω·r</b>.</p>
      <p>Slide the marker from root to tip and watch what changes locally. The further out
      you go, the faster that blade element moves through the air, so the same small spanwise
      slice can create much stronger aerodynamic forces.</p>
      <p class="hl-note">For Module 1, keep the focus on the local consequence of radius:
      where the blade element sits on the rotor and how that changes its local speed.</p>`,
        takeaways: [
          'Local rotor speed follows v_rot = Ω·r, so it increases linearly from root to tip.',
          'Moving the same blade element outward changes its local airflow even when RPM stays the same.',
          'In Module 1, the key spanwise idea is the local speed consequence of radius on the rotor.',
        ],
        check: {
          q: 'If the rotor RPM stays the same, why does a blade element further out along the blade move faster through the air?',
          options: [
            'Because a larger radius means a bigger circle each turn, so v_rot = Ω·r is larger',
            'Because the outboard blade has less drag',
            'Because the tip always spins at a different RPM from the root',
            'Because induced flow disappears near the tip',
          ],
          answer: 0,
          explain: 'All blade stations share the same angular speed Ω, but the outboard station travels around a larger circle each revolution. That makes its local rotor speed v_rot = Ω·r larger.',
        },
      },
      {
        lessonId: 'm1-04',
        mode: 'mission',
        title: 'Build a Blade Element',
        kicker: 'MISSION',
        summary: 'Construct the full blade-element picture before reveal.',
        modeLead: 'Use the workspace to build the local rotor story yourself.',
        modeText: 'This is the committed construction task for Module 1: build the picture, lock in each step, then inspect the reveal.',
        actionLabel: 'Start mission',
      },
    ],
  },
  {
    id: 'm2',
    number: 2,
    title: 'Hover & Vertical Flow',
    question: 'How does induced and vertical flow change the rotor state?',
    reasoning: 'Compare flow states.',
    spine: ['REQUIRED THRUST', 'v_i', 'P_i', 'ROTOR FLOW'],
    available: true,
    activities: [
      {
        lessonId: 'hover',
        mode: 'orient',
        title: 'Why does Hovering Cost Anything?',
        subtitle: 'Commit to a mechanism before the rotor-flow explanation appears',
        kicker: 'ORIENT + PREDICT',
        summary: 'Start Module 2 by deciding where the hover power is really going.',
        modeLead: 'A helicopter can be stationary and still be spending power.',
        modeText: 'Choose the mechanism first. The explanation only unlocks after you commit.',
        modeAction: 'Pick the most convincing mechanism, then compare it with the reveal.',
        actionLabel: 'Start activity',
        widget: 'wM2HoverWhy',
        bodyHtml: `
      <p>A helicopter can look motionless in the air while the engine is still working.
      Before you see the explanation, commit to the mechanism you think best accounts for that power use.</p>
      <p>Stay with one question only: <b>where is the energy going in a hover?</b>
      The interaction reveals the answer only after your first commitment.</p>`,
        takeaways: [
          'Start with a committed mechanism choice before any answer is revealed.',
          'Treat hover as an energy-transfer question, not just a position question.',
          'Use the reveal to connect the rotor with what happens to the air.',
        ],
        check: null,
      },
      {
        lessonId: 'verticalflight',
        mode: 'model',
        title: 'Rotor Flow & Power',
        subtitle: 'Manual collective, trim off, and one visible causal chain',
        kicker: 'MODEL',
        summary: 'Increase collective once, then track what changes in thrust, induced velocity, and induced power.',
        modeLead: 'Hold trim off so the rotor can under-produce or over-produce thrust.',
        modeText: 'Predict what happens after a collective increase, then make the change and identify what moved first.',
        modeAction: 'Commit to the direction and cause before you unlock the collective change.',
        actionLabel: 'See the model',
        widget: 'wM2RotorFlowPower',
        bodyHtml: `
      <p>This activity keeps the rotor in a simple hover-state comparison: <b>manual collective</b>,
      <b>hover trim OFF</b>, and only the key quantities needed for this task.</p>
      <p>First predict what happens after a collective increase. Then make the change and decide
      which link in the hover chain changed first.</p>`,
        takeaways: [
          'Track produced thrust, the hover-condition cue, induced velocity, and induced power.',
          'With trim off, the rotor can produce more or less thrust than hover requires.',
          'After the reveal, identify which part of the chain moved first.',
        ],
        check: null,
      },
      {
        lessonId: 'groundeffect',
        mode: 'explore',
        title: 'Change the Demand',
        subtitle: 'Hover trim on: compare weight and density without losing the hover condition',
        kicker: 'EXPLORE',
        summary: 'Keep hover trim on, compare heavier and thinner-air hover states, then build the causal chain.',
        modeLead: 'Change the demand, not the meaning of the model.',
        modeText: 'Predict the consequence of a heavier helicopter and thinner air before the trimmed comparison is revealed.',
        modeAction: 'Use the guided comparisons, the 15% mass magnitude gate, and the tile chain to explain what changed.',
        actionLabel: 'Open activity',
        widget: 'wM2ChangeDemand',
        bodyHtml: `
      <p>This stage keeps <b>hover trim ON</b> so each selected comparison returns to the hover condition.
      Your job is to decide what changed in the demand and what the rotor had to do in response.</p>
      <p>Work through the weight comparison, the density comparison, the 15% mass magnitude gate,
      and the short causal-chain build.</p>`,
        takeaways: [
          'Treat required thrust as the starting point when the hover demand changes.',
          'Use trimmed hover comparisons so the rotor still satisfies the hover condition.',
          'Build the chain from demand to induced flow and induced power.',
        ],
        check: null,
      },
    ],
  },
  {
    id: 'm3',
    number: 3,
    title: 'Transition, Asymmetry & Rotor Mechanics',
    question: 'How does the rotor cope with unequal airflow around the disc?',
    reasoning: 'Reason around the rotor disc.',
    available: false,
  },
  {
    id: 'm4',
    number: 4,
    title: 'Performance & Aerodynamic Limits',
    question: 'What becomes limiting as speed, loading and operating condition change?',
    reasoning: 'Integrate competing limits.',
    available: false,
  },
  {
    id: 'm5',
    number: 5,
    title: 'Stability, Control & Anti-Torque',
    question: 'How are helicopter forces and moments balanced and disturbed?',
    reasoning: 'Diagnose equilibrium and control problems.',
    available: false,
  },
  {
    id: 'm6',
    number: 6,
    title: 'Autorotation & Rotor Energy',
    question: 'Where does rotor energy come from without engine torque?',
    reasoning: 'Trace energy flow and local driving or braking force.',
    available: false,
  },
  {
    id: 'm7',
    number: 7,
    title: 'Integration & Mastery',
    question: 'Can the learner diagnose a new aerodynamic situation from first principles?',
    reasoning: 'Transfer.',
    available: false,
  },
];

const HL_V2_PRESETS = {
  'm1-rotor-flow': {
    preset: 'm1-rotor-flow',
    mode: 'guided',
    title: 'View this in 3D — Where the blade element sits',
    summary: 'Place the blade element on the rotor, slide it outward, and connect v_rot = Ωr to local rotor speed.',
    hint: 'The yellow marker shows the blade station. Move it outboard and compare how the same blade element speeds up.',
    controls: ['radius'],
    initialRBar: 0.75,
    state: { coll: 9.2, Vkt: 0, Vc: 0, weight: 2800, alt: 0, psi: 90, showWake: false, showFuselage: true, showVel: true },
  },
};
