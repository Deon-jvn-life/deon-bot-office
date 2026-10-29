import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEAM, LEAD_ID } from './team.js';

const STALE_WORKING_MS = 10 * 60 * 1000;
const WARN_SILENCE_MS = 45 * 60 * 1000;
const POLL_MS = 20000;
const SPINE_X = 13;
// Drop a file here to give Deon a face. Any /avatars/<agent id>.png is picked up the same way.
const DEON_AVATAR = '/avatars/deon.png';
const avatarUrl = (id) => `/avatars/${id}.png`;

const DEON = { x0: 14.05, x1: 21.45, z0: -14.75, z1: -5.05 };
const CHIEF = { x0: 14.05, x1: 21.45, z0: -5.05, z1: 4.7 };
const WALL_H = 3.2;
const deonDoor = { x: 13.15, z: -9.0 };
const chiefDoor = { x: 13.15, z: 1.05 };
const loungeDoor = { x: -4.5, z: 5.4 };
const breakDoor = { x: 13.15, z: 10.2 };

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
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.zIndex = '1';
Object.assign(labelRenderer.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#c5d5e0');
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 300);
function framing() {
  const portrait = innerHeight > innerWidth;
  camera.position.set(portrait ? 28 : 8, portrait ? 50 : 18, portrait ? 46 : 30);
}
framing();
const controls = new OrbitControls(camera, canvas);
controls.target.set(1.5, 1.1, -3);
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
scene.add(new THREE.HemisphereLight('#f3f1ec', '#8a8178', 1.35));
const sun = new THREE.DirectionalLight('#fff6ea', 1.35);
sun.position.set(16, 32, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 24, bottom: -24, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun);

// ---------- helpers ----------
const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); draw && draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  return { cv, ctx, t };
}
function mix(a, b, k) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString(); }

const floorMat = lambert('#ddd8d1');
const woodMat = lambert('#c6a36a');
const oak = lambert('#e4d7c4');
const deskMat = lambert('#efe8dc');
const metal = lambert('#a3aab1');
const wallMat = lambert('#e6e1d8');
const frameMat = lambert('#8e979f');
const chairMat = lambert('#d7dde2');
const sofaMat = lambert('#e7e2d8');
const sofaCushion = lambert('#d5ddd4');
const potMat = lambert('#dcc8b0');
const leafMat = lambert('#6f9a72');
const leafDark = lambert('#5d8662');
const palmMat = lambert('#7ea67c');
const trunkMat = lambert('#b08968');
const monBody = lambert('#2e343b');
const screenMat = lambert('#46525e');
const runnerMat = lambert('#d5dbdf');
const sandMat = lambert('#e6d3b4');
const waterMat = lambert('#8eafb8');
const baseMat = lambert('#cfc9c2');
const towerMats = [lambert('#d5cfc4'), lambert('#c5ced4'), lambert('#ddd6cc'), lambert('#b7c3c9')];
const bulbMat = new THREE.MeshBasicMaterial({ color: '#e6d3b0', toneMapped: true });
const glassMat = lambert('#b7d0dc', { transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const noCast = new Set([floorMat, woodMat, runnerMat, sandMat, waterMat, baseMat]);

const batches = new Map();
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const mullion = new THREE.CylinderGeometry(0.028, 0.028, 1, 8);
const legGeo = new THREE.CylinderGeometry(0.03, 0.034, 0.72, 8);
const puff = new THREE.SphereGeometry(0.28, 12, 10);
const potGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.02, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.2, 0.06),
  new THREE.Vector2(0.18, 0.26), new THREE.Vector2(0.2, 0.32), new THREE.Vector2(0.13, 0.36),
], 12);
const shadeGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.02, 0.16), new THREE.Vector2(0.16, 0.12), new THREE.Vector2(0.22, 0), new THREE.Vector2(0.02, 0),
], 12);
const deskTopGeo = new RoundedBoxGeometry(1.9, 0.055, 0.86, 2, 0.02);
const monGeo = new RoundedBoxGeometry(0.72, 0.42, 0.035, 2, 0.012);
const seatGeo = new RoundedBoxGeometry(0.46, 0.07, 0.46, 2, 0.03);
const backGeo = new RoundedBoxGeometry(0.44, 0.46, 0.06, 2, 0.028);
const baseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.035, 16);

