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
    if (opts.sideFirst) { wrap.appendChild(side); wrap.appendChild(stage); }
    else { wrap.appendChild(stage); wrap.appendChild(side); }
    host.appendChild(wrap);

    let drawFn = null;
    const ro = new ResizeObserver(() => { if (drawFn) drawFn(); });
    (host._hlDisposers ||= []).push(() => { ro.disconnect(); drawFn = null; });
    ro.observe(stage);
    if (topStage) ro.observe(topStage);
    return {
      canvas, topCanvas, controls, readout,
      onDraw(fn) { drawFn = fn; requestAnimationFrame(() => { if (drawFn && host.isConnected) drawFn(); }); },
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
    o.options.forEach((opt, index) => {
      const b = el('button', 'hl-seg-btn' + (opt.v === cur ? ' on' : ''), opt.t);
      b.setAttribute('role', 'radio');
      b.tabIndex = opt.v === cur || (!o.options.some(x=>x.v===cur) && index===0) ? 0 : -1;
      b.onkeydown = e => { const keys=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End']; if(!keys.includes(e.key))return; e.preventDefault();const delta=['ArrowRight','ArrowDown'].includes(e.key)?1:-1;const n=e.key==='Home'?0:e.key==='End'?o.options.length-1:(index+delta+o.options.length)%o.options.length;const target=grp.children[n];target.focus();target.click(); };
      b.setAttribute('aria-checked', opt.v === cur ? 'true' : 'false');
      b.addEventListener('click', () => {
        const hadFocus = document.activeElement === b;
        cur = opt.v;
        grp.querySelectorAll('.hl-seg-btn').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); x.tabIndex=-1; });
        b.classList.add('on'); b.setAttribute('aria-checked', 'true'); b.tabIndex=0; o.on(opt.v);
        if(hadFocus) [...parent.querySelectorAll('[role=radio]')].find(x=>x.textContent===b.textContent)?.focus({preventScroll:true});
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

  function addStageNote(host, html) {
    const stage = host.querySelector('.hl-w-stage');
    if (!stage) return null;
    const note = el('div', 'hl-stage-note', html);
    stage.insertAdjacentElement('afterend', note);
    return note;
  }

  const BLADE_AIRFOIL = HLD.nacaProfile(0.12, 56);
  function drawBladeElementScene(ctx, ox, oy, len, opts, col) {
    const th = opts.theta, ph = opts.phi, A = opts.ampl || 1;
    const thV = th * A, phV = ph * A;
    const aCol = opts.aoaColor || (opts.stall ? col.bad : (opts.aoa != null && opts.aoa < 0.035 ? col.warn : col.lift));

    HLD.dline(ctx, ox - len * 0.34, oy, ox + len * 1.12, oy, col.dim, 1, [5, 4]);
    HLD.chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');

    const wlen = len * 0.92;
    const wtx = ox + wlen * Math.cos(phV), wty = oy - wlen * Math.sin(phV);
    if (opts.showVrel !== false) {
      HLD.arrow(ctx, wtx, wty, ox, oy, col.wind, 2.2, 10);
      HLD.chipLabel(ctx, opts.vrelLabel || 'V_rel',
        ox + wlen * 0.80 * Math.cos(phV),
        oy - wlen * 0.80 * Math.sin(phV) - 12,
        col.wind, 'bold 11px IBM Plex Sans', 'center');
    }

    const prof = opts.airfoil || BLADE_AIRFOIL;
    const ac = 0.42 * len;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-thV);
    ctx.strokeStyle = col.chord; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ac, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.chord; ctx.lineWidth = 1.6;
    ctx.beginPath();
    prof.forEach((p, i) => {
      const X = (1 - p.x) * ac;
      const Y = -p.y * ac;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    ctx.restore();
    HLD.dot(ctx, ox, oy, 4, col.chord);
    const lex = ox + ac * Math.cos(thV), ley = oy - ac * Math.sin(thV);
    if(len >= 140) HLD.chipLabel(ctx, opts.airfoilName || 'NACA 0012', lex + 8, ley - 12, col.chord, '10px IBM Plex Sans', 'left');

    if (opts.showAngles) {
      const arcLbl = (r, a0, a1, color, str, font, dy) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ox, oy, r, a0, a1, a1 < a0); ctx.stroke();
        const m = (a0 + a1) / 2;
        HLD.chipLabel(ctx, str, ox + (r + 12) * Math.cos(m), oy + (r + 12) * Math.sin(m) + (dy || 0), color, font || '11px IBM Plex Sans', 'center');
      };
      const aScale = len < 140 ? len / 140 : 1;
      arcLbl(40 * aScale, 0, -thV, col.chord, 'θ ' + (th * 180 / Math.PI).toFixed(1) + '°', null, len < 140 ? -12 : -6);
      arcLbl(64 * aScale, 0, -phV, col.wind, 'φ ' + (ph * 180 / Math.PI).toFixed(1) + '°', null, 12);
      if (opts.showAlpha !== false) {
        const aMid = (thV + phV) / 2;
        ctx.strokeStyle = aCol; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(ox, oy, 88 * aScale, -phV, -thV, phV < thV); ctx.stroke();
        const wedgeX = ox + 88 * aScale * Math.cos(aMid), wedgeY = oy - 88 * aScale * Math.sin(aMid);
        const aLblR = 88 * aScale + Math.max(18 * aScale, len * 0.10);
        const aLblDy = (thV >= phV ? -1 : 1) * (len < 140 ? 8 : 12);
        const aLblX = ox + aLblR * Math.cos(aMid), aLblY = oy - aLblR * Math.sin(aMid) + aLblDy;
        HLD.dline(ctx, wedgeX, wedgeY, aLblX, aLblY + 6, aCol, 1, [2, 3]);
        HLD.chipLabel(ctx, 'α ' + ((th - ph) * 180 / Math.PI).toFixed(1) + (len < 140 ? '°' : '° (AoA)'),
          aLblX, aLblY, aCol, 'bold 12px IBM Plex Sans', 'center');
      }
    }

    if ((opts.showForces || opts.showResultant || opts.showResolve) && !opts.stall) {
      const fL = Math.max(0, opts.cl || 0) * (len * 0.84);
      const fD = Math.max(0, opts.cd || 0) * (len * 8.0);
      const Lx = -fL * Math.sin(phV), Ly = -fL * Math.cos(phV);
      const Dx = -fD * Math.cos(phV), Dy = fD * Math.sin(phV);
      if (opts.showForces) {
        const lmag = Math.hypot(Lx, Ly) || 1;
        HLD.arrow(ctx, ox, oy, ox + Lx, oy + Ly, col.lift, 2.4, 9);
        HLD.chipLabel(ctx, opts.liftLabel || 'L', ox + Lx - (Ly / lmag) * 16, oy + Ly + (Lx / lmag) * 16, col.lift, 'bold 11px IBM Plex Sans', 'center');
        HLD.arrow(ctx, ox, oy, ox + Dx, oy + Dy, col.drag, 2.0, 8);
        HLD.chipLabel(ctx, opts.dragLabel || 'D', ox + Dx - 10, oy + Dy + 8, col.drag, '10px IBM Plex Sans', 'center');
      }
      const tafX = Lx + Dx, tafY = Ly + Dy;
      const tafMag = Math.hypot(tafX, tafY) || 1;
      const tafCol = '#c084fc';
      if (opts.showParallelogram) {
        HLD.dline(ctx, ox + Lx, oy + Ly, ox + tafX, oy + tafY, col.dim, 1, [5, 4]);
        HLD.dline(ctx, ox + Dx, oy + Dy, ox + tafX, oy + tafY, col.dim, 1, [5, 4]);
        HLD.chipLabel(ctx, opts.resultantSumLabel || 'TAF = F_L + F_D',
          ox + tafX - (tafY / tafMag) * 28,
          oy + tafY + (tafX / tafMag) * 28,
          tafCol, '10px IBM Plex Sans', 'center');
      }
      if (opts.showResultant) {
        HLD.arrow(ctx, ox, oy, ox + tafX, oy + tafY, tafCol, 2.6, 10);
        HLD.chipLabel(ctx, opts.resultantLabel || 'TAF',
          ox + tafX + (tafY / tafMag) * 16,
          oy + tafY - (tafX / tafMag) * 16,
          tafCol, 'bold 11px IBM Plex Sans', 'center');
      }
      if (opts.showResolve) {
        const S = len * 0.75, FH_X = 6;
        const fHtrue = (opts.cl || 0) * Math.sin(ph) + (opts.cd || 0) * Math.cos(ph);
        const fTtrue = (opts.cl || 0) * Math.cos(ph) - (opts.cd || 0) * Math.sin(ph);
        const Tx = -fHtrue * S * FH_X;
        const Ty = -fTtrue * S;
        HLD.dline(ctx, ox + Tx, oy + Ty, ox + Tx, oy, col.dim, 1, [3, 3]);
        HLD.dline(ctx, ox + Tx, oy + Ty, ox, oy + Ty, col.dim, 1, [3, 3]);
        const tmag = Math.hypot(Tx, Ty) || 1;
        const tpx = Ty / tmag, tpy = -Tx / tmag;
        HLD.arrow(ctx, ox, oy, ox, oy + Ty, col.good, 2.4, 9);
        HLD.chipLabel(ctx, opts.resolveLabel || 'Thrust',
          ox - 20, oy + Ty + (Ty < 0 ? -12 : 16), col.good, 'bold 10px IBM Plex Sans', 'right');
        const fhCol = Tx > 0 ? col.good : col.warn;
        HLD.arrow(ctx, ox, oy, ox + Tx, oy, fhCol, 2.4, 9);
        HLD.chipLabel(ctx, opts.fhLabel || 'F_H ×6',
          ox + Tx + (Tx < 0 ? -20 : 20), oy + 28, fhCol, 'bold 10px IBM Plex Sans', Tx < 0 ? 'right' : 'left');
        HLD.arrow(ctx, ox, oy, ox + Tx, oy + Ty, tafCol, 2.6, 10);
        HLD.chipLabel(ctx, 'TAF', ox + Tx + tpx * 18, oy + Ty + tpy * 18, tafCol, 'bold 11px IBM Plex Sans', 'center');
      }
    }

    if (opts.showVelocity) {
      const fX = wtx, fY = oy;
      HLD.arrow(ctx, fX, fY, ox, fY, col.wind, 1.5, 7);
      HLD.arrow(ctx, wtx, wty, fX, fY, col.wind, 1.5, 7);
      const sq = 5;
      HLD.dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
      HLD.dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
      HLD.chipLabel(ctx, 'v_rot', (fX + ox) / 2, fY + 12, col.wind, 'bold 10px IBM Plex Sans', 'center');
      HLD.chipLabel(ctx, 'v_i', fX - 7, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
      HLD.chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
    }
    if (opts.stall) {
      HLD.text(ctx, '⚠ STALLED', ox + len * 0.45, oy - len * 0.4, col.bad, 'bold 13px IBM Plex Sans', 'center');
    }
    return { thV, phV, wtx, wty, wlen };
  }

  /* explain why the 3-D view didn't load (most often: opened via file://) */
  function noThreeHTML() {
    return '<div class="hl-sb-3d-fallback"><div><b>Continue with the 2D models</b><p>3D is unavailable in this browser. All training outcomes remain accessible.</p><p><a href="#/activity/cbt-m1-bigpicture">Explore rotor force</a> · <a href="#/activity/cbt-m7-bet-guided">Inspect the velocity triangle</a></p></div></div>';
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

  function ratioColor(ratio) {
    return ratio>=1?'rgb(235,70,50)':ratio>=.8?'rgb(240,190,60)':aoaColor(ratio*100,100);
  }

  /* apply forward-flight trim cyclic to a state (level disc) */
  function trimmed(st) {
    const t = computeTrimCyclic(st);
    return { ...st, theta1s: t.t1s_deg, theta1c: t.t1c_deg };
  }

  /* Optional map presets change several assumptions, not twist alone.
     Both use the actual local UT in the normal-flow angle triangle. */
  function localAoAmodel(st,c,rBar,psi,model) {
    if(model!=='foundation')return localAoA(st,c,rBar,psi);
    return HLMechanisms.foundation(st,rBar,psi);
  }

  function rotorViewState(cfg) {
    const state = Object.assign({
      coll: 9.2, Vkt: 0, Vc: 0, weight: 2800, alt: 0, ige: false, zR: 1.0, psi: 90,
    }, cfg || {});
    const st = HL.defaultState();
    st.theta0 = state.coll;
    st.V = state.Vkt * 0.5144;
    st.Vc = state.Vc;
    st.W_kg = state.weight;
    st.alt = state.alt;
    st.ige = !!state.ige;
    st.zR = state.zR;
    st.theta1c = 0;
    st.theta1s = 0;
    const stt = trimmed(st);
    const coeffs = flappingCoeffs(stt);
    const trim = computeTrimCyclic(stt);
    return {
      st: stt,
      coeffs,
      omR: HL.omR(stt),
      mu: advanceRatio(stt),
      lam: inflowRatio(stt),
      coningDeg: coeffs.a0 * R2D,
      bodyPitchDeg: Math.max(0, -trim.fusPitchDeg),
      bladePitchDeg: state.coll,
      psiDeg: state.psi,
    };
  }

  function mountManagedRotor3D(stage, opts) {
    const options = opts || {};
    let view3d = null;
    let visible = !document.hidden;
    let onscreen = true;
    let reduceMotion = false;
    let pausedState = null;
    let io = null;
    let motionQuery = null;
    let onVisibility = null;
    let onMotion = null;
    if (window.matchMedia) {
      motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotion = !!motionQuery.matches;
    }
    if (window.HL3D) {
      try {
        view3d = window.HL3D.create(stage, Object.assign({}, options.create || {}, {
          paused: reduceMotion || !!options.initialPaused || !!(options.isPaused && options.isPaused()),
        }));
      } catch (e) {
        console.error('HL3D create failed', e);
      }
    }
    if (!view3d) {
      stage.innerHTML = noThreeHTML();
      return {
        view3d: null,
        reduceMotion,
        setData() {},
        cleanup() {},
      };
    }
    const syncLifecycle = (forcePaused) => {
      if (!view3d) return;
      const nextPaused = !!(forcePaused || reduceMotion || !visible || !onscreen);
      if (pausedState === nextPaused) return;
      pausedState = nextPaused;
      if (typeof view3d.setPaused === 'function') view3d.setPaused(nextPaused);
      else view3d.update({ paused: nextPaused });
    };
    onVisibility = () => { visible = !document.hidden; syncLifecycle(!!options.isPaused && options.isPaused()); };
    document.addEventListener('visibilitychange', onVisibility);
    if (motionQuery) {
      onMotion = (e) => { reduceMotion = !!e.matches; syncLifecycle(!!options.isPaused && options.isPaused()); };
      motionQuery.addEventListener('change', onMotion);
    }
    if (window.IntersectionObserver) {
      io = new IntersectionObserver((entries) => {
        onscreen = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.2);
        syncLifecycle(!!options.isPaused && options.isPaused());
      }, { threshold: [0, 0.2, 0.5] });
      io.observe(stage);
    }
    syncLifecycle(!!options.isPaused && options.isPaused());
    return {
      view3d,
      reduceMotion,
      setData(data) {
        if (!view3d) return;
        view3d.update(data);
      },
      syncLifecycle() {
        syncLifecycle(!!options.isPaused && options.isPaused());
      },
      cleanup() {
        try { io && io.disconnect(); } catch (e) {}
        if (motionQuery && onMotion) {
          try { motionQuery.removeEventListener('change', onMotion); } catch (e) {}
        }
        if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
        try { view3d && view3d.dispose(); } catch (e) {}
        view3d = null;
      },
    };
  }

  function renderRotorTeaserReadout(box, cfg, derived) {
    const airspeed = cfg.Vkt || 0;
    const wakeCue = airspeed < 10 ? 'wake stays mostly vertical beneath the disc'
      : airspeed < 50 ? 'wake starts to lean aft as the rotor moves forward'
      : 'wake is clearly swept aft by the forward motion';
    box.innerHTML = kv([
      ['Airspeed', airspeed.toFixed(0) + ' kt', 'var(--hl-accent)'],
      ['Wake response', wakeCue, 'var(--hl-good)'],
      ['Cause', 'More forward speed pushes the trailing wake aft.', 'var(--hl-wind)'],
    ]);
  }

  function wRotorTeaser(host, opts) {
    const config = Object.assign({
      min: 0, max: 80, step: 5, label: 'Airspeed', hint: 'μ ↑ → wake skew ↑',
      state: {},
    }, opts || {});
    host.innerHTML = '';
    const wrap = el('div', 'hl-rotor-teaser');
    const stage = el('div', 'hl-rotor-stage');
    const side = el('div', 'hl-rotor-side');
    const controls = el('div', 'hl-rotor-controls');
    const readout = el('div', 'hl-rotor-readout');
    const hint = el('div', 'hl-rotor-hint', config.hint);
    wrap.appendChild(stage);
    side.appendChild(controls);
    side.appendChild(readout);
    side.appendChild(hint);
    wrap.appendChild(side);
    host.appendChild(wrap);

    const state = Object.assign({}, config.state);
    let manualPaused = false;
    const mount3d = mountManagedRotor3D(stage, {
      create: { showWake: true, showFuselage: true, showVel: false, showMarker: false },
      isPaused: () => manualPaused,
    });
    const speed = slider(controls, {
      label: config.label, min: config.min, max: config.max, step: config.step,
      val: state.Vkt != null ? state.Vkt : 0, unit: ' kt',
      fmt: v => v.toFixed(0),
      on: (v) => {
        state.Vkt = v;
        update();
      },
    });
    if (mount3d.reduceMotion) {
      side.insertBefore(el('div', 'hl-rotor-note',
        'Reduced motion is on — the 3D state updates without continuous rotor animation.'), readout);
    }
    function update() {
      state.Vkt = speed.get();
      const derived = rotorViewState(state);
      mount3d.setData({
        coningDeg: derived.coningDeg,
        bodyPitchDeg: derived.bodyPitchDeg,
        bladePitchDeg: derived.bladePitchDeg,
        psiDeg: derived.psiDeg,
        mu: derived.mu,
        lam: derived.lam,
        showWake: true,
        showFuselage: true,
        showVel: false,
      });
      renderRotorTeaserReadout(readout, state, derived);
    }
    update();
    return {
      dispose() {
        mount3d.cleanup();
      },
    };
  }

  function wGuidedRotorLab(host, preset) {
    const cfg = preset || {};
    host.innerHTML = '';
    const wrap = el('div', 'hl-rotor-guide');
    wrap.innerHTML =
      '<div class="hl-rotor-guide-copy">' +
      '<div class="hl-lesson-stage">Guided 3D view</div>' +
      `<h2>${cfg.title || 'View this in 3D'}</h2>` +
      `<p>${cfg.summary || 'Use one constrained control and connect the blade-element idea to the full rotor.'}</p>` +
      '</div>';
    const mount = el('div', 'hl-rotor-guide-mount');
    wrap.appendChild(mount);
    host.appendChild(wrap);
    if ((cfg.controls || []).includes('radius')) return wGuidedRotorStation(mount, cfg);
    return wRotorTeaser(mount, {
      min: 0,
      max: 90,
      step: 5,
      label: 'Airspeed',
      hint: 'Start near hover, then increase airspeed to watch the wake skew aft.',
      state: cfg.state || {},
    });
  }

  function renderRotorStationReadout(box, derived, rBar) {
    const vRot = derived.omR * rBar;
    const cue = rBar < 0.35 ? 'Near the hub the same RPM gives a small local speed.'
      : rBar < 0.7 ? 'Move outward and the blade element sweeps a larger circle each turn.'
      : 'Near the tip the same blade element moves much faster through the air.';
    box.innerHTML = kv([
      ['Blade station', rBar.toFixed(2) + 'R', 'var(--hl-accent)'],
      ['Local rotor speed', vRot.toFixed(0) + ' m/s', 'var(--hl-good)'],
      ['2D element on the rotor', 'The yellow marker shows where that local blade slice sits.', 'var(--hl-ink)'],
      ['Why v_rot changes', cue, 'var(--hl-wind)'],
    ]);
  }

  function wGuidedRotorStation(host, preset) {
    const cfg = preset || {};
    host.innerHTML = '';
    const wrap = el('div', 'hl-rotor-teaser');
    const stage = el('div', 'hl-rotor-stage');
    const side = el('div', 'hl-rotor-side');
    const controls = el('div', 'hl-rotor-controls');
    const readout = el('div', 'hl-rotor-readout');
    const hint = el('div', 'hl-rotor-hint',
      cfg.hint || 'Slide the blade station from root to tip and match the yellow marker to the 2D blade element.');
    wrap.appendChild(stage);
    side.appendChild(controls);
    side.appendChild(readout);
    side.appendChild(hint);
    wrap.appendChild(side);
    host.appendChild(wrap);

    const state = Object.assign({}, cfg.state || {});
    if (state.psi == null) state.psi = 90;
    let rBar = cfg.initialRBar == null ? 0.75 : cfg.initialRBar;
    const mount3d = mountManagedRotor3D(stage, {
      create: { showWake: false, showFuselage: true, showVel: true, showMarker: true, markerRBar: rBar },
    });
    slider(controls, {
      label: 'Blade station r/R', min: 0.15, max: 1, step: 0.05, val: rBar,
      fmt: v => v.toFixed(2),
      on: (v) => {
        rBar = v;
        update();
      },
    });
    if (mount3d.reduceMotion) {
      side.insertBefore(el('div', 'hl-rotor-note',
        'Reduced motion is on — the 3D state updates as a static frame.'), readout);
    }
    function update() {
      const derived = rotorViewState(state);
      mount3d.setData({
        coningDeg: derived.coningDeg,
        bodyPitchDeg: derived.bodyPitchDeg,
        bladePitchDeg: derived.bladePitchDeg,
        psiDeg: derived.psiDeg,
        mu: derived.mu,
        lam: derived.lam,
        markerRBar: rBar,
        showWake: false,
        showFuselage: true,
        showVel: true,
        showMarker: true,
      });
      renderRotorStationReadout(readout, derived, rBar);
    }
    update();
    return {
      dispose() {
        mount3d.cleanup();
      },
    };
  }

  /* =========================================================================
     WIDGETS
     ========================================================================= */

  /* 1 — Big picture: side-view helicopter — collective (real T/W), cyclic, pedals */
  function wBigPicture(host) {
    const ui = scaffold(host);
    let coll = 52, cyc = 0, pedal = 0, spd = 0;   // collective %, cyclic ±, pedal ±, airspeed m/s
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
      // Real side-view wireframe of the H145 (precomputed from Heli_simple.obj).
      // Place the main-rotor HUB on the mast top so the disc/thrust sit exactly on
      // the rotor axis; the body hangs below it, belly near `cy`.
      const mastTop = cy - 52;
      const WS = W * 0.40;
      HLD.drawHeliWire(ctx, { cx, cy: mastTop, scale: WS, color: col.dim, width: 1.3, alpha: 0.9 });
      // nose tip screen x (model faces right: nose at M2.noseX, hub at M2.hub.x)
      const M2 = window.HL_MODEL2D;
      const noseXs = cx + (M2.noseX - M2.hub.x) * WS;
      HLD.text(ctx, 'nose ▸', noseXs + 4, cy + 38, col.dim, '9px IBM Plex Sans', 'center');
      // mast + disc
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
      // weight + drag act at the CG (lower body); thrust + accelerate stay at the hub.
      // Two origin clusters keep the body free-body clean (weight no longer crosses
      // the whole fuselage) while the rotor forces still read from the hub.
      const cgY = cy - 6;
      HLD.arrow(ctx, cx, cgY, cx, cgY + WL, col.dim, 3, 10);
      HLD.text(ctx, 'Weight', cx + 8, cgY + WL * 0.5, col.dim, '11px IBM Plex Sans');

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

      // parasite drag D = ½ρV²f_eq  (engine Ppar = ½ρV³f_eq → D = Ppar/V)
      const WN = HL.weightN(st), rho = HL.rho(st);
      const DN = 0.5 * rho * spd * spd * st.fEq;
      const ThN = tw * WN * Math.sin(tilt);          // T·sin(tilt): forward thrust component
      const netN = ThN - DN;                          // net horizontal force → acceleration
      const dragPx = Math.min(DN / Math.max(ThN, WN * 0.02) * WL, 1.6 * WL);
      if (dragPx > 4) {                               // drag opposes motion (backward = left), from the CG
        HLD.arrow(ctx, cx, cgY, cx - dragPx, cgY, col.drag, 3, 10);
        HLD.text(ctx, 'Drag ' + (DN < 1000 ? DN.toFixed(0) : (DN / 1000).toFixed(1) + 'k') + ' N',
          cx - dragPx * 0.5, cgY - 12, col.drag, '10px IBM Plex Sans', 'center');
      }
      // net horizontal force → acceleration (the residual T_h − Drag). Scaled on WN
      // so the net arrow stays SMALL — it's a residual, never larger than the
      // thrust/weight/drag arrows that produce it (WN ≫ net force).
      const netPx = Math.max(-1.6 * WL, Math.min(1.6 * WL, netN / WN * WL));
      const steady = Math.abs(netN) < 0.05 * Math.max(ThN, DN, WN * 0.01);
      if (Math.abs(netPx) > 4) {
        // net horizontal force → acceleration, from the hub (thrust tail).
        // When it points left (decel) it would sit on top of the drag arrow, so
        // nudge it down a little to stay legible.
        const netY = mastTop + (netN < 0 ? 13 : 0);
        HLD.arrow(ctx, cx, mastTop, cx + netPx * 1.4, netY, col.warn, 3, 10);
      }
      if (Math.abs(netPx) > 4 || steady) {
        // label fixed to the RIGHT of the hub, below the tilted disc: stays clear of
        // the disc line above and the drag/weight labels on the left (which collide
        // with a leftward net arrow in the decelerate case)
        HLD.text(ctx, steady ? 'steady — T·sinθ = Drag' : (netN > 0 ? 'accelerate →' : '← decelerate'),
          cx + 56, mastTop + 30, col.warn, '11px IBM Plex Sans');
      }
      const vert = tw > 1.05 ? 'upward acceleration tendency' : tw < 0.95 ? 'downward acceleration tendency' : 'approximately vertical balance';
      const horizTxt = steady ? 'steady cruise' : (netN > 0 ? 'accel forward' : 'decel');
      const result = (Math.abs(cyc) < 3 && spd < 1) ? vert : vert + ' + ' + horizTxt;
      const yawTxt = Math.abs(netYaw) < 0.06 ? 'balanced — heading held'
        : (netYaw > 0 ? 'nose yaws right →' : '← nose yaws left');
      ui.readout.innerHTML = kv([
        ['Collective', coll.toFixed(0) + ' %  ·  T/W ' + tw.toFixed(2), tw >= 1 ? 'var(--hl-good)' : 'var(--hl-bad)'],
        ['Cyclic / disc tilt', (cyc / 100 * 14).toFixed(1) + '°', 'var(--hl-accent)'],
        ['Airspeed', spd.toFixed(0) + ' m/s  (' + (spd * 1.944).toFixed(0) + ' kt)', 'var(--hl-accent)'],
        ['Drag / T_h', DN.toFixed(0) + ' N  ·  ' + ThN.toFixed(0) + ' N', DN > ThN ? 'var(--hl-bad)' : 'var(--hl-drag)'],
        ['Pedals / yaw', yawTxt, Math.abs(netYaw) < 0.06 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Result', result, 'var(--hl-warn)'],
      ]) + `<p class="hl-note">Collective changes pitch and produced thrust in this model: <b>vertical thrust greater than weight accelerates upward; less accelerates downward</b>. Cyclic <b>tilts the thrust</b> — its forward component T·sinθ
        accelerates the helicopter, but as speed builds <b>parasite drag</b> (½ρV²f)
        grows until T·sinθ = Drag and you cruise at steady speed. The main rotor's
        <b>torque</b> spins the fuselage the other way — the <b>tail rotor</b> cancels it.
        <b>Right pedal commands right yaw in the illustrated arrangement.</b> Actual response also depends on available authority and other moments. The EC135/H145 rotor turns
        <b>counter-clockwise</b> (from above), so its torque yaws the nose right and
        you hold <b>left pedal</b> against it — right pedal then <i>reduces</i>
        tail-rotor thrust.</p>`;
    };
    slider(ui.controls, { label: 'Collective (total thrust)', min: 0, max: 100, step: 1, val: coll, unit: ' %', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Cyclic — aft ◀ ▶ forward', min: -100, max: 100, step: 1, val: cyc, unit: '', fmt: v => v.toFixed(0), on: v => { cyc = v; draw(); } });
    slider(ui.controls, { label: 'Pedals — left ◀ ▶ right', min: -100, max: 100, step: 1, val: pedal, unit: '', fmt: v => v.toFixed(0), on: v => { pedal = v; draw(); } });
    slider(ui.controls, { label: 'Airspeed V', min: 0, max: 60, step: 1, val: spd, unit: ' m/s', on: v => { spd = v; draw(); } });
    ui.onDraw(draw);
  }

  /* 2 — Blade element: θ, φ → α, lift/drag */
  function wBladeElement(host) {
    const ui = scaffold(host);
    addStageNote(host, 'Angles visually exaggerated ×4 — not to scale');
    const st = HL.defaultState();
    let theta = 8, phi = 3, linked = false, step = 1;
    let phiCtl = null, linkToggle = null;

    // step bar: counter + nav buttons + caption, injected ABOVE the hl-w wrapper
    const stepBar = el('div', 'hl-step-bar');
    const stepNav = el('div', 'hl-step-nav');
    const btnBack = el('button', 'hl-step-btn', '← Back');
    btnBack.setAttribute('aria-label', 'Previous step');
    const stepCounter = el('span', 'hl-step-counter', 'Step 1 of 4');
    const btnNext = el('button', 'hl-step-btn', 'Next →');
    btnNext.setAttribute('aria-label', 'Next step');
    stepNav.appendChild(btnBack);
    stepNav.appendChild(stepCounter);
    stepNav.appendChild(btnNext);
    const stepCaption = el('div', 'hl-step-caption');
    stepBar.appendChild(stepNav);
    stepBar.appendChild(stepCaption);
    host.insertBefore(stepBar, host.firstChild);

    const CAPTIONS = [
      'Rotor plane + blade chord. v_rot = \u03A9\u00B7r is the tangential velocity — how fast the blade moves through the air.',
      'Now add v_i — the axial / induced inflow that pushes air downward through the rotor disc.',
      'v_rot and v_i combine to give the resultant relative airflow V_rel. Its angle to the rotor plane is \u03C6.',
      'Full picture: \u03B8 is the blade pitch, \u03C6 the inflow angle, and \u03B1 = \u03B8 \u2212 \u03C6 is the angle of attack.',
    ];

    const updateStepUI = () => {
      stepCounter.textContent = 'Step ' + step + ' of 4';
      stepCaption.textContent = CAPTIONS[step - 1];
      btnBack.disabled = step === 1;
      btnNext.disabled = step === 4;
      // show "Link φ to θ" toggle only in step 4
      if (linkToggle) linkToggle.style.display = step === 4 ? '' : 'none';
    };

    btnBack.addEventListener('click', () => { if (step > 1) { step--; updateStepUI(); draw(); } });
    btnNext.addEventListener('click', () => { if (step < 4) { step++; updateStepUI(); draw(); } });

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
      const OmR = HL.omR(st);
      const vrot = 0.75 * OmR;
      const vi = vrot * Math.tan(phi * D2R);
      const ox = W * 0.16, oy = H * 0.6, len = Math.min(W * 0.62, 300);

      // geometry mirroring bladeSection internals (for manual overlays in steps 1–3)
      const A = 4.0;
      const thV = theta * D2R * A;
      const phVraw = phi * D2R * A;
      const phV = phVraw;
      const wlen = len * 0.92;
      const wtx = ox + wlen * Math.cos(phV);
      const wty = oy - wlen * Math.sin(phV);
      const fX = wtx, fY = oy;   // right-angle corner of the velocity triangle

      drawBladeElementScene(ctx, ox, oy, len, {
        theta: theta * D2R, phi: phi * D2R, ampl: A,
        showForces: step === 4,
        showVelocity: step === 4,
        showVrel: step >= 3,
        showAngles: step === 4,
        stall: stall && step === 4,
        cl, cd, aoa,
      }, col);

      // ── step-specific overlays ────────────────────────────────────────────
      // U_T is visible in steps 1, 2, and 3 (as a leg of the triangle)
      if (step >= 1 && step <= 2) {
        HLD.arrow(ctx, fX, fY, ox, fY, col.accent, 2.5, 9);
        HLD.chipLabel(ctx, 'v_rot  tangential velocity (= \u03A9\u00B7r)', (fX + ox) / 2, fY + 15, col.accent, 'bold 10px IBM Plex Sans', 'center');
      }
      if (step === 2) {
        // U_P leg: induced inflow, perpendicular downward (only if nonzero)
        if (phi > 0.05) {
          HLD.arrow(ctx, wtx, wty, fX, fY, col.wind, 2.5, 9);
          const sq = 5;
          HLD.dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
          HLD.dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
          HLD.chipLabel(ctx, 'v_i  induced inflow', fX - 12, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
        }
      }
      if (step === 3) {
        // vector triangle: V_rel (drawn by bladeSection) + labelled U_T and U_P legs
        HLD.arrow(ctx, fX, fY, ox, fY, col.accent, 2.0, 8);
        if (phi > 0.05) {
          HLD.arrow(ctx, wtx, wty, fX, fY, col.wind, 2.0, 8);
          const sq = 5;
          HLD.dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
          HLD.dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
          HLD.chipLabel(ctx, 'v_i', fX - 7, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
        }
        HLD.chipLabel(ctx, 'v_rot', (fX + ox) / 2, fY + 12, col.accent, 'bold 10px IBM Plex Sans', 'center');
        // re-stamp rotor-plane label so it is not overwritten by U_P leg
        HLD.chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
      }

      // ── readout ───────────────────────────────────────────────────────────
      const aoaDeg = theta - phi;
      if (step === 4) {
        ui.readout.innerHTML = kv([
          ['Pitch θ', theta.toFixed(1) + '°', 'var(--hl-chord)'],
          ['Inflow φ', phi.toFixed(1) + '°' + (linked ? ' (from θ)' : ''), 'var(--hl-wind)'],
          ['AoA α = θ − φ', aoaDeg.toFixed(1) + '°', stall ? 'var(--hl-bad)' : 'var(--hl-good)'],
          ['Lift coeff C_l', cl.toFixed(2), stall ? 'var(--hl-bad)' : 'var(--hl-ink)'],
          ['v_rot', vrot.toFixed(0) + ' m/s', 'var(--hl-wind)'],
          ['v_i', vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ]) + `<p class="hl-note">${stall
          ? 'The assumed section stall threshold is crossed. The simple coefficient law does not resolve unsteady separation or actual aircraft stall limits.'
          : linked
            ? 'Linked mode couples pitch and inflow in this hover illustration. Its final angle change is a coupled state comparison, not a transient flow solution.'
            : 'Below the assumed stall threshold, the selected coefficient rises with α. Compare pitch and inflow independently first; linked mode adds a simplified hover coupling.'}</p>`;
      } else if (step === 3) {
        ui.readout.innerHTML = kv([
          ['Pitch θ', theta.toFixed(1) + '°', 'var(--hl-chord)'],
          ['Inflow φ', phi.toFixed(1) + '°', 'var(--hl-wind)'],
          ['v_rot', vrot.toFixed(0) + ' m/s', 'var(--hl-accent)'],
          ['v_i', vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ]) + '<p class="hl-note">tan φ = v_i / v_rot — drag the sliders to see the triangle change.</p>';
      } else {
        ui.readout.innerHTML = kv([
          ['Pitch θ', theta.toFixed(1) + '°', 'var(--hl-chord)'],
          ['Inflow φ', phi.toFixed(1) + '°', 'var(--hl-wind)'],
        ]) + '<p class="hl-note">Adjust the sliders to reshape the diagram.</p>';
      }
    };
    slider(ui.controls, { label: 'Pitch θ (collective)', min: 0, max: 18, step: 0.5, val: theta, unit: '°', on: v => { theta = v; draw(); } });
    phiCtl = slider(ui.controls, { label: 'Inflow angle φ', min: 0, max: 12, step: 0.5, val: phi, unit: '°', on: v => { if (!linked) { phi = v; draw(); } } });
    const toggleRow = el('div');
    ui.controls.appendChild(toggleRow);
    linkToggle = toggleRow;
    toggle(toggleRow, { label: 'Link φ to θ (realistic)', val: false, on: v => { linked = v; draw(); } });
    updateStepUI();
    ui.onDraw(draw);
    const savedControls = HLModelState.controls(host);
    host._hlModel = {
      get: () => ({...savedControls.get(), step}),
      set: x => { step = Math.max(1,Math.min(4,Number(x.step)||1)); savedControls.set(x); updateStepUI(); draw(); },
      evidence: () => ({})
    };
  }

  function wM104BladeElement(host) {
    const ui = scaffold(host, { mainStage: 'hl-w-stage hl-w-stage-mission' });
    host.firstChild.classList.add('hl-w-mission-layout');
    addStageNote(host, 'Angles visually exaggerated ×4 — not to scale');
    const st = HL.defaultState();
    const scenario = { theta: 10, phi: 4, rFrac: 0.75 };
    const omega = st.RPM * 2 * Math.PI / 60;
    const rM = scenario.rFrac * st.R;
    const vrot = scenario.rFrac * HL.omR(st);
    const vi = vrot * Math.tan(scenario.phi * D2R);
    const aoa = (scenario.theta - scenario.phi) * D2R;
    const cl = HL.clOf(st, aoa);
    const cd = HL.cdOf(st, cl);
    let step = 1;
    let gate1 = null, gate2 = null, gate3 = null;
    let gate1Draft = null, gate1Dragging = false, gate1Geom = null;

    const STEP_NAMES = ['Reference', 'Velocities', 'Angles', 'Forces', 'Resolve', 'Connect'];
    const stepBar = el('div', 'hl-step-bar');
    const stepHead = el('div', 'hl-step-head');
    stepHead.appendChild(el('div', 'hl-step-kicker', 'Mission objective'));
    stepHead.appendChild(el('p', 'hl-step-objective', 'Build one fixed blade-element case by committing each prediction before reveal.'));
    const stepStrip = el('ol', 'hl-step-strip');
    STEP_NAMES.forEach((name, idx) => {
      const item = el('li', 'hl-step-chip', `${idx + 1} ${name}`);
      item.dataset.step = String(idx + 1);
      stepStrip.appendChild(item);
    });
    stepHead.appendChild(stepStrip);
    const stepNav = el('div', 'hl-step-nav');
    const btnBack = el('button', 'hl-step-btn', '← Back');
    const stepCounter = el('span', 'hl-step-counter', 'Step 1 of 6');
    const btnNext = el('button', 'hl-step-btn', 'Next →');
    const stepCaption = el('div', 'hl-step-caption');
    stepNav.appendChild(btnBack);
    stepNav.appendChild(stepCounter);
    stepNav.appendChild(btnNext);
    stepBar.appendChild(stepHead);
    stepBar.appendChild(stepNav);
    stepBar.appendChild(stepCaption);
    host.insertBefore(stepBar, host.firstChild);

    const CAPTIONS = [
      'Reference state — fixed blade station, known Ω, known r, known blade pitch, known axial inflow.',
      'Velocity inputs — build and commit V_rel in the diagram from the v_i tip to the blade element before reveal.',
      'Blade geometry — place θ against the now-known φ, then decide α from the geometry before the formula is shown.',
      'Local forces — use the parallelogram construction to show how F_L + F_D builds TAF.',
      'Resolve the local force — project TAF into the thrust-producing normal component and the in-plane force F_H.',
      'Connect the local blade element to the rotor — first solve the local force, then name its rotor effect.',
    ];
    const gate1Geometry = (W, H) => {
      const ox = W * 0.18, oy = H * 0.64, len = Math.min(W * 0.58, 330);
      const A = 4.0, phV = scenario.phi * D2R * A;
      const wlen = len * 0.92;
      const wtx = ox + wlen * Math.cos(phV), wty = oy - wlen * Math.sin(phV);
      const fX = wtx, fY = oy;
      return { ox, oy, len, phV, wlen, wtx, wty, fX, fY };
    };
    const gate1State = () => {
      if (!gate1Draft || !gate1Geom) return 'wrong';
      const tol = Math.max(22, gate1Geom.len * 0.14);
      const tailErr = Math.hypot(gate1Draft.x1 - gate1Geom.wtx, gate1Draft.y1 - gate1Geom.wty);
      const vx = gate1Draft.x2 - gate1Draft.x1, vy = gate1Draft.y2 - gate1Draft.y1;
      const ex = gate1Geom.ox - gate1Geom.wtx, ey = gate1Geom.oy - gate1Geom.wty;
      const vmag = Math.hypot(vx, vy), emag = Math.hypot(ex, ey);
      if (vmag < 20 || emag < 20) return 'wrong';
      const dirCos = (vx * ex + vy * ey) / (vmag * emag);
      const proj = (vx * ex + vy * ey) / (emag * emag);
      const lateralErr = Math.abs(vx * ey - vy * ex) / emag;
      return (tailErr <= tol
        && dirCos > 0.96
        && proj >= 0.72
        && proj <= 1.32
        && lateralErr <= Math.max(18, gate1Geom.len * 0.08))
        ? 'correct' : 'wrong';
    };

    const canAdvance = () =>
      !((step === 2 && gate1 !== 'correct') || (step === 3 && gate2 !== '6') || (step === 5 && gate3 !== 'correct') || step === 6);

    const updateStepUI = () => {
      if (gate1 === 'correct' && gate2 === '6' && gate3 === 'correct') host.dispatchEvent(new CustomEvent('hl-evidence', {detail:{correct:true,detail:'Constructed V_rel, identified α and local force component.'}}));
      stepCounter.textContent = 'Step ' + step + ' of 6';
      stepCaption.textContent = CAPTIONS[step - 1];
      stepStrip.querySelectorAll('.hl-step-chip').forEach((chip) => {
        chip.classList.toggle('on', Number(chip.dataset.step) === step);
      });
      btnBack.disabled = step === 1;
      btnNext.disabled = !canAdvance();
    };

    const introBox = (title, body) => {
      const box = el('div', 'hl-mission-box');
      box.appendChild(el('div', 'hl-mission-h', title));
      box.appendChild(el('p', null, body));
      return box;
    };
    const gateFeedback = (state, ok, no) => {
      if (!state) return null;
      return el('div', 'hl-check-fb ' + (state === 'correct' ? 'ok' : 'no'),
        state === 'correct' ? '✓ ' + ok : '✗ ' + no);
    };

    const rebuildControls = () => {
      ui.controls.innerHTML = '';
      if (step === 1) {
        ui.controls.appendChild(introBox('M1-04 mission',
          'This is a fixed guided-construction scenario. There are no sliders here: build the picture first, then unlock each reveal.'));
      } else if (step === 2) {
        ui.controls.appendChild(introBox('Gate 1 — Construct V_rel',
          'Drag from the top of v_i and aim V_rel into the blade-element point, then commit the construction.'));
        const commitBtn = el('button', 'hl-link-btn', 'Commit V_rel construction');
        commitBtn.disabled = !gate1Draft;
        commitBtn.addEventListener('click', () => { gate1 = gate1State(); updateStepUI(); draw(); });
        ui.controls.appendChild(commitBtn);
        const keyboard = el('fieldset', 'cbt-case');
        keyboard.appendChild(el('legend', null, 'Keyboard construction: choose vector endpoints'));
        const starts = el('select'); starts.setAttribute('aria-label','V_rel start point');
        const ends = el('select'); ends.setAttribute('aria-label','V_rel end point');
        [['','Choose start'],['wind','Tip of induced-velocity vector'],['element','Blade-element point']].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;starts.append(o);});
        [['','Choose end'],['element','Blade-element point'],['horizontal','End of horizontal component']].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;ends.append(o);});
        const construct = el('button','hl-foot-btn','Construct from endpoints');construct.type='button';
        construct.onclick=()=>{if(!starts.value||!ends.value||!gate1Geom)return;const g=gate1Geom;
          gate1Draft={x1:starts.value==='wind'?g.wtx:g.ox,y1:starts.value==='wind'?g.wty:g.oy,x2:ends.value==='element'?g.ox:g.fX,y2:g.oy};
          gate1=null;draw();ui.controls.querySelector('.hl-link-btn').focus();};
        keyboard.append(starts,ends,construct);ui.controls.append(keyboard);
        const fb1 = gateFeedback(gate1,
          'Correct — your vector starts at the v_i tip and follows the correct V_rel line into the blade element.',
          'Not yet — start at the v_i tip and keep the resultant aimed into the blade-element point with a downward component.');
        if (fb1) ui.controls.appendChild(fb1);
      } else if (step === 3) {
        ui.controls.appendChild(introBox('Gate 2 — Determine α from geometry',
          'Now that θ and φ are both visible, decide the angle of attack from the geometric gap between the chord and V_rel before the shortcut relation is revealed.'));
        segmented(ui.controls, {
          label: 'What is α for this element?',
          val: gate2 || '',
          options: [
            { v: '2', t: 'α = 2°' },
            { v: '6', t: 'α = 6°' },
            { v: '14', t: 'α = 14°' },
          ],
          on: v => { gate2 = v; updateStepUI(); draw(); },
        });
        const fb2 = gateFeedback(gate2 ? (gate2 === '6' ? 'correct' : 'wrong') : null,
          'Correct — once the geometry is revealed, the relation α = θ − φ confirms the 6° result.',
          'Not yet — α is the gap between the blade chord and V_rel, not between the chord and the rotor plane.');
        if (fb2) ui.controls.appendChild(fb2);
      } else if (step === 5) {
        ui.controls.appendChild(introBox('Resolve this element locally',
          'Resolve TAF into the local normal component and in-plane F_H, then choose the statement that preserves that local-vs-rotor distinction.'));
        segmented(ui.controls, {
          label: 'Which interpretation of this local force resolution is correct?',
          val: gate3 || '',
          options: [
            { v: 'wrong-whole', t: 'F_H is the whole-rotor thrust vector, so the vertical component no longer matters' },
            { v: 'correct', t: 'The local normal component contributes to rotor thrust, while F_H is an in-plane braking load' },
            { v: 'wrong-span', t: 'TAF acts along the blade span, so this element mainly changes radial flow' },
          ],
          on: v => { gate3 = v; updateStepUI(); draw(); },
        });
        const fb3 = gateFeedback(gate3,
          'Correct — keep the local normal component separate from total rotor thrust, and treat F_H as an in-plane resisting force.',
          'Not yet — separate the local blade-element resultants from the later whole-rotor consequence.');
        if (fb3) ui.controls.appendChild(fb3);
      } else {
        ui.controls.appendChild(introBox('Guided reveal',
          step === 4
            ? 'Use the dashed construction lines to see how F_L and F_D add tip-to-tip into TAF.'
            : 'Now connect the resolved local force to the rotor story: local normal contribution builds thrust, and F_H remains an in-plane resisting load.'));
      }
    };

    btnBack.addEventListener('click', () => {
      if (step > 1) { step--; updateStepUI(); draw(); }
    });
    btnNext.addEventListener('click', () => {
      if (canAdvance()) { step++; updateStepUI(); draw(); }
    });

    const drawReference = (ctx, W, H, col) => {
      const ox = W * 0.18, oy = H * 0.64, len = Math.min(W * 0.58, 330);
      HLD.dline(ctx, ox - len * 0.34, oy, ox + len * 1.12, oy, col.dim, 1, [5, 4]);
      HLD.chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
      HLD.dot(ctx, ox, oy, 4, col.chord);
      HLD.chipLabel(ctx, 'blade element @ 0.75R', ox + len * 0.18, oy - 18, col.chord, 'bold 11px IBM Plex Sans');
      HLD.text(ctx, 'Known inputs only: Ω, r, θ, and downward induced flow', W * 0.50, H * 0.14, col.dim, '11px IBM Plex Sans', 'center');
    };

    const drawVelocityInputs = (ctx, W, H, col, showReveal) => {
      const g = gate1Geometry(W, H);
      gate1Geom = g;
      const { ox, oy, len, phV, wlen, wtx, wty, fX, fY } = g;
      HLD.dline(ctx, ox - len * 0.34, oy, ox + len * 1.12, oy, col.dim, 1, [5, 4]);
      HLD.chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
      HLD.dot(ctx, ox, oy, 4, col.chord);
      HLD.arrow(ctx, fX, fY, ox, fY, col.accent, 2.5, 9);
      HLD.arrow(ctx, wtx, wty, fX, fY, col.wind, 2.5, 9);
      HLD.chipLabel(ctx, 'v_rot = Ω·r', (fX + ox) / 2, fY + 15, col.accent, 'bold 10px IBM Plex Sans', 'center');
      HLD.chipLabel(ctx, 'v_i', fX - 8, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
      const sq = 5;
      HLD.dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
      HLD.dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
      if (!showReveal) {
        HLD.dot(ctx, wtx, wty, 4, col.warn);
        HLD.chipLabel(ctx, 'start V_rel here', wtx + 8, wty - 10, col.warn, '10px IBM Plex Sans', 'left');
        if (gate1Draft) {
          const tryCol = gate1 === 'wrong' ? col.bad : col.warn;
          HLD.arrow(ctx, gate1Draft.x1, gate1Draft.y1, gate1Draft.x2, gate1Draft.y2, tryCol, 2.2, 9);
          HLD.chipLabel(ctx, 'your V_rel', (gate1Draft.x1 + gate1Draft.x2) / 2, (gate1Draft.y1 + gate1Draft.y2) / 2 - 10, tryCol, 'bold 10px IBM Plex Sans', 'center');
        }
      }
      if (showReveal) {
        HLD.arrow(ctx, wtx, wty, ox, oy, col.wind, 2.4, 10);
        HLD.chipLabel(ctx, 'V_rel', ox + wlen * 0.80 * Math.cos(phV), oy - wlen * 0.80 * Math.sin(phV) - 12, col.wind, 'bold 11px IBM Plex Sans', 'center');
        ctx.strokeStyle = col.wind; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ox, oy, 64, 0, -phV, -phV < 0); ctx.stroke();
        const m = -phV / 2;
        HLD.chipLabel(ctx, 'φ ' + scenario.phi.toFixed(1) + '°', ox + 76 * Math.cos(m), oy + 76 * Math.sin(m) + 12, col.wind, '11px IBM Plex Sans', 'center');
      }
    };

    const canvasPt = (ev) => {
      const r = ui.canvas.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    ui.canvas.addEventListener('pointerdown', (ev) => {
      if (step !== 2 || gate1 === 'correct' || !gate1Geom) return;
      const p = canvasPt(ev);
      const startTol = Math.max(18, gate1Geom.len * 0.10);
      if (Math.hypot(p.x - gate1Geom.wtx, p.y - gate1Geom.wty) > startTol) return;
      gate1Dragging = true;
      gate1 = null;
      gate1Draft = { x1: gate1Geom.wtx, y1: gate1Geom.wty, x2: p.x, y2: p.y };
      ui.canvas.setPointerCapture?.(ev.pointerId);
      draw();
      ev.preventDefault();
    });
    ui.canvas.addEventListener('pointermove', (ev) => {
      if (!gate1Dragging || step !== 2 || !gate1Draft) return;
      const p = canvasPt(ev);
      gate1Draft.x2 = p.x;
      gate1Draft.y2 = p.y;
      draw();
      ev.preventDefault();
    });
    const finishGate1Drag = () => { gate1Dragging = false; };
    ui.canvas.addEventListener('pointerup', finishGate1Drag);
    ui.canvas.addEventListener('pointercancel', finishGate1Drag);

    const readout = (extraNote) => kv([
      ['Rotor speed Ω', omega.toFixed(1) + ' rad/s', 'var(--hl-accent)'],
      ['Blade station r', rM.toFixed(2) + ' m (0.75R)', 'var(--hl-chord)'],
      ['v_rot = Ωr', vrot.toFixed(0) + ' m/s', 'var(--hl-accent)'],
      ['Axial / induced v_i', vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
      ['Blade pitch θ', scenario.theta.toFixed(1) + '°', 'var(--hl-chord)'],
    ]) + `<p class="hl-note">${extraNote}</p>`;

    const draw = () => {
      rebuildControls();
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      HLD.grid(ctx, W, H, col, 30);
      const forceStep = step >= 5;
      const ox = W * (forceStep ? 0.40 : 0.24);
      const oy = H * 0.66, len = Math.min(W * (forceStep ? 0.43 : 0.50), 300);
      if (step === 1) {
        drawReference(ctx, W, H, col);
        ui.readout.innerHTML = readout('Start from the blank reference frame. The element location and the known inputs are given, but V_rel, φ, α and the forces are still hidden.');
      } else if (step === 2) {
        drawVelocityInputs(ctx, W, H, col, gate1 === 'correct');
        ui.readout.innerHTML = readout(gate1 === 'correct'
          ? 'Gate 1 unlocked: the resultant relative airflow V_rel and inflow angle φ are now revealed.'
          : 'Gate 1 is still locked: construct V_rel in the diagram, then commit before reveal.');
      } else if (step === 3) {
        drawBladeElementScene(ctx, ox, oy, len, {
          theta: scenario.theta * D2R,
          phi: scenario.phi * D2R,
          ampl: 4.0,
          showVelocity: true,
          showVrel: true,
          showAngles: true,
          showAlpha: gate2 === '6',
          cl, cd, aoa,
        }, col);
        ui.readout.innerHTML = kv([
          ['Rotor speed Ω', omega.toFixed(1) + ' rad/s', 'var(--hl-accent)'],
          ['Blade station r', rM.toFixed(2) + ' m (0.75R)', 'var(--hl-chord)'],
          ['Inflow φ', scenario.phi.toFixed(1) + '°', 'var(--hl-wind)'],
          ['Blade pitch θ', scenario.theta.toFixed(1) + '°', 'var(--hl-chord)'],
          ...(gate2 === '6'
            ? [['AoA α = θ − φ', (scenario.theta - scenario.phi).toFixed(1) + '°', 'var(--hl-good)']]
            : []),
        ]) + `<p class="hl-note">${gate2 === '6'
          ? 'Gate 2 unlocked: α is now revealed as the geometric gap between chord and V_rel, and only now is the shortcut α = θ − φ stated.'
          : 'Gate 2 is still locked: identify α from the geometry first rather than memorising the formula.'}</p>`;
      } else if (step === 4) {
        drawBladeElementScene(ctx, ox, oy, len, {
          theta: scenario.theta * D2R,
          phi: scenario.phi * D2R,
          ampl: 4.0,
          showVelocity: true,
          showVrel: true,
          showAngles: true,
          showForces: true,
          showParallelogram: true,
          showResultant: true,
          liftLabel: 'F_L',
          dragLabel: 'F_D',
          cl, cd, aoa,
        }, col);
        ui.readout.innerHTML = kv([
          ['AoA α', (scenario.theta - scenario.phi).toFixed(1) + '°', 'var(--hl-good)'],
          ['F_L direction', 'Perpendicular to V_rel', 'var(--hl-lift)'],
          ['F_D direction', 'Parallel / opposing the local airflow', 'var(--hl-drag)'],
          ['Combined result', 'TAF', '#c084fc'],
        ]) + '<p class="hl-note">Use the dashed parallelogram to see the vector sum directly: F_L + F_D = TAF.</p>';
      } else if (step === 5) {
        drawBladeElementScene(ctx, ox, oy, len, {
          theta: scenario.theta * D2R,
          phi: scenario.phi * D2R,
          ampl: 4.0,
          showVelocity: true,
          showVrel: true,
          showAngles: true,
          showForces: true,
          showResolve: true,
          liftLabel: 'F_L',
          dragLabel: 'F_D',
          resolveLabel: 'Normal',
          fhLabel: 'F_H ×6',
          cl, cd, aoa,
        }, col);
        ui.readout.innerHTML = kv([
          ['TAF', 'Resolved locally', '#c084fc'],
          ['Normal component', 'Local thrust-producing part', 'var(--hl-good)'],
          ['F_H', 'In-plane / braking component', 'var(--hl-warn)'],
        ]) + `<p class="hl-note">${gate3 === 'correct'
          ? 'Gate 3 unlocked: you have identified the local causal consequence and can now move to the final reveal.'
          : 'The dashed helper lines show TAF being decomposed into the local normal component and F_H before you name the rotor effect.'}</p>`;
      } else {
        drawBladeElementScene(ctx, ox, oy, len, {
          theta: scenario.theta * D2R,
          phi: scenario.phi * D2R,
          ampl: 4.0,
          showVelocity: true,
          showVrel: true,
          showAngles: true,
          showForces: true,
          showResolve: true,
          liftLabel: 'F_L',
          dragLabel: 'F_D',
          resolveLabel: 'Normal',
          fhLabel: 'F_H ×6',
          cl, cd, aoa,
        }, col);
        ui.readout.innerHTML = kv([
          ['Scenario', 'Fixed canonical element', 'var(--hl-accent)'],
          ['Local normal', 'Contributes to overall rotor thrust', 'var(--hl-good)'],
          ['F_H', 'Resists rotation in-plane', 'var(--hl-warn)'],
        ]) + '<p class="hl-note">What does this blade element do to the rotor? Its local normal component adds thrust, while F_H is the in-plane load the rotor must overcome.</p>';
      }
    };

    updateStepUI();
    ui.onDraw(draw);
    host._hlModel = {
      get: () => { const r=ui.canvas.getBoundingClientRect();return {step,gate1,gate2,gate3,draft:gate1Draft&&{x1:gate1Draft.x1/(r.width||1),y1:gate1Draft.y1/(r.height||1),x2:gate1Draft.x2/(r.width||1),y2:gate1Draft.y2/(r.height||1)}}; },
      set: x => { step=Math.max(1,Math.min(6,Number(x.step)||1));gate1=['correct','wrong'].includes(x.gate1)?x.gate1:null;gate2=['2','6','14'].includes(x.gate2)?x.gate2:null;gate3=['correct','wrong-whole','wrong-span'].includes(x.gate3)?x.gate3:null;const r=ui.canvas.getBoundingClientRect();gate1Draft=x.draft?{x1:x.draft.x1*r.width,y1:x.draft.y1*r.height,x2:x.draft.x2*r.width,y2:x.draft.y2*r.height}:null;updateStepUI();draw(); },
      evidence: () => ({gates:{construction:gate1==='correct'&&gate2==='6'&&gate3==='correct'}})
    };
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
      HLD.text(ctx, 'r/R', (x0 + x1) / 2, H - 4, col.dim, '10px IBM Plex Sans', 'center', 'bottom');
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
      HLD.text(ctx, 'induced velocity  v\u1d62 = ' + sol.vi.toFixed(1) + ' m/s  (air speed at disc)',
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
        ['Inflow ratio λ = v\u1d62/ΩR', sol.lam.toFixed(3), 'var(--hl-wind)'],
        ['Induced velocity v\u1d62 (air speed at disc)', sol.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Thrust T', (sol.thrust / 1000).toFixed(1) + ' kN', 'var(--hl-lift)'],
        ['Aircraft weight W', (W_N / 1000).toFixed(1) + ' kN', 'var(--hl-drag)'],
        ['Thrust-to-weight T/W', tFrac.toFixed(2), tFrac >= 1 ? 'var(--hl-good)' : 'var(--hl-bad)'],
        ['Disc loading T/A', (sol.thrust / HL.area(st) / 9.80665).toFixed(1) + ' kg/m²', 'var(--hl-accent)'],
        ['Power required P', (sol.power / 1000).toFixed(0) + ' kW', 'var(--hl-ink)'],
      ]) + `<p class="hl-note">${tFrac >= 1
        ? '✔ Thrust exceeds weight — the aircraft can hover here.'
        : '✘ Thrust below weight — pull more collective, or reduce weight/altitude.'}
        Notice power climbs steeply with collective: that is induced power P<sub>i</sub> = T·v<sub>i</sub>.</p>`;
    };
    slider(ui.controls, { label: 'Collective θ₀', min: 2, max: 16, step: 0.5, val: coll, unit: '°', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Gross weight', min: 1800, max: 3600, step: 50, val: weight, unit: ' kg', fmt: v => v.toFixed(0), on: v => { weight = v; draw(); } });
    slider(ui.controls, { label: 'Density altitude', min: 0, max: 14000, step: 500, val: alt, unit: ' ft', fmt: v => v.toFixed(0), on: v => { alt = v; draw(); } });
    ui.onDraw(draw);
  }

  function hoverCue(tw) {
    if (tw > 1.03) return 'more thrust than hover needs';
    if (tw < 0.97) return 'less thrust than hover needs';
    return 'close to the hover condition';
  }

  function drawHoverStatePanel(ctx, box, col, cfg) {
    const x = box.x, y = box.y, w = box.w, h = box.h;
    const pad = Math.min(18, w * 0.06);
    const discY = y + h * 0.26;
    const cx = x + w * 0.42;
    const dR = Math.min(w * 0.22, 92);
    const tw = cfg.weight > 0 ? cfg.thrust / cfg.weight : 0;
    ctx.fillStyle = 'rgba(120,140,170,0.08)';
    ctx.strokeStyle = 'rgba(120,140,170,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    HLD.text(ctx, cfg.label, x + pad, y + 14, col.dim, '11px IBM Plex Sans', 'left', 'top');
    HLD.text(ctx, `T/W ${tw.toFixed(2)}`, x + w - pad, y + 14,
      Math.abs(tw - 1) < 0.03 ? col.good : (tw > 1 ? col.warn : col.bad), 'bold 11px IBM Plex Sans', 'right', 'top');

    HLD.drawHeliWire(ctx, {
      cx,
      cy: discY,
      scale: Math.min(w * 0.30, h * 0.42),
      color: col.dim,
      width: 1.2,
      alpha: 0.9,
    });
    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - dR, discY);
    ctx.lineTo(cx + dR, discY);
    ctx.stroke();
    ctx.lineCap = 'butt';
    HLD.dot(ctx, cx, discY, 3.5, col.accent);

    if (cfg.showFlow) {
      const viLen = Math.min(h * 0.34, 18 + cfg.vi * 3.6);
      ctx.globalAlpha = 0.82;
      for (let i = -2; i <= 2; i++) {
        const ax = cx + i * (dR / 1.9);
        HLD.arrow(ctx, ax, discY + 10, ax, discY + 10 + viLen, col.wind, 2.3, 7);
      }
      ctx.globalAlpha = 1;
      HLD.text(ctx, 'downward airflow', cx, discY + Math.min(h * 0.43, 24 + cfg.vi * 3.8), col.wind, '10px IBM Plex Sans', 'center');
    } else {
      HLD.text(ctx, 'Hovering — no horizontal motion to explain the power', cx, discY + 32, col.dim, '10px IBM Plex Sans', 'center');
    }

    const barX = x + w - pad - 24;
    const barTop = y + h * 0.24;
    const barH = h * 0.44;
    ctx.fillStyle = 'rgba(120,140,170,0.22)';
    ctx.fillRect(barX - 15, barTop, 30, barH);
    const fillH = Math.max(0, Math.min(barH, barH * Math.min(1.4, tw) / 1.4));
    ctx.fillStyle = Math.abs(tw - 1) < 0.03 ? col.good : (tw > 1 ? col.warn : col.bad);
    ctx.fillRect(barX - 15, barTop + barH - fillH, 30, fillH);
    const hoverY = barTop + barH - barH / 1.4;
    HLD.dline(ctx, barX - 21, hoverY, barX + 21, hoverY, col.drag, 1.2, [4, 3]);
    HLD.text(ctx, 'hover', barX, hoverY - 8, col.drag, '9px IBM Plex Sans', 'center', 'bottom');

    const lines = [
      `Produced thrust  ${(cfg.thrust / 1000).toFixed(1)} kN`,
      `Required thrust  ${(cfg.weight / 1000).toFixed(1)} kN`,
      `Induced velocity  ${cfg.vi.toFixed(1)} m/s`,
      `Induced power  ${(cfg.pi / 1000).toFixed(0)} kW`,
    ];
    lines.forEach((line, i) => {
      HLD.text(ctx, line, x + pad, y + h * 0.65 + i * 16, i < 2 ? col.ink : (i === 2 ? col.wind : col.accent), '11px IBM Plex Sans', 'left', 'top');
    });
    if (cfg.collective != null) HLD.text(ctx, `Collective ${cfg.collective.toFixed(1)}°`, x + pad, y + h - 12, col.chord, '10px IBM Plex Sans', 'left', 'bottom');
  }

  function wM2HoverWhy(host) {
    const ui = scaffold(host);
    ui.canvas.parentElement.classList.add('hl-hover-stage');
    const hover = HL.hoverTrimSolve(HL.defaultState(), HL.weightN(HL.defaultState()));
    const options = [
      'The power is mainly spent simply holding the helicopter up in one place.',
      'The rotor is giving energy to the air by driving a downward flow through the disc.',
      'Most of the hover power is explained by blade drag alone.',
      'Because the helicopter is stationary, the power mostly goes into spinning parts rather than the air.',
    ];
    let choice = null;

    function buildControls() {
      ui.controls.innerHTML = '';
      const intro = el('div', 'hl-mission-box');
      intro.innerHTML = '<div class="hl-mission-h">Committed prediction</div><p>A helicopter is stationary in the air. The rotor is still using power. Where is the energy going?</p>';
      ui.controls.appendChild(intro);

      const opts = el('div', 'hl-check-opts');
      options.forEach((text, i) => {
        const btn = el('button', 'hl-check-opt', text);
        if (choice != null) {
          btn.classList.add('done');
          btn.disabled = true;
          if (i === 1) btn.classList.add('correct');
          else if (i === choice) btn.classList.add('wrong');
        }
        btn.onclick = () => { if (choice == null) { choice = i; refresh(); } };
        opts.appendChild(btn);
      });
      ui.controls.appendChild(opts);

      const hint = el('div', 'hl-stage-note',
        choice == null
          ? 'Your first choice is the committed answer. The explanation appears only after that click.'
          : 'Now compare your choice with the rotor-flow reveal.');
      ui.controls.appendChild(hint);
    }

    function updateReadout() {
      ui.readout.innerHTML = choice == null
        ? '<div class="hl-mission-box"><div class="hl-mission-h">Before reveal</div><p>Commit to one mechanism first. No equation or completed explanation appears before that commitment.</p></div>'
        : `<div class="hl-check-fb ${choice === 1 ? 'ok' : 'no'}">${choice === 1 ? '✓' : '↺'} Hover costs power because the rotor keeps accelerating air downward through the disc. That energy transfer to the airflow is the core hover cost; blade drag is real, but it is not the main mechanism that explains why a stationary helicopter still needs substantial power.</div>`
          + kv([
            ['Hover condition', 'stationary in the air', 'var(--hl-ink)'],
            ['What the rotor is doing', 'accelerating air downward', 'var(--hl-wind)'],
            ['Why power is still needed', 'energy is being transferred into the flow', 'var(--brand)'],
          ])
          + '<p class="hl-note">Think of hover as a continuous energy transfer into the air, not as a motionless aircraft somehow costing nothing.</p>';
    }

    function draw() {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      HLD.grid(ctx, W, H, col, 30);
      drawHoverStatePanel(ctx, { x: W * 0.08, y: H * 0.10, w: W * 0.84, h: H * 0.80 }, col, {
        label: choice == null ? 'Hover question' : 'Reveal',
        thrust: hover.solution.thrust,
        weight: HL.weightN(hover.state),
        vi: hover.solution.vi,
        pi: hover.solution.Pi_induced,
        collective: choice == null ? null : hover.theta0,
        showFlow: choice != null,
      });
      if (choice != null) {
        HLD.text(ctx, 'The power goes into the air the rotor is driving through the disc.', W * 0.50, H * 0.08, col.accent, 'bold 12px IBM Plex Sans', 'center', 'middle');
      }
    }

    function refresh() { buildControls(); updateReadout(); draw(); }
    ui.onDraw(draw);
    buildControls();
    updateReadout();
    host._hlModel = {
      get: () => ({choice}),
      set: x => { choice=Number.isInteger(x.choice)&&x.choice>=0&&x.choice<options.length?x.choice:null;refresh(); },
      evidence: () => ({gates:{'hover-choice':choice!=null},support:choice!==1})
    };
  }

  function wM2RotorFlowPower(host) {
    const ui = scaffold(host);
    ui.canvas.parentElement.classList.add('hl-hover-stage');
    const st = HL.defaultState();
    const baseCollective = 8.6;
    const changedCollective = 10.2;
    const predictions = [
      'Induced velocity rises and induced power rises because the higher collective makes the rotor produce more thrust, so it has to accelerate more air through the disc.',
      'Induced velocity rises and induced power rises because the blades rotate faster.',
      'Induced velocity falls while induced power rises because the helicopter unloads itself as soon as collective is raised.',
      'Induced velocity stays about the same and induced power rises only because blade drag rises.',
    ];
    let prediction = null;
    let collective = baseCollective;
    let changed = false;
    let firstLinkChoice = null;

    function currentSol(theta0) {
      return HL.axialSolve({ ...st, theta0 }, 0);
    }

    function buildControls() {
      ui.controls.innerHTML = '';
      const stateBox = el('div', 'hl-mission-box');
      stateBox.innerHTML = '<div class="hl-mission-h">State</div><p><b>Hover trim OFF.</b> The collective is manual, so the rotor can produce less or more thrust than hover requires.</p>';
      ui.controls.appendChild(stateBox);

      const prompt = el('div', 'hl-mission-box');
      prompt.innerHTML = '<div class="hl-mission-h">Predict before the control change</div><p>You are about to increase collective once. What happens to induced velocity and induced power, and why?</p>';
      ui.controls.appendChild(prompt);

      const opts = el('div', 'hl-check-opts');
      predictions.forEach((text, i) => {
        const btn = el('button', 'hl-check-opt', text);
        if (prediction != null) {
          btn.classList.add('done');
          btn.disabled = true;
          if (changed && i === 0) btn.classList.add('correct');
          else if (changed && i === prediction) btn.classList.add('wrong');
        }
        btn.onclick = () => { if (prediction == null) { prediction = i; refresh(); } };
        opts.appendChild(btn);
      });
      ui.controls.appendChild(opts);

      const actions = el('div', 'hl-inline-actions');
      const apply = el('button', 'hl-foot-btn primary', changed ? 'Collective increased' : 'Increase collective');
      apply.disabled = prediction == null || changed;
      apply.onclick = () => { changed = true; collective = changedCollective; refresh(); };
      const reset = el('button', 'hl-foot-btn', 'Reset');
      reset.onclick = () => { prediction = null; collective = baseCollective; changed = false; firstLinkChoice = null; refresh(); };
      actions.appendChild(apply);
      actions.appendChild(reset);
      ui.controls.appendChild(actions);

      if (changed) {
        const first = el('div', 'hl-mission-box');
        first.innerHTML = '<div class="hl-mission-h">Which link changed first?</div><p>After the collective increase, which part of the hover chain moved first?</p>';
        ui.controls.appendChild(first);
        const firstOpts = el('div', 'hl-check-opts');
        [
          'Produced thrust',
          'Induced velocity',
          'Induced power',
          'Aircraft weight',
        ].forEach((text, i) => {
          const btn = el('button', 'hl-check-opt', text);
          if (firstLinkChoice != null) {
            btn.classList.add('done');
            btn.disabled = true;
            if (i === 0) btn.classList.add('correct');
            else if (i === firstLinkChoice) btn.classList.add('wrong');
          }
          btn.onclick = () => { if (firstLinkChoice == null) { firstLinkChoice = i; refresh(); } };
          firstOpts.appendChild(btn);
        });
        ui.controls.appendChild(firstOpts);
      }
    }

    function updateReadout() {
      const base = currentSol(baseCollective);
      const cur = currentSol(collective);
      const tw = cur.thrust / HL.weightN(st);
      const deltaVi = changed ? (cur.vi - base.vi) : 0;
      const deltaPi = changed ? (cur.Pi_induced - base.Pi_induced) : 0;
      ui.readout.innerHTML = kv([
        ['Collective', collective.toFixed(1) + '°', 'var(--hl-chord)'],
        ['Produced thrust', (cur.thrust / 1000).toFixed(1) + ' kN', 'var(--hl-lift)'],
        ['Hover-condition cue', hoverCue(tw), Math.abs(tw - 1) < 0.03 ? 'var(--hl-good)' : (tw > 1 ? 'var(--hl-warn)' : 'var(--hl-bad)')],
        ['T/W', tw.toFixed(2), Math.abs(tw - 1) < 0.03 ? 'var(--hl-good)' : (tw > 1 ? 'var(--hl-warn)' : 'var(--hl-bad)')],
        ['Induced velocity v_i', cur.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Induced power P_i', (cur.Pi_induced / 1000).toFixed(0) + ' kW', 'var(--brand)'],
      ]);
      if (prediction == null) {
        ui.readout.innerHTML += '<p class="hl-note">The readout shows the current state only. Commit to your prediction before you unlock the collective change.</p>';
      } else if (!changed) {
        ui.readout.innerHTML += `<div class="hl-check-fb neutral">${prediction === 0 ? 'Prediction locked.' : 'Prediction locked.'} Now make the collective change and compare the new rotor state with the baseline.</div>`;
      } else {
        ui.readout.innerHTML += '<div class="hl-check-fb ok">Collective increased → produced thrust rises first → the rotor must drive more air through the disc → induced velocity rises → induced power rises.</div>';
        ui.readout.innerHTML += kv([
          ['Δ v_i', (deltaVi >= 0 ? '+' : '') + deltaVi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
          ['Δ P_i', (deltaPi >= 0 ? '+' : '') + (deltaPi / 1000).toFixed(0) + ' kW', 'var(--brand)'],
        ]);
        if (firstLinkChoice != null) {
          ui.readout.innerHTML += `<div class="hl-check-fb ${firstLinkChoice === 0 ? 'ok' : 'no'}">${firstLinkChoice === 0
            ? 'Yes — in this stage the control changes the thrust the rotor produces first. The airflow and induced power follow from that new thrust state.'
            : 'The earliest change is the thrust the rotor produces. Induced velocity and induced power are consequences of that changed thrust, and the aircraft weight did not change at all.'}</div>`;
        }
      }
    }

    function draw() {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      HLD.grid(ctx, W, H, col, 30);
      const base = currentSol(baseCollective);
      const cur = currentSol(collective);
      if (!changed) {
        drawHoverStatePanel(ctx, { x: W * 0.08, y: H * 0.10, w: W * 0.84, h: H * 0.80 }, col, {
          label: 'Before the change',
          thrust: cur.thrust,
          weight: HL.weightN(st),
          vi: cur.vi,
          pi: cur.Pi_induced,
          collective,
          showFlow: true,
        });
      } else {
        drawHoverStatePanel(ctx, (W < 560 ? {x:W*.05,y:H*.02,w:W*.90,h:H*.43} : { x: W * 0.05, y: H * 0.11, w: W * 0.42, h: H * 0.76 }), col, {
          label: 'Before',
          thrust: base.thrust,
          weight: HL.weightN(st),
          vi: base.vi,
          pi: base.Pi_induced,
          collective: baseCollective,
          showFlow: true,
        });
        drawHoverStatePanel(ctx, (W < 560 ? {x:W*.05,y:H*.50,w:W*.90,h:H*.43} : { x: W * 0.53, y: H * 0.11, w: W * 0.42, h: H * 0.76 }), col, {
          label: 'After collective increase',
          thrust: cur.thrust,
          weight: HL.weightN(st),
          vi: cur.vi,
          pi: cur.Pi_induced,
          collective,
          showFlow: true,
        });
        HLD.text(ctx, 'Produced thrust ≠ required thrust', W * 0.50, H * 0.93, col.dim, '11px IBM Plex Sans', 'center', 'middle');
      }
    }

    function refresh() { buildControls(); updateReadout(); draw(); }
    ui.onDraw(draw);
    buildControls();
    updateReadout();
    host._hlModel = {
      get: () => ({prediction,changed,firstLinkChoice}),
      set: x => { prediction=Number.isInteger(x.prediction)&&x.prediction>=0&&x.prediction<predictions.length?x.prediction:null;changed=prediction!=null&&x.changed===true;collective=changed?changedCollective:baseCollective;firstLinkChoice=changed&&Number.isInteger(x.firstLinkChoice)&&x.firstLinkChoice>=0&&x.firstLinkChoice<4?x.firstLinkChoice:null;refresh(); },
      evidence: () => ({gates:{'collective-change':prediction!=null&&changed,'first-link':firstLinkChoice!=null},support:prediction!==0||firstLinkChoice!==0,comparison:{reference:currentSol(baseCollective),changed:currentSol(collective)}})
    };
  }

  function wM2ChangeDemand(host) {
    const ui = scaffold(host);
    ui.canvas.parentElement.classList.add('hl-hover-stage');
    const baseState = HL.defaultState();
    const scenarios = {
      weight: {
        label: 'Mass +15%',
        prompt: 'At the same density and rotor size, what happens when the helicopter mass increases by 15%?',
        options: [
          'Required thrust increases first, so induced velocity rises and induced power rises once hover trim restores the hover condition.',
          'Collective increases first, and that causes the helicopter to need more thrust.',
          'Density is unchanged, so induced power stays about the same in hover.',
          'Required thrust decreases because the helicopter is already in a hover.',
        ],
        changedState: { ...baseState, W_kg: baseState.W_kg * 1.15 },
      },
      density: {
        label: 'Thinner air',
        prompt: 'At the same mass, what happens if the helicopter must hover at a density altitude of 8000 ft?',
        options: [
          'Required thrust stays the same, but thinner air raises induced velocity, so induced power rises.',
          'Required thrust falls because the rotor gets more lift from thinner air.',
          'Required thrust rises first, and that is why induced power rises.',
          'Nothing changes because hover trim keeps T = W.',
        ],
        changedState: { ...baseState, alt: 8000 },
      },
    };
    const predictions = { weight: null, density: null };
    const reveals = { weight: false, density: false };
    let scenario = 'weight';
    let magnitudeChoice = null;
    const chainBank = [
      'required thrust increases',
      'induced velocity increases',
      'induced power increases',
      'rotor transfers more energy to the air',
      'collective increases',
      'thrust decreases',
    ];
    for (let i=chainBank.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [chainBank[i],chainBank[j]]=[chainBank[j],chainBank[i]]; }
    const chainAnswer = [
      'required thrust increases',
      'induced velocity increases',
      'induced power increases',
      'rotor transfers more energy to the air',
    ];
    let chain = [];
    let chainChecked = false;

    function trimData(st) {
      const target = HL.weightN(st);
      const tr = HL.hoverTrimSolve(st, target);
      return {
        trim: tr,
        thrust: tr.producedThrust,
        weight: target,
        vi: tr.solution.vi,
        pi: tr.solution.Pi_induced,
        collective: tr.theta0,
      };
    }

    function predictionDone(key) { return predictions[key] != null; }
    function weightReady() { return reveals.weight; }
    function chainUnlocked() { return reveals.weight && reveals.density && magnitudeChoice != null; }

    function buildScenarioButtons(parent) {
      const grp = el('div', 'hl-seg');
      [['weight', 'Heavier hover'], ['density', 'Thinner air']].forEach(([key, text]) => {
        const btn = el('button', 'hl-seg-btn' + (scenario === key ? ' on' : ''), text);
        btn.onclick = () => { scenario = key; refresh(); };
        grp.appendChild(btn);
      });
      parent.appendChild(grp);
    }

    function buildControls() {
      ui.controls.innerHTML = '';
      const stateBox = el('div', 'hl-mission-box');
      stateBox.innerHTML = '<div class="hl-mission-h">State</div><p><b>Hover trim ON.</b> Each revealed comparison is solved back to the hover condition so the rotor still matches the required thrust.</p>';
      ui.controls.appendChild(stateBox);
      buildScenarioButtons(ui.controls);

      const cur = scenarios[scenario];
      const prompt = el('div', 'hl-mission-box');
      prompt.innerHTML = `<div class="hl-mission-h">Predict first</div><p>${cur.prompt}</p>`;
      ui.controls.appendChild(prompt);

      const opts = el('div', 'hl-check-opts');
      cur.options.forEach((text, i) => {
        const btn = el('button', 'hl-check-opt', text);
        if (predictionDone(scenario)) {
          btn.classList.add('done');
          btn.disabled = true;
          if (i === 0) btn.classList.add('correct');
          else if (i === predictions[scenario]) btn.classList.add('wrong');
        }
        btn.onclick = () => {
          if (!predictionDone(scenario)) {
            predictions[scenario] = i;
            reveals[scenario] = true;
            refresh();
          }
        };
        opts.appendChild(btn);
      });
      ui.controls.appendChild(opts);

      if (reveals[scenario]) {
        const fb = el('div', 'hl-check-fb ' + (predictions[scenario] === 0 ? 'ok' : 'no'),
          scenario === 'weight'
            ? 'The demand change starts with required thrust. Hover trim then adjusts collective so the rotor produces that new thrust, which raises induced velocity and induced power.'
            : 'The hover demand stays the same, but thinner air means the rotor needs more induced velocity to produce the same thrust, so induced power rises.');
        ui.controls.appendChild(fb);
      }

      if (scenario === 'weight' && weightReady()) {
        const mag = el('div', 'hl-mission-box');
        mag.innerHTML = '<div class="hl-mission-h">15% mass magnitude gate</div><p>Mass increases by 15% at constant density and rotor size. Choose the nearest offered estimate of the ideal induced-power increase:</p>';
        ui.controls.appendChild(mag);
        const magOpts = el('div', 'hl-check-opts');
        ['15%', '25%', '40%'].forEach((text, i) => {
          const btn = el('button', 'hl-check-opt', text);
          if (magnitudeChoice != null) {
            btn.classList.add('done');
            btn.disabled = true;
            if (i === 1) btn.classList.add('correct');
            else if (i === magnitudeChoice) btn.classList.add('wrong');
          }
          btn.onclick = () => { if (magnitudeChoice == null) { magnitudeChoice = i; refresh(); } };
          magOpts.appendChild(btn);
        });
        ui.controls.appendChild(magOpts);
        if (magnitudeChoice != null) {
          const fb = el('div', 'hl-check-fb ' + (magnitudeChoice === 1 ? 'ok' : 'no'),
            'The ideal increase is about 23% (1.15^(3/2) − 1); 25% is the nearest offered estimate. Thrust demand rises by 15%, while induced power rises faster because induced velocity also increases.');
          ui.controls.appendChild(fb);
        }
      }

      if (scenario === 'weight' && chainUnlocked()) {
        const chainBox = el('div', 'hl-mission-box');
        chainBox.innerHTML = '<div class="hl-mission-h">Build the causal chain</div><p>Tap four tiles in order for the heavier-hover case. Leave the decoys out.</p>';
        ui.controls.appendChild(chainBox);

        const slots = el('div', 'hl-causal-slots');
        for (let i = 0; i < 4; i++) {
          slots.appendChild(el('div', 'hl-causal-slot', chain[i] || `Step ${i + 1}`));
        }
        ui.controls.appendChild(slots);

        const bank = el('div', 'hl-causal-bank');
        chainBank.forEach((tile) => {
          const used = chain.indexOf(tile) >= 0;
          const btn = el('button', 'hl-causal-tile' + (used ? ' is-used' : ''), tile);
          btn.disabled = used || chainChecked || chain.length >= 4;
          btn.onclick = () => {
            if (!used && !chainChecked && chain.length < 4) {
              chain.push(tile);
              refresh();
            }
          };
          bank.appendChild(btn);
        });
        ui.controls.appendChild(bank);

        const actions = el('div', 'hl-inline-actions');
        const checkBtn = el('button', 'hl-foot-btn primary', 'Check chain');
        checkBtn.disabled = chain.length !== 4 || chainChecked;
        checkBtn.onclick = () => { if (chain.length === 4) { chainChecked = true; refresh(); } };
        const resetBtn = el('button', 'hl-foot-btn', 'Reset chain');
        resetBtn.onclick = () => { chain = []; chainChecked = false; refresh(); };
        actions.appendChild(checkBtn);
        actions.appendChild(resetBtn);
        ui.controls.appendChild(actions);

        if (chainChecked) {
          const ok = chain.every((tile, i) => tile === chainAnswer[i]);
          const fb = el('div', 'hl-check-fb ' + (ok ? 'ok' : 'no'),
            ok
              ? 'Yes — the demand change starts with required thrust. Collective is only the trim consequence that restores hover in the new state.'
              : 'Rebuild the chain from the demand change. Required thrust must increase first; “collective increases” is a trim consequence, and “thrust decreases” belongs to a different misconception.');
          ui.controls.appendChild(fb);
        }
      }
    }

    function comparisonHtml(label, base, changed, note) {
      const sameDemand = Math.abs(changed.weight - base.weight) < 20;
      return `<div class="hl-causal-compare">
        <div class="hl-causal-compare-card">
          <h4>Reference hover</h4>
          ${kv([
            ['Required thrust', (base.weight / 1000).toFixed(1) + ' kN', 'var(--hl-ink)'],
            ['Produced thrust', (base.thrust / 1000).toFixed(1) + ' kN', 'var(--hl-lift)'],
            ['Induced velocity', base.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
            ['Induced power', (base.pi / 1000).toFixed(0) + ' kW', 'var(--brand)'],
          ])}
        </div>
        <div class="hl-causal-compare-card">
          <h4>${label}</h4>
          ${kv([
            ['Required thrust', (changed.weight / 1000).toFixed(1) + ' kN', sameDemand ? 'var(--hl-ink)' : 'var(--hl-warn)'],
            ['Produced thrust', (changed.thrust / 1000).toFixed(1) + ' kN', 'var(--hl-lift)'],
            ['Induced velocity', changed.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
            ['Induced power', (changed.pi / 1000).toFixed(0) + ' kW', 'var(--brand)'],
            ['Trim consequence', 'collective ' + changed.collective.toFixed(1) + '°', 'var(--hl-chord)'],
          ])}
        </div>
      </div><p class="hl-note">${note}</p>`;
    }

    function updateReadout() {
      const base = trimData(baseState);
      const changed = trimData(scenarios[scenario].changedState);
      ui.readout.innerHTML = kv([
        ['Hover trim', 'ON', 'var(--hl-good)'],
        ['Reference required thrust', (base.weight / 1000).toFixed(1) + ' kN', 'var(--hl-ink)'],
        ['Reference induced velocity', base.vi.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Reference induced power', (base.pi / 1000).toFixed(0) + ' kW', 'var(--brand)'],
      ]);
      if (!reveals[scenario]) {
        ui.readout.innerHTML += '<p class="hl-note">The changed-state outputs stay hidden until you commit to a prediction.</p>';
        return;
      }
      ui.readout.innerHTML += comparisonHtml(
        scenarios[scenario].label,
        base,
        changed,
        scenario === 'weight'
          ? 'The heavier helicopter needs more required thrust first. Hover trim then restores that higher thrust, which raises both induced velocity and induced power.'
          : 'The same mass still needs the same required thrust. Thin air changes the induced-flow requirement, so induced velocity and induced power rise even though the hover demand does not.'
      );
      if (reveals.weight && !reveals.density) {
        ui.readout.innerHTML += '<div class="hl-check-fb ok">Next, compare the same hover demand in thinner air.</div>';
      }
      if (chainChecked) {
        ui.readout.innerHTML += `<div class="hl-check-fb ${chain.every((tile, i) => tile === chainAnswer[i]) ? 'ok' : 'no'}">Keep the distinction clear: demand changes begin with required thrust, while trim changes are how the rotor catches up to that demand.</div>`;
      }
    }

    function draw() {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      HLD.grid(ctx, W, H, col, 30);
      const base = trimData(baseState);
      const cur = trimData(scenarios[scenario].changedState);
      if (!reveals[scenario]) {
        drawHoverStatePanel(ctx, { x: W * 0.08, y: H * 0.10, w: W * 0.84, h: H * 0.80 }, col, {
          label: 'Reference hover',
          thrust: base.thrust,
          weight: base.weight,
          vi: base.vi,
          pi: base.pi,
          collective: null,
          showFlow: true,
        });
      } else {
        drawHoverStatePanel(ctx, (W < 560 ? {x:W*.05,y:H*.02,w:W*.90,h:H*.43} : { x: W * 0.05, y: H * 0.11, w: W * 0.42, h: H * 0.76 }), col, {
          label: 'Reference hover',
          thrust: base.thrust,
          weight: base.weight,
          vi: base.vi,
          pi: base.pi,
          collective: null,
          showFlow: true,
        });
        drawHoverStatePanel(ctx, (W < 560 ? {x:W*.05,y:H*.50,w:W*.90,h:H*.43} : { x: W * 0.53, y: H * 0.11, w: W * 0.42, h: H * 0.76 }), col, {
          label: scenarios[scenario].label,
          thrust: cur.thrust,
          weight: cur.weight,
          vi: cur.vi,
          pi: cur.pi,
          collective: reveals[scenario] ? cur.collective : null,
          showFlow: true,
        });
        HLD.text(ctx,
          scenario === 'weight' ? 'Demand changed first: the rotor must support more weight.' : 'Demand is unchanged: the air is thinner, so hover costs more flow.',
          W * 0.50, H * 0.93, col.dim, '11px IBM Plex Sans', 'center', 'middle');
      }
    }

    function refresh() { buildControls(); updateReadout(); draw(); }
    ui.onDraw(draw);
    buildControls();
    updateReadout();
    host._hlModel = {
      get: () => ({scenario,predictions:{...predictions},reveals:{...reveals},magnitudeChoice,chain:[...chain],chainChecked}),
      set: x => { scenario=x.scenario==='density'?'density':'weight';for(const k of ['weight','density']){predictions[k]=Number.isInteger(x.predictions?.[k])&&x.predictions[k]>=0&&x.predictions[k]<4?x.predictions[k]:null;reveals[k]=predictions[k]!=null;}magnitudeChoice=Number.isInteger(x.magnitudeChoice)&&x.magnitudeChoice>=0&&x.magnitudeChoice<3?x.magnitudeChoice:null;chain=Array.isArray(x.chain)?x.chain.filter(v=>chainBank.includes(v)).slice(0,4):[];chainChecked=x.chainChecked===true&&chain.length===4;refresh(); },
      evidence: () => ({gates:{'mass-comparison':reveals.weight,'density-comparison':reveals.density,magnitude:magnitudeChoice!=null,'causal-chain':chainChecked&&chain.every((v,i)=>v===chainAnswer[i])},support:predictions.weight!==0||predictions.density!==0||magnitudeChoice!==1,comparison:{reference:trimData(baseState),mass:reveals.weight?trimData(scenarios.weight.changedState):null,density:reveals.density?trimData(scenarios.density.changedState):null}})
    };
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

    const VRS_LOW = -1.8, VRS_HIGH = -0.25;   // VRS band in V_c/v_h (matches engine branch boundary)
    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const sol = solveAt(theta, Vc), T = sol.thrust, twr = T / Wt;
      const OmR = HL.omR(st);
      const vh = sol.vih || 8;
      const vi = sol.vi, VcMs = Vc, UP = vi + VcMs;          // net axial inflow (m/s), down-positive
      const phi = Math.max(-0.28, Math.min(0.5, Math.atan2(sol.lam, 0.75)));  // = atan2(U_P, U_T)
      const aoaDeg = (theta * D2R - phi) * 180 / Math.PI;
      const a = (T - Wt) / mass;
      const phCol = phase.indexOf('VRS') >= 0 ? col.bad
        : (phase.indexOf('STEADY') === 0 || phase === 'HOVER') ? col.good
        : phase.indexOf('ACCEL') === 0 ? col.warn : col.ink;

      // phase banner
      HLD.text(ctx, phase, W * 0.22, 15, phCol, 'bold 12px IBM Plex Sans', 'center');

      // ── left-top: disc side-view inflow diagram  v_i + V_c = U_P ──
      // momentum view: how climb / descent velocity grows the net through-flow.
      const compact = W < 560;
      const cx = W * 0.22, cy = H * 0.27, dw = W * 0.082;
      const vrsNow = sol.vrs;
      HLD.text(ctx, vrsNow ? (compact ? '⚠ VRS — recirculation' : '⚠ VRS — recirculation (momentum theory invalid)') : 'rotor disc — side view',
        cx, H * 0.045, vrsNow ? col.bad : col.dim, '9px IBM Plex Sans', 'center', 'top');
      ctx.strokeStyle = col.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - dw, cy); ctx.lineTo(cx + dw, cy); ctx.stroke();
      ctx.fillStyle = col.dim; ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.ellipse(cx, cy, dw, H * 0.011, 0, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
      HLD.dot(ctx, cx, cy, 2.5, col.accent);
      const refL = H * 0.13, sc = refL / vh;                  // px per (m/s), v_h → refL
      const arrLen = v => Math.sign(v) * Math.min(refL, Math.abs(v) * sc);
      const upCol = vrsNow ? col.bad : (UP >= 0 ? col.ink : col.bad);
      const valTxt = v => (v >= 0 ? '+' : '') + v.toFixed(1);
      if (compact) {
        // narrow screens: one bold net arrow through the disc + the equation as text
        const L = arrLen(UP);
        HLD.arrow(ctx, cx, cy - L / 2, cx, cy + L / 2, upCol, 4.5, 11);
        HLD.text(ctx, 'U_P ' + valTxt(UP) + ' m/s', cx, cy + refL * 0.55, upCol, 'bold 10px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, 'v_i ' + valTxt(vi) + '  +  V_c ' + valTxt(VcMs) + '  =  U_P ' + valTxt(UP),
          cx, cy + refL * 0.55 + 14, col.dim, '9px IBM Plex Sans', 'center', 'top');
      } else {
        const sp = W * 0.075, xVi = cx - sp, xVc = cx, xUp = cx + sp, yLbl = cy + refL * 0.55;
        HLD.arrow(ctx, xVi, cy - arrLen(vi) / 2, xVi, cy + arrLen(vi) / 2, col.lift, 3, 9);
        HLD.text(ctx, 'v_i', xVi, yLbl, col.lift, 'bold 10px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, vi.toFixed(1) + ' m/s', xVi, yLbl + 11, col.dim, '8px IBM Plex Sans', 'center', 'top');
        const vcCol = VcMs >= 0 ? col.good : col.wind;
        const vcLbl = Math.abs(VcMs) < 0.15 ? 'V_c' : (VcMs > 0 ? 'climb V_c' : 'descent V_c');
        HLD.arrow(ctx, xVc, cy - arrLen(VcMs) / 2, xVc, cy + arrLen(VcMs) / 2, vcCol, 3, 9);
        HLD.text(ctx, vcLbl, xVc, yLbl, vcCol, 'bold 10px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, valTxt(VcMs) + ' m/s', xVc, yLbl + 11, col.dim, '8px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, '+', (xVi + xVc) / 2, cy, col.ink, 'bold 14px IBM Plex Sans', 'center', 'middle');
        HLD.text(ctx, '=', (xVc + xUp) / 2, cy, col.ink, 'bold 14px IBM Plex Sans', 'center', 'middle');
        HLD.arrow(ctx, xUp, cy - arrLen(UP) / 2, xUp, cy + arrLen(UP) / 2, upCol, 4.5, 11);
        HLD.text(ctx, 'U_P', xUp, yLbl, upCol, 'bold 11px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, valTxt(UP) + ' m/s', xUp, yLbl + 11, col.dim, '8px IBM Plex Sans', 'center', 'top');
      }
      HLD.text(ctx, 'positive = down through disc', cx, H * 0.495, col.dim, '8px IBM Plex Sans', 'center', 'bottom');
      if (vrsNow) {
        ctx.strokeStyle = col.bad; ctx.lineWidth = 2;
        for (const tx of [cx - dw, cx + dw]) { ctx.beginPath(); ctx.arc(tx, cy, W * 0.02, -0.4, Math.PI * 1.3); ctx.stroke(); }
      }

      // ── left-bottom: blade element at 0.75R (BET consequence of U_P) ──
      // U_P (from the disc diagram above) meets U_T = Ω·0.75R → φ = atan2(U_P,U_T), α = θ − φ.
      HLD.text(ctx, 'blade element (0.75R) — U_P → φ → α', W * 0.04, H * 0.56, col.dim, '9px IBM Plex Sans');
      HLD.bladeSection(ctx, W * 0.07, H * 0.86, Math.min(W * 0.34, 175),
        { theta: theta * D2R, phi, ampl: 3.2, showForces: false, aoa: theta * D2R - phi, stall: false }, col);

      // ── right: phase map  U_P/v_h  vs  V_c/v_h ──
      // the climb/descent velocity is read straight off the horizontal axis;
      // U_P grows to the right (climb), shrinks and reverses to the left (descent → windmill).
      ctx.save(); ctx.translate(W * 0.46, H * 0.02);
      const cW = W * 0.52, cH = H * 0.92;
      const clean = [], vrsSeg = [];
      for (let i = 0; i <= 80; i++) {
        const ratio = -3 + 4 * i / 80, v = ratio * vh, s = solveAt(theta, v);
        (s.vrs ? vrsSeg : clean).push({ x: ratio, y: (s.vi + v) / vh });
      }
      const ch = HLD.lineChart(ctx, cW, cH,
        [{ pts: clean, color: col.accent, width: 2.2 }, { pts: vrsSeg, color: col.bad, width: 2.2, dash: [5, 4] }],
        { xmin: -3, xmax: 1, ymin: -2.2, ymax: 2.2, xlab: 'descent ←  V_c / v_h  → climb', ylab: 'U_P / v_h' }, col,
        [{ x: 0, color: col.dim, label: 'hover' }]);
      const xa = ch.sx(VRS_LOW), xb = ch.sx(VRS_HIGH);
      ctx.fillStyle = 'rgba(248,113,113,0.12)'; ctx.fillRect(xa, ch.y1, xb - xa, ch.y0 - ch.y1);
      HLD.hatchRect(ctx, xa, ch.y1, xb - xa, ch.y0 - ch.y1, 'rgba(248,113,113,0.22)', 7);
      HLD.text(ctx, 'VRS', (xa + xb) / 2, ch.y1 + 8, col.bad, 'bold 9px IBM Plex Sans', 'center', 'top');
      HLD.dline(ctx, ch.x0, ch.sy(0), ch.x1, ch.sy(0), col.ink, 1.2, [4, 4]);
      HLD.text(ctx, 'flow reverses (negative U_P)', ch.x1 - 2, ch.sy(0) + 10, col.dim, '8px IBM Plex Sans', 'right', 'top');
      HLD.text(ctx, 'WINDMILL / autorotation', ch.sx(-2.45), ch.sy(-1.55), col.wind, 'bold 9px IBM Plex Sans', 'center');
      HLD.text(ctx, 'CLIMB', ch.sx(0.55), ch.sy(1.75), col.good, 'bold 9px IBM Plex Sans', 'center');
      const px = ch.sx(Math.max(-3, Math.min(1, VcMs / vh))), py = ch.sy(Math.max(-2.2, Math.min(2.2, UP / vh)));
      HLD.dline(ctx, px, ch.y0, px, py, col.ink, 1, [3, 3]);
      HLD.dot(ctx, px, py, 5, sol.vrs ? col.bad : (VcMs >= 0 ? col.good : col.wind));
      ctx.restore();

      readout.innerHTML = kv([
        ['Phase', phase, phVar()],
        ['Vertical speed', (Vc >= 0 ? '+' : '') + Vc.toFixed(1) + ' m/s  (' + (Vc / vih).toFixed(2) + ' v_h)', 'var(--hl-ink)'],
        ['Induced v_i', vi.toFixed(1) + ' m/s', 'var(--hl-lift)'],
        ['Net U_P = v_i+V_c', (UP >= 0 ? '+' : '') + UP.toFixed(1) + ' m/s', sol.vrs ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['Accel.', a.toFixed(2) + ' m/s²', Math.abs(a) < 0.05 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['T / W', twr.toFixed(2), twr >= 0.99 && twr <= 1.01 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Blade φ', (phi * 180 / Math.PI).toFixed(1) + '°', 'var(--hl-chord)'],
        ['Blade α (0.75R)', aoaDeg.toFixed(1) + '°', 'var(--hl-lift)'],
        ['Collective θ₀', theta.toFixed(1) + '°', 'var(--hl-chord)'],
      ]) + '<p class="hl-note">' + phaseNote() + '</p>';
    };

    const phaseNote = () => {
      if (phase.indexOf('in VRS band') >= 0) return '⚠ Transiting the <b>vortex-ring band</b> on the way down — thrust is erratic in here (the model holds an approximate value). A real descent should not linger in this band.';
      if (phase.indexOf('VRS') >= 0) return '⚠ The descent settled in the <b>vortex ring</b> band — momentum theory breaks down here and thrust gets erratic. The illustration identifies an unreliable model region; it cannot establish a type-specific recovery procedure.';
      if (phase === 'ACCELERATING ↑') return 'Collective raised → <b>T &gt; W</b> → accelerating up. As the climb builds, <b>U_P = v_i + V_c grows</b> → φ grows → α shrinks, pulling T back toward W.';
      if (phase === 'ACCELERATING ↓') return 'Collective lowered → <b>T &lt; W</b> → accelerating down. The descent <b>shrinks U_P</b> (v_i + V_c ↓) → φ shrinks → α grows, pushing T back up toward W.';
      if (phase === 'STEADY CLIMB') return '✔ <b>T = W</b> again at a steady rate of climb. U_P sits above its hover value, so α is back near hover — the extra collective went into beating the higher inflow, not into more AoA. That is why climbing costs collective/power.';
      if (phase === 'STEADY DESCENT') return '✔ <b>T = W</b> at a steady rate of descent. In a fast/steep descent <b>U_P reverses</b> (negative perpendicular inflow) — the clean windmill / autorotative state the rotor must reach by passing <i>through</i> VRS. (Engine-off autorotation lives in this regime — Lesson 15.)';
      if (phase.indexOf('manual') >= 0) return 'Manual scrub. Press <b>Climb</b> or <b>Descent</b> to watch the transient: T momentarily ≠ W, the aircraft accelerates, and the changing inflow trims it back to T = W.';
      return 'Hover: thrust exactly balances weight. Press <b>Climb</b> or <b>Descent</b> to see how the rotor settles into a steady rate of climb/descent.';
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
    mkBtn('▶ Steep', () => startAnim(2 - thHover, 'ACCELERATING ↓'));
    mkBtn('↺ Hover', () => { animating = false; if (raf) { cancelAnimationFrame(raf); raf = null; } theta = thHover; Vc = 0; t = 0; phase = 'HOVER'; if (sl) sl.set(0); draw(); });
    controls.appendChild(btns);
    sl = slider(controls, { label: 'Manual vertical speed V_c', min: -16, max: 8, step: 0.5, val: 0, unit: ' m/s',
      on: v => { animating = false; if (raf) { cancelAnimationFrame(raf); raf = null; } theta = thHover; Vc = v;
        phase = Math.abs(v) < 0.15 ? 'HOVER' : (v > 0 ? 'CLIMB (manual)' : 'DESCENT (manual)'); draw(); } });

    const ro = new ResizeObserver(() => { if (!animating) draw(); }); ro.observe(stage);
    (host._hlDisposers ||= []).push(() => { ro.disconnect(); animating=false; if(raf) cancelAnimationFrame(raf); });
    requestAnimationFrame(draw);
  }

  function wCBTGroundEffect(host) {
    const ui = scaffold(host); const st = HL.defaultState(); let zR = 0.6;
    slider(ui.controls,{label:'Rotor height / radius',min:0.3,max:2,step:0.05,val:zR,on:v=>{zR=v;draw();}});
    function draw(){
      const cmp=HL.groundEffectFixedThrustComparison(st,zR),a=cmp.oge.solution,b=cmp.ige.solution;
      ui.readout.innerHTML=kv([
        ['Required thrust (both)',(cmp.targetThrust/1000).toFixed(2)+' kN','var(--hl-lift)'],
        ['OGE induced velocity',a.vi.toFixed(2)+' m/s','var(--hl-wind)'],
        ['IGE induced velocity',b.vi.toFixed(2)+' m/s','var(--hl-wind)'],
        ['OGE induced power',(a.Pi_induced/1000).toFixed(1)+' kW','var(--brand)'],
        ['IGE induced power',(b.Pi_induced/1000).toFixed(1)+' kW','var(--brand)']
      ])+'<p>Equal mass, density and rotor area. Collective is solved separately to maintain the same required thrust. Idealised induced-power comparison, not an aircraft performance chart.</p>';
      const {ctx,W,H,col}=HLD.setup(ui.canvas);HLD.clear(ctx,W,H,col);
      const max=Math.max(a.Pi_induced,b.Pi_induced),width=W*.22;
      [a,b].forEach((x,i)=>{const h=x.Pi_induced/max*H*.50,cx=W*(i?.67:.33);ctx.fillStyle=i?col.good:col.accent;ctx.fillRect(cx-width/2,H*.76-h,width,h);HLD.text(ctx,i?'IGE':'OGE',cx,H*.84,col.ink,'bold 14px sans-serif','center');});
      HLD.text(ctx,'Induced power at equal thrust',W/2,28,col.ink,'14px sans-serif','center');
    } ui.onDraw(draw);
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
      ]) + `<p class="hl-note">${zR < 0.6 ? 'The selected height approximation predicts a strong ground-effect benefit.'
        : zR > 1.4 ? 'The selected approximation predicts a small residual benefit at this height.'
        : 'The benefit varies continuously with rotor height and the selected surface assumptions.'}</p>`;
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
      }, col, { V: st.V, hideAdvLabel: true });   // ADV bar chart occupies the right gutter
      // reverse-flow circle (UT<0 region: r < -mu sinψ on retreating side)
      if (mu > 0.05) {
        ctx.strokeStyle = 'rgba(180,60,200,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(cx - R * mu / 2, cy, R * mu / 2, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);
        HLD.text(ctx, 'reverse flow', cx - R * mu / 2, cy + R * mu / 2 + 9, '#d96ee0', '9px IBM Plex Sans', 'center', 'top');
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
      HLD.text(ctx, 'q proxy ∝ U_T²', bx, by - 14, col.dim, '10px IBM Plex Sans', 'center');
      ctx.fillStyle = ramp(0.85); ctx.fillRect(bx - bw - 6, by + bh - bh * liftAdv / maxL, bw, bh * liftAdv / maxL);
      HLD.text(ctx, 'ADV', bx - bw / 2 - 6, by + bh + 12, col.dim, '10px IBM Plex Sans', 'center');
      ctx.fillStyle = ramp(0.3); ctx.fillRect(bx + 6, by + bh - bh * liftRet / maxL, bw, bh * liftRet / maxL);
      HLD.text(ctx, 'RET', bx + bw / 2 + 6, by + bh + 12, col.dim, '10px IBM Plex Sans', 'center');
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Advance ratio μ', mu.toFixed(3), 'var(--hl-accent)'],
        ['U_T advancing', (utAdv).toFixed(2) + ' ΩR', 'var(--hl-good)'],
        ['U_T retreating', (utRet).toFixed(2) + ' ΩR', utRet < 0.2 ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['At ψ=' + psiDeg.toFixed(0) + '° (0.75R)', utPsi.toFixed(2) + ' ΩR · q proxy ' + (utPsi > 0 ? (utPsi * utPsi).toFixed(2) : '0'),
          utPsi < 0.2 ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['Tangential q-proxy ratio', (liftAdv / Math.max(0.01, liftRet)).toFixed(1) + '×', 'var(--hl-bad)'],
      ]) + `<p class="hl-note">The tangential dynamic-pressure proxy has an
        advancing/retreating ratio of ${(liftAdv / Math.max(0.01, liftRet)).toFixed(1)}
        at this station. Interpreting it as a lift ratio additionally assumes equal
        density, area and coefficient, and neglects perpendicular velocity.
        ${mu > 0.05 ? 'Purple marks reverse chordwise flow near the retreating root; its actual load is not solved. ' : ''}
        Flapping and cyclic change the response; they do not automatically make all local lift equal.</p>`;
    };
    slider(ui.controls, { label: 'Forward speed', min: 0, max: 160, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    slider(ui.controls, { label: 'Azimuth ψ (blade position)', min: 0, max: 355, step: 5, val: psiDeg, unit: '°', fmt: v => v.toFixed(0), on: v => { psiDeg = v; draw(); } });
    ui.onDraw(draw);
  }

  /* Controlled flap-rate experiment: hold the other velocity terms fixed. */
  function wFlapping(host) {
    const ui=scaffold(host,{mainStage:'hl-w-stage hl-w-stage-mechanism'});
    let Vkt=60,psiDeg=270,rBar=.75,rateDeg=0;
    const draw=()=>{
      const st={...HL.defaultState(),V:Vkt*.5144,theta0:10,theta1c:0,theta1s:0,twist:0};
      const psi=psiDeg*D2R,d=HLMechanisms.flap(st,rBar,psi,rateDeg),base=HLMechanisms.flap(st,rBar,psi,0);
      const omR=HL.omR(st),supported=d.UT>1e-4;
      const {ctx,W,H,col}=HLD.setup(ui.canvas);HLD.clear(ctx,W,H,col);
      const fs=W<420?11:13;
      HLD.text(ctx,'Same pitch + same air flow',W*.5,24,col.ink,'bold '+fs+'px IBM Plex Sans','center');
      // Air arriving at the element points from the upstream end to the blade.
      // Same angle scale and line length in both diagrams; retain signed phi.
      const A=2,len=Math.min(W*.65,H*.16/Math.max(.1,Math.abs(Math.sin(d.theta*A)),Math.abs(Math.sin(d.phi*A)),Math.abs(Math.sin(base.phi*A))));
      for(const [i,x,label] of [[0,base,'Reference · no flap rate'],[1,d,'Selected · '+(rateDeg<0?'downward':rateDeg>0?'upward':'no motion')]]){
        const y=H*(i===0?.34:.72),ox=W*.14;
        HLD.text(ctx,label,W*.5,y-85,i?col.accent:col.dim,fs+'px IBM Plex Sans','center');
        HLD.dline(ctx,ox-12,y,ox+len+12,y,col.dim,1);
        HLD.dline(ctx,ox,y,ox+len*Math.cos(x.theta*A),y-len*Math.sin(x.theta*A),col.chord,2,[6,3]);
        if(supported){
          HLD.arrow(ctx,ox+len*Math.cos(x.phi*A),y-len*Math.sin(x.phi*A),ox,y,col.wind,2,8);
          HLD.arc(ctx,ox,y,30,-x.theta*A,-x.phi*A,col.lift);
          HLD.text(ctx,'φ '+(x.phi*R2D).toFixed(1)+'°  →  α '+(x.aoa*R2D).toFixed(1)+'°',W*.5,y+32,col.ink,fs+'px IBM Plex Sans','center');
        }else HLD.text(ctx,'Reverse / near-zero tangential flow',W*.5,y+30,col.warn,fs+'px IBM Plex Sans','center');
      }
      HLD.text(ctx,'Dashed orange: fixed θ = 10°',W*.5,H-46,col.chord,'11px IBM Plex Sans','center');
      HLD.text(ctx,'Blue arrow: air relative to blade · angles ×2',W*.5,H-24,col.wind,'10px IBM Plex Sans','center');
      const motion=rateDeg<0?'downward':rateDeg>0?'upward':'stationary instantaneously';
      ui.readout.innerHTML=kv([
        ['Blade motion',motion,'var(--hl-accent)'],['Flapping rate β̇',rateDeg.toFixed(0)+'°/s','var(--hl-accent)'],
        ['Displacement β','0° at this instant','var(--hl-dim)'],['Fixed pitch θ','10.0°','var(--hl-chord)'],
        ['Unchanged U_T',(d.UT*omR).toFixed(2)+' m/s','var(--hl-ink)'],
        ['Unchanged air-flow normal term',(base.UP*omR).toFixed(2)+' m/s','var(--hl-ink)'],
        ['Flap-rate term r·β̇',(d.flapRateNormal*omR).toFixed(2)+' m/s','var(--hl-accent)'],
        ['Total U_P',(d.UP*omR).toFixed(2)+' m/s','var(--hl-ink)'],
        ['Inflow φ',supported?(d.phi*R2D).toFixed(2)+'°':'outside normal-flow comparison','var(--hl-wind)'],
        ['Angle of attack α',supported?(d.aoa*R2D).toFixed(2)+'°':'outside normal-flow comparison','var(--hl-lift)'],
        ['α change from no motion',supported?((d.aoa-base.aoa)*R2D).toFixed(2)+'°':'n/a','var(--hl-lift)']
      ])+`<p class="hl-note"><b>${rateDeg<0?'Downward rate → smaller U_P → smaller φ → larger α.':rateDeg>0?'Upward rate → larger U_P → larger φ → smaller α.':'Set −60°/s, then +60°/s. Predict which α is greater.'}</b> This chain holds at fixed pitch, positive U_T and unchanged other flow.</p><p class="hl-note">We prescribe β = 0 and its instantaneous rate to isolate motion. This is not a solved flapping response. The unchanged β shows why blade height alone cannot explain α. Disc response and phase are explored in the next activity.</p>`;
    };
    slider(ui.controls,{label:'Flapping rate β̇',min:-90,max:90,step:15,val:rateDeg,unit:'°/s',on:v=>{rateDeg=v;draw();}});
    slider(ui.controls,{label:'Forward speed',min:0,max:120,step:5,val:Vkt,unit:' kt',on:v=>{Vkt=v;draw();}});
    slider(ui.controls,{label:'Azimuth ψ',min:0,max:360,step:5,val:psiDeg,unit:'°',on:v=>{psiDeg=v;draw();}});
    slider(ui.controls,{label:'Blade station r/R',min:.4,max:1,step:.05,val:rBar,fmt:v=>v.toFixed(2),on:v=>{rBar=v;draw();}});
    ui.onDraw(draw);
  }

  /* Frozen-flow radial comparison: twist alone changes pitch. */
  function wTwistComparison(host) {
    const ui=scaffold(host,{mainStage:'hl-w-stage hl-w-stage-mechanism'});
    let Vkt=60,psiDeg=270,rBar=.75,twist=-8,pitch=14,normalMS=6;
    const draw=()=>{
      const st={...HL.defaultState(),V:Vkt*.5144,theta0:pitch,theta1c:0,theta1s:0};
      const at=(r,t)=>HLMechanisms.twist(st,r,psiDeg*D2R,t,normalMS);
      const d=at(rBar,twist),ref=at(rBar,0),curves=[[],[]];let max={alpha:-Infinity,r:0},refMax={alpha:-Infinity,r:0};
      for(let i=0;i<=130;i++){
        const r=.35+.65*i/130,b=at(r,0),x=at(r,twist);
        if(x.reverseFlow)continue;
        curves[0].push({x:r,y:b.aoa*R2D});curves[1].push({x:r,y:x.aoa*R2D});
        if(x.aoa*R2D>max.alpha)max={alpha:x.aoa*R2D,r};
        if(b.aoa*R2D>refMax.alpha)refMax={alpha:b.aoa*R2D,r};
      }
      const {ctx,W,H,col}=HLD.setup(ui.canvas);HLD.clear(ctx,W,H,col);
      const all=curves.flat().map(x=>x.y);
      HLD.lineChart(ctx,W,H,[{pts:curves[0],color:col.dim,width:2,label:'α · zero twist'},{pts:curves[1],color:col.lift,width:2.5,label:'α · selected twist'}],
        {xmin:.35,xmax:1,ymin:Math.floor(Math.min(...all,0))-1,ymax:Math.ceil(Math.max(...all,st.stallAoA))+1,xlab:'blade station r/R',ylab:'angle of attack α (°)'},col,
        [{x:rBar,color:col.chord,label:'station'}]);
      const supported=!d.reverseFlow;
      ui.readout.innerHTML=kv([
        ['Pitch reference at 0.75R',pitch.toFixed(1)+'° · unchanged','var(--hl-chord)'],
        ['Prescribed normal flow',normalMS.toFixed(1)+' m/s · unchanged','var(--hl-wind)'],
        ['Selected twist',twist.toFixed(0)+'° root-to-tip','var(--hl-chord)'],
        ['Selected station',rBar.toFixed(2)+'R','var(--hl-ink)'],
        ['θ: zero → selected twist',(ref.theta*R2D).toFixed(2)+'° → '+(d.theta*R2D).toFixed(2)+'°','var(--hl-chord)'],
        ['φ: zero → selected twist',supported?(ref.phi*R2D).toFixed(2)+'° → '+(d.phi*R2D).toFixed(2)+'°':'reverse / near-zero flow','var(--hl-wind)'],
        ['α: zero → selected twist',supported?(ref.aoa*R2D).toFixed(2)+'° → '+(d.aoa*R2D).toFixed(2)+'°':'outside normal-flow comparison','var(--hl-lift)'],
        ['Peak α: zero twist',refMax.alpha.toFixed(2)+'° at '+refMax.r.toFixed(2)+'R','var(--hl-dim)'],
        ['Peak α: selected twist',max.alpha.toFixed(2)+'° at '+max.r.toFixed(2)+'R','var(--hl-lift)'],
      ])+'<p class="hl-note"><b>Read the two curves at the same radius.</b> Negative twist lowers pitch outboard of 0.75R and raises it inboard. φ is unchanged, so Δα = Δθ. The sampled peak may move inward; its exact radius is not a rule.</p><p class="hl-note">Uniform downflow is prescribed. No cyclic, flapping or re-trim occurs. This isolates twist; it does not keep thrust constant or predict actual stall. Stall also requires local critical-α data. The rotor-map comparison changes several assumptions together.</p>';
    };
    slider(ui.controls,{label:'Blade twist (washout)',min:-16,max:0,step:2,val:twist,unit:'°',on:v=>{twist=v;draw();}});
    slider(ui.controls,{label:'Blade station r/R',min:.35,max:1,step:.05,val:rBar,fmt:v=>v.toFixed(2),on:v=>{rBar=v;draw();}});
    slider(ui.controls,{label:'Pitch at 0.75R',min:6,max:18,step:1,val:pitch,unit:'°',on:v=>{pitch=v;draw();}});
    slider(ui.controls,{label:'Prescribed normal flow',min:2,max:12,step:1,val:normalMS,unit:' m/s',on:v=>{normalMS=v;draw();}});
    slider(ui.controls,{label:'Forward speed',min:0,max:120,step:5,val:Vkt,unit:' kt',on:v=>{Vkt=v;draw();}});
    slider(ui.controls,{label:'Azimuth ψ',min:0,max:360,step:5,val:psiDeg,unit:'°',on:v=>{psiDeg=v;draw();}});
    ui.onDraw(draw);
  }

  /* Flapback & Inflow Roll: longitudinal flapback, lateral inflow roll, compare mode
     Educational model — quasi-steady, prescribed first-harmonic wake-skew approximation.
     NOT a free-wake or transient rotor-body coupling model. */
  function wFlappingRoll(host) {
    const ui = scaffold(host);

    let mode = 'flapback';     // 'flapback' | 'inflowroll' | 'vtriangles' | 'compare'
    let Vkt  = 80;
    let Vlat = 0;              // lateral wind [kt], positive = port→ADV
    let vtrans = 1.0;          // vtriangles transition strength 0..1
    let showCausal = false;    // vtriangles: show causal chain overlay
    let showConing = false;    // vtriangles: show coning contribution overlay
    let compareModel = 'forward';

    segmented(ui.controls, {
      label: 'Section',
      options: [
        { v: 'flapback',   t: 'Flapback' },
        { v: 'vtriangles', t: 'Velocity Triangles' },
        { v: 'inflowroll', t: 'Inflow Roll' },
        { v: 'compare',    t: 'Compare' },
      ],
      val: mode,
      on: v => { mode = v; rebuildControls(); draw(); },
    });

    const dynCtls = el('div');
    ui.controls.appendChild(dynCtls);

    function rebuildControls() {
      dynCtls.innerHTML = '';
      slider(dynCtls, { label: 'Forward speed', min: 0, max: 120, step: 5, val: Vkt, unit: ' kt',
        fmt: v => (+v).toFixed(0), on: v => { Vkt = v; draw(); } });
      if (mode === 'vtriangles') {
        slider(dynCtls, { label: 'Transition strength', min: 0, max: 1, step: 0.05, val: vtrans,
          unit: '', fmt: v => (+v).toFixed(2), on: v => { vtrans = +v; draw(); } });
        // presets row
        const presets = el('div', 'hl-ctl');
        presets.appendChild(el('span', 'hl-ctl-lab', 'Preset'));
        const pbRow = el('div');
        pbRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:2px';
        const mkP = (label, vkt, vtr) => {
          const b = el('button', 'hl-seg-btn', label);
          b.onclick = () => { Vkt = vkt; vtrans = vtr; rebuildControls(); draw(); };
          pbRow.appendChild(b);
        };
        mkP('Hover', 0, 0);
        mkP('Transition', 30, 0.5);
        mkP('Cruise', 80, 1.0);
        presets.appendChild(pbRow);
        dynCtls.appendChild(presets);
        toggle(dynCtls, { label: 'Show causal chain', val: showCausal,
          on: v => { showCausal = v; draw(); } });
        toggle(dynCtls, { label: 'Show coning contribution', val: showConing,
          on: v => { showConing = v; draw(); } });
      }
      if (mode === 'inflowroll') {
        slider(dynCtls, { label: 'Lateral wind (adv. scenario, \u2192ADV)', min: -40, max: 40, step: 5,
          val: Vlat, unit: ' kt', fmt: v => (+v).toFixed(0), on: v => { Vlat = v; draw(); } });
      }
      if (mode === 'compare') {
        segmented(dynCtls, {
          label: 'Compare case',
          options: [
            { v: 'uniform',  t: 'Uniform' },
            { v: 'forward',  t: 'Forward flight (fore-aft \u03bb)' },
            { v: 'lateral',  t: 'Lateral wind (\u03bb_s)' },
          ],
          val: compareModel,
          on: v => { compareModel = v; draw(); },
        });
      }
    }
    rebuildControls();

    /* Draw azimuth labels and cross-lines shared by all disc views */
    function discAnnotations(ctx, cx, cy, R, col, showFwdArrow) {
      HLD.dline(ctx, cx - R, cy, cx + R, cy, col.grid, 1, [3, 3]);
      HLD.dline(ctx, cx, cy - R, cx, cy + R, col.grid, 1, [3, 3]);
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.text(ctx, 'ADV 90°',   cx + R + 4,  cy,          col.dim, '9px IBM Plex Sans', 'left',   'middle');
      HLD.text(ctx, 'RET 270°',  cx - R - 4,  cy,          col.dim, '9px IBM Plex Sans', 'right',  'middle');
      HLD.text(ctx, 'NOSE 180°', cx,           cy - R - 6,  col.dim, '9px IBM Plex Sans', 'center', 'bottom');
      HLD.text(ctx, 'TAIL 0°',   cx,           cy + R + 12, col.dim, '9px IBM Plex Sans', 'center', 'top');
      if (showFwdArrow) HLD.arrow(ctx, cx, cy - R - 22, cx, cy - R - 6, col.accent, 2, 7);
    }

    /* ── Flapback ─────────────────────────────────────────────────────────── */
    function drawFlapback(ctx, W, H, col) {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const c   = flappingCoeffs(st);
      const mu  = advanceRatio(st);
      const a0d = c.a0 * R2D;
      const a1d = -c.a1c * R2D;   // flapback: positive = disc tilts aft
      const b1d = -c.a1s * R2D;   // lateral tilt

      const discR = Math.min(W * 0.23, H * 0.40);
      const cx = discR + 36, cy = H / 2;

      // Disc coloured by aerodynamic forcing \u221d U_T\u00b2 (normalized to advancing peak)
      const utMax2 = Math.max(0.01, (0.75 + Math.abs(mu)) * (0.75 + Math.abs(mu)));
      HLD.discPolar(ctx, cx, cy, discR, psi => {
        const ut = 0.75 + mu * Math.sin(psi);
        return ut < 0 ? 'rgba(180,60,200,0.40)'
                      : ramp(Math.max(0, Math.min(1, ut * ut / utMax2)));
      }, col, { V: st.V, hideAdvLabel: true });
      discAnnotations(ctx, cx, cy, discR, col, Vkt > 1);

      // Find azimuth of maximum flapping \u03b2(\u03c8) (= peak up-flap after phase lag)
      let betaPeak = -Infinity, psiPeak = 0;
      for (let i = 0; i < 720; i++) {
        const p = (i / 720) * 2 * Math.PI;
        const b = flappingAngle(c, p);
        if (b > betaPeak) { betaPeak = b; psiPeak = p; }
      }
      const psiPeakDeg = psiPeak * R2D;

      // Orange arrow: peak aerodynamic forcing at \u03c8=90\u00b0 (ADV)
      const prAdv = HLD.polarToCanvas(Math.PI / 2);
      HLD.arrow(ctx, cx, cy, cx + discR * 0.88 * Math.cos(prAdv),
                cy + discR * 0.88 * Math.sin(prAdv), col.chord, 2.5, 8);
      HLD.text(ctx, 'max U\u1d40\u00b2', cx + (discR + 10) * Math.cos(prAdv),
               cy + (discR + 10) * Math.sin(prAdv), col.chord, '9px IBM Plex Sans', 'left', 'middle');

      // Cyan arrow: peak flap (~90\u00b0 after peak force for ideal articulated rotor)
      const prFlap = HLD.polarToCanvas(psiPeak);
      HLD.arrow(ctx, cx, cy, cx + discR * 0.88 * Math.cos(prFlap),
                cy + discR * 0.88 * Math.sin(prFlap), col.accent, 2.5, 8);
      HLD.text(ctx, 'max flap', cx + (discR + 8) * Math.cos(prFlap),
               cy + (discR + 8) * Math.sin(prFlap), col.accent, '9px IBM Plex Sans', 'right', 'middle');

      // Phase-lag arc around hub
      // anticlockwise (in canvas) = CCW in rotor convention (increasing ψ);
      // correct flag: go anticlockwise when prFlap is at a lower canvas angle than prAdv
      if (mu > 0.01) {
        const arcR2 = discR * 0.35;
        ctx.strokeStyle = col.dim; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, arcR2, prAdv, prFlap, prFlap < prAdv);
        ctx.stroke(); ctx.setLineDash([]);
        const arcMid = (prAdv + prFlap) / 2;
        HLD.text(ctx, 'lag', cx + arcR2 * Math.cos(arcMid), cy + arcR2 * Math.sin(arcMid),
                 col.dim, '9px IBM Plex Sans', 'center', 'middle');
      }

      // Right panel: mini line-chart of L(\u03c8) and normalised \u03b2(\u03c8) on same x-axis
      const chX = cx + discR + 52, chW = W - chX - 6, chH = H - 12;
      if (chW > 70) {
        const liftPts = [], flapPts = [];
        let bMin = Infinity, bMax = -Infinity;
        for (let i = 0; i <= 72; i++) {
          const pd = i * 5, psi = pd * D2R;
          const ut  = 0.75 + mu * Math.sin(psi);
          const l   = Math.max(0, ut * ut) / utMax2;
          const bv  = (flappingAngle(c, psi) - c.a0) * R2D;
          if (bv < bMin) bMin = bv; if (bv > bMax) bMax = bv;
          liftPts.push({ x: pd, y: l });
          flapPts.push({ x: pd, y: bv });
        }
        const bRange = Math.max(0.01, bMax - bMin);
        const flapNorm = flapPts.map(p => ({ x: p.x, y: (p.y - bMin) / bRange }));
        ctx.save(); ctx.translate(chX, 6);
        HLD.lineChart(ctx, chW, chH, [
          { pts: liftPts,  color: col.chord,  width: 2,   label: 'lift \u221d U\u1d40\u00b2 (norm)' },
          { pts: flapNorm, color: col.accent, width: 2,   label: '\u03b2(\u03c8) deviation (norm)' },
        ], { xmin: 0, xmax: 360, ymin: 0, ymax: 1,
             xlab: '\u03c8 (deg)', ylab: 'normalised' }, col,
          [{ x: 90, color: col.chord, label: 'ADV' },
           { x: ((psiPeakDeg % 360) + 360) % 360, color: col.accent, label: 'peak \u03b2' }]);
        ctx.restore();
      }

      const lagDeg = (((psiPeakDeg - 90) % 360) + 360) % 360;
      ui.readout.innerHTML = kv([
        ['Forward speed',          Vkt.toFixed(0) + ' kt',      'var(--hl-ink)'],
        ['Advance ratio \u03bc',   mu.toFixed(3),               'var(--hl-accent)'],
        ['Coning a\u2080',          a0d.toFixed(1) + '\u00b0',  'var(--hl-lift)'],
        ['Flapback a\u2081 (aft tilt)', a1d.toFixed(1) + '\u00b0', 'var(--hl-chord)'],
        ['Lateral tilt b\u2081',   b1d.toFixed(1) + '\u00b0',  'var(--hl-warn)'],
        ['Peak-flap azimuth',      psiPeakDeg.toFixed(0) + '\u00b0', 'var(--hl-accent)'],
        ['Phase lag \u2248',       lagDeg.toFixed(0) + '\u00b0', 'var(--hl-accent)'],
      ]) + '<p class="hl-note">Disc coloured by aerodynamic forcing \u221d U\u1d40\u00b2 \u2014 hot on advancing side. '
         + 'Orange arrow = where peak force acts (\u03c8\u00a090\u00b0). Cyan arrow = where the blade peaks '
         + 'its flap (~90\u00b0 later for an ideal articulated rotor). That lag tilts the disc '
         + 'backward (flapback a\u2081). The pilot adds forward cyclic to re-level it. '
         + '<i>Quasi-steady BET model; hinge offset shortens the lag to ~75\u201385\u00b0 on real rotors.</i></p>';
    }

    /* ── Front vs Aft Disc: Velocity Triangles ──────────────────────────── */
    function drawVTriangles(ctx, W, H, col) {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const model = HL.linearInflowModel(st);
      const coeffs = flappingCoeffs(st);
      const mu = advanceRatio(st);

      const lamc_eff = model.lamc * vtrans;
      const lam0 = model.lam0;
      const rBar = 0.75;
      const UT = rBar;                      // sin(ψ)=0 at ψ=0 and ψ=π

      // Station A: front (ψ=π, cos=-1) → less induced velocity in forward flight
      const lamA = lam0 - lamc_eff * rBar;
      // Station B: aft (ψ=0, cos=+1) → more induced velocity in forward flight
      const lamB = lam0 + lamc_eff * rBar;

      const thetaA = bladePitch(st, rBar, Math.PI);
      const thetaB = bladePitch(st, rBar, 0);
      const phiA = inflowAngle(UT, lamA);
      const phiB = inflowAngle(UT, lamB);
      const alphaA = thetaA - phiA;
      const alphaB = thetaB - phiB;
      const liftIdxA = UT * UT * Math.max(0, alphaA);
      const liftIdxB = UT * UT * Math.max(0, alphaB);
      const liftMax = Math.max(liftIdxA, liftIdxB, 1e-6);

      // Coning contributions (optional overlay, sign per blade-motion convention)
      // At ψ=π: coning = μ·cos(π)·a₀ = -μ·a₀  (reduces UP at front)
      // At ψ=0:  coning = μ·cos(0)·a₀  = +μ·a₀  (adds to UP at aft)
      const coningA = mu * Math.cos(Math.PI) * coeffs.a0;
      const coningB = mu * Math.cos(0) * coeffs.a0;

      // Layout: left disc panel + right two-triangle panel
      const discW  = Math.min(W * 0.30, H * 0.82);
      const discCX = discW * 0.50 + 4;
      const discCY = H * 0.50;
      const discR  = discW * 0.38;
      const rpX    = discW + 10;
      const rpW    = W - rpX - 4;
      const triW   = rpW / 2 - 6;
      const triH   = H * 0.80;
      const triY   = H * 0.10;
      const triAX  = rpX;
      const triBX  = rpX + triW + 12;

      // ── Helper: draw one velocity triangle box ──────────────────────
      function triBox(ox, oy, tw, th, stLabel, stName, lamVal, lamConing,
                      thetaRad, phiRad, alphaRad, liftNorm) {
        const utPx  = Math.min(tw * 0.58, 68);
        const AMP   = 6;                   // visual amplification of UP for clarity
        // U_P goes UPWARD in the diagram (induced velocity downward through disc
        // = air approaches blade from above = perpendicular component points up)
        const upPx  = Math.max(-utPx * 0.85, Math.min(lamVal / UT * utPx * AMP, utPx * 0.85));
        const upConPx = Math.max(-22, Math.min(22, lamConing / UT * utPx * AMP));

        // Disc plane is the horizontal reference; triangle is above it
        const bx = ox + (tw - utPx) / 2;
        const by = oy + th * 0.62;   // disc plane baseline
        // O = origin (left), T = end of U_T (right), C = end of U_P (upper-right)
        const Ox = bx, Oy = by;
        const Tx = bx + utPx, Ty = by;
        const Cx = bx + utPx, Cy = by - upPx;    // UPWARD from disc plane

        // Station header (top of box)
        HLD.text(ctx, stLabel, ox + tw / 2, oy + 5,
                 col.ink, 'bold 10px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, stName, ox + tw / 2, oy + 17,
                 col.dim, '8px IBM Plex Sans', 'center', 'top');

        // Disc-plane dashed line (baseline)
        HLD.dline(ctx, ox + 2, by, ox + tw - 2, by, col.grid, 1, [4, 3]);
        HLD.text(ctx, 'disc plane', ox + tw - 3, by + 3, col.dim,
                 '8px IBM Plex Sans', 'right', 'top');

        // U_T arrow (horizontal right, on disc plane)
        HLD.arrow(ctx, Ox, Oy, Tx, Ty, col.chord, 2, 6);
        HLD.text(ctx, 'U\u1d40', bx + utPx * 0.5, by + 13,
                 col.chord, '9px IBM Plex Sans', 'center', 'top');

        // U_P arrow (upward from T → C: air approaches from above due to induced velocity)
        if (Math.abs(upPx) > 2) {
          HLD.arrow(ctx, Tx, Ty, Cx, Cy, col.accent, 2, 6);
          HLD.text(ctx, 'U\u209a', Tx + 4, (Ty + Cy) / 2,
                   col.accent, '9px IBM Plex Sans', 'left', 'middle');
        } else if (lamVal < -0.002) {
          // First-harmonic model predicts near-zero/upwash at this station
          HLD.text(ctx, 'weak upwash', Tx + 4, Ty - 8,
                   col.dim, '8px IBM Plex Sans', 'left', 'middle');
        }

        // W resultant arrow (from O to C, diagonal upward-right)
        // W = resultant incoming relative wind = (U_T, U_P) direction
        if (Math.abs(upPx) > 0) {
          HLD.arrow(ctx, Ox, Oy, Cx, Cy, col.lift, 2, 6);
          HLD.text(ctx, 'W', Cx + 3, Cy - 2,
                   col.lift, '9px IBM Plex Sans', 'left', 'bottom');
        } else {
          // No U_P: W = U_T (horizontal)
          HLD.arrow(ctx, Ox, Oy, Tx, Ty, col.lift, 2, 6);
          HLD.text(ctx, 'W', Tx + 3, Ty,
                   col.lift, '9px IBM Plex Sans', 'left', 'middle');
        }

        // φ arc at O: from disc plane (horizontal) to W (upward)
        // Counterclockwise in canvas (anticlockwise=true) sweeps UPWARD from 0 to -phiDisp
        const phiDisp = upPx > 0 ? Math.atan2(upPx, utPx) : 0;
        if (phiDisp > 0.06 && upPx > 4) {
          const arcR = utPx * 0.36;
          ctx.strokeStyle = col.dim; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(Ox, Oy, arcR, 0, -phiDisp, true);
          ctx.stroke();
          const midAng = -phiDisp / 2;
          HLD.text(ctx, '\u03c6', Ox + arcR * Math.cos(midAng) + 3,
                   Oy + arcR * Math.sin(midAng) - 2,
                   col.dim, '9px IBM Plex Sans', 'left', 'bottom');
        }

        // Blade chord (at angle θ above disc plane, going upper-right in canvas)
        const cl   = utPx * 0.95;
        const cosT = Math.cos(thetaRad);
        const sinT = Math.sin(thetaRad);
        const chCX = bx + utPx * 0.5, chCY = by;
        ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chCX - cl / 2 * cosT, chCY + cl / 2 * sinT);
        ctx.lineTo(chCX + cl / 2 * cosT, chCY - cl / 2 * sinT);
        ctx.stroke();
        HLD.text(ctx, '\u03b8', chCX + cl / 2 * cosT + 3, chCY - cl / 2 * sinT,
                 col.ink, '9px IBM Plex Sans', 'left', 'bottom');

        // Coning overlay: dashed extension of U_P (optional)
        // Positive coning = more U_P = extends arrow further upward in diagram
        if (showConing && Math.abs(upConPx) > 1) {
          const CyAdj = Cy - upConPx;   // positive upConPx → further up (smaller y)
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = col.warn; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(Cx, Cy); ctx.lineTo(Cx, CyAdj); ctx.stroke();
          ctx.setLineDash([]);
          HLD.text(ctx, upConPx > 0 ? '+coning' : '\u2212coning', Cx + 4,
                   (Cy + CyAdj) / 2, col.warn, '8px IBM Plex Sans', 'left', 'middle');
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Cx, CyAdj); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // α arc at O: from chord direction (-thetaRad) to W direction (-phiDisp)
        // anticlockwise=false sweeps downward (CW in math), spanning α = θ - φ
        if (alphaRad > 0.02 && upPx > 4) {
          const arcR2 = utPx * 0.20;
          ctx.strokeStyle = col.warn; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(Ox, Oy, arcR2, -thetaRad, -phiDisp, false);
          ctx.stroke();
          const aMid = -(thetaRad + phiDisp) / 2;
          HLD.text(ctx, '\u03b1', Ox + arcR2 * Math.cos(aMid) - 2,
                   Oy + arcR2 * Math.sin(aMid) - 5,
                   col.warn, '9px IBM Plex Sans', 'center', 'bottom');
        }

        // Qualitative lift indicator (coloured arrow pointing upward above disc plane)
        const liftPxMax = Math.min(th * 0.15, 38);
        const liftPx    = liftNorm * liftPxMax;
        if (liftPx > 3) {
          const lax = chCX - 10, lay = by - cl / 2 * sinT - 8;
          HLD.arrow(ctx, lax, lay, lax, lay - liftPx, col.lift, 2.5, 7);
          const ltxt = liftNorm > 0.9 ? 'lift\u2191\u2191' : (liftNorm > 0.5 ? 'lift\u2191' : 'lift');
          HLD.text(ctx, ltxt, lax - 3, lay - liftPx / 2,
                   col.lift, '8px IBM Plex Sans', 'right', 'middle');
        }

        // φ / α numeric readout below the disc plane
        const fmt1 = v => (v * R2D).toFixed(1) + '\u00b0';
        HLD.text(ctx, '\u03c6\u2248' + fmt1(phiRad) + '  \u03b1\u2248' + fmt1(alphaRad),
                 ox + tw / 2, by + 25, col.dim, '9px IBM Plex Sans', 'center', 'top');
        HLD.text(ctx, '(U\u209a \u00d7' + AMP + ' for clarity)',
                 ox + tw / 2, by + 37, col.dim, '8px IBM Plex Sans', 'center', 'top');
      }

      // ── Disc plan view (left panel) ─────────────────────────────────
      // Inflow heatmap (fore-aft asymmetry only, based on λ_c)
      const lamScaleMin = lam0 - Math.abs(lamc_eff) * 0.75;
      const lamScaleMax = lam0 + Math.abs(lamc_eff) * 0.75;
      const lamScaleRange = Math.max(lamScaleMax - lamScaleMin, 0.001);
      HLD.discHeatmap(ctx, discCX, discCY, discR,
        (r, psi) => lam0 + lamc_eff * r * Math.cos(psi),
        v => ramp(Math.max(0, Math.min(1, (v - lamScaleMin) / lamScaleRange))));
      ctx.strokeStyle = col.dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(discCX, discCY, discR, 0, 2 * Math.PI); ctx.stroke();

      // Cross-hair
      HLD.dline(ctx, discCX, discCY - discR - 3, discCX, discCY + discR + 3,
                col.grid, 1, [3, 3]);
      HLD.dline(ctx, discCX - discR - 3, discCY, discCX + discR + 3, discCY,
                col.grid, 1, [3, 3]);

      // Station A marker (front, ψ=180° → top of disc in canvas)
      const cAngleA = HLD.polarToCanvas(Math.PI);   // = -π/2 = pointing up
      const axA = discCX + discR * 0.75 * Math.cos(cAngleA);
      const ayA = discCY + discR * 0.75 * Math.sin(cAngleA);
      HLD.dot(ctx, axA, ayA, 5, col.lift);
      HLD.text(ctx, 'A', axA + 7, ayA, col.lift, 'bold 9px IBM Plex Sans', 'left', 'middle');

      // Downwash indicator at A
      const arrowScale = Math.min(discR * 0.45, 26);
      const normBothMax = Math.max(Math.abs(lamA), Math.abs(lamB), 0.001);
      if (lamA > 0.001)
        HLD.arrow(ctx, axA, ayA + 4, axA, ayA + 4 + (lamA / normBothMax) * arrowScale,
                  col.accent, 1.5, 5);

      // Station B marker (aft, ψ=0° → bottom of disc in canvas)
      const cAngleB = HLD.polarToCanvas(0);          // = π/2 = pointing down
      const axB = discCX + discR * 0.75 * Math.cos(cAngleB);
      const ayB = discCY + discR * 0.75 * Math.sin(cAngleB);
      HLD.dot(ctx, axB, ayB, 5, col.chord);
      HLD.text(ctx, 'B', axB + 7, ayB, col.chord, 'bold 9px IBM Plex Sans', 'left', 'middle');

      // Downwash indicator at B
      if (lamB > 0.001)
        HLD.arrow(ctx, axB, ayB + 4, axB, ayB + 4 + (lamB / normBothMax) * arrowScale,
                  col.accent, 1.5, 5);

      // Direction labels
      HLD.text(ctx, 'FRONT', discCX, discCY - discR - 14,
               col.lift, '9px IBM Plex Sans', 'center', 'bottom');
      HLD.text(ctx, '(less inflow)', discCX, discCY - discR - 4,
               col.dim, '8px IBM Plex Sans', 'center', 'bottom');
      HLD.text(ctx, 'AFT', discCX, discCY + discR + 4,
               col.chord, '9px IBM Plex Sans', 'center', 'top');
      HLD.text(ctx, '(more inflow)', discCX, discCY + discR + 14,
               col.dim, '8px IBM Plex Sans', 'center', 'top');

      // Forward-flight direction arrow
      if (Vkt > 1) {
        HLD.arrow(ctx, discCX - discR * 0.25, discCY - discR - 32,
                  discCX + discR * 0.25, discCY - discR - 32, col.wind, 2, 6);
        HLD.text(ctx, 'fwd', discCX + discR * 0.25 + 5, discCY - discR - 32,
                 col.wind, '8px IBM Plex Sans', 'left', 'middle');
      }
      HLD.text(ctx, '\u2190 less \u03bb   more \u03bb \u2192',
               discCX, discCY + discR + 26, col.dim, '8px IBM Plex Sans', 'center', 'top');

      // ── Velocity triangles (right panel) ───────────────────────────
      HLD.text(ctx,
               'Front vs Aft Disc \u2014 Velocity Triangles (r\u0305=0.75, qualitative)',
               rpX + rpW / 2, 5, col.ink, 'bold 9px IBM Plex Sans', 'center', 'top');

      triBox(triAX, triY, triW, triH,
             'A \u2014 Front (\u03c8=180\u00b0)', 'less induced velocity',
             lamA, coningA, thetaA, phiA, alphaA, liftIdxA / liftMax);
      triBox(triBX, triY, triW, triH,
             'B \u2014 Aft (\u03c8=0\u00b0)', 'more induced velocity',
             lamB, coningB, thetaB, phiB, alphaB, liftIdxB / liftMax);

      // ── Causal chain overlay ────────────────────────────────────────
      if (showCausal) {
        const chain = [
          'A: \u2193 inflow \u2192 \u2193 U\u209a \u2192 \u2193 \u03c6 \u2192 \u2191 \u03b1 \u2192 \u2191 Lift',
          'B: \u2191 inflow \u2192 \u2191 U\u209a \u2192 \u2191 \u03c6 \u2192 \u2193 \u03b1 \u2192 \u2193 Lift',
          'Lift\u2090 > Lift\u2071 \u2192 force peak near front (\u03c8\u2248180\u00b0)',
          '\u223c90\u00b0 phase lag \u2192 peak flap near \u03c8\u2248270\u00b0 (retreating)',
          '\u2192 roll toward retreating side \u2014 countered by lateral cyclic',
        ];
        const bh = chain.length * 13 + 10;
        const bw = rpW * 0.94;
        const bx0 = rpX + (rpW - bw) / 2;
        const by0 = H - bh - 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx0, by0, bw, bh);
        chain.forEach((line, i) => {
          HLD.text(ctx, line, rpX + rpW * 0.5, by0 + 5 + i * 13,
                   i >= 2 ? col.warn : col.accent,
                   '9px IBM Plex Sans', 'center', 'top');
        });
      }

      // Coning note (when overlay is on)
      if (showConing && !showCausal) {
        HLD.text(ctx,
          '\u26a0 Coning (dashed) modifies local U\u209a but does NOT create wake/inflow asymmetry',
          rpX + rpW / 2, H - 4, col.warn, '8px IBM Plex Sans', 'center', 'bottom');
      }

      // ── Readout ─────────────────────────────────────────────────────
      const dLamFA = lamB - lamA;
      ui.readout.innerHTML = kv([
        ['Forward speed',              Vkt.toFixed(0) + ' kt',  'var(--hl-ink)'],
        ['Transition strength',        vtrans.toFixed(2),        'var(--hl-accent)'],
        ['\u03bb\u2080 (base inflow)', lam0.toFixed(4),         'var(--hl-accent)'],
        ['\u03bb_c (fore-aft grad.)',  model.lamc.toFixed(4),   'var(--hl-lift)'],
        ['\u03bb at A (front)',        lamA.toFixed(4),          'var(--hl-lift)'],
        ['\u03bb at B (aft)',          lamB.toFixed(4),          'var(--hl-chord)'],
        ['\u0394\u03bb (B\u2212A)',    dLamFA.toFixed(4),
          dLamFA > 0.002 ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['\u03c6_A',    (phiA * R2D).toFixed(2) + '\u00b0', 'var(--hl-lift)'],
        ['\u03c6_B',    (phiB * R2D).toFixed(2) + '\u00b0', 'var(--hl-chord)'],
        ['\u03b1_A',   (alphaA * R2D).toFixed(2) + '\u00b0', 'var(--hl-lift)'],
        ['\u03b1_B',   (alphaB * R2D).toFixed(2) + '\u00b0', 'var(--hl-chord)'],
      ]) + '<p class="hl-note"><b>Transverse Flow Effect (inflow roll):</b> as forward speed '
         + 'builds, the front disc (A) encounters progressively less-downwashed air '
         + '(\u03bb\u2090 &lt; \u03bb\u2071). This creates a fore-aft lift asymmetry \u2192 '
         + 'flapping with ~90\u00b0 phase lag \u2192 roll tendency (countered by lateral cyclic). '
         + 'Use "Show causal chain" for the step-by-step mechanism.</p>'
         + (lamA < 0 ? '<p class="hl-note">\u26a0 \u03bb_A &lt; 0: the first-harmonic wake-skew approximation '
                     + 'model predicts upwash at the front disc at this speed. This is a limitation '
                     + 'of the linearised inflow model at high advance ratio \u2014 it still shows '
                     + 'the correct TFE trend (\u03b1_A &gt; \u03b1_B), but the absolute values '
                     + 'are not physical at high \u03bc.</p>' : '')
         + '<p class="hl-note">Diagram: U\u209a amplitude amplified \u00d78 for visual '
         + 'clarity (not to scale). Station A = front (\u03c8=180\u00b0), B = aft (\u03c8=0\u00b0). '
         + 'At these azimuths sin\u03c8=0, so U\u1d40=r\u0305=0.75 with no advance-ratio contribution. '
         + '<i>Prescribed first-harmonic (prescribed wake-skew approximation) + quasi-steady BET \u2014 '
         + 'educational model, not free-wake.</i></p>';
    }

    /* Shared helper: scan the inflow field on a coarse polar grid to find the
       colour-mapping range.  Used by both Inflow Roll and Compare sections. */
    function sampleInflowRange(model) {
      let lamMin = Infinity, lamMax = -Infinity;
      for (let ir = 0; ir < 12; ir++) {
        const r = 0.12 + 0.88 * (ir + 0.5) / 12;
        for (let ip = 0; ip < 36; ip++) {
          const p = (ip + 0.5) / 36 * 2 * Math.PI;
          const lv = HL.linearInflowAt(model, r, p);
          if (lv < lamMin) lamMin = lv;
          if (lv > lamMax) lamMax = lv;
        }
      }
      return { lamMin, lamMax, lamRange: Math.max(0.001, lamMax - lamMin) };
    }

    // Convention: positive normal flow points DOWN through the rotor disc.
    function inflowDecompAt(st, coeffs, model, r, psi) {
      const mu = advanceRatio(st);
      const Om = omega(st);
      const beta = flappingAngle(coeffs, psi);
      const betaDot = flappingRate(coeffs, psi, Om);
      const UT = r + mu * Math.sin(psi);
      const induced = HL.linearInflowAt(model, r, psi);
      const coningNormal = mu * Math.cos(psi) * coeffs.a0;
      const bladeMotionNormal = (betaDot / Om) * r + mu * Math.cos(psi) * beta;
      const normalTotal = induced + bladeMotionNormal;
      const phi = inflowAngle(UT, normalTotal);
      const theta = bladePitch(st, r, psi);
      const alpha = theta - phi;
      const liftTendency = UT > 0 ? (UT * UT * alpha) : 0;
      return { induced, coningNormal, bladeMotionNormal, normalTotal, phi, alpha, liftTendency };
    }

    function decompRows(st, coeffs, model) {
      const r = 0.75;
      return [
        { name: 'ADV 90°', psi: Math.PI / 2 },
        { name: 'RET 270°', psi: 3 * Math.PI / 2 },
        { name: 'NOSE 180°', psi: Math.PI },
        { name: 'TAIL 0°', psi: 0 },
      ].map(p => ({ name: p.name, ...inflowDecompAt(st, coeffs, model, r, p.psi) }));
    }

    function decompTableHtml(rows) {
      return '<div style="overflow-x:auto;margin-top:6px">'
        + '<table style="width:100%;border-collapse:collapse;font-size:11px">'
        + '<thead><tr>'
        + '<th style="text-align:left;padding:2px 4px">pos</th>'
        + '<th style="text-align:right;padding:2px 4px">λᵢ</th>'
        + '<th style="text-align:right;padding:2px 4px">vₙ,blade</th>'
        + '<th style="text-align:right;padding:2px 4px">vₙ,total</th>'
        + '<th style="text-align:right;padding:2px 4px">φ</th>'
        + '<th style="text-align:right;padding:2px 4px">α</th>'
        + '<th style="text-align:right;padding:2px 4px">lift idx</th>'
        + '</tr></thead><tbody>'
        + rows.map(r => '<tr>'
          + `<td style="padding:2px 4px">${r.name}</td>`
          + `<td style="padding:2px 4px;text-align:right">${r.induced.toFixed(4)}</td>`
          + `<td style="padding:2px 4px;text-align:right">${r.bladeMotionNormal.toFixed(4)}</td>`
          + `<td style="padding:2px 4px;text-align:right">${r.normalTotal.toFixed(4)}</td>`
          + `<td style="padding:2px 4px;text-align:right">${(r.phi * R2D).toFixed(1)}°</td>`
          + `<td style="padding:2px 4px;text-align:right">${(r.alpha * R2D).toFixed(1)}°</td>`
          + `<td style="padding:2px 4px;text-align:right">${r.liftTendency.toFixed(4)}</td>`
          + '</tr>').join('')
        + '</tbody></table></div>';
    }

    /* ── Inflow Roll ─────────────────────────────────────────────────────── */
    function drawInflowRoll(ctx, W, H, col) {
      const st = HL.defaultState(); st.V = Vkt * 0.5144; st.Vlat = Vlat * 0.5144;
      const model = HL.linearInflowModel(st);
      const coeffs = flappingCoeffs(st);
      const { lamAdv, lamRet, dLam } = HL.inflowRollIndicator(model);

      // Primary: fore-aft asymmetry (the core transverse-flow mechanism)
      const rBar  = 0.75;
      const lamFront = HL.linearInflowAt(model, rBar, Math.PI);   // ψ=180° (nose)
      const lamAft   = HL.linearInflowAt(model, rBar, 0);         // ψ=0° (tail)
      const dLamFA   = lamAft - lamFront;

      const discR = Math.min(W * 0.32, H * 0.44);
      const cx = W * 0.48, cy = H / 2;

      const { lamMin, lamRange } = sampleInflowRange(model);

      HLD.discHeatmap(ctx, cx, cy, discR,
        (r, psi) => HL.linearInflowAt(model, r, psi),
        v => ramp(Math.max(0, Math.min(1, (v - lamMin) / lamRange))));
      discAnnotations(ctx, cx, cy, discR, col, Vkt > 1);

      // Primary bars: FRONT vs AFT (core mechanism)
      const bx = W - 42, bh = H * 0.45, by = H * 0.5 - bh / 2, bw = 14;
      const lAll = Math.max(Math.abs(lamFront), Math.abs(lamAft), 0.001);
      HLD.text(ctx, '\u03bb bars', bx, by - 14, col.dim, '9px IBM Plex Sans', 'center');
      ctx.fillStyle = ramp(0.35);   // front = lower inflow = cooler
      ctx.fillRect(bx - bw - 3, by + bh - bh * Math.max(0, lamFront) / lAll, bw,
                   bh * Math.max(0, lamFront) / lAll);
      ctx.fillStyle = ramp(0.80);   // aft = higher inflow = warmer
      ctx.fillRect(bx + 3, by + bh - bh * Math.max(0, lamAft) / lAll, bw,
                   bh * Math.max(0, lamAft) / lAll);
      HLD.text(ctx, 'FWD', bx - bw / 2 - 3, by + bh + 10,
               col.lift, '9px IBM Plex Sans', 'center');
      HLD.text(ctx, 'AFT', bx + bw / 2 + 3,  by + bh + 10,
               col.chord, '9px IBM Plex Sans', 'center');

      // Roll tendency label (fore-aft mechanism is primary; lateral wind adds to it)
      const rollFA = dLamFA > 0.002 ? 'fore-aft \u2206\u03bb \u2192 roll tendency (use lat. cyclic)' :
                     'fore-aft \u2206\u03bb \u2248 0 (near hover)';
      HLD.text(ctx, rollFA, W / 2, H - 8, col.warn, '10px IBM Plex Sans', 'center', 'bottom');

      const rows = decompRows(st, coeffs, model);
      const coningFwd  = rows[2].coningNormal;   // NOSE 180°
      const coningTail = rows[3].coningNormal;   // TAIL 0°

      const latNote = Math.abs(Vlat) > 0.5
        ? '<p class="hl-note"><b>Advanced \u2014 lateral wind active (' + Vlat.toFixed(0) + ' kt):</b> '
          + 'this adds \u03bb_s = ' + model.lams.toFixed(4) + ' (lateral gradient), '
          + 'creating an <em>additional</em> roll component from ADV/RET inflow asymmetry '
          + '(\u0394\u03bb_ADV\u2212RET = ' + dLam.toFixed(4) + '). '
          + 'This is a <em>separate</em> input from the fore-aft mechanism above.</p>'
        : '<p class="hl-note"><em>Optional: use the "Lateral wind (adv. scenario)" slider to explore how '
          + 'sideslip/yaw-rate adds a \u03bb_s gradient as an additional roll input '
          + '(set to zero here).</em></p>';

      ui.readout.innerHTML = kv([
        ['Forward speed',             Vkt.toFixed(0) + ' kt',  'var(--hl-ink)'],
        ['Lateral wind (adv.)',        Vlat.toFixed(0) + ' kt', 'var(--hl-warn)'],
        ['\u03bb\u2080 (base)',        model.lam0.toFixed(4),   'var(--hl-accent)'],
        ['\u03bb_c (fore-aft grad.)',  model.lamc.toFixed(4),   'var(--hl-lift)'],
        ['\u03bb at FWD r=0.75',       lamFront.toFixed(4),     'var(--hl-lift)'],
        ['\u03bb at AFT r=0.75',       lamAft.toFixed(4),       'var(--hl-chord)'],
        ['\u0394\u03bb (AFT\u2212FWD)', dLamFA.toFixed(4),
          dLamFA > 0.002 ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['\u03bb_s (lat. grad.)',      model.lams.toFixed(4),
          Math.abs(model.lams) > 0.001 ? 'var(--hl-warn)' : 'var(--hl-ink)'],
      ]) + '<p class="hl-note"><b>Core mechanism:</b> in forward flight the front disc encounters '
         + 'less-downwashed air (\u03bb_c creates fore-aft asymmetry). Front sees lower \u03bb \u2192 '
         + 'smaller \u03c6 \u2192 larger \u03b1 \u2192 more lift. ~90\u00b0 phase lag \u2192 roll tendency. '
         + 'Lateral cyclic corrects it. Use the <b>Velocity Triangles</b> section for the step-by-step diagram.</p>'
         + latNote
         + '<p class="hl-note">Disc colours: inflow ratio \u03bb(r,\u03c8). Table decomposes the '
         + 'velocity triangle at 0.75R for each azimuth. '
         + `Coning at NOSE=${coningFwd.toFixed(4)}, TAIL=${coningTail.toFixed(4)} `
         + '(modifies local triangle, does NOT create wake asymmetry). '
         + '<i>Prescribed first-harmonic wake-skew approximation + quasi-steady BET.</i></p>'
         + decompTableHtml(rows);
    }

    /* ── Compare ─────────────────────────────────────────────────────────── */
    function drawCompare(ctx, W, H, col) {
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      let model, title, note;
      if (compareModel === 'uniform') {
        const base = HL.linearInflowModel(st);
        model = { lam0: base.lam0, lamc: 0, lams: 0 };
        title = 'Uniform inflow baseline';
        note  = 'Reference case: constant inflow ratio \u03bb\u2080. No inflow gradients; useful baseline for comparing the effect of fore-aft asymmetry.';
      } else if (compareModel === 'forward') {
        model = HL.linearInflowModel(st);
        title = 'Forward flight \u2014 fore-aft inflow asymmetry (\u03bb_c)';
        note  = 'In forward flight the wake is swept backward: the aft disc has more downwash than the front disc (\u03bb_c > 0). '
              + 'This is the core <em>Transverse Flow Effect</em> mechanism. '
              + 'A separate longitudinal flapback also occurs (phase-lag flapping). '
              + 'Use the Velocity Triangles section to trace the fore-aft mechanism step by step.';
      } else {
        const stLat = Object.assign({}, st, { Vlat: Math.max(10, Vkt) * 0.5144 * 0.35 });
        model = HL.linearInflowModel(stLat);
        title = 'Advanced: lateral wind / sideslip (\u03bb_s)';
        note  = 'An additional lateral inflow gradient (\u03bb_s) from sideslip or yaw rate creates '
              + 'an ADV/RET inflow asymmetry and an extra roll component. '
              + 'This is <em>distinct from and additional to</em> the core fore-aft transverse-flow mechanism. '
              + 'Flapback remains a separate longitudinal mechanism.';
      }
      const coeffs = flappingCoeffs(st);
      const rows = decompRows(st, coeffs, model);

      const discR = Math.min(W * 0.36, H * 0.44);
      const cx = W / 2, cy = H / 2 + 6;

      const { lamMin, lamRange } = sampleInflowRange(model);

      HLD.discHeatmap(ctx, cx, cy, discR,
        (r, psi) => HL.linearInflowAt(model, r, psi),
        v => ramp(Math.max(0, Math.min(1, (v - lamMin) / lamRange))));
      discAnnotations(ctx, cx, cy, discR, col, Vkt > 1);
      HLD.text(ctx, title, W / 2, 10, col.ink, '10px IBM Plex Sans', 'center', 'top');

      ui.readout.innerHTML = kv([
        ['Forward speed',         Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['\u03bb\u2080',          model.lam0.toFixed(4),  'var(--hl-accent)'],
        ['\u03bb_c (long.)',      model.lamc.toFixed(4),  'var(--hl-lift)'],
        ['\u03bb_s (lat.)',       model.lams.toFixed(4),  'var(--hl-warn)'],
      ]) + '<p class="hl-note">' + note + '</p>'
         + '<p class="hl-note">Representative 0.75R decomposition shown below for each azimuth: inflow ratio, blade-motion normal velocity '
         + '(coning/flapping contribution), resultant normal flow, \u03c6, \u03b1, and lift tendency index.</p>'
         + decompTableHtml(rows)
         + '<p class="hl-note">Sign convention used here: positive inflow points down through the disc; \u03c8 = 0\u00b0 tail, 90\u00b0 ADV, 180\u00b0 nose, 270\u00b0 RET.</p>'
         + '<p class="hl-note" style="margin-top:4px"><b>Model assumptions:</b> quasi-steady, '
         + 'prescribed first-harmonic wake-skew approximation. Not a free-wake or transient '
         + 'rotor\u2013body coupling model. Educational tool only.</p>';
    }

    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      HLD.grid(ctx, W, H, col, 30);
      if      (mode === 'flapback')   drawFlapback(ctx, W, H, col);
      else if (mode === 'vtriangles') drawVTriangles(ctx, W, H, col);
      else if (mode === 'inflowroll') drawInflowRoll(ctx, W, H, col);
      else                            drawCompare(ctx, W, H, col);
    };

    ui.onDraw(draw);
  }

  /* Disc diagnostics: raw angle ratios are never weighted by loading. */
  function wEnvelope(host) {
    const ui=scaffold(host);
    let Vkt=60,plotMode='pctcrit',showIso=true,discModel='extended',rBar=.75,psiDeg=270;
    const draw=()=>{
      const st={...HL.defaultState(),V:Vkt*.5144},stt=trimmed(st),c=flappingCoeffs(stt);
      const AOA=(r,p)=>localAoAmodel(stt,c,r,p,discModel);
      const diag=(d)=>HLMechanisms.diagnostic(st,d);
      const {ctx,W,H,col}=HLD.setup(ui.canvas);HLD.clear(ctx,W,H,col);
      const cx=W*.44,cy=H*.53,R=Math.max(35,Math.min(cx-50,W-cx-50,H*.40)),nr=12,np=60;
      let peak=null,maxQ=1e-6;
      const cells=[];
      for(let ir=0;ir<nr;ir++)for(let ip=0;ip<np;ip++){
        const r0=.2+.8*ir/nr,r1=.2+.8*(ir+1)/nr,p0=ip/np*2*Math.PI,p1=(ip+1)/np*2*Math.PI;
        const r=(r0+r1)/2,p=(p0+p1)/2,d=AOA(r,p),v=diag(d);
        cells.push({r0,r1,p0,p1,r,p,d,v});maxQ=Math.max(maxQ,Math.max(0,d.UT)**2);
        if(Math.sin(p)<0&&!v.unsupported&&(!peak||v.ratio>peak.v.ratio))peak={r,p,v};
      }
      for(const {r0,r1,p0,p1,r,p,d,v} of cells){
        ctx.fillStyle=v.unsupported?'rgba(180,60,200,.6)':plotMode==='lift'?ramp(Math.max(0,d.UT)**2/maxQ):plotMode==='aoa'?aoaColor(v.alpha,v.critical):ratioColor(v.ratio);
        ctx.beginPath();ctx.arc(cx,cy,R*r1,HLD.polarToCanvas(p0),HLD.polarToCanvas(p1),true);ctx.arc(cx,cy,R*r0,HLD.polarToCanvas(p1),HLD.polarToCanvas(p0),false);ctx.closePath();ctx.fill();
        if(v.crossed||v.unsupported){const a=HLD.polarToCanvas(p);HLD.tick(ctx,cx+R*r*Math.cos(a),cy+R*r*Math.sin(a),R*(r1-r0)*.85,v.crossed?Math.PI/4:-Math.PI/4,v.crossed?'#ff3fa0':'#c46ee0',1.7);}
      }
      if(showIso&&plotMode!=='lift')HLD.discIso(ctx,cx,cy,R,(r,p)=>{const v=diag(AOA(r,p));return v.unsupported?null:plotMode==='pctcrit'?100*v.ratio:v.alpha;},plotMode==='pctcrit'?[40,60,80,100,120]:[2,4,6,8,10,12,14],{rMin:.2,color:'rgba(20,25,35,.65)',width:1,fmt:v=>v+(plotMode==='pctcrit'?'%':'°'),label:W>=420});
      ctx.strokeStyle=col.dim;ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R,0,2*Math.PI);ctx.stroke();
      HLD.text(ctx,'RET 270°',cx-R-4,cy,col.dim,'9px IBM Plex Sans','right');HLD.text(ctx,'ADV 90°',cx+R+4,cy,col.dim,'9px IBM Plex Sans');
      HLD.text(ctx,'NOSE',cx,cy-R-8,col.dim,'10px IBM Plex Sans','center');HLD.text(ctx,'TAIL',cx,cy+R+14,col.dim,'10px IBM Plex Sans','center');
      const lx=W-90;
      HLD.text(ctx,plotMode==='lift'?'■ high q proxy':plotMode==='aoa'?'■ high α':'■ ≥100% crit',lx,18,col.bad,'10px IBM Plex Sans');
      HLD.text(ctx,'╱ α threshold',lx,34,'#ff3fa0','10px IBM Plex Sans');HLD.text(ctx,'■ reverse / UT≈0',lx,50,'#c46ee0','9px IBM Plex Sans');
      const p=psiDeg*D2R,d=AOA(rBar,p),v=diag(d);
      HLD.dot(ctx,cx+R*rBar*Math.sin(p),cy+R*rBar*Math.cos(p),5,col.ink);
      const tipMach=HL.omR(st)*(1+advanceRatio(st))/sosAtAltFt(st.alt);
      const status=peak?.v.crossed?'retreating α threshold crossed':peak?.v.near?'retreating α near threshold':'retreating α below threshold';
      ui.readout.innerHTML=kv([
        ['Selected ψ / station',psiDeg.toFixed(0)+'° / '+rBar.toFixed(2)+'R','var(--hl-ink)'],
        ['Selected local α',v.unsupported?'outside normal-flow model':v.alpha.toFixed(2)+'°','var(--hl-ink)'],
        ['Assumed local critical α',v.unsupported?'n/a':v.critical.toFixed(2)+'°','var(--hl-dim)'],
        ['Selected α / critical α',v.unsupported?'n/a':(v.ratio*100).toFixed(1)+'%','var(--hl-ink)'],
        ['Selected α diagnostic',v.unsupported?'reverse / near-zero tangential flow':v.crossed?'model threshold crossed':v.near?'near model threshold':'below model threshold',v.crossed?'var(--hl-bad)':'var(--hl-ink)'],
        ['Peak retreating ratio (sampled)',peak?(peak.v.ratio*100).toFixed(1)+'% at '+peak.r.toFixed(2)+'R / '+(peak.p*R2D).toFixed(0)+'°':'n/a','var(--hl-warn)'],
        ['Advancing tip Mach',tipMach.toFixed(2)+' / assumed 0.85 line',tipMach>.85?'var(--hl-bad)':'var(--hl-ink)'],
        ['Model diagnostics',status+(tipMach>.85?'; Mach line crossed':''),peak?.v.crossed?'var(--hl-bad)':'var(--hl-ink)']
      ])+`<p class="hl-note">${plotMode==='lift'?'<b>Tangential loading proxy:</b> U_T² relative to the map maximum. It is not lift; α, section coefficients and full relative velocity also matter.':'Colour shows the actual '+(plotMode==='aoa'?'α':'α / assumed local critical α')+'. Hatching marks positive-α threshold crossings. Low loading does not turn a high α into a low α.'}</p><p class="hl-note"><b>${discModel==='foundation'?'Foundation: uniform normal flow, zero twist, restricted cyclic, no flap velocity.':'Extended: core BET, washout, trim cyclic and nonuniform inflow.'}</b> Changing this preset changes several assumptions together. Use the separate twist comparison to isolate twist. Course rotor: CCW viewed from above, advancing right and retreating left. The illustrative Mach/α rules do not establish actual stall loads, symptoms or aircraft V_NE.</p>`;
    };
    slider(ui.controls,{label:'Forward speed',min:0,max:180,step:5,val:Vkt,unit:' kt',on:v=>{Vkt=v;draw();}});
    slider(ui.controls,{label:'Azimuth ψ',min:0,max:360,step:5,val:psiDeg,unit:'°',on:v=>{psiDeg=v;draw();}});
    slider(ui.controls,{label:'Blade station r/R',min:.2,max:1,step:.05,val:rBar,fmt:v=>v.toFixed(2),on:v=>{rBar=v;draw();}});
    segmented(ui.controls,{label:'Combined model presets',val:discModel,options:[{v:'foundation',t:'Foundation model'},{v:'extended',t:'Extended model'}],on:v=>{discModel=v;draw();}});
    segmented(ui.controls,{label:'Plot',val:plotMode,options:[{v:'aoa',t:'Angle of attack'},{v:'pctcrit',t:'% of critical α'},{v:'lift',t:'Tangential loading proxy'}],on:v=>{plotMode=v;draw();}});
    toggle(ui.controls,{label:'Constant-angle iso-lines',val:true,on:v=>{showIso=v;draw();}});
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
    let selectedRegion = null;           // currently highlighted/clicked region
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

    // Region info panel data for clickable regions
    const regionInfo = {
      driven: {
        name: 'Driven region — braking torque',
        label: 'Drag region — consumes energy',
        condition: 'Local in-plane aerodynamic force opposes rotation; α need not be negative',
        energy: 'Consuming — blade is dragged, takes energy from the rotor',
        tip: 'NOT stalled — it produces lift, but the total force vector tilts aft. Often confused with stall on exams.',
        color: 'rgb(232,170,60)',
      },
      driving: {
        name: 'Driving region — driving torque',
        label: 'Driving region — sustains rotation',
        condition: 'Local in-plane aerodynamic force acts with rotation',
        energy: 'Sustaining — in-plane component accelerates the rotor',
        tip: 'The aircraft energy budget supplies the upflow. Driving and braking contributions must be considered over the whole rotor.',
        color: 'rgb(60,175,95)',
      },
      stall: {
        name: 'Stall region — local α exceeds the model stall angle',
        label: 'Stall region — altered aerodynamic forces',
        condition: 'Local α exceeds the stated model stall angle',
        energy: 'Local lift and drag coefficients change; the summed torque determines the rotor tendency',
        tip: 'Often inboard in vertical autorotation. Region boundaries vary with flow, pitch and RPM; this map does not establish recoverability.',
        color: '#d05a6e',
      },
    };

    // Create or update the region info panel below the disc
    const renderRegionPanel = () => {
      let panel = host.querySelector('.hl-region-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'hl-region-panel';
        panel.style.cssText = 'margin:8px 0 0 0;padding:10px 14px;border-radius:6px;border:2px solid transparent;transition:border-color 0.2s,background 0.2s;font-size:13px;line-height:1.55;min-height:56px;';
        topCanvas.parentNode && topCanvas.parentNode.insertAdjacentElement('afterend', panel);
      }
      if (!selectedRegion || !regionInfo[selectedRegion]) {
        panel.style.background = 'rgba(255,255,255,0.03)';
        panel.style.borderColor = 'transparent';
        panel.innerHTML = '<span style="opacity:0.45;font-size:12px;">Click a region on the disc to see cause-effect explanation.</span>';
        return;
      }
      const info = regionInfo[selectedRegion];
      panel.style.background = 'rgba(13,17,23,0.85)';
      panel.style.borderColor = info.color;
      panel.innerHTML = `
        <b style="color:${info.color}">${info.name}</b>
        <span style="float:right;font-size:11px;opacity:0.7;font-style:italic">${info.label}</span>
        <br>
        <span style="opacity:0.8"><b>Inflow condition:</b> ${info.condition}</span><br>
        <span style="opacity:0.8"><b>Energy effect:</b> ${info.energy}</span><br>
        <span style="color:#a5d6ff"><b>Exam tip:</b> ${info.tip}</span>`;
    };

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
          // Relative-speed squared and radius weight each local force coefficient.
          // Include stalled elements; this remains a fixed-RPM torque comparison.
          if (rg.reg !== 'reverse') net += (-rg.fx) * (rg.UT * rg.UT + upInflow * upInflow) * rm;
          // Dim non-selected regions when a region is selected
          const isSelected = selectedRegion && rg.reg === selectedRegion;
          const isDimmed = selectedRegion && rg.reg !== selectedRegion;
          ctx.globalAlpha = isDimmed ? 0.25 : 1.0;
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
          ctx.globalAlpha = 1.0;
          // Glow outline for selected region cells
          if (isSelected) {
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, R * r1, HLD.polarToCanvas(p0), HLD.polarToCanvas(p1), true);
            ctx.arc(cx, cy, R * r0, HLD.polarToCanvas(p1), HLD.polarToCanvas(p0), false);
            ctx.closePath(); ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }
      ctx.globalAlpha = 1.0;
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
      // legend (with click hints)
      const selMark = r => selectedRegion === r ? ' ◀' : '';
      HLD.text(ctx, '■ driving' + selMark('driving'), W - 74, 20, colReg.driving, '10px IBM Plex Sans');
      HLD.text(ctx, '■ driven' + selMark('driven'), W - 74, 34, colReg.driven, '10px IBM Plex Sans');
      HLD.text(ctx, '■ stall' + selMark('stall'), W - 74, 48, colReg.stall, '10px IBM Plex Sans');
      HLD.text(ctx, '■ reverse flow', W - 74, 62, colReg.reverse, '10px IBM Plex Sans');
      HLD.chipLabel(ctx, 'tap region to explain · tap station to inspect BET', 12, H - 8, col.dim, '10px IBM Plex Sans', 'left', col.bg);
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
      const rrpm = net > 1e-6 ? 'positive · driving exceeds braking' : net < -1e-6 ? 'negative · braking exceeds driving' : 'approximately zero';
      const rrpmCol = net > 1e-6 ? 'var(--hl-good)' : net < -1e-6 ? 'var(--hl-bad)' : 'var(--hl-warn)';
      ui.readout.innerHTML = kv([
        ['Forward speed', Vkt.toFixed(0) + ' kt', 'var(--hl-ink)'],
        ['Collective θ₀', coll.toFixed(1) + '°', 'var(--hl-chord)'],
        ['Local normal inflow U_P', (-upflow).toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Element region', regChip[rg.reg] + (rg.reg === 'reverse' ? '' : ` · α=${(rg.a * R2D).toFixed(1)}°`),
          rg.reg === 'driving' ? 'var(--hl-good)' : rg.reg === 'driven' ? 'var(--hl-warn)' : rg.reg === 'stall' ? 'var(--hl-bad)' : 'var(--hl-dim)'],
        ['F_H direction', rg.reg === 'reverse' ? 'undefined (reverse)' : (rg.fx < 0 ? 'forward → drives rotor' : 'aft → brakes rotor'),
          rg.fx < 0 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['Driving cells', cnt.driving + ' / ' + (14 * 72), 'var(--hl-good)'],
        ['Aerodynamic torque tendency at fixed RPM', rrpm, rrpmCol],
      ]) + `<p class="hl-note">The disc classifies every element: the <b>driving</b> band
        (green) speeds the rotor up, the <b>driven</b> tip (amber) brakes it, and the
        root <b>stalls</b>. <b>Click a coloured region</b> on the disc for a cause-effect
        explanation (click again to deselect). <b>Click any station</b> to inspect its BET
        diagram below. At 0 kt the pattern is axisymmetric (driving ring inside a driven
        tip); add <b>forward speed</b> and the driving zone migrates toward the
        <b>retreating side (ψ 270°)</b> as the advancing side speeds up and goes driven,
        with a reverse/stall wedge at the retreating root. Balance driving vs driven with
        the collective to compare aerodynamic torque. RPM is held fixed in this map;
        the displayed tendency is not an integrated RPM or energy history.</p>`;
      renderRegionPanel();
    };

    slider(ui.controls, { label: 'Forward speed', min: 0, max: 80, step: 5, val: Vkt, unit: ' kt', fmt: v => v.toFixed(0), on: v => { Vkt = v; draw(); } });
    slider(ui.controls, { label: 'Collective θ₀', min: 1, max: 9, step: 0.5, val: coll, unit: '°', on: v => { coll = v; draw(); } });
    slider(ui.controls, { label: 'Upflow magnitude (−U_P)', min: 3, max: 12, step: 0.5, val: upflow, unit: ' m/s', fmt: v => v.toFixed(1), on: v => { upflow = v; draw(); } });
    const rbarCtrl = slider(ui.controls, { label: 'Blade station r/R', min: 0.20, max: 0.97, step: 0.01, val: rBar, fmt: v => v.toFixed(2), on: v => { rBar = v; draw(); } });
    const azCtrl = slider(ui.controls, { label: 'Azimuth ψ', min: 0, max: 355, step: 5, val: psiDeg, unit: '°', on: v => { psiDeg = v; draw(); } });

    // ── click the disc ──────────────────────────────────────────────────
    // Clicking a named region (driven/driving/stall) toggles the region info panel
    // and also updates the BET station to a representative point in that region.
    // Clicking the same region a second time deselects it. Clicking the reverse-flow
    // area just picks the station as before.
    topCanvas.style.cursor = 'crosshair';
    topCanvas.addEventListener('click', (e) => {
      const r = topCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = discGeom(r.width, r.height);
      const dx = x - d.cx, dy = y - d.cy;
      const rad = Math.hypot(dx, dy);
      if (rad > d.R * 1.02) return;
      const normR = Math.max(0.20, Math.min(0.97, rad / d.R));
      const canAng = Math.atan2(dy, dx);
      const psi = (Math.PI / 2 - canAng + 2 * Math.PI) % (2 * Math.PI);
      const psiSnap = Math.round(psi * R2D / 5) * 5 % 360;
      // Determine which region was clicked
      const st = HL.defaultState(); st.V = Vkt * 0.5144;
      const OmR = HL.omR(st);
      const upInflow = upflow / OmR;
      const mu = advanceRatio(st);
      const clickedReg = regionAt(st, normR, psi, upInflow, mu).reg;
      if (clickedReg === 'driven' || clickedReg === 'driving' || clickedReg === 'stall') {
        // Toggle region selection; also update the BET station marker
        selectedRegion = selectedRegion === clickedReg ? null : clickedReg;
      } else {
        selectedRegion = null;
      }
      rBar = normR;
      psiDeg = psiSnap;
      rbarCtrl && rbarCtrl.set(rBar); azCtrl && azCtrl.set(psiDeg); draw();
    });

    ui.onDraw(draw);
    const savedControls=HLModelState.controls(host);
    host._hlModel={get:()=>({...savedControls.get(),selectedRegion}),set:x=>{selectedRegion=['driving','driven','stall'].includes(x.selectedRegion)?x.selectedRegion:null;savedControls.set(x);draw();},evidence:()=>({})};

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
        { pts: curve.map(p => ({ x: p.V / 0.5144, y: p.Ptot / 1000 })), color: '#e6edf3', width: 2.6, label: 'P_total' },
      ];
      const ymax = Math.max(...curve.map(p => p.Ptot)) / 1000 * 1.1;
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col);
      const ch = HLD.lineChart(ctx, W, H, series,
        { xmin: 0, xmax: 85 / 0.5144, ymin: 0, ymax, xlab: 'airspeed (kt)', ylab: 'power (kW)' },
        col,
        [{ x: m.enduranceV / 0.5144, color: col.good, label: 'min P' },
         { x: m.rangeV / 0.5144, color: col.warn, label: 'min P/V' }]);
      // ETL band (15–25 kt): where the induced-power collapse is felt as
      // effective translational lift — the "knee" the text describes.
      const xe0 = ch.sx(15), xe1 = ch.sx(25);
      ctx.fillStyle = 'rgba(56,189,248,0.08)';
      ctx.fillRect(xe0, ch.y1, xe1 - xe0, ch.y0 - ch.y1);
      HLD.text(ctx, 'illustrative transition', (xe0 + xe1) / 2, ch.y1 + 3, 'rgba(56,189,248,0.85)', '9px IBM Plex Sans', 'center', 'top');
      ui.readout.innerHTML = kv([
        ['Gross weight', weight.toFixed(0) + ' kg', 'var(--hl-ink)'],
        ['Density altitude', alt.toFixed(0) + ' ft', 'var(--hl-ink)'],
        ['Hover power', (curve[0].Ptot / 1000).toFixed(0) + ' kW', 'var(--hl-wind)'],
        ['Minimum required power speed', (m.enduranceV / 0.5144).toFixed(0) + ' kt', 'var(--hl-good)'],
        ['Minimum P/V speed', (m.rangeV / 0.5144).toFixed(0) + ' kt', 'var(--hl-warn)'],
      ]) + `<p class="hl-note">The component sum gives model required power.
        Markers identify minimum P and minimum P/V. Fuel endurance/range require
        fuel-flow and wind assumptions; climb requires available-power data.
        The shaded transition band is illustrative, not a universal ETL threshold.
        This curve does not compute available engine power or autorotation performance.</p>`;
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
        ${cse === 'auto' ? 'The up-flow used is the net flow through the disc (induced velocity already accounted for). ' : ''}F_H is drawn ×6 for visibility — its direction is exact.
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
        • V_rot  = Ω·r          (rotational speed, tangential to the rotation path)
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
    let Vkt = 60, psiDeg = 270, rBar = 0.75, twistOn = true, discModel = 'extended';
    // The early learning task is the local triangle. Keep advanced disc/stall
    // diagnostics optional, after the controls and numerical evidence.
    const mapDetails=el('details','hl-optional-map');
    const mapSummary=el('summary',null,'Optional disc diagnostics — explored in Module 4');
    const mapStage=ui.topCanvas.parentElement,mapReadout=el('div','hl-w-readout');
    mapDetails.append(mapSummary,mapStage,mapReadout);host.querySelector('.hl-w').append(mapDetails);
    mapDetails.addEventListener('toggle',()=>{if(host.isConnected)draw();});
    // Illustrative Mach-adjusted critical α — identical rule to wEnvelope so
    // the BET stall verdict matches the disc map cell-for-cell.
    const stallEffAt = (st, UT) => HLMechanisms.diagnostic(st,{UT,aoa:0,reverseFlow:UT<=1e-4}).critical;
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

      // One consistent trimmed state for pitch and blade motion. Reuse the
      // existing signed BET decomposition rather than combining trimmed pitch,
      // absolute throughflow and the natural untrimmed flap rate.
      const flow = localVelocityDecomposition(stt, c, rBar, psi);
      const Vrot = rBar;
      const Vt = mu * Math.sin(psi);
      const UT = flow.UT;
      const v_i = flow.lamInduced;
      const v_n = throughflowRatio(stt);
      const lam_i = v_i;
      const v_flap = flow.bladeMotionNormal; // complete blade-motion contribution
      const UP = flow.UP;
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
      // foundation/extended model and apply the identical illustrative critical-α rule the
      // wEnvelope colour map uses, so displayed ratios and positive-α threshold diagnostics agree.
      const dCell   = localAoAmodel(stt, c, rBar, psi, discModel);
      const stallEffDeg = stallEffAt(st, dCell.UT);          // Mach-adjusted crit α (°)
      const cellAoAdeg  = dCell.aoa * R2D;
      const cellReverse = dCell.reverseFlow || dCell.UT<=1e-4;
      const cellStalled = !cellReverse && cellAoAdeg >= stallEffDeg;
      const cellNear    = !cellReverse && !cellStalled && cellAoAdeg / stallEffDeg >= .8;
      const pctCrit = stallEffDeg > 0 ? 100 * cellAoAdeg / stallEffDeg : 0;
      const verdict = cellReverse ? { t: 'MAP: reverse / near-zero tangential flow', c: 'var(--hl-bad)' }
        : cellStalled ? { t: 'MAP: model α threshold crossed', c: 'var(--hl-bad)' }
        : cellNear ? { t: 'MAP: near model α threshold', c: 'var(--hl-warn)' }
        : { t: 'MAP: below model thresholds', c: 'var(--hl-good)' };

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
      const compact = W < 400;
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
      // Signed components, offset so subtracting arrows remain visible.
      // yVn = induced + throughflow; yTop adds the blade-motion contribution.
      if (Math.abs(v_n) > 1e-4) {
        HLD.arrow(ctx, xBase - 12, yVn, xBase - 12, yVi, col.accent, 2.3, 7);
        if (showDetailLabels && Math.abs(yVi - yVn) >= LBL_MIN)
          HLD.chipLabel(ctx, 'V_n (signed)', Math.max(12, xBase - 18), (yVn + yVi) / 2, col.accent, FSM, 'right');
      }
      if (Math.abs(v_flap) > 1e-4) {
        const flCol = v_flap > 0 ? col.good : col.warn;
        HLD.arrow(ctx, xBase - 24, yTop, xBase - 24, yVn, flCol, 2.3, 7);
        if (showDetailLabels && Math.abs(yTop - yVn) >= LBL_MIN)
          HLD.chipLabel(ctx, 'V_blade (signed)', Math.max(12, xBase - 30), (yTop + yVn) / 2, flCol, FSM, 'right');
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
        HLD.chipLabel(ctx, 'V_rel', vrx - 30, vry + 12, col.wind,
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
      const modelBadge = discModel === 'foundation'
        ? '<div class="hl-kv-banner"><b>Foundation model</b> — Combined teaching preset. Assumptions: untwisted blade, no lateral cyclic, uniform inflow.</div>'
        : '<div class="hl-kv-banner"><b>Extended model</b> — Purpose: show how the same mechanism changes with added rotor effects. Adds: trim cyclic and lateral inflow, using the currently configured blade-twist state.</div>';
      const inflowNote = '<p class="hl-note"><b>Map and triangle:</b> the optional Foundation map uses actual tangential speed with uniform normal flow and its own pitch preset; it is a different state from this trimmed local triangle. Extended uses the shared core flow model. Compare the numerical local θ, φ and α below before interpreting any map diagnostic.</p>';
      mapReadout.innerHTML=banner+modelBadge+inflowNote+kv([
        ['Map α / assumed critical',cellReverse?'n/a (reverse)':cellAoAdeg.toFixed(1)+'° / '+stallEffDeg.toFixed(1)+'°','var(--hl-ink)']
      ]);
      ui.readout.innerHTML = kv([
        ['Azimuth ψ', psiDeg.toFixed(0) + '°  (' + side + ')', 'var(--hl-ink)'],
        ['V_rot = Ω·r', VrotMS.toFixed(0) + ' m/s', 'var(--hl-lift)'],
        ['Translational tangential velocity', (VtMS >= 0 ? '+' : '') + VtMS.toFixed(0) + ' m/s', Vt < 0 ? 'var(--hl-bad)' : 'var(--hl-accent)'],
        ['U_T (net in-plane)', UTMS.toFixed(0) + ' m/s', reverse ? 'var(--hl-bad)' : 'var(--hl-ink)'],
        ['Local induced normal velocity', ViMS.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Signed aircraft throughflow', VnMS.toFixed(1) + ' m/s', 'var(--hl-accent)'],
        ['&nbsp;&nbsp;V_blade (flap rate + transport; ' + (v_flap > 0 ? 'adds, α↓' : v_flap < 0 ? 'subtracts, α↑' : '≈0') + ')',
          (VflapMS >= 0 ? '+' : '') + VflapMS.toFixed(1) + ' m/s', v_flap > 0 ? 'var(--hl-good)' : 'var(--hl-warn)'],
        ['U_P = signed induced + throughflow + blade motion', UPMS.toFixed(1) + ' m/s', 'var(--hl-wind)'],
        ['Flap-rate term r·β̇', (flow.flapRateNormal * OmR).toFixed(1) + ' m/s', 'var(--hl-lift)'],
        ['Coning/body-rate term', ((flow.coningBladeNormal + flow.bodyRateNormal) * OmR).toFixed(1) + ' m/s', 'var(--hl-lift)'],
        ['V_rel', VrelMS.toFixed(0) + ' m/s', 'var(--hl-wind)'],
        ['θ pitch', (theta * R2D).toFixed(1) + '°', 'var(--hl-chord)'],
        ['φ inflow angle', (phi * R2D).toFixed(1) + '°', 'var(--hl-wind)'],
        ['α = θ − φ', reverse ? 'n/a (reverse)' : (aoa * R2D).toFixed(1) + '°',
          stalled ? 'var(--hl-bad)' : 'var(--hl-good)'],
      ]) + `<p class="hl-note">The local triangle uses one <b>trimmed</b> state
        for pitch, signed induced/throughflow and blade motion. At 90° translation
        adds to Ωr; at 270° it subtracts. Compute φ = atan2(U_P,U_T) and then
        α = θ − φ for normal chordwise flow. Smaller U_T at fixed pitch is not
        by itself proof of larger α: compare U_P too.</p>
        <p class="hl-note">Blade motion includes flap-rate and coning transport
        contributions. In this level-disc trim the first-harmonic flap-rate term
        is approximately zero; the separate Flapping activity demonstrates the
        untrimmed rate effect. Negative U_P and φ remain signed. U_P is amplified
        ×${AMP} visually, so use the numerical values for the actual angle.</p>
        <p class="hl-note">The optional disc diagnostics below use additional
        section-threshold assumptions. They are explored later in Module 4.</p>`;


      // ---- ROTOR-MAP (own top canvas) ---------------------------------------
      // Draw the live, clickable envelope disc on its OWN wide canvas above the
      // triangle. Uses the SAME model angle rule as wEnvelope so it matches
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
          if (dd.reverseFlow || dd.UT<=1e-4) { ctx.fillStyle = 'rgba(180,60,200,0.55)'; }
          else {
            const pct = dd.aoa * R2D / se;
            ctx.fillStyle = ratioColor(pct);
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

    // Shortcuts are actions, not persistent model selections. A radio group
    // stayed on RET even after the azimuth slider moved to NOSE, and treating
    // these actions as selected settings would invalidate an azimuth comparison.
    const jump=el('div','hl-ctl');jump.append(el('div','hl-ctl-lab','Jump to azimuth'));
    const jumps=el('div','hl-seg');
    for(const [angle,text] of [[90,'ADV 90°'],[270,'RET 270°'],[180,'NOSE 180°'],[0,'TAIL 0°']]){
      const b=el('button','hl-seg-btn',text);b.type='button';
      b.onclick=()=>{psiDeg=angle;psiSl.set(angle);draw();};jumps.append(b);
    }
    jump.append(jumps);ui.controls.append(jump);
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
    segmented(mapDetails, {
      label: 'Stall model (toggle assumptions)', val: discModel, options: [
        { v: 'foundation', t: 'Foundation model' }, { v: 'extended', t: 'Extended model' },
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
      HLD.text(ctx, 'lead/lag (in-plane) ζ(ψ)', W < 420 ? px : px + pw / 2, W < 420 ? py - 10 : py - 4, col.dim, (W < 420 ? '9px ' : '10px ') + 'IBM Plex Sans', W < 420 ? 'left' : 'center');
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
        ['Head type', articulated ? 'Articulated (lead–lag hinge)' : 'Underslung model (teetering)', 'var(--hl-accent)'],
        ['Flap β (out-of-plane) at ψ=' + psiDeg.toFixed(0) + '°', beta.toFixed(1) + '°', 'var(--hl-lift)'],
        ['Lead/lag ζ (in-plane) at ψ=' + psiDeg.toFixed(0) + '°', (zDeg >= 0 ? '+' : '') + zDeg.toFixed(2) + '° ' + (zDeg >= 0 ? '(lead)' : '(lag)'),
          zDeg >= 0 ? 'var(--hl-good)' : '#c060d0'],
      ]) + `<p class="hl-note">For positive coning and the stated hinge geometry,
        inward radial mass movement gives a lead tendency when external torque is
        neglected. Actual lag displacement and phase depend on damping and coupling.
        <b>This curve prescribes ζ = gain × dβ/dψ; it does not solve lag dynamics or
        radial centre-of-mass geometry.</b> ${articulated
          ? 'The larger gain illustrates lead/lag accommodation; it is not a computed damper response.'
          : 'The smaller gain illustrates an underslung comparison; it does not quantify real Coriolis cancellation.'}</p>`;
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
      const bodyLen = Math.min(W * 0.34, 190), cgH = 46, mastH = 78;
      const rot = (dx, dy) => ({ x: pvx + dx * Math.cos(phi) - dy * Math.sin(phi), y: pvy - dx * Math.sin(phi) - dy * Math.cos(phi) });
      // (dx,dy) in body frame: +dx toward the raised skid (right), +dy up
      const cgP = rot(bodyLen * 0.5, cgH);
      const mastP = rot(bodyLen * 0.5, cgH + mastH);
      // fuselage — clean front-view silhouette (model-inspired), banked about the pivot.
      // All points are in body frame (dx toward raised skid, dy up) then rotated by φ.
      const strokeBF = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => {
        const s = rot(p[0], p[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      }); if (close) ctx.closePath(); ctx.stroke(); };
      ctx.strokeStyle = col.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const cxC = bodyLen * 0.5, cyC = cgH - 6, rx = bodyLen * 0.46, ry = 24;
      // cabin (rounded)
      const cabin = []; for (let a = 0; a <= 2 * Math.PI + 0.15; a += 0.18) cabin.push([cxC + rx * Math.cos(a), cyC + ry * Math.sin(a)]); strokeBF(cabin);
      // skids: down-slope (pivot, on ground) + raised, as tubes at dy=0
      const sk = bodyLen * 0.30;
      strokeBF([[-sk / 2, 0], [sk / 2, 0]]);                       // pivot (down-slope) skid
      strokeBF([[bodyLen - sk / 2, 0], [bodyLen + sk / 2, 0]]);   // raised skid
      // struts: skid → cabin belly
      strokeBF([[0, 0], [cxC - rx * 0.55, cyC - ry]]);
      strokeBF([[0, 0], [cxC - rx * 0.15, cyC - ry]]);
      strokeBF([[bodyLen, 0], [cxC + rx * 0.55, cyC - ry]]);
      strokeBF([[bodyLen, 0], [cxC + rx * 0.15, cyC - ry]]);
      ctx.lineCap = 'butt';
      // mast
      HLD.dline(ctx, cgP.x, cgP.y, mastP.x, mastP.y, col.dim, 3, [1, 0]);
      // rotor disc (perpendicular to mast → tilts with the airframe)
      const dR = bodyLen * 0.52;
      const dxv = Math.cos(phi), dyv = -Math.sin(phi);   // disc plane direction (body-x rotated)
      ctx.strokeStyle = col.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mastP.x - dR * dxv, mastP.y - dR * dyv); ctx.lineTo(mastP.x + dR * dxv, mastP.y + dR * dyv); ctx.stroke();
      ctx.lineCap = 'butt';
      // thrust vector ⟂ disc (tilts with bank) — length ∝ T/W
      const WL = 40, tLen = Math.max(16, Math.min(tw, 1.4) * WL);
      // disc normal in canvas: body-up rotated by φ → (-sinφ, -cosφ)
      const tnx = -Math.sin(phi), tny = -Math.cos(phi);
      HLD.arrow(ctx, mastP.x, mastP.y, mastP.x + tnx * tLen, mastP.y + tny * tLen, tw >= 1 ? col.lift : col.warn, 4, 12);
      HLD.text(ctx, 'Thrust', mastP.x + tnx * tLen + 6, mastP.y + tny * tLen, tw >= 1 ? col.lift : col.warn, 'bold 11px IBM Plex Sans');
      // weight at CG (always straight down)
      HLD.arrow(ctx, cgP.x, cgP.y, cgP.x, cgP.y + WL, col.drag, 3, 10);
      HLD.text(ctx, 'Weight', cgP.x + 8, cgP.y + WL * 0.5, col.drag, '11px IBM Plex Sans', 'left', 'middle');
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
        ['Illustrative balance threshold', '≈ ' + critDeg.toFixed(1) + '°', 'var(--hl-warn)'],
        ['Collective (thrust)', collPct.toFixed(0) + '%  ·  T/W ' + tw.toFixed(2), tw >= 1 ? 'var(--hl-good)' : 'var(--hl-ink)'],
        ['Restoring moment (weight)', restoreMag.toFixed(1) + ' kN·m', restoreMag > 0 ? 'var(--hl-lift)' : 'var(--hl-bad)'],
        ['Rolling moment (tilted thrust)', driveMag.toFixed(1) + ' kN·m', diverging ? 'var(--hl-bad)' : 'var(--hl-warn)'],
        ['State', diverging ? 'Thrust term dominates' : 'Weight term dominates', diverging ? 'var(--hl-bad)' : 'var(--hl-good)'],
      ]) + '<p class="hl-note">This simplified moment comparison uses assumed geometry and omits roll-rate dynamics and control limits. Its threshold is not a safe bank angle or a prediction of recoverability. Compare the thrust contribution at two collective settings; actual procedures require approved aircraft instruction.</p>';
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
    // Risk-factor toggles: each adds to the margin penalty when active.
    const riskFactors = [
      { label: 'Low IAS (below ETL)', active: false, penalty: 0.15 },
      { label: 'High density altitude', active: false, penalty: 0.12 },
      { label: 'Right yaw demand (CCW rotor)', active: false, penalty: 0.10 },
    ];
    // relative-wind azimuth: 0 = from the nose, 90 = from the right, 180 = tail,
    // 270 = from the left. Critical sectors (CCW rotor / left anti-torque pedal):
    //   weathercock + TR-VRS  ≈ 210–330°   Mechanism 1
    //   main-disc vortex intf ≈ 285–315°   Mechanism 2
    //   weathervane (tailwind) ≈ 120–240°  Mechanism 3
    const inArc = (a, lo, hi) => { a = ((a % 360) + 360) % 360; return lo <= hi ? (a >= lo && a <= hi) : (a >= lo || a <= hi); };
    // Sector definitions: each carries a display name and a tooltip explaining
    // why thrust is reduced in that sector.
    const sectors = [
      {
        lo: 120, hi: 240,
        name: 'Mechanism 3 — Weathercock Yaw Moment',
        tip: 'Fuselage and fin moments tend to turn the nose into the relative wind. This changes yaw-moment balance without requiring loss of tail-rotor thrust.',
        baseAlpha: 0.16, color: '240,190,60',
      },
      {
        lo: 210, hi: 330,
        name: 'Mechanism 1 — Tail Rotor Vortex Ring State',
        tip: 'Opposing crossflow can create unsteady, nonuniform tail-rotor inflow and thrust variations. A sector alone does not prove the actual flow state or control response.',
        baseAlpha: 0.13, color: '235,70,50',
      },
      {
        lo: 285, hi: 315,
        name: 'Mechanism 2 — Main Rotor Disc Vortex Interference',
        tip: 'Main-rotor wake interaction can alter tail-rotor inflow and aerodynamic force. This example overlaps the tail-rotor recirculation sector; the actual interaction depends on configuration.',
        baseAlpha: 0.30, color: '180,60,200',
      },
    ];
    const activeRiskCount = () => riskFactors.filter(f => f.active).length;
    const riskBoost = () => Math.min(0.6, riskFactors.reduce((s, f) => s + (f.active ? f.penalty : 0), 0));

    // Build risk-factor toggle checkboxes below the sliders
    const rfWrap = el('div', 'hl-lte-risk-factors');
    rfWrap.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;';
    const rfTitle = el('div', '');
    rfTitle.style.cssText = 'width:100%;font-weight:600;color:var(--hl-warn);';
    rfTitle.textContent = 'Illustrative conditions (highlight only; no quantitative authority calculation):';
    rfWrap.appendChild(rfTitle);
    riskFactors.forEach(rf => {
      const lbl = el('label', '');
      lbl.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = rf.active;
      cb.addEventListener('change', () => { rf.active = cb.checked; draw(); });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(rf.label));
      rfWrap.appendChild(lbl);
    });
    ui.controls.appendChild(rfWrap);

    // Sector info panel: shown below readout, updates with active sector
    const infoPanel = el('div', 'hl-lte-sector-info');
    infoPanel.style.cssText = 'margin-top:6px;padding:6px 8px;border-radius:4px;font-size:11px;line-height:1.5;background:var(--hl-surface,#1a1a2e);border:1px solid var(--hl-grid,#333);';
    ui.readout.parentNode && ui.readout.parentNode.insertBefore(infoPanel, ui.readout.nextSibling);

    const draw = () => {
      const { ctx, W, H, col } = HLD.setup(ui.canvas);
      HLD.clear(ctx, W, H, col); HLD.grid(ctx, W, H, col, 30);
      const cx = W * 0.40, cy = H * 0.52, R = Math.min(W * 0.30, H * 0.40);
      const boost = riskBoost();
      // draw sector wedges first (behind the airframe); intensify when risk factors active
      const wedge = (lo, hi, color, alpha) => {
        const a = (deg) => (-90 + deg) * D2R;
        ctx.fillStyle = `rgba(${color},${Math.min(0.85, alpha + boost * 1.5)})`; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 1.06, a(lo), a(hi)); ctx.closePath(); ctx.fill();
      };
      sectors.forEach(s => wedge(s.lo, s.hi, s.color, s.baseAlpha));
      // sector name labels at mid-arc, outside the disc
      const labelSector = (lo, hi, name, color) => {
        const midDeg = lo + ((hi - lo + 360) % 360) / 2;
        const ma = (-90 + midDeg) * D2R;
        const compact=W<480;
        const lx = Math.max(64,Math.min(W-64,cx + Math.cos(ma) * (R * 1.28))), ly = Math.max(18,Math.min(H-24,cy + Math.sin(ma) * (R * 1.28)));
        // split name to two lines: "Mechanism N" on first line, rest on second
        const parts = name.split(' — ');
        const number=parts[0].match(/\d/)?.[0];
        const line1 = compact?'Mechanism '+number:parts[0], line2 = compact?({1:'TR inflow',2:'Wake interaction',3:'Weathercock'}[number]||''):parts[1]||'';
        ctx.save(); ctx.font = '8px IBM Plex Sans'; ctx.fillStyle = `rgba(${color},0.85)`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(line1, lx, ly - 5);
        ctx.fillText(line2, lx, ly + 6);
        ctx.restore();
      };
      labelSector(120, 240, 'Mechanism 3 — Weathercock Moment', '240,190,60');
      labelSector(210, 330, 'Mechanism 1 — TR Vortex Ring State', '235,70,50');
      labelSector(285, 315, 'Mechanism 2 — Disc Vortex Interference', '180,60,200');
      // fuselage: nose up, tail down; CCW main rotor, tail rotor on the LEFT boom
      ctx.strokeStyle = col.dim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.16, R * 0.30, 0, 0, 2 * Math.PI); ctx.stroke();
      HLD.dline(ctx, cx, cy + R * 0.30, cx, cy + R * 0.92, col.dim, 3, [1, 0]);
      HLD.dot(ctx, cx - 6, cy + R * 0.92, 5, col.accent);
      HLD.text(ctx, 'tail rotor', cx - 10, cy + R * 0.99, col.accent, '9px IBM Plex Sans', 'right');
      ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      HLD.text(ctx, 'NOSE', cx, cy - R - 8, col.dim, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'TAIL', cx, cy + R + 16, col.dim, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'R', cx + R + 8, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
      HLD.text(ctx, 'L', cx - R - 8, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
      // wind arrow
      const wa = (-90 + windDeg) * D2R;
      const wx = cx + Math.cos(wa) * (R + 30), wy = cy + Math.sin(wa) * (R + 30);
      HLD.arrow(ctx, wx, wy, cx + Math.cos(wa) * R * 0.5, cy + Math.sin(wa) * R * 0.5, col.wind, 3, 11);
      HLD.text(ctx, windKt.toFixed(0) + ' kt wind', wx, wy - 6, col.wind, '10px IBM Plex Sans', 'center');
      // Mechanism ledger only: no tail-rotor solver or invented authority index.
      const st = HL.defaultState(); st.theta0 = 4 + (collPct / 100) * 11;
      const tw = HL.axialSolve(st, 0).thrust / HL.weightN(st);
      const activeSectors = windKt > 0 ? sectors.filter(s => inArc(windDeg, s.lo, s.hi)) : [];
      const tx = W * 0.72;
      HLD.text(ctx, 'Yaw moment balance', tx, H * 0.24, col.ink, '10px IBM Plex Sans', 'center');
      HLD.text(ctx, 'Main-rotor torque', tx, H * 0.34, col.chord, '9px IBM Plex Sans', 'center');
      HLD.text(ctx, '+ airframe moments', tx, H * 0.42, col.wind, '9px IBM Plex Sans', 'center');
      HLD.text(ctx, '+ tail-rotor moment', tx, H * 0.50, col.accent, '9px IBM Plex Sans', 'center');
      HLD.text(ctx, '= net yaw moment', tx, H * 0.60, col.ink, '9px IBM Plex Sans', 'center');
      HLD.text(ctx, 'Magnitudes not solved', tx, H * 0.70, col.dim, '9px IBM Plex Sans', 'center');
      ui.readout.innerHTML = kv([
        ['Relative wind FROM', windDeg.toFixed(0) + '° · ' + windKt.toFixed(0) + ' kt', 'var(--hl-wind)'],
        ['Collective input', collPct.toFixed(0) + '% of teaching slider; not rated power', 'var(--hl-ink)'],
        ['Main-rotor state proxy', 'T/W ' + tw.toFixed(2) + '; torque not solved', 'var(--hl-ink)'],
        ['Illustrated wind mechanisms', activeSectors.length ? activeSectors.map(s => s.name).join('; ') : windKt === 0 ? 'none — zero wind' : 'none of the shaded examples', 'var(--hl-accent)'],
        ['Conditions selected', activeRiskCount() + ' / ' + riskFactors.length, 'var(--hl-ink)'],
        ['Control authority / yaw rate', 'not computed', 'var(--hl-dim)'],
      ]) + '<p class="hl-note">Compare collective at fixed wind, then direction at fixed collective and wind speed. Collective can change torque demand; weathercock moments and tail-rotor flow changes are separate mechanisms. The shaded conventional-rotor sectors can overlap. They are not a validated H145/Fenestron map or a controllability prediction. Wind FROM uses a different angle reference from blade azimuth ψ.</p>';
      infoPanel.innerHTML = activeSectors.length
        ? activeSectors.map(s => `<b style="color:rgba(${s.color},1)">${s.name}</b><br>${s.tip}`).join('<br><br>')
        : windKt === 0 ? '<b>Zero wind:</b> no wind mechanism is active. The shaded sectors remain as a reference.'
        : 'Outside the shaded historical examples. This does not establish adequate control authority.';

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

    const sb = {
      coll: 9, Vkt: 60, Vc: 0, weight: 2800, alt: 0, ige: false, zR: 1.0, psi: 90,
      showWake: true, showFuselage: true, showVel: true, paused: false,
    };

    // create the 3-D controller (gracefully degrade if Three.js unavailable)
    const mount3d = mountManagedRotor3D(stage3d, {
      create: { showWake: true, showFuselage: true, showVel: true },
      isPaused: () => sb.paused,
    });
    const view3d = mount3d.view3d;

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
      return rotorViewState(sb);
    }

    function render() {
      const derived = buildState();
      const stt = derived.st;
      const c = derived.coeffs;
      const mu = derived.mu;
      // feed the 3-D view: coning a₀, nose-down body/disc tilt, wake skew (μ, λ)
      mount3d.setData({
        coningDeg: derived.coningDeg,
        bodyPitchDeg: derived.bodyPitchDeg,
        bladePitchDeg: derived.bladePitchDeg,
        psiDeg: sb.psi,
        mu,
        lam: derived.lam,
        showWake: sb.showWake,
        showFuselage: sb.showFuselage,
        showVel: sb.showVel,
      });
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
            const stallEff = Math.max(5, stt.stallAoA - 18 * Math.max(0, OmRsb * Math.max(0, d.UT) / sosSb - 0.30));
            // Angle threshold is independent of the tangential loading proxy.
            const stallCell = !d.reverseFlow && d.UT>1e-4 && d.aoa * R2D >= stallEff;
            if (d.reverseFlow) {
              ctx.fillStyle = 'rgba(180,60,200,0.5)';
            } else {
              ctx.fillStyle = aoaColor(d.aoa * R2D, stallEff);
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
          { theta: d.theta, phi, ampl: 4, showForces: true, cl: HL.clOf(stt, d.theta - phi), cd: HL.cdOf(stt, HL.clOf(stt, d.theta - phi)), aoa: d.theta - phi, stall: (d.theta - phi) > stt.stallAoA * D2R }, col);
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
      ]) + '<p class="hl-note"><b>Conceptual wake visualisation derived from the lab state;</b> not a CFD or validated free-wake VRS solution.</p>';
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
        pauseBtn.classList.toggle('on', sb.paused); mount3d.syncLifecycle(); render(); };
      toggles.appendChild(pauseBtn);
      mkTog('Wake', 'showWake');
      mkTog('Fuselage', 'showFuselage');
      mkTog('Rel. vel.', 'showVel');
    }

    const ro = new ResizeObserver(() => render());
    ro.observe(grid);
    requestAnimationFrame(render);
    return {
      dispose() {
        try { ro.disconnect(); } catch (e) {}
        mount3d.cleanup();
      },
    };
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
      Two components define the local relative flow: <b>U<sub>T</sub></b> in the rotor plane and <b>U<sub>P</sub></b> normal to it. Both affect resultant speed and inflow angle. The terms in parentheses below are normalised by <b>ΩR</b>; the equations give velocities in m/s. Body rates are zero in this displayed form.`);
    eq(`<span class="var">U_T</span> = ΩR · ( r̄ + μ·sinψ )` +
      `\n<span class="var">U_P</span> = ΩR · ( λ + r̄·dβ/dψ + μ·β·cosψ )`);
    para(`<b>μ = V/ΩR</b> is the advance ratio (forward speed as a fraction of tip
      speed). On the advancing side sinψ = +1 so the forward flow <b>adds</b> to the
      rotational speed; on the retreating side sinψ = −1 so it <b>subtracts</b> —
      that is dissymmetry of lift. <b>β</b> is the flapping angle and <b>dβ/dψ</b>
      its derivative with respect to azimuth (time rate β̇ = Ω dβ/dψ). The last U_P terms are flap-rate and blade-angle transport contributions.`);

    // ── 3. TIP-PATH-PLANE & INFLOW ─────────────────────────────────────────
    head('3 · Tip-path-plane, disc tilt and the inflow λ');
    para(`The core uses signed α<sub>TPP</sub>, negative for its prescribed nose-down forward-flight state. This throughflow estimate is an assumed propulsive-flight condition, separate from the level-disc trim used by some widgets. The total inflow <b>λ</b> normal to the
      disc has signed induced and throughflow contributions:`);
    figure(300, 'Fig. 2 — Side view. The nose-down tip-path-plane makes the free stream V pass partly THROUGH the disc (μ·tanα_TPP) with its sign retained alongside induced λ_i.',
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
        HLD.arrow(ctx, px + nx * nlen, py + ny * nlen, px, py, col.bad, 2, 8);
        HLD.chipLabel(ctx, 'signed throughflow (<0 here)', px + nx * nlen + 4, py + ny * nlen, col.bad, '10px IBM Plex Sans, sans-serif', 'left');
        // inflow ratio λ_i straight down through hub
        HLD.arrow(ctx, cx + dx * 0.4, cy - dy * 0.4, cx + dx * 0.4 + nx * nlen * 0.7, cy - dy * 0.4 + ny * nlen * 0.7, col.wind, 2, 8);
        HLD.chipLabel(ctx, 'λ_i (induced)', cx + dx * 0.4 + nx * nlen * 0.7 + 4, cy - dy * 0.4 + ny * nlen * 0.7, col.wind, '10px IBM Plex Sans, sans-serif', 'left');
      });
    eq(`<span class="var">λ</span> = μ·tan(α_TPP) + λ_i` +
      `   <span class="cmt">total = throughflow + induced</span>` +
      `\n<span class="var">λ_i</span> = C_T / ( 2·√(μ² + λ²) )` +
      `   <span class="cmt">Glauert momentum inflow</span>`);
    para(`Keep the throughflow sign: it is zero in hover and negative for
      the core's prescribed nose-down state. It can oppose induced downflow;
      the relative magnitudes depend on speed, loading and disc attitude, with
      no universal crossover speed. Induced flow is also nonuniform. The
      following linear harmonic prescription is a teaching approximation, not
      a resolved wake or dynamic-inflow model:`);
    eq(`<span class="var">λ_i(r̄,ψ)</span> = λ_i · ( 1 + κ·r̄·cosψ + k_y·r̄·sinψ )` +
      `\nκ = (4/3)·μ / (√(μ²+λ_i²) + λ_i)      k_y = −2μ`);

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
    para(`The selected −8° twist is referenced at 75%R, reducing pitch toward the tip. At fixed positive U_P, smaller U_T raises φ and therefore reduces α at fixed θ. Carrying a specified load at reduced speed is a different problem: it may require a larger lift coefficient and α, with a corresponding pitch/trim change. Do not confuse those controlled conditions.`);

    // ── 5. FLAPPING (for completeness) ─────────────────────────────────────
    head('5 · Where β comes from — first-harmonic flapping');
    para(`The core prescribes a quasi-steady first-harmonic response. Mean coning a₀ and cosine/sine coefficients a₁c/a₁s locate the blade; their derivative supplies the flap-rate term. The coefficients do not solve flexible-blade or transient coupled dynamics. The core sign convention is:`);
    eq(`<span class="var">β</span>(ψ) = a₀ + a₁c·cosψ + a₁s·sinψ` +
      `\nβ̇ = Ω·(−a₁c·sinψ + a₁s·cosψ)`);

    // ── REFERENCES ─────────────────────────────────────────────────────────
    const refs = el('div', 'hl-model-refs');
    refs.innerHTML =
      '<h4>Where the formulas come from</h4>' +
      '<ol>' +
      '<li>Leishman, J.G. — <i>Principles of Helicopter Aerodynamics</i>, 2nd ed. ' +
        'Blade-element velocities U_T/U_P, Glauert forward-flight inflow λ = μ·tanα + C_T/(2√(μ²+λ²)), and the linear-inflow (Drees) model.</li>' +
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
      'on this page follow the course convention: ψ from the tail, CCW rotor. The model uses representative assumptions, not validated H145/BK117 flight data.</p>';
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
    (host._hlDisposers ||= []).push(() => ro.disconnect());
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
                  → selected level-disc response, with aircraft velocity separate
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
      hover: 'At fixed radius, U_T = Ωr is independent of azimuth. Across the span it varies with radius. This layer assumes symmetric inflow; mean coning can remain without first-harmonic flapping.',
      rigid: 'Flapping and cyclic are suppressed to isolate U_T = Ωr + V sinψ. The two sides have different local speed. The lift proxy also depends on α; this untrimmed comparison is not an aircraft roll trajectory.',
      freeflap: 'This prescribed untrimmed response adds flap velocity to U_P. Upward motion tends to increase φ and reduce α at fixed pitch. Flap rate, displacement and pitch are separate. Negative α here is a selected model state, not a universal trimmed-flight result.',
      trimmed: 'Cyclic changes pitch around the disc to achieve this level-disc teaching trim. Compare θ and φ at each station: local α can still differ. With a level disc, the disc-normal thrust approximation is vertical; forward aircraft velocity is separate.',
      highsp: 'Compare local speed and α under the selected trim assumptions. Hatching uses an assumed section threshold. It does not compute aircraft V_NE, unsteady stall dynamics or a recovery manoeuvre.',
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
    const stallEffAt = (st, UT) => HLMechanisms.diagnostic(st,{UT,aoa:0,reverseFlow:UT<=1e-4}).critical;

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
      options: [{ v: 'ut', t: 'U_T speed' }, { v: 'aoa', t: 'Angle of attack α' }, { v: 'lift', t: 'Lift proxy' }],
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
          // Attached-flow proxy is withheld outside its assumed angle range.
          const Cl = Math.abs(d.aoa) < se * D2R ? st.clAlpha * d.aoa : 0;
          maxLift = Math.max(maxLift, Math.max(0, d.UT) * Math.max(0, d.UT) * Cl);
        }
      }
      for (let ir = 0; ir < nr; ir++) {
        const r0 = 0.2 + 0.8 * ir / nr, r1 = 0.2 + 0.8 * (ir + 1) / nr;
        for (let ip = 0; ip < np; ip++) {
          const p0 = (ip / np) * 2 * Math.PI, p1 = ((ip + 1) / np) * 2 * Math.PI;
          const pm = (p0 + p1) / 2, rm = (r0 + r1) / 2;
          const d = cellAt(layer, st, rm, pm);
          const aoaDeg = d.aoa * R2D;
          const stallEff = stallEffAt(st, d.UTn);
          const trulyStalled = !d.reverseFlow && d.UTn>1e-4 && aoaDeg >= stallEff;
          if (d.reverseFlow) { ctx.fillStyle = 'rgba(180,60,200,0.5)'; }
          else if (envMode === 'ut') {
            ctx.fillStyle = ramp(Math.max(0, d.UT) / maxUT);
          } else if (envMode === 'aoa') {
            ctx.fillStyle = aoaColor(aoaDeg, stallEff);
          } else { // lift demand
            const se = stallEffAt(st, d.UTn);
            // Attached-flow proxy is withheld outside its assumed angle range.
            const Cl = Math.abs(d.aoa) < se * D2R ? st.clAlpha * d.aoa : 0;
            const dL = Math.max(0, d.UT) * Math.max(0, d.UT) * Cl;
            ctx.fillStyle = Math.abs(d.aoa)>=se*D2R ? 'rgb(100,110,125)' : ramp(Math.max(0,dL)/maxLift);
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
        // knockout box so the azimuth pointer / β curve can't strike the text
        HLD.chipLabel(ctx, txt, lx, ly, col.ink, lblFont, 'center');
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
        ({ ut: 'U_T (in-plane speed)', aoa: 'angle of attack α', lift: 'attached-flow load proxy · grey = unavailable' }[envMode]),
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
      const se2 = stallEffAt(d.st, d.UTn);
      const stalled2 = !reverse && d.UTn>1e-4 && aoa * R2D >= se2;
      const vTxt = reverse ? 'REVERSE FLOW' : stalled2 ? 'α THRESHOLD' : (aoa * R2D >= se2 - 3 ? 'NEAR α LIMIT' : 'BELOW α LIMIT');
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
      const compact = W < 400;
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
      // V_n (middle) — only drawn when v_n>0 (down-flow). In forward flight v_n is
      // typically NEGATIVE (nose-down TPP → upward through-disc component), so a
      // subtracting V_n is kept off the collinear stack — otherwise its cumulative
      // base yVn dips BELOW the TPP and drags the advancing V_flap through the plane.
      if (v_n > 1e-4) {
        HLD.arrow(ctx, xBase, yVn, xBase, yVi, col.accent, 2.5, 7);
        if (showDetailLabels && (yVi - yVn) >= LBL_MIN) HLD.chipLabel(ctx, 'V_n', viLx, (yVn + yVi) / 2, col.accent, FSM, 'left');
      }
      // Collinear base for the ADVANCING V_flap — stays above the TPP even when V_n≤0.
      const yFlapBase = v_n > 1e-4 ? yVn : yVi;
      // V_flap: ADVANCING (v_flap>0) ADDS to the stack (collinear, head down);
      //         RETREATING (v_flap<0) SUBTRACTS — own up-arrow just right of stack.
      if (Math.abs(v_flap) > 1e-4 && layer !== 'rigid' && layer !== 'hover') {
        const flCol = v_flap > 0 ? col.good : col.warn;
        if (v_flap > 0) {
          HLD.arrow(ctx, xBase, yTop, xBase, yFlapBase, flCol, 2.5, 7);
          if (showDetailLabels) HLD.chipLabel(ctx, 'V_flap', xBase, yTop - 11, flCol, FSM, 'center');
        } else {
          const flDx = 6;
          HLD.arrow(ctx, xBase + flDx, yTop, xBase + flDx, yVn, flCol, 2.5, 7);
          HLD.dline(ctx, xBase, yVn, xBase + flDx, yVn, col.grid, 1, [2, 3]);
          HLD.dline(ctx, xBase, yTop, xBase + flDx, yTop, col.grid, 1, [2, 3]);
          if (showDetailLabels) HLD.chipLabel(ctx, 'V_flap', xBase - 8, yVn - 8, flCol, FSM, 'right');
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
      if (!compact) HLD.chipLabel(ctx, 'V_rel', vrx - 30, vry + 12, col.wind, FVrel, 'center');
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

      // Re-stamp V_rot's chip LAST so the θ/α arc strokes can't strike its text
      // (knockout box on top). Label-only; geometry above is unchanged.
      if ((tipX - xRotTail) > 70) {
        if (Vt < 0) HLD.chipLabel(ctx, 'V_rot', xRotTail + 6, oy - 14, col.lift, FV, 'left');
        else HLD.chipLabel(ctx, 'V_rot', xRotTail + (tipX - xRotTail) * 0.44, oy - 14, col.lift, FV, 'center');
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
      const trulyStalled = !d.reverseFlow && d.UTn>1e-4 && aoaDeg >= stallEff;
      const L = LAYERS.find(l => l.v === layer);
      let verdict = 'below positive α model threshold'; let vcol = col_good;
      if (d.reverseFlow) { verdict = 'REVERSE FLOW (U_T<0)'; vcol = '#b24'; }
      else if (trulyStalled) { verdict = 'POSITIVE α MODEL THRESHOLD CROSSED'; vcol = col_bad; }
      else if (aoaDeg >= stallEff - 3) { verdict = 'near positive α model threshold'; vcol = col_warn; }
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
        `<div class="hl-kv"><span>assumed critical α</span><b>${stallEff.toFixed(1)}°</b></div>`;
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
    return { draw, dispose() { playing=false; clearInterval(sweepTimer); } };
  }

  function wRotorEnergy(host) {
    const ui=scaffold(host);
    let rpm=100;
    const draw=()=>{
      const energy=(rpm/100)**2*100;
      const {ctx,W,H,col}=HLD.setup(ui.canvas);HLD.clear(ctx,W,H,col);HLD.grid(ctx,W,H,col,30);
      const x=W*.12,y=H*.25,width=W*.7,height=34;
      HLD.text(ctx,'Stored rotor energy · constant inertia',W*.5,H*.1,col.ink,'bold 14px IBM Plex Sans','center');
      ctx.fillStyle=col.dim;ctx.globalAlpha=.3;ctx.fillRect(x,y,width,height);ctx.globalAlpha=1;
      HLD.text(ctx,'Reference 100%',x,y-12,col.dim,'12px IBM Plex Sans','left');
      ctx.fillStyle=col.lift;ctx.fillRect(x,y+height+44,width*Math.min(energy/100,1.21),height);
      HLD.text(ctx,`${energy.toFixed(1)}% energy at ${rpm}% RPM`,x,y+height+32,col.lift,'bold 12px IBM Plex Sans','left');
      HLD.text(ctx,'E / E_ref = (RPM / RPM_ref)²',W*.5,H*.82,col.ink,'13px IBM Plex Sans','center');
      ui.readout.innerHTML=kv([['Rotor RPM',rpm.toFixed(0)+'% of reference','var(--hl-chord)'],['Stored rotor energy',energy.toFixed(1)+'% of reference','var(--hl-lift)'],['Energy change',(energy-100).toFixed(1)+' percentage points','var(--hl-ink)'],['Inertia','held constant','var(--hl-dim)']])+'<p class="hl-note">This is an energy-state comparison. It does not simulate a flare, an RPM time history or an aircraft operating limit.</p>';
    };
    slider(ui.controls,{label:'Rotor RPM (% of reference)',min:50,max:110,step:5,val:rpm,unit:'%',on:v=>{rpm=v;draw();}});
    ui.onDraw(draw);
  }

  function wLearningWorkspace(host,config={}) {
    host.innerHTML='';
    const models=config.models||[['wBladeElement','Blade element']];
    const bar=el('div','hl-workspace-views'),mount=el('div','hl-workspace-model');
    bar.setAttribute('role','group');bar.setAttribute('aria-label','Choose evidence model');
    host.append(bar,mount);
    let active=null,handle=null,states={};
    const open=name=>{
      if(active&&mount._hlModel)states[active]=mount._hlModel.get();
      handle?.dispose();active=name;handle=HLW[name](mount);
      if(states[name])mount._hlModel.set(states[name]);
      for(const b of bar.querySelectorAll('button')){b.classList.toggle('on',b.dataset.model===name);b.setAttribute('aria-pressed',String(b.dataset.model===name));}
    };
    for(const [name,label] of models){const b=el('button','hl-foot-btn',label);b.type='button';b.dataset.model=name;b.onclick=()=>open(name);bar.append(b);}
    open(models[0][0]);
    host._hlModel={
      get:()=>{states[active]=mount._hlModel.get();return {...states[active],model:active,workspace:states};},
      set:x=>{states=x.workspace&&typeof x.workspace==='object'?x.workspace:{};const name=models.some(([n])=>n===x.model)?x.model:models[0][0];active=null;open(name);mount._hlModel.set(x);},
      evidence:()=>mount._hlModel.evidence?.()||{}
    };
    return {dispose:()=>handle?.dispose()};
  }

  const registry = {
    wRotorEnergy, wLearningWorkspace, wTwistComparison,
    wCBTGroundEffect, wBigPicture, wBladeElement, wM104BladeElement, wSpanwise, wHover, wM2HoverWhy, wM2RotorFlowPower, wM2ChangeDemand, wVertical, wGroundEffect,
    wDissymmetry, wFlapping, wFlappingRoll, wEnvelope, wCoriolis, wDynamicRollover, wLTE,
    wAutorotation, wPerformance, wBetDiagram, wBetVelocity, wBetModel,
    wSandbox, wRotorTeaser, wGuidedRotorLab,

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
  return Object.fromEntries(Object.entries(registry).map(([name, fn]) => [name, (host, ...args) => {
    host._hlDisposers = [];
    host._hlModel = null;
    host.dataset.model = name;
    const handle = fn(host, ...args);
    host._hlModel ||= HLModelState.controls(host);
    let disposed = false;
    return { ...(handle && typeof handle === 'object' ? handle : {}), dispose() {
      if (disposed) return; disposed = true;
      if (typeof handle === 'function') handle(); else handle?.dispose?.();
      host._hlDisposers.splice(0).forEach(fn => fn());
    } };
  }]));
})();
