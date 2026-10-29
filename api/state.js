import { hasSession, rpc } from './_lib.js';
export default async function handler(req, res) {
  if (!hasSession(req)) return res.status(401).json({ error: 'unauthorized' });
  res.setHeader('Cache-Control', 'no-store');
  try { return res.status(200).json(await rpc('bot_office_read', {})); }
  catch { return res.status(502).json({ error: 'feed unavailable' }); }
}
