// node heli.mjs : Fort Indestructible helicopter -- pilot spins the rotor, blades kill a bystander on the roof
import { openGame, loadMap } from './common.mjs';
const { browser, page, errors } = await openGame();
await loadMap(page, 'Fort Indestructible', { stopLoop: true });
console.log(await page.evaluate(() => {
  const g = window.game, m = g.map, STEP = 1 / 60, p = g.player;
  const sim = (s) => { for (let k = 0; k < s * 60; k++) { g.time += STEP; m.extras.update(STEP); for (const c of g.chars) c.step(STEP); g.world.step(STEP); } };
  const seats = g.seats.filter(s => s.tags.has('helicopter'));
  const blade = m.parts.find(q => q.tags.has('helicopter') && q.size.x === 26);
  const bot = g.addBot(); bot.inRound = true;
  bot.teleport({ x: 42.1, y: 6.4, z: -47 });   // standing on the roof, in the rotor's way
  p.inRound = true; p.teleport(seats[0].position.clone().add({ x: 0, y: 1, z: 0 })); p.sit(seats[0]);
  const r0 = blade.body.rotation();
  sim(3);
  const r1 = blade.body.rotation();
  return `heli seats ${seats.length}; pilot seated ${!!p.seat}; rotor turned ${(Math.abs(r1.y - r0.y) > 0.01)}; bystander on roof alive ${bot.alive}; inChopper ${g.round.inChopper(p)}`;
}));
if (errors.length) console.log('ERRORS', errors.slice(0, 4));
await browser.close();
