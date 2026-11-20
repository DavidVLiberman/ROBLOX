// node train.mjs : drive the Devastation Station loco a full lap, dump the hopper, lower the gates
import { openGame, loadMap } from './common.mjs';
const { browser, page, errors } = await openGame();
await loadMap(page, 'Devastation Station', { stopLoop: true });
const out = await page.evaluate(async () => {
  const g = window.game, m = g.map, STEP = 1 / 60, log = [];
  const { stepVehicles } = await import('./src/vehicles.js');
  const sim = (sec) => { for (let k = 0; k < sec * 60; k++) { g.time += STEP; stepVehicles(g, STEP); m.extras.update?.(STEP); for (const c of g.chars) c.step(STEP); g.world.step(STEP); } };
  const [loco, h1, h2] = g.vehicles;
  const p = g.player; p.inRound = true;
  p.teleport(loco.seat.position.clone().add({ x: 0, y: 1, z: 0 }));
  p.sit(loco.seat);
  g.input.keys.add('w');
  const start = loco.pos.clone();
  let minX = 1e9, maxX = -1e9, maxSpeed = 0, path = 0, prev = start.clone();
  for (let t = 0; t < 70; t += 0.5) {
    sim(0.5);
    minX = Math.min(minX, loco.pos.x); maxX = Math.max(maxX, loco.pos.x); maxSpeed = Math.max(maxSpeed, loco.speed);
    path += loco.pos.distanceTo(prev); prev.copy(loco.pos);
  }
  log.push(`loco: x range ${minX.toFixed(0)}..${maxX.toFixed(0)} travelled ${path.toFixed(0)} max speed ${maxSpeed.toFixed(1)} now ${loco.pos.x.toFixed(0)},${loco.pos.z.toFixed(0)} speed ${loco.speed.toFixed(1)}`);
  log.push(`player seated=${!!p.seat} at ${p.pos.toArray().map(v => v.toFixed(0))}`);
  log.push(`handcars: ${h1.pos.x.toFixed(0)},${h1.pos.z.toFixed(0)} / ${h2.pos.x.toFixed(0)},${h2.pos.z.toFixed(0)}; gap to nearest ${Math.min(loco.pos.distanceTo(h1.pos), loco.pos.distanceTo(h2.pos)).toFixed(1)}`);
  g.input.keys.delete('w');
  p.unsit?.();
  // hopper and gates
  const hop = m.interact.find(i => i.object === 'Coal Hopper'), gate = m.interact.find(i => i.object === 'Crossing Gates');
  const coal = m.parts.filter(q => q.size.x === 2 && q.size.y === 2 && q.position.y > 15);
  hop.action(p); sim(3);
  log.push('low cubes: ' + coal.map(c => c.body.translation()).filter(t => t.y < 0.9).map(t => [t.x, t.y, t.z].map(v => v.toFixed(1)).join(',')).join(' ; '));
  log.push(`coal: ${coal.length} cubes, ${coal.filter(c => !c.anchored).length} loose, lowest y ${Math.min(...coal.map(c => c.body.translation().y)).toFixed(1)}`);
  const armTop = () => Math.max(...m.parts.filter(q => q.size.x === 0.5 && q.size.y === 3 && q.size.z === 0.4).map(q => q.body.translation().y));
  const before = armTop(); gate.action(p); sim(2.5); const after = armTop();
  log.push(`gate arms highest y ${before.toFixed(1)} -> ${after.toFixed(1)}`);
  return log;
});
console.log(out.join('\n'));
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
