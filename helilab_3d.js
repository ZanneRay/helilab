/* ===========================================================================
   helilab_3d.js — Three.js rotor + fuselage + wake view for the Sandbox
   ===========================================================================
   ES module (loaded via importmap). Exposes window.HL3D.create(container, opts)
   → a controller { update(params), setOption(k,v), dispose() }.

   It is a DUMB renderer: the Sandbox computes the physics (from flapping.js /
   helilab_core.js) and feeds derived quantities in via update():
     coningDeg   — blade cone angle a₀
     bodyPitchDeg— nose-down attitude of fuselage + disc (grows with speed)
     mu, lam     — advance ratio & inflow ratio (set the wake skew = μ/λ)
     Nb          — blade count
     showWake, showFuselage — toggles

   The wake is drawn as true trailing tip-vortices: each frame a point is shed at
   every blade tip and then convects DOWN (∝ λ) and AFT (∝ μ) in the world frame,
   so the spiral skews back correctly as speed rises — no faked geometry.
   =========================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

const R3 = 2.0;            // rotor radius in world units
const MAST = 0.55;         // hub height above fuselage ref
const TRAIL = 96;          // points kept per tip vortex
const OMEGA_VIS = 2.6;     // visual rotor speed [rad/s]
const PITCH_VIS = 2.6;     // visual exaggeration of blade pitch (small real angles)
const WAKE_K = 30;         // world units/sec per unit inflow ratio (sets drift)
const SHED_DT = 0.02;      // seconds between shed vortex points

function cssVar(name, fb) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fb;
}

/* NACA 0012 contour (symmetric helicopter rotor section) → THREE.Shape,
   chord centred on the quarter-chord, scaled to `chord`. */
function naca0012Shape(chord) {
  const t = 0.12, N = 30;
  const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x
    - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
  const up = [], lo = [];
  for (let i = 0; i <= N; i++) {
    const x = 0.5 * (1 - Math.cos(Math.PI * i / N));
    up.push([x, yt(x)]); lo.push([x, -yt(x)]);
  }
  const pts = up.concat(lo.reverse());
  const shape = new THREE.Shape();
  // X = (0.25 − p.x)·chord: flips the chord so after the +90° span rotation the
  // rounded LEADING EDGE faces the direction of blade travel (−Z, CCW rotor).
  pts.forEach((p, i) => { const X = (0.25 - p[0]) * chord, Y = p[1] * chord;
    i ? shape.lineTo(X, Y) : shape.moveTo(X, Y); });
  shape.closePath();
  return shape;
}

