import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TEAM, LEAD_ID } from './team.js';

const STALE_WORKING_MS = 10 * 60 * 1000;
const WARN_SILENCE_MS = 45 * 60 * 1000;
const POLL_MS = 20000;

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(window.devicePixelRatio); // never below device ratio
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#23282f');
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 300);
function framing() {
  const portrait = innerHeight > innerWidth;
  camera.position.set(portrait ? 26 : 19, portrait ? 52 : 25, portrait ? 46 : 28);
}
framing();
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = 1.25;
controls.minDistance = 10; controls.maxDistance = 110;
controls.update();

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType }));
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.35, 0.9); // light bloom only
composer.addPass(bloom);
composer.addPass(new OutputPass());
let useComposer = true;

// ---------- lights ----------
scene.add(new THREE.HemisphereLight('#eef2f6', '#5a5048', 1.5));
const sun = new THREE.DirectionalLight('#fff6ea', 1.6);
sun.position.set(18, 34, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun);

// ---------- helpers ----------
const matte = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, ...extra });
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent = scene, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); draw && draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return { cv, ctx, t };
}
function mix(a, b, k) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString(); }

// ---------- floor & walls ----------
const FX = 22, FZ = 15;
box(FX * 2, 0.2, FZ * 2, matte('#8b8580'), 0, -0.1, 0);
const wallMat = matte('#c9c3bb');
box(FX * 2, 4.2, 0.3, wallMat, 0, 2.1, -FZ - 0.15);
box(0.3, 4.2, FZ * 2, wallMat, -FX - 0.15, 2.1, 0);
box(FX * 2, 0.3, 0.32, matte('#9e968c'), 0, 0.15, -FZ + 0.02, scene, false);

// ---------- zones ----------
const COLS = [-10, -5, 0, 5, 10], ROWS = [-11.5, -5.5, 0.5];
const CORR = { '-11.5': -8.5, '-5.5': -2.5, '0.5': 4.0 };
const SPINE_X = 13;
const deskMat = matte('#b49a78'), legMat = matte('#5c5650'), chairMat = matte('#4a4f57'), monMat = matte('#2a2e34');
const spots = {}; // per-bot targets

function deskSet(x, z, parent = scene, faceSign = -1) {
  // desk at z, chair toward +z (bot faces -z)
  box(2.2, 0.08, 1.0, deskMat, x, 0.76, z, parent);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(0.07, 0.74, 0.07, legMat, x + dx * 1.0, 0.37, z + dz * 0.42, parent);
  box(0.9, 0.52, 0.05, monMat, x, 1.12, z - 0.3, parent);
  const scr = box(0.82, 0.44, 0.01, matte('#3d4a58', { emissive: '#1d2a36', emissiveIntensity: 0.6 }), x, 1.12, z - 0.27, parent, false);
  box(0.5, 0.02, 0.18, matte('#3a3d42'), x, 0.81, z + 0.1, parent);
  // chair
  box(0.55, 0.08, 0.55, chairMat, x, 0.48, z + 0.85, parent);
  box(0.55, 0.6, 0.08, chairMat, x, 0.82, z + 1.13, parent);
  cyl(0.04, 0.04, 0.44, legMat, x, 0.24, z + 0.85, parent, 8);
  return scr;
}

