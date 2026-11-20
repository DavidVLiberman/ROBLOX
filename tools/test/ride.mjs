// node ride.mjs "Map" seatIndex seconds : sit in a seat and let the ride carry you
import { openGame, loadMap } from './common.mjs';
const [map, si = '0', secs = '20'] = process.argv.slice(2);
const { browser, page, errors } = await openGame();
await loadMap(page, map, { stopLoop: true });
console.log(await page.evaluate(({ si, secs }) => {
  const g = window.game, m = g.map, STEP = 1 / 60, p = g.player, s = g.seats[si];
  p.inRound = true; p.teleport(s.position.clone().add({ x: 0, y: 1, z: 0 })); p.sit(s);
  const out = [];
  for (let t = 0; t <= secs; t += secs / 4) {
    out.push(`t${t.toFixed(0)} seat ${s.body.translation().y.toFixed(1)} player ${p.pos.toArray().map(v => v.toFixed(1))} seated ${!!p.seat}`);
    for (let k = 0; k < secs / 4 * 60; k++) { g.time += STEP; m.extras.update?.(STEP); p.step(STEP); g.world.step(STEP); }
  }
  return out.join('\n');
}, { si: Number(si), secs: Number(secs) }));
if (errors.length) console.log('ERRORS', errors.slice(0, 4));
await browser.close();
