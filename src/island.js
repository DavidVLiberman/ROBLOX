// The permanent world: a squished oval of grass over a dirt edge and rock layers,
// the endless ocean, and the Lobby Tower with the leaderboard, the item signs and
// the Power Up Machine on its roof.
import * as THREE from 'three';
import { BC, ISLAND_RX, ISLAND_RZ, OCEAN_LEVEL, DEG, insideIsland } from './util.js';
import { makeLabelTexture, signTexture, getMaterial } from './materials.js';
import { RAPIER, IG_PART } from './world.js';

// The Lobby Tower: a two-storey round building held up by a dark grey pole just off
// the island, looking straight over the map. Players spawn on the first floor; two
// blue staircases in the middle of the building, either side of the glowing circle,
// lead up through an open atrium to the roof, where the Top 10 Survivalists
// leaderboard, the item signs, the Power Up Machine and a portal stand.
export const TOWER = { x: 0, z: -196, r: 30, upperR: 20, top: 70, roof: 84, atrium: 11 };
// hidden Secret Lab (reached through the glowing circle between the staircases)
export const LAB = { x: 2400, y: 420, z: 2400 };
// the Power Up Machine adds up to 6 disasters (7 in total); more power-ups wait for later rounds
export const POWER_MAX = 6;

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// Unit-size elliptic slab for drawing: the top (a ring when `inner` is given, as the
// middle is hidden under the layer above) and the outer wall; no bottom. Drawing only
// what shows keeps the stacked island layers from painting the whole island 5 times.
function slabGeometry(inner = null, seg = 96) {
  const pos = [], nrm = [], idx = [];
  const v = (x, y, z, nx, ny, nz) => { pos.push(x, y, z); nrm.push(nx, ny, nz); return pos.length / 3 - 1; };
  const ring = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2, c = Math.cos(a) * 0.5, s = Math.sin(a) * 0.5;
    ring.push({ c, s, top: v(c, 0.5, s, 0, 1, 0), wt: v(c, 0.5, s, c, 0, s), wb: v(c, -0.5, s, c, 0, s),
      in: inner ? v(c * inner[0], 0.5, s * inner[1], 0, 1, 0) : -1 });
  }
  const centre = inner ? -1 : v(0, 0.5, 0, 0, 1, 0);
  for (let i = 0; i < seg; i++) {
    const a = ring[i], b = ring[i + 1];
    if (inner) idx.push(a.top, a.in, b.in, a.top, b.in, b.top); else idx.push(centre, b.top, a.top);
    idx.push(a.wt, b.wt, b.wb, a.wt, b.wb, a.wb);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
  g.setIndex(idx);
  return g;
}

