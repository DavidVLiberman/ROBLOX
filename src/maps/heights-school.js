// Heights School: a three-storey brick school on top of a hill, with classrooms of
// desks and chalkboards, lockers, a library, and a clock tower on the roof you can
// climb. The gym stands beside it (bleachers and hoops). Down the hill are the
// playground and the sports field. The fire starts in a classroom bin upstairs.
import { BC } from '../util.js';
import { V, trashCan } from './helpers.js';

const BRICK = 0xa8442e, BOARD = 0x2f5d3a, LOCKER = 0x2f6fb5;

export default {
  name: 'Heights School',
  build(b) {
    // ---------------- the hill ----------------
    const HY = 8;
    b.box(-92, 0, -72, 92, 4, 32, BC.grass, 'grass');
    b.box(-84, 4, -64, 84, HY, 24, BC.grass, 'grass');
    // steps up the front, and gentle ramps at the sides
    for (let k = 0; k < 4; k++) b.box(-10, 0, 32 + (3 - k) * 2, 10, k + 1, 34 + (3 - k) * 2, BC.mediumStone, 'concrete');
    for (let k = 0; k < 4; k++) b.box(-10, 4, 24 + (3 - k) * 2, 10, 5 + k, 26 + (3 - k) * 2, BC.mediumStone, 'concrete');
    b.box(-10, 0, 24, 10, 4, 32, BC.mediumStone, 'concrete');
    b.ramp(V(0, 0, 44), V(0, HY, 22));

    // ---------------- the school ----------------
    const sc = b.building({
      x: -6, z: -30, w: 84, d: 30, floors: 3, fh: 11, y: HY, color: BRICK, mat: 'brick', trim: BC.white,
      floorColor: 0xc9c2b0, floorMat: 'plastic', door: 'S', doorW: 7, spacing: 8, winW: 4.5, winH: 5, furnish: false, ladder: false,
      interior: (bb, i) => {
        for (let k = 0; k < 3; k++) {
          const y = i.levelY(k);
          // a classroom at each end: rows of desks facing a chalkboard
          for (const [cx, face] of [[i.ix0 + 16, -1], [i.ix1 - 16, 1]]) {
            const wx = face < 0 ? i.ix0 : i.ix1;
            b.box(wx - 0.15, y + 2.5, i.iz0 + 8, wx + 0.15, y + 6.5, i.iz1 - 8, BOARD, 'plastic');
            for (let r = 0; r < 3; r++) for (const dz of [-4, 0, 4]) {
              const x = cx + face * (6 - r * 4), z = (i.iz0 + i.iz1) / 2 + dz;
              b.table(x, y, z, 2.4, 2, 0xb08a5a);
              b.chair(x - face * 1.8, y, z, face > 0 ? 90 : -90, BC.brightBlue);
            }
          }
          // lockers along the middle of the north wall
          for (let x = i.x - 10; x < i.x + 10; x += 2.2) b.block(x, y, i.iz0 + 7.8, 2, 6, 1.4, LOCKER, 'metal');
        }
        // library shelves on the top floor, and the bin where the fire starts
        for (const x of [i.x - 6, i.x + 6]) b.block(x, i.levelY(2), i.iz1 - 8, 8, 7, 1.6, 0x6b3b1f, 'wood', { tags: ['flammable'] });
        trashCan(b, i.ix0 + 4, i.levelY(1), i.iz1 - 4, true);
      },
    });
    b.sign(-6, HY + 9, sc.z1 + 0.05, 22, 2.6, 'HEIGHTS SCHOOL', { bg: '#7a1d1d', depth: 0.1 });
    // clock tower on the roof, climbed by a truss
    const TX = -6, TZ = -38, TB = sc.top;
    b.block(TX, TB, TZ, 10, 18, 10, BRICK, 'brick');
    for (const [dx, dz, ry] of [[0, 5.05, 0], [0, -5.05, 0], [5.05, 0, 90], [-5.05, 0, 90]]) {
      b.part({ pos: [TX + dx, TB + 13, TZ + dz], size: [6, 0.2, 6], color: BC.white, mat: 'plastic', shape: 'cyl', rot: [90, ry, 0] });
    }
    b.block(TX, TB + 18, TZ, 12, 0.6, 12, BC.white, 'concrete');
    for (const s of [-1, 1]) b.box(TX + s * 6 - 0.2, TB + 18.6, TZ - 6, TX + s * 6 + 0.2, TB + 21, TZ + 6, BC.white, 'concrete');
    b.box(TX - 6, TB + 18.6, TZ - 6.2, TX + 6, TB + 21, TZ - 5.8, BC.white, 'concrete');
    b.part({ pos: [TX, TB + 23, TZ - 2.5], size: [6, 4, 6], color: 0x4f5359, mat: 'slate', shape: 'cone' });
    b.cyl(TX, TB + 18.6, TZ - 2.5, 0.8, 2.4, 0x4f5359, 'metal');
    b.truss(TX, TB, TZ + 6, 19);
    // up the school's stairs to the roof, across to the tower's ladder and up it
    const roof = b.spots.find(sp => sp.type === 'high' && Math.abs(sp.pos.y - TB) < 0.01);
    b.spot('high', TX + 3.5, TB + 18.6, TZ + 3, [...roof.path, V(TX, TB, TZ + 10), V(TX, TB + 19, TZ + 6), V(TX + 3.5, TB + 18.6, TZ + 3)]);

    // ---------------- the gym ----------------
    const gym = b.building({
      x: 60, z: -24, w: 36, d: 28, floors: 1, fh: 16, y: HY, color: 0xc9b27a, mat: 'brick', trim: BRICK, roof: 'flat',
      floorColor: 0xd9a35a, floorMat: 'wood', door: 'S', doorW: 6, spacing: 9, winW: 4, winH: 3, furnish: false, ladder: true, ladderSide: 'E',
      roofAccess: false,
      interior: (bb, i) => {
        b.box(i.ix0 + 2, HY + 0.31, (i.iz0 + i.iz1) / 2 - 0.2, i.ix1 - 2, HY + 0.33, (i.iz0 + i.iz1) / 2 + 0.2, BC.white, 'plastic', { collide: false });
        for (const [x, s] of [[i.ix0 + 1, 1], [i.ix1 - 1, -1]]) {
          b.block(x + s * 0.8, HY, i.z, 0.6, 11, 0.6, BC.darkStone, 'metal');
          b.block(x + s * 1.2, HY + 10, i.z, 0.2, 3.6, 5, BC.white, 'plastic');
          b.part({ pos: [x + s * 2.4, HY + 10.4, i.z], size: [2, 0.2, 2], color: 0xf28c28, mat: 'metal', shape: 'cyl' });
        }
        for (let r = 0; r < 4; r++) b.box(i.ix0 + 6, HY, i.iz0 + r * 2, i.ix1 - 6, HY + 1 + r * 1.2, i.iz0 + 2 + r * 2, BC.lightBlue, 'wood');
      },
    });
    b.sign(60, HY + 12.4, gym.z1 + 0.05, 10, 2, 'GYM', { bg: '#7a1d1d', depth: 0.1 });

    // ---------------- flagpole, benches ----------------
    b.cyl(-40, HY, 12, 0.5, 22, BC.mediumStone, 'metal');
    b.block(-37.6, HY + 18.6, 12, 4.4, 2.6, 0.1, BC.brightBlue, 'fabric');
    for (const x of [-24, 18]) b.bench(x, 14, 180);

    // ---------------- down the hill: playground and sports field ----------------
    const PX = -62, PZ = 54;
    b.box(PX - 14, 0, PZ - 12, PX + 14, 0.3, PZ + 12, 0xd8c39a, 'sand');
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.block(PX - 6 + dx, 0.3, PZ + dz, 0.6, 8, 0.6, BC.brightBlue, 'metal');
    b.block(PX - 6, 8.3, PZ, 5, 0.6, 5, BC.brightBlue, 'metal');
    b.truss(PX - 6, 0.3, PZ - 3.4, 8.6);
    b.part({ pos: [PX - 6, 4.4, PZ + 9.5], size: [3.6, 8.4, 14], color: BC.brightYellow, mat: 'plastic', shape: 'wedge' });
    for (const x of [PX + 4, PX + 12]) b.block(x, 0.3, PZ - 6, 0.5, 9, 0.5, BC.brightRed, 'metal');
    b.box(PX + 4, 9.3, PZ - 6.3, PX + 12, 9.9, PZ - 5.7, BC.brightRed, 'metal');
    for (const x of [PX + 6.5, PX + 9.5]) {
      b.block(x, 3, PZ - 6, 0.1, 6.3, 0.1, BC.darkStone, 'metal', { collide: false });
      b.block(x, 2.8, PZ - 6, 1.8, 0.3, 1, BC.black, 'fabric', { tags: ['seat'] });
    }
    // sports field with goals and a stand
    const FX = 52, FZ = 58;
    b.box(FX - 30, 0, FZ - 18, FX + 30, 0.25, FZ + 18, 0x4fa83a, 'grass');
    b.box(FX - 0.2, 0.25, FZ - 18, FX + 0.2, 0.27, FZ + 18, BC.white, 'plastic', { collide: false });
    for (const s of [-1, 1]) {
      const x = FX + s * 29;
      for (const dz of [-4, 4]) b.block(x, 0.25, FZ + dz, 0.4, 5, 0.4, BC.white, 'metal');
      b.box(x - 0.2, 5.25, FZ - 4.2, x + 0.2, 5.65, FZ + 4.2, BC.white, 'metal');
    }
    for (let r = 0; r < 3; r++) b.box(FX - 16, 0, FZ + 20 + r * 2, FX + 16, 1 + r * 1.2, FZ + 22 + r * 2, 0x8f9194, 'metal');

    for (const [x, z] of [[-96, -10], [96, -20], [-40, 70], [100, 40], [-100, 50], [10, 60], [-80, -80], [80, -80]]) b.tree(x, z, 1.0);
    b.box(-6, 0, 44, 6, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
