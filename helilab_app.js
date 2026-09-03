/* ===========================================================================
   helilab_app.js — HeliLab shell: v2 vertical-slice routing, navigation, progress
   ===========================================================================
   Keeps the validated lesson/widget/physics stack intact while introducing the
   bounded v2 shell for Home, Module 1, guided 3D, full Rotor Lab and Lab Tools.
   Legacy lesson/stage compatibility paths remain available behind the v2 UI.
   =========================================================================== */
'use strict';

(function () {
  const LS_PROGRESS = 'helilab_progress_v1';
  const LS_THEME = 'helilab_theme_v1';
  const LS_EXAM = 'helilab_exam_v1';

  const HLS = (function () {
    const STORE_KEY = 'local' + 'Storage';
    let backing = null;
    try {
      const store = window[STORE_KEY];
      const k = '__hl_test__';
      store.setItem(k, '1');
      store.removeItem(k);
      backing = store;
    } catch (e) { backing = null; }
    const mem = new Map();
    return {
      getItem: k => backing ? backing.getItem(k) : (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { backing ? backing.setItem(k, v) : mem.set(k, String(v)); },
      removeItem: k => { backing ? backing.removeItem(k) : mem.delete(k); },
    };
  })();

  const $ = sel => document.querySelector(sel);
  const el = (t, c, h) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (h != null) e.innerHTML = h;
    return e;
  };

  let progress = {};
  try { progress = JSON.parse(HLS.getItem(LS_PROGRESS) || '{}'); } catch (e) { progress = {}; }
  const saveProgress = () => { try { HLS.setItem(LS_PROGRESS, JSON.stringify(progress)); } catch (e) {} };

  const LESSON_BY_ID = Object.fromEntries(HL_LESSONS.map((lesson) => [lesson.id, lesson]));
  const MODULE_BY_ID = Object.fromEntries(HL_V2_MODULES.map((module) => [module.id, module]));
  const M1 = MODULE_BY_ID.m1;
  const M1_ACTIVITY_BY_ID = Object.fromEntries((M1.activities || []).map((activity) => [activity.lessonId, activity]));

  const HL_RELATED = {
    bigpicture:      ['bladeelement', 'hover', 'dissymmetry'],
    bladeelement:    ['spanwise', 'bet-velocity', 'betdiagram'],
    spanwise:        ['bladeelement', 'bet-velocity'],
    hover:           ['bladeelement', 'groundeffect', 'verticalflight', 'performance'],
    verticalflight:  ['hover', 'autorotation', 'performance'],
    groundeffect:    ['hover', 'performance'],
    dissymmetry:     ['flapping', 'flaproll', 'envelope', 'bet-velocity'],
    flapping:        ['dissymmetry', 'flaproll', 'envelope', 'coriolis'],
    flaproll:        ['flapping', 'dissymmetry', 'bet-velocity', 'coriolis'],
    envelope:        ['dissymmetry', 'flapping', 'bet-velocity'],
    'bet-guided':    ['bet-velocity', 'betdiagram', 'flapping'],
    'bet-velocity':  ['bladeelement', 'bet-guided', 'betdiagram', 'dissymmetry'],
    coriolis:        ['flapping', 'bet-guided'],
    dynamicrollover: ['hover', 'lte'],
    lte:             ['bigpicture', 'autorotation', 'dynamicrollover'],
    autorotation:    ['verticalflight', 'bet-velocity', 'betdiagram'],
    performance:     ['hover', 'groundeffect', 'verticalflight'],
    betdiagram:      ['bladeelement', 'bet-velocity', 'bet-guided', 'autorotation'],
  };

  let currentRoute = null;
  let activeCleanup = null;
  const MODE_COPY = {
    model: {
      lead: 'See one relationship clearly before you start changing anything.',
      action: 'Watch the labelled diagram first, then name the cause-and-effect link it is showing.',
      section: 'Start with a strongly guided view of one idea before you manipulate it.',
      button: 'See the model',
    },
    explore: {
      lead: 'Predict one change, move one control, then explain what changed.',
      action: 'Use the highlighted control on purpose instead of hunting across the full rotor model.',
      section: 'Change one main input at a time and compare the result.',
      button: 'Open activity',
    },
    mission: {
      lead: 'Build the answer first, then commit before the reveal.',
      action: 'Use the workspace to construct the blade-element picture step by step.',
      section: 'Combine the earlier ideas in one committed construction task.',
      button: 'Start mission',
    },
  };

  function setActiveCleanup(handle) {
    activeCleanup = null;
    if (!handle) return;
    if (typeof handle === 'function') activeCleanup = handle;
    else if (typeof handle.dispose === 'function') activeCleanup = () => handle.dispose();
  }

  function cleanupActiveView() {
    if (!activeCleanup) return;
    try { activeCleanup(); } catch (e) { console.error('view cleanup failed', e); }
    activeCleanup = null;
  }

  function updateProgressBar() {
    const total = HL_LESSONS.length;
    const doneN = HL_LESSONS.filter((lesson) => progress[lesson.id] === 'done').length;
    $('#hlProgressFill').style.width = (doneN / total * 100) + '%';
    $('#hlProgressTxt').textContent = `${doneN} / ${total} complete`;
  }

  function routeForLesson(lessonId, forceLegacy) {
    if (!forceLegacy && M1_ACTIVITY_BY_ID[lessonId]) return `#/activity/${lessonId}`;
    return `#/lesson/${lessonId}`;
  }

  function navigate(hash, opts) {
    const next = hash.startsWith('#') ? hash : '#' + hash;
    const replace = !!(opts && opts.replace);
    if (replace) {
      const url = location.pathname + location.search + next;
      history.replaceState(null, '', url);
      handleRoute();
      return;
    }
    if (location.hash === next) {
      handleRoute();
      return;
    }
    location.hash = next;
  }

  function parseRoute(hash) {
    const raw = (hash || '').replace(/^#/, '');
    const [pathRaw, queryRaw = ''] = raw.split('?');
    const path = pathRaw || '/home';
    const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const query = new URLSearchParams(queryRaw);
    if (!parts.length || parts[0] === 'home') return { name: 'home' };
    if (parts[0] === 'module' && parts[1]) return { name: 'module', moduleId: parts[1] };
    if (parts[0] === 'activity' && parts[1]) return { name: 'activity', lessonId: decodeURIComponent(parts[1]) };
    if (parts[0] === 'lesson' && parts[1]) return { name: 'lesson', lessonId: decodeURIComponent(parts[1]) };
    if (parts[0] === 'rotor-lab') return { name: 'rotor-lab', preset: query.get('preset'), mode: query.get('mode') };
    if (parts[0] === 'lab-tools') return { name: 'lab-tools' };
    if (parts[0] === 'maths') return { name: 'maths' };
    if (parts[0] === 'legacy') return { name: 'legacy-library' };
    return { name: 'home' };
  }

  function ensureValidRoute(route) {
    if ((route.name === 'activity' || route.name === 'lesson') && !LESSON_BY_ID[route.lessonId]) return { name: 'home' };
    if (route.name === 'module' && !MODULE_BY_ID[route.moduleId]) return { name: 'home' };
    if (route.name === 'rotor-lab' && route.mode === 'guided' && route.preset && !HL_V2_PRESETS[route.preset]) {
      return { name: 'rotor-lab' };
    }
    return route;
  }

  function buttonNav(label, active, sub, onClick, opts) {
    const b = el('button', 'hl-nav-v2-item' + (active ? ' on' : '') + ((opts && opts.muted) ? ' muted' : ''));
    b.type = 'button';
    if (active) b.setAttribute('aria-current', 'page');
    b.innerHTML = `<span class="hl-nav-text"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;
    b.onclick = onClick;
    return b;
  }

  function buildSidebar(route) {
    const nav = $('#hlNav');
    nav.innerHTML = '';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'HeliLab navigation');

    nav.appendChild(buttonNav('Home', route.name === 'home', 'Understand the rotor. Don’t memorise it.', () => navigate('#/home')));

    const journey = el('div', 'hl-nav-v2-group');
    journey.appendChild(el('div', 'hl-nav-v2-label', 'Learning journey'));
    HL_V2_MODULES.forEach((module) => {
      const active = route.name === 'module' && route.moduleId === module.id;
      const label = `Module ${String(module.number).padStart(2, '0')} · ${module.title}`;
      const sub = module.available ? module.question : 'Coming later.';
      journey.appendChild(buttonNav(label, active, sub, () => navigate(`#/module/${module.id}`), { muted: !module.available }));
    });
    nav.appendChild(journey);

    const lab = el('div', 'hl-nav-v2-group');
    lab.appendChild(el('div', 'hl-nav-v2-label', 'Rotor lab'));
    lab.appendChild(buttonNav('3D Rotor Lab', route.name === 'rotor-lab', 'Open the full rotor controls and wake view.', () => navigate('#/rotor-lab')));
    lab.appendChild(buttonNav('Lab Tools', route.name === 'lab-tools' || route.name === 'maths' || route.name === 'legacy-library', 'Reference tools and extra lessons.', () => navigate('#/lab-tools')));
    nav.appendChild(lab);

    const compat = el('div', 'hl-nav-v2-group hl-nav-v2-group--compat');
    compat.appendChild(el('div', 'hl-nav-v2-label', 'Library'));
    compat.appendChild(buttonNav('Extra lessons', route.name === 'legacy-library' || route.name === 'lesson', 'Browse the earlier lesson list by topic.', () => navigate('#/legacy'), { muted: true }));
    compat.appendChild(buttonNav('The Maths', route.name === 'maths', 'Deep dive reference', () => navigate('#/maths'), { muted: true }));
    nav.appendChild(compat);

    updateProgressBar();
  }

  function buildRelated(ids) {
    const rel = el('div', 'hl-related');
    rel.appendChild(el('div', 'hl-related-h', 'Related lessons'));
    const chips = el('div', 'hl-seg hl-related-chips');
    ids.forEach((rid) => {
      const lesson = LESSON_BY_ID[rid];
      if (!lesson) return;
      const b = el('button', 'hl-seg-btn', lesson.title);
      b.title = lesson.stage + ' — ' + lesson.subtitle;
      b.onclick = () => {
        navigate(routeForLesson(rid));
        $('#hlMain').scrollTop = 0;
      };
      chips.appendChild(b);
    });
    rel.appendChild(chips);
    return rel;
  }

  function touchLesson(lessonId) {
    if (progress[lessonId] !== 'done') { progress[lessonId] = 'seen'; saveProgress(); }
    if (window.HLCourseMap) window.HLCourseMap.touchLesson(lessonId);
  }

  function buildCheck(lesson, checkData) {
    const box = el('div', 'hl-check');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Quick check');
    box.appendChild(el('div', 'hl-check-h', '✎ Quick check — predict first, then reveal'));
    box.appendChild(el('div', 'hl-check-q', checkData.q));
    const opts = el('div', 'hl-check-opts');
    let answered = false;
    checkData.options.forEach((option, i) => {
      const b = el('button', 'hl-check-opt', option);
      b.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = i === checkData.answer;
        opts.querySelectorAll('.hl-check-opt').forEach((x, j) => {
          x.classList.add('done');
          x.setAttribute('aria-disabled', 'true');
          if (j === checkData.answer) x.classList.add('correct');
          else if (j === i) x.classList.add('wrong');
        });
        const fb = el('div', 'hl-check-fb ' + (correct ? 'ok' : 'no'),
          (correct ? '✓ Correct. ' : '✗ Not quite. ') + checkData.explain);
        fb.setAttribute('role', 'status');
        fb.setAttribute('aria-live', 'polite');
        box.appendChild(fb);
        if (correct && progress[lesson.id] !== 'done') {
          progress[lesson.id] = 'done';
          saveProgress();
          buildSidebar(currentRoute);
        }
        if (window.HLCourseMap) window.HLCourseMap.recordCheck(lesson.id, correct);
      };
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  function buildModeFocus(activityMeta) {
    const copy = MODE_COPY[activityMeta.mode] || MODE_COPY.explore;
    const panel = el('section', 'hl-mode-focus hl-mode-focus--' + activityMeta.mode);
    let extra = '';
    if (activityMeta.mode === 'mission') {
      extra = '<ol class="hl-mode-focus-steps"><li>Construct</li><li>Commit</li><li>Reveal</li><li>Explain</li></ol>';
    } else if (activityMeta.modeAction) {
      extra = `<p class="hl-mode-focus-action"><b>Try this:</b> ${activityMeta.modeAction}</p>`;
    }
    panel.innerHTML =
      `<div class="hl-mode-focus-kicker">${activityMeta.kicker}</div>` +
      `<h2>${activityMeta.modeLead || copy.lead}</h2>` +
      `<p>${activityMeta.modeText || copy.action}</p>` +
      extra;
    return panel;
  }

  function renderLessonBody(main, lesson, opts) {
    const moduleMeta = opts && opts.moduleMeta;
    const activityMeta = opts && opts.activityMeta;
    const legacy = !!(opts && opts.legacy);
    const v2View = !legacy && !!activityMeta;
    const bodyHtml = v2View && activityMeta.bodyHtml ? activityMeta.bodyHtml : lesson.body;
    const takeaways = v2View && activityMeta.takeaways ? activityMeta.takeaways : lesson.takeaways;
    const checkData = v2View && activityMeta.mode === 'mission'
      ? (Object.prototype.hasOwnProperty.call(activityMeta, 'check') ? activityMeta.check : null)
      : (v2View && activityMeta.check ? activityMeta.check : lesson.check);
    const relatedIds = legacy ? (HL_RELATED[lesson.id] || []) : ((activityMeta && activityMeta.related) || []);
    const bridgeHtml = legacy ? lesson.bridge : (activityMeta && activityMeta.bridge);
    touchLesson(lesson.id);
    main.innerHTML = '';

    const head = el('div', 'hl-lesson-head');
    if (legacy) {
      head.innerHTML =
        `<div class="hl-lesson-stage">Lesson library · ${lesson.stage}</div>` +
        `<h1>${lesson.title}</h1><div class="hl-lesson-sub">${lesson.subtitle}</div>`;
    } else {
      const title = activityMeta.mode === 'mission' ? `MISSION — ${activityMeta.title}` : activityMeta.title;
      head.innerHTML =
        `<div class="hl-lesson-stage">Module ${String(moduleMeta.number).padStart(2, '0')} · ${activityMeta.kicker}</div>` +
        `<h1>${title}</h1><div class="hl-lesson-sub">${moduleMeta.title} · ${lesson.subtitle}</div>`;
    }
    main.appendChild(head);

    if (v2View && activityMeta.mode !== 'mission') main.appendChild(buildModeFocus(activityMeta));

    if (v2View && activityMeta && activityMeta.threeDPreset) {
      const prompt = el('div', 'hl-inline-actions');
      const guided = el('button', 'hl-foot-btn primary', 'View this in 3D');
      guided.onclick = () => navigate(`#/rotor-lab?preset=${encodeURIComponent(activityMeta.threeDPreset)}&mode=guided`);
      const moduleBtn = el('button', 'hl-foot-btn', 'Back to Module 1');
      moduleBtn.onclick = () => navigate('#/module/m1');
      prompt.appendChild(guided);
      prompt.appendChild(moduleBtn);
      main.appendChild(prompt);
    }

    const grid = el('div', 'hl-lesson-grid'
      + (lesson.wide ? ' hl-lesson-grid--wide' : '')
      + (v2View ? ` hl-lesson-grid--${activityMeta.mode}` : ''));
    const readCol = el('div', 'hl-lesson-read');
    readCol.appendChild(el('div', 'hl-lesson-body', bodyHtml));
    const tk = el('div', 'hl-takeaways');
    tk.appendChild(el('div', 'hl-takeaways-h', 'Key takeaways'));
    const ul = el('ul');
    takeaways.forEach((takeaway) => ul.appendChild(el('li', null, takeaway)));
    tk.appendChild(ul);
    readCol.appendChild(tk);

    const wCol = el('div', 'hl-lesson-widget');
    if (!(v2View && activityMeta.mode === 'mission')) {
      wCol.appendChild(el('div', 'hl-widget-label', legacy ? '▸ Earlier lesson' : `▸ ${activityMeta.kicker}`));
    }
    const mount = el('div', 'hl-widget-mount');
    mount.setAttribute('role', 'group');
    mount.setAttribute('aria-label', 'Interactive diagram: ' + lesson.title);
    wCol.appendChild(mount);

    grid.appendChild(wCol);
    grid.appendChild(readCol);
    main.appendChild(grid);

    const widget = HLW[lesson.widget];
    if (widget) {
      try { setActiveCleanup(widget(mount)); } catch (e) {
        mount.innerHTML = '<div class="hl-err">Widget error: ' + e.message + '</div>';
        console.error(e);
      }
    }

    if (checkData) main.appendChild(buildCheck(lesson, checkData));

    if (lesson.appendix) {
      const ap = el('div', 'hl-appendix');
      ap.innerHTML = '<div class="hl-appendix-toggle" role="button" tabindex="0" aria-expanded="false">▸ ' + lesson.appendix.title + '</div>';
      const body = el('div', 'hl-appendix-body');
      body.style.display = 'none';
      ap.appendChild(body);
      let built = false;
      const openIt = () => {
        const open = body.style.display === 'none';
        body.style.display = open ? 'block' : 'none';
        ap.querySelector('.hl-appendix-toggle').setAttribute('aria-expanded', String(open));
        ap.querySelector('.hl-appendix-toggle').textContent = (open ? '▾ ' : '▸ ') + lesson.appendix.title;
        if (open && !built) {
          built = true;
          const fn = HLW[lesson.appendix.widget];
          if (fn) {
            try { fn(body); } catch (e) {
              body.innerHTML = '<div class="hl-err">Appendix error: ' + e.message + '</div>';
              console.error(e);
            }
          }
        }
      };
      ap.querySelector('.hl-appendix-toggle').onclick = openIt;
      ap.querySelector('.hl-appendix-toggle').onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); }
      };
      main.appendChild(ap);
    }

    if (relatedIds.length) main.appendChild(buildRelated(relatedIds));

    if (bridgeHtml) {
      const br = el('div', 'hl-bridge');
      br.innerHTML = '→ ' + bridgeHtml;
      main.appendChild(br);
    }

    const foot = el('div', 'hl-lesson-foot');
    if (!legacy && moduleMeta && activityMeta) {
      const activities = moduleMeta.activities || [];
      const idx = activities.findIndex((activity) => activity.lessonId === lesson.id);
      const prev = el('button', 'hl-foot-btn', idx > 0 ? '← Previous activity' : '← Module 1');
      prev.onclick = () => navigate(idx > 0 ? routeForLesson(activities[idx - 1].lessonId) : '#/module/m1');
      const next = el('button', 'hl-foot-btn primary', idx < activities.length - 1 ? 'Next activity →' : 'Open the 3D Rotor Lab →');
      next.onclick = () => {
        progress[lesson.id] = 'done';
        saveProgress();
        buildSidebar(currentRoute);
        navigate(idx < activities.length - 1 ? routeForLesson(activities[idx + 1].lessonId) : '#/rotor-lab');
      };
      foot.appendChild(prev);
      foot.appendChild(next);
    } else {
      const idx = HL_LESSONS.indexOf(lesson);
      const prev = el('button', 'hl-foot-btn', '← Previous');
      prev.disabled = idx === 0;
      prev.onclick = () => navigate(idx > 0 ? routeForLesson(HL_LESSONS[idx - 1].id, true) : '#/legacy');
      const next = el('button', 'hl-foot-btn primary', idx === HL_LESSONS.length - 1 ? 'Finish → Rotor Lab' : 'Next lesson →');
      next.onclick = () => {
        progress[lesson.id] = 'done';
        saveProgress();
        buildSidebar(currentRoute);
        navigate(idx === HL_LESSONS.length - 1 ? '#/rotor-lab' : routeForLesson(HL_LESSONS[idx + 1].id, true));
      };
      foot.appendChild(prev);
      foot.appendChild(next);
    }
    main.appendChild(foot);
    main.scrollTop = 0;
  }

  function computeContinueActivity() {
    const activities = (M1.activities || []).map((activity) => activity.lessonId);
    return activities.find((lessonId) => progress[lessonId] === 'seen')
      || activities.find((lessonId) => progress[lessonId] !== 'done')
      || activities[activities.length - 1];
  }

  function buildModuleCard(module) {
    const card = el('button', 'hl-module-card' + (module.available ? '' : ' is-locked'));
    card.type = 'button';
    card.onclick = () => navigate(`#/module/${module.id}`);
    card.innerHTML =
      `<div class="hl-module-card-kicker">Module ${String(module.number).padStart(2, '0')}</div>` +
      `<h3>${module.title}</h3>` +
      `<p>${module.question}</p>` +
      `<div class="hl-module-card-note">${module.available ? 'Ready to explore' : 'Coming later'}</div>`;
    return card;
  }

  function renderHome() {
    const main = $('#hlMain');
    main.innerHTML = '';

    const hero = el('section', 'hl-v2-home-hero');
    const copy = el('div', 'hl-v2-home-copy');
    const continueId = computeContinueActivity();
    copy.innerHTML =
      '<div class="hl-home-kicker">HELILAB · Interactive Helicopter Aerodynamics for ATPL(H)</div>' +
      '<h1>Understand the rotor. Don’t memorise it.</h1>' +
      '<p>Predict, build, explore and explain the same aerodynamic model — from the first blade element to the full rotor wake.</p>' +
      '<div class="hl-home-sequence">PREDICT → BUILD → EXPLORE → EXPLAIN</div>';
    const actions = el('div', 'hl-home-actions');
    const primary = el('button', 'hl-home-btn primary', progress[continueId] ? 'Continue learning' : 'Start Module 1');
    primary.onclick = () => navigate(routeForLesson(continueId));
    const secondary = el('button', 'hl-home-btn', 'Explore the 3D Rotor Lab');
    secondary.onclick = () => navigate('#/rotor-lab');
    actions.appendChild(primary);
    actions.appendChild(secondary);
    copy.appendChild(actions);
    hero.appendChild(copy);

    const teaserWrap = el('div', 'hl-v2-home-teaser');
    hero.appendChild(teaserWrap);
    main.appendChild(hero);
    setActiveCleanup(HLW.wRotorTeaser(teaserWrap, {
      state: { coll: 9.2, Vkt: 0, Vc: 0, weight: 2800, alt: 0, psi: 90 },
      max: 90,
      hint: 'One constrained control, one real causal result: more forward speed skews the wake aft.',
    }));

    const modules = el('section', 'hl-v2-section');
    modules.innerHTML = '<div class="hl-v2-section-kicker">One model. Seven flight problems.</div><h2>Learning journey</h2><p>Start with Module 1 and build the rotor model from one blade element. More modules will appear here later.</p>';
    const moduleGrid = el('div', 'hl-module-grid');
    HL_V2_MODULES.forEach((module) => moduleGrid.appendChild(buildModuleCard(module)));
    modules.appendChild(moduleGrid);
    main.appendChild(modules);

    const philosophy = el('section', 'hl-v2-section');
    philosophy.innerHTML = '<div class="hl-v2-section-kicker">How HeliLab teaches</div><h2>Modes that match the learning task</h2>';
    const modes = el('div', 'hl-mode-grid');
    [
      ['MODEL', 'Make one relationship visible with high scaffolding.'],
      ['EXPLORE', 'Change one or two inputs, then explain what changed and why.'],
      ['MISSION', 'Construct → commit → reveal before you see the completed answer.'],
      ['CHALLENGE', 'Transfer tasks arrive later in the learning journey.'],
    ].forEach(([title, desc]) => {
      modes.appendChild(el('div', 'hl-mode-card', `<div class="hl-mode-card-kicker">${title}</div><p>${desc}</p>`));
    });
    philosophy.appendChild(modes);
    main.appendChild(philosophy);

    const ecosystem = el('section', 'hl-v2-section hl-v2-section--compact',
      '<div class="hl-v2-section-kicker">Built into a learning ecosystem</div>' +
      '<p>Use HeliLab to make the mechanism visible, then carry the same variables and conventions into class, revision, and exam practice.</p>');
    main.appendChild(ecosystem);
    main.scrollTop = 0;
  }

  function buildActivityCard(activity) {
    const card = el('article', 'hl-activity-card hl-activity-card--' + activity.mode);
    const title = activity.mode === 'mission' ? `MISSION — ${activity.title}` : activity.title;
    const copy = MODE_COPY[activity.mode] || MODE_COPY.explore;
    card.innerHTML =
      `<div class="hl-activity-card-kicker">${activity.kicker}</div>` +
      `<h3>${title}</h3>` +
      `<p>${activity.summary}</p>` +
      `<p class="hl-activity-card-note">${activity.modeAction || copy.action}</p>`;
    const actions = el('div', 'hl-activity-card-actions');
    const open = el('button', 'hl-home-btn primary', activity.actionLabel || copy.button);
    open.onclick = () => navigate(routeForLesson(activity.lessonId));
    actions.appendChild(open);
    if (activity.threeDPreset) {
      const guided = el('button', 'hl-home-btn', 'View this in 3D');
      guided.onclick = () => navigate(`#/rotor-lab?preset=${encodeURIComponent(activity.threeDPreset)}&mode=guided`);
      actions.appendChild(guided);
    }
    card.appendChild(actions);
    return card;
  }

  function renderModule(moduleId) {
    const main = $('#hlMain');
    const module = MODULE_BY_ID[moduleId];
    main.innerHTML = '';
    if (!module.available) {
      const wrap = el('section', 'hl-v2-section hl-v2-placeholder');
      wrap.innerHTML =
        `<div class="hl-v2-section-kicker">Module ${String(module.number).padStart(2, '0')}</div>` +
        `<h1>${module.title}</h1>` +
        `<p>${module.question}</p>` +
        '<p>This module is coming later. For now, keep building Module 1 or explore the 3D Rotor Lab.</p>';
      const actions = el('div', 'hl-home-actions');
      const home = el('button', 'hl-home-btn primary', 'Back to Home');
      home.onclick = () => navigate('#/home');
      const legacy = el('button', 'hl-home-btn', 'Open extra lessons');
      legacy.onclick = () => navigate('#/legacy');
      actions.appendChild(home);
      actions.appendChild(legacy);
      wrap.appendChild(actions);
      main.appendChild(wrap);
      main.scrollTop = 0;
      return;
    }

    const head = el('section', 'hl-v2-module-head');
    head.innerHTML =
      `<div class="hl-v2-section-kicker">Module ${String(module.number).padStart(2, '0')}</div>` +
      `<h1>${module.title}</h1>` +
      `<p class="hl-v2-module-question">${module.question}</p>` +
      `<div class="hl-v2-spine">${module.spine.join(' → ')}</div>`;
    main.appendChild(head);

    ['model', 'explore', 'mission'].forEach((mode) => {
      const items = (module.activities || []).filter((activity) => activity.mode === mode);
      if (!items.length) return;
      const sec = el('section', 'hl-v2-section');
      sec.innerHTML = `<div class="hl-v2-section-kicker">${mode.toUpperCase()}</div><p class="hl-v2-mode-note">${MODE_COPY[mode].section}</p>`;
      const grid = el('div', 'hl-activity-grid');
      items.forEach((activity) => grid.appendChild(buildActivityCard(activity)));
      sec.appendChild(grid);
      if (mode === 'mission') {
        sec.appendChild(el('p', 'hl-v2-protect-note',
          'Build the picture yourself first: this mission keeps the full construct → commit → reveal sequence.'));
      }
      main.appendChild(sec);
    });
    main.scrollTop = 0;
  }

  function renderActivity(lessonId) {
    renderLessonBody($('#hlMain'), LESSON_BY_ID[lessonId], { moduleMeta: M1, activityMeta: M1_ACTIVITY_BY_ID[lessonId] });
  }

  function renderLegacyLesson(lessonId) {
    renderLessonBody($('#hlMain'), LESSON_BY_ID[lessonId], { legacy: true });
  }

  function renderRotorLab(route) {
    const main = $('#hlMain');
    main.innerHTML = '';
    const guided = route.mode === 'guided' && route.preset && HL_V2_PRESETS[route.preset];
    const head = el('div', 'hl-lesson-head');
    head.innerHTML = guided
      ? `<div class="hl-lesson-stage">3D Rotor Lab · Guided view</div><h1>${guided.title}</h1><div class="hl-lesson-sub">${guided.summary}</div>`
      : '<div class="hl-lesson-stage">3D Rotor Lab · Full controls</div><h1>3D Rotor Lab</h1><div class="hl-lesson-sub">Use the full rotor controls to inspect wake response, local flow and flapping together.</div>';
    main.appendChild(head);

    if (guided) {
      const note = el('div', 'hl-rotor-guide-actions');
      const full = el('button', 'hl-foot-btn primary', 'Open full Rotor Lab');
      full.onclick = () => navigate('#/rotor-lab');
      const back = el('button', 'hl-foot-btn', 'Back to Module 1');
      back.onclick = () => navigate('#/module/m1');
      note.appendChild(full);
      note.appendChild(back);
      main.appendChild(note);
      const mount = el('div', 'hl-guided-rotor-mount');
      main.appendChild(mount);
      setActiveCleanup(HLW.wGuidedRotorLab(mount, guided));
    } else {
      const mount = el('div', 'hl-sandbox-mount');
      main.appendChild(mount);
      try { setActiveCleanup(HLW.wSandbox(mount)); } catch (e) {
        mount.innerHTML = '<div class="hl-err">Sandbox error: ' + e.message + '</div>';
        console.error(e);
      }
    }
    main.scrollTop = 0;
  }

  function renderMaths() {
    const main = $('#hlMain');
    main.innerHTML = '';
    const head = el('div', 'hl-lesson-head');
    head.innerHTML = '<div class="hl-lesson-stage">Lab tools · reference</div><h1>The Maths Behind the Diagrams</h1><div class="hl-lesson-sub">Follow the equations behind the velocity diagram and rotor model.</div>';
    main.appendChild(head);
    const mount = el('div', 'hl-maths-mount');
    main.appendChild(mount);
    try { HLW.wBetModel(mount); } catch (e) {
      mount.innerHTML = '<div class="hl-err">Maths error: ' + e.message + '</div>';
      console.error(e);
    }
    main.appendChild(buildRelated(['bet-velocity', 'bladeelement', 'bet-guided', 'betdiagram']));
    main.scrollTop = 0;
  }

  function renderLegacyLibrary() {
    const main = $('#hlMain');
    main.innerHTML = '';
    const head = el('section', 'hl-v2-section');
    head.innerHTML = '<div class="hl-v2-section-kicker">Lesson library</div><h1>Extra lessons</h1><p>Browse the earlier lesson list by topic whenever you want more detail.</p>';
    main.appendChild(head);
    HL_STAGES.forEach((stage) => {
      const sec = el('section', 'hl-v2-section hl-v2-section--compact');
      sec.appendChild(el('div', 'hl-v2-section-kicker', stage));
      const list = el('div', 'hl-legacy-list');
      HL_LESSONS.filter((lesson) => lesson.stage === stage).forEach((lesson) => {
        const item = el('button', 'hl-legacy-item', `<b>${lesson.title}</b><small>${lesson.subtitle}</small>`);
        item.onclick = () => navigate(routeForLesson(lesson.id, true));
        list.appendChild(item);
      });
      sec.appendChild(list);
      main.appendChild(sec);
    });
    main.scrollTop = 0;
  }

  function renderLabTools() {
    const main = $('#hlMain');
    main.innerHTML = '';
    const head = el('section', 'hl-v2-section');
    head.innerHTML = '<div class="hl-v2-section-kicker">Lab tools</div><h1>Reference tools</h1><p>Keep the main learning journey front-and-centre, with deeper references collected here.</p>';
    main.appendChild(head);
    const grid = el('div', 'hl-activity-grid');
    const maths = el('article', 'hl-activity-card', '<div class="hl-activity-card-kicker">TOOL</div><h3>The Maths</h3><p>Inspect the exact BET and inflow relationships behind the diagrams.</p>');
    const mathsActions = el('div', 'hl-activity-card-actions');
    const openMaths = el('button', 'hl-home-btn primary', 'Open the Maths');
    openMaths.onclick = () => navigate('#/maths');
    mathsActions.appendChild(openMaths);
    maths.appendChild(mathsActions);
    grid.appendChild(maths);

    const legacy = el('article', 'hl-activity-card', '<div class="hl-activity-card-kicker">LIBRARY</div><h3>Extra lessons</h3><p>Browse the earlier lesson collection whenever you want a wider topic list.</p>');
    const legacyActions = el('div', 'hl-activity-card-actions');
    const openLegacy = el('button', 'hl-home-btn', 'Open extra lessons');
    openLegacy.onclick = () => navigate('#/legacy');
    legacyActions.appendChild(openLegacy);
    legacy.appendChild(legacyActions);
    grid.appendChild(legacy);

    main.appendChild(grid);
    main.scrollTop = 0;
  }

  function renderRoute(route) {
    cleanupActiveView();
    currentRoute = route;
    buildSidebar(route);
    if (route.name === 'home') renderHome();
    else if (route.name === 'module') renderModule(route.moduleId);
    else if (route.name === 'activity') renderActivity(route.lessonId);
    else if (route.name === 'lesson') renderLegacyLesson(route.lessonId);
    else if (route.name === 'rotor-lab') renderRotorLab(route);
    else if (route.name === 'maths') renderMaths();
    else if (route.name === 'legacy-library') renderLegacyLibrary();
    else renderLabTools();
  }

  function handleRoute() {
    renderRoute(ensureValidRoute(parseRoute(location.hash)));
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { HLS.setItem(LS_THEME, theme); } catch (e) {}
    const b = $('#hlThemeBtn');
    if (b) b.textContent = theme === 'light' ? '☀' : '☾';
  }

  window.addEventListener('DOMContentLoaded', () => {
    applyTheme(HLS.getItem(LS_THEME) || 'dark');
    $('#hlThemeBtn').onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'light' ? 'dark' : 'light');
    };

    const applyExam = (on) => {
      document.body.classList.toggle('exam-mode', on);
      $('#hlExamBtn').classList.toggle('on', on);
      try { HLS.setItem(LS_EXAM, on ? '1' : '0'); } catch (e) {}
    };
    applyExam(HLS.getItem(LS_EXAM) === '1');
    $('#hlExamBtn').onclick = () => applyExam(!document.body.classList.contains('exam-mode'));
    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('exam-mode')) return;
      const readout = e.target.closest('.hl-w-readout, .hl-sandbox-readout, .hl-rotor-readout');
      if (readout && !readout.classList.contains('revealed')) {
        readout.classList.add('revealed');
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    $('#hlResetBtn').onclick = () => {
      if (confirm('Reset all lesson progress?')) {
        progress = {};
        saveProgress();
        if (window.HLCourseMap) window.HLCourseMap.resetProgress();
        navigate('#/home', { replace: true });
      }
    };

    const sidebar = $('#hlSidebar');
    $('#hlMenuBtn').onclick = () => sidebar.classList.toggle('open');
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('beforeunload', cleanupActiveView);

    window.HLApp = {
      openLesson: (lessonId) => navigate(routeForLesson(lessonId)),
      openLegacyLesson: (lessonId) => navigate(routeForLesson(lessonId, true)),
    };

    if (!location.hash) navigate('#/home', { replace: true });
    else handleRoute();
  });
})();