export class Island {
  constructor(game) {
    this.game = game;
    const w = game.world;
    const P = (o) => w.addPart({ ...o, tags: ['indestructible', ...(o.tags || [])] });
    this.P = P;
    // grass on top, a dirt edge round it, rock layers stepping down into the sea
    const RX = ISLAND_RX, RZ = ISLAND_RZ;
    const layers = [[0, 0, -6, BC.grass, 'grass'], [6, -0.8, -9, 0x6f5034, 'sand'], [11, -3.6, -15, BC.rock, 'slate'],
      [17, -7.4, -24, 0x5d5953, 'slate'], [22, -15, -46, 0x4a4641, 'slate']];
    layers.forEach(([grow, top, bottom, color, mat], i) => {
      const prev = layers[i - 1];
      this.oval(0, 0, RX + grow, RZ + grow, top, bottom, color, mat, prev ? [RX + prev[0], RZ + prev[0]] : null);
    });

    // ---- ocean ----
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x2a74b8, transparent: true, opacity: 0.82, roughness: 0.2, metalness: 0.1 });
    this.oceanMat = oceanMat;
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = OCEAN_LEVEL;
    ocean.receiveShadow = true;
    ocean.renderOrder = 1;
    game.scene.add(ocean);
    this.ocean = ocean;

    this.buildTower(P);
  }

  // An upright elliptic slab (centre cx/cz, semi-axes rx/rz) that is still a Part, so
  // rays, the bots' grid and the support graph see it, but with an exact oval collider
  // and a smooth 96-sided look instead of the 18-sided part cylinder.
  // inner: semi-axes of the layer on top of this one (its middle is never seen)
  oval(cx, cz, rx, rz, top, bottom, color, mat, inner = null, tags = []) {
    const w = this.game.world, h = top - bottom;
    const part = this.P({ pos: [cx, (top + bottom) / 2, cz], size: [rx * 2, h, rz * 2], color, mat, shape: 'cyl', tags });
    w.byCollider.delete(part.collider.handle);
    w.physics.removeCollider(part.collider, false);
    const pts = [];
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2;
      pts.push(Math.cos(a) * rx, -h / 2, Math.sin(a) * rz, Math.cos(a) * rx, h / 2, Math.sin(a) * rz);
    }
    const cd = RAPIER.ColliderDesc.convexHull(new Float32Array(pts)).setFriction(0.6).setRestitution(0.1)
      .setCollisionGroups(IG_PART).setSolverGroups(IG_PART);
    part.collider = w.physics.createCollider(cd, part.body);
    w.byCollider.set(part.collider.handle, part);
    part.pool.set(part.inst, ZERO);
    const geo = slabGeometry(inner && [Math.max(0, inner[0] - 0.5) / rx, Math.max(0, inner[1] - 0.5) / rz]);
    const mesh = new THREE.InstancedMesh(geo, getMaterial(mat), 1);
    mesh.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(cx, (top + bottom) / 2, cz), new THREE.Quaternion(), new THREE.Vector3(rx * 2, h, rz * 2)));
    mesh.setColorAt(0, new THREE.Color(color));
    mesh.receiveShadow = true;
    mesh.castShadow = mat !== 'grass' && mat !== 'slate' && mat !== 'sand';
    this.game.scene.add(mesh);
    return part;
  }

  buildTower(P) {
    const { x: tx, z: tz, r, upperR, top, roof, atrium } = TOWER;
    const g = this.game;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const white = 0xe9ebee, grey = BC.mediumStone, dark = 0x4f4d52, blue = 0x2f6fd8;
    // rocks round the foot of the pole
    P({ pos: [tx, OCEAN_LEVEL - 4, tz], size: [30, 6, 28], color: 0x5d5953, mat: 'slate', shape: 'cyl' });
    P({ pos: [tx, OCEAN_LEVEL + 0.2, tz], size: [21, 3.2, 20], color: BC.rock, mat: 'slate', shape: 'cyl' });
    for (const [bx, bz, s] of [[-12, 6, 7], [10, 9, 6], [13, -8, 8], [-9, -12, 6.5], [2, 15, 5]]) P({ pos: [tx + bx, OCEAN_LEVEL + 0.6, tz + bz], size: [s, s * 0.5, s], color: 0x77726b, mat: 'slate', shape: 'cyl', rot: [0, bx * 7, 0] });
    // the pole, a flared collar under the floor, and the first floor
    P({ pos: [tx, (top - 2 - 10) / 2, tz], size: [14, top - 2 + 10, 14], color: dark, mat: 'concrete', shape: 'cyl' });
    P({ pos: [tx, top - 9, tz], size: [r * 1.7, 14, r * 1.7], color: grey, mat: 'concrete', shape: 'frustum', rot: [180, 0, 0] });
    this.oval(tx, tz, r, r, top, top - 2, white, 'plastic');
    this.oval(tx, tz, r + 0.5, r + 0.5, top - 1.8, top - 2.4, blue, 'plastic', [r, r]);
    // glass railing around the first floor, so the whole map is in view
    const ring = (rad, y, h, n, color, mat, tags = [], skip = null, depth = 0.5) => {
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * Math.PI * 2;
        if (skip && skip(a)) continue;
        const len = 2 * (rad + depth / 2) * Math.tan(Math.PI / n) + 0.05;
        P({ pos: [tx + Math.cos(a) * rad, y, tz + Math.sin(a) * rad], size: [depth, h, len], color, mat, rot: [0, -a / DEG, 0], tags });
      }
    };
    // (tall enough that you can't just jump over it back onto the map)
    ring(r - 0.3, top + 4.5, 9, 40, 0xa9d4f5, 'glass', ['glass']);
    ring(r - 0.3, top + 9.15, 0.3, 40, white, 'metal');
    // second storey on white columns (none on the side facing the map, so nothing blocks the view)
    for (const deg of [0, 180, 210, 240, 270, 300, 330]) {
      const a = deg * DEG;
      P({ pos: [tx + Math.cos(a) * (upperR - 2), top + (roof - 2 - top) / 2, tz + Math.sin(a) * (upperR - 2)], size: [1.6, roof - 2 - top, 1.6], color: white, mat: 'plastic', shape: 'cyl' });
    }
    // the roof deck: a ring round the open atrium in the middle, where the stairs come up
    // (every other segment sits a hair higher so the overlapping tops don't flicker)
    const segs = 40;
    for (let i = 0; i < segs; i++) {
      const a = (i + 0.5) / segs * Math.PI * 2, len = 2 * upperR * Math.tan(Math.PI / segs) + 0.05;
      const rm = (atrium + upperR) / 2;
      P({ pos: [tx + Math.cos(a) * rm, roof - 1 + (i % 2) * 0.012, tz + Math.sin(a) * rm], size: [upperR - atrium, 2, len], color: white, mat: 'plastic', rot: [0, -a / DEG, 0] });
    }
    // two blue staircases inside, either side of the glowing circle, climbing away from the map
    const steps = 16, rise = (roof - top) / steps, runZ0 = tz + 8, sxs = 5.5, sw = 5;
    // (railing and trim segments that would sit across the top of a staircase are left out)
    const overStairs = (rad, n) => (a) => {
      if (Math.sin(a) > 0) return false;
      const x0 = Math.cos(a - Math.PI / n) * rad, x1 = Math.cos(a + Math.PI / n) * rad;
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1), a0 = sxs - sw / 2 - 0.1, a1 = sxs + sw / 2 + 0.1;
      return (hi > a0 && lo < a1) || (hi > -a1 && lo < -a0);
    };
    ring(upperR - 0.1, roof - 2.15, 0.5, segs, blue, 'plastic', [], null, 1);
    ring(atrium + 0.1, roof - 2.15, 0.5, 32, blue, 'plastic', [], overStairs(atrium + 0.1, 32), 0.6);
    this.stairs = [];
    for (const sx of [-1, 1]) {
      const x = tx + sx * sxs;
      for (let i = 0; i < steps - 1; i++) {
        const h = (i + 1) * rise;
        P({ pos: [x, top + h / 2, runZ0 - i - 0.5], size: [sw, h, 1], color: blue, mat: 'plastic' });
      }
      // the top step is a landing that reaches the roof deck
      const l0 = runZ0 - (steps - 1), l1 = tz - 11.6;
      P({ pos: [x, roof - 1 + 0.03, (l0 + l1) / 2], size: [sw, 2, l0 - l1], color: blue, mat: 'plastic' });
      // hand rails on both sides
      // (3 studs above the nosing line, which climbs one rise per stud toward the roof)
      const rl = Math.hypot(steps - 1, roof - top - rise), ang = Math.atan2(roof - top - rise, steps - 1) / DEG;
      for (const side of [-1, 1]) {
        const railX = x + side * (sw / 2 - 0.15);
        P({ pos: [railX, top + ((steps - 1) / 2 + 1) * rise + 3, runZ0 - (steps - 1) / 2], size: [0.25, 0.25, rl], color: white, mat: 'metal', rot: [ang, 0, 0] });
        for (const k of [0.5, 5.5, 10.5, steps - 1.5]) {
          const y0 = top + (Math.floor(k) + 1) * rise, y1 = top + (k + 1) * rise + 3;
          P({ pos: [railX, (y0 + y1) / 2, runZ0 - k], size: [0.25, y1 - y0, 0.25], color: white, mat: 'metal' });
        }
        // along the landing, as far as the roof's edge
        const edgeZ = tz - Math.sqrt(Math.max(0, atrium * atrium - (railX - tx) * (railX - tx)));
        P({ pos: [railX, roof + 3, (l0 + edgeZ) / 2], size: [0.25, 0.25, l0 - edgeZ], color: white, mat: 'metal' });
        P({ pos: [railX, roof + 1.5, edgeZ + 0.2], size: [0.25, 3, 0.25], color: white, mat: 'metal' });
      }
      this.stairs.push({ bottom: V(x, top, runZ0 + 2.5), top: V(x, roof, l0 - 1.5), landing: V(x, roof, tz - 13.2) });
    }
    // railing round the atrium (posts and two rails), open where the stairs arrive
    const ar = atrium + 0.35, an = 36, open = overStairs(ar, an);
    ring(ar, roof + 3.75, 0.3, an, white, 'metal', [], open, 0.4);
    ring(ar, roof + 1.9, 0.25, an, white, 'metal', [], open, 0.3);
    for (let i = 0; i < an; i++) {
      const a = i / an * Math.PI * 2;
      if (open(a + Math.PI / an) && open(a - Math.PI / an)) continue;
      P({ pos: [tx + Math.cos(a) * ar, roof + 1.9, tz + Math.sin(a) * ar], size: [0.3, 3.8, 0.3], color: white, mat: 'metal' });
    }
    // roof railing all the way round
    ring(upperR - 0.3, roof + 4.5, 9, 30, 0xa9d4f5, 'glass', ['glass']);
    ring(upperR - 0.3, roof + 9.15, 0.3, 30, white, 'metal');

    // spawn area: two SpawnLocations on the first floor, on the side facing the map
    for (const sx of [-1, 1]) P({ pos: [tx + sx * 6, top + 0.1, tz + 22], size: [7, 0.2, 5], color: grey, mat: 'plastic' });
    this.spawnPoints = [];
    for (let i = 0; i < 16; i++) {
      const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      this.spawnPoints.push(V(tx + sx * (3.5 + (k % 4) * 1.6), top + 0.3, tz + 21 + (k < 4 ? -1 : 1.2)));
    }

    // the glowing circle between the staircases (Secret Lab entrance)
    P({ pos: [tx, top + 0.06, tz], size: [5, 0.12, 5], color: 0x58e6ff, mat: 'neon', shape: 'cyl', collide: false });
    this.labCircle = V(tx, top, tz);

    // ---- roof, left to right as you face them from the middle: Red Apple sign, a
    // billboard, the Top 10 Survivalists leaderboard, Green Balloon sign, the Power Up
    // Machine and a (decorative) portal ----
    const onArc = (deg, rad) => { const a = deg * DEG; return V(tx + Math.cos(a) * rad, roof, tz + Math.sin(a) * rad); };
    const face = (p) => Math.atan2(tx - p.x, tz - p.z);   // yaw that faces the roof centre
    const board = (p, w, h, tex, y0 = 1, frame = BC.black) => {
      const yaw = face(p);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const panel = P({ pos: [p.x, roof + y0 + h / 2, p.z], size: [w + 0.6, h + 0.6, 0.6], color: frame, mat: 'metal', rot: q });
      for (const s of [-1, 1]) P({ pos: [p.x + Math.cos(yaw) * s * w * 0.35, roof + y0 / 2, p.z - Math.sin(yaw) * s * w * 0.35], size: [0.8, y0, 0.8], color: frame, mat: 'metal' });
      g.world.addDecal(panel, tex, 'front', { w, h, transparent: false, emissive: true });
      return panel;
    };
    this.signs = [];
    const sign = (deg, kind, title, tex) => {
      const p = onArc(deg, upperR - 3);
      board(p, 6.5, 4.5, tex, 1.2, 0xf2f3f3);
      this.signs.push({ kind, title, pos: p });
    };
    sign(-155, 'apple', 'Red Apple', appleSignTexture());
    board(onArc(-124, upperR - 3), 8, 5, billboardTexture(), 1.2);
    this.boardTex = makeLabelTexture(['Top 10 Survivalists'], { w: 1024, h: 512 });
    this.board = board(onArc(-90, upperR - 2.5), 16, 8, this.boardTex, 1.5);
    sign(-56, 'balloon', 'Green Balloon', balloonSignTexture());
    this.buildPowerUp(P, onArc(-27, upperR - 4.4), face);
    this.buildPortal(P, onArc(1, upperR - 4), face);

    this.buildLab(P);
  }

  // The Power Up Machine: a yellow steampunk boiler with brass gears and pipes. The
  // more power-ups are queued, the hotter (redder) it glows.
  buildPowerUp(P, m, face) {
    const g = this.game, roof = m.y, S = 1.15;
    const yaw = face(m), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const L = (lx, ly, lz) => [m.x + (right.x * lx + fwd.x * lz) * S, roof + ly * S, m.z + (right.z * lx + fwd.z * lz) * S];
    const Z = (x, y, z) => [x * S, y * S, z * S];
    const R = (rx = 0, rz = 0) => [rx, yaw / DEG, rz];
    const iron = 0x3b3a3f, brass = 0xb98c46, copper = 0xa4582e;
    this.pmTint = [];
    const tint = (o) => { const p = P(o); this.pmTint.push(p); return p; };
    P({ pos: L(0, 0.4, 0), size: Z(7.2, 0.8, 5.4), color: iron, mat: 'metal', rot: q });
    for (const sx of [-1, 1]) P({ pos: L(sx * 3, 1.1, -1.8), size: Z(0.9, 0.6, 0.9), color: brass, mat: 'metal', rot: q });
    // boiler, bands, dome and funnel
    tint({ pos: L(0, 3.4, -0.7), size: Z(4.2, 5.2, 4.2), color: BC.brightYellow, mat: 'plastic', shape: 'cyl' });
    for (const y of [1.5, 3.4, 5.3]) P({ pos: L(0, y, -0.7), size: Z(4.5, 0.35, 4.5), color: brass, mat: 'metal', shape: 'cyl' });
    tint({ pos: L(0, 6.55, -0.7), size: Z(4.2, 1.7, 4.2), color: BC.brightYellow, mat: 'plastic', shape: 'frustum' });
    P({ pos: L(0, 8.1, -0.7), size: Z(1.3, 1.8, 1.3), color: iron, mat: 'metal', shape: 'cyl' });
    P({ pos: L(0, 9.2, -0.7), size: Z(2.1, 0.9, 2.1), color: iron, mat: 'metal', shape: 'frustum', rot: [180, 0, 0] });
    this.pmLight = P({ pos: L(0, 9.75, -0.7), size: Z(1.4, 0.25, 1.4), color: 0xffe066, mat: 'neon', shape: 'cyl' });
    // gears on both sides
    for (const sx of [-1, 1]) {
      P({ pos: L(sx * 2.75, 3.6, -0.2), size: Z(2.8, 0.4, 2.8), color: brass, mat: 'metal', shape: 'cyl', rot: R(0, 90) });
      P({ pos: L(sx * 2.75, 5.3, -1.7), size: Z(1.6, 0.45, 1.6), color: copper, mat: 'metal', shape: 'cyl', rot: R(0, 90) });
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        P({ pos: L(sx * 2.75, 3.6 + Math.sin(a) * 1.5, -0.2 + Math.cos(a) * 1.5), size: Z(0.4, 0.5, 0.5), color: brass, mat: 'metal', rot: R(-a / DEG, 0) });
      }
      // a pipe from the boiler down into the base
      P({ pos: L(sx * 1.9, 2.4, -2.6), size: Z(0.5, 3.2, 0.5), color: copper, mat: 'metal', shape: 'cyl' });
      P({ pos: L(sx * 1.9, 4.05, -2.2), size: Z(0.5, 0.5, 1.1), color: copper, mat: 'metal', rot: q });
    }
    // control desk with the gauge screen, a big button and a lever
    tint({ pos: L(0, 1.9, 1.75), size: Z(5.2, 2.2, 1.4), color: BC.brightYellow, mat: 'plastic', rot: q });
    P({ pos: L(0, 3.05, 1.75), size: Z(5.4, 0.2, 1.6), color: brass, mat: 'metal', rot: q });
    const screen = P({ pos: L(0, 4.3, 1.5), size: Z(4.6, 2.4, 0.4), color: 0x22201c, mat: 'metal', rot: q });
    this.pmTex = makeLabelTexture(['POWER UP'], { w: 384, h: 200 });
    g.world.addDecal(screen, this.pmTex, 'front', { w: 4.3 * S, h: 2.15 * S, transparent: false, emissive: true });
    tint({ pos: L(0, 5.65, 1.5), size: Z(4.9, 0.3, 0.7), color: BC.brightYellow, mat: 'plastic', rot: q });
    P({ pos: L(-1.4, 3.3, 2.15), size: Z(1.1, 0.3, 1.1), color: BC.brightRed, mat: 'neon', shape: 'cyl' });
    P({ pos: L(1.4, 3.3, 2.15), size: Z(0.8, 0.3, 0.8), color: 0x3fd06a, mat: 'neon', shape: 'cyl' });
    P({ pos: L(2.95, 2.6, 1.75), size: Z(0.25, 1.6, 0.25), color: iron, mat: 'metal', rot: R(25, 0) });
    P({ pos: L(2.95, 3.4, 2.1), size: Z(0.55, 0.55, 0.55), color: BC.brightRed, mat: 'plastic', rot: q });
    this.powerUpMachine = new THREE.Vector3(m.x, roof, m.z);
    this.pmTop = new THREE.Vector3(...L(0, 10, -0.7));
  }

  // A decorative game portal: an upright ring with a swirling purple field.
  buildPortal(P, m, face) {
    const roof = m.y, yaw = face(m), yd = yaw / DEG;
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const cy = roof + 4.6, R0 = 3.4, n = 20;
    P({ pos: [m.x, roof + 0.5, m.z], size: [8, 1, 2.6], color: 0x3b3a4a, mat: 'metal', rot: [0, yd, 0] });
    for (let i = 0; i < n; i++) {
      const b = (i + 0.5) / n * Math.PI * 2;
      const len = 2 * (R0 + 0.45) * Math.tan(Math.PI / n) + 0.05;
      P({ pos: [m.x + right.x * Math.cos(b) * R0, cy + Math.sin(b) * R0, m.z + right.z * Math.cos(b) * R0], size: [0.9, len, 1], color: i % 2 ? 0x6f3fd8 : 0x4fd1ff, mat: 'neon', rot: [0, yd, b / DEG] });
    }
    P({ pos: [m.x, cy, m.z], size: [R0 * 2 - 0.4, 0.2, R0 * 2 - 0.4], color: 0x9b5cff, mat: 'forcefield', shape: 'cyl', rot: [90, yd, 0], collide: false });
    P({ pos: [m.x, cy, m.z], size: [2.6, 0.25, 2.6], color: 0xe6d6ff, mat: 'forcefield', shape: 'cyl', rot: [90, yd, 0], collide: false });
    this.portal = new THREE.Vector3(m.x, roof, m.z);
  }

  // Secret Lab: a hidden room with models of four maps; the glowing pad goes back.
  buildLab(P) {
    const { x, y, z } = LAB;
    const g = this.game;
    P({ pos: [x, y - 1, z], size: [36, 2, 36], color: 0xd9dde2, mat: 'plastic' });
    P({ pos: [x, y + 13, z], size: [36, 2, 36], color: 0xb8bcc2, mat: 'plastic' });
    for (const [px, pz, sx, sz] of [[0, 18, 36, 1], [0, -18, 36, 1], [18, 0, 1, 36], [-18, 0, 1, 36]]) P({ pos: [x + px, y + 6, z + pz], size: [sx, 12, sz], color: 0xc9ced4, mat: 'plastic' });
    for (const px of [-12, 0, 12]) P({ pos: [x + px, y + 11.9, z], size: [1, 0.3, 30], color: 0xf4f8ff, mat: 'neon' });
    const sign = P({ pos: [x, y + 9, z - 17.3], size: [14, 3, 0.4], color: 0x1b2a35, mat: 'metal' });
    g.world.addDecal(sign, signTexture('SECRET LAB', 14, 3, { bg: '#1b2a35' }), 'front', { transparent: false, emissive: true });
    // mini models on pedestals: Arch Park, Heights School, Launch Land, Modest Headquarters
    const ped = (px, pz) => P({ pos: [x + px, y + 1.5, z + pz], size: [6, 3, 6], color: 0x9aa0a8, mat: 'metal' });
    ped(-10, -8); ped(-3.3, -8); ped(3.3, -8); ped(10, -8);
    P({ pos: [x - 11.5, y + 4.5, z - 8], size: [0.8, 3, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 8.5, y + 4.5, z - 8], size: [0.8, 3, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 10, y + 6.3, z - 8], size: [4, 0.7, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 3.3, y + 4.6, z - 8], size: [4, 3.2, 2.4], color: 0xa0442b, mat: 'brick' });
    P({ pos: [x - 3.3, y + 6.9, z - 8], size: [1, 1.4, 1], color: 0xa0442b, mat: 'brick' });
    P({ pos: [x + 3.3, y + 5.5, z - 8], size: [1.2, 5, 1.2], color: BC.white, mat: 'metal', shape: 'cyl' });
    P({ pos: [x + 3.3, y + 8.5, z - 8], size: [1.2, 1.2, 1.2], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    P({ pos: [x + 10, y + 5.2, z - 8], size: [2.4, 4.4, 2.4], color: 0x8fc4e8, mat: 'glass' });
    // the way back
    P({ pos: [x, y + 0.06, z + 10], size: [5, 0.12, 5], color: 0x58e6ff, mat: 'neon', shape: 'cyl', collide: false });
    this.labReturn = new THREE.Vector3(x, y, z + 10);
    this.labSpawn = new THREE.Vector3(x, y + 0.5, z + 4);
  }

  inLab(p) { return Math.abs(p.x - LAB.x) < 20 && Math.abs(p.z - LAB.z) < 20 && Math.abs(p.y - LAB.y) < 15; }

  // standing in a glowing circle for 2 seconds takes you to the lab (or back)
  updateLabPortals(c, dt) {
    const near = (pt) => Math.hypot(c.pos.x - pt.x, c.pos.z - pt.z) < 2.3 && Math.abs(c.pos.y - pt.y) < 1.5;
    const pt = near(this.labCircle) ? 'lab' : near(this.labReturn) ? 'back' : null;
    if (!pt) { c.portalT = 0; return; }
    c.portalT = (c.portalT || 0) + dt;
    if (c.portalT < 2) return;
    c.portalT = -2;   // don't bounce straight back
    if (pt === 'lab') { c.teleport(this.labSpawn); this.game.ui?.toast('You found the Secret Lab!'); }
    else c.teleport(this.randomSpawn());
  }

  inTower(p) {
    const { x, z, r, top } = TOWER;
    const d = Math.hypot(p.x - x, p.z - z);
    return (d < r + 6 && p.y > top - 20) || (d < 9 && p.y > -10) || this.inLab(p);
  }

  // on the island (grass, dirt edge or the rocks round it) and not in the lobby
  onIsland(p) {
    return insideIsland(p.x, p.z, 18) && p.y > OCEAN_LEVEL - 4 && !this.inTower(p);
  }

  randomSpawn() {
    const s = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    return s.clone().add(new THREE.Vector3((Math.random() - .5) * 1.2, 0, (Math.random() - .5) * 1.2));
  }

  // A random spot in the lobby for idle bots: on the roof in front of the signs, or on
  // the first floor on the map side. From both, the walk to either staircase is a
  // straight line that misses the stairs and the atrium.
  lobbySpot(rand) {
    const { x, z, r, upperR, top, roof } = TOWER;
    if (rand() < 0.3) {
      const a = (-114 + rand() * 48) * DEG, d = 13.6 + rand() * 1.8;
      return new THREE.Vector3(x + Math.cos(a) * d, roof, z + Math.sin(a) * d);
    }
    const a = (25 + rand() * 130) * DEG, d = upperR + 1.5 + rand() * (r - upperR - 4);
    return new THREE.Vector3(x + Math.cos(a) * d, top, z + Math.sin(a) * d);
  }

  // Top 10 Survivalists: name and survivals
  drawBoard(totalRounds, entries) {
    const c = this.boardTex.image;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#173a63'); bg.addColorStop(1, '#0f2440');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2f6fd8'; ctx.fillRect(0, 0, W, 78);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 52px Roboto, "Source Sans Pro", Arial, sans-serif'; ctx.fillText('Top 10 Survivalists', W / 2, 42);
    ctx.font = '700 22px Roboto, Arial, sans-serif'; ctx.fillStyle = '#9fc6ff';
    ctx.textAlign = 'left'; ctx.fillText('Name', 110, 98);
    ctx.textAlign = 'right'; ctx.fillText('Survivals', W - 70, 98);
    const rowH = 39.5, y0 = 112;
    for (let i = 0; i < 10; i++) {
      const y = y0 + i * rowH, e = entries[i];
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(40, y, W - 80, rowH); }
      ctx.font = '700 28px Roboto, Arial, sans-serif';
      ctx.fillStyle = i === 0 ? '#f5cd30' : i === 1 ? '#d6dde4' : i === 2 ? '#e0a46a' : '#ffffff';
      ctx.textAlign = 'right'; ctx.fillText(`${i + 1}.`, 96, y + rowH / 2 + 1);
      if (!e) continue;
      ctx.textAlign = 'left'; ctx.fillText(fit(ctx, e.name, W - 380), 110, y + rowH / 2 + 1);
      ctx.textAlign = 'right'; ctx.fillText(String(e.survivals), W - 70, y + rowH / 2 + 1);
    }
    this.boardTex.needsUpdate = true;
  }

  // the machine's gauge and colour: queued = power-ups waiting (more than 6 carry over)
  drawPowerUp(queued) {
    const n = Math.min(POWER_MAX, queued), saved = Math.max(0, queued - POWER_MAX), power = 1 + n;
    const c = this.pmTex.image, ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.fillStyle = '#1d1a14'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#b98c46'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5cd30'; ctx.font = '900 30px Roboto, Arial, sans-serif'; ctx.fillText('POWER UP MACHINE', W / 2, 30);
    // gauge: seven marks, the needle on the next round's power
    const gx = 96, gy = 150, gr = 62;
    ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b98c46'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.stroke();
    for (let k = 1; k <= 7; k++) {
      const a = Math.PI + (k - 1) / 6 * Math.PI;
      ctx.strokeStyle = k <= power ? tintCss(k - 1) : '#6b6355'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (gr - 4), gy + Math.sin(a) * (gr - 4)); ctx.lineTo(gx + Math.cos(a) * (gr - 18), gy + Math.sin(a) * (gr - 18)); ctx.stroke();
    }
    const na = Math.PI + n / 6 * Math.PI;
    ctx.strokeStyle = '#c4281c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 12), gy + Math.sin(na) * (gr - 12)); ctx.stroke();
    ctx.fillStyle = '#3b3a3f'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tintCss(n); ctx.font = '900 64px Roboto, Arial, sans-serif'; ctx.fillText(`${power}/7`, 272, 102);
    ctx.fillStyle = '#efe4c8'; ctx.font = '700 19px Roboto, Arial, sans-serif';
    ctx.fillText(power === 1 ? 'Next round: 1 disaster' : `Next round: ${power} disasters`, 274, 148);
    if (saved) { ctx.fillStyle = '#9fd8ff'; ctx.fillText(`+${saved} saved for later`, 274, 174); }
    this.pmTex.needsUpdate = true;
    const w = this.game.world, col = tintHex(n);
    for (const p of this.pmTint || []) w.setColor(p, col);
    if (this.pmLight) w.setColor(this.pmLight, n ? tintHex(Math.min(6, n + 1)) : 0xffe066);
  }

  setWater(level) {
    // the ocean plane doubles as the flood plane when it covers the island
    this.ocean.position.y = level;
  }
}

