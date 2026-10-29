import { actors, deon, paint } from './sprites.js';
import { getStatus, noteQueue, orderOf } from './state.js';
import {
  LEAD_ID, CODING_ID, NORSE_ID, DESK, CHIEF_DESK, CHIEF_BOARD, CODING_WORK,
  loungeFor, WAIT, CHIEF_WAIT, HANDOFF, GYM, GYM_ORDER, STATION_MS, CIRCUIT_MS,
  DEON_ROOM, DEON_SIT,
} from './positions.js';

const SPEED = 16;

function route2D(from, to) {
  const hall = (p) => (p.y < 34 ? { x: p.x, y: 32.6 } : p.y > 66 ? { x: p.x, y: 65 } : { x: p.x, y: p.y });
  const a = hall(from), b = hall(to), pts = [];
  if (Math.hypot(from.x - a.x, from.y - a.y) > 1.4) pts.push(a);
  if (Math.abs(a.x - b.x) > 1 && Math.abs(a.y - b.y) > 1) pts.push({ x: b.x, y: a.y });
  if (Math.hypot(b.x - to.x, b.y - to.y) > 1.4) pts.push(b);
  pts.push({ x: to.x, y: to.y });
  return pts;
}

function place(a, spot) {
  a.x = spot.x;
  a.y = spot.y;
  a.pose = spot.pose || 'stand';
  a.walking = false;
  a.path = [];
  a.flying = null;
  paint(a);
}

function go(a, spot, prev, instant) {
  const next = { x: spot.x, y: spot.y, pose: spot.pose || 'stand' };
  a.target = next;
  if (instant || !prev) { place(a, next); return; }
  const dist = Math.hypot(a.x - next.x, a.y - next.y);
  const fly = a.b.id !== LEAD_ID && a.b.id !== CODING_ID && dist > 22 && ['working', 'error', 'handoff'].includes(a.state);
  a.pose = 'stand';
  if (fly) {
    a.walking = false;
    a.path = [];
    a.flying = { t: 0, dur: 1, x0: a.x, y0: a.y, x1: next.x, y1: next.y };
    paint(a);
    return;
  }
  a.path = route2D(a, next);
  a.walking = true;
  paint(a);
}

function spotOn(list, i) {
  if (i < list.length) return list[i];
  const base = list[i % list.length];
  return { ...base, x: base.x - 2.2 * (Math.floor(i / list.length)) };
}

function targetFor(id, state) {
  if (state === 'waiting') return spotOn(WAIT, Math.max(0, orderOf('waiting').findIndex((w) => w.id === id)));
  if (state === 'chief') return spotOn(CHIEF_WAIT, Math.max(0, orderOf('chief').findIndex((w) => w.id === id)));
  if (id === LEAD_ID) {
    if (state === 'working') return CHIEF_BOARD;
    if (state === 'error') return { x: CHIEF_DESK.x, y: CHIEF_DESK.y + 2.4, pose: 'stand' };
    if (state === 'handoff') return { x: 26.2, y: 33.4, pose: 'stand' };
    return { ...loungeFor(id), pose: 'stand' };
  }
  if (id === CODING_ID) {
    if (state === 'working' || state === 'error') return CODING_WORK;
    if (state === 'handoff') return HANDOFF[0];
    return { ...loungeFor(id), pose: 'stand' };
  }
  const desk = DESK[id];
  if (state === 'working') return { x: desk.x, y: desk.y, pose: 'sit' };
  if (state === 'error') return { ...desk.stand, pose: 'stand' };
  if (state === 'handoff') {
    let h = 0;
    for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    return HANDOFF[h % HANDOFF.length];
  }
  return { ...loungeFor(id), pose: 'stand' };
}

