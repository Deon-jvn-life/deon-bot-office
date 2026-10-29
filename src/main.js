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
const SPINE_X = 2.7;
// Deon's portrait swap. The eye screen stays until this file is wired onto his face.
const DEON_AVATAR = '/avatars/deon.png';
const CODING_ID = 'coding-helper';
const FX = 13.6, FZ = 9.5;

// Each private office is half its previous floor area, still in the east corner.
const DEON = { x0: 7.9, x1: 13.52, z0: -9.2, z1: -3.61 };
const CHIEF = { x0: 7.9, x1: 13.52, z0: -3.61, z1: 1.42 };
const WALL_H = 0.48;
const deonDoor = { x: 7.1, z: -6.4 };
const chiefDoor = { x: 7.1, z: 0.35 };
const loungeDoor = { x: -6.2, z: 2.35 };
const breakDoor = { x: 2.7, z: 5.05 };

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
  camera.fov = portrait ? 72 : 40;
  camera.updateProjectionMatrix();
  camera.position.set(portrait ? 0.2 : 0.15, portrait ? 42 : 17.5, portrait ? 12 : 16.8);
}
framing();
const controls = new OrbitControls(camera, canvas);
controls.target.set(0.1, 0.35, -0.15);
controls.enableDamping = true;
controls.maxPolarAngle = 1.25;
controls.minDistance = 4; controls.maxDistance = 40;
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
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 70 });
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
const potWhite = lambert('#e6e1d8');
const potSand = lambert('#d9c3a6');
const potGrey = lambert('#c5c9c6');
const soilMat = lambert('#4a3d34');
const trunkMat = lambert('#6b5344');
const petiole = lambert('#3e6a46');
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
const potGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.01, 0), new THREE.Vector2(0.22, 0), new THREE.Vector2(0.24, 0.035),
  new THREE.Vector2(0.18, 0.07), new THREE.Vector2(0.175, 0.34), new THREE.Vector2(0.22, 0.38),
  new THREE.Vector2(0.22, 0.43), new THREE.Vector2(0.15, 0.43),
], 18);
const leafPlane = new THREE.PlaneGeometry(1, 1);
const stemGeo = new THREE.CylinderGeometry(0.011, 0.016, 1, 6);
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
function leafTexture(draw) {
  const tex = canvasTex(256, 256, (ctx, W, H) => { ctx.clearRect(0, 0, W, H); draw(ctx, W, H); }).t;
  return new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff', side: THREE.DoubleSide, alphaTest: 0.45 });
}
const fiddleMat = leafTexture((ctx, W, H) => {
  ctx.fillStyle = '#2f6a3c';
  ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.96);
  ctx.bezierCurveTo(W * 0.78, H * 0.78, W * 0.96, H * 0.5, W * 0.72, H * 0.22);
  ctx.bezierCurveTo(W * 0.62, H * 0.08, W * 0.54, H * 0.02, W * 0.5, H * 0.0);
  ctx.bezierCurveTo(W * 0.46, H * 0.02, W * 0.38, H * 0.08, W * 0.28, H * 0.22);
  ctx.bezierCurveTo(W * 0.04, H * 0.5, W * 0.22, H * 0.78, W * 0.5, H * 0.96);
  ctx.fill();
  ctx.strokeStyle = '#1d4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.9); ctx.lineTo(W * 0.5, H * 0.08); ctx.stroke();
});
const fiddleMat2 = fiddleMat.clone(); fiddleMat2.color.set('#d5e4cf');
const monsteraMat = leafTexture((ctx, W, H) => {
  ctx.fillStyle = '#1f6a45';
  ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.98);
  ctx.bezierCurveTo(W * 0.95, H * 0.7, W * 0.98, H * 0.28, W * 0.62, H * 0.08);
  ctx.quadraticCurveTo(W * 0.5, H * 0.18, W * 0.38, H * 0.08);
  ctx.bezierCurveTo(W * 0.02, H * 0.28, W * 0.05, H * 0.7, W * 0.5, H * 0.98); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
  for (const [x, y, rx, ry] of [[0.32, 0.55, 0.07, 0.1], [0.68, 0.52, 0.07, 0.09], [0.38, 0.72, 0.06, 0.08], [0.62, 0.74, 0.055, 0.07], [0.5, 0.4, 0.05, 0.07]]) {
    ctx.beginPath(); ctx.ellipse(W * x, H * y, W * rx, H * ry, 0.4, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#143d28'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.94); ctx.lineTo(W * 0.5, H * 0.16); ctx.stroke();
});
const monsteraMat2 = monsteraMat.clone(); monsteraMat2.color.set('#cfe0d2');
const snakeMat = leafTexture((ctx, W, H) => {
  ctx.fillStyle = '#246b48';
  ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.02); ctx.lineTo(W * 0.72, H * 0.96); ctx.lineTo(W * 0.28, H * 0.96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b7c98a';
  ctx.fillRect(W * 0.34, H * 0.2, W * 0.07, H * 0.7); ctx.fillRect(W * 0.58, H * 0.18, W * 0.06, H * 0.72);
});
const snakeMat2 = snakeMat.clone(); snakeMat2.color.set('#e4eed4');
const oliveMat = leafTexture((ctx, W, H) => {
  ctx.fillStyle = '#6d8f62';
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.5, W * 0.22, H * 0.42, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3e5a38'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.12); ctx.lineTo(W * 0.5, H * 0.88); ctx.stroke();
});
const oliveMat2 = oliveMat.clone(); oliveMat2.color.set('#dfe8d4');
function addLeaf(g, mat, x, y, z, rx, ry, rz, sx, sy) {
  const m = new THREE.Mesh(leafPlane, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, 1);
  m.userData.leaf = true; g.add(m);
}
function addStem(g, x, y, z, h, rx, rz, mat = trunkMat) {
  const m = new THREE.Mesh(stemGeo, mat);
  m.position.set(x, y, z); m.scale.set(1, h, 1); m.rotation.set(rx, 0, rz); g.add(m);
}
function addPot(g, mat, s = 1) {
  const p = new THREE.Mesh(potGeo, mat); p.scale.set(s, s, s); g.add(p);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.16 * s, 14), soilMat);
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.4 * s; soil.userData.leaf = true; g.add(soil);
}
function spawnPlant(g, x, z, s = 1, ry = 0) {
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = ry;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.leaf; o.receiveShadow = !o.userData.leaf; } });
  scene.add(g);
}
function fiddlePlant() {
  const g = new THREE.Group(); addPot(g, potWhite, 1);
  addStem(g, 0, 0.85, 0, 0.9, 0, 0);
  const leaves = [[0.02, 1.35, 0.05, -0.7, 0.4, 0, 0.32, 0.46, fiddleMat], [0.16, 1.22, -0.08, -0.4, 1.1, 0.2, 0.28, 0.4, fiddleMat2], [-0.14, 1.18, 0.06, -0.5, -0.8, -0.2, 0.3, 0.42, fiddleMat], [0.08, 1.05, 0.16, -0.9, 2.2, 0.3, 0.26, 0.36, fiddleMat2], [-0.06, 0.98, -0.14, -0.6, -2.0, 0, 0.24, 0.34, fiddleMat], [0.18, 0.86, 0.02, -1.0, 0.6, 0.4, 0.22, 0.3, fiddleMat2]];
  for (const L of leaves) addLeaf(g, L[8], L[0], L[1], L[2], L[3], L[4], L[5], L[6], L[7]);
  return g;
}
function monsteraPlant() {
  const g = new THREE.Group(); addPot(g, potSand, 0.95);
  const leaves = [[0.05, 0.85, 0.18, -1.15, 0.3, 0, 0.42, 0.4, monsteraMat], [-0.16, 0.78, -0.05, -1.0, -0.9, 0.2, 0.38, 0.36, monsteraMat2], [0.18, 0.7, -0.1, -1.25, 1.5, -0.2, 0.36, 0.34, monsteraMat], [-0.02, 0.95, -0.16, -0.85, 2.4, 0.1, 0.34, 0.32, monsteraMat2], [0.12, 0.62, 0.16, -1.3, -1.8, 0, 0.3, 0.28, monsteraMat]];
  for (const L of leaves) {
    addStem(g, L[0] * 0.35, 0.55, L[2] * 0.35, 0.45, L[3] * 0.35, 0, petiole);
    addLeaf(g, L[8], L[0], L[1], L[2], L[3], L[4], L[5], L[6], L[7]);
  }
  return g;
}
function snakePlant() {
  const g = new THREE.Group(); addPot(g, potGrey, 0.72);
  const blades = [[-0.05, 0.15, 0.55, snakeMat], [0.04, -0.02, 0.72, snakeMat2], [-0.01, 0.06, 0.64, snakeMat], [0.08, 0.08, 0.5, snakeMat2], [-0.08, -0.04, 0.46, snakeMat]];
  blades.forEach(([x, z, h, mat], i) => addLeaf(g, mat, x, 0.42 + h * 0.45, z, 0.15, i * 0.4, (i - 2) * 0.08, 0.1, h));
  return g;
}
function olivePlant() {
  const g = new THREE.Group(); addPot(g, potWhite, 0.85);
  addStem(g, 0, 0.75, 0, 0.7, 0, 0);
  addStem(g, 0.08, 1.05, 0.02, 0.4, 0, -0.6);
  addStem(g, -0.07, 1.02, -0.02, 0.38, 0, 0.55);
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9, r = 0.12 + (i % 3) * 0.05, y = 1.05 + (i % 4) * 0.06;
    addLeaf(g, i % 2 ? oliveMat : oliveMat2, Math.sin(a) * r, y, Math.cos(a) * r, -0.4, a, 0.2, 0.08, 0.16);
  }
  return g;
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
bar(0, -0.12, 0, FX * 2 + 0.3, 0.24, FZ * 2 + 0.3, baseMat);
hFloor(0, 0, FX * 2, FZ * 2, floorMat, 0.008);
hFloor((DEON.x0 + DEON.x1) / 2, (DEON.z0 + DEON.z1) / 2, DEON.x1 - DEON.x0 - 0.15, DEON.z1 - DEON.z0 - 0.15, woodMat, 0.02);
hFloor((CHIEF.x0 + CHIEF.x1) / 2, (CHIEF.z0 + CHIEF.z1) / 2, CHIEF.x1 - CHIEF.x0 - 0.15, CHIEF.z1 - CHIEF.z0 - 0.15, woodMat, 0.02);
hFloor(SPINE_X, -1.2, 1.15, FZ * 2 - 2.2, runnerMat, 0.016);
bar((-FX + DEON.x0) / 2, WALL_H / 2, -FZ, DEON.x0 + FX, WALL_H, 0.12, wallMat);
bar(0, WALL_H / 2, FZ, FX * 2, WALL_H, 0.12, wallMat);
bar(-FX, WALL_H / 2, 0, 0.12, WALL_H, FZ * 2, wallMat);
bar(FX, WALL_H / 2, (CHIEF.z1 + FZ) / 2, 0.12, WALL_H, FZ - CHIEF.z1, wallMat);

