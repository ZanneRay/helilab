'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');let count=0;
function load(storage={getItem:()=>null,setItem:()=>{}}){const context=vm.createContext({localStorage:storage});for(const f of ['helilab_content.js','helilab_progress.js','helilab_training.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);return vm.runInContext('({HLProgress,HLTraining,HL_V2_MODULES,HL_LESSONS})',context);}
function test(name,fn){fn();count++;console.log('PASS '+name);}
const {HLProgress:p,HLTraining:t,HL_V2_MODULES:modules,HL_LESSONS:lessons}=load();
test('Seven available outcomes with practice and transfer',()=>{assert.equal(modules.length,7);for(const m of modules){assert.ok(m.available&&m.outcome);assert.ok(m.activities.some(a=>!a.transfer));assert.ok(m.activities.some(a=>a.transfer));assert.equal(t.cases[m.id].length,2);}});
test('Stable distinct IDs separate curriculum from legacy',()=>{const ids=t.activities().map(a=>a.lessonId);assert.equal(new Set(ids).size,27);assert.ok(ids.every(id=>id.startsWith('cbt-')));for(const id of ids)assert.equal(t.lessons().filter(l=>l.id===id).length,1);});
test('Every activity has an explicit performance criterion',()=>{for(const a of t.activities())assert.ok(a.criteria&&a.modeAction&&a.summary);});
test('Scenario answers and rationales are complete',()=>{for(const cases of Object.values(t.cases))for(const [question,options,answer,why] of cases){assert.ok(question&&why);assert.ok(options[answer]);assert.equal(new Set(options).size,options.length);}});
test('Viewing creates no performance or completion',()=>{p.patch('cbt-m1-test',{viewed:true});assert.equal(p.get('cbt-m1-test').complete,false);assert.equal(p.get('cbt-m1-test').performed,false);});
test('Wrong first attempt remains in evidence after successful retry',()=>{p.attempt('cbt-m1-test','case-0',false,'first');p.attempt('cbt-m1-test','case-0',true,'retry');assert.equal(p.get('cbt-m1-test').attempts.length,2);assert.equal(p.get('cbt-m1-test').attempts[0].correct,false);});
test('Export/import roundtrip preserves evidence and reviews',()=>{p.review('m1',{reviewer:'Instructor',note:'Explained two changed conditions',status:'supported'});const data=p.export();p.reset();p.import(data);assert.equal(p.get('cbt-m1-test').attempts.length,2);assert.equal(p.all().reviews.m1.reviewer,'Instructor');});
test('Malformed imports do not replace the existing record',()=>{const before=p.export();for(const bad of ['null','[]','{','{"schema":2,"activities":{},"reviews":{}}'])assert.throws(()=>p.import(bad));assert.equal(p.export(),before);});
test('Blocked storage keeps a usable exportable session',()=>{const {HLProgress:p}=load({getItem(){throw Error('denied')},setItem(){throw Error('denied')}});p.patch('cbt-m1-test',{viewed:true});assert.equal(p.persistent(),false);assert.equal(JSON.parse(p.export()).activities['cbt-m1-test'].viewed,true);});
test('Malformed stored state recovers without crashing',()=>{const {HLProgress:p}=load({getItem:()=>'{"schema":3,"activities":null}',setItem(){}});assert.equal(Object.keys(p.all().activities).length,0);});
test('Legacy progress cannot complete new activities',()=>{const {HLProgress:p}=load({getItem:key=>key==='helilab_progress_v1'?'{"hover":"done"}':null,setItem(){}});assert.equal(p.get('cbt-m2-hover').complete,false);});
test('Reset removes evidence and reviewer entries',()=>{p.reset();assert.equal(Object.keys(p.all().reviews).length,0);assert.equal(Object.keys(p.all().activities).length,0);});
console.log(`${count} learning checks passed`);