function asIndexed(geo) {
  if (geo.getIndex()) return geo;
  const n = geo.getAttribute('position').count;
  const index = new Uint32Array(n);
  for (let i = 0; i < n; i++) index[i] = i;
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
}
function put(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = asIndexed(geo.clone());
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)));
  let bucket = batches.get(mat);
  if (!bucket) batches.set(mat, bucket = []);
  bucket.push(g);
}
function absorb(root) {
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const g = asIndexed(obj.geometry.clone());
    g.applyMatrix4(obj.matrixWorld);
    let bucket = batches.get(obj.material);
    if (!bucket) batches.set(obj.material, bucket = []);
    bucket.push(g);
  });
}
function flush() {
  for (const [mat, geos] of batches) {
    const merged = mergeGeometries(geos, false);
    if (!merged) {
      for (const g of geos) { const m = new THREE.Mesh(g, mat); m.castShadow = !noCast.has(mat); m.receiveShadow = true; scene.add(m); }
      continue;
    }
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = !noCast.has(mat);
    m.receiveShadow = true;
    scene.add(m);
  }
  batches.clear();
}
function addMesh(geo, mat, x, y, z, parent, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function hFloor(x, z, w, d, mat, y) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = new THREE.Mesh(plane, mat); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); g.add(m);
  noCast.add(mat); absorb(g);
}
function bar(x, y, z, sx, sy, sz, mat) { put(unitBox, mat, x, y, z, 0, 0, 0, sx, sy, sz); }
function railX(x, y, z, len) { put(mullion, frameMat, x, y, z, 0, 0, Math.PI / 2, 1, len, 1); }
function railZ(x, y, z, len) { put(mullion, frameMat, x, y, z, Math.PI / 2, 0, 0, 1, len, 1); }
function post(x, z) { put(mullion, frameMat, x, WALL_H / 2, z, 0, 0, 0, 1, WALL_H, 1); }
function addGlass(x, y, z, w, h, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = false; m.receiveShadow = false; scene.add(m);
}
function wallAlongX(z, x0, x1) { if (x1 - x0 > 0.08) addGlass((x0 + x1) / 2, WALL_H / 2, z, x1 - x0, WALL_H, 0); }
function wallAlongZ(x, z0, z1) { if (z1 - z0 > 0.08) addGlass(x, WALL_H / 2, (z0 + z1) / 2, z1 - z0, WALL_H, Math.PI / 2); }
function addPlant(x, z, s = 1) {
  put(potGeo, potMat, x, 0, z, 0, 0, 0, s, s, s);
  put(puff, leafMat, x, 0.55 * s, z, 0, 0, 0, 0.95 * s, 0.72 * s, 0.95 * s);
  put(puff, leafMat, x + 0.16 * s, 0.78 * s, z + 0.04 * s, 0, 0, 0, 0.6 * s, 0.5 * s, 0.6 * s);
  put(puff, leafDark, x - 0.14 * s, 0.7 * s, z - 0.05 * s, 0, 0, 0, 0.5 * s, 0.46 * s, 0.5 * s);
}
function addPalm(x, z) {
  put(mullion, trunkMat, x, 0.8, z, 0, 0, 0, 2.2, 1.6, 2.2);
  put(puff, palmMat, x, 1.7, z, 0, 0, 0, 0.85, 0.4, 0.85);
  put(puff, palmMat, x + 0.28, 1.55, z + 0.05, 0, 0, 0, 0.5, 0.24, 0.5);
  put(puff, leafDark, x - 0.22, 1.5, z - 0.08, 0, 0, 0, 0.45, 0.22, 0.45);
}
function addPendant(x, z) {
  put(mullion, metal, x, 3.45, z, 0, 0, 0, 0.7, 0.7, 0.7);
  put(shadeGeo, sofaMat, x, 2.95, z);
  put(new THREE.SphereGeometry(0.06, 10, 8), bulbMat, x, 2.9, z);
}
function addDesk(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  addMesh(deskTopGeo, deskMat, 0, 0.74, 0, g);
  for (const lx of [-0.84, 0.84]) for (const lz of [-0.34, 0.34]) addMesh(legGeo, metal, lx, 0.36, lz, g);
  addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), metal, 0, 0.86, -0.22, g);
  addMesh(monGeo, monBody, 0, 1.12, -0.22, g);
  const scr = addMesh(new THREE.PlaneGeometry(0.64, 0.34), screenMat, 0, 1.12, -0.19, g, 0, Math.PI, 0);
  scr.castShadow = false;
  absorb(g);
}
function addChair(x, z, ry, mat = chairMat, seatY = 0.48) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  addMesh(seatGeo, mat, 0, seatY, 0, g);
  addMesh(backGeo, mat, 0, seatY + 0.32, -0.22, g, -0.2, 0, 0);
  addMesh(new THREE.CylinderGeometry(0.028, 0.028, seatY - 0.05, 8), metal, 0, (seatY - 0.05) / 2, 0, g);
  addMesh(baseGeo, metal, 0, 0.03, 0, g);
  absorb(g);
}
function addWorkstation(sx, sz, ry) {
  const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  addDesk(sx + f.x * 1.2, sz + f.z * 1.2, ry);
  addChair(sx, sz, ry);
  return { x: sx, z: sz, ry, pose: 'sit' };
}
function addSofa(x, z, ry, n) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const width = n * 0.92 + 0.4;
  addMesh(new RoundedBoxGeometry(width, 0.26, 0.82, 2, 0.08), sofaMat, 0, 0.28, 0, g);
  addMesh(new RoundedBoxGeometry(width, 0.4, 0.18, 2, 0.05), sofaMat, 0, 0.52, -0.32, g);
  addMesh(new RoundedBoxGeometry(0.14, 0.28, 0.82, 2, 0.04), sofaMat, -width / 2, 0.34, 0, g);
  addMesh(new RoundedBoxGeometry(0.14, 0.28, 0.82, 2, 0.04), sofaMat, width / 2, 0.34, 0, g);
  const c = Math.cos(ry), s = Math.sin(ry);
  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) / 2) * 0.92, lz = 0.08;
    addMesh(new RoundedBoxGeometry(0.78, 0.08, 0.62, 2, 0.04), sofaCushion, lx, 0.46, lz, g);
    seats.push({ x: x + c * lx + s * lz, z: z + (-s * lx + c * lz), ry, pose: 'sit', seatY: 0.06, door: loungeDoor });
  }
  absorb(g);
}

