export const config = { matcher: ['/((?!api/login|api/push|api/usage|login\\.html|favicon\\.svg).*)'] };
async function expected(secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('office-v1'));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export default async function middleware(request) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(/(?:^|;\s*)office_auth=([a-f0-9]{64})/);
  const secret = process.env.OFFICE_COOKIE_SECRET;
  if (secret && m && m[1] === await expected(secret)) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return Response.redirect(new URL('/login.html' + (url.search || ''), request.url), 302);
}
