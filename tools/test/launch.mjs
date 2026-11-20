// node launch.mjs [fails 0|1] : press the 4 Launch Land buttons in order and fly the shuttle
import { openGame, loadMap } from './common.mjs';
const forceFail = process.argv[2];
const { browser, page, errors } = await openGame();
await loadMap(page, 'Launch Land');
const out = await page.evaluate(async (forceFail) => {
  const g = window.game, m = g.map, st = m.extras.rocket.state, log = [];
  if (forceFail !== undefined) st.fails = forceFail === '1';
  const toasts = [];
  const t0 = g.ui.toast.bind(g.ui); g.ui.toast = (t, ms) => { toasts.push(t); t0(t, ms); };
  const p = g.player;
  const up = m.extras.update; m.extras.update = (dt) => { try { up(dt); } catch (e) { if (!window.__err) window.__err = String(e.stack); } };
  p.inRound = true;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // wrong order does nothing
  p.teleport(m.interact[3].pos.clone().setY(m.interact[3].pos.y + 0.5)); await wait(300);
  log.push('step4 first: ' + (g.interactNearest(false) ? 'offered' : 'not offered'));
  for (let i = 0; i < 4; i++) {
    const it = m.interact[i];
    p.teleport(it.pos.clone().setY(it.pos.y + 0.5));
    await wait(400);
    const near = g.interactNearest(false);
    log.push(`step${i + 1}: near=${near === it} cond=${it.cond()} alive=${p.alive} pos=${p.pos.toArray().map(v=>v.toFixed(1))} want=${it.pos.toArray().map(v=>v.toFixed(1))} t=${g.time.toFixed(1)}`);
    g.interactNearest(true);
    log.push(`  -> step=${st.step} countdown=${st.countdown.toFixed(1)}`);
  }
  log.push('badges: ' + JSON.stringify(Object.keys(g.data.d.badges || {})));
  const armP = m.parts.find(q => q.size.y > 6 && q.size.y < 8 && q.color.getHex() === 0xf2f3f3);
  const top0 = m.extras.rocket.parts[0].body.translation().y;
  const orig = g.frame; g.frame = () => {};
  const STEP = 1 / 60;
  const sim = (sec) => { for (let k = 0; k < sec * 60; k++) { g.time += STEP; m.extras.update(STEP); g.player.step(STEP); g.world.step(STEP); } };
  await wait(200);
  sim(st.countdown - 1);
  log.push('arm at T-1: ' + JSON.stringify(armP.body.translation()) + ' rot ' + JSON.stringify(armP.body.rotation()));
  sim(6);
  log.push(`after liftoff+5: launched=${st.launched} broken=${st.broken} failed=${st.failed} rise=${st.rise.toFixed(0)} tankY ${top0.toFixed(0)}->${m.extras.rocket.parts[0].body.translation().y.toFixed(0)}`);
  g.camController.update = () => {}; g.camera.position.set(90, 60, 90); g.camera.lookAt(0, 70, -25);
  g.frame = orig; requestAnimationFrame(() => g.frame()); await wait(1500);
  log.push('err: ' + window.__err + ' countdown ' + st.countdown);
  log.push('toasts: ' + toasts.join(' | '));
  return log;
}, forceFail);
console.log(out.join('\n'));
await page.waitForTimeout(800);
await page.screenshot({ path: new URL(`./mc/launch${forceFail}.png`, import.meta.url).pathname });
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