const sky = canvasTex(512, 512, (ctx, W, H) => {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#9ebcd0'); grd.addColorStop(0.58, '#d7e4ec'); grd.addColorStop(0.8, '#f0dcc4'); grd.addColorStop(1, '#e7c9a4');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
});
const skyMat = lambert('#ffffff', { map: sky.t, side: THREE.DoubleSide });
noCast.add(skyMat);
const skyN = new THREE.Mesh(new THREE.PlaneGeometry(36, 14), skyMat); skyN.position.set(6, 6.2, -18); scene.add(skyN);
const skyE = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), skyMat); skyE.position.set(24, 6.2, -1); skyE.rotation.y = -Math.PI / 2; scene.add(skyE);
hFloor(8, -13.2, 22, 5.2, sandMat, -0.03);
hFloor(8, -16.4, 26, 4.6, waterMat, -0.06);
hFloor(18, -2, 8, 16, sandMat, -0.03);
hFloor(21.5, -2, 4, 16, waterMat, -0.06);
const towers = [[5.5, -11.4, 1.6, 1.5, 4.2], [8.2, -12.2, 1.2, 1.2, 7.2], [10.6, -11.3, 1.8, 1.4, 3.4], [13.2, -12.4, 1.3, 1.3, 5.6], [3.2, -11.0, 2.2, 1.1, 2.2], [16.2, -6.5, 1.3, 1.3, 4.8], [17.4, -3.2, 1.6, 1.4, 3.1]];
towers.forEach((t, i) => bar(t[0], t[4] / 2, t[1], t[2], t[4], t[3], towerMats[i % towerMats.length]));
spawnPlant(olivePlant(), 7.4, -10.8, 0.85, 0.4);