// ---------- shell, floors, outside view ----------
bar(0, -0.12, 0, 44.2, 0.24, 30.2, baseMat);
hFloor(0, 0, 44, 30, floorMat, 0.008);
hFloor((DEON.x0 + DEON.x1) / 2, (DEON.z0 + DEON.z1) / 2, DEON.x1 - DEON.x0 - 0.2, DEON.z1 - DEON.z0 - 0.2, woodMat, 0.02);
hFloor((CHIEF.x0 + CHIEF.x1) / 2, (CHIEF.z0 + CHIEF.z1) / 2, CHIEF.x1 - CHIEF.x0 - 0.2, CHIEF.z1 - CHIEF.z0 - 0.2, woodMat, 0.02);
hFloor(12.15, -1.2, 1.55, 26.5, runnerMat, 0.016);
bar(-3.9, WALL_H / 2, -15, 35.7, WALL_H, 0.12, wallMat);
bar(0, WALL_H / 2, 15, 43.6, WALL_H, 0.12, wallMat);
bar(-21.85, WALL_H / 2, 0, 0.12, WALL_H, 29.8, wallMat);
bar(21.75, WALL_H / 2, 9.85, 0.12, WALL_H, 10.1, wallMat);

const sky = canvasTex(512, 512, (ctx, W, H) => {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#9ebcd0'); grd.addColorStop(0.58, '#d7e4ec'); grd.addColorStop(0.8, '#f0dcc4'); grd.addColorStop(1, '#e7c9a4');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
});
const skyMat = lambert('#ffffff', { map: sky.t, side: THREE.DoubleSide });
noCast.add(skyMat);
const skyN = new THREE.Mesh(new THREE.PlaneGeometry(52, 16), skyMat); skyN.position.set(16, 7.2, -29); scene.add(skyN);
const skyE = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), skyMat); skyE.position.set(40, 7.2, -2); skyE.rotation.y = -Math.PI / 2; scene.add(skyE);
hFloor(22, -22.2, 36, 7.2, sandMat, -0.03);
hFloor(24, -26.2, 40, 7.5, waterMat, -0.06);
hFloor(31, -4, 16, 22, sandMat, -0.03);
hFloor(36.5, -4, 8, 24, waterMat, -0.06);
const towers = [[16, -17.2, 2.4, 2.2, 6.5], [19.6, -18.4, 1.7, 1.7, 10.5], [23.2, -17.4, 2.8, 2.2, 4.8], [27.4, -18.8, 1.8, 1.8, 8.2], [13.2, -16.6, 3.2, 1.5, 2.4], [31, -17.2, 3.6, 1.8, 3.2], [25.5, -8.5, 1.8, 1.8, 6.4], [28.2, -12.2, 1.5, 1.5, 8.8], [24.2, -4.5, 2.6, 2, 3.6]];
towers.forEach((t, i) => bar(t[0], t[4] / 2, t[1], t[2], t[4], t[3], towerMats[i % towerMats.length]));
addPalm(11.5, -16.4); addPalm(24.6, -16.2); addPalm(26.2, -6.4);

// ---------- glass offices ----------
wallAlongX(DEON.z0, DEON.x0, DEON.x1);
wallAlongZ(DEON.x1, DEON.z0, DEON.z1);
wallAlongZ(DEON.x0, DEON.z0, -10.35);
wallAlongZ(DEON.x0, -7.65, DEON.z1);
wallAlongX(DEON.z1, DEON.x0, DEON.x1);
wallAlongZ(CHIEF.x1, CHIEF.z0, CHIEF.z1);
wallAlongZ(CHIEF.x0, CHIEF.z0, 0.15);
wallAlongZ(CHIEF.x0, 1.95, CHIEF.z1);
wallAlongX(CHIEF.z1, CHIEF.x0, CHIEF.x1);
for (const x of [DEON.x0, DEON.x1]) for (const z of [DEON.z0, DEON.z1]) post(x, z);
for (const x of [CHIEF.x0, CHIEF.x1]) post(x, CHIEF.z1);
post(CHIEF.x0, 0.15); post(CHIEF.x0, 1.95); post(DEON.x0, -10.35); post(DEON.x0, -7.65);
railX((DEON.x0 + DEON.x1) / 2, WALL_H, DEON.z0, DEON.x1 - DEON.x0);
railX((DEON.x0 + DEON.x1) / 2, WALL_H, DEON.z1, DEON.x1 - DEON.x0);
railZ(DEON.x1, WALL_H, (DEON.z0 + DEON.z1) / 2, DEON.z1 - DEON.z0);
railZ(CHIEF.x1, WALL_H, (CHIEF.z0 + CHIEF.z1) / 2, CHIEF.z1 - CHIEF.z0);
railX((CHIEF.x0 + CHIEF.x1) / 2, WALL_H, CHIEF.z1, CHIEF.x1 - CHIEF.x0);

