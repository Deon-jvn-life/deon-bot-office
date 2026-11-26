import { bearerOk, rpc, body } from './_lib.js';
import { resolveUsageBots, ACCEPTED_USAGE_NAMES } from './usage-bots.js';

// POST /api/usage
// Authorization: Bearer <BOT_OFFICE_PUSH_TOKEN>
//
// Body (bots is optional; a push without it stays valid):
// {
//   "remaining_pct": 49,
//   "resets_at": "2026-12-01T12:00:00.000Z",
//   "bots": { "Master Chief": 70, "Adjutant": 24, "Refugee": 3, "Job Hunter": 3 }
// }
//
// remaining_pct is the percent of the weekly allowance still left (0-100).
// resets_at is optional ISO 8601.
// bots maps a display name to that bot's share of this week's usage, in percent.
// Omitted bots are shown as 0. Accepted names: ACCEPTED_USAGE_NAMES below.
// Stored shares are keyed by bot id. Unknown names return 400 with `accepted`.
export { ACCEPTED_USAGE_NAMES };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!bearerOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = await body(req);
  const pct = Number(b.remaining_pct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return res.status(400).json({ error: 'remaining_pct must be 0-100' });
  let resets = null;
  if (b.resets_at) { const d = new Date(b.resets_at); if (isNaN(d)) return res.status(400).json({ error: 'resets_at must be ISO 8601' }); resets = d.toISOString(); }
  const shares = resolveUsageBots(b.bots);
  if (!shares.ok) return res.status(shares.status).json({ error: shares.error, ...(shares.accepted ? { accepted: shares.accepted } : {}) });
  try { await rpc('bot_office_push_usage', { p_pct: pct, p_resets: resets, p_bots: shares.bots }); return res.status(200).json({ ok: true }); }
  catch { return res.status(502).json({ error: 'store failed' }); }
}
