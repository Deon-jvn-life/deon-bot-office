import { TEAM } from './team.js';
import { BOARD_BOX, LEAD_ID } from './positions.js';
import { propSvg } from './props.js';

export const actors = new Map();
export let deon = null;

function ripple() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute', width: '5%', height: '1.8%', marginLeft: '-2.5%',
    border: '2px solid rgba(244,251,255,.75)', borderRadius: '50%',
    display: 'none', pointerEvents: 'none', zIndex: '1',
  });
  return el;
}

function makeActor(root, b) {
  const el = document.createElement('div');
  el.className = 'actor';
  el.style.setProperty('--bot', b.color || '#243040');
  el.innerHTML = `<div class="body"><img alt="" src="/sprites/${b.id}.png"><i class="limb arm l"></i><i class="limb arm r">${propSvg(b)}</i><i class="limb leg l"></i><i class="limb leg r"></i></div><span class="tag"></span><span class="q"></span>`;
  const tag = el.querySelector('.tag');
  tag.textContent = b.short;
  tag.title = b.name;
  el.addEventListener('click', (e) => { e.stopPropagation(); el.classList.toggle('open'); });
  const wave = ripple();
  root.appendChild(wave);
  root.appendChild(el);
  return {
    b, el, body: el.querySelector('.body'), img: el.querySelector('img'), tag, badge: el.querySelector('.q'), wave,
    x: 50, y: 40, path: [], walking: false, flying: null, state: 'idle', line: '',
    target: null, pose: 'stand', phase: 0, home: null, queueRank: 0, queueKind: '',
    facing: 1, lean: 0, swimRot: -76, i: 0,
  };
}

export function mountCast() {
  const root = document.getElementById('people');
  const board = document.createElement('div');
  board.id = 'board';
  Object.assign(board.style, {
    position: 'absolute', left: BOARD_BOX.x + '%', top: BOARD_BOX.y + '%',
    width: BOARD_BOX.w + '%', height: BOARD_BOX.h + '%', background: '#f7f6f2',
    borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,.35)', overflow: 'hidden',
    pointerEvents: 'none', zIndex: '1',
  });
  board.innerHTML = '<svg id="board-svg" viewBox="0 0 100 60" width="100%" height="100%"></svg>';
  const glow = document.createElement('div');
  glow.id = 'rack-glow';
  root.appendChild(board);
  root.appendChild(glow);
  TEAM.forEach((b, i) => {
    const a = makeActor(root, b);
    a.i = i;
    actors.set(b.id, a);
  });
  deon = makeActor(root, { id: 'deon', name: 'Deon', short: 'Deon', color: '#243040' });
  deon.i = 3;
}

export function paint(a, extra = 0) {
  const swim = a.pose === 'swim';
  const moving = !!(a.walking || a.flying);
  const drill = !moving && !swim ? a.drill : '';
  const writing = !moving && !swim && !drill && a.state === 'working' && a.b.id === LEAD_ID;
  const typing = !moving && !swim && !drill && a.state === 'working' && !writing;
  a.el.classList.toggle('sit', a.pose === 'sit' || drill === 'bike');
  a.el.classList.toggle('swim', swim);
  a.el.classList.toggle('walk', (moving && !swim) || drill === 'run');
  a.el.classList.toggle('run', drill === 'run');
  a.el.classList.toggle('bike', drill === 'bike');
  a.el.classList.toggle('lift', drill === 'lift');
  a.el.classList.toggle('type', typing);
  a.el.classList.toggle('write', writing);
  a.el.classList.toggle('sway', !moving && !typing && !writing && !swim && !drill);
  const bob = moving ? Math.sin(a.phase) * 0.55 : 0;
  let lean = a.lean || 0;
  if (!swim && !moving && !typing && !writing && !drill) lean += Math.sin(a.phase + a.i) * 3.2;
  a.el.style.left = a.x + '%';
  a.el.style.top = (a.y + bob + extra) + '%';
  a.el.style.zIndex = String(20 + Math.round(a.y));
  a.el.style.transform = swim ? 'translate(-50%, -58%)' : 'translate(-50%, -100%)';
  if (a.body) {
    a.body.style.transform = swim
      ? `rotate(${a.swimRot}deg)`
      : `scaleX(${a.facing || 1}) rotate(${lean}deg)`;
  }
  const show = swim;
  a.wave.style.display = show ? 'block' : 'none';
  if (show) {
    const s = 0.85 + 0.2 * Math.sin(a.phase * 0.6);
    a.wave.style.left = a.x + '%';
    a.wave.style.top = (a.y + 1.2) + '%';
    a.wave.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
}

let pen = null, acc = 0;
const strokes = [];
export function setRack(on) {
  const glow = document.getElementById('rack-glow');
  if (glow) glow.classList.toggle('on', !!on);
}

export function stepBoard(dt, active) {
  const board = document.getElementById('board');
  const svg = document.getElementById('board-svg');
  if (board) board.style.display = active ? 'block' : 'none';
  if (!svg || !active) return;
  acc += dt;
  if (acc < 0.07) return;
  acc = 0;
  if (!pen || pen.n > 14) {
    if (strokes.length > 7) strokes.shift();
    pen = { x: 8 + Math.random() * 80, y: 8 + Math.random() * 44, n: 0, d: '' };
    strokes.push(pen);
  }
  pen.x = Math.max(4, Math.min(96, pen.x + (Math.random() - 0.4) * 7));
  pen.y = Math.max(4, Math.min(56, pen.y + (Math.random() - 0.5) * 4));
  pen.d += `${pen.n ? 'L' : 'M'}${pen.x.toFixed(1)} ${pen.y.toFixed(1)}`;
  pen.n += 1;
  svg.innerHTML = strokes.map((s) => (
    `<path d="${s.d}" fill="none" stroke="#2c4f86" stroke-width="1.4" stroke-linecap="round"/>`
  )).join('');
}