// ---------- desks: chief is private; the other 13 are re-spaced in the open plan ----------
const seats = [];
const spots = {};
const COLS = [-16, -10.5, -5, 0.5, 6];
const SIT_ROWS = [-10, -5, -0.2];
const deptBots = TEAM.filter((b) => b.id !== LEAD_ID);
deptBots.forEach((b, i) => {
  const row = Math.floor(i / 5);
  const col = row < 2 ? i % 5 : (i % 5) + 1;
  const sx = COLS[col], sz = SIT_ROWS[row], ry = Math.PI;
  const sit = addWorkstation(sx, sz, ry);
  const door = { x: sx, z: sz + 1.35 };
  spots[b.id] = { desk: { ...sit, door }, deskStand: { x: sx + 0.65, z: sz + 0.1, ry, pose: 'stand', door } };
  const rug = lambert(mix(b.color, '#d9d3cb', 0.86));
  hFloor(sx, sz - 0.35, 3.3, 2.7, rug, 0.015);
});
const chiefWork = addWorkstation(18.05, -2.15, 0);
spots[LEAD_ID] = {
  desk: { ...chiefWork, door: chiefDoor },
  deskStand: { x: 16.55, z: -2.15, ry: 0, pose: 'stand', door: chiefDoor },
};
const chiefIdle = { x: 16.15, z: 3.2, ry: 0, pose: 'sit', seatY: 0.05, door: chiefDoor };
addChair(chiefIdle.x, chiefIdle.z, chiefIdle.ry, lambert('#e7d3b8'), 0.42);
addWorkstation(18.15, -12.45, 0);
hFloor(18.1, -11.6, 3.6, 3.2, runnerMat, 0.03);
hFloor(17.2, 0.4, 4.2, 3.4, runnerMat, 0.03);

const waitSpots = [];
for (let i = 0; i < 14; i++) {
  const col = i % 7, row = Math.floor(i / 7);
  const x = 15.35 + col * 0.88, z = -9.65 + row * 1.15;
  waitSpots.push({ x, z, ry: Math.PI, pose: 'stand', door: deonDoor });
}
const handoffSpots = [];
for (let i = 0; i < 13; i++) {
  const col = i % 5, row = Math.floor(i / 5);
  handoffSpots.push({ x: 15.45 + col * 0.9, z: 0.2 + row * 0.85, ry: Math.PI, pose: 'stand', carry: true, door: chiefDoor });
}

// ---------- lounge, break room, lab ----------
const lounge = { x: -4.5, z: 8.5 };
hFloor(lounge.x, lounge.z, 8.4, 6.4, lambert('#cbb9a4'), 0.014);
addSofa(lounge.x, lounge.z - 1.7, 0, 4);
addSofa(lounge.x, lounge.z + 1.7, Math.PI, 4);
addSofa(lounge.x - 3.15, lounge.z, Math.PI / 2, 2);
bar(lounge.x, 0.32, lounge.z, 1.5, 0.28, 0.8, oak);
addPlant(lounge.x + 3.5, lounge.z - 2.5, 1.05);
addPlant(lounge.x - 3.6, lounge.z + 2.4, 0.9);
addPendant(lounge.x, lounge.z);

const br = { x: 16.8, z: 11.2 };
hFloor(br.x, br.z, 8.2, 6.2, lambert('#e3d3bf'), 0.014);
put(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 24), oak, br.x, 0.74, br.z);
put(new THREE.CylinderGeometry(0.055, 0.07, 0.7, 10), metal, br.x, 0.36, br.z);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2, x = br.x + Math.sin(a) * 1.65, z = br.z + Math.cos(a) * 1.65;
  const ry = Math.atan2(br.x - x, br.z - z);
  addChair(x, z, ry);
  seats.push({ x, z, ry, pose: 'sit', seatY: 0, door: breakDoor });
}
bar(20.3, 0.5, 13.55, 2.4, 0.9, 0.55, deskMat);
addPlant(14.6, 13.4, 0.95);
addPendant(br.x, br.z);

const screens = [];
function bigScreen(x, z, ry, kind) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.45, 0.08, 2, 0.04), monBody);
  bezel.position.y = 1.65; bezel.castShadow = true; g.add(bezel);
  addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 8), metal, 0, 0.45, 0, g);
  const ct = canvasTex(768, 432);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.28), new THREE.MeshBasicMaterial({ map: ct.t, toneMapped: true, color: '#b4b4b4' }));
  m.position.set(0, 1.65, 0.05); m.castShadow = false; g.add(m);
  screens.push({ kind, ...ct });
}
bigScreen(-19.2, 8.2, 0.5, 'chart');
bigScreen(-16.2, 6.6, 0, 'map');
bigScreen(-13.2, 8.2, -0.5, 'terminal');
bar(-16.2, 0.74, 10.1, 2.2, 0.06, 0.9, deskMat);
addPlant(-20.4, 11.6, 1.1); addPlant(-12.2, 11.4, 0.85);

