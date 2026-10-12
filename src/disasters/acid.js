import * as THREE from 'three';
import { V, randomMapPoint, isOutdoors } from './common.js';

const GREEN = new THREE.Color(0x7bd34b);

export default {
  name: 'Acid Rain',
  warning: 'Acid Rain! Stay indoors',
  icon: '☣️',
  duration: 95,
  sky: 'acid',
  bot: 'indoor-low',
  preWarn(g) {
    g.effects.setSky('acid');
    g.audio.loop('wind', true, { freq: 500, gain: 0.1, lfo: 0.25 });
  },
  start(g, st) {
    st.tick = 0;
    g.effects.setWeather('acid', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2200, gain: 0.2 });
  },
  update(g, st, dt) {
    st.tick += dt;
    if (st.tick < 0.25) return;
    st.tick = 0;
    // drops on the map corrode the first thing they hit
    for (let i = 0; i < 18; i++) {
      const p = randomMapPoint(95);
      const hit = g.world.raycast(V(p.x, 200, p.z), V(0, -1, 0), 230);
      if (!hit || !hit.object || !hit.object.tags || hit.object.tags.has('indestructible')) continue;
      const part = hit.object;
      const area = Math.max(1, part.size.x * part.size.z);
      part.acid = (part.acid || 0) + 1;
      const need = 8 + area / 14;
      const k = Math.min(1, part.acid / need);
      g.world.setColor(part, part.baseColor.clone().lerp(GREEN, 0.25 + k * 0.75));
      if (part.acid >= need) {
        g.effects.puff(hit.point, 0x7bd34b, 4, 1);
        if (area > 200) g.world.removePart(part); else if (!g.world.unanchor(part)) g.world.removePart(part);
        if (Math.random() < 0.5) g.world.removePart(part);
      }
    }
    for (const c of g.chars) {
      if (!c.alive) continue;
      if (!g.island.onIsland(c.pos)) continue;
      if (isOutdoors(g, c)) c.damage(1.3, 'acid', true);
      const gp = c.groundPart;
      if (gp && gp.acid && gp.acid > 3) c.damage(0.8, 'acid', true);
    }
  },
  stop(g) {
    g.effects.setWeather('acid', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
