import { bearerOk, rpc, body } from './_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!bearerOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = await body(req);
  const pct = Number(b.remaining_pct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return res.status(400).json({ error: 'remaining_pct must be 0-100' });
  let resets = null;
  if (b.resets_at) { const d = new Date(b.resets_at); if (isNaN(d)) return res.status(400).json({ error: 'resets_at must be ISO 8601' }); resets = d.toISOString(); }
  try { await rpc('bot_office_push_usage', { p_pct: pct, p_resets: resets }); return res.status(200).json({ ok: true }); }
  catch { return res.status(502).json({ error: 'store failed' }); }
}
