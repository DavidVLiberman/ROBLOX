import * as THREE from 'three';
import { V, disposeMesh } from './common.js';
import { BC, pick } from '../util.js';

const MH = 95, MD = 80, MW = 340;

export default {
  name: 'Avalanche',
  warning: 'Avalanche! Avoid the path of the snow!',
  icon: '🏔️',
  duration: 60,
  sky: 'snowy',
  bot: 'away-mountain',
  preWarn(g, st) {
    st.dir = pick([V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)]);   // direction the snow travels
    // mountain sits on the opposite side, sloping toward the map
    const back = st.dir.clone().negate();
    st.edge = 150;
    st.center = back.clone().multiplyScalar(st.edge + MD / 2 - 12);
    g.hazardPos = back.clone().multiplyScalar(st.edge);
    const yaw = Math.atan2(st.dir.x, st.dir.z) * 180 / Math.PI;
    st.parts = [];
    const mk = (o, yOff) => {
      const p = g.world.addPart({ ...o, tags: ['indestructible', 'mountain'] });
      p.yOff = yOff; st.parts.push(p); g.trackTemp(p); return p;
    };
    mk({ pos: [st.center.x, -MH, st.center.z], size: [MW, MH, MD], color: BC.rock, mat: 'slate', shape: 'wedge', rot: [0, yaw, 0] }, MH / 2);
    mk({ pos: [st.center.x, -MH, st.center.z], size: [MW - 6, MH, MD], color: 0xf4f7fa, mat: 'sand', shape: 'wedge', rot: [0, yaw, 0] }, MH / 2 + 1.2);
    st.rise = 0; st.rising = true;
    g.effects.setSky('snowy');
    g.audio.loop('rumble', true, { type: 'brown', freq: 120, gain: 0.5 });
    g.shakeAll(0.9, 12);
  },
  // height of the slope surface at signed distance s along dir
  slopeY(st, s) {
    const back = -(st.edge + MD - 12), front = -(st.edge - 12);
    if (s <= back) return MH;
    if (s >= front) return 0;
    return MH * (front - s) / MD;
  },
  start(g, st) {
    if (!st.parts) this.preWarn(g, st);
    st.balls = []; st.next = 0.5;
    g.effects.setWeather('snow', true, { wind: st.dir.clone().multiplyScalar(6) });
  },
  update(g, st, dt) {
    if (st.rising) {
      st.rise = Math.min(1, st.rise + dt / 12);
      for (const p of st.parts) {
        const t = p.body.translation();
        p._moved = true;
        g.world.movePart(p, V(t.x, -MH + MH * st.rise + p.yOff, t.z));
      }
      for (const pp of g.world.parts) {
        if (pp.tags.has('indestructible')) continue;
        const t = pp.body.translation();
        const s = t.x * st.dir.x + t.z * st.dir.z;
        if (t.y < this.slopeY(st, s) * st.rise) g.world.unanchor(pp, { x: st.dir.x * 20, y: 10, z: st.dir.z * 20 });
      }
      if (st.rise >= 1) st.rising = false;
    }
    if (!st.balls) return;
    st.next -= dt;
    if (st.next <= 0) {
      st.next = 0.7 + Math.random() * 0.9;
      const r = 4 + Math.random() * 5;
      const lateral = (Math.random() - .5) * 220;
      const side = V(st.dir.z, 0, -st.dir.x);
      const s = -(st.edge + MD - 16);
      const pos = st.dir.clone().multiplyScalar(s).addScaledVector(side, lateral);
      pos.y = this.slopeY(st, s) + r;
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: 0xf6f9fc, roughness: 0.9, flatShading: true }));
      mesh.castShadow = true;
      g.scene.add(mesh);
      st.balls.push({ mesh, pos, r, speed: 25 + Math.random() * 15 });
    }
    for (let i = st.balls.length - 1; i >= 0; i--) {
      const b = st.balls[i];
      const s0 = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      const onSlope = this.slopeY(st, s0) > 0;
      b.speed = Math.min(75, b.speed + (onSlope ? 40 : 4) * dt);
      b.pos.addScaledVector(st.dir, b.speed * dt);
      const s = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      b.pos.y = this.slopeY(st, s) + b.r;
      b.mesh.position.copy(b.pos);
      b.mesh.rotateOnWorldAxis(V(st.dir.z, 0, -st.dir.x), b.speed * dt / b.r);
      for (const p of g.world.partsNear(b.pos, b.r + 1, q => !q.tags.has('indestructible'))) {
        g.world.unanchor(p);
        g.world.push(p, { x: st.dir.x * b.speed * 1.1, y: 12, z: st.dir.z * b.speed * 1.1 }, false);
      }
      // hitbox smaller than the visual
      for (const c of g.chars) {
        if (!c.alive) continue;
        if (c.center.distanceTo(b.pos) < b.r * 0.7 + 1.5 && (c.snowHit || 0) < g.time) {
          c.snowHit = g.time + 0.8;
          c.damage(55, 'avalanche');
          c.addVelocity({ x: st.dir.x * 60, y: 25, z: st.dir.z * 60 });
        }
      }
      if (s > 240) { disposeMesh(g, b.mesh); st.balls.splice(i, 1); }
    }
    if (Math.random() < dt * 2) g.audio.noise('brown', 1.2, { freq: 200, gain: 0.25 });
  },
  stop(g, st) {
    for (const b of st.balls || []) disposeMesh(g, b.mesh);
    st.balls = null;
    g.effects.setWeather('snow', false);
    g.audio.loop('rumble', false);
    g.hazardPos = null;
  },
};
