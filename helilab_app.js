/* ===========================================================================
   helilab_app.js — HeliLab shell: navigation, routing, progress, checks
   ===========================================================================
   Wires the learning journey (HL_LESSONS) and widgets (HLW) into a single-page
   app: a stage/lesson sidebar, a lesson reader with an embedded live widget and
   a comprehension check, a free Sandbox, progress tracking in localStorage, and
   a light/dark theme toggle. Vanilla JS, no framework (per project rules).
   =========================================================================== */
'use strict';

(function () {
  const LS_PROGRESS = 'helilab_progress_v1';
  const LS_THEME = 'helilab_theme_v1';

  const $ = sel => document.querySelector(sel);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  /* progress = { lessonId: 'done' | 'seen' } */
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}'); } catch (e) { progress = {}; }
  const saveProgress = () => { try { localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); } catch (e) {} };

  let current = HL_LESSONS[0].id;
  let inSandbox = false;

  /* ── sidebar ──────────────────────────────────────────────────────────── */
  function buildSidebar() {
    const nav = $('#hlNav');
    nav.innerHTML = '';
    HL_STAGES.forEach(stage => {
      const lessons = HL_LESSONS.filter(l => l.stage === stage);
      const done = lessons.filter(l => progress[l.id] === 'done').length;
      const grp = el('div', 'hl-nav-group');
      grp.appendChild(el('div', 'hl-nav-stage',
        `<span>${stage}</span><span class="hl-nav-count">${done}/${lessons.length}</span>`));
      lessons.forEach(l => {
        const idx = HL_LESSONS.indexOf(l) + 1;
        const st = progress[l.id];
        const item = el('button', 'hl-nav-item' + (!inSandbox && l.id === current ? ' on' : ''));
        item.innerHTML =
          `<span class="hl-nav-mark ${st || ''}">${st === 'done' ? '✓' : idx}</span>` +
          `<span class="hl-nav-text"><b>${l.title}</b><small>${l.subtitle}</small></span>`;
        item.onclick = () => { inSandbox = false; current = l.id; render(); };
        grp.appendChild(item);
      });
      nav.appendChild(grp);
    });
    // sandbox entry
    const sbBtn = el('button', 'hl-nav-sandbox' + (inSandbox ? ' on' : ''),
      '<span>🛠</span><span class="hl-nav-text"><b>Sandbox</b><small>Free exploration — all controls</small></span>');
    sbBtn.onclick = () => { inSandbox = true; render(); };
    nav.appendChild(sbBtn);

    // overall progress
    const total = HL_LESSONS.length;
    const doneN = HL_LESSONS.filter(l => progress[l.id] === 'done').length;
    $('#hlProgressFill').style.width = (doneN / total * 100) + '%';
    $('#hlProgressTxt').textContent = `${doneN} / ${total} complete`;
  }

  /* ── lesson view ──────────────────────────────────────────────────────── */
  function renderLesson(lesson) {
    const idx = HL_LESSONS.indexOf(lesson);
    if (progress[lesson.id] !== 'done') { progress[lesson.id] = 'seen'; saveProgress(); }
    const main = $('#hlMain');
    main.innerHTML = '';

    const head = el('div', 'hl-lesson-head');
    head.innerHTML =
      `<div class="hl-lesson-stage">${lesson.stage} · Lesson ${idx + 1} of ${HL_LESSONS.length}</div>` +
      `<h1>${lesson.title}</h1><div class="hl-lesson-sub">${lesson.subtitle}</div>`;
    main.appendChild(head);

    const grid = el('div', 'hl-lesson-grid');
    // explanation column
    const readCol = el('div', 'hl-lesson-read');
    readCol.appendChild(el('div', 'hl-lesson-body', lesson.body));
    const tk = el('div', 'hl-takeaways');
    tk.appendChild(el('div', 'hl-takeaways-h', 'Key takeaways'));
    const ul = el('ul');
    lesson.takeaways.forEach(t => ul.appendChild(el('li', null, t)));
    tk.appendChild(ul); readCol.appendChild(tk);
    // widget column
    const wCol = el('div', 'hl-lesson-widget');
    wCol.appendChild(el('div', 'hl-widget-label', '▸ Try it'));
    const mount = el('div', 'hl-widget-mount');
    wCol.appendChild(mount);
    grid.appendChild(wCol); grid.appendChild(readCol);
    main.appendChild(grid);

    // mount widget
    const fn = HLW[lesson.widget];
    if (fn) { try { fn(mount); } catch (e) { mount.innerHTML = '<div class="hl-err">Widget error: ' + e.message + '</div>'; console.error(e); } }

    // comprehension check
    if (lesson.check) main.appendChild(buildCheck(lesson));

    // footer nav
    const foot = el('div', 'hl-lesson-foot');
    const prev = el('button', 'hl-foot-btn', '← Previous');
    prev.disabled = idx === 0;
    prev.onclick = () => { current = HL_LESSONS[idx - 1].id; render(); };
    const next = el('button', 'hl-foot-btn primary',
      idx === HL_LESSONS.length - 1 ? 'Finish → Sandbox' : 'Next lesson →');
    next.onclick = () => {
      progress[lesson.id] = 'done'; saveProgress();
      if (idx === HL_LESSONS.length - 1) { inSandbox = true; }
      else current = HL_LESSONS[idx + 1].id;
      render();
    };
    foot.appendChild(prev); foot.appendChild(next);
    main.appendChild(foot);
    main.scrollTop = 0;
  }

  function buildCheck(lesson) {
    const box = el('div', 'hl-check');
    box.appendChild(el('div', 'hl-check-h', '✎ Quick check'));
    box.appendChild(el('div', 'hl-check-q', lesson.check.q));
    const opts = el('div', 'hl-check-opts');
    let answered = false;
    lesson.check.options.forEach((o, i) => {
      const b = el('button', 'hl-check-opt', o);
      b.onclick = () => {
        if (answered) return; answered = true;
        const correct = i === lesson.check.answer;
        opts.querySelectorAll('.hl-check-opt').forEach((x, j) => {
          x.classList.add('done');
          if (j === lesson.check.answer) x.classList.add('correct');
          else if (j === i) x.classList.add('wrong');
        });
        const fb = el('div', 'hl-check-fb ' + (correct ? 'ok' : 'no'),
          (correct ? '✓ Correct. ' : '✗ Not quite. ') + lesson.check.explain);
        box.appendChild(fb);
        if (correct && progress[lesson.id] !== 'done') { progress[lesson.id] = 'done'; saveProgress(); buildSidebar(); }
      };
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  /* ── sandbox view ─────────────────────────────────────────────────────── */
  function renderSandbox() {
    const main = $('#hlMain');
    main.innerHTML = '';
    const head = el('div', 'hl-lesson-head');
    head.innerHTML = `<div class="hl-lesson-stage">Free exploration</div>
      <h1>Sandbox</h1><div class="hl-lesson-sub">Drive every control and watch the
      whole rotor respond at once — disc AoA, a blade element, the power curve and flapping.</div>`;
    main.appendChild(head);
    const mount = el('div', 'hl-sandbox-mount');
    main.appendChild(mount);
    try { HLW.wSandbox(mount); } catch (e) { mount.innerHTML = '<div class="hl-err">Sandbox error: ' + e.message + '</div>'; console.error(e); }
    main.scrollTop = 0;
  }

  /* ── theme ────────────────────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(LS_THEME, t); } catch (e) {}
    const b = $('#hlThemeBtn'); if (b) b.textContent = t === 'light' ? '☀' : '☾';
  }

  /* ── render dispatch ──────────────────────────────────────────────────── */
  function render() {
    buildSidebar();
    if (inSandbox) renderSandbox();
    else renderLesson(HL_LESSONS.find(l => l.id === current));
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem(LS_THEME) || 'dark');
    $('#hlThemeBtn').onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'light' ? 'dark' : 'light');
    };
    // exam mode: readouts blurred until clicked — predict first, then reveal.
    // Reveal is one-way per readout; a lesson re-render blurs them again.
    const LS_EXAM = 'helilab_exam_v1';
    const applyExam = (on) => {
      document.body.classList.toggle('exam-mode', on);
      $('#hlExamBtn').classList.toggle('on', on);
      try { localStorage.setItem(LS_EXAM, on ? '1' : '0'); } catch (e) {}
    };
    applyExam(localStorage.getItem(LS_EXAM) === '1');
    $('#hlExamBtn').onclick = () => applyExam(!document.body.classList.contains('exam-mode'));
    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('exam-mode')) return;
      const r = e.target.closest('.hl-w-readout, .hl-sandbox-readout');
      if (r && !r.classList.contains('revealed')) {
        r.classList.add('revealed');
        e.stopPropagation(); e.preventDefault();   // don't trigger buttons under the blur
      }
    }, true);
    $('#hlResetBtn').onclick = () => {
      if (confirm('Reset all lesson progress?')) { progress = {}; saveProgress(); render(); }
    };
    // hamburger for narrow screens
    const sidebar = $('#hlSidebar');
    $('#hlMenuBtn').onclick = () => sidebar.classList.toggle('open');
    render();
  });
})();
