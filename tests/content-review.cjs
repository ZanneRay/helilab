'use strict';
const assert=require('node:assert/strict');
const {setup}=require('./browser-helper.cjs');
(async()=>{const h=await setup();try{
  const {page,go,predict,control,shot}=h;let passed=0;
  const ok=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
  await go('activity/cbt-m6-bet-velocity');await predict();
  ok('Foundational triangle precedes optional advanced diagnostics',await page.locator('.hl-optional-map').evaluate(e=>!e.open&&!!e.previousElementSibling));
  for(const [speed,azimuth] of [[0,90],[60,90],[60,270],[120,180]]){
    await control('Forward speed',speed);await control('Azimuth ψ',azimuth);
    const x=await page.evaluate(({speed,azimuth})=>{
      const host=document.querySelector('.hl-widget-mount'),snap=HLModelState.snapshot(host);
      let st=HL.defaultState();st.V=speed*.5144;
      const trim=computeTrimCyclic(st);st={...st,theta1c:trim.t1c_deg,theta1s:trim.t1s_deg};
      const r=Number(snap.inputs['Blade station r/R']),psi=azimuth*Math.PI/180,c=flappingCoeffs(st),d=localVelocityDecomposition(st,c,r,psi),omR=tipSpeed(st);
      return {values:snap.values,expected:{UT:d.UT*omR,UP:d.UP*omR,vi:d.lamInduced*omR,vn:throughflowRatio(st)*omR,flap:d.flapRateNormal*omR,phi:Math.atan2(d.UP,d.UT)*180/Math.PI,alpha:(bladePitch(st,r,psi)-Math.atan2(d.UP,d.UT))*180/Math.PI}};
    },{speed,azimuth});
    const read=key=>parseFloat(x.values[key]);
    const close=(value,expected,tol)=>Math.abs(value-expected)<=tol;
    ok(`One consistent signed BET state at ${speed} kt / ${azimuth}°`,
      close(read('U_T (net in-plane)'),x.expected.UT,.51)&&
      close(read('U_P = signed induced + throughflow + blade motion'),x.expected.UP,.051)&&
      close(read('Local induced normal velocity'),x.expected.vi,.051)&&
      close(read('Signed aircraft throughflow'),x.expected.vn,.051)&&
      close(read('Flap-rate term r·β̇'),x.expected.flap,.051)&&
      close(read('φ inflow angle'),x.expected.phi,.051)&&close(read('α = θ − φ'),x.expected.alpha,.051));
    if(speed===120)ok('Negative total normal flow and inflow angle stay signed',x.expected.UP<0&&read('φ inflow angle')<0);
  }
  await page.locator('.hl-w-stage-vec').scrollIntoViewIfNeeded();await shot('signed-triangle-desktop');
  await page.locator('.hl-optional-map summary').click();
  ok('Optional diagnostics remain available on request',await page.locator('.hl-optional-map canvas').isVisible());
  await go('activity/cbt-m5-lte');await predict();await control('Wind speed',12);await control('Relative wind direction (FROM)',300);
  let values=await page.evaluate(()=>HLModelState.snapshot(document.querySelector('.hl-widget-mount')).values);
  ok('Overlapping yaw mechanisms are both explained',values['Illustrated wind mechanisms'].includes('Mechanism 1')&&values['Illustrated wind mechanisms'].includes('Mechanism 2'));
  ok('Yaw authority is explicitly unsolved',values['Control authority / yaw rate']==='not computed'&&!Object.hasOwn(values,'Tail-rotor margin'));
  await control('Relative wind direction (FROM)',180);
  ok('Weathercock explanation uses airframe moment',await page.locator('.hl-lte-sector-info').innerText().then(t=>t.includes('fuselage')||t.includes('Fuselage')));
  await control('Wind speed',0);
  values=await page.evaluate(()=>HLModelState.snapshot(document.querySelector('.hl-widget-mount')).values);
  ok('Zero wind activates no wind mechanism',values['Illustrated wind mechanisms']==='none — zero wind');
  await page.setViewportSize({width:390,height:844});await control('Wind speed',12);await control('Relative wind direction (FROM)',300);await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('yaw-mechanisms-mobile');
  ok('Yaw content has no mobile horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await go('activity/cbt-m2-hover');
  ok('Native prediction does not expose reference answers before commitment',await page.locator('.cbt-model-reference').isHidden());
  await page.locator('.hl-w-controls .hl-check-opt').nth(1).click();
  ok('Native reference unlocks after model commitment',await page.locator('.cbt-model-reference').isVisible());
  await go('activity/cbt-m7-transfer');
  const old=await page.evaluate(()=>{const id='cbt-m7-transfer';HLProgress.patch(id,{complete:true,selfReview:true,prediction:'Earlier reasoning',reflection:'Earlier explanation',limitation:'Earlier limit',snapshots:[{model:'wHover',inputs:{'Gross weight':'2800'},selected:[],values:{'Produced thrust':'27 kN'},state:{},evidence:{}}],decisions:{q0:{choice:0,correct:true,assisted:false,question:'previous-content-check'}}});return HLProgress.get(id).snapshots;});
  await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Revised questions explain open work and preserve comparisons',await page.locator('.cbt-content-update').isVisible()&&await page.evaluate(old=>JSON.stringify(HLProgress.get('cbt-m7-transfer').snapshots)===JSON.stringify(old),old));
  ok('Stale answers do not complete the revised case',await page.evaluate(()=>!HLTraining.complete(HLTraining.activities().find(a=>a.lessonId==='cbt-m7-transfer'))));
  await page.setViewportSize({width:1280,height:900});await shot('revised-case-data');
  await go('activity/cbt-m6-bet-velocity');
  await page.evaluate(()=>HLProgress.patch('cbt-m6-bet-velocity',{version:2,complete:true,prediction:'Old model',snapshots:[{model:'wBetVelocity',inputs:{'Forward speed':'120'},selected:[],values:{'Old alpha':'14°'},state:{},evidence:{}}]}));
  await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Corrected model archives previous-version evidence',await page.evaluate(()=>{const s=HLProgress.get('cbt-m6-bet-velocity');return s.version===3&&s.prior.snapshots[0].values['Old alpha']==='14°'&&!s.complete;}));
  await go('maths');ok('Maths reference renders without errors',await page.locator('.hl-model-refs').count()===1);
  await go('legacy');ok('Updated legacy references remain accessible',await page.locator('.hl-legacy-item').count()===19);
  const references=await page.evaluate(()=>HL_LESSONS.map(l=>l.id));
  for(const id of references){await go('lesson/'+id);ok('Reviewed reference renders: '+id,await page.locator('.hl-lesson-body').count()>=1);}
  ok('No uncaught errors in changed content paths',h.errors.length===0);
  console.log(`${passed} content-review browser checks passed`);
}finally{await h.close();}})().catch(e=>{console.error(e);process.exit(1);});
