import * as THREE from 'three';
import { clamp, pick, OCEAN_LEVEL } from '../util.js';
import { V, isHost, locals } from './common.js';

const SPEED = 46, THICK = 40, SPAN = 460;

// A bright blue wave forms out at sea and sweeps across the island, shrinking a little as
// it comes ashore. It washes away the bricks it covers; the water dissolves anyone it
// covers past the waist (feet-deep water just hurts and shoves you). A second, smaller wave follows.
function waveShape(H) {
  // cross-section: long back slope, a crest that curls forward, steep face
  const s = new THREE.Shape();
  s.moveTo(-THICK, 0);
  s.bezierCurveTo(-THICK * 0.55, H * 0.15, -THICK * 0.4, H * 0.95, -6, H);
  s.bezierCurveTo(-1, H * 1.02, 3, H * 0.96, 4.5, H * 0.82);   // curling lip
  s.bezierCurveTo(2.5, H * 0.78, 1, H * 0.7, 1.2, H * 0.55);
  s.bezierCurveTo(1.6, H * 0.3, 3, H * 0.1, 4, 0);
  s.lineTo(-THICK, 0);
  return s;
}

export default {
  name: 'Tsunami',
  warning: 'Tsunami! Get to the higher ground',
  duration: 90,
  bot: 'high-ish',
  params(g) {
    // usually about the second-tallest floor: high roofs survive, the tallest tower tends to collapse
    const h = clamp(g.map.tallest * 0.68, 18, 56);
    return { dir: pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), h };
  },
  start(g, st) {
    st.dir = V(st.p.dir?.[0] ?? 1, 0, st.p.dir?.[1] ?? 0);
    const h = st.p.h || 30;
    st.waves = [{ delay: 4, height: h }, { delay: 42, height: h * 0.7 }];
    st.t = st.late || 0;
    // rushing water is heard before the wave arrives
    g.audio.loop('roar', true, { type: 'brown', freq: 260, gain: 0.35, lfo: 0.3 });
  },
  spawnWave(g, st, w) {
    const H = w.height - OCEAN_LEVEL;
    const geo = new THREE.ExtrudeGeometry(waveShape(H), { depth: SPAN, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -SPAN / 2);
    // NDS's wave is a bright, shiny ("Foil") blue that stands out against the darker sea
    const mat = new THREE.MeshStandardMaterial({ color: 0x38b2ff, emissive: 0x0c4f8f, metalness: 0.15, roughness: 0.25, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    // white foam along the crest
    const foam = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, SPAN), new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.6, transparent: true, opacity: 0.92 }));
    foam.position.set(-3, H - 0.4, 0);
    mesh.add(foam);
    // the shape points along +x: turn it to face the travel direction
    mesh.rotation.y = Math.atan2(-st.dir.z, st.dir.x);
    g.scene.add(mesh);
    w.mesh = mesh; w.H = H;
    w.front = -235;
    w.active = true;
  },
  update(g, st, dt) {
    st.t += dt;
    for (const w of st.waves) {
      if (!w.mesh && !w.done && st.t >= w.delay) this.spawnWave(g, st, w);
      if (!w.active) continue;
      w.front += SPEED * dt;
      // taller out at sea, shrinks as it rolls over the island
      const scale = w.front < -175 ? 1.25 : w.front < -140 ? 1.25 - (w.front + 175) / 35 * 0.25 : clamp(1 - (w.front + 140) / 300 * 0.2, 0.8, 1);
      const top = OCEAN_LEVEL + w.H * scale;
      const c = st.dir.clone().multiplyScalar(w.front);
      w.mesh.position.set(c.x, OCEAN_LEVEL, c.z);
      w.mesh.scale.set(1, scale, 1);
      const back = w.front - THICK, front = w.front + 3;
      // spray off the crest
      if (Math.random() < 0.6) {
        const sp = V(c.x, top + 1, c.z).addScaledVector(V(st.dir.z, 0, -st.dir.x), (Math.random() - .5) * 300);
        g.effects.puff(sp, 0xffffff, 6, 1.2, V(st.dir.x * SPEED, 6, st.dir.z * SPEED));
      }
      // the wave washes away the bricks it covers
      if (isHost(g)) {
        const push = { x: st.dir.x * 62, y: 10, z: st.dir.z * 62 };
        for (const p of g.world.parts) {
          if (p.tags.has('indestructible') || p.tags.has('corpse')) continue;
          const t = p.body.translation();
          const s = t.x * st.dir.x + t.z * st.dir.z;
          if (s < back || s > front || t.y > top) continue;
          g.world.unanchor(p);
          g.world.push(p, push, false);
          if (!p.lifetime) p.lifetime = (g.world.time - p.created) + 8;
        }
      }
      for (const ch of locals(g)) {
        if (!ch.alive || g.island.inTower(ch.pos)) continue;
        const s = ch.pos.x * st.dir.x + ch.pos.z * st.dir.z;
        if (s < back || s > front) continue;
        if (top > ch.pos.y + 2.2) ch.die('tsunami');
        else if (top > ch.pos.y && (ch.waveHit || 0) < g.time) {
          ch.waveHit = g.time + 0.6;
          ch.damage(20, 'tsunami');
          ch.addVelocity({ x: st.dir.x * 40, y: 12, z: st.dir.z * 40 });
        }
      }
      if (w.front > -150 && !w.splashed) { w.splashed = true; g.audio.noise('brown', 4, { freq: 500, gain: 0.8 }); g.shakeAll(0.4, 2); }
      if (w.front > 265) {
        w.active = false; w.done = true;
        g.scene.remove(w.mesh); w.mesh.geometry.dispose();
        w.mesh = null;
        // leftover water drains slowly
        g.setWaterLevel(3);
        st.drainAt = st.t + 2;
      }
    }
    if (st.drainAt && st.t >= st.drainAt) { st.drainAt = 0; g.recedeWater(18); }
  },
  stop(g, st) {
    for (const w of st.waves || []) if (w.mesh) g.scene.remove(w.mesh);
    g.audio.loop('roar', false);
    g.recedeWater();
  },
};
