// node drive.mjs "Map" [vehicleIndex] [seconds] [keys] : sit in a vehicle and hold keys
import { openGame, loadMap } from './common.mjs';
const [map, vi = '0', secs = '6', keys = 'w'] = process.argv.slice(2);
const { browser, page, errors } = await openGame();
await loadMap(page, map, { stopLoop: true });
console.log(await page.evaluate(async ({ vi, secs, keys }) => {
  const g = window.game, m = g.map, STEP = 1 / 60;
  const { stepVehicles } = await import('./src/vehicles.js');
  const v = g.vehicles[vi], p = g.player; p.inRound = true;
  p.teleport(v.seat.position.clone().add({ x: 0, y: 1, z: 0 })); p.sit(v.seat);
  for (const k of keys.split(',')) g.input.keys.add(k);
  const a = v.pos.clone(); let top = 0;
  for (let k = 0; k < secs * 60; k++) { g.time += STEP; stepVehicles(g, STEP); m.extras.update?.(STEP); for (const c of g.chars) c.step(STEP); g.world.step(STEP); top = Math.max(top, Math.abs(v.speed)); }
  return `${g.vehicles.length} vehicles; #${vi} (${v.kind}) moved ${a.distanceTo(v.pos).toFixed(0)} studs to ${v.pos.x.toFixed(0)},${v.pos.z.toFixed(0)}, top speed ${top.toFixed(0)}, still seated ${!!p.seat}`;
}, { vi: Number(vi), secs: Number(secs), keys }));
if (errors.length) console.log('ERRORS', errors.slice(0, 4));
await browser.close();
