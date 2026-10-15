import { V, isHost, locals, emit, toArr, fromArr } from './common.js';
import { rand } from '../util.js';

const STRIKES = 45;
const AREA = 100;      // bolts land within ±100 studs of the middle of the map
const NEAR = 14;       // ...and jump to the highest thing this close to that spot
const KILL = 7;        // a bolt kills within 7 studs and does nothing further out

// NDS: 45 yellow bolts, about one every two seconds. Each one picks a random spot and
// zig-zags down to the highest point near it. They never aim at people: tall things and
// high places are what get hit. Within 7 studs of a strike you die, outside it nothing happens.
export default {
  name: 'Thunder Storm',
  warning: 'Thunder Storm! Avoid high and open places!',
  duration: 95,
  bot: 'indoor',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.n = 0; st.next = 2;
    st.interval = (this.duration - 6) / STRIKES;   // all 45 land before the round ends
    g.effects.setSky('dark');
    g.effects.setWeather('rain', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2500, gain: 0.2 });
  },
  // host: choose where the next bolt lands
  strike(g, st) {
    st.n++;
    const tx = (rand() * 2 - 1) * AREA, tz = (rand() * 2 - 1) * AREA;
    // the highest surface near the spot (a few probes around it)
    let best = null;
    for (let i = 0; i < 25; i++) {
      const a = rand() * Math.PI * 2, d = i === 0 ? 0 : Math.sqrt(rand()) * NEAR;
      const x = tx + Math.cos(a) * d, z = tz + Math.sin(a) * d;
      const hit = g.world.raycast(V(x, 320, z), V(0, -1, 0), 400);
      const y = hit ? hit.point.y : 0;
      if (!best || y > best.y + 0.01) best = { x, y, z, obj: hit?.object };
    }
    const p = V(best.x, best.y, best.z);
    const tree = !!(best.obj && best.obj.tags && best.obj.tags.has('tree'));
    // the bolt starts in the clouds above the random spot and zig-zags over to the high point
    emit(g, st, { k: 's', p: toArr(p), f: toArr(V(tx + (rand() - .5) * 30, 300, tz + (rand() - .5) * 30)), tree, last: st.n === STRIKES });
  },
  onEvent(g, st, ev) {
    if (ev.k !== 's') return;
    if (!isHost(g)) st.n++;
    const p = fromArr(ev.p);
    g.effects.lightning(fromArr(ev.f), p);
    g.audio.thunder(p);
    g.effects.burst(p, { color: 0xfff2a0, size: ev.tree ? 8 : 11, life: 0.45 });
    if (!ev.tree) g.effects.scorch(p, 3.5);
    if (isHost(g)) {
      // trees soak up a strike
      if (ev.tree) for (const tp of g.world.partsNear(p, KILL, q => q.tags.has('tree'))) g.world.unanchor(tp, { x: (Math.random() - .5) * 20, y: 15, z: (Math.random() - .5) * 20 });
      else g.world.explode(p, KILL, 55, { destroyChance: 0.18 });
    }
    for (const c of locals(g)) {
      if (!c.alive || c.center.distanceTo(p) >= KILL) continue;
      if (ev.last && c.isPlayer && c.inRound) g.awardBadge('chance');
      c.die('lightning');
    }
    if (g.player.alive && g.player.pos.distanceTo(p) < 50) g.camController.shake = Math.max(g.camController.shake, 0.4);
  },
  update(g, st, dt) {
    if (!isHost(g)) return;
    st.next -= dt;
    if (st.next > 0 || st.n >= STRIKES) return;
    st.next = st.interval * (0.75 + rand() * 0.5);
    this.strike(g, st);
  },
  stop(g) {
    g.effects.setWeather('rain', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
