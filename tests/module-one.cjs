'use strict';
const assert=require('node:assert/strict');
const {setup}=require('./browser-helper.cjs');
(async()=>{const h=await setup();try{
  const {page,go,predict,control,capture,shot}=h;let passed=0;
  const ok=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
  const values=()=>page.evaluate(()=>HLModelState.snapshot(document.querySelector('.hl-widget-mount')).values);
  const num=(v,k)=>parseFloat(v[k]);
  await go('module/m1');ok('Module overview explains the six connected purposes',await page.locator('.cbt-step-purpose').count()===6);
  await go('activity/cbt-m1-bladeelement');
  await page.getByRole('button',{name:'Reference: 8° / 3°',exact:true}).click();await capture();const base=await values();
  await page.getByRole('button',{name:'Pitch only: 10° / 3°',exact:true}).click();await capture();const pitch=await values();
  await page.getByRole('button',{name:'Inflow only: 8° / 5°',exact:true}).click();await capture();const inflow=await values();
  ok('Preset comparisons meet the real angle-evidence requirements',await page.evaluate(()=>{const a=HLTraining.activities().find(a=>a.lessonId==='cbt-m1-bladeelement');return HLTraining.evidence(a,HLProgress.get(a.lessonId).snapshots).every(r=>r.passed);}));
  ok('Pitch-only raises alpha without changing inflow',num(pitch,'AoA α = θ − φ')-num(base,'AoA α = θ − φ')===2&&pitch['Inflow φ']===base['Inflow φ']);
  ok('Inflow-only lowers alpha without changing pitch',num(inflow,'AoA α = θ − φ')-num(base,'AoA α = θ − φ')===-2&&inflow['Pitch θ']===base['Pitch θ']);
  await control('Pitch θ (collective)',4);await control('Inflow angle φ',-3);
  ok('Signed upflow gives the taught 4 minus negative 3 equals 7',num(await values(),'AoA α = θ − φ')===7&&num(await values(),'Signed normal velocity')<0);
  await control('Inflow angle φ',8);
  ok('Negative alpha is displayed without an invented positive lift',num(await values(),'AoA α = θ − φ')===-4&&!Object.keys(await values()).some(k=>k.includes('Lift')));
  await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Signed-angle controls and full view resume after reload',await page.getByLabel('Inflow angle φ',{exact:true}).inputValue()==='8'&&await page.evaluate(()=>document.querySelector('.hl-widget-mount')._hlModel.get().step===4));
  await go('activity/cbt-m1-spanwise');await page.getByRole('button',{name:'Compare 0.4R',exact:true}).click();const inner=await values();await capture();await page.getByRole('button',{name:'Compare 0.8R',exact:true}).click();const outer=await values();await capture();
  ok('Radial comparison doubles speed and quadruples rotational pressure',num(outer,'Speed / tip speed')/num(inner,'Speed / tip speed')===2&&num(outer,'Rotational q / tip q')/num(inner,'Rotational q / tip q')===4);
  await control('Blade twist (washout)',-8);const twist=await values();
  ok('Twist changes pitch but leaves both plotted ratios invariant',twist['Geometric pitch here']!==outer['Geometric pitch here']&&twist['Speed / tip speed']===outer['Speed / tip speed']&&twist['Rotational q / tip q']===outer['Rotational q / tip q']);
  ok('Radial activity starts ready for its required zero-twist comparison',inner['Geometric pitch here']==='8.00°'&&await page.evaluate(()=>{const a=HLTraining.activities().find(a=>a.lessonId==='cbt-m1-spanwise');return HLTraining.evidence(a,HLProgress.get(a.lessonId).snapshots).every(r=>r.passed);}));
  await go('activity/cbt-m1-bigpicture');await control('Cyclic — aft ◀ ▶ forward',100);const aircraft=await values();
  ok('Vertical force uses the vertical thrust projection',Math.abs(num(aircraft,'Vertical thrust / weight')-parseFloat(aircraft.Collective.split('T/W ')[1])*Math.cos(14*Math.PI/180))<.003);
  await control('Airspeed V',40);const moving=await values();
  ok('Speed does not rotate the imposed thrust',moving['Cyclic / disc tilt']===aircraft['Cyclic / disc tilt']&&moving['Vertical thrust / weight']===aircraft['Vertical thrust / weight']);
  await go('activity/cbt-m6-bet-velocity');
  for(const [angle,side] of [[90,'advancing'],[270,'retreating']]){
    await control('Azimuth ψ',angle);const v=await values();
    ok('Compass and signed translation agree at '+angle,await page.locator('.hl-flow-blade').getAttribute('x2').then(x=>angle===90?+x>90:+x<90)&&v['Azimuth ψ'].includes(side)&&(angle===90?num(v,'Translational tangential velocity')>0:num(v,'Translational tangential velocity')<0));
  }
  await control('Azimuth ψ',360);ok('360 degrees returns to the tail convention',(await values())['Azimuth ψ'].includes('over tail'));
  await go('activity/cbt-m1-m1-04');
  // Record actual canvas commands to verify the displayed vector sum, not only a helper.
  await page.evaluate(()=>{const target=document.querySelector('.hl-widget-mount canvas');window.__forces=[];const arrow=HLD.arrow,clear=HLD.clear;HLD.clear=(ctx,...args)=>{if(ctx.canvas===target)__forces=[];return clear(ctx,...args);};HLD.arrow=(ctx,x0,y0,x1,y1,color,...args)=>{if(ctx.canvas===target)__forces.push({x0,y0,x1,y1,color});return arrow(ctx,x0,y0,x1,y1,color,...args);};});
  const next=page.locator('.hl-step-nav button').last();await next.click();
  await page.getByLabel('V_rel start point',{exact:true}).selectOption('wind');await page.getByLabel('V_rel end point',{exact:true}).selectOption('element');await page.getByRole('button',{name:'Construct from endpoints',exact:true}).click();await page.getByRole('button',{name:'Commit V_rel construction',exact:true}).click();await next.click();
  await page.getByRole('radio',{name:'α = 2°',exact:true}).click();await page.getByRole('radio',{name:'α = 6°',exact:true}).click();await next.click();
  const arrows=()=>page.evaluate(()=>{const col=HLD.setup(document.querySelector('.hl-widget-mount canvas')).col;return {list:__forces,col};});
  let drawn=await arrows();const vector=color=>{const v=drawn.list.find(v=>v.color===color);return v&&{x:v.x1-v.x0,y:v.y1-v.y0};};
  const l=vector(drawn.col.lift),d=vector(drawn.col.drag),total=vector('#c084fc');
  ok('Drawn lift plus drag equals the drawn total aerodynamic force',!!l&&!!d&&!!total&&Math.abs(l.x+d.x-total.x)<1e-7&&Math.abs(l.y+d.y-total.y)<1e-7);
  await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('module1-force-sum-desktop');
  await next.click();drawn=await arrows();const normal=vector(drawn.col.good),horizontal=vector(drawn.col.warn),resolved=vector('#c084fc');
  ok('Drawn normal and in-plane projections equal the same resultant',!!normal&&!!horizontal&&!!resolved&&Math.abs(normal.x+horizontal.x-resolved.x)<1e-7&&Math.abs(normal.y+horizontal.y-resolved.y)<1e-7);
  await page.getByRole('radio',{name:/local normal component contributes/i}).click();await next.click();await capture();
  ok('A corrected native attempt retains its feedback history',await page.evaluate(()=>{const s=HLProgress.get('cbt-m1-m1-04').snapshots.at(-1);return s.evidence.support&&s.evidence.attempts.some(a=>!a.correct)&&s.evidence.gates.construction;}));
  await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Native feedback history persists across reload',await page.evaluate(()=>document.querySelector('.hl-widget-mount')._hlModel.evidence().support));
  // Revised tasks preserve earlier evidence in the existing archive.
  await go('activity/cbt-m1-spanwise');await page.evaluate(()=>HLProgress.patch('cbt-m1-spanwise',{version:2,complete:true,snapshots:[{model:'wSpanwise',inputs:{},selected:[],values:{'Rel. lift here':'76 %'},state:{},evidence:{}}]}));await page.reload();await page.waitForFunction(()=>window.HLApp);
  ok('Old radial-lift evidence is preserved without completing the revised task',await page.evaluate(()=>{const s=HLProgress.get('cbt-m1-spanwise');return s.version===3&&!s.complete&&s.prior.snapshots[0].values['Rel. lift here']==='76 %';}));
  const ids=await page.evaluate(()=>HL_V2_MODULES[0].activities.map(a=>a.lessonId));
  for(const width of [1280,768,390]){
    await page.setViewportSize({width,height:900});
    for(const id of ids){await go('activity/'+id);await predict();await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();ok('Module 1 visible content fits '+width+' / '+id,await page.evaluate(()=>{const m=document.querySelector('#hlMain');return m.scrollWidth<=m.clientWidth+1;}));}
    await go('activity/cbt-m1-bladeelement');await page.getByRole('button',{name:'Reference: 8° / 3°',exact:true}).click();await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('module1-angles-'+width);
    await go('activity/cbt-m1-spanwise');await page.locator('.hl-widget-mount').scrollIntoViewIfNeeded();await shot('module1-radius-'+width);
    await go('activity/cbt-m6-bet-velocity');await page.locator('.hl-flow-orientation').scrollIntoViewIfNeeded();await shot('module1-flow-'+width);
  }
  await page.setViewportSize({width:390,height:900});await go('activity/cbt-m1-bladeelement');await page.getByRole('button',{name:'Reference: 8° / 3°',exact:true}).click();await control('Pitch θ (collective)',18);await control('Inflow angle φ',12);await page.locator('.hl-w-stage-foundation').scrollIntoViewIfNeeded();await shot('module1-angle-extreme-mobile');
  await page.locator('#hlThemeBtn').click();await shot('module1-angles-light-mobile');
  ok('No uncaught errors in Module 1 paths',h.errors.length===0);
  console.log(`${passed} module-one browser checks passed`);
}finally{await h.close();}})().catch(e=>{console.error(e);process.exit(1);});
