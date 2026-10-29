import { chromium } from 'playwright';
const [,, base, prefix] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = '/workspace/bot-office/shots/';
for (const [w, h, name, dpr] of [[1440, 900, 'desktop-1440x900', 1], [390, 844, 'phone-390x844', 3]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: name.startsWith('phone'), hasTouch: name.startsWith('phone') });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(base + '/'); console.log(name, 'landed on', new URL(p.url()).pathname);
  await p.fill('#p', 'definitely-wrong'); await p.click('button'); await p.waitForTimeout(1500);
  console.log(name, 'wrong pw msg:', await p.textContent('#e'), 'still', new URL(p.url()).pathname);
  await p.fill('#p', process.env.OFFICE_SITE_PASSWORD); await p.click('button');
  await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 15000 }); await p.waitForTimeout(12000);
  const chief = (await p.evaluate(() => window.__office.bots()))[0];
  console.log(name, 'chief', chief.state, 'pr', await p.evaluate(() => window.__office.pixelRatio()), 'warn', await p.evaluate(() => getComputedStyle(document.getElementById('warn')).display), errs);
  await p.screenshot({ path: `${out}${prefix}-${name}.png` });
  await ctx.close();
}
await browser.close();
