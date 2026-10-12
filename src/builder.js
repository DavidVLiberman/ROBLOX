// Map building DSL. Ground is y = 0, map centred on the origin.
// Everything is ordinary bricks so disasters can tear it apart.
import * as THREE from 'three';
import { BC, DEG, rand } from './util.js';
import { signTexture } from './materials.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function rectMinus(r, h) {
  // r, h: {x0,x1,z0,z1}; returns r \ h as rects
  if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) return [r];
  const out = [];
  if (h.z0 > r.z0) out.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: h.z0 });
  if (h.z1 < r.z1) out.push({ x0: r.x0, x1: r.x1, z0: h.z1, z1: r.z1 });
  const z0 = Math.max(r.z0, h.z0), z1 = Math.min(r.z1, h.z1);
  if (h.x0 > r.x0) out.push({ x0: r.x0, x1: h.x0, z0, z1 });
  if (h.x1 < r.x1) out.push({ x0: h.x1, x1: r.x1, z0, z1 });
  return out.filter(q => q.x1 - q.x0 > 0.05 && q.z1 - q.z0 > 0.05);
}

export class MapBuilder {
  constructor(game, name) {
    this.game = game;
    this.world = game.world;
    this.name = name;
    this.parts = [];
    this.spots = [];
    this.spawns = [];
    this.fireStarts = [];
    this.seats = [];
    this.trusses = [];
    this.vehicles = [];
    this.interact = [];
    this.heights = [];
    this.flights = [];   // every staircase: used by bots (and tests) to walk between floors
    this.ramps = [];     // ways up onto raised ground (a hill) from the island
    this.aisles = [];    // walkways on upper floors kept free of furniture (to the next flight)
    this.extras = {};
  }

  part(o) {
    o.isMap = true;
    const p = this.world.addPart(o);
    this.parts.push(p);
    if (p.tags.has('truss')) this.trusses.push(p);
    if (p.tags.has('seat')) this.seats.push(p);
    if (p.tags.has('fire')) this.fireStarts.push(p);
    return p;
  }

