import { TEAM } from './team.js';
import { BOARD_BOX } from './positions.js';
import { propSvg } from './props.js';

export const actors = new Map();
export let deon = null;

function makeActor(root, b) {
  const el = document.createElement('div');
  el.className = 'actor';
  el.innerHTML = `<img alt="" src="/sprites/${b.id}.png">${propSvg(b)}<span class="tag"></span><span class="q"></span>`;
  const tag = el.querySelector('.tag');
  tag.textContent = b.short;
  tag.title = b.name;
  el.addEventListener('click', (e) => { e.stopPropagation(); el.classList.toggle('open'); });
  root.appendChild(el);
  return {
    b, el, img: el.querySelector('img'), tag, badge: el.querySelector('.q'),
    x: 50, y: 40, path: [], walking: false, flying: null, state: 'idle', line: '',
    target: null, pose: 'stand', home: null, queueRank: 0, queueKind: '',
    facing: 1, i: 0,
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
    pointerEvents: 'none', zIndex: '1', display: 'none',
  });
  board.innerHTML = '<svg id="board-svg" viewBox="0 0 100 60" width="100%" height="100%"></svg>';
  root.appendChild(board);
  TEAM.forEach((b, i) => {
    const a = makeActor(root, b);
    a.i = i;
    actors.set(b.id, a);
  });
  deon = makeActor(root, { id: 'deon', name: 'Deon', short: 'Deon' });
  deon.i = 3;
}

export function paint(a) {
  a.el.style.left = a.x + '%';
  a.el.style.top = a.y + '%';
  a.el.style.zIndex = String(20 + Math.round(a.y));
  a.el.style.transform = 'translate(-50%, -100%)';
  a.img.style.transform = `scaleX(${a.facing || 1})`;
}

let pen = null, acc = 0;
const strokes = [];
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
