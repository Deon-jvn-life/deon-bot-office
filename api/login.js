import { safeEq, cookieValue, body } from './_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const b = await body(req);
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!process.env.OFFICE_SITE_PASSWORD || !pw || !safeEq(pw, process.env.OFFICE_SITE_PASSWORD)) {
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ ok: false });
  }
  res.setHeader('Set-Cookie', `office_auth=${cookieValue()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
  return res.status(200).json({ ok: true });
}
