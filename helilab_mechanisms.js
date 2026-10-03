/* Controlled teaching comparisons. Existing BET signs and angles are reused. */
'use strict';
const HLMechanisms=(()=>{
  const D2R=Math.PI/180,R2D=180/Math.PI;
  function flap(st,r,psi,rateDeg){
    // Prescribe one instantaneous motion at beta=0; no trim/dynamic solution.
    const rate=rateDeg*D2R/omega(st);
    const c={a0:0,a1c:-rate*Math.sin(psi),a1s:rate*Math.cos(psi)};
    const d=localVelocityDecomposition(st,c,r,psi);
    const theta=bladePitch(st,r,psi),phi=inflowAngle(d.UT,d.UP);
    return {...d,theta,phi,aoa:theta-phi};
  }
  function twist(st,r,psi,twistDeg,normalMS){
    // Frozen uniform normal flow isolates pitch redistribution from re-trim.
    const base={...st,theta1c:0,theta1s:0,twist:twistDeg};
    const UT=r+advanceRatio(base)*Math.sin(psi),UP=normalMS/tipSpeed(base);
    const theta=bladePitch(base,r,psi),phi=inflowAngle(UT,UP);
    return {UT,UP,theta,phi,aoa:theta-phi,reverseFlow:UT<=1e-4};
  }
  function diagnostic(st,d){
    // Illustrative positive-alpha section rule; not measured airfoil data.
    const M=tipSpeed(st)*Math.max(0,d.UT)/Math.max(1,sosAtAltFt(st.alt));
    const critical=Math.max(5,st.stallAoA-18*Math.max(0,M-.30));
    const unsupported=d.reverseFlow||d.UT<=1e-4;
    const alpha=d.aoa*R2D,ratio=alpha/critical;
    return {critical,alpha,ratio,unsupported,crossed:!unsupported&&ratio>=1,near:!unsupported&&ratio>=.8&&ratio<1};
  }
  function foundation(st,r,psi){
    const plain={...st,twist:0},trim=computeTrimCyclic(plain);
    const base={...plain,theta1s:trim.t1s_deg,theta1c:0};
    const UT=r+advanceRatio(base)*Math.sin(psi),UP=inflowRatio(base);
    const theta=bladePitch(base,r,psi),phi=inflowAngle(UT,UP);
    return {UT,UP,theta,phi,aoa:theta-phi,reverseFlow:UT<=1e-4};
  }
  return {flap,twist,diagnostic,foundation};
})();