const leds = [];
function addRack(x, z) {
  bar(x, 1.15, z, 0.85, 2.2, 0.7, monBody);
  for (let k = 0; k < 4; k++) {
    const mat = lambert('#1c2126', { emissive: ['#5fd38a', '#5fb0e0', '#e0b050'][k % 3], emissiveIntensity: 0.8 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat);
    m.position.set(x + 0.44, 0.55 + k * 0.4, z); m.castShadow = false; scene.add(m);
    leds.push({ m: mat, phase: k * 1.3, rate: 0.8 + k * 0.35 });
  }
}
addRack(-21.2, -8.5); addRack(-21.2, -7.1);

addPlant(-18.5, -13.2, 1.15); addPlant(-8.2, -13.4, 0.9); addPlant(6.5, -12.6, 1);
addPlant(20.5, -13.6, 0.95); addPlant(20.4, 3.5, 0.85); addPlant(8.2, 4.2, 1);
addPendant(18.15, -11.3); addPendant(18.05, -1.0); addPendant(-8, -6); addPendant(0.5, -6); addPendant(-16, 9);

// ---------- usage board (real stored reading only) ----------
const usage = canvasTex(1024, 512);
usage.t.anisotropy = MAX_ANISO;
const usageMat = new THREE.MeshBasicMaterial({ map: usage.t, toneMapped: true, color: '#dedede' });
const usageMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 3.15), usageMat);
usageMesh.position.set(-8.6, 2.05, -14.78); scene.add(usageMesh);
bar(-8.6, 2.05, -14.9, 10.7, 3.4, 0.06, frameMat);
const usageMain = document.getElementById('usage-main');
const usageSub = document.getElementById('usage-sub');
const usageMeter = document.getElementById('usage-meter');
const usageFill = document.getElementById('usage-fill');
const fmtET = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' ET';
function usageCopy(u) {
  const pct = u && u.remaining_pct != null ? Number(u.remaining_pct) : NaN;
  if (!Number.isFinite(pct)) return { has: false, main: 'No reading yet', sub: '', left: null, used: null };
  const left = Math.round(Math.max(0, Math.min(100, pct)));
  const used = 100 - left;
  let sub = '';
  if (u.resets_at) { const d = new Date(u.resets_at); if (!isNaN(d.getTime())) sub = `Resets ${fmtET(d)}`; }
  return { has: true, main: `${left}% left · ${used}% used`, sub, left, used };
}
function drawUsage(u) {
  const copy = usageCopy(u);
  const c = usage.ctx, W = usage.cv.width, H = usage.cv.height;
  c.fillStyle = '#1b2229'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#8fa2b3'; c.font = '600 40px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText('WEEKLY USAGE', 48, 78);
  if (!copy.has) {
    c.fillStyle = '#e7eef4'; c.font = '700 86px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('No reading yet', W / 2, H / 2 + 36);
  } else {
    c.fillStyle = '#f3f7fa'; c.font = '700 104px system-ui, sans-serif'; c.textAlign = 'left';
    c.fillText(`${copy.left}% left`, 48, 230);
    c.fillStyle = '#d5dee6'; c.font = '700 64px system-ui, sans-serif';
    c.fillText(`${copy.used}% used`, 48, 320);
    c.fillStyle = '#2c3640'; c.fillRect(48, 360, W - 96, 34);
    c.fillStyle = copy.left < 15 ? '#c98a6a' : '#7eabc4'; c.fillRect(48, 360, (W - 96) * copy.left / 100, 34);
    if (copy.sub) { c.fillStyle = '#c5d0da'; c.font = '600 40px system-ui, sans-serif'; c.fillText(copy.sub, 48, 460); }
  }
  usage.t.needsUpdate = true;
  usageMain.textContent = copy.main;
  usageSub.textContent = copy.sub || '';
  if (!copy.has) usageMeter.style.display = 'none';
  else { usageMeter.style.display = 'block'; usageFill.style.width = `${copy.left}%`; usageFill.style.background = copy.left < 15 ? '#c98a6a' : '#7eabc4'; }
}
drawUsage(null);

flush();

