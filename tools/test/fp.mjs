import { openGame, loadMap } from './common.mjs';
const [map, ...r] = process.argv.slice(2);
const { browser, page } = await openGame();
await loadMap(page, map, { stopLoop: true });
console.log(await page.evaluate(async (r) => {
  const THREE = await import('three');
  const g = window.game, bot = g.addBot(), nav = bot.brain.nav();
  const [ax, az, bx, bz] = r.map(Number);
  const p = nav.findPath(new THREE.Vector3(ax, 0, az), new THREE.Vector3(bx, 0, bz), 30000);
  const t = nav.nearestWalkable(nav.idx(bx, bz), 4);
  return (p ? p.map(v => v.x.toFixed(0) + ',' + v.z.toFixed(0)).join(' ') : 'null') + ' | goal cell ' + nav.idx(bx, bz) + ' blocked ' + nav.block[nav.idx(bx, bz)] + ' nearest ' + t + ' at ' + nav.center(t).toArray().map(v=>v.toFixed(1));
}, r));
await browser.close();
