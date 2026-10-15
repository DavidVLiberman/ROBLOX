import * as THREE from 'three';
import { V, isHost, locals, emit, toArr, fromArr, islandEdge, randomIslandPoint } from './common.js';
import { rand, clamp } from '../util.js';
import { getMaterial, tickLava } from '../materials.js';

const H = 85;                           // height of the crater rim
const R0 = 62, R1 = 24, WALL = 7;       // cone radius at sea level and at the rim, wall thickness
const SEG = 24;                         // the cone is built from SEG slabs around, in rings
const RINGS = [[-10, 24], [24, 56], [56, H]];
const WATER_Y = H - 5;                  // the crater is hollow and full of sea water up to here
const RISE = 12, ERUPT = 15;            // seconds after the warning
// tints of the lava material (instance colours, linear, may go past 1): red and yellow
// blocks, and now and then a dull brown one
const RED = new THREE.Color(1, 0.06, 0.03), YELLOW = new THREE.Color(1.2, 9, 0.5), BROWN = new THREE.Color(0.24, 0.13, 0.06);
const LAVA_COLORS = [RED, YELLOW, BROWN];
const CRUST = new THREE.Color(0x3a0d05);
const COOL = 4;                         // seconds a landed block takes to dim before it turns to obsidian
const coneR = (y) => R0 - (R0 - R1) * y / H;
const blockGeo = new THREE.BoxGeometry(1, 1, 1);

