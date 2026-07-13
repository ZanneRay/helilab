/* ===========================================================================
   helilab_widgets.js — interactive lesson widgets
   ===========================================================================
   Each widget is HLW.wXxx(host) and builds its own canvas + controls + readout
   inside `host`, then renders. Widgets use HL (physics, from helilab_core.js +
   flapping.js) and HLD (canvas primitives, from helilab_draw.js).

   A small scaffold/control toolkit at the top keeps every widget short.
   =========================================================================== */
'use strict';

const HLW = (function () {

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* ── tiny DOM helpers ──────────────────────────────────────────────────── */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* standard widget scaffold: stage canvas + side controls/readout.
     returns { canvas, controls, readout, onDraw(fn) } and wires a ResizeObserver.
     opts.topStage: if set, inserts a SECOND full-width canvas ABOVE the main one
     (its CSS class = opts.topStage, e.g. 'hl-w-stage hl-w-stage-map'); returned as
     `topCanvas`. Used by the BET widget to give the rotor-map its own wide strip
     stacked over the vector triangle instead of cramming it into one canvas. */
  function scaffold(host, opts) {
    opts = opts || {};
    host.innerHTML = '';
    const wrap = el('div', 'hl-w');

    // optional TOP stage (own canvas), full width, stacked above the main stage
    let topCanvas = null, topStage = null;
    if (opts.topStage) {
      topStage = el('div', opts.topStage);
      topCanvas = el('canvas');
      topCanvas.setAttribute('role', 'img');
      topCanvas.setAttribute('aria-label', 'Rotor map — click a cell to pick azimuth and blade station');
      topStage.appendChild(topCanvas);
      wrap.appendChild(topStage);
    }

    const stage = el('div', opts.mainStage || 'hl-w-stage');
    const canvas = el('canvas');
    // a11y: the canvas is a decorative diagram; the live text readout beside it
    // carries the actual values, so mark the canvas as an image and point
    // screen readers to the readout via aria-describedby.
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Diagram — see the values listed beside it');
    stage.appendChild(canvas);
    const side = el('div', 'hl-w-side');
    const controls = el('div', 'hl-w-controls');
    const readout = el('div', 'hl-w-readout');
    // a11y: announce readout updates politely as the user drags controls
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    side.appendChild(controls); side.appendChild(readout);
    wrap.appendChild(stage); wrap.appendChild(side);
    host.appendChild(wrap);

    let drawFn = null;
    const ro = new ResizeObserver(() => { if (drawFn) drawFn(); });
    ro.observe(stage);
    if (topStage) ro.observe(topStage);
    return {
      canvas, topCanvas, controls, readout,
      onDraw(fn) { drawFn = fn; requestAnimationFrame(fn); },
    };
  }

  /* slider control. opts:{label,min,max,step,val,unit,fmt,on} → returns {get,set} */
  function slider(parent, o) {
    const row = el('div', 'hl-ctl');
    const head = el('div', 'hl-ctl-head');
    const lab = el('span', 'hl-ctl-lab', o.label);
    const val = el('span', 'hl-ctl-val');
    head.appendChild(lab); head.appendChild(val);
    const inp = el('input');
    inp.type = 'range'; inp.min = o.min; inp.max = o.max; inp.step = o.step;
    inp.value = o.val;
    const fmt = o.fmt || (v => (+v).toFixed(o.step < 1 ? 1 : 0));
    // a11y: name the slider and announce its current value to screen readers
    inp.setAttribute('aria-label', o.label);
    const show = () => {
      const txt = fmt(+inp.value) + (o.unit || '');
      val.textContent = txt;
      inp.setAttribute('aria-valuetext', txt);   // spoken value (e.g. "80 kt")
    };
    inp.addEventListener('input', () => { show(); o.on(+inp.value); });
    row.appendChild(head); row.appendChild(inp); parent.appendChild(row);
    show();
    return { get: () => +inp.value, set: v => { inp.value = v; show(); } };
  }

  /* toggle (checkbox styled as switch). opts:{label,val,on} */
  function toggle(parent, o) {
    const row = el('div', 'hl-ctl hl-ctl-toggle');
    const lab = el('span', 'hl-ctl-lab', o.label);
    const sw = el('label', 'hl-switch');
    const inp = el('input'); inp.type = 'checkbox'; inp.checked = !!o.val;
    inp.setAttribute('aria-label', o.label);   // a11y: name the switch
    const slid = el('span', 'hl-switch-slider');
    sw.appendChild(inp); sw.appendChild(slid);
    inp.addEventListener('change', () => o.on(inp.checked));
    row.appendChild(lab); row.appendChild(sw); parent.appendChild(row);
    return { get: () => inp.checked, set: v => { inp.checked = v; } };
  }

  /* segmented button group. opts:{label,options:[{v,t}],val,on} */
  function segmented(parent, o) {
    const row = el('div', 'hl-ctl');
    if (o.label) row.appendChild(el('div', 'hl-ctl-lab', o.label));
    const grp = el('div', 'hl-seg');
    // a11y: expose as a radiogroup so arrow keys / SR announce the choice
    grp.setAttribute('role', 'radiogroup');
    if (o.label) grp.setAttribute('aria-label', o.label);
    let cur = o.val;
    o.options.forEach(opt => {
      const b = el('button', 'hl-seg-btn' + (opt.v === cur ? ' on' : ''), opt.t);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', opt.v === cur ? 'true' : 'false');
      b.addEventListener('click', () => {
        cur = opt.v;
        grp.querySelectorAll('.hl-seg-btn').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-checked', 'true'); o.on(opt.v);
      });
      grp.appendChild(b);
    });
    row.appendChild(grp); parent.appendChild(row);
    return { get: () => cur };
  }

  /* readout key/value rows */
  function kv(pairs) {
    return pairs.map(p =>
      `<div class="hl-kv"><span>${p[0]}</span><b style="color:${p[2] || 'var(--hl-ink)'}">${p[1]}</b></div>`
    ).join('');
  }

  /* explain why the 3-D view didn't load (most often: opened via file://) */
  function noThreeHTML() {
    const fileProto = location.protocol === 'file:';
    if (typeof window.HL3D === 'undefined') {
      return '<div class="hl-sb-3d-fallback"><div>' +
        '<b>3-D view needs a local web server</b><br>' +
        (fileProto
          ? 'This page was opened directly from disk (file://). Browsers block the ES-module 3-D engine from file paths. Serve the folder instead:'
          : 'The Three.js module did not load — try a hard refresh (Ctrl/Cmd+Shift+R), or serve the folder:') +
        '<br><code>npx serve</code> &nbsp;or&nbsp; <code>python -m http.server</code><br>' +
        'then open the shown <b>http://</b> address. (The 2-D panels work either way.)' +
        '</div></div>';
    }
    return '<div class="hl-sb-3d-fallback">3-D view could not start — WebGL may be disabled. See the browser console.</div>';
  }

  /* value→colour ramps */
  function ramp(t) {            // 0..1 → blue→cyan→green→yellow→red
    t = Math.max(0, Math.min(1, t));
    const stops = [[0.0, [40, 90, 200]], [0.3, [40, 190, 200]], [0.55, [60, 200, 90]],
                   [0.8, [240, 200, 50]], [1.0, [235, 70, 50]]];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i];
        const f = (t - a) / (b - a);
        return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(',')})`;
      }
    }
    return 'rgb(235,70,50)';
  }
  function aoaColor(aoaDeg, stallDeg) {   // green ok → amber high → red stall
    if (aoaDeg >= stallDeg) return 'rgb(235,70,50)';
    if (aoaDeg >= stallDeg - 3) return 'rgb(240,190,60)';
    if (aoaDeg < 0) return 'rgb(90,130,210)';
    const t = aoaDeg / stallDeg;
    return `rgb(${Math.round(60 + 150 * t)},${Math.round(200 - 20 * t)},${Math.round(120 - 60 * t)})`;
  }

  /* Airload confidence 0..1 for a blade element from its tangential speed U_T
     and the advance ratio μ. A rotor element only carries meaningful load where
     the dynamic pressure q ∝ U_T² is real. Right at the reverse-flow boundary
     U_T → 0, so α can be geometrically huge yet aerodynamically irrelevant. */
  function airloadConf(UT, mu) {
    const qShare = Math.min(1, Math.pow(Math.max(0, UT) / (0.55 * (1 + mu)), 2));
    const Q_MIN = 0.25;                       // real dynamic-pressure floor
    return { qShare, Q_MIN, conf: Math.min(1, qShare / Q_MIN) };
  }

  /* Fade an "rgb(r,g,b)" fill toward the disc-neutral tone by an airload
     confidence (1 = full colour, 0 = washed-out grey). Used so low-q inboard
     cells never read as a saturated red "stall" in ANY plot mode. */
  function fadeToNeutral(rgbStr, conf) {
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgbStr);
    if (!m) return rgbStr;
    const bg = [70, 82, 96];                  // neutral slate the disc sits on
    const k = Math.max(0, Math.min(1, conf));
    const r = Math.round(bg[0] + (+m[1] - bg[0]) * k);
    const g = Math.round(bg[1] + (+m[2] - bg[1]) * k);
    const b = Math.round(bg[2] + (+m[3] - bg[2]) * k);
    return `rgb(${r},${g},${b})`;
  }

  /* apply forward-flight trim cyclic to a state (level disc) */
  function trimmed(st) {
    const t = computeTrimCyclic(st);
    return { ...st, theta1s: t.t1s_deg, theta1c: t.t1c_deg };
  }

  /* Local angle of attack with a selectable model.

     model 'real' — the physically-complete BET: real −8° washout twist, full
       trim cyclic (θ₁c AND θ₁s), Drees linear inflow (longitudinal κ AND
       lateral k_y = −2μ, Leishman "Principles" §3.5.2), coning/flapping term in
       U_P, atan2 inflow angle. This is the honest picture. Because the lateral
       inflow raises the induced angle on the retreating side and the washout
       unloads the tip, the α peak sits INBOARD (≈0.7 R) and a little BEFORE
       ψ=270° (≈235–240°) — exactly what measurements show.

     model 'exam' — the CLEAN ATPL(H)/POF textbook plate. This is a deliberate,
       well-known didactic SIMPLIFICATION (not a fake overlay): we drop exactly
       the three effects the classic exam derivation itself ignores, so the
       high-α region lands unambiguously at the RETREATING TIP (ψ=270°, r→1):
         1. twist = 0        → untwisted blade keeps full pitch to the tip
                               (tip is the first to stall, radially).
         2. θ₁c = 0          → no lateral cyclic, so blade pitch peaks exactly
                               at ψ=270° (θ = θ₀ + θ₁s·sinψ, θ₁s<0).
         3. uniform inflow   → φ referenced to the rotational speed only
                               (φ = atan2(λ₀, r̄), azimuth-independent). The
                               real disc's lateral inflow gradient — the thing
                               that pulls the peak forward to ≈235° — is exactly
                               the term the textbook plate omits.
       Result: α = θ(ψ) − φ(r̄) follows the pitch → symmetric peak at ψ=270°,
       and the tip has the smallest φ → highest α → "tip stalls first". Verified
       peak at r=0.97, ψ=270° for every speed 40–150 kt.

     NOTE on honesty: U_T is ALWAYS the true rBar + μ·sinψ in both modes, so the
       reverse-flow guard and the dynamic-pressure (qShare) gating stay physical
       and identical. Only the INDUCED angle φ and the pitch inputs (twist, θ₁c)
       are simplified in exam mode — the recognised textbook assumptions. */
  function localAoAmodel(st, c, rBar, psi, model) {
    if (model !== 'exam') return localAoA(st, c, rBar, psi);

    // Clean exam plate: untwisted blade, no lateral cyclic, uniform inflow.
    const st0 = trimmed({ ...st, twist: 0 });
    st0.theta1c = 0;                       // kill lateral cyclic → pitch peaks at ψ=270°
    const mu   = advanceRatio(st0);
    const lam0 = inflowRatio(st0);         // mean (uniform) inflow ratio
    const UT    = rBar + mu * Math.sin(psi);   // TRUE tangential speed (unchanged)
    const theta = bladePitch(st0, rBar, psi);  // θ₀ + θ₁s·sinψ (θ₁c=0, twist=0)
    // Uniform-inflow induced angle, referenced to the rotational speed r̄ so it
    // does NOT swing with azimuth — the classic small-disc-loading assumption.
    const phi = Math.atan2(lam0, rBar);
    return {
      aoa: theta - phi,
      phi,
      theta,
      UT,
      UP: lam0,
      reverseFlow: UT < 0,
    };
  }

  /* =========================================================================
     WIDGETS
     ========================================================================= */

  /* 1 — Big picture: side-view helicopter — collective (real T/W), cyclic, pedals */
  function wBigPicture(host) {
    const ui = scaffold(host);
    let coll = 52, cyc = 0, pedal = 0;   // collective %, cyclic ±, pedal ± (left/right)
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 32);
      const cx = W * 0.5, cy = H * 0.62;
      // real thrust/weight: map collective 0..100 % → blade pitch θ₀ 4..15°
      const st = HL.defaultState(); st.theta0 = 4 + (coll / 100) * 11;
      const tw = HL.axialSolve(st, 0).thrust / HL.weightN(st);   // thrust / weight
      // CCW main rotor (EC135/H145): torque reaction is CW → nose-right tendency,
      // held off with LEFT pedal (more tail-rotor thrust). So RIGHT pedal REDUCES
      // tail-rotor thrust and the residual torque yaws the nose right.
      const torqueMag = 0.5 + (coll / 100) * 1.1;
      const trThrust  = torqueMag * (1 - pedal / 110);          // right pedal → less TR thrust
      const netYaw    = torqueMag - trThrust;                   // >0 nose-right (right pedal)

      // fuselage — nose to the RIGHT (= forward); tail boom + fin to the LEFT (aft)
      ctx.fillStyle = col.dim; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(cx, cy, 46, 22, 0, 0, 2 * Math.PI); ctx.fill();   // cabin
      ctx.fillRect(cx - 92, cy - 6, 92, 10);                  // tail boom (left)
      ctx.beginPath(); ctx.ellipse(cx - 96, cy - 1, 8, 16, 0, 0, 2 * Math.PI); ctx.fill();  // tail fin
      ctx.globalAlpha = 1;
      HLD.text(ctx, 'nose ▸', cx + 18, cy + 36, col.dim, '9px IBM Plex Sans');
      // mast + disc
      const mastTop = cy - 52;
      HLD.dline(ctx, cx, cy - 18, cx, mastTop, col.dim, 3, [1, 0]);
      const tilt = (cyc / 100) * 14 * D2R;
      const dR = Math.min(92, W * 0.19);
      const dx = dR * Math.cos(tilt), dy = dR * Math.sin(tilt);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      // forward (right) edge drops for forward cyclic, so thrust stays ⟂ to the disc
      ctx.beginPath(); ctx.moveTo(cx - dx, mastTop - dy); ctx.lineTo(cx + dx, mastTop + dy); ctx.stroke();
      ctx.lineCap = 'butt';
      HLD.dot(ctx, cx, mastTop, 4, col.accent);
      // thrust ⟂ disc, length ∝ T/W so it visually compares with the weight arrow
      const WL = 46;                                       // weight arrow length (= W)
      const tLen = Math.max(12, Math.min(tw, 1.6) * WL);
      const tnx = Math.sin(tilt), tny = -Math.cos(tilt);
      HLD.arrow(ctx, cx, mastTop, cx + tnx * tLen, mastTop + tny * tLen, tw >= 1 ? col.lift : col.warn, 4, 12);
      HLD.text(ctx, 'Thrust', cx + tnx * tLen + 6, mastTop + tny * tLen, tw >= 1 ? col.lift : col.warn, 'bold 12px IBM Plex Sans');
      // weight (fixed reference)
      HLD.arrow(ctx, cx, cy + 6, cx, cy + 6 + WL, col.drag, 3, 10);
      HLD.text(ctx, 'Weight', cx + 6, cy + 52, col.drag, '11px IBM Plex Sans');

      // ── top-view inset: torque reaction, tail-rotor anti-torque & yaw ──────
      const curvedArrow = (acx, acy, ar, a0, sweep, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = color;
        const N = 22; ctx.beginPath();
        for (let i = 0; i <= N; i++) { const a = a0 + sweep * i / N;
          const px = acx + ar * Math.cos(a), py = acy + ar * Math.sin(a);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        const aE = a0 + sweep, ex = acx + ar * Math.cos(aE), ey = acy + ar * Math.sin(aE);
        const sgn = sweep > 0 ? 1 : -1, ta = Math.atan2(Math.cos(aE) * sgn, -Math.sin(aE) * sgn);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 7 * Math.cos(ta - 0.4), ey - 7 * Math.sin(ta - 0.4));
        ctx.lineTo(ex - 7 * Math.cos(ta + 0.4), ey - 7 * Math.sin(ta + 0.4));
        ctx.closePath(); ctx.fill();
      };
      (() => {
        const ipw = Math.min(124, (cx - dR) - 16);
        if (ipw < 64) return;                        // too narrow — skip (readout still explains it)
        const iph = Math.min(104, ipw * 0.82);
        const ipx = 8, ipy = 16, ir = Math.min(30, ipw * 0.27);
        const ix = ipx + ipw * 0.58, iy = ipy + iph * 0.5;
        ctx.fillStyle = 'rgba(120,140,170,0.05)'; ctx.fillRect(ipx, ipy, ipw, iph);
        ctx.strokeStyle = 'rgba(120,140,170,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(ipx, ipy, ipw, iph);
        HLD.text(ctx, 'TOP VIEW — yaw', ipx + 2, ipy - 3, col.dim, '8px IBM Plex Sans');
        ctx.strokeStyle = 'rgba(120,140,170,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = col.dim; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(ix + 5, iy, 12, 7, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillRect(ix - ir - 6, iy - 2, ir + 8, 4); ctx.globalAlpha = 1;
        // Main rotor COUNTER-CLOCKWISE (EC135/H145) → torque reaction is CLOCKWISE
        // (nose-RIGHT tendency) → tail-rotor thrust pushes the tail to give a
        // nose-LEFT moment (anti-torque). Right pedal REDUCES that thrust → yaw right.
        curvedArrow(ix, iy, ir - 6, -0.5, -2.3, col.accent);          // rotor spin (CCW)
        HLD.text(ctx, 'rotor ↺', ix + 2, iy - ir + 1, col.accent, '8px IBM Plex Sans');
        curvedArrow(ix, iy, 15, -0.4, 2.0, col.warn);                 // fuselage torque (CW, opposite)
        // tail-rotor thrust at the tail — gives a nose-left moment (anti-torque);
        // length ∝ commanded thrust (collective trim − pedal)
        const trx = ix - ir - 4, trLen = Math.min(ir + 8, 7 + trThrust * 8);
        HLD.arrow(ctx, trx, iy, trx, iy + trLen, col.lift, 2, 6);
        HLD.text(ctx, ipw < 92 ? 'tail R' : 'tail rotor', trx + 2, iy + ir + 6, col.lift, '8px IBM Plex Sans', 'center');
        // net yaw indicator (right pedal → less tail rotor → torque yaws nose right = CW)
        if (Math.abs(netYaw) > 0.06) {
          curvedArrow(ix, iy, ir + 7, netYaw > 0 ? -0.6 : -2.5, netYaw > 0 ? 1.3 : -1.3, col.bad);
          HLD.text(ctx, netYaw > 0 ? 'yaw →' : '← yaw', ix, ipy + iph - 3, col.bad, 'bold 8px IBM Plex Sans', 'center');
        } else {
          HLD.text(ctx, 'balanced', ix, ipy + iph - 3, col.good, '8px IBM Plex Sans', 'center');
        }
      })();

      // net horizontal (thrust horizontal component)
      const horiz = tnx * tLen;
      if (Math.abs(horiz) > 4) {
        HLD.arrow(ctx, cx, cy - 70, cx + horiz * 1.4, cy - 70, col.warn, 3, 10);
        HLD.text(ctx, horiz > 0 ? 'accelerate →' : '← accelerate',
          cx + horiz * 0.7, cy - 78, col.warn, '11px IBM Plex Sans', 'center');
      }
      const vert = tw > 1.05 ? 'climb' : tw < 0.95 ? 'descend' : 'hover';
      const result = Math.abs(cyc) < 3 ? vert : (cyc > 0 ? vert + ' + accel forward' : vert + ' + decel/back');
      const yawTxt = Math.abs(netYaw) < 0.06 ? 'balanced — heading held'
        : (netYaw > 0 ? 'nose yaws right →' : '← nose yaws left');
      ui.readout.innerHTML = kv([
        ['Collective', coll.toFixed(0) + ' %  ·  T/W ' + tw.toFixed(2), tw >= 1 ? 'var(--hl-good)' : 'var(--hl-bad)'],
        ['Cyclic / disc tilt', (cyc / 100 * 14).toFixed(1) + '°', 'var(--hl-accent)'],
        ['Pedals / yaw', yawTxt, Math.abs(netYaw) < 0.06 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Result', result, 'var(--hl-warn)'],
      ]) + `<p class="hl-note">Collective sets total thrust: <b>T/W > 1 climbs, < 1
        descends</b>. Cyclic tilts the disc to accelerate. The main rotor's <b>torque</b>
        spins the fuselage the other way — the <b>tail rotor</b> cancels it.
        <b>Right pedal always yaws the nose right.</b> The EC135/H145 rotor turns
        <b>counter-clockwise</b> (from above), so its torque yaws the nose right and
        you hold <b>left pedal</b> against it — right pedal then <i>reduces</i>
        tail-rotor thrust.</p>`;
    };
    slider(ui.controls, { label: 'Collective (total thrust)', min: 0, max: 100, step: 1, val: coll, unit: ' %', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Cyclic — aft ◀ ▶ forward', min: -100, max: 100, step: 1, val: cyc, unit: '', fmt: v => v.toFixed(0), on: v => { cyc = v; draw(); } });
    slider(ui.controls, { label: 'Pedals — left ◀ ▶ right', min: -100, max: 100, step: 1, val: pedal, unit: '', fmt: v => v.toFixed(0), on: v => { pedal = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 2 — Blade element: θ, φ → α, lift/drag */
  function wBladeElement(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let theta = 8, phi = 3, linked = false;   // deg; linked: φ follows θ via momentum
    let phiCtl = null;
    // physical inflow angle at 0.75R for a given collective (hover momentum solve)
    const phiFromTheta = (th) => {
      const s = { ...st, theta0: th, V: 0, Vc: 0 };
      const lam = HL.axialSolve(s, 0).lam;
      return Math.atan2(lam, 0.75) * R2D;
    };
    const draw = () => {
      if (linked) { phi = phiFromTheta(theta); if (phiCtl) phiCtl.set(+phi.toFixed(1)); }
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const aoa = (theta - phi) * D2R;
      const stall = aoa >= st.stallAoA * D2R;
      const cl = HL.clOf(st, aoa);
      const cd = HL.cdOf(st, cl);
      const ox = W * 0.16, oy = H * 0.6, len = Math.min(W * 0.62, 300);
      HLD.bladeSection(ctx, ox, oy, len, {
        theta: theta * D2R, phi: phi * D2R, ampl: 4.0, showForces: true,
        cl, cd, aoa, stall,
      }, col);
      const aoaDeg = theta - phi;
      ui.readout.innerHTML = kv([
        ['Pitch θ', theta.toFixed(1) + '°', 'var(--hl-chord)'],
        ['Inflow φ', phi.toFixed(1) + '°' + (linked ? ' (from θ)' : ''), 'var(--hl-wind)'],
        ['AoA α = θ − φ', aoaDeg.toFixed(1) + '°', stall ? 'var(--hl-bad)' : 'var(--hl-good)'],
        ['Lift coeff C_l', stall ? 'collapsed' : cl.toFixed(2), stall ? 'var(--hl-bad)' : 'var(--hl-ink)'],
      ]) + `<p class="hl-note">${stall
        ? '⚠ Past the stall angle the flow separates and lift collapses — exactly what limits the retreating blade.'
        : linked
          ? 'Realistic mode: raising θ also raises the induced inflow φ, so α grows much more slowly than θ — the rotor self-limits its thrust.'
          : 'Lift rises with α. Now switch on “link φ to θ” to see that in reality φ grows with θ, eating into your extra pitch.'}</p>`;
    };
    slider(ui.controls, { label: 'Pitch θ (collective)', min: 0, max: 18, step: 0.5, val: theta, unit: '°', on: v => { theta = v; draw(); } });
    phiCtl = slider(ui.controls, { label: 'Induced inflow angle φ', min: 0, max: 12, step: 0.5, val: phi, unit: '°', on: v => { if (!linked) { phi = v; draw(); } } });
    toggle(ui.controls, { label: 'Link φ to θ (realistic)', val: false, on: v => { linked = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 3 — Spanwise speed & lift distribution */
  function wSpanwise(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let rMark = 0.75, twist = -8;
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      const padL = 48, padR = 16, padT = 18, padB = 34;
      const x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
      const sx = r => x0 + r * (x1 - x0);
      // build curves
      const OmR = HL.omR(st);
      const lam = 0.05;
      let maxLift = 0; const lift = [];
      const B = 0.97;                                    // Prandtl tip-loss factor
      for (let i = 0; i <= 60; i++) {
        const r = i / 60;
        const ut = r;                                   // U_T/ΩR
        const th = (st.theta0 + twist * (r - 0.75)) * D2R;
        const phi = r > 0.02 ? Math.atan2(lam, r) : Math.PI / 2;
        const a = Math.max(0, th - phi);
        const cl = HL.clOf(st, a);
        const tipLoss = r <= B ? 1 : Math.max(0, (1 - r) / (1 - B));  // → 0 at the tip
        const dL = ut * ut * cl * tipLoss;              // ∝ lift per span
        lift.push({ r, ut, dL });
        if (dL > maxLift) maxLift = dL;
      }
      // grid
      HLD.grid(ctx, W, H, col, 30);
      // speed line (linear)
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2;
      ctx.beginPath();
      lift.forEach((p, i) => { const X = sx(p.r), Y = y0 - p.ut * (y0 - y1) * 0.92; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke();
      HLD.text(ctx, 'speed U_T = Ω·r', sx(0.05), y1 + 4, col.accent, '11px IBM Plex Sans', 'left', 'top');
      // lift fill
      ctx.fillStyle = 'rgba(52,211,153,0.20)'; ctx.strokeStyle = col.lift; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx(0), y0);
      lift.forEach(p => ctx.lineTo(sx(p.r), y0 - (p.dL / maxLift) * (y0 - y1) * 0.92));
      ctx.lineTo(sx(1), y0); ctx.closePath(); ctx.fill(); ctx.stroke();
      HLD.text(ctx, 'lift per metre  ∝ U_T²·C_l', sx(0.4), y1 + 4, col.lift, '11px IBM Plex Sans', 'left', 'top');
      // axes
      HLD.text(ctx, 'root', sx(0) + 2, y0 + 6, col.dim, '10px IBM Plex Sans', 'left', 'top');
      HLD.text(ctx, 'r/R', (x0 + x1) / 2, H - 4, col.dim, '10px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, 'tip', sx(1) - 2, y0 + 6, col.dim, '10px IBM Plex Sans', 'right', 'top');
      // marker
      const mp = lift[Math.round(rMark * 60)];
      HLD.dline(ctx, sx(rMark), y0, sx(rMark), y1, col.warn, 1.5, [4, 3]);
      HLD.dot(ctx, sx(rMark), y0 - (mp.dL / maxLift) * (y0 - y1) * 0.92, 4, col.warn);
      const localSpeed = rMark * OmR;
      ui.readout.innerHTML = kv([
        ['Station r/R', rMark.toFixed(2), 'var(--hl-warn)'],
        ['Local speed', localSpeed.toFixed(0) + ' m/s', 'var(--hl-accent)'],
        ['Tip speed Ω·R', OmR.toFixed(0) + ' m/s', 'var(--hl-accent)'],
        ['Rel. lift here', (mp.dL / maxLift * 100).toFixed(0) + ' %', 'var(--hl-lift)'],
      ]) + `<p class="hl-note">Speed grows linearly to the tip; lift grows with its
        square, so the outer blade does most of the work. Washout twist (slider)
        pulls some load back inboard.</p>`;
    };
    slider(ui.controls, { label: 'Blade station r/R', min: 0.1, max: 1.0, step: 0.01, val: rMark, unit: '', fmt: v => v.toFixed(2), on: v => { rMark = v; draw(); } });
    slider(ui.controls, { label: 'Blade twist (washout)', min: -16, max: 0, step: 1, val: twist, unit: '°', on: v => { twist = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 4 — Hover: collective → thrust, v_i, power */
  function wHover(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let coll = 8, weight = 2800, alt = 0;
    const draw = () => {
      st.theta0 = coll; st.W_kg = weight; st.alt = alt;
      const sol = HL.axialSolve(st, 0);
      const W_N = HL.weightN(st);
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.5, discY = H * 0.32, dR = Math.min(W * 0.34, 150);
      // rotor disc
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - dR, discY); ctx.lineTo(cx + dR, discY); ctx.stroke();
      ctx.lineCap = 'butt';
      HLD.dot(ctx, cx, discY, 4, col.accent);
      // downwash arrows, length ∝ v_i
      const viLen = Math.min(120, 18 + sol.vi * 5);
      ctx.globalAlpha = 0.8;
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * (dR / 3.5);
        HLD.arrow(ctx, x, discY + 8, x, discY + 8 + viLen, col.wind, 2, 7);
      }
      ctx.globalAlpha = 1;
      HLD.text(ctx, 'induced flow v_i = ' + sol.vi.toFixed(1) + ' m/s',
        cx, discY + 24 + viLen, col.wind, '11px IBM Plex Sans', 'center');
      // thrust vs weight bars (right)
      const bx = W - 70, bTop = discY - 10, bH = H * 0.42;
      const tFrac = Math.min(1.4, sol.thrust / W_N);
      HLD.text(ctx, 'T / W', bx, bTop - 10, col.dim, '10px IBM Plex Sans', 'center', 'bottom');
      ctx.fillStyle = 'rgba(120,140,170,0.25)'; ctx.fillRect(bx - 16, bTop, 32, bH);
      const fillH = Math.min(bH, bH * tFrac / 1.4);
      ctx.fillStyle = tFrac >= 1 ? col.good : col.warn;
      ctx.fillRect(bx - 16, bTop + bH - fillH, 32, fillH);
      // weight line at T/W=1
      const wY = bTop + bH - bH / 1.4;
      HLD.dline(ctx, bx - 24, wY, bx + 24, wY, col.drag, 1.5, [4, 3]);
      HLD.text(ctx, 'W', bx + 26, wY, col.drag, '10px IBM Plex Sans', 'left', 'middle');
      ui.readout.innerHTML = kv([
        ['Inflow ratio λ', sol.lam.toFixed(3), 'var(--hl-wind)'],
        ['Induced vel v_i', sol.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Thrust', (sol.thrust / 1000).toFixed(1) + ' kN', 'var(--hl-lift)'],
        ['Weight', (W_N / 1000).toFixed(1) + ' kN', 'var(--hl-drag)'],
        ['T / W', tFrac.toFixed(2), tFrac >= 1 ? 'var(--hl-good)' : 'var(--hl-bad)'],
        ['Disc loading T/A', (sol.thrust / HL.area(st) / 9.80665).toFixed(1) + ' kg/m²', 'var(--hl-accent)'],
        ['Power req.', (sol.power / 1000).toFixed(0) + ' kW', 'var(--hl-ink)'],
      ]) + `<p class="hl-note">${tFrac >= 1
        ? '✔ Thrust exceeds weight — the aircraft can hover here.'
        : '✘ Thrust below weight — pull more collective, or reduce weight/altitude.'}
        Notice power climbs steeply with collective: that is induced power P_i = T·v_i.</p>`;
    };
    slider(ui.controls, { label: 'Collective θ₀', min: 2, max: 16, step: 0.5, val: coll, unit: '°', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Gross weight', min: 1800, max: 3600, step: 50, val: weight, unit: ' kg', fmt: v => v.toFixed(0), on: v => { weight = v; draw(); } });
    slider(ui.controls, { label: 'Density altitude', min: 0, max: 14000, step: 500, val: alt, unit: ' ft', fmt: v => v.toFixed(0), on: v => { alt = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 5 — Vertical flight: animated climb/descent transient + VRS
     Models the vertical dynamics  m·dV_c/dt = T(V_c) − W  at a fixed (stepped)
     collective: raise collective → T>W → accelerate up → the climb raises the
     inflow → α falls → T drops back to W → steady ROC. Reverse for descent. */
  function wVertical(host) {
    host.innerHTML = '';
    const wrap = el('div', 'hl-w');
    const stage = el('div', 'hl-w-stage'); const canvas = el('canvas'); stage.appendChild(canvas);
    const side = el('div', 'hl-w-side');
    const controls = el('div', 'hl-w-controls');
    const readout = el('div', 'hl-w-readout');
    side.appendChild(controls); side.appendChild(readout);
    wrap.appendChild(stage); wrap.appendChild(side); host.appendChild(wrap);

    const st = HL.defaultState();
    const Wt = HL.weightN(st), mass = st.W_kg;
    const solveAt = (theta, vc) => HL.axialSolve({ ...st, theta0: theta }, vc);
    // hover collective (T = W at V_c = 0)
    let lo = 2, hi = 16;
    for (let i = 0; i < 44; i++) { const mid = (lo + hi) / 2; (solveAt(mid, 0).thrust > Wt) ? hi = mid : lo = mid; }
    const thHover = (lo + hi) / 2;
    const vih = solveAt(thHover, 0).vih || 8;

    let Vc = 0, theta = thHover, phase = 'HOVER', t = 0, animating = false, raf = null, last = 0, sl = null;
    const SPEED = 2.4;          // sim time scale (animation runs ~2.4× real for watchability)
    const phVar = () => phase.indexOf('VRS') >= 0 ? 'var(--hl-bad)'
      : (phase.indexOf('STEADY') === 0 || phase === 'HOVER') ? 'var(--hl-good)'
      : phase.indexOf('ACCEL') === 0 ? 'var(--hl-warn)' : 'var(--hl-ink)';

    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const sol = solveAt(theta, Vc), T = sol.thrust, twr = T / Wt;
      const tcol = twr >= 0.99 ? col.lift : col.warn;
      const phCol = phase.indexOf('VRS') >= 0 ? col.bad
        : (phase.indexOf('STEADY') === 0 || phase === 'HOVER') ? col.good
        : phase.indexOf('ACCEL') === 0 ? col.warn : col.ink;

      // phase banner
      HLD.text(ctx, phase, W * 0.22, 15, phCol, 'bold 12px IBM Plex Sans', 'center');

      // ── left-top: helicopter with T / W / ROC vectors ──
      const hx = W * 0.22, hy = H * 0.32, dr = W * 0.12, refL = H * 0.19;
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx - dr, hy); ctx.lineTo(hx + dr, hy); ctx.stroke(); ctx.lineCap = 'butt';
      HLD.dot(ctx, hx, hy, 3, col.accent);
      ctx.fillStyle = col.dim; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(hx, hy + 20, 20, 9, 0, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
      HLD.arrow(ctx, hx, hy, hx, hy - Math.min(1.7, twr) * refL, tcol, 4, 11);
      HLD.text(ctx, 'T', hx + 6, hy - Math.min(1.7, twr) * refL + 7, tcol, 'bold 12px IBM Plex Sans');
      HLD.arrow(ctx, hx, hy + 30, hx, hy + 30 + refL, col.drag, 3, 9);
      HLD.text(ctx, 'W', hx + 6, hy + 30 + refL, col.drag, '11px IBM Plex Sans');
      if (Math.abs(Vc) > 0.15) {
        const up = Vc > 0, rl = Math.min(H * 0.2, Math.abs(Vc) * 3.5 + 6), rx = hx + dr + 24;
        HLD.arrow(ctx, rx, hy + (up ? 14 : -14), rx, hy + (up ? 14 - rl : -14 + rl), col.wind, 2.5, 8);
        HLD.text(ctx, (up ? 'ROC ' : 'ROD ') + Math.abs(Vc).toFixed(1), rx + 4, hy, col.wind, '9px IBM Plex Sans');
      }

      // ── left-bottom: blade element AoA at 0.75R ──
      // φ from the net inflow (negative in descent = up-flow → α rises).
      // Display-only clamp at [−16°, +29°]: keeps the schematic readable at the
      // V_c extremes; the readout numbers are never clamped.
      const phi = Math.max(-0.28, Math.min(0.5, Math.atan2(sol.lam, 0.75)));
      HLD.text(ctx, 'blade element (0.75R)', W * 0.04, H * 0.56, col.dim, '9px IBM Plex Sans');
      HLD.bladeSection(ctx, W * 0.07, H * 0.86, Math.min(W * 0.34, 175),
        { theta: theta * D2R, phi, ampl: 3.2, showForces: false, aoa: theta * D2R - phi, stall: false }, col);

      // ── right: T–V_c curve with W line, VRS band, moving operating point ──
      ctx.save(); ctx.translate(W * 0.45, 0);
      const cW = W * 0.55, cH = H * 0.9;
      const pts = [];
      for (let i = 0; i <= 60; i++) { const v = (-3 + 4 * i / 60) * vih; pts.push({ x: v / vih, y: solveAt(theta, v).thrust / 1000 }); }
      const ymax = Math.max(Wt / 1000, ...pts.map(p => p.y)) * 1.15;
      const ch = HLD.lineChart(ctx, cW, cH, [{ pts, color: col.accent, width: 2.2 }],
        { xmin: -3, xmax: 1, ymin: 0, ymax, xlab: 'descent ← V_c/v_h → climb', ylab: 'Thrust (kN)' }, col,
        [{ x: 0, color: col.dim, label: 'hover' }]);
      const xa = ch.sx(-1.6), xb = ch.sx(-0.25);
      ctx.fillStyle = 'rgba(248,113,113,0.13)'; ctx.fillRect(xa, ch.y1, xb - xa, ch.y0 - ch.y1);
      HLD.hatchRect(ctx, xa, ch.y1, xb - xa, ch.y0 - ch.y1, 'rgba(248,113,113,0.26)', 7);
      HLD.text(ctx, 'VRS', (xa + xb) / 2, ch.y1 + 8, col.bad, 'bold 9px IBM Plex Sans', 'center', 'top');
      const wY = ch.sy(Wt / 1000);
      HLD.dline(ctx, ch.x0, wY, ch.x1, wY, col.drag, 1.4, [5, 4]);
      HLD.text(ctx, 'W', ch.x1 - 3, wY - 4, col.drag, '9px IBM Plex Sans', 'right');
      const px = ch.sx(Math.max(-3, Math.min(1, Vc / vih))), py = ch.sy(Math.min(ymax, T / 1000));
      HLD.dline(ctx, px, ch.y0, px, py, col.ink, 1, [3, 3]);
      HLD.dot(ctx, px, py, 5, sol.vrs ? col.bad : tcol);
      ctx.restore();

      const a = (T - Wt) / mass, aoaDeg = (theta * D2R - phi) * 180 / Math.PI;
      readout.innerHTML = kv([
        ['Phase', phase, phVar()],
        ['Vertical speed', (Vc >= 0 ? '+' : '') + Vc.toFixed(1) + ' m/s  (' + (Vc / vih).toFixed(2) + ' v_h)', 'var(--hl-ink)'],
        ['Accel.', a.toFixed(2) + ' m/s²', Math.abs(a) < 0.05 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['T / W', twr.toFixed(2), twr >= 0.99 && twr <= 1.01 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Blade α (0.75R)', aoaDeg.toFixed(1) + '°', 'var(--hl-lift)'],
        ['Collective θ₀', theta.toFixed(1) + '°', 'var(--hl-chord)'],
      ]) + '<p class="hl-note">' + phaseNote() + '</p>';
    };

    const phaseNote = () => {
      if (phase.indexOf('in VRS band') >= 0) return '⚠ Transiting the <b>vortex-ring band</b> on the way down — thrust is erratic in here (the model holds an approximate value). A real descent should not linger in this band.';
      if (phase.indexOf('VRS') >= 0) return '⚠ The descent settled in the <b>vortex ring</b> band — momentum theory breaks down here and thrust gets erratic. This is exactly why a slow vertical descent is dangerous; recover with forward speed.';
      if (phase === 'ACCELERATING ↑') return 'Collective raised → <b>T &gt; W</b> → accelerating up. The growing climb raises the inflow, which trims the blade α down and pulls T back toward W.';
      if (phase === 'ACCELERATING ↓') return 'Collective lowered → <b>T &lt; W</b> → accelerating down. The descent reduces the inflow, raising α and pushing T back up toward W.';
      if (phase === 'STEADY CLIMB') return '✔ <b>T = W</b> again at a steady rate of climb. Notice α is back near its hover value — the extra collective went into beating the higher inflow, not into more AoA. That is why climbing costs collective/power.';
      if (phase === 'STEADY DESCENT') return '✔ <b>T = W</b> at a steady rate of descent, now <b>below the VRS band</b> in the clean windmill / autorotative state — the rotor had to pass <i>through</i> VRS to get here. (Engine-off autorotation lives in this regime — Lesson 10.)';
      if (phase.indexOf('manual') >= 0) return 'Manual scrub. Press <b>Climb</b> or <b>Descent entry</b> to watch the transient: T momentarily ≠ W, the aircraft accelerates, and the changing inflow trims it back to T = W.';
      return 'Hover: thrust exactly balances weight. Press <b>Climb entry</b> or <b>Descent entry</b> to see how the rotor settles into a steady rate of climb/descent.';
    };

    const loop = (now) => {
      if (!canvas.isConnected) { raf = null; return; }              // widget removed → stop
      const dt = Math.min(0.05, (now - last) / 1000) * SPEED; last = now;
      const sNow = solveAt(theta, Vc);
      const a = (sNow.thrust - Wt) / mass;
      Vc = Math.max(-3.2 * vih, Math.min(2 * vih, Vc + a * dt)); t += dt;
      if ((Math.abs(a) < 0.05 && t > 1.2) || t > 25) {
        animating = false;
        const vrs = solveAt(theta, Vc).vrs;
        phase = vrs ? '≈ VRS (erratic)' : (Vc > 0.1 ? 'STEADY CLIMB' : Vc < -0.1 ? 'STEADY DESCENT' : 'HOVER');
        if (sl) sl.set(Math.max(-16, Math.min(8, +Vc.toFixed(1))));
        draw(); raf = null; return;
      }
      phase = a > 0 ? 'ACCELERATING ↑'
        : (sNow.vrs ? 'ACCELERATING ↓ — in VRS band' : 'ACCELERATING ↓');
      if (sl) sl.set(Math.max(-16, Math.min(8, +Vc.toFixed(1))));
      draw(); raf = requestAnimationFrame(loop);
    };
    const startAnim = (dth, label) => {
      theta = thHover + dth; Vc = 0; t = 0; animating = true; phase = label;
      if (sl) sl.set(0);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };

    const btns = el('div', 'hl-seg');
    const mkBtn = (label, fn) => { const b = el('button', 'hl-seg-btn', label); b.onclick = fn; btns.appendChild(b); };
    mkBtn('▶ Climb', () => startAnim(+2, 'ACCELERATING ↑'));
    mkBtn('▶ Descent', () => startAnim(-2, 'ACCELERATING ↓'));
    mkBtn('▶ Steep descent', () => startAnim(2 - thHover, 'ACCELERATING ↓'));
    mkBtn('↺ Hover', () => { animating = false; if (raf) { cancelAnimationFrame(raf); raf = null; } theta = thHover; Vc = 0; t = 0; phase = 'HOVER'; if (sl) sl.set(0); draw(); });
    controls.appendChild(btns);
    sl = slider(controls, { label: 'Manual vertical speed V_c', min: -16, max: 8, step: 0.5, val: 0, unit: ' m/s',
      on: v => { animating = false; if (raf) { cancelAnimationFrame(raf); raf = null; } theta = thHover; Vc = v;
        phase = Math.abs(v) < 0.15 ? 'HOVER' : (v > 0 ? 'CLIMB (manual)' : 'DESCENT (manual)'); draw(); } });

    const ro = new ResizeObserver(() => { if (!animating) draw(); }); ro.observe(stage);
    requestAnimationFrame(draw);
  }

  /* 6 — Ground effect */
  function wGroundEffect(host) {
    const ui = scaffold(host);
    let zR = 0.6;
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const ge = HL.groundEffect(zR);
      // scene: ground at bottom, heli at height ∝ zR
      const groundY = H - 26;
      ctx.fillStyle = 'rgba(120,140,170,0.25)'; ctx.fillRect(0, groundY, W, H - groundY);
      for (let x = 0; x < W; x += 14) HLD.dline(ctx, x, groundY, x - 8, H, col.dim, 1, [1, 0]);
      const cx = W * 0.42;
      const discY = groundY - (zR / 2.0) * (groundY - 30);
      const dR = Math.min(W * 0.28, 120);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - dR, discY); ctx.lineTo(cx + dR, discY); ctx.stroke();
      ctx.lineCap = 'butt'; HLD.dot(ctx, cx, discY, 4, col.accent);
      // downwash that spreads at the ground
      ctx.globalAlpha = 0.8;
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * (dR / 2.5);
        const len = (groundY - discY) * 0.7 * ge.viRatio + 6;
        HLD.arrow(ctx, x, discY + 8, x, discY + 8 + len, col.wind, 2, 6);
        // spread along ground
        HLD.arrow(ctx, cx + i * (dR / 2.5), groundY - 6, cx + i * (dR / 2.5) + Math.sign(i || 1) * 40, groundY - 6, col.wind, 1.6, 6);
      }
      ctx.globalAlpha = 1;
      // height label
      HLD.dline(ctx, cx + dR + 16, discY, cx + dR + 16, groundY, col.dim, 1, [3, 3]);
      HLD.text(ctx, 'z/R = ' + zR.toFixed(2), cx + dR + 20, (discY + groundY) / 2, col.dim, '10px IBM Plex Sans', 'left', 'middle');
      // thrust gain bar
      const bx = W - 54;
      const gain = (ge.thrustRatio - 1) * 100;
      HLD.text(ctx, '+thrust', bx, 24, col.good, '10px IBM Plex Sans', 'center');
      const bH = H * 0.4, bTop = 34;
      ctx.fillStyle = 'rgba(120,140,170,0.25)'; ctx.fillRect(bx - 14, bTop, 28, bH);
      const f = Math.min(1, gain / 30);
      ctx.fillStyle = col.good; ctx.fillRect(bx - 14, bTop + bH * (1 - f), 28, bH * f);
      HLD.text(ctx, '+' + gain.toFixed(0) + '%', bx, bTop + bH + 12, col.good, '10px IBM Plex Sans', 'center');
      ui.readout.innerHTML = kv([
        ['Height z/R', zR.toFixed(2), 'var(--hl-ink)'],
        ['v_i factor K', ge.K.toFixed(3), 'var(--hl-wind)'],
        ['v_i reduction', ((1 - ge.viRatio) * 100).toFixed(0) + ' %', 'var(--hl-wind)'],
        ['Thrust gain', '+' + gain.toFixed(0) + ' % (same power)', 'var(--hl-good)'],
      ]) + `<p class="hl-note">${zR < 0.6 ? 'Deep in ground effect: a big thrust bonus from the ground cushion.'
        : zR > 1.4 ? 'Essentially out of ground effect — the cushion is gone.'
        : 'Leaving the cushion: the benefit fades quickly above z/R ≈ 0.5.'}</p>`;
    };
    slider(ui.controls, { label: 'Rotor height z/R', min: 0.35, max: 2.0, step: 0.05, val: zR, unit: '', fmt: v => v.toFixed(2), on: v => { zR = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 7 — Dissymmetry of lift: disc coloured by tangential speed */
  function wDissymmetry(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let Vkt = 80, psiDeg = 90;
    const draw = () => {
      st.V = Vkt * 0.5144;
      const mu = advanceRatio(st);
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.40, cy = H * 0.52, R = Math.min(W * 0.30, H * 0.40);
      // colour disc by local U_T at r=0.75 around azimuth (plus reverse-flow disk)
      HLD.discPolar(ctx, cx, cy, R, (psi) => {
        const ut = 0.75 + mu * Math.sin(psi);
        const t = (ut + Math.abs(mu)) / (1.5 + 2 * Math.abs(mu));
        return ut < 0 ? 'rgba(180,60,200,0.55)' : ramp(t);
      }, col, { V: st.V });
      // reverse-flow circle (UT<0 region: r < -mu sinψ on retreating side)
      if (mu > 0.05) {
        ctx.strokeStyle = 'rgba(180,60,200,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(cx - R * mu / 2, cy, R * mu / 2, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);
        HLD.text(ctx, 'reverse flow', cx - R * mu / 2, cy + 2, '#d96ee0', '9px IBM Plex Sans', 'center', 'middle');
      }
      // current blade + local U_T at the pointer (0.75R)
      const pr = HLD.polarToCanvas(psiDeg * D2R);
      HLD.arrow(ctx, cx, cy, cx + R * Math.cos(pr), cy + R * Math.sin(pr), col.ink, 2, 8);
      const utPsi = 0.75 + mu * Math.sin(psiDeg * D2R);
      HLD.dot(ctx, cx + R * 0.75 * Math.cos(pr), cy + R * 0.75 * Math.sin(pr), 4, col.ink);
      // adv/ret lift bars
      const utAdv = 0.75 + mu, utRet = 0.75 - mu;
      const liftAdv = utAdv * utAdv, liftRet = Math.max(0, utRet) * Math.max(0, utRet);
      const bx = W * 0.80, by = H * 0.3, bw = 30, bh = H * 0.4;
      const maxL = Math.max(liftAdv, 1);
      HLD.text(ctx, 'lift ∝ U_T²', bx, by - 14, col.dim, '10px IBM Plex Sans', 'center');
      ctx.fillStyle = ramp(0.85); ctx.fillRect(bx - bw - 6, by + bh - bh * liftAdv / maxL, bw, bh * liftAdv / maxL);
      HLD.text(ctx, 'ADV', bx - bw / 2 - 6, by + bh + 12, col.dim, '10px IBM Plex Sans', 'center');
      ctx.fillStyle = ramp(0.3); ctx.fillRect(bx + 6, by + bh - bh * liftRet / maxL, bw, bh * liftRet / maxL);
      HLD.text(ctx, 'RET', bx + bw / 2 + 6, by + bh + 12, col.dim, '10px IBM Plex Sans', 'center');
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Advance ratio μ', mu.toFixed(3), 'var(--hl-accent)'],
        ['U_T advancing', (utAdv).toFixed(2) + ' ΩR', 'var(--hl-good)'],
        ['U_T retreating', (utRet).toFixed(2) + ' ΩR', utRet < 0.2 ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['At ψ=' + psiDeg.toFixed(0) + '° (0.75R)', utPsi.toFixed(2) + ' ΩR · lift ' + (utPsi > 0 ? (utPsi * utPsi).toFixed(2) : '0'),
          utPsi < 0.2 ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['Lift asymmetry', (liftAdv / Math.max(0.01, liftRet)).toFixed(1) + '×', 'var(--hl-bad)'],
      ]) + `<p class="hl-note">Without correction the advancing side makes
        ${(liftAdv / Math.max(0.01, liftRet)).toFixed(1)}× the lift of the retreating side.
        ${mu > 0.05 ? 'A reverse-flow region (purple) has formed at the retreating root. ' : ''}
        Next lesson: flapping cancels this automatically.</p>`;
    };
    slider(ui.controls, { label: 'Forward speed', min: 0, max: 160, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    slider(ui.controls, { label: 'Azimuth ψ (blade position)', min: 0, max: 355, step: 5, val: psiDeg, unit: '°', fmt: v => v.toFixed(0), on: v => { psiDeg = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 8 — Flapping: 3-D disc (coning + natural blowback) + β(ψ) plot */
  function wFlapping(host) {
    host.innerHTML = '';
    const wrap = el('div', 'hl-w');
    const stage3d = el('div', 'hl-w-3d');
    const betWrap = el('div', 'hl-w-stage hl-w-stage-short');
    const betCanvas = el('canvas'); betWrap.appendChild(betCanvas);
    const side = el('div', 'hl-w-side');
    const controls = el('div', 'hl-w-controls');
    const readout = el('div', 'hl-w-readout');
    side.appendChild(controls); side.appendChild(readout);
    wrap.appendChild(stage3d); wrap.appendChild(betWrap); wrap.appendChild(side);
    host.appendChild(wrap);

    let Vkt = 80;
    // 3-D view: level fuselage, disc tilts back by natural a₁ (blowback)
    let view3d = null;
    if (window.HL3D) {
      try { view3d = window.HL3D.create(stage3d, { showWake: false, showFuselage: true, showMarker: false }); }
      catch (e) { console.error(e); }
    }
    if (!view3d) stage3d.innerHTML = noThreeHTML();

    const drawBet = () => {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      // NO trim cyclic: show the rotor's NATURAL flapping response (a₁/b₁ ≠ 0).
      const c = flappingCoeffs(st);
      const a0 = c.a0 * R2D, a1 = -c.a1c * R2D, b1 = -c.a1s * R2D;
      if (view3d) view3d.update({
        coningDeg: a0, discTiltLonDeg: a1, discTiltLatDeg: b1,
        bodyPitchDeg: 0, bladePitchDeg: 8, mu: advanceRatio(st), lam: inflowRatio(st),
      });
      const { ctx, W, H, col } = HLD.setup(betCanvas);
      HLD.clear(ctx, W, H, col);
      const pts = [];
      for (let i = 0; i <= 72; i++) pts.push({ x: i * 5, y: flappingAngle(c, (i / 72) * 2 * Math.PI) * R2D });
      const ys = pts.map(p => p.y); const ymin = Math.min(...ys, 0) - 1, ymax = Math.max(...ys) + 1;
      const ch = HLD.lineChart(ctx, W, H, [{ pts, color: col.accent, width: 2.5, label: 'β(ψ)' }],
        { xmin: 0, xmax: 360, ymin, ymax, xlab: 'azimuth ψ (deg)', ylab: 'flap β (deg)' }, col,
        [{ x: 90, color: col.good, label: 'ADV' }, { x: 270, color: col.warn, label: 'RET' }]);
      HLD.dline(ctx, ch.x0, ch.sy(a0), ch.x1, ch.sy(a0), col.lift, 1.2, [5, 4]);
      HLD.text(ctx, 'coning a₀', ch.x0 + 4, ch.sy(a0) - 4, col.lift, '9px IBM Plex Sans');
      readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Coning a₀', a0.toFixed(1) + '°', 'var(--hl-lift)'],
        ['Long. tilt a₁ (blowback)', a1.toFixed(1) + '°', 'var(--hl-accent)'],
        ['Lateral tilt b₁', b1.toFixed(1) + '°', 'var(--hl-warn)'],
      ]) + `<p class="hl-note">The 3-D disc shows the <b>natural</b> response on a level
        fuselage: it cones up (a₀) and blows back (a₁). Peak up-flap is ~90° after peak
        force, so high lift on the advancing side (ψ 90°) tilts the disc back over the
        nose. The pilot adds forward cyclic to re-level it. <i>(90° is the ideal lag;
        real articulated rotors with hinge offset lag a little less, ~75–85°.)</i></p>`;
    };
    slider(controls, { label: 'Forward speed', min: 0, max: 160, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; drawBet(); } });
    const ro = new ResizeObserver(() => drawBet()); ro.observe(betWrap);
    requestAnimationFrame(drawBet);
  }

  /* 9 — Retreating stall & envelope: AoA / %-critical-α / lift contour over disc */
  function wEnvelope(host) {
    const ui = scaffold(host);
    let Vkt = 60, plotMode = 'pctcrit', showIso = true, discModel = 'exam';
    // discModel: 'exam' = the clean ATPL/POF textbook plate — untwisted blade
    //   (twist=0) + no lateral cyclic (θ₁c=0) + uniform inflow, so the high-α
    //   zone lands squarely on the RETREATING TIP at ψ=270° (r→1) and spreads
    //   inboard with speed/weight/g/altitude; 'real' = the physically-complete
    //   BET (−8° washout, full trim cyclic, Drees lateral inflow), which puts
    //   the α peak a little INBOARD (≈0.7 R) and slightly BEFORE 270° (≈235°).
    //   See localAoAmodel() for the exact, documented simplifications.
    // plotMode: 'aoa' raw α (°) · 'pctcrit' α as % of the (Mach-adjusted)
    // critical α · 'lift' normalised load dL/dr ∝ U_T²·C_l (dynamic-pressure
    // weighted — the physical airload, which peaks at the tip).
    const sos0 = sosAtAltFt(0);
    // Mach-adjusted critical α at a cell (NACA-0012 trend: c_lmax falls above
    // M≈0.3), floored at 5°. Shared by the fill, the %-crit scale and iso-lines.
    const stallEffAt = (st, UT) => {
      const Mloc = HL.omR(st) * Math.max(0, UT) / sosAtAltFt(st.alt);
      return Math.max(5, st.stallAoA - 18 * Math.max(0, Mloc - 0.30));
    };
    const draw = () => {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const stt = trimmed(st);
      const c = flappingCoeffs(stt);
      const mu = advanceRatio(stt);
      const AOA = (s, cc, rB, ps) => localAoAmodel(s, cc, rB, ps, discModel);
      // exam mode uses a firmer airload floor so the low-q inboard smear vanishes
      // entirely and only the outboard retreating stall reads through.
      const QFLOOR = discModel === 'exam' ? 0.40 : 0.25;
      const sos = sosAtAltFt(st.alt);
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      // leave a fixed left/right gutter for the RET/ADV labels so they never
      // clip on narrow (mobile) viewports; the disc shrinks to fit instead.
      const GUT = 52;                                   // px reserved each side for labels
      const cx = W * 0.44, cy = H * 0.52;
      const R = Math.max(40, Math.min(cx - GUT, W - cx - GUT, H * 0.42));
      const nr = 12, np = 60;
      let maxRetAoA = -99, tipMach = 0, maxLift = 1e-6;
      // pass 1 for the lift scale: find the peak normalised load so the colour
      // ramp fills the whole range regardless of speed.
      if (plotMode === 'lift') {
        for (let ir = 0; ir < nr; ir++) {
          const rm = 0.2 + 0.8 * (ir + 0.5) / nr;
          for (let ip = 0; ip < np; ip++) {
            const pm = ((ip + 0.5) / np) * 2 * Math.PI;
            const d = AOA(stt, c, rm, pm);
            if (d.reverseFlow) continue;
            const se = stallEffAt(st, d.UT) * D2R;
            const Cl = Math.abs(d.aoa) < se ? st.clAlpha * d.aoa : 0;
            maxLift = Math.max(maxLift, Math.max(0, d.UT) * Math.max(0, d.UT) * Cl);
          }
        }
      }
      for (let ir = 0; ir < nr; ir++) {
        const r0 = 0.2 + 0.8 * ir / nr, r1 = 0.2 + 0.8 * (ir + 1) / nr;
        for (let ip = 0; ip < np; ip++) {
          const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
          const pm = (p0 + p1) / 2, rm = (r0 + r1) / 2;
          const d = AOA(stt, c, rm, pm);
          const aoaDeg = d.aoa * R2D;
          const stallEff = stallEffAt(st, d.UT);
          // Dynamic-pressure share of this cell (0..1). A blade element can only
          // REALLY stall where there is both high α AND meaningful airload
          // (q ∝ U_T²). Right at the reverse-flow boundary U_T→0, so α blows up
          // but q→0 — that is a low-q artefact, not a stall. We therefore gate
          // every "genuinely stalled" decision (hatch, lift-mode magenta, count,
          // iso-lines) on the SAME qShare the colour fade uses, with a real
          // airload floor Q_MIN so the inboard fwd/retreating blob never hatches.
          const AL = airloadConf(d.UT, mu);
          const qShare = AL.qShare, Q_MIN = QFLOOR, conf = Math.min(1, qShare / QFLOOR);
          const trulyStalled = !d.reverseFlow && aoaDeg >= stallEff && qShare >= Q_MIN;
          // fill colour by plot mode
          if (d.reverseFlow) {
            ctx.fillStyle = 'rgba(180,60,200,0.5)';
          } else if (plotMode === 'aoa') {
            // Raw geometric α, BUT faded toward neutral by the ACTUAL airload
            // share (not the clamped conf). Inboard on the retreating side α is
            // geometrically huge while U_T→0, so q≈0: those cells carry no real
            // load and must NOT read as a saturated red "stall". We fade the
            // colour toward slate AND drop the opacity by √qShare so the whole
            // low-q inboard region visibly recedes — the plot stays honest (α is
            // high there) without ever faking a stall. Full colour only returns
            // outboard where real dynamic pressure exists.
            const fade = Math.pow(qShare, 0.7);          // smooth 0..1 airload ramp
            ctx.globalAlpha = 0.30 + 0.70 * Math.sqrt(qShare);
            ctx.fillStyle = fadeToNeutral(aoaColor(aoaDeg, stallEff), fade);
          } else if (plotMode === 'pctcrit') {
            // fraction of the local critical α, colour-mapped so 100 % = stall.
            // The inboard blade sees a huge α but almost no dynamic pressure
            // (U_T→0), so it CANNOT really stall. Fading alpha alone still left a
            // dark-red "stalled-looking" blob there, so we also SCALE THE VALUE by
            // the airload share: a cell only reports a high %-of-critical when it
            // actually carries dynamic pressure. Below the Q_MIN airload floor the
            // reported %-crit is pulled toward the low (green/ok) end, so the only
            // red left is the OUTBOARD retreating blade where high α AND real
            // airload genuinely coincide.
            const pctRaw = aoaDeg / stallEff;                 // 1.0 = critical (uncapped)
            const pct = pctRaw * conf;                        // honest %-crit for display
            ctx.globalAlpha = 0.20 + 0.80 * qShare;
            ctx.fillStyle = aoaColor(pct * st.stallAoA, st.stallAoA);
          } else { // lift
            const Cl = Math.abs(d.aoa) < stallEff * D2R ? st.clAlpha * d.aoa : 0;
            const dL = Math.max(0, d.UT) * Math.max(0, d.UT) * Cl;
            // in lift mode a genuinely stalled cell (high α + real q) is painted a
            // distinct desaturated magenta so it never reads as "high load" red.
            ctx.fillStyle = trulyStalled ? 'rgb(150,40,110)' : ramp(Math.max(0, dL) / maxLift);
          }
          if (!d.reverseFlow && pm > Math.PI / 2 - 0.3 && pm < Math.PI / 2 + 0.3 && rm > 0.9)
            tipMach = Math.max(tipMach, HL.omR(st) * (rm + mu * Math.sin(pm)) / sos);
          if (!d.reverseFlow && Math.sin(pm) < -0.3 && rm >= 0.6 && qShare >= Q_MIN)
            maxRetAoA = Math.max(maxRetAoA, aoaDeg);
          ctx.beginPath();
          ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
          ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          // CVD texture: hatch STALLED cells (45°) and reverse-flow cells (135°).
          // A cell only counts as stalled if it also carries real airload
          // (U_T ≥ 0.2) — the low-q inboard blob is high-α but not truly stalled.
          const stallCell = trulyStalled;
          if (stallCell || d.reverseFlow) {
            const ang = HLD.polarToCanvas(pm);
            const ux = cx + R * rm * Math.cos(ang), uy = cy + R * rm * Math.sin(ang);
            const len = R * (r1 - r0) * 0.9;
            // stalled = bright magenta 45° hatch (matches the STALL_MARK legend);
            // reverse-flow = purple 135° hatch. Both high-contrast + textured.
            HLD.tick(ctx, ux, uy, len, stallCell ? Math.PI / 4 : -Math.PI / 4,
              stallCell ? 'rgba(255,63,160,0.95)' : 'rgba(150,60,220,0.9)', 1.6);
          }
        }
      }
      // constant-value iso-lines so the α (or %-crit) zones are visible.
      if (showIso && plotMode !== 'lift') {
        const field = (rBar, psiRad) => {
          const d = AOA(stt, c, rBar, psiRad);
          // skip reverse flow and low-q cells (same airload gate as the fill/hatch)
          const qS = Math.min(1, Math.pow(Math.max(0, d.UT) / (0.55 * (1 + mu)), 2));
          if (d.reverseFlow || qS < QFLOOR) return null;
          const aoaD = d.aoa * R2D;
          return plotMode === 'pctcrit' ? 100 * aoaD / stallEffAt(st, d.UT) : aoaD;
        };
        const levels = plotMode === 'pctcrit'
          ? [40, 60, 80, 100, 120]
          : [2, 4, 6, 8, 10, 12, 14];
        HLD.discIso(ctx, cx, cy, R, field, levels,
          { rMin: 0.2, color: 'rgba(20,25,35,0.5)', width: 1,
            fmt: v => plotMode === 'pctcrit' ? v + '%' : v + '°',
            label: W < 420 ? false : true });
      }
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.text(ctx, 'ADV 90°', cx + R + 4, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
      HLD.text(ctx, 'RET 270°', cx - R - 4, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
      HLD.text(ctx, 'NOSE', cx, cy - R - 6, col.dim, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'TAIL', cx, cy + R + 12, col.dim, '10px IBM Plex Sans', 'center');
      // legend depends on the plot mode. The stall MARK (hatched) is always a
      // distinct magenta so it can never be confused with a warm fill colour.
      const STALL_MARK = '#ff3fa0';
      const lx = W - 74;
      if (plotMode === 'lift') {
        HLD.text(ctx, '■ high load', lx, 20, 'rgb(235,70,50)', '10px IBM Plex Sans');
        HLD.text(ctx, '■ mid load', lx, 34, 'rgb(60,200,90)', '10px IBM Plex Sans');
        HLD.text(ctx, '■ low / none', lx, 48, 'rgb(40,90,200)', '10px IBM Plex Sans');
        HLD.text(ctx, '╱ stalled tip', lx, 62, STALL_MARK, '10px IBM Plex Sans');
        HLD.text(ctx, '■ reverse', lx, 76, '#c46ee0', '10px IBM Plex Sans');
      } else if (plotMode === 'aoa') {
        // continuous raw-α scale: low (blue) → high (red)
        HLD.text(ctx, '■ low α', lx, 20, 'rgb(40,90,200)', '10px IBM Plex Sans');
        HLD.text(ctx, '■ mid α', lx, 34, col.good, '10px IBM Plex Sans');
        HLD.text(ctx, '■ high α', lx, 48, col.warn, '10px IBM Plex Sans');
        HLD.text(ctx, '╱ stalled', lx, 62, STALL_MARK, '10px IBM Plex Sans');
        HLD.text(ctx, '■ reverse', lx, 76, '#c46ee0', '10px IBM Plex Sans');
      } else { // pctcrit
        HLD.text(ctx, '■ ok (<80%)', lx, 20, col.good, '10px IBM Plex Sans');
        HLD.text(ctx, '■ near stall', lx, 34, col.warn, '10px IBM Plex Sans');
        HLD.text(ctx, '■ ≥100% crit', lx, 48, col.bad, '10px IBM Plex Sans');
        HLD.text(ctx, '╱ stalled', lx, 62, STALL_MARK, '10px IBM Plex Sans');
        HLD.text(ctx, '■ reverse', lx, 76, '#c46ee0', '10px IBM Plex Sans');
      }
      const stalled = maxRetAoA >= st.stallAoA;
      const machHigh = tipMach > 0.85;
      const exceeded = stalled || machHigh;
      const approaching = !exceeded && (maxRetAoA >= st.stallAoA - 2 || tipMach > 0.80);
      const envTxt = exceeded ? (stalled && machHigh ? 'V_NE — both limits' : stalled ? 'V_NE — retreating stall' : 'V_NE — compressibility')
        : approaching ? 'approaching V_NE' : 'within envelope';
      const envCol = exceeded ? 'var(--hl-bad)' : approaching ? 'var(--hl-warn)' : 'var(--hl-good)';
      const modeNote = {
        aoa: 'Raw geometric <b>angle of attack</b> (°). The colour fades where the tangential speed U_T → 0 (almost no dynamic pressure), so the low-load inboard region recedes and the high-α <b>retreating tip</b> stands out. Switch to <b>% of critical α</b> or <b>lift</b> to confirm where stall is actually felt.',
        pctcrit: 'α as a <b>percentage of the local critical α</b>. Because the critical α falls with local Mach, the first cells to reach 100 % (red) are on the <b>outboard retreating blade</b> — so stall correctly begins at the <b>tip</b>, ψ≈270°. Iso-lines mark the 40/60/80/100/120 % zones.',
        lift: 'Normalised <b>load</b> dL/dr ∝ U_T²·C_l — the actual airload. It is dominated by the fast outboard blade and collapses inboard where U_T→0. The load hole opens on the retreating side as speed rises; stalled tip cells are flagged red.'
      }[plotMode];
      const modelNote = discModel === 'exam'
        ? '<b>Exam plate (textbook simplification):</b> untwisted blade, no lateral cyclic and uniform inflow — the classic ATPL/POF assumptions. The high-α zone sits squarely on the <b>retreating tip at ψ=270°</b> and the <b>tip is the first to stall</b>, spreading inboard as speed, weight, g or altitude rise. This is the clean 082 exam answer.'
        : '<b>Real blade (full physics):</b> the aircraft\'s −8° washout, full trim cyclic and the disc\'s lateral inflow gradient all act together. Washout unloads the tip, so the α peak slides <i>inboard (≈0.7 R)</i>, and the lateral inflow pulls it a little <i>before 270° (≈235°)</i> — the honest picture measurements show. Switch back to the exam plate for the clean tip-at-270° teaching view.';
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Max retreating α', maxRetAoA.toFixed(1) + '° / ' + st.stallAoA.toFixed(0) + '°', stalled ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['Advancing tip Mach', tipMach.toFixed(2) + ' / 0.85', machHigh ? 'var(--hl-bad)' : 'var(--hl-good)'],
        ['Envelope', envTxt, envCol],
      ]) + `<p class="hl-note">${exceeded
        ? '⚠ Outside the envelope: ' + (stalled ? 'retreating tip STALLED (red, hatched) — vibration, nose-up pitch, roll toward the retreating side. ' : '') + (machHigh ? 'advancing tip is compressible — shock/buffet. ' : '') + '<br>' + modeNote
        : modeNote}</p><p class="hl-note">${modelNote}</p>`;
    };
    slider(ui.controls, { label: 'Forward speed', min: 0, max: 180, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    segmented(ui.controls, { label: 'Blade twist', val: discModel, options: [
      { v: 'exam', t: 'No twist (exam)' }, { v: 'real', t: 'With twist (real)' },
    ], on: v => { discModel = v; draw(); } });
    segmented(ui.controls, { label: 'Plot', val: plotMode, options: [
      { v: 'aoa', t: 'Angle of attack' }, { v: 'pctcrit', t: '% of critical α' }, { v: 'lift', t: 'Lift (load)' },
    ], on: v => { plotMode = v; draw(); } });
    toggle(ui.controls, { label: 'Constant-angle iso-lines', val: true, on: v => { showIso = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 10 — Autorotation: driving / driven / stall zones over the WHOLE disc */
  function wAutorotation(host) {
    const ui = scaffold(host, {
      topStage: 'hl-w-stage hl-w-stage-map',
      mainStage: 'hl-w-stage hl-w-stage-vec',
    });
    const { canvas, topCanvas, controls, readout } = ui;
    let Vkt = 0, upflow = 6, coll = 4;   // forward speed [kt], up-flow [m/s], collective [°]
    let rBar = 0.60, psiDeg = 270;       // active blade element (r/R, azimuth)
    // Force balance on a blade element in steady autorotation, evaluated over
    // the entire disc (r/R, ψ) so the driving band and its forward-speed shift
    // are visible. The SAME regionAt feeds the disc colour, the BET triangle
    // and the readout, so the force-triangle's F_H always matches the region.
    //   U_T = r + μ·sinψ      (tangential — gains speed advancing, loses it retreating)
    //   φ   = atan2(−λ_up, U_T) (φ<0: the up-flow through the disc tilts the flow up)
    //   α   = θ − φ ,  F_x = C_l·sinφ + C_d·cosφ   (Leishman in-plane force)
    //     F_x < 0 → force leans WITH rotation → DRIVING (accelerates the rotor)
    //     F_x > 0 → force opposes rotation     → DRIVEN  (brakes it)
    // Forward flight adds μ·sinψ to U_T: the advancing side (ψ 90°) speeds up and
    // goes DRIVEN, the retreating side (ψ 270°) slows down so φ grows and it goes
    // DRIVING — the driving band migrates toward the retreating side, and a
    // reverse-flow / stall wedge opens at the retreating root.
    const regionAt = (st, r, psiRad, upInflow, mu) => {
      const UT = r + mu * Math.sin(psiRad);
      if (UT <= 0.02) return { reg: 'reverse', a: 0, phi: 0, fx: 0, UT, theta: 0, cl: 0, cd: 0 };
      const phi = Math.atan2(-upInflow, UT);
      const th = (coll + st.twist * (r - 0.75)) * D2R;
      const a = th - phi;
      const cl = HL.clOf(st, a), cd = HL.cdOf(st, cl);
      const fx = cl * Math.sin(phi) + cd * Math.cos(phi);
      const reg = (a > st.stallAoA * D2R) ? 'stall' : (fx < 0 ? 'driving' : 'driven');
      return { reg, a, phi, fx, UT, theta: th, cl, cd };
    };
    const colReg = { reverse: '#8f4fb0', stall: '#d05a6e', driving: 'rgb(60,175,95)', driven: 'rgb(232,170,60)' };
    const regChip = { driving: 'DRIVING', driven: 'DRIVEN', stall: 'STALL', reverse: 'REVERSE' };

    function discGeom(W, H) {
      const GUT = 52; const cx = W * 0.44, cy = H * 0.52;
      const R = Math.max(40, Math.min(cx - GUT, W - cx - GUT, H * 0.42));
      return { cx, cy, R };
    }

    const drawDisc = (ctx, W, H, col) => {
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const OmR = HL.omR(st);
      const upInflow = upflow / OmR;
      const mu = advanceRatio(st);
      const { cx, cy, R } = discGeom(W, H);
      const nr = 14, np = 72;
      let net = 0, cnt = { driving: 0, driven: 0, stall: 0, reverse: 0 };
      for (let ir = 0; ir < nr; ir++) {
        const r0 = 0.15 + 0.85 * ir / nr, r1 = 0.15 + 0.85 * (ir + 1) / nr;
        for (let ip = 0; ip < np; ip++) {
          const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
          const pm = (p0 + p1) / 2, rm = (r0 + r1) / 2;
          const rg = regionAt(st, rm, pm, upInflow, mu);
          cnt[rg.reg]++;
          if (rg.reg === 'driving' || rg.reg === 'driven') net += (-rg.fx) * rm;
          ctx.fillStyle = colReg[rg.reg];
          ctx.beginPath();
          ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
          ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
          ctx.closePath(); ctx.fill();
          // CVD texture: driven = 45° hatch, stall = vertical, reverse = 135°
          if (rg.reg !== 'driving') {
            const ang = HLD.polarToCanvas(pm);
            const ux = cx + R * rm * Math.cos(ang), uy = cy + R * rm * Math.sin(ang);
            const len = R * (r1 - r0) * 0.9;
            const tk = rg.reg === 'driven' ? Math.PI / 4 : rg.reg === 'stall' ? Math.PI / 2 : -Math.PI / 4;
            const tc = rg.reg === 'driven' ? 'rgba(120,80,10,0.6)' : rg.reg === 'stall' ? 'rgba(120,10,30,0.6)' : 'rgba(70,20,100,0.6)';
            HLD.tick(ctx, ux, uy, len, tk, tc, 1);
          }
        }
      }
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      // rotation arrow (CCW from above) + azimuth labels (clamped inside stage)
      const lbl = (t, x, ax, ay) => HLD.text(ctx, t, Math.max(22, Math.min(W - 22, x)), Math.max(12, Math.min(H - 4, ay)), col.dim, '10px IBM Plex Sans', ax, 'middle');
      lbl('ADV 90°', cx + R + 4, 'left', cy);
      lbl('RET 270°', cx - R - 4, 'right', cy);
      lbl('NOSE', cx, 'center', cy - R - 6);
      lbl('TAIL', cx, 'center', cy + R + 12);
      // active element marker — sits on top of all sectors, clear ring + dot
      const canAng = HLD.polarToCanvas(psiDeg * D2R);
      const mx = cx + R * rBar * Math.cos(canAng), my = cy + R * rBar * Math.sin(canAng);
      const actReg = regionAt(st, rBar, psiDeg * D2R, upInflow, mu).reg;
      ctx.fillStyle = colReg[actReg];
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      HLD.chipLabel(ctx, `r/R ${rBar.toFixed(2)} · ψ${psiDeg}°`, mx, my - 16, col.ink, '10px IBM Plex Sans', 'center', 'rgba(13,17,23,0.82)');
      // forward-flight indicator (air comes from the nose) — top-left corner
      if (mu > 0.001) {
        HLD.arrow(ctx, 14, 16, 40, 40, col.accent, 2, 7);
        HLD.text(ctx, 'V∞ airflow', 46, 20, col.accent, '10px IBM Plex Sans', 'left', 'middle');
      }
      // legend
      HLD.text(ctx, '■ driving', W - 74, 20, colReg.driving, '10px IBM Plex Sans');
      HLD.text(ctx, '■ driven', W - 74, 34, colReg.driven, '10px IBM Plex Sans');
      HLD.text(ctx, '■ stall', W - 74, 48, colReg.stall, '10px IBM Plex Sans');
      HLD.text(ctx, '■ reverse', W - 74, 62, colReg.reverse, '10px IBM Plex Sans');
      HLD.chipLabel(ctx, 'tap disc to pick a station', 12, H - 8, col.dim, '10px IBM Plex Sans', 'left', col.bg);
      return { cnt, net };
    };

    // ── BET velocity + force triangle for the active element ────────────────
    // Uses HLD.bladeSection (the exam drawing) fed by the SAME regionAt values
    // as the disc, so the drawn F_H direction matches the region colour.
    const drawTriangle = (ctx, W, H, col) => {
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const OmR = HL.omR(st);
      const upInflow = upflow / OmR;
      const mu = advanceRatio(st);
      const rg = regionAt(st, rBar, psiDeg * D2R, upInflow, mu);
      const cardinal = psiDeg < 45 || psiDeg > 315 ? 'TAIL' : psiDeg < 135 ? 'ADVANCING' : psiDeg < 225 ? 'NOSE' : 'RETREATING';
      const compact = W < 560;
      // title (top-left)
      HLD.chipLabel(ctx, compact ? `${cardinal.slice(0, 3)} ψ${psiDeg}° · r${rBar.toFixed(2)}` : `${cardinal} ψ=${psiDeg}° · r/R=${rBar.toFixed(2)} · BET diagram`,
        12, 16, col.dim, '12px IBM Plex Sans', 'left', col.bg);
      // region chip (top-right)
      const rc = rg.reg;
      const rcol = rc === 'driving' ? colReg.driving : rc === 'driven' ? colReg.driven : rc === 'stall' ? colReg.stall : colReg.reverse;
      const cw = compact ? 92 : 116, ch = compact ? 20 : 24;
      ctx.globalAlpha = 0.9; ctx.fillStyle = rcol;
      ctx.fillRect(W - cw - 6, 6, cw + 6, ch + 4); ctx.globalAlpha = 1;
      ctx.strokeStyle = rcol; ctx.lineWidth = 1.4; ctx.strokeRect(W - cw - 6, 6, cw + 6, ch + 4);
      HLD.text(ctx, regChip[rc], W - 6 - (cw + 6) / 2, 6 + (ch + 4) / 2, '#fff', (compact ? 'bold 10px ' : 'bold 11px ') + 'IBM Plex Sans', 'center', 'middle');

      if (rc === 'reverse') {
        HLD.chipLabel(ctx, 'reverse flow — U_T < 0, standard BET triangle not valid here',
          W / 2, H * 0.5, col.bad, '13px IBM Plex Sans', 'center', 'rgba(248,113,113,0.15)');
        return;
      }
      // bladeSection draws: rotor-plane ref, V_rel (up-flow → wind from below),
      // airfoil at θ, θ/φ/α arcs, L+D, and TAF resolved into Thrust + F_H (×6).
      const ox = W * 0.30, oy = H * 0.62, sc = Math.min(W * 0.50, H * 0.60, 300);
      HLD.bladeSection(ctx, ox, oy, sc, {
        theta: rg.theta, phi: rg.phi, ampl: 4.0,
        showForces: true, showResolve: true,
        cl: rg.cl, cd: rg.cd, aoa: rg.a,
        stall: rc === 'stall',
      }, col);
      // F_H verdict line under the triangle — repeats the disc verdict in words
      const drives = rg.fx < 0;
      HLD.chipLabel(ctx,
        drives ? 'F_H points WITH rotation → DRIVES the rotor (autorotation)' : 'F_H opposes rotation → brakes (driven / powered)',
        12, H - 10, drives ? col.good : col.warn, '11px IBM Plex Sans', 'left', col.bg);
    };

    const draw = () => {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const OmR = HL.omR(st);
      const upInflow = upflow / OmR;
      const mu = advanceRatio(st);
      const { ctx: c1, W: w1, H: h1, col: col1 } = HLD.setup(topCanvas);
      const { cnt, net } = drawDisc(c1, w1, h1, col1);
      const { ctx: c2, W: w2, H: h2, col: col2 } = HLD.setup(canvas);
      drawTriangle(c2, w2, h2, col2);
      const rg = regionAt(st, rBar, psiDeg * D2R, upInflow, mu);
      const rrpm = net > 0.02 ? 'increasing ↑' : net < -0.02 ? 'decaying ↓' : 'steady (balanced)';
      const rrpmCol = net > 0.02 ? 'var(--hl-good)' : net < -0.02 ? 'var(--hl-bad)' : 'var(--hl-warn)';
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Collective θ₀', coll.toFixed(1) + '°', 'var(--hl-chord)'],
        ['Up-flow through disc', upflow.toFixed(0) + ' m/s', 'var(--hl-wind)'],
        ['Element region', regChip[rg.reg] + (rg.reg === 'reverse' ? '' : ` · α=${(rg.a * R2D).toFixed(1)}°`),
          rg.reg === 'driving' ? 'var(--hl-good)' : rg.reg === 'driven' ? 'var(--hl-warn)' : rg.reg === 'stall' ? 'var(--hl-bad)' : 'var(--hl-dim)'],
        ['F_H direction', rg.reg === 'reverse' ? 'undefined (reverse)' : (rg.fx < 0 ? 'forward → drives rotor' : 'aft → brakes rotor'),
          rg.fx < 0 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Driving cells', cnt.driving + ' / ' + (14 * 72), 'var(--hl-good)'],
        ['Rotor RPM trend', rrpm, rrpmCol],
      ]) + `<p class="hl-note">The disc classifies every element: the <b>driving</b> band
        (green) speeds the rotor up, the <b>driven</b> tip (amber) brakes it, and the
        root <b>stalls</b>. <b>Tap the disc</b> (or use the r/R and ψ sliders) to move the
        white marker — the BET diagram below updates to that element, and its F_H
        direction always matches the colour under the marker. At 0 kt the pattern is
        axisymmetric (driving ring inside a driven tip); add <b>forward speed</b> and the
        driving zone migrates toward the <b>retreating side (ψ 270°)</b> as the
        advancing side speeds up and goes driven, with a reverse/stall wedge at the
        retreating root. Balance driving vs driven with the collective to hold RRPM.</p>`;
    };

    slider(ui.controls, { label: 'Forward speed', min: 0, max: 80, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    slider(ui.controls, { label: 'Collective θ₀ (RRPM control)', min: 1, max: 9, step: 0.5, val: coll, unit: '°', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Up-flow through disc', min: 3, max: 12, step: 0.5, val: upflow, unit: ' m/s', fmt: v => v.toFixed(1), on: v => { upflow = v; draw(); } });
    const rbarCtrl = slider(ui.controls, { label: 'Blade station r/R', min: 0.20, max: 0.97, step: 0.01, val: rBar, fmt: v => v.toFixed(2), on: v => { rBar = v; draw(); } });
    const azCtrl = slider(ui.controls, { label: 'Azimuth ψ', min: 0, max: 355, step: 5, val: psiDeg, unit: '°', on: v => { psiDeg = v; draw(); } });

    // ── click the disc to pick (r, ψ) ──────────────────────────────────
    topCanvas.style.cursor = 'crosshair';
    topCanvas.addEventListener('click', (e) => {
      const r = topCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = discGeom(r.width, r.height);
      const dx = x - d.cx, dy = y - d.cy;
      const rad = Math.hypot(dx, dy);
      if (rad > d.R * 1.02) return;
      rBar = Math.max(0.20, Math.min(0.97, rad / d.R));
      const canAng = Math.atan2(dy, dx);
      const psi = (Math.PI / 2 - canAng + 2 * Math.PI) % (2 * Math.PI);
      psiDeg = Math.round(psi * R2D / 5) * 5 % 360;
      rbarCtrl && rbarCtrl.set(rBar); azCtrl && azCtrl.set(psiDeg); draw();
    });

    ui.onDraw(draw);
  }

  /* 11 — Power required curve */
  function wPerformance(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let weight = 2800, alt = 0;
    const draw = () => {
      st.W_kg = weight; st.alt = alt;
      const curve = HL.powerCurve(st, 85, 70);
      const m = HL.powerMarkers(curve);
      const kw = a => a.map(p => ({ x: p.V / 0.5144, y: p[1] / 1000 }));
      const series = [
        { pts: curve.map(p => ({ x: p.V / 0.5144, y: p.Pi / 1000 })), color: 'rgba(56,189,248,0.9)', width: 1.6, label: 'P_i induced', dash: [4, 3] },
        { pts: curve.map(p => ({ x: p.V / 0.5144, y: (p.Pp) / 1000 })), color: 'rgba(52,211,153,0.9)', width: 1.6, label: 'P_p profile', dash: [4, 3] },
        { pts: curve.map(p => ({ x: p.V / 0.5144, y: p.Ppar / 1000 })), color: 'rgba(248,113,113,0.9)', width: 1.6, label: 'P_par parasite', dash: [4, 3] },
        { pts: curve.map(p => ({ x: p.V / 0.5144, y: p.Ptot / 1000 })), color: 'var(--hl-ink)', width: 2.6, label: 'P_total' },
      ];
      const ymax = Math.max(...curve.map(p => p.Ptot)) / 1000 * 1.1;
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      const ch = HLD.lineChart(ctx, W, H, series,
        { xmin: 0, xmax: 85 / 0.5144, ymin: 0, ymax, xlab: 'airspeed (kt)', ylab: 'power (kW)' },
        col,
        [{ x: m.enduranceV / 0.5144, color: col.good, label: 'endurance' },
         { x: m.rangeV / 0.5144, color: col.warn, label: 'range' }]);
      // ETL band (15–25 kt): where the induced-power collapse is felt as
      // effective translational lift — the "knee" the text describes.
      const xe0 = ch.sx(15), xe1 = ch.sx(25);
      ctx.fillStyle = 'rgba(56,189,248,0.08)';
      ctx.fillRect(xe0, ch.y1, xe1 - xe0, ch.y0 - ch.y1);
      HLD.text(ctx, 'ETL', (xe0 + xe1) / 2, ch.y1 + 3, 'rgba(56,189,248,0.85)', '9px IBM Plex Sans', 'center', 'top');
      ui.readout.innerHTML = kv([
        ['Gross weight', weight.toFixed(0) + ' kg', 'var(--hl-ink)'],
        ['Density altitude', alt.toFixed(0) + ' ft', 'var(--hl-ink)'],
        ['Hover power', (curve[0].Ptot / 1000).toFixed(0) + ' kW', 'var(--hl-wind)'],
        ['Best endurance', (m.enduranceV / 0.5144).toFixed(0) + ' kt', 'var(--hl-good)'],
        ['Best range', (m.rangeV / 0.5144).toFixed(0) + ' kt', 'var(--hl-warn)'],
      ]) + `<p class="hl-note">Induced power (blue) dominates the hover and falls fast
        with speed — that drop near 15–25 kt is translational lift. Parasite power
        (red, ∝ V³) takes over at high speed. The bucket bottom is best endurance;
        the tangent from the origin is best range.</p>`;
    };
    slider(ui.controls, { label: 'Gross weight', min: 1800, max: 3600, step: 50, val: weight, unit: ' kg', fmt: v => v.toFixed(0), on: v => { weight = v; draw(); } });
    slider(ui.controls, { label: 'Density altitude', min: 0, max: 14000, step: 500, val: alt, unit: ' ft', fmt: v => v.toFixed(0), on: v => { alt = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 12 — BET diagram: velocity + force triangle for a case */
  function wBetDiagram(host) {
    const ui = scaffold(host);
    let cse = 'fwd_adv';
    const draw = () => {
      const st = HL.defaultState();
      let psiDeg = 90, Vkt = 90, descent = 0;
      if (cse === 'fwd_adv') { psiDeg = 90; Vkt = 90; }
      else if (cse === 'fwd_ret') { psiDeg = 270; Vkt = 90; }
      else if (cse === 'climb') { psiDeg = 90; Vkt = 0; }
      else if (cse === 'auto') { psiDeg = 90; Vkt = 0; descent = 12; st.theta0 = 4; }
      st.V = Vkt * 0.5144;
      const stt = trimmed(st);
      const c = flappingCoeffs(stt);
      const r = 0.75;
      const d = localAoA(stt, c, r, psiDeg * D2R);
      const OmR = HL.omR(st);
      let UP = d.UP, UT = d.UT;
      if (cse === 'auto') UP = -(descent / OmR);     // up-flow
      const phi = Math.atan2(UP, Math.max(0.001, UT));
      const theta = d.theta;
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      // Centre the origin so the whole triangle uses the canvas instead of the
      // left edge: leave room on the right for V_rel + the 'rotor plane' label,
      // and headroom above for the Thrust/TAF vectors.
      const ox = W * 0.30, oy = H * 0.60, sc = Math.min(W * 0.52, H * 0.62, 340);
      HLD.bladeSection(ctx, ox, oy, sc, {
        theta, phi, ampl: 4.0, showForces: true, showResolve: true,
        cl: HL.clOf(st, theta - phi), cd: HL.cdOf(st, HL.clOf(st, theta - phi)),
        aoa: theta - phi, stall: (theta - phi) > st.stallAoA * D2R,
      }, col);
      // F_H direction: in-plane force F_x = L·sinφ + D·cosφ (Leishman).
      // F_x < 0 (φ<0, up-flow) ⇒ force tilts with rotation ⇒ DRIVES the rotor.
      const cl = HL.clOf(st, theta - phi), cd = HL.cdOf(st, cl);
      const fH = cl * Math.sin(phi) + cd * Math.cos(phi);
      ui.readout.innerHTML = kv([
        ['Case', ({ fwd_adv: 'Fwd — advancing', fwd_ret: 'Fwd — retreating', climb: 'Vertical climb', auto: 'Autorotation' })[cse], 'var(--hl-ink)'],
        ['θ pitch', (theta * R2D).toFixed(1) + '°', 'var(--hl-chord)'],
        ['φ inflow (α_i)', (phi * R2D).toFixed(1) + '°', 'var(--hl-wind)'],
        ['α angle of attack', ((theta - phi) * R2D).toFixed(1) + '°', 'var(--hl-good)'],
        ['F_H direction', fH < 0 ? 'forward → DRIVES rotor' : 'backward → brakes rotor',
          fH < 0 ? 'var(--hl-good)' : 'var(--hl-warn)'],
      ]) + `<p class="hl-note">This is the triangle you draw on the exam. F_H is the
        in-plane force: ${fH < 0 ? 'here it points with rotation, the autorotation driving case.' : 'here it opposes rotation — powered/driven flight.'}
        ${cse === 'auto' ? 'The up-flow used is the net flow through the disc (induced flow already accounted for). ' : ''}F_H is drawn ×6 for visibility — its direction is exact.
        Practise drawing it by hand.</p>
        `;
    };
    segmented(ui.controls, {
      label: 'Flight case', val: 'fwd_adv', options: [
        { v: 'fwd_adv', t: 'Fwd ADV' }, { v: 'fwd_ret', t: 'Fwd RET' },
        { v: 'climb', t: 'Climb' }, { v: 'auto', t: 'Autorot.' },
      ], on: v => { cse = v; draw(); },
    });
    ui.onDraw(draw);
  }

  /* =========================================================================
     wBetVelocity — the BET velocity triangle for retreating-stall teaching.
     Shows, at any (r/R, ψ, speed), the FULL vector construction the book draws
     in TikZ:
        • V_rot  = Ω·r          (rotational speed, always forward along chord)
        • V_T    = μ·sinψ·ΩR    (tangential component of the forward flow) drawn
                                 head-to-tail ON TOP of V_rot, so on the
                                 retreating side (ψ=270°, sinψ=−1) it points
                                 BACKWARD and is visibly SUBTRACTED → the short
                                 net U_T that makes the retreating blade slow.
        • U_T    = V_rot + V_T   (net in-plane speed — the tail of V_rel)
        • U_P    = λ + β̇·r + …  (perpendicular flow: inflow + flapping) drawn
                                 vertically at the tip of U_T.
        • V_rel  = √(U_T²+U_P²)  resultant, with θ (pitch), φ (inflow angle),
                                 α = θ−φ marked exactly as in the exam drawing.
     Plus a twist visualiser: the ACTIVE blade section is drawn sharp at the tip
     and its drawn pitch θ(r) tracks the −8° washout as you sweep r/R, with a
     "twist off" toggle (untwisted blade) so students see the section swing to
     full pitch.
     All numbers come straight from localVelocities()/bladePitch() — nothing is
     faked; this is the same physics as the disc map, just drawn as one triangle. */
  function wBetVelocity(host) {
    // Two stacked canvases: a wide ROTOR-MAP strip on top (own canvas) + the
    // full-width VECTOR triangle below. Splitting them lets the triangle use the
    // whole panel width and keeps both readable on mobile.
    const ui = scaffold(host, {
      topStage: 'hl-w-stage hl-w-stage-map',
      mainStage: 'hl-w-stage hl-w-stage-vec',
    });
    let Vkt = 120, psiDeg = 270, rBar = 0.75, twistOn = true, discModel = 'exam';
    // Mach-adjusted critical α (NACA-0012 trend) — identical rule to wEnvelope so
    // the BET stall verdict matches the disc map cell-for-cell.
    const stallEffAt = (st, UT) => {
      const Mloc = HL.omR(st) * Math.max(0, UT) / sosAtAltFt(st.alt);
      return Math.max(5, st.stallAoA - 18 * Math.max(0, Mloc - 0.30));
    };
    // hit-box of the interactive mini-envelope disc (set each draw) so the click
    // handler can convert canvas x/y → (ψ, r/R).
    let discHit = null;

    const draw = () => {
      const st = HL.defaultState();
      if (!twistOn) st.twist = 0;
      st.V = Vkt * 0.5144;
      const stt = trimmed(st);
      const c   = flappingCoeffs(stt);
      const psi = psiDeg * D2R;
      const OmR = HL.omR(st);
      const mu  = advanceRatio(stt);

      // ── EASA exam-plate convention (clean blade-element diagram) ─────────────
      // U_T is ALWAYS the true tangential speed r̄ + μ·sinψ, so advancing vs.
      // retreating and the reverse-flow guard stay physically honest.
      // U_P is the INDUCED DOWNWASH λ_i only — the momentum-theory downwash that
      // makes blade lift. It is ALWAYS positive (down THROUGH the disc), so the
      // relative wind is always depressed BELOW the rotor plane and the inflow
      // angle φ is always a positive number. This is the standard ATPL(H)/POF
      // plate: it deliberately omits the disc-tilt free-stream throughflow term
      // (μ·tan α_TPP, the more advanced effect that can flip U_P upward on the
      // nose side) so students see the clean downwash picture every time.
      const Vrot  = rBar;                 // rotational speed (norm)
      const Vt    = mu * Math.sin(psi);   // tangential comp of forward flow (norm, signed)
      const UT    = Vrot + Vt;            // TRUE tangential speed (signed)
      // U_P = the TOTAL perpendicular (through-disc) flow the blade sees, split
      // into the two components of Fig 11.14 (vertical airflow / translational
      // lift):  v_i  = induced downwash (large in hover, DECAYS with speed)
      //         v_n  = normal component of the forward free-stream through the
      //                disc (grows with speed).  Both act DOWNWARD through the
      //                disc, so U_P = v_i + v_n is ALWAYS positive (down). Their
      //                sum dips (translational lift) then rises past V_BROC.
      const v_i   = inducedInflowRatio(stt);            // induced downwash (>0, down)
      const v_n   = Math.abs(throughflowRatio(stt));    // |normal free-stream comp| (>0, down)
      const lam_i = v_i;                                // kept for readout compatibility

      // ── FLAPPING-VELOCITY term v_flap = (β̇/Ω)·r̄  (Leishman Eq. for U_P) ────────
      // The blade element also moves perpendicular to the disc while it flaps up
      // and down, so its own flapping rate adds to the perpendicular velocity the
      // aerofoil sees. In a TRIMMED, level disc the trim cyclic drives β̇→0 (the
      // flapping cancels the asymmetry), so this term is ~0 and U_P ≈ V_i+V_n —
      // which is why the classic plate omits it. To make the term VISIBLE and
      // teach WHY it matters, we evaluate the disc's NATURAL flapping response
      // (no trim cyclic — the physical blowback of the flapping lesson): then
      //   β̇/Ω = dβ/dψ,   v_flap = (β̇/Ω)·r̄   (normalised by ΩR, signed).
      // Sign (Leishman standard, POSITIVE term): a blade flapping UP (β̇>0, the
      // ADVANCING side) moves its section UP through the air → sees MORE downward-
      // relative flow → U_P GROWS → φ grows → α SHRINKS. Flapping DOWN (retreating,
      // β̇<0) shrinks U_P → α GROWS. This is flapping-to-equality drawn honestly.
      const stNat = { ...st, theta1c: 0, theta1s: 0 };  // natural blowback, no trim cyclic
      const cNat  = flappingCoeffs(stNat);
      const Om    = omega(stNat);
      // Leishman's standard sign: U_P = λ + (β̇/Ω)·r̄ + … (POSITIVE flapping term).
      // A blade flapping UP (β̇>0, the ADVANCING side) moves its section UP through
      // the air, so it sees MORE perpendicular (downward-relative) flow → U_P GROWS
      // → φ grows → α SHRINKS. Flapping DOWN (retreating) shrinks U_P → α GROWS.
      // This is flapping-to-equality, drawn honestly: v_flap ADDS to U_P when the
      // blade flaps up (advancing) and SUBTRACTS when it flaps down (retreating).
      const v_flap = (flappingRate(cNat, psi, Om) / Om) * rBar;   // signed; + grows U_P
      // The V_rel / α_i triangle now MOVES with the full U_P (incl. flapping) so the
      // student literally watches α shrink (advancing) / grow (retreating). We do NOT
      // clamp U_P: when the DOWN-flapping retreating blade (v_flap<0) overwhelms the
      // downward through-flow (V_i+V_n), the NET flow through the disc reverses to
      // UPWARD (U_P<0). Physically V_rel then arrives from BELOW the rotor plane, φ
      // goes NEGATIVE, and α = θ−φ GROWS — exactly what deepens retreating-blade
      // stall. Drawing it honestly lets the student see V_rel drop below the TPP.
      const UP     = v_i + v_n + v_flap;    // signed: >0 down-flow, <0 up-flow
      const netUpflow = UP < -1e-3;         // net up-flow (V_rel from below the TPP)
      const theta = bladePitch(stt, rBar, psi);
      const reverse = UT < 0;
      // φ = inflow angle = signed depression of V_rel below the rotor plane
      //   φ>0 → down-flow: V_rel sits BELOW the TPP (normal case);
      //   φ<0 → net up-flow: V_rel arrives FROM BELOW the TPP (tilts up through it).
      const phi   = reverse ? 0 : Math.atan2(UP, UT);
      const aoa   = theta - phi;
      const stalled = !reverse && aoa > stt.stallAoA * D2R;

      // ── ENVELOPE-CONSISTENT VERDICT (same model as the disc map on the previous
      // page). We evaluate localAoAmodel() for THIS exact cell with the chosen
      // exam/real model and apply the identical Mach-critical-α + airload gate the
      // wEnvelope colour map uses, so a red map cell always reads STALLED here.
      const dCell   = localAoAmodel(stt, c, rBar, psi, discModel);
      const stallEffDeg = stallEffAt(st, dCell.UT);          // Mach-adjusted crit α (°)
      const cellAoAdeg  = dCell.aoa * R2D;
      const qShare  = airloadConf(dCell.UT, mu).qShare;      // 0..1 dynamic-pressure share
      const Q_MIN   = discModel === 'exam' ? 0.40 : 0.25;    // same airload floor as map
      const cellReverse = dCell.reverseFlow;
      const cellStalled = !cellReverse && cellAoAdeg >= stallEffDeg && qShare >= Q_MIN;
      const cellNear    = !cellReverse && !cellStalled && cellAoAdeg >= stallEffDeg - 2 && qShare >= Q_MIN;
      const pctCrit = stallEffDeg > 0 ? 100 * cellAoAdeg / stallEffDeg : 0;
      const verdict = cellReverse ? { t: 'REVERSE FLOW (U_T < 0)', c: 'var(--hl-bad)' }
        : cellStalled ? { t: 'STALLED — beyond critical α', c: 'var(--hl-bad)' }
        : cellNear ? { t: 'NEAR STALL — approaching critical α', c: 'var(--hl-warn)' }
        : { t: 'WITHIN ENVELOPE', c: 'var(--hl-good)' };

      // physical magnitudes (m/s) for the readout
      const VrotMS = Vrot * OmR, VtMS = Vt * OmR, UTMS = UT * OmR, UPMS = UP * OmR;
      const ViMS = v_i * OmR, VnMS = v_n * OmR, VflapMS = v_flap * OmR;
      const VrelMS = Math.hypot(UTMS, UPMS);

      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);

      // ================= LAYOUT ================================================
      // Two clearly-separated panels so the airfoil never sits on top of the
      // velocity vectors:
      //   • LOWER panel  = the in-plane + perpendicular VELOCITY TRIANGLE
      //   • UPPER-LEFT inset = the AIRFOIL SECTION at pitch θ with θ/φ/α marked
      // ------------------------------------------------------------------------
      // ── Geometry follows the EASA exam plate EXACTLY ──────────────────────────
      //  • The AIRFOIL / blade tip sits on the RIGHT: that is where V_rot, V_T and
      //    V_rel all POINT TO (their common head) and where the inflow angle α_i
      //    (=φ) is measured.
      //  • V_rot points RIGHT toward the airfoil, tail on the LEFT.
      //  • V_T is appended at the TAIL of V_rot: advancing ADDS (tail slides further
      //    left, lengthening the base); retreating SUBTRACTS (V_T points right from
      //    the tail, shortening the base). V_rel always starts at the TAIL of V_T.
      //  • V_i (=U_P) is a short vertical arrow pointing DOWN, sitting ABOVE the
      //    rotor plane at the tail, its head landing on the tail of V_rot/V_T.
      //  • V_rel runs from the TOP of V_i (upper-left) down to the airfoil (right).
      // Tip sits at ~60% width (was 0.86) so the whole triangle is CENTRED with room
      // on BOTH sides — the base can stretch left AND the airfoil/wedge (which
      // fan out to the RIGHT of the tip, ~150px) stay on-canvas. On the retreating
      // side U_T is short, so at 0.86 everything used to bunch against the right edge.
      // Tip a touch left of centre (airfoil fan extends ~90px RIGHT of it) and the
      // rotor-plane baseline raised toward the vertical middle: with the θ/φ/α legend
      // and disclaimer now moved OFF-canvas, the triangle can use the whole panel
      // instead of hugging the lower-right. The U_P stack grows UPWARD from oy (short
      // at AMP=2, ~40px) so it clears the top chip (y=20) and the envelope disc.
      // ── SCALE THE TRIANGLE TO FILL THE STAGE ─────────────────────────────────
      // The diagram has a RESERVED LEFT ANNOTATION LANE (the textbook convention the
      // students learn): the U_P dimension bracket lives there, plus a translated
      // angle callout (θ, α, φ) whose rays run parallel to the real TPP/chord/V_rel.
      // So the vector cluster must start RIGHT of that lane — leftPad is widened to
      // make room for both the bracket (~28px) and the arcs (~70px) + their labels.
      const maxIn = Math.max(Math.abs(Vrot) + Math.abs(Vt), Math.abs(UT), 1.0);
      const AMP = 2;                           // gently exaggerate the small U_P (see below)
      const rightPad = Math.max(112, W * 0.16);   // room for airfoil fan + 'c' label right of tip (fixes mobile right-clip)
      const leftPad  = Math.max(150, W * 0.16);  // reserved left annotation lane (U_P + arcs)
      const sxW = (W - rightPad - leftPad) / maxIn;                 // width-limited
      const upMax = Math.max(Math.abs(v_i) + Math.abs(v_n) + Math.abs(v_flap), 0.05);
      const sxH = (H * 0.34) / (AMP * upMax + 0.001);              // height-limited (U_P leg)
      const sx = Math.max(60, Math.min(sxW, sxH, 900));            // px per unit (in-plane)
      // U_P is small next to the in-plane base, so we still exaggerate its vertical
      // leg for visibility — but only ×2. At ×6 the drawn V_rel slope was far steeper
      // than the TRUE inflow angle φ, over-stating φ/α. ×2 keeps U_P readable while
      // the drawn triangle stays close to the real φ — the α reads honestly.
      const sy = sx;
      // Tip placed so the base (length maxIn·sx, growing LEFT) starts after leftPad
      // and the airfoil fan clears the right edge. Vertically centred, biased down a
      // little to leave room for the U_P stack + labels above the plane.
      const tipX = leftPad + maxIn * sx;
      const oy   = H * 0.56;                   // rotor-plane baseline (triangle head height)

      // ── RESPONSIVE LABEL SIZING ──────────────────────────────────────────────
      // Every label is a bitmap drawn at an absolute px position, so on a narrow
      // (mobile) canvas fixed-size text overlaps. We scale the label font with the
      // canvas width and expose short font strings that all labels reuse. Labels
      // themselves are now PURE VECTOR NAMES (V_T, V_rot, …) — the formulae and the
      // θ/φ/α values live in the text readout beside the canvas, not on the plot.
      const fs   = Math.max(9, Math.min(12, W / 95));          // base label px
      const FV   = fs.toFixed(1) + 'px IBM Plex Sans, sans-serif';        // vector names
      const FSM  = Math.max(8, fs - 1).toFixed(1) + 'px IBM Plex Sans, sans-serif'; // small
      const FVrel = Math.max(10, fs + 1).toFixed(1) + 'px IBM Plex Sans, sans-serif'; // V_rel
      // On narrow (mobile) canvases the small component labels (V_i, V_n, V_flap, V_rel)
      // collide with the vectors and each other. They are already listed in the readout
      // table below, so suppress their on-canvas text when the stage is compact; the
      // arrows themselves stay. The key labels (θ, α, U_P, V_rot, V_T) always show.
      const compact = W < 560;
      const showDetailLabels = !compact;

      // rotor-plane baseline = the Tip-Path-Plane (TPP) reference. Labelled 'TPP'
      // at the left margin so it reads like the exam plate (the sketch convention).
      HLD.dline(ctx, 20, oy, W - 10, oy, col.grid, 1, [5, 4]);
      // 'TPP' chip with a canvas-coloured backing so the dashed line doesn't run
      // through the letters.
      HLD.chipLabel(ctx, 'TPP', 24, oy, col.dim, FSM, 'left', col.canvas);

      // ---- IN-PLANE construction (heads point RIGHT toward the airfoil) -------
      // V_rot: tail at xRotTail, head at the tip (right).
      const xRotTail = tipX - Vrot * sx;
      const xBase = tipX - UT * sx;            // tail of the whole in-plane base
      const vtCol = Vt < 0 ? col.bad : col.accent;

      // V_T is appended at the TAIL of V_rot. Because U_T = V_rot + V_T:
      //   • ADVANCING (V_T>0): U_T > V_rot ⇒ xBase < xRotTail. V_T points RIGHT
      //     (forward, same way as V_rot) and lies COLLINEAR on the rotor plane just
      //     to the LEFT of V_rot, tip-to-tail — exactly the exam plate. No overlap.
      //   • RETREATING (V_T<0): U_T < V_rot ⇒ the backward V_T would lie ON TOP of
      //     V_rot's shaft, so it is drawn just BELOW the plane to stay legible.
      const collinear = (Vt >= 0);
      const yVt = collinear ? oy : oy + 7;   // halved offset (was +14) — sits closer to plane

      // V_rot arrow on the plane. When V_T is collinear we DIM V_rot's own label so
      // the two share one clean line; the U_T bracket names the net base instead.
      HLD.arrow(ctx, xRotTail, oy, tipX, oy, col.lift, 3, 9);
      if ((tipX - xRotTail) > 70) {
        // On the RETREATING side the V_i downwash arrow sits at xBase in the MIDDLE
        // of V_rot, so anchor the label hard against the TAIL (left) and left-align
        // it, well clear of V_i. On the ADVANCING side xBase is left of xRotTail so
        // a centred mid-span label is clear — place it toward the tip.
        if (Vt < 0) {
          // RETREATING: anchor V_rot's label hard against the far-left tail, above
          // the plane. The tiny V_i / V_n mini-labels near xBase are suppressed when
          // the AMP=2 stack is too short to label cleanly (see below), so this label
          // has the upper-left band to itself.
          HLD.chipLabel(ctx, 'V_rot', xRotTail + 6, oy - 14,
            col.lift, FV, 'left');
        } else {
          // advancing: centre over V_rot's own span but keep it off the tip so it
          // never runs into the α_i arc / V_rel label bunched at the tip.
          HLD.chipLabel(ctx, 'V_rot', xRotTail + (tipX - xRotTail) * 0.44, oy - 14,
            col.lift, FV, 'center');
        }
      }

      // V_T segment. HEAD marks the sign: subtract → head LEFT; add → head RIGHT.
      const xL = Math.min(xRotTail, xBase), xR = Math.max(xRotTail, xBase);
      if (Vt < 0) {
        HLD.arrow(ctx, xR, yVt, xL, yVt, vtCol, 3, 9);   // backward (subtracts)
      } else {
        HLD.arrow(ctx, xL, yVt, xR, yVt, vtCol, 3, 9);   // forward (adds)
      }
      if (!collinear) {
        // offset case: tie the segment back to the plane with light ticks
        HLD.dline(ctx, xRotTail, oy, xRotTail, yVt, col.grid, 1, [2, 3]);
        HLD.dline(ctx, xBase, oy, xBase, yVt, col.grid, 1, [2, 3]);
      }
      if (Math.abs(xBase - xRotTail) > 60) {
        // Advancing: V_T is collinear on the plane, so drop its label just BELOW
        // the plane (the space is free) — clear of the V_i arrow/label above-left.
        // Retreating: V_T sits below the plane, so the label goes further below it.
        const vtLy = collinear ? oy + 13 : yVt + 13;
        HLD.chipLabel(ctx, 'V_T', (xRotTail + xBase) / 2, vtLy, vtCol, FV, 'center');
      }

      // net U_T bracket BELOW the plane. Drop it clear of the offset V_T + its
      // label on the retreating side (which now occupy oy+7 … oy+20 after halving the
      // offset); on the advancing side V_T is collinear so the bracket can sit higher.
      const yBr = collinear ? oy + 30 : oy + 34;
      HLD.dline(ctx, xBase, yBr, tipX, yBr, col.ink, 1.5, [2, 3]);
      HLD.tick(ctx, xBase, yBr, 8, Math.PI / 2, col.ink, 1.5);
      HLD.tick(ctx, tipX, yBr, 8, Math.PI / 2, col.ink, 1.5);
      HLD.chipLabel(ctx, 'U_T', (xBase + tipX) / 2, yBr + 12,
        col.ink, FV, 'center');

      // ---- U_P = V_i + V_n + V_flap : the perpendicular through-disc flow, drawn
      // as THREE stacked segments at the base tail (above the plane). From the
      // plane UPWARD: V_i (induced downwash) → V_n (free-stream normal comp) →
      // V_flap (flapping-velocity term). Their common head sits ON the plane
      // (the tail of the in-plane base). The whole stack's TOP is where V_rel
      // begins, so as V_flap grows/shrinks the stack the V_rel slope — and hence
      // α — visibly changes. On the ADVANCING side v_flap ADDS (stack taller → φ
      // bigger → α smaller); on the RETREATING side v_flap SUBTRACTS (α bigger).
      const yTop  = oy - UP * AMP * sy;                  // top of the whole stack
      const yVi   = oy - v_i * AMP * sy;                 // top of V_i / base of V_n
      const yVn   = oy - (v_i + v_n) * AMP * sy;         // top of V_n / base of V_flap
      // V_i / V_n mini-labels go on the RIGHT of their vertical arrow. The U_P total
      // bracket now lives on the LEFT rail (xBase−40), so the right side of the stack is
      // the free lane. On the ADVANCING side xBase sits far LEFT, so the right lane is
      // wide open; on the RETREATING side the stack is short and these mini-labels are
      // suppressed by the LBL_MIN guard below, so they never crowd the airfoil.
      const viLx = xBase + 10;
      const viAlign = 'left';
      // With AMP = 2 the V_i and V_n segments are genuinely tiny (a handful of px),
      // so their mid-points fall almost ON the rotor plane / V_rot line. Labelling
      // such short segments always collides. So we only draw a mini-label when the
      // segment is tall enough to carry one cleanly (>= LBL_MIN px); otherwise the
      // colour-coded arrow speaks for itself and the exact value is in the readout
      // table below (V_i, V_n and V_flap are all listed there in m/s).
      const LBL_MIN = 13;
      // V_i segment (bottom): from yVi down to the plane
      HLD.arrow(ctx, xBase, yVi, xBase, oy, col.wind, 2.5, 8);
      if (showDetailLabels && (oy - yVi) >= LBL_MIN) {
        HLD.chipLabel(ctx, 'V_i', viLx, (yVi + oy) / 2, col.wind, FSM, viAlign);
      }
      // V_n segment (middle): from yVn up to yVi
      if (v_n > 1e-4) {
        HLD.arrow(ctx, xBase, yVn, xBase, yVi, col.accent, 2.5, 7);
        if (showDetailLabels && (yVi - yVn) >= LBL_MIN) {
          HLD.chipLabel(ctx, 'V_n', viLx, (yVn + yVi) / 2, col.accent, FSM, viAlign);
        }
      }
      // V_flap segment: the flapping-velocity term. Its ARROW shows the PHYSICAL
      // airflow direction the flapping induces, and its sign tells the stack what to do:
      //   • ADVANCING (v_flap>0, blade flaps UP): the section chases the downwash, so
      //     the induced flow it sees points DOWN — it ADDS to U_P. Drawn IN the stack,
      //     head DOWN, extending the stack up from yVn to yTop (taller → φ↑ → α↓).
      //   • RETREATING (v_flap<0, blade flaps DOWN): the section drops away from the
      //     downwash, so the induced flow it sees points UP — it SUBTRACTS from U_P.
      //     The physical airflow arrow must therefore point UP. We draw it as its OWN
      //     up-pointing arrow just to the SIDE of the stack (small offset, like V_T),
      //     spanning the amount it removes (from yVn up to yTop, which is ABOVE yVn).
      if (Math.abs(v_flap) > 1e-4) {
        const flCol = v_flap > 0 ? col.good : col.warn;
        if (v_flap > 0) {
          // adds (ADVANCING side): the up-flapping section sees MORE downward-relative
          // flow, so V_flap ADDS to U_P — it is part of the SAME downward through-disc
          // stack as V_i and V_n. So we draw it COLLINEAR, right ON the stack line
          // (no offset), tip-to-tail above V_n, head DOWN toward the plane — exactly
          // like V_i and V_n. yTop is ABOVE yVn (the stack grew), so tail=yTop →
          // head=yVn points DOWN. No offset ticks are needed since it sits on the line.
          HLD.arrow(ctx, xBase, yTop, xBase, yVn, flCol, 2.5, 7);
          // Label placement for the ADD case is constrained on BOTH sides: the V_rel
          // resultant runs DOWN-RIGHT from the stack top (xBase,yTop) to the tip, so
          // the RIGHT of the V_flap span is crossed by V_rel; and on the ADVANCING
          // side xBase sits far LEFT (short base), so a left-side label would run off
          // the canvas. So: when there is room on the left (base tail not near the
          // left margin) put the label LEFT, right-aligned, in the upper band (clear
          // of the lower V_i/V_n mini-labels). Otherwise (advancing, tight left) place
          // it just ABOVE the stack top by the U_P label, left-aligned, where V_rel
          // has not yet diverged from xBase.
          // Label ABOVE the stack top, centred on xBase. The U_P bracket is now on
          // the LEFT rail and V_rel leaves from (xBase,yTop) going down-right, so the
          // one clear spot for the add-case V_flap label is directly ABOVE the stack
          // top — above where V_rel starts, clear of the bracket and the shaft.
          const flTxt = 'V_flap';
          if (showDetailLabels) HLD.chipLabel(ctx, flTxt, xBase, yTop - 11, flCol,
            FSM, 'center', 'rgba(0,0,0,0.5)');
        } else {
          // subtracts: the down-flapping blade sees UPWARD induced flow, so the
          // PHYSICAL airflow arrow must point UP. yTop is BELOW yVn on the retreating
          // side (U_P shrank / went up-flow), so drawing tail=yTop (low) → head=yVn
          // (high) makes the head sit at the TOP = pointing UP, exactly the physical
          // upward flow the down-flapping section sees. It is drawn as its OWN arrow
          // just to the RIGHT of the stack with a SMALL offset (+6px, a touch less
          // than V_T's +7), tied back to the stack top/bottom with faint ticks like
          // V_T. The V_i/V_n labels are on the LEFT, so the whole right side is free.
          const flDx = 6;
          HLD.arrow(ctx, xBase + flDx, yTop, xBase + flDx, yVn, flCol, 2.5, 7);
          HLD.dline(ctx, xBase, yVn, xBase + flDx, yVn, col.grid, 1, [2, 3]);
          HLD.dline(ctx, xBase, yTop, xBase + flDx, yTop, col.grid, 1, [2, 3]);
          // Label ABOVE the arrow head, centred on the arrow's x. The U_P bracket
          // now sits on the RIGHT at xBase+28, so a right-side label would collide
          // with it; centring on the arrow (xBase+flDx) keeps the text spanning
          // roughly xBase−12..xBase+24 — clear of the bracket and above the plane
          // (yVn is above the plane in the subtract case, outside the bracket span).
          const flTxt = 'V_flap';
          if (showDetailLabels) HLD.chipLabel(ctx, flTxt, xBase + flDx, yVn - 8, flCol,
            FSM, 'center', 'rgba(0,0,0,0.5)');
        }
      }
      // ---- U_P total bracket — JUST LEFT of all vectors, never crossing them --------
      // The bracket sits clear-left of the vector tail (xBase). Its vertical dashed
      // line and its end-ticks point LEFTWARD only, so nothing reaches toward V_rot /
      // V_T. Height = true |U_P| (oy→yTop). Far enough left that the ticks clear the
      // arrowheads of the in-plane vectors.
      {
        // Place the bracket LEFT of the leftmost in-plane vector point so NO
        // horizontal vector crosses it. "Just left of ALL vectors."
        const xVecLeft = Math.min(xRotTail, xBase, tipX);
        const upGap = compact ? 14 : 20;
        const upBx = xVecLeft - upGap;
        const yA = Math.min(oy, yTop), yB = Math.max(oy, yTop);
        HLD.dline(ctx, upBx, yA, upBx, yB, col.ink, 1.5, [2, 3]);
        // explicit one-sided ticks pointing LEFT (never extend rightward into vectors)
        const tickLen = compact ? 6 : 8;
        HLD.dline(ctx, upBx - tickLen, yA, upBx, yA, col.ink, 1.5);
        HLD.dline(ctx, upBx - tickLen, yB, upBx, yB, col.ink, 1.5);
        const upLabelY = compact ? Math.min(H - 14, oy + 20) : (yA + yB) / 2;
        HLD.chipLabel(ctx, 'U_P', upBx - 10, upLabelY, col.wind, FSM,
          'right', 'rgba(13,17,23,0.92)');
      }

      // ---- V_rel resultant: tail at (xBase,yTop) → head at the airfoil tip (tipX,oy).
      // For net up-flow (φ<0, RET) yTop sits BELOW the plane; for down-flow it's above.
      // The exact V_rel slope is vrelAng = atan2(oy-yTop, tipX-xBase); the left-margin
      // angle callout uses rays PARALLEL to this slope (see angle-callout block below).
      HLD.arrow(ctx, xBase, yTop, tipX, oy, col.wind, 3, 10);
      // label on the V_rel shaft toward the TIP end (60% from tail) and lifted
      // above the line, clear of V_rot / V_i.
      // For φ<0 (net up-flow) the tail yTop is BELOW the plane and the U_T bracket
      // label sits centred in the mid-span just under the plane — exactly where the
      // shaft midpoint is. So for that case push the V_rel label UP toward the tip
      // (70% from tail, near the plane) and to the right, well clear of the U_T
      // bracket. Normal case keeps the mid-shaft spot.
      const vrFrac = netUpflow ? 0.40 : 0.45;
      const vrx = xBase + (tipX - xBase) * vrFrac, vry = yTop + (oy - yTop) * vrFrac;
      if (!compact) {
        HLD.chipLabel(ctx, 'V_rel', vrx + (netUpflow ? 4 : -6), vry - 12, col.wind,
          FVrel, 'center');
      }

      // The angle arcs (θ, α, φ) are drawn as a TRANSLATED CALLOUT in the reserved
      // LEFT ANNOTATION LANE — rays PARALLEL to the real TPP / chord / V_rel — NOT at
      // the airfoil leading edge (see angle-callout block in the airfoil section below).
      HLD.dot(ctx, tipX, oy, 3.5, col.ink);

      // ================= AIRFOIL AT THE TIP (integrated in the triangle) =========
      // The blade SECTION is drawn RIGHT AT THE TIP where V_rel lands, exactly as in
      // the sketch. The ACTIVE section (current r/R) is WHITE and filled. Its drawn
      // pitch θ(r) tracks the −8° washout twist as you sweep r/R, and the readout
      // prints the true θ/φ/α, so the twist story is carried by the single active section.
      //
      // ONE angle model: canvas angle 0 = +x (right, toward the TE), positive = CW
      // = DOWN on screen. Leading edge on the LEFT (so V_rel meets the nose head-on).
      //   • chord (LE→TE) sits at the DRAWN pitch angle below the rotor plane,
      //   • V_rel (=φ) sits just ABOVE the chord; the opening between them is α=θ−φ.
      // True angles are only a few degrees, so we EXAGGERATE for readability while
      // every LABEL shows the TRUE value — identical policy to the old inset.
      if (!reverse) {
        // Airfoil chord scales with the stage so it stays proportional to the now
        // full-width triangle (was a fixed 78px, tiny on the big canvas).
        const foilLen = Math.max(78, Math.min(rightPad * 0.8, 150));   // drawn chord length (px)
        // DISPLAY scale: map true pitch° → drawn°, clamped so the fan is legible.
        const pitchDisp = (thetaDeg) => Math.sign(thetaDeg || 1) *
          Math.max(4, Math.min(30, Math.abs(thetaDeg) * 2.0)) * D2R;
        // LE origin: a little UP-and-RIGHT of the tip so the section sits on the
        // common head, in the free space lower-right of the triangle.
        const lex = tipX + 6, ley = oy - 2;
        const naca = HLD.nacaProfile(0.12, 56);
        const drawFoilAt = (leX, leY, len, drawnPitch, style) => {
          const u = { x: Math.cos(drawnPitch), y: Math.sin(drawnPitch) };  // LE→TE
          const n = { x: -u.y, y: u.x };                                   // chord normal
          ctx.save(); ctx.globalAlpha = style.alpha;
          ctx.beginPath();
          naca.forEach((p, i) => {
            const along = p.x * len, thick = p.y * len;
            const X = leX + along * u.x + thick * n.x;
            const Y = leY + along * u.y + thick * n.y;
            if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          ctx.closePath();
          if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
          ctx.strokeStyle = style.stroke; ctx.lineWidth = style.w || 1.5; ctx.stroke();
          ctx.restore();
          return u;
        };

        // ---- ACTIVE section (current r/R) — WHITE, filled, on top -----------------
        const uCh = drawFoilAt(lex, ley, foilLen, pitchDisp(theta * R2D), {
          stroke: stalled ? col.bad : '#ffffff',
          fill: stalled ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.10)',
          alpha: 1, w: 2.2,
        });
        // chord line through the active section (dim white) + label
        HLD.dline(ctx, lex, ley, lex + foilLen * 1.02 * uCh.x, ley + foilLen * 1.02 * uCh.y,
          '#d8d8dc', 1.5, [4, 3]);
        // (the 'chord' text label is intentionally omitted — the dashed line through
        // the airfoil is self-evident, and the label kept clipping the right edge.)
        // Chord line EXTENDED LEFT from the LE (incoming side) — the textbook
        // convention the students learn: the chord is one long reference line, drawn
        // THROUGH the airfoil and extended back into the incoming-flow region so the
        // angle arcs (θ, α) read on the LEFT of the airfoil. Direction = backward along
        // the chord (−uCh = up-left for a nose-up section).
        // extLen must be long enough that the θ/α arcs (centred at the LE, opening
        // left) can reach their target stations without clamping back to the LE.
        const extLen = Math.max(foilLen * 2.4, 180, (lex - 24) / Math.max(0.25, uCh.x));
        HLD.dline(ctx, lex, ley,
          lex - extLen * uCh.x, ley - extLen * uCh.y,
          '#d8d8dc', 1.5, [4, 3]);

        // ---- ANGLE ARCS — both centred on the REAL airfoil LE/chord anchor ---------
        // Per the instructor's sketch: the arcs use the REAL chord line (the long dashed
        // line through the airfoil), NOT separate little reference rays. Both arcs are
        // centred at the airfoil LE (lex,ley) — the true point where chord & V_rel meet —
        // with a radius chosen so the VISIBLE arc lands where the sketch wants it:
        //   - theta  arc visible far-LEFT (around the U_P bracket), spanning TPP-parallel to chord.
        //   - alpha  arc visible at ~50% of U_T (mid-base), spanning V_rel-parallel to chord.
        // Because the arcs are centred at the LE and use the real chord direction, they
        // read along the actual chord line; the radius only slides the visible arc along
        // it. True deg values in the labels/readout. (phi stays in the readout only.)
        const MIN_ARC = 0.02;
        const pitchD = pitchDisp(theta * R2D);
        const vrelAng = Math.atan2(oy - yTop, tipX - xBase);   // drawn V_rel shaft slope
        const aCol = stalled ? col.bad : col.good;
        const thetaDeg = theta * R2D, phiDeg = phi * R2D, aoaDeg = aoa * R2D;
        const deg = (v) => (v >= 0 ? '' : '\u2212') + Math.abs(v).toFixed(0) + '\u00b0';
        // Backward ray angles (open to the left / incoming side, +pi).
        const tppL = Math.PI, chordL = pitchD + Math.PI, vrelL = vrelAng + Math.PI;
        // θ is "too small to arc" only when the drawn pitch is near zero. NOTE: this
        // does NOT suppress α — α has its own arc+label below, drawn whenever its span
        // is big enough, independent of θ. (Previously a single fanDegenerate flag
        // killed the α label on TAIL/ADV, dumping α into the far-left text stack.)
        const thetaTooSmall = Math.abs(pitchD) < MIN_ARC;

        // Arc centre = the real airfoil LE (where chord & V_rel actually meet).
        const aCx = lex, aCy = ley;
        // Pick a radius so the arc's mid-angle point lands at a target x (slides the
        // visible arc along the real chord/V_rel directions to the wanted station).
        const radiusToX = (targetX, midAng, minR, maxR) => {
          const c = Math.cos(midAng);
          if (Math.abs(c) < 1e-3) return minR;
          const r = (targetX - aCx) / c;
          return Math.max(minR, Math.min(maxR, Number.isFinite(r) && r > 0 ? r : minR));
        };

        // -- theta: visible far-left (just left of the U_P bracket). Arc TPP to chord. --
        const upBx = Math.min(xRotTail, xBase, tipX) - (compact ? 14 : 20);
        const thetaTargetX = Math.max(24, upBx - 16);
        const thetaMid = tppL + (chordL - tppL) / 2;
        const thR = radiusToX(thetaTargetX, thetaMid, 24, extLen - 8);
        if (Math.abs(pitchD) >= MIN_ARC) {
          ctx.save(); ctx.strokeStyle = col.chord; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(aCx, aCy, thR,
            Math.min(tppL, chordL), Math.max(tppL, chordL), false);
          ctx.stroke(); ctx.restore();
          const thLab = tppL + (chordL - tppL) * 0.70;
          HLD.chipLabel(ctx, '\u03b8=' + deg(thetaDeg),
            aCx + thR * Math.cos(thLab), aCy + thR * Math.sin(thLab),
            col.chord, FV, 'center', 'rgba(13,17,23,0.85)');
        }

        // -- alpha: visible at ~50% of U_T (midpoint of the in-plane base). Arc V_rel to chord. --
        // Radius chosen so the arc's CHORD endpoint lands at mid-base. cos(chordL) is
        // stable (pitch is clamped, never near-vertical), so this never clamps to the LE.
        const alphaTargetX = xBase + 0.5 * (tipX - xBase);
        const a0 = Math.min(vrelL, chordL), a1 = Math.max(vrelL, chordL);
        const aR = radiusToX(alphaTargetX, chordL, compact ? 18 : 22, extLen - 8);
        const posAlpha = aoaDeg > 0.5;
        if ((a1 - a0) >= MIN_ARC) {
          ctx.save(); ctx.strokeStyle = aCol; ctx.lineWidth = posAlpha ? 1.8 : 1.2;
          if (!posAlpha) ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(aCx, aCy, aR, a0, a1, false); ctx.stroke(); ctx.restore();
        }
        if ((a1 - a0) >= MIN_ARC) {
          const aLab = a0 + (a1 - a0) * 0.55;
          HLD.chipLabel(ctx, '\u03b1=' + deg(aoaDeg),
            aCx + (aR + 12) * Math.cos(aLab), aCy + (aR + 12) * Math.sin(aLab),
            aCol, FV, 'center', 'rgba(13,17,23,0.82)');
        }

        // θ-too-small fallback: when the pitch arc itself collapses (θ≈0, e.g. ADV),
        // print θ and φ as a tidy 2-line stack at the far-left station. α is NOT
        // duplicated here — it always renders as its own arc at mid-base above.
        if (thetaTooSmall) {
          const sx2 = Math.max(28, thetaTargetX - 30);
          const sy2 = Math.max(16, Math.min(oy - 44, H - 60));
          const line = (s, y) => HLD.chipLabel(ctx, s, sx2, y, col.ink, FV,
            'left', 'rgba(13,17,23,0.7)');
          line('\u03b8=' + deg(thetaDeg), sy2);
          line('\u03c6=' + deg(phiDeg), sy2 + 16);
        }
      } else {
        HLD.chipLabel(ctx, 'reverse flow — α undefined', tipX - 140, oy - 40,
          col.bad, FV, 'left', 'rgba(248,113,113,0.15)');
      }


      // reverse-flow flag
      if (reverse) {
        HLD.chipLabel(ctx, '⚠ reverse flow (U_T < 0)', 24, 20, col.bad,
          FV, 'left', 'rgba(248,113,113,0.15)');
      } else if (netUpflow) {
        // Net UP-flow through the disc: the down-flapping retreating blade's V_flap
        // has overwhelmed V_i+V_n, so V_rel now arrives FROM BELOW the TPP (φ<0,
        // α grows). Flag it so the student sees WHY α deepens on the retreating side.
        // Short chip pinned TOP-LEFT (out of the triangle's way); the full sentence
        // is in the readout "Model note".
        HLD.chipLabel(ctx, '↑ net up-flow (U_P < 0)', 24, 20, col.warn,
          FV, 'left', 'rgba(214,158,46,0.15)');
      }

      // NOTE: the interactive ENVELOPE rotor-map used to live in this canvas's
      // top-right corner. It now has its OWN wide canvas stacked ABOVE this one
      // (see drawMap() below) so the vector triangle can use the full panel width
      // and both stay readable on mobile. The map is still live + clickable.

      // ---- readout -----------------------------------------------------------
      const side = psiDeg > 180 && psiDeg < 360 ? 'retreating' : (psiDeg > 0 && psiDeg < 180 ? 'advancing' : (psiDeg === 0 ? 'over tail' : 'over nose'));
      // envelope verdict banner — the headline the student reads first, driven by
      // the SAME model as the disc map so it matches the previous page cell-for-cell.
      const banner = `<div style="margin:0 0 8px;padding:7px 10px;border-radius:6px;
        font-weight:700;text-align:center;color:#fff;background:${verdict.c};
        letter-spacing:.02em">${verdict.t}</div>`;
      ui.readout.innerHTML = banner + kv([
        ['Azimuth ψ', psiDeg.toFixed(0) + '°  (' + side + ')', 'var(--hl-ink)'],
        ['V_rot = Ω·r', VrotMS.toFixed(0) + ' m/s', 'var(--hl-lift)'],
        ['V_T = μ·sinψ', (VtMS >= 0 ? '+' : '') + VtMS.toFixed(0) + ' m/s', Vt < 0 ? 'var(--hl-bad)' : 'var(--hl-accent)'],
        ['U_T (net in-plane)', UTMS.toFixed(0) + ' m/s', reverse ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['&nbsp;&nbsp;V_i = λ_i·ΩR (induced ↓)', ViMS.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['&nbsp;&nbsp;V_n = V·sinα_TPP (free-stream ↓)', VnMS.toFixed(1) + ' m/s', 'var(--hl-accent)'],
        ['&nbsp;&nbsp;V_flap = r·β̇ (' + (v_flap > 0 ? 'adds, α↓' : v_flap < 0 ? 'subtracts, α↑' : '≈0') + ')',
          (VflapMS >= 0 ? '+' : '') + VflapMS.toFixed(1) + ' m/s', v_flap > 0 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['U_P = V_i + V_n + V_flap (↓)', UPMS.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['V_rel', VrelMS.toFixed(0) + ' m/s', 'var(--hl-wind)'],
        ['θ pitch', (theta * R2D).toFixed(1) + '°', 'var(--hl-chord)'],
        ['φ inflow angle', (phi * R2D).toFixed(1) + '°', 'var(--hl-wind)'],
        ['α = θ − φ', reverse ? 'n/a (reverse)' : (aoa * R2D).toFixed(1) + '° / ' + stt.stallAoA.toFixed(0) + '°',
          stalled ? 'var(--hl-bad)' : 'var(--hl-good)'],
        ['α vs critical (map model)', cellReverse ? 'n/a (reverse)'
          : cellAoAdeg.toFixed(1) + '° / ' + stallEffDeg.toFixed(1) + '°  (' + pctCrit.toFixed(0) + '%)',
          cellStalled ? 'var(--hl-bad)' : (cellNear ? 'var(--hl-warn)' : 'var(--hl-good)')],
      ]) + `<p class="hl-note"><b>Reading the envelope with the BET:</b> the coloured
        mini-disc (top-right) is the SAME stall map as the previous page —
        <b>click any cell</b> (or drag the ψ / r/R sliders) and this triangle
        rebuilds for that exact blade section. The verdict banner above uses the
        identical critical-α + airload model as the map, so a <b style="color:var(--hl-bad)">red</b>
        cell always reads <b>STALLED</b> here and a <b style="color:var(--hl-accent)">purple</b>
        cell reads <b>REVERSE FLOW</b>. That is how the retreating stall is built,
        vector by vector.</p>
        <p class="hl-note">On the <b>retreating</b> side (ψ=270°) the forward-flow
        term <b style="color:var(--hl-bad)">V_T</b> points <b>backward</b>, so it is
        <b>subtracted</b> from <b style="color:var(--hl-lift)">V_rot</b> — the net
        <b>U_T</b> is short and the blade must fly at a high <b>α</b> to keep its
        lift. On the advancing side V_T adds instead. Drag the azimuth to watch
        V_T flip from adding to subtracting. The <b>white airfoil</b> at the tip is
        the LIVE section at this ψ / r/R; its drawn pitch θ(r) tracks the −8°
        washout as you sweep the blade station — toggle <b>twist off</b> to see it
        swing to one untwisted pitch.</p>
        <p class="hl-note"><b>Why the flapping term matters:</b> a blade flapping
        <b>up</b> (the <b>advancing</b> side) drives its own section upward through
        the air, so <b style="color:var(--hl-good)">V_flap</b> ADDS to U_P — φ
        grows and <b>α shrinks</b>. On the <b>retreating</b> side the blade flaps
        <b>down</b>, <b style="color:var(--hl-warn)">V_flap</b> SUBTRACTS and
        <b>α grows</b>. This is flapping-to-equality: watch the V_flap segment on
        top of the U_P stack push the V_rel tail up (advancing) or pull it down
        (retreating), moving the whole α wedge. In a fully <b>trimmed level</b>
        disc the cyclic cancels this (V_flap≈0, U_P≈V_i+V_n) — here we show the
        NATURAL blowback so the term is visible.</p>
        <p class="hl-note"><b>The perpendicular flow U_P (Leishman, combined
        momentum + blade-element theory):</b><br>
        <span style="font-family:var(--hl-mono,monospace);white-space:nowrap">
        U_P = <b style="color:var(--hl-wind)">λ_i·ΩR</b>
        + <b style="color:var(--hl-accent)">V·sinα_TPP</b>
        + <b style="color:var(--hl-lift)">r·β̇</b> + …</span><br>
            <b style="color:var(--hl-wind)">induced</b>  
        <b style="color:var(--hl-accent)">climb / normal free-stream</b>  
        <b style="color:var(--hl-lift)">flapping</b><br>
        Here we draw all three: <b style="color:var(--hl-wind)">V_i</b> = the
        induced downwash (large in hover, <b>decays</b> with speed),
        <b style="color:var(--hl-accent)">V_n</b> = the normal component of the
        forward free-stream (<b>grows</b> with speed), and
        <b style="color:var(--hl-good)">r·β̇</b> = the flapping-velocity term
        (signed — <b>adds</b> advancing, <b>subtracts</b> retreating). V_i and V_n
        act <b>down through the disc</b> so their sum <b>dips</b> around V_BROC
        (translational lift) then rises again; V_flap then tilts it per azimuth.
        The inflow angle <b>φ = arctan(U_P / U_T)</b> is therefore the
        small positive depression of <b style="color:var(--hl-wind)">V_rel</b> below
        the rotor plane, and <b>α = θ − φ</b>. U_P is drawn ×${AMP} for visibility —
        its direction and the resulting α are exact.</p>
        <p class="hl-note" style="border-left:0;opacity:.9"><b>Model note — uniform
        inflow:</b> this BET uses a <b>uniform induced inflow</b> (V_i taken
        spanwise-constant), the standard exam simplification. Real rotors shed
        <b>tip vortices</b> that add extra downwash near the tip, so the induced
        flow there is larger than shown. Consequently the swing to
        <b style="color:var(--hl-warn)">net up-flow (U_P &lt; 0, V_rel from below the
        TPP)</b> on the retreating tip appears <b>earlier and stronger</b> in this
        uniform model than in reality — in a real rotor the extra tip downwash
        delays and softens it. The large retreating-tip <b>α</b> itself is still
        correct (retreating-blade stall does begin at the tip); it is specifically
        the <b>U_P &lt; 0 reversal</b> that a uniform-inflow model over-drives.</p>`;

      // ---- ROTOR-MAP (own top canvas) ---------------------------------------
      // Draw the live, clickable envelope disc on its OWN wide canvas above the
      // triangle. Uses the SAME model + airload gate as wEnvelope so it matches
      // the previous page cell-for-cell. Centred; radius scales with the strip.
      drawMap();
    };

    // Separate draw pass for the top rotor-map canvas. Shares draw()'s locals via
    // closure is NOT possible (drawMap is called from inside draw, so we recompute
    // the few state values it needs here to stay self-contained and correct).
    function drawMap() {
      const mc = ui.topCanvas; if (!mc) return;
      const { ctx, W, H, col } = HLD.setup(mc);
      HLD.clear(ctx, W, H, col);
      const st = HL.defaultState();
      if (!twistOn) st.twist = 0;
      st.V = Vkt * 0.5144;
      const stt = trimmed(st);
      const c   = flappingCoeffs(stt);
      const psi = psiDeg * D2R;
      const mu  = advanceRatio(stt);
      const Q_MIN = discModel === 'exam' ? 0.40 : 0.25;
      // Disc centred vertically; radius from the smaller of (h/2) and a share of
      // width, so it never overflows the strip on any aspect ratio.
      // Nudge the disc centre DOWN a touch so the title above + N label have room,
      // and keep the ring clear of the strip edges. The BET lesson now uses the
      // standard (square-ish) canvas column, so size the disc from BOTH dims and
      // let it grow toward the smaller half-dimension — not a small width fraction.
      const cxC = W / 2, cyC = H / 2 + 6;
      const rC  = Math.max(38, Math.min(H / 2 - 40, W / 2 - 46));
      discHit = { cx: cxC, cy: cyC, r: rC };            // hit-box for the click handler
      const fs = Math.max(9, Math.min(12, W / 70));
      const FL = fs.toFixed(1) + 'px IBM Plex Sans, sans-serif';
      // Title pinned to the very top-left (out of the disc's way); the live ψ/rR
      // reading pinned top-right — neither can collide with the N label or the ring.
      HLD.text(ctx, 'ENVELOPE MAP — click / drag to pick a blade section',
        12, 15, col.dim, FL, 'left');
      const nrD = 8, npD = 48, rMinD = 0.2;
      for (let ir = 0; ir < nrD; ir++) {
        const r0 = rMinD + (1 - rMinD) * ir / nrD, r1 = rMinD + (1 - rMinD) * (ir + 1) / nrD;
        for (let ip = 0; ip < npD; ip++) {
          const p0 = (ip / npD) * 2 * Math.PI, p1 = ((ip + 1) / npD) * 2 * Math.PI;
          const pmD = (p0 + p1) / 2, rmD = (r0 + r1) / 2;
          const dd = localAoAmodel(stt, c, rmD, pmD, discModel);
          const se = stallEffAt(st, dd.UT);
          const qs = airloadConf(dd.UT, mu).qShare;
          if (dd.reverseFlow) { ctx.fillStyle = 'rgba(180,60,200,0.55)'; }
          else {
            const conf = Math.min(1, qs / Q_MIN);
            const pct = (dd.aoa * R2D / se) * conf;
            ctx.globalAlpha = 0.35 + 0.55 * qs;
            ctx.fillStyle = aoaColor(pct * st.stallAoA, st.stallAoA);
          }
          ctx.beginPath();
          ctx.arc(cxC, cyC, rC * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
          ctx.arc(cxC, cyC, rC * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cxC, cyC, rC, 0, 2 * Math.PI); ctx.stroke();
      HLD.dot(ctx, cxC, cyC, 2.5, col.dim);
      HLD.text(ctx, 'N (nose)', cxC, cyC - rC - 6, col.dim, FL, 'center');
      HLD.text(ctx, 'A (adv)', cxC + rC + 8, cyC + 3, col.dim, FL, 'left');
      HLD.text(ctx, 'R (ret)', cxC - rC - 8, cyC + 3, col.dim, FL, 'right');
      HLD.text(ctx, 'T (tail)', cxC, cyC + rC + 14, col.dim, FL, 'center');
      // crosshair at the selected cell: x=sinψ, y=cosψ (canvas +y down).
      const bx = Math.sin(psi), by = Math.cos(psi);
      const mrx = cxC + rC * rBar * bx, mry = cyC + rC * rBar * by;
      const dCellM = localAoAmodel(stt, c, rBar, psi, discModel);
      const cellRev = dCellM.reverseFlow;
      const cellStl = (dCellM.aoa * R2D) >= stallEffAt(st, dCellM.UT);
      ctx.strokeStyle = col.ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cxC, cyC); ctx.lineTo(cxC + rC * bx, cyC + rC * by); ctx.stroke();
      HLD.dot(ctx, mrx, mry, 6, (cellRev || cellStl) ? col.bad : col.chord);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mrx, mry, 6, 0, 2 * Math.PI); ctx.stroke();
      HLD.chipLabel(ctx, 'ψ=' + psiDeg.toFixed(0) + '°   r/R=' + rBar.toFixed(2),
        W - 12, 15, col.chord, FL, 'right');
    }

    segmented(ui.controls, {
      label: 'Jump to azimuth', val: 'ret', options: [
        { v: 'adv', t: 'ADV 90°' }, { v: 'ret', t: 'RET 270°' },
        { v: 'nose', t: 'NOSE 180°' }, { v: 'tail', t: 'TAIL 0°' },
      ], on: v => {
        psiDeg = ({ adv: 90, ret: 270, nose: 180, tail: 0 })[v];
        psiSl.set(psiDeg); draw();
      },
    });
    const psiSl = slider(ui.controls, {
      label: 'Azimuth ψ', min: 0, max: 360, step: 1, val: psiDeg, unit: '°',
      on: v => { psiDeg = v; draw(); },
    });
    const rSl = slider(ui.controls, {
      label: 'Blade station r/R', min: 0.2, max: 1.0, step: 0.01, val: rBar, unit: '',
      fmt: v => (+v).toFixed(2), on: v => { rBar = v; draw(); },
    });
    slider(ui.controls, {
      label: 'Forward speed', min: 0, max: 160, step: 1, val: Vkt, unit: ' kt',
      on: v => { Vkt = v; draw(); },
    });
    segmented(ui.controls, {
      label: 'Stall model (matches disc map)', val: discModel, options: [
        { v: 'exam', t: 'No twist (exam)' }, { v: 'real', t: 'With twist (real)' },
      ], on: v => { discModel = v; draw(); },
    });
    toggle(ui.controls, {
      label: 'Blade twist on (−8° washout)', val: twistOn,
      on: v => { twistOn = v; draw(); },
    });

    // ---- interactive mini-envelope: click / drag on the disc to pick a section
    // Maps a canvas point inside the disc hit-box back to (ψ, r/R) using the same
    // convention as the crosshair: ψ=0 TAIL(bottom), 90 ADV(right), 180 NOSE(top),
    // 270 RET(left); x=sinψ, y=cosψ with canvas +y down.
    const mapCanvas = ui.topCanvas || ui.canvas;    // rotor-map lives on the top canvas now
    const pickFromEvent = (ev) => {
      if (!discHit) return false;
      const rect = mapCanvas.getBoundingClientRect();
      // canvas backing store may be scaled vs CSS pixels — convert to canvas coords
      const scaleX = mapCanvas.width / rect.width, scaleY = mapCanvas.height / rect.height;
      const px = (ev.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
      const py = (ev.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);
      const dx = px - discHit.cx, dy = py - discHit.cy;
      const dist = Math.hypot(dx, dy);
      if (dist > discHit.r * 1.12) return false;                 // click outside the disc
      // ψ from atan2: x=sinψ, y=cosψ  →  ψ = atan2(dx, dy)
      let psiRad = Math.atan2(dx, dy);
      let pd = psiRad * R2D; if (pd < 0) pd += 360;
      psiDeg = Math.round(pd);
      rBar = Math.max(0.2, Math.min(1.0, dist / discHit.r));
      psiSl.set(psiDeg); rSl.set(+rBar.toFixed(2));
      draw();
      return true;
    };
    let dragging = false;
    mapCanvas.style.cursor = 'crosshair';
    mapCanvas.addEventListener('pointerdown', (ev) => {
      if (pickFromEvent(ev)) { dragging = true; mapCanvas.setPointerCapture?.(ev.pointerId); ev.preventDefault(); }
    });
    mapCanvas.addEventListener('pointermove', (ev) => { if (dragging) { pickFromEvent(ev); ev.preventDefault(); } });
    mapCanvas.addEventListener('pointerup', () => { dragging = false; });
    mapCanvas.addEventListener('pointercancel', () => { dragging = false; });

    ui.onDraw(draw);
  }

  /* =========================================================================
     wCoriolis — lead/lag hunting from flapping (angular-momentum)
     top-view disc + in-plane lead/lag angle around azimuth
     ========================================================================= */
  function wCoriolis(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let Vkt = 80, articulated = true, psiDeg = 90;
    // Coriolis in-plane hunting is driven by the FLAP RATE β̇ (accel ∝ 2·Ω·β·β̇).
    // As the blade flaps UP (β̇>0, advancing→nose) its CoM moves in → it speeds
    // up and LEADS; flapping DOWN (β̇<0, nose→retreating) it moves out and LAGS.
    // So the hunting angle ζ(ψ) tracks β̇(ψ): positive lead while rising, negative
    // lag while falling. A drag hinge lets it hunt (large ζ); an underslung head
    // sits below the flap axis so the CoM barely shifts radially → ζ almost gone.
    const betaDot = (c, psi) => {                    // dβ/dψ  (rad per rad)
      // engine: β = a0 + a1c·cosψ + a1s·sinψ  ⇒  β̇ = −a1c·sinψ + a1s·cosψ
      return -c.a1c * Math.sin(psi) + c.a1s * Math.cos(psi);
    };
    const zetaOf = (c, psi, art) => {
      const bd = betaDot(c, psi);                    // rad/rad — sign = rising/falling
      const gain = art ? 0.85 : 0.12;                // articulated hunts freely; underslung ~cancelled
      return bd * gain;                              // rad (exaggerated for teaching)
    };
    const draw = () => {
      st.V = Vkt * 0.5144;
      const c = flappingCoeffs(st);
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.40, cy = W < 420 ? H * 0.56 : H * 0.52, R = Math.min(W * 0.30, H * 0.40);
      // colour the disc by lead(+ green)/lag(− purple) hunting angle
      HLD.discPolar(ctx, cx, cy, R, (psi) => {
        const z = zetaOf(c, psi, articulated);
        const t = Math.max(-1, Math.min(1, z / 0.09));
        if (t >= 0) return `rgba(${Math.round(80 - 20 * t)},${Math.round(180 + 40 * t)},${Math.round(110 - 30 * t)},${0.35 + 0.5 * t})`;
        return `rgba(${Math.round(150 - 30 * t)},70,${Math.round(190 + 10 * t)},${0.35 + 0.5 * (-t)})`;
      }, col, { V: st.V });
      // draw the actual blade: nominal radial line rotated by ζ (in-plane hunt)
      const psi = psiDeg * D2R;
      const z = zetaOf(c, psi, articulated);
      // undisplaced (dashed) vs hunting (solid) blade
      const pr0 = HLD.polarToCanvas(psi);
      const prZ = HLD.polarToCanvas(psi + z);        // +ζ leads (ahead in rotation)
      HLD.dline(ctx, cx, cy, cx + R * Math.cos(pr0), cy + R * Math.sin(pr0), col.dim, 1.4, [4, 3]);
      HLD.arrow(ctx, cx, cy, cx + R * Math.cos(prZ), cy + R * Math.sin(prZ),
        z >= 0 ? col.good : 'rgba(180,60,200,0.95)', 3, 9);
      // small curved arrow indicating lead (CCW-ahead) or lag
      HLD.dot(ctx, cx, cy, 3, col.ink);
      const beta = flappingAngle(c, psi) * R2D;
      // lead/lag angle ζ(ψ) plot along the bottom
      const pts = [];
      for (let i = 0; i <= 72; i++) { const p = (i / 72) * 2 * Math.PI; pts.push({ x: i * 5, y: zetaOf(c, p, articulated) * R2D }); }
      const ys = pts.map(p => p.y); const ay = Math.max(1, Math.max(...ys.map(Math.abs)));
      const px = W * 0.66, pw = W * 0.32, py = H * 0.14, ph = H * 0.72;
      // mini-axes
      HLD.dline(ctx, px, py + ph / 2, px + pw, py + ph / 2, col.grid, 1, [3, 3]);
      HLD.text(ctx, 'lead / lag ζ(ψ)', W < 420 ? px : px + pw / 2, W < 420 ? py - 10 : py - 4, col.dim, (W < 420 ? '9px ' : '10px ') + 'IBM Plex Sans', W < 420 ? 'left' : 'center');
      HLD.text(ctx, '+lead', px, py + 8, col.good, '9px IBM Plex Sans', 'left');
      HLD.text(ctx, '−lag', px, py + ph - 4, '#c060d0', '9px IBM Plex Sans', 'left');
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((p, i) => { const xx = px + (p.x / 360) * pw, yy = py + ph / 2 - (p.y / ay) * (ph / 2 - 6); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
      const zx = px + (psiDeg / 360) * pw, zy = py + ph / 2 - (zetaOf(c, psi, articulated) * R2D / ay) * (ph / 2 - 6);
      HLD.dot(ctx, zx, zy, 4, col.ink);
      const zDeg = z * R2D;
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Head type', articulated ? 'Articulated (lead–lag hinge)' : 'Underslung (teetering/rigid)', 'var(--hl-accent)'],
        ['Flap β at ψ=' + psiDeg.toFixed(0) + '°', beta.toFixed(1) + '°', 'var(--hl-lift)'],
        ['Hunting ζ at ψ=' + psiDeg.toFixed(0) + '°', (zDeg >= 0 ? '+' : '') + zDeg.toFixed(2) + '° ' + (zDeg >= 0 ? '(lead)' : '(lag)'),
          zDeg >= 0 ? 'var(--hl-good)' : '#c060d0'],
      ]) + `<p class="hl-note">Coriolis: as the blade flaps <b>up</b> its mass moves
        <b>in</b> toward the shaft, so it <b>speeds up and leads</b>; flapping down it
        moves out and <b>lags</b> — angular momentum, the ice-skater. Acceleration ∝
        <b>2·Ω·β·β̇</b>. ${articulated
          ? 'This articulated head has a <b>lead–lag hinge + damper</b> so the blade hunts freely (large ζ shown).'
          : 'This <b>underslung</b> head sits below the flapping axis so the CoM barely shifts radially — the Coriolis hunting is almost cancelled (tiny ζ).'}</p>`;
    };
    slider(ui.controls, { label: 'Forward speed', min: 0, max: 160, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    slider(ui.controls, { label: 'Azimuth ψ (blade position)', min: 0, max: 355, step: 5, val: psiDeg, unit: '°', fmt: v => v.toFixed(0), on: v => { psiDeg = v; draw(); } });
    segmented(ui.controls, {
      label: 'Rotor head',
      options: [{ v: true, t: 'Articulated (hinge)' }, { v: false, t: 'Underslung' }],
      val: articulated, on: v => { articulated = v; draw(); },
    });
    ui.onDraw(draw);
  }

  /* =========================================================================
     wDynamicRollover — front view heli pivoting about a ground contact point
     bank slider; restoring moment flips to a divergent rolling moment past ψ_crit
     ========================================================================= */
  function wDynamicRollover(host) {
    const ui = scaffold(host);
    let bankDeg = 3, collPct = 85;   // collective sets thrust ≈ T/W
    // critical angle where driving moment overtakes the restoring moment:
    //   T·sinφ·h  =  W·(c·cosφ − v·sinφ)   ⇒  solve for φ given the geometry
    const criticalDeg = (tw) => {
      const c = 0.7, v = 1.2, h = 3.0;                 // same geometry as below (m)
      for (let d = 0; d <= 20; d += 0.1) {
        const p = d * D2R;
        if (tw * Math.sin(p) * h > c * Math.cos(p) - v * Math.sin(p)) return d;
      }
      return 20;
    };
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 32);
      // T/W from collective (0..100% → θ₀ 4..15°)
      const st = HL.defaultState(); st.theta0 = 4 + (collPct / 100) * 11;
      const tw = HL.axialSolve(st, 0).thrust / HL.weightN(st);
      const phi = bankDeg * D2R;
      // ground line
      const gy = H * 0.78;
      HLD.dline(ctx, 0, gy, W, gy, col.dim, 2, [1, 0]);
      HLD.hatchRect(ctx, 0, gy, W, 10, col.grid, 8, Math.PI / 4);
      // pivot = the down-slope skid contact point
      const pvx = W * 0.42, pvy = gy;
      HLD.dot(ctx, pvx, pvy, 5, col.warn);
      HLD.text(ctx, 'pivot (skid on ground)', pvx, pvy + 22, col.warn, '10px IBM Plex Sans', 'center');
      // helicopter body: rotate the whole airframe about the pivot by φ
      const bodyLen = Math.min(W * 0.34, 190), bodyH = 26, cgH = 46, mastH = 78;
      const rot = (dx, dy) => ({ x: pvx + dx * Math.cos(phi) - dy * Math.sin(phi), y: pvy + dx * Math.sin(phi) - dy * Math.cos(phi) });
      // (dx,dy) in body frame: +dx toward the raised skid (right), +dy up
      const skidR = rot(bodyLen, 0);      // raised skid tip
      const cgP = rot(bodyLen * 0.5, cgH);
      const mastP = rot(bodyLen * 0.5, cgH + mastH);
      // fuselage box (from pivot skid to raised skid)
      ctx.strokeStyle = col.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      const p1 = rot(0, 0), p2 = rot(bodyLen, 0), p3 = rot(bodyLen, bodyH), p4 = rot(0, bodyH);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.stroke();
      // mast
      HLD.dline(ctx, cgP.x, cgP.y, mastP.x, mastP.y, col.dim, 3, [1, 0]);
      // rotor disc (perpendicular to mast → tilts with the airframe)
      const dR = bodyLen * 0.52;
      const dxv = Math.cos(phi), dyv = Math.sin(phi);   // disc plane direction (body-x rotated)
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mastP.x - dR * dxv, mastP.y - dR * dyv); ctx.lineTo(mastP.x + dR * dxv, mastP.y + dR * dyv); ctx.stroke();
      ctx.lineCap = 'butt';
      // thrust vector ⟂ disc (tilts with bank) — length ∝ T/W
      const WL = 60, tLen = Math.max(16, Math.min(tw, 1.4) * WL);
      // disc normal in canvas: body-up rotated by φ → (sinφ, -cosφ)
      const tnx = Math.sin(phi), tny = -Math.cos(phi);
      HLD.arrow(ctx, mastP.x, mastP.y, mastP.x + tnx * tLen, mastP.y + tny * tLen, tw >= 1 ? col.lift : col.warn, 4, 12);
      HLD.text(ctx, 'Thrust', mastP.x + tnx * tLen + 6, mastP.y + tny * tLen, tw >= 1 ? col.lift : col.warn, 'bold 11px IBM Plex Sans');
      // weight at CG (always straight down)
      HLD.arrow(ctx, cgP.x, cgP.y, cgP.x, cgP.y + WL, col.drag, 3, 10);
      HLD.text(ctx, 'Weight', cgP.x + 6, cgP.y + WL, col.drag, '11px IBM Plex Sans');
      // ── moments about the pivot, in real SI units (kN·m) ──────────────────
      // Real EC135-class geometry: CG a little inboard of and above the pivot
      // skid, rotor hub high on the mast. Weight RESTORES via its horizontal arm
      // to the pivot; that arm SHRINKS as the aircraft rolls over the pivot and
      // reverses past it. Tilted thrust's horizontal component DRIVES the roll.
      const Wn = HL.weightN(st), thrustN = tw * Wn;
      const cgLat0 = 0.7, cgVert = 1.2, hubVert = 3.0;   // metres from pivot
      // horizontal arm of the (down-acting) weight about the pivot as it rolls
      const restArmM = cgLat0 * Math.cos(phi) - cgVert * Math.sin(phi);
      const restoreMag = Wn * restArmM / 1000;                     // kN·m (+restores, −aids roll)
      // horizontal thrust component × hub height drives the roll
      const driveMag = thrustN * Math.sin(phi) * hubVert / 1000;   // kN·m
      const critDeg = criticalDeg(tw);
      const diverging = bankDeg >= critDeg && tw > 0.6;
      // annotate critical angle marker
      // bank-angle readout in the top-left corner (clear of the tilted thrust vector)
      HLD.chipLabel(ctx, 'bank ' + bankDeg.toFixed(0) + '°', 16, 18, diverging ? col.bad : col.ink, 'bold 13px IBM Plex Sans', 'left');
      ui.readout.innerHTML = kv([
        ['Bank about pivot', bankDeg.toFixed(0) + '°', diverging ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['Critical rollover angle', '≈ ' + critDeg.toFixed(1) + '°', 'var(--hl-warn)'],
        ['Collective (thrust)', collPct.toFixed(0) + '%  ·  T/W ' + tw.toFixed(2), tw >= 1 ? 'var(--hl-good)' : 'var(--hl-ink)'],
        ['Restoring moment (weight)', restoreMag.toFixed(1) + ' kN·m', restoreMag > 0 ? 'var(--hl-lift)' : 'var(--hl-bad)'],
        ['Rolling moment (tilted thrust)', driveMag.toFixed(1) + ' kN·m', diverging ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['State', diverging ? 'DIVERGENT — rolling over' : 'recoverable', diverging ? 'var(--hl-bad)' : 'var(--hl-good)'],
      ]) + `<p class="hl-note">${diverging
          ? '<b>Past the critical angle (≈' + critDeg.toFixed(1) + '°).</b> The tilted thrust\u2019s horizontal component now exceeds the weight\u2019s restoring moment — the roll is <b>self-amplifying</b>. Cyclic can no longer save it. <b>Smoothly LOWER the collective</b> to kill the thrust that powers the roll.'
          : 'Below the critical angle (≈' + critDeg.toFixed(1) + '° at this power) the weight still restores the aircraft. Raise the bank past it — or add collective — and the tilted thrust vector takes over. The pivot is a skid/wheel still touching the ground, <b>not</b> the CofG.'}</p>`;
    };
    slider(ui.controls, { label: 'Bank angle about pivot', min: 0, max: 20, step: 1, val: bankDeg, unit: '°', fmt: v => v.toFixed(0), on: v => { bankDeg = v; draw(); } });
    slider(ui.controls, { label: 'Collective (thrust)', min: 30, max: 100, step: 5, val: collPct, unit: '%', fmt: v => v.toFixed(0), on: v => { collPct = v; draw(); } });
    ui.onDraw(draw);
  }

  /* =========================================================================
     wLTE — Loss of Tail-rotor Effectiveness: top view, wind azimuth slider,
     critical sectors + tail-rotor margin readout (CCW main rotor, left pedal)
     ========================================================================= */
  function wLTE(host) {
    const ui = scaffold(host);
    let windDeg = 300, windKt = 12, collPct = 90;
    // relative-wind azimuth: 0 = from the nose, 90 = from the right, 180 = tail,
    // 270 = from the left. Critical sectors (CCW rotor / left anti-torque pedal):
    //   weathercock + TR-VRS  ≈ 210–330°
    //   main-disc vortex intf ≈ 285–315°
    //   weathervane (tailwind) ≈ 120–240°
    const inArc = (a, lo, hi) => { a = ((a % 360) + 360) % 360; return lo <= hi ? (a >= lo && a <= hi) : (a >= lo || a <= hi); };
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.40, cy = H * 0.52, R = Math.min(W * 0.30, H * 0.40);
      // draw sector wedges first (behind the airframe)
      const wedge = (lo, hi, color) => {
        // azimuth 0 = nose = up (canvas -y). clockwise with increasing az to the right.
        const a = (deg) => (-90 + deg) * D2R;  // 0→up, 90→right, 180→down, 270→left
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 1.06, a(lo), a(hi)); ctx.closePath(); ctx.fill();
      };
      wedge(120, 240, 'rgba(240,190,60,0.16)');  // weathervane
      wedge(210, 330, 'rgba(235,70,50,0.13)');   // weathercock + TR-VRS
      wedge(285, 315, 'rgba(180,60,200,0.30)');  // main-disc vortex interference
      // fuselage: nose up, tail down; CCW main rotor, tail rotor on the LEFT boom
      ctx.strokeStyle = col.dim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.16, R * 0.30, 0, 0, 2 * Math.PI); ctx.stroke();  // cabin
      HLD.dline(ctx, cx, cy + R * 0.30, cx, cy + R * 0.92, col.dim, 3, [1, 0]);                    // tail boom (down = aft)
      // tail rotor at boom end, on the left side
      HLD.dot(ctx, cx - 6, cy + R * 0.92, 5, col.accent);
      HLD.text(ctx, 'tail rotor', cx - 10, cy + R * 0.99, col.accent, '9px IBM Plex Sans', 'right');
      // main rotor disc
      ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.text(ctx, 'NOSE', cx, cy - R - 8, col.dim, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'TAIL', cx, cy + R + 16, col.dim, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'R', cx + R + 8, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
      HLD.text(ctx, 'L', cx - R - 8, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
      // wind arrow: comes FROM windDeg toward the aircraft centre
      const wa = (-90 + windDeg) * D2R;
      const wx = cx + Math.cos(wa) * (R + 30), wy = cy + Math.sin(wa) * (R + 30);
      HLD.arrow(ctx, wx, wy, cx + Math.cos(wa) * R * 0.5, cy + Math.sin(wa) * R * 0.5, col.wind, 3, 11);
      HLD.text(ctx, windKt.toFixed(0) + ' kt wind', wx, wy - 6, col.wind, '10px IBM Plex Sans', 'center');
      // ── tail-rotor margin model ──────────────────────────────────────────
      const st = HL.defaultState(); st.theta0 = 4 + (collPct / 100) * 11;
      const tw = HL.axialSolve(st, 0).thrust / HL.weightN(st);
      // Clean-air TR margin stays comfortably >1 even at high power (a healthy
      // rotor holds torque fine with no adverse wind). It only tapers modestly
      // with power. Adverse wind sectors then subtract from it.
      let margin = 1.55 - 0.28 * Math.max(0, tw - 0.6) / 1.0;   // ~1.55 low power → ~1.2 high power
      // wind-strength scaling of the disturbances (grows to full effect ~17 kt)
      const ws = Math.min(1, windKt / 17);
      let cause = 'clean';
      if (inArc(windDeg, 285, 315)) { margin -= 0.75 * ws; cause = 'Main-rotor disc-vortex interference'; }
      else if (inArc(windDeg, 210, 330)) { margin -= 0.55 * ws; cause = 'Weathercock / tail-rotor VRS'; }
      else if (inArc(windDeg, 120, 240)) { margin -= 0.45 * ws; cause = 'Weathervane (tailwind) instability'; }
      margin = Math.max(0, margin);
      const lte = margin < 1.0;
      const severe = margin < 0.85;
      // margin bar
      const bx = W * 0.72, by = H * 0.18, bw = 34, bh = H * 0.64;
      HLD.text(ctx, 'TR margin', bx + bw / 2, by - 12, col.dim, '10px IBM Plex Sans', 'center');
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
      // 1.0 reference line (needed to hold torque)
      const full = 1.7;
      const y1 = by + bh - (1.0 / full) * bh;
      HLD.dline(ctx, bx - 6, y1, bx + bw + 6, y1, col.warn, 1.4, [4, 3]);
      HLD.text(ctx, 'need', bx + bw + 8, y1, col.warn, '9px IBM Plex Sans', 'left', 'middle');
      const fillH = Math.min(bh, (margin / full) * bh);
      ctx.fillStyle = severe ? col.bad : (lte ? col.warn : col.good);
      ctx.fillRect(bx, by + bh - fillH, bw, fillH);
      ui.readout.innerHTML = kv([
        ['Relative wind FROM', windDeg.toFixed(0) + '°  ·  ' + windKt.toFixed(0) + ' kt', 'var(--hl-wind)'],
        ['Collective (power)', collPct.toFixed(0) + '%  ·  T/W ' + tw.toFixed(2), 'var(--hl-ink)'],
        ['Disturbance', cause, cause === 'clean' ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Tail-rotor margin', (margin * 100).toFixed(0) + '% of demand', severe ? 'var(--hl-bad)' : (lte ? 'var(--hl-warn)' : 'var(--hl-good)')],
        ['State', severe ? 'LTE — uncommanded yaw' : (lte ? 'marginal — degrading' : 'controllable'),
          severe ? 'var(--hl-bad)' : (lte ? 'var(--hl-warn)' : 'var(--hl-good)')],
      ]) + `<p class="hl-note">${lte
          ? '<b>Tail-rotor thrust can no longer balance torque.</b> Cause: <b>' + cause + '</b>. <b>Recover:</b> full left (anti-torque) pedal, <b>lower collective</b> to cut torque demand, and gain <b>forward airspeed</b> so the fin and clean airflow restore control.'
          : 'Margin is above the demand line. LTE bites at <b>low speed, high power, OGE</b> with wind from the yellow/red/purple sectors. Increase the wind speed or power, or point the wind into a critical sector, to watch the margin collapse.'} <i>(CCW main rotor — anti-torque pedal is left. Sector angles are advisory ranges.)</i></p>`;
    };
    slider(ui.controls, { label: 'Relative wind direction (FROM)', min: 0, max: 355, step: 5, val: windDeg, unit: '°', fmt: v => v.toFixed(0), on: v => { windDeg = v; draw(); } });
    slider(ui.controls, { label: 'Wind speed', min: 0, max: 30, step: 1, val: windKt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { windKt = v; draw(); } });
    slider(ui.controls, { label: 'Collective (power)', min: 40, max: 100, step: 5, val: collPct, unit: '%', fmt: v => v.toFixed(0), on: v => { collPct = v; draw(); } });
    ui.onDraw(draw);
  }

  /* ── SANDBOX — free exploration combining live panels ──────────────────── */
  function wSandbox(host) {
    host.innerHTML = '';
    const wrap = el('div', 'hl-sandbox');
    const bar = el('div', 'hl-sandbox-bar');

    // ── 3-D hero view (Three.js, via window.HL3D) ───────────────────────────
    const hero = el('div', 'hl-sb-hero');
    hero.appendChild(el('div', 'hl-sb-title',
      'Rotor in 3-D — disc &amp; fuselage tilt, coning, and the skewing tip-vortex wake'));
    const stage3d = el('div', 'hl-sb-3d');
    const toggles = el('div', 'hl-sb-3d-toggles');
    hero.appendChild(stage3d); hero.appendChild(toggles);

    const grid = el('div', 'hl-sandbox-grid');
    wrap.appendChild(bar); wrap.appendChild(hero); wrap.appendChild(grid);
    host.appendChild(wrap);

    const st = HL.defaultState();
    const sb = {
      coll: 9, Vkt: 60, Vc: 0, weight: 2800, alt: 0, ige: false, zR: 1.0, psi: 90,
      showWake: true, showFuselage: true, showVel: true, paused: false,
    };

    // create the 3-D controller (gracefully degrade if Three.js unavailable)
    let view3d = null;
    if (window.HL3D) {
      try { view3d = window.HL3D.create(stage3d, { Nb: st.Nb, showWake: true, showFuselage: true, showVel: true }); }
      catch (e) { console.error('HL3D create failed', e); }
    }
    if (!view3d) stage3d.innerHTML = noThreeHTML();

    // four panels
    const panels = [
      { title: 'Rotor disc — angle of attack', c: el('canvas') },
      { title: 'Blade element (0.75R, advancing)', c: el('canvas') },
      { title: 'Power required', c: el('canvas') },
      { title: 'Flapping β(ψ)', c: el('canvas') },
    ];
    panels.forEach(p => {
      const card = el('div', 'hl-sb-card');
      p.titleEl = el('div', 'hl-sb-title', p.title);   // kept for live retitling
      card.appendChild(p.titleEl);
      const cw = el('div', 'hl-sb-canvas'); cw.appendChild(p.c); card.appendChild(cw);
      grid.appendChild(card);
    });
    const readout = el('div', 'hl-sandbox-readout');
    wrap.appendChild(readout);

    function buildState() {
      st.theta0 = sb.coll; st.V = sb.Vkt * 0.5144; st.Vc = sb.Vc;
      st.W_kg = sb.weight; st.alt = sb.alt; st.ige = sb.ige; st.zR = sb.zR;
      // Apply the SAME forward-flight cyclic trim a real pilot flies (and that
      // the Envelope lesson uses). Without it the disc shows a huge, unrealistic
      // retreating-side stall wedge at speed — a real trimmed helicopter tilts
      // the disc to unload the retreating blade, so the AoA plot must reflect
      // that. Trim first, then let flapping do the rest.
      st.theta1c = 0; st.theta1s = 0;
      const trim = computeTrimCyclic(st);
      st.theta1s = trim.t1s_deg; st.theta1c = trim.t1c_deg;
      return st;
    }

    function render() {
      const stt = buildState();
      const c = flappingCoeffs(stt);
      const mu = advanceRatio(stt);
      // feed the 3-D view: coning a₀, nose-down body/disc tilt, wake skew (μ, λ)
      if (view3d) {
        const trim = computeTrimCyclic(stt);
        view3d.update({
          coningDeg: c.a0 * R2D,
          bodyPitchDeg: Math.max(0, -trim.fusPitchDeg),   // nose-down magnitude
          bladePitchDeg: sb.coll,                          // collective → blade pitch
          psiDeg: sb.psi,                                  // ties to blade-element panel
          mu, lam: inflowRatio(stt),
          showWake: sb.showWake, showFuselage: sb.showFuselage, showVel: sb.showVel, paused: sb.paused,
        });
      }
      // Panel 1 — AoA disc
      (() => {
        const { ctx, W, H, col } = HLD.setup(panels[0].c);
        HLD.clear(ctx, W, H, col);
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.40;
        const nr = 8, np = 40;
        const sosSb = sosAtAltFt(stt.alt), OmRsb = HL.omR(stt);   // for Mach-dependent stall α
        for (let ir = 0; ir < nr; ir++) {
          const r0 = 0.2 + 0.8 * ir / nr, r1 = 0.2 + 0.8 * (ir + 1) / nr;
          for (let ip = 0; ip < np; ip++) {
            const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
            const rm = (r0 + r1) / 2, pm = (p0 + p1) / 2;
            const d = localAoA(stt, c, rm, pm);
            const stallEff = Math.max(5, st.stallAoA - 18 * Math.max(0, OmRsb * Math.max(0, d.UT) / sosSb - 0.30));
            // same airload gate as the Envelope disc: a cell only truly stalls
            // where high α AND real dynamic pressure (q ∝ U_T²) coincide. Inboard
            // on the retreating side U_T→0, so α blows up with no airload — fade
            // that to neutral and never hatch it as a stall.
            const AL = airloadConf(d.UT, mu);
            const stallCell = !d.reverseFlow && d.aoa * R2D >= stallEff && AL.qShare >= AL.Q_MIN;
            if (d.reverseFlow) {
              ctx.fillStyle = 'rgba(180,60,200,0.5)';
            } else {
              ctx.globalAlpha = 0.30 + 0.70 * Math.sqrt(AL.qShare);
              ctx.fillStyle = fadeToNeutral(aoaColor(d.aoa * R2D, stallEff), Math.pow(AL.qShare, 0.7));
            }
            ctx.beginPath();
            ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
            ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
            if (stallCell || d.reverseFlow) {   // CVD texture
              const ang = HLD.polarToCanvas(pm);
              HLD.tick(ctx, cx + R * rm * Math.cos(ang), cy + R * rm * Math.sin(ang),
                R * (r1 - r0) * 0.9, stallCell ? Math.PI / 4 : -Math.PI / 4,
                stallCell ? 'rgba(120,10,10,0.8)' : 'rgba(90,20,110,0.8)', 1);
            }
          }
        }
        ctx.strokeStyle = col.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
        HLD.text(ctx, 'ADV', cx + R - 2, cy - 4, col.dim, '9px IBM Plex Sans', 'right');
      })();
      // Panel 2 — blade element at the ψ-slider azimuth (title tracks the side)
      (() => {
        const side = Math.sin(sb.psi * D2R);
        panels[1].titleEl.textContent = 'Blade element (0.75R, ψ=' + sb.psi.toFixed(0) + '° — ' +
          (side > 0.05 ? 'advancing' : side < -0.05 ? 'retreating' : 'fore/aft') + ')';
        const { ctx, W, H, col } = HLD.setup(panels[1].c);
        HLD.clear(ctx, W, H, col);
        const d = localAoA(stt, c, 0.75, sb.psi * D2R);
        const phi = Math.atan2(d.UP, Math.max(0.001, d.UT));
        HLD.bladeSection(ctx, W * 0.16, H * 0.62, Math.min(W * 0.7, 240),
          { theta: d.theta, phi, ampl: 4, showForces: true, cl: HL.clOf(st, d.theta - phi), cd: HL.cdOf(st, HL.clOf(st, d.theta - phi)), aoa: d.theta - phi, stall: (d.theta - phi) > st.stallAoA * D2R }, col);
      })();
      // Panel 3 — power curve with current speed
      (() => {
        const { ctx, W, H, col } = HLD.setup(panels[2].c);
        HLD.clear(ctx, W, H, col);
        const curve = HL.powerCurve(stt, 85, 50);
        const ymax = Math.max(...curve.map(p => p.Ptot)) / 1000 * 1.1;
        const ch = HLD.lineChart(ctx, W, H,
          [{ pts: curve.map(p => ({ x: p.V / 0.5144, y: p.Ptot / 1000 })), color: col.ink, width: 2.2 }],
          { xmin: 0, xmax: 165, ymin: 0, ymax, xlab: 'kt', ylab: 'kW' }, col, []);
        const px = ch.sx(sb.Vkt);
        HLD.dline(ctx, px, ch.y0, px, ch.y1, col.warn, 1.5, [3, 3]);
      })();
      // Panel 4 — flapping
      (() => {
        const { ctx, W, H, col } = HLD.setup(panels[3].c);
        HLD.clear(ctx, W, H, col);
        const pts = [];
        for (let i = 0; i <= 72; i++) { const psi = (i / 72) * 2 * Math.PI; pts.push({ x: i * 5, y: flappingAngle(c, psi) * R2D }); }
        const ys = pts.map(p => p.y); const ymin = Math.min(...ys, 0) - 1, ymax = Math.max(...ys) + 1;
        HLD.lineChart(ctx, W, H, [{ pts, color: col.accent, width: 2.2 }],
          { xmin: 0, xmax: 360, ymin, ymax, xlab: 'ψ', ylab: 'β°' }, col,
          [{ x: sb.psi, color: col.ink, label: 'ψ' }]);
      })();
      // readout
      const solV = HL.axialSolve(stt, sb.Vc);
      const a0 = c.a0 * R2D, a1 = -c.a1c * R2D;
      readout.innerHTML = kv([
        ['μ', mu.toFixed(3)], ['λ', inflowRatio(stt).toFixed(3)],
        ['coning a₀', a0.toFixed(1) + '°'], ['blowback a₁', a1.toFixed(1) + '°'],
        ['vert. regime', solV.vrs ? 'VRS!' : (sb.Vc > 0.1 ? 'climb' : sb.Vc < -0.1 ? 'descent' : 'level'),
          solV.vrs ? 'var(--hl-bad)' : 'var(--hl-good)'],
      ]);
    }

    const sColl = slider(bar, { label: 'Collective θ₀', min: 2, max: 16, step: 0.5, val: sb.coll, unit: '°', on: v => { sb.coll = v; render(); } });
    const sVkt  = slider(bar, { label: 'Forward speed', min: 0, max: 160, step: 5, val: sb.Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { sb.Vkt = v; render(); } });
    const sVc   = slider(bar, { label: 'Vertical speed', min: -14, max: 8, step: 0.5, val: sb.Vc, unit: ' m/s', on: v => { sb.Vc = v; render(); } });
    slider(bar, { label: 'Azimuth ψ', min: 0, max: 355, step: 5, val: sb.psi, unit: '°', fmt: v => v.toFixed(0), on: v => { sb.psi = v; render(); } });
    slider(bar, { label: 'Weight', min: 1800, max: 3600, step: 50, val: sb.weight, unit: ' kg', fmt: v => v.toFixed(0), on: v => { sb.weight = v; render(); } });
    slider(bar, { label: 'Density alt', min: 0, max: 14000, step: 500, val: sb.alt, unit: ' ft', fmt: v => v.toFixed(0), on: v => { sb.alt = v; render(); } });

    // one-click teachable states (classroom presets)
    const presets = el('div', 'hl-seg hl-sandbox-presets');
    const mkPreset = (label, coll, Vkt, Vc) => {
      const b = el('button', 'hl-seg-btn', label);
      b.onclick = () => {
        sb.coll = coll; sb.Vkt = Vkt; sb.Vc = Vc;
        sColl.set(coll); sVkt.set(Vkt); sVc.set(Vc);
        render();
      };
      presets.appendChild(b);
    };
    mkPreset('Hover', 9.7, 0, 0);
    mkPreset('Cruise 60 kt', 9, 60, 0);
    mkPreset('Fast 140 kt', 9, 140, 0);
    mkPreset('VRS descent', 7.5, 0, -8);
    wrap.insertBefore(presets, bar);

    // 3-D view toggles
    if (view3d) {
      const mkTog = (label, key) => {
        const b = el('button', 'hl-3d-tog on', label);
        b.onclick = () => { sb[key] = !sb[key]; b.classList.toggle('on', sb[key]); render(); };
        toggles.appendChild(b);
      };
      toggles.appendChild(el('span', 'hl-3d-hint', 'drag to orbit · scroll to zoom'));
      // pause/play the rotor spin (starts running, so not 'on')
      const pauseBtn = el('button', 'hl-3d-tog', '⏸ Pause');
      pauseBtn.onclick = () => { sb.paused = !sb.paused; pauseBtn.textContent = sb.paused ? '▶ Play' : '⏸ Pause';
        pauseBtn.classList.toggle('on', sb.paused); render(); };
      toggles.appendChild(pauseBtn);
      mkTog('Wake', 'showWake');
      mkTog('Fuselage', 'showFuselage');
      mkTog('Rel. vel.', 'showVel');
    }

    const ro = new ResizeObserver(() => render());
    ro.observe(grid);
    requestAnimationFrame(render);
  }

  /* =========================================================================
     wBetModel — the maths behind the velocity diagram (lesson appendix)
     A static reference: TikZ-style convention diagrams drawn on canvas, the
     full set of equations the widget actually evaluates, and the sources.
     Builds its own DOM (no scaffold) so it can stack several figures.
     ========================================================================= */
  function wBetModel(host) {
    host.innerHTML = '';
    const root = el('div', 'hl-model');

    // helper: build a figure = <canvas> + caption, run a draw callback on it
    const figs = [];
    const figure = (heightPx, caption, drawCb) => {
      const box = el('div', 'hl-model-fig');
      box.style.height = heightPx + 'px';
      const cv = el('canvas');
      cv.setAttribute('role', 'img');
      box.appendChild(cv);
      root.appendChild(box);
      if (caption) root.appendChild(el('div', 'hl-model-figcap', caption));
      figs.push({ cv, drawCb });
    };
    const para = (html) => root.appendChild(el('p', null, html));
    const head = (txt) => root.appendChild(el('div', 'hl-model-sec-h', txt));
    const eq = (html) => root.appendChild(el('div', 'hl-eq', html));

    // ── 1. AZIMUTH CONVENTION ──────────────────────────────────────────────
    head('1 · Azimuth convention (ψ) — top view of the rotor disc');
    para(`Everything below is written in <b>this app's azimuth convention</b>, which
      matches the way the H145 (CCW main rotor, viewed from above) is taught. The
      blade sweeps <b>counter-clockwise</b>. ψ is measured from the tail:`);
    figure(300, 'Fig. 1 — Top view. ψ=0° tail, 90° advancing (right), 180° nose, 270° retreating (left). Rotation is CCW.',
      (ctx, W, H, col) => {
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
        // disc
        ctx.strokeStyle = col.grid; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
        HLD.dot(ctx, cx, cy, 4, col.dim);
        // convention: ψ=0 tail(bottom,+y), 90 adv(right,+x), 180 nose(top,-y), 270 ret(left,-x)
        // screen pos: x = cx + R·sinψ, y = cy + R·cosψ
        const P = (deg, r) => ({ x: cx + r * Math.sin(deg * D2R), y: cy + r * Math.cos(deg * D2R) });
        // four cardinal spokes + labels
        const marks = [
          { d: 0,   t: 'ψ=0°  TAIL',        c: col.dim },
          { d: 90,  t: 'ψ=90°  ADVANCING',  c: col.good },
          { d: 180, t: 'ψ=180°  NOSE',      c: col.dim },
          { d: 270, t: 'ψ=270°  RETREATING', c: col.bad },
        ];
        marks.forEach(m => {
          const p = P(m.d, R);
          HLD.dline(ctx, cx, cy, p.x, p.y, col.grid, 1, [3, 3]);
          const lp = P(m.d, R + 26);
          const al = m.d === 90 ? 'left' : m.d === 270 ? 'right' : 'center';
          HLD.chipLabel(ctx, m.t, lp.x, lp.y, m.c, '11px IBM Plex Sans, sans-serif', al);
          HLD.dot(ctx, p.x, p.y, 3, m.c);
        });
        // aircraft nose indicator (top)
        const np = P(180, R + 4);
        HLD.arrow(ctx, cx, cy, np.x, np.y - 6, col.accent, 2, 9);
        HLD.chipLabel(ctx, 'flight →', cx + 6, cy - R * 0.5, col.accent, '10px IBM Plex Sans, sans-serif', 'left');
        // CCW rotation arrow (curved, from adv toward nose)
        ctx.strokeStyle = col.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, (90 - 8) * D2R, (150) * D2R, false); ctx.stroke();
        const tip = P(150, R * 0.62);
        HLD.arrow(ctx, tip.x + 6, tip.y - 2, tip.x, tip.y, col.accent, 2, 8);
        HLD.chipLabel(ctx, 'Ω (CCW)', cx - R * 0.30, cy - R * 0.30, col.accent, '10px IBM Plex Sans, sans-serif', 'center');
        // a blade at ψ=270 with station r
        const bp = P(270, R);
        ctx.strokeStyle = col.bad; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bp.x, bp.y); ctx.stroke();
        const sp = P(270, R * 0.62);
        HLD.dot(ctx, sp.x, sp.y, 4.5, col.chord);
        HLD.chipLabel(ctx, 'r', sp.x, sp.y - 12, col.chord, '11px IBM Plex Sans, sans-serif', 'center');
      });
    eq(`<span class="var">ψ</span> = 0° tail · 90° advancing · 180° nose · 270° retreating` +
      `   <span class="cmt">(CCW rotor, measured from the tail)</span>`);

    // ── 2. IN-PLANE & PERPENDICULAR VELOCITIES ─────────────────────────────
    head('2 · Blade-element velocities — U_T and U_P');
    para(`Freeze one blade element at station <b>r̄ = r/R</b> and azimuth <b>ψ</b>.
      Two velocity components matter: <b>U<sub>T</sub></b> in the plane of rotation
      (drives dynamic pressure), and <b>U<sub>P</sub></b> perpendicular to the
      tip-path-plane (sets the inflow angle). Both are normalised by the tip speed
      <b>ΩR</b>.`);
    eq(`<span class="var">U_T</span> = ΩR · ( r̄ + μ·sinψ )` +
      `\n<span class="var">U_P</span> = ΩR · ( λ + r̄·dβ/dψ + μ·β·cosψ )`);
    para(`<b>μ = V/ΩR</b> is the advance ratio (forward speed as a fraction of tip
      speed). On the advancing side sinψ = +1 so the forward flow <b>adds</b> to the
      rotational speed; on the retreating side sinψ = −1 so it <b>subtracts</b> —
      that is dissymmetry of lift. <b>β</b> is the flapping angle and <b>dβ/dψ</b>
      the flapping rate; the last U_P terms are the flapping and free-stream
      contributions.`);

    // ── 3. TIP-PATH-PLANE & INFLOW ─────────────────────────────────────────
    head('3 · Tip-path-plane, disc tilt and the inflow λ');
    para(`In forward flight the disc tilts <b>nose-down</b> by α<sub>TPP</sub> to
      produce a forward thrust component. The total inflow <b>λ</b> normal to the
      disc therefore has <b>two</b> parts — this is the point your question (c) was
      about:`);
    figure(300, 'Fig. 2 — Side view. The nose-down tip-path-plane makes the free stream V pass partly THROUGH the disc (μ·tanα_TPP) on top of the induced inflow λ_i.',
      (ctx, W, H, col) => {
        const cx = W / 2, cy = H / 2;
        const half = Math.min(W, H) * 0.36;
        const aTPP = 14 * D2R;  // exaggerated nose-down tilt for clarity
        // horizon (flight direction) reference
        HLD.dline(ctx, cx - half - 30, cy, cx + half + 30, cy, col.grid, 1, [4, 4]);
        HLD.chipLabel(ctx, 'horizontal', cx + half + 4, cy - 8, col.dim, '10px IBM Plex Sans, sans-serif', 'left');
        // tip-path-plane: a line tilted nose-down. nose is to the LEFT (flight →).
        const dx = Math.cos(aTPP) * half, dy = Math.sin(aTPP) * half;
        // front (nose, left) end lower; rear (right) end higher → nose-down disc
        const fx1 = cx - dx, fy1 = cy + dy, fx2 = cx + dx, fy2 = cy - dy;
        ctx.strokeStyle = col.accent; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx1, fy1); ctx.lineTo(fx2, fy2); ctx.stroke();
        HLD.chipLabel(ctx, 'tip-path-plane', fx2, fy2 - 12, col.accent, '10px IBM Plex Sans, sans-serif', 'right');
        HLD.dot(ctx, cx, cy, 3.5, col.ink);
        // α_TPP arc between horizontal and TPP at the hub (label placed clear, upper-left)
        HLD.arc(ctx, cx, cy, 40, Math.PI, Math.PI + aTPP, col.warn, '');
        HLD.chipLabel(ctx, 'α_TPP', cx - 46, cy - 16, col.warn, '10px IBM Plex Sans, sans-serif', 'right');
        // free-stream V arrow coming from the front (flight direction, →)
        HLD.arrow(ctx, cx - half - 20, cy, cx - half * 0.35, cy, col.good, 2.5, 9);
        HLD.chipLabel(ctx, 'V (free stream)', cx - half - 18, cy + 14, col.good, '10px IBM Plex Sans, sans-serif', 'left');
        // throughflow component through the disc (down through TPP) at a point fwd of hub
        const px = cx - dx * 0.5, py = cy + dy * 0.5;
        // normal to TPP points "down-and-back"; draw the μ·tanα throughflow downward
        const nlen = half * 0.42;
        const nx = Math.sin(aTPP), ny = Math.cos(aTPP); // unit normal (downward through disc)
        HLD.arrow(ctx, px, py, px + nx * nlen, py + ny * nlen, col.bad, 2, 8);
        HLD.chipLabel(ctx, 'μ·tanα_TPP', px + nx * nlen + 4, py + ny * nlen, col.bad, '10px IBM Plex Sans, sans-serif', 'left');
        // induced inflow λ_i straight down through hub
        HLD.arrow(ctx, cx + dx * 0.4, cy - dy * 0.4, cx + dx * 0.4 + nx * nlen * 0.7, cy - dy * 0.4 + ny * nlen * 0.7, col.wind, 2, 8);
        HLD.chipLabel(ctx, 'λ_i (induced)', cx + dx * 0.4 + nx * nlen * 0.7 + 4, cy - dy * 0.4 + ny * nlen * 0.7, col.wind, '10px IBM Plex Sans, sans-serif', 'left');
      });
    eq(`<span class="var">λ</span> = μ·tan(α_TPP) + λ_i` +
      `   <span class="cmt">total = throughflow + induced</span>` +
      `\n<span class="var">λ_i</span> = C_T / ( 2·√(μ² + λ²) )` +
      `   <span class="cmt">Glauert momentum inflow</span>`);
    para(`The <b>throughflow</b> term μ·tan(α_TPP) is the component of the aircraft's
      own velocity passing straight through the tilted disc. In a hover it is zero;
      by ~120 kt it is already larger than the induced part λ_i, which is exactly
      why it must be included. Across the disc the induced part is not uniform — the
      wake skews back, modelled with the <b>Drees</b> linear inflow:`);
    eq(`<span class="var">λ_i(r̄,ψ)</span> = λ_i · ( 1 + κ·r̄·cosψ + k_y·r̄·sinψ )` +
      `\nκ = (4/3)·μ / (√(μ²+λ²) + λ)      k_y = −2μ`);

    // ── 4. BLADE-ELEMENT ANGLES ────────────────────────────────────────────
    head('4 · Blade-element angles — θ, φ and α');
    para(`With U<sub>T</sub> and U<sub>P</sub> in hand the section angles follow
      directly. <b>θ</b> is the geometric pitch you set (collective + cyclic +
      twist), <b>φ</b> is the inflow angle the relative wind makes with the disc,
      and the angle of attack is their difference:`);
    figure(300, 'Fig. 3 — Blade section. Relative wind V_rel arrives at inflow angle φ below the disc plane; chord is pitched up by θ; α = θ − φ. Angles exaggerated.',
      (ctx, W, H, col) => {
        const cx = W * 0.46, cy = H * 0.54;
        const chord = Math.min(W * 0.44, 240);
        const thetaV = 18 * D2R, phiV = 9 * D2R;  // exaggerated for clarity
        // disc-plane datum (horizontal dashed) — extend well to the right, label in the clear
        HLD.dline(ctx, cx - chord * 0.7, cy, cx + chord * 0.95, cy, col.grid, 1, [4, 4]);
        HLD.chipLabel(ctx, 'plane of rotation (U_T)', cx + chord * 0.95, cy + 15, col.dim, '10px IBM Plex Sans, sans-serif', 'right');
        // airfoil at pitch θ (nose-up = rotate -θ in canvas since +y is down)
        const pts = HLD.nacaProfile(0.12, 56);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-thetaV);
        ctx.beginPath();
        const c0 = -chord * 0.34;
        pts.forEach((p, i) => { const X = c0 + p.x * chord, Y = -p.y * chord;
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
        ctx.closePath();
        ctx.fillStyle = 'rgba(251,146,60,0.12)'; ctx.fill();
        ctx.strokeStyle = col.chord; ctx.lineWidth = 2; ctx.stroke();
        // chord line
        HLD.dline(ctx, c0, 0, c0 + chord, 0, col.chord, 1.2, [6, 4]);
        ctx.restore();
        // relative wind: arrives from lower-left at angle φ below the datum, into LE
        const wl = chord * 0.6;
        const wx = cx - wl * Math.cos(phiV), wy = cy + wl * Math.sin(phiV);
        HLD.arrow(ctx, wx, wy, cx - chord * 0.30, cy, col.wind, 2.2, 9);
        HLD.chipLabel(ctx, 'V_rel', wx - 4, wy + 4, col.wind, '11px IBM Plex Sans, sans-serif', 'right');
        // θ arc (datum → chord, above), φ arc (datum → wind, below) — well-separated radii
        HLD.arc(ctx, cx, cy, 58, -thetaV, 0, col.chord, 'θ');
        HLD.arc(ctx, cx, cy, 40, 0, phiV, col.wind, 'φ');
        // α label above the chord, clear of the airfoil
        HLD.chipLabel(ctx, 'α = θ − φ', cx - chord * 0.05, cy - chord * 0.30, col.good, '12px IBM Plex Sans, sans-serif', 'left');
      });
    eq(`<span class="var">φ</span> = atan2( U_P , U_T )      <span class="cmt">inflow angle</span>` +
      `\n<span class="var">θ</span>(r̄,ψ) = θ₀ + θ_tw·(r̄ − 0.75) + θ_1c·cosψ + θ_1s·sinψ` +
      `\n<span class="var">α</span> = θ − φ           <span class="cmt">→ stall when α > α_crit</span>`);
    para(`Twist is referenced at 75%R, so the −8° washout lowers the tip pitch and
      unloads it. When the net U<sub>T</sub> on the retreating side is small, φ grows
      and the section needs a large θ to hold α below the stall — the mechanism the
      main diagram shows vector-by-vector.`);

    // ── 5. FLAPPING (for completeness) ─────────────────────────────────────
    head('5 · Where β comes from — first-harmonic flapping');
    para(`The flapping angle used in U<sub>P</sub> is the first-harmonic solution of
      the blade flapping equation (Van Holten / Leishman). Coning a₀ and the disc
      tilts a₁ (longitudinal) and b₁ (lateral) close the loop:`);
    eq(`<span class="var">β</span>(ψ) = a₀ − a₁·cosψ − b₁·sinψ` +
      `\na₀ = (γ/8)·[ θ₀(1+μ²) + θ_tw(1/20 − μ²/12) − (4/3)λ ]`);

    // ── REFERENCES ─────────────────────────────────────────────────────────
    const refs = el('div', 'hl-model-refs');
    refs.innerHTML =
      '<h4>Where the formulas come from</h4>' +
      '<ol>' +
      '<li>Leishman, J.G. — <i>Principles of Helicopter Aerodynamics</i>, 2nd ed. ' +
        'Blade-element velocities U_T/U_P (eq. 2.126, 3.x), Glauert forward-flight inflow λ = μ·tanα + C_T/(2√(μ²+λ²)), and the linear-inflow (Drees) model.</li>' +
      '<li>Van Holten, Th. — <i>Helicopter Performance, Stability and Control</i> ' +
        '(TU Delft AE4-314). First-harmonic flapping coefficients a₀, a₁, b₁ (eqs. 78–80) used for β(ψ).</li>' +
      '<li>Drees, J.M. (1949) — the linear-inflow wake-skew gradient κ and k_y = −2μ. ' +
        'See <a href="https://move.rpi.edu/sites/default/files/publication-documents/2016-7.pdf" target="_blank" rel="noopener">RPI course notes (PDF)</a> and ' +
        '<a href="https://ocw.snu.ac.kr/sites/default/files/NOTE/Week9_3.pdf" target="_blank" rel="noopener">SNU OpenCourseWare (PDF)</a>.</li>' +
      '<li>Wagtendonk, W.J. — <i>Principles of Helicopter Flight</i>. Retreating-blade ' +
        'stall, dissymmetry of lift and the azimuth/9-o\'clock stall picture.</li>' +
      '<li>NASA Ames — dynamic-stall azimuth studies, e.g. ' +
        '<a href="https://rotorcraft.arc.nasa.gov/Publications/files/Nguyen_ERF99.pdf" target="_blank" rel="noopener">Nguyen, ERF 1999 (PDF)</a>.</li>' +
      '</ol>' +
      '<p style="font-size:12px;color:var(--text3);margin:8px 0 0">All angle conventions ' +
      'on this page follow the app-wide standard: ψ from the tail, CCW rotor (H145/BK117 D-3).</p>';
    root.appendChild(refs);

    host.appendChild(root);

    // draw all figures once, and redraw on resize
    const drawAll = () => figs.forEach(f => {
      const s = HLD.setup(f.cv);
      HLD.clear(s.ctx, s.W, s.H, s.col); HLD.grid(s.ctx, s.W, s.H, s.col, 32);
      f.drawCb(s.ctx, s.W, s.H, s.col);
    });
    requestAnimationFrame(drawAll);
    const ro = new ResizeObserver(drawAll);
    figs.forEach(f => ro.observe(f.cv.parentElement));
  }

  /* ===== GUIDED BET: 5-layer build-up =====
     Each layer is a self-consistent physics PRESET so the student never sees a
     mixed (trimmed-pitch + natural-flap) state.
       hover    — V=0, symmetric baseline (trimmed, no cyclic needed)
       rigid    — forward flight, blade CANNOT flap: v_flap=0, β=0, no cyclic
                  → asymmetry of U_T explodes the lift demand (the PROBLEM)
       freeflap — natural flapping response, still NO cyclic
                  → flapping-to-equality + blowback (the MECHANISM)
       trimmed  — trim cyclic applied, verified localAoA() path
                  → disc level, thrust forward (the PILOT'S SOLUTION)
       highsp   — same as trimmed, speed pushed → retreating α → stall (the LIMIT)
  */
  function wGuidedBET(host) {
    const RIGID_COEFFS = { a0: 0, a1c: 0, a1s: 0 };   // β=0, β̇=0 → rigid blade

    // state
    let layer = 'rigid';          // hover | rigid | freeflap | trimmed | highsp
    let Vkt = 60;                 // forward speed (kt); forced 0 in 'hover'
    let psiDeg = 90;              // azimuth (0 TAIL, 90 ADV, 180 NOSE, 270 RET)
    let rBar = 0.75;
    let envMode = 'aoa';          // ut | aoa | lift
    let playing = false, sweepDir = 1, sweepTimer = null;

    const LAYERS = [
      { v: 'hover',   t: '1 · Hover',            sub: 'symmetric baseline' },
      { v: 'rigid',   t: '2 · Rigid fwd',   sub: 'the problem' },
      { v: 'freeflap',t: '3 · Flapping',      sub: 'the mechanism' },
      { v: 'trimmed', t: '4 · Cyclic',    sub: 'the pilot’s solution' },
      { v: 'highsp',  t: '5 · High speed',       sub: 'the limit — stall' },
    ];
    const LAYER_NOTE = {
      hover:   'V=0. No forward speed, so U_T = r·Ω is the same on every azimuth. Uniform inflow, uniform α. The disc is a flat, even ring — no flapping needed.',
      rigid:   'Forward speed but the blade is RIGID (cannot flap, no cyclic). U_T = r·Ω + V·sinψ grows on the advancing side and shrinks on the retreating side. With fixed pitch, lift ∝ U_T²·α blows up advancing and collapses retreating — the rotor would roll over. This is the PROBLEM flapping exists to solve.',
      freeflap: 'UNTRIMMED / natural blowback. The blade is now free to flap (still no cyclic). Advancing lifts up → flapping rate raises U_P → φ grows → α SHRINKS on the advancing side. Retreating drops → α GROWS. Lift partly equalises (flapping-to-equality), but the disc tilts back — blowback. Watch the advancing α go strongly negative: that is real, it is not steady trimmed flight.',
      trimmed: 'Trim cyclic applied (θ₁c, θ₁s) so the flapping response is nearly zero (β̇≈0 → v_flap≈0). Pitch is pre-distorted to hold the disc level. Lift is equalised AND the thrust stays forward. This is the pilot’s solution to blowback. Peak α now sits on the RETREATING side — where RBS will eventually live.',
      highsp:  'Same trimmed state, speed pushed toward V_NE. The retreating blade’s U_T is small, so to carry its share of lift it needs ever-higher α. Past the critical angle the section stalls — retreating blade stall. Watch the retreating sector go red and the lift-demand map collapse there.',
    };

    // ── consistent per-layer physics ─────────────────────────────────
    // returns velocities in m/s, angles in rad.
    function cellAt(mode, stIn, rb, psi) {
      const Vms = mode === 'hover' ? 0 : stIn.V;
      let st = { ...stIn, V: Vms };
      let coeffs;
      if (mode === 'hover')   { st = { ...st, theta1c: 0, theta1s: 0 }; coeffs = flappingCoeffs(st); }
      else if (mode === 'rigid')    { st = { ...st, theta1c: 0, theta1s: 0 }; coeffs = RIGID_COEFFS; }
      else if (mode === 'freeflap') { st = { ...st, theta1c: 0, theta1s: 0 }; coeffs = flappingCoeffs(st); }
      else /* trimmed | highsp */    { st = trimmed(st); coeffs = flappingCoeffs(st); }
      const Om = omega(st), OmR = tipSpeed(st);
      const mu = advanceRatio(st);
      const muTan = throughflowRatio(st);
      const lam_i = inducedInflowRatio(st);
      const lam_loc = muTan + localInflow(lam_i, rb, psi, mu);
      const betaDot = flappingRate(coeffs, psi, Om);
      const beta = flappingAngle(coeffs, psi);
      const p_r = st.p * D2R, q_r = st.q * D2R;
      const UT = rb + mu * Math.sin(psi);                 // normalised by OmR
      const vflap_n = (betaDot / Om) * rb;               // normalised by OmR
      const UP = lam_loc + vflap_n
        - (q_r * Math.cos(psi) + p_r * Math.sin(psi)) * rb / OmR
        + mu * Math.cos(psi) * beta;
      const theta = bladePitch(st, rb, psi);
      const phi = UT < 0 ? 0 : Math.atan2(UP, UT);
      const aoa = theta - phi;
      const reverseFlow = UT < 0;
      return {
        UT: UT * OmR, UP: UP * OmR,                 // m/s (for the triangle + readout)
        UTn: UT, UPn: UP,                            // dimensionless (for airload/stall)
        vi: lam_i * OmR, vn: muTan * OmR, vflap: vflap_n * OmR,
        theta, phi, aoa, reverseFlow, mu, OmR, Om, coeffs, st,
      };
    }
    // Mach-adjusted critical α (deg), shared rule with the rest of the app
    const stallEffAt = (st, UT) => {
      const Mloc = HL.omR(st) * Math.max(0, UT) / sosAtAltFt(st.alt);
      return Math.max(5, st.stallAoA - 18 * Math.max(0, Mloc - 0.30));
    };

    const ui = scaffold(host, {
      topStage: 'hl-w-stage hl-w-stage-map',
      mainStage: 'hl-w-stage hl-w-stage-vec',
    });
    const { canvas, topCanvas, controls, readout } = ui;

    // ── controls ─────────────────────────────────────────────────────
    segmented(controls, {
      label: 'Lesson layer', val: layer,
      options: LAYERS.map(l => ({ v: l.v, t: l.t })),
      on: v => { layer = v; if (layer === 'hover') { Vkt = 0; spd.set(0); } else if (Vkt === 0) { Vkt = 60; spd.set(60); } draw(); },
    });
    const spd = slider(controls, { label: 'Forward speed', min: 0, max: 150, step: 1, val: Vkt, unit: ' kt',
      on: v => { Vkt = v; if (v === 0 && layer !== 'hover') { layer = 'hover'; } else if (v > 0 && layer === 'hover') { layer = 'rigid'; } draw(); } });
    const az = slider(controls, { label: 'Azimuth ψ', min: 0, max: 355, step: 5, val: psiDeg, unit: '°',
      on: v => { psiDeg = v; if (playing) togglePlay(); draw(); } });
    // play/pause sweep
    const playRow = el('div', 'hl-ctl');
    const playBtn = el('button', 'hl-seg-btn' + (playing ? ' on' : ''), playing ? '❚❚ Pause sweep' : '▶ Play azimuth sweep');
    playBtn.setAttribute('aria-label', 'Play or pause azimuth sweep');
    playBtn.onclick = () => togglePlay();
    playRow.appendChild(playBtn); controls.appendChild(playRow);
    function togglePlay() {
      playing = !playing;
      playBtn.textContent = playing ? '❚❚ Pause sweep' : '▶ Play azimuth sweep';
      playBtn.classList.toggle('on', playing);
      if (playing) { sweepTimer = setInterval(() => {
        psiDeg = (psiDeg + 5 * sweepDir + 360) % 360; az.set(psiDeg); draw();
      }, 220); }
      else clearInterval(sweepTimer);
    }
    slider(controls, { label: 'Blade station r/R', min: 0.20, max: 0.97, step: 0.01, val: rBar, fmt: v => v.toFixed(2),
      on: v => { rBar = v; draw(); } });
    segmented(controls, {
      label: 'Disc shows', val: envMode,
      options: [{ v: 'ut', t: 'U_T speed' }, { v: 'aoa', t: 'Angle of attack α' }, { v: 'lift', t: 'Lift demand' }],
      on: v => { envMode = v; draw(); },
    });

    // ── click the disc to pick (r, ψ) ──────────────────────────────────
    topCanvas.style.cursor = 'crosshair';
    function pickFromEvent(e) {
      const r = topCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = discGeom(r.width, r.height);
      const dx = x - d.cx, dy = y - d.cy;
      const rad = Math.hypot(dx, dy);
      if (rad > d.R * 1.02) return;
      const rb = Math.max(0.20, Math.min(0.97, rad / d.R));
      const canAng = Math.atan2(dy, dx);                 // canvas angle
      const psi = (Math.PI / 2 - canAng + 2 * Math.PI) % (2 * Math.PI);
      rBar = rb; psiDeg = Math.round(psi * R2D / 5) * 5 % 360;
      if (playing) togglePlay();
      az.set(psiDeg); rbarCtrl && rbarCtrl.set(rBar); draw();
    }
    topCanvas.addEventListener('click', pickFromEvent);
    let rbarCtrl = null;  // (filled after rBar slider creation below if needed)

    function discGeom(W, H) {
      const GUT = 58;
      const cx = W * 0.5, cy = H * 0.50;
      // cap R so cardinal labels (R + 16 offset, ~6px glyph half-height) stay
      // inside the stage on short/wide mobile discs (4:3) without clipping.
      const R = Math.max(36, Math.min(cx - GUT, W - cx - GUT, H * 0.36));
      return { cx, cy, R };
    }

    // ── DRAW: disc ────────────────────────────────────────────────────
    function drawDisc(ctx, W, H, col) {
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const st = HL.defaultState(); st.V = (layer === 'hover' ? 0 : Vkt) * 0.5144;
      const mu = advanceRatio({ ...st, V: st.V });
      const { cx, cy, R } = discGeom(W, H);
      const nr = 12, np = 60;
      // scale for colour ramps
      let maxUT = 1e-6, maxLift = 1e-6;
      for (let ir = 0; ir < nr; ir++) {
        const rm = 0.2 + 0.8 * (ir + 0.5) / nr;
        for (let ip = 0; ip < np; ip++) {
          const pm = ((ip + 0.5) / np) * 2 * Math.PI;
          const d = cellAt(layer, st, rm, pm);
          maxUT = Math.max(maxUT, Math.max(0, d.UT));
          const se = stallEffAt(st, d.UTn);
          const Cl = Math.abs(d.aoa) < se * D2R ? st.clAlpha * d.aoa : 0;
          maxLift = Math.max(maxLift, Math.max(0, d.UT) * Math.max(0, d.UT) * Cl);
        }
      }
      const QFLOOR = 0.25;
      for (let ir = 0; ir < nr; ir++) {
        const r0 = 0.2 + 0.8 * ir / nr, r1 = 0.2 + 0.8 * (ir + 1) / nr;
        for (let ip = 0; ip < np; ip++) {
          const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
          const pm = (p0 + p1) / 2, rm = (r0 + r1) / 2;
          const d = cellAt(layer, st, rm, pm);
          const aoaDeg = d.aoa * R2D;
          const stallEff = stallEffAt(st, d.UTn);
          const AL = airloadConf(d.UTn, mu);
          const trulyStalled = !d.reverseFlow && aoaDeg >= stallEff && AL.qShare >= QFLOOR;
          if (d.reverseFlow) { ctx.fillStyle = 'rgba(180,60,200,0.5)'; }
          else if (envMode === 'ut') {
            ctx.fillStyle = ramp(Math.max(0, d.UT) / maxUT);
          } else if (envMode === 'aoa') {
            const fade = Math.pow(AL.qShare, 0.7);
            ctx.globalAlpha = 0.30 + 0.70 * Math.sqrt(AL.qShare);
            ctx.fillStyle = fadeToNeutral(aoaColor(aoaDeg, stallEff), fade);
          } else { // lift demand
            const se = stallEffAt(st, d.UTn);
            const Cl = Math.abs(d.aoa) < se * D2R ? st.clAlpha * d.aoa : 0;
            const dL = Math.max(0, d.UT) * Math.max(0, d.UT) * Cl;
            ctx.fillStyle = trulyStalled ? 'rgb(150,40,110)' : ramp(Math.max(0, dL) / maxLift);
          }
          ctx.beginPath();
          ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
          ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          if (trulyStalled || d.reverseFlow) {
            const ang = HLD.polarToCanvas(pm);
            const ux = cx + R * rm * Math.cos(ang), uy = cy + R * rm * Math.sin(ang);
            const len = R * (r1 - r0) * 0.9;
            HLD.tick(ctx, ux, uy, len, trulyStalled ? Math.PI / 4 : -Math.PI / 4,
              trulyStalled ? 'rgba(255,63,160,0.95)' : 'rgba(150,60,220,0.9)', 1.6);
          }
        }
      }
      // disc outline + hub
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.dot(ctx, cx, cy, 3, col.dim);
      // cardinal labels (ψ=0 TAIL/bottom, 90 ADV/right, 180 NOSE/top, 270 RET/left)
      const lblFont = (W < 480 ? 'bold 11px ' : 'bold 12px ') + 'ui-sans-serif';
      const lbl = (txt, ang) => {
        let lx = cx + (R + 16) * Math.cos(ang), ly = cy + (R + 16) * Math.sin(ang);
        // clamp inside the stage so labels never clip on short mobile discs
        lx = Math.max(28, Math.min(W - 28, lx));
        ly = Math.max(14, Math.min(H - 14, ly));
        HLD.text(ctx, txt, lx, ly, col.ink, lblFont, 'center', 'middle');
      };
      lbl('TAIL 0°',  HLD.polarToCanvas(0));
      lbl('ADV 90°',  HLD.polarToCanvas(Math.PI / 2));
      lbl('NOSE 180°',HLD.polarToCanvas(Math.PI));
      lbl('RET 270°', HLD.polarToCanvas(3 * Math.PI / 2));
      // azimuth pointer + selected station dot
      const psi = psiDeg * D2R;
      const ang = HLD.polarToCanvas(psi);
      const px = cx + R * rBar * Math.cos(ang), py = cy + R * rBar * Math.sin(ang);
      ctx.strokeStyle = col.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 1.02 * Math.cos(ang), cy + R * 1.02 * Math.sin(ang)); ctx.stroke();
      HLD.dot(ctx, px, py, 5, col.accent);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * Math.PI); ctx.stroke();
      // title strip
      HLD.text(ctx, LAYERS.find(l => l.v === layer).t + ' · ' +
        ({ ut: 'U_T (in-plane speed)', aoa: 'angle of attack α', lift: 'lift demand ∝ U_T²·α' }[envMode]),
        12, 16, col.dim, '12px ui-sans-serif', 'left', 'top');
    }

    // ── DRAW: velocity triangle (ported from the wBetVelocity template) ──────
    // Same layout the student already knows from 'The BET Velocity Triangle':
    // airfoil/tip on the RIGHT, V_rot→V_T→U_T along the TPP, V_rel from the
    // U_P stack top down to the tip, U_P bracket clear-LEFT of every vector,
    // and the θ/α arcs centred on the real airfoil LE. Physics fed by cellAt
    // (consistent per-layer), with UP = d.UPn so the drawn φ/α stay honest.
    function drawTriangle(ctx, W, H, col) {
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const st = HL.defaultState(); st.V = (layer === 'hover' ? 0 : Vkt) * 0.5144;
      const psi = psiDeg * D2R;
      const d = cellAt(layer, st, rBar, psi);
      const OmR = d.OmR;

      // dimensionless components (for geometry; cellAt keeps physics honest)
      const Vrot = rBar;                  // Ω·r / ΩR
      const Vt   = d.UTn - rBar;         // μ·sinψ   (so UT = Vrot + Vt)
      const UT   = d.UTn;                // net in-plane
      const UP   = d.UPn;               // total perpendicular (honest)
      const v_i   = d.vi / OmR, v_n = d.vn / OmR, v_flap = d.vflap / OmR;
      const theta = d.theta, phi = d.phi, aoa = d.aoa;
      const reverse = d.reverseFlow;
      const netUpflow = UP < -1e-3;
      const side = Vt >= 0;

      // ---- verdict chip (top-right) — same model as the disc map ---------------
      const se2 = stallEffAt(d.st, d.UTn), AL2 = airloadConf(d.UTn, d.mu);
      const stalled2 = !reverse && aoa * R2D >= se2 && AL2.qShare >= 0.25;
      const vTxt = reverse ? 'REVERSE FLOW' : stalled2 ? 'STALLED' : (aoa * R2D >= se2 - 3 ? 'NEAR STALL' : 'OK');
      const vCol2 = reverse ? '#b24' : stalled2 ? col.bad : (aoa * R2D >= se2 - 3 ? col.warn : col.good);

      // ================= LAYOUT ================================================
      const maxIn = Math.max(Math.abs(Vrot) + Math.abs(Vt), Math.abs(UT), 1.0);
      const AMP = 2;
      const rightPad = Math.max(112, W * 0.16);
      const leftPad  = Math.max(150, W * 0.16);
      const sxW = (W - rightPad - leftPad) / maxIn;
      const upMax = Math.max(Math.abs(UP), 0.05);
      const sxH = (H * 0.34) / (AMP * upMax + 0.001);
      const sx = Math.max(60, Math.min(sxW, sxH, 900));
      const sy = sx;
      const tipX = leftPad + maxIn * sx;
      const oy   = H * 0.56;

      const fs   = Math.max(9, Math.min(12, W / 95));
      const FV   = fs.toFixed(1) + 'px IBM Plex Sans, sans-serif';
      const FSM  = Math.max(8, fs - 1).toFixed(1) + 'px IBM Plex Sans, sans-serif';
      const FVrel = Math.max(10, fs + 1).toFixed(1) + 'px IBM Plex Sans, sans-serif';
      const compact = W < 560;
      const showDetailLabels = !compact;

      // rotor-plane baseline (TPP)
      HLD.dline(ctx, 20, oy, W - 10, oy, col.grid, 1, [5, 4]);
      HLD.chipLabel(ctx, 'TPP', 24, oy, col.dim, FSM, 'left', col.bg);

      // ---- IN-PLANE construction (heads point RIGHT toward the airfoil) -------
      const xRotTail = tipX - Vrot * sx;
      const xBase = tipX - UT * sx;
      const vtCol = Vt < 0 ? col.bad : col.accent;
      const collinear = side;
      const yVt = collinear ? oy : oy + 7;

      HLD.arrow(ctx, xRotTail, oy, tipX, oy, col.lift, 3, 9);
      if ((tipX - xRotTail) > 70) {
        if (Vt < 0) HLD.chipLabel(ctx, 'V_rot', xRotTail + 6, oy - 14, col.lift, FV, 'left');
        else HLD.chipLabel(ctx, 'V_rot', xRotTail + (tipX - xRotTail) * 0.44, oy - 14, col.lift, FV, 'center');
      }

      const xL = Math.min(xRotTail, xBase), xR = Math.max(xRotTail, xBase);
      if (Vt < 0) HLD.arrow(ctx, xR, yVt, xL, yVt, vtCol, 3, 9);
      else HLD.arrow(ctx, xL, yVt, xR, yVt, vtCol, 3, 9);
      if (!collinear) {
        HLD.dline(ctx, xRotTail, oy, xRotTail, yVt, col.grid, 1, [2, 3]);
        HLD.dline(ctx, xBase, oy, xBase, yVt, col.grid, 1, [2, 3]);
      }
      if (Math.abs(xBase - xRotTail) > 60) {
        const vtLy = collinear ? oy + 13 : yVt + 13;
        HLD.chipLabel(ctx, 'V_T', (xRotTail + xBase) / 2, vtLy, vtCol, FV, 'center');
      }

      // net U_T bracket BELOW the plane
      const yBr = collinear ? oy + 30 : oy + 34;
      HLD.dline(ctx, xBase, yBr, tipX, yBr, col.ink, 1.5, [2, 3]);
      HLD.tick(ctx, xBase, yBr, 8, Math.PI / 2, col.ink, 1.5);
      HLD.tick(ctx, tipX, yBr, 8, Math.PI / 2, col.ink, 1.5);
      HLD.chipLabel(ctx, 'U_T', (xBase + tipX) / 2, yBr + 12, col.ink, FV, 'center');

      // ---- U_P stack (V_i + V_n + V_flap) above the plane at the base tail ----
      // yTop uses the HONEST total UP so V_rel's slope (→φ→α) matches cellAt.
      const yTop = oy - UP * AMP * sy;
      const yVi  = oy - v_i * AMP * sy;
      const yVn  = oy - (v_i + v_n) * AMP * sy;
      const LBL_MIN = 13;
      const viLx = xBase + 10;
      // V_i (bottom)
      HLD.arrow(ctx, xBase, yVi, xBase, oy, col.wind, 2.5, 8);
      if (showDetailLabels && (oy - yVi) >= LBL_MIN) HLD.chipLabel(ctx, 'V_i', viLx, (yVi + oy) / 2, col.wind, FSM, 'left');
      // V_n (middle)
      if (v_n > 1e-4) {
        HLD.arrow(ctx, xBase, yVn, xBase, yVi, col.accent, 2.5, 7);
        if (showDetailLabels && (yVi - yVn) >= LBL_MIN) HLD.chipLabel(ctx, 'V_n', viLx, (yVn + yVi) / 2, col.accent, FSM, 'left');
      }
      // V_flap: ADVANCING (v_flap>0) ADDS to the stack (collinear, head down);
      //         RETREATING (v_flap<0) SUBTRACTS — own up-arrow just right of stack.
      if (Math.abs(v_flap) > 1e-4 && layer !== 'rigid' && layer !== 'hover') {
        const flCol = v_flap > 0 ? col.good : col.warn;
        if (v_flap > 0) {
          HLD.arrow(ctx, xBase, yTop, xBase, yVn, flCol, 2.5, 7);
          if (showDetailLabels) HLD.chipLabel(ctx, 'V_flap', xBase, yTop - 11, flCol, FSM, 'center', 'rgba(0,0,0,0.5)');
        } else {
          const flDx = 6;
          HLD.arrow(ctx, xBase + flDx, yTop, xBase + flDx, yVn, flCol, 2.5, 7);
          HLD.dline(ctx, xBase, yVn, xBase + flDx, yVn, col.grid, 1, [2, 3]);
          HLD.dline(ctx, xBase, yTop, xBase + flDx, yTop, col.grid, 1, [2, 3]);
          if (showDetailLabels) HLD.chipLabel(ctx, 'V_flap', xBase + flDx, yVn - 8, flCol, FSM, 'center', 'rgba(0,0,0,0.5)');
        }
      }

      // ---- U_P total bracket — JUST LEFT of all vectors, never crossing --------
      {
        const xVecLeft = Math.min(xRotTail, xBase, tipX);
        const upGap = compact ? 14 : 20;
        const upBx = xVecLeft - upGap;
        const yA = Math.min(oy, yTop), yB = Math.max(oy, yTop);
        HLD.dline(ctx, upBx, yA, upBx, yB, col.ink, 1.5, [2, 3]);
        const tickLen = compact ? 6 : 8;
        HLD.dline(ctx, upBx - tickLen, yA, upBx, yA, col.ink, 1.5);
        HLD.dline(ctx, upBx - tickLen, yB, upBx, yB, col.ink, 1.5);
        const upLabelY = compact ? Math.min(H - 12, oy + 12) : (yA + yB) / 2;
        HLD.chipLabel(ctx, 'U_P', upBx - 10, upLabelY, col.wind, FSM, 'right', 'rgba(13,17,23,0.7)');
      }

      // ---- V_rel resultant: tail at (xBase,yTop) → head at the airfoil tip ----
      HLD.arrow(ctx, xBase, yTop, tipX, oy, col.wind, 3, 10);
      const vrFrac = netUpflow ? 0.40 : 0.45;
      const vrx = xBase + (tipX - xBase) * vrFrac, vry = yTop + (oy - yTop) * vrFrac;
      if (!compact) HLD.chipLabel(ctx, 'V_rel', vrx + (netUpflow ? 4 : -6), vry - 12, col.wind, FVrel, 'center');
      HLD.dot(ctx, tipX, oy, 3.5, col.ink);

      // ================= AIRFOIL AT THE TIP + θ/α ARCS =========================
      const thetaDeg = theta * R2D, phiDeg = phi * R2D, aoaDeg = aoa * R2D;
      const deg = (v) => (v >= 0 ? '' : '\u2212') + Math.abs(v).toFixed(0) + '\u00b0';
      if (!reverse) {
        const foilLen = Math.max(78, Math.min(rightPad * 0.8, 150));
        const pitchDisp = (thetaDeg) => Math.sign(thetaDeg || 1) * Math.max(4, Math.min(30, Math.abs(thetaDeg) * 2.0)) * D2R;
        const lex = tipX + 6, ley = oy - 2;
        const naca = HLD.nacaProfile(0.12, 56);
        const drawFoilAt = (leX, leY, len, drawnPitch, style) => {
          const u = { x: Math.cos(drawnPitch), y: Math.sin(drawnPitch) };
          const n = { x: -u.y, y: u.x };
          ctx.save(); ctx.globalAlpha = style.alpha;
          ctx.beginPath();
          naca.forEach((p) => {
            const along = p.x * len, thick = p.y * len;
            const X = leX + along * u.x + thick * n.x;
            const Y = leY + along * u.y + thick * n.y;
            if (p === naca[0]) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          ctx.closePath();
          if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
          ctx.strokeStyle = style.stroke; ctx.lineWidth = style.w || 1.5; ctx.stroke();
          ctx.restore();
          return u;
        };
        const uCh = drawFoilAt(lex, ley, foilLen, pitchDisp(thetaDeg), {
          stroke: stalled2 ? col.bad : '#ffffff',
          fill: stalled2 ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.10)',
          alpha: 1, w: 2.2,
        });
        HLD.dline(ctx, lex, ley, lex + foilLen * 1.02 * uCh.x, ley + foilLen * 1.02 * uCh.y, '#d8d8dc', 1.5, [4, 3]);
        const extLen = Math.max(foilLen * 2.4, 180, (lex - 24) / Math.max(0.25, uCh.x));
        HLD.dline(ctx, lex, ley, lex - extLen * uCh.x, ley - extLen * uCh.y, '#d8d8dc', 1.5, [4, 3]);

        // ---- θ / α arcs centred on the real airfoil LE ----
        const MIN_ARC = 0.02;
        const pitchD = pitchDisp(thetaDeg);
        const vrelAng = Math.atan2(oy - yTop, tipX - xBase);
        const aCol = stalled2 ? col.bad : col.good;
        const tppL = Math.PI, chordL = pitchD + Math.PI, vrelL = vrelAng + Math.PI;
        const thetaTooSmall = Math.abs(pitchD) < MIN_ARC;
        const aCx = lex, aCy = ley;
        const radiusToX = (targetX, midAng, minR, maxR) => {
          const c = Math.cos(midAng);
          if (Math.abs(c) < 1e-3) return minR;
          const r = (targetX - aCx) / c;
          return Math.max(minR, Math.min(maxR, Number.isFinite(r) && r > 0 ? r : minR));
        };
        const upBx = Math.min(xRotTail, xBase, tipX) - (compact ? 14 : 20);
        const thetaTargetX = Math.max(24, upBx - 16);
        const thetaMid = tppL + (chordL - tppL) / 2;
        const thR = radiusToX(thetaTargetX, thetaMid, 24, extLen - 8);
        if (Math.abs(pitchD) >= MIN_ARC) {
          ctx.save(); ctx.strokeStyle = col.chord; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(aCx, aCy, thR, Math.min(tppL, chordL), Math.max(tppL, chordL), false);
          ctx.stroke(); ctx.restore();
          const thLab = tppL + (chordL - tppL) * 0.70;
          HLD.chipLabel(ctx, '\u03b8=' + deg(thetaDeg), aCx + thR * Math.cos(thLab), aCy + thR * Math.sin(thLab), col.chord, FV, 'center', 'rgba(13,17,23,0.6)');
        }
        const alphaTargetX = xBase + 0.5 * (tipX - xBase);
        const a0 = Math.min(vrelL, chordL), a1 = Math.max(vrelL, chordL);
        const aR = radiusToX(alphaTargetX, chordL, compact ? 18 : 22, extLen - 8);
        const posAlpha = aoaDeg > 0.5;
        if ((a1 - a0) >= MIN_ARC) {
          ctx.save(); ctx.strokeStyle = aCol; ctx.lineWidth = posAlpha ? 1.8 : 1.2;
          if (!posAlpha) ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(aCx, aCy, aR, a0, a1, false); ctx.stroke(); ctx.restore();
        }
        if ((a1 - a0) >= MIN_ARC) {
          const aLab = a0 + (a1 - a0) * 0.55;
          HLD.chipLabel(ctx, '\u03b1=' + deg(aoaDeg), aCx + (aR + 12) * Math.cos(aLab), aCy + (aR + 12) * Math.sin(aLab), aCol, FV, 'center', 'rgba(13,17,23,0.82)');
        }
        if (thetaTooSmall) {
          const sx2 = Math.max(28, thetaTargetX - 30);
          const sy2 = Math.max(16, Math.min(oy - 44, H - 60));
          HLD.chipLabel(ctx, '\u03b8=' + deg(thetaDeg), sx2, sy2, col.ink, FV, 'left', 'rgba(13,17,23,0.7)');
          HLD.chipLabel(ctx, '\u03c6=' + deg(phiDeg), sx2, sy2 + 16, col.ink, FV, 'left', 'rgba(13,17,23,0.7)');
        }
      } else {
        HLD.chipLabel(ctx, 'reverse flow — α undefined', tipX - 140, oy - 40, col.bad, FV, 'left', 'rgba(248,113,113,0.15)');
      }

      // reverse / net-upflow flags (below the title so they never collide)
      const flagY = compact ? 38 : 34;
      if (reverse) HLD.chipLabel(ctx, '⚠ reverse flow (U_T < 0)', 24, flagY, col.bad, FV, 'left', 'rgba(248,113,113,0.15)');
      else if (netUpflow) HLD.chipLabel(ctx, '↑ net up-flow (U_P < 0)', 24, flagY, col.warn, FV, 'left', 'rgba(214,158,46,0.15)');

      // title (top-left)
      const cardinal = psiDeg < 45 || psiDeg > 315 ? 'TAIL' : psiDeg < 135 ? 'ADVANCING' : psiDeg < 225 ? 'NOSE' : 'RETREATING';
      const cardAbbr = psiDeg < 45 || psiDeg > 315 ? 'TAIL' : psiDeg < 135 ? 'ADV' : psiDeg < 225 ? 'NOSE' : 'RET';
      const titleStr = compact
        ? `${cardAbbr} ψ${psiDeg}° · ${Vkt}kt`
        : `${cardinal} ψ=${psiDeg}° · r/R=${rBar.toFixed(2)} · ${layer === 'hover' ? 'HOVER' : Vkt + ' kt'}`;
      HLD.chipLabel(ctx, titleStr,
        12, 16, col.dim, '12px IBM Plex Sans, sans-serif', 'left', col.bg);

      // verdict chip (top-right)
      const cw = compact ? 104 : 132, chh = compact ? 20 : 24;
      ctx.globalAlpha = 0.88; ctx.fillStyle = vCol2;
      ctx.fillRect(W - cw - 6, 6, cw + 6, chh + 4); ctx.globalAlpha = 1;
      ctx.strokeStyle = vCol2; ctx.lineWidth = 1.4;
      ctx.strokeRect(W - cw - 6, 6, cw + 6, chh + 4);
      HLD.text(ctx, vTxt, W - 6 - (cw + 6) / 2, 6 + (chh + 4) / 2, '#fff', (compact ? 'bold 11px ' : 'bold 12px ') + 'IBM Plex Sans, sans-serif', 'center', 'middle');
      if (compact) HLD.chipLabel(ctx, 'tap disc to pick a station', 12, H - 8, col.dim, '10px IBM Plex Sans, sans-serif', 'left', col.bg);
    }

    // ── readout ──────────────────────────────────────────────────────
    function drawReadout() {
      const st = HL.defaultState(); st.V = (layer === 'hover' ? 0 : Vkt) * 0.5144;
      const psi = psiDeg * D2R;
      const d = cellAt(layer, st, rBar, psi);
      const aoaDeg = d.aoa * R2D, thDeg = d.theta * R2D, phDeg = d.phi * R2D;
      const stallEff = stallEffAt(st, d.UTn);
      const AL = airloadConf(d.UTn, d.mu);
      const trulyStalled = !d.reverseFlow && aoaDeg >= stallEff && AL.qShare >= 0.25;
      const L = LAYERS.find(l => l.v === layer);
      let verdict = 'OK'; let vcol = col_good;
      if (d.reverseFlow) { verdict = 'REVERSE FLOW (U_T<0)'; vcol = '#b24'; }
      else if (trulyStalled) { verdict = 'STALLED — retreating blade stall'; vcol = col_bad; }
      else if (aoaDeg >= stallEff - 3) { verdict = 'near stall'; vcol = col_warn; }
      readout.innerHTML =
        `<div class="hl-kv-banner" style="border-color:${vcol};color:${vcol}">${verdict}</div>` +
        `<div class="hl-lesson-stage">${L.t} — ${L.sub}</div>` +
        `<p class="hl-lesson-note">${LAYER_NOTE[layer]}</p>` +
        kv([
          ['U_T', d.UT.toFixed(1) + ' m/s', col.chord],
          ['U_P', d.UP.toFixed(1) + ' m/s', col.lift],
          ['v_flap', d.vflap.toFixed(1) + ' m/s', col.accent],
          ['pitch θ', thDeg.toFixed(1) + '°', col.chord],
          ['inflow φ', phDeg.toFixed(1) + '°', col.dim],
          ['AoA α', aoaDeg.toFixed(1) + '°', trulyStalled ? col_bad : col.ink],
        ]) +
        `<div class="hl-kv"><span>critical α</span><b>${stallEff.toFixed(1)}°</b></div>`;
    }
    // colour handles (theme-safe)
    let col = HLD.COL(); const col_good = col.good, col_bad = col.bad, col_warn = col.warn;

    const draw = () => {
      col = HLD.COL();
      const a = HLD.setup(topCanvas); drawDisc(a.ctx, a.W, a.H, col);
      const b = HLD.setup(canvas);   drawTriangle(b.ctx, b.W, b.H, col);
      drawReadout();
    };
    ui.onDraw(draw);
    return { draw };
  }

  return {
    wBigPicture, wBladeElement, wSpanwise, wHover, wVertical, wGroundEffect,
    wDissymmetry, wFlapping, wEnvelope, wCoriolis, wDynamicRollover, wLTE,
    wAutorotation, wPerformance, wBetDiagram, wBetVelocity, wBetModel,
    wSandbox,

    /* ───────────────────────────────────────────────────────────────
       GUIDED BET — a 5-layer build-up that teaches flapping & retreating
       blade stall by layering complexity. Each layer is a PHYSICS PRESET
       (never free-combined — that is exactly the trimmed-θ + natural-flap
       bug the rest of the app once had). The disc colours by one of
       U_T / α / Lift-demand; the velocity triangle morphs live as the
       azimuth sweeps. See guidedBETCell() for the per-layer consistency.
       ─────────────────────────────────────────────────────────────── */
    wGuidedBET,
  };
})();
