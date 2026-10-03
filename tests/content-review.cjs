'use strict';
const assert=require('node:assert/strict');
const {setup}=require('./browser-helper.cjs');
(async()=>{const h=await setup();try{
  const {page,go,predict,control,shot}=h;let passed=0;
  const ok=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
  await go('activity/cbt-m3-flapping');
  ok('Ordinary exercise opens the model without a written prediction',await page.locator('.hl-widget-mount').isVisible()&&await page.getByRole('button',{name:'Open the model',exact:true}).isHidden());
  ok('Optional note is not a completion gate',await page.getByText('Add a prediction note (optional)',{exact:true}).count()===1);
  await page.getByRole('button',{name:'Read the explanation',exact:true}).click();await page.locator('.hl-reference-layout .hl-lesson-body').waitFor({state:'visible'});
  ok('Reference explanation precedes its collapsed model',await page.locator('.hl-reference-model').evaluate(e=>!e.open&&!!e.previousElementSibling)&&await page.locator('.hl-lesson-body').isVisible());
  ok('Reading does not claim completed training',await page.evaluate(()=>!HLProgress.get('cbt-m3-flapping').complete));
  await page.getByRole('button',{name:'Return to your activity',exact:true}).click();
  ok('Reference returns to the exact source activity',page.url().includes('/activity/cbt-m3-flapping'));
  await go('legacy');await page.getByLabel('Search topics',{exact:true}).fill('washout');
  ok('Lookup search finds the related stall and spanwise explanations',await page.locator('.hl-legacy-item').count()>=2);
  await page.getByLabel('Search topics',{exact:true}).fill('no-such-topic-762');
  ok('Lookup has a clear no-results state',await page.getByText('No matching topic.',{exact:false}).isVisible());
  await go('activity/cbt-m4-transfer');
  ok('Transfer analysis remains a deliberate first step',await page.getByRole('button',{name:'Open the model',exact:true}).isVisible()&&await page.locator('.hl-widget-mount').isHidden());
  await page.getByRole('button',{name:'Read the explanation',exact:true}).click();await page.locator('.hl-reference-layout .hl-lesson-body').waitFor({state:'visible'});
  ok('Transfer also offers direct information access',await page.locator('.hl-lesson-body').isVisible());
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
  // Controlled flapping, twist and threshold diagnostics use actual saved values.
  await go('activity/cbt-m3-flapping');await predict();
  const valuesNow=()=>page.evaluate(()=>HLModelState.snapshot(document.querySelector('.hl-widget-mount')).values);
  await control('Flapping rate β̇',0);const still=await valuesNow();
  await control('Flapping rate β̇',-60);const down=await valuesNow();
  await control('Flapping rate β̇',60);const up=await valuesNow();
  const val=(x,k)=>parseFloat(x[k]);
  ok('Downward and upward rate change alpha in opposite directions',val(down,'Angle of attack α')>val(still,'Angle of attack α')&&val(still,'Angle of attack α')>val(up,'Angle of attack α'));
  ok('Controlled flapping does not change pitch, air flow or tangential speed',['Fixed pitch θ','Unchanged U_T','Unchanged air-flow normal term','Displacement β'].every(k=>down[k]===still[k]&&up[k]===still[k]));
  const expected=await page.evaluate(()=>.75*HL.defaultState().R*Math.PI/3);
  ok('Rate contribution equals r times beta-dot with the documented sign',Math.abs(val(up,'Flap-rate term r·β̇')-expected)<.011&&Math.abs(val(down,'Flap-rate term r·β̇')+expected)<.011);
  ok('Total normal velocity retains the signed rate contribution',Math.abs(val(down,'Total U_P')-val(still,'Total U_P')+expected)<.021);
  await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('flapping-flow-desktop');
  await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Flapping rate and its readout resume after reload',await page.getByLabel('Flapping rate β̇',{exact:true}).inputValue()==='60'&&val(await valuesNow(),'Flapping rate β̇')===60);
  await go('activity/cbt-m4-envelope');await predict();await control('Blade station r/R',1);await control('Blade twist (washout)',0);const zero=await valuesNow();
  await control('Blade twist (washout)',-8);const washed=await valuesNow();
  const pair=x=>x.match(/-?\d+\.\d+/g).map(Number);
  ok('Tip washout lowers alpha by 2 degrees at the fixed 0.75R reference',Math.abs(pair(washed['α: zero → selected twist'])[1]-pair(zero['α: zero → selected twist'])[1]+2)<.021);
  ok('Twist comparison freezes the local inflow angle',pair(washed['φ: zero → selected twist'])[0]===pair(washed['φ: zero → selected twist'])[1]);
  ok('The chosen uniform-flow example moves the sampled alpha peak inward',parseFloat(washed['Peak α: selected twist'].split(' at ')[1])<1&&zero['Peak α: zero twist'].endsWith('1.00R'));
  await control('Blade station r/R',.55);const inner=await valuesNow();
  ok('Negative twist increases alpha inboard of the reference station',Math.abs(pair(inner['α: zero → selected twist'])[1]-pair(inner['α: zero → selected twist'])[0]-1.6)<.021);
  await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('twist-isolation-desktop');
  await page.locator('[data-model=wEnvelope]').click();await control('Forward speed',120);await control('Azimuth ψ',270);await control('Blade station r/R',.4);
  const map=await valuesNow();
  ok('Map ratio matches the displayed local alpha and critical alpha without loading suppression',Math.abs(val(map,'Selected α / critical α')-100*val(map,'Selected local α')/val(map,'Assumed local critical α'))<.25);
  ok('Map verdict agrees with its own local threshold',map['Selected α diagnostic']===(val(map,'Selected α / critical α')>=100?'model threshold crossed':val(map,'Selected α / critical α')>=80?'near model threshold':'below model threshold'));
  await page.getByRole('radio',{name:'Foundation model',exact:true}).click();
  const foundation=await page.evaluate(()=>{const st=HL.defaultState();st.V=120*.5144;const d=HLMechanisms.foundation(st,.4,270*Math.PI/180);return {actual:d.phi,triangle:Math.atan2(d.UP,d.UT)};});
  ok('Foundation map uses the actual local velocity triangle',Math.abs(foundation.actual-foundation.triangle)<1e-12);
  await page.getByRole('radio',{name:'Extended model',exact:true}).click();await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('rotor-diagnostics-desktop');
  await page.setViewportSize({width:390,height:844});
  for(const [id,name] of [['cbt-m3-flapping','flapping-flow-mobile'],['cbt-m4-envelope','twist-isolation-mobile']]){await go('activity/'+id);await predict();if(id==='cbt-m4-envelope')await page.locator('[data-model=wTwistComparison]').click();await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot(name);ok('Controlled mechanism fits the visible viewport: '+id,await page.evaluate(()=>{const main=document.querySelector('.hl-main'),box=document.querySelector('.hl-widget-mount').getBoundingClientRect();return main.scrollWidth<=main.clientWidth+1&&box.right<=innerWidth&&box.width<=innerWidth;}));}
  await page.setViewportSize({width:1280,height:900});
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
