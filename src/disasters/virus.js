import * as THREE from 'three';
import { V } from './common.js';
import { pick } from '../util.js';

const geo = new THREE.SphereGeometry(0.35, 8, 6);
const mat = new THREE.MeshStandardMaterial({ color: 0x9b30d9, emissive: 0x3a0a55, roughness: 0.4 });

export default {
  name: 'Deadly Virus',
  warning: 'Deadly Virus! Avoid crowd',
  icon: '🦠',
  duration: 60,
  sky: 'clear',
  bot: 'avoid-crowd',
  start(g, st) {
    st.drops = [];
    st.mesh = new THREE.InstancedMesh(geo, mat, 600);
    st.mesh.count = 0; st.mesh.frustumCulled = false;
    g.scene.add(st.mesh);
    const live = g.chars.filter(c => c.alive && c.inRound);
    if (live.length) {
      const host = pick(live);
      this.infect(g, host);
      host.isHost = true;
      if (host.isPlayer) g.ui.toast('You are the host of the virus!');
    }
    st.tick = 0;
  },
  infect(g, c) {
    if (c.infected) return;
    c.infected = true;
    c.nextCough = g.time + 1 + Math.random() * 2;
    if (c.isPlayer) g.ui.toast('You have been infected!');
  },
  cough(g, st, c) {
    g.audio.cough(c.pos);
    const fwd = V(Math.sin(c.yaw), 0, Math.cos(c.yaw));
    const n = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const v = fwd.clone().multiplyScalar(16 + Math.random() * 14);
      v.x += (Math.random() - .5) * 12; v.z += (Math.random() - .5) * 12; v.y = 6 + Math.random() * 8;
      st.drops.push({ pos: c.head.add(fwd.clone().multiplyScalar(1)), vel: v, stuck: false, until: g.time + 9, owner: c });
    }
    g.effects.puff(c.head.add(fwd.clone().multiplyScalar(1.5)), 0xb05ae0, 3, 0.8);
  },
  update(g, st, dt) {
    for (const c of g.chars) {
      if (!c.alive || !c.infected) continue;
      if (g.time >= c.nextCough) { c.nextCough = g.time + (c.isHost ? 2.2 : 4) + Math.random() * 2.5; this.cough(g, st, c); }
    }
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      if (g.time > d.until) { st.drops.splice(i, 1); continue; }
      if (!d.stuck) {
        d.vel.y -= 60 * dt;
        const step = d.vel.clone().multiplyScalar(dt);
        const hit = g.world.raycast(d.pos, step.clone().normalize(), step.length() + 0.3);
        if (hit || d.pos.y < 0.3) { d.stuck = true; if (hit) d.pos.copy(hit.point).addScaledVector(hit.normal, 0.3); else d.pos.y = 0.3; }
        else d.pos.add(step);
      }
      for (const c of g.chars) {
        if (!c.alive || c.infected || c === d.owner) continue;
        const dx = c.pos.x - d.pos.x, dz = c.pos.z - d.pos.z;
        if (dx * dx + dz * dz < 2.2 && d.pos.y > c.pos.y - 0.5 && d.pos.y < c.pos.y + 5.5) { this.infect(g, c); st.drops.splice(i, 1); break; }
      }
      if (k < 600 && st.drops[i] === d) { m.makeTranslation(d.pos.x, d.pos.y, d.pos.z); st.mesh.setMatrixAt(k++, m); }
    }
    st.mesh.count = k;
    st.mesh.instanceMatrix.needsUpdate = true;
    st.tick += dt;
    if (st.tick >= 1) {
      st.tick = 0;
      for (const c of g.chars) if (c.alive && c.infected) c.damage(c.isHost ? 1.6 : 2.6, 'virus', true);
    }
  },
  stop(g, st) {
    if (st.mesh) g.scene.remove(st.mesh);
    st.drops = [];
    for (const c of g.chars) { c.infected = false; c.isHost = false; }
  },
};
