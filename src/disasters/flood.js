import { OCEAN_LEVEL } from '../util.js';
import { mapParts, isHost } from './common.js';

// NDS's flood: the sea rises about 2 studs a second to the same height on every map
// (high enough to cover the Arch Park arch), then keeps bobbing about 3 studs up and down.
// Swimming is safe; only having your head under the water drowns you (main.js).
// Submerged bricks work loose, and the water washes some of them away for good.
export const FLOOD_LEVEL = 43, RISE_SPEED = 2, BOB = 3;
const PEAK_T = (FLOOD_LEVEL - OCEAN_LEVEL) / RISE_SPEED;
const BOB_W = RISE_SPEED / BOB;    // the swell starts at the speed the water was rising

export default {
  name: 'Flash Flood',
  warning: 'Flash Flood! Seek higher ground!',
  duration: 60,
  bot: 'high',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.t = st.late || 0; st.tick = 0;
    g.effects.setSky('dark');
    g.effects.setWeather('rain', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2500, gain: 0.18 });
    g.audio.loop('water', true, { type: 'brown', freq: 350, gain: 0.25 });
  },
  // the same on every machine: it only depends on the time since the warning
  level(t) {
    if (t < PEAK_T) return OCEAN_LEVEL + RISE_SPEED * t;
    return FLOOD_LEVEL + BOB * Math.sin((t - PEAK_T) * BOB_W);
  },
  update(g, st, dt) {
    st.t += dt;
    const level = this.level(st.t);
    g.setWaterLevel(level);
    if (!isHost(g)) return;
    st.tick += dt;
    if (st.tick < 0.5) return;
    st.tick = 0;
    for (const p of mapParts(g)) {
      if (p.tags.has('indestructible') || p.vehicle) continue;
      const t = p.body.translation();
      if (t.y > level - 0.5) continue;
      if (p.anchored) {
        // submerged bricks are weakened: they break loose, and a few just wash away
        const r = Math.random();
        if (r < 0.005) g.world.removePart(p);
        else if (r < 0.025) g.world.unanchor(p, { x: (Math.random() - .5) * 6, y: 4, z: (Math.random() - .5) * 6 });
      } else if (Math.random() < 0.025) g.world.removePart(p);
    }
    for (const p of g.world.dynamic) {
      const t = p.body.translation();
      if (t.y < level && !p.tags.has('corpse')) {
        const buoy = p.mat === 'wood' || p.mat === 'fabric' || p.mat === 'plastic' ? 30 : 6;
        g.world.push(p, { x: (Math.random() - .5) * 3, y: buoy * 0.5, z: (Math.random() - .5) * 3 });
      }
    }
  },
  stop(g) {
    g.effects.setWeather('rain', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false); g.audio.loop('water', false);
    g.recedeWater();
  },
};
