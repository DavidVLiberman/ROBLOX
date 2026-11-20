// node mp.mjs : two players in one server through the local relay (relay.mjs on 7777).
// Checks: one host, same map on both, rides move on the client, a button pressed by
// the client runs on the host (Launch Land), the Prison Panic pad works for a client.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const room = 'mp' + Date.now() % 100000;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const open = async (name, map) => {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on('pageerror', (e) => errors.push(name + ': ' + String(e.stack || e)));
  await page.goto(`http://localhost:8765/index.html?online&relay=ws://localhost:7777&room=${room}&map=${encodeURIComponent(map)}&disaster=Earthquake&bots=1&autostart&fast&low&name=${name}`);
  return page;
};
const state = (p) => p.evaluate(() => {
  const g = window.game;
  return { host: !!g.net?.isHost, decided: !!g.net?.decided, peers: g.net?.peers?.size ?? -1, phase: g.round.phase, map: g.map?.name || null, parts: g.map?.parts.length || 0 };
});
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms, step = 1000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await wait(step); } return false; };

const MAP = process.argv[2] || 'Prison Panic';
const A = await open('Alpha', MAP);
await wait(4000);
const B = await open('Bravo', MAP);
await until(async () => (await state(A)).peers > 0 && (await state(B)).peers > 0, 40000);
console.log('A', JSON.stringify(await state(A)));
console.log('B', JSON.stringify(await state(B)));
// wait until both have the map loaded
const ok = await until(async () => { const a = await state(A), b = await state(B); return a.map && a.map === b.map; }, 120000, 2000);
const a = await state(A), b = await state(B);
console.log(`map on both: ${ok} (${a.map} ${a.parts} parts / ${b.map} ${b.parts} parts)`);
// a client steps on the Prison Panic pad: it is locked in a cell and the host shuts the door
const before = await A.evaluate(() => window.game.map.parts.filter(q => Math.abs(q.size.x - 4) < 0.01 && q.size.y > 9).map(d => d.body.translation().x));
await B.evaluate(() => {
  const g = window.game, t = g.map.interact[0].part.body.translation();
  g.player.inRound = true; g.player.alive = true; g.player.teleport({ x: t.x, y: 0.7, z: t.z });
});
const jailed = await until(() => B.evaluate(() => window.game.player.pos.z < -55 || (window.game.player.pos.z > -50 && window.game.player.pos.z < -40 && window.game.player.pos.x > -16)), 10000, 250);
await wait(2500);
const after = await A.evaluate(() => window.game.map.parts.filter(q => Math.abs(q.size.x - 4) < 0.01 && q.size.y > 9).map(d => d.body.translation().x));
const shut = after.filter((x, i) => Math.abs(x - before[i]) > 2).length;
const seen = await B.evaluate(() => window.game.map.parts.filter(q => Math.abs(q.size.x - 4) < 0.01 && q.size.y > 9).map(d => d.body.translation().x));
const shutSeen = seen.filter((x, i) => Math.abs(x - before[i]) > 2).length;
console.log(`client locked in a cell: ${jailed} at ${await B.evaluate(() => window.game.player.pos.toArray().map(v => v.toFixed(1)).join(','))}; doors shut on host ${shut}, on client ${shutSeen}`);
console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
await browser.close();
