import * as THREE from 'three';
import { V, randomMapPoint, isOutdoors, isHost, locals } from './common.js';

// Bricks the rain lands on go grey, then green. A green brick works loose and burns
// anyone who touches it; more rain turns it dark green, then black, then it is gone.
// The rain itself stings anyone standing outside.
const STAGES = [
  [0.25, new THREE.Color(0x8e8e8e)],   // grey
  [0.55, new THREE.Color(0x4fbf3a)],   // green: breaks loose, hurts on touch
  [0.8, new THREE.Color(0x2b5a1f)],    // dark green
  [1.0, new THREE.Color(0x141414)],    // black
];

export default {
  name: 'Acid Rain',
  warning: 'Acid Rain! Stay indoors',
  duration: 95,
  bot: 'indoor-low',
  preWarn(g) {
    g.effects.setSky('acid');
    g.audio.loop('wind', true, { freq: 500, gain: 0.1, lfo: 0.25 });
  },
  start(g, st) {
    st.tick = 0;
    g.effects.setSky('acid');
    g.effects.setWeather('acid', true);
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2200, gain: 0.2 });
  },
  corrode(g, part, point) {
    const area = Math.max(1, part.size.x * part.size.z);
    part.acid = (part.acid || 0) + 1;
    const need = 6 + area / 16;
    const k = part.acid / need;
    if (k >= 1.25) { g.effects.puff(point, 0x3d6b2e, 4, 1); g.world.removePart(part); return; }
    let prev = part.baseColor, from = 0;
    for (const [at, col] of STAGES) {
      if (k <= at) { g.world.setColor(part, prev.clone().lerp(col, (k - from) / (at - from))); break; }
      prev = col; from = at;
      if (at === 1.0) g.world.setColor(part, col);
    }
    if (k >= 0.4 && !part.tags.has('acidic')) {
      g.world.addNetTag(part, 'acidic');
      g.effects.puff(point, 0x7bd34b, 4, 1);
      if (area > 200) { if (k > 0.9) g.world.removePart(part); }
      else g.world.unanchor(part, { x: 0, y: 1, z: 0 });
    }
  },
  update(g, st, dt) {
    st.tick += dt;
    if (st.tick < 0.25) return;
    st.tick = 0;
    if (isHost(g)) {
      // drops corrode the first thing they hit
      for (let i = 0; i < 20; i++) {
        const p = randomMapPoint(95);
        const hit = g.world.raycast(V(p.x, 200, p.z), V(0, -1, 0), 230);
        if (!hit || !hit.object || !hit.object.tags || hit.object.tags.has('indestructible')) continue;
        this.corrode(g, hit.object, hit.point);
      }
    }
    for (const c of locals(g)) {
      if (!c.alive || !g.island.onIsland(c.pos)) continue;
      if (isOutdoors(g, c)) c.damage(1.2, 'acid', true);
      // touching corroded bricks burns
      const gp = c.groundPart;
      let touching = gp && gp.tags.has('acidic');
      if (!touching) {
        for (const q of g.world.partsNear(c.center, 3, q => q.tags.has('acidic'))) {
          const b = g.world.aabb(q);
          if (c.pos.x + 1.3 > b.minX && c.pos.x - 1.3 < b.maxX && c.pos.z + 1.3 > b.minZ && c.pos.z - 1.3 < b.maxZ && c.pos.y + 5.2 > b.minY && c.pos.y - 0.3 < b.maxY) { touching = true; break; }
        }
      }
      if (touching) c.damage(1, 'acid', true);
    }
  },
  stop(g) {
    g.effects.setWeather('acid', false);
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
