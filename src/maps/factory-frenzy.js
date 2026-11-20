// Factory Frenzy: a big two-storey factory with a conveyor belt and a stamping press
// running inside, two tall brick chimneys behind it, and a container port on the
// east side: stacks of shipping containers, a turning crane with a container hanging
// from it that you can ride on, and a steel bridge out over the sea to a pier. The
// fire starts at the lights on the factory's second floor.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const WALL = 0x5d7184, ORANGE = 0xe0752a, YELLOW = 0xf2c230, STEEL = 0x8a8f94;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default {
  name: 'Factory Frenzy',
  build(b, game) {
    const updates = [];
    // ---------------- the factory ----------------
    const FX = -20, FZ = -10;
    const f = b.building({
      x: FX, z: FZ, w: 70, d: 44, floors: 2, fh: 16, color: WALL, mat: 'metal', trim: ORANGE, floorColor: 0x6d6e6c, floorMat: 'concrete',
      roofColor: 0x4a4f55, door: 'S', doorX: 12, doorW: 10, spacing: 10, winW: 7, winH: 5, stairColor: YELLOW, furnish: false,
      interior: (bb, i) => {
        // shelving and machines along the walls of both floors
        for (let k = 0; k < 2; k++) {
          const y = i.levelY(k);
          b.block(i.ix0 + 5, y, -4, 6, 6, 8, BC.brightBlue, 'metal');
          b.block(i.ix0 + 5, y + 6, -4, 3, 2, 3, BC.darkStone, 'metal');
          b.block(i.ix1 - 6, y, -2, 8, 4.5, 6, YELLOW, 'metal');
        }
        // the second floor's lights: the fire starts at one of them
        const y2 = i.levelY(1);
        for (let x = i.ix0 + 10; x < i.ix1 - 6; x += 12) b.block(x, y2 + 14.4, FZ + 2, 6, 0.6, 1.4, 0xfff2b0, 'neon', { tags: x === i.ix0 + 34 ? ['fire'] : [] });
      },
    });
    // conveyor belt with crates riding along it, into the stamping press
    const BZ = FZ + 4;
    b.box(f.ix0 + 12, 0.3, BZ - 2, f.ix1 - 14, 2.6, BZ + 2, BC.black, 'metal');
    for (let x = f.ix0 + 13; x < f.ix1 - 14; x += 6) b.block(x, 0.3, BZ + 2.1, 0.6, 2.2, 0.2, BC.darkStone, 'metal', { collide: false });
    const crates = collect(b, () => { for (let x = f.ix0 + 14; x < f.ix1 - 18; x += 8) b.block(x, 2.6, BZ, 2.6, 2.6, 2.6, 0x9b6a3c, 'wood', { tags: ['flammable'] }); });
    const crateRig = rig(game, crates, V(0, 0, 0));
    const PX = f.ix1 - 16;
    for (const s of [-1, 1]) b.block(PX, 0.3, BZ + s * 3, 1.2, 11, 1.2, ORANGE, 'metal');
    b.box(PX - 1.2, 11.3, BZ - 3.6, PX + 1.2, 12.5, BZ + 3.6, ORANGE, 'metal');
    const head = collect(b, () => { b.block(PX, 6.4, BZ, 3.4, 1.2, 4.6, BC.darkStone, 'metal'); b.block(PX, 7.6, BZ, 1, 3.7, 1, STEEL, 'metal'); });
    const pressRig = rig(game, head, V(PX, 0, BZ));
    let beltT = 0;
    updates.push((dt) => {
      beltT += dt;
      // the crates move 8 studs along and hop back: each takes the place of the one before
      crateRig.set(V((beltT * 2.5) % 8, 0, 0), new THREE.Quaternion());
      pressRig.set(V(PX, -Math.max(0, Math.sin(beltT * 2.2)) * 0.9, BZ), new THREE.Quaternion());
    });
    b.sign(FX, f.top - 7, f.z1 + 0.6, 30, 4, 'FACTORY FRENZY', { bg: '#c25d14', depth: 0.4 });
    // roof vents
    for (const x of [FX - 24, FX - 8, FX + 8]) b.block(x, f.top, FZ - 12, 4, 3, 4, STEEL, 'metal');

    // ---------------- two chimneys ----------------
    for (const [cx, climb] of [[26, true], [40, false]]) {
      const cz = -38;
      b.cyl(cx, 0, cz, 8, 70, 0x9c3b2a, 'brick');
      for (const y of [58, 64]) b.cyl(cx, y, cz, 8.3, 1.4, BC.white, 'plastic');
      b.cyl(cx, 70, cz, 9.4, 1.2, BC.darkStone, 'metal');
      if (climb) {
        b.truss(cx, 0, cz + 5, 71.6);
        b.spot('high', cx, 71.2, cz, [V(cx, 0, cz + 9), V(cx, 71.6, cz + 5), V(cx, 71.2, cz)]);
      }
    }
    let smokeT = 0;
    updates.push((dt) => {
      smokeT -= dt;
      if (smokeT > 0) return;
      smokeT = 0.35;
      for (const cx of [26, 40]) game.effects.puff(V(cx + (Math.random() - 0.5) * 2, 72, -38 + (Math.random() - 0.5) * 2), 0x77777a, 4, 4, V(2, 5, 0));
    });

    // ---------------- yard and the walk in ----------------
    b.box(-62, 0, 12, 24, 0.2, 50, 0x3b3b3e, 'asphalt');
    for (let x = -56; x <= 16; x += 9) b.box(x, 0.2, 40, x + 0.4, 0.25, 48, BC.white, 'plastic');
    b.box(-6, 0, 50, 6, 0.2, 104, BC.mediumStone, 'concrete');

    // ---------------- the port ----------------
    b.box(66, 0, -52, 150, 0.4, 42, 0xb5b3ad, 'concrete');
    const container = (x, z, y, color, rotY = 0) => {
      b.part({ pos: [x, y + 3.25, z], size: [16, 6.5, 6], color, mat: 'metal', rot: [0, rotY, 0], tags: ['flammable'] });
      const ex = Math.cos(rotY * Math.PI / 180) * 8.05, ez = -Math.sin(rotY * Math.PI / 180) * 8.05;
      b.part({ pos: [x + ex, y + 3.25, z + ez], size: [0.2, 6, 5.4], color: BC.darkStone, mat: 'metal', rot: [0, rotY, 0] });
    };
    container(84, -40, 0.4, 0xb53a2a); container(84, -40, 6.9, 0x2f6fb5);
    container(104, -40, 0.4, 0x3a8a3c);
    container(124, -40, 0.4, ORANGE); container(124, -40, 6.9, 0xb53a2a);
    container(84, 30, 0.4, 0x2f6fb5); container(104, 30, 0.4, YELLOW); container(104, 30, 6.9, 0x3a8a3c);
    container(138, 18, 0.4, 0xb53a2a, 90);
    b.truss(133, 0.4, -40, 13.4);
    b.spot('high', 124, 13.4, -40, [V(137, 0.4, -36), V(136.5, 0.4, -40), V(133, 13.8, -40), V(124, 13.4, -40)]);

    // the crane: a lattice tower, and on top a turning jib with a container hanging off it
    const CX = 112, CZ = -6;
    b.box(CX - 4, 0.4, CZ - 4, CX + 4, 1.8, CZ + 4, BC.mediumStone, 'concrete');
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.block(CX + dx, 1.8, CZ + dz, 0.8, 40.2, 0.8, YELLOW, 'metal');
    for (let y = 8; y < 40; y += 8) for (const s of [-1, 1]) {
      b.box(CX - 2, y, CZ + s * 2 - 0.15, CX + 2, y + 0.3, CZ + s * 2 + 0.15, YELLOW, 'metal', { collide: false });
      b.box(CX + s * 2 - 0.15, y, CZ - 2, CX + s * 2 + 0.15, y + 0.3, CZ + 2, YELLOW, 'metal', { collide: false });
    }
    b.box(CX - 3.4, 41.4, CZ - 7, CX + 7, 42, CZ + 7, STEEL, 'metal');
    b.box(CX + 6.8, 42, CZ - 7, CX + 7, 45, CZ + 7, YELLOW, 'metal');
    for (const s of [-1, 1]) b.box(CX - 3.4, 42, CZ + s * 7 - 0.2, CX + 7, 45, CZ + s * 7 + 0.2, YELLOW, 'metal');
    b.truss(CX - 4.4, 0.4, CZ, 42);
    b.spot('high', CX + 4.5, 42, CZ - 4.5, [V(CX - 9, 0.4, CZ), V(CX - 4.4, 42.4, CZ), V(CX - 2, 42, CZ - 4.5), V(CX + 4.5, 42, CZ - 4.5)]);
    const R = 28;
    const top = collect(b, () => {
      b.cyl(CX, 42, CZ, 5, 4, BC.darkStone, 'metal');
      b.box(CX - 2, 46, CZ - 2, CX + 2, 50, CZ + 2, YELLOW, 'metal');
      b.box(CX + 2, 47.2, CZ - 1.6, CX + 5, 50, CZ + 1.6, YELLOW, 'metal');
      b.box(CX + 5, 48, CZ - 1.2, CX + 5.1, 49.5, CZ + 1.2, 0xa9d4f5, 'glass', { tags: ['glass'] });
      b.box(CX - 2, 50, CZ - 1, CX + R + 6, 52, CZ + 1, YELLOW, 'metal');
      b.box(CX - 14, 50, CZ - 1.2, CX - 2, 51.6, CZ + 1.2, YELLOW, 'metal');
      b.box(CX - 14, 46, CZ - 2, CX - 10, 50, CZ + 2, BC.mediumStone, 'concrete');
      b.box(CX - 0.5, 52, CZ - 0.5, CX + 0.5, 58, CZ + 0.5, YELLOW, 'metal');
      for (const [x0, x1] of [[CX, CX + R + 4], [CX, CX - 13]]) {
        const L = Math.hypot(x1 - x0, 6), a = Math.atan2(6, x1 - x0) * 180 / Math.PI;
        b.part({ pos: [(x0 + x1) / 2, 55, CZ], size: [L, 0.2, 0.2], color: BC.darkStone, mat: 'metal', rot: [0, 0, -a], collide: false });
      }
      b.box(CX + R - 1.5, 49, CZ - 1.5, CX + R + 1.5, 50, CZ + 1.5, BC.darkStone, 'metal');
      for (const s of [-1, 1]) b.box(CX + R + s * 1 - 0.1, 25, CZ - 0.1, CX + R + s * 1 + 0.1, 49, CZ + 0.1, BC.black, 'metal', { collide: false });
      b.box(CX + R - 2, 24, CZ - 1, CX + R + 2, 25, CZ + 1, BC.darkStone, 'metal');
      b.box(CX + R - 8, 17.5, CZ - 3, CX + R + 8, 24, CZ + 3, 0x2f6fb5, 'metal');
      for (const z of [-1.5, 1.5]) b.box(CX + R - 4 + z, 24, CZ + z - 0.8, CX + R - 2.4 + z, 24.4, CZ + z + 0.8, BC.brightRed, 'fabric', { tags: ['seat'] });
    });
    const craneRig = rig(game, top, V(CX, 0, CZ));
    let craneT = 0;
    updates.push((dt) => { craneT += dt; craneRig.set(V(CX, 0, CZ), new THREE.Quaternion().setFromAxisAngle(Y_AXIS, craneT * Math.PI * 2 / 45)); });

    // steel bridge off the island to the pier
    b.box(150, 0, -3, 202, 0.6, 3, STEEL, 'metal');
    for (const s of [-1, 1]) {
      b.box(150, 3.6, s * 3 - 0.2, 202, 4, s * 3 + 0.2, YELLOW, 'metal');
      for (let x = 152; x <= 200; x += 6) b.box(x - 0.2, 0.6, s * 3 - 0.2, x + 0.2, 3.6, s * 3 + 0.2, STEEL, 'metal');
    }
    for (const x of [166, 184]) for (const s of [-1, 1]) b.cyl(x, -14, s * 2.2, 1.6, 14, STEEL, 'metal');
    b.box(202, -0.6, -14, 226, 0.6, 14, 0xb5b3ad, 'concrete');
    for (const [x, z] of [[205, -12], [223, -12], [205, 12], [223, 12], [214, -12], [214, 12]]) b.cyl(x, -14, z, 2, 13.4, BC.darkStone, 'concrete');
    for (const [x, z] of [[224, -8], [224, 0], [224, 8]]) b.cyl(x, 0.6, z, 1.2, 1.4, BC.black, 'metal');
    b.lamp(212, 0, 10);
    b.sign(150, 3.9, 0, 10, 2, 'PORT', { bg: '#1b4f8a', rotY: 90, depth: 0.3 });

    for (const [x, z] of [[-90, 40], [-100, -20], [-80, -70], [40, 60], [60, -80]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 84 + Math.floor(i / 4) * 6);

    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
