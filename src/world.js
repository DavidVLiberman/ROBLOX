// Physics world (Rapier) + Roblox-like "Parts" rendered through instanced pools.
// Every map/lobby brick is a Part: anchored (fixed body) until a disaster
// unanchors it, after which it is a full rigid body.
import * as THREE from 'three';
import RAPIER from 'rapier';
import { getMaterial, isTransparent } from './materials.js';
import { GRAVITY, DEG, clamp } from './util.js';

export const GROUP_PARTS = 0x0001;
export const GROUP_CHARS = 0x0002;
export const GROUP_CORPSE = 0x0004;
const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);
export const IG_PART = groups(GROUP_PARTS, GROUP_PARTS | GROUP_CHARS | GROUP_CORPSE);
export const IG_CHAR = groups(GROUP_CHARS, GROUP_PARTS | GROUP_CHARS);
export const IG_CORPSE = groups(GROUP_CORPSE, GROUP_PARTS);
export const IG_QUERY_PARTS = groups(0xffff, GROUP_PARTS);
export const IG_QUERY_ALL = groups(0xffff, GROUP_PARTS | GROUP_CHARS);

// ---------- unit geometries ----------
function wedgeGeometry() {
  // Vertical face at -z, slope descending toward +z.
  const p = [
    [-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5],
    [-.5, -.5, .5], [.5, -.5, .5],
  ];
  const tris = [
    [0, 3, 2], [0, 2, 1],        // back
    [0, 1, 5], [0, 5, 4],        // bottom
    [3, 4, 5], [3, 5, 2],        // slope
    [0, 4, 3],                   // left
    [1, 2, 5],                   // right
  ];
  const pos = [], uv = [];
  for (const t of tris) for (const i of t) { pos.push(...p[i]); uv.push(p[i][0] + .5, p[i][1] + .5); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
export const WEDGE_POINTS = new Float32Array([
  -.5, -.5, -.5, .5, -.5, -.5, .5, .5, -.5, -.5, .5, -.5, -.5, -.5, .5, .5, -.5, .5,
]);
function frustumPoints(top = 0.3, seg = 12) {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2;
    pts.push(Math.cos(a) * .5, -.5, Math.sin(a) * .5, Math.cos(a) * .5 * top, .5, Math.sin(a) * .5 * top);
  }
  return new Float32Array(pts);
}
const GEOMS = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  cyl: () => new THREE.CylinderGeometry(.5, .5, 1, 18),
  ball: () => new THREE.SphereGeometry(.5, 18, 12),
  wedge: wedgeGeometry,
  frustum: () => new THREE.CylinderGeometry(.15, .5, 1, 16),
  cone: () => new THREE.ConeGeometry(.5, 1, 14),
};

// ---------- instanced pools ----------
class Pool {
  constructor(scene, shape, mat) {
    this.scene = scene; this.shape = shape; this.mat = mat;
    this.geometry = GEOMS[shape]();
    this.material = getMaterial(mat);
    this.capacity = 0; this.mesh = null; this.free = []; this.used = 0;
    this.dirty = false; this.colorDirty = false;
    this.grow(64);
  }
  grow(cap) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    mesh.frustumCulled = false;
    const transparent = isTransparent(this.mat);
    mesh.castShadow = !transparent && this.mat !== 'neon';
    mesh.receiveShadow = !transparent;
    if (transparent) mesh.renderOrder = 2;
    if (this.mesh) {
      mesh.instanceMatrix.array.set(this.mesh.instanceMatrix.array);
      mesh.instanceColor.array.set(this.mesh.instanceColor.array);
      this.scene.remove(this.mesh);
      this.mesh.dispose();
    }
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = this.capacity; i < cap; i++) { mesh.setMatrixAt(i, zero); this.free.push(cap - 1 - (i - this.capacity)); }
    // free list should hand out low indices first
    this.free.sort((a, b) => b - a);
    mesh.count = cap;
    this.capacity = cap;
    this.mesh = mesh;
    this.scene.add(mesh);
  }
  alloc() {
    if (!this.free.length) this.grow(this.capacity * 2);
    this.used++;
    return this.free.pop();
  }
  release(i) {
    this.mesh.setMatrixAt(i, ZERO_M);
    this.free.push(i);
    this.used--;
    this.dirty = true;
  }
  set(i, m) { this.mesh.setMatrixAt(i, m); this.dirty = true; }
  color(i, c) { this.mesh.setColorAt(i, c); this.colorDirty = true; }
  flush() {
    if (this.dirty) { this.mesh.instanceMatrix.needsUpdate = true; this.dirty = false; }
    if (this.colorDirty) { this.mesh.instanceColor.needsUpdate = true; this.colorDirty = false; }
  }
}
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