// ---------- glass offices ----------
wallAlongX(DEON.z0, DEON.x0, DEON.x1);
wallAlongZ(DEON.x1, DEON.z0, DEON.z1);
wallAlongZ(DEON.x0, DEON.z0, -6.85);
wallAlongZ(DEON.x0, -5.95, DEON.z1);
wallAlongX(DEON.z1, DEON.x0, DEON.x1);
wallAlongZ(CHIEF.x1, CHIEF.z0, CHIEF.z1);
wallAlongZ(CHIEF.x0, CHIEF.z0, -0.05);
wallAlongZ(CHIEF.x0, 0.75, CHIEF.z1);
wallAlongX(CHIEF.z1, CHIEF.x0, CHIEF.x1);
for (const x of [DEON.x0, DEON.x1]) for (const z of [DEON.z0, DEON.z1]) post(x, z);
for (const x of [CHIEF.x0, CHIEF.x1]) post(x, CHIEF.z1);
post(CHIEF.x0, -0.05); post(CHIEF.x0, 0.75); post(DEON.x0, -6.85); post(DEON.x0, -5.95);
railX((DEON.x0 + DEON.x1) / 2, WALL_H, DEON.z0, DEON.x1 - DEON.x0);
railX((DEON.x0 + DEON.x1) / 2, WALL_H, DEON.z1, DEON.x1 - DEON.x0);
railZ(DEON.x1, WALL_H, (DEON.z0 + DEON.z1) / 2, DEON.z1 - DEON.z0);
railZ(CHIEF.x1, WALL_H, (CHIEF.z0 + CHIEF.z1) / 2, CHIEF.z1 - CHIEF.z0);
railX((CHIEF.x0 + CHIEF.x1) / 2, WALL_H, CHIEF.z1, CHIEF.x1 - CHIEF.x0);

// ---------- desks: chief is private; the other 13 are re-spaced in the open plan ----------
const seats = [];
const spots = {};
const COLS = [-10.4, -7.6, -4.8, -2.0, 0.8];
const SIT_ROWS = [-6.2, -3.3, -0.4];
const deptBots = TEAM.filter((b) => b.id !== LEAD_ID && b.id !== CODING_ID);
deptBots.forEach((b, i) => {
  const row = Math.floor(i / 5);
  const col = row < 2 ? i % 5 : (i % 5) + 1;
  const sx = COLS[col], sz = SIT_ROWS[row], ry = Math.PI;
  const sit = addWorkstation(sx, sz, ry);
  const door = { x: sx, z: sz + 1.15 };
  spots[b.id] = { desk: { ...sit, door }, deskStand: { x: sx + 0.5, z: sz + 0.05, ry, pose: 'stand', door } };
  const rug = lambert(mix(b.color, '#d9d3cb', 0.86));
  hFloor(sx, sz - 0.25, 2.35, 2.05, rug, 0.015);
});
const chiefWork = addWorkstation(11.7, -1.55, 0);
spots[LEAD_ID] = {
  desk: { ...chiefWork, door: chiefDoor },
  deskStand: { x: 10.7, z: -1.55, ry: 0, pose: 'stand', door: chiefDoor },
};
const chiefBoard = { x: 10.5, z: -3.08, ry: Math.PI, pose: 'stand', door: chiefDoor };
const boardCanvas = canvasTex(640, 360);
const boardMat = new THREE.MeshBasicMaterial({ map: boardCanvas.t, color: '#ffffff', toneMapped: true });
const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.15), boardMat);
boardMesh.position.set(10.5, 0.78, CHIEF.z0 + 0.08); boardMesh.castShadow = false; scene.add(boardMesh);
bar(10.5, 0.78, CHIEF.z0 + 0.03, 2.1, 1.35, 0.05, frameMat);
const boardInk = [
  [72, 64, 190, 72, 320, 58, 460, 76, 580, 62],
  [68, 118, 150, 126, 260, 112, 390, 128, 520, 116],
  [80, 176, 210, 184, 340, 168, 490, 186, 575, 172],
  [86, 236, 160, 248, 250, 230, 340, 252],
  [400, 228, 480, 246, 560, 224, 600, 240],
];
let boardPen = null, boardTick = 0;
function paintBoard() {
  const c = boardCanvas.ctx;
  c.fillStyle = '#f7f6f2'; c.fillRect(0, 0, 640, 360);
  c.strokeStyle = '#2c4f86'; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const pts of boardInk) {
    if (pts.length < 4) continue;
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.stroke();
  }
  boardCanvas.t.needsUpdate = true;
}
paintBoard();
function stepBoard(dt, active) {
  if (!active) return;
  boardTick += dt;
  if (boardTick < 0.045) return;
  boardTick = 0;
  if (!boardPen) {
    while (boardInk.length > 9) boardInk.shift();
    boardPen = { x: 80 + Math.random() * 480, y: 36 + Math.random() * 270, n: 0, pts: [] };
    boardInk.push(boardPen.pts);
  }
  boardPen.x = Math.max(28, Math.min(612, boardPen.x + (Math.random() - 0.42) * 26));
  boardPen.y = Math.max(22, Math.min(338, boardPen.y + (Math.random() - 0.5) * 14));
  boardPen.pts.push(boardPen.x, boardPen.y);
  if (++boardPen.n > 16 + Math.random() * 22) boardPen = null;
  paintBoard();
}
addWorkstation(10.7, -7.35, 0);
hFloor(10.7, -6.7, 2.2, 2.0, runnerMat, 0.03);
hFloor(11.4, -0.6, 2.4, 2.0, runnerMat, 0.03);

const waitSpots = [-8.7, -8.2, -7.65, -7.1, -5.55, -5.05, -4.55, -4.05]
  .map((z) => ({ x: 6.55, z, ry: Math.PI / 2, pose: 'stand', door: { x: 5.7, z } }))
  .sort((a, b) => Math.abs(a.z + 6.4) - Math.abs(b.z + 6.4));
bar(7.15, 0.42, -7.9, 0.32, 0.46, 1.85, deskMat);
bar(7.15, 0.42, -4.8, 0.32, 0.46, 1.7, deskMat);
for (const spot of waitSpots) {
  put(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10), chairMat, spot.x, 0.28, spot.z);
  put(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), metal, spot.x, 0.12, spot.z);
}
const handoffSpots = [];
for (let i = 0; i < 13; i++) {
  const col = i % 4, row = Math.floor(i / 4);
  handoffSpots.push({ x: 8.55 + col * 0.62, z: -1.15 + row * 0.48, ry: Math.PI, pose: 'stand', carry: true, door: chiefDoor });
}

// ---------- lounge, break room, lab ----------
const lounge = { x: -6.2, z: 5.5 };
hFloor(lounge.x, lounge.z, 6.6, 5.2, lambert('#cbb9a4'), 0.014);
addSofa(lounge.x, lounge.z - 1.45, 0, 4);
addSofa(lounge.x, lounge.z + 1.45, Math.PI, 4);
addSofa(lounge.x - 2.55, lounge.z, Math.PI / 2, 2);
bar(lounge.x, 0.32, lounge.z, 1.2, 0.26, 0.7, oak);
spawnPlant(monsteraPlant(), -3.15, 3.55, 1.05, 0.4);
spawnPlant(snakePlant(), lounge.x - 3.3, lounge.z + 1.6, 1, -0.4);
addPendant(lounge.x, lounge.z);

