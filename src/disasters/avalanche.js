import * as THREE from 'three';
import { V, isHost, locals, emit } from './common.js';
import { BC, pick, rand } from '../util.js';

const MH = 95, MD = 80, MW = 340;
const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 0.95 });

// A snowy mountain rises beside the map before the warning. Then chunks of snow break
// off the top and slide down onto the island, flattening what is in their path.
// Behind sturdy buildings (or behind the mountain) is safest.
export default {
  name: 'Avalanche',
  warning: 'Avalanche! Avoid the path of the snow!',
  duration: 90,
  bot: 'away-mountain',
  // the mountain never rises on the lobby tower's side (-z)
  params() { return { dir: pick([[1, 0], [-1, 0], [0, -1]]) }; },
  setup(g, st) {
    if (st.parts) return;
    st.dir = V(st.p.dir?.[0] ?? 1, 0, st.p.dir?.[1] ?? 0);   // direction the snow travels
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
    g.audio.loop('rumble', true, { type: 'brown', freq: 120, gain: 0.5 });
    g.shakeAll(0.9, 10);
  },
  preWarn(g, st) { this.setup(g, st); g.effects.setSky('snowy'); },
  // height of the slope surface at signed distance s along dir
  slopeY(st, s) {
    const back = -(st.edge + MD - 12), front = -(st.edge - 12);
    if (s <= back) return MH;
    if (s >= front) return 0;
    return MH * (front - s) / MD;
  },
  start(g, st) {
    this.setup(g, st);
    if (st.late) st.rise = 1;
    st.chunks = []; st.next = 0.5;
    g.effects.setWeather('snow', true, { wind: st.dir.clone().multiplyScalar(6) });
  },
  // host: break a chunk off the top
  release(g, st) {
    emit(g, st, { k: 'c', lat: Math.round((rand() - .5) * 220), s: Math.round((3 + rand() * 6) * 10) / 10, sp: Math.round(25 + rand() * 15), y: Math.round(rand() * 90) });
  },
  onEvent(g, st, ev) {
    if (ev.k !== 'c' || !st.chunks) return;
    const side = V(st.dir.z, 0, -st.dir.x);
    const s = -(st.edge + MD - 16);
    const pos = st.dir.clone().multiplyScalar(s).addScaledVector(side, ev.lat);
    pos.y = this.slopeY(st, s) + ev.s / 2;
    const mesh = new THREE.Mesh(chunkGeo, snowMat);
    mesh.scale.set(ev.s * 1.3, ev.s, ev.s * 1.1);
    mesh.rotation.y = ev.y * Math.PI / 180;
    mesh.castShadow = true;
    g.scene.add(mesh);
    st.chunks.push({ mesh, pos, r: ev.s / 2, speed: ev.sp, roll: 0 });
  },
  update(g, st, dt) {
    if (st.rising && st.parts) {
      st.rise = Math.min(1, st.rise + dt / 8);
      for (const p of st.parts) {
        const t = p.body.translation();
        p._moved = true;
        g.world.movePart(p, V(t.x, -MH + MH * st.rise + p.yOff, t.z));
      }
      if (isHost(g)) {
        for (const pp of g.world.parts) {
          if (pp.tags.has('indestructible')) continue;
          const t = pp.body.translation();
          const s = t.x * st.dir.x + t.z * st.dir.z;
          if (t.y < this.slopeY(st, s) * st.rise) g.world.unanchor(pp, { x: st.dir.x * 20, y: 10, z: st.dir.z * 20 });
        }
      }
      if (st.rise >= 1) st.rising = false;
    }
    if (!st.chunks) return;
    if (isHost(g)) {
      st.next -= dt;
      if (st.next <= 0) { st.next = 0.9 + rand() * 1.0; this.release(g, st); }
    }
    const axis = V(st.dir.z, 0, -st.dir.x);
    for (let i = st.chunks.length - 1; i >= 0; i--) {
      const b = st.chunks[i];
      const s0 = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      const onSlope = this.slopeY(st, s0) > 0;
      // fast down the slope, then the snow loses speed on flat ground and breaks up
      b.speed = Math.min(75, b.speed + (onSlope ? 40 : -9) * dt);
      b.pos.addScaledVector(st.dir, b.speed * dt);
      const s = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      b.pos.y = this.slopeY(st, s) + b.r;
      b.mesh.position.copy(b.pos);
      // tumbles end over end
      b.mesh.rotateOnWorldAxis(axis, b.speed * dt / (b.r * 1.4));
      if (Math.random() < 0.6) g.effects.puff(b.pos.clone().add(V(0, -b.r * 0.6, 0)), 0xffffff, b.r * 2.5, 1.2, V(0, 3, 0));
      if (isHost(g)) {
        for (const p of g.world.partsNear(b.pos, b.r + 1, q => !q.tags.has('indestructible'))) {
          g.world.unanchor(p);
          g.world.push(p, { x: st.dir.x * b.speed * 1.1, y: 12, z: st.dir.z * b.speed * 1.1 }, false);
        }
      }
      // hitbox a bit smaller than the visual
      for (const c of locals(g)) {
        if (!c.alive) continue;
        if (c.center.distanceTo(b.pos) < b.r * 0.8 + 1.5 && (c.snowHit || 0) < g.time) {
          c.snowHit = g.time + 0.8;
          if (b.r > 4.1) c.die('avalanche');
          else { c.damage(40, 'avalanche'); c.addVelocity({ x: st.dir.x * 60, y: 25, z: st.dir.z * 60 }); }
        }
      }
      if (s > 240 || b.speed < 6) {
        g.effects.puff(b.pos.clone(), 0xffffff, b.r * 4, 1.5, V(0, 2, 0));
        g.scene.remove(b.mesh); st.chunks.splice(i, 1);
      }
    }
    if (Math.random() < dt * 2) g.audio.noise('brown', 1.2, { freq: 200, gain: 0.25 });
  },
  stop(g, st) {
    for (const b of st.chunks || []) g.scene.remove(b.mesh);
    st.chunks = null;
    g.effects.setWeather('snow', false);
    g.audio.loop('rumble', false);
    g.hazardPos = null;
  },
};
