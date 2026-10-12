import { V, mapParts, isHost, locals } from './common.js';
import { rand } from '../util.js';

const DIRS = [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)];

// "Warmth": walls close by on several sides, a roof, and other players nearby.
export function warmth(g, c) {
  let walls = 0;
  const o = V(c.pos.x, c.pos.y + 2.5, c.pos.z);
  for (const d of DIRS) if (g.world.raycast(o, d, 7)) walls++;
  if (g.world.raycast(V(c.pos.x, c.pos.y + 5.2, c.pos.z), V(0, 1, 0), 30)) walls += 0.5;
  let near = 0;
  for (const o2 of g.chars) if (o2 !== c && o2.alive && o2.pos.distanceTo(c.pos) < 7) near++;
  return walls + Math.min(2, near);
}

// White-out with a strong wind. The more exposed you are, the more the screen frosts
// over (three stages); only the last stage drains health, so huddle between walls
// or next to other players. The wind knocks loose small, badly supported bricks.
export default {
  name: 'Blizzard',
  warning: 'Blizzard! Seek warmth and find shelter',
  duration: 90,
  bot: 'indoor',
  params() { return { a: Math.round(rand() * 6283) / 1000 }; },
  preWarn(g) { g.effects.setSky('snowy'); },
  start(g, st) {
    const a = st.p.a ?? 0;
    st.wind = V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(14);
    st.tick = 0; st.gust = 2;
    g.effects.setSky('white');
    g.effects.setWeather('snow', true, { wind: st.wind });
    g.audio.loop('blizzard', true, { freq: 700, q: 1.5, filter: 'bandpass', gain: 0.25, lfo: 0.35 });
  },
  update(g, st, dt) {
    st.tick += dt;
    for (const c of locals(g)) {
      if (!c.alive || !c.inRound || c.seat) continue;
      if (!g.world.raycast(V(c.pos.x, c.pos.y + 2.5, c.pos.z), st.wind.clone().normalize().negate(), 20)) {
        c.ext.x += st.wind.x * dt * 0.5; c.ext.z += st.wind.z * dt * 0.5;
      }
    }
    if (isHost(g)) {
      for (const p of g.world.dynamic) {
        if (p.tags.has('corpse')) continue;
        const v = p.size.x * p.size.y * p.size.z;
        if (v < 60) g.world.push(p, { x: st.wind.x * dt * 2, y: 0, z: st.wind.z * dt * 2 });
      }
      st.gust -= dt;
      if (st.gust <= 0) {
        st.gust = 1.5 + rand() * 2;
        const parts = mapParts(g).filter(p => p.anchored && p.size.x * p.size.y * p.size.z < 30 && (p.neighbors?.length ?? 0) <= 2);
        for (let i = 0; i < 3 && parts.length; i++) {
          const p = parts[Math.floor(rand() * parts.length)];
          g.world.unanchor(p, { x: st.wind.x * 3, y: 6, z: st.wind.z * 3 });
        }
      }
    }
    if (st.tick >= 0.5) {
      st.tick = 0;
      for (const c of locals(g)) {
        if (!c.alive || !c.inRound) { c.coldLevel = 0; c.cold = false; continue; }
        const w = warmth(g, c);
        const stage = w >= 3 ? 0 : w >= 2 ? 1 : w >= 1 ? 2 : 3;
        c.coldLevel = stage;
        c.cold = stage >= 2;
        if (stage === 3) c.damage(2.5, 'cold', true);
      }
    }
  },
  stop(g) {
    for (const c of g.chars) { c.cold = false; c.coldLevel = 0; }
    g.effects.setWeather('snow', false);
    g.audio.loop('blizzard', false);
  },
};
