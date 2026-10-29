import { TEAM, LEAD_ID } from './team.js';
import { mountCast, actors, stepBoard } from './sprites.js';
import { boot, isSim } from './state.js';
import { setState, stepAll, primeDeon, snapshot } from './move.js';

mountCast();
for (const t of TEAM) setState(t.id, 'idle', '', true);
primeDeon();
boot(setState);

let last = 0;
function frame(now) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  const t = now / 1000;
  stepAll(dt, t);
  const chief = actors.get(LEAD_ID);
  const writing = !!(chief && chief.state === 'working' && !chief.walking && !chief.flying);
  stepBoard(dt, writing);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__office = {
  bots: snapshot,
  pixelRatio: () => window.devicePixelRatio || 1,
  simulating: () => isSim(),
  setState,
};
