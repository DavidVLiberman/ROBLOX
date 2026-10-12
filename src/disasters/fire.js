import * as THREE from 'three';
import { mapParts } from './common.js';

const CHAR = new THREE.Color(0x1d1a18);
const HOT = new THREE.Color(0xff7a20);

export default {
  name: 'Fire',
  warning: 'Fire! Keep distance from the fire',
  icon: '🔥',
  duration: 95,
  sky: 'clear',
  bot: 'away-fire',
  start(g, st) {
    st.burning = new Map();
    st.tick = 0;
    let starts = g.map.fireStarts.filter(p => p.alive);
    if (!starts.length) { const all = mapParts(g); if (all.length) starts = [all[Math.floor(Math.random() * all.length)]]; }
    for (const p of starts) this.ignite(g, st, p);
    g.hazardPos = starts[0] ? starts[0].position : null;
    g.audio.loop('fire', true, { freq: 3000, filter: 'highpass', gain: 0.12, lfo: 6 });
  },
  ignite(g, st, p) {
    if (!p.alive || p.burnt || st.burning.has(p) || p.tags.has('indestructible') || p.tags.has('glass')) return;
    st.burning.set(p, g.time + 7 + Math.random() * 6);
    g.effects.setFlame(p, true);
    g.world.setColor(p, p.baseColor.clone().lerp(HOT, 0.4));
  },
  update(g, st, dt) {
    st.tick += dt;
    if (st.tick < 0.5) return;
    st.tick = 0;
    const newly = [];
    for (const [p, until] of st.burning) {
      if (!p.alive) { st.burning.delete(p); g.effects.setFlame(p, false); continue; }
      // spread part-to-part to anything touching
      for (const n of p.neighbors) {
        if (n.alive && !n.burnt && !st.burning.has(n) && Math.random() < (n.tags.has('flammable') || n.mat === 'wood' || n.mat === 'fabric' ? 0.3 : 0.11)) newly.push(n);
      }
      if (!p.anchored && Math.random() < 0.3) for (const q of g.world.partsNear(p.position, Math.max(p.size.x, p.size.z) / 2 + 1.5)) if (q !== p && !q.burnt && Math.random() < 0.2) newly.push(q);
      if (g.time > until) {
        // burnt black, then safe
        st.burning.delete(p);
        p.burnt = true;
        g.effects.setFlame(p, false);
        g.world.setColor(p, CHAR);
        if (Math.random() < 0.25) g.world.unanchor(p);
      }
    }
    for (const n of newly) this.ignite(g, st, n);
    // touching a burning part hurts
    for (const c of g.chars) {
      if (!c.alive) continue;
      if ((c.fireCd || 0) > g.time) continue;
      for (const p of st.burning.keys()) {
        const b = g.world.aabb(p);
        if (c.pos.x + 1.4 < b.minX || c.pos.x - 1.4 > b.maxX || c.pos.z + 1.4 < b.minZ || c.pos.z - 1.4 > b.maxZ) continue;
        if (c.pos.y > b.maxY + 1.2 || c.pos.y + 5.5 < b.minY) continue;
        c.fireCd = g.time + 0.9;
        c.damage(38, 'fire');
        break;
      }
    }
  },
  stop(g, st) {
    for (const p of st.burning?.keys() || []) g.effects.setFlame(p, false);
    st.burning?.clear();
    g.audio.loop('fire', false);
    g.hazardPos = null;
  },
};
