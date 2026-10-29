// Local stand-in for Vercel (functions + middleware + static dist) for testing only.
// Reads the same env vars as production. Optional files under /home/box/.bot-office/ fill any that are unset.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
function fromFile(name) {
  try { return fs.readFileSync('/home/box/.bot-office/' + name, 'utf8').trim(); } catch { return ''; }
}
function need(envName, fileName) {
  return process.env[envName] || fromFile(fileName);
}
Object.assign(process.env, {
  SUPABASE_URL: need('SUPABASE_URL', 'supabase-url'),
  SUPABASE_PUBLISHABLE_KEY: need('SUPABASE_PUBLISHABLE_KEY', 'publishable-key'),
  BOT_OFFICE_DB_SECRET: need('BOT_OFFICE_DB_SECRET', 'db-secret'),
  BOT_OFFICE_PUSH_TOKEN: need('BOT_OFFICE_PUSH_TOKEN', 'push-token'),
  OFFICE_COOKIE_SECRET: need('OFFICE_COOKIE_SECRET', 'cookie-secret'),
});
const mw = (await import('./middleware.js'));
const re = new RegExp('^' + mw.config.matcher[0].replace('/((?!', '/(?!').replace(').*)', ').*') + '$');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'); let chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  if (re.test(url.pathname)) {
    const r = await mw.default(new Request('http://' + req.headers.host + req.url, { headers: req.headers }));
    if (r) { res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(await r.text()); }
  }
  if (url.pathname.startsWith('/api/')) {
    const h = (await import('./api/' + url.pathname.slice(5) + '.js')).default;
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
    res.status = (c) => { res.statusCode = c; return res; }; res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
    return h(req, res);
  }
  let f = path.join('dist', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
}).listen(4180, () => console.log('up'));