const br = { x: 11.7, z: 6.55 };
hFloor(br.x, br.z, 8.2, 6.2, lambert('#e3d3bf'), 0.014);
put(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 24), oak, br.x, 0.74, br.z);
put(new THREE.CylinderGeometry(0.055, 0.07, 0.7, 10), metal, br.x, 0.36, br.z);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2, x = br.x + Math.sin(a) * 1.15, z = br.z + Math.cos(a) * 1.15;
  const ry = Math.atan2(br.x - x, br.z - z);
  addChair(x, z, ry);
  seats.push({ x, z, ry, pose: 'sit', seatY: 0, door: breakDoor });
}
bar(12.7, 0.48, 8.7, 1.5, 0.86, 0.5, deskMat);
spawnPlant(olivePlant(), 10.2, 8.15, 0.9, 0.2);
addPendant(br.x, br.z);
const gymStations = [
  { kind: 'lift', x: -1.9, z: 8.15, ry: 0, pose: 'stand', door: { x: -1.9, z: 6.7 } },
  { kind: 'bike', x: -0.85, z: 8.15, ry: Math.PI, pose: 'sit', seatY: 0.1, door: { x: -0.85, z: 6.7 } },
  { kind: 'run', x: 0.25, z: 8.15, ry: 0, pose: 'stand', door: { x: 0.25, z: 6.7 } },
  { kind: 'swim', x: 2.15, z: 8.45, ry: Math.PI / 2, pose: 'stand', door: { x: 2.15, z: 6.9 } },
  { kind: 'stretch', x: -1.15, z: 7.42, ry: 0, pose: 'stand', door: { x: -1.15, z: 6.7 } },
];
hFloor(0.55, 8.2, 6.3, 2.2, lambert('#d5ddd8'), 0.012);
{
  const g = new THREE.Group();
  const frame = lambert('#8d949b'), water = lambert('#7fa8b4'), belt = lambert('#4d555c');
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  add(new THREE.BoxGeometry(0.7, 0.7, 0.08), frame, -1.9, 0.45, 8.55);
  for (const y of [0.35, 0.55]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), metal, -1.9, y, 8.48, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), frame, -0.85, 0.28, 8.15, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10), frame, -0.85, 0.62, 7.85, Math.PI / 2);
  add(new THREE.BoxGeometry(0.06, 0.45, 0.5), frame, -0.85, 0.4, 8.0);
  add(new RoundedBoxGeometry(0.22, 0.05, 0.16, 2, 0.02), chairMat, -0.85, 0.62, 8.2);
  add(new RoundedBoxGeometry(0.85, 0.12, 0.42, 2, 0.03), belt, 0.25, 0.16, 8.15);
  add(new THREE.BoxGeometry(0.08, 0.7, 0.42), frame, 0.62, 0.5, 8.15);
  add(new RoundedBoxGeometry(2.4, 0.28, 0.7, 2, 0.06), lambert('#c5d0d4'), 2.15, 0.16, 8.45);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.52), water);
  pool.rotation.x = -Math.PI / 2; pool.position.set(2.15, 0.31, 8.45); pool.castShadow = false; g.add(pool);
  add(new THREE.BoxGeometry(0.72, 0.025, 0.42), lambert('#c46b6b'), -1.15, 0.03, 7.42);
  scene.add(g);
}
const GYM_ORDER = ['swim', 'bike', 'run', 'lift', 'stretch'];
const CIRCUIT_MS = 75 * 1000;
const STATION_MS = 15 * 1000;
let gymJob = null;
function gymSchedule(now) {
  const idle = [...bots.values()].filter((b) => b.state === 'idle' && b.b.id !== CODING_ID).map((b) => b.b.id).sort();
  if (!idle.length) return null;
  const wheel = [];
  for (const id of idle) { wheel.push(id); if (id === NORSE_ID) wheel.push(id, id); }
  const circuit = Math.floor(now / CIRCUIT_MS);
  const phase = Math.min(GYM_ORDER.length - 1, Math.floor((now % CIRCUIT_MS) / STATION_MS));
  return { id: wheel[circuit % wheel.length], kind: GYM_ORDER[phase], circuit };
}
function beginWalk(bot, spot, direct) {
  const fromDoor = bot.target && bot.target.door;
  bot.flying = null;
  bot.root.position.y = 0;
  if (bot.ripple) bot.ripple.visible = false;
  bot.target = spot;
  applyPose(bot, 'stand');
  bot.path = direct ? [{ x: spot.x, z: spot.z }] : route(bot.root.position, fromDoor, spot);
  bot.walking = true;
}
function trainAt(bot, kind, t) {
  const st = gymStations.find((s) => s.kind === kind);
  bot.root.position.set(st.x, 0, st.z);
  bot.root.rotation.y = st.ry;
  const s = Math.sin(t * (kind === 'run' ? 10 : 6));
  if (kind === 'lift') {
    applyPose(bot, 'stand');
    const up = (Math.sin(t * 2.2) + 1) / 2;
    bot.armL.rotation.x = -0.35 - up * 1.7;
    bot.armR.rotation.x = -0.35 - up * 1.7;
    bot.body.position.y = up * 0.05;
  } else if (kind === 'bike') {
    applyPose(bot, 'sit', 0.1);
    bot.legL.rotation.x = -0.35 + s * 0.7;
    bot.legR.rotation.x = -0.35 - s * 0.7;
    bot.armL.rotation.x = -0.85;
    bot.armR.rotation.x = -0.85;
  } else if (kind === 'run') {
    applyPose(bot, 'stand');
    bot.legL.rotation.x = s * 0.85;
    bot.legR.rotation.x = -s * 0.85;
    bot.armL.rotation.x = -s * 0.55;
    bot.armR.rotation.x = s * 0.55;
    bot.body.position.y = Math.abs(s) * 0.04;
  } else if (kind === 'swim') {
    applyPose(bot, 'stand');
    const lane0 = 1.58, lane1 = 2.72;
    const lap = (t * 0.15) % 2;
    const going = lap < 1;
    const along = going ? lap : 2 - lap;
    const center = lane0 + (lane1 - lane0) * along;
    const face = going ? 1 : -1;
    const x = center - face * 0.52;
    const z = st.z;
    bot.root.position.set(x, 0.4, z);
    bot.root.rotation.y = going ? Math.PI / 2 : -Math.PI / 2;
    bot.body.rotation.x = Math.PI / 2;
    bot.body.position.y = 0;
    const stroke = t * 2.4;
    bot.armL.scale.set(1, 2.6, 1); bot.armR.scale.set(1, 2.6, 1);
    bot.legL.scale.set(1, 1.7, 1); bot.legR.scale.set(1, 1.7, 1);
    for (const arm of [bot.armL, bot.armR]) arm.children.forEach((c, i) => { if (i > 0) c.visible = false; });
    bot.armL.rotation.x = -Math.PI / 2 - stroke;
    bot.armR.rotation.x = -Math.PI / 2 - stroke + Math.PI;
    const kick = Math.sin(t * 14) * 0.55;
    bot.legL.rotation.x = kick;
    bot.legR.rotation.x = -kick;
    if (!bot.ripple) {
      bot.ripple = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.26, 24), new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      bot.ripple.rotation.x = -Math.PI / 2;
      scene.add(bot.ripple);
    }
    bot.ripple.visible = true;
    bot.ripple.position.set(center, 0.33, z + 0.2);
    bot.ripple.scale.setScalar(0.9 + 0.18 * Math.sin(t * 6));
  } else {
    if (bot.ripple) bot.ripple.visible = false;
    applyPose(bot, 'stand');
    bot.armL.rotation.x = -2.35;
    bot.armR.rotation.x = -2.35;
    bot.body.rotation.z = Math.sin(t * 1.25) * 0.38;
  }
}
function syncGym(now, t) {
  const plan = gymSchedule(now);
  if (gymJob && gymJob.phase === 'back') {
    const prev = bots.get(gymJob.id);
    if (!prev || prev.state !== 'idle' || !prev.walking) gymJob = null;
    else return;
  }
  if (gymJob && (!plan || plan.id !== gymJob.id || plan.circuit !== gymJob.circuit)) {
    const prev = bots.get(gymJob.id);
    const same = plan && prev && plan.id === gymJob.id;
    if (prev && prev.state === 'idle' && !prev.flying) {
      beginWalk(prev, prev.home || prev.target, false);
      prev.home = null;
    }
    gymJob = same ? { id: plan.id, phase: 'back', circuit: plan.circuit } : null;
    if (same) return;
  }
  if (!plan) return;
  const bot = bots.get(plan.id);
  if (!bot || bot.state !== 'idle' || bot.flying) return;
  const st = gymStations.find((s) => s.kind === plan.kind);
  if (!gymJob) {
    if (bot.walking) return;
    bot.home = bot.target;
    beginWalk(bot, st, false);
    gymJob = { id: plan.id, kind: plan.kind, circuit: plan.circuit };
    return;
  }
  if (plan.kind !== gymJob.kind) {
    beginWalk(bot, st, true);
    gymJob.kind = plan.kind;
    return;
  }
  if (bot.walking) return;
  trainAt(bot, plan.kind, t);
}

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
bigScreen(-12.3, 7.15, 0.45, 'chart');
bigScreen(-12.2, 5.15, 0.15, 'map');
bar(-11.6, 0.74, 6.2, 1.6, 0.06, 0.7, deskMat);
spawnPlant(fiddlePlant(), -10.6, 7.55, 0.95, 0.8);

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
addRack(-13.15, -5.4); addRack(-13.15, -4.15);
const codingDoor = { x: -11.5, z: -4.7 };
const codingWork = { x: -12.35, z: -4.75, ry: -Math.PI / 2, pose: 'stand', door: codingDoor };
const codingIdle = { x: -12.15, z: -3.25, ry: 0.5, pose: 'sit', seatY: 0.02, door: codingDoor };
addChair(codingIdle.x, codingIdle.z, codingIdle.ry);

