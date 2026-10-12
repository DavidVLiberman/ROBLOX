import * as THREE from 'three';
import { V, charsOnIsland } from './common.js';
import { pick } from '../util.js';

const LIMIT = 148;     // never enters the brown rim
const N = 900;

export default {
  name: 'Tornado',
  warning: "Tornado! Stay clear of it's path",
  icon: '🌪️',
  duration: 60,
  sky: 'dark',
  bot: 'away-tornado',
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    // can spawn right on top of players
    const near = charsOnIsland(g, false);
    const c = near.length && Math.random() < 0.35 ? pick(near).pos : V((Math.random() - .5) * 160, 0, (Math.random() - .5) * 160);
    st.pos = V(c.x, 0, c.z);
    st.wp = this.waypoint(g);
    st.t = 0;
    // funnel: swirling particle helix + translucent cone
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    st.seeds = Array.from({ length: N }, () => [Math.random(), Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.6]);
    st.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9a948c, map: g.effects.smokeTex, size: 7, transparent: true, opacity: 0.85, depthWrite: false }));
    st.points.frustumCulled = false;
    st.cone = new THREE.Mesh(new THREE.CylinderGeometry(42, 10, 130, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x77736e, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    g.scene.add(st.points, st.cone);
    g.hazardPos = st.pos;
    g.audio.loop('tornado', true, { type: 'brown', freq: 380, q: 0.6, gain: 0.5, lfo: 0.5 });
  },
  waypoint(g) {
    const live = charsOnIsland(g, false);
    if (live.length && Math.random() < 0.4) { const p = pick(live).pos; return V(Math.max(-LIMIT, Math.min(LIMIT, p.x)), 0, Math.max(-LIMIT, Math.min(LIMIT, p.z))); }
    return V((Math.random() * 2 - 1) * 120, 0, (Math.random() * 2 - 1) * 120);
  },
  radiusAt(y) { return 13 + Math.max(0, y) * 0.22; },
  update(g, st, dt) {
    st.t += dt;
    const to = st.wp.clone().sub(st.pos); to.y = 0;
    if (to.length() < 6) st.wp = this.waypoint(g);
    else st.pos.addScaledVector(to.normalize(), 15 * dt);
    st.pos.x = Math.max(-LIMIT, Math.min(LIMIT, st.pos.x));
    st.pos.z = Math.max(-LIMIT, Math.min(LIMIT, st.pos.z));
    st.cone.position.set(st.pos.x, 65, st.pos.z);
    st.cone.rotation.y += dt * 4;
    const arr = st.points.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const s = st.seeds[i];
      s[0] = (s[0] + dt * 0.08 * s[2]) % 1;
      s[1] += dt * (5 - s[0] * 2.5) * s[2];
      const y = s[0] * 130, r = this.radiusAt(y) * (0.6 + 0.4 * Math.sin(s[1] * 0.5 + i));
      arr[i * 3] = st.pos.x + Math.cos(s[1]) * r;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = st.pos.z + Math.sin(s[1]) * r;
    }
    st.points.geometry.attributes.position.needsUpdate = true;

    // suck up and fling parts
    for (const p of g.world.parts) {
      if (p.tags.has('indestructible') || p.tags.has('corpse')) continue;
      const t = p.body.translation();
      const dx = t.x - st.pos.x, dz = t.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      const R = this.radiusAt(t.y);
      if (d > R + 4 || t.y > 140) continue;
      const vol = p.size.x * p.size.y * p.size.z;
      if (p.anchored) {
        if (vol > 6000 || Math.random() > dt * (d < R * 0.7 ? 5 : 2.5)) continue;
        g.world.unanchor(p);
      }
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const tang = 70, inward = t.y < 90 ? 14 : -60, up = t.y < 100 ? 45 : 5;
      g.world.push(p, { x: -nz * tang - nx * inward, y: up, z: nx * tang - nz * inward }, false);
    }
    // lift players: the funnel itself does no damage, the debris does
    for (const c of g.chars) {
      if (!c.alive) continue;
      const dx = c.pos.x - st.pos.x, dz = c.pos.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > this.radiusAt(c.pos.y) + 2 || c.pos.y > 140) continue;
      if (c.seat) c.unsit();
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const out = c.pos.y > 80 ? 70 : -10;
      c.ext.x = -nz * 45 + nx * out; c.ext.z = nx * 45 + nz * out;
      c.vel.y = c.pos.y < 85 ? Math.max(c.vel.y, 32) : c.vel.y;
      c.grounded = false;
    }
    if (g.player) {
      const d = g.player.pos.distanceTo(st.pos);
      g.audio.loops.tornado && (g.audio.loops.tornado.g.gain.value = Math.max(0.08, Math.min(0.8, 50 / (d + 10))));
      if (d < 60) g.camController.shake = Math.max(g.camController.shake, 0.25);
    }
  },
  stop(g, st) {
    if (st.points) g.scene.remove(st.points, st.cone);
    g.audio.loop('tornado', false); g.audio.loop('wind', false);
    g.hazardPos = null;
  },
};
