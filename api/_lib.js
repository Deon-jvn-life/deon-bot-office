import crypto from 'node:crypto';
export const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const DB_SECRET = process.env.BOT_OFFICE_DB_SECRET;
export const BOTS = new Set(['8ab7d38a-8b50-4d19-abb0-aa40a5ae686b','494e6a0b-f66d-46b6-9c45-05b43f727e23','c7e14019-a299-4198-a4c6-d878a787c23e','4de86d3f-f8a8-4859-84a2-884b8031ef1c','9333ecc7-45be-4392-a622-6957398653db','5b53350b-0b86-44df-b07b-3fa591306f66','d6c82145-5a65-4faa-a9d3-441c60493abf','109831fb-78b0-4a9f-aca9-77c6e1409cc6','ae91fc3d-620b-4171-a606-2e2e85be812e','7b2cd5b6-987e-497f-997f-82a80e00e536','ddee92a4-84b0-4e8d-83af-faf742ce5fec','68813f6b-9092-41fb-a5d1-d80fbcbb9066','c5678fef-5ebd-40d8-9a1a-d6a35a84cf0b','0b8a07e0-8948-4ca1-a332-8fde70805e8d']);
export const STATES = new Set(['working','waiting','handoff','error','done','idle']);
export const MAX_LINE = 60;
export function safeEq(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
export function cookieValue() {
  return crypto.createHmac('sha256', process.env.OFFICE_COOKIE_SECRET).update('office-v1').digest('hex');
}
export function hasSession(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|;\s*)office_auth=([a-f0-9]{64})/);
  return !!m && safeEq(m[1], cookieValue());
}
export function bearerOk(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return !!t && !!process.env.BOT_OFFICE_PUSH_TOKEN && safeEq(t, process.env.BOT_OFFICE_PUSH_TOKEN);
}
export async function rpc(fn, args) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_secret: DB_SECRET, ...args }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}`);
  return text ? JSON.parse(text) : null;
}
export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}