spawnPlant(snakePlant(), -11.6, -8.15, 0.9, 0.3);
spawnPlant(fiddlePlant(), 12.35, -8.15, 0.85, -0.4);
spawnPlant(snakePlant(), 12.25, 0.55, 0.8, 0.2);
addPendant(6.9, -6.5); addPendant(6.9, -0.4); addPendant(-6, -4.5); addPendant(-2, -4.5);

// ---------- usage board (real stored reading only) ----------
const usage = canvasTex(1024, 512);
usage.t.anisotropy = MAX_ANISO;
const usageMat = new THREE.MeshBasicMaterial({ map: usage.t, toneMapped: true, color: '#dedede' });
const usageMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.55), usageMat);
usageMesh.position.set(-5.1, 1.05, -8.55); scene.add(usageMesh);
bar(-5.1, 1.05, -8.64, 3.5, 1.75, 0.06, frameMat);
bar(-6.55, 0.38, -8.64, 0.08, 0.76, 0.08, frameMat);
bar(-3.65, 0.38, -8.64, 0.08, 0.76, 0.08, frameMat);
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
  leg: new THREE.CapsuleGeometry(0.055, 0.12, 4, 8),
  arm: new THREE.CapsuleGeometry(0.04, 0.1, 4, 8),
  torso: new THREE.SphereGeometry(0.22, 22, 16),
  head: new THREE.SphereGeometry(0.22, 28, 20),
  eye: new THREE.SphereGeometry(0.045, 16, 12),
};
const eyeBlack = lambert('#111111');
const eyes = [];
function makeTag(shortName, fullName) {
  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = '<span class="q"></span><span class="short"></span><span class="full"></span><span class="ln"></span>';
  el.querySelector('.short').textContent = shortName; el.querySelector('.full').textContent = fullName;
  el.addEventListener('click', () => el.classList.toggle('open'));
  const tag = new CSS2DObject(el); tag.position.set(0, 1.18, 0);
  return { el, tag };
}
function accessory(kind) {
  const g = new THREE.Group(); const dark = lambert('#3a3e44'), light = lambert('#d8d2c4');
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); };
  switch (kind) {
    case 'headset': add(new THREE.TorusGeometry(0.2, 0.02, 8, 20, Math.PI), dark, 0, 0.84, 0, 0, Math.PI / 2, 0); add(new THREE.SphereGeometry(0.04, 8, 6), dark, 0.18, 0.76, 0); add(new THREE.SphereGeometry(0.04, 8, 6), dark, -0.18, 0.76, 0); return { g, on: 'body' };
    case 'tophat': add(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), dark, 0, 1.12, 0); add(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 16), dark, 0, 1.02, 0); add(new THREE.CylinderGeometry(0.102, 0.102, 0.03, 16), lambert('#a8873a'), 0, 1.05, 0); return { g, on: 'body' };
    case 'binoculars': add(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10), dark, 0.045, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10), dark, -0.045, 0, 0, Math.PI / 2); return { g, on: 'chest' };
    case 'cable': add(new THREE.TorusGeometry(0.08, 0.02, 8, 16), lambert('#2f3a33'), 0, 0, 0, 0, Math.PI / 2); return { g, on: 'shoulder' };
    case 'clipboard': add(new RoundedBoxGeometry(0.14, 0.18, 0.02, 2, 0.008), lambert('#8a6a48'), 0, 0, 0); return { g, on: 'hand' };
    case 'calculator': add(new RoundedBoxGeometry(0.1, 0.14, 0.025, 2, 0.008), lambert('#4a4f57'), 0, 0, 0); return { g, on: 'hand' };
    case 'book': add(new RoundedBoxGeometry(0.14, 0.18, 0.04, 2, 0.008), lambert('#8b4b45'), 0, 0, 0); return { g, on: 'hand' };
    case 'stopwatch': add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), dark, 0, 0, 0, 0, 0, Math.PI / 2); add(new THREE.SphereGeometry(0.034, 8, 6), dark, -0.07, 0, 0); add(new THREE.SphereGeometry(0.034, 8, 6), dark, 0.07, 0, 0); return { g, on: 'hand' };
    case 'marker': add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), dark, 0, 0, 0); add(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 8), lambert('#3fb6c6'), 0, 0.06, 0); return { g, on: 'hand' };
    case 'globe': add(new THREE.SphereGeometry(0.055, 12, 10), lambert('#7f9a78'), 0, 0, 0); add(new THREE.TorusGeometry(0.056, 0.006, 6, 12), dark, 0, 0, 0, Math.PI / 2); return { g, on: 'hand' };
    case 'controller': add(new RoundedBoxGeometry(0.16, 0.05, 0.08, 2, 0.02), lambert('#40444b'), 0, 0, 0); return { g, on: 'hand' };
    case 'envelope': add(new RoundedBoxGeometry(0.16, 0.1, 0.012, 2, 0.006), light, 0, 0, 0); return { g, on: 'hand' };
    case 'passport': add(new RoundedBoxGeometry(0.1, 0.13, 0.018, 2, 0.006), lambert('#2d3f66'), 0, 0, 0); return { g, on: 'hand' };
    case 'briefcase': add(new RoundedBoxGeometry(0.22, 0.16, 0.07, 2, 0.015), lambert('#5a4030'), 0, -0.08, 0); return { g, on: 'hand' };
    case 'bag': add(new RoundedBoxGeometry(0.16, 0.12, 0.12, 2, 0.012), lambert('#d2b48a'), 0, -0.05, 0); add(new THREE.BoxGeometry(0.162, 0.012, 0.122), lambert('#c4b49a'), 0, -0.01, 0); return { g, on: 'hand' };
    case 'laptop': add(new RoundedBoxGeometry(0.16, 0.012, 0.11, 2, 0.004), lambert('#d9dde2'), 0, -0.02, 0, -0.7); add(new RoundedBoxGeometry(0.16, 0.1, 0.01, 2, 0.004), lambert('#2c3138'), 0, 0.04, -0.05, -0.7); return { g, on: 'hand' };
    case 'camera': add(new RoundedBoxGeometry(0.14, 0.09, 0.07, 2, 0.015), lambert('#33363b'), 0, 0, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), dark, 0, 0, 0.05, Math.PI / 2); return { g, on: 'chest' };
    default: return { g, on: 'hand' };
  }
}
const tagByMesh = new Map();
function buildCharacter({ color, shortName, fullName, acc, blinkPhase = 0 }) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const shell = lambert(color), limb = lambert(mix(color, '#ffffff', 0.12));
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.09, 0.28, 0); legR.position.set(0.09, 0.28, 0);
  const lm = new THREE.Mesh(GEO.leg, limb); lm.position.y = -0.115; lm.castShadow = true;
  const rm = new THREE.Mesh(GEO.leg, limb); rm.position.y = -0.115; rm.castShadow = true;
  legL.add(lm); legR.add(rm); body.add(legL, legR);
  const torso = new THREE.Mesh(GEO.torso, shell); torso.position.y = 0.46; torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(GEO.head, shell); head.position.y = 0.78; head.castShadow = true; body.add(head);
  const pair = [-0.045, 0.05].map((x, i) => {
    const m = new THREE.Mesh(GEO.eye, eyeBlack);
    m.scale.set(0.55, 1.25, 0.45); m.position.set(x, 0.07 + i * 0.012, 0.2); m.castShadow = false; m.receiveShadow = false; head.add(m); return m;
  });
  pair.forEach((m) => { m.rotation.z = -0.38; });
  eyes.push({ pair, phase: blinkPhase, open: 1.25 });
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.22, 0.52, 0); armR.position.set(0.22, 0.52, 0);
  const al = new THREE.Mesh(GEO.arm, limb); al.position.y = -0.09; al.castShadow = true;
  const ar = new THREE.Mesh(GEO.arm, limb); ar.position.y = -0.09; ar.castShadow = true;
  armL.add(al); armR.add(ar); body.add(armL, armR);
  const item = accessory(acc || 'book');
  if (item.on === 'body') body.add(item.g);
  else if (item.on === 'chest') { item.g.position.set(0, 0.5, 0.2); body.add(item.g); }
  else if (item.on === 'shoulder') { item.g.position.set(-0.2, 0.58, 0); body.add(item.g); }
  else { item.g.position.set(0, -0.2, 0.04); armR.add(item.g); }
  if (acc === 'tophat') { const globe = accessory('globe'); globe.g.position.set(0, -0.2, 0.04); armL.add(globe.g); }
  if (acc === 'headset') { const marker = accessory('marker'); marker.g.position.set(0.02, -0.22, 0.04); armR.add(marker.g); }
  const folder = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.026, 0.13, 2, 0.01), lambert('#c9a970'));
  folder.position.set(0, 0.5, 0.22); folder.visible = false; folder.castShadow = true; body.add(folder);
  const errMark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), lambert('#c0504a'));
  errMark.position.set(0, 1.08, 0); errMark.visible = false; body.add(errMark);
  const thrust = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: true }));
  thrust.visible = false; scene.add(thrust);
  const trail = [0.5, 0.3, 0.15].map((opacity) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: true }));
    m.visible = false; scene.add(m); return m;
  });
  const { el, tag } = makeTag(shortName, fullName); root.add(tag);
  body.traverse((o) => { if (o.isMesh) tagByMesh.set(o, el); });
  return { root, body, legL, legR, armL, armR, head, folder, errMark, el, thrust, trail };
}

