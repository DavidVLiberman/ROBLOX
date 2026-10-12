import * as THREE from 'three';
import { V, isHost, locals, emit, seeded } from './common.js';
import { pick } from '../util.js';

const geo = new THREE.SphereGeometry(0.35, 8, 6);
const mat = new THREE.MeshStandardMaterial({ color: 0x9b30d9, emissive: 0x3a0a55, roughness: 0.4 });

// One player is patient zero. Infected players cough clouds of purple droplets;
// touching a droplet infects you. The infected slowly lose health and there is no
// cure, though Red Apples help you hold on until the round ends.
export default {
  name: 'Deadly Virus',
  warning: 'Deadly Virus! Avoid crowd',
  duration: 90,
  bot: 'avoid-crowd',
  start(g, st) {
    st.drops = [];
    st.mesh = new THREE.InstancedMesh(geo, mat, 800);
    st.mesh.count = 0; st.mesh.frustumCulled = false;
    g.scene.add(st.mesh);
    st.tick = 0;
    if (isHost(g)) {
      const live = g.chars.filter(c => c.alive && c.inRound);
      if (live.length) emit(g, st, { k: 'i', eid: this.eid(g, pick(live)), host: 1 });
    }
  },
  eid(g, c) { return g.net ? g.net.eidOf(c) : c.name; },
  byEid(g, eid) { return g.net ? g.net.charByEid(eid) : g.chars.find(c => c.name === eid); },
  infect(g, c, patientZero = false) {
    if (c.infected || c.remote) return;
    c.infected = true;
    c.isHost = patientZero;
    c.nextCough = g.time + 1 + Math.random() * 2;
    if (c.isPlayer) g.ui.toast(patientZero ? 'You are the host of the virus!' : 'You have been infected!');
  },
  onEvent(g, st, ev) {
    if (ev.k === 'i') { const c = this.byEid(g, ev.eid); if (c && c.local) this.infect(g, c, !!ev.host); return; }
    if (ev.k !== 'c') return;
    // a cough: every machine expands it into the same droplets
    const c = this.byEid(g, ev.eid);
    const r = seeded(ev.seed);
    const fwd = V(Math.sin(ev.yaw), 0, Math.cos(ev.yaw));
    const head = V(ev.p[0], ev.p[1] + 4.6, ev.p[2]);
    g.audio.cough(head);
    const n = 6 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const v = fwd.clone().multiplyScalar(16 + r() * 14);
      v.x += (r() - .5) * 12; v.z += (r() - .5) * 12; v.y = 6 + r() * 8;
      st.drops.push({ pos: head.clone().addScaledVector(fwd, 1), vel: v, stuck: false, until: g.time + 9, owner: c });
    }
    g.effects.puff(head.clone().addScaledVector(fwd, 1.5), 0xb05ae0, 3, 0.8);
  },
  update(g, st, dt) {
    // the characters this machine simulates cough on their own schedule
    for (const c of locals(g)) {
      if (!c.alive || !c.infected) continue;
      if (g.time >= c.nextCough) {
        c.nextCough = g.time + (c.isHost ? 2.2 : 4) + Math.random() * 2.5;
        emit(g, st, { k: 'c', eid: this.eid(g, c), seed: (Math.random() * 1e9) | 0, yaw: Math.round(c.yaw * 100) / 100, p: [c.pos.x, c.pos.y, c.pos.z].map(v => Math.round(v * 10) / 10) });
      }
    }
    // a purple haze around anyone infected
    for (const c of g.chars) if (c.alive && c.infected && Math.random() < dt * 3) g.effects.puff(c.head.add(V((Math.random() - .5) * 2, -1, (Math.random() - .5) * 2)), 0xa04ad8, 1.2, 1, V(0, 1, 0));
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
      let gone = false;
      for (const c of locals(g)) {
        if (!c.alive || c.infected || c === d.owner) continue;
        const dx = c.pos.x - d.pos.x, dz = c.pos.z - d.pos.z;
        if (dx * dx + dz * dz < 2.2 && d.pos.y > c.pos.y - 0.5 && d.pos.y < c.pos.y + 5.5) { this.infect(g, c); st.drops.splice(i, 1); gone = true; break; }
      }
      if (!gone && k < 800) { m.makeTranslation(d.pos.x, d.pos.y, d.pos.z); st.mesh.setMatrixAt(k++, m); }
    }
    st.mesh.count = k;
    st.mesh.instanceMatrix.needsUpdate = true;
    st.tick += dt;
    if (st.tick >= 1) {
      st.tick = 0;
      for (const c of locals(g)) if (c.alive && c.infected) c.damage(c.isHost ? 1.6 : 2.6, 'virus', true);
    }
  },
  stop(g, st) {
    if (st.mesh) g.scene.remove(st.mesh);
    st.drops = [];
    for (const c of g.chars) { if (c.local) c.infected = false; c.isHost = false; }
  },
};

