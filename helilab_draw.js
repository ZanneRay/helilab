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
  /* label with a translucent rounded background chip so text never becomes
     unreadable when it lands on top of the airfoil or a vector. */
  function chipLabel(ctx, str, x, y, color, font, align, bg) {
    font = font || '11px IBM Plex Sans, sans-serif';
    align = align || 'left';
    ctx.font = font; ctx.textBaseline = 'middle';
    const w = ctx.measureText(str).width, h = parseInt(font, 10) + 4;
    let bx = x;
    if (align === 'center') bx = x - w / 2;
    else if (align === 'right') bx = x - w;
    ctx.save();
    ctx.fillStyle = bg || 'rgba(13,17,23,0.72)';
    const pad = 3, r = 4, rx = bx - pad, ry = y - h / 2, rw = w + pad * 2, rh = h;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r); ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function bladeSection(ctx, ox, oy, len, opts, col) {
    const th = opts.theta, ph = opts.phi, A = opts.ampl || 1;
    const thV = th * A, phV = Math.min(thV - 0.01, ph * A);
    const aCol = opts.stall ? col.bad : (opts.aoa != null && opts.aoa < 0.035 ? col.warn : col.lift);

    // disc-plane reference — extend both ways; label sits at the far right end,
    // clear of the busy origin cluster.
    dline(ctx, ox - len * 0.34, oy, ox + len * 1.12, oy, col.dim, 1, [5, 4]);
    chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');

    // relative wind arrow (tail upstream → head at LE)
    const wlen = len * 0.92;
    const wtx = ox + wlen * Math.cos(phV), wty = oy - wlen * Math.sin(phV);
    arrow(ctx, wtx, wty, ox, oy, col.wind, 2.2, 10);
    chipLabel(ctx, 'V_rel', ox + wlen * 0.80 * Math.cos(phV), oy - wlen * 0.80 * Math.sin(phV) - 12, col.wind, 'bold 11px IBM Plex Sans', 'center');

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
    // label at the airfoil leading edge (far side) — pushed clear of the chord line
    const lex = ox + ac * Math.cos(thV), ley = oy - ac * Math.sin(thV);
    chipLabel(ctx, opts.airfoilName || 'NACA 0012', lex + 8, ley - 12, col.chord, '10px IBM Plex Sans', 'left');

    // arcs: θ (plane→chord), φ (plane→wind), α (wind→chord)
    // Staggered radii + chip labels placed on the arc mid-angle so the three
    // readouts never stack on top of each other near the busy origin.
    const arcLbl = (r, a0, a1, color, str, font, dy) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, r, a0, a1, a1 < a0); ctx.stroke();
      const m = (a0 + a1) / 2;
      chipLabel(ctx, str, ox + (r + 12) * Math.cos(m), oy + (r + 12) * Math.sin(m) + (dy || 0), color, font || '11px IBM Plex Sans', 'center');
    };
    // θ (chord vs plane) small inner arc, label above; φ (wind vs plane) mid arc,
    // label biased down toward the wind. α (=θ−φ) is the exam angle: draw its
    // wedge between the two vectors and place the chip straight up into the clear
    // space above the origin so it never lands on V_rel or the airfoil.
    const aScale = len < 140 ? len / 140 : 1;          // shrink arcs on a small airfoil / inset (mobile)
    arcLbl(40 * aScale, 0, -thV, col.chord, 'θ ' + (th * 180 / Math.PI).toFixed(1) + '°', null, len < 140 ? -12 : -6);
    arcLbl(64 * aScale, 0, -phV, col.wind, 'φ ' + (ph * 180 / Math.PI).toFixed(1) + '°', null, 12);
    // α wedge drawn between the wind and chord vectors; its chip is anchored in
    // the clear headroom above the origin with a thin leader line back to the
    // wedge, so it stays readable even when θ and φ are both nearly horizontal.
    const aMid = (thV + phV) / 2;
    ctx.strokeStyle = aCol; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(ox, oy, 88 * aScale, -phV, -thV, -thV < -phV); ctx.stroke();
    const wedgeX = ox + 88 * aScale * Math.cos(aMid), wedgeY = oy - 88 * aScale * Math.sin(aMid);
    const aLblX = ox + len * 0.30, aLblY = oy - len * 0.42;   // up-right, into empty space
    dline(ctx, wedgeX, wedgeY, aLblX, aLblY + 6, aCol, 1, [2, 3]);
    chipLabel(ctx, 'α ' + ((th - ph) * 180 / Math.PI).toFixed(1) + '° (AoA)',
      aLblX, aLblY, aCol, 'bold 12px IBM Plex Sans', 'center');

    // forces (L and D drawn ~2× for visibility — they are schematic, not to scale)
    if ((opts.showForces || opts.showResolve) && !opts.stall) {
      const fL = Math.max(0, opts.cl || 0) * (len * 0.84);
      const fD = Math.max(0, opts.cd || 0) * (len * 8.0);
      // canvas-frame force components (y is down)
      const Lx = -fL * Math.sin(phV), Ly = -fL * Math.cos(phV);   // lift ⟂ wind (up-ish)
      const Dx = -fD * Math.cos(phV), Dy =  fD * Math.sin(phV);   // drag ∥ wind (downstream)
      if (opts.showForces) {
        arrow(ctx, ox, oy, ox + Lx, oy + Ly, col.lift, 2.4, 9);
        // L label on the LEFT-perpendicular side of lift (opposite the TAF label,
        // which sits on the right-perp) — keeps the two near-collinear labels apart.
        const lmag = Math.hypot(Lx, Ly) || 1;
        chipLabel(ctx, 'L', ox + Lx - (Ly / lmag) * 16, oy + Ly + (Lx / lmag) * 16, col.lift, 'bold 11px IBM Plex Sans', 'center');
        arrow(ctx, ox, oy, ox + Dx, oy + Dy, col.drag, 2.0, 8);
        chipLabel(ctx, 'D', ox + Dx - 10, oy + Dy + 8, col.drag, '10px IBM Plex Sans', 'center');
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
        // TAF direction + right-perpendicular (screen y-down: right-perp of (a,b) = (b,-a))
        const tmag = Math.hypot(Tx, Ty) || 1;
        const tpx = Ty / tmag, tpy = -Tx / tmag;
        // thrust (vertical) and F_H (horizontal) vectors
        arrow(ctx, ox, oy, ox, oy + Ty, col.good, 2.4, 9);
        chipLabel(ctx, 'Thrust', ox - 44, oy + Ty + (Ty < 0 ? 4 : -12), col.good, 'bold 10px IBM Plex Sans', 'right');
        const fhCol = Tx > 0 ? col.good : col.warn;
        arrow(ctx, ox, oy, ox + Tx, oy, fhCol, 2.4, 9);
        // F_H label dropped clear below the arcs: at small/negative φ the φ arc chip
        // swings down onto the plane line, so keep F_H well beneath it (label-only).
        chipLabel(ctx, 'F_H ×6', ox + Tx + (Tx < 0 ? -20 : 20), oy + 28, fhCol, 'bold 10px IBM Plex Sans', Tx < 0 ? 'right' : 'left');
        // TAF resultant — label on the right-perpendicular side, away from L
        arrow(ctx, ox, oy, ox + Tx, oy + Ty, tafCol, 2.6, 10);
        chipLabel(ctx, 'TAF', ox + Tx + tpx * 18, oy + Ty + tpy * 18, tafCol, 'bold 11px IBM Plex Sans', 'center');
      }
    }
    // velocity-triangle construction (opt-in): decompose V_rel into its
    // in-plane rotational component v_rot = U_T (along the rotor plane, head →
    // leading edge) and its perpendicular induced component v_i = U_P (head
    // down to the plane). The two legs meet at a right angle at the foot of the
    // V_rel tail; V_rel is the hypotenuse, so V_rel = v_rot + v_i with
    // tan φ = v_i / v_rot. Convention matches the BET velocity-triangle tab
    // (v_rot along the plane toward the airfoil, v_i downward). Drawn thin so
    // the bold V_rel / forces stay dominant.
    if (opts.showVelocity) {
      const fX = wtx, fY = oy;                              // right-angle corner (on the plane)
      arrow(ctx, fX, fY, ox, fY, col.wind, 1.5, 7);        // v_rot leg (∥ plane, head → LE)
      arrow(ctx, wtx, wty, fX, fY, col.wind, 1.5, 7);       // v_i leg (⟂ plane, head → plane)
      const sq = 5;                                        // right-angle marker (upper-left of corner)
      dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
      dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
      chipLabel(ctx, 'v_rot', (fX + ox) / 2, fY + 12, col.wind, 'bold 10px IBM Plex Sans', 'center');
      chipLabel(ctx, 'v_i', fX - 7, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
      // at low φ the v_i leg (x = wtx) can cross the far-right "rotor plane" label;
      // re-stamp it on top so its background masks the crossing (leg reads as passing behind).
      chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
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

    // marker dashed lines (drawn UNDER the series so the curve reads on top)
    (markers || []).forEach(m => {
      const x = sx(m.x);
      dline(ctx, x, y0, x, y1, m.color, 1.5, [4, 3]);
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

    // marker LABELS (drawn OVER the series, each on a knockout box so a crossing
    // curve never renders them illegible — fixes RET/ADV struck by β(ψ) on tab 7).
    // Near the right edge the label flips to the LEFT of its line so it never
    // collides with the series legend that lives in the top-right corner.
    (markers || []).forEach(m => {
      const x = sx(m.x);
      const ly = W < 420 ? y0 - 4 : y1 + 4, base = W < 420 ? 'bottom' : 'top';
      ctx.font = '9px IBM Plex Sans';
      const tw = ctx.measureText(m.label).width;
      const flip = x > x1 - 96;                 // too close to the right-edge legend
      const lx = flip ? x - 3 : x + 3;
      const boxX = flip ? x - tw - 4 : x + 2;
      const boxY = base === 'top' ? ly - 1 : ly - 10;
      ctx.fillStyle = col.bg || '#0b0e14'; ctx.globalAlpha = 0.82;
      ctx.fillRect(boxX, boxY, tw + 3, 11); ctx.globalAlpha = 1;
      text(ctx, m.label, lx, ly, m.color, '9px IBM Plex Sans', flip ? 'right' : 'left', base);
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
    // The right-side ADV label can be suppressed when the caller overlays its own
    // ADV/RET bar chart in that gutter (tab 6) — avoids the bar clipping the text.
    // RET (left) stays: nothing is drawn there.
    if (!opts.hideAdvLabel) text(ctx, 'ADV 90°', cx + R + 4, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
    text(ctx, 'RET 270°', cx - R - 4, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
    text(ctx, 'TAIL 0°', cx, cy + R + 14, col.dim, '10px IBM Plex Sans', 'center');
    // forward-flight direction arrow (points down toward the disc). When present it
    // occupies the space directly above NOSE, so offset the NOSE label to the left
    // to keep the arrow from piercing the text.
    if (opts.V) {
      arrow(ctx, cx, cy - R - 22, cx, cy - R - 6, col.accent, 2, 7);
      text(ctx, 'NOSE 180°', cx - 30, cy - R - 6, col.dim, '10px IBM Plex Sans', 'right', 'middle');
    } else {
      text(ctx, 'NOSE 180°', cx, cy - R - 6, col.dim, '10px IBM Plex Sans', 'center');
    }
  }

  /* map rotor azimuth ψ (0 aft, 90 adv) to canvas angle */
  function polarToCanvas(psi) { return Math.PI / 2 - psi; }   // 0→down, 90→right

  /* ── Constant-value iso-lines over the rotor disc (marching squares) ─────────
     Draws contour lines of a scalar field field(rBar, psiRad) over the disc
     (rMin..1, ψ 0..2π) at each level in `levels`. `field` should return null for
     cells to skip (e.g. reverse flow), so contours don't cross meaningless zones.
     Labels each iso-line with its value near ψ≈250° (retreating, where the
     high-AoA rings bunch up). cx,cy,R map the unit disc to canvas. */
  function discIso(ctx, cx, cy, R, field, levels, opts) {
    opts = opts || {};
    const nr = opts.nr || 44, np = opts.np || 144, rMin = opts.rMin != null ? opts.rMin : 0.15;
    const color = opts.color || 'rgba(20,25,35,0.55)';
    const font = opts.font || '9px IBM Plex Sans';
    // sample the field on a polar grid
    const rs = [], ps = [], grid = [];
    for (let i = 0; i <= nr; i++) rs.push(rMin + (1 - rMin) * i / nr);
    for (let j = 0; j <= np; j++) ps.push((j / np) * 2 * Math.PI);
    for (let i = 0; i <= nr; i++) {
      grid.push([]);
      for (let j = 0; j <= np; j++) grid[i].push(field(rs[i], ps[j]));
    }
    const toXY = (r, p) => {
      const a = polarToCanvas(p);
      return [cx + R * r * Math.cos(a), cy + R * r * Math.sin(a)];
    };
    ctx.save();
    ctx.lineWidth = opts.width || 1;
    ctx.strokeStyle = color;
    // interpolate crossing on an edge between two grid nodes
    const cross = (r0, p0, v0, r1, p1, v1, L) => {
      const t = (L - v0) / (v1 - v0);
      return toXY(r0 + (r1 - r0) * t, p0 + (p1 - p0) * t);
    };
    const labelPts = [];
    for (const L of levels) {
      ctx.beginPath();
      for (let i = 0; i < nr; i++) {
        for (let j = 0; j < np; j++) {
          const a = grid[i][j], b = grid[i][j + 1], c2 = grid[i + 1][j + 1], d = grid[i + 1][j];
          if (a == null || b == null || c2 == null || d == null) continue;
          // marching squares on the quad (i,j)-(i,j+1)-(i+1,j+1)-(i+1,j)
          const pts = [];
          const edge = (ra, pa, va, rb, pb, vb) => {
            if ((va - L) * (vb - L) < 0) pts.push(cross(ra, pa, va, rb, pb, vb, L));
          };
          edge(rs[i], ps[j], a, rs[i], ps[j + 1], b);
          edge(rs[i], ps[j + 1], b, rs[i + 1], ps[j + 1], c2);
          edge(rs[i + 1], ps[j + 1], c2, rs[i + 1], ps[j], d);
          edge(rs[i + 1], ps[j], d, rs[i], ps[j], a);
          if (pts.length >= 2) {
            ctx.moveTo(pts[0][0], pts[0][1]);
            ctx.lineTo(pts[1][0], pts[1][1]);
            // remember a label anchor near the retreating side (ψ≈250°)
            if (Math.abs(ps[j] - 250 * Math.PI / 180) < 0.09) labelPts.push([pts[0][0], pts[0][1], L]);
          }
        }
      }
      ctx.stroke();
    }
    if (opts.label !== false) {
      // keep only ONE label per level, and drop any that would sit too close to an
      // already-placed label — otherwise several contour segments of the same level
      // (and adjacent levels) bunch up on the retreating side into an illegible
      // smudge (tab 8). One clean number per iso-ring is enough.
      const placed = [];
      const seen = new Set();
      for (const [lx, ly, L] of labelPts) {
        if (seen.has(L)) continue;
        if (placed.some(([px, py]) => Math.abs(px - lx) < 18 && Math.abs(py - ly) < 12)) continue;
        seen.add(L); placed.push([lx, ly]);
        // knockout box so the number reads over the coloured disc + grid
        ctx.font = font;
        const s = (opts.fmt ? opts.fmt(L) : L + '\u00b0');
        const tw = ctx.measureText(s).width;
        ctx.fillStyle = COL().bg || '#0d1117'; ctx.globalAlpha = 0.85;
        ctx.fillRect(lx - tw / 2 - 1, ly - 6, tw + 2, 12); ctx.globalAlpha = 1;
        // label text uses a light ink (the iso-line stroke colour is deliberately
        // dark for the coloured disc, but that is unreadable on the knockout box)
        text(ctx, s, lx, ly, opts.labelColor || COL().ink, font, 'center', 'middle');
      }
    }
    ctx.restore();
  }

  /* Side-view helicopter wireframe (precomputed in helilab_model2d.js).
     Draws the H145 fuselage as line art, with optional bank/roll.
     opts:
       cx, cy     — screen position of the 'anchor' model point (default = hub)
       scale      — pixels per normalized model unit (model x spans 0..1)
       rollRad    — bank angle (rad); + rolls the body to the right (nose-right view)
       anchor     — {x,y} normalized model point that maps to (cx,cy)  [default hub]
       pivot      — {x,y} normalized model point the body rolls about  [default anchor]
       color,width,alpha — stroke style
     The transform: rotate model points about `pivot` by rollRad, then translate so
     that `anchor` lands on (cx,cy). Screen y is inverted (up = −y). */
  function drawHeliWire(ctx, opts) {
    const M = window.HL_MODEL2D; if (!M || !M.lines) return;
    const cx = opts.cx, cy = opts.cy, S = opts.scale;
    const anchor = opts.anchor || M.hub;
    const pivot  = opts.pivot  || anchor;
    const roll = opts.rollRad || 0;
    const color = opts.color || COL().dim;
    const width = opts.width || 1.3;
    const alpha = opts.alpha != null ? opts.alpha : 0.92;
    const cos = Math.cos(roll), sin = Math.sin(roll);
    const X = (px, py) => {
      const dx = px - pivot.x, dy = py - pivot.y;
      const rx = dx * cos - dy * sin, ry = dx * sin + dy * cos;
      const wx = pivot.x + rx, wy = pivot.y + ry;
      return [ cx + (wx - anchor.x) * S, cy - (wy - anchor.y) * S ];
    };
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    for (const ln of M.lines) {
      for (let i = 0; i < ln.length; i++) {
        const p = X(ln[i][0], ln[i][1]);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  return { css, COL, setup, clear, grid, arrow, dline, arc, text, dot, hatchRect, tick,
           chipLabel, bladeSection, nacaProfile, lineChart, discPolar, discIso, polarToCanvas, fmt,
           drawHeliWire };
})();