// ---------- characters ----------
const GEO = {
  leg: new THREE.CapsuleGeometry(0.062, 0.22, 3, 8),
  arm: new THREE.CapsuleGeometry(0.048, 0.24, 3, 8),
  torso: new THREE.CapsuleGeometry(0.15, 0.2, 4, 12),
  head: new THREE.SphereGeometry(0.156, 20, 16),
  face: new THREE.PlaneGeometry(0.2, 0.138),
  bezel: new THREE.PlaneGeometry(0.228, 0.166),
};
function initials(label) {
  const parts = String(label).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(label).slice(0, 2).toUpperCase();
}
function fallbackFace(label, accent) {
  const { t } = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#141a20'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#1c2630'; ctx.beginPath();
    const r = 40, x0 = 22, y0 = 22, w = 212, h = 212;
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(96, 112, 15, 0, Math.PI * 2); ctx.arc(160, 112, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141a20'; ctx.beginPath(); ctx.arc(96, 112, 5.5, 0, Math.PI * 2); ctx.arc(160, 112, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accent; ctx.font = '600 52px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials(label), 128, 176);
  });
  return t;
}
const texLoader = new THREE.TextureLoader();
function applyAvatar(material, url) {
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = MAX_ANISO;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
    material.map = tex; material.needsUpdate = true;
  });
}
function makeTag(shortName, fullName) {
  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = '<span class="short"></span><span class="full"></span><span class="ln"></span>';
  el.querySelector('.short').textContent = shortName; el.querySelector('.full').textContent = fullName;
  el.addEventListener('click', () => el.classList.toggle('open'));
  const tag = new CSS2DObject(el); tag.position.set(0, 1.46, 0);
  return { el, tag };
}
function accessory(kind) {
  const g = new THREE.Group(); const dark = lambert('#3a3e44'), light = lambert('#d8d2c4');
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); };
  switch (kind) {
    case 'headset': add(new THREE.TorusGeometry(0.16, 0.022, 8, 20, Math.PI), dark, 0, 1.06, 0, 0, Math.PI / 2, 0); add(new THREE.SphereGeometry(0.045, 8, 6), dark, 0.15, 0.98, 0); add(new THREE.SphereGeometry(0.045, 8, 6), dark, -0.15, 0.98, 0); return { g, on: 'body' };
    case 'tophat': add(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), dark, 0, 1.32, 0); add(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 16), dark, 0, 1.22, 0); add(new THREE.CylinderGeometry(0.112, 0.112, 0.035, 16), lambert('#a8873a'), 0, 1.25, 0); return { g, on: 'body' };
    case 'binoculars': add(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10), dark, 0.045, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10), dark, -0.045, 0, 0, Math.PI / 2); return { g, on: 'chest' };
    case 'cable': add(new THREE.TorusGeometry(0.08, 0.02, 8, 16), lambert('#2f3a33'), 0, 0, 0, 0, Math.PI / 2); return { g, on: 'shoulder' };
    case 'clipboard': add(new RoundedBoxGeometry(0.14, 0.18, 0.02, 2, 0.008), lambert('#8a6a48'), 0, 0, 0); return { g, on: 'hand' };
    case 'calculator': add(new RoundedBoxGeometry(0.1, 0.14, 0.025, 2, 0.008), lambert('#4a4f57'), 0, 0, 0); return { g, on: 'hand' };
    case 'book': add(new RoundedBoxGeometry(0.14, 0.18, 0.04, 2, 0.008), lambert('#8b4b45'), 0, 0, 0); return { g, on: 'hand' };
    case 'stopwatch': add(new THREE.CylinderGeometry(0.055, 0.055, 0.028, 16), light, 0, 0, 0, Math.PI / 2); return { g, on: 'hand' };
    case 'controller': add(new RoundedBoxGeometry(0.16, 0.05, 0.08, 2, 0.02), lambert('#40444b'), 0, 0, 0); return { g, on: 'hand' };
    case 'envelope': add(new RoundedBoxGeometry(0.16, 0.1, 0.012, 2, 0.006), light, 0, 0, 0); return { g, on: 'hand' };
    case 'passport': add(new RoundedBoxGeometry(0.1, 0.13, 0.018, 2, 0.006), lambert('#2d3f66'), 0, 0, 0); return { g, on: 'hand' };
    case 'briefcase': add(new RoundedBoxGeometry(0.22, 0.16, 0.07, 2, 0.015), lambert('#5a4030'), 0, -0.08, 0); return { g, on: 'hand' };
    case 'bag': add(new RoundedBoxGeometry(0.18, 0.2, 0.09, 2, 0.02), lambert('#c9b48c'), 0, -0.1, 0); return { g, on: 'hand' };
    case 'camera': add(new RoundedBoxGeometry(0.14, 0.09, 0.07, 2, 0.015), lambert('#33363b'), 0, 0, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), dark, 0, 0, 0.05, Math.PI / 2); return { g, on: 'chest' };
    default: return { g, on: 'hand' };
  }
}
const tagByMesh = new Map();
function buildCharacter({ color, shortName, fullName, avatar, acc }) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const shell = lambert(color), limb = lambert(mix(color, '#2c3136', 0.38));
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.09, 0.42, 0); legR.position.set(0.09, 0.42, 0);
  const lm = new THREE.Mesh(GEO.leg, limb); lm.position.y = -0.17; lm.castShadow = true;
  const rm = new THREE.Mesh(GEO.leg, limb); rm.position.y = -0.17; rm.castShadow = true;
  legL.add(lm); legR.add(rm); body.add(legL, legR);
  const torso = new THREE.Mesh(GEO.torso, shell); torso.position.y = 0.66; torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(GEO.head, shell); head.position.y = 1.04; head.castShadow = true; body.add(head);
  const bezel = new THREE.Mesh(GEO.bezel, lambert(mix(color, '#14181c', 0.8)));
  bezel.position.set(0, 1.1, 0.16); bezel.rotation.x = 0.62; bezel.castShadow = false; body.add(bezel);
  const faceMat = new THREE.MeshBasicMaterial({ map: fallbackFace(shortName, color), color: '#f2f2f2', toneMapped: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const face = new THREE.Mesh(GEO.face, faceMat); face.position.set(0, 1.12, 0.2); face.rotation.x = 0.62; face.castShadow = false; face.receiveShadow = false; body.add(face);
  applyAvatar(faceMat, avatar);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.21, 0.8, 0); armR.position.set(0.21, 0.8, 0);
  const al = new THREE.Mesh(GEO.arm, limb); al.position.y = -0.16; al.castShadow = true;
  const ar = new THREE.Mesh(GEO.arm, limb); ar.position.y = -0.16; ar.castShadow = true;
  armL.add(al); armR.add(ar); body.add(armL, armR);
  const item = accessory(acc || 'book');
  if (item.on === 'body') body.add(item.g);
  else if (item.on === 'chest') { item.g.position.set(0, 0.68, 0.18); body.add(item.g); }
  else if (item.on === 'shoulder') { item.g.position.set(-0.2, 0.86, 0); body.add(item.g); }
  else { item.g.position.set(0, -0.36, 0.05); armR.add(item.g); }
  const folder = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.028, 0.16, 2, 0.01), lambert('#c9a970'));
  folder.position.set(0, 0.7, 0.2); folder.visible = false; folder.castShadow = true; body.add(folder);
  const errMark = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), lambert('#c0504a'));
  errMark.position.set(0, 1.34, 0); errMark.visible = false; body.add(errMark);
  const { el, tag } = makeTag(shortName, fullName); root.add(tag);
  body.traverse((o) => { if (o.isMesh) tagByMesh.set(o, el); });
  return { root, body, legL, legR, armL, armR, folder, errMark, el };
}

