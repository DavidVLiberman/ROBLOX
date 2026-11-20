// node mapcheck.mjs "Map Name" [shots]
// Builds the map and prints stats; saves screenshots to mc/<Slug>-<i>.png.
import { mkdirSync } from 'node:fs';
import { openGame, loadMap } from './common.mjs';

const name = process.argv[2];
const shots = process.argv[3] !== '0';
const slug = name.replace(/[^A-Za-z]/g, '');
mkdirSync(new URL('./mc/', import.meta.url), { recursive: true });
const { browser, page, errors } = await openGame();
await loadMap(page, name);
const stats = await page.evaluate(() => {
  const g = window.game, w = g.world, m = g.map;
  const boxes = m.parts.map(p => ({ p, b: w.aabb(p) }));
  // anchored parts that touch nothing (and aren't on the ground)
  const touch = (a, b, e = 0.15) => a.maxX > b.minX - e && a.minX < b.maxX + e && a.maxY > b.minY - e && a.minY < b.maxY + e && a.maxZ > b.minZ - e && a.minZ < b.maxZ + e;
  const floating = [];
  for (const { p, b } of boxes) {
    if (!p.anchored || b.minY < 0.6 || p.tags.has('float')) continue;
    if (!boxes.some(o => o.p !== p && touch(b, o.b))) floating.push([p.position.x, p.position.y, p.position.z].map(v => v.toFixed(1)).join(','));
  }
  // anchored parts the support graph can't connect to the ground (they'd fall at the first collapse)
  const seen = new Set(), queue = m.parts.filter(p => p.anchored && p.root);
  queue.forEach(p => seen.add(p));
  while (queue.length) for (const n of queue.pop().neighbors || []) if (!seen.has(n) && n.anchored) { seen.add(n); queue.push(n); }
  const unsupported = m.parts.filter(p => p.anchored && !seen.has(p) && !p.tags.has('float') && !p.vehicle);
  const spots = {};
  for (const s of m.spots) spots[s.type] = (spots[s.type] || 0) + 1;
  const blocked = m.spawns.filter(s => w.overlapsCapsule(s.x, s.y + 3.3, s.z, 1.5, 1)).length;
  // walkable parts outside the oval
  const outside = [];
  for (const { p, b } of boxes) {
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    if ((cx / 158) ** 2 + (cz / 140) ** 2 > 1) outside.push(p.position.toArray().map(v => v.toFixed(0)).join(','));
  }
  return {
    parts: m.parts.length,
    floating: floating.length, floatingAt: floating.slice(0, 8),
    unsupported: unsupported.length, unsupportedAt: unsupported.slice(0, 6).map(p => p.position.toArray().map(v => v.toFixed(0)).join(',')),
    fire: m.parts.filter(p => p.tags.has('fire')).map(p => p.position.toArray().map(v => v.toFixed(0)).join(',')),
    spots, spawns: m.spawns.length, blockedSpawns: blocked,
    seats: m.seats.length, vehicles: m.vehicles.length, interact: m.interact.length,
    outside: outside.length, outsideAt: outside.slice(0, 6),
    tallest: m.tallest.toFixed(0),
  };
});
console.log(JSON.stringify(stats, null, 1));
if (shots) {
  // fixed views of the map from three sides
  const views = process.env.VIEWS ? JSON.parse(process.env.VIEWS) : [[150, 110, 190, 0, 20, -10], [-190, 90, -40, 0, 25, -10], [40, 260, 40, 0, 0, -5]];
  await page.evaluate(() => { const g = window.game; g.camController.update = () => {}; g.player.teleport({ x: 0, y: -500, z: 0 }); });
  for (let i = 0; i < views.length; i++) {
    const [x, y, z, tx, ty, tz] = views[i];
    await page.evaluate(([x, y, z, tx, ty, tz]) => { const c = window.game.camera; c.position.set(x, y, z); c.lookAt(tx, ty, tz); }, [x, y, z, tx, ty, tz]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: new URL(`./mc/${slug}-${i}.png`, import.meta.url).pathname });
  }
}
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
