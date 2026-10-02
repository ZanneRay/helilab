/* Local evidence, versioned tasks and resumable practice. No completion from navigation. */
'use strict';
const HLProgress = (() => {
  const KEY='helilab_training_v4', OLD='helilab_training_v3';
  const empty=()=>({schema:4,activities:{},reviews:{},lastActivity:null});
  const blank=()=>({version:0,viewed:false,explored:false,performed:false,complete:false,reflection:'',limitation:'',prediction:'',selfReview:false,phase:'predict',variant:0,attempts:[],snapshots:[],checkpoint:null,decisions:{},revealed:[],prior:null});
  let data=empty(),persistent=true;
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const text=(x,n=4000)=>typeof x==='string'?x.slice(0,n):'';
  const integer=(x,max=10000)=>Number.isInteger(x)&&x>=0&&x<=max?x:0;
  function json(x,max=40000){if(x==null)return null;const s=JSON.stringify(x);if(s.length>max)throw Error('Model evidence exceeds its size limit.');return JSON.parse(s);}
  function cleanReview(r){
    const criteria={};for(const k of ['conditions','prediction','evidence','mechanism','limits'])if(['unobserved','discuss','supported','independent'].includes(r.criteria?.[k]))criteria[k]=r.criteria[k];
    return {reviewer:text(r.reviewer,120),note:text(r.note),status:['discuss','supported','independent'].includes(r.status)?r.status:'discuss',at:text(r.at,40),version:integer(r.version),criteria,activityId:typeof r.activityId==='string'&&/^cbt-[a-z0-9-]+$/.test(r.activityId)?r.activityId:'',taskVersion:integer(r.taskVersion),variant:integer(r.variant),rubricVersion:integer(r.rubricVersion),evidenceKey:typeof r.evidenceKey==='string'&&/^[a-z0-9]{1,16}$/.test(r.evidenceKey)?r.evidenceKey:''};
  }
  function validate(x){
    if(!plain(x)||![3,4].includes(x.schema)||!plain(x.activities)||!plain(x.reviews))throw Error('This is not a HeliLab training backup.');
    const clean=empty();
    for(const [id,v] of Object.entries(x.activities)){
      if(!/^cbt-[a-z0-9-]+$/.test(id)||!plain(v))continue;
      const s={...blank(),version:integer(v.version),viewed:!!v.viewed,explored:!!v.explored,performed:!!v.performed,complete:!!v.complete,reflection:text(v.reflection),limitation:text(v.limitation),prediction:text(v.prediction),selfReview:!!v.selfReview,phase:['predict','model','check','done'].includes(v.phase)?v.phase:'predict',variant:integer(v.variant)};
      s.attempts=Array.isArray(v.attempts)?v.attempts.filter(plain).slice(-100).map(a=>({kind:text(a.kind,80),correct:a.correct===true,at:text(a.at,40),detail:text(a.detail),variant:integer(a.variant),question:text(a.question,160),choice:integer(a.choice,20),assisted:!!a.assisted})):[];
      s.snapshots=Array.isArray(v.snapshots)?v.snapshots.filter(a=>plain(a)&&typeof a.model==='string'&&plain(a.inputs)&&plain(a.values)&&Array.isArray(a.selected)&&plain(a.state)&&plain(a.evidence)).slice(-16).map(a=>json(a,20000)):[];
      s.checkpoint=json(v.checkpoint,40000);
      if(plain(v.decisions))for(const [key,d] of Object.entries(v.decisions).slice(0,12))if(plain(d)&&/^q\d+$/.test(key))s.decisions[key]={choice:integer(d.choice,20),correct:!!d.correct,assisted:!!d.assisted,question:text(d.question,160)};
      s.revealed=Array.isArray(v.revealed)?v.revealed.filter(a=>typeof a==='string').slice(-200).map(a=>text(a,160)):[];
      s.prior=plain(v.prior)?json(v.prior,450000):null;
      clean.activities[id]=s;
    }
    for(const [id,r] of Object.entries(x.reviews))if(/^m[1-7]$/.test(id)&&plain(r)){
      clean.reviews[id]={...cleanReview(r),history:Array.isArray(r.history)?r.history.filter(plain).slice(-12).map(cleanReview):[]};
    }
    clean.lastActivity=typeof x.lastActivity==='string'&&/^cbt-[a-z0-9-]+$/.test(x.lastActivity)?x.lastActivity:null;
    return clean;
  }
  try{const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD);if(raw)data=validate(JSON.parse(raw));}catch(e){persistent=false;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));persistent=true;}catch(e){persistent=false;}}
  const get=id=>data.activities[id]||blank();
  function patch(id,fields){data.activities[id]={...get(id),...fields};save();}
  function prepare(id,version){
    const old=get(id);if(old.version===version)return old;
    const hasWork=old.viewed||old.attempts.length||old.reflection||old.complete;
    const prior=hasWork?{...old,prior:null}:old.prior;
    patch(id,{...blank(),version,prior});return get(id);
  }
  function attempt(id,kind,correct,detail='',extra={}){const s=get(id);patch(id,{attempts:[...s.attempts,{kind,correct:!!correct,detail:String(detail).slice(0,4000),at:new Date().toISOString(),...extra}].slice(-100)});}
  function status(id){const s=get(id);return s.complete?'Complete':s.viewed?'In progress':s.prior?'Updated task · previous work saved':'Not started';}
  function review(id,r){const previous=data.reviews[id],history=[...(previous?.history||[]),...(previous?[cleanReview(previous)]:[])].slice(-12);data.reviews[id]={...cleanReview({...r,at:new Date().toISOString()}),history};save();}
  return {get,patch,prepare,attempt,status,persistent:()=>persistent,export:()=>JSON.stringify(data,null,2),all:()=>JSON.parse(JSON.stringify(data)),validate:s=>validate(JSON.parse(s)),import:s=>{data=validate(JSON.parse(s));save();},reset:()=>{data=empty();save();},visit:id=>{data.lastActivity=id;patch(id,{viewed:true});},review};
})();