const bots = new Map();
TEAM.forEach((b, i) => {
  const parts = buildCharacter({ color: b.color, shortName: b.short, fullName: b.name, acc: b.acc, blinkPhase: i * 0.73 });
  bots.set(b.id, { b, i, ...parts, path: [], walking: false, target: null, state: 'idle', line: '', phase: 0 });
});
const deon = buildCharacter({ color: '#8e9ea3', shortName: 'Deon', fullName: 'Deon', acc: null, blinkPhase: 1.4 });
deon.portraitUrl = DEON_AVATAR;
const deonRoom = { x0: DEON.x0 + 0.55, x1: DEON.x1 - 0.45, z0: DEON.z0 + 0.5, z1: DEON.z1 - 0.35 };
function deonGoal(kind) {
  if (kind === 'sit') return { x: 10.7, z: -7.35, ry: 0, sit: true };
  if (kind === 'window') return { x: deonRoom.x0 + Math.random() * (deonRoom.x1 - deonRoom.x0), z: deonRoom.z0, ry: Math.PI, think: true };
  return {
    x: deonRoom.x0 + Math.random() * (deonRoom.x1 - deonRoom.x0),
    z: deonRoom.z0 + Math.random() * (deonRoom.z1 - deonRoom.z0),
    ry: Math.random() * Math.PI * 2,
  };
}
function chooseDeonGoal() {
  const r = Math.random();
  return deonGoal(r < 0.05 ? 'sit' : r < 0.42 ? 'window' : 'wander');
}
function restDeon() {
  deon.legL.rotation.x = deon.legR.rotation.x = 0;
  deon.armL.rotation.x = deon.armR.rotation.x = 0;
  deon.armL.rotation.z = deon.armR.rotation.z = 0;
  deon.body.position.y = 0;
  deon.head.rotation.set(0, 0, 0);
}
function thinkDeon() {
  restDeon();
  deon.root.rotation.y = Math.PI;
  deon.armR.rotation.x = -2.15;
  deon.armR.rotation.z = -0.42;
  deon.head.rotation.z = 0.3;
  deon.head.rotation.x = 0.12;
}
function sitDeon() {
  deon.root.rotation.y = 0;
  deon.legL.rotation.x = deon.legR.rotation.x = -Math.PI / 2;
  deon.armL.rotation.x = deon.armR.rotation.x = -0.75;
  deon.armL.rotation.z = deon.armR.rotation.z = 0;
  deon.body.position.y = 0.18;
  deon.head.rotation.set(0, 0, 0);
}
deon.mode = 'think';
deon.until = 4.5;
deon.goal = null;
deon.walkPhase = 0;
deon.root.position.set(8.4, 0, deonRoom.z0);
thinkDeon();
function stepDeon(dt) {
  if (deon.mode !== 'walk') {
    deon.until -= dt;
    if (deon.until > 0) return;
    deon.goal = chooseDeonGoal();
    deon.mode = 'walk';
    restDeon();
    return;
  }
  const g = deon.goal, pos = deon.root.position;
  const dx = g.x - pos.x, dz = g.z - pos.z, dist = Math.hypot(dx, dz), step = 0.62 * dt;
  if (dist <= Math.max(step, 0.04)) {
    pos.x = g.x; pos.z = g.z;
    if (g.sit) { deon.mode = 'sit'; deon.until = 2.6; sitDeon(); }
    else if (g.think) { deon.mode = 'think'; deon.until = 4.4; thinkDeon(); }
    else { deon.mode = 'hold'; deon.until = 0.8; restDeon(); deon.root.rotation.y = Math.atan2(dx, dz); }
    return;
  }
  pos.x = Math.min(deonRoom.x1, Math.max(deonRoom.x0, pos.x + (dx / dist) * step));
  pos.z = Math.min(deonRoom.z1, Math.max(deonRoom.z0, pos.z + (dz / dist) * step));
  const want = Math.atan2(dx, dz);
  let dr = want - deon.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  deon.root.rotation.y += dr * Math.min(1, dt * 6);
  deon.walkPhase += dt * 5.5;
  const s = Math.sin(deon.walkPhase) * 0.42;
  deon.legL.rotation.x = s; deon.legR.rotation.x = -s;
  deon.armL.rotation.x = -s * 0.4; deon.armR.rotation.x = s * 0.4;
  deon.body.position.y = 0;
  deon.head.rotation.set(0, 0, 0);
}

