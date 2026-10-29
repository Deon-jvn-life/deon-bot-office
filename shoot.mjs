import { chromium } from 'playwright';
const [,, base, mode] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = '/workspace/bot-office/shots/';
async function page(w, h, dpr = 1) { const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); return [ctx, await ctx.newPage()]; }
const errs = [];
if (mode === 'local') {
  let [ctx, p] = await page(1440, 900);
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(base + '/?preview=1'); await p.waitForTimeout(6000);
  await p.screenshot({ path: out + 'a-local-build.png' });
  const b1 = await p.evaluate(() => window.__office.bots());
  await p.screenshot({ path: out + 'b1-idle-t0.png' }); await p.waitForTimeout(1000);
  await p.screenshot({ path: out + 'b2-idle-t1s.png' });
  const b2 = await p.evaluate(() => window.__office.bots());
  console.log('idle identical:', JSON.stringify(b1) === JSON.stringify(b2), 'pixelRatio', await p.evaluate(() => window.__office.pixelRatio()));
  await ctx.close();
  [ctx, p] = await page(1440, 900);
  await p.goto(base + '/?preview=1&simulate=1'); await p.waitForTimeout(40000);
  await p.screenshot({ path: out + 'c-simulation.png' });
  console.log('sim states', (await p.evaluate(() => window.__office.bots())).map(b => b.state).join(','));
}
console.log('errors', errs);
await browser.close();