const bots = new Map();
TEAM.forEach((b, i) => {
  const parts = buildCharacter({ color: b.color, shortName: b.short, fullName: b.name, avatar: avatarUrl(b.id), acc: b.acc });
  bots.set(b.id, { b, i, ...parts, path: [], walking: false, target: null, state: 'idle', line: '', phase: 0 });
});
const deon = buildCharacter({ color: '#8e9ea3', shortName: 'Deon', fullName: 'Deon', avatar: DEON_AVATAR, acc: null });
deon.root.position.set(18.15, 0, -12.45); deon.root.rotation.y = 0;
deon.legL.rotation.x = deon.legR.rotation.x = -Math.PI / 2;
deon.armL.rotation.x = deon.armR.rotation.x = -0.75;
deon.body.position.y = 0.08;

// ---------- placement & movement ----------
function targetFor(id, state) {
  const sp = spots[id];
  const deptIdx = TEAM.findIndex((t) => t.id === id);
  switch (state) {
    case 'working': return sp.desk;
    case 'error': return sp.deskStand;
    case 'waiting': return waitSpots[deptIdx % waitSpots.length];
    case 'handoff': return id === LEAD_ID ? sp.deskStand : handoffSpots[(deptIdx - 1 + 13) % 13];
    default: return id === LEAD_ID ? chiefIdle : seats[(deptIdx - 1) % seats.length];
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
TEAM.forEach((t) => setState(t.id, 'idle', '', true));

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
  const byId = new Map((data.statuses || []).map((s) => [s.bot_id, s]));
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
    const signals = [data.last_heartbeat, ...(data.statuses || []).map((s) => s.updated_at)].filter(Boolean).map((x) => new Date(x).getTime());
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
  const ids = TEAM.map((t) => t.id); const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const r = Math.random();
    const st = r < 0.5 ? 'working' : r < 0.65 ? 'waiting' : r < 0.8 ? 'handoff' : r < 0.85 ? 'error' : 'idle';
    const ls = simLines[st]; setState(id, st, ls[Math.floor(Math.random() * ls.length)]);
  }
}
function startSim() { simulating = true; simLbl.style.display = 'block'; simBtn.textContent = 'Stop Simulation'; simTick(); simTick(); simTimer = setInterval(simTick, 2500); }
function stopSim() { simulating = false; clearInterval(simTimer); simLbl.style.display = 'none'; simBtn.textContent = 'Simulate Work'; if (lastLive) applyLive(lastLive); else TEAM.forEach((t) => setState(t.id, 'idle', '')); }
simBtn.onclick = () => simulating ? stopSim() : startSim();
if (new URLSearchParams(location.search).get('simulate') === '1') startSim();