// ---------- placement & movement ----------
const statusById = new Map();
const waitingSince = new Map();
const NORSE_ID = 'd6c82145-5a65-4faa-a9d3-441c60493abf';
function priorityOf(status) {
  if (!status || status.priority == null || status.priority === '') return null;
  const n = Number(status.priority);
  return Number.isFinite(n) ? n : null;
}
function noteWaiting(id, state, status) {
  if (state !== 'waiting') { waitingSince.delete(id); return; }
  const server = status && (status.waiting_since || (status.state === 'waiting' ? status.updated_at : null));
  if (server) waitingSince.set(id, new Date(server).getTime());
  else if (!waitingSince.has(id)) waitingSince.set(id, Date.now() + waitingSince.size * 0.001);
}
function waitingOrder() {
  const rows = [];
  for (const bot of bots.values()) {
    if (bot.state !== 'waiting') continue;
    const status = statusById.get(bot.b.id);
    rows.push({ id: bot.b.id, chief: bot.b.id === LEAD_ID, priority: priorityOf(status), at: waitingSince.get(bot.b.id) || 0 });
  }
  rows.sort((a, b) => {
    if (a.chief !== b.chief) return a.chief ? -1 : 1;
    const ap = a.priority == null, bp = b.priority == null;
    if (ap !== bp) return ap ? 1 : -1;
    if (!ap && a.priority !== b.priority) return a.priority - b.priority;
    return a.at - b.at || a.id.localeCompare(b.id);
  });
  return rows;
}
function spotForRank(i) {
  if (i < waitSpots.length) return waitSpots[i];
  const base = waitSpots[i % waitSpots.length];
  return { ...base, x: base.x - 0.4 };
}
function syncQueue() {
  const order = waitingOrder();
  const queued = new Set(order.map((w) => w.id));
  for (const bot of bots.values()) {
    if (queued.has(bot.b.id)) continue;
    bot.el.classList.remove('queued');
    const badge = bot.el.querySelector('.q');
    if (badge) badge.textContent = '';
    bot.queueRank = 0;
  }
  order.forEach((w, i) => {
    const bot = bots.get(w.id);
    const rank = i + 1;
    bot.el.classList.add('queued');
    bot.el.querySelector('.q').textContent = String(rank);
    const spot = spotForRank(i);
    const same = bot.queueRank === rank && bot.target && bot.target.x === spot.x && bot.target.z === spot.z;
    bot.queueRank = rank;
    if (same || bot.walking) { bot.target = spot; return; }
    const prev = bot.target;
    bot.target = spot;
    if (prev && (prev.x !== spot.x || prev.z !== spot.z)) {
      applyPose(bot, 'stand');
      bot.path = route(bot.root.position, prev.door || spot.door, spot);
      bot.walking = true;
    }
  });
  const qEl = document.getElementById('queue');
  if (!qEl) return;
  if (!order.length) { qEl.style.display = 'none'; qEl.textContent = ''; return; }
  qEl.style.display = 'block';
  qEl.textContent = 'Waiting on you: ' + order.map((w, i) => `${i + 1} ${bots.get(w.id).b.short}`).join(', ');
}
function targetFor(id, state) {
  const sp = spots[id];
  const deptIdx = TEAM.findIndex((t) => t.id === id);
  switch (state) {
    case 'working': return id === LEAD_ID ? chiefBoard : id === CODING_ID ? codingWork : sp.desk;
    case 'error': return id === CODING_ID ? codingWork : sp.deskStand;
    case 'waiting': return spotForRank(Math.max(0, waitingOrder().findIndex((w) => w.id === id)));
    case 'handoff': return id === LEAD_ID ? sp.deskStand : handoffSpots[(deptIdx - 1 + 13) % 13];
    default: return id === LEAD_ID ? sp.desk : id === CODING_ID ? codingIdle : seats[(deptIdx - 1) % seats.length];
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
  bot.body.rotation.x = 0;
  bot.body.rotation.z = 0;
  bot.legL.rotation.x = bot.legR.rotation.x = sit ? -Math.PI / 2 : 0;
  bot.armL.rotation.x = bot.armR.rotation.x = 0;
  bot.armL.rotation.z = bot.armR.rotation.z = 0;
  bot.armL.scale.set(1, 1, 1); bot.armR.scale.set(1, 1, 1);
  bot.legL.scale.set(1, 1, 1); bot.legR.scale.set(1, 1, 1);
  for (const arm of [bot.armL, bot.armR]) arm.children.forEach((c) => { c.visible = true; });
  bot.body.position.y = sit ? 0.18 + seatY : 0;
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
  noteWaiting(id, state, statusById.get(id));
  const t = targetFor(id, state); bot.target = t;
  if (instant || !prev) place(bot, t);
  else if (id !== LEAD_ID && id !== CODING_ID && ['working', 'error', 'handoff'].includes(state) && Math.hypot(bot.root.position.x - t.x, bot.root.position.z - t.z) > 4.2) {
    bot.walking = false; bot.path = []; bot.root.position.y = 0;
    bot.flying = { t: 0, dur: 1.25, x0: bot.root.position.x, z0: bot.root.position.z, x1: t.x, z1: t.z };
    applyPose(bot, 'stand');
  } else {
    applyPose(bot, 'stand');
    bot.path = route(bot.root.position, prev.door, t); bot.walking = true;
    if (state === 'handoff') bot.armL.rotation.x = bot.armR.rotation.x = -1.1;
  }
  syncQueue();
}
function stepFlight(bot, dt) {
  const f = bot.flying;
  f.t += dt;
  const u = Math.min(1, f.t / f.dur);
  const e = u * u * (3 - 2 * u);
  const x = f.x0 + (f.x1 - f.x0) * e;
  const z = f.z0 + (f.z1 - f.z0) * e;
  const y = Math.sin(u * Math.PI) * 1.2;
  bot.root.position.set(x, y, z);
  bot.root.rotation.y = Math.atan2(f.x1 - f.x0, f.z1 - f.z0);
  bot.legL.rotation.x = bot.legR.rotation.x = 0.35;
  bot.armL.rotation.z = 0.5; bot.armR.rotation.z = -0.5;
  if (bot.thrust) { bot.thrust.visible = true; bot.thrust.position.set(x, Math.max(0.06, y - 0.2), z); }
  if (!f.hist) f.hist = [];
  f.hist.unshift({ x, y: Math.max(0.05, y - 0.18), z });
  f.hist.length = 3;
  bot.trail && bot.trail.forEach((m, i) => { const h = f.hist[i]; m.visible = !!h; if (h) m.position.set(h.x, h.y, h.z); });
  if (u >= 1) {
    bot.flying = null; bot.root.position.y = 0;
    if (bot.thrust) bot.thrust.visible = false;
    if (bot.trail) bot.trail.forEach((m) => { m.visible = false; });
    place(bot, bot.target);
  }
}
const tmpV = new THREE.Vector3();
function stepBots(dt) {
  for (const bot of bots.values()) {
    if (bot.flying) { stepFlight(bot, dt); continue; }
    if (bot.thrust) bot.thrust.visible = false;
    if (bot.trail) bot.trail.forEach((m) => { m.visible = false; });
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
  statusById.clear();
  for (const s of data.statuses || []) statusById.set(s.bot_id, s);
  for (const t of TEAM) { const s = byId.get(t.id); if (s) setState(t.id, effective(s, now), s.line); else setState(t.id, 'idle', ''); }
  syncQueue();
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
  stepDeon(dt);
  let chiefWriting = false;
  for (const bot of bots.values()) {
    const writing = bot.b.id === LEAD_ID && bot.state === 'working' && !bot.walking && !bot.flying;
    const typing = bot.b.id !== LEAD_ID && bot.state === 'working' && !bot.walking && !bot.flying;
    if (writing) {
      chiefWriting = true;
      const s = Math.sin(t * 3.1);
      bot.armR.rotation.x = -1.1 + s * 0.38;
      bot.armR.rotation.z = -0.2 + Math.sin(t * 2.2) * 0.42;
      bot.armL.rotation.x = -0.25;
      bot.head.rotation.x = 0.12;
    } else if (typing) {
      const s = Math.sin(t * 9 + bot.i);
      bot.armL.rotation.x = -0.84 + s * 0.2;
      bot.armR.rotation.x = -0.84 - s * 0.2;
      bot.head.rotation.x = Math.sin(t * 2.2 + bot.i) * 0.07;
    } else if (!bot.walking) bot.head.rotation.set(0, 0, 0);
  }
  stepBoard(dt, chiefWriting);
  syncGym(Date.now(), t);
  for (const e of eyes) {
    const u = (t + e.phase) % 5.2;
    let y = e.open;
    if (u > 4.92) { const k = (u - 4.92) / 0.28; y = e.open * (1 - 0.9 * Math.sin(Math.min(1, k) * Math.PI)); }
    for (const m of e.pair) m.scale.y = Math.max(0.05, y);
  }
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
