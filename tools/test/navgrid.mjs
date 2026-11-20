// node navgrid.mjs "Map" x0 z0 x1 z1 : print the bot grid (# blocked, . open) over a rectangle
import { openGame, loadMap } from './common.mjs';
const [map, ...r] = process.argv.slice(2);
const [x0, z0, x1, z1] = r.map(Number);
const { browser, page } = await openGame();
await loadMap(page, map, { stopLoop: true });
console.log(await page.evaluate(async ({ x0, z0, x1, z1 }) => {
  const g = window.game, bot = g.addBot();
  const nav = bot.brain.nav();
  const rows = [];
  for (let z = z0; z <= z1; z += 2) {
    let row = (z + '').padStart(5) + ' ';
    for (let x = x0; x <= x1; x += 2) { const k = nav.idx(x, z); row += k < 0 ? ' ' : nav.block[k] ? '#' : '.'; }
    rows.push(row);
  }
  return rows.join('\n');
}, { x0, z0, x1, z1 }));
await browser.close();
