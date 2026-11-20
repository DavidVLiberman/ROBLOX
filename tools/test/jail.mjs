// node jail.mjs : Prison Panic -- the orange pad locks you in a cell; the barbed wire hurts
import { openGame, loadMap } from './common.mjs';
const { browser, page, errors } = await openGame();
await loadMap(page, 'Prison Panic', { stopLoop: true });
console.log(await page.evaluate(() => {
  const g = window.game, m = g.map, STEP = 1 / 60, p = g.player, out = [];
  const sim = (s) => { for (let k = 0; k < s * 60; k++) { g.time += STEP; m.extras.update(STEP); p.step(STEP); g.world.step(STEP); } };
  const pad = m.interact[0].part, t = pad.body.translation();
  const doors = m.parts.filter(q => Math.abs(q.size.x - 4) < 0.01 && q.size.y > 9);
  const x0 = doors.map(d => d.body.translation().x);
  const shut = () => doors.filter((d, i) => Math.abs(d.body.translation().x - x0[i]) > 2).length;
  p.inRound = true; p.teleport({ x: t.x, y: 0.6, z: t.z }); sim(0.5);
  out.push(`after pad: player at ${p.pos.toArray().map(v => v.toFixed(1))}`);
  sim(3); out.push(`doors moved shut: ${shut()}`);
  // try to walk out of the cell
  const before = p.pos.clone(); p.move.set(0, 0, 1); sim(3); p.move.set(0, 0, -1); sim(3); p.move.set(0, 0, 0);
  out.push(`still in cell after walking: moved ${p.pos.distanceTo(before).toFixed(1)}`);
  sim(25); out.push(`doors shut after 30 s: ${shut()}`);
  // barbed wire
  p.health = 100; p.teleport({ x: 0, y: 11.5, z: -80 }); sim(0.3);
  out.push(`health after touching the wire: ${p.health}`);
  return out.join('\n');
}));
if (errors.length) console.log('ERRORS', errors.slice(0, 4));
await browser.close();
