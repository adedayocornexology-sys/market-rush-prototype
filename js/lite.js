import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js';

const canvasHost = document.body;
const fpsEl = document.getElementById('fps');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default', stencil: false, depth: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25) * 0.85);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe3c39a);
scene.fog = new THREE.FogExp2(0xdcc0a0, 0.0062);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 900);
camera.position.set(0, 8, 18);

scene.add(new THREE.HemisphereLight(0xffe3bb, 0x6b5236, 2.1));
const sun = new THREE.DirectionalLight(0xffb066, 1.5);
sun.position.set(60, 90, 40);
scene.add(sun);

const PALETTE = [
  [0.72, 0.45, 0.26], [0.65, 0.38, 0.22], [0.78, 0.55, 0.34], [0.58, 0.35, 0.24],
  [0.82, 0.66, 0.46], [0.86, 0.74, 0.56], [0.86, 0.80, 0.68], [0.52, 0.36, 0.26],
];
const ACCENT = [0xb33a2b, 0xe8b02a, 0x2f6b4f, 0xf2e2c4];

let seed = 20261031;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const district = 6;
const cell = 44;
const half = (district * cell) / 2;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1600, 1600),
  new THREE.MeshLambertMaterial({ color: 0x6d5a44 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const roadMat = new THREE.MeshLambertMaterial({ color: 0x3d3a37 });
for (let i = 0; i <= district; i += 1) {
  const offset = -half + i * cell;
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(12, district * cell + 24), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.set(offset, 0.02, 0);
  scene.add(roadNS);
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(district * cell + 24, 12), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.set(0, 0.02, offset);
  scene.add(roadEW);
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const facadeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const MAX_BUILDINGS = district * district * 4;
const buildings = new THREE.InstancedMesh(unitBox, facadeMat, MAX_BUILDINGS);
buildings.instanceMatrix.setUsage(THREE.StaticDrawUsage);
let placed = 0;
const m4 = new THREE.Matrix4();
const tint = new THREE.Color();

for (let bx = 0; bx < district; bx += 1) {
  for (let bz = 0; bz < district; bz += 1) {
    const cx = -half + bx * cell + cell / 2;
    const cz = -half + bz * cell + cell / 2;
    const perSide = 2;
    const span = cell - 18;
    for (let side = 0; side < 4; side += 1) {
      for (let k = 0; k < perSide; k += 1) {
        const w = 6 + rand() * 7;
        const d = 9 + rand() * 8;
        const h = 5 + Math.pow(rand(), 2.1) * 26;
        const along = -span / 2 + (k + 0.5) * (span / perSide);
        let x = cx, z = cz, sx = w, sz = d;
        if (side === 0) { x = cx + along; z = cz - span / 2; sx = w; sz = d; }
        if (side === 1) { x = cx + along; z = cz + span / 2; sx = w; sz = d; }
        if (side === 2) { x = cx - span / 2; z = cz + along; sx = d; sz = w; }
        if (side === 3) { x = cx + span / 2; z = cz + along; sx = d; sz = w; }
        m4.makeScale(sx, h, sz).setPosition(x, h / 2, z);
        buildings.setMatrixAt(placed, m4);
        const p = PALETTE[(placed + bx * 3 + bz) % PALETTE.length];
        const shade = 0.86 + rand() * 0.22;
        tint.setRGB(p[0] * shade, p[1] * shade, p[2] * shade, THREE.SRGBColorSpace);
        buildings.setColorAt(placed, tint);
        placed += 1;
      }
    }
  }
}
buildings.count = placed;
buildings.instanceMatrix.needsUpdate = true;
if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
scene.add(buildings);

const propMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const MAX_PROPS = 220;
const props = new THREE.InstancedMesh(unitBox, propMat, MAX_PROPS);
let propsPlaced = 0;
const addProp = (x, y, z, sx, sy, sz, hex) => {
  if (propsPlaced >= MAX_PROPS) return;
  m4.makeScale(sx, sy, sz).setPosition(x, y, z);
  props.setMatrixAt(propsPlaced, m4);
  tint.setHex(hex, THREE.SRGBColorSpace);
  props.setColorAt(propsPlaced, tint);
  propsPlaced += 1;
};

const avenueZ = 0;
for (let s = 0; s < 26; s += 1) {
  const x = -half + 6 + (s % 13) * (district * cell - 12) / 12.4;
  const side = s < 13 ? -1 : 1;
  const z = avenueZ + side * (7.5 + rand() * 1.2);
  const accent = ACCENT[s % ACCENT.length];
  addProp(x, 0.55, z, 2.2, 1.1, 1.4, 0x8a6a44);
  addProp(x, 1.9, z, 3.4, 0.22, 2.6, accent);
  addProp(x, 1.15, z - side * 0.9, 1.6, 0.9, 0.5, 0x7a5a3a);
}
for (let p = 0; p < 30; p += 1) {
  const x = (rand() - 0.5) * district * cell * 0.94;
  const z = (rand() - 0.5) * district * cell * 0.94;
  addProp(x, 3.4, z, 0.5, 6.8, 0.5, 0x5c4630);
  addProp(x, 7.2, z, 4.6, 0.7, 4.6, 0x3f6b45 + (rand() > 0.5 ? 0 : 0x000800));
}
props.count = propsPlaced;
props.instanceMatrix.needsUpdate = true;
if (props.instanceColor) props.instanceColor.needsUpdate = true;
scene.add(props);

const keke = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 3.4), new THREE.MeshLambertMaterial({ color: 0xffc21a }));
body.position.y = 1.05;
const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.6), new THREE.MeshLambertMaterial({ color: 0x2a231c }));
canopy.position.set(0, 1.95, -0.3);
const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.2, 3.44), new THREE.MeshLambertMaterial({ color: 0x1b1208 }));
stripe.position.y = 0.55;
keke.add(body, canopy, stripe);
keke.position.set(0, 0, 16);
scene.add(keke);

