/* Local, versioned training evidence. No completion from navigation or legacy scores. */
'use strict';
const HLProgress = (() => {
  const KEY = 'helilab_training_v3';
  const empty = () => ({schema: 3, activities: {}, reviews: {}});
  let data = empty(), persistent = true;
  const plain = x => x && typeof x === 'object' && !Array.isArray(x);
  function validate(x) {
    if (!plain(x) || x.schema !== 3 || !plain(x.activities) || !plain(x.reviews)) throw Error('This is not a HeliLab training backup.');
    const clean = empty();
    for (const [id, value] of Object.entries(x.activities)) {
      if (!/^cbt-[a-z0-9-]+$/.test(id) || !plain(value)) continue;
      const attempts = Array.isArray(value.attempts) ? value.attempts.filter(a => plain(a) && typeof a.kind === 'string').slice(-100).map(a => ({kind:a.kind.slice(0,80), correct:a.correct === true, at:typeof a.at==='string'?a.at.slice(0,40):'', detail:typeof a.detail==='string'?a.detail.slice(0,4000):''})) : [];
      clean.activities[id] = {viewed:!!value.viewed, explored:!!value.explored, performed:!!value.performed, complete:!!value.complete, reflection:typeof value.reflection==='string'?value.reflection.slice(0,4000):'', attempts};
    }
    for (const [id, r] of Object.entries(x.reviews)) if (/^m[1-7]$/.test(id) && plain(r)) clean.reviews[id] = {reviewer:String(r.reviewer||'').slice(0,120), note:String(r.note||'').slice(0,4000), status:['discuss','supported','independent'].includes(r.status)?r.status:'discuss', at:String(r.at||'').slice(0,40)};
    return clean;
  }
  try { const raw=localStorage.getItem(KEY); if(raw) data=validate(JSON.parse(raw)); } catch(e) { persistent=false; }
  function save() { try { localStorage.setItem(KEY,JSON.stringify(data)); persistent=true; } catch(e) { persistent=false; } }
  function get(id) { return data.activities[id] || {viewed:false,explored:false,performed:false,complete:false,reflection:'',attempts:[]}; }
  function patch(id, fields) { data.activities[id]={...get(id),...fields}; save(); }
  function attempt(id, kind, correct, detail='') { const s=get(id);patch(id,{attempts:[...s.attempts,{kind,correct:!!correct,detail:String(detail).slice(0,4000),at:new Date().toISOString()}].slice(-100)}); }
  function status(id) { const s=get(id);return s.complete?'Activity complete':s.performed?'Reflect on your work':s.explored?'Explored':s.viewed?'Viewed':'Not started'; }
  return {get,patch,attempt,status, persistent:()=>persistent, export:()=>JSON.stringify(data,null,2), all:()=>JSON.parse(JSON.stringify(data)), validate:text=>validate(JSON.parse(text)), import:text=>{const next=validate(JSON.parse(text));data=next;save();}, reset:()=>{data=empty();save();}, review:(id,r)=>{data.reviews[id]={...r,at:new Date().toISOString()};save();}};
})();
