import { V, randomMapPoint, charsOnIsland, isOutdoors, mapParts } from './common.js';
import { pick } from '../util.js';

const STRIKES = 45;

export default {
  name: 'Thunder Storm',
  warning: "Thunder Storm! Don't stand in the open or in high places",
  icon: '⚡',
  duration: 95,
  sky: 'dark',
  bot: 'indoor',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.n = 0; st.next = 2;
    st.interval = (this.duration - 3) / STRIKES;
    g.effects.setWeather('rain', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2500, gain: 0.2 });
  },
  update(g, st, dt) {
    st.next -= dt;
    if (st.next > 0 || st.n >= STRIKES) return;
    st.next = st.interval * (0.6 + Math.random() * 0.8);
    st.n++;
    let target;
    const r = Math.random();
    const open = charsOnIsland(g, false).filter(c => isOutdoors(g, c));
    if (r < 0.55 && open.length) target = pick(open).pos.clone();
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
    g.effects.lightning(V(p.x + (Math.random() - .5) * 30, 300, p.z + (Math.random() - .5) * 30), p);
    g.audio.thunder(p);
    const last = st.n === STRIKES;
    // trees soak up a strike
    if (hit && hit.object && hit.object.tags && hit.object.tags.has('tree')) {
      for (const tp of g.world.partsNear(p, 7, q => q.tags.has('tree'))) g.world.unanchor(tp, { x: (Math.random() - .5) * 20, y: 15, z: (Math.random() - .5) * 20 });
      g.effects.burst(p, { size: 8, life: 0.4 });
      return;
    }
    g.world.explode(p, 7, 55, { destroyChance: 0.15 });
    g.effects.burst(p, { color: 0xbfd8ff, size: 10, life: 0.4 });
    for (const c of g.chars) {
      if (!c.alive) continue;
      const d = c.center.distanceTo(p);
      if (d < 7.5) {
        if (last && c.isPlayer && c.inRound) g.awardBadge('chance');
        c.die('lightning');
      }
    }
    if (g.player.alive && g.player.pos.distanceTo(p) < 50) g.camController.shake = Math.max(g.camController.shake, 0.4);
  },
  stop(g) {
    g.effects.setWeather('rain', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
