import { V, mapParts } from './common.js';

export default {
  name: 'Sandstorm',
  warning: 'Sandstorm! Dodge flying objects',
  icon: '🏜️',
  duration: 60,
  sky: 'yellow',
  bot: 'upwind',
  preWarn(g, st) {
    const a = Math.random() * Math.PI * 2;
    st.dir = V(Math.cos(a), 0, Math.sin(a));
    g.windDir = st.dir;
    g.effects.setSky('yellow');
  },
  start(g, st) {
    if (!st.dir) this.preWarn(g, st);
    st.gust = 2;
    g.effects.setWeather('sand', true, { wind: st.dir.clone().multiplyScalar(30) });
    g.audio.loop('sand', true, { freq: 900, q: 0.8, filter: 'bandpass', gain: 0.3, lfo: 0.4 });
  },
  update(g, st, dt) {
    const w = st.dir;
    for (const p of g.world.dynamic) {
      if (p.tags.has('corpse')) continue;
      g.world.push(p, { x: w.x * 28 * dt, y: 4 * dt, z: w.z * 28 * dt });
    }
    for (const c of g.chars) {
      if (!c.alive || c.seat || !g.island.onIsland(c.pos)) continue;
      c.ext.x += w.x * 4 * dt; c.ext.z += w.z * 4 * dt;
    }
    st.gust -= dt;
    if (st.gust > 0) return;
    st.gust = 2.2 + Math.random() * 2;
    g.audio.noise('white', 1.6, { filter: 'bandpass', freq: 600, gain: 0.35 });
    const parts = mapParts(g).filter(p => p.anchored && p.size.x * p.size.y * p.size.z < 700);
    const n = 6 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n && parts.length; i++) {
      const p = parts[Math.floor(Math.random() * parts.length)];
      g.world.unanchor(p, { x: w.x * 75, y: 12, z: w.z * 75 });
    }
    // a gust that catches you in the open hurts a lot
    for (const c of g.chars) {
      if (!c.alive || !c.inRound) continue;
      const exposed = !g.world.raycast(V(c.pos.x, c.pos.y + 2.5, c.pos.z), w.clone().negate(), 40);
      if (exposed && Math.random() < 0.12) {
        c.damage(c.maxHealth * (0.4 + Math.random() * 0.5), 'sandstorm');
        c.addVelocity({ x: w.x * 45, y: 12, z: w.z * 45 });
      }
    }
  },
  stop(g) {
    g.effects.setWeather('sand', false);
    g.audio.loop('sand', false);
    g.windDir = null;
  },
};
