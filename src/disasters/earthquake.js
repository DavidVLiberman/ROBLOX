import { mapParts } from './common.js';

export default {
  name: 'Earthquake',
  warning: 'Earthquake! Get outside and stay away from tall structures',
  icon: '🫨',
  duration: 50,
  sky: 'clear',
  bot: 'open',
  start(g, st) {
    st.t = 0; st.tick = 0;
    g.audio.loop('rumble', true, { type: 'brown', freq: 140, gain: 0.6, lfo: 1.5 });
  },
  update(g, st, dt) {
    st.t += dt;
    st.tick += dt;
    const strength = Math.min(1, 0.4 + st.t / 20);
    g.shakeAll(0.55 * strength, 0.2);
    if (st.tick < 0.35) return;
    st.tick = 0;
    const parts = mapParts(g).filter(p => p.anchored);
    const n = Math.floor(2 + st.t * 0.25);
    for (let i = 0; i < n * 3 && parts.length; i++) {
      const p = parts[Math.floor(Math.random() * parts.length)];
      const y = p.body.translation().y;
      if (Math.random() < 0.15 + y / 50) g.world.unanchor(p, { x: (Math.random() - .5) * 8, y: 2, z: (Math.random() - .5) * 8 });
    }
    for (const p of g.world.dynamic) {
      if (p.tags.has('corpse')) continue;
      if (Math.random() < 0.4) g.world.push(p, { x: (Math.random() - .5) * 10 * strength, y: Math.random() * 6 * strength, z: (Math.random() - .5) * 10 * strength });
    }
    // the ground jolts players that are standing still (jumping helps, chairs are safe)
    for (const c of g.chars) {
      if (!c.alive || c.seat || !c.grounded) continue;
      const loose = c.groundPart && !c.groundPart.anchored;
      const k = (loose ? 22 : 9) * strength;
      c.ext.x += (Math.random() - .5) * k; c.ext.z += (Math.random() - .5) * k;
      if (loose) c.vel.y += Math.random() * 10;
    }
  },
  stop(g) { g.audio.loop('rumble', false); },
};
