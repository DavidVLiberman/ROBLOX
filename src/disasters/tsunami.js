import * as THREE from 'three';
import { clamp, pick, OCEAN_LEVEL } from '../util.js';
import { getMaterial } from '../materials.js';
import { V } from './common.js';

const SPEED = 46, THICK = 34, SPAN = 460;

export default {
  name: 'Tsunami',
  warning: 'Tsunami! Get to the higher ground',
  icon: '🌊',
  duration: 90,
  sky: 'clear',
  bot: 'high-ish',
  preWarn(g, st) {
    st.dir = pick([V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)]);
  },
  start(g, st) {
    st.dir ||= V(1, 0, 0);
    // usually about the second-tallest floor: high roofs survive, the tallest tower tends to collapse
    const h = clamp(g.map.tallest * 0.68, 18, 56);
    st.waves = [{ delay: 4, height: h }, { delay: 42, height: h * 0.7 }];
    st.t = 0;
    st.roar = false;
    // rushing water sound plays before the wave arrives
    g.audio.loop('roar', true, { type: 'brown', freq: 260, gain: 0.35, lfo: 0.3 });
  },
  spawnWave(g, st, w) {
    const mat = getMaterial('water').clone();
    mat.color.set(0x2f86d8); mat.opacity = 0.85;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    const foam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    const H = w.height - OCEAN_LEVEL;
    const alongX = Math.abs(st.dir.x) > 0;
    mesh.scale.set(alongX ? THICK : SPAN, H, alongX ? SPAN : THICK);
    foam.scale.set(alongX ? THICK + 2 : SPAN, 3, alongX ? SPAN : THICK + 2);
    g.scene.add(mesh, foam);
    w.mesh = mesh; w.foam = foam;
    w.front = -230;     // distance along dir
    w.active = true;
  },
  update(g, st, dt) {
    st.t += dt;
    for (const w of st.waves) {
      if (!w.mesh && st.t >= w.delay) this.spawnWave(g, st, w);
      if (!w.active) continue;
      w.front += SPEED * dt;
      const H = w.height;
      const c = st.dir.clone().multiplyScalar(w.front - THICK / 2);
      w.mesh.position.set(c.x, OCEAN_LEVEL + (H - OCEAN_LEVEL) / 2, c.z);
      w.foam.position.set(c.x, H, c.z);
      const back = w.front - THICK, front = w.front + 2;
      // destroy everything below wave height in the wave body
      const push = { x: st.dir.x * 62, y: 10, z: st.dir.z * 62 };
      for (const p of g.world.parts) {
        if (p.tags.has('indestructible')) continue;
        const t = p.body.translation();
        const s = t.x * st.dir.x + t.z * st.dir.z;
        if (s < back || s > front || t.y > H) continue;
        g.world.unanchor(p);
        g.world.push(p, push, false);
        if (!p.lifetime) { p.lifetime = (g.world.time - p.created) + 8; }
      }
      for (const ch of g.chars) {
        if (!ch.alive || g.island.inTower(ch.pos)) continue;
        const s = ch.pos.x * st.dir.x + ch.pos.z * st.dir.z;
        if (s > back && s < front && ch.pos.y + 1 < H) ch.die('tsunami');
      }
      if (w.front > 260) {
        w.active = false;
        g.scene.remove(w.mesh, w.foam);
        // leftover water drains slowly
        g.setWaterLevel(3, true);
        setTimeout(() => g.recedeWater(18), 2000);
      }
      if (w.front > -190 && !w.splashed) { w.splashed = true; g.audio.noise('brown', 4, { freq: 500, gain: 0.8 }); }
    }
    if (st.t > 24 && !st.roarOff) { st.roarOff = true; }
  },
  stop(g, st) {
    for (const w of st.waves || []) if (w.mesh) g.scene.remove(w.mesh, w.foam);
    g.audio.loop('roar', false);
    g.recedeWater();
  },
};
