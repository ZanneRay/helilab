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
    subtitle: 'Where lift is actually born — pitch angle θ, inflow angle φ, and angle of attack α',
    widget: 'wBladeElement',
    body: `
      <p><b>Blade Element Theory (BET)</b> says: to understand the whole rotor,
      look at one thin slice of one blade and add up all the slices. This single
      slice is the heart of everything you will draw on your exam.</p>

      <p>Build the picture one step at a time:</p>
      <ol>
        <li><b>Step 1 — tangential velocity v<sub>rot</sub>:</b> the blade sweeps
            through the air. The dominant velocity at the element is tangential —
            perpendicular to the blade span, parallel to the rotor plane.</li>
        <li><b>Step 2 — induced inflow v<sub>i</sub>:</b> the rotor is pulling air
            downward. This adds a perpendicular (axial) component to the velocity
            seen by the blade.</li>
        <li><b>Step 3 — resultant relative airflow:</b> combine v<sub>rot</sub> and
            v<sub>i</sub> vectorially. The blade does not see purely tangential flow;
            it sees a resultant that is angled slightly downward from the rotor
            plane.</li>
        <li><b>Step 4 — three distinct angles:</b> now you can place θ, φ, and α
            precisely on the diagram.</li>
      </ol>

      <p>The three angles, each defined once:</p>
      <ul>
        <li><b>Pitch angle θ</b> — the angle between the blade chord and the rotor
            plane. You set this with the collective (or cyclic). It is a
            <em>mechanical</em> setting, independent of airflow.</li>
        <li><b>Inflow angle φ</b> (phi) — the angle between the resultant relative
            airflow and the rotor plane. It exists because v<sub>i</sub> tilts the
            flow downward. φ = arctan(v<sub>i</sub> / v<sub>rot</sub>).</li>
        <li><b>Angle of attack α</b> — the angle between the chord and the
            resultant relative airflow. This is the angle the blade
            <em>aerodynamically feels</em>: <b>α = θ − φ</b>. Lift and drag depend
            on α, not on θ.</li>
      </ul>

      <p class="hl-note"><b>Common student confusion — read this carefully:</b><br>
      <b>Pitch angle θ is NOT angle of attack α.</b> They are equal only in the
      unrealistic case of zero inflow (v<sub>i</sub> = 0). In every real rotor
      there is induced inflow, so φ &gt; 0, and therefore α &lt; θ.<br>
      <b>Inflow increases φ, which reduces α even when θ is held constant.</b>
      You set θ with your controls; the airflow environment determines φ; the
      blade responds to α.</p>

      <p>Drag the sliders to raise θ and watch α and lift grow — until α reaches
      the stall angle and lift collapses. Notice that increasing the inflow
      (raising v<sub>i</sub>) reduces α for the same θ, demonstrating why induced
      velocity limits how much thrust a given pitch setting can produce.</p>`,
    takeaways: [
      'α = θ − φ: you command pitch angle θ, the induced inflow sets inflow angle φ, and the blade feels angle of attack α — these are three separate quantities.',
      'Lift depends on α, not θ. More inflow (larger φ) reduces α and therefore reduces lift, even if you have not touched the collective.',
      'One blade element, repeated spanwise and azimuthally around the disc, is the whole rotor — mastering this slice means mastering everything.',
    ],
    check: {
      q: 'You raise collective (θ) but the induced velocity also increases. Why does lift rise less than you might expect?',
      options: [
        'Because more inflow means a larger φ, so α = θ − φ rises less than θ did',
        'Because the blade slows down',
        'Because drag becomes lift',
        'Because θ has no effect on α',
      ], answer: 0,
      explain: 'More thrust pulls more air down → bigger induced velocity → bigger φ. Since α = θ − φ, part of your extra pitch is offset by the extra inflow. This self-limiting behaviour is why rotors are stable in thrust.',
    },
    bridge: 'Next — <b>Hover &amp; Induced Flow</b> shows how induced velocity v<sub>i</sub> and inflow ratio λ are calculated from first principles, putting numbers on φ and completing the hover picture.',
  },
  {
    id: 'm1-04', stage: 'Basics', title: 'M1-04 — Build a Blade Element',
    subtitle: 'Guided construction — fixed scenario, predict first, then reveal',
    widget: 'wM104BladeElement',
    wide: true,
    body: `
      <p>This mission is a <b>guided construction</b> exercise built around one fixed
      blade-element scenario. You will unlock the picture in order: reference frame,
      velocity triangle, blade geometry, local forces, and finally the resolved local components.</p>

      <p>Build the diagram from the geometry. Each gate asks you to construct or commit a
      prediction before the app reveals the next state, so you use <b>V<sub>rel</sub></b>,
      <b>φ</b>, <b>α = θ − φ</b>, and the force directions as one causal chain.</p>

      <ol>
        <li><b>Reference state:</b> start from the rotor plane and one blade station with known Ω, r, v<sub>i</sub>, and θ.</li>
        <li><b>Gate 1:</b> construct V<sub>rel</sub> directly in the diagram, then reveal V<sub>rel</sub> and φ.</li>
        <li><b>Gate 2:</b> determine α from the geometry first, then reveal the shortcut relation.</li>
        <li><b>Gate 3:</b> resolve the local force into its thrust-producing normal component and F<sub>H</sub>, then decide what that blade element does to the rotor.</li>
      </ol>

      <p class="hl-note">What does this blade element do to the rotor? First solve the local force. Then connect it to the rotor.</p>`,
    takeaways: [
      'This mission uses one fixed canonical blade-element case, so progress depends on prediction and construction rather than slider searching.',
      'V_rel, φ, α, F_L, F_D, TAF, the local normal component, and F_H are revealed in a strict causal order.',
      'The local normal component contributes to rotor thrust, while F_H remains a local in-plane braking force — do not confuse either with the whole-rotor result.',
    ],
    check: {
      q: 'Why does M1-04 make you commit each prediction before it reveals the next layer?',
      options: [
        'To force geometric reasoning from the reference frame rather than letting you search for the answer',
        'Because the blade element has no induced flow in hover',
        'Because φ and α are always identical',
        'Because TAF always points straight up',
      ], answer: 0,
      explain: 'The mission is deliberately construct → commit → reveal. It is there to make you build the geometry and force chain step by step, instead of hunting for the answer by trial and error.',
    },
    bridge: 'Next — <b>Speed Along the Blade</b> takes the same blade-element picture and shows why the outboard stations do most of the lifting.',
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
    subtitle: 'Why hover costs power — the causal chain from thrust to induced velocity',
    widget: 'wHover',
    body: `
      <p><b>Start with the physics:</b> to hover, the rotor must push a column of
      air downward. By Newton's third law that downward push gives an upward
      <b>thrust</b> on the helicopter. The speed of that downward airflow at the
      disc is the <b>induced velocity v<sub>i</sub></b> — the faster the air moves,
      the more momentum (and therefore thrust) the rotor can produce.</p>
      <p><b>Causal chain — thrust → v<sub>i</sub> → λ → φ → power:</b></p>
      <ol>
        <li>More thrust needed (heavier aircraft, thinner air) → rotor must
            accelerate air faster → <b>v<sub>i</sub> rises</b>.</li>
        <li>Higher v<sub>i</sub> increases the <b>inflow ratio λ = v<sub>i</sub>/ΩR</b>
            — the normalised measure of how much downwash tilts the local
            airflow at each blade section.</li>
        <li>Larger λ raises the <b>inflow angle φ</b>, which reduces the blade's
            angle of attack α = θ − φ and wastes energy as induced drag.</li>
        <li>Power to push that air: <b>P<sub>i</sub> = T·v<sub>i</sub></b>.
            Because v<sub>i</sub> grows with T, induced power climbs faster than
            thrust — a non-linear penalty.</li>
      </ol>
      <p>Two theories must give the same answer:</p>
      <ul>
        <li><b>Momentum theory</b> (the air column):
            v<sub>i</sub> = √(T / 2ρA). Heavier (T↑) or higher (ρ↓) ⇒
            more induced velocity, more induced power.</li>
        <li><b>Blade Element Theory</b> (the blades):
            C<sub>T</sub> = (σ·c<sub>lα</sub>/6)(θ₀ − 3λ/2).
            The solver finds the λ that satisfies both simultaneously.</li>
      </ul>
      <p class="hl-note">This compact <b>1/6</b> form is just the hover case of the
      general forward-flight thrust equation the simulator solves,
      C<sub>T</sub> = (σ·c<sub>lα</sub>/4)[θ₀(2/3 + μ²) − (λ + μ·θ<sub>1s</sub>)] —
      set the advance ratio μ = 0 and (σ·c<sub>lα</sub>/4)·(2/3) becomes
      (σ·c<sub>lα</sub>/6), giving exactly (σ·c<sub>lα</sub>/6)(θ₀ − 3λ/2). Same
      physics, two forms; the numbers you see come from the full equation.</p>
      <p><b>Try it:</b> raise collective → θ₀ up → thrust up → but v<sub>i</sub>
      also rises, increasing λ and φ, trimming α back. Watch thrust, v<sub>i</sub>
      and <b>power</b> all climb together — and notice power climbs faster than
      thrust.</p>
      <p class="hl-note"><b>Why hover is expensive:</b> unlike a fixed-wing aircraft
      that can glide, a helicopter in hover must continuously pay the induced power
      bill P<sub>i</sub> = T·v<sub>i</sub> just to stay airborne. Because
      v<sub>i</sub> = √(T/2ρA) grows with both weight and altitude, hovering
      high, hot, or heavy multiplies the penalty steeply — the main reason
      helicopter performance margins shrink so fast in those conditions.</p>`,
    takeaways: [
      'Thrust → v_i: to generate more thrust the rotor accelerates air faster, raising induced velocity v_i = √(T/2ρA). High, hot, heavy all increase v_i.',
      'v_i → λ → φ → α: higher induced velocity raises inflow ratio λ = v_i/ΩR, which increases inflow angle φ and reduces blade angle of attack α — the rotor self-limits its own thrust response.',
      'Induced power P_i = T·v_i grows non-linearly: doubling thrust more than doubles the induced power bill, making hover the most power-intensive regime for a helicopter.',
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
    bridge: 'Next — <b>Climb, Descent &amp; VRS</b>: in axial flight the helicopter\'s vertical velocity adds to (or opposes) v<sub>i</sub>, changing the inflow through the disc. That is where the causal chain gets interesting — and where the Vortex Ring State danger lurks.',
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
        <li><b>Exam-simplified (no twist)</b> — the default. This is the simplified exam model. An untwisted blade keeps full
            pitch out to the tip, so the high-α zone sits <b>outboard on the
            retreating side and the tip stalls first</b> (≈0.9–1.0 R, ψ≈270°),
            spreading inboard as speed, weight, g or density altitude rise. This
            is the clean ATPL/POF plate and the 082 exam answer.</li>
        <li><b>Full-physics (with twist)</b> — the aircraft's real −8° washout unloads
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
      <p>Lead/lag is the blade's in-plane freedom to speed up and slow down as it
      flaps. Without it, Coriolis forces would create enormous root stresses every
      revolution. The drag hinge (or equivalent elastomeric bearing) absorbs this —
      but its behaviour directly affects rotor smoothness, ground resonance
      susceptibility, and the feel of the controls.</p>
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
      the azimuth.</p>
      <p class="hl-note"><b>What students usually confuse</b><br>
      • <b>Lead/lag ≠ flapping</b>: flapping is out-of-plane (up/down), lead/lag is
        in-plane (fore/aft rotation). They are coupled but distinct.<br>
      • <b>Lead/lag ≠ blade tracking</b>: tracking is a maintenance/rigging concept,
        not a dynamic response.<br>
      • <b>Coriolis effect here is not the weather Coriolis</b>: it is the
        conservation-of-angular-momentum effect as blade CoM moves closer/farther
        from the hub during flapping.</p>`,
    takeaways: [
      'Coriolis: flap up → mass moves in → blade leads; flap down → mass out → lags.',
      'It is conservation of angular momentum (the ice-skater), accel ∝ 2·Ω·β·β̇.',
      'Articulated rotors use a lead–lag hinge + damper; teetering rotors use underslinging.',
      'Lead/lag dampers prevent ground resonance by absorbing in-plane oscillation energy — a fully articulated rotor without functioning dampers is a ground-resonance risk.',
      'Semi-rigid and hingeless rotors handle lead/lag through blade flexibility — the physics is the same, the hardware is different.',
      'In the cockpit: lead/lag is invisible during normal flight but becomes relevant during run-up checks and any abnormal vibration diagnosis.',
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

  {
    id: 'flaproll', stage: 'Forward Flight', title: 'Flapback & Inflow Roll',
    subtitle: 'Longitudinal flapback and the fore-aft inflow-roll (transverse-flow effect) in forward flight',
    widget: 'wFlappingRoll',
    body: `
      <p>Three related phenomena shape how the rotor behaves in forward flight —
      but they are <em>different mechanisms</em> that are easy to confuse:</p>

      <h3 style="margin:0.7em 0 0.2em">1. Dissymmetry of lift</h3>
      <p>The advancing blade moves through the air faster than the retreating blade
      (Lesson 7). Left uncorrected this would roll the helicopter. Flapping solves it
      automatically (Lesson 8).</p>

      <h3 style="margin:0.7em 0 0.2em">2. Flapback — the 90° phase lag</h3>
      <p>In forward flight the advancing blade (ψ = 90°) sees the highest relative
      velocity and wants to produce the most lift. But the flapping response of an
      articulated rotor <strong>lags the forcing by ~90°</strong> (conservation of
      angular momentum — the same mechanism as a gyroscope precessing). So the peak
      up-flap occurs at ψ ≈ 180° (the nose), not at ψ = 90°. The disc tilts
      <strong>backward</strong> (nose up) — this is <em>flapback</em>, or the
      longitudinal flapping coefficient a₁.</p>
      <p>The pilot (or AFCS) counters it with forward cyclic (B₁/θ₁ₛ). The interactive
      shows the disc coloured by aerodynamic forcing and a line chart with L(ψ) and
      β(ψ) on the same axis — the orange peak (max force) and the cyan peak (max flap)
      are ~90° apart.</p>
      <p><em>Real articulated rotors with hinge offset lag a little less (~75–85°).
      Hingeless/bearingless rotors can be quite different. This widget uses a
      quasi-steady BET model.</em></p>

      <h3 style="margin:0.7em 0 0.2em">3. Inflow Roll — the Transverse Flow Effect</h3>
      <p>During the hover-to-forward-flight transition the rotor's own induced velocity
      (downwash) becomes <strong>fore-aft asymmetric</strong>. The mechanism is
      straightforward:</p>
      <ul>
        <li><b>Front disc (near ψ = 180°, nose):</b> as the helicopter accelerates,
        this part of the disc progressively encounters <em>cleaner, less-downwashed
        air</em> — the wake is being swept backward and has not yet re-entered the front.
        Local induced velocity is <strong>smaller</strong>.</li>
        <li><b>Aft disc (near ψ = 0°, tail):</b> this part of the disc remains more
        immersed in the rotor's own downwash. Local induced velocity is
        <strong>larger</strong>.</li>
      </ul>
      <p>The causal chain that leads to a roll follows from the velocity triangle at each
      station:</p>
      <ol>
        <li><b>Different induced velocity</b> at front vs aft → <b>different normal velocity
        U_P</b> in the blade's local velocity triangle.</li>
        <li>Different U_P → <b>different inflow angle φ</b> (φ = arctan U_P / U_T).</li>
        <li>Different φ, same collective pitch θ → <b>different effective angle of
        attack α</b> (α = θ − φ).</li>
        <li>Different α → <b>different lift</b>: more lift over the front half, less
        over the rear half.</li>
        <li>Blade flapping responds to this azimuthal lift asymmetry with the same ~90°
        phase lag as flapback. For a CCW rotor (H145 convention: ψ = 90° advancing),
        peak forcing near the front (ψ ≈ 180°) produces peak up-flap ~90° later, near
        the <strong>retreating side (ψ ≈ 270°)</strong>.</li>
        <li>This tilts the disc toward the retreating side → <strong>roll tendency</strong>
        that the pilot counters with <em>lateral cyclic</em>.</li>
      </ol>
      <p>In this course the pedagogical label <em>Transverse Flow Effect</em> refers to
      this <strong>fore-aft induced-flow asymmetry</strong> and the roll it produces.
      It is <strong>not</strong> an alias for flapback (which is longitudinal).</p>
      <p>The <em>Velocity Triangles</em> section of the widget shows stations A (front)
      and B (aft) side-by-side, with sliders to vary forward speed and transition
      strength, so you can watch how the inflow difference grows and trace its effect
      on φ, α, and lift at each station.</p>

      <h4 style="margin:0.6em 0 0.2em">Advanced: additional lateral inflow asymmetry</h4>
      <p>A separate, optional scenario: a lateral wind, sideslip, or yaw rate introduces
      a <em>lateral</em> inflow gradient (λ_s in the Pitt-Peters first-harmonic model)
      — more inflow on one side of the disc (ADV or RET) than the other. This creates an
      <strong>additional roll moment</strong> that is trimmed by lateral cyclic, but it
      is a <em>different</em> input from the fore-aft asymmetry described above.
      The Inflow Roll and Compare modes let you explore both, clearly labelled.</p>
      <p><em>Model limitation: this widget uses a prescribed first-harmonic inflow
      (Pitt-Peters style) + quasi-steady flapping. It is a pedagogical tool, not a
      free-wake or fully transient rotor–body-coupled simulation.</em></p>`,
    takeaways: [
      'Flapback: the rotor disc tilts backward in forward flight because peak flapping lags peak aerodynamic forcing by ~90° (gyroscopic / angular-momentum effect).',
      'Transverse Flow Effect (inflow roll): during the hover-to-forward-flight transition the front disc encounters cleaner air (less induced velocity) while the rear disc remains in downwash (more induced velocity).',
      'Causal chain: asymmetric induced velocity → different U_P → different φ → different α → different lift → flapping with ~90° phase lag → roll tendency → countered with lateral cyclic.',
      'Lateral wind, sideslip, or yaw rate add a separate lateral inflow gradient (λ_s) that can also produce a roll, but this is an additional, optional scenario — not the core definition of the Transverse Flow Effect.',
      'Dissymmetry of lift (U_T asymmetry), flapback (phase lag), and inflow roll (fore-aft λ asymmetry) are distinct mechanisms that are trimmed separately.',
    ],
    check: {
      q: 'In forward flight the advancing blade produces maximum aerodynamic lift at ψ = 90°. Where does the blade reach its maximum up-flap angle?',
      options: [
        'At ψ ≈ 180° (nose) — ~90° after the peak force (phase lag)',
        'At ψ ≈ 90° (advancing side) — same azimuth as peak force',
        'At ψ ≈ 270° (retreating side) — opposite the peak force',
        'At ψ ≈ 0° (tail) — 180° after the peak force',
      ], answer: 0,
      explain: 'The flapping response of an articulated rotor lags the aerodynamic forcing by approximately 90° — a gyroscopic effect. Peak force at ψ = 90° (ADV) produces peak up-flap at ψ ≈ 180° (FWD/nose). This tilts the disc backward (flapback a₁). The pilot corrects with forward cyclic.',
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
      <b>critical rollover angle</b> — small, typically <b>5–8° at high thrust</b>
      (higher — about 12° in this model — when collective/thrust is reduced) — recovery
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
      <h4>Recognition criteria — onset phases</h4>
      <ul>
        <li><b>Pivot point established:</b> one skid or wheel is in contact and
            acting as a fulcrum (slope ops, slope landing, wire snag, uneven
            surface).</li>
        <li><b>Roll rate onset:</b> slow, progressive roll toward the pivot —
            often feels like a normal slope correction at first.</li>
        <li><b>Control effectiveness decay:</b> as roll angle increases past
            ~5°, lateral cyclic authority decreases and collective effect
            reverses.</li>
        <li><b>Critical roll angle:</b> beyond ~8–10° (type-dependent) recovery
            is no longer possible with flight controls alone.</li>
      </ul>
      <p class="hl-note">The instinct is to pull collective to get airborne — but
      if the pivot point is established, increasing collective increases total rotor
      thrust AND the rolling moment around the pivot. This accelerates the rollover,
      not stops it. The correct response is: <b>cyclic away from the pivot first,
      then reduce collective to unload the rotor if the roll rate is not
      arrested.</b></p>
      <h4>Contributing factors</h4>
      <ul>
        <li>Slope landings and takeoffs (most common scenario).</li>
        <li>Crosswind from the downslope side (adds lateral cyclic
            displacement).</li>
        <li>Long-line or sling load snagged on terrain.</li>
        <li>Tail rotor thrust on the ground (especially relevant for
            left-skid-low on a counter-clockwise rotor system).</li>
        <li>Inattention during slope power checks.</li>
      </ul>
      <p>Increase the bank angle in the widget and watch the restoring moment
      turn into a rolling moment past the critical angle.</p>`,
    takeaways: [
      'Dynamic rollover = rolling about a fixed pivot (skid/wheel), not the CofG.',
      'Critical angle is small (~5–8° at high thrust, larger at reduced collective); past it, tilted thrust drives the roll — divergent.',
      'Recovery: cyclic away from the pivot first to arrest roll rate, then smoothly lower collective to unload the rotor — do not rely on cyclic alone once past the critical angle.',
      'Dynamic rollover is a pivot-point problem, not a slope problem — any fixed contact point on one side can cause it.',
      'Raising collective with a pivot point established accelerates rollover — the instinctive response is the wrong response.',
      'Critical roll angle is 8–10° for most types — beyond that, flight controls cannot recover the situation.',
      'Prevention: avoid establishing a pivot point; if one side is stuck, reduce collective and reassess before attempting lift-off.',
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
      <p>LTE (Loss of Tail Rotor Effectiveness) is not a specific wind direction —
      it is a condition where the tail rotor can no longer produce enough thrust to
      maintain yaw control. Three distinct aerodynamic mechanisms can trigger it,
      each associated with a different relative wind sector. Understanding
      <em>why</em> each mechanism reduces tail rotor thrust is more important than
      memorising the sectors.</p>

      <h4>Mechanism 1 — Tail Rotor Vortex Ring State (wind from ≈210°–330°)</h4>
      <p>Wind from the left-rear quadrant opposes and then recirculates tail rotor
      downwash. The tail rotor enters its own vortex ring — thrust becomes erratic
      and reduced. This is the most insidious form: it can occur even with
      apparently adequate pedal input already applied.</p>

      <h4>Mechanism 2 — Main Rotor Disc Vortex Interference (wind from ≈285°–315°)</h4>
      <p>Main rotor tip vortices are swept directly across the tail rotor disc.
      This disrupts inflow and reduces the effective angle of attack on tail rotor
      blades, causing a thrust loss. This sector overlaps mechanism 1, making the
      worst-case combination particularly dangerous.</p>

      <h4>Mechanism 3 — Weathercock Instability (wind from ≈120°–240°)</h4>
      <p>A tailwind component reduces tail rotor inflow velocity, which reduces
      thrust. Simultaneously the fuselage weathercocks into the wind, generating a
      yaw rate that develops faster than pedal input can correct. This is more of a
      handling quality degradation than a sudden thrust loss, but it can escalate
      rapidly at high power.</p>

      <p class="hl-note">LTE risk increases with: <b>low airspeed</b> (below ETL),
      <b>high power setting</b> (high torque = high tail rotor demand), <b>high
      density altitude</b> (reduced tail rotor thrust available), and <b>right yaw
      inputs</b> (for CCW main rotor systems) that increase load on the tail rotor.
      No single wind direction is dangerous — it is the combination of conditions.</p>

      <p><b>Recovery:</b> increase airspeed — translational lift restores tail rotor
      inflow effectiveness. Apply full anti-torque pedal and lower collective to
      reduce torque demand. Rotate the wind arrow in the widget and observe how
      each sector degrades the tail-rotor margin.</p>`,
    takeaways: [
      'LTE has three distinct mechanisms — vortex ring state, disc vortex interference, and weathercock instability — each in a different wind sector.',
      'The dangerous combination is low IAS + high power + critical wind sector + high DA. Any one factor alone is manageable; together they are not.',
      'Recovery: increase airspeed (pedal to the stop is secondary) — translational lift restores tail rotor inflow effectiveness.',
      'LTE is preventable: avoid slow, high-power, low-altitude manoeuvres in wind conditions that put you in a critical sector.',
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

      <h4>Stall region — inboard root <em>(Stall region — RPM decay risk)</em></h4>
      <p>At the root, rotational velocity U<sub>T</sub> is very low, so angle of
      attack α climbs above the stall angle. Lift collapses and drag spikes — the
      root contributes almost pure drag and, at low Nr or excessive collective, the
      stall region expands outward, threatening rotor RPM recovery.</p>

      <h4>Driving region — mid-span <em>(Driving region — sustains rotation)</em></h4>
      <p>At mid-span the upward airflow tilts the total aerodynamic force
      <i>forward</i> of the shaft. The in-plane component F_H points <b>with
      rotation</b> — this is the sole energy source in autorotation, replacing lost
      engine torque and keeping the rotor spinning.</p>

      <h4>Driven region — outboard tip <em>(Drag region — consumes energy)</em></h4>
      <p>Near the tip, high rotational velocity means the inflow angle φ is small
      and α is positive but moderate. The total aerodynamic force tilts <i>aft</i>
      of the shaft — the blade behaves like a normal lifting wing braking the rotor,
      consuming the energy the driving region produces.</p>

      <p class="hl-note">
        <b>Exam trap 1:</b> The driven region is NOT stalled — it produces lift, but
        the total force vector tilts aft, so it takes energy <em>from</em> the rotor.<br>
        <b>Exam trap 2:</b> Lowering collective in autorotation reduces θ, shifts α
        into a better range, and moves the stall region inward — this is why entry
        technique matters.<br>
        <b>Exam trap 3:</b> The goal at flare is to use stored rotor kinetic energy
        (Iω²/2) to arrest descent — collective must come in at the right moment or Nr
        decays past recovery.
      </p>`,
    takeaways: [
      'In autorotation, up-flow through the disc drives the rotor — no engine.',
      'Span splits into stall (root), driving (mid), driven (tip) regions.',
      'Collective moves the driving/driven boundary to control RRPM; flare trades energy for thrust.',
      'Three regions always coexist during autorotation: stall (root), driving (mid), driven (tip).',
      'Rotor RPM is the energy store — every second of autorotation trades altitude for Nr. Manage Nr, manage the landing.',
      'Collective up too early = stall region expands outward = Nr decay = unrecoverable. Timing is everything.',
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
