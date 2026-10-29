import { TEAM, LEAD_ID } from './team.js';
import { actors } from './sprites.js';

const STALE_WORKING_MS = 10 * 60 * 1000;
const WARN_SILENCE_MS = 45 * 60 * 1000;
const POLL_MS = 20000;

const statusById = new Map();
const queuedAt = new Map();
let simulating = false;
let lastLive = null;
let setState = () => {};

export const isSim = () => simulating;
export const getStatus = (id) => statusById.get(id);

function priorityOf(status) {
  if (!status || status.priority == null || status.priority === '') return null;
  const n = Number(status.priority);
  return Number.isFinite(n) ? n : null;
}

export function noteQueue(id, state, status) {
  const queued = state === 'waiting' || state === 'chief';
  if (!queued) { queuedAt.delete(id); return; }
  const prev = queuedAt.get(id);
  const same = status && status.state === state;
  const server = same && (status.waiting_since || status.updated_at);
  if (server) queuedAt.set(id, { state, at: new Date(server).getTime() });
  else if (!prev || prev.state !== state) queuedAt.set(id, { state, at: Date.now() + queuedAt.size * 0.001 });
}

export function orderOf(kind) {
  const rows = [];
  for (const a of actors.values()) {
    if (a.state !== kind) continue;
    const status = statusById.get(a.b.id);
    const stamp = queuedAt.get(a.b.id);
    rows.push({
      id: a.b.id,
      lead: kind === 'waiting' && a.b.id === LEAD_ID,
      priority: priorityOf(status),
      at: stamp && stamp.state === kind ? stamp.at : 0,
    });
  }
  rows.sort((a, b) => {
    if (a.lead !== b.lead) return a.lead ? -1 : 1;
    const ap = a.priority == null, bp = b.priority == null;
    if (ap !== bp) return ap ? 1 : -1;
    if (!ap && a.priority !== b.priority) return a.priority - b.priority;
    return a.at - b.at || a.id.localeCompare(b.id);
  });
  return rows;
}

const fmtET = (d) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(d) + ' ET';

function usageCopy(u) {
  const pct = u && u.remaining_pct != null ? Number(u.remaining_pct) : NaN;
  if (!Number.isFinite(pct)) return { has: false, main: 'No reading yet', sub: '', left: null };
  const left = Math.round(Math.max(0, Math.min(100, pct)));
  let sub = '';
  if (u.resets_at) { const d = new Date(u.resets_at); if (!isNaN(d.getTime())) sub = `Resets ${fmtET(d)}`; }
  return { has: true, main: `${left}% left · ${100 - left}% used`, sub, left };
}

export function drawUsage(u) {
  const copy = usageCopy(u);
  const main = document.getElementById('usage-main');
  const sub = document.getElementById('usage-sub');
  const meter = document.getElementById('usage-meter');
  const fill = document.getElementById('usage-fill');
  const sign = document.getElementById('sign-line');
  if (main) main.textContent = copy.main;
  if (sub) sub.textContent = copy.sub || '';
  if (sign) sign.textContent = copy.has ? `${copy.left}% left` : 'No reading yet';
  if (!meter || !fill) return;
  if (!copy.has) meter.style.display = 'none';
  else {
    meter.style.display = 'block';
    fill.style.width = `${copy.left}%`;
    fill.style.background = copy.left < 15 ? '#c98a6a' : '#7eabc4';
  }
}

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
  for (const t of TEAM) {
    const s = byId.get(t.id);
    if (s) setState(t.id, effective(s, now), s.line);
    else setState(t.id, 'idle', '');
  }
  drawUsage(data.usage);
}

function warnFrom(data) {
  const warnEl = document.getElementById('warn');
  const now = new Date(data.now).getTime() || Date.now();
  const signals = [data.last_heartbeat, ...(data.statuses || []).map((s) => s.updated_at)].filter(Boolean).map((x) => new Date(x).getTime());
  const latest = signals.length ? Math.max(...signals) : 0;
  if (!latest || now - latest > WARN_SILENCE_MS) {
    warnEl.textContent = 'No heartbeat or status push for 45+ min';
    warnEl.style.display = 'block';
  } else warnEl.style.display = 'none';
}

async function poll() {
  const warnEl = document.getElementById('warn');
  try {
    const r = await fetch('/api/state', { cache: 'no-store', credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/login.html' + location.search; return; }
    if (!r.ok) throw new Error('feed');
    const data = await r.json();
    lastLive = data;
    warnFrom(data);
    if (!simulating) applyLive(data);
  } catch {
    warnEl.textContent = 'Status feed unavailable';
    warnEl.style.display = 'block';
  }
}

function listen() {
  let es;
  const open = () => {
    es = new EventSource('/api/events');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        lastLive = data;
        warnFrom(data);
        if (!simulating) applyLive(data);
      } catch { /* ignore malformed frame */ }
    };
    es.onerror = () => { es.close(); setTimeout(open, 8000); };
  };
  open();
}

const simLines = {
  working: ['Processing tasks', 'Reviewing documents', 'Running checks', 'Preparing summary'],
  waiting: ['Waiting on Deon'],
  chief: ['Needs Master Chief'],
  handoff: ['Handing off to lead'],
  error: ['Hit an error, retrying'],
  idle: [''],
};
let simTimer = null;

function simTick() {
  const ids = TEAM.map((t) => t.id);
  const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const r = Math.random();
    const st = r < 0.45 ? 'working' : r < 0.58 ? 'waiting' : r < 0.68 ? 'chief' : r < 0.8 ? 'handoff' : r < 0.86 ? 'error' : 'idle';
    const ls = simLines[st];
    setState(id, st, ls[Math.floor(Math.random() * ls.length)]);
  }
}

function bindSim() {
  const btn = document.getElementById('simbtn');
  const lbl = document.getElementById('sim');
  const start = () => {
    simulating = true;
    lbl.style.display = 'block';
    btn.textContent = 'Stop Simulation';
    simTick();
    simTimer = setInterval(simTick, 2500);
  };
  const stop = () => {
    simulating = false;
    clearInterval(simTimer);
    lbl.style.display = 'none';
    btn.textContent = 'Simulate Work';
    if (lastLive) applyLive(lastLive);
    else TEAM.forEach((t) => setState(t.id, 'idle', ''));
  };
  btn.onclick = () => (simulating ? stop() : start());
  if (new URLSearchParams(location.search).get('simulate') === '1') start();
}

export function boot(applyState) {
  setState = applyState;
  bindSim();
  drawUsage(null);
  if (new URLSearchParams(location.search).has('preview')) return;
  poll();
  setInterval(poll, POLL_MS);
  listen();
}