export function syncQueue() {
  const waiting = orderOf('waiting');
  const chiefs = orderOf('chief');
  const queued = new Set([...waiting, ...chiefs].map((w) => w.id));
  for (const a of actors.values()) {
    if (queued.has(a.b.id)) continue;
    a.el.classList.remove('queued');
    a.badge.textContent = '';
    a.queueRank = 0;
    a.queueKind = '';
  }
  const placeLine = (order, spots, kind) => {
    order.forEach((w, i) => {
      const a = actors.get(w.id);
      const spot = { ...spotOn(spots, i), pose: 'stand' };
      a.el.classList.add('queued');
      a.badge.textContent = String(i + 1);
      const same = a.queueRank === i + 1 && a.queueKind === kind && a.target
        && a.target.x === spot.x && a.target.y === spot.y;
      a.queueRank = i + 1;
      a.queueKind = kind;
      if (same || a.walking || a.flying) { a.target = spot; return; }
      const prev = a.target;
      if (prev && (prev.x !== spot.x || prev.y !== spot.y)) go(a, spot, prev, false);
      else { a.target = spot; if (!prev) place(a, spot); }
    });
  };
  placeLine(waiting, WAIT, 'waiting');
  placeLine(chiefs, CHIEF_WAIT, 'chief');
  const qEl = document.getElementById('queue');
  if (!qEl) return;
  if (!waiting.length) { qEl.style.display = 'none'; qEl.textContent = ''; return; }
  qEl.style.display = 'block';
  qEl.textContent = 'Waiting on you: ' + waiting.map((w, i) => `${i + 1} ${actors.get(w.id).b.short}`).join(', ');
}

export function setState(id, state, line, instant = false) {
  const a = actors.get(id);
  if (!a) return;
  a.line = line || '';
  a.tag.textContent = a.line ? `${a.b.short} · ${a.line}` : a.b.short;
  const changed = a.state !== state || !a.target;
  if (!changed) return;
  const prev = a.target;
  a.state = state;
  noteQueue(id, state, getStatus(id));
  if (state === 'waiting' || state === 'chief') { syncQueue(); return; }
  go(a, targetFor(id, state), prev, instant);
  syncQueue();
}

function stepActor(a, dt) {
  if (a.flying) {
    const f = a.flying;
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    const e = u * u * (3 - 2 * u);
    a.x = f.x0 + (f.x1 - f.x0) * e;
    a.y = f.y0 + (f.y1 - f.y0) * e - Math.sin(u * Math.PI) * 5;
    a.facing = f.x1 < f.x0 ? -1 : 1;
    if (u >= 1) place(a, a.target);
    else paint(a);
    return;
  }
  if (!a.walking) return;
  const p = a.path[0];
  if (!p) { place(a, a.target); return; }
  const dx = p.x - a.x, dy = p.y - a.y, dist = Math.hypot(dx, dy), step = SPEED * dt;
  if (dist <= step) {
    a.x = p.x; a.y = p.y; a.path.shift();
    if (!a.path.length) { place(a, a.target); return; }
  } else {
    a.x += (dx / dist) * step;
    a.y += (dy / dist) * step;
    if (Math.abs(dx) > 0.15) a.facing = dx < 0 ? -1 : 1;
  }
  paint(a);
}

let gymJob = null;
function gymPlan(now) {
  const idle = [...actors.values()].filter((a) => a.state === 'idle' && a.b.id !== CODING_ID && a.b.id !== LEAD_ID).map((a) => a.b.id).sort();
  if (!idle.length) return null;
  const wheel = [];
  for (const id of idle) { wheel.push(id); if (id === NORSE_ID) wheel.push(id, id); }
  const circuit = Math.floor(now / CIRCUIT_MS);
  const phase = Math.min(GYM_ORDER.length - 1, Math.floor((now % CIRCUIT_MS) / STATION_MS));
  return { id: wheel[circuit % wheel.length], kind: GYM_ORDER[phase], circuit };
}

