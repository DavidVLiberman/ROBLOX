// Furious Station: a gas station. A big red canopy shades four pump islands, with a
// ladder up to its roof; behind it is the food mart, where the microwaves start the
// fire, and beside it a car-wash bay. Five cars and two fuel tankers can be driven
// away, and a tall pole sign stands by the road.
import { BC } from '../util.js';
import { V } from './helpers.js';

const RED = 0xc4281c;

export default {
  name: 'Furious Station',
  build(b) {
    b.box(-76, 0, -64, 76, 0.2, 52, 0x3b3b3e, 'asphalt');
    // ---------------- canopy and pumps ----------------
    const CZ = 12, CH = 16;
    for (const x of [-22, 0, 22]) for (const z of [CZ - 12, CZ + 12]) b.block(x, 0.2, z, 1.8, CH - 0.2, 1.8, BC.white, 'metal');
    b.box(-30, CH, CZ - 20, 30, CH + 2.4, CZ + 20, RED, 'metal');
    b.box(-30, CH - 0.6, CZ - 20, 30, CH, CZ + 20, BC.white, 'plastic');
    b.sign(0, CH, CZ + 20.05, 24, 2.4, 'FURIOUS STATION', { bg: '#c4281c', depth: 0.1 });
    for (const x of [-12, 12]) for (const z of [CZ - 7, CZ + 7]) {
      b.block(x, 0.2, z, 3.4, 0.6, 7, BC.mediumStone, 'concrete');
      for (const dz of [-1.8, 1.8]) {
        b.block(x, 0.8, z + dz, 2, 5, 2, BC.white, 'metal');
        b.block(x, 5.8, z + dz, 2.2, 1, 2.2, RED, 'plastic');
        b.block(x + 1.05, 3, z + dz, 0.2, 1.4, 0.8, BC.black, 'plastic');
      }
    }
    b.truss(-31.2, 0.2, CZ, CH + 2.6);
    b.spot('high', -20, CH + 2.4, CZ, [V(-36, 0.2, CZ), V(-31.2, CH + 2.6, CZ), V(-26, CH + 2.4, CZ), V(-20, CH + 2.4, CZ)]);

    // ---------------- the food mart ----------------
    const fm = b.building({
      x: -6, z: -38, w: 46, d: 24, floors: 1, fh: 13, color: BC.white, mat: 'brick', trim: RED, spacing: 7, winW: 5, winH: 6,
      floorColor: BC.mediumStone, floorMat: 'concrete', door: 'S', doorW: 6, furnish: false, ladder: false,
      interior: (bb, i) => {
        // counter with the microwaves (the fire starts here), shelves, drink fridges
        b.box(i.ix0 + 2, 0.3, i.iz1 - 7, i.ix0 + 14, 3.5, i.iz1 - 5, RED, 'wood');
        b.block(i.ix0 + 5, 3.5, i.iz1 - 6, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
        b.block(i.ix0 + 9, 3.5, i.iz1 - 6, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
        for (const x of [i.ix0 + 22, i.ix0 + 29]) b.box(x - 1, 0.3, i.iz0 + 8, x + 1, 6, i.iz1 - 8, BC.lightBlue, 'metal');
        b.box(i.ix1 - 3, 0.3, i.iz0 + 2, i.ix1 - 1, 8, i.iz1 - 8, 0x8fd0f0, 'glass', { tags: ['glass'] });
      },
    });
    b.sign(-6, 9.4, fm.z1 + 0.05, 16, 2.4, 'FOOD MART', { bg: '#c4281c', depth: 0.1 });
    // air pump and the bins
    b.block(26, 0.2, -30, 1.6, 4, 1.6, BC.brightBlue, 'metal');
    for (const x of [-34, -32]) b.cyl(x, 0.2, -24, 1.8, 3, BC.darkStone, 'metal', { tags: ['flammable'] });

    // ---------------- car wash ----------------
    const W = { x: 50, z: -30 };
    b.box(W.x - 8, 0.2, W.z - 16, W.x - 7, 12, W.z + 16, BC.lightBlue, 'concrete');
    b.box(W.x + 7, 0.2, W.z - 16, W.x + 8, 12, W.z + 16, BC.lightBlue, 'concrete');
    b.box(W.x - 8, 12, W.z - 16, W.x + 8, 13, W.z + 16, BC.lightBlue, 'concrete');
    for (const z of [W.z - 6, W.z + 6]) for (const s of [-1, 1]) b.cyl(W.x + s * 5, 0.2, z, 2.4, 9, s > 0 ? BC.brightBlue : BC.brightRed, 'fabric', { collide: false });
    b.sign(W.x, 10.4, W.z + 16.05, 12, 2, 'CAR WASH', { bg: '#1b4f8a', depth: 0.1 });

    // ---------------- five cars and two tankers ----------------
    b.car(-12, CZ - 1, 0, BC.brightYellow);
    b.car(12, CZ + 13, 180, BC.white);
    b.car(-40, -10, 90, BC.brightBlue);
    b.car(40, 20, -90, BC.brightGreen);
    b.car(W.x, W.z + 4, 0, RED);
    const tanker = (x, z, rotY) => b.vehicle(x, z, rotY, { kind: 'tanker', maxSpeed: 40, accel: 16, turn: 0.75, length: 24 }, (add) => {
      add(0, 3, 8, 6, 4.4, 6, BC.white, 'metal');
      add(0, 4, 11.1, 5.4, 2.2, 0.2, 0xa9d4f5, 'glass', 'box', null, ['glass']);
      add(0, 1.6, 0, 3, 1, 24, BC.darkStone, 'metal');
      add(0, 5, -3.5, 6, 6, 16, 0xd9d9d9, 'metal', 'cyl', [90, 0, 0]);
      add(0, 8.1, -3.5, 1.6, 0.4, 1.6, BC.darkStone, 'metal');
      add(0, 5, -3.5, 6.1, 1, 6.1, RED, 'metal', 'cyl', [90, 0, 0]);
      for (const [wx, wz] of [[-2.8, 9], [2.8, 9], [-2.8, -5], [2.8, -5], [-2.8, -9], [2.8, -9]]) add(wx, 1.3, wz, 2.6, 1, 2.6, BC.reallyBlack, 'plastic', 'cyl', [0, 0, 90]);
      return add(-1.4, 3.6, 8.4, 1.6, 0.4, 1.6, BC.black, 'fabric', 'box', null, ['seat']);
    });
    tanker(-56, 26, 0); tanker(-62, -36, 0);

    // ---------------- pole sign, the road in, trees ----------------
    b.cyl(58, 0.2, 40, 1.6, 38, BC.mediumStone, 'metal');
    b.sign(58, 38, 40, 14, 7, 'FURIOUS\nSTATION', { bg: '#c4281c', depth: 1 });
    // a service catwalk on top of the sign, up a ladder beside the pole
    b.box(50.6, 45, 38.8, 65.4, 45.4, 41.2, BC.darkStone, 'metal');
    b.box(50.6, 45.4, 41, 65.4, 47.4, 41.2, BC.darkStone, 'metal');
    b.truss(58, 0.2, 37.5, 45.6);
    b.spot('high', 54, 45.4, 39.8, [V(58, 0.2, 33), V(58, 45.8, 37.5), V(57, 45.4, 39.8), V(54, 45.4, 39.8)]);
    b.box(-60, 0.2, 40, 60, 0.25, 40.6, BC.white, 'plastic');
    for (const [x, z] of [[-90, 20], [90, 10], [-90, -50], [90, -60], [-40, 70], [40, 70]]) b.tree(x, z, 1.0);
    b.box(-6, 0, 52, 6, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
