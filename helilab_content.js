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
    id: 'bigpicture', stage: 'Basics', title: 'How a Helicopter Flies',
    subtitle: 'The rotor is a spinning wing',
    widget: 'wBigPicture',
    body: `
      <p>A helicopter flies for exactly the same reason an aeroplane does:
      a <b>wing moving through air makes lift</b>. The difference is that the
      helicopter's wings are <b>blades that spin</b>, so they keep making lift
      even when the aircraft is standing still in the air.</p>
      <p>Three ideas carry you through this whole course:</p>
      <ul>
        <li><b>Collective</b> changes the pitch of <i>all</i> blades together →
            changes total <b>thrust</b> (up/down).</li>
        <li><b>Cyclic</b> changes blade pitch <i>once per revolution</i> → <b>tilts
            the rotor disc</b>, pointing thrust where you want to go.</li>
        <li><b>Pedals</b> change tail-rotor thrust → <b>yaw</b>.</li>
      </ul>
      <p>Try the controls beside the diagram. Watch how raising the collective grows
      the thrust arrow, and how cyclic tilts the disc so the thrust leans — that lean
      is what accelerates the helicopter forward, back or sideways.</p>`,
    takeaways: [
      'Lift comes from blades moving through air — spinning lets it work in the hover.',
      'Collective = total thrust. Cyclic = where the thrust points. Pedals = yaw.',
      'Tilting the thrust vector is how a helicopter translates.',
    ],
    check: {
      q: 'You push the cyclic forward. What happens to the rotor disc and the thrust vector?',
      options: [
        'The disc tilts forward and thrust leans forward, accelerating the helicopter ahead',
        'The whole rotor produces more total thrust',
        'Only the tail rotor changes',
        'The blades all increase pitch equally',
      ], answer: 0,
      explain: 'Cyclic tilts the disc (here, forward). Total thrust is roughly unchanged, but it now leans forward, so its horizontal component accelerates the aircraft. Collective is what changes total thrust.',
    },
  },
  {
    id: 'bladeelement', stage: 'Basics', title: 'The Blade Element',
    subtitle: 'Where lift is actually born — θ, φ and α',
    widget: 'wBladeElement',
    body: `
      <p><b>Blade Element Theory (BET)</b> says: to understand the whole rotor,
      look at one thin slice of one blade and add up all the slices. This single
      slice is the heart of everything you will draw on your exam.</p>
      <p>The slice sees a <b>relative wind</b> — the air coming at it. Three angles
      describe its world:</p>
      <ul>
        <li><b>θ (pitch)</b> — the angle you set with the collective, between the
            chord and the rotor plane.</li>
        <li><b>φ (inflow angle)</b> — how far the relative wind is tilted below the
            rotor plane, because the rotor is pulling air down through itself.</li>
        <li><b>α (angle of attack)</b> = <b>θ − φ</b> — the angle the blade actually
            "feels". This is what makes lift.</li>
      </ul>
      <p>The crucial pilot insight: <b>α is not θ</b>. You set θ, but the induced
      inflow steals some of it away as φ. Pull pitch and α rises; let the inflow
      build and α falls back. Drag the sliders and watch lift grow — until α
      reaches the stall and lift collapses.</p>`,
    takeaways: [
      'α = θ − φ. You command θ; the airflow decides φ; the blade feels α.',
      'Lift ∝ α (until stall). Inflow φ always eats into your commanded pitch.',
      'One blade element, repeated around the disc, is the whole rotor.',
    ],
    check: {
      q: 'You raise collective (θ) but the induced inflow also increases. Why does lift rise less than you might expect?',
      options: [
        'Because more inflow means a larger φ, so α = θ − φ rises less than θ did',
        'Because the blade slows down',
        'Because drag becomes lift',
        'Because θ has no effect on α',
      ], answer: 0,
      explain: 'More thrust pulls more air down → bigger induced inflow → bigger φ. Since α = θ − φ, part of your extra pitch is offset by the extra inflow. This self-limiting behaviour is why rotors are stable in thrust.',
    },
  },
  {
    id: 'spanwise', stage: 'Basics', title: 'Speed Along the Blade',
    subtitle: 'Why the outer blade does the work',
    widget: 'wSpanwise',
    body: `
      <p>Every slice spins at the same RPM, but a slice near the tip travels much
      faster than one near the root, because it covers a bigger circle:
      <b>U<sub>T</sub> = Ω·r</b>. The tip of a typical rotor moves at over
      <b>200 m/s</b> while the root barely moves.</p>
      <p>Lift depends on speed <b>squared</b> (dynamic pressure ∝ ½ρV²), so the
      outer third of the blade makes the great majority of the thrust. That is why:
      </p>
      <ul>
        <li>Blades are often <b>twisted</b> (washout) — less pitch at the fast tip,
            more at the slow root — to even out the loading.</li>
        <li>The very tip loses a little to <b>tip losses</b> (air escaping around
            the end), so useful lift peaks just inboard of the tip.</li>
      </ul>
      <p>Slide the station marker from root to tip and watch the local speed and
      the lift-per-metre climb steeply outboard.</p>`,
    takeaways: [
      'Local speed U_T = Ω·r — grows linearly from root to tip.',
      'Lift ∝ speed², so the outer blade carries most of the load.',
      'Twist (washout) and tip loss shape the real spanwise lift distribution.',
    ],
    check: {
      q: 'A slice at 0.9R versus one at 0.45R — roughly how much more dynamic pressure (∝ speed²) does the outer slice see?',
      options: ['About 4× more', 'About the same', 'About 2× more', 'About 1.5× more'],
      answer: 0,
      explain: 'Speed doubles from 0.45R to 0.9R (U_T = Ω·r). Dynamic pressure goes as speed², so 2² = 4× more. That square law is why the outer blade dominates lift.',
    },
  },

  /* ──────────────────────── STAGE 2 — HOVER & VERTICAL ─────────────────── */
  {
    id: 'hover', stage: 'Hover & Vertical', title: 'Hover & Induced Flow',
    subtitle: 'Momentum theory meets BET — v_i, λ and power',
    widget: 'wHover',
    body: `
      <p>To hover, the rotor must push a column of air downward. By Newton's third
      law, that downward push on the air gives an upward <b>thrust</b> on the
      helicopter. The speed it gives the air at the disc is the <b>induced
      velocity v<sub>i</sub></b>.</p>
      <p>Two theories meet here and must agree:</p>
      <ul>
        <li><b>Momentum theory</b> (the air): T = 2ρA·v<sub>i</sub>² →
            v<sub>i</sub> = √(T / 2ρA). Heavier or higher (thinner air) ⇒ more
            induced velocity needed.</li>
        <li><b>Blade Element Theory</b> (the blades): the same thrust written as
            C<sub>T</sub> = (σ·c<sub>lα</sub>/6)(θ₀ − 3λ/2).</li>
      </ul>
      <p class="hl-note">This compact <b>1/6</b> form is just the hover case of the
      general forward-flight thrust equation the simulator solves,
      C<sub>T</sub> = (σ·c<sub>lα</sub>/4)[θ₀(2/3 + μ²) − (λ + μ·θ<sub>1s</sub>)] —
      set the advance ratio μ = 0 and (σ·c<sub>lα</sub>/4)·(2/3) becomes
      (σ·c<sub>lα</sub>/6), giving exactly (σ·c<sub>lα</sub>/6)(θ₀ − 3λ/2). Same
      physics, two forms; the numbers you see come from the full equation.</p>
      <p>We solve them together for the inflow ratio <b>λ = v<sub>i</sub>/ΩR</b>.
      The pilot story: pull collective → θ₀ up → thrust up → but induced inflow
      also rises, raising φ and trimming α back. Watch thrust, v<sub>i</sub> and
      <b>power</b> all climb together as you raise the collective.</p>`,
    takeaways: [
      'Hover thrust = pushing air down: v_i = √(T/2ρA).',
      'λ = v_i/ΩR ties momentum theory and BET together.',
      'Induced power P_i = T·v_i is the price of making lift in the hover.',
    ],
    check: {
      q: 'High, hot and heavy: the air is thin and the aircraft is heavy. What happens to the induced velocity and power required to hover?',
      options: [
        'Both increase — thinner air and more weight raise v_i, so P_i = T·v_i climbs',
        'Both decrease',
        'v_i drops but power rises',
        'Nothing changes — hover power is fixed',
      ], answer: 0,
      explain: 'v_i = √(T/2ρA): more weight (T↑) and thinner air (ρ↓) both raise v_i. Induced power P_i = T·v_i then climbs steeply — the classic "high/hot/heavy" hover-performance trap.',
    },
  },
  {
    id: 'verticalflight', stage: 'Hover & Vertical', title: 'Climb, Descent & VRS',
    subtitle: 'Axial inflow and the vortex ring danger',
    widget: 'wVertical',
    body: `
      <p>In a vertical <b>climb</b>, the airframe's upward motion adds to the air
      already coming down through the disc. The total inflow rises, φ grows, and
      α at each blade element <b>drops</b> — so you must pull more collective to
      hold thrust. Climbing costs power.</p>
      <p>In a <b>descent</b>, the upward-moving air opposes the rotor's downwash.
      A fast, clean descent (or autorotation) lets the air drive the rotor. But in
      a narrow band of <b>slow vertical descent</b> — descent rate near the hover
      induced velocity (V<sub>c</sub>/v<sub>h</sub> ≈ −0.25 to −1.8) — the rotor
      sinks into its own turbulent wake. This is the <b>Vortex Ring State (VRS)</b>:
      </p>
      <ul>
        <li>The downwash recirculates around the blade tips instead of leaving.</li>
        <li>Thrust becomes erratic; momentum theory <b>fails</b> here.</li>
        <li>Adding collective makes it <b>worse</b> — recovery is to fly forward
            (or lower the collective) to escape the recirculation.</li>
      </ul>
      <p>Press <b>▶ Climb entry</b> to watch the whole transient: raising the
      collective makes T &gt; W, the helicopter accelerates up, but the building
      climb raises the inflow and trims α back down until <b>T = W again</b> at a
      steady rate of climb. <b>▶ Descent entry</b> shows the reverse — and how a
      gentle vertical descent settles toward the VRS band. Or drag the manual
      slider to scrub it yourself.</p>`,
    takeaways: [
      'Climb adds to inflow → α drops → more collective needed.',
      'VRS occurs in slow vertical descent near V_c ≈ v_h; thrust goes erratic.',
      'Recover from VRS by gaining forward speed, not by pulling collective.',
    ],
    check: {
      q: 'You are in a slow vertical descent and feel the onset of vortex ring state. What is the correct recovery?',
      options: [
        'Lower collective and/or fly forward to get into clean air',
        'Pull maximum collective to arrest the descent',
        'Hold everything steady and wait',
        'Increase RPM only',
      ], answer: 0,
      explain: 'In VRS the rotor is recirculating its own wake. Pulling collective feeds the vortex and worsens it. Flying forward (or lowering collective) moves the rotor into undisturbed air and restores normal thrust.',
    },
  },
  {
    id: 'groundeffect', stage: 'Hover & Vertical', title: 'Ground Effect',
    subtitle: 'The cushion that makes the hover cheaper',
    widget: 'wGroundEffect',
    body: `
      <p>Near the ground (within about one rotor diameter), the downwash can't
      accelerate freely — the ground gets in the way. The induced velocity
      <b>v<sub>i</sub> falls</b>, the inflow angle φ shrinks, α rises, and the
      rotor makes <b>more thrust for the same power</b> (or the same thrust for
      less power). This is the <b>ground cushion</b>.</p>
      <p>A simple model (Cheeseman–Bennett) captures it:</p>
      <p style="text-align:center"><b>v<sub>i,IGE</sub> / v<sub>i,OGE</sub> =
      √(1 − 1/(16·(z/R)²))</b></p>
      <p>where z/R is the rotor height above ground in radii. The benefit is large
      below z/R ≈ 0.5 and has essentially vanished by z/R ≈ 1.5 — that is why a
      heavily loaded helicopter can hover in ground effect (IGE) but not out of
      ground effect (OGE). Slide the height down and watch the thrust gain build.</p>`,
    takeaways: [
      'Near the ground v_i drops → thrust rises for the same power.',
      'Benefit is strong below z/R ≈ 0.5, gone by z/R ≈ 1.5.',
      'IGE hover may be possible when OGE hover is not — a key performance limit.',
    ],
    check: {
      q: 'Why does a helicopter need less power to hover in ground effect?',
      options: [
        'The ground restricts the downwash, lowering v_i and induced power',
        'The ground reflects extra lift up to the rotor',
        'The blades spin faster near the ground',
        'Air is always denser near the ground by enough to matter',
      ], answer: 0,
      explain: 'The ground blocks the wake from accelerating, so the induced velocity v_i is lower. Since induced power P_i = T·v_i, lower v_i means less power for the same thrust — the ground cushion.',
    },
  },

  /* ──────────────────────── STAGE 3 — FORWARD FLIGHT ───────────────────── */
  {
    id: 'dissymmetry', stage: 'Forward Flight', title: 'Dissymmetry of Lift',
    subtitle: 'Advancing vs retreating — the asymmetry problem',
    widget: 'wDissymmetry',
    body: `
      <p>The moment the helicopter moves forward, the two sides of the disc stop
      being equal. On the <b>advancing side</b> (ψ ≈ 90°) the blade's rotational
      speed and the forward speed <b>add</b>; on the <b>retreating side</b>
      (ψ ≈ 270°) they <b>subtract</b>:</p>
      <p style="text-align:center"><b>U<sub>T</sub> = Ω·r + V·sinψ</b></p>
      <p>Lift goes as speed², so without any correction the advancing blade would
      make far more lift than the retreating blade. That rolling imbalance is the
      <b>dissymmetry of lift</b>. Push fast enough and the retreating blade runs
      out of speed entirely — a <b>reverse-flow</b> region grows at its root, where
      air hits the trailing edge first.</p>
      <p>Spin the azimuth scrubber and push the speed up. Watch the lift bars on
      the two sides diverge — then in the next lesson see how the rotor fixes it
      all by itself.</p>`,
    takeaways: [
      'U_T = Ω·r + V·sinψ: advancing side fast, retreating side slow.',
      'Lift ∝ speed², so forward flight creates a left–right lift imbalance.',
      'At high speed a reverse-flow region grows at the retreating root.',
    ],
    check: {
      q: 'In forward flight, where on the disc is the blade tangential speed lowest?',
      options: [
        'The retreating side (ψ ≈ 270°), where rotation and forward speed subtract',
        'The advancing side (ψ ≈ 90°)',
        'Over the nose (ψ ≈ 180°)',
        'It is the same everywhere',
      ], answer: 0,
      explain: 'U_T = Ω·r + V·sinψ. At ψ = 270° (retreating), sinψ = −1, so forward speed subtracts from rotational speed — the slowest, lowest-lift side, and where stall appears first.',
    },
  },
  {
    id: 'flapping', stage: 'Forward Flight', title: 'Flapping — the Automatic Fix',
    subtitle: 'How the rotor equalises lift by itself',
    widget: 'wFlapping',
    body: `
      <p>The rotor solves dissymmetry of lift <b>mechanically, without any pilot
      input</b>. Blades are hinged (or flexible) so they can <b>flap</b> up and
      down. Where lift is high (advancing side), the blade flaps <b>up</b>; flapping
      up reduces its angle of attack, shedding the excess lift. Where lift is low
      (retreating side), the blade flaps <b>down</b>, raising α and recovering lift.
      The rotor balances itself.</p>
      <p>Two subtleties every ATPL student must know:</p>
      <ul>
        <li><b>Coning (a₀)</b>: in the hover the blades already rise into a shallow
            cone, balancing lift against centrifugal force.</li>
        <li><b>Phase lag ≈ 90°</b>: a rotor responds to an input a quarter-turn
            later (gyroscopic precession). Maximum <i>upward force</i> on the
            advancing side (ψ 90°) produces maximum <i>up-flap displacement</i>
            90° later, over the nose (ψ 180°) — so the disc tilts <b>back</b>, not
            sideways. This is why cyclic is rigged ahead of where you want the disc
            to go.</li>
      </ul>
      <p>Increase forward speed and watch β(ψ) — the flapping angle around the
      azimuth — grow, and the disc blow back.</p>`,
    takeaways: [
      'Blades flap up where lift is high, down where it is low — auto-equalising.',
      'Coning a₀ balances lift vs centrifugal force; it grows with thrust.',
      'Phase lag ≈ 90°: peak force leads peak displacement by a quarter turn.',
    ],
    check: {
      q: 'Maximum upward aerodynamic force occurs on the advancing side (ψ 90°). Because of ~90° phase lag, where is the maximum up-flap displacement?',
      options: [
        'Over the nose (ψ ≈ 180°), tilting the disc rearward — "blowback"',
        'Still on the advancing side (ψ 90°)',
        'On the retreating side (ψ 270°)',
        'Over the tail (ψ 0°)',
      ], answer: 0,
      explain: 'A rotor disc behaves gyroscopically: the response peaks ~90° of rotation after the input. Peak force at ψ 90° → peak displacement at ψ 180°, so the disc flaps back (blowback). Pilots counter it with forward cyclic.',
    },
  },
  {
    id: 'envelope', stage: 'Forward Flight', title: 'Retreating Stall & the Speed Envelope',
    subtitle: 'The two walls of the speed envelope',
    widget: 'wEnvelope',
    body: `
      <p>The disc map below is the <b>overview</b>: the whole rotor at a glance,
      coloured so you can see <i>where</i> the retreating side stalls (red) and
      where the flow reverses (purple) as speed, weight, g and density altitude
      climb. Two opposite problems close in as speed rises, and together they set
      the never-exceed speed V<sub>NE</sub>:</p>
      <ul>
        <li><b>Retreating blade stall (the low-speed wall of the fast side):</b>
            the retreating blade is slow, so to make its share of lift it needs a
            high α. Flapping-down adds even more α. Past a critical speed the
            retreating tip <b>stalls</b> — felt as vibration, a nose-up pitch and a
            roll towards the retreating side.</li>
        <li><b>Advancing-tip compressibility:</b> the advancing tip is the fastest
            point on the aircraft and approaches the speed of sound. <b>Shock waves
            </b> bring drag rise, noise and buffet.</li>
      </ul>
      <p>So the rotor is squeezed from both ends: the retreating side runs out of
      α, the advancing side runs out of Mach margin.</p>
      <p><b>Model note — the blade-twist toggle:</b> the disc map is a steady,
      rigid-blade beam-element model with the full Drees inflow. The <b>Blade
      twist</b> switch changes just one input:</p>
      <ul>
        <li><b>No twist (exam)</b> — the default. An untwisted blade keeps full
            pitch out to the tip, so the high-α zone sits <b>outboard on the
            retreating side and the tip stalls first</b> (≈0.9–1.0 R, ψ≈270°),
            spreading inboard as speed, weight, g or density altitude rise. This
            is the clean ATPL/POF plate and the 082 exam answer.</li>
        <li><b>With twist (real)</b> — the aircraft's real −8° washout unloads
            the tip and loads the mid-span, so the α peak slides a little
            <b>inboard (≈0.7 R)</b> and the tip is no longer strictly the first to
            go. Nothing is faked — only the twist input changes.</li>
      </ul>
      <p>Learn the <b>No-twist tip-first picture</b> for the exam; flip the toggle
      to see how real blade twist shifts the onset inboard.</p>`,
    takeaways: [
      'Retreating blade stall sets the upper speed limit — slow blade, high α.',
      'Advancing-tip compressibility (shock waves) limits from the other side.',
      'Together they define V_NE; both worsen with weight, altitude and g.',
    ],
    check: {
      q: 'Classic retreating blade stall is first felt as…',
      options: [
        'Vibration with a nose-up pitch and roll toward the retreating side',
        'A smooth loss of all lift and immediate descent',
        'An uncommanded yaw only',
        'Nothing — it is purely a structural limit',
      ], answer: 0,
      explain: 'The retreating blade stalls near its tip at ψ≈270°. With ~90° phase lag the disc response shows up behind, giving a nose-up pitch and a roll toward the retreating side, preceded by vibration. Reduce collective, speed and g to recover.',
    },
  },

  {
    id: 'bet-guided', stage: 'Forward Flight', title: 'Guided BET — How a Rotor Really Works',
    subtitle: 'Build the velocity triangle layer by layer, watch flapping happen',
    widget: 'wGuidedBET',
    body: `
      <p>Most students meet the BET velocity triangle as one frozen diagram with
      five labels and memorise "advancing flaps up" as a fact. This page builds
      it <b>one layer at a time</b>, so you see the cause-and-effect chain that
      makes a rotor work — and that ends in retreating blade stall.</p>
      <p>Work top to bottom through the five layers. Each layer switches on one
      physics effect, and the disc + velocity triangle rebuild live:</p>
      <ul>
        <li><b>1 · Hover</b> — the symmetric baseline. U_T = r·Ω is the same
            everywhere; no flapping is needed.</li>
        <li><b>2 · Forward, rigid blade</b> — add speed but LOCK the blade. U_T
            grows on the advancing side and shrinks on the retreating side, so
            with fixed pitch the lift demand (≈ U_T²·α) explodes asymmetrically.
            This is <i>the problem</i> flapping exists to solve.</li>
        <li><b>3 · Flapping on</b> — free the blade (still no cyclic). It flaps up
            on the advancing side → flapping rate raises U_P → φ grows →
            <b>α shrinks</b> there. Retreating: α grows. Lift partly equalises
            (flapping-to-equality) but the disc tilts back — blowback.</li>
        <li><b>4 · Cyclic (trim)</b> — the pilot pre-distorts the pitch (θ₁c, θ₁s)
            so flapping nearly vanishes and the disc stays level. Lift is
            equalised <i>and</i> thrust stays forward. Peak α now sits on the
            retreating side.</li>
        <li><b>5 · High speed</b> — push toward V_NE. The retreating blade's U_T
            is small, so it needs ever-higher α to carry its share — until it
            exceeds the critical angle and stalls. That is retreating blade
            stall.</li>
      </ul>
      <p><b>Play with it.</b> Hit <b>Play azimuth sweep</b> and watch the blade go
      round; the pointer on the disc and the triangle below move in lockstep.
      <b>Click any cell</b> on the disc to load that station and azimuth into the
      triangle. Switch the disc between <b>U_T</b>, <b>α</b> and <b>Lift demand</b>
      — seeing all three makes the lesson click: lift ∝ U_T²·α, so where U_T is
      small the blade must fly at high α, and that is exactly where it stalls.</p>`,
    takeaways: [
      'Flapping is not decoration — it is the mechanism that restores lift symmetry.',
      'Advancing flaps up → U_P grows → α shrinks; retreating drops → α grows.',
      'Retreating blade stall happens where U_T is small, forcing high α.',
      'Cyclic (trim) holds the disc level against blowback; speed sets the stall limit.',
    ],
  },

  {
    id: 'bet-velocity', stage: 'Forward Flight', title: 'The BET Velocity Triangle',
    subtitle: 'Why the retreating blade runs slow — vector by vector',
    widget: 'wBetVelocity',
    body: `
      <p>This page shows you <i>why</i> the retreating blade runs slow, with the
      exact velocity triangle you draw on the exam. Pick any point on the blade —
      a blade station <b>r/R</b>, an <b>azimuth ψ</b> and a <b>forward speed</b>
      — and read off every velocity the blade element sees.</p>
      <p><b>Two maps, two jobs.</b> You meet the retreating-stall disc map on two
      pages, and each time it does something different:</p>
      <ul>
        <li><b>On the Envelope page</b> it is the <i>overview</i> — the whole disc
            at a glance, so you can see <i>where</i> stall lives (red) and where
            the flow reverses (purple) as speed, weight and altitude climb.</li>
        <li><b>Here, above the triangle</b> it is a <i>cell-picker</i> — a smaller
            live copy of the same map. <b>Click any cell</b> (or drag across it) to
            load that cross-section into the triangle below; the crosshair jumps
            there and the triangle rebuilds for that exact <b>ψ</b> and <b>r/R</b>.</li>
      </ul>
      <p>The banner over the read-out then gives the verdict using the
      <i>identical</i> critical-α and airload model as the map, so a <b>red</b> cell
      always reads <b>STALLED</b> and a <b>purple</b> cell reads <b>REVERSE FLOW</b>
      here too. Use the <b>stall-model toggle</b> (Exam-plate / Realistic) to keep
      the BET and the map in step. This is how you learn the envelope — cell by
      cell, vector by vector: click a red patch, watch V<sub>T</sub> subtract and
      α climb past critical.</p>
      <p>Build the in-plane speed head-to-tail, exactly as in the book:</p>
      <ul>
        <li><b>V<sub>rot</sub> = Ω·r</b> — the rotational speed. It always points
            forward along the chord and grows from root to tip.</li>
        <li><b>V<sub>T</sub> = μ·sinψ·ΩR</b> — the tangential component of the
            aircraft's forward flow. It is drawn <b>on the tip of V<sub>rot</sub></b>.
            On the <b>advancing</b> side (ψ=90°, sinψ=+1) it points forward and
            <b>adds</b>. On the <b>retreating</b> side (ψ=270°, sinψ=−1) it points
            <b>backward</b> and is <b>subtracted</b> — you can see it pull the tip
            of the vector back toward the hub.</li>
        <li><b>U<sub>T</sub> = V<sub>rot</sub> + V<sub>T</sub></b> — the net
            in-plane speed. On the retreating side it is short, so the blade must
            fly at a high <b>α</b> to make its share of lift.</li>
      </ul>
      <p>The perpendicular flow <b>U<sub>P</sub></b> (inflow λ plus the flapping
      velocity) is drawn vertically at the tip of U<sub>T</sub>. The resultant
      <b>V<sub>rel</sub></b> closes the triangle, and the angles fall straight out:
      <b>θ</b> is the blade pitch, <b>φ</b> the inflow angle, and
      <b>α = θ − φ</b> the angle of attack that decides whether the section
      stalls.</p>
      <p><b>Blade twist:</b> the two faint airfoils show the pitch span from the
      root (most pitch) to the tip (least — the −8° washout unloads the tip). The
      sharp section is your current blade station, sitting between them. Toggle
      <b>twist off</b> and watch the whole section swing up to the full untwisted
      pitch — the reason the untwisted exam blade stalls at the tip first.</p>`,
    takeaways: [
      'V_T (μ·sinψ) adds on the advancing side and subtracts on the retreating side.',
      'On the retreating blade the net U_T is small, forcing a high α to hold lift.',
      'α = θ − φ; when α exceeds the critical angle the section stalls.',
      'Blade washout lowers tip pitch — turn it off and the tip goes to full pitch.',
      'Click a cell on the disc map to see the exact BET triangle and stall verdict for that section — same model as the envelope overview.',
    ],
    check: {
      q: 'At ψ = 270° (retreating), the forward-flow term V_T = μ·sinψ…',
      options: [
        'Points backward and is subtracted from V_rot, so the net U_T is small',
        'Points forward and adds to V_rot, giving the highest U_T',
        'Is zero because the blade is over the nose',
        'Only changes the perpendicular flow U_P, not U_T',
      ], answer: 0,
      explain: 'sin(270°) = −1, so V_T = μ·sinψ·ΩR is negative — it points backward and is subtracted from the rotational speed V_rot. The net in-plane speed U_T is therefore small, and the blade must fly at a high α to keep making lift. Push the speed up and that α reaches the stall angle at the retreating tip first.',
    },
  },

  {
    id: 'coriolis', stage: 'Forward Flight', title: 'Coriolis Effect — Lead & Lag',
    subtitle: 'Why blades hunt fore-and-aft as they flap',
    widget: 'wCoriolis',
    body: `
      <p>Flapping solves the lift problem, but it creates a second one. When a
      blade flaps <b>up</b>, its centre of mass moves <b>closer to the shaft</b>.
      Conservation of angular momentum then demands it speed up — exactly like a
      spinning skater pulling their arms in. Flap <b>down</b> and the mass moves
      out, so the blade slows down. This fore-and-aft "hunting" is the
      <b>Coriolis effect</b>.</p>
      <p>The change in rotational energy shows up as an in-plane acceleration:</p>
      <p style="text-align:center"><b>2·Ω·β·β̇</b> — the Coriolis acceleration,
      proportional to spin rate Ω, coning β and flap rate β̇.</p>
      <ul>
        <li><b>Blade flaps up</b> (advancing→nose) → mass moves in → blade
            <b>leads</b> (accelerates ahead).</li>
        <li><b>Blade flaps down</b> (nose→retreating) → mass moves out → blade
            <b>lags</b> (decelerates behind).</li>
      </ul>
      <p>If the blade root were rigid these forces would be enormous, so
      <b>fully-articulated</b> rotors add a <b>drag (lead–lag) hinge</b> with a
      damper to let the blade hunt freely. Two-bladed <b>teetering</b> and
      <b>rigid</b> rotors instead use <b>underslinging</b> (the hub sits below the
      flapping axis) so the mass barely moves radially, cancelling most of the
      Coriolis force. Drag the flap slider and watch the blade lead and lag around
      the azimuth.</p>`,
    takeaways: [
      'Coriolis: flap up → mass moves in → blade leads; flap down → mass out → lags.',
      'It is conservation of angular momentum (the ice-skater), accel ∝ 2·Ω·β·β̇.',
      'Articulated rotors use a lead–lag hinge + damper; teetering rotors use underslinging.',
    ],
    check: {
      q: 'A rotor blade flaps upward as it moves toward the nose. What does the Coriolis effect do to it in the plane of rotation?',
      options: [
        'It speeds up (leads) — its mass has moved closer to the shaft',
        'It slows down (lags) — its mass has moved outward',
        'Nothing — flapping and rotation are independent',
        'It stalls because the angle of attack changes',
      ], answer: 0,
      explain: 'Flapping up pulls the blade\u2019s centre of mass inward. Conservation of angular momentum (skater pulling arms in) makes it accelerate ahead — it leads. Flapping down does the reverse (lag). Articulated rotors add a lead\u2013lag hinge to absorb this hunting.',
    },
  },

  /* ──────────────────────── STAGE 4 — SAFETY & LIMITS ──────────────────── */
  {
    id: 'dynamicrollover', stage: 'Safety & Limits', title: 'Dynamic Rollover',
    subtitle: 'The pivot-point trap on the ground',
    widget: 'wDynamicRollover',
    body: `
      <p>On the ground a helicopter can roll over at a bank angle far smaller than
      you would expect — because it is not pivoting about its centre of gravity,
      but about a <b>fixed point</b>: a skid or wheel still touching the ground
      (often held by a stuck skid, a slope, or a tie-down).</p>
      <p>Once a roll starts about that pivot, the <b>tilted thrust vector</b> gains
      a horizontal component that <b>feeds the roll further</b>. Past a
      <b>critical rollover angle</b> — typically only about <b>5–8°</b> — recovery
      by lateral cyclic alone becomes impossible: the disc simply cannot generate
      enough restoring moment, and reducing collective is the only fix.</p>
      <ul>
        <li><b>Cause:</b> a pivot point + a rolling moment (cross-slope, stuck
            skid, cyclic input, or crosswind) while thrust is near flying weight.</li>
        <li><b>The trap:</b> the more it rolls, the more the thrust drives the
            roll — it is a <b>divergent</b>, self-amplifying motion.</li>
        <li><b>Recovery:</b> <b>smoothly lower the collective</b> to remove the
            thrust that powers the roll. Never try to "fly out" of it with cyclic
            once past the critical angle.</li>
      </ul>
      <p>Contributing factors: high collective, slope operations, a stuck skid,
      crosswind, and the CofG. Increase the bank angle in the widget and watch the
      restoring moment turn into a rolling moment past the critical angle.</p>`,
    takeaways: [
      'Dynamic rollover = rolling about a fixed pivot (skid/wheel), not the CofG.',
      'Critical angle is small (~5–8°); past it, tilted thrust drives the roll — divergent.',
      'Recovery is to smoothly LOWER COLLECTIVE, not to correct with cyclic.',
    ],
    check: {
      q: 'You feel a dynamic rollover developing during a slope take-off. What is the correct recovery action?',
      options: [
        'Smoothly lower the collective to remove the thrust driving the roll',
        'Apply full opposite lateral cyclic and hold collective',
        'Increase collective to lift clear of the pivot',
        'Apply opposite pedal',
      ], answer: 0,
      explain: 'Past the critical rollover angle, cyclic cannot generate enough restoring moment and raising collective only increases the thrust that feeds the roll. Smoothly lowering the collective removes the driving force — the one reliable recovery.',
    },
  },
  {
    id: 'lte', stage: 'Safety & Limits', title: 'Loss of Tail-Rotor Effectiveness',
    subtitle: 'When the tail rotor can no longer hold the yaw',
    widget: 'wLTE',
    body: `
      <p>The tail rotor must produce enough sideways thrust to balance main-rotor
      torque. <b>Loss of Tail-rotor Effectiveness (LTE)</b> is an uncommanded,
      often rapid yaw that happens when the tail rotor's anti-torque thrust is
      degraded — usually at <b>low airspeed, high power, and out of ground
      effect</b>, where a relative wind from certain directions upsets it.</p>
      <p>Three classic wind-azimuth regions (for a CCW main rotor / anti-torque
      pedal = left) drive it:</p>
      <ul>
        <li><b>Weathercock / tail-rotor vortex-ring (≈210–330°):</b> the tail
            rotor runs in its own vortex ring — thrust becomes erratic.</li>
        <li><b>Main-rotor disc-vortex interference (≈285–315°):</b> the main-rotor
            tip vortex washes the tail rotor, cutting its thrust.</li>
        <li><b>Weathervane instability (≈120–240°):</b> a tailwind tries to swing
            the nose around.</li>
      </ul>
      <p>The danger multiplies with <b>high power</b> (more torque to react) and
      <b>low speed</b> (no fin authority yet). <b>Recovery:</b> apply <b>full
      anti-torque pedal</b>, lower collective to cut the torque demand, and gain
      <b>forward airspeed</b> so the vertical fin and clean airflow restore
      control. Rotate the wind arrow in the widget and watch the tail-rotor margin
      collapse in the critical sectors.</p>`,
    takeaways: [
      'LTE = uncommanded yaw when tail-rotor anti-torque thrust is degraded.',
      'Worst at low speed, high power, OGE, with wind in the critical azimuth sectors.',
      'Recover: full anti-torque pedal, lower collective, gain forward airspeed.',
    ],
    check: {
      q: 'LTE is most likely to occur in which regime?',
      options: [
        'Low airspeed, high power, out of ground effect, with wind from a critical sector',
        'High-speed cruise in level flight',
        'A steep descent at high forward speed',
        'Idle on the ground with rotors stopped',
      ], answer: 0,
      explain: 'LTE strikes at low airspeed and high power (large torque to react) out of ground effect, when a relative wind from a critical azimuth disturbs the tail rotor. At speed the vertical fin provides directional stability, so LTE is a low-speed phenomenon.',
    },
  },

  /* ─────────────────────────── STAGE 5 — ADVANCED ──────────────────────── */
  {
    id: 'autorotation', stage: 'Advanced', title: 'Autorotation',
    subtitle: 'Flying with the engine off',
    widget: 'wAutorotation',
    body: `
      <p>With the engine gone, the rotor is kept spinning by air flowing <b>up</b>
      through the disc as the helicopter descends. Energy stored in the spinning
      rotor — and the descent itself — keeps the blades turning. The blade divides
      into three spanwise regions:</p>
      <ul>
        <li><b>Driven region (outboard, ~the tip third):</b> the total aerodynamic
            force tilts <i>behind</i> the spin axis — it <b>brakes</b> the rotor
            (acts like a normal lifting wing taking power).</li>
        <li><b>Driving region (mid-span):</b> the up-flow tilts the force <i>ahead
            </i> of the axis — it <b>accelerates</b> the rotor, replacing the lost
            engine torque.</li>
        <li><b>Stall region (inboard root):</b> low speed, high α — stalled, mostly
            drag.</li>
      </ul>
      <p>The pilot manages RRPM by moving the boundary between driving and driven
      regions with the collective. At the bottom, a <b>flare</b> trades the
      rotor's stored energy and the descent's kinetic energy for a burst of thrust
      to cushion the landing. The map shows all three regions over the whole disc;
      add forward speed and watch the driving zone migrate toward the retreating
      side (ψ 270°) as the advancing side speeds up and goes driven.</p>`,
    takeaways: [
      'In autorotation, up-flow through the disc drives the rotor — no engine.',
      'Span splits into stall (root), driving (mid), driven (tip) regions.',
      'Collective moves the driving/driven boundary to control RRPM; flare trades energy for thrust.',
    ],
    check: {
      q: 'Which spanwise region keeps the rotor turning in a steady autorotation?',
      options: [
        'The driving region (mid-span), where the force tilts ahead of the spin axis',
        'The driven region near the tip',
        'The stalled root region',
        'None — the rotor slows continuously',
      ], answer: 0,
      explain: 'In the mid-span driving region the upward flow tilts the total aerodynamic force ahead of the rotation axis, giving a forward (accelerating) component that replaces engine torque. The driven tip region brakes; the root is stalled.',
    },
  },
  {
    id: 'performance', stage: 'Advanced', title: 'Power Required & Performance',
    subtitle: 'The power curve, translational lift, range & endurance',
    widget: 'wPerformance',
    body: `
      <p>Total power required is the sum of four parts, and each behaves
      differently with speed:</p>
      <ul>
        <li><b>P<sub>i</sub> — induced power</b> (making lift): huge in the hover,
            <b>falls</b> rapidly as you accelerate, because forward flight supplies
            fresh air to the disc (less induced velocity needed).</li>
        <li><b>P<sub>p</sub> — profile power</b> (blade drag): roughly constant,
            rising slowly with speed.</li>
        <li><b>P<sub>par</sub> — parasite power</b> (fuselage drag): tiny at low
            speed, grows with <b>V³</b> and dominates at high speed.</li>
        <li><b>P<sub>c</sub> — climb power</b>: zero in level flight.</li>
      </ul>
      <p>Add them up and you get the famous <b>"power bucket"</b>. Two speeds fall
      straight out of it:</p>
      <ul>
        <li><b>Best endurance / min-power speed</b>: the bottom of the bucket
            (least fuel per hour, best rate of climb, min descent in autorotation).</li>
        <li><b>Best range speed</b>: where a line from the origin is tangent to the
            curve (least fuel per mile).</li>
      </ul>
      <p>The steep fall of P<sub>i</sub> at 15–25 kt is <b>effective translational
      lift (ETL)</b> — the helicopter "gets light on the controls" as it flies into
      undisturbed air. Adjust weight and altitude and watch the whole curve and its
      speeds shift.</p>`,
    takeaways: [
      'P_total = P_i + P_p + P_par + P_c; induced falls, parasite (V³) rises.',
      'Min-power speed = best endurance/climb; tangent from origin = best range.',
      'The induced-power drop at 15–25 kt is translational lift (ETL).',
    ],
    check: {
      q: 'Best-range speed is found on the power curve by…',
      options: [
        'The point where a straight line from the origin is tangent to the curve',
        'The lowest point of the curve',
        'The highest speed shown',
        'Where induced and parasite power are equal',
      ], answer: 0,
      explain: 'Range is about fuel per distance — minimising power/speed (P/V). Geometrically that is the tangent from the origin. The lowest point of the curve (min power) is best endurance, not best range.',
    },
  },
  {
    id: 'betdiagram', stage: 'Advanced', title: 'The BET Diagram',
    subtitle: 'Putting it together — the exam drawing',
    widget: 'wBetDiagram',
    body: `
      <p>Everything you've learned now lives in one diagram — the one you must draw
      by hand on the ATPL(H) exam. For a chosen blade element it shows the full
      <b>velocity triangle</b> and the <b>force triangle</b> built on it:</p>
      <ul>
        <li><b>Velocities:</b> v<sub>rot</sub> (= Ω·r along the rotor plane),
            v<sub>i</sub> (induced, down), any climb/descent flow, and their
            resultant <b>v<sub>rel</sub></b>.</li>
        <li><b>Angles:</b> θ from plane to chord, φ (= α<sub>i</sub>) from plane to
            v<sub>rel</sub>, and α between chord and v<sub>rel</sub>.</li>
        <li><b>Forces:</b> lift F<sub>L</sub> ⟂ v<sub>rel</sub>, drag F<sub>D</sub>
            ∥ v<sub>rel</sub>, their resultant <b>TAF</b>, resolved into a vertical
            part (thrust) and a horizontal part F<sub>H</sub>.</li>
      </ul>
      <p>The direction of <b>F<sub>H</sub></b> tells the whole story: pointing back
      = the element brakes the rotor (driven / powered flight), pointing forward =
      it drives the rotor (autorotation driving region). Pick a flight case and
      blade position and study how the triangle changes — then practise drawing it
      yourself by hand.</p>`,
    takeaways: [
      'The BET diagram = velocity triangle (v_rot, v_i, v_rel) + force triangle (L, D, TAF).',
      'φ = α_i; α = θ − φ; TAF resolves into thrust (vertical) and F_H (horizontal).',
      'F_H direction reveals driving vs driven — the key to autorotation.',
    ],
    check: {
      q: 'On a blade element, the horizontal component of the total aerodynamic force (F_H) points forward (in the direction of rotation). What does this mean?',
      options: [
        'The element is driving the rotor — the autorotation driving region',
        'The element is braking the rotor',
        'The element is stalled',
        'The blade is in the hover',
      ], answer: 0,
      explain: 'If F_H points in the direction of rotation it adds torque that accelerates the rotor — the driving region of autorotation. Pointing backward means it absorbs torque (driven / powered flight). This sign is exactly what examiners look for.',
    },
  },
];

/* group order for the sidebar */
const HL_STAGES = ['Basics', 'Hover & Vertical', 'Forward Flight', 'Safety & Limits', 'Advanced'];
