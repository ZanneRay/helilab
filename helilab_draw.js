/* ===========================================================================
   helilab_draw.js — reusable Canvas-2D drawing primitives for HeliLab widgets
   =========================================================================== */
'use strict';

const HLD = (function () {

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

  function grid(ctx, W, H, col, step) {
    step = step || 28;
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    for (let x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

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

  function dline(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1;
    ctx.setLineDash(dash || [5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

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

  function tick(ctx, x, y, len, ang, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 1;
    const c = Math.cos(ang) * len / 2, s = Math.sin(ang) * len / 2;
    ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke();
  }

  function nacaProfile(t, N, m, p) {
    t = t || 0.12; N = N || 60; m = m || 0; p = p || 0.4;
    const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x
      - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
    const yc = x => m === 0 ? 0 : (x < p ? (m / (p * p)) * (2 * p * x - x * x)
      : (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x));
    const up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const x = 0.5 * (1 - Math.cos(Math.PI * i / N));
      const th = yt(x), c = yc(x);
      up.push({ x, y: c + th });
      lo.push({ x, y: c - th });
    }
    return up.concat(lo.reverse());
  }
  const NACA0012 = nacaProfile(0.12, 56);

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
    const showChord   = opts.showChord   !== false;
    const showWind    = opts.showWind    !== false;
    const showPhiArc  = opts.showPhiArc  !== undefined ? opts.showPhiArc : showWind;
    const showAlphaArc= opts.showAlphaArc!== false;

    dline(ctx, ox - len * 0.34, oy, ox + len * 1.12, oy, col.dim, 1, [5, 4]);
    chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');

    const wlen = len * 0.92;
    const wtx = ox + wlen * Math.cos(phV), wty = oy - wlen * Math.sin(phV);
    if (showWind) {
      arrow(ctx, wtx, wty, ox, oy, col.wind, 2.2, 10);
      chipLabel(ctx, 'V_rel', ox + wlen * 0.80 * Math.cos(phV), oy - wlen * 0.80 * Math.sin(phV) - 12, col.wind, 'bold 11px IBM Plex Sans', 'center');
    }

    const prof = opts.airfoil || NACA0012;
    const ac  = 0.42 * len;
    if (showChord) {
      ctx.save();
      ctx.translate(ox, oy); ctx.rotate(-thV);
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
      dot(ctx, ox, oy, 4, col.chord);
      const lex = ox + ac * Math.cos(thV), ley = oy - ac * Math.sin(thV);
      chipLabel(ctx, opts.airfoilName || 'NACA 0012', lex + 8, ley - 12, col.chord, '10px IBM Plex Sans', 'left');
    }

    const arcLbl = (r, a0, a1, color, str, font, dy) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, r, a0, a1, a1 < a0); ctx.stroke();
      const m = (a0 + a1) / 2;
      chipLabel(ctx, str, ox + (r + 12) * Math.cos(m), oy + (r + 12) * Math.sin(m) + (dy || 0), color, font || '11px IBM Plex Sans', 'center');
    };
    const aScale = len < 140 ? len / 140 : 1;
    if (showChord) {
      arcLbl(40 * aScale, 0, -thV, col.chord, 'θ ' + (th * 180 / Math.PI).toFixed(1) + '°', null, len < 140 ? -12 : -6);
    }
    if (showPhiArc) {
      arcLbl(64 * aScale, 0, -phV, col.wind, 'φ ' + (ph * 180 / Math.PI).toFixed(1) + '°', null, 12);
    }
    if (showAlphaArc) {
      const aMid = (thV + phV) / 2;
      ctx.strokeStyle = aCol; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(ox, oy, 88 * aScale, -phV, -thV, -thV < -phV); ctx.stroke();
      const wedgeX = ox + 88 * aScale * Math.cos(aMid), wedgeY = oy - 88 * aScale * Math.sin(aMid);
      const aLblX = ox + len * 0.30, aLblY = oy - len * 0.42;
      dline(ctx, wedgeX, wedgeY, aLblX, aLblY + 6, aCol, 1, [2, 3]);
      chipLabel(ctx, 'α ' + ((th - ph) * 180 / Math.PI).toFixed(1) + '° (AoA)',
        aLblX, aLblY, aCol, 'bold 12px IBM Plex Sans', 'center');
    }

    if ((opts.showForces || opts.showResolve) && !opts.stall && showAlphaArc) {
      const fL = Math.max(0, opts.cl || 0) * (len * 0.84);
      const fD = Math.max(0, opts.cd || 0) * (len * 8.0);
      const Lx = -fL * Math.sin(phV), Ly = -fL * Math.cos(phV);
      const Dx = -fD * Math.cos(phV), Dy =  fD * Math.sin(phV);
      if (opts.showForces) {
        arrow(ctx, ox, oy, ox + Lx, oy + Ly, col.lift, 2.4, 9);
        const lmag = Math.hypot(Lx, Ly) || 1;
        chipLabel(ctx, 'L', ox + Lx - (Ly / lmag) * 16, oy + Ly + (Lx / lmag) * 16, col.lift, 'bold 11px IBM Plex Sans', 'center');
        arrow(ctx, ox, oy, ox + Dx, oy + Dy, col.drag, 2.0, 8);
        chipLabel(ctx, 'D', ox + Dx - 10, oy + Dy + 8, col.drag, '10px IBM Plex Sans', 'center');
      }
      if (opts.showResolve) {
        const S = len * 0.75, FH_X = 6;
        const fHtrue = (opts.cl || 0) * Math.sin(ph) + (opts.cd || 0) * Math.cos(ph);
        const fTtrue = (opts.cl || 0) * Math.cos(ph) - (opts.cd || 0) * Math.sin(ph);
        const Tx = -fHtrue * S * FH_X;
        const Ty = -fTtrue * S;
        const tafCol = '#c084fc';
        dline(ctx, ox, oy, ox + Tx, oy, col.dim, 1, [3, 3]);
        dline(ctx, ox + Tx, oy, ox + Tx, oy + Ty, col.dim, 1, [3, 3]);
        dline(ctx, ox, oy, ox, oy + Ty, col.dim, 1, [3, 3]);
        dline(ctx, ox, oy + Ty, ox + Tx, oy + Ty, col.dim, 1, [3, 3]);
        const tmag = Math.hypot(Tx, Ty) || 1;
        const tpx = Ty / tmag, tpy = -Tx / tmag;
        arrow(ctx, ox, oy, ox, oy + Ty, col.good, 2.4, 9);
        chipLabel(ctx, 'Thrust', ox - 44, oy + Ty + (Ty < 0 ? 4 : -12), col.good, 'bold 10px IBM Plex Sans', 'right');
        const fhCol = Tx > 0 ? col.good : col.warn;
        arrow(ctx, ox, oy, ox + Tx, oy, fhCol, 2.4, 9);
        chipLabel(ctx, 'F_H ×6', ox + Tx + (Tx < 0 ? -20 : 20), oy + 28, fhCol, 'bold 10px IBM Plex Sans', Tx < 0 ? 'right' : 'left');
        arrow(ctx, ox, oy, ox + Tx, oy + Ty, tafCol, 2.6, 10);
        chipLabel(ctx, 'TAF', ox + Tx + tpx * 18, oy + Ty + tpy * 18, tafCol, 'bold 11px IBM Plex Sans', 'center');
      }
    }
    if (opts.showVelocity) {
      const fX = wtx, fY = oy;
      arrow(ctx, fX, fY, ox, fY, col.wind, 1.5, 7);
      arrow(ctx, wtx, wty, fX, fY, col.wind, 1.5, 7);
      const sq = 5;
      dline(ctx, fX - sq, fY - sq, fX, fY - sq, col.dim, 1);
      dline(ctx, fX - sq, fY - sq, fX - sq, fY, col.dim, 1);
      chipLabel(ctx, 'v_rot', (fX + ox) / 2, fY + 12, col.wind, 'bold 10px IBM Plex Sans', 'center');
      chipLabel(ctx, 'v_i', fX - 7, (wty + fY) / 2, col.wind, 'bold 10px IBM Plex Sans', 'right');
      chipLabel(ctx, 'rotor plane', ox + len * 1.12, oy - 9, col.dim, '10px IBM Plex Sans', 'right');
    }
    if (opts.stall) {
      text(ctx, '⚠ STALLED', ox + len * 0.45, oy - len * 0.4, col.bad, 'bold 13px IBM Plex Sans', 'center');
    }
  }

  function lineChart(ctx, W, H, series, axes, col, markers) {
    const padL = 46, padR = 14, padT = 14, padB = 30;
    const x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    const sx = v => x0 + (v - axes.xmin) / (axes.xmax - axes.xmin) * (x1 - x0);
    const sy = v => y0 + (v - axes.ymin) / (axes.ymax - axes.ymin) * (y1 - y0);

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
    if (axes.xlab) text(ctx, axes.xlab, (x0 + x1) / 2, H - 4, col.dim, '10px IBM Plex Sans', 'center');
    if (axes.ylab) { ctx.save(); ctx.translate(11, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
      text(ctx, axes.ylab, 0, 0, col.dim, '10px IBM Plex Sans', 'center'); ctx.restore(); }

    (markers || []).forEach(m => {
      const x = sx(m.x);
      dline(ctx, x, y0, x, y1, m.color, 1.5, [4, 3]);
    });

    series.forEach(s => {
      if (!s.pts.length) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2;
      ctx.save(); if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      s.pts.forEach((p, i) => { const X = sx(p.x), Y = sy(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.restore();
    });

    (markers || []).forEach(m => {
      const x = sx(m.x);
      const ly = W < 420 ? y0 - 4 : y1 + 4, base = W < 420 ? 'bottom' : 'top';
      ctx.font = '9px IBM Plex Sans';
      const tw = ctx.measureText(m.label).width;
      const flip = x > x1 - 96;
      const lx = flip ? x - 3 : x + 3;
      const boxX = flip ? x - tw - 4 : x + 2;
      const boxY = base === 'top' ? ly - 1 : ly - 10;
      ctx.fillStyle = col.bg || '#0b0e14'; ctx.globalAlpha = 0.82;
      ctx.fillRect(boxX, boxY, tw + 3, 11); ctx.globalAlpha = 1;
      text(ctx, m.label, lx, ly, m.color, '9px IBM Plex Sans', flip ? 'right' : 'left', base);
    });

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

  function discPolar(ctx, cx, cy, R, fnColor, col, opts) {
    opts = opts || {};
    const seg = 72;
    for (let i = 0; i < seg; i++) {
      const p0 = (i / seg) * 2 * Math.PI, p1 = ((i + 1) / seg) * 2 * Math.PI;
      const pm = (p0 + p1) / 2;
      const c = fnColor(pm);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, polarToCanvas(p0), polarToCanvas(p1), true);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = col.dim; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    dline(ctx, cx - R, cy, cx + R, cy, col.grid, 1, [4, 4]);
    dline(ctx, cx, cy - R, cx, cy + R, col.grid, 1, [4, 4]);
    if (!opts.hideAdvLabel) text(ctx, 'ADV 90°', cx + R + 4, cy, col.dim, '10px IBM Plex Sans', 'left', 'middle');
    text(ctx, 'RET 270°', cx - R - 4, cy, col.dim, '10px IBM Plex Sans', 'right', 'middle');
    text(ctx, 'TAIL 0°', cx, cy + R + 14, col.dim, '10px IBM Plex Sans', 'center');
    if (opts.V) {
      arrow(ctx, cx, cy - R - 22, cx, cy - R - 6, col.accent, 2, 7);
      text(ctx, 'NOSE 180°', cx - 30, cy - R - 6, col.dim, '10px IBM Plex Sans', 'right', 'middle');
    } else {
      text(ctx, 'NOSE 180°', cx, cy - R - 6, col.dim, '10px IBM Plex Sans', 'center');
    }
  }

  function polarToCanvas(psi) { return Math.PI / 2 - psi; }

  function discIso(ctx, cx, cy, R, field, levels, opts) {
    opts = opts || {};
    const nr = opts.nr || 44, np = opts.np || 144, rMin = opts.rMin != null ? opts.rMin : 0.15;
    const color = opts.color || 'rgba(20,25,35,0.55)';
    const font = opts.font || '9px IBM Plex Sans';
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
            if (Math.abs(ps[j] - 250 * Math.PI / 180) < 0.09) labelPts.push([pts[0][0], pts[0][1], L]);
          }
        }
      }
      ctx.stroke();
    }
    if (opts.label !== false) {
      const placed = [];
      const seen = new Set();
      for (const [lx, ly, L] of labelPts) {
        if (seen.has(L)) continue;
        if (placed.some(([px, py]) => Math.abs(px - lx) < 18 && Math.abs(py - ly) < 12)) continue;
        seen.add(L); placed.push([lx, ly]);
        ctx.font = font;
        const s = (opts.fmt ? opts.fmt(L) : L + '\u00b0');
        const tw = ctx.measureText(s).width;
        ctx.fillStyle = COL().bg || '#0d1117'; ctx.globalAlpha = 0.85;
        ctx.fillRect(lx - tw / 2 - 1, ly - 6, tw + 2, 12); ctx.globalAlpha = 1;
        text(ctx, s, lx, ly, opts.labelColor || COL().ink, font, 'center', 'middle');
      }
    }
    ctx.restore();
  }

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

  function discHeatmap(ctx, cx, cy, R, fieldFn, mapFn, opts) {
    opts = opts || {};
    const NR   = opts.NR   || 14;
    const NP   = opts.NP   || 72;
    const rMin = opts.rMin != null ? opts.rMin : 0.12;
    for (let ir = 0; ir < NR; ir++) {
      const r0 = rMin + (1 - rMin) * ir / NR;
      const r1 = rMin + (1 - rMin) * (ir + 1) / NR;
      const rm = (r0 + r1) / 2;
      for (let ip = 0; ip < NP; ip++) {
        const p0 = 2 * Math.PI * ip / NP;
        const p1 = 2 * Math.PI * (ip + 1) / NP;
        const pm = (p0 + p1) / 2;
        ctx.fillStyle = mapFn(fieldFn(rm, pm));
        ctx.beginPath();
        ctx.arc(cx, cy, R * r1, polarToCanvas(p0), polarToCanvas(p1), true);
        ctx.arc(cx, cy, R * r0, polarToCanvas(p1), polarToCanvas(p0), false);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = opts.borderColor || 'rgba(120,140,170,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
  }

  return { css, COL, setup, clear, grid, arrow, dline, arc, text, dot, hatchRect, tick,
           chipLabel, bladeSection, nacaProfile, lineChart, discPolar, discIso,
           discHeatmap, polarToCanvas, fmt, drawHeliWire };
})();
