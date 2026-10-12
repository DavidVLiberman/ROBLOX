// Ground-level navigation grid for the bots: which 2x2-stud cells of the island a
// character can stand in, built by rasterizing the map's bricks, plus A* over it.
// Inside buildings the bots follow the stair/ladder waypoints the map builder made;
// this grid gets them to the door (or ladder) from anywhere on the island.
import * as THREE from 'three';
import { ISLAND_HALF } from './util.js';

const CELL = 2, R = 0.75;         // cell size, clearance kept around bricks
const BODY_LO = 0.6, BODY_HI = 5.3;   // a character is 5 studs tall
const STEP = 1.65, JUMP = 3.2;

export class NavGrid {
  constructor(world) {
    this.world = world;
    this.half = ISLAND_HALF + 8;
    this.n = Math.ceil(this.half * 2 / CELL);
    this.floor = new Float32Array(this.n * this.n);
    this.block = new Uint8Array(this.n * this.n);
    this.builtAt = -1e9;
  }

  idx(x, z) {
    const i = Math.floor((x + this.half) / CELL), j = Math.floor((z + this.half) / CELL);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -1;
    return j * this.n + i;
  }
  center(k) { return new THREE.Vector3((k % this.n) * CELL - this.half + CELL / 2, this.floor[k], Math.floor(k / this.n) * CELL - this.half + CELL / 2); }