function carpetText(text, x, z, w, d, base) {
  const { t } = canvasTex(2048, 512, (c, W, H) => {
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    c.fillStyle = mix(base, '#ffffff', 0.22);
    let size = 190; c.font = `600 ${size}px system-ui,Segoe UI,sans-serif`;
    while (c.measureText(text.toUpperCase()).width > W * 0.9) { size -= 6; c.font = `600 ${size}px system-ui,Segoe UI,sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.letterSpacing = '6px';
    c.fillText(text.toUpperCase(), W / 2, H / 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.013, z); m.receiveShadow = true; scene.add(m);
}

const deptBots = TEAM.filter(b => b.id !== LEAD_ID);
deptBots.forEach((b, i) => {
  const col = i % 5, row = Math.floor(i / 5);
  const x = COLS[col], z = ROWS[row];
  const carpet = mix(b.color, '#77716b', 0.72);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.4), matte(carpet));
  rug.rotation.x = -Math.PI / 2; rug.position.set(x, 0.01, z); rug.receiveShadow = true; scene.add(rug);
  carpetText(b.dept, x, z + 1.75, 4.4, 1.1, carpet);
  const dz = z - 1.4;
  deskSet(x, dz);
  // small desk decor
  if (i % 3 === 0) plant(x + 1.9, z - 2.2, 0.7);
  if (i % 3 === 1) cyl(0.07, 0.06, 0.14, matte(mix(b.color, '#ffffff', 0.3)), x - 0.8, 0.87, dz + 0.1);
  const door = { x, z: CORR[String(z)] };
  spots[b.id] = { desk: { x, z: dz + 0.85, ry: Math.PI, pose: 'sit', door }, deskStand: { x: x + 0.7, z: dz + 0.9, ry: Math.PI, pose: 'stand', door } };
});

// ---------- lead glass corner office ----------
const LX0 = 14.2, LZ1 = -6.6;
const leadFloor = new THREE.Mesh(new THREE.PlaneGeometry(FX - LX0, FZ + LZ1), matte('#6f7a82'));
leadFloor.rotation.x = -Math.PI / 2; leadFloor.position.set((LX0 + FX) / 2, 0.012, (-FZ + LZ1) / 2); leadFloor.receiveShadow = true; scene.add(leadFloor);
carpetText('Command', (LX0 + FX) / 2, LZ1 - 1.1, 5.6, 1.2, '#6f7a82');
const glass = new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 1, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false });
const frame = matte('#5e646b');
// front glass wall (z = LZ1) with door gap near x 14.2..15.6
box(FX - 15.8, 2.6, 0.06, glass, (15.8 + FX) / 2, 1.3, LZ1, scene, false);
box(FX - 15.8, 0.08, 0.1, frame, (15.8 + FX) / 2, 2.6, LZ1);
// side glass wall x = LX0
box(0.06, 2.6, FZ + LZ1, glass, LX0, 1.3, (-FZ + LZ1) / 2, scene, false);
box(0.1, 0.08, FZ + LZ1, frame, LX0, 2.6, (-FZ + LZ1) / 2);
for (const z of [-15, -11, LZ1]) box(0.1, 2.6, 0.1, frame, LX0, 1.3, z);
box(0.1, 2.6, 0.1, frame, 15.8, 1.3, LZ1); box(0.1, 2.6, 0.1, frame, FX, 1.3, LZ1);
deskSet(18.4, -12.6);
box(1.2, 1.9, 0.5, matte('#8d7a62'), 21.2, 0.95, -13.6); // cabinet
plant(15, -14.2, 1.0); plant(21.3, -7.4, 0.8);
const leadDoor = { x: SPINE_X, z: -7.4 };
spots[LEAD_ID] = { desk: { x: 18.4, z: -11.75, ry: Math.PI, pose: 'sit', door: leadDoor }, deskStand: { x: 19.1, z: -11.7, ry: Math.PI, pose: 'stand', door: leadDoor } };
const handoffSpots = []; // in lead office, in front of desk
for (let i = 0; i < 13; i++) handoffSpots.push({ x: 15.6 + (i % 5) * 1.25, z: -10.2 + Math.floor(i / 5) * 1.0, ry: Math.atan2(18.4 - (15.6 + (i % 5) * 1.25), -12.6 - (-10.2 + Math.floor(i / 5))), pose: 'stand', carry: true, door: leadDoor });

// ---------- Deon's desk (outside the glass office) ----------
deskSet(18, -3.4);
const deonPlate = canvasTex(512, 128, (c, W, H) => { c.fillStyle = '#3b3f45'; c.fillRect(0, 0, W, H); c.fillStyle = '#c9ced4'; c.font = '600 64px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Deon', W / 2, H / 2); });
const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.05), [frame, frame, frame, frame, matte('#fff', { map: deonPlate.t }), frame]);
plate.position.set(18.7, 0.88, -3.0); scene.add(plate);
const waitSpots = [];
for (let i = 0; i < 13; i++) { const a = -0.9 + (i % 7) * 0.3, r = 2.2 + Math.floor(i / 7) * 0.9; const x = 18 + Math.sin(a) * r, z = -3.4 + Math.cos(a) * r; waitSpots.push({ x, z, ry: Math.atan2(18 - x, -3.4 - z), pose: 'stand', door: { x: SPINE_X, z: -1.5 } }); }

// ---------- lounge ----------
const lounge = { x: -1, z: 9.8 };
const rugL = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), matte('#7d6f63')); rugL.rotation.x = -Math.PI / 2; rugL.position.set(lounge.x, 0.012, lounge.z); rugL.receiveShadow = true; scene.add(rugL);
const couchMat = lambert('#5d6b7a'), cushion = lambert('#6c7b8b');
const seats = [];
function couch(cx, cz, ry, n) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; scene.add(g);
  const w = n * 0.9 + 0.4;
  box(w, 0.42, 1.0, couchMat, 0, 0.25, 0, g); box(w, 0.75, 0.25, couchMat, 0, 0.6, -0.42, g);
  box(0.22, 0.62, 1.0, couchMat, -w / 2, 0.4, 0, g); box(0.22, 0.62, 1.0, couchMat, w / 2, 0.4, 0, g);
  for (let i = 0; i < n; i++) {
    box(0.84, 0.1, 0.8, cushion, -((n - 1) * 0.9) / 2 + i * 0.9, 0.5, 0.06, g);
    const local = new THREE.Vector3(-((n - 1) * 0.9) / 2 + i * 0.9, 0, 0.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    seats.push({ x: cx + local.x, z: cz + local.z, ry, pose: 'sit', seatY: 0.08, door: { x: lounge.x, z: 4.0 } });
  }
}
couch(lounge.x, lounge.z - 2.4, 0, 4);
couch(lounge.x, lounge.z + 2.4, Math.PI, 4);
couch(lounge.x - 3.0, lounge.z, Math.PI / 2, 2);
box(2.2, 0.4, 1.2, matte('#8a6f55'), lounge.x, 0.2, lounge.z); // coffee table
plant(lounge.x + 4.6, lounge.z - 3.6, 1.1); plant(lounge.x - 4.6, lounge.z + 3.8, 0.9);

// ---------- break room ----------
const br = { x: 15.5, z: 10.5 };
const brFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), matte('#a49d92')); brFloor.rotation.x = -Math.PI / 2; brFloor.position.set(br.x, 0.011, br.z); brFloor.receiveShadow = true; scene.add(brFloor);
carpetText('Break Room', br.x, br.z - 3.3, 5, 1.0, '#a49d92');
box(6, 0.95, 0.7, matte('#d2ccc3'), br.x + 1.5, 0.475, FZ - 0.4); // counter
box(0.5, 0.6, 0.45, matte('#33373c'), br.x + 0.2, 1.25, FZ - 0.45); // coffee machine
box(0.12, 0.12, 0.02, matte('#e0d6a0', { emissive: '#e0c060', emissiveIntensity: 0.9 }), br.x + 0.2, 1.4, FZ - 0.71, scene, false);
box(1.0, 2.1, 0.8, matte('#e3e1dc'), FX - 0.6, 1.05, FZ - 1.2); // fridge
cyl(0.25, 0.25, 1.1, matte('#d0d8de'), br.x - 4.8, 0.55, FZ - 0.5); cyl(0.2, 0.2, 0.4, matte('#9fc5d8', { transparent: true, opacity: 0.6 }), br.x - 4.8, 1.3, FZ - 0.5);
cyl(1.0, 1.0, 0.06, matte('#c8b49a'), br.x, 0.76, br.z, scene, 40); cyl(0.08, 0.2, 0.74, legMat, br.x, 0.37, br.z);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2, x = br.x + Math.sin(a) * 1.55, z = br.z + Math.cos(a) * 1.55;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = a + Math.PI; scene.add(g);
  box(0.48, 0.06, 0.48, chairMat, 0, 0.47, 0, g); box(0.48, 0.5, 0.06, chairMat, 0, 0.75, 0.22, g); cyl(0.03, 0.03, 0.45, legMat, 0, 0.23, 0, g, 8);
  seats.push({ x, z, ry: a + Math.PI, pose: 'sit', seatY: 0.0, door: { x: SPINE_X, z: 4.0 } });
}
plant(br.x - 5.4, br.z + 3.5, 1.0);

// ---------- research area with animated screens ----------
const rs = { x: -15.5, z: 10 };
const rsFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), matte('#7b8079')); rsFloor.rotation.x = -Math.PI / 2; rsFloor.position.set(rs.x, 0.011, rs.z); rsFloor.receiveShadow = true; scene.add(rsFloor);
carpetText('Research Lab', rs.x, rs.z + 3.6, 5, 1.0, '#7b8079');
const screens = [];
function bigScreen(x, z, ry, kind) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  box(3.2, 1.9, 0.12, monMat, 0, 1.9, 0, g); box(0.12, 1.0, 0.12, legMat, 0, 0.5, 0, g); box(1, 0.06, 0.6, legMat, 0, 0.03, 0, g);
  const ct = canvasTex(1536, 864);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.69), new THREE.MeshBasicMaterial({ map: ct.t, toneMapped: true, color: '#b8b8b8' }));
  m.position.set(0, 1.9, 0.065); g.add(m);
  screens.push({ kind, ...ct });
}
bigScreen(-19.5, 7.0, Math.PI / 2.6, 'chart');
bigScreen(-15.5, 5.8, 0, 'map');
bigScreen(-11.5, 7.0, -Math.PI / 2.6, 'terminal');
box(2.6, 0.08, 1.2, deskMat, -15.5, 0.76, 9.0); for (const dx of [-1.2, 1.2]) box(0.08, 0.74, 1.0, legMat, -15.5 + dx, 0.37, 9.0);
box(0.6, 0.42, 0.42, matte('#4a6b8c'), -16.2, 0.99, 8.9); box(0.3, 0.05, 0.4, matte('#d9d3c8'), -14.9, 0.81, 9.1);
// bookshelf on left wall
const shelf = new THREE.Group(); shelf.position.set(-FX + 0.4, 0, 12.5); scene.add(shelf);
box(0.6, 2.4, 3, matte('#7a644d'), 0, 1.2, 0, shelf);
const bookCols = ['#8b4b45', '#4b6a8b', '#6b8b4b', '#a08a50', '#6a4b8b', '#4b8b84'];
for (let s = 0; s < 4; s++) for (let k = 0; k < 11; k++) box(0.4, 0.42, 0.18, matte(bookCols[(s * 3 + k) % 6]), 0.12, 0.35 + s * 0.55, -1.25 + k * 0.25, shelf, false);
plant(-FX + 0.8, 6.0, 1.2);

const US = [[-124.7,48.4],[-123,46.2],[-124.2,42],[-122.4,37.8],[-120.6,34.6],[-117.1,32.5],[-114.7,32.7],[-111,31.3],[-108.2,31.3],[-106.5,31.8],[-103.3,29],[-101.4,29.8],[-99.5,27.5],[-97.2,25.9],[-97.4,27.8],[-94.7,29.4],[-93.8,29.7],[-90.1,29.1],[-88.9,30.4],[-85.4,29.7],[-84,30.1],[-82.7,27.5],[-81.7,25.5],[-80.1,25.8],[-80.4,27.9],[-81.4,30.7],[-79.2,33.2],[-75.6,35.3],[-76.3,37.1],[-75.2,38.6],[-74,40.5],[-71.9,41.3],[-70.1,41.8],[-70.6,43.1],[-67,44.8],[-67.8,47.1],[-69.2,47.4],[-71.5,45],[-74.7,45],[-76.8,43.6],[-79.1,43.3],[-82.4,41.7],[-83.1,42.3],[-82.5,45.3],[-84.6,46.5],[-88.4,48.3],[-95.2,49],[-104,49],[-123.3,49]];
const termLines = ['> summarising findings...', '> model: comparing sources', '> tokens streaming', '> drafting outline', '> evaluating evidence', '> cross-checking citations', '> generating report', '> reasoning step complete', '> embedding documents', '> ranking results'];
let termBuf = [], termTyped = '', termIdx = 0, termChar = 0;
function drawScreens(t) {
  for (const s of screens) {
    const c = s.ctx, W = s.cv.width, H = s.cv.height;
    c.fillStyle = '#152029'; c.fillRect(0, 0, W, H);
    if (s.kind === 'chart') {
      c.strokeStyle = 'rgba(160,190,210,.18)'; c.lineWidth = 2;
      for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(60, (H / 6) * i); c.lineTo(W - 40, (H / 6) * i); c.stroke(); }
      const bars = 14;
      for (let i = 0; i < bars; i++) { const h = (0.3 + 0.25 * Math.sin(i * 0.9 + t * 0.6) + 0.2 * Math.sin(i * 0.37 + t * 0.23)) * H * 0.75; c.fillStyle = 'rgba(90,150,190,.55)'; c.fillRect(80 + i * ((W - 140) / bars), H - 50 - h, (W - 140) / bars - 18, h); }
      c.strokeStyle = '#d8b46a'; c.lineWidth = 6; c.beginPath();
      for (let x = 0; x <= 200; x++) { const px = 60 + x * ((W - 100) / 200), py = H * 0.45 - Math.sin(x * 0.07 + t) * 90 - Math.sin(x * 0.023 + t * 0.4) * 70 - x * 0.6; x ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
      c.fillStyle = '#a9bccb'; c.font = '600 44px system-ui'; c.fillText('Trend', 60, 70);
    } else if (s.kind === 'map') {
      const px = (lon) => ((lon + 126) / 60) * (W - 120) + 60, py = (lat) => H - ((lat - 23) / 28) * (H - 120) - 60;
      c.beginPath(); US.forEach(([lo, la], i) => i ? c.lineTo(px(lo), py(la)) : c.moveTo(px(lo), py(la))); c.closePath();
      c.fillStyle = '#23394a'; c.fill(); c.strokeStyle = '#6fa3c4'; c.lineWidth = 4; c.stroke();
      const pts = [[-80.2, 25.8], [-74, 40.7], [-87.6, 41.9], [-118.2, 34], [-122.4, 37.8], [-95.4, 29.8], [-104.9, 39.7], [-84.4, 33.7], [-77, 38.9], [-112, 33.4]];
      pts.forEach(([lo, la], i) => { const r = 10 + 8 * (0.5 + 0.5 * Math.sin(t * 2 + i)); c.fillStyle = 'rgba(232,170,90,.85)'; c.beginPath(); c.arc(px(lo), py(la), r, 0, 7); c.fill(); });
    } else {
      if (termChar >= termLines[termIdx].length) { termBuf.push(termLines[termIdx]); if (termBuf.length > 11) termBuf.shift(); termIdx = (termIdx + 1) % termLines.length; termChar = 0; }
      termChar += 1;
      c.font = '40px ui-monospace,Menlo,monospace'; c.fillStyle = '#8fd3a4';
      termBuf.forEach((l, i) => c.fillText(l, 50, 80 + i * 62));
      const cur = termLines[termIdx].slice(0, termChar);
      c.fillText(cur + ((t * 2) % 2 < 1 ? '▌' : ''), 50, 80 + termBuf.length * 62);
    }
    s.t.needsUpdate = true;
  }
}

// ---------- server racks ----------
const leds = [];
for (let r = 0; r < 4; r++) {
  const x = -FX + 0.7, z = -13.5 + r * 1.25;
  box(1.0, 2.3, 1.1, matte('#2b2f35'), x, 1.15, z);
  for (let k = 0; k < 9; k++) for (let j = 0; j < 3; j++) {
    const on = matte('#202020', { emissive: ['#5fd38a', '#5fb0e0', '#e0b050'][(k + j + r) % 3], emissiveIntensity: 1.2 });
    const l = box(0.05, 0.04, 0.04, on, x + 0.52, 0.4 + k * 0.2, z - 0.3 + j * 0.15, scene, false);
    leds.push({ m: l.material, phase: Math.random() * 10, rate: 0.6 + Math.random() * 2.2 });
  }
}
// ---------- plants & decor ----------
function plant(x, z, s = 1) {
  cyl(0.28 * s, 0.22 * s, 0.5 * s, matte('#8a6a52'), x, 0.25 * s, z);
  const leaf = lambert('#5d8a5a');
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38 * s, 0), leaf); m.position.set(x + Math.sin(i * 1.7) * 0.18 * s, 0.75 * s + i * 0.22 * s, z + Math.cos(i * 1.7) * 0.18 * s); m.rotation.set(i, i * 2, 0); m.castShadow = true; scene.add(m); }
}
plant(-13.2, -14.2, 1.2); plant(12.6, -14.2, 1.1); plant(-13.2, 3.2, 1.0); plant(-FX + 0.8, -3.0, 1.1); plant(12.8, 7, 1);
// wall art
const artCols = [['#7f9bb3', '#c9a46b'], ['#a3796a', '#6f8f7c'], ['#8a7fb0', '#d0c3a0']];
artCols.forEach(([a, b], i) => {
  const ct = canvasTex(512, 384, (c, W, H) => { c.fillStyle = '#e8e2d8'; c.fillRect(0, 0, W, H); c.fillStyle = a; c.fillRect(40, 40, W * 0.55, H - 80); c.fillStyle = b; c.beginPath(); c.arc(W * 0.68, H * 0.5, 110, 0, 7); c.fill(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), matte('#fff', { map: ct.t }));
  m.rotation.y = Math.PI / 2; m.position.set(-FX + 0.01, 2.6, -0.5 + i * 2.2); scene.add(m);
});

// ---------- usage board on back wall ----------
const usage = canvasTex(1536, 640);
const usageMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.0), new THREE.MeshBasicMaterial({ map: usage.t, color: '#c8c8c8' }));
usageMesh.position.set(-2.5, 2.75, -FZ + 0.02); scene.add(usageMesh);
box(5.0, 2.2, 0.06, frame, -2.5, 2.75, -FZ - 0.01, scene, false);
const fmtET = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' ET';
function drawUsage(u) {
  const c = usage.ctx, W = usage.cv.width, H = usage.cv.height;
  c.fillStyle = '#1b2229'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#8fa2b3'; c.font = '600 64px system-ui'; c.textAlign = 'left'; c.fillText('Weekly usage left', 70, 110);
  if (!u || u.remaining_pct == null) {
    c.fillStyle = '#c5cfd8'; c.font = '600 120px system-ui'; c.fillText('no reading yet', 70, 330);
  } else {
    const p = Math.max(0, Math.min(100, Number(u.remaining_pct)));
    c.fillStyle = '#d9e2ea'; c.font = '700 190px system-ui'; c.fillText(`${Math.round(p)}%`, 70, 350);
    c.fillStyle = '#2c3640'; c.fillRect(620, 250, 820, 60); c.fillStyle = p < 15 ? '#c98a6a' : '#6fa3c4'; c.fillRect(620, 250, 820 * p / 100, 60);
    c.fillStyle = '#8fa2b3'; c.font = '48px system-ui';
    c.fillText(u.resets_at ? `Resets ${fmtET(new Date(u.resets_at))}` : 'Reset time not reported', 70, 470);
    c.font = '36px system-ui'; c.fillStyle = '#6b7c8b';
    if (u.recorded_at) c.fillText(`Reading ${fmtET(new Date(u.recorded_at))}`, 70, 560);
  }
  usage.t.needsUpdate = true;
}
drawUsage(null);

// ---------- bots ----------
const UP = new THREE.Vector3(0, 1, 0);
function accessory(kind, color) {
  const g = new THREE.Group(); const dark = lambert('#3a3e44'), light = lambert('#d8d2c4');
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  switch (kind) {
    case 'headset': add(new THREE.TorusGeometry(0.17, 0.025, 8, 24, Math.PI), dark, 0, 1.12, 0, 0, Math.PI / 2, 0); add(new THREE.BoxGeometry(0.06, 0.1, 0.1), dark, 0.17, 1.02, 0); add(new THREE.BoxGeometry(0.06, 0.1, 0.1), dark, -0.17, 1.02, 0); add(new THREE.BoxGeometry(0.02, 0.02, 0.16), dark, 0.15, 0.95, 0.09); return { g, on: 'body' };
    case 'tophat': add(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 20), dark, 0, 1.28, 0); add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), dark, 0, 1.18, 0); add(new THREE.CylinderGeometry(0.132, 0.132, 0.04, 20), lambert('#a8873a'), 0, 1.21, 0); return { g, on: 'body' };
    case 'binoculars': add(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), dark, 0.045, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), dark, -0.045, 0, 0, Math.PI / 2); return { g, on: 'chest' };
    case 'cable': add(new THREE.TorusGeometry(0.09, 0.022, 8, 20), lambert('#2f3a33'), 0, 0, 0, 0, Math.PI / 2); return { g, on: 'shoulder' };
    case 'clipboard': add(new THREE.BoxGeometry(0.15, 0.2, 0.015), lambert('#8a6a48'), 0, 0, 0); add(new THREE.BoxGeometry(0.12, 0.15, 0.005), light, 0, -0.01, 0.01); return { g, on: 'hand' };
    case 'calculator': add(new THREE.BoxGeometry(0.11, 0.15, 0.025), lambert('#4a4f57'), 0, 0, 0); add(new THREE.BoxGeometry(0.08, 0.03, 0.005), lambert('#a8b8a0'), 0, 0.04, 0.014); return { g, on: 'hand' };
    case 'book': add(new THREE.BoxGeometry(0.15, 0.2, 0.05), lambert('#8b4b45'), 0, 0, 0); return { g, on: 'hand' };
    case 'stopwatch': add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), lambert('#c9c4b8'), 0, 0, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.02, 0.03, 0.02), dark, 0, 0.07, 0); return { g, on: 'hand' };
    case 'controller': add(new THREE.BoxGeometry(0.18, 0.06, 0.09), lambert('#40444b'), 0, 0, 0); add(new THREE.BoxGeometry(0.05, 0.05, 0.09), lambert('#40444b'), -0.08, -0.02, 0.01); add(new THREE.BoxGeometry(0.05, 0.05, 0.09), lambert('#40444b'), 0.08, -0.02, 0.01); return { g, on: 'hand' };
    case 'envelope': add(new THREE.BoxGeometry(0.18, 0.11, 0.01), light, 0, 0, 0); return { g, on: 'hand' };
    case 'passport': add(new THREE.BoxGeometry(0.1, 0.14, 0.02), lambert('#2d3f66'), 0, 0, 0); return { g, on: 'hand' };
    case 'briefcase': add(new THREE.BoxGeometry(0.26, 0.19, 0.08), lambert('#5a4030'), 0, -0.12, 0); add(new THREE.BoxGeometry(0.08, 0.03, 0.02), dark, 0, 0, 0); return { g, on: 'hand' };
    case 'bag': add(new THREE.BoxGeometry(0.2, 0.22, 0.1), lambert('#c9b48c'), 0, -0.14, 0); add(new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI), dark, 0, -0.03, 0); return { g, on: 'hand' };
    case 'camera': add(new THREE.BoxGeometry(0.16, 0.1, 0.08), lambert('#33363b'), 0, 0, 0); add(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 14), lambert('#22252a'), 0, 0, 0.06, Math.PI / 2); return { g, on: 'chest' };
  }
  return { g, on: 'hand' };
}

const bots = new Map();
const tagByMesh = new Map();
TEAM.forEach((b, i) => {
  const root = new THREE.Group(); scene.add(root);
  const mat = lambert(b.color);
  const skin = lambert(mix(b.color, '#e8d9c8', 0.55));
  const body = new THREE.Group(); root.add(body);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.08, 0.42, 0); legR.position.set(0.08, 0.42, 0);
  box(0.13, 0.42, 0.14, lambert(mix(b.color, '#2c2f34', 0.45)), 0, -0.21, 0, legL); box(0.13, 0.42, 0.14, lambert(mix(b.color, '#2c2f34', 0.45)), 0, -0.21, 0, legR);
  body.add(legL, legR);
  box(0.34, 0.42, 0.22, mat, 0, 0.63, 0, body);
  box(0.26, 0.26, 0.26, skin, 0, 0.98, 0, body);
  box(0.27, 0.07, 0.27, mat, 0, 1.1, 0, body);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.22, 0.82, 0); armR.position.set(0.22, 0.82, 0);
  box(0.1, 0.38, 0.12, mat, 0, -0.19, 0, armL); box(0.1, 0.38, 0.12, mat, 0, -0.19, 0, armR);
  body.add(armL, armR);
  const acc = accessory(b.acc, b.color);
  if (acc.on === 'body') body.add(acc.g);
  else if (acc.on === 'chest') { acc.g.position.set(0, 0.68, 0.14); body.add(acc.g); }
  else if (acc.on === 'shoulder') { acc.g.position.set(-0.22, 0.86, 0); body.add(acc.g); }
  else { acc.g.position.set(0, -0.4, 0.07); armR.add(acc.g); }
  const folder = box(0.26, 0.04, 0.2, lambert('#c9a970'), 0, 0.68, 0.26, body); folder.visible = false;
  const errMark = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), lambert('#c0504a')); errMark.position.set(0, 1.45, 0); errMark.visible = false; body.add(errMark);

  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = `<span class="short"></span><span class="full"></span><span class="ln"></span>`;
  el.querySelector('.short').textContent = b.short; el.querySelector('.full').textContent = b.name;
  el.addEventListener('click', () => el.classList.toggle('open'));
  const tag = new CSS2DObject(el); tag.position.set(0, 1.45, 0); root.add(tag);
  body.traverse(o => o.isMesh && tagByMesh.set(o, el));

  bots.set(b.id, { b, i, root, body, legL, legR, armL, armR, folder, errMark, el, path: [], walking: false, target: null, state: 'idle', line: '', phase: 0 });
});

// ---------- placement & movement ----------
function targetFor(id, state) {
  const bot = bots.get(id), sp = spots[id];
  const deptIdx = TEAM.findIndex(t => t.id === id);
  switch (state) {
    case 'working': return sp.desk;
    case 'error': return sp.deskStand;
    case 'waiting': return waitSpots[(deptIdx) % waitSpots.length];
    case 'handoff': return id === LEAD_ID ? sp.deskStand : handoffSpots[(deptIdx - 1 + 13) % 13];
    default: return seats[deptIdx % seats.length];
  }
}
function route(from, fromDoor, to) {
  const pts = [];
  if (fromDoor) pts.push({ x: fromDoor.x, z: fromDoor.z });
  const a = fromDoor || from, d = to.door;
  if (d) {
    if (Math.abs(a.z - d.z) > 0.01) { pts.push({ x: SPINE_X, z: a.z }); pts.push({ x: SPINE_X, z: d.z }); }
    pts.push({ x: d.x, z: d.z });
  }
  pts.push({ x: to.x, z: to.z });
  return pts;
}
function applyPose(bot, pose, seatY = 0) {
  const sit = pose === 'sit';
  bot.legL.rotation.x = bot.legR.rotation.x = sit ? -Math.PI / 2 : 0;
  bot.armL.rotation.x = bot.armR.rotation.x = 0;
  bot.body.position.y = sit ? 0.06 + seatY : 0;
  bot.body.position.z = sit ? 0.0 : 0;
}
function place(bot, t) {
  bot.root.position.set(t.x, 0, t.z); bot.root.rotation.y = t.ry; applyPose(bot, t.pose, t.seatY); bot.walking = false; bot.path = [];
  bot.armL.rotation.x = bot.armR.rotation.x = t.carry ? -1.1 : (t.pose === 'sit' && bot.state === 'working' ? -0.9 : 0);
}
function setState(id, state, line, instant = false) {
  const bot = bots.get(id); if (!bot) return;
  const changed = bot.state !== state || !bot.target;
  bot.line = line || ''; bot.el.querySelector('.ln').textContent = bot.line ? `${state} · ${bot.line}` : state;
  bot.folder.visible = state === 'handoff' && id !== LEAD_ID;
  bot.errMark.visible = state === 'error';
  if (!changed) return;
  const prev = bot.target; bot.state = state;
  const t = targetFor(id, state); bot.target = t;
  if (instant || !prev) { place(bot, t); return; }
  applyPose(bot, 'stand');
  bot.path = route(bot.root.position, prev.door, t); bot.walking = true;
  if (state === 'handoff') bot.armL.rotation.x = bot.armR.rotation.x = -1.1;
}
const tmpV = new THREE.Vector3();
function stepBots(dt) {
  for (const bot of bots.values()) {
    if (!bot.walking) continue; // stationary bots are never animated (no bob)
    const p = bot.path[0];
    const pos = bot.root.position;
    tmpV.set(p.x - pos.x, 0, p.z - pos.z);
    const d = tmpV.length(), step = 2.4 * dt;
    if (d <= step) { pos.set(p.x, 0, p.z); bot.path.shift(); if (!bot.path.length) { place(bot, bot.target); continue; } }
    else { tmpV.multiplyScalar(step / d); pos.add(tmpV); }
    const want = Math.atan2(p.x - pos.x, p.z - pos.z);
    let dr = want - bot.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); bot.root.rotation.y += dr * Math.min(1, dt * 10);
    bot.phase += dt * 9;
    const s = Math.sin(bot.phase) * 0.55;
    bot.legL.rotation.x = s; bot.legR.rotation.x = -s;
    if (bot.state !== 'handoff') { bot.armL.rotation.x = -s * 0.7; bot.armR.rotation.x = s * 0.7; }
  }
}
TEAM.forEach(t => setState(t.id, 'idle', '', true));

// ---------- live feed ----------
const warnEl = document.getElementById('warn');
let simulating = false, lastLive = null;
function effective(s, now) {
  let st = s.state === 'done' ? 'idle' : s.state;
  if (st === 'working' && now - new Date(s.updated_at).getTime() > STALE_WORKING_MS) st = 'idle';
  return st;
}
function applyLive(data) {
  const now = new Date(data.now).getTime() || Date.now();
  const byId = new Map((data.statuses || []).map(s => [s.bot_id, s]));
  for (const t of TEAM) { const s = byId.get(t.id); if (s) setState(t.id, effective(s, now), s.line); else setState(t.id, 'idle', ''); }
  drawUsage(data.usage);
}
async function poll() {
  try {
    const r = await fetch('/api/state', { cache: 'no-store', credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/login.html' + location.search; return; }
    if (!r.ok) throw new Error('feed');
    const data = await r.json(); lastLive = data;
    const now = new Date(data.now).getTime() || Date.now();
    const signals = [data.last_heartbeat, ...(data.statuses || []).map(s => s.updated_at)].filter(Boolean).map(x => new Date(x).getTime());
    const latest = signals.length ? Math.max(...signals) : 0;
    if (!latest || now - latest > WARN_SILENCE_MS) { warnEl.textContent = 'No heartbeat or status push for 45+ min'; warnEl.style.display = 'block'; }
    else warnEl.style.display = 'none';
    if (!simulating) applyLive(data);
  } catch { warnEl.textContent = 'Status feed unavailable'; warnEl.style.display = 'block'; }
}
const isLocalPreview = new URLSearchParams(location.search).has('preview');
if (!isLocalPreview) { poll(); setInterval(poll, POLL_MS); }

// ---------- browser-only simulation (never writes status) ----------
const simBtn = document.getElementById('simbtn'), simLbl = document.getElementById('sim');
const simLines = { working: ['Processing tasks', 'Reviewing documents', 'Running checks', 'Preparing summary', 'Updating records'], waiting: ['Waiting on Deon'], handoff: ['Handing off to lead'], error: ['Hit an error, retrying'], idle: [''] };
let simTimer = null;
function simTick() {
  const ids = TEAM.map(t => t.id); const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const r = Math.random();
    const st = r < 0.5 ? 'working' : r < 0.65 ? 'waiting' : r < 0.8 ? 'handoff' : r < 0.85 ? 'error' : 'idle';
    const ls = simLines[st]; setState(id, st, ls[Math.floor(Math.random() * ls.length)]);
  }
}
function startSim() { simulating = true; simLbl.style.display = 'block'; simBtn.textContent = 'Stop Simulation'; simTick(); simTick(); simTimer = setInterval(simTick, 2500); }
function stopSim() { simulating = false; clearInterval(simTimer); simLbl.style.display = 'none'; simBtn.textContent = 'Simulate Work'; if (lastLive) applyLive(lastLive); else TEAM.forEach(t => setState(t.id, 'idle', '')); }
simBtn.onclick = () => simulating ? stopSim() : startSim();
if (new URLSearchParams(location.search).get('simulate') === '1') startSim();

// ---------- tap/hover on bots ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hoverEl = null;
function pick(e) { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects([...tagByMesh.keys()], false)[0]; return hit ? tagByMesh.get(hit.object) : null; }
canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const el = pick(e); if (el !== hoverEl) { hoverEl && hoverEl.classList.remove('open'); el && el.classList.add('open'); hoverEl = el; } });
canvas.addEventListener('click', e => { const el = pick(e); if (el) el.classList.toggle('open'); });

// ---------- loop, quality guard ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio); composer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); labelRenderer.setSize(innerWidth, innerHeight);
});
const clock = new THREE.Clock();
let frames = 0, fpsT = 0, lowCount = 0, screenT = 0, dropLevel = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  stepBots(dt);
  for (const l of leds) l.m.emissiveIntensity = (Math.sin(t * l.rate * 3 + l.phase) > 0.2) ? 1.2 : 0.15;
  screenT += dt; if (screenT > 0.08) { drawScreens(t); screenT = 0; }
  controls.update();
  if (useComposer) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  frames++; fpsT += dt;
  if (fpsT > 3) { const fps = frames / fpsT; frames = 0; fpsT = 0;
    if (fps < 28) lowCount++; else lowCount = 0;
    if (lowCount >= 2) { lowCount = 0; // drop effects before resolution
      if (dropLevel === 0) { useComposer = false; dropLevel = 1; }
      else if (dropLevel === 1) { renderer.shadowMap.enabled = false; scene.traverse(o => o.material && (o.material.needsUpdate = true)); dropLevel = 2; }
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__office = { bots: () => [...bots.values()].map(b => ({ id: b.b.id, state: b.state, x: +b.root.position.x.toFixed(4), z: +b.root.position.z.toFixed(4), y: +b.body.position.y.toFixed(4), ry: +b.root.rotation.y.toFixed(4), legs: +b.legL.rotation.x.toFixed(4) })), pixelRatio: () => renderer.getPixelRatio(), simulating: () => simulating };
