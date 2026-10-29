import { TEAM, LEAD_ID } from './team.js';

export const CODING_ID = 'coding-helper';
export const NORSE_ID = 'd6c82145-5a65-4faa-a9d3-441c60493abf';
export { LEAD_ID };

export const DEON_ROOM = { x0: 5.2, x1: 17.6, y0: 19.5, y1: 30.2 };
export const DEON_SIT = { x: 12.4, y: 24.6 };

export const CHIEF_DESK = { x: 25.6, y: 24.6, pose: 'sit' };
export const CHIEF_BOARD = { x: 24.4, y: 19.4, pose: 'stand' };
export const BOARD_BOX = { x: 20.8, y: 12.6, w: 7.2, h: 5.4 };

const sky = [[14.6, 41.6], [21.4, 41.4], [28.0, 41.8], [13.6, 58.6], [23.2, 58.8]];
const mission = [[44.2, 47.8], [50.2, 47.6], [56.4, 47.8], [62.2, 48.0]];
const personal = [[73.0, 42.4], [80.4, 42.2], [88.0, 42.6], [77.2, 58.8]];
const chairs = [...sky, ...mission, ...personal];

export const DESK = {};
TEAM.filter((b) => b.id !== LEAD_ID && b.id !== CODING_ID).forEach((b, i) => {
  const [x, y] = chairs[i];
  DESK[b.id] = { x, y, pose: 'sit', stand: { x, y: y + 3.4 } };
});

export const CODING_WORK = { x: 86.4, y: 75.2, pose: 'stand' };

export const LOUNGE = [
  { x: 44.2, y: 26.2 }, { x: 48.2, y: 24.2 }, { x: 52.2, y: 23.4 }, { x: 56.4, y: 24.4 },
  { x: 60.8, y: 26.4 }, { x: 45.4, y: 29.6 }, { x: 50.2, y: 28.8 }, { x: 55.2, y: 29.8 },
  { x: 59.6, y: 29.4 }, { x: 42.8, y: 28.0 }, { x: 47.2, y: 27.2 }, { x: 53.6, y: 26.8 },
  { x: 57.8, y: 27.4 }, { x: 62.6, y: 28.8 },
];

export const WAIT = [6.4, 9.4, 12.4, 15.4, 18.4, 21.2, 8.0, 14.0].map((x, i) => ({
  x, y: i < 6 ? 33.2 : 35.4, pose: 'stand',
}));

export const CHIEF_WAIT = [32.2, 35.2, 38.2, 41.0].map((x) => ({ x, y: 31.6, pose: 'stand' }));

export const HANDOFF = Array.from({ length: 13 }, (_, i) => ({
  x: 33.2 + (i % 4) * 2.3,
  y: 27.4 + ((i / 4) | 0) * 2.5,
  pose: 'stand',
}));

export const GYM = {
  swim: { x: 34.4, x1: 41.0, y: 80.2, pose: 'swim' },
  bike: { x: 57.0, y: 75.6, pose: 'sit' },
  run: { x: 47.6, y: 78.2, pose: 'stand' },
  lift: { x: 55.4, y: 86.0, pose: 'stand' },
  stretch: { x: 62.6, y: 80.4, pose: 'stand' },
};

export const GYM_ORDER = ['swim', 'bike', 'run', 'lift', 'stretch'];
export const STATION_MS = 15000;
export const CIRCUIT_MS = 75000;

export function loungeFor(id) {
  const i = TEAM.findIndex((t) => t.id === id);
  return LOUNGE[(i < 0 ? 0 : i) % LOUNGE.length];
}
