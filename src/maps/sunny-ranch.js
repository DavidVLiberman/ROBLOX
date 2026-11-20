// Sunny Ranch: a farm inside a white fence that goes all the way round, with a gate
// at the front. The big red barn has a hayloft, and the lantern hanging inside it is
// where the fire starts. Two tall silos stand beside it (one has a ladder), a windmill
// turns over the cornfield, cows graze in the paddock by the pond, and the tractor is
// yours to drive.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const RED = 0xa8322a, SOIL = 0x6b4a2a, HAY = 0xe0c068, WHITE = 0xf2f2ee;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

export default {
  name: 'Sunny Ranch',
  build(b, game) {
    const updates = [];
    // ---------------- the white fence round the farm ----------------
    const FX0 = -100, FX1 = 100, FZ0 = -92, FZ1 = 70;
    const rail = (ax, az, bx, bz) => {
      for (const y of [1.2, 2.6]) b.box(Math.min(ax, bx) - 0.2, y, Math.min(az, bz) - 0.2, Math.max(ax, bx) + 0.2, y + 0.4, Math.max(az, bz) + 0.2, WHITE, 'wood', { tags: ['flammable'] });
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 10));
      for (let k = 0; k <= n; k++) b.block(ax + (bx - ax) * k / n, 0, az + (bz - az) * k / n, 0.6, 3.6, 0.6, WHITE, 'wood', { tags: ['flammable'] });
    };
    rail(FX0, FZ0, FX1, FZ0); rail(FX0, FZ0, FX0, FZ1); rail(FX1, FZ0, FX1, FZ1);
    rail(FX0, FZ1, -8, FZ1); rail(8, FZ1, FX1, FZ1);
    for (const s of [-1, 1]) b.block(s * 8, 0, FZ1, 1, 6, 1, WHITE, 'wood');
    b.box(-8.5, 6, FZ1 - 0.5, 8.5, 7.4, FZ1 + 0.5, WHITE, 'wood');
    b.sign(0, 7.4, FZ1, 12, 2.4, 'SUNNY RANCH', { bg: '#7a1d1d', depth: 0.4 });
    b.box(-5, 0, -2, 5, 0.2, 104, 0xb59a6a, 'sand');

    // ---------------- the barn ----------------
    const barn = b.building({
      x: -35, z: -30, w: 44, d: 30, floors: 1, fh: 20, color: RED, mat: 'wood', roof: 'gable', roofColor: 0x4f4f52, roofMat: 'slate',
      spacing: 10, winW: 3, winH: 4, door: 'S', doorW: 14, floorColor: 0xb59a6a, floorMat: 'sand', trim: WHITE, furnish: false, ladder: true,
      interior: (bb, i) => {
        // hayloft along the west end, up a ladder
        b.box(i.ix0, 10, i.iz0, i.ix0 + 16, 11, i.iz1, 0x8a5a32, 'wood', { tags: ['flammable'] });
        for (let k = 0; k < 6; k++) b.block(i.ix0 + 2.5 + (k % 3) * 4.5, 11, i.iz0 + 5 + Math.floor(k / 3) * 8, 4, 2.6, 6, HAY, 'grass', { tags: ['flammable'] });
        b.truss(i.ix0 + 17, 0.3, i.iz1 - 4, 11.1);
        b.spot('high', i.ix0 + 8, 11, i.iz1 - 3, [V(-35, 0, -11), V(-35, 0, -19), V(i.ix0 + 20, 0.3, i.iz1 - 4), V(i.ix0 + 17, 11.4, i.iz1 - 4), V(i.ix0 + 8, 11, i.iz1 - 3)]);
        // the lantern hanging from a beam: the fire starts here
        b.box(i.ix0 + 16, 17.4, i.iz0, i.ix0 + 17, 18.4, i.iz1, 0x5c3a1e, 'wood', { tags: ['flammable'] });
        b.block(i.ix0 + 16.5, 15.2, -30, 0.2, 2.2, 0.2, BC.black, 'metal');
        b.block(i.ix0 + 16.5, 13.6, -30, 1.4, 1.6, 1.4, 0xffd27a, 'neon', { tags: ['fire'] });
        // stalls and a cart along the east side
        for (let z = i.iz0 + 2; z < i.iz1 - 8; z += 7) b.box(i.ix1 - 7, 0.3, z, i.ix1 - 6.6, 4, z + 5, 0x8a5a32, 'wood', { tags: ['flammable'] });
      },
    });
    // white X-braces on the big doors
    b.box(barn.x - 7, 0.3, barn.z1 + 0.05, barn.x - 6.4, 12, barn.z1 + 0.25, WHITE, 'wood', { collide: false });
    b.box(barn.x + 6.4, 0.3, barn.z1 + 0.05, barn.x + 7, 12, barn.z1 + 0.25, WHITE, 'wood', { collide: false });
    for (const [x, z] of [[-60, 2], [-56, 4], [-58, 8], [-14, 4], [-10, 1]]) b.part({ pos: [x, 1.5, z], size: [3, 3, 3], color: HAY, mat: 'grass', shape: 'cyl', rot: [0, 0, 90], tags: ['flammable'] });

    // ---------------- two silos ----------------
    for (const [x, ladder] of [[2, true], [17, false]]) {
      const z = -52;
      b.cyl(x, 0, z, 12, 40, 0xc9c9c4, 'metal');
      for (const y of [10, 20, 30]) b.cyl(x, y, z, 12.3, 0.5, 0x8f9194, 'metal');
      b.cyl(x, 40, z, 12.8, 0.6, 0x8f9194, 'metal');
      b.ball(x, 37.6, z, 6, RED, 'metal');
      if (ladder) {
        b.truss(x, 0, z + 7, 40.9);
        b.spot('high', x - 3.5, 40.6, z - 3, [V(x, 0, z + 11), V(x, 41, z + 7), V(x - 3.5, 40.6, z + 2), V(x - 3.5, 40.6, z - 3)]);
      }
    }

    // ---------------- windmill over the cornfield ----------------
    const WX = 64, WZ = -36, WH = 32;
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const tilt = 4 * 180 / Math.PI / WH;
      b.part({ pos: [WX + dx * 0.8, WH / 2, WZ + dz * 0.8], size: [0.6, WH + 0.6, 0.6], color: 0x8f9194, mat: 'metal', rot: [-Math.sign(dz) * tilt, 0, Math.sign(dx) * tilt] });
    }
    b.box(WX - 3, WH, WZ - 3, WX + 3, WH + 0.5, WZ + 3, 0x8f9194, 'metal');
    b.box(WX - 0.4, WH + 0.5, WZ - 2, WX + 0.4, WH + 2.5, WZ + 2, 0x6b6e70, 'metal');
    b.box(WX - 0.2, WH + 1, WZ - 9, WX + 0.2, WH + 4, WZ - 1.9, RED, 'metal');
    b.truss(WX, 0, WZ + 4.4, WH + 0.9);
    b.spot('high', WX - 1.5, WH + 0.5, WZ - 1, [V(WX, 0, WZ + 8), V(WX, WH + 1, WZ + 4.4), V(WX - 1.5, WH + 0.5, WZ - 1)]);
    const blades = collect(b, () => {
      b.cyl(WX, WH + 1.5, WZ + 3, 1.4, 0.8, BC.darkStone, 'metal', { rot: [90, 0, 0] });
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * 360;
        b.part({ pos: [WX + Math.cos(a * Math.PI / 180) * 3.6, WH + 1.5 + Math.sin(a * Math.PI / 180) * 3.6, WZ + 3.3], size: [6, 1.4, 0.2], color: k % 2 ? WHITE : RED, mat: 'metal', rot: [0, 0, a], collide: false });
      }
    });
    const bladeRig = rig(game, blades, V(WX, WH + 1.5, WZ + 3));
    let windT = 0;
    updates.push((dt) => { windT += dt; bladeRig.set(V(WX, WH + 1.5, WZ + 3), new THREE.Quaternion().setFromAxisAngle(Z_AXIS, windT * 1.5)); });
    // cornfield
    b.box(34, 0, -6, 94, 0.3, 48, SOIL, 'grass');
    for (let r = 0; r < 7; r++) for (let k = 0; k < 7; k++) {
      const x = 38 + k * 8, z = -2 + r * 7.5;
      b.block(x, 0.3, z, 0.6, 5 + ((r + k) % 3) * 0.6, 0.6, 0x5a8a2a, 'grass', { tags: ['flammable'] });
      b.block(x + 2.5, 0.3, z, 0.6, 4.6 + ((r * k) % 3) * 0.6, 0.6, 0x6f9e32, 'grass', { tags: ['flammable'] });
    }
    // scarecrow
    b.block(64, 0.3, 22, 0.5, 7, 0.5, 0x8a5a32, 'wood');
    b.box(61, 5, 21.8, 67, 5.4, 22.2, 0x8a5a32, 'wood');
    b.block(64, 4, 22, 2, 3, 1, 0x3a5a9a, 'fabric');
    b.ball(64, 7, 22, 1.6, HAY, 'fabric');
    b.part({ pos: [64, 8.8, 22], size: [2.4, 1.4, 2.4], color: 0x8a5a32, mat: 'fabric', shape: 'cone' });

    // ---------------- paddock, cows, pond ----------------
    const PX0 = -94, PX1 = -48, PZ0 = 10, PZ1 = 60;
    for (const [ax, az, bx, bz] of [[PX0, PZ0, PX1, PZ0], [PX1, PZ0, PX1, 28], [PX1, 38, PX1, PZ1], [PX0, PZ1, PX1, PZ1]]) b.fence(ax, az, bx, bz, 3, 0x8a5a32, 'wood');
    const cow = (x, z, yaw) => {
      const r = yaw * Math.PI / 180, fx = Math.sin(r), fz = Math.cos(r);
      b.part({ pos: [x, 3, z], size: [2.6, 2.4, 5], color: WHITE, mat: 'plastic', rot: [0, yaw, 0] });
      b.part({ pos: [x + fx * 0.4, 3.4, z + fz * 0.4], size: [2.7, 1.2, 1.6], color: BC.black, mat: 'plastic', rot: [0, yaw, 0] });
      b.part({ pos: [x + fx * 3, 3.8, z + fz * 3], size: [1.6, 1.6, 1.8], color: WHITE, mat: 'plastic', rot: [0, yaw, 0] });
      for (const s of [-1, 1]) for (const t of [-1.8, 1.8]) b.part({ pos: [x + fx * t + fz * s * 0.9, 0.9, z + fz * t - fx * s * 0.9], size: [0.6, 1.8, 0.6], color: WHITE, mat: 'plastic', rot: [0, yaw, 0] });
    };
    cow(-80, 26, 30); cow(-66, 44, -120); cow(-84, 50, 200);
    b.block(-60, 0, 18, 6, 1.6, 2, 0x8f9194, 'metal');
    b.block(-60, 1.2, 18, 5.4, 0.3, 1.4, 0x5aa9e6, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(-22, 0, 34, 26, 0.3, 0xc9b27a, 'sand');
    b.cyl(-22, 0.3, 34, 22, 0.05, 0x3f8fd8, 'glass', { collide: false, tags: ['glass'] });

    // ---------------- the tractor ----------------
    b.vehicle(14, 22, 200, { kind: 'tractor', maxSpeed: 26, accel: 14, turn: 1.1, length: 9 }, (add) => {
      add(0, 2.6, 1, 3, 2.2, 6, 0x2f8a3c, 'metal');
      add(0, 2.4, 3.6, 2.6, 1.6, 1.4, 0xf5cd30, 'metal');
      add(0, 4.6, -1.2, 3.6, 0.3, 3.6, 0x2f8a3c, 'metal');
      for (const s of [-1, 1]) add(s * 1.6, 5.2, -2.8, 0.2, 1.4, 0.2, BC.black, 'metal');
      add(0.9, 4.8, 3, 0.4, 2.4, 0.4, BC.black, 'metal', 'cyl');
      for (const s of [-1, 1]) add(s * 2.4, 2.2, -2.2, 4.4, 1.6, 4.4, BC.reallyBlack, 'plastic', 'cyl', [0, 0, 90]);
      for (const s of [-1, 1]) add(s * 2, 1.2, 3.4, 2.4, 1, 2.4, BC.reallyBlack, 'plastic', 'cyl', [0, 0, 90]);
      return add(0, 3.95, -1.4, 1.8, 0.4, 1.8, BC.black, 'fabric', 'box', null, ['seat']);
    });

    for (const [x, z] of [[-80, -60], [-60, -80], [80, 60], [-30, 56], [90, -80]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
