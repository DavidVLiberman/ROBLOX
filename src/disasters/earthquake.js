import * as THREE from 'three';
import { mapParts, isHost, locals, V } from './common.js';
import { rand } from '../util.js';

const crackMat = new THREE.MeshBasicMaterial({ color: 0x2a2018 });
const crackGeo = new THREE.BoxGeometry(1, 1, 1);

// The ground shakes harder and harder. Bricks shake loose (tall ones first), cracks open
// in the grass and anyone standing still gets thrown around. Get outside, away from
// anything tall, and keep hopping.
export default {
  name: 'Earthquake',
  warning: 'Earthquake! Get outside and stay away from tall structures',
  duration: 80,
  bot: 'open',
  start(g, st) {
    st.t = st.late || 0; st.tick = 0; st.cracks = []; st.crackT = 1;
    g.audio.loop('rumble', true, { type: 'brown', freq: 140, gain: 0.6, lfo: 1.5 });
  },
  update(g, st, dt) {
    st.t += dt;
    st.tick += dt;
    const strength = Math.min(1, 0.4 + st.t / 20);
    g.shakeAll(0.55 * strength, 0.2);
    // cracks in the ground (just for show) and dust
    st.crackT -= dt;
    if (st.crackT <= 0 && st.cracks.length < 30) {
      st.crackT = 1.2 + Math.random() * 1.5;
      const m = new THREE.Mesh(crackGeo, crackMat);
      const x = (Math.random() - .5) * 220, z = (Math.random() - .5) * 220;
      m.position.set(x, 0.05, z);
      m.rotation.y = Math.random() * Math.PI;
      m.scale.set(0.6 + Math.random() * 0.8, 0.1, 0);
      m.userData.len = 10 + Math.random() * 25;
      g.scene.add(m);
      st.cracks.push(m);
    }
    for (const m of st.cracks) if (m.scale.z < m.userData.len) m.scale.z = Math.min(m.userData.len, m.scale.z + dt * 12);
    if (Math.random() < dt * 4) g.effects.puff(V((Math.random() - .5) * 200, 1, (Math.random() - .5) * 200), 0x9c8a70, 8, 2, V(0, 3, 0));
    if (st.tick < 0.35) return;
    st.tick = 0;
    if (isHost(g)) {
      const parts = mapParts(g).filter(p => p.anchored);
      const n = Math.floor(2 + st.t * 0.25);
      for (let i = 0; i < n * 3 && parts.length; i++) {
        const p = parts[Math.floor(rand() * parts.length)];
        const y = p.body.translation().y;
        if (rand() < 0.15 + y / 50) g.world.unanchor(p, { x: (rand() - .5) * 8, y: 2, z: (rand() - .5) * 8 });
      }
      for (const p of g.world.dynamic) {
        if (p.tags.has('corpse')) continue;
        if (rand() < 0.4) g.world.push(p, { x: (rand() - .5) * 10 * strength, y: rand() * 6 * strength, z: (rand() - .5) * 10 * strength });
      }
    }
    // the ground jolts players that are standing still (jumping helps, chairs are safe)
    for (const c of locals(g)) {
      if (!c.alive || c.seat || !c.grounded) continue;
      const loose = c.groundPart && !c.groundPart.anchored;
      const k = (loose ? 22 : 9) * strength;
      c.ext.x += (Math.random() - .5) * k; c.ext.z += (Math.random() - .5) * k;
      if (loose) c.vel.y += Math.random() * 10;
    }
  },
  stop(g, st) {
    for (const m of st.cracks || []) g.scene.remove(m);
    st.cracks = [];
    g.audio.loop('rumble', false);
  },
};
