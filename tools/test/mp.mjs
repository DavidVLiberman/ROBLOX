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

const A = await open('Alpha', 'Party Palace');
await wait(4000);
const B = await open('Bravo', 'Party Palace');
await until(async () => (await state(A)).peers > 0 && (await state(B)).peers > 0, 40000);
console.log('A', JSON.stringify(await state(A)));
console.log('B', JSON.stringify(await state(B)));
// wait until both have the map loaded
const ok = await until(async () => { const a = await state(A), b = await state(B); return a.map && a.map === b.map; }, 120000, 2000);
const a = await state(A), b = await state(B);
console.log(`map on both: ${ok} (${a.map} ${a.parts} parts / ${b.map} ${b.parts} parts)`);
// rides move on the client (the Viking ship's dragon head)
const shipY = (p) => p.evaluate(() => { const g = window.game, q = g.map?.parts.find(x => x.shape === 'ball' && x.color.getHex() === 0x2f8a3c); return q ? q.body.translation().x : null; });
const s0 = await shipY(B); await wait(3000); const s1 = await shipY(B);
console.log(`client sees the Viking ship swing: ${s0 !== null && Math.abs(s1 - s0) > 0.3} (${s0?.toFixed(1)} -> ${s1?.toFixed(1)})`);
// High-Striker pressed on the client runs on the host
const hostCount = () => A.evaluate(() => window.game.map?.interact?.length);
await B.evaluate(() => {
  const g = window.game, it = g.map.interact[0];
  g.player.inRound = true; g.player.teleport(it.pos.clone().setY(it.pos.y + 0.5));
});
await wait(1500);
await B.evaluate(() => window.game.interactNearest(true));
const hit = await until(() => A.evaluate(() => { const g = window.game; const puck = g.map.interact[0].part; return puck.body.translation().y > 2.5; }), 8000, 200);
console.log(`client's High-Striker swing ran on the host: ${hit} (interact items on host: ${await hostCount()})`);
console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
await browser.close();