// The volcano rises out of the sea next to the island with the warning and starts
// erupting about 15 seconds later. Its crater is hollow and full of sea water. It throws
// big red and yellow lava blocks (now and then a brown one) that smash through buildings
// and kill whoever they hit; blocks lying on the island cool into obsidian after a while.
// Climbing onto the volcano is deadly.
export default {
  name: 'Volcanic Eruption',
  warning: 'Volcanic Eruption! Get away from the volcano',
  duration: 105,
  bot: 'away-volcano',
  // anywhere around the island except over the lobby tower (which sits off the -z side)
  params() { return { a: Math.round((-Math.PI / 2 + 1.1 + rand() * (Math.PI * 2 - 2.2)) * 1000) / 1000 }; },
  start(g, st) {
    const a = st.p.a ?? 0;
    // just off the shore: the foot of the cone starts where the grass ends
    const R = islandEdge(Math.cos(a), Math.sin(a)) + R0 + 6;
    st.pos = V(Math.cos(a) * R, 0, Math.sin(a) * R);
    g.hazardPos = st.pos.clone();
    st.t = st.late || 0;
    st.parts = []; st.blobs = []; st.blocks = [];
    st.next = 0.5;
    const mk = (o, yOff) => {
      const p = g.world.addPart({ ...o, tags: ['indestructible', 'volcano'] });
      p.yOff = yOff;
      st.parts.push(p);
      g.trackTemp(p);
      return p;
    };
    // the hollow cone: rings of slabs lying on the slope
    RINGS.forEach(([y0, y1], k) => {
      const w = 2 * coneR(y0) * Math.tan(Math.PI / SEG) * 1.05;
      for (let i = 0; i < SEG; i++) {
        const ang = (i + (k % 2) * 0.5) / SEG * Math.PI * 2;
        const { q, n, len, mid } = this.slab(ang, y0, y1);
        mk({ pos: [st.pos.x + mid.x - n.x * WALL / 2, -H, st.pos.z + mid.z - n.z * WALL / 2], size: [w, len, WALL], color: k === 2 ? 0x45403c : 0x57504b, mat: 'slate', rot: q }, mid.y - n.y * WALL / 2);
      }
    });
    // the crater lake
    const lake = (R1 - WALL) * 2 + 4;
    mk({ pos: [st.pos.x, -H, st.pos.z], size: [lake, 1, lake], color: 0x2a74b8, mat: 'water', shape: 'cyl', collide: false }, WATER_Y);
    // lava running down the slopes, mostly on the side facing the island
    for (const off of [-0.85, -0.3, 0.3, 0.9, 2.5]) this.stream(mk, st, a + Math.PI + off);
    st.rise = Math.min(1, st.t / RISE);
    this.place(g, st);
    g.audio.loop('rumble', true, { type: 'brown', freq: 120, gain: 0.5 });
    g.shakeAll(0.6, RISE);
  },
  // a slab of the cone at angle `ang` between heights y0 and y1: its rotation (local x
  // around the cone, y up the slope, z out of it), outward normal, length and the middle
  // of its outer face (relative to the volcano's centre)
  slab(ang, y0, y1) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const dr = coneR(y0) - coneR(y1), dy = y1 - y0, len = Math.hypot(dr, dy);
    const up = V(-c * dr / len, dy / len, -s * dr / len);
    const n = V(c * dy / len, dr / len, s * dy / len);
    const x = V(s, 0, -c);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, n));
    const ym = (y0 + y1) / 2, rm = coneR(ym);
    return { q, n, len, mid: V(c * rm, ym, s * rm) };
  },
  // a lava stream from the rim down the cone, lying on the middle of a slab
  stream(mk, st, ang) {
    const step = Math.PI * 2 / SEG;
    ang = Math.round(ang / step) * step;
    for (const [y0, y1] of [[24, H], [H * 0.22, 24]]) {
      const { q, n, len, mid } = this.slab(ang, y0, y1);
      mk({ pos: [st.pos.x + mid.x + n.x * 0.3, -H, st.pos.z + mid.z + n.z * 0.3], size: [4, len, 0.8], color: 0xffd9b8, mat: 'lava', rot: q, collide: false }, mid.y + n.y * 0.3);
    }
  },
  place(g, st) {
    const base = -H + H * st.rise;
    for (const p of st.parts) {
      const old = p.body.translation();
      const ny = base + p.yOff;
      p._moved = true;
      p.lastDelta = st.rise < 1 ? { x: 0, y: ny - old.y, z: 0 } : null;
      g.world.movePart(p, V(old.x, ny, old.z));
    }
  },
  crater(st) { return V(st.pos.x, H + 1, st.pos.z); },
  // host: throw a lava block at the map
  launch(g, st) {
    const c = this.crater(st);
    const target = randomIslandPoint(15);
    const T = 3 + rand() * 1.6, G = 60;
    const vel = target.clone().sub(c).divideScalar(T);
    vel.y += 0.5 * G * T;
    const kind = rand();
    emit(g, st, { k: 'b', v: toArr(vel), r: Math.round((1.4 + rand() * 2) * 100) / 100, c: kind < 0.07 ? 2 : kind < 0.535 ? 0 : 1 });
  },
  onEvent(g, st, ev) {
    if (ev.k !== 'b') return;
    const color = LAVA_COLORS[ev.c] || LAVA_COLORS[0];
    // a one-instance InstancedMesh so the lava shader gets the block's tint in flight too
    const mesh = new THREE.InstancedMesh(blockGeo, getMaterial('lava'), 1);
    mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(ev.r * 2, ev.r * 2, ev.r * 2));
    mesh.setColorAt(0, color);
    mesh.frustumCulled = false;
    g.scene.add(mesh);
    st.blobs.push({ mesh, pos: this.crater(st), vel: fromArr(ev.v), r: ev.r, color, pierce: 3, spin: V(rand() - .5, rand() - .5, rand() - .5).multiplyScalar(5) });
    if (Math.random() < 0.3) g.audio.lava(this.crater(st));
  },
  update(g, st, dt) {
    st.t += dt;
    tickLava(g.time);
    if (st.rise < 1) {
      st.rise = Math.min(1, st.t / RISE);
      this.place(g, st);
      // shove anything inside the cone aside
      const top = -H + H * st.rise + H;
      if (isHost(g)) {
        const base = top - H;
        for (const p of g.world.partsNear(st.pos, R0 + 4, q => !q.tags.has('volcano') && !q.tags.has('indestructible'))) {
          const t = p.body.translation();
          const d = Math.hypot(t.x - st.pos.x, t.z - st.pos.z);
          if (t.y < top && d < coneR(clamp(t.y - base, 0, H)) + 3) { const dir = V(t.x - st.pos.x, 0, t.z - st.pos.z).normalize(); g.world.unanchor(p, { x: dir.x * 20, y: 15, z: dir.z * 20 }); }
        }
      }
    }
    const crater = this.crater(st);
    // smoke plume and glow
    if (st.rise > 0.6 && Math.random() < 0.5) g.effects.puff(crater.clone().add(V((rand() - .5) * 14, 4, (rand() - .5) * 14)), st.t > ERUPT ? 0x2e2a28 : 0x6a6460, 18, 5, V((rand() - .5) * 3, 14, (rand() - .5) * 3));
    if (st.t > ERUPT && !st.erupting) {
      st.erupting = true;
      g.effects.setSky('volcano');
      g.audio.explosion(crater, 2);
      g.shakeAll(1, 3);
    }
    if (st.erupting) {
      if (Math.random() < 0.4) g.effects.burst(crater.clone().add(V((rand() - .5) * 10, rand() * 10, (rand() - .5) * 10)), { size: 12, life: 0.8 });
      if (isHost(g)) {
        st.next -= dt;
        if (st.next <= 0) { st.next = 0.22 + rand() * 0.3; this.launch(g, st); }
      }
    }
    this.updateBlobs(g, st, dt);
    this.updateBlocks(g, st);
    // the volcano itself is deadly to stand on
    for (const c of locals(g)) if (c.alive && c.groundPart && c.groundPart.tags.has('volcano')) c.die('lava');
  },
  updateBlobs(g, st, dt) {
    for (let i = st.blobs.length - 1; i >= 0; i--) {
      const b = st.blobs[i];
      b.vel.y -= 60 * dt;
      const step = b.vel.clone().multiplyScalar(dt);
      b.mesh.rotation.x += b.spin.x * dt; b.mesh.rotation.z += b.spin.z * dt;
      // a thin trail: glowing embers and a wisp of smoke
      if (Math.random() < 0.35) g.effects.puff(b.pos.clone(), 0xff8a2a, b.r * 0.9, 0.3);
      if (Math.random() < 0.15) g.effects.puff(b.pos.clone(), 0x5a5450, b.r * 1.6, 1.1, V(0, 2, 0));
      for (const c of locals(g)) if (c.alive && c.center.distanceTo(b.pos) < b.r + 1.8) c.die('lava');
      let landed = null;
      if (b.vel.y < 0) {
        const hit = g.world.raycast(b.pos, step.clone().normalize(), step.length() + b.r, { filter: (c) => !b.ign?.has(c.handle) });
        const part = hit?.object?.size ? hit.object : null;
        if (hit && part && !part.tags.has('volcano')) {
          if (b.pierce > 0 && !part.tags.has('indestructible') && !part.tags.has('lava') && hit.point.y > 1) {
            // crash through the building
            b.pierce--;
            (b.ign ||= new Set()).add(hit.collider.handle);
            if (isHost(g)) {
              for (const p of g.world.partsNear(hit.point, b.r + 1.5, q => !q.tags.has('indestructible') && !q.tags.has('lava'))) {
                g.world.setColor(p, 0x2a1a12);
                if (Math.random() < 0.5) g.world.removePart(p); else g.world.unanchor(p, { x: b.vel.x * 0.3, y: 5, z: b.vel.z * 0.3 });
              }
            }
            g.audio.crash(hit.point);
            b.vel.multiplyScalar(0.8);
          } else landed = hit.point;
        } else if (b.pos.y + step.y <= b.r) landed = V(b.pos.x + step.x, 0, b.pos.z + step.z);
      }
      if (landed) {
        g.scene.remove(b.mesh); b.mesh.dispose();
        st.blobs.splice(i, 1);
        if (!g.island.onIsland(landed) || landed.y < -2) { g.effects.puff(landed.clone().setY(-4), 0xdddddd, 10, 2, V(0, 8, 0)); continue; }
        const part = g.world.addPart({ pos: [landed.x, landed.y + b.r, landed.z], size: [b.r * 2, b.r * 2, b.r * 2], color: b.color, mat: 'lava', rot: [0, rand() * 90, 0], tags: ['lava', 'indestructible'] });
        g.trackTemp(part);
        st.blocks.push({ part, hot: new THREE.Color(b.color), cool: g.time + 10 + rand() * 4 });
        g.effects.burst(landed, { size: b.r * 3, life: 0.5 });
        g.audio.lava(landed);
        continue;
      }
      b.pos.add(step);
      b.mesh.position.copy(b.pos);
    }
  },
  updateBlocks(g, st) {
    for (const bl of st.blocks) {
      if (!bl.part.alive) continue;
      if (!bl.obsidian && g.time > bl.cool) {
        // the lava cools into harmless obsidian
        bl.obsidian = true;
        const t = bl.part.body.translation(), r = bl.part.body.rotation(), s = bl.part.size;
        g.world.removePart(bl.part, true);
        bl.part = g.world.addPart({ pos: [t.x, t.y, t.z], size: [s.x, s.y, s.z], color: 0x1c1a24, mat: 'slate', rot: new THREE.Quaternion(r.x, r.y, r.z, r.w), tags: ['indestructible', 'obsidian'] });
        g.trackTemp(bl.part);
        continue;
      }
      if (bl.obsidian) continue;
      // the glow dies down and the crust darkens before it sets
      const k = clamp((bl.cool - g.time) / COOL, 0, 1);
      if (k < 1) g.world.setColor(bl.part, CRUST.clone().lerp(bl.hot, k * k), true);
      const b = g.world.aabb(bl.part);
      for (const c of locals(g)) {
        if (!c.alive) continue;
        if (c.pos.x > b.minX - 1.4 && c.pos.x < b.maxX + 1.4 && c.pos.z > b.minZ - 1.4 && c.pos.z < b.maxZ + 1.4 && c.pos.y < b.maxY + 0.6 && c.pos.y + 5 > b.minY) c.die('lava');
      }
    }
  },
  stop(g, st) {
    for (const b of st.blobs || []) { g.scene.remove(b.mesh); b.mesh.dispose(); }
    st.blobs = [];
    st.erupting = false;
    g.audio.loop('rumble', false);
    g.hazardPos = null;
  },
};

