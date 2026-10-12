import { V, mapParts } from './common.js';

const DIRS = [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)];

// "Warmth": walls close by on several sides plus nearby players.
export function warmth(g, c) {
  let walls = 0;
  const o = V(c.pos.x, c.pos.y + 2.5, c.pos.z);
  for (const d of DIRS) if (g.world.raycast(o, d, 7)) walls++;
  if (g.world.raycast(V(c.pos.x, c.pos.y + 5.2, c.pos.z), V(0, 1, 0), 30)) walls += 0.5;
  let near = 0;
  for (const o2 of g.chars) if (o2 !== c && o2.alive && o2.pos.distanceTo(c.pos) < 7) near++;
  return walls + Math.min(2, near);
}

export default {
  name: 'Blizzard',
  warning: 'Blizzard! Seek warmth and find shelter',
  icon: '❄️',
  duration: 90,
  sky: 'white',
  bot: 'indoor',
  preWarn(g) { g.effects.setSky('snowy'); },
  start(g, st) {
    const a = Math.random() * Math.PI * 2;
    st.wind = V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(14);
    st.tick = 0; st.gust = 2;
    g.effects.setSky('white');
    g.effects.setWeather('snow', true, { wind: st.wind });
    g.audio.loop('blizzard', true, { freq: 700, q: 1.5, filter: 'bandpass', gain: 0.25, lfo: 0.35 });
  },
  update(g, st, dt) {
    st.tick += dt;
    st.gust -= dt;
    for (const c of g.chars) {
      if (!c.alive || !c.inRound || c.seat) continue;
      if (!g.world.raycast(V(c.pos.x, c.pos.y + 2.5, c.pos.z), st.wind.clone().normalize().negate(), 20)) {
        c.ext.x += st.wind.x * dt * 0.5; c.ext.z += st.wind.z * dt * 0.5;
      }
    }
    for (const p of g.world.dynamic) {
      if (p.tags.has('corpse')) continue;
      const v = p.size.x * p.size.y * p.size.z;
      if (v < 60) g.world.push(p, { x: st.wind.x * dt * 2, y: 0, z: st.wind.z * dt * 2 });
    }
    if (st.gust <= 0) {
      st.gust = 1.5 + Math.random() * 2;
      const parts = mapParts(g).filter(p => p.anchored && p.size.x * p.size.y * p.size.z < 30);
      for (let i = 0; i < 3 && parts.length; i++) {
        const p = parts[Math.floor(Math.random() * parts.length)];
        g.world.unanchor(p, { x: st.wind.x * 3, y: 6, z: st.wind.z * 3 });
      }
    }
    if (st.tick >= 1) {
      st.tick = 0;
      for (const c of g.chars) {
        if (!c.alive || !c.inRound) continue;
        const w = warmth(g, c);
        c.cold = w < 2;
        const dmg = w >= 2.5 ? 0 : w >= 1.5 ? 2 : w >= 0.5 ? 4 : 6;
        c.damage(dmg, 'cold', true);
      }
    }
  },
  stop(g) {
    for (const c of g.chars) c.cold = false;
    g.effects.setWeather('snow', false);
    g.audio.loop('blizzard', false);
  },
};
