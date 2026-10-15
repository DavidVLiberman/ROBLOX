import * as THREE from 'three';
import { mapParts, isHost, locals } from './common.js';
import { rand } from '../util.js';

const CHAR = new THREE.Color(0x1d1a18);
// burning bricks turn clearly yellow, orange or red
const HOT = [new THREE.Color(0xffd21f), new THREE.Color(0xff7a12), new THREE.Color(0xe02a12)];

// Fire starts at the map's fire start and spreads brick to brick (never onto grass).
// A brick with small flames is heating up and about to catch; burning bricks turn
// yellow, orange or red and take 40 health per touch; burnt-out bricks are black and
// safe, and some of them fall away. It is NDS's only disaster without a sound.
export default {
  name: 'Fire',
  warning: 'Fire! Keep distance from the fire!',
  duration: 95,
  bot: 'away-fire',
  start(g, st) {
    st.burning = new Map();
    st.heating = new Map();
    st.tick = 0;
    let starts = g.map.fireStarts.filter(p => p.alive);
    if (!starts.length) { const all = mapParts(g); if (all.length) starts = [all[Math.floor(rand() * all.length)]]; }
    if (isHost(g)) for (const p of starts) this.ignite(g, st, p);
    g.hazardPos = starts[0] ? starts[0].position : null;
  },
  flammable(p) {
    return p.alive && !p.burnt && !p.tags.has('indestructible') && !p.tags.has('glass') && p.mat !== 'grass' && p.mat !== 'glass';
  },
  heat(g, st, p) {
    if (!this.flammable(p) || st.burning.has(p) || st.heating.has(p)) return;
    st.heating.set(p, g.time + 2 + rand() * 2.5);
    g.effects.setFlame(p, 2);
  },
  ignite(g, st, p) {
    if (!this.flammable(p) || st.burning.has(p)) return;
    st.heating.delete(p);
    st.burning.set(p, g.time + 7 + rand() * 6);
    g.effects.setFlame(p, 1);
    g.world.setColor(p, p.baseColor.clone().lerp(HOT[Math.floor(rand() * HOT.length)], 0.92));
  },
  update(g, st, dt) {
    st.tick += dt;
    if (st.tick < 0.5) return;
    st.tick = 0;
    if (isHost(g)) {
      for (const [p, at] of st.heating) {
        if (!p.alive) { st.heating.delete(p); continue; }
        if (g.time >= at) this.ignite(g, st, p);
      }
      const spread = [];
      for (const [p, until] of st.burning) {
        if (!p.alive) { st.burning.delete(p); g.effects.setFlame(p, 0); continue; }
        // spreads to anything touching
        for (const n of p.neighbors) {
          if (rand() < (n.tags.has('flammable') || n.mat === 'wood' || n.mat === 'fabric' ? 0.3 : 0.11)) spread.push(n);
        }
        // burning debris lights what it lands on
        if (!p.anchored && rand() < 0.3) for (const q of g.world.partsNear(p.position, Math.max(p.size.x, p.size.z) / 2 + 1.5)) if (q !== p && rand() < 0.2) spread.push(q);
        if (g.time > until) {
          // burnt black, then safe
          st.burning.delete(p);
          p.burnt = true;
          g.effects.setFlame(p, 0);
          g.world.setColor(p, CHAR);
          if (rand() < 0.25) g.world.unanchor(p);
        }
      }
      for (const n of spread) this.heat(g, st, n);
    }
    // touching a burning brick hurts
    for (const c of locals(g)) {
      if (!c.alive || (c.fireCd || 0) > g.time) continue;
      for (const p of g.effects.burning) {
        if (!p.alive) continue;
        const b = g.world.aabb(p);
        if (c.pos.x + 1.4 < b.minX || c.pos.x - 1.4 > b.maxX || c.pos.z + 1.4 < b.minZ || c.pos.z - 1.4 > b.maxZ) continue;
        if (c.pos.y > b.maxY + 1.2 || c.pos.y + 5.5 < b.minY) continue;
        c.fireCd = g.time + 0.9;
        c.damage(40, 'fire');
        break;
      }
    }
  },
  // a player who takes over hosting keeps the fire going from what is burning now
  promote(g, st) {
    for (const p of g.effects.burning) if (p.alive) st.burning.set(p, g.time + 4 + rand() * 6);
    for (const [p, lv] of g.effects.flameLevels) if (lv === 2 && p.alive) st.heating.set(p, g.time + 1 + rand() * 2);
  },
  stop(g, st) {
    for (const p of [...g.effects.flameLevels.keys()]) g.effects.setFlame(p, 0);
    st.burning?.clear(); st.heating?.clear();
    g.hazardPos = null;
  },
};
