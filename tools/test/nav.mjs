// node nav.mjs "Map Name" [maxSeconds] [onlyIdx,...]
// A bot walks from a spawn to every indoor/high spot on the map (simulated faster than
// real time, no rendering). Prints which spots it could not reach.
import { openGame, loadMap } from './common.mjs';

const name = process.argv[2];
const maxT = Number(process.argv[3] || 90);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const { browser, page, errors } = await openGame();
await loadMap(page, name, { stopLoop: true });
const n = await page.evaluate(() => {
  const g = window.game;
  window.__bot = g.addBot();
  g.player.teleport({ x: 0, y: -500, z: 0 });
  return g.map.spots.length;
});
let ok = 0, total = 0;
const fails = [];
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue;
  const r = await page.evaluate(({ i, maxT }) => {
    const g = window.game, bot = window.__bot, s = g.map.spots[i], STEP = 1 / 60;
    if (s.type === 'open') return null;
    const sp = g.map.spawns[i % g.map.spawns.length];
    bot.alive = true; bot.health = 100; bot.inRound = true;
    bot.teleport({ x: sp.x, y: sp.y + 3, z: sp.z });
    for (let k = 0; k < 30; k++) { bot.step(STEP); g.world.step(STEP); }
    const end = s.pos.clone();
    bot.brain.avoid.clear();
    bot.brain.setPath(bot.brain.route(s.path.length ? [...s.path, end] : [end]), end);
    let t = 0, st = 'moving', maxY = 0;
    while (t < maxT && bot.alive) {
      bot.move.set(0, 0, 0); bot.jump = false;
      st = bot.brain.follow(STEP);
      if (st !== 'moving') break;
      bot.step(STEP);
      g.world.step(STEP);
      g.time += STEP; t += STEP;
      maxY = Math.max(maxY, bot.pos.y);
    }
    const d = Math.hypot(bot.pos.x - end.x, bot.pos.z - end.z), dy = Math.abs(bot.pos.y - end.y);
    const f = (v) => [v.x, v.y, v.z].map(a => a.toFixed(1)).join(',');
    return { i, type: s.type, ok: st === 'arrived' && d < 4.5 && dy < 3, st, t: +t.toFixed(1), at: f(bot.pos), end: f(end), idx: bot.brain.idx, len: bot.brain.path.length };
  }, { i, maxT });
  if (!r) continue;
  total++;
  if (r.ok) ok++; else fails.push(r);
}
console.log(`${name}: ${ok}/${total} reached in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const f of fails) console.log('  FAIL', JSON.stringify(f));
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
