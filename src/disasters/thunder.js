import { V, randomMapPoint, charsOnIsland, isOutdoors, mapParts, isHost, locals, emit, toArr, fromArr } from './common.js';
import { pick, rand } from '../util.js';

const STRIKES = 45;

// 45 yellow bolts, about one every two seconds. They favour high points and people
// standing in the open; a direct hit kills, a close one burns and throws you.
export default {
  name: 'Thunder Storm',
  warning: "Thunder Storm! Don't stand in the open or in high places",
  duration: 95,
  bot: 'indoor',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.n = 0; st.next = 2;
    st.interval = (this.duration - 3) / STRIKES;
    g.effects.setSky('dark');
    g.effects.setWeather('rain', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2500, gain: 0.2 });
  },
  // host: choose where the next bolt lands
  strike(g, st) {
    st.n++;
    let target;
    const r = rand();
    const open = charsOnIsland(g, false).filter(c => isOutdoors(g, c));
    if (r < 0.45 && open.length) target = pick(open).pos.clone();
    else if (r < 0.85) {
      // prefer tall things
      let best = null, by = -1;
      const parts = mapParts(g);
      for (let i = 0; i < 40 && parts.length; i++) {
        const p = pick(parts);
        const t = p.body.translation();
        if (t.y + p.size.y / 2 > by) { by = t.y + p.size.y / 2; best = t; }
      }
      target = best ? V(best.x, 0, best.z) : randomMapPoint();
    } else target = randomMapPoint();
    const hit = g.world.raycast(V(target.x, 320, target.z), V(0, -1, 0), 400);
    const p = hit ? hit.point : V(target.x, 0, target.z);
    const tree = !!(hit && hit.object && hit.object.tags && hit.object.tags.has('tree'));
    emit(g, st, { k: 's', p: toArr(p), f: toArr(V(p.x + (rand() - .5) * 40, 300, p.z + (rand() - .5) * 40)), tree, last: st.n === STRIKES });
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
      if (ev.tree) for (const tp of g.world.partsNear(p, 7, q => q.tags.has('tree'))) g.world.unanchor(tp, { x: (Math.random() - .5) * 20, y: 15, z: (Math.random() - .5) * 20 });
      else g.world.explode(p, 7, 55, { destroyChance: 0.18 });
    }
    if (!ev.tree) {
      for (const c of locals(g)) {
        if (!c.alive) continue;
        const d = c.center.distanceTo(p);
        if (d < 7) {
          if (ev.last && c.isPlayer && c.inRound) g.awardBadge('chance');
          c.die('lightning');
        } else if (d < 14) {
          c.damage(30 * (1 - (d - 7) / 7), 'lightning');
          c.addVelocity(c.center.sub(p).setY(0).normalize().multiplyScalar(35).add(V(0, 25, 0)));
        }
      }
    }
    if (g.player.alive && g.player.pos.distanceTo(p) < 50) g.camController.shake = Math.max(g.camController.shake, 0.4);
  },
  update(g, st, dt) {
    if (!isHost(g)) return;
    st.next -= dt;
    if (st.next > 0 || st.n >= STRIKES) return;
    st.next = st.interval * (0.6 + rand() * 0.8);
    this.strike(g, st);
  },
  stop(g) {
    g.effects.setWeather('rain', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
