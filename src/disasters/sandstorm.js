import { V, mapParts, isHost, locals, emit } from './common.js';
import { rand } from '../util.js';

// A wall of sand rolls in from one side and the air turns thick and yellow. The sand
// itself doesn't hurt: the bricks it tears off and hurls downwind do. Don't hide in
// buildings; stand upwind of them.
export default {
  name: 'Sandstorm',
  warning: 'Sandstorm! Dodge flying objects!',
  duration: 90,
  bot: 'upwind',
  params() { return { a: Math.round(rand() * 6283) / 1000 }; },
  preWarn(g, st) {
    const a = st.p.a ?? 0;
    st.dir = V(Math.cos(a), 0, Math.sin(a));
    g.windDir = st.dir;
    g.effects.setSky('yellow');
    // the wind picks up before the storm arrives
    g.audio.loop('wind', true, { freq: 600, q: 0.7, gain: 0.14, lfo: 0.3 });
  },
  start(g, st) {
    if (!st.dir) this.preWarn(g, st);
    st.gust = 2;
    // the storm front: a rolling cloud of sand sweeping across the island
    st.wallS = st.late ? 400 : -260;
    g.effects.setWeather('sand', true, { wind: st.dir.clone().multiplyScalar(30) });
    g.audio.loop('sand', true, { freq: 900, q: 0.8, filter: 'bandpass', gain: 0.3, lfo: 0.4 });
  },
  onEvent(g, st, ev) {
    if (ev.k === 'g') g.audio.noise('white', 1.6, { filter: 'bandpass', freq: 600, gain: 0.35 });
  },
  update(g, st, dt) {
    const w = st.dir;
    if (st.wallS < 320) {
      st.wallS += 70 * dt;
      const side = V(w.z, 0, -w.x);
      for (let i = 0; i < (g.lowGfx ? 3 : 7); i++) {
        const pos = w.clone().multiplyScalar(st.wallS + (Math.random() - .5) * 20).addScaledVector(side, (Math.random() - .5) * 420);
        pos.y = Math.random() * 70;
        g.effects.puff(pos, 0xc9a466, 30 + Math.random() * 25, 2.2, w.clone().multiplyScalar(70));
      }
    }
    if (isHost(g)) {
      for (const p of g.world.dynamic) {
        if (p.tags.has('corpse')) continue;
        g.world.push(p, { x: w.x * 28 * dt, y: 4 * dt, z: w.z * 28 * dt });
      }
      st.gust -= dt;
      if (st.gust <= 0) {
        st.gust = 2.2 + rand() * 2;
        emit(g, st, { k: 'g' });
        const parts = mapParts(g).filter(p => p.anchored && p.size.x * p.size.y * p.size.z < 700);
        const n = 6 + Math.floor(rand() * 7);
        for (let i = 0; i < n && parts.length; i++) {
          const p = parts[Math.floor(rand() * parts.length)];
          g.world.unanchor(p, { x: w.x * 75, y: 12, z: w.z * 75 });
        }
      }
    }
    // the wind leans on anyone out in the open
    for (const c of locals(g)) {
      if (!c.alive || c.seat || !g.island.onIsland(c.pos)) continue;
      const exposed = !g.world.raycast(V(c.pos.x, c.pos.y + 2.5, c.pos.z), w.clone().negate(), 30);
      if (exposed) { c.ext.x += w.x * 5 * dt; c.ext.z += w.z * 5 * dt; }
    }
  },
  stop(g, st) {
    g.effects.setWeather('sand', false);
    g.audio.loop('sand', false); g.audio.loop('wind', false);
    g.windDir = null;
  },
};
