import { hasSession, rpc } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!hasSession(req)) return res.status(401).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });
  const send = async () => {
    try {
      const data = await rpc('bot_office_read', {});
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch { /* next tick retries */ }
  };
  await send();
  await new Promise((resolve) => {
    const iv = setInterval(send, 10000);
    req.on?.('close', () => { clearInterval(iv); resolve(); });
    setTimeout(() => { clearInterval(iv); res.end(); resolve(); }, 20000);
  });
}