function train(a, kind, t) {
  const st = GYM[kind];
  if (kind === 'swim') {
    const lap = (t * 0.12) % 2;
    const going = lap < 1;
    const along = going ? lap : 2 - lap;
    a.x = st.x + (st.x1 - st.x) * along;
    a.y = st.y;
    a.facing = going ? 1 : -1;
  } else {
    a.x = st.x;
    a.y = st.y;
  }
  a.pose = 'stand';
  paint(a);
}

function syncGym(now, t) {
  const plan = gymPlan(now);
  if (gymJob && gymJob.phase === 'back') {
    const prev = actors.get(gymJob.id);
    if (!prev || prev.state !== 'idle' || !prev.walking) gymJob = null;
    else return;
  }
  if (gymJob && (!plan || plan.id !== gymJob.id || plan.circuit !== gymJob.circuit)) {
    const prev = actors.get(gymJob.id);
    const same = !!(plan && prev && plan.id === gymJob.id);
    if (prev && prev.state === 'idle' && !prev.flying) {
      go(prev, prev.home || { ...loungeFor(prev.b.id), pose: 'sit' }, prev.target, false);
      prev.home = null;
    }
    gymJob = same ? { id: plan.id, phase: 'back', circuit: plan.circuit } : null;
    if (same) return;
  }
  if (!plan) return;
  const bot = actors.get(plan.id);
  if (!bot || bot.state !== 'idle' || bot.flying) return;
  const st = GYM[plan.kind];
  if (!gymJob) {
    if (bot.walking) return;
    bot.home = bot.target;
    go(bot, st, bot.target, false);
    gymJob = { id: plan.id, kind: plan.kind, circuit: plan.circuit };
    return;
  }
  if (plan.kind !== gymJob.kind) {
    go(bot, st, bot.target, false);
    gymJob.kind = plan.kind;
    return;
  }
  if (bot.walking) return;
  train(bot, plan.kind, t);
}

function pickDeon() {
  if (Math.random() < 0.05) return { ...DEON_SIT, sit: true };
  return {
    x: DEON_ROOM.x0 + Math.random() * (DEON_ROOM.x1 - DEON_ROOM.x0),
    y: DEON_ROOM.y0 + Math.random() * (DEON_ROOM.y1 - DEON_ROOM.y0),
  };
}

export function primeDeon() {
  deon.x = 12.2;
  deon.y = 26;
  deon.mode = 'hold';
  deon.until = 0.8;
  deon.pose = 'stand';
  deon.facing = 1;
  paint(deon);
}

function stepDeon(dt) {
  if (deon.mode !== 'walk') {
    deon.until -= dt;
    if (deon.until > 0) return;
    deon.goal = pickDeon();
    deon.mode = 'walk';
    deon.pose = 'stand';
    deon.walking = true;
  }
  const g = deon.goal;
  const dx = g.x - deon.x, dy = g.y - deon.y, dist = Math.hypot(dx, dy), step = 7 * dt;
  if (dist <= Math.max(step, 0.35)) {
    deon.x = g.x; deon.y = g.y; deon.walking = false;
    if (g.sit) { deon.mode = 'sit'; deon.pose = 'sit'; deon.until = 2.8; }
    else { deon.mode = 'hold'; deon.pose = 'stand'; deon.until = 0.7; }
    paint(deon);
    return;
  }
  deon.x = Math.min(DEON_ROOM.x1, Math.max(DEON_ROOM.x0, deon.x + (dx / dist) * step));
  deon.y = Math.min(DEON_ROOM.y1, Math.max(DEON_ROOM.y0, deon.y + (dy / dist) * step));
  if (Math.abs(dx) > 0.2) deon.facing = dx < 0 ? -1 : 1;
  paint(deon);
}

export function stepAll(dt, t) {
  for (const a of actors.values()) stepActor(a, dt);
  stepDeon(dt);
  syncGym(Date.now(), t);
}

export function snapshot() {
  return [...actors.values()].map((a) => ({
    id: a.b.id, state: a.state, x: +a.x.toFixed(4), z: +a.y.toFixed(4), y: 0, ry: 0, legs: 0,
  }));
}