  // Rasterize bricks: low wide bricks are floors, everything in the body's way blocks.
  build(parts, time = 0) {
    const n = this.n, w = this.world;
    this.floor.fill(0); this.block.fill(0);
    // every cell whose centre lies inside the (padded) box
    const cover = (b, pad, fn) => {
      const i0 = Math.max(0, Math.ceil((b.minX - pad + this.half) / CELL - 0.5)), i1 = Math.min(n - 1, Math.floor((b.maxX + pad + this.half) / CELL - 0.5));
      const j0 = Math.max(0, Math.ceil((b.minZ - pad + this.half) / CELL - 0.5)), j1 = Math.min(n - 1, Math.floor((b.maxZ + pad + this.half) / CELL - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * n + i);
    };
    const live = [];
    const q = new THREE.Quaternion(), ax = new THREE.Vector3(), ay = new THREE.Vector3(), az = new THREE.Vector3();
    for (const p of parts) {
      if (!p.alive || !p.collide || p.tags.has('corpse')) continue;
      const b = w.aabb(p);
      if (b.maxY < -1 || b.minY > 40) continue;
      live.push([p, b]);
      // floors: tiles, platforms, sidewalks, the first stair step (never balls or
      // rolled-over cylinders like hay bales: nobody stands on those)
      const r = p.body.rotation(); q.set(r.x, r.y, r.z, r.w);
      const flat = p.shape === 'box' || p.shape === 'wedge' || (p.shape === 'cyl' && Math.abs(ay.set(0, 1, 0).applyQuaternion(q).y) > 0.98);
      const area = (b.maxX - b.minX) * (b.maxZ - b.minZ), thin = Math.min(b.maxX - b.minX, b.maxZ - b.minZ) < 1.5;
      if (flat && b.minY <= BODY_LO && b.maxY <= 3 && !thin && (area >= 6 || b.maxY <= STEP)) {
        cover(b, 0, (k) => { if (b.maxY > this.floor[k]) this.floor[k] = b.maxY; });
        p._navFloor = true;
      } else p._navFloor = false;
    }
    for (const [p, b] of live) {
      if (p._navFloor) continue;
      // thin rails still have to block at least one row of cells
      const r = p.body.rotation(); q.set(r.x, r.y, r.z, r.w);
      ax.set(1, 0, 0).applyQuaternion(q); az.set(0, 0, 1).applyQuaternion(q);
      const upright = Math.abs(ax.y) < 0.02 && Math.abs(az.y) < 0.02;
      const hx = (p.shape === 'cyl' || p.shape === 'ball' ? Math.max(p.size.x, p.size.z) : p.size.x) / 2;
      const hz = (p.shape === 'cyl' || p.shape === 'ball' ? Math.max(p.size.x, p.size.z) : p.size.z) / 2;
      const pad = Math.max(R, 1.05 - Math.min(hx, hz));
      const t = p.body.translation();
      cover(b, pad, (k) => {
        const f = this.floor[k];
        if (!(b.minY < f + BODY_HI && b.maxY > f + BODY_LO)) return;
        if (upright) {
          // distance from the cell centre to the (rotated) footprint
          const cx = (k % n) * CELL - this.half + CELL / 2 - t.x, cz = Math.floor(k / n) * CELL - this.half + CELL / 2 - t.z;
          const lx = cx * ax.x + cz * ax.z, lz = cx * az.x + cz * az.z;
          const ex = Math.max(0, Math.abs(lx) - hx), ez = Math.max(0, Math.abs(lz) - hz);
          if (ex * ex + ez * ez > pad * pad) return;
        }
        this.block[k] = 1;
      });
    }
    this.builtAt = time;
  }

  walkable(k) { return k >= 0 && !this.block[k]; }

  // closest open cell (by distance, so we don't hop through a wall to a far ring cell)
  nearestWalkable(k, max = 4) {
    if (k < 0) return -1;
    if (this.walkable(k)) return k;
    const n = this.n, i0 = k % n, j0 = Math.floor(k / n);
    let best = -1, bd = Infinity;
    for (let dj = -max; dj <= max; dj++) for (let di = -max; di <= max; di++) {
      const i = i0 + di, j = j0 + dj;
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const kk = j * n + i, d = di * di + dj * dj;
      if (d < bd && this.walkable(kk)) { bd = d; best = kk; }
    }
    return best;
  }

  // A* from a to b (Vector3s at ground level). Returns waypoints or null.
  // exact: the goal itself must be walkable (or right next to walkable ground)
  // avoid: cells a bot got stuck in that the grid thinks are open
  findPath(a, b, maxNodes = 30000, exact = false, avoid = null) {
    const n = this.n;
    const s = this.nearestWalkable(this.idx(a.x, a.z)), t = this.nearestWalkable(this.idx(b.x, b.z), exact ? 1 : 4);
    if (s < 0 || t < 0) return null;
    if (s === t) return [b.clone()];
    this.avoid = avoid;
    const g = new Float32Array(n * n).fill(Infinity);
    const came = new Int32Array(n * n).fill(-1);
    const closed = new Uint8Array(n * n);
    const ti = t % n, tj = Math.floor(t / n);
    const h = (k) => { const dx = Math.abs(k % n - ti), dz = Math.abs(Math.floor(k / n) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const heap = new MinHeap();
    g[s] = 0; heap.push(s, h(s));
    let visited = 0;
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.size && visited < maxNodes) {
      const k = heap.pop();
      if (closed[k]) continue;
      closed[k] = 1; visited++;
      if (k === t) break;
      const i = k % n, j = Math.floor(k / n), fk = this.floor[k];
      for (const [di, dj, c] of DIRS) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
        const kk = jj * n + ii;
        if (this.block[kk] || closed[kk] || (avoid && avoid.has(kk))) continue;
        // no cutting corners past walls
        if (di && dj && (this.block[j * n + ii] || this.block[jj * n + i])) continue;
        const dh = this.floor[kk] - fk;
        if (dh > JUMP) continue;
        const cost = c + (dh > STEP ? 6 : 0);
        const ng = g[k] + cost;
        if (ng < g[kk]) { g[kk] = ng; came[kk] = k; heap.push(kk, ng + h(kk)); }
      }
    }
    if (came[t] < 0) { this.avoid = null; return null; }
    const cells = [];
    for (let k = t; k !== s && k >= 0; k = came[k]) cells.push(k);
    cells.reverse();
    // string-pull: keep only the cells needed to stay on walkable ground
    const out = [];
    let from = s;
    for (let q = 0; q < cells.length; q++) {
      const next = cells[q + 1];
      if (next === undefined || !this.lineClear(from, next)) {
        out.push(this.center(cells[q]));
        from = cells[q];
      }
    }
    out[out.length - 1] = b.clone();
    this.avoid = null;
    return out;
  }

  // straight walk between two cells stays on walkable, gently-changing ground; the
  // body is ~2 studs wide, so the lines along both shoulders have to be clear too
  lineClear(a, b) {
    const pa = this.center(a), pb = this.center(b);
    const dx = pb.x - pa.x, dz = pb.z - pa.z, len = Math.hypot(dx, dz);
    if (len < 1e-6) return true;
    const nx = -dz / len * 0.9, nz = dx / len * 0.9, steps = Math.ceil(len / 0.5);
    let prev = this.floor[a];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = pa.x + dx * t, z = pa.z + dz * t;
      const k = this.idx(x, z);
      if (k < 0 || this.block[k] || this.avoid?.has(k) || Math.abs(this.floor[k] - prev) > STEP) return false;
      prev = this.floor[k];
      for (const sgn of [-1, 1]) {
        const ks = this.idx(x + nx * sgn, z + nz * sgn);
        if (ks < 0 || this.block[ks]) return false;
      }
    }
    return true;
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const k = this.k, p = this.p;
    let i = k.length; k.push(key); p.push(pri);
    while (i > 0) { const up = (i - 1) >> 1; if (p[up] <= pri) break; k[i] = k[up]; p[i] = p[up]; i = up; }
    k[i] = key; p[i] = pri;
  }
  pop() {
    const k = this.k, p = this.p, top = k[0];
    const lk = k.pop(), lp = p.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mp = lp;
        if (l < k.length && p[l] < mp) { m = l; mp = p[l]; }
        if (r < k.length && p[r] < mp) { m = r; mp = p[r]; }
        if (m === i) break;
        k[i] = k[m]; p[i] = p[m]; i = m;
      }
      k[i] = lk; p[i] = lp;
    }
    return top;
  }
}
