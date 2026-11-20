// node round.mjs "Map" "Disaster" [seconds] : play a real (fast) round with bots, report errors
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [map, dis, secs = '90'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:8765/index.html?map=${encodeURIComponent(map)}&disaster=${encodeURIComponent(dis)}&bots=6&autostart&fast&low&seed=3`);
const phases = new Set();
const t0 = Date.now();
while (Date.now() - t0 < Number(secs) * 1000) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => { const g = window.game; return g ? `${g.round.phase}:${g.map?.name || '-'}:${g.chars.filter(c => c.alive && c.inRound).length}` : 'loading'; });
  phases.add(s.split(':')[0]);
  if (phases.has('survivors') || (phases.has('disaster') && s.startsWith('intermission'))) break;
}
const end = await page.evaluate(() => { const g = window.game; return { phase: g.round.phase, map: g.map?.name, survivors: g.chars.filter(c => c.alive && c.inRound).map(c => c.name), rocket: g.map?.extras?.rocket?.state }; });
console.log(map, '/', dis, '| phases', [...phases].join(','), '|', JSON.stringify(end).slice(0, 300));
await page.screenshot({ path: new URL(`./mc/round-${map.replace(/\W/g, '')}.png`, import.meta.url).pathname });
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join('\n') : 'no errors');
await browser.close();