// ---------- research screens ----------
const US = [[-124.7,48.4],[-123,46.2],[-124.2,42],[-122.4,37.8],[-120.6,34.6],[-117.1,32.5],[-114.7,32.7],[-111,31.3],[-108.2,31.3],[-106.5,31.8],[-103.3,29],[-101.4,29.8],[-99.5,27.5],[-97.2,25.9],[-97.4,27.8],[-94.7,29.4],[-93.8,29.7],[-90.1,29.1],[-88.9,30.4],[-85.4,29.7],[-84,30.1],[-82.7,27.5],[-81.7,25.5],[-80.1,25.8],[-80.4,27.9],[-81.4,30.7],[-79.2,33.2],[-75.6,35.3],[-76.3,37.1],[-75.2,38.6],[-74,40.5],[-71.9,41.3],[-70.1,41.8],[-70.6,43.1],[-67,44.8],[-67.8,47.1],[-69.2,47.4],[-71.5,45],[-74.7,45],[-76.8,43.6],[-79.1,43.3],[-82.4,41.7],[-83.1,42.3],[-82.5,45.3],[-84.6,46.5],[-88.4,48.3],[-95.2,49],[-104,49],[-123.3,49]];
const termLines = ['> summarising findings...', '> model: comparing sources', '> tokens streaming', '> drafting outline', '> evaluating evidence', '> cross-checking citations', '> generating report', '> reasoning step complete', '> embedding documents', '> ranking results'];
let termBuf = [], termIdx = 0, termChar = 0;
function drawScreens(t) {
  for (const s of screens) {
    const c = s.ctx, W = s.cv.width, H = s.cv.height;
    c.fillStyle = '#152029'; c.fillRect(0, 0, W, H);
    if (s.kind === 'chart') {
      c.strokeStyle = 'rgba(160,190,210,.18)'; c.lineWidth = 2;
      for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(40, (H / 6) * i); c.lineTo(W - 24, (H / 6) * i); c.stroke(); }
      const bars = 14;
      for (let i = 0; i < bars; i++) { const h = (0.3 + 0.25 * Math.sin(i * 0.9 + t * 0.6) + 0.2 * Math.sin(i * 0.37 + t * 0.23)) * H * 0.7; c.fillStyle = 'rgba(90,150,190,.55)'; c.fillRect(48 + i * ((W - 90) / bars), H - 28 - h, (W - 90) / bars - 10, h); }
      c.strokeStyle = '#d8b46a'; c.lineWidth = 4; c.beginPath();
      for (let x = 0; x <= 120; x++) { const px = 40 + x * ((W - 70) / 120), py = H * 0.45 - Math.sin(x * 0.09 + t) * 40 - x * 0.35; x ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
    } else if (s.kind === 'map') {
      const px = (lon) => ((lon + 126) / 60) * (W - 70) + 35, py = (lat) => H - ((lat - 23) / 28) * (H - 70) - 35;
      c.beginPath(); US.forEach(([lo, la], i) => i ? c.lineTo(px(lo), py(la)) : c.moveTo(px(lo), py(la))); c.closePath();
      c.fillStyle = '#23394a'; c.fill(); c.strokeStyle = '#6fa3c4'; c.lineWidth = 2; c.stroke();
    } else {
      if (termChar >= termLines[termIdx].length) { termBuf.push(termLines[termIdx]); if (termBuf.length > 8) termBuf.shift(); termIdx = (termIdx + 1) % termLines.length; termChar = 0; }
      termChar += 1;
      c.font = '22px ui-monospace, Menlo, monospace'; c.fillStyle = '#8fd3a4';
      termBuf.forEach((l, i) => c.fillText(l, 28, 48 + i * 40));
      c.fillText(termLines[termIdx].slice(0, termChar), 28, 48 + termBuf.length * 40);
    }
    s.t.needsUpdate = true;
  }
}

// ---------- tap/hover on bots ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hoverEl = null;
function pick(e) { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects([...tagByMesh.keys()], false)[0]; return hit ? tagByMesh.get(hit.object) : null; }
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const el = pick(e); if (el !== hoverEl) { hoverEl && hoverEl.classList.remove('open'); el && el.classList.add('open'); hoverEl = el; } });
canvas.addEventListener('click', (e) => { const el = pick(e); if (el) el.classList.toggle('open'); });

// ---------- loop, quality guard ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio); composer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); labelRenderer.setSize(innerWidth, innerHeight);
  framing();
});
const clock = new THREE.Clock();
let frames = 0, fpsT = 0, lowCount = 0, screenT = 0, dropLevel = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  stepBots(dt);
  for (const l of leds) l.m.emissiveIntensity = (Math.sin(t * l.rate * 3 + l.phase) > 0.2) ? 0.9 : 0.15;
  screenT += dt; if (screenT > 0.08) { drawScreens(t); screenT = 0; }
  controls.update();
  if (useComposer) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  frames++; fpsT += dt;
  if (fpsT > 3) { const fps = frames / fpsT; frames = 0; fpsT = 0;
    if (fps < 28) lowCount++; else lowCount = 0;
    if (lowCount >= 2) { lowCount = 0; // drop effects before resolution
      if (dropLevel === 0) { useComposer = false; dropLevel = 1; }
      else if (dropLevel === 1) { renderer.shadowMap.enabled = false; scene.traverse((o) => o.material && (o.material.needsUpdate = true)); dropLevel = 2; }
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__office = { bots: () => [...bots.values()].map((b) => ({ id: b.b.id, state: b.state, x: +b.root.position.x.toFixed(4), z: +b.root.position.z.toFixed(4), y: +b.body.position.y.toFixed(4), ry: +b.root.rotation.y.toFixed(4), legs: +b.legL.rotation.x.toFixed(4) })), pixelRatio: () => renderer.getPixelRatio(), simulating: () => simulating };