let nextId = 1;
export class Part {
  constructor() { this.id = nextId++; }
  get position() { const t = this.body.translation(); return new THREE.Vector3(t.x, t.y, t.z); }
  get velocity() { const v = this.body.linvel(); return new THREE.Vector3(v.x, v.y, v.z); }
  hasTag(t) { return this.tags.has(t); }
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _c = new THREE.Color();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.physics = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
    this.physics.timestep = 1 / 60;
    this.pools = new Map();
    this.parts = new Set();
    this.dynamic = new Set();
    this.byCollider = new Map();   // collider handle -> Part | Character
    this.supportDirty = false;
    this.supportTimer = 0;
    this.maxDebris = 650;
    this.time = 0;
    this.onPartRemoved = null;
  }

  pool(shape, mat) {
    const k = shape + ':' + mat;
    let p = this.pools.get(k);
    if (!p) { p = new Pool(this.scene, shape, mat); this.pools.set(k, p); }
    return p;
  }

  // opts: pos [x,y,z] centre, size [x,y,z], color, mat, shape, rot (Quaternion | [deg]),
  // anchored (default true), tags [], collide (default true), density
  addPart(o) {
    const part = new Part();
    part.shape = o.shape || 'box';
    part.mat = o.mat || 'plastic';
    part.size = new THREE.Vector3(...o.size);
    part.baseColor = new THREE.Color(o.color ?? 0xa3a2a5);
    part.color = part.baseColor.clone();
    part.tags = new Set(o.tags || []);
    part.anchored = o.anchored !== false;
    part.collide = o.collide !== false;
    part.alive = true;
    part.neighbors = [];
    part.group = o.group || null;
    part.created = this.time;
    part.isMap = !!o.isMap;
    let rot = o.rot;
    if (Array.isArray(rot)) rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, 'YXZ'));
    rot = rot || new THREE.Quaternion();
    part.initialRot = rot.clone();

    const bd = (part.anchored ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(o.pos[0], o.pos[1], o.pos[2])
      .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })
      .setLinearDamping(0.05).setAngularDamping(0.3)
      .setCanSleep(true);
    part.body = this.physics.createRigidBody(bd);
    const s = part.size;
    const sh = (v) => Math.max(0.05, v / 2 - (v > 0.4 ? 0.04 : 0));
    let cd;
    switch (part.shape) {
      case 'ball': cd = RAPIER.ColliderDesc.ball(sh(s.x)); break;
      case 'cyl': cd = RAPIER.ColliderDesc.cylinder(sh(s.y), sh(Math.max(s.x, s.z))); break;
      case 'cone': cd = RAPIER.ColliderDesc.cone(sh(s.y), sh(Math.max(s.x, s.z))); break;
      case 'wedge': {
        const pts = new Float32Array(WEDGE_POINTS.length);
        for (let i = 0; i < pts.length; i += 3) { pts[i] = WEDGE_POINTS[i] * s.x * .99; pts[i + 1] = WEDGE_POINTS[i + 1] * s.y * .99; pts[i + 2] = WEDGE_POINTS[i + 2] * s.z * .99; }
        cd = RAPIER.ColliderDesc.convexHull(pts);
        break;
      }
      case 'frustum': {
        const base = frustumPoints(0.3);
        for (let i = 0; i < base.length; i += 3) { base[i] *= s.x; base[i + 1] *= s.y; base[i + 2] *= s.z; }
        cd = RAPIER.ColliderDesc.convexHull(base);
        break;
      }
      default: cd = RAPIER.ColliderDesc.cuboid(sh(s.x), sh(s.y), sh(s.z));
    }
    cd.setDensity(o.density ?? (part.mat === 'metal' ? 1.4 : part.mat === 'wood' ? 0.5 : 0.8))
      .setFriction(0.6).setRestitution(0.1)
      .setCollisionGroups(o.corpse ? IG_CORPSE : IG_PART)
      .setSolverGroups(o.corpse ? IG_CORPSE : IG_PART);
    if (!part.collide) cd.setSensor(true);
    part.collider = this.physics.createCollider(cd, part.body);
    this.byCollider.set(part.collider.handle, part);

    part.pool = this.pool(part.shape, part.mat);
    part.inst = part.pool.alloc();
    part.pool.color(part.inst, part.color);
    this.parts.add(part);
    if (!part.anchored) this.dynamic.add(part);
    this.syncPart(part);
    if (o.vel) part.body.setLinvel({ x: o.vel[0], y: o.vel[1], z: o.vel[2] }, true);
    return part;
  }

  syncPart(part) {
    const t = part.body.translation(), r = part.body.rotation();
    _p.set(t.x, t.y, t.z); _q.set(r.x, r.y, r.z, r.w);
    _m.compose(_p, _q, part.size);
    part.pool.set(part.inst, _m);
    if (part.decals) for (const d of part.decals) {
      d.mesh.position.copy(d.offset).applyQuaternion(_q).add(_p);
      d.mesh.quaternion.copy(_q).multiply(d.rot);
    }
  }

  // A flat textured sign stuck to one face of a part (like a Roblox Decal/SurfaceGui).
  // face: 'front' (+z), 'back' (-z), 'left' (-x), 'right' (+x), 'top' (+y)
  addDecal(part, texture, face = 'front', { w = null, h = null, transparent = true, emissive = false } = {}) {
    const s = part.size;
    const faces = {
      front: [new THREE.Vector3(0, 0, s.z / 2 + 0.03), new THREE.Euler(0, 0, 0), s.x, s.y],
      back: [new THREE.Vector3(0, 0, -s.z / 2 - 0.03), new THREE.Euler(0, Math.PI, 0), s.x, s.y],
      right: [new THREE.Vector3(s.x / 2 + 0.03, 0, 0), new THREE.Euler(0, Math.PI / 2, 0), s.z, s.y],
      left: [new THREE.Vector3(-s.x / 2 - 0.03, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0), s.z, s.y],
      top: [new THREE.Vector3(0, s.y / 2 + 0.03, 0), new THREE.Euler(-Math.PI / 2, 0, 0), s.x, s.z],
    };
    const [offset, euler, fw, fh] = faces[face];
    const mat = emissive
      ? new THREE.MeshBasicMaterial({ map: texture, transparent, alphaTest: transparent ? 0.05 : 0 })
      : new THREE.MeshStandardMaterial({ map: texture, transparent, alphaTest: transparent ? 0.05 : 0, roughness: 0.8 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w ?? fw, h ?? fh), mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    (part.decals ||= []).push({ mesh, offset, rot: new THREE.Quaternion().setFromEuler(euler) });
    this.syncPart(part);
    return mesh;
  }

  setColor(part, color) {
    part.color.set(color);
    part.pool.color(part.inst, part.color);
  }

  // Teleport an anchored part (used for animated rising volcano / vehicles).
  movePart(part, pos, quat) {
    part.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    if (quat) part.body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
    this.syncPart(part);
  }

  unanchor(part, vel) {
    if (!part.alive) return false;
    if (part.anchored) {
      if (part.tags.has('indestructible')) return false;
      part.anchored = false;
      part.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      part.unanchoredAt = this.time;
      this.dynamic.add(part);
      this.supportDirty = true;
      if (part.onUnanchor) part.onUnanchor(part);
    }
    if (vel) {
      part.body.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
      part.body.setAngvel({ x: (Math.random() - .5) * 6, y: (Math.random() - .5) * 6, z: (Math.random() - .5) * 6 }, true);
    }
    part.body.wakeUp();
    return true;
  }

  push(part, vel, add = true) {
    if (!part.alive || part.anchored) return;
    if (add) {
      const v = part.body.linvel();
      part.body.setLinvel({ x: v.x + vel.x, y: v.y + vel.y, z: v.z + vel.z }, true);
    } else part.body.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
  }

  removePart(part) {
    if (!part.alive) return;
    part.alive = false;
    if (part.anchored && !part.tags.has('indestructible')) this.supportDirty = true;
    this.byCollider.delete(part.collider.handle);
    this.physics.removeRigidBody(part.body);
    part.pool.release(part.inst);
    if (part.decals) for (const d of part.decals) { this.scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.map?.dispose(); d.mesh.material.dispose(); }
    this.parts.delete(part);
    this.dynamic.delete(part);
    if (this.onPartRemoved) this.onPartRemoved(part);
  }

  aabb(part) {
    if (part._aabb && part.anchored && !part._moved) return part._aabb;
    const t = part.body.translation(), r = part.body.rotation();
    _q.set(r.x, r.y, r.z, r.w);
    const s = part.size;
    // world-space half extents of an oriented box
    const m = new THREE.Matrix4().makeRotationFromQuaternion(_q).elements;
    const hx = Math.abs(m[0]) * s.x / 2 + Math.abs(m[4]) * s.y / 2 + Math.abs(m[8]) * s.z / 2;
    const hy = Math.abs(m[1]) * s.x / 2 + Math.abs(m[5]) * s.y / 2 + Math.abs(m[9]) * s.z / 2;
    const hz = Math.abs(m[2]) * s.x / 2 + Math.abs(m[6]) * s.y / 2 + Math.abs(m[10]) * s.z / 2;
    const box = { minX: t.x - hx, maxX: t.x + hx, minY: t.y - hy, maxY: t.y + hy, minZ: t.z - hz, maxZ: t.z + hz };
    if (part.anchored) part._aabb = box;
    return box;
  }

  // Build the "weld graph": which parts touch which. Parts that touch the
  // ground (or an indestructible part) are roots. When a part is unanchored
  // everything no longer connected to a root falls.
  buildSupport(parts, groundY = 0) {
    const list = [...parts].filter(p => p.anchored);
    const boxes = list.map(p => this.aabb(p));
    const idx = list.map((_, i) => i).sort((a, b) => boxes[a].minX - boxes[b].minX);
    const e = 0.2;
    for (const p of list) p.neighbors = [];
    for (let a = 0; a < idx.length; a++) {
      const A = boxes[idx[a]], pa = list[idx[a]];
      for (let b = a + 1; b < idx.length; b++) {
        const B = boxes[idx[b]];
        if (B.minX > A.maxX + e) break;
        if (B.minY > A.maxY + e || B.maxY < A.minY - e || B.minZ > A.maxZ + e || B.maxZ < A.minZ - e) continue;
        const pb = list[idx[b]];
        pa.neighbors.push(pb); pb.neighbors.push(pa);
      }
    }
    for (let i = 0; i < list.length; i++) {
      list[i].root = boxes[i].minY <= groundY + 0.35 || list[i].tags.has('indestructible') || list[i].tags.has('root');
    }
  }

  updateSupport(parts) {
    const seen = new Set();
    const queue = [];
    for (const p of parts) if (p.alive && p.anchored && p.root) { seen.add(p); queue.push(p); }
    while (queue.length) {
      const p = queue.pop();
      for (const n of p.neighbors) if (!seen.has(n) && n.alive && n.anchored) { seen.add(n); queue.push(n); }
    }
    let fell = 0;
    for (const p of parts) {
      if (p.alive && p.anchored && !seen.has(p) && !p.tags.has('float')) { this.unanchor(p); fell++; }
    }
    return fell;
  }

  raycast(origin, dir, maxDist, opts = {}) {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.physics.castRayAndGetNormal(ray, maxDist, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      opts.chars ? IG_QUERY_ALL : IG_QUERY_PARTS, opts.exclude, undefined, opts.filter);
    if (!hit) return null;
    const toi = hit.timeOfImpact ?? hit.toi;
    return {
      dist: toi,
      point: new THREE.Vector3(origin.x + dir.x * toi, origin.y + dir.y * toi, origin.z + dir.z * toi),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      object: this.byCollider.get(hit.collider.handle),
      collider: hit.collider,
    };
  }

  partsNear(center, radius, filter) {
    const out = [];
    const r2 = radius * radius;
    for (const p of this.parts) {
      if (filter && !filter(p)) continue;
      const t = p.body.translation();
      const dx = t.x - center.x, dy = t.y - center.y, dz = t.z - center.z;
      const ext = Math.max(p.size.x, p.size.y, p.size.z) / 2;
      const rr = radius + ext;
      if (dx * dx + dy * dy + dz * dz <= Math.max(r2, rr * rr * 0.6)) out.push(p);
    }
    return out;
  }

  step(dt) {
    this.time += dt;
    this.physics.step();
  }

  // After physics: copy dynamic transforms into instance buffers, cull debris.
  sync(dt) {
    const kill = [];
    for (const p of this.dynamic) {
      const t = p.body.translation();
      if (t.y < -60 || Math.abs(t.x) > 900 || Math.abs(t.z) > 900) { kill.push(p); continue; }
      if (p.lifetime && this.time - p.created > p.lifetime) { kill.push(p); continue; }
      if (!p.body.isSleeping()) this.syncPart(p);
    }
    for (const p of kill) this.removePart(p);
    if (this.dynamic.size > this.maxDebris) {
      // drop the oldest loose debris first
      const sorted = [...this.dynamic].filter(p => !p.tags.has('keep')).sort((a, b) => (a.unanchoredAt ?? a.created) - (b.unanchoredAt ?? b.created));
      for (let i = 0; i < this.dynamic.size - this.maxDebris && i < sorted.length; i++) this.removePart(sorted[i]);
    }
    for (const pool of this.pools.values()) pool.flush();
  }

  explode(center, radius, power, opts = {}) {
    const hit = [];
    for (const p of this.partsNear(center, radius, opts.filter)) {
      if (p.tags.has('indestructible')) continue;
      const t = p.body.translation();
      const d = new THREE.Vector3(t.x - center.x, t.y - center.y, t.z - center.z);
      const dist = Math.max(1, d.length());
      d.normalize();
      const f = power * clamp(1 - dist / (radius * 1.6), 0.15, 1);
      if (opts.destroyChance && Math.random() < opts.destroyChance && p.size.x * p.size.y * p.size.z < 400) { this.removePart(p); continue; }
      this.unanchor(p);
      this.push(p, { x: d.x * f, y: d.y * f + f * 0.4, z: d.z * f });
      hit.push(p);
    }
    return hit;
  }
}

export { RAPIER };
