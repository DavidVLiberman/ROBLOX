// Safety Second: a construction site behind a chain-link fence. The unfinished
// building is a bare steel frame with concrete floors and stairs, scaffolding down
// its front; a tall tower crane swings a steel beam overhead; there's a drivable
// excavator, the site office, portable toilets, piles of dirt and materials, and the
// material lockers, where the fire starts.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const ORANGE = 0xe0752a, YELLOW = 0xf2c230, DIRT = 0x8a6a45, CONCRETE = 0xa3a2a5;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default {
  name: 'Safety Second',
  build(b, game) {
    const updates = [];
    b.box(-86, 0, -76, 86, 0.2, 46, DIRT, 'sand');
    // ---------------- chain-link fence with a gate ----------------
    const fence = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 10)), yaw = Math.atan2(bx - ax, bz - az) * 180 / Math.PI;
      for (let k = 0; k <= n; k++) b.block(ax + (bx - ax) * k / n, 0, az + (bz - az) * k / n, 0.4, 8, 0.4, 0x8f9194, 'metal');
      b.part({ pos: [(ax + bx) / 2, 4, (az + bz) / 2], size: [0.1, 7.6, L], color: 0xb8bbbe, mat: 'glass', rot: [0, yaw, 0], tags: ['glass'] });
    };
    fence(-86, -76, 86, -76); fence(-86, -76, -86, 46); fence(86, -76, 86, 46);
    fence(-86, 46, -10, 46); fence(10, 46, 86, 46);
    b.sign(-22, 3, 46.05, 20, 4, 'SAFETY SECOND', { bg: '#f2b50f', fg: '#1b1b1b', depth: 0.1 });
    b.sign(22, 3, 46.05, 16, 3, 'HARD HAT AREA', { bg: '#1b4f8a', depth: 0.1 });

    // ---------------- the unfinished building ----------------
    const ub = b.building({
      x: -28, z: -34, w: 44, d: 30, floors: 5, fh: 10, walls: false, t: 0.6, color: ORANGE, mat: 'metal',
      floorColor: CONCRETE, floorMat: 'concrete', stairColor: CONCRETE, roofColor: CONCRETE, roofMat: 'concrete',
      parapet: false, roofDetails: false, furnish: false, ladder: false, door: 'S',
      extraHoles: [{ level: 4, x0: -18, x1: -8, z0: -40, z1: -28 }, { level: 5, x0: -20, x1: -8, z0: -42, z1: -27 }],
    });
    // columns along the edges and the bays left open at the top
    for (let x = ub.x0 + 11; x < ub.x1 - 1; x += 11) for (const z of [ub.z0, ub.z1]) b.box(x - 0.5, 0, z - 0.5, x + 0.5, ub.top, z + 0.5, ORANGE, 'metal');
    for (const z of [ub.z0 + 15]) for (const x of [ub.x0, ub.x1]) b.box(x - 0.5, 0, z - 0.5, x + 0.5, ub.top, z + 0.5, ORANGE, 'metal');
    for (let k = 1; k <= 5; k++) b.box(ub.x0, ub.levelY(k) - 1.2, ub.z0 - 0.3, ub.x0 + 0.6, ub.levelY(k) - 0.4, ub.z1 + 0.3, ORANGE, 'metal');
    // safety rails on each floor's front and the stacks of materials up there
    for (let k = 1; k <= 4; k++) {
      const y = ub.levelY(k);
      b.box(ub.x0 + 1, y + 2.6, ub.z1 - 0.3, ub.x1 - 1, y + 3, ub.z1 + 0.1, YELLOW, 'metal');
      b.block(ub.x1 - 6, y, ub.z0 + 6, 4, 1.2, 6, 0xb08a5a, 'wood', { tags: ['flammable'] });
    }
    // scaffolding down the front
    for (let x = ub.x0; x <= ub.x1; x += 11) for (const dz of [2, 6]) b.block(x, 0, ub.z1 + dz, 0.4, 30, 0.4, 0xb8bbbe, 'metal');
    for (const y of [10, 20, 30]) b.box(ub.x0, y - 0.4, ub.z1 + 1.6, ub.x1, y, ub.z1 + 6.4, 0xb08a5a, 'wood', { tags: ['flammable'] });
    b.part({ pos: [-28, 15, ub.z1 + 6.6], size: [44, 30, 0.1], color: 0x6fbf73, mat: 'glass', collide: false, tags: ['glass'] });

    // ---------------- the tower crane ----------------
    const CX = 40, CZ = -40, MAST = 66;
    b.box(CX - 5, 0, CZ - 5, CX + 5, 1.6, CZ + 5, CONCRETE, 'concrete');
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b.block(CX + dx, 1.6, CZ + dz, 0.6, MAST - 1.6, 0.6, YELLOW, 'metal');
    for (let y = 8; y < MAST; y += 8) b.box(CX - 1.5, y, CZ - 1.5, CX + 1.5, y + 0.3, CZ + 1.5, YELLOW, 'metal', { collide: false });
    b.box(CX - 2.6, MAST, CZ - 6, CX + 6, MAST + 0.6, CZ + 6, 0x8f9194, 'metal');
    for (const s of [-1, 1]) b.box(CX - 2.6, MAST + 0.6, CZ + s * 6 - 0.2, CX + 6, MAST + 3.4, CZ + s * 6 + 0.2, YELLOW, 'metal');
    b.box(CX + 5.8, MAST + 0.6, CZ - 6, CX + 6, MAST + 3.4, CZ + 6, YELLOW, 'metal');
    b.truss(CX - 3.6, 0, CZ, MAST + 1);
    b.spot('high', CX + 3, MAST + 0.6, CZ - 3.5, [V(CX - 8, 0.2, CZ), V(CX - 3.6, MAST + 1, CZ), V(CX - 1.5, MAST + 0.6, CZ - 3.5), V(CX + 3, MAST + 0.6, CZ - 3.5)]);
    const R = 34;
    const jib = collect(b, () => {
      b.cyl(CX, MAST + 0.6, CZ, 3.6, 7, BC.darkStone, 'metal');
      b.box(CX + 1.8, MAST + 8, CZ - 1.6, CX + 5, MAST + 11, CZ + 1.6, YELLOW, 'metal');
      b.box(CX - 1.5, MAST + 7.6, CZ - 1, CX + R + 4, MAST + 9.2, CZ + 1, YELLOW, 'metal');
      b.box(CX - 14, MAST + 7.6, CZ - 1.2, CX - 1.5, MAST + 9, CZ + 1.2, YELLOW, 'metal');
      b.box(CX - 14, MAST + 3.6, CZ - 2, CX - 10, MAST + 7.6, CZ + 2, CONCRETE, 'concrete');
      b.box(CX - 0.5, MAST + 9.2, CZ - 0.5, CX + 0.5, MAST + 14, CZ + 0.5, YELLOW, 'metal');
      b.box(CX + R - 1, MAST + 6.6, CZ - 1, CX + R + 1, MAST + 7.6, CZ + 1, BC.darkStone, 'metal');
      b.box(CX + R - 0.1, 30, CZ - 0.1, CX + R + 0.1, MAST + 6.6, CZ + 0.1, BC.black, 'metal', { collide: false });
      b.box(CX + R - 1, 29, CZ - 1, CX + R + 1, 30, CZ + 1, BC.darkStone, 'metal');
      b.box(CX + R - 9, 27.6, CZ - 0.7, CX + R + 9, 29, CZ + 0.7, ORANGE, 'metal');
    });
    const jibRig = rig(game, jib, V(CX, 0, CZ));
    let jibT = 0;
    updates.push((dt) => { jibT += dt; jibRig.set(V(CX, 0, CZ), new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI * 0.9 + Math.sin(jibT * 0.12) * 1.1)); });

    // ---------------- the excavator ----------------
    b.vehicle(28, 10, -120, { kind: 'excavator', maxSpeed: 16, accel: 10, turn: 0.9, length: 10 }, (add) => {
      for (const s of [-1, 1]) add(s * 3, 1.2, 0, 2, 2.4, 9, BC.reallyBlack, 'metal');
      add(0, 3.2, -0.5, 6, 1.6, 7, YELLOW, 'metal');
      add(-1.2, 5.6, 0.6, 3, 3.2, 3.2, YELLOW, 'metal');
      add(-1.2, 6, 2.25, 2.6, 2, 0.1, 0xa9d4f5, 'glass', 'box', null, ['glass']);
      add(1.6, 4.6, -3, 2.6, 2.6, 2, YELLOW, 'metal');
      add(1.4, 6.6, 4.4, 1, 1, 7, YELLOW, 'metal', 'box', [-30, 0, 0]);
      add(1.4, 6.2, 8.4, 1, 6, 1, YELLOW, 'metal', 'box', [20, 0, 0]);
      add(1.4, 3.2, 9.6, 2.4, 1.6, 1.6, BC.darkStone, 'metal');
      return add(-1.2, 4.5, 0.4, 1.6, 0.4, 1.6, BC.black, 'fabric', 'box', null, ['seat']);
    });

    // ---------------- site office, toilets, materials, lockers ----------------
    const off = b.building({
      x: 50, z: 22, w: 24, d: 10, floors: 1, fh: 8, y: 0.8, color: 0xdedcd4, mat: 'metal', trim: ORANGE, door: 'S', doorW: 4,
      spacing: 5, winW: 3, winH: 2.6, roof: 'flat', parapet: false, roofDetails: false, furnish: false,
      interior: (bb, i) => { b.table(i.ix1 - 5, 0.8, i.z, 6, 3, 0x8a5a32); b.chair(i.ix1 - 5, 0.8, i.z - 2.6, 0, BC.black); },
    });
    for (const x of [off.x0 + 2, off.x1 - 2]) b.block(x, 0, off.z, 1.6, 0.8, off.z1 - off.z0, CONCRETE, 'concrete');
    b.box(off.x - 2.5, 0, off.z1, off.x + 2.5, 0.8, off.z1 + 2.2, CONCRETE, 'concrete');
    for (const [x, c] of [[-70, BC.brightBlue], [-64, BC.brightGreen]]) {
      b.block(x, 0.2, 30, 4, 8, 4, c, 'plastic');
      b.block(x, 8.2, 30, 4.4, 0.4, 4.4, BC.white, 'plastic');
    }
    for (let i = 0; i < 4; i++) b.block(-74 + i * 3.4, 0.2, -6, 3.2, 7, 3, BC.brightBlue, 'metal', { tags: i === 1 ? ['fire'] : [] });
    b.sign(-69, 7.2, -4.45, 12, 1.2, 'MATERIALS', { bg: '#1b1b1d', depth: 0.1 });
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3 - k; j++) b.part({ pos: [-40 + j * 2.1 + k * 1.05, 1 + k * 1.8, 20], size: [2, 14, 2], color: 0x6b6e70, mat: 'metal', shape: 'cyl', rot: [90, 0, 0] });
    for (let k = 0; k < 4; k++) b.block(-20, 0.2 + k * 0.6, 20, 4, 0.6, 14, 0xb08a5a, 'wood', { tags: ['flammable'] });
    b.part({ pos: [8, 4, -2], size: [20, 8, 20], color: DIRT, mat: 'sand', shape: 'frustum' });
    b.part({ pos: [-60, 3, -56], size: [16, 6, 16], color: DIRT, mat: 'sand', shape: 'frustum' });
    b.cyl(20, 2.2, 28, 5, 6, ORANGE, 'metal', { rot: [70, 0, 0] });
    b.block(20, 0.2, 28, 7, 2, 8, BC.darkStone, 'metal');
    for (let i = 0; i < 8; i++) b.part({ pos: [-14 + i * 4, 1, 38], size: [1.5, 2, 1.5], color: ORANGE, mat: 'plastic', shape: 'cone' });
    for (const x of [-40, -28]) b.block(x, 0.2, 38, 10, 2.4, 1, 0xe63946, 'plastic');
    b.box(-6, 0, 46, 6, 0.2, 104, BC.mediumStone, 'concrete');
    for (const [x, z] of [[-110, 40], [110, 30], [-110, -50], [110, -60]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
