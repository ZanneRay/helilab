/* Task-specific evidence and a three-phase learner flow. Free explanations are not auto-graded. */
'use strict';
const HLTrainingUI=(()=>{
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,fn,primary=false)=>{const b=node('button',text,'hl-foot-btn'+(primary?' primary':''));b.type='button';b.onclick=fn;return b;};
  function field(parent,label,value='',multiline=true){const wrap=node('label',null,'cbt-field');wrap.append(node('span',label));const input=node(multiline?'textarea':'input');input.value=value;input.maxLength=multiline?4000:120;if(multiline)input.rows=3;wrap.append(input);parent.append(wrap);return input;}
  const results=(a,s)=>HLTraining.questions(a).map(q=>({q,d:s.decisions[q.key]?.question===q.id?s.decisions[q.key]:null}));
  const evidenceOK=(a,s)=>HLTraining.evidence(a,s.snapshots).every(r=>r.passed);
  function mount(main,grid,widget,lesson,a,module,onUpdate){
    const id=a.lessonId;HLProgress.prepare(id,a.version);HLProgress.visit(id);
    let restoring=true,disposed=false;
    let phase=HLTraining.complete(a)?'done':HLProgress.get(id).phase;
    if(phase==='done'&&!HLTraining.complete(a))phase='model';
    if((a.internalPrediction||!a.transfer)&&phase==='predict')phase='model';
    grid.hidden=false;
    const saved=HLProgress.get(id).checkpoint;
    if(saved)try{widget._hlModel.set(saved);}catch(e){HLProgress.patch(id,{checkpoint:null,phase:a.internalPrediction||!a.transfer?'model':'predict'});phase=a.internalPrediction||!a.transfer?'model':'predict';}
    restoring=false;
    const top=node('section',null,'cbt-task-head');
    if(a.taskSteps){const steps=node('ol',null,'cbt-task-steps');a.taskSteps.forEach(text=>steps.append(node('li',text)));top.append(steps);}else top.append(node('p',a.task,'cbt-task-instruction'));
    const criterion=node('details',null,'cbt-criterion');criterion.append(node('summary','What this activity demonstrates'),node('p',a.criteria));top.append(criterion);
    if(HLProgress.get(id).prior){const note=node('p','This task has been updated. Your earlier work is kept in Learning record; complete the revised task here.','cbt-status');top.append(note);}
    const previous=HLProgress.get(id),currentQuestions=HLTraining.questions(a);
    if(currentQuestions.some(q=>previous.decisions[q.key]&&previous.decisions[q.key].question!==q.id)||previous.complete&&currentQuestions.some(q=>!previous.decisions[q.key]))top.append(node('p','The content checks have been revised. Your saved model comparisons and explanation are retained; answer the updated checks to complete this activity.','cbt-status cbt-content-update'));
    const phases=node('nav',null,'cbt-phases');phases.setAttribute('aria-label','Activity phases');
    const phaseButtons=[];
    for(const [value,label] of (a.internalPrediction?[['model','1 · Build & compare'],['check','2 · Check & explain']]:a.transfer?[['predict','1 · Analyse the case'],['model','2 · Compare'],['check','3 · Check & explain']]:[['model','1 · Explore & compare'],['check','2 · Check & explain']])){const b=button(label,()=>go(value));b.dataset.phase=value;phaseButtons.push(b);phases.append(b);}
    top.append(phases);main.insertBefore(top,grid);
    const predict=node('section',null,'cbt-panel');predict.append(node('h2',a.scenario?'Analyse the problem first':'Make a prediction'));
    const caseBox=node('div',null,'cbt-brief');
    const scenario=typeof a.scenario==='function'?a.scenario(HLProgress.get(id).variant):a.scenario;
    if(scenario){caseBox.append(node('p',scenario.brief));const table=node('table',null,'cbt-data-table');const body=node('tbody');for(const [k,v] of scenario.data){const row=node('tr');row.append(node('th',k),node('td',v));body.append(row);}table.append(body);caseBox.append(table);predict.append(caseBox);const reference=node('details',null,'cbt-case-reference');reference.append(node('summary','View supplied case data'),caseBox.cloneNode(true));top.insertBefore(reference,phases);}
    else if(a.transfer){predict.append(node('p','Changed conditions. Give your own reasoning before opening the models.'));for(const q of HLTraining.questions(a))predict.append(node('p',q.prompt));}
    const prediction=field(predict,a.scenario?'Your first analysis: conditions, expected changes and the evidence you will need.':'Your prediction and reason — what will change, and what will stay constant?',HLProgress.get(id).prediction);
    prediction.oninput=()=>HLProgress.patch(id,{prediction:prediction.value});
    const predictStatus=node('p',null,'cbt-status');predictStatus.setAttribute('role','status');
    predict.append(button('Open the model',()=>{if(!prediction.value.trim()){predictStatus.textContent='Give a prediction with a reason before opening the model.';prediction.focus();return;}HLProgress.attempt(id,'prediction',false,prediction.value.trim(),{variant:HLProgress.get(id).variant});go('model');},true),predictStatus);
    main.insertBefore(predict,grid);
    const compare=node('section',null,'cbt-panel');compare.append(node('h2','Save the evidence for this task'));
    if(!a.transfer&&!a.internalPrediction){const optional=node('details',null,'cbt-optional-prediction');optional.append(node('summary','Add a prediction note (optional)'),node('p','Before changing a control, consider what you expect. You may think it through or keep a short note. This note is not required to open or complete the exercise.'));const note=field(optional,'Optional prediction note',HLProgress.get(id).prediction);note.oninput=()=>HLProgress.patch(id,{prediction:note.value});compare.append(optional);}
    const checklist=node('ul',null,'cbt-requirements'),states=node('div',null,'cbt-saved-states');compare.append(checklist);
    const captureStatus=node('p',null,'cbt-status');captureStatus.setAttribute('role','status');
    const capture=button(a.internalPrediction?'Save completed model evidence':'Save this model state',async()=>{
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(disposed)return;
      const snap=HLModelState.snapshot(widget),s=HLProgress.get(id);
      if(!Object.keys(snap.values).length){captureStatus.textContent='Wait for the model values to appear, then save again.';return;}
      if(s.snapshots.length>=16){captureStatus.textContent='You have 16 saved states. Remove a duplicate before saving another.';return;}
      HLProgress.patch(id,{snapshots:[...s.snapshots,snap],checkpoint:JSON.parse(JSON.stringify(snap.state)),complete:false});
      HLProgress.attempt(id,'model-evidence',false,JSON.stringify({model:snap.model,inputs:snap.inputs,values:snap.values,gates:snap.evidence.gates||{}}),{variant:s.variant});
      captureStatus.textContent='State saved. The checklist shows which comparisons are still needed.';refresh();
    });
    const toCheck=button('Check your reasoning',()=>go('check'),true);compare.append(capture,captureStatus,states,toCheck);
    main.insertBefore(compare,grid.nextSibling);
    const panel=node('section',null,'cbt-panel');panel.append(node('h2',a.transfer?'Decide, explain and review':'Check the mechanism'));
    const checks=node('div');panel.append(checks);
    const explanation=a.transfer?field(panel,'Explain your conclusion using the saved evidence. State what stayed constant and connect the causal steps.',HLProgress.get(id).reflection):null;
    const limitation=a.transfer?field(panel,'State one assumption, missing piece of information or limit of your conclusion.',HLProgress.get(id).limitation||''):null;
    if(explanation)explanation.oninput=()=>{HLProgress.patch(id,{reflection:explanation.value,complete:false});refresh(false);};
    if(limitation)limitation.oninput=()=>{HLProgress.patch(id,{limitation:limitation.value,complete:false});refresh(false);};
    const rubric=node('input');rubric.type='checkbox';rubric.checked=HLProgress.get(id).selfReview;
    const rubricLabel=node('label',null,'cbt-option');rubricLabel.append(rubric,node('span',a.transfer?'I checked my conditions, mechanism, evidence and limitation against the activity criterion. This is self-review.':'I compared my result with the criterion and feedback.'));
    panel.append(rubricLabel);
    rubric.onchange=()=>{HLProgress.patch(id,{selfReview:rubric.checked});refresh(false);};
    const complete=button('Complete this activity',()=>{refresh(false);const s=HLProgress.get(id);if(complete.disabled)return;HLProgress.patch(id,{complete:true,phase:'done'});HLProgress.attempt(id,'completion',true,a.criteria,{variant:s.variant});go('done');},true);
    const status=node('p',null,'cbt-status');status.setAttribute('role','status');panel.append(complete,status);
    if(a.transfer)panel.append(button('Start a new changed case',newCase));
    main.insertBefore(panel,compare.nextSibling);
    const done=node('section',null,'cbt-panel cbt-completion');done.append(node('h2','Activity complete'));
    const summary=node('p'),doneEvidence=node('div');done.append(summary,doneEvidence);
    const note=node('p','Your explanation and the breadth of your understanding can be reviewed with an instructor. Activity completion records practice, not certified competence.','cbt-status');done.append(note);
    done.append(button('Review saved work',()=>go('check')),button(a.transfer?'Practise a new case':'Practise this task again',newCase));main.insertBefore(done,panel.nextSibling);
    function newCase(){
      const s=HLProgress.get(id);HLProgress.attempt(id,'previous-case-summary',false,JSON.stringify({prediction:s.prediction,explanation:s.reflection,limitation:s.limitation,decisions:s.decisions}),{variant:s.variant});
      HLProgress.patch(id,{variant:s.variant+1,complete:false,performed:false,explored:false,prediction:'',reflection:'',limitation:'',selfReview:false,snapshots:[],checkpoint:null,decisions:{},phase:a.internalPrediction||!a.transfer?'model':'predict'});
      onUpdate();window.HLApp.openLesson(id);
    }
    function renderCases(){checks.innerHTML='';for(const item of HLTraining.questions(a))checks.append(renderCase(item));}
    function renderCase(item){
      const box=node('fieldset',null,'cbt-case');box.append(node('legend',item.prompt));
      const s=HLProgress.get(id),saved=s.decisions[item.key]?.question===item.id?s.decisions[item.key]:null;let choice=saved?.choice??null;
      const order=item.options.map((text,index)=>({text,index}));for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(const opt of order){const label=node('label',null,'cbt-option'),radio=node('input');radio.type='radio';radio.name=id+'-'+item.key;radio.value=opt.index;radio.checked=choice===opt.index;radio.disabled=!!saved;radio.onchange=()=>{choice=opt.index;};label.append(radio,node('span',opt.text));box.append(label);}
      const feedback=node('p');feedback.setAttribute('role','status');
      const submit=button('Commit decision',()=>{
        if(choice==null){feedback.textContent='Choose a response first.';return;}
        const state=HLProgress.get(id),correct=choice===item.answer;
        const assisted=state.revealed.includes(item.id)||state.snapshots.some(s=>s.evidence.support===true);
        const decisions={...state.decisions,[item.key]:{choice,correct,assisted,question:item.id}};
        HLProgress.patch(id,{decisions,revealed:[...new Set([...state.revealed,item.id])].slice(-200),complete:false});
        HLProgress.attempt(id,'decision',correct,item.prompt+'\nSelected: '+item.options[choice],{variant:state.variant,question:item.id,choice,assisted});
        box.replaceWith(renderCase(item));refresh(false);
      });submit.disabled=!!saved;
      box.append(submit,feedback);
      if(saved){feedback.textContent=(saved.correct?(saved.assisted?'Correct after support. ':'Correct before feedback. '):'Revisit the mechanism. ')+item.why;feedback.className='hl-check-fb '+(saved.correct?'ok':'no');
        if(!saved.correct){const revisit=node('a','Practise the underlying mechanism','hl-foot-btn');revisit.href='#/activity/'+item.revisit+'?return='+encodeURIComponent(id);box.append(revisit,button('Retry after feedback',()=>{const next={...HLProgress.get(id).decisions};delete next[item.key];HLProgress.patch(id,{decisions:next});box.replaceWith(renderCase(item));refresh(false);}));}
      }
      return box;
    }
    function updateReference(){if(!a.internalPrediction)return;const reference=grid.querySelector('.cbt-model-reference'),gates=widget._hlModel.evidence?.().gates||{};if(reference)reference.hidden=!a.requirements.every(r=>r.kind==='gates'&&r.keys.every(k=>gates[k]===true));}
    function checkpoint(){if(restoring||disposed)return;HLProgress.patch(id,{checkpoint:JSON.parse(JSON.stringify(widget._hlModel.get()))});updateReference();}
    for(const event of ['input','change','click','pointerup'])widget.addEventListener(event,checkpoint);
    function go(value){
      const s=HLProgress.get(id);
      if(value==='model'&&a.transfer&&!a.internalPrediction&&!s.prediction.trim())value='predict';
      if(value==='check'&&!evidenceOK(a,s))value='model';
      phase=value;HLProgress.patch(id,{phase});refresh(false);
      const target=phase==='predict'?predict:phase==='model'?grid:phase==='check'?panel:done;
      target.scrollIntoView({block:'start',behavior:'instant'});const heading=target.querySelector('h2')||target;heading.tabIndex=-1;heading.focus({preventScroll:true});
    }
    function refresh(rebuildStates=true){
      updateReference();
      const s=HLProgress.get(id),requirements=HLTraining.evidence(a,s.snapshots),hasEvidence=requirements.every(r=>r.passed),passed=results(a,s).every(({q,d})=>d?.correct&&d.question===q.id);
      const predicted=!a.transfer||a.internalPrediction||!!s.prediction.trim(),explained=!a.transfer||!!s.reflection.trim()&&!!s.limitation?.trim();
      const performed=predicted&&hasEvidence&&passed;
      const qualified=performed&&explained&&s.selfReview;
      if(s.performed!==performed||s.explored!==hasEvidence||s.complete&&!qualified)HLProgress.patch(id,{performed,explored:hasEvidence,complete:s.complete&&qualified});
      complete.disabled=!(performed&&explained&&s.selfReview);
      toCheck.disabled=!hasEvidence;
      for(const b of phaseButtons){const p=b.dataset.phase;b.disabled=(p==='check'&&!hasEvidence)||(p==='model'&&a.transfer&&!a.internalPrediction&&!s.prediction.trim());b.setAttribute('aria-current',p===phase?'step':'false');}
      predict.hidden=phase!=='predict';grid.hidden=phase!=='model';compare.hidden=phase!=='model';panel.hidden=phase!=='check';done.hidden=phase!=='done';
      checklist.innerHTML='';for(const r of requirements){const li=node('li',(r.passed?'✓ ':'○ ')+r.label,r.passed?'is-complete':'');li.dataset.passed=String(r.passed);checklist.append(li);}
      if(rebuildStates){states.innerHTML='';s.snapshots.forEach((snap,i)=>{const detail=node('details');detail.append(node('summary',`State ${i+1} · ${snap.model} · ${Object.entries(snap.inputs).map(([k,v])=>k+': '+v).join(' · ')||'committed model steps'}`));const table=node('table',null,'cbt-data-table'),body=node('tbody');for(const [k,v] of Object.entries(snap.values)){const row=node('tr');row.append(node('th',k),node('td',v));body.append(row);}table.append(body);if(snap.evidence.attempts?.length){const attempts=node('ul');snap.evidence.attempts.forEach(at=>attempts.append(node('li',`${at.gate}: ${at.choice} — ${at.correct?'correct':'revised after feedback'}${at.afterSupport?' (after support)':''}`)));detail.append(attempts);}detail.append(table,button('Remove this state',()=>{HLProgress.patch(id,{snapshots:HLProgress.get(id).snapshots.filter((_,n)=>n!==i),complete:false});refresh();}));states.append(detail);});}
      const missing=[];if(!hasEvidence)missing.push('requested model comparisons');if(!passed)missing.push('correct decisions');if(!explained)missing.push('evidence-based explanation and a limitation');if(!s.selfReview)missing.push('self-review');
      status.textContent=missing.length?'Still needed: '+missing.join(', ')+'.':'Ready to complete this activity.';
      if(!HLProgress.persistent())status.textContent+=' Browser storage is unavailable. Export before closing.';
      const withSupport=results(a,s).some(({d})=>d?.assisted);summary.textContent=a.transfer?(withSupport?'You completed the checks with feedback or support. Practise a new case to test the mechanism again.':'You answered this case’s checks before feedback. Your saved comparisons and explanation remain available.'):'Your model task and mechanism check are saved. Use the next step to continue the learning path.';
      doneEvidence.textContent=requirements.filter(r=>r.passed).map(r=>'✓ '+r.label).join('\n');
      main.dataset.activityComplete=String(HLTraining.complete(a));onUpdate();
    }
    widget._hlContinue=()=>go(phase==='predict'?'predict':!evidenceOK(a,HLProgress.get(id))?'model':'check');
    renderCases();refresh();
    return ()=>{disposed=true;for(const e of ['input','change','click','pointerup'])widget.removeEventListener(e,checkpoint);};
  }
  function record(main,onUpdate){
    main.innerHTML='';main.append(node('h1','Learning record'),node('p','Saved comparisons, decisions and explanations. Stored in this browser without an account. Export a backup to keep or transfer your work.'));
    const notice=node('p',HLProgress.persistent()?'Local storage is available.':'Storage unavailable: export before closing this session.','cbt-status');notice.setAttribute('role','status');main.append(notice);
    const actions=node('div',null,'hl-inline-actions');actions.append(button('Export learning record',()=>{const url=URL.createObjectURL(new Blob([HLProgress.export()],{type:'application/json'}));const a=node('a');a.href=url;a.download='helilab-learning-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    const label=node('label','Import backup ','hl-foot-btn'),input=node('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','Import learning record backup');label.append(input);actions.append(label);
    input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>4e6)throw Error('Backup exceeds 4 MB.');const text=await file.text();HLProgress.validate(text);if(!confirm('Replace this browser’s record with the backup? Export first to keep the current record.'))return;HLProgress.import(text);HLTraining.activities().forEach(a=>HLProgress.prepare(a.lessonId,a.version));record(main,onUpdate);onUpdate();}catch(e){notice.textContent='Import failed: '+e.message;}finally{input.value='';}};
    actions.append(button('Print / save as PDF',()=>{const closed=[...main.querySelectorAll('details:not([open])')];closed.forEach(d=>d.open=true);window.print();closed.forEach(d=>d.open=false);}));main.append(actions);
    main.append(node('p','Completion records practice. First-attempt checks, supported retries, self-review and instructor observations are separate. The app does not grade the quality of free explanations.'));
    const criteria=HLTraining.reviewCriteria;
    for(const m of HL_V2_MODULES){
      const section=node('section',null,'cbt-panel');section.append(node('h2',`Module ${m.number}: ${m.title}`),node('p',m.outcome));
      for(const a of m.activities){const s=HLProgress.get(a.lessonId),details=node('details');details.append(node('summary',`${a.title} — ${HLTraining.status(a)}`));const link=node('a','Open activity');link.href='#/activity/'+a.lessonId;details.append(link,node('p','Criterion: '+a.criteria));
        if(s.prediction)details.append(node('p','First reasoning: '+s.prediction,'cbt-evidence-text'));
        if(s.reflection)details.append(node('p','Explanation: '+s.reflection,'cbt-evidence-text'));
        if(s.limitation)details.append(node('p','Limitation: '+s.limitation,'cbt-evidence-text'));
        if(s.snapshots.length){const proof=node('details');proof.append(node('summary',`Saved model evidence (${s.snapshots.length} states)`));const requirements=node('ul');for(const r of HLTraining.evidence(a,s.snapshots))requirements.append(node('li',(r.passed?'Recorded: ':'Still needed: ')+r.label));proof.append(requirements);for(const [i,snap] of s.snapshots.entries()){const state=node('details');state.append(node('summary',`State ${i+1} · ${snap.model}`));const table=node('table',null,'cbt-data-table'),body=node('tbody');for(const [k,v] of Object.entries({...snap.inputs,...snap.values})){const row=node('tr');row.append(node('th',k),node('td',String(v)));body.append(row);}table.append(body);state.append(table);proof.append(state);}details.append(proof);}
        const list=node('ol');for(const at of s.attempts)list.append(node('li',`${at.at} · ${at.kind}${at.kind==='decision'?(at.correct?' · correct':' · revise')+(at.assisted?' · with support':' · before feedback'):''}\n${at.detail}`,'cbt-evidence-text'));details.append(list);
        if(s.prior){const previous=node('details');previous.append(node('summary','Previous task version — preserved work'),node('pre',JSON.stringify(s.prior,null,2),'cbt-evidence-text'));details.append(previous);}section.append(details);
      }
      const review=HLProgress.all().reviews[m.id]||{},form=node('details');form.append(node('summary','Instructor / peer observation (locally entered)'),node('p','Observe a changed case and record the conditions and support used. Names are locally entered; an observation is distinct from activity completion.'));
      const observationStatus=node('p',HLTraining.observation(m).label,'cbt-status');form.append(observationStatus);
      const activityLabel=node('label','Observed activity','cbt-field'),observed=node('select');observed.setAttribute('aria-label','Observed activity');for(const [i,a] of m.activities.entries()){const opt=node('option',`${m.number}.${i+1} · ${a.title}`);opt.value=a.lessonId;observed.append(opt);}observed.value=m.activities.some(a=>a.lessonId===review.activityId)?review.activityId:m.activities.find(a=>a.transfer).lessonId;activityLabel.append(observed);form.append(activityLabel);
      const caseStatus=node('p'),caseLink=node('a','Open the selected activity','hl-foot-btn');const describe=()=>{const a=m.activities.find(a=>a.lessonId===observed.value),s=HLProgress.get(a.lessonId);caseStatus.textContent=`Case ${s.variant+1} · task version ${a.version} · ${s.snapshots.length} saved model states. This observation covers this case only.`;caseLink.href='#/activity/'+a.lessonId;};observed.onchange=describe;describe();form.append(caseStatus,caseLink);
      const anchors=node('details');anchors.append(node('summary','How to judge the five criteria'),node('p','Independent: explains the observed case without prompts or revealed answers. With support: needs a hint, example or question. Needs discussion: reasoning is incomplete or contradicts the evidence. Not observed: no relevant performance was seen.'));const anchorList=node('ul');for(const c of criteria)anchorList.append(node('li',c.label+': '+c.anchor));anchors.append(anchorList);form.append(anchors);
      const reviewer=field(form,'Reviewer name',review.reviewer||'',false),note=field(form,'Observed reasoning, case conditions, support given and next practice step',review.note||'');
      const selects={};for(const {key,label:text} of criteria){const label=node('label',text,'cbt-field'),select=node('select');for(const [v,t] of [['unobserved','Not observed'],['discuss','Needs discussion'],['supported','Explains with support'],['independent','Explains independently in the observed case']]){const opt=node('option',t);opt.value=v;select.append(opt);}select.value=review.criteria?.[key]||'unobserved';selects[key]=select;label.append(select);form.append(label);}
      const history=node('details');const renderHistory=()=>{history.innerHTML='';const entries=HLProgress.all().reviews[m.id]?.history||[];history.hidden=!entries.length;history.append(node('summary',`Earlier observations (${entries.length})`));for(const r of entries)history.append(node('p',`${r.at} · ${r.reviewer} · ${r.activityId||'Activity not recorded'} · case ${r.variant+1}`),node('p',r.note,'cbt-evidence-text'),node('p',criteria.map(c=>c.label+': '+(r.criteria[c.key]||'unobserved')).join(' · ')));};renderHistory();
      const saved=node('p');saved.setAttribute('role','status');form.append(button('Save observation',()=>{if(!reviewer.value.trim()||!note.value.trim()){saved.textContent='Enter a reviewer and concrete case evidence.';return;}const a=m.activities.find(a=>a.lessonId===observed.value);HLProgress.review(m.id,{reviewer:reviewer.value.trim(),note:note.value.trim(),status:'discuss',criteria:Object.fromEntries(Object.entries(selects).map(([k,e])=>[k,e.value])),version:HLTraining.VERSION,...HLTraining.observationContext(a)});saved.textContent='Observation saved for the selected case and current evidence.';observationStatus.textContent=HLTraining.observation(m).label;renderHistory();onUpdate();}),saved,history);section.append(form);main.append(section);
    }
    const orphaned=Object.entries(HLProgress.all().activities).filter(([id])=>!HLTraining.activities().some(a=>a.lessonId===id));if(orphaned.length){const archive=node('details');archive.append(node('summary','Work outside the current route'),node('pre',JSON.stringify(Object.fromEntries(orphaned),null,2),'cbt-evidence-text'));main.append(archive);}
  }
  return {mount,record};
})();
