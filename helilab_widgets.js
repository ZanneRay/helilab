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
     returns { canvas, controls, readout, onDraw(fn) } and wires a ResizeObserver. */
  function scaffold(host) {
    host.innerHTML = '';
    const wrap = el('div', 'hl-w');
    const stage = el('div', 'hl-w-stage');
    const canvas = el('canvas');
    stage.appendChild(canvas);
    const side = el('div', 'hl-w-side');
    const controls = el('div', 'hl-w-controls');
    const readout = el('div', 'hl-w-readout');
    side.appendChild(controls); side.appendChild(readout);
    wrap.appendChild(stage); wrap.appendChild(side);
    host.appendChild(wrap);

    let drawFn = null;
    const ro = new ResizeObserver(() => { if (drawFn) drawFn(); });
    ro.observe(stage);
    return {
      canvas, controls, readout,
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
    const show = () => { val.textContent = fmt(+inp.value) + (o.unit || ''); };
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
    let cur = o.val;
    o.options.forEach(opt => {
      const b = el('button', 'hl-seg-btn' + (opt.v === cur ? ' on' : ''), opt.t);
      b.addEventListener('click', () => {
        cur = opt.v; grp.querySelectorAll('.hl-seg-btn').forEach(x => x.classList.remove('on'));
        b.classList.add('on'); o.on(opt.v);
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

  /* apply forward-flight trim cyclic to a state (level disc) */
  function trimmed(st) {
    const t = computeTrimCyclic(st);
    return { ...st, theta1s: t.t1s_deg, theta1c: t.t1c_deg };
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
        HLD.text(ctx, 'tail rotor', trx + 2, iy + ir + 6, col.lift, '8px IBM Plex Sans', 'center');
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
      HLD.text(ctx, 'root', sx(0), y0 + 6, col.dim, '10px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, 'r/R', (x0 + x1) / 2, H - 4, col.dim, '10px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, 'tip', sx(1), y0 + 6, col.dim, '10px IBM Plex Sans', 'center', 'top');
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

  /* 9 — Retreating stall & envelope: AoA contour over disc */
  function wEnvelope(host) {
    const ui = scaffold(host);
    let Vkt = 60, qWeight = false;   // qWeight: dim cells by dynamic pressure U_T²
    const draw = () => {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const stt = trimmed(st);
      const c = flappingCoeffs(stt);
      const mu = advanceRatio(stt);
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.42, cy = H * 0.52, R = Math.min(W * 0.32, H * 0.42);
      // paint AoA as filled annular sectors (r 0.2..1, ψ)
      const nr = 10, np = 48;
      let maxRetAoA = -99, tipMach = 0;
      const sos = sosAtAltFt(st.alt);
      for (let ir = 0; ir < nr; ir++) {
        const r0 = 0.2 + 0.8 * ir / nr, r1 = 0.2 + 0.8 * (ir + 1) / nr;
        for (let ip = 0; ip < np; ip++) {
          const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
          const pm = (p0 + p1) / 2, rm = (r0 + r1) / 2;
          const d = localAoA(stt, c, rm, pm);
          const aoaDeg = d.aoa * R2D;
          // Mach-dependent stall threshold: c_lmax (and stall α) falls with local
          // Mach above ~0.3 (NACA-0012 trend), floored at 5°. This paints the
          // advancing-tip compressibility limit onto the same map as retreating stall.
          const Mloc = HL.omR(st) * Math.max(0, d.UT) / sos;
          const stallEff = Math.max(5, st.stallAoA - 18 * Math.max(0, Mloc - 0.30));
          // q-weighting: dim each cell by its share of dynamic pressure
          // (U_T², normalised by the advancing tip). The inboard high-α blob
          // fades to nothing — no airload there — while the tip keeps α AND energy.
          ctx.globalAlpha = qWeight
            ? 0.05 + 0.95 * Math.pow(Math.max(0, d.UT) / (1 + mu), 2)
            : 1;
          if (d.reverseFlow) { ctx.fillStyle = 'rgba(180,60,200,0.5)'; }
          else { ctx.fillStyle = aoaColor(aoaDeg, stallEff); }
          if (!d.reverseFlow && pm > Math.PI / 2 - 0.3 && pm < Math.PI / 2 + 0.3 && rm > 0.9) {
            tipMach = Math.max(tipMach, HL.omR(st) * (rm + mu * Math.sin(pm)) / sos);
          }
          // retreating-stall metric: only the outboard retreating blade with real
          // tangential speed — cells near the reverse-flow boundary (UT→0) give
          // huge, meaningless AoA and must be excluded (cf. flapping.js note).
          if (!d.reverseFlow && Math.sin(pm) < -0.3 && rm >= 0.6 && d.UT >= 0.2)
            maxRetAoA = Math.max(maxRetAoA, aoaDeg);
          ctx.beginPath();
          ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
          ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
          ctx.closePath(); ctx.fill();
          // CVD texture: hatch stalled cells (45°) and reverse-flow cells (135°)
          const stallCell = !d.reverseFlow && aoaDeg >= stallEff;
          if (stallCell || d.reverseFlow) {
            const ang = HLD.polarToCanvas(pm);
            const ux = cx + R * rm * Math.cos(ang), uy = cy + R * rm * Math.sin(ang);
            const len = R * (r1 - r0) * 0.9;
            HLD.tick(ctx, ux, uy, len, stallCell ? Math.PI / 4 : -Math.PI / 4,
              stallCell ? 'rgba(120,10,10,0.8)' : 'rgba(90,20,110,0.8)', 1.2);
          }
        }
      }
      ctx.globalAlpha = 1;                       // q-weighting applies to cells only
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.text(ctx, 'ADV 90°', cx + R + 4, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
      HLD.text(ctx, 'RET 270°', cx - R - 4, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
      HLD.text(ctx, 'NOSE', cx, cy - R - 6, col.dim, '10px IBM Plex Sans', 'center');
      // legend
      HLD.text(ctx, '■ ok', W - 60, 20, col.good, '10px IBM Plex Sans');
      HLD.text(ctx, '■ near stall', W - 60, 34, col.warn, '10px IBM Plex Sans');
      HLD.text(ctx, '■ stalled', W - 60, 48, col.bad, '10px IBM Plex Sans');
      HLD.text(ctx, '■ reverse', W - 60, 62, '#c46ee0', '10px IBM Plex Sans');
      const stalled = maxRetAoA >= st.stallAoA;
      const machHigh = tipMach > 0.85;
      // combined envelope status (the "two walls")
      const exceeded = stalled || machHigh;
      const approaching = !exceeded && (maxRetAoA >= st.stallAoA - 2 || tipMach > 0.80);
      const envTxt = exceeded ? (stalled && machHigh ? 'V_NE — both limits' : stalled ? 'V_NE — retreating stall' : 'V_NE — compressibility')
        : approaching ? 'approaching V_NE' : 'within envelope';
      const envCol = exceeded ? 'var(--hl-bad)' : approaching ? 'var(--hl-warn)' : 'var(--hl-good)';
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Max retreating α', maxRetAoA.toFixed(1) + '° / ' + st.stallAoA.toFixed(0) + '°', stalled ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['Advancing tip Mach', tipMach.toFixed(2) + ' / 0.85', machHigh ? 'var(--hl-bad)' : 'var(--hl-good)'],
        ['Envelope', envTxt, envCol],
      ]) + `<p class="hl-note">${qWeight
        ? 'Cells are dimmed by their <b>dynamic pressure</b> (∝ U_T²). The inboard high-α blob fades to almost nothing — there is no airload there to lose — while the outboard retreating blade keeps both α <i>and</i> energy. That is why retreating stall is <b>felt at the tip</b>, even though raw α peaks inboard.'
        : exceeded
        ? '⚠ Outside the envelope: ' + (stalled ? 'retreating tip STALLED (red, hatched) — vibration, nose-up pitch, roll toward the retreating side. ' : '') + (machHigh ? 'advancing tip is compressible — shock/buffet. ' : '')
        : 'The two walls of V_NE: retreating stall (red, hatched, left side) and advancing-tip Mach (right). The map lowers the stall α with local Mach, so at very high speed the advancing tip also colours toward stall — shock-induced separation.'}</p>`;
    };
    slider(ui.controls, { label: 'Forward speed', min: 0, max: 180, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    toggle(ui.controls, { label: 'Weight by dynamic pressure (U_T²)', val: false, on: v => { qWeight = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 10 — Autorotation: spanwise driving/driven regions */
  function wAutorotation(host) {
    const ui = scaffold(host);
    const st = HL.defaultState();
    let rMark = 0.55, upflow = 6, coll = 4;   // up-flow through disc [m/s], collective [°]
    // Spanwise force balance with UPWARD flow through the disc.
    //   φ = atan(−λ_up / r)  (negative, since flow is up through the disc)
    //   in-plane force  F_x = L·sinφ + D·cosφ   (Leishman) — with φ<0:
    //     F_x < 0  → force tilts WITH rotation → DRIVING (accelerates rotor)
    //     F_x > 0  → force opposes rotation     → DRIVEN  (brakes rotor)
    const regionAt = (r, upInflow) => {
      const phi = Math.atan2(-upInflow, Math.max(0.04, r));
      const th = (coll + st.twist * (r - 0.75)) * D2R;
      const a = th - phi;                       // φ<0 ⇒ a = θ + |φ|
      const cl = HL.clOf(st, a), cd = HL.cdOf(st, cl);
      const fx = cl * Math.sin(phi) + cd * Math.cos(phi);
      const reg = (a > st.stallAoA * D2R || r < 0.18) ? 'stall' : (fx < 0 ? 'driving' : 'driven');
      return { reg, a, phi, fx };
    };
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const OmR = HL.omR(st);
      const upInflow = upflow / OmR;
      const barY = H * 0.80, barH = 26, x0 = 40, x1 = W - 40;
      const sx = r => x0 + r * (x1 - x0);
      const colReg = { stall: '#b86ed0', driving: col.good, driven: col.warn };
      const cw = (x1 - x0) / 90 + 1;
      let netTorque = 0;          // Σ (−Fx)·r  (>0 ⇒ rotor accelerating)
      for (let i = 0; i < 90; i++) {
        const r = i / 90;
        const rg = regionAt(r + 0.005, upInflow);
        if (rg.reg !== 'stall') netTorque += (-rg.fx) * r;
        ctx.fillStyle = colReg[rg.reg];
        ctx.fillRect(sx(r), barY, cw, barH);
        // CVD texture: driven = diagonal hatch, stall = cross-hatch, driving = solid
        if (rg.reg === 'driven') HLD.tick(ctx, sx(r) + cw / 2, barY + barH / 2, barH * 0.8, Math.PI / 4, 'rgba(120,80,10,0.7)', 1);
        else if (rg.reg === 'stall') HLD.tick(ctx, sx(r) + cw / 2, barY + barH / 2, barH * 0.8, Math.PI / 2, 'rgba(80,20,100,0.7)', 1);
      }
      HLD.text(ctx, 'root', x0, barY + barH + 6, col.dim, '10px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, 'tip', x1, barY + barH + 6, col.dim, '10px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, '■ stall', x0, barY - 10, '#b86ed0', '10px IBM Plex Sans');
      HLD.text(ctx, '■ driving (speeds rotor up)', x0 + 56, barY - 10, col.good, '10px IBM Plex Sans');
      HLD.text(ctx, '■ driven (brakes)', x1 - 104, barY - 10, col.warn, '10px IBM Plex Sans');
      // blade element at marker
      const m = regionAt(rMark, upInflow);
      const th = (coll + st.twist * (rMark - 0.75)) * D2R;
      const ox = W * 0.26, oy = H * 0.40, len = Math.min(W * 0.42, 240);
      HLD.bladeSection(ctx, ox, oy, len, { theta: th, phi: m.phi, ampl: 3.0, showForces: false, aoa: m.a }, col);
      HLD.arrow(ctx, ox + len * 0.5, oy + 34, ox + len * 0.5, oy + 6, col.wind, 2, 8);
      HLD.text(ctx, 'up-flow', ox + len * 0.5 + 6, oy + 22, col.wind, '10px IBM Plex Sans');
      HLD.dline(ctx, sx(rMark), barY, sx(rMark), barY - 4, col.ink, 1, [1, 0]);
      HLD.dot(ctx, sx(rMark), barY - 2, 4, col.ink);
      const rrpm = netTorque > 0.004 ? 'increasing ↑' : netTorque < -0.004 ? 'decaying ↓' : 'steady (balanced)';
      const rrpmCol = netTorque > 0.004 ? 'var(--hl-good)' : netTorque < -0.004 ? 'var(--hl-bad)' : 'var(--hl-warn)';
      ui.readout.innerHTML = kv([
        ['Station r/R', rMark.toFixed(2), 'var(--hl-ink)'],
        ['Collective θ₀', coll.toFixed(1) + '°', 'var(--hl-chord)'],
        ['Up-flow through disc', upflow.toFixed(0) + ' m/s', 'var(--hl-wind)'],
        ['Local α', (m.a * R2D).toFixed(1) + '°', m.reg === 'stall' ? 'var(--hl-bad)' : 'var(--hl-good)'],
        ['Region here', m.reg.toUpperCase(),
          m.reg === 'driving' ? 'var(--hl-good)' : m.reg === 'driven' ? 'var(--hl-warn)' : '#c46ee0'],
        ['Rotor RPM trend', rrpm, rrpmCol],
      ]) + `<p class="hl-note">The up-flow tilts the total force. In the
        <b>driving</b> region (mid-span) it leans ahead of the axis and accelerates
        the rotor; the <b>driven</b> tip brakes and the root stalls. When driving wins,
        <b>RRPM rises</b>; when driven wins, it decays — <b>lower the collective</b> to
        grow the driving region and hold RRPM. At the bottom, a <b>flare</b> trades the
        stored RRPM and descent energy for a cushioning burst of thrust.</p>`;
    };
    slider(ui.controls, { label: 'Collective θ₀ (RRPM control)', min: 1, max: 9, step: 0.5, val: coll, unit: '°', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Blade station r/R', min: 0.1, max: 1.0, step: 0.01, val: rMark, unit: '', fmt: v => v.toFixed(2), on: v => { rMark = v; draw(); } });
    slider(ui.controls, { label: 'Up-flow through disc', min: 3, max: 12, step: 0.5, val: upflow, unit: ' m/s', fmt: v => v.toFixed(1), on: v => { upflow = v; draw(); } });
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
      const ox = W * 0.16, oy = H * 0.62, sc = Math.min(W * 0.62, 320);
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
      // natural response (no pilot cyclic): keeps every panel lively and
      // consistent — flapping itself does most of the lift-balancing here.
      st.theta1c = 0; st.theta1s = 0;
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
            const stallCell = !d.reverseFlow && d.aoa * R2D >= stallEff;
            ctx.fillStyle = d.reverseFlow ? 'rgba(180,60,200,0.5)' : aoaColor(d.aoa * R2D, stallEff);
            ctx.beginPath();
            ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
            ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
            ctx.closePath(); ctx.fill();
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

  return {
    wBigPicture, wBladeElement, wSpanwise, wHover, wVertical, wGroundEffect,
    wDissymmetry, wFlapping, wEnvelope, wAutorotation, wPerformance, wBetDiagram,
    wSandbox,
  };
})();
