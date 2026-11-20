// node navdbg.mjs "Map" idx : trace one bot route, print waypoints and falls
import { openGame, loadMap } from './common.mjs';
const [name, idx] = [process.argv[2], Number(process.argv[3])];
const { browser, page } = await openGame();
await loadMap(page, name, { stopLoop: true });
const out = await page.evaluate((i) => {
  const g = window.game, bot = g.addBot(), s = g.map.spots[i], STEP = 1 / 60, log = [];
  g.player.teleport({ x: 0, y: -500, z: 0 });
  const sp = g.map.spawns[i % g.map.spawns.length];
  bot.inRound = true; bot.teleport({ x: sp.x, y: sp.y + 3, z: sp.z });
  for (let k = 0; k < 30; k++) { bot.step(STEP); g.world.step(STEP); }
  const end = s.pos.clone();
  const f = (v) => [v.x, v.y, v.z].map(a => a.toFixed(1)).join(',');
  log.push('spot path: ' + s.path.map(f).join(' | '));
  bot.brain.setPath(bot.brain.route([...s.path, end]), end);
  log.push('route: ' + bot.brain.path.map(f).join(' | '));
  let t = 0, prevY = bot.pos.y, peak = bot.pos.y, lastIdx = -1;
  while (t < 90) {
    bot.move.set(0, 0, 0); bot.jump = false;
    const st = bot.brain.follow(STEP);
    if (bot.brain.idx !== lastIdx) { lastIdx = bot.brain.idx; log.push(`t${t.toFixed(1)} wp${lastIdx} at ${f(bot.pos)}`); }
    if (st !== 'moving') {
      log.push(st + ' at ' + f(bot.pos));
      const wp = bot.brain.path[Math.min(bot.brain.idx, bot.brain.path.length - 1)];
      const d = wp.clone().sub(bot.pos); d.y = 0; d.normalize();
      for (const h of [0.8, 2.6, 4.5]) {
        const hit = g.world.raycast(bot.pos.clone().setY(bot.pos.y + h), d, 4);
        log.push(`ray@${h}: ` + (hit ? `${hit.dist.toFixed(2)} ${hit.object ? f(hit.object.position) + ' size ' + f(hit.object.size) + ' ' + [...hit.object.tags].join('/') : 'no obj'}` : 'none'));
      }
      break;
    }
    bot.step(STEP); g.world.step(STEP); g.time += STEP; t += STEP;
    if (bot.grounded) { if (peak - bot.pos.y > 3) log.push(`FELL ${peak.toFixed(1)} -> ${f(bot.pos)} t${t.toFixed(1)}`); peak = bot.pos.y; }
    else peak = Math.max(peak, bot.pos.y);
  }
  return log;
}, idx);
console.log(out.join('\n'));
await browser.close();
