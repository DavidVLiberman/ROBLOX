import { OCEAN_LEVEL, clamp } from '../util.js';
import { mapParts } from './common.js';

export default {
  name: 'Flash Flood',
  warning: 'Flash Flood! Seek high and stable ground',
  icon: '🌊',
  duration: 70,
  sky: 'dark',
  bot: 'high',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.t = 0; st.tick = 0;
    st.target = clamp(g.map.tallest * 0.45, 12, 40);
    g.effects.setWeather('rain', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2500, gain: 0.18 });
    g.audio.loop('water', true, { type: 'brown', freq: 350, gain: 0.25 });
  },
  update(g, st, dt) {
    st.t += dt;
    const k = clamp(st.t / (this.duration * 0.8), 0, 1);
    const level = OCEAN_LEVEL + (st.target - OCEAN_LEVEL) * (k * k * (3 - 2 * k));
    g.setWaterLevel(level);
    st.tick += dt;
    if (st.tick > 0.5) {
      st.tick = 0;
      // submerged parts corrode, shake and break loose
      for (const p of mapParts(g)) {
        if (!p.anchored) continue;
        const t = p.body.translation();
        if (t.y > level - 0.5) continue;
        if (Math.random() < 0.035) g.world.unanchor(p, { x: (Math.random() - .5) * 6, y: 4, z: (Math.random() - .5) * 6 });
      }
      for (const p of g.world.dynamic) {
        const t = p.body.translation();
        if (t.y < level && !p.tags.has('corpse')) {
          const buoy = p.mat === 'wood' || p.mat === 'fabric' || p.mat === 'plastic' ? 30 : 6;
          g.world.push(p, { x: (Math.random() - .5) * 3, y: buoy * 0.5, z: (Math.random() - .5) * 3 });
        }
      }
    }
  },
  stop(g) {
    g.effects.setWeather('rain', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false); g.audio.loop('water', false);
    g.recedeWater();
  },
};
