import * as THREE from 'three';
import { V, isHost, locals, emit, seeded } from './common.js';
import { pick } from '../util.js';

const geo = new THREE.SphereGeometry(1, 8, 6);
const mat = new THREE.MeshStandardMaterial({ color: 0x9b30d9, emissive: 0x3a0a55, roughness: 0.4 });
// droplets come in three sizes: radius and the damage it does when it hits you
const DROP = [[0.25, 5], [0.4, 10], [0.6, 15]];
const MAX = 900;
// what an infected character does: a cough, a sneeze, or (rarely) a cat's sneeze
const COUGH = 0, SNEEZE = 1, CAT = 2;

// One player is patient zero. Infected players cough and sneeze clouds of purple
// droplets in three sizes; a droplet that hits you does 5, 10 or 15 damage and infects
// you. The infected slowly lose health and there is no cure, though Red Apples help you
// hold on until the round ends.
export default {
  name: 'Deadly Virus',
  warning: 'Deadly Virus! Avoid crowds!',
  duration: 90,
  bot: 'avoid-crowd',
  start(g, st) {
    st.drops = [];
    st.mesh = new THREE.InstancedMesh(geo, mat, MAX);
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
    // a cough or sneeze: every machine expands it into the same droplets
    const c = this.byEid(g, ev.eid);
    const r = seeded(ev.seed);
    const kind = ev.n ?? COUGH;
    const fwd = V(Math.sin(ev.yaw), 0, Math.cos(ev.yaw));
    const head = V(ev.p[0], ev.p[1] + 4.6, ev.p[2]);
    // a sneeze comes after its "ah... ah...", so its spray is a little late
    const delay = kind === SNEEZE ? 0.85 : kind === CAT ? 0.1 : 0;
    if (kind === SNEEZE) g.audio.sneeze?.(head); else if (kind === CAT) g.audio.catSneeze?.(head); else g.audio.cough(head);
    const n = kind === SNEEZE ? 14 + Math.floor(r() * 8) : kind === CAT ? 5 + Math.floor(r() * 4) : 6 + Math.floor(r() * 6);
    const speed = kind === SNEEZE ? 26 : kind === CAT ? 14 : 18, spread = kind === SNEEZE ? 18 : 12;
    for (let i = 0; i < n; i++) {
      const v = fwd.clone().multiplyScalar(speed + r() * 14);
      v.x += (r() - .5) * spread; v.z += (r() - .5) * spread; v.y = 6 + r() * 8;
      const size = r() < 0.5 ? 0 : r() < 0.65 ? 1 : 2;
      st.drops.push({ pos: head.clone().addScaledVector(fwd, 1), vel: v, stuck: false, wait: g.time + delay, until: g.time + delay + 9, owner: c, size });
    }
    setTimeout(() => g.effects.puff(head.clone().addScaledVector(fwd, 1.5), 0xb05ae0, kind === SNEEZE ? 4.5 : 3, 0.8), delay * 1000);
  },
  update(g, st, dt) {
    // the characters this machine simulates cough and sneeze on their own schedule
    for (const c of locals(g)) {
      if (!c.alive || !c.infected) continue;
      if (g.time >= c.nextCough) {
        c.nextCough = g.time + (c.isHost ? 2.2 : 4) + Math.random() * 2.5;
        const roll = Math.random();
        const n = roll < 0.08 ? CAT : roll < 0.4 ? SNEEZE : COUGH;
        emit(g, st, { k: 'c', n, eid: this.eid(g, c), seed: (Math.random() * 1e9) | 0, yaw: Math.round(c.yaw * 100) / 100, p: [c.pos.x, c.pos.y, c.pos.z].map(v => Math.round(v * 10) / 10) });
      }
    }
    // a purple haze around anyone infected
    for (const c of g.chars) if (c.alive && c.infected && Math.random() < dt * 3) g.effects.puff(c.head.add(V((Math.random() - .5) * 2, -1, (Math.random() - .5) * 2)), 0xa04ad8, 1.2, 1, V(0, 1, 0));
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      if (g.time > d.until) { st.drops.splice(i, 1); continue; }
      if (g.time < d.wait) continue;
      const rad = DROP[d.size][0];
      if (!d.stuck) {
        d.vel.y -= 60 * dt;
        const step = d.vel.clone().multiplyScalar(dt);
        const hit = g.world.raycast(d.pos, step.clone().normalize(), step.length() + rad);
        if (hit || d.pos.y < rad) { d.stuck = true; if (hit) d.pos.copy(hit.point).addScaledVector(hit.normal, rad); else d.pos.y = rad; }
        else d.pos.add(step);
      }
      let gone = false;
      for (const c of locals(g)) {
        if (!c.alive || c === d.owner) continue;
        const dx = c.pos.x - d.pos.x, dz = c.pos.z - d.pos.z, reach = 1.3 + rad;
        if (dx * dx + dz * dz < reach * reach && d.pos.y > c.pos.y - 0.5 && d.pos.y < c.pos.y + 5.5) {
          c.damage(DROP[d.size][1], 'virus');
          this.infect(g, c);
          st.drops.splice(i, 1); gone = true; break;
        }
      }
      if (!gone && k < MAX) { m.makeScale(rad, rad, rad).setPosition(d.pos.x, d.pos.y, d.pos.z); st.mesh.setMatrixAt(k++, m); }
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
    if (st.mesh) { g.scene.remove(st.mesh); st.mesh.dispose(); }
    st.drops = [];
    for (const c of g.chars) { if (c.local) c.infected = false; c.isHost = false; }
  },
};