function create(container, opts) {
  opts = opts || {};
  const scene = new THREE.Scene();

  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  // camera
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(6.5, 3.2, 7.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 30;
  controls.target.set(0, -0.4, 0);

  // lights
  // hemisphere (sky/ground) gives a soft gradient so nothing goes flat-black
  scene.add(new THREE.HemisphereLight(0xdce9ff, 0x2a3340, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(5, 9, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fc0ff, 0.45);
  fill.position.set(-6, 3, -4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcd4ff, 0.5);   // back-rim to pop edges
  rim.position.set(-3, 4, -8); scene.add(rim);

  // ground grid for spatial reference
  const grid = new THREE.GridHelper(16, 16, 0x3a4759, 0x222c39);
  grid.position.y = -3.2; scene.add(grid);

  // ── aircraft group (fuselage + mast + rotor) — pitches nose-down ──────────
  const aircraft = new THREE.Group();
  scene.add(aircraft);

  // primitive fuselage fallback (also the default until/if GLB loads)
  const fusePrim = new THREE.Group();
  {
    const mat = new THREE.MeshStandardMaterial({ color: 0xc4d3e6, metalness: 0.25, roughness: 0.45,
      emissive: 0x1a2230, emissiveIntensity: 0.55 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), mat);
    body.scale.set(1.7, 0.95, 0.95); body.position.set(0.1, -0.35, 0);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.06, 1.7, 12), mat);
    boom.rotation.z = Math.PI / 2; boom.position.set(-1.45, -0.2, 0);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.05), mat);
    fin.position.set(-2.25, 0.0, 0);
    const skidL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mat);
    skidL.rotation.x = Math.PI / 2; skidL.rotation.z = Math.PI / 2; skidL.position.set(0.1, -0.95, 0.45);
    const skidR = skidL.clone(); skidR.position.z = -0.45;
    fusePrim.add(body, boom, fin, skidL, skidR);
  }
  aircraft.add(fusePrim);
  let fuseGlb = null;

  // mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, MAST, 10),
    new THREE.MeshStandardMaterial({ color: 0x55636f }));
  mast.position.y = MAST / 2; aircraft.add(mast);

  // ── disc-tilt group (tilts the disc relative to the shaft: a₁ blowback / b₁)
  //    then the rotor spins inside it ─────────────────────────────────────────
  const discTilt = new THREE.Group();
  discTilt.position.y = MAST; aircraft.add(discTilt);
  const rotor = new THREE.Group();
  discTilt.add(rotor);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x33404c }));
  rotor.add(hub);

  // faint tip-path-plane disc
  const tpp = new THREE.Mesh(
    new THREE.CircleGeometry(R3, 48),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--hl-accent', '#38bdf8')),
      transparent: true, opacity: 0.06, side: THREE.DoubleSide }));
  tpp.rotation.x = -Math.PI / 2; rotor.add(tpp);

  let blades = [], cones = [], tips = [], bladeMeshes = [], velArrows = [];
  // semi-transparent blades so the relative-wind arrows stay readable through them
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, metalness: 0.3, roughness: 0.5,
    side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false });
  const bladeHi  = new THREE.MeshStandardMaterial({ color: 0xfb923c, metalness: 0.2, roughness: 0.5,
    side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false });
  // NACA 0012 blade: airfoil shape extruded along the span
  const SPAN = R3 * 0.92, ROOT = R3 * 0.08, CHORD = 0.24;
  const LE_Z = -0.25 * CHORD, TE_Z = 0.75 * CHORD;  // chord extents (LE faces −Z = travel)
  const NVEC = 6;                              // relative-velocity arrows per blade
  const VEL_FWD = 0x35d39a, VEL_REV = 0xff5555; // green (normal) / red (reverse flow)
  const VZP = new THREE.Vector3(0, 0, 1), VZN = new THREE.Vector3(0, 0, -1);
  const bladeGeo = new THREE.ExtrudeGeometry(naca0012Shape(CHORD),
    { depth: SPAN, bevelEnabled: false, steps: 1 });
  bladeGeo.rotateY(Math.PI / 2);          // extrude axis (span) → +X; chord → −Z, thick → +Y
  bladeGeo.translate(ROOT, 0, 0);

  function buildBlades(Nb) {
    blades.forEach(b => rotor.remove(b));
    blades = []; cones = []; tips = []; bladeMeshes = []; velArrows = [];
    for (let b = 0; b < Nb; b++) {
      const az = new THREE.Group(); az.rotation.y = (b / Nb) * Math.PI * 2;
      const cone = new THREE.Group();                 // coning pivot
      const blade = new THREE.Mesh(bladeGeo, b === 0 ? bladeHi : bladeMat);
      // feathering: LE is at local −Z, so POSITIVE rotation.x raises the LE
      // (R_x(α) on z=−c gives y′=+c·sinα). Updated live from collective.
      blade.rotation.x = 8 * Math.PI / 180;
      const tip = new THREE.Object3D(); tip.position.x = ROOT + SPAN;
      cone.add(blade); cone.add(tip);
      // relative-velocity (tangential U_T) arrows along the span — drawn like the
      // V_rel arrow on a BET diagram: tail upstream, HEAD ON the leading edge
      for (let s = 0; s < NVEC; s++) {
        const x = ROOT + (0.1 + 0.86 * s / (NVEC - 1)) * SPAN;
        const ah = new THREE.ArrowHelper(VZP, new THREE.Vector3(x, 0, LE_Z - 0.3), 0.3, VEL_FWD, 0.1, 0.07);
        cone.add(ah);
        velArrows.push({ ah, rBar: x / R3, baseAz: az.rotation.y });
      }
      az.add(cone); rotor.add(az);
      blades.push(az); cones.push(cone); tips.push(tip); bladeMeshes.push(blade);
    }
  }
  buildBlades(opts.Nb || 4);

  // ── azimuth ψ marker (fixed in the disc frame; tilts with the disc) ───────
  // Ties the 3-D view to the 2-D blade-element panel: it points to the ψ where
  // the element is sampled. ψ: 0 aft, 90 ADV, 180 nose, 270 RET.
  const discFrame = new THREE.Group(); discFrame.position.y = MAST; aircraft.add(discFrame);
  const psiMarker = new THREE.Group(); discFrame.add(psiMarker);
  {
    const armMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, R3, 8), armMat);
    arm.rotation.z = Math.PI / 2; arm.position.x = R3 / 2;     // along +X from hub
    const station = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    station.position.x = 0.75 * R3;                            // sampling station 0.75R
    psiMarker.add(arm); psiMarker.add(station);
  }
  function setPsi(psiDeg) {
    // 3-D azimuth Φ = ψ + 180: ψ=0→Φ180=−X(tail), ψ=90→Φ270=+Z(advancing/right),
    // ψ=180→Φ0=+X(nose), ψ=270→Φ90=−Z(retreating/left). Matches the CCW rotor.
    psiMarker.rotation.y = psiDeg * Math.PI / 180 + Math.PI;
  }
  setPsi(90);

  // ── downwash streamtube (translucent wake envelope; skews with speed) ─────
  const tubeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cssVar('--hl-wind', '#56ccf8')),
    transparent: true, opacity: 0.045, side: THREE.BackSide, depthWrite: false });
  const tubeH = R3 * 3.2;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(R3 * 0.78, R3 * 0.92, tubeH, 32, 1, true), tubeMat);
  scene.add(tube);

  // ── tip-vortex trails (one Line per blade) ────────────────────────────────
  const wakeGroup = new THREE.Group(); scene.add(wakeGroup);
  let trails = [];        // [{ pts:[Vector3], line, posAttr }]
  const wakeColor = new THREE.Color(cssVar('--hl-wind', '#56ccf8'));
  function buildTrails(Nb) {
    trails.forEach(t => wakeGroup.remove(t.line));
    trails = [];
    for (let b = 0; b < Nb; b++) {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(TRAIL * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo,
        new THREE.LineBasicMaterial({ color: wakeColor, transparent: true, opacity: 0.55 }));
      wakeGroup.add(line);
      trails.push({ pts: [], line, posAttr: geo.getAttribute('position') });
    }
  }
  buildTrails(opts.Nb || 4);

  // ── try to load the light Eurocopter GLB ──────────────────────────────────
  // Heli_simple.glb (Blender export) is Y-up with the NOSE along +Z and the tail
  // along −Z, and it carries its own main-rotor hub node + a static blade. We:
  //   • rotate it +90° about Y so the nose points along +X (our forward),
  //   • hide its static main rotor (we draw our own animated blades),
  //   • anchor its own rotor-hub (model-space ≈ (0.03, 1.91, 2.04)) to our hub
  //     at (0, MAST, 0) — so the rotor always sits exactly on the mast.
  // Heli_simple.glb is the FULL symmetric fuselage (both sides) exported from
  // Heli_simple.obj; the previous GLB was a half-model. No main blades in the
  // model — we draw our own. The model's main-rotor hub disc is the "Circle" node.
  const GLB_HUB = new THREE.Vector3(0.031, 1.909, 2.035);   // main-rotor axis, model space (full model)
  const GLB_SCALE = 0.34;                                     // tuned to ~fuselage length
  if (opts.showFuselage !== false) tryLoadGlb();
  function tryLoadGlb() {
    new GLTFLoader().load('./image/Heli_simple.glb', (gltf) => {
      const model = gltf.scene;
      // hide ONLY the model's own main-rotor blade + disc (we animate our own).
      // Exact names so we never hit body parts — the model's naming is messy
      // (e.g. the "REAR BLADE" node references a large body mesh called "Cube").
      model.traverse(o => {
        if (o.name && /^(BLADE|Circle)$/i.test(o.name)) o.visible = false;
      });
      model.rotation.y = Math.PI / 2;          // nose +Z → world +X
      model.scale.setScalar(GLB_SCALE);
      model.updateMatrixWorld(true);
      // shift so the model's own rotor hub lands on our hub at (0, MAST, 0)
      const hubW = GLB_HUB.clone().applyMatrix4(model.matrixWorld);
      model.position.add(new THREE.Vector3(0, MAST, 0).sub(hubW));
      model.traverse(o => { if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({ color: 0xc4d3e6, metalness: 0.25, roughness: 0.45,
          emissive: 0x1a2230, emissiveIntensity: 0.55, side: THREE.DoubleSide });
      }});
      fuseGlb = model; aircraft.add(model);
      fusePrim.visible = false;
      mast.visible = false;                    // model supplies its own mast/hub
      applyOptions();
    }, undefined, () => { /* keep primitive fallback */ });
  }

  // ── state (targets lerped each frame) ─────────────────────────────────────
  const tgt = { a0: 0.08, pitch: 0, mu: 0, lam: 0.05, bladePitch: 0.14, discLon: 0, discLat: 0, Nb: opts.Nb || 4 };
  const cur = { a0: 0.08, pitch: 0, mu: 0, lam: 0.05, bladePitch: 0.14, discLon: 0, discLat: 0 };
  const options = { showWake: opts.showWake !== false, showFuselage: opts.showFuselage !== false,
                    showMarker: opts.showMarker !== false, showVel: opts.showVel === true,
                    paused: false };

  let spin = 0, shedAcc = 0;
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  let disposed = false;

  function applyOptions() {
    wakeGroup.visible = options.showWake;
    tube.visible = options.showWake;
    psiMarker.visible = options.showMarker;
    if (fuseGlb) fuseGlb.visible = options.showFuselage;
    else fusePrim.visible = options.showFuselage;
    mast.visible = options.showFuselage && !fuseGlb;   // GLB carries its own mast
    velArrows.forEach(v => v.ah.visible = options.showVel);
  }
  applyOptions();

  function update(p) {
    if (p.coningDeg != null) tgt.a0 = p.coningDeg * Math.PI / 180;
    if (p.bodyPitchDeg != null) tgt.pitch = p.bodyPitchDeg * Math.PI / 180;
    if (p.bladePitchDeg != null) tgt.bladePitch = p.bladePitchDeg * Math.PI / 180;
    if (p.discTiltLonDeg != null) tgt.discLon = p.discTiltLonDeg * Math.PI / 180;   // +back = blowback
    if (p.discTiltLatDeg != null) tgt.discLat = p.discTiltLatDeg * Math.PI / 180;
    if (p.mu != null) tgt.mu = p.mu;
    if (p.lam != null) tgt.lam = Math.max(0.01, p.lam);
    if (p.psiDeg != null) setPsi(p.psiDeg);
    if (p.showWake != null) { options.showWake = p.showWake; applyOptions(); }
    if (p.showFuselage != null) { options.showFuselage = p.showFuselage; applyOptions(); }
    if (p.showMarker != null) { options.showMarker = p.showMarker; applyOptions(); }
    if (p.showVel != null) { options.showVel = p.showVel; applyOptions(); }
    if (p.paused != null) options.paused = p.paused;
    if (p.Nb != null && p.Nb !== tgt.Nb) { tgt.Nb = p.Nb; buildBlades(p.Nb); buildTrails(p.Nb); applyOptions(); }
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  function animate() {
    if (disposed) return;
    if (!renderer.domElement.isConnected) { dispose(); return; }
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());

    // ease toward targets
    const k = Math.min(1, dt * 3.5);
    cur.a0 += (tgt.a0 - cur.a0) * k;
    cur.pitch += (tgt.pitch - cur.pitch) * k;
    cur.mu += (tgt.mu - cur.mu) * k;
    cur.lam += (tgt.lam - cur.lam) * k;
    cur.bladePitch += (tgt.bladePitch - cur.bladePitch) * k;
    cur.discLon += (tgt.discLon - cur.discLon) * k;
    cur.discLat += (tgt.discLat - cur.discLat) * k;

    // apply attitude + disc tilt + coning + blade pitch + spin
    aircraft.rotation.z = -cur.pitch;            // fuselage nose-down
    discTilt.rotation.z = cur.discLon;           // a₁ blowback (disc tips back)
    discTilt.rotation.x = cur.discLat;           // b₁ lateral
    cones.forEach(c => c.rotation.z = cur.a0);   // coning up
    bladeMeshes.forEach(m => m.rotation.x = cur.bladePitch * PITCH_VIS);  // +x = LE up (LE at −Z)
    if (!options.paused) spin += OMEGA_VIS * dt;       // pause freezes the rotation
    rotor.rotation.y = spin;                            // +Y rotation = CCW viewed from above (EC135/H145)
    aircraft.updateMatrixWorld(true);

    // relative-velocity arrows. Blade 3-D azimuth Φ maps to rotor ψ as ψ = Φ − 180
    // (ψ: 0 tail, 90 advancing, 180 nose, 270 retreating), so U_T/ΩR = r̄ + μ·sinψ
    // = r̄ − μ·sinΦ. Green where U_T > 0, RED in the reverse-flow zone (U_T < 0,
    // retreating/port inboard) — grows with forward speed.
    if (options.showVel) {
      velArrows.forEach(v => {
        const UT = v.rBar - cur.mu * Math.sin(spin + v.baseAz);
        const len = Math.min(0.95, Math.abs(UT) * 0.6 + 0.04);
        const fwd = UT >= 0;
        // tail upstream, head ON the edge the air meets first:
        // normal flow → head at the LE; reverse flow → air arrives at the TE
        v.ah.position.z = fwd ? (LE_Z - len) : (TE_Z + len);
        v.ah.setColor(fwd ? VEL_FWD : VEL_REV);
        v.ah.setDirection(fwd ? VZP : VZN);
        v.ah.setLength(len, Math.min(0.12, len * 0.45), 0.06);
      });
    }

    // downwash streamtube: skew aft by χ = atan(μ/λ), anchored under the hub
    if (options.showWake) {
      const chi = Math.atan2(cur.mu, Math.max(0.02, cur.lam));   // skew from vertical
      tube.rotation.set(0, 0, -chi);                             // bottom swings aft (−X)
      const half = (R3 * 3.2) / 2;
      tube.position.set(-Math.sin(chi) * half, MAST - Math.cos(chi) * half, 0);
    }

    // shed + convect tip vortices (world frame) — frozen while paused
    if (options.showWake && !options.paused) {
      const downV = WAKE_K * Math.max(0.03, cur.lam);  // descent (floor so hover reads)
      const aftV  = WAKE_K * cur.mu;                    // aft drift → wake skew = μ/λ
      shedAcc += dt;
      const doShed = shedAcc >= SHED_DT; if (doShed) shedAcc = 0;
      trails.forEach((tr, b) => {
        // age existing points
        for (let i = 0; i < tr.pts.length; i++) {
          tr.pts[i].y -= downV * dt;
          tr.pts[i].x -= aftV * dt;
        }
        if (doShed) {
          tips[b].getWorldPosition(tmpV);
          tr.pts.push(tmpV.clone());
          if (tr.pts.length > TRAIL) tr.pts.shift();
        }
        const arr = tr.posAttr.array;
        for (let i = 0; i < tr.pts.length; i++) {
          arr[i * 3] = tr.pts[i].x; arr[i * 3 + 1] = tr.pts[i].y; arr[i * 3 + 2] = tr.pts[i].z;
        }
        tr.line.geometry.setDrawRange(0, tr.pts.length);
        tr.posAttr.needsUpdate = true;
        tr.line.geometry.computeBoundingSphere();
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function dispose() {
    if (disposed) return; disposed = true;
    try { ro.disconnect(); } catch (e) {}
    try { controls.dispose(); } catch (e) {}
    scene.traverse(o => { if (o.geometry) o.geometry.dispose?.(); if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose?.()); } });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { update, dispose, setOption: (kk, v) => update({ [kk]: v }) };
}

window.HL3D = { create };