  // centre x/z, bottom y
  block(x, y, z, w, h, d, color, mat = 'plastic', extra = {}) {
    return this.part({ pos: [x, y + h / 2, z], size: [w, h, d], color, mat, ...extra });
  }
  box(x0, y0, z0, x1, y1, z1, color, mat = 'plastic', extra = {}) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
    return this.part({ pos: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], size: [bx - ax, by - ay, bz - az], color, mat, ...extra });
  }
  cyl(x, y, z, diam, h, color, mat = 'plastic', extra = {}) {
    return this.part({ pos: [x, y + h / 2, z], size: [diam, h, diam], color, mat, shape: 'cyl', ...extra });
  }
  ball(x, y, z, diam, color, mat = 'plastic', extra = {}) {
    return this.part({ pos: [x, y + diam / 2, z], size: [diam, diam, diam], color, mat, shape: 'ball', ...extra });
  }
  wedge(x, y, z, w, h, d, rotY, color, mat = 'plastic', extra = {}) {
    return this.part({ pos: [x, y + h / 2, z], size: [w, h, d], color, mat, shape: 'wedge', rot: [0, rotY, 0], ...extra });
  }
  spawn(x, y, z) { this.spawns.push(V(x, y, z)); }
  ramp(foot, top) { this.ramps.push({ foot: foot.clone(), top: top.clone() }); }
  spot(type, x, y, z, path = []) { this.spots.push({ type, pos: V(x, y, z), path: path.map(p => p.clone()) }); }

  // Wall along X at fixed z (from x0 to x1). openings: [{a,b,y0,y1,glass}]
  wallX(z, x0, x1, y0, h, t, color, mat, openings = [], glassColor = 0xa9d4f5, trim = null) {
    this._wall('x', z, x0, x1, y0, h, t, color, mat, openings, glassColor, trim);
  }
  wallZ(x, z0, z1, y0, h, t, color, mat, openings = [], glassColor = 0xa9d4f5, trim = null) {
    this._wall('z', x, z0, z1, y0, h, t, color, mat, openings, glassColor, trim);
  }
  _wall(axis, c, a0, a1, y0, h, t, color, mat, openings, glassColor, trim = null) {
    const cuts = new Set([a0, a1]);
    for (const o of openings) { if (o.a > a0 && o.a < a1) cuts.add(o.a); if (o.b > a0 && o.b < a1) cuts.add(o.b); }
    const xs = [...cuts].sort((p, q) => p - q);
    const mk = (s0, s1, yy0, yy1, kind, th = null) => {
      if (yy1 - yy0 < 0.05 || s1 - s0 < 0.05) return;
      const glass = kind === 'glass', tr = kind === 'trim';
      th ??= glass ? 0.4 : t;
      const col = glass ? glassColor : tr ? trim : color, m = glass ? 'glass' : tr ? 'plastic' : mat;
      const extra = glass ? { tags: ['glass'] } : {};
      if (axis === 'x') this.box(s0, yy0, c - th / 2, s1, yy1, c + th / 2, col, m, extra);
      else this.box(c - th / 2, yy0, s0, c + th / 2, yy1, s1, col, m, extra);
    };
    for (let i = 0; i < xs.length - 1; i++) {
      const s0 = xs[i], s1 = xs[i + 1], mid = (s0 + s1) / 2;
      const op = openings.find(o => o.a <= mid && o.b >= mid);
      if (!op) { mk(s0, s1, y0, y0 + h, 'wall'); continue; }
      const oy0 = Math.max(y0, op.y0), oy1 = Math.min(y0 + h, op.y1);
      mk(s0, s1, y0, oy0, 'wall');
      mk(s0, s1, oy1, y0 + h, 'wall');
      if (op.glass) {
        if (trim) {
          // sill + header frame the glass and stick out past the wall
          mk(s0, s1, oy0, oy0 + 0.35, 'trim', t + 0.7);
          mk(s0, s1, oy1 - 0.3, oy1, 'trim', t + 0.4);
          mk(s0, s1, oy0 + 0.35, oy1 - 0.3, 'glass');
        } else mk(s0, s1, oy0, oy1, 'glass');
      } else if (trim && op.door && s1 - s0 >= 4) {
        // door frame: two jambs and a header inside the opening
        mk(s0, s0 + 0.45, oy0, oy1, 'trim', t + 0.4);
        mk(s1 - 0.45, s1, oy0, oy1, 'trim', t + 0.4);
        mk(s0 + 0.45, s1 - 0.45, oy1 - 0.55, oy1, 'trim', t + 0.4);
      }
    }
  }

  slab(rect, y0, y1, color, mat, extra = {}) {
    return this.box(rect.x0, y0, rect.z0, rect.x1, y1, rect.z1, color, mat, { ...extra, tags: [...(extra.tags || []), 'floor'] });
  }

  windowsAlong(a0, a1, y, { winW = 4, winH = 5, spacing = 8, sill = 3 } = {}) {
    const len = a1 - a0;
    const n = Math.max(0, Math.floor((len - 2) / spacing));
    const out = [];
    if (n <= 0) return out;
    const start = a0 + (len - (n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) {
      const c = start + i * spacing;
      out.push({ a: c - winW / 2, b: c + winW / 2, y0: y + sill, y1: y + sill + winH, glass: true });
    }
    return out;
  }

  // Multi-storey building with real stairs (or a truss ladder when narrow).
  building(o) {
    const {
      x = 0, z = 0, w = 30, d = 24, floors = 1, fh = 12, color = BC.brickYellow, mat = 'brick',
      floorColor = BC.reddishBrown, floorMat = 'wood', roof = 'flat', roofColor = BC.darkStone, roofMat = 'slate',
      windows = true, winW = 4, winH = 5, spacing = 8, door = 'S', doorX = 0, doorW = 5, glassColor = 0xa9d4f5,
      roofAccess = true, parapet = true, t = 1, stairColor = null, interior = null, noStairs = false, trim = null,
      y: by = 0, stairFire = false, groundTile = true, ladder = null, ladderSide = 'E', roofDetails = true, furnish = null,
    } = o;
    const trimColor = o.windowTrim ?? (trim ?? BC.institutionalWhite);
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const ix0 = x0 + t, ix1 = x1 - t, iz0 = z0 + t, iz1 = z1 - t;
    const N = Math.round(fh);
    const run = 1.35, rise = fh / N, sw = 4;
    const flights = floors - 1 + (roof === 'flat' && roofAccess ? 1 : 0);
    const useStairs = !noStairs && flights > 0 && (ix1 - ix0) >= N * run + 7 && (iz1 - iz0) >= sw * 2 + 4;
    const useTruss = !noStairs && flights > 0 && !useStairs;
    const flip = door === 'N';
    const sgn = flip ? -1 : 1;
    const holes = {};  // level -> [rects]
    const flightInfo = [];
    if (useStairs) {
      for (let k = 0; k < flights; k++) {
        const north = (k % 2 === 0) !== flip;
        const bz0 = north ? iz0 : iz1 - sw, bz1 = north ? iz0 + sw : iz1;
        const forward = k % 2 === 0;
        const xs = forward ? ix0 + 3 : ix1 - 3;
        const dir = forward ? 1 : -1;
        const xe = xs + dir * N * run;
        flightInfo.push({ k, bz0, bz1, xs, xe, dir });
        (holes[k + 1] ||= []).push({ x0: Math.min(xs, xe) - 0.2, x1: Math.max(xs, xe), z0: bz0, z1: bz1 });
      }
    } else if (useTruss) {
      for (let k = 1; k <= flights; k++) (holes[k] ||= []).push({ x0: ix0, x1: ix0 + 6, z0: iz0, z1: iz0 + 6 });
    }
    const levelY = (k) => by + k * fh;
    const top = by + floors * fh;
    // ground floor tiles
    if (groundTile) this.box(ix0, by, iz0, ix1, by + 0.3, iz1, floorColor, floorMat);
    for (let k = 0; k < floors; k++) {
      const y0 = levelY(k), wallH = fh - 1;
      if (k > 0) {
        let rects = [{ x0: ix0, x1: ix1, z0: iz0, z1: iz1 }];
        for (const h of holes[k] || []) rects = rects.flatMap(r => rectMinus(r, h));
        for (const r of rects) this.slab(r, y0 - 1, y0, floorColor, floorMat);
      }
      const wy = y0;
      const wh = k === 0 ? fh - 1 : wallH;
      const winOpts = { winW, winH, spacing, sill: 3 };
      const sOpen = windows ? this.windowsAlong(x0 + 1, x1 - 1, wy, winOpts) : [];
      const nOpen = windows ? this.windowsAlong(x0 + 1, x1 - 1, wy, winOpts) : [];
      const wOpen = windows ? this.windowsAlong(z0 + 1, z1 - 1, wy, winOpts) : [];
      const eOpen = windows ? this.windowsAlong(z0 + 1, z1 - 1, wy, winOpts) : [];
      if (k === 0) {
        const dx = x + doorX;
        const doorOp = { a: dx - doorW / 2, b: dx + doorW / 2, y0: by - 1, y1: by + 8, glass: false, door: true };
        const list = door === 'N' ? nOpen : sOpen;
        for (let i = list.length - 1; i >= 0; i--) if (list[i].b > doorOp.a - 0.5 && list[i].a < doorOp.b + 0.5) list.splice(i, 1);
        list.push(doorOp);
      }
      this.wallX(z1 - t / 2, x0, x1, wy, wh, t, color, mat, sOpen, glassColor, trimColor);
      this.wallX(z0 + t / 2, x0, x1, wy, wh, t, color, mat, nOpen, glassColor, trimColor);
      this.wallZ(x0 + t / 2, z0 + t, z1 - t, wy, wh, t, color, mat, wOpen, glassColor, trimColor);
      this.wallZ(x1 - t / 2, z0 + t, z1 - t, wy, wh, t, color, mat, eOpen, glassColor, trimColor);
      // trim band around the outside of the walls (a band, not a slab: it must not cover the stairwell)
      if (trim) {
        const ya = y0 + fh - 1.6, yb = y0 + fh - 1;
        this.box(x0 - 0.3, ya, z0 - 0.3, x1 + 0.3, yb, z0 + 0.3, trim, 'plastic');
        this.box(x0 - 0.3, ya, z1 - 0.3, x1 + 0.3, yb, z1 + 0.3, trim, 'plastic');
        this.box(x0 - 0.3, ya, z0 + 0.3, x0 + 0.3, yb, z1 - 0.3, trim, 'plastic');
        this.box(x1 - 0.3, ya, z0 + 0.3, x1 + 0.3, yb, z1 - 0.3, trim, 'plastic');
      }
    }
    // stairs
    const sc = stairColor ?? floorColor;
    for (const f of flightInfo) {
      const y0 = levelY(f.k);
      this.flights.push({ x0: f.xs, x1: f.xe, z: (f.bz0 + f.bz1) / 2, y0, y1: levelY(f.k + 1), dir: f.dir, zw: f.bz1 - f.bz0 });
      const prev = flightInfo[f.k - 1];
      if (prev) {
        // from the top of the flight below, along its wall and across the end of the
        // building to the foot of this one: keep that free of tables and shelves
        const ex = f.dir > 0 ? ix0 + 0.5 : ix1 - 0.5;
        this.aisles.push({ x0: Math.min(ex, f.xs), x1: Math.max(ex, f.xs), z0: iz0 + 0.5, z1: iz1 - 0.5, y0: y0 + 0.35, y1: y0 + 5.5 });
        this.aisles.push({ x0: Math.min(ex, prev.xe), x1: Math.max(ex, prev.xe), z0: Math.max(iz0 + 0.5, prev.bz0), z1: Math.min(iz1 - 0.5, prev.bz1), y0: y0 + 0.35, y1: y0 + 5.5 });
      }
      for (let i = 0; i < N; i++) {
        const sx0 = f.xs + f.dir * i * run, sx1 = f.xs + f.dir * (i + 1) * run;
        // solid down to the floor, so nobody wanders in under the flight
        this.box(sx0, y0, f.bz0, sx1, y0 + (i + 1) * rise, f.bz1, sc, floorMat, { tags: stairFire && f.k === 0 && i === 2 ? ['stair', 'fire'] : ['stair'] });
      }
    }
    let trussPart = null;
    if (useTruss) {
      trussPart = this.truss(ix0 + 1.5, by, iz0 + 1.5, levelY(flights) + 0.4 - by);
    }
    // roof
    if (roof === 'flat') {
      let rects = [{ x0, x1, z0, z1 }];
      for (const h of holes[floors] || []) rects = rects.flatMap(r => rectMinus(r, h));
      for (const r of rects) this.slab(r, top - 1, top, roofColor, roofMat);
      if (parapet) {
        this.box(x0, top, z0, x1, top + 2, z0 + 0.8, color, mat);
        this.box(x0, top, z1 - 0.8, x1, top + 2, z1, color, mat);
        this.box(x0, top, z0 + 0.8, x0 + 0.8, top + 2, z1 - 0.8, color, mat);
        this.box(x1 - 0.8, top, z0 + 0.8, x1, top + 2, z1 - 0.8, color, mat);
        // coping along the parapet top
        if (trim) {
          this.box(x0 - 0.2, top + 2, z0 - 0.2, x1 + 0.2, top + 2.3, z0 + 1, trim, 'plastic');
          this.box(x0 - 0.2, top + 2, z1 - 1, x1 + 0.2, top + 2.3, z1 + 0.2, trim, 'plastic');
        }
      }
      if (roofDetails && w >= 16 && d >= 12) {
        // rooftop AC units and a vent pipe (never over the stair hatch)
        const clear = (px, pz, hw, hd) => !(holes[floors] || []).some(h => px + hw > h.x0 - 1 && px - hw < h.x1 + 1 && pz + hd > h.z0 - 1 && pz - hd < h.z1 + 1);
        const ax = x1 - 5, az = z1 - 4.5;
        if (clear(ax, az, 2, 1.5)) {
          this.block(ax, top, az, 4, 2.6, 3, BC.mediumStone, 'metal');
          this.block(ax, top + 2.6, az, 2.4, 0.3, 2.4, BC.darkStone, 'metal');
        }
        if (w >= 26 && clear(ax - 6, az, 1.5, 1.5)) this.block(ax - 6, top, az, 3, 2, 3, BC.mediumStone, 'metal');
        if (clear(x0 + 4, z1 - 3, 0.4, 0.4)) this.cyl(x0 + 4, top, z1 - 3, 0.8, 3, BC.darkStone, 'metal');
      }
    } else if (roof === 'gable') {
      this.box(x0, top - 1, z0, x1, top, z1, floorColor, floorMat);
      const pitch = 32 * DEG, ov = 1.5;
      const half = d / 2 + ov;
      const rise2 = (d / 2) * Math.tan(pitch);
      const slabW = half / Math.cos(pitch);
      for (const s of [-1, 1]) {
        this.part({
          pos: [x, top + rise2 - (half / 2) * Math.tan(pitch) + 0.5, z + s * half / 2],
          size: [w + 2, 1, slabW], color: roofColor, mat: roofMat, rot: [s * pitch / DEG, 0, 0],
        });
      }
      for (const ex of [x0 + 0.5, x1 - 0.5]) {
        this.wedge(ex, top, z + d / 4, 1, rise2, d / 2, 0, color, mat);
        this.wedge(ex, top, z - d / 4, 1, rise2, d / 2, 180, color, mat);
      }
      // ridge cap
      this.box(x0 - 1.2, top + rise2 + 0.4, z - 0.7, x1 + 1.2, top + rise2 + 1.2, z + 0.7, trim ?? roofColor, trim ? 'plastic' : roofMat);
    }
    // front step and porch light
    if (roofDetails) {
      const dX0 = x + doorX, out = door === 'N' ? -1 : 1, wallZ = door === 'N' ? z0 : z1;
      this.box(dX0 - doorW / 2 - 1, by, wallZ, dX0 + doorW / 2 + 1, by + 0.4, wallZ + out * 2.5, BC.mediumStone, 'concrete');
      if (floors * fh >= 9) this.block(dX0 + doorW / 2 + 1.2, by + 7.5, wallZ + out * 0.2, 0.8, 1, 0.4, 0xfff2b0, 'neon');
    }
    // ---- exterior ladder to the roof (so every building has climbable high ground) ----
    const roofReachable = roof === 'flat' && roofAccess && (useStairs || useTruss);
    const wantLadder = ladder ?? (roof !== 'none' && !roofReachable && (floors * fh >= 8));
    let ladderInfo = null;
    if (wantLadder) {
      const lz = z1 - Math.min(3, d / 4);
      let lyTop;
      if (roof === 'gable') {
        const pitch = 32 * DEG;
        lyTop = top + (d / 2 - Math.abs(lz - z)) * Math.tan(pitch) + 1.1;
      } else lyTop = top + (parapet && roof === 'flat' ? 2.3 : 0.3);
      const sx = ladderSide === 'W' ? -1 : 1, ex = sx > 0 ? x1 : x0;
      this.truss(ex + sx * 1.1, by, lz, lyTop - by + 0.4);
      ladderInfo = { base: V(ex + sx * 4, by, lz), top: V(ex + sx * 1.1, lyTop, lz), roof: V(roof === 'gable' ? x : x - sx * w * 0.2, roof === 'gable' ? top + (d / 2) * Math.tan(32 * DEG) * 0.6 : top, roof === 'gable' ? z + d * 0.15 : z) };
      this.spot('high', ladderInfo.roof.x, ladderInfo.roof.y, ladderInfo.roof.z, [ladderInfo.base, ladderInfo.top, V(ex - sx * 1.5, ladderInfo.top.y - 0.5, lz), ladderInfo.roof]);
    }
    // ---- bot paths & spots ----
    const dX = x + doorX;
    const doorOut = V(dX, by, door === 'N' ? z0 - 4 : z1 + 4);
    const doorIn = V(dX, by, door === 'N' ? z0 + 4 : z1 - 4);
    const path = [doorOut, doorIn];
    const center = (k) => V(x + (rand() - .5) * w * 0.3, levelY(k), z);
    // up flight f: along the wall of the flight below to the end of the building
    // (the aisle above), across to the foot of this one, then up
    const climbFlight = (p, f) => {
      const prev = flightInfo[f.k - 1], fx = f.xs - f.dir * 1.6;
      if (prev) p.push(V(fx, levelY(f.k), (prev.bz0 + prev.bz1) / 2));
      p.push(V(fx, levelY(f.k), (f.bz0 + f.bz1) / 2));
      p.push(V(f.xe + f.dir * 1.8, levelY(f.k + 1), (f.bz0 + f.bz1) / 2));
    };
    for (let k = 0; k < floors; k++) {
      if (k > 0) {
        if (useStairs) climbFlight(path, flightInfo[k - 1]);
        else if (useTruss) {
          if (k === 1) path.push(V(ix0 + 4.5, by, iz0 + 4.5));
          path.push(V(ix0 + 1.5, levelY(k), iz0 + 1.5));
          path.push(V(ix0 + 8, levelY(k), iz0 + 3.5));
        } else break;
      }
      this.spot('indoor', ...center(k).toArray(), [...path, center(k)]);
      this.spot('indoor', x + (rand() - .5) * (w - 6), levelY(k), z + (rand() - .5) * (d - 12), [...path]);
      this.spots[this.spots.length - 1].path.push(this.spots[this.spots.length - 1].pos.clone());
    }
    if (roof === 'flat' && roofAccess && (useStairs || useTruss)) {
      const p = [...path];
      if (useStairs) climbFlight(p, flightInfo[floors - 1]);
      else {
        if (floors === 1) p.push(V(ix0 + 4.5, by, iz0 + 4.5));
        p.push(V(ix0 + 1.5, top, iz0 + 1.5));
        p.push(V(ix0 + 8, top, iz0 + 3.5));
      }
      const rc = V(x + (rand() - .5) * w * 0.4, top, z + (rand() - .5) * d * 0.3);
      p.push(rc);
      this.spot('high', rc.x, rc.y, rc.z, p);
    }
    this.heights.push(roof === 'gable' ? top + (d / 2) * Math.tan(32 * DEG) : top + (roof === 'flat' && parapet ? 2 : 0));
    const info = { x0, x1, z0, z1, ix0, ix1, iz0, iz1, levelY, floors, fh, top, doorOut, doorIn, path, flightInfo, holes, ladder: ladderInfo };
    if (interior) interior(this, info);
    if (furnish ?? !interior) this.furnish(info, floorColor);
    return info;
  }

  // simple default furniture for each floor: table + chairs, sofa, shelf, rug
  furnish(info, wood = BC.brown) {
    const { ix0, ix1, iz0, iz1, x0, x1, z0, z1 } = info;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const w = ix1 - ix0, d = iz1 - iz0;
    if (w < 10 || d < 8) return;
    const palette = [BC.brightRed, BC.brightBlue, BC.darkGreen, BC.mauve, BC.brightOrange];
    for (let k = 0; k < info.floors; k++) {
      const y = info.levelY(k) + (k === 0 ? 0.3 : 0);
      // keep the doorway clear: table goes to the side away from the door
      const fx = info.doorOut.x <= cx ? cx + w * 0.2 : cx - w * 0.2;
      this.table(fx, y, cz, 5, 3, BC.reddishBrown);
      this.chair(fx - 1.5, y, cz + 2.6, 180, palette[(k + 1) % 5]);
      this.chair(fx + 1.5, y, cz - 2.6, 0, palette[(k + 1) % 5]);
      if (d >= 16) this.block(ix0 + 0.8, y, cz, 1.4, 6, 5, wood, 'wood', { tags: ['flammable'] });
      if (w >= 18 && d >= 20) {
        this.block(ix1 - 2, y, cz, 3, 1.6, 7, palette[k % 5], 'fabric', { tags: ['flammable'] });
        this.block(ix1 - 0.9, y + 1.6, cz, 1, 1.8, 7, palette[k % 5], 'fabric', { tags: ['flammable'] });
      }
      this.box(fx - 3.5, y, cz - 3, fx + 3.5, y + 0.12, cz + 3, palette[(k + 2) % 5], 'fabric');
    }
  }

  // Sign: a board with text drawn on its front (+z before rotation)
  sign(x, y, z, w, h, text, { bg = '#1b2a35', fg = '#ffffff', rotY = 0, depth = 0.4, color = null, font = 'Roboto', glow = false, tags = [] } = {}) {
    const p = this.part({ pos: [x, y + h / 2, z], size: [w, h, depth], color: color ?? new THREE.Color(bg).getHex(), mat: 'plastic', rot: [0, rotY, 0], tags });
    this.world.addDecal(p, signTexture(text, w, h, { bg, fg, font }), 'front', { transparent: false, emissive: glow });
    return p;
  }

  bush(x, z, s = 1, color = BC.darkGreen) {
    this.ball(x, -0.6 * s, z, 3.6 * s, color, 'grass', { tags: ['flammable'] });
    this.ball(x + 1.2 * s, -0.5 * s, z + 0.6 * s, 2.8 * s, BC.brightGreen, 'grass', { tags: ['flammable'] });
  }

  // ---------------- props ----------------
  tree(x, z, s = 1, kind = 'oak', fire = false) {
    const ft = fire ? ['fire'] : [];
    if (kind === 'pine') {
      this.cyl(x, 0, z, 1.4 * s, 6 * s, BC.reddishBrown, 'wood', { tags: ['tree', 'flammable', ...ft] });
      for (let i = 0; i < 3; i++) this.part({ pos: [x, (5 + i * 4 + 3) * s, z], size: [(9 - i * 2.5) * s, 7 * s, (9 - i * 2.5) * s], color: BC.pine, mat: 'grass', shape: 'cone', tags: ['tree', 'flammable'] });
    } else if (kind === 'palm') {
      this.cyl(x, 0, z, 1.2 * s, 14 * s, BC.nougat, 'wood', { tags: ['tree', 'flammable', ...ft] });
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 360;
        const r = 3.2 * s;
        this.part({ pos: [x + Math.sin(a * DEG) * r, 14 * s, z + Math.cos(a * DEG) * r], size: [2 * s, 0.4, 7 * s], color: BC.brightGreen, mat: 'grass', rot: [-20, a, 0], tags: ['tree', 'flammable'] });
      }
    } else {
      this.cyl(x, 0, z, 1.6 * s, 8 * s, BC.reddishBrown, 'wood', { tags: ['tree', 'flammable', ...ft] });
      this.ball(x, 6 * s, z, 8.5 * s, BC.darkGreen, 'grass', { tags: ['tree', 'flammable'] });
      this.ball(x + 2.4 * s, 7.6 * s, z + 1 * s, 6 * s, 0x3f8f3f, 'grass', { tags: ['tree', 'flammable'] });
      this.ball(x - 2 * s, 8 * s, z - 1.4 * s, 5.5 * s, 0x2f7a3a, 'grass', { tags: ['tree', 'flammable'] });
      this.ball(x + 0.4 * s, 10.5 * s, z + 0.2 * s, 5 * s, 0x4a9e47, 'grass', { tags: ['tree', 'flammable'] });
    }
  }

  lamp(x, z, h = 12, fire = false) {
    this.cyl(x, 0, z, 1.4, 0.8, BC.black, 'metal');
    this.cyl(x, 0.8, z, 0.6, h - 0.8, BC.black, 'metal');
    this.block(x + 1, h - 0.3, z, 2.6, 0.4, 0.5, BC.black, 'metal');
    this.block(x + 2, h - 1.3, z, 1.4, 1.1, 1.4, BC.black, 'metal');
    this.block(x + 2, h - 1.6, z, 1.1, 0.4, 1.1, 0xfff2b0, 'neon', { tags: fire ? ['fire'] : [] });
  }

  bench(x, z, rotY = 0, color = BC.reddishBrown) {
    const r = rotY * DEG, c = Math.cos(r), s = Math.sin(r);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    let [ax, az] = P(0, 0);
    this.part({ pos: [ax, 1.6, az], size: [5, 0.4, 1.6], color, mat: 'wood', rot: [0, rotY, 0], tags: ['seat', 'flammable'] }).seatYaw = 0;
    [ax, az] = P(0, -0.8);
    this.part({ pos: [ax, 2.8, az], size: [5, 2.2, 0.3], color, mat: 'wood', rot: [0, rotY, 0], tags: ['flammable'] });
    for (const lx of [-2, 2]) { [ax, az] = P(lx, 0); this.part({ pos: [ax, 0.7, az], size: [0.4, 1.4, 1.4], color: BC.black, mat: 'metal', rot: [0, rotY, 0] }); }
  }

  chair(x, y, z, rotY = 0, color = BC.brightRed) {
    const r = rotY * DEG;
    const p = this.part({ pos: [x, y + 1.6, z], size: [2, 0.4, 2], color, mat: 'plastic', rot: [0, rotY, 0], tags: ['seat', 'flammable'] });
    this.part({ pos: [x - Math.sin(r) * 0.9, y + 2.9, z - Math.cos(r) * 0.9], size: [2, 2.4, 0.3], color, mat: 'plastic', rot: [0, rotY, 0], tags: ['flammable'] });
    this.part({ pos: [x, y + 0.7, z], size: [0.4, 1.4, 0.4], color: BC.black, mat: 'metal' });
    return p;
  }

  table(x, y, z, w = 6, d = 4, color = BC.brown, tags = []) {
    this.block(x, y + 2.6, z, w, 0.4, d, color, 'wood', { tags: ['flammable', ...tags] });
    this.block(x, y, z, 0.6, 2.6, 0.6, color, 'wood');
  }

  fence(x0, z0, x1, z1, h = 3, color = BC.white, mat = 'wood') {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 8));
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
      const ang = Math.atan2(bx - ax, bz - az) / DEG;
      this.part({ pos: [(ax + bx) / 2, h * 0.65, (az + bz) / 2], size: [0.4, 0.5, Math.hypot(bx - ax, bz - az)], color, mat, rot: [0, ang, 0], tags: ['flammable'] });
      this.part({ pos: [(ax + bx) / 2, h * 0.3, (az + bz) / 2], size: [0.4, 0.5, Math.hypot(bx - ax, bz - az)], color, mat, rot: [0, ang, 0], tags: ['flammable'] });
      this.block(ax, 0, az, 0.7, h, 0.7, color, mat, { tags: ['flammable'] });
    }
    this.block(x1, 0, z1, 0.7, h, 0.7, color, mat, { tags: ['flammable'] });
  }

  // Roblox TrussPart: climb it by walking into it
  truss(x, y, z, h) { return this.block(x, y, z, 2, h, 2, BC.mediumStone, 'truss', { tags: ['truss'] }); }

  // drivable (optional) car: returns vehicle record
  car(x, z, rotY = 0, color = BC.brightRed, { drivable = true, fire = false } = {}) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY * DEG, 0));
    const parts = [];
    const add = (lx, ly, lz, sx, sy, sz, col, mat, shape = 'box', extraRot = null, tags = []) => {
      const off = V(lx, ly, lz).applyQuaternion(q);
      let rq = q.clone();
      if (extraRot) rq.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...extraRot.map(a => a * DEG))));
      const p = this.part({ pos: [x + off.x, ly, z + off.z], size: [sx, sy, sz], color: col, mat, shape, rot: rq, tags: ['car', 'flammable', ...tags] });
      p.local = { off: V(lx, ly, lz), rot: extraRot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...extraRot.map(a => a * DEG))) : new THREE.Quaternion() };
      parts.push(p);
      return p;
    };
    add(0, 2.2, 0, 5, 1.8, 10, color, 'metal', 'box', null, fire ? ['fire'] : []);
    add(0, 3.9, -0.6, 4.6, 1.6, 5, 0xa9d4f5, 'glass', 'box', null, ['glass']);
    add(0, 4.85, -0.6, 4.8, 0.3, 5.2, color, 'metal');
    for (const [wx, wz] of [[-2.6, 3], [2.6, 3], [-2.6, -3], [2.6, -3]]) add(wx, 1.3, wz, 2.6, 0.9, 2.6, BC.reallyBlack, 'plastic', 'cyl', [0, 0, 90]);
    const seat = add(-1, 3.25, 0.4, 1.8, 0.3, 1.8, BC.black, 'fabric', 'box', null, ['seat']);
    const veh = { parts, seat, pos: V(x, 0, z), yaw: rotY * DEG, speed: 0, drivable, kind: 'car' };
    seat.vehicle = veh;
    this.vehicles.push(veh);
    return veh;
  }

  // Keep every staircase walkable: small props that ended up in a stair's walking
  // corridor (furniture, decorations, fixtures) are taken out.
  clearStairways() {
    const keep = new Set(['stair', 'floor', 'fire', 'truss', 'indestructible', 'seat']);
    const removed = new Set();
    const zones = [
      ...this.flights.map(f => ({ ax: Math.min(f.x0, f.x1) - 2.5, bx: Math.max(f.x0, f.x1) + 2.5, az: f.z - 1.3, bz: f.z + 1.3, ay: f.y0 + 0.35, by: f.y1 + 5.5 })),
      ...this.aisles.map(a => ({ ax: a.x0, bx: a.x1, az: a.z0, bz: a.z1, ay: a.y0, by: a.y1 })),
    ];
    for (const { ax, bx, az, bz, ay, by } of zones) {
      for (const p of this.parts) {
        if (removed.has(p) || [...p.tags].some(t => keep.has(t))) continue;
        if (Math.max(p.size.x, p.size.y, p.size.z) > 8) continue;
        const b = this.world.aabb(p);
        if (b.maxX <= ax || b.minX >= bx || b.maxZ <= az || b.minZ >= bz || b.maxY <= ay || b.minY >= by) continue;
        removed.add(p);
      }
    }
    for (const p of removed) this.world.removePart(p, true);
    if (removed.size) {
      this.parts = this.parts.filter(p => !removed.has(p));
      this.seats = this.seats.filter(p => !removed.has(p));
    }
  }

  finish() {
    this.clearStairways();
    for (const s of this.spawns) s.y = Math.max(s.y, 0);
    // never spawn anyone inside a parked car or a wall: move to the nearest clear spot
    const boxes = this.parts.filter(p => p.collide).map(p => this.world.aabb(p));
    const clear = (x, y, z) => !boxes.some(b => b.maxX > x - 1.3 && b.minX < x + 1.3 && b.maxZ > z - 1.3 && b.minZ < z + 1.3 && b.maxY > y + 1 && b.minY < y + 5.2);
    for (const s of this.spawns) {
      if (clear(s.x, s.y, s.z)) continue;
      search: for (let r = 2; r <= 20; r += 2) {
        for (let a = 0; a < 16; a++) {
          const x = s.x + Math.cos(a * Math.PI / 8) * r, z = s.z + Math.sin(a * Math.PI / 8) * r;
          if (clear(x, s.y, z)) { s.x = x; s.z = z; break search; }
        }
      }
    }
    // default open spots from spawns
    for (const s of this.spawns) this.spot('open', s.x, s.y, s.z, []);
    // tallest solid structure: buildings plus any chunky part (ignores poles and floating balloons)
    let top = 0;
    for (const p of this.parts) {
      if (p.tags.has('float') || p.size.x * p.size.z < 9) continue;
      const b = this.world.aabb(p);
      top = Math.max(top, b.maxY);
    }
    const sorted = [...this.heights, top].sort((a, b) => b - a);
    return {
      name: this.name,
      parts: this.parts,
      spots: this.spots,
      spawns: this.spawns,
      fireStarts: this.fireStarts,
      seats: this.seats,
      trusses: this.trusses,
      flights: this.flights,
      ramps: this.ramps,
      vehicles: this.vehicles,
      interact: this.interact,
      tallest: sorted[0] || 10,
      secondTallest: sorted[1] || sorted[0] || 10,
      extras: this.extras,
    };
  }
}
