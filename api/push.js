import { bearerOk, rpc, body, BOTS, STATES, MAX_LINE } from './_lib.js';
// Rule: status lines are short and generic (max 60 chars, printable text only), no private details.
// Coding Helper: send bot_id "coder". It is stored as "coding-helper", the id the office uses.
// "coding-helper" is still accepted. working types at the server racks; idle sits in the chair beside them.
export function canonicalBotId(raw) {
  const bot = String(raw || '').trim().toLowerCase();
  return bot === 'coder' ? 'coding-helper' : bot;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!bearerOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = await body(req);
  const bot = canonicalBotId(b.bot_id);
  let state = String(b.state || '').toLowerCase();
  if (state === 'done/idle') state = 'done';
  const line = String(b.line ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  let priority = null;
  if (b.priority != null && b.priority !== '') {
    const n = Number(b.priority);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'priority must be a number or null' });
    priority = Math.trunc(n);
  }
  if (!BOTS.has(bot)) return res.status(400).json({ error: 'unknown bot_id' });
  if (!STATES.has(state)) return res.status(400).json({ error: 'state must be working|waiting|handoff|error|done|idle|chief' });
  if (line.length > MAX_LINE) return res.status(400).json({ error: `line too long (max ${MAX_LINE} chars)` });
  try { await rpc('bot_office_push', { p_bot: bot, p_state: state, p_line: line, p_priority: priority }); return res.status(200).json({ ok: true }); }
  catch { return res.status(502).json({ error: 'store failed' }); }
}
