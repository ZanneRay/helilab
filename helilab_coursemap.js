'use strict';

(function () {
  const LS_LESSON_STATES = 'helilab_lesson_states';
  const LS_CONCEPT_STATES = 'helilab_concept_states';
  const LS_CONCEPT_META = 'helilab_concept_meta';
  const DAY_MS = 24 * 60 * 60 * 1000;

  const STAGE_META = [
    { key: 'Basics', label: 'Stage 1 — Basics', desc: 'Core rotor ideas, blade-element fundamentals, and lift basics.' },
    { key: 'Hover & Vertical', label: 'Stage 2 — Hover & Vertical Flight', desc: 'Hover inflow, climbs/descents, VRS, and ground effect.' },
    { key: 'Forward Flight', label: 'Stage 3 — Forward Flight', desc: 'Dissymmetry, flapping, stall limits, and velocity-triangle thinking.' },
    { key: 'Safety & Limits', label: 'Stage 4 — Safety & Limits', desc: 'Operational edges, rollover risk, and yaw-control limits.' },
    { key: 'Advanced', label: 'Stage 5 — Advanced', desc: 'Autorotation, performance planning, and integrated BET diagrams.' },
  ];

  const CONCEPTS = [
    { key: 'aoa', label: 'Angle of Attack', lessons: ['bladeelement', 'bet-velocity', 'betdiagram', 'hover'] },
    { key: 'inflow', label: 'Induced Inflow', lessons: ['hover', 'verticalflight', 'groundeffect', 'flaproll'] },
    { key: 'bet', label: 'Blade Element Theory', lessons: ['bladeelement', 'bet-guided', 'bet-velocity', 'betdiagram'] },
    { key: 'dissymmetry', label: 'Dissymmetry of Lift', lessons: ['dissymmetry', 'flapping', 'flaproll'] },
    { key: 'flapping', label: 'Blade Flapping', lessons: ['flapping', 'flaproll', 'coriolis'] },
    { key: 'retreating_stall', label: 'Retreating Blade Stall', lessons: ['envelope', 'bet-velocity'] },
    { key: 'vrs', label: 'Vortex Ring State', lessons: ['verticalflight', 'hover'] },
    { key: 'autorotation', label: 'Autorotation', lessons: ['autorotation', 'betdiagram', 'verticalflight'] },
  ];

  const TRANSFER_LESSONS = new Set(['verticalflight', 'envelope', 'dynamicrollover', 'lte', 'autorotation', 'performance', 'betdiagram', 'flaproll']);
  const CONCEPT_BY_LESSON = CONCEPTS.reduce((acc, concept) => {
    concept.lessons.forEach((id) => {
      if (!acc[id]) acc[id] = [];
      acc[id].push(concept.key);
    });
    return acc;
  }, {});

  function nowIso() { return new Date().toISOString(); }
  function parseDate(v) { const t = Date.parse(v || ''); return Number.isFinite(t) ? t : 0; }
  function dayKey(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }
  function hrsSince(v) { const t = parseDate(v); return t ? (Date.now() - t) / (60 * 60 * 1000) : Infinity; }

  function safeGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (e) { return fallback; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  const lessonStates = safeGet(LS_LESSON_STATES, {});
  const conceptStates = safeGet(LS_CONCEPT_STATES, {});
  const conceptMeta = safeGet(LS_CONCEPT_META, {});

  function ensureLessonStates() {
    const oldProgress = safeGet('helilab_progress_v1', {});
    HL_LESSONS.forEach((lesson) => {
      if (!lessonStates[lesson.id]) {
        const wasDone = oldProgress[lesson.id] === 'done';
        lessonStates[lesson.id] = {
          state: wasDone ? 'practiced' : 'not-started',
          lastVisited: '',
          checkAttempts: wasDone ? 1 : 0,
          checkCorrect: wasDone ? 1 : 0,
        };
      }
    });
    CONCEPTS.forEach((concept) => {
      if (!conceptMeta[concept.key]) {
        conceptMeta[concept.key] = {
          exposed: false,
          correctCount: 0,
          sessionDays: [],
          lastTouchedAt: '',
          lastCorrectAt: '',
          gapCorrectCount: 0,
          transferCorrect: false,
        };
      }
      if (!conceptStates[concept.key]) conceptStates[concept.key] = 'exposure';
    });
  }

  function saveAll() {
    safeSet(LS_LESSON_STATES, lessonStates);
    safeSet(LS_CONCEPT_STATES, conceptStates);
    safeSet(LS_CONCEPT_META, conceptMeta);
  }

  function getLessonState(lessonId) {
    return (lessonStates[lessonId] && lessonStates[lessonId].state) || 'not-started';
  }

  function recalcConceptState(conceptKey) {
    const m = conceptMeta[conceptKey];
    let state = 'exposure';
    if (m.correctCount >= 1) state = 'practiced';
    if (m.correctCount >= 2 && (m.sessionDays || []).length >= 2) state = 'developing';
    if (m.correctCount >= 4 && m.gapCorrectCount >= 1) state = 'proficient';
    if (state === 'proficient' && m.transferCorrect) state = 'mastered';
    conceptStates[conceptKey] = state;
  }

  function touchLesson(lessonId) {
    ensureLessonStates();
    const ls = lessonStates[lessonId];
    if (!ls) return;
    if (ls.state !== 'practiced' && ls.state !== 'mastered') ls.state = 'in-progress';
    ls.lastVisited = nowIso();
    (CONCEPT_BY_LESSON[lessonId] || []).forEach((conceptKey) => {
      const m = conceptMeta[conceptKey];
      m.exposed = true;
      m.lastTouchedAt = ls.lastVisited;
      recalcConceptState(conceptKey);
    });
    saveAll();
  }

  function recordCheck(lessonId, correct) {
    ensureLessonStates();
    const ls = lessonStates[lessonId];
    if (!ls) return;
    ls.checkAttempts = (ls.checkAttempts || 0) + 1;
    if (correct) {
      ls.checkCorrect = (ls.checkCorrect || 0) + 1;
      ls.state = ls.checkCorrect >= 2 ? 'mastered' : 'practiced';
      ls.lastVisited = nowIso();
      const today = dayKey(ls.lastVisited);
      (CONCEPT_BY_LESSON[lessonId] || []).forEach((conceptKey) => {
        const m = conceptMeta[conceptKey];
        m.exposed = true;
        m.correctCount = (m.correctCount || 0) + 1;
        m.lastTouchedAt = ls.lastVisited;
        if (today && !(m.sessionDays || []).includes(today)) m.sessionDays.push(today);
        if (m.lastCorrectAt && (parseDate(ls.lastVisited) - parseDate(m.lastCorrectAt)) >= DAY_MS) m.gapCorrectCount = (m.gapCorrectCount || 0) + 1;
        m.lastCorrectAt = ls.lastVisited;
        if (TRANSFER_LESSONS.has(lessonId)) m.transferCorrect = true;
        recalcConceptState(conceptKey);
      });
    } else if (!ls.lastVisited) {
      ls.lastVisited = nowIso();
    }
    saveAll();
  }

  function lessonById(id) { return HL_LESSONS.find((l) => l.id === id); }

  function practicedRatio(stageKey) {
    const lessons = HL_LESSONS.filter((l) => l.stage === stageKey);
    if (!lessons.length) return 0;
    const practiced = lessons.filter((l) => ['practiced', 'mastered'].includes(getLessonState(l.id))).length;
    return practiced / lessons.length;
  }

  function stageUnlocked(index) {
    if (index <= 0) return true;
    return practicedRatio(STAGE_META[index - 1].key) >= 0.5;
  }

  function nextAssessStage() {
    for (let i = 0; i < STAGE_META.length; i++) {
      if (!stageUnlocked(i)) break;
      const lessons = HL_LESSONS.filter((l) => l.stage === STAGE_META[i].key);
      const practiced = lessons.filter((l) => ['practiced', 'mastered'].includes(getLessonState(l.id))).length;
      if (practiced < lessons.length) return STAGE_META[i];
    }
    return STAGE_META[STAGE_META.length - 1];
  }

  function recommendedAction() {
    const inProgress = HL_LESSONS.find((lesson) => getLessonState(lesson.id) === 'in-progress');
    if (inProgress) return { type: 'continue', label: `Continue ${inProgress.title}`, lessonId: inProgress.id };

    const reviewConcept = CONCEPTS.find((concept) =>
      conceptStates[concept.key] === 'developing' && hrsSince(conceptMeta[concept.key].lastTouchedAt) > 24);
    if (reviewConcept) {
      return { type: 'review', label: `Review ${reviewConcept.label}`, lessonId: reviewConcept.lessons[0] };
    }

    const assessStage = nextAssessStage();
    const stageLessons = HL_LESSONS.filter((l) => l.stage === assessStage.key);
    return { type: 'assess', label: `Assess: ${assessStage.label.replace(/^Stage \d+ — /, '')}`, lessonId: stageLessons[0] && stageLessons[0].id };
  }

  function createStageCard(stageMeta, index, openLesson) {
    const stageLessons = HL_LESSONS.filter((l) => l.stage === stageMeta.key);
    const practiced = stageLessons.filter((l) => ['practiced', 'mastered'].includes(getLessonState(l.id))).length;
    const pct = Math.round((practiced / Math.max(stageLessons.length, 1)) * 100);
    const locked = !stageUnlocked(index);
    const wrap = document.createElement('section');
    wrap.className = 'stage-card' + (locked ? ' locked' : '');
    const lockMark = locked ? '<span aria-hidden="true">🔒</span>' : '';
    wrap.innerHTML = `
      <div class="stage-top">
        <div>
          <div class="stage-kicker">${stageMeta.label} ${lockMark}</div>
          <h2>${stageMeta.desc}</h2>
          <p>${stageLessons.length} lessons</p>
        </div>
        <div class="stage-ring" style="--stage-pct:${pct}%;" aria-label="${practiced} of ${stageLessons.length} lessons practiced">
          <span>${practiced}/${stageLessons.length}</span>
        </div>
      </div>
      <div class="stage-lessons"></div>
    `;
    const chips = wrap.querySelector('.stage-lessons');
    stageLessons.forEach((lesson) => {
      const chip = document.createElement('button');
      const state = getLessonState(lesson.id);
      chip.className = `lesson-chip ${state}`;
      chip.disabled = locked;
      chip.innerHTML = `<span>${lesson.title}</span><span class="chip-state" aria-hidden="true"></span>`;
      chip.title = locked ? 'Complete the previous stage first' : lesson.subtitle;
      chip.onclick = () => openLesson(lesson.id);
      chips.appendChild(chip);
    });
    return wrap;
  }

  function createConceptRow(concept) {
    const row = document.createElement('div');
    const state = conceptStates[concept.key] || 'exposure';
    row.className = 'concept-row';
    row.innerHTML = `<span>${concept.label}</span><span class="mastery-dot ${state}">${state}</span>`;
    return row;
  }

  function dueForReview() {
    return CONCEPTS
      .filter((concept) => ['practiced', 'developing'].includes(conceptStates[concept.key]) && hrsSince(conceptMeta[concept.key].lastTouchedAt) > 48)
      .slice(0, 3);
  }

  function renderHome(opts) {
    ensureLessonStates();
    const openLesson = opts && typeof opts.openLesson === 'function' ? opts.openLesson : () => {};
    const main = document.getElementById('hlMain');
    if (!main) return;
    main.innerHTML = '';
    const host = document.createElement('section');
    host.id = 'home-map';
    host.className = 'course-map';
    main.appendChild(host);
    host.hidden = false;
    host.innerHTML = '';

    const action = recommendedAction();
    const left = document.createElement('div');
    left.className = 'course-map-main';
    STAGE_META.forEach((stageMeta, index) => left.appendChild(createStageCard(stageMeta, index, openLesson)));

    const right = document.createElement('aside');
    right.className = 'course-map-rail';
    const cta = document.createElement('button');
    cta.className = 'cta-next';
    cta.textContent = action.label;
    cta.onclick = () => { if (action.lessonId) openLesson(action.lessonId); };
    right.appendChild(cta);

    const conceptBox = document.createElement('section');
    conceptBox.className = 'stage-card';
    conceptBox.innerHTML = '<div class="rail-title">Concept mastery</div><div class="concept-list"></div>';
    const list = conceptBox.querySelector('.concept-list');
    CONCEPTS.forEach((concept) => list.appendChild(createConceptRow(concept)));
    right.appendChild(conceptBox);

    const reviewBox = document.createElement('section');
    reviewBox.className = 'stage-card';
    reviewBox.innerHTML = '<div class="rail-title">Due for review</div><div class="review-strip"></div>';
    const strip = reviewBox.querySelector('.review-strip');
    const due = dueForReview();
    if (!due.length) strip.textContent = 'No concepts due right now.';
    due.forEach((concept) => {
      const chip = document.createElement('button');
      chip.className = `lesson-chip ${conceptStates[concept.key]}`;
      chip.innerHTML = `<span>${concept.label}</span><span class="chip-state" aria-hidden="true"></span>`;
      chip.onclick = () => openLesson(concept.lessons[0]);
      strip.appendChild(chip);
    });
    right.appendChild(reviewBox);

    host.appendChild(left);
    host.appendChild(right);
  }

  function resetProgress() {
    Object.keys(lessonStates).forEach((k) => delete lessonStates[k]);
    Object.keys(conceptStates).forEach((k) => delete conceptStates[k]);
    Object.keys(conceptMeta).forEach((k) => delete conceptMeta[k]);
    saveAll();
  }

  ensureLessonStates();
  saveAll();

  window.HLCourseMap = {
    getLessonState,
    touchLesson,
    recordCheck,
    renderHome,
    resetProgress,
  };
})();
