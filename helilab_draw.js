/* ===========================================================================
   helilab_draw.js — reusable Canvas-2D drawing primitives for HeliLab widgets
   ===========================================================================
   Small, dependency-free helpers shared by every lesson widget so each widget
   stays short. Colours come from CSS custom properties via getComputedStyle so
   the diagrams follow the app theme.
   =========================================================================== */
'use strict';

const HLD = (function () {

  /* theme colour lookup (cached per paint) */
  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  const COL = () => ({
    bg:    css('--hl-canvas', '#0d1117'),
    grid:  css('--hl-grid',   'rgba(120,140,170,0.10)'),
    ink:   css('--hl-ink',    '#e6edf3'),
    dim:   css('--hl-dim',    '#8b9bb4'),
    accent:css('--hl-accent', '#38bdf8'),
    chord: css('--hl-chord',  '#fb923c'),
    lift:  css('--hl-lift',   '#34d399'),
    drag:  css('--hl-drag',   '#f87171'),
    wind:  css('--hl-wind',   '#38bdf8'),
    warn:  css('--hl-warn',   '#fbbf24'),
    bad:   css('--hl-bad',    '#f87171'),
    good:  css('--hl-good',   '#34d399'),
  });

  /* HiDPI-aware setup. Returns { ctx, W, H } in CSS pixels. */
  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const W = Math.max(10, Math.round(r.width));
    const H = Math.max(10, Math.round(r.height));
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr; canvas.height = H * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H, col: COL() };
  }

  function clear(ctx, W, H, col) {
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
  }

  /* faint background grid */
  function grid(ctx, W, H, col, step) {
    step = step || 28;
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    for (let x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  /* arrowhead-terminated line from (x1,y1)→(x2,y2) */
  function arrow(ctx, x1, y1, x2, y2, color, width, head) {
    width = width || 2; head = head || 9;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.lineCap = 'butt';
  }

  /* dashed line */
  function dline(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1;
    ctx.setLineDash(dash || [5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  /* angle arc between two canvas-space angles (rad), with optional label */
  function arc(ctx, cx, cy, r, a0, a1, color, label, font) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, a1 < a0); ctx.stroke();
    if (label) {
      const m = (a0 + a1) / 2;
      ctx.fillStyle = color; ctx.font = font || '11px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, cx + (r + 6) * Math.cos(m), cy + (r + 6) * Math.sin(m));
    }
  }

  function text(ctx, str, x, y, color, font, align, baseline) {
    ctx.fillStyle = color; ctx.font = font || '11px IBM Plex Sans, sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function dot(ctx, x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  }

  /* diagonal hatch fill of a rectangle (colour-vision-deficiency aid) */
  function hatchRect(ctx, x, y, w, h, color, gap, ang) {
    gap = gap || 6; ang = ang == null ? Math.PI / 4 : ang;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    const dx = Math.cos(ang), dy = Math.sin(ang), L = w + h;
    for (let s = -h; s < w + h; s += gap) {
      ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + s + dy * L, y + dx * L); ctx.stroke();
    }
    ctx.restore();
  }

  /* short centred tick at (x,y) — used to texture polar cells for CVD */
  function tick(ctx, x, y, len, ang, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 1;
    const c = Math.cos(ang) * len / 2, s = Math.sin(ang) * len / 2;
    ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke();
  }

  /* ── NACA 4-digit airfoil contour ─────────────────────────────────────────
     Returns a closed list of {x,y} (x: 0..1 along chord, y: thickness) tracing
     upper surface LE→TE then lower surface TE→LE. Default NACA 0012 — the classic
     symmetric section used on many helicopter rotor blades (Bo105, etc.).
     For a cambered section (e.g. 23012) pass m,p; default symmetric (m=0). */
  function nacaProfile(t, N, m, p) {
    t = t || 0.12; N = N || 60; m = m || 0; p = p || 0.4;
    const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x
      - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
    const yc = x => m === 0 ? 0 : (x < p ? (m / (p * p)) * (2 * p * x - x * x)
      : (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x));
    const up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const x = 0.5 * (1 - Math.cos(Math.PI * i / N));   // cosine spacing (fine LE)
      const th = yt(x), c = yc(x);
      up.push({ x, y: c + th });
      lo.push({ x, y: c - th });
    }
    return up.concat(lo.reverse());                       // closed contour
  }
  const NACA0012 = nacaProfile(0.12, 56);

  /* ── Blade-element section diagram ─────────────────────────────────────────
     Draws a 2-D airfoil section with chord at pitch θ, the relative-wind vector
     at inflow angle φ, and (optionally) lift ⟂ wind and drag ∥ wind. Angles are
     visually amplified by `ampl` (real helicopter angles are small). All vectors
     originate at the chord reference point (ox,oy); the rounded leading edge faces
     the relative wind (far end). opts: { theta, phi, ampl, showForces, showResolve,
     cl, cd, stall, airfoil }. All angles in radians. Returns nothing. */
  function bladeSection(ctx, ox, oy, len, opts, col) {
    const th = opts.theta, ph = opts.phi, A = opts.ampl || 1;
    const thV = th * A, phV = Math.min(thV - 0.01, ph * A);
    const aCol = opts.stall ? col.bad : (opts.aoa != null && opts.aoa < 0.035 ? col.warn : col.lift);

    // disc-plane reference
    dline(ctx, ox - 14, oy, ox + len + 14, oy, col.dim, 1, [5, 4]);
    text(ctx, 'rotor plane', ox - 12, oy - 5, col.dim, '10px IBM Plex Sans');

    // relative wind arrow (tail upstream → head at LE)
    const wlen = len * 0.92;
    const wtx = ox + wlen * Math.cos(phV), wty = oy - wlen * Math.sin(phV);
    arrow(ctx, wtx, wty, ox, oy, col.wind, 2.2, 10);
    text(ctx, 'V_rel', (ox + wtx) / 2, (oy + wty) / 2 - 8, col.wind, 'bold 11px IBM Plex Sans', 'center');

    // airfoil — NACA 0012 section, ~40% of the chord, centred on the chord line.
    // Reversed along x so the rounded LEADING EDGE points into the relative wind
    // (the far end), with the trailing edge toward the origin. (Symmetric section,
    // so the x-reversal is exact; a cambered profile would need its camber flipped.)
    const prof = opts.airfoil || NACA0012;
    const ac  = 0.42 * len;                 // airfoil chord ≈ 40% of drawn chord
    ctx.save();
    ctx.translate(ox, oy); ctx.rotate(-thV);                 // +x along chord toward LE/far end
    // chord centreline (origin → leading edge), dashed
    ctx.strokeStyle = col.chord; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ac, 0); ctx.stroke(); ctx.setLineDash([]);
    // airfoil body — trailing edge at the origin (X=0), leading edge at X=ac (far/wind)
    ctx.fillStyle = col.chord; ctx.lineWidth = 1.6;
    ctx.beginPath();
    prof.forEach((p, i) => {
      const X = (1 - p.x) * ac;              // reverse: TE (p.x=1) → origin, LE (p.x=0) → far
      const Y = -p.y * ac;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    ctx.restore();
    dot(ctx, ox, oy, 4, col.chord);
    // label at the airfoil leading edge (far side)
    const lex = ox + ac * Math.cos(thV), ley = oy - ac * Math.sin(thV);
    text(ctx, opts.airfoilName || 'NACA 0012', lex + 6, ley - 5, col.chord, '10px IBM Plex Sans');

    // arcs: θ (plane→chord), φ (plane→wind), α (wind→chord)
    arc(ctx, ox, oy, 34, 0, -thV, col.chord,
        'θ ' + (th * 180 / Math.PI).toFixed(1) + '°');
    arc(ctx, ox, oy, 52, 0, -phV, col.wind,
        'φ ' + (ph * 180 / Math.PI).toFixed(1) + '°');
    arc(ctx, ox, oy, 70, -phV, -thV, aCol,
        'α ' + ((th - ph) * 180 / Math.PI).toFixed(1) + '°', 'bold 12px IBM Plex Sans');

    // forces (L and D drawn ~2× for visibility — they are schematic, not to scale)
    if ((opts.showForces || opts.showResolve) && !opts.stall) {
      const fL = Math.max(0, opts.cl || 0) * (len * 0.84);
      const fD = Math.max(0, opts.cd || 0) * (len * 8.0);
      // canvas-frame force components (y is down)
      const Lx = -fL * Math.sin(phV), Ly = -fL * Math.cos(phV);   // lift ⟂ wind (up-ish)
      const Dx = -fD * Math.cos(phV), Dy =  fD * Math.sin(phV);   // drag ∥ wind (downstream)
      if (opts.showForces) {
        arrow(ctx, ox, oy, ox + Lx, oy + Ly, col.lift, 2.4, 9);
        text(ctx, 'L', ox + Lx - 2, oy + Ly - 6, col.lift, 'bold 11px IBM Plex Sans', 'center');
        arrow(ctx, ox, oy, ox + Dx, oy + Dy, col.drag, 2.0, 8);
        text(ctx, 'D', ox + Dx - 6, oy + Dy + 4, col.drag, '10px IBM Plex Sans', 'right');
      }
      // resolve TAF = L + D into thrust (⟂ rotor plane) and F_H (in-plane).
      // Computed from the TRUE inflow angle and one common force scale — NOT from
      // the display-exaggerated L/D above (their unequal scales can flip the
      // apparent F_H direction). The tiny in-plane component is exaggerated ×6
      // for visibility, sign preserved. +x = direction of blade travel (drives).
      if (opts.showResolve) {
        const S = len * 0.75, FH_X = 6;
        const fHtrue = (opts.cl || 0) * Math.sin(ph) + (opts.cd || 0) * Math.cos(ph); // >0 = aft (brakes)
        const fTtrue = (opts.cl || 0) * Math.cos(ph) - (opts.cd || 0) * Math.sin(ph); // >0 = up (thrust)
        const Tx = -fHtrue * S * FH_X;
        const Ty = -fTtrue * S;
        const tafCol = '#c084fc';
        // component rectangle (dashed)
        dline(ctx, ox, oy, ox + Tx, oy, col.dim, 1, [3, 3]);          // along plane
        dline(ctx, ox + Tx, oy, ox + Tx, oy + Ty, col.dim, 1, [3, 3]);
        dline(ctx, ox, oy, ox, oy + Ty, col.dim, 1, [3, 3]);          // vertical
        dline(ctx, ox, oy + Ty, ox + Tx, oy + Ty, col.dim, 1, [3, 3]);
        // thrust (vertical) and F_H (horizontal) vectors
        arrow(ctx, ox, oy, ox, oy + Ty, col.good, 2.4, 9);
        text(ctx, 'Thrust', ox + 4, oy + Ty + (Ty < 0 ? -4 : 12), col.good, 'bold 10px IBM Plex Sans');
        const fhCol = Tx > 0 ? col.good : col.warn;
        arrow(ctx, ox, oy, ox + Tx, oy, fhCol, 2.4, 9);
        text(ctx, 'F_H', ox + Tx + (Tx < 0 ? -16 : 4), oy - 5, fhCol, 'bold 10px IBM Plex Sans');
        text(ctx, '(×6)', ox + Tx + (Tx < 0 ? -16 : 4), oy + 7, col.dim, '8px IBM Plex Sans');
        // TAF resultant
        arrow(ctx, ox, oy, ox + Tx, oy + Ty, tafCol, 2.6, 10);
        text(ctx, 'TAF', ox + Tx + 4, oy + Ty + 4, tafCol, 'bold 11px IBM Plex Sans');
      }
    }
    if (opts.stall) {
      text(ctx, '⚠ STALLED', ox + len * 0.45, oy - len * 0.4, col.bad, 'bold 13px IBM Plex Sans', 'center');
    }
  }

  /* ── Simple multi-series line chart ─────────────────────────────────────────
     series: [{ pts:[{x,y}], color, width, label, dash }], axes:{xmin,xmax,ymin,ymax,xlab,ylab}.
     markers: [{x, color, label}] vertical lines. */
  function lineChart(ctx, W, H, series, axes, col, markers) {
    const padL = 46, padR = 14, padT = 14, padB = 30;
    const x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    const sx = v => x0 + (v - axes.xmin) / (axes.xmax - axes.xmin) * (x1 - x0);
    const sy = v => y0 + (v - axes.ymin) / (axes.ymax - axes.ymin) * (y1 - y0);

    // grid + ticks
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    ctx.fillStyle = col.dim; ctx.font = '10px IBM Plex Sans'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const yv = axes.ymin + (axes.ymax - axes.ymin) * i / 4, y = sy(yv);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(fmt(yv), x0 - 5, y);
    }
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const xv = axes.xmin + (axes.xmax - axes.xmin) * i / 4, x = sx(xv);
      ctx.textAlign = 'center'; ctx.fillText(fmt(xv), x, y0 + 6);
    }
    // axis labels
    if (axes.xlab) text(ctx, axes.xlab, (x0 + x1) / 2, H - 4, col.dim, '10px IBM Plex Sans', 'center');
    if (axes.ylab) { ctx.save(); ctx.translate(11, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
      text(ctx, axes.ylab, 0, 0, col.dim, '10px IBM Plex Sans', 'center'); ctx.restore(); }

    // markers
    (markers || []).forEach(m => {
      const x = sx(m.x);
      dline(ctx, x, y0, x, y1, m.color, 1.5, [4, 3]);
      text(ctx, m.label, x + 3, y1 + 4, m.color, '9px IBM Plex Sans', 'left', 'top');
    });

    // series
    series.forEach(s => {
      if (!s.pts.length) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2;
      ctx.save(); if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      s.pts.forEach((p, i) => { const X = sx(p.x), Y = sy(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.restore();
    });

    // legend
    let ly = y1 + 4;
    series.filter(s => s.label).forEach(s => {
      ctx.fillStyle = s.color; ctx.fillRect(x1 - 90, ly + 3, 14, 3);
      text(ctx, s.label, x1 - 72, ly, col.ink, '10px IBM Plex Sans', 'left', 'top');
      ly += 14;
    });
    return { sx, sy, x0, x1, y0, y1 };
  }

  function fmt(v) {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'k';
    if (Math.abs(v) >= 10) return v.toFixed(0);
    if (Math.abs(v) >= 1) return v.toFixed(1);
    return v.toFixed(2);
  }

  /* ── Rotor-disc polar (top view) coloured/segmented by a function of ψ ──────
     fn(psiRad) → { value, color }. Draws ψ=0 aft (bottom), 90 advancing (right),
     180 fwd (top), 270 retreating (left). Optionally a radial bar of `value`. */
  function discPolar(ctx, cx, cy, R, fnColor, col, opts) {
    opts = opts || {};
    const seg = 72;
    for (let i = 0; i < seg; i++) {
      const p0 = (i / seg) * 2 * Math.PI, p1 = ((i + 1) / seg) * 2 * Math.PI;
      const pm = (p0 + p1) / 2;
      const c = fnColor(pm);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      // canvas: ψ measured so 90°(adv)→right(+x), 0(aft)→down(+y).
      // anticlockwise=true makes the wedge sweep exactly p0→p1 (canvas angle
      // decreases with ψ) instead of relying on implicit sweep normalisation.
      ctx.arc(cx, cy, R, polarToCanvas(p0), polarToCanvas(p1), true);
      ctx.closePath(); ctx.fill();
    }
    // outline + cross
    ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    dline(ctx, cx - R, cy, cx + R, cy, col.grid, 1, [4, 4]);
    dline(ctx, cx, cy - R, cx, cy + R, col.grid, 1, [4, 4]);
    // labels
    text(ctx, 'ADV 90°', cx + R + 4, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
    text(ctx, 'RET 270°', cx - R - 4, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
    text(ctx, 'NOSE 180°', cx, cy - R - 6, col.dim, '10px IBM Plex Sans', 'center');
    text(ctx, 'TAIL 0°', cx, cy + R + 14, col.dim, '10px IBM Plex Sans', 'center');
    // forward-flight direction
    if (opts.V) arrow(ctx, cx, cy - R - 22, cx, cy - R - 6, col.accent, 2, 7);
  }

  /* map rotor azimuth ψ (0 aft, 90 adv) to canvas angle */
  function polarToCanvas(psi) { return Math.PI / 2 - psi; }   // 0→down, 90→right

  return { css, COL, setup, clear, grid, arrow, dline, arc, text, dot, hatchRect, tick,
           bladeSection, nacaProfile, lineChart, discPolar, polarToCanvas, fmt };
})();