const input = { x: 0, y: 0, active: false };
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');
const R = 44;
let stickId = null;

const setKnob = (dx, dy) => {
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
};

const onStick = (ev) => {
  const r = stick.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let dx = ev.clientX - cx;
  let dy = ev.clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
  setKnob(dx, dy);
  input.x = dx / R;
  input.y = -dy / R;
  input.active = true;
};
const endStick = () => { stickId = null; input.x = 0; input.y = 0; input.active = false; setKnob(0, 0); };

stick.addEventListener('pointerdown', (ev) => { stickId = ev.pointerId; stick.setPointerCapture(ev.pointerId); onStick(ev); ev.preventDefault(); });
stick.addEventListener('pointermove', (ev) => { if (ev.pointerId === stickId) { onStick(ev); ev.preventDefault(); } });
stick.addEventListener('pointerup', (ev) => { if (ev.pointerId === stickId) endStick(); });
stick.addEventListener('pointercancel', endStick);

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const go = document.getElementById('go');
go.addEventListener('click', () => document.getElementById('start').classList.add('gone'));

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let heading = Math.PI;
let speed = 0;
let fpsFrames = 0;
let fpsTime = 0;
let last = performance.now();

const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
camPos.set(0, 7.5, 30);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  let throttle = input.y;
  let steer = input.x;
  if (keys.has('w') || keys.has('arrowup')) throttle = 1;
  if (keys.has('s') || keys.has('arrowdown')) throttle = -1;
  if (keys.has('a') || keys.has('arrowleft')) steer = 1;
  if (keys.has('d') || keys.has('arrowright')) steer = -1;

  const target = throttle * 15;
  speed += (target - speed) * Math.min(1, dt * 3.2);
  if (Math.abs(throttle) < 0.05) speed *= 1 - Math.min(1, dt * 1.6);

  heading += steer * dt * (1.1 + Math.min(1, Math.abs(speed) / 15) * 1.2) * (speed < -0.2 ? -1 : 1);
  keke.rotation.y = heading;

  keke.position.x += Math.sin(heading) * speed * dt;
  keke.position.z += Math.cos(heading) * speed * dt;
  keke.position.x = THREE.MathUtils.clamp(keke.position.x, -half + 4, half - 4);
  keke.position.z = THREE.MathUtils.clamp(keke.position.z, -half + 4, half - 4);

  camTarget.set(
    keke.position.x - Math.sin(heading) * 12,
    keke.position.y + 7.2,
    keke.position.z - Math.cos(heading) * 12
  );
  camPos.lerp(camTarget, 1 - Math.pow(0.0016, dt));
  camera.position.copy(camPos);
  camera.lookAt(keke.position.x + Math.sin(heading) * 6, 2.2, keke.position.z + Math.cos(heading) * 6);

  renderer.render(scene, camera);

  fpsFrames += 1;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fpsEl.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
    fpsFrames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(frame);
}

renderer.render(scene, camera);
requestAnimationFrame(frame);
window.__lite = {
  renderer, scene, camera, keke, input,
  get speed() { return speed; },
  get heading() { return heading; },
};
