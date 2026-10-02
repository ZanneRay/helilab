/* Standalone curriculum: stable activity identities, observable outcomes and transfer. */
'use strict';
const HLTraining = (() => {
  const outcomes = [
    'Construct a blade-element model and explain velocity, angle and force directions.',
    'Predict hover demand and induced power while stating what is held constant.',
    'Explain unequal blade velocity, flapping and the role of cyclic control.',
    'Interpret a power curve and distinguish aerodynamic limits from approved aircraft limits.',
    'Explain control and anti-torque mechanisms, including ground-contact constraints.',
    'Explain how airflow and rotor energy sustain autorotation, and identify model limits.',
    'Combine constraints, mechanisms and evidence to explain an unfamiliar flight problem.'
  ];
  const tasks = {
    bigpicture:['Change collective, then forward speed separately. Compare rotor force and wake direction.','Distinguish rotor thrust direction from the direction of the aircraft velocity.'],
    bladeelement:['Change pitch and inflow separately. Record two values of θ, φ and α.','Explain α = θ − φ with the stated sign convention; pitch alone is not angle of attack.'],
    spanwise:['Compare two radial stations at unchanged RPM and pitch.','Explain why Ωr changes local velocity and why local force does not scale only with blade area.'],
    'm1-04':['Complete all three construction gates: resultant velocity, angle of attack and lift direction.','Explain why lift is normal to relative airflow and resolve it into rotor-axis and in-plane components.'],
    hover:['Commit a mechanism, reveal it and inspect the hover power chain.','Explain why zero aircraft speed does not imply zero induced airflow or zero power.'],
    verticalflight:['Predict, apply the collective change and compare both states.','Separate produced thrust, required hover thrust and the resulting acceleration tendency.'],
    groundeffect:['Compare added mass and reduced density at trimmed hover. Build the causal chain.','State that thrust remains approximately equal to weight in each trimmed case; explain the power change.'],
    'ige-practice':['Compare IGE and OGE at equal required thrust. Inspect induced velocity and induced power.','Explain why a fixed-collective comparison answers a different question from a fixed-thrust comparison.'],
    'axial-practice':['Vary axial descent rate and inspect the indicated flow regimes.','Identify where simple momentum theory is unreliable; do not infer a recovery procedure from the model.'],
    dissymmetry:['Hold RPM constant and increase forward speed. Compare advancing and retreating stations.','Connect local tangential velocity to dynamic pressure; distinguish the uncorrected model from a trimmed rotor.'],
    flapping:['Compare blade motion and angle of attack around the rotor at two speeds.','Explain how flapping changes perpendicular velocity and therefore angle of attack.'],
    flaproll:['Compare front and rear inflow at low and higher forward speed. Inspect the sign convention.','Distinguish longitudinal flapback from the roll response to a fore-aft inflow gradient.'],
    envelope:['Compare the advancing and retreating sides as speed or loading rises.','Distinguish retreating-side angle-of-attack demand from advancing-side compressibility.'],
    performance:['Change mass and density altitude separately. Compare the power curve and margin.','Separate induced, profile and parasite power; treat indicated values as model output, not performance approval.'],
    dynamicrollover:['Compare a free helicopter with one constrained by a ground pivot.','Explain the pivot/thrust moment and why there is no universal safe rollover angle.'],
    lte:['Vary wind direction and inspect anti-torque demand and effectiveness.','Distinguish demand from available control authority and state why generic sectors are not type-specific limits.'],
    coriolis:['Compare radial mass motion as the blade flaps.','Explain conservation of angular momentum and the need to accommodate lead-lag motion.'],
    autorotation:['Vary the displayed autorotation condition and inspect driving and driven regions.','Trace energy from height/airflow into rotor rotation; distinguish local aerodynamic force from whole-rotor torque balance.'],
    'bet-velocity':['Compare two azimuths, then change pitch or inflow. Record local velocity and α.','State the flow convention and explain how an inflow change alters angle of attack at fixed pitch.'],
    'bet-guided':['Compare at least two model layers and two azimuths.','Separate the imposed pitch distribution, flapping velocity and induced inflow assumptions.']
  };
  // Answers carry their own rationale; options are shuffled once per mounted case.
  const cases = {
    m1:[
      ['At fixed pitch θ = 12°, the inflow angle increases from 4° to 7°. What happens to α?', ['It decreases from 8° to 5°.','It increases from 16° to 19°.','It remains 12°.'],0,'With the stated convention α = θ − φ. Increased inflow rotates the relative wind toward the chord and reduces α.'],
      ['At unchanged RPM, compare r/R = 0.4 and 0.8, neglecting forward velocity. Which statement is justified?', ['The outer element has twice the tangential speed; its lift still depends on α and local geometry.','The outer element must produce exactly twice the lift.','Tangential speed is equal because RPM is equal.'],0,'Ω is shared, but local speed is Ωr. Aerodynamic force also depends on speed squared, coefficients and local area.']
    ],
    m2:[
      ['In ideal OGE hover, mass rises 21% at unchanged density and rotor area. Approximate induced power change?', ['About +33%.','Exactly +21%.','No change because the helicopter is stationary.'],0,'P_i = W^(3/2)/√(2ρA): 1.21^(3/2) = 1.331. Profile and accessory power are not included.'],
      ['Compare trimmed IGE and OGE hover with the same weight. Which comparison is valid?', ['Required thrust is approximately the same; IGE reduces induced power.','IGE always requires more thrust than OGE.','At fixed collective, thrust must be unchanged.'],0,'In steady level hover T ≈ W in both cases. Ground proximity changes induced flow; a fixed-collective experiment does not hold thrust constant.']
    ],
    m3:[
      ['Forward speed increases at fixed RPM. Before aerodynamic compensation, which local change occurs?', ['Advancing-side tangential speed rises while retreating-side speed falls.','Both sides gain the same local tangential speed.','RPM determines local speed independently of forward velocity.'],0,'The translational component adds to Ωr on the advancing side and subtracts on the retreating side.'],
      ['A blade element flaps upward through the air at fixed pitch. What is the direct local effect?', ['Additional perpendicular relative velocity tends to reduce its angle of attack.','Its pitch must increase by the flapping angle.','Flapping cannot affect local aerodynamic force.'],0,'Upward blade motion changes the local relative-wind triangle. Geometric pitch and aerodynamic angle of attack remain distinct.']
    ],
    m4:[
      ['At higher speed, total required power starts rising despite falling induced power. What can explain this?', ['Parasite power increases strongly with airspeed.','Induced power must be the only source of power demand.','Lower induced power guarantees lower total power.'],0,'Total required power includes induced, profile and parasite terms. Parasite power is approximately proportional to V³ under fixed drag-area assumptions.'],
      ['A model shows positive power margin above the aircraft flight-manual speed limit. What is justified?', ['The model result does not authorise exceeding approved limits.','Positive power margin overrides all speed limits.','The model proves retreating-blade stall cannot occur.'],0,'Power margin alone does not determine the flight envelope. Structural, control and aerodynamic limits and approved aircraft data still govern.']
    ],
    m5:[
      ['One skid is constrained by a ground obstacle while rotor thrust produces a rolling moment. Which mechanism matters?', ['Rotation about the contact pivot can grow despite a small initial bank.','Only the static tip-over angle matters.','Increasing rotor thrust always restores stability.'],0,'A ground pivot changes the moment balance. Dynamic rollover depends on multiple conditions; a universal angle is not a safe criterion.'],
      ['Main-rotor torque demand increases. What must an anti-torque system provide in steady heading?', ['A balancing yaw moment, subject to available control authority.','Exactly the same tail-rotor force in every condition.','No balancing moment once the helicopter has forward speed.'],0,'The yaw moment balance depends on torque, geometry and aerodynamic contributions. Available authority varies with aircraft and flow conditions.']
    ],
    m6:[
      ['Engine torque is absent in a steady autorotative descent. What sustains rotor rotation?', ['Aerodynamic driving torque balances braking torque as descent supplies energy.','The rotor creates energy without loss of height or airspeed.','All blade sections must provide positive driving torque.'],0,'Driving and driven regions coexist. Whole-rotor torque balance and the aircraft energy budget must both be considered.'],
      ['A flare converts part of the aircraft energy during autorotation. Which statement is justified?', ['Rotor energy and aircraft motion interact; RPM cannot be assumed constant without a balance.','Rotor RPM is independent of aerodynamic loading.','A diagram alone gives a type-specific flare height.'],0,'Stored rotor energy is ½IΩ². Loading and airflow alter energy transfer; technique and limits require approved type-specific instruction.']
    ],
    m7:[
      ['A heavier helicopter must hover OGE at lower density. Before using aircraft data, what direction of change should you predict?', ['Higher induced power demand; then check available power and approved limits.','Lower demand because thinner air reduces all power terms.','The original power margin is unchanged.'],0,'In ideal hover P_i increases with W^(3/2) and decreases with √ρ. Available power may also change and must be checked separately.'],
      ['A learner says: “Cyclic changes pitch, so the local angle of attack equals cyclic pitch everywhere.” What evidence challenges this?', ['Compare pitch with local tangential, induced and flapping velocities at two azimuths.','Read collective alone.','Use aircraft speed alone as the local blade speed.'],0,'Angle of attack depends on the local relative wind. A causal explanation must separate pitch input, velocity triangle and rotor response.']
    ]
  };
  const trainingLessons = [];
  const original = Object.fromEntries(HL_LESSONS.map(l=>[l.id,l]));
  const add = (module, source, overrides={}) => {
    const base=original[source], id=`cbt-${module.id}-${overrides.key||source}`;
    const task=tasks[overrides.key||source]||tasks[source];
    const a={lessonId:id,legacyLessonId:source,mode:'explore',title:base.title,kicker:'PRACTICE',summary:task[0],modeAction:task[0],criteria:task[1],check:null,...overrides};
    trainingLessons.push({...base,id}); module.activities.push(a); return a;
  };
  HL_V2_MODULES.forEach((m,i)=>{m.available=true;m.outcome=outcomes[i];});
  HL_V2_MODULES.slice(0,2).forEach(m=>{
    const old=m.activities; m.activities=[];
    old.forEach(a=>add(m,a.lessonId,{...a,lessonId:`cbt-${m.id}-${a.lessonId}`,criteria:tasks[a.lessonId][1],modeAction:tasks[a.lessonId][0]}));
  });
  add(HL_V2_MODULES[1],'groundeffect',{key:'ige-practice',title:'Ground effect at equal thrust',widget:'wCBTGroundEffect'});
  add(HL_V2_MODULES[1],'verticalflight',{key:'axial-practice',title:'Vertical flow regimes',widget:'wVertical'});
  [['dissymmetry','flapping','flaproll'],['performance','envelope'],['dynamicrollover','lte','coriolis'],['autorotation','bet-velocity'],['bet-guided']].forEach((ids,i)=>{
    const m=HL_V2_MODULES[i+2];m.activities=[];ids.forEach(id=>add(m,id));
  });
  HL_V2_MODULES[6].title='Integration & Transfer';
  HL_V2_MODULES.forEach(m=>{
    add(m,m.activities[0].legacyLessonId,{key:'transfer',mode:'challenge',title:'Apply it in a new situation',kicker:'TRANSFER',summary:'Explain two changed conditions and support each decision with a causal argument.',modeAction:'Work without the model first. Use it afterwards to test your explanation.',criteria:m.outcome,transfer:true,bodyHtml:'<p>Commit your reasoning before revealing feedback. Your first attempts remain in your learning record.</p>',takeaways:['A correct choice is one piece of evidence. Explain the mechanism and the limits of the conclusion.']});
  });
  const activities=()=>HL_V2_MODULES.flatMap(m=>m.activities);
  return {activities,cases,outcomes,lessons:()=>trainingLessons};
})();
