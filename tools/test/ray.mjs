// node ray.mjs "Map" x y z : what's straight below a point
import { openGame, loadMap } from './common.mjs';
const [map, x, y, z] = process.argv.slice(2);
const { browser, page } = await openGame();
await loadMap(page, map, { stopLoop: true });
console.log(await page.evaluate(({ x, y, z }) => {
  const g = window.game; g.world.step(1 / 60);
  const hit = g.world.raycast({ x, y, z }, { x: 0, y: -1, z: 0 }, 50);
  if (!hit) return 'nothing';
  const o = hit.object, f = (v) => [v.x, v.y, v.z].map(a => a.toFixed(1)).join(',');
  return `hit y ${hit.point.y.toFixed(2)}: part at ${o ? f(o.position) + ' size ' + f(o.size) + ' shape ' + o.shape + ' tags ' + [...o.tags].join('/') : '?'}`;
}, { x: +x, y: +y, z: +z }));
await browser.close();
