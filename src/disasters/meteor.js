import * as THREE from 'three';
import { V, isHost, locals, emit, toArr, fromArr } from './common.js';
import { rand } from '../util.js';

const rockGeo = new THREE.IcosahedronGeometry(1, 1);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, emissive: 0xff4a00, emissiveIntensity: 0.55, roughness: 0.9, flatShading: true });

// About two meteors a second fall at random angles. They smash through a layer or two
// of a building before exploding; a direct hit kills, a near miss knocks you about.
export default {
  name: 'Meteor Shower',
  warning: 'Meteor Shower! Watch the skies and find shelter',
  duration: 95,
  bot: 'indoor-low',
  start(g, st) {
    st.list = []; st.next = 1;
    g.effects.setSky('volcano');
  },
  // host: launch one
  launch(g, st) {
    const target = V((rand() * 2 - 1) * 100, 0, (rand() * 2 - 1) * 100);
    const ang = rand() * Math.PI * 2, tilt = 0.2 + rand() * 0.6;
    const dir = V(Math.cos(ang) * tilt, -1, Math.sin(ang) * tilt).normalize();
    const start = target.clone().addScaledVector(dir, -340);
    emit(g, st, { k: 'm', s: toArr(start), v: toArr(dir.multiplyScalar(130 + rand() * 50)), r: Math.round((1.3 + rand() * 1.8) * 100) / 100, pc: rand() < 0.55 ? 2 : 1 });
  },
  onEvent(g, st, ev) {
    if (ev.k !== 'm') return;
    const mesh = new THREE.Mesh(rockGeo, rockMat);
    mesh.scale.setScalar(ev.r);
    mesh.castShadow = true;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: g.effects.flameTex, color: 0xff8a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(4.2);
    mesh.add(glow);
    const pos = fromArr(ev.s);
    mesh.position.copy(pos);
    g.scene.add(mesh);
    st.list.push({ mesh, glow, pos, vel: fromArr(ev.v), r: ev.r, pierce: ev.pc, ign: new Set(), spin: V(rand() - .5, rand() - .5, rand() - .5).multiplyScalar(8) });
    g.audio.whistle(pos.clone().addScaledVector(fromArr(ev.v).normalize(), 300));
  },
  update(g, st, dt) {
    if (isHost(g)) {
      st.next -= dt;
      if (st.next <= 0) { st.next = 0.35 + rand() * 0.4; this.launch(g, st); }
    }
    for (let i = st.list.length - 1; i >= 0; i--) {
      const m = st.list[i];
      const step = m.vel.clone().multiplyScalar(dt);
      const len = step.length();
      const hit = g.world.raycast(m.pos, step.clone().normalize(), len + m.r, { chars: true, filter: (c) => !m.ign.has(c.handle) });
      // fiery trail
      g.effects.puff(m.pos.clone(), 0xffa040, m.r * 2.6, 0.35);
      if (Math.random() < 0.6) g.effects.puff(m.pos.clone(), 0x4a4440, m.r * 3.2, 1.6, V(0, 2, 0));
      m.mesh.rotation.x += m.spin.x * dt; m.mesh.rotation.y += m.spin.y * dt;
      if (hit || m.pos.y < 0) {
        const p = hit ? hit.point : m.pos.clone().setY(0);
        const part = hit?.object?.size ? hit.object : null;
        // punch through roofs and floors a couple of times
        if (part && m.pierce > 0 && !part.tags.has('indestructible') && p.y > 1.5) {
          m.pierce--;
          m.ign.add(hit.collider.handle);
          this.impact(g, p, m.r, false);
          m.vel.multiplyScalar(0.75);
          m.pos.copy(p).addScaledVector(m.vel.clone().normalize(), 0.5);
          m.mesh.position.copy(m.pos);
          continue;
        }
        this.impact(g, p, m.r, true);
        g.scene.remove(m.mesh); m.glow.material.dispose();
        st.list.splice(i, 1);
        continue;
      }
      m.pos.add(step);
      m.mesh.position.copy(m.pos);
    }
  },
  impact(g, p, r, final) {
    const R = final ? 6 + r * 2 : 3.5 + r;
    if (isHost(g)) g.world.explode(p, R, final ? 70 : 45, { destroyChance: final ? 0.25 : 0.4 });
    g.effects.burst(p, { size: R * 1.6, life: 0.7, count: final ? 3 : 1 });
    if (final) g.effects.scorch(p, R * 0.8);
    g.audio.explosion(p, final ? 0.8 : 0.45);
    for (const c of locals(g)) {
      if (!c.alive) continue;
      const d = c.center.distanceTo(p);
      if (d < r + 2.6) c.die('meteor');
      else if (d < R + 3) {
        c.damage(35 * (1 - d / (R + 3)), 'meteor');
        c.addVelocity(c.center.sub(p).normalize().multiplyScalar(40));
      }
    }
    if (g.player.alive && g.player.pos.distanceTo(p) < 60) g.camController.shake = Math.max(g.camController.shake, final ? 0.7 : 0.35);
    if (!final) return;
    // a few cooling rock fragments (just for show)
    for (let k = 0; k < 3; k++) {
      const f = g.world.addPart({ pos: [p.x, p.y + 2, p.z], size: [1.2, 1.2, 1.2], color: 0x3a2418, mat: 'slate', anchored: false, tags: ['debris', 'nodamage'] });
      f.lifetime = 8;
      g.world.push(f, { x: (Math.random() - .5) * 60, y: 30 + Math.random() * 30, z: (Math.random() - .5) * 60 }, false);
      g.trackTemp(f);
    }
  },
  stop(g, st) {
    for (const m of st.list || []) { g.scene.remove(m.mesh); m.glow.material.dispose(); }
    st.list = [];
  },
};
