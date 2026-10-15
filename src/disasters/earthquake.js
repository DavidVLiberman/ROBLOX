import * as THREE from 'three';
import { mapParts, isHost, locals, V, seeded } from './common.js';
import { rand } from '../util.js';

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();

// NDS: the whole map shakes for about 100 seconds and the ground drifts back and forth
// like a conveyor belt, carrying players and anything loose with it. Bricks shake loose
// (high ones first). Get outside, away from anything tall.
export default {
  name: 'Earthquake',
  warning: 'Earthquake! Get outside and stay away from buildings!',
  duration: 100,
  bot: 'open',
  params() { return { s: (rand() * 0x7fffffff) | 0 }; },
  start(g, st) {
    st.t = st.late || 0; st.tick = 0;
    // the drift: a new direction and speed every few seconds, the same on every machine
    const r = seeded(st.p.s ?? 1);
    st.legs = [];
    for (let t = 0; t < this.duration + 10;) {
      const len = 4 + r() * 5;
      st.legs.push({ t, len, a: r() * Math.PI * 2, sp: 4 + r() * 5 });
      t += len;
    }
    st.belt = V();
    g.audio.loop('rumble', true, { type: 'brown', freq: 140, gain: 0.6, lfo: 1.5 });
  },
  strength(st) { return Math.min(1, 0.45 + st.t / 25); },
  // ground velocity at time t (eases from one leg into the next)
  drift(st, t) {
    const legs = st.legs;
    let i = 0;
    while (i < legs.length - 1 && legs[i + 1].t <= t) i++;
    const a = legs[i], b = legs[Math.min(legs.length - 1, i + 1)];
    const k = Math.min(1, Math.max(0, (t - a.t) / a.len));
    const e = k < 0.75 ? 0 : (k - 0.75) / 0.25;          // turn during the last quarter of a leg
    const s = e * e * (3 - 2 * e);
    const ax = Math.cos(a.a) * a.sp, az = Math.sin(a.a) * a.sp;
    const bx = Math.cos(b.a) * b.sp, bz = Math.sin(b.a) * b.sp;
    return st.belt.set(ax + (bx - ax) * s, 0, az + (bz - az) * s).multiplyScalar(this.strength(st));
  },
  update(g, st, dt) {
    st.t += dt;
    st.tick += dt;
    const strength = this.strength(st);
    const belt = this.drift(st, st.t);
    this.shakeMap(g, st, strength);
    g.shakeAll(0.3 * strength, 0.2);
    if (Math.random() < dt * 4) g.effects.puff(V((Math.random() - .5) * 220, 1, (Math.random() - .5) * 220), 0x9c8a70, 8, 2, V(belt.x, 3, belt.z));
    // the ground carries everyone standing on it (a seat on a loose part rides that part)
    for (const c of locals(g)) {
      if (!c.alive || c.seat || !c.grounded || !g.island.onIsland(c.pos)) continue;
      const gp = c.groundPart;
      if (gp && !gp.anchored) continue;
      c.ext.x += (belt.x - c.ext.x) * Math.min(1, dt * 12);
      c.ext.z += (belt.z - c.ext.z) * Math.min(1, dt * 12);
    }
    if (isHost(g)) {
      // ...and anything loose lying on the ground or a floor
      for (const p of g.world.dynamic) {
        if (p.tags.has('corpse')) continue;
        const v = p.body.linvel();
        if (Math.abs(v.y) > 3 || Math.abs(belt.x - v.x) + Math.abs(belt.z - v.z) < 0.8) continue;
        const k = Math.min(1, dt * 4);
        g.world.push(p, { x: (belt.x - v.x) * k, y: 0, z: (belt.z - v.z) * k });
      }
    }
    if (st.tick < 0.35) return;
    st.tick = 0;
    if (isHost(g)) {
      const parts = mapParts(g).filter(p => p.anchored && !p.tags.has('indestructible'));
      // it gets worse as it goes on, but a building takes most of the 100 seconds to come down
      const n = Math.max(1, Math.round(parts.length * (0.0015 + st.t * 0.00004)));
      for (let i = 0; i < n && parts.length; i++) {
        const p = parts[Math.floor(rand() * parts.length)];
        const y = p.body.translation().y;
        if (rand() < 0.15 + y / 50) g.world.unanchor(p, { x: belt.x + (rand() - .5) * 8, y: 2, z: belt.z + (rand() - .5) * 8 });
      }
      for (const p of g.world.dynamic) {
        if (p.tags.has('corpse')) continue;
        if (rand() < 0.4) g.world.push(p, { x: (rand() - .5) * 10 * strength, y: rand() * 6 * strength, z: (rand() - .5) * 10 * strength });
      }
    }
    // the jolts throw about anyone standing on something loose (jumping helps, chairs are safe)
    for (const c of locals(g)) {
      if (!c.alive || c.seat || !c.grounded) continue;
      const loose = c.groundPart && !c.groundPart.anchored;
      const k = (loose ? 22 : 6) * strength;
      c.ext.x += (Math.random() - .5) * k; c.ext.z += (Math.random() - .5) * k;
      if (loose) c.vel.y += Math.random() * 10;
    }
  },
  // The map visibly shakes: every standing brick is drawn a little off its real place,
  // more the higher up it is (so buildings sway). Only the picture moves, never the bricks
  // themselves, so it costs no network traffic and is the same on every machine.
  shakeMap(g, st, strength) {
    const parts = g.map?.parts;
    if (!parts) return;
    const t = g.time;
    const ox = (Math.sin(t * 21.7) * 0.6 + Math.sin(t * 34.3 + 1.3) * 0.4) * strength;
    const oz = (Math.sin(t * 18.9 + 2.1) * 0.6 + Math.sin(t * 29.1 + 0.4) * 0.4) * strength;
    const oy = Math.sin(t * 39.5) * 0.12 * strength;
    for (const p of parts) {
      if (!p.alive || !p.anchored || p.vehicle) continue;
      const tr = p.body.translation(), r = p.body.rotation();
      const k = 0.35 + Math.min(1.1, Math.max(0, tr.y) / 40);
      _p.set(tr.x + ox * k, tr.y + oy, tr.z + oz * k);
      _q.set(r.x, r.y, r.z, r.w);
      _m.compose(_p, _q, p.size);
      p.pool.set(p.inst, _m);
      if (p.decals) for (const d of p.decals) {
        d.mesh.position.copy(d.offset).applyQuaternion(_q).add(_p);
        d.mesh.quaternion.copy(_q).multiply(d.rot);
      }
    }
    st.shaken = true;
  },
  stop(g, st) {
    // put every brick back where it really is
    if (st.shaken && g.map) for (const p of g.map.parts) if (p.alive) g.world.syncPart(p);
    st.shaken = false;
    g.audio.loop('rumble', false);
  },
};
