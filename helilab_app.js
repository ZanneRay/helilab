/* ===========================================================================
   helilab_app.js — HeliLab shell: ordered training, routing and progress
   ===========================================================================
   Seven ordered modules share task-specific evidence and resumable model state.
   Legacy lessons remain available as reference; the 3D lab is optional exploration.
   =========================================================================== */
'use strict';

(function () {
  const LS_PROGRESS = 'helilab_progress_v1';
  const LS_THEME = 'helilab_theme_v1';

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
  try { progress = JSON.parse(HLS.getItem(LS_PROGRESS) || '{}'); if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = {}; } catch (e) { progress = {}; }
  const saveProgress = () => { try { HLS.setItem(LS_PROGRESS, JSON.stringify(progress)); } catch (e) {} };

  const LESSON_BY_ID = Object.fromEntries([...HL_LESSONS,...HLTraining.lessons()].map((lesson) => [lesson.id, lesson]));
  const MODULE_BY_ID = Object.fromEntries(HL_V2_MODULES.map((module) => [module.id, module]));
  const MODULE_ACTIVITY_BY_LESSON = {};
  HL_V2_MODULES.forEach((module) => {
    (module.activities || []).forEach((activity) => {
      MODULE_ACTIVITY_BY_LESSON[activity.lessonId] = { ...activity, moduleId: module.id };
    });
  });

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
  let sidebarProgress = '';
  function setActiveCleanup(handle) {
    if (!handle) return;
    const previous = activeCleanup;
    if (typeof handle === 'function') activeCleanup = handle;
    else if (typeof handle.dispose === 'function') activeCleanup = () => handle.dispose();
    const next = activeCleanup;
    if (previous && previous !== next) activeCleanup = () => { previous(); next(); };
  }

  function cleanupActiveView() {
    if (!activeCleanup) return;
    try { activeCleanup(); } catch (e) { console.error('view cleanup failed', e); }
    activeCleanup = null;
  }

  function updateProgressBar() {
    const activities = HLTraining.activities();
    const total = activities.length;
    const doneN = activities.filter(a => HLTraining.complete(a)).length;
    $('#hlProgressFill').style.width = (doneN / total * 100) + '%';
    $('#hlProgressTxt').textContent = `${doneN} / ${total} activities`;
  }

  function routeForLesson(lessonId, forceLegacy) {
    if (!forceLegacy && MODULE_ACTIVITY_BY_LESSON[lessonId]) return `#/activity/${lessonId}`;
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
    if (parts[0] === 'module' && parts[1]) return { name: parts[2] === 'result' ? 'module-result' : 'module', moduleId: parts[1] };
    if (parts[0] === 'finish') return { name: 'finish' };
    if (parts[0] === 'activity' && parts[1]) return { name: 'activity', lessonId: decodeURIComponent(parts[1]), returnTo: query.get('return') };
    if (parts[0] === 'lesson' && parts[1]) return { name: 'lesson', lessonId: decodeURIComponent(parts[1]), returnTo: query.get('return') };
    if (parts[0] === 'rotor-lab') return { name: 'rotor-lab', preset: query.get('preset'), mode: query.get('mode'), returnTo: query.get('return') };
    if (parts[0] === 'record') return { name: 'record' };
    if (parts[0] === 'lab-tools') return { name: 'lab-tools' };
    if (parts[0] === 'maths') return { name: 'maths' };
    if (parts[0] === 'legacy') return { name: 'legacy-library' };
    return { name: 'home' };
  }

  function ensureValidRoute(route) {
    if ((route.name === 'activity' || route.name === 'lesson') && !LESSON_BY_ID[route.lessonId]) return { name: 'home' };
    if (route.name === 'activity' && !MODULE_ACTIVITY_BY_LESSON[route.lessonId]) return { name: 'lesson', lessonId: route.lessonId };
    if (['module','module-result'].includes(route.name) && !MODULE_BY_ID[route.moduleId]) return { name: 'home' };
    if (route.name === 'rotor-lab' && route.mode === 'guided' && route.preset && !HL_V2_PRESETS[route.preset]) {
      return { name: 'rotor-lab' };
    }
    if (route.returnTo && !MODULE_ACTIVITY_BY_LESSON[route.returnTo]) route.returnTo = null;
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
    const nav = $('#hlNav'); nav.innerHTML = '';
    nav.setAttribute('role','navigation'); nav.setAttribute('aria-label','HeliLab navigation');
    nav.appendChild(buttonNav('Learning path',route.name==='home','Your next step and all open activities',()=>navigate('#/home')));
    nav.appendChild(buttonNav('Look up a topic',['legacy-library','lesson'].includes(route.name),'Search explanations and sources',()=>navigate('#/legacy')));
    const journey=el('div','hl-nav-v2-group');
    journey.appendChild(el('div','hl-nav-v2-label','Seven modules in order'));
    for(const m of HL_V2_MODULES){
      const active=route.moduleId===m.id||route.name==='activity'&&MODULE_ACTIVITY_BY_LESSON[route.lessonId]?.moduleId===m.id;
      const count=m.activities.filter(HLTraining.complete).length;
      journey.appendChild(buttonNav(`${m.number} · ${m.title}`,active,`${count} / ${m.activities.length} complete`,()=>navigate(`#/module/${m.id}`)));
      if(active&&route.name==='activity'){
        const outline=el('div','cbt-nav-outline');
        m.activities.forEach((a,i)=>outline.appendChild(buttonNav(`${m.number}.${i+1} · ${a.title}`,a.lessonId===route.lessonId,HLTraining.status(a),()=>navigate(routeForLesson(a.lessonId)))));
        journey.appendChild(outline);
      }
    }
    nav.appendChild(journey);
    nav.appendChild(buttonNav('Learning record',route.name==='record','Saved evidence, backup and observations',()=>navigate('#/record')));
    nav.appendChild(buttonNav('Course summary',route.name==='finish','Review completed and open work',()=>navigate('#/finish')));
    const tools=el('div','hl-nav-v2-group');tools.appendChild(el('div','hl-nav-v2-label','Optional tools'));
    tools.appendChild(buttonNav('3D Rotor Lab',route.name==='rotor-lab','Explore freely',()=>navigate('#/rotor-lab')));
    tools.appendChild(buttonNav('Reference tools',['lab-tools','maths','legacy-library','lesson'].includes(route.name),'Maths and extra lessons',()=>navigate('#/lab-tools')));nav.appendChild(tools);
    sidebarProgress=HLTraining.activities().map(a=>HLTraining.status(a)).join('|');
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
        $('#hlMain').scrollTo({top:0,behavior:'instant'});
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

  function renderLessonBody(main,lesson,opts) {
    if(opts?.activityMeta){renderTrainingActivity(main,lesson,opts.activityMeta,opts.moduleMeta);return;}
    touchLesson(lesson.id);main.innerHTML='';
    main.appendChild(el('div','hl-lesson-head',`<div class="hl-lesson-stage">Reference library · ${lesson.stage}</div><h1>${lesson.title}</h1><div class="hl-lesson-sub">${lesson.subtitle}</div>`));
    const grid=el('div','hl-lesson-grid'+(lesson.wide?' hl-lesson-grid--wide':'')),read=el('div','hl-lesson-read');read.appendChild(el('div','hl-lesson-body',lesson.body));
    const tk=el('div','hl-takeaways');tk.appendChild(el('div','hl-takeaways-h','Key takeaways'));const ul=el('ul');(lesson.takeaways||[]).forEach(t=>ul.appendChild(el('li',null,t)));tk.appendChild(ul);read.appendChild(tk);
    const column=el('div','hl-lesson-widget'),mount=el('div','hl-widget-mount');mount.setAttribute('role','group');mount.setAttribute('aria-label','Interactive diagram: '+lesson.title);column.appendChild(mount);grid.appendChild(column);grid.appendChild(read);main.appendChild(grid);
    try{setActiveCleanup(HLW[lesson.widget](mount));}catch(e){mount.textContent='The reference model could not load.';console.error(e);}
    if(lesson.check)main.appendChild(buildCheck(lesson,lesson.check));
    if(lesson.appendix){const appendix=el('details','hl-appendix');appendix.appendChild(el('summary',null,lesson.appendix.title));const body=el('div','hl-appendix-body');appendix.appendChild(body);let built=false;appendix.addEventListener('toggle',()=>{if(appendix.open&&!built){built=true;try{setActiveCleanup(HLW[lesson.appendix.widget](body));}catch(e){body.textContent='The appendix could not load.';console.error(e);}}});main.appendChild(appendix);}
    if(HL_RELATED[lesson.id]?.length)main.appendChild(buildRelated(HL_RELATED[lesson.id]));
    if(lesson.bridge)main.appendChild(el('div','hl-bridge',lesson.bridge));
    const lessons=HL_LESSONS.filter(l=>!l.id.startsWith('cbt-')),idx=lessons.indexOf(lesson),foot=el('div','hl-lesson-foot');foot.appendChild(navAction(idx>0?'Previous reference':'Reference library',idx>0?routeForLesson(lessons[idx-1].id,true):'#/legacy'));foot.appendChild(navAction(idx<lessons.length-1?'Next reference':'Reference tools',idx<lessons.length-1?routeForLesson(lessons[idx+1].id,true):'#/lab-tools'));main.appendChild(foot);main.scrollTop=0;
  }

  function navAction(label,route,primary=false){const b=el('button','hl-foot-btn'+(primary?' primary':''),label);b.type='button';b.onclick=()=>navigate(route);return b;}
  function activityRows(module){
    const list=el('ol','cbt-path-list');
    module.activities.forEach((a,i)=>{
      const row=el('li','cbt-path-row'+(HLTraining.complete(a)?' is-complete':''));
      const open=el('button','cbt-path-open');open.type='button';
      open.innerHTML=`<span class="cbt-step-number">${module.number}.${i+1}</span><span><b>${a.title}</b><small>${a.transfer?'Apply to changed conditions':a.mode==='mission'?'Construct, commit and reveal':'Practise the mechanism'}</small></span><span class="cbt-path-status">${HLTraining.status(a)}</span>`;
      open.onclick=()=>navigate(routeForLesson(a.lessonId));row.appendChild(open);if(a.purpose){const purpose=el('p','cbt-step-purpose',a.keyIdea);row.appendChild(purpose);}list.appendChild(row);
    });return list;
  }
  function renderTrainingActivity(main,lesson,a,module){
    main.innerHTML='';const idx=module.activities.findIndex(x=>x.lessonId===a.lessonId);
    const head=el('div','hl-lesson-head',`<div class="hl-lesson-stage">Module ${module.number} of 7 · Activity ${idx+1} of ${module.activities.length}</div><h1>${module.number}.${idx+1} · ${a.title}</h1><div class="hl-lesson-sub">${module.title}</div>`);main.appendChild(head);
    const context=el('div','cbt-path-context');context.append(navAction('Read the explanation',routeForLesson(a.legacyLessonId,true)+'?return='+encodeURIComponent(a.lessonId)),navAction('View module path',`#/module/${module.id}`));
    const earlier=HLTraining.activities().slice(0,HLTraining.activities().findIndex(x=>x.lessonId===a.lessonId)).filter(x=>!HLTraining.complete(x));
    if(earlier.length){const notice=el('p','cbt-status',`${earlier.length} earlier ${earlier.length===1?'activity remains':'activities remain'} open. You may explore this step; the recommended route starts at the first open activity.`);notice.appendChild(navAction('Go to first open step',routeForLesson(earlier[0].lessonId)));context.appendChild(notice);}
    if(currentRoute.returnTo){const target=MODULE_ACTIVITY_BY_LESSON[currentRoute.returnTo];context.appendChild(navAction('Return to '+target.title,routeForLesson(target.lessonId),true));}
    main.appendChild(context);
    if(a.keyIdea)main.appendChild(el('section','cbt-key-idea',`<b>${a.purpose}</b><p>${a.keyIdea}</p>`));
    const grid=el('div','hl-lesson-grid cbt-model-grid');
    const wCol=el('div','hl-lesson-widget'),mount=el('div','hl-widget-mount');mount.setAttribute('role','group');mount.setAttribute('aria-label','Interactive model: '+a.title);wCol.appendChild(mount);grid.appendChild(wCol);
    const reference=el('details','hl-lesson-read cbt-model-reference');reference.appendChild(el('summary',null,'Model reference and key ideas'));reference.appendChild(el('div','hl-lesson-body',a.bodyHtml));
    const ul=el('ul');(a.takeaways||[]).forEach(t=>ul.appendChild(el('li',null,t)));reference.appendChild(ul);
    if(a.threeDPreset)reference.appendChild(navAction('Inspect this in the optional 3D lab',`#/rotor-lab?preset=${encodeURIComponent(a.threeDPreset)}&mode=guided&return=${encodeURIComponent(a.lessonId)}`));
    grid.appendChild(reference);main.appendChild(grid);
    let updateActions=()=>{};
    try{setActiveCleanup(HLW[a.widget](mount,a));setActiveCleanup(HLTrainingUI.mount(main,grid,mount,lesson,a,module,()=>{updateProgressBar();updateActions();const status=HLTraining.activities().map(a=>HLTraining.status(a)).join('|');if(status!==sidebarProgress)buildSidebar(currentRoute);}));}
    catch(e){mount.textContent='The model could not load. Reload this page to retry.';console.error(e);}
    if(a.nextLink)main.appendChild(el('p','cbt-next-link',a.nextLink));
    const foot=el('div','hl-lesson-foot cbt-activity-footer');
    foot.appendChild(navAction(idx>0?'Previous activity':'Module overview',idx>0?routeForLesson(module.activities[idx-1].lessonId):`#/module/${module.id}`));
    const next=el('button','hl-foot-btn primary');next.type='button';foot.appendChild(next);
    updateActions=()=>{
      const complete=HLTraining.complete(a);
      next.textContent=!complete?'Finish this activity':idx<module.activities.length-1?'Next: '+module.activities[idx+1].title:`View Module ${module.number} result`;
      next.onclick=()=>{if(!HLTraining.complete(a)){mount._hlContinue?.();return;}navigate(idx<module.activities.length-1?routeForLesson(module.activities[idx+1].lessonId):`#/module/${module.id}/result`);};
    };updateActions();main.appendChild(foot);
    const outline=el('details','cbt-module-outline');outline.appendChild(el('summary',null,'Open another activity in this module'));outline.appendChild(activityRows(module));main.appendChild(outline);main.scrollTop=0;
  }

  function renderHome() {
    const main=$('#hlMain');main.innerHTML='';
    const next=HLTraining.next(),total=HLTraining.activities().length,done=HLTraining.activities().filter(HLTraining.complete).length;
    const head=el('section','cbt-path-head',`<div class="hl-home-kicker">HELILAB · Competency-oriented training</div><h1>Your learning path</h1><p>Seven modules, ${total} activities. Explore, compare evidence and explain the mechanism.</p><p class="cbt-status">${done} / ${total} activities complete</p>`);
    if(next){const m=HL_V2_MODULES.find(m=>m.activities.includes(next)),i=m.activities.indexOf(next);head.appendChild(el('p','cbt-next-description',`<b>Next recommended step: ${m.number}.${i+1} · ${next.title}</b><br>The first open activity in the route.`));head.appendChild(navAction(HLProgress.get(next.lessonId).viewed?'Continue this step':'Start this step',routeForLesson(next.lessonId),true));}
    else{head.appendChild(el('p',null,'All current activities are complete. Review your evidence and decide which changed cases need more practice.'));head.appendChild(navAction('View course summary','#/finish',true));}
    head.appendChild(navAction('Look up a topic','#/legacy'));
    main.appendChild(head);
    const last=HLProgress.all().lastActivity;
    if(last&&MODULE_ACTIVITY_BY_LESSON[last]&&last!==next?.lessonId){const resume=el('p','cbt-status','Last visited: '+MODULE_ACTIVITY_BY_LESSON[last].title+' ');resume.appendChild(navAction('Return to last visited step',routeForLesson(last)));main.appendChild(resume);}
    for(const m of HL_V2_MODULES){
      const detail=el('details','cbt-path-module');detail.open=!!next&&m.activities.includes(next);const count=m.activities.filter(HLTraining.complete).length;
      detail.appendChild(el('summary',null,`${m.number} · ${m.title}<span class="cbt-module-count">${count} / ${m.activities.length} complete</span>`));detail.appendChild(el('p',null,m.outcome));detail.appendChild(activityRows(m));detail.append(navAction('Module overview',`#/module/${m.id}`),navAction('Module result',`#/module/${m.id}/result`));main.appendChild(detail);
    }
    const optional=el('details','cbt-optional');optional.appendChild(el('summary',null,'Optional exploration and reference tools'));optional.appendChild(el('p',null,'These tools support exploration. They do not add steps to the numbered learning path.'));optional.append(navAction('3D Rotor Lab','#/rotor-lab'),navAction('Reference tools','#/lab-tools'));main.appendChild(optional);
    main.appendChild(el('p','cbt-status','Your work is stored in this browser. Export a backup from Learning record. Completion records practice; instructor observations are recorded separately.'));
    main.scrollTop=0;
  }

  function renderModule(moduleId) {
    const main=$('#hlMain'),m=MODULE_BY_ID[moduleId];main.innerHTML='';
    const done=m.activities.filter(HLTraining.complete).length,next=m.activities.find(a=>!HLTraining.complete(a));
    main.appendChild(el('section','hl-v2-module-head',`<div class="hl-v2-section-kicker">Module ${m.number} of 7</div><h1>${m.title}</h1><p>${m.outcome}</p><p class="cbt-status">${done} / ${m.activities.length} complete</p>`));
    if(next)main.appendChild(navAction('Continue: '+next.title,routeForLesson(next.lessonId),true));else main.appendChild(navAction('Review module result',`#/module/${m.id}/result`,true));
    main.appendChild(el('p',null,'Follow the numbered activities in order. You can also revisit a step; open work remains visible.'));
    if(m.id==='m1')main.appendChild(el('section','cbt-key-idea','<b>From aircraft to section, then back to the rotor</b><p>First explore three relationships: force versus motion, pitch versus airflow, and radius versus speed. Then compare forward-flight flow, construct the force picture and apply it to a changed case. The first four activities build the tools; the final two ask you to use them.</p>'));
    main.appendChild(activityRows(m));main.appendChild(navAction('View module result',`#/module/${m.id}/result`));main.scrollTop=0;
  }
  function renderModuleResult(moduleId){
    const main=$('#hlMain'),m=MODULE_BY_ID[moduleId];main.innerHTML='';
    const remaining=m.activities.filter(a=>!HLTraining.complete(a));
    main.appendChild(el('div','hl-lesson-head',`<div class="hl-lesson-stage">Module ${m.number} result</div><h1>${remaining.length?'Open work in':'Completed practice in'} ${m.title}</h1><p>${m.activities.length-remaining.length} / ${m.activities.length} activities complete</p>`));
    main.appendChild(el('p',null,m.outcome));
    main.appendChild(el('p','cbt-status',HLTraining.observation(m).label));
    const following=HL_V2_MODULES[m.number];main.appendChild(navAction(remaining.length?'Finish first open step':following?'Continue to Module '+following.number:'View course summary',remaining.length?routeForLesson(remaining[0].lessonId):following?'#/module/'+following.id:'#/finish',true));
    for(const a of m.activities){const row=el('section','cbt-result-row');row.appendChild(el('h2',null,a.title));row.appendChild(el('p','cbt-status',HLTraining.status(a)));
      if(HLTraining.complete(a)){const requirements=HLTraining.evidence(a,HLProgress.get(a.lessonId).snapshots);const list=el('ul');requirements.filter(r=>r.passed).forEach(r=>list.appendChild(el('li',null,r.label)));const proof=el('details','cbt-result-proof');proof.appendChild(el('summary',null,'View saved model evidence'));proof.appendChild(list);row.appendChild(proof);
        if(a.transfer)row.appendChild(el('p',null,HLTraining.independent(a)?'Current case: checks answered before feedback. The quality of the explanation needs human review.':'Current case: completed with feedback or support. Try a new changed case after targeted practice.'));
      }row.appendChild(navAction(HLTraining.complete(a)?'Review this activity':'Complete this activity',routeForLesson(a.lessonId)));main.appendChild(row);
    }
    const practise=new Set();for(const a of m.activities)for(const q of HLTraining.questions(a)){const d=HLProgress.get(a.lessonId).decisions[q.key];if(d&&(!d.correct||d.assisted))practise.add(q.revisit);}
    if(practise.size){const section=el('section','cbt-panel', '<h2>Suggested targeted practice</h2><p>These mechanisms appeared in decisions needing feedback or support. Revisit them, then attempt a new changed case.</p>');for(const id of practise){const a=MODULE_ACTIVITY_BY_LESSON[id];if(a)section.appendChild(navAction(a.title,routeForLesson(id)));}main.appendChild(section);}
    const nextModule=HL_V2_MODULES[m.number],actions=el('div','hl-home-actions');
    if(remaining.length)actions.appendChild(navAction('Finish first open step',routeForLesson(remaining[0].lessonId),true));
    else actions.appendChild(navAction(nextModule?'Continue to Module '+nextModule.number:'View course summary',nextModule?`#/module/${nextModule.id}`:'#/finish',true));
    actions.appendChild(navAction('Learning record and instructor observations','#/record'));main.appendChild(actions);
    main.appendChild(el('p','cbt-status','A completed module records model practice and checks. It does not certify operational competence.'));
  }
  function renderFinish(){
    const main=$('#hlMain'),open=HLTraining.activities().filter(a=>!HLTraining.complete(a));main.innerHTML='';
    main.appendChild(el('h1',null,open.length?'Course summary — open work remains':'Learning path complete'));
    main.appendChild(el('p',null,`${HLTraining.activities().length-open.length} / ${HLTraining.activities().length} activities complete. Review the evidence, supported attempts and human observations before deciding the next practice.`));
    if(open.length)main.appendChild(navAction('Continue first open activity',routeForLesson(open[0].lessonId),true));
    const table=el('table','cbt-data-table cbt-course-table'),body=el('tbody'),head=el('thead'),headRow=el('tr');
    for(const label of ['Module','Completed practice','Checks before feedback','Human observation']){const th=el('th',null,label);th.scope='col';headRow.appendChild(th);}head.appendChild(headRow);table.appendChild(head);
    for(const m of HL_V2_MODULES){const row=el('tr'),name=el('th');name.scope='row';name.appendChild(navAction(`${m.number} · ${m.title}`,`#/module/${m.id}/result`));const completed=m.activities.filter(HLTraining.complete).length,transfers=m.activities.filter(a=>a.transfer&&HLTraining.complete(a));row.append(name,el('td',null,`${completed} / ${m.activities.length} complete`),el('td',null,`${transfers.filter(HLTraining.independent).length} / ${m.activities.filter(a=>a.transfer).length} current changed cases checked before feedback`),el('td',null,HLTraining.observation(m).label));body.appendChild(row);}table.appendChild(body);main.appendChild(table);
    main.appendChild(navAction('Review evidence / export backup','#/record',true));main.appendChild(el('p','cbt-status','The app stores model evidence and decisions. Free explanations require human review; activity completion is practice, not pilot certification.'));
  }

  function renderActivity(lessonId) {
    const activityMeta = MODULE_ACTIVITY_BY_LESSON[lessonId];
    const moduleMeta = activityMeta ? MODULE_BY_ID[activityMeta.moduleId] : null;
    renderLessonBody($('#hlMain'), LESSON_BY_ID[lessonId], { moduleMeta, activityMeta });
  }

  function renderLegacyLesson(lessonId) {
    const main=$('#hlMain');renderLessonBody(main,LESSON_BY_ID[lessonId],{legacy:true});
    const grid=main.querySelector('.hl-lesson-grid'),read=grid.querySelector('.hl-lesson-read'),widget=grid.querySelector('.hl-lesson-widget');
    grid.classList.add('hl-reference-layout');grid.prepend(read);
    const model=el('details','hl-reference-model');model.append(el('summary',null,'Explore the optional model'),widget);grid.append(model);
    const actions=el('div','hl-inline-actions');actions.append(navAction('Search topics','#/legacy'));
    const activity=MODULE_ACTIVITY_BY_LESSON[currentRoute.returnTo]||HLTraining.activities().find(a=>a.legacyLessonId===lessonId&&!a.transfer);
    if(activity)actions.append(navAction(currentRoute.returnTo?'Return to your activity':'Practise this topic',routeForLesson(activity.lessonId)));
    main.insertBefore(actions,grid);main.querySelector('.hl-lesson-stage').textContent='REFERENCE · Explanation and sources';main.scrollTop=0;
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
      full.onclick = () => navigate('#/rotor-lab'+(route.returnTo?'?return='+encodeURIComponent(route.returnTo):''));
      const backModule = guided.moduleId || 'm1';
      const back = el('button', 'hl-foot-btn', route.returnTo ? 'Return to saved activity' : `Back to Module ${MODULE_BY_ID[backModule] ? MODULE_BY_ID[backModule].number : 1}`);
      back.onclick = () => navigate(route.returnTo ? routeForLesson(route.returnTo) : `#/module/${backModule}`);
      note.appendChild(full);
      note.appendChild(back);
      main.appendChild(note);
      const mount = el('div', 'hl-guided-rotor-mount');
      main.appendChild(mount);
      setActiveCleanup(HLW.wGuidedRotorLab(mount, guided));
    } else {
      if(route.returnTo)main.appendChild(navAction('Return to saved activity',routeForLesson(route.returnTo),true));
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
    try { setActiveCleanup(HLW.wBetModel(mount)); } catch (e) {
      mount.innerHTML = '<div class="hl-err">Maths error: ' + e.message + '</div>';
      console.error(e);
    }
    main.appendChild(buildRelated(['bet-velocity', 'bladeelement', 'bet-guided', 'betdiagram']));
    main.scrollTop = 0;
  }

  function renderLegacyLibrary() {
    const main=$('#hlMain');main.innerHTML='';
    main.append(el('section','hl-v2-section','<div class="hl-v2-section-kicker">REFERENCE</div><h1>Look up a topic</h1><p>Read an explanation and its sources directly. You can open an optional model or return to the learning path.</p>'));
    const label=el('label','cbt-field');label.append(el('span',null,'Search topics'));
    const search=el('input');search.type='search';search.placeholder='Try flapping, twist, stall or inflow';search.setAttribute('aria-label','Search topics');label.append(search);main.append(label);
    const count=el('p','cbt-status'),results=el('div');count.setAttribute('role','status');main.append(count,results);
    const aliases={flapping:'flap flap rate bladbeweging',envelope:'retreating blade stall rbs twist washout overtrek',bladeelement:'angle of attack invalshoek pitch lift', 'bet-velocity':'velocity triangle relatieve stroming snelheidsdriehoek inflow',flaproll:'transverse flow inflow rol',spanwise:'radius radiaal twist washout'};
    const draw=()=>{
      const term=search.value.trim().toLowerCase(),lessons=HL_LESSONS.filter(l=>!l.id.startsWith('cbt-')).filter(l=>(l.title+' '+l.subtitle+' '+l.body.replace(/<[^>]*>/g,' ')+' '+(aliases[l.id]||'')).toLowerCase().includes(term));results.innerHTML='';count.textContent=lessons.length+' topics'+(term?' matching your search':'');
      for(const stage of HL_STAGES){const group=lessons.filter(l=>l.stage===stage);if(!group.length)continue;const sec=el('section','hl-v2-section hl-v2-section--compact');sec.append(el('div','hl-v2-section-kicker',stage));const list=el('div','hl-legacy-list');for(const l of group){const item=el('button','hl-legacy-item',`<b>${l.title}</b><small>${l.subtitle}</small>`);item.onclick=()=>navigate(routeForLesson(l.id,true));list.append(item);}sec.append(list);results.append(sec);}
      if(!lessons.length)results.append(el('p',null,'No matching topic. Try a shorter term or another name for the mechanism.'));
    };search.oninput=draw;draw();main.scrollTop=0;
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
    else if (route.name === 'module-result') renderModuleResult(route.moduleId);
    else if (route.name === 'finish') renderFinish();
    else if (route.name === 'activity') renderActivity(route.lessonId);
    else if (route.name === 'lesson') renderLegacyLesson(route.lessonId);
    else if (route.name === 'rotor-lab') renderRotorLab(route);
    else if (route.name === 'maths') renderMaths();
    else if (route.name === 'record') HLTrainingUI.record($('#hlMain'), ()=>buildSidebar(currentRoute));
    else if (route.name === 'legacy-library') renderLegacyLibrary();
    else renderLabTools();
    $('#hlMain').dataset.route = location.hash;
    $('#hlMain').scrollTo({top:0,behavior:'instant'});
  }

  function syncSidebar() {
    const sidebar = $('#hlSidebar');
    sidebar.inert = matchMedia('(max-width: 820px)').matches && !sidebar.classList.contains('open');
  }

  function handleRoute() {
    let route;
    try { route = ensureValidRoute(parseRoute(location.hash)); } catch (e) { route = {name:'home'}; }
    renderRoute(route);
    $('#hlSidebar').classList.remove('open');
    $('#hlMenuBtn').setAttribute('aria-expanded','false');
    syncSidebar();
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

    $('#hlResetBtn').onclick = () => {
      if (confirm('Delete all local training evidence, reflections and reviews? Export your learning record first to keep a backup.')) {
        HLProgress.reset();
        progress = {};
        saveProgress();
        if (window.HLCourseMap) window.HLCourseMap.resetProgress();
        navigate('#/home', { replace: true });
      }
    };

    const sidebar = $('#hlSidebar');
    $('#hlMenuBtn').setAttribute('aria-expanded','false');
    $('#hlMenuBtn').onclick = () => { $('#hlMenuBtn').setAttribute('aria-expanded', String(sidebar.classList.toggle('open'))); syncSidebar(); };
    window.addEventListener('resize', syncSidebar);
    window.addEventListener('keydown', e => { if(e.key==='Escape' && sidebar.classList.contains('open')) { sidebar.classList.remove('open'); $('#hlMenuBtn').setAttribute('aria-expanded','false'); syncSidebar(); $('#hlMenuBtn').focus(); } });
    document.querySelector('.cbt-skip').onclick = e => { e.preventDefault(); $('#hlMain').focus(); };
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