// ---------------------------------------------------------------- lobby artwork
// The machine goes from yellow to orange to red as the power rises.
const TINTS = [0xf5cd30, 0xf5b52a, 0xf39a26, 0xee7d22, 0xe5601f, 0xd9441c, 0xc72a19];
function tintHex(n) { return TINTS[Math.max(0, Math.min(6, n))]; }
function tintCss(n) { return '#' + tintHex(n).toString(16).padStart(6, '0'); }

function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// text that wraps onto several lines inside a box
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * lineH));
}

function clickNow(ctx, cx, cy, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, cx - 112, cy - 26 + 5, 224, 54, 16); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, cx - 112, cy - 26, 224, 54, 16); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; roundRect(ctx, cx - 112, cy - 26, 224, 54, 16); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = '900 32px Roboto, Arial, sans-serif'; ctx.fillText('Click Now!', cx, cy + 2);
}

function drawApple(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#d01c1c';
  ctx.beginPath(); ctx.moveTo(0, -38);
  ctx.bezierCurveTo(30, -62, 74, -40, 66, 6); ctx.bezierCurveTo(60, 48, 26, 70, 0, 56);
  ctx.bezierCurveTo(-26, 70, -60, 48, -66, 6); ctx.bezierCurveTo(-74, -40, -30, -62, 0, -38); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-32, -14, 10, 20, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -36); ctx.quadraticCurveTo(4, -58, 12, -70); ctx.stroke();
  ctx.fillStyle = '#3f9a2f'; ctx.beginPath(); ctx.ellipse(30, -60, 22, 10, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBalloon(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 62); ctx.bezierCurveTo(18, 90, -14, 110, 6, 140); ctx.stroke();
  ctx.fillStyle = '#25b52b'; ctx.beginPath(); ctx.ellipse(0, -6, 52, 64, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, 56); ctx.lineTo(8, 56); ctx.lineTo(4, 66); ctx.lineTo(-4, 66); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-20, -30, 11, 21, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function burst(ctx, x, y, r, n, color, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * 0.74 : r; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e09a00'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

// Red Apple sign: light red, "An apple a day saves the day!"
function appleSignTexture() {
  return canvasTex(520, 360, (ctx, W, H) => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffb3ad'); bg.addColorStop(1, '#ff8f87');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 34px Roboto, Arial, sans-serif';
    ctx.lineWidth = 6; ctx.strokeStyle = '#a3170f';
    ctx.strokeText('An apple a day saves the day!', W / 2, 40); ctx.fillText('An apple a day saves the day!', W / 2, 40);
    drawApple(ctx, 132, 172, 1.25);
    // speech bubble
    ctx.fillStyle = '#ffffff'; roundRect(ctx, 220, 92, 150, 50, 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(232, 130); ctx.lineTo(206, 152); ctx.lineTo(250, 140); ctx.fill();
    ctx.fillStyle = '#a3170f'; ctx.font = 'italic 700 22px Roboto, Arial, sans-serif'; ctx.fillText('Nom nom nom...', 295, 118);
    ctx.fillStyle = '#7a120c'; ctx.font = '800 28px Roboto, Arial, sans-serif';
    wrapText(ctx, 'Red apples last forever!', 384, 204, 220, 32);
    clickNow(ctx, W / 2, 312, '#d0281e');
  });
}

// Green Balloon sign: light green, "Need a lift?" and a yellow price burst
function balloonSignTexture() {
  return canvasTex(520, 360, (ctx, W, H) => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#c4f2b8'); bg.addColorStop(1, '#93dd85');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 46px Roboto, Arial, sans-serif';
    ctx.lineWidth = 7; ctx.strokeStyle = '#1d6b22';
    ctx.strokeText('Need a lift?', 200, 44); ctx.fillText('Need a lift?', 200, 44);
    drawBalloon(ctx, 118, 148, 1.15);
    ctx.fillStyle = '#185c1c'; ctx.font = '800 27px Roboto, Arial, sans-serif';
    wrapText(ctx, 'Pick up a green balloon of your own!', 352, 176, 270, 33);
    burst(ctx, 446, 64, 60, 14, '#ffdd1f', 0.2);
    ctx.save(); ctx.translate(446, 64); ctx.rotate(-0.22);
    ctx.fillStyle = '#c4281c'; ctx.font = '900 20px Roboto, Arial, sans-serif'; ctx.fillText('Just', 0, -14);
    ctx.font = '900 30px Roboto, Arial, sans-serif'; ctx.fillText('80 R$', 0, 12);
    ctx.restore();
    clickNow(ctx, W / 2 + 40, 312, '#2a9a2f');
  });
}

// a generic billboard (no brands)
function billboardTexture() {
  return canvasTex(640, 400, (ctx, W, H) => {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ff9f43'); sky.addColorStop(0.55, '#ffd36b'); sky.addColorStop(0.56, '#3d8ad6'); sky.addColorStop(1, '#245d99');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.5, 62, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.58 + i * 10 - 30, H * 0.6 + i * 18, 200 - i * 34, 5);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 76px Roboto, Arial, sans-serif';
    ctx.lineWidth = 10; ctx.strokeStyle = '#1b2a35';
    ctx.strokeText('YOUR AD', W * 0.36, 120); ctx.fillText('YOUR AD', W * 0.36, 120);
    ctx.strokeText('HERE', W * 0.36, 200); ctx.fillText('HERE', W * 0.36, 200);
    ctx.fillStyle = '#1b2a35'; roundRect(ctx, 40, 300, W - 80, 64, 14); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '700 30px Roboto, Arial, sans-serif'; ctx.fillText('Billboard space available', W / 2, 333);
  });
}
