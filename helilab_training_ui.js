/* Accessible evidence forms. Learner explanations are saved, never auto-graded. */
'use strict';
const HLTrainingUI = (() => {
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,fn)=>{const b=node('button',text,'hl-foot-btn');b.type='button';b.onclick=fn;return b;};
  function field(parent,label,value='',multiline=true){const wrap=node('label',null,'cbt-field');wrap.append(node('span',label));const input=node(multiline?'textarea':'input');input.value=value;input.maxLength=multiline?4000:120;if(multiline)input.rows=4;wrap.append(input);parent.append(wrap);return input;}
  function mount(main,grid,widget,lesson,activity,module,onUpdate){
    const id=lesson.id;HLProgress.patch(id,{viewed:true});
    let interacted=false;
    const interaction=e=>{if(interacted||!e.target.closest('button,input,select,canvas'))return;interacted=true;HLProgress.attempt(id,'model-interaction',false,'Used a model control or construction canvas.');};
    widget.addEventListener('input',interaction);widget.addEventListener('click',interaction);widget.addEventListener('pointerup',interaction);
    const intro=node('section',null,'cbt-panel');intro.append(node('h2','Your performance task'),node('p',module.outcome),node('p',activity.modeAction));
    const prior=HLProgress.get(id).attempts.findLast(a=>a.kind==='prediction');
    if(activity.transfer) { intro.append(node('h3','Two changed conditions')); HLTraining.cases[module.id].forEach(c=>intro.append(node('p',c[0]))); }
    const prediction=field(intro,'Before you explore: predict the relationship or result, and explain why.',prior?.detail||'');
    const message=node('p',null,'cbt-status');message.setAttribute('role','status');
    const start=button('Save prediction and open the task',()=>{
      if(prediction.value.trim().length<15){message.textContent='Write a prediction with a reason (at least 15 characters).';prediction.focus();return;}
      HLProgress.attempt(id,'prediction',false,prediction.value.trim());grid.hidden=false;panel.hidden=false;start.textContent='Update prediction';message.textContent='Prediction saved. Compare it with what you observe.';onUpdate();
    });
    intro.append(start,message);main.insertBefore(intro,grid);grid.hidden=!prior;
    const panel=node('section',null,'cbt-panel');panel.hidden=!prior;panel.append(node('h2',activity.transfer?'Transfer evidence':'Observe, explain and check'));
    const observation=field(panel,'Record your comparison: input before/after, what you observed and what stayed constant.',HLProgress.get(id).attempts.findLast(a=>a.kind==='observation')?.detail||'');
    const observed=button('Save observation',()=>{
      if(!HLProgress.get(id).attempts.some(a=>a.kind==='model-interaction')){status.textContent='Use a model control or complete a construction step before saving your observation.';return;}
      if(observation.value.trim().length<25){status.textContent='Include the changed input and its observed effect (at least 25 characters).';observation.focus();return;}
      const snapshot=[...widget.querySelectorAll('input,select')].map(e=>`${e.getAttribute('aria-label')||e.name||e.type}: ${e.value}`).join('; ');
      HLProgress.attempt(id,'model-snapshot',false,snapshot+'\n'+[...widget.querySelectorAll('.hl-w-readout')].map(e=>e.textContent).join('\n'));
      HLProgress.attempt(id,'observation',false,observation.value.trim());HLProgress.patch(id,{explored:true});refresh();
    });
    if(!activity.transfer)panel.append(observed);else observation.parentElement.remove();
    panel.append(node('h3','Decision check'));
    const legacy=HL_LESSONS.find(l=>l.id===activity.legacyLessonId);
    const q=legacy.check;
    const plain=html=>{const t=document.createElement('template');t.innerHTML=html;return t.content.textContent;};
    const questions=activity.transfer?HLTraining.cases[module.id]:(q?[[plain(q.q),q.options.map(plain),q.answer,plain(q.explain)]]:[HLTraining.cases[module.id][0]]);
    const checkWrap=node('div');panel.append(checkWrap);
    const renderCase=(item,n)=>{
      const [question,options,answer,why]=item;
      const box=node('fieldset',null,'cbt-case');box.append(node('legend',question));
      // Stable within an attempt; reshuffle only on explicit retry.
      const order=options.map((label,index)=>({label,index}));
      for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      let choice=null;const name=`${id}-case-${n}`;
      order.forEach(o=>{const label=node('label',null,'cbt-option'),radio=node('input');radio.type='radio';radio.name=name;radio.value=o.index;radio.onchange=()=>{choice=o.index;};label.append(radio,node('span',o.label));box.append(label);});
      const feedback=node('p');feedback.setAttribute('role','status');
      const submit=button('Commit decision',()=>{
        if(choice===null){feedback.textContent='Choose a response before committing.';return;}
        const correct=choice===answer;HLProgress.attempt(id,`case-${n}`,correct,`${question}\nSelected: ${options[choice]}`);
        box.querySelectorAll('input').forEach(e=>e.disabled=true);submit.disabled=true;
        feedback.textContent=(correct?'Supported. ':'Revisit the mechanism. ')+why;
        feedback.className='hl-check-fb '+(correct?'ok':'no');refresh();
        if(!correct)box.append(button('Try this decision again',()=>{const next=renderCase(item,n);box.replaceWith(next);next.querySelector('input').focus();}));
      });
      box.append(submit,feedback);return box;
    };
    questions.forEach((q,n)=>checkWrap.append(renderCase(q,n)));
    panel.append(node('h3','Explain the mechanism'),node('p','Compare your explanation with this criterion: '+activity.criteria));
    const reflection=field(panel,'Explain your result, revise your prediction if needed, and state one assumption or limitation.',HLProgress.get(id).reflection);
    reflection.oninput=()=>{HLProgress.patch(id,{reflection:reflection.value,complete:false});refresh();};
    const rubricLabel=node('label',null,'cbt-option'),rubric=node('input');rubric.type='checkbox';rubricLabel.append(rubric,node('span','I compared my explanation with the criterion above. I understand that this is self-review, not an instructor assessment.'));panel.append(rubricLabel);
    const complete=button('Complete this activity',()=>{
      const s=HLProgress.get(id);if(!s.performed||!rubric.checked||s.reflection.trim().length<40)return;
      HLProgress.patch(id,{complete:true});refresh();
    });complete.classList.add('primary');
    const status=node('p',null,'cbt-status');status.setAttribute('role','status');panel.append(complete,status);
    rubric.onchange=refresh;
    const modelEvidence=e=>{if(!HLProgress.get(id).attempts.some(a=>a.kind==='construction'&&a.correct))HLProgress.attempt(id,'construction',e.detail?.correct===true,e.detail?.detail||'Construction gates');refresh();};widget.addEventListener('hl-evidence',modelEvidence);
    function refresh(){
      const s=HLProgress.get(id), passed=questions.every((_,n)=>s.attempts.some(a=>a.kind===`case-${n}`&&a.correct));
      const predicted=s.attempts.some(a=>a.kind==='prediction');
      const constructed=activity.legacyLessonId!=='m1-04'||s.attempts.some(a=>a.kind==='construction'&&a.correct);
      const performed=predicted&&passed&&constructed&&(activity.transfer||s.explored);
      HLProgress.patch(id,{performed,complete:s.complete&&performed});
      complete.disabled=!(performed&&rubric.checked&&s.reflection.trim().length>=40);complete.textContent=s.complete?'Activity completed — save again':'Complete this activity';
      const missing=[];if(!predicted)missing.push('prediction');if(!activity.transfer&&!s.explored)missing.push('saved observation');if(!constructed)missing.push('three construction gates');if(!passed)missing.push('supported decision'+(questions.length>1?'s':''));if(s.reflection.trim().length<40)missing.push('explanation (40+ characters)');if(!rubric.checked)missing.push('self-review');
      status.textContent=(s.complete?'Activity complete. Your explanation still needs human review.':missing.length?'To complete: '+missing.join(', ')+'.':'Ready to record activity completion.')+(!HLProgress.persistent()?' Browser storage is unavailable. Export your record before closing.':'');onUpdate();
    }
    main.append(panel);refresh();
  }
  function record(main,onUpdate){
    main.innerHTML='';main.append(node('h1','Learning record'),node('p','Evidence of practice, separate from assessed competence. Stored in this browser, with no account or server. Export regularly, especially on a shared device.'));
    const notice=node('p',HLProgress.persistent()?'Local storage is available.':'Storage unavailable: this session may be lost when you close the app.','cbt-status');notice.setAttribute('role','status');main.append(notice);
    const actions=node('div',null,'hl-inline-actions');
    actions.append(button('Export learning record',()=>{const url=URL.createObjectURL(new Blob([HLProgress.export()],{type:'application/json'}));const a=node('a');a.href=url;a.download='helilab-learning-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    const label=node('label','Import backup ','hl-foot-btn'),input=node('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','Import learning record backup');label.append(input);actions.append(label);
    input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>2e6)throw Error('Backup exceeds 2 MB.');const text=await file.text();HLProgress.validate(text);if(!confirm('Replace the current local learning record with this backup? Export first if you want to keep it.'))return;HLProgress.import(text);record(main,onUpdate);onUpdate();}catch(e){notice.textContent='Import failed: '+e.message;}finally{input.value='';}};
    actions.append(button('Print / save as PDF',()=>{const closed=[...main.querySelectorAll('details:not([open])')];closed.forEach(d=>d.open=true);window.print();closed.forEach(d=>d.open=false);}));main.append(actions);
    main.append(node('h2','Review criteria'),node('p','For each outcome, review whether the learner (1) states the conditions, (2) predicts a direction, (3) supports it with model evidence, (4) explains the causal chain and (5) recognises the limits of transfer. The app does not assess the quality of free text.'));
    HL_V2_MODULES.forEach(m=>{
      const section=node('section',null,'cbt-panel');section.append(node('h2',`Module ${m.number}: ${m.title}`),node('p',m.outcome));
      m.activities.forEach(a=>{
        const s=HLProgress.get(a.lessonId),details=node('details');const summary=node('summary',`${a.title} — ${HLProgress.status(a.lessonId)}`);details.append(summary);
        const link=node('a','Open activity');link.href=`#/activity/${a.lessonId}`;details.append(link);
        if(s.reflection)details.append(node('p','Explanation: '+s.reflection,'cbt-evidence-text'));
        const list=node('ol');s.attempts.forEach(at=>list.append(node('li',`${at.at} · ${at.kind}${at.kind.startsWith('case-')?(at.correct?' · supported':' · revise'):''}\n${at.detail}`,'cbt-evidence-text')));details.append(list);section.append(details);
      });
      const review=HLProgress.all().reviews[m.id]||{},form=node('details');form.append(node('summary','Instructor / peer observation (locally entered)'));
      form.append(node('p','Discuss a changed case with the learner before recording independent reasoning. Reviewer identity is entered locally and is not verified.'));
      const reviewer=field(form,'Reviewer name',review.reviewer||'',false),note=field(form,'Observed reasoning, support given, and next practice step',review.note||'');
      const statusLabel=node('label','Observed performance ', 'cbt-field'),select=node('select');[['discuss','Needs discussion'],['supported','Explains with support'],['independent','Explains independently in the observed cases']].forEach(([value,text])=>{const o=node('option',text);o.value=value;select.append(o);});select.value=review.status||'discuss';statusLabel.append(select);form.append(statusLabel);
      const saved=node('p');saved.setAttribute('role','status');form.append(button('Save observation',()=>{if(!reviewer.value.trim()||!note.value.trim()){saved.textContent='Enter a reviewer name and specific evidence.';return;}HLProgress.review(m.id,{reviewer:reviewer.value.trim(),note:note.value.trim(),status:select.value});saved.textContent=HLProgress.persistent()?'Observation saved.':'Saved for this session only. Export before closing.';}),saved);section.append(form);main.append(section);
    });
  }
  return {mount,record};
})();
