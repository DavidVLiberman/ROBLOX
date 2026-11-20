// Manic Mansion: a grand three-storey white mansion on a grass mound. Downstairs are
// the living room (its fireplace is where the fire starts), the dining room and the
// kitchen; upstairs are bedrooms and a games room. A columned porch with a balcony
// faces the drive, and the grounds have a pool, a gazebo, a fountain and hedges.
import { BC } from '../util.js';
import { V } from './helpers.js';

const WHITE = 0xf4f1ea, GOLD = 0xd8b23a, WOOD = 0x6b3b1f, RUG = 0x8a2a2a;

export default {
  name: 'Manic Mansion',
  build(b) {
    // the mound, in two low steps
    b.box(-90, 0, -64, 90, 1.5, 46, BC.grass, 'grass');
    b.box(-80, 1.5, -56, 80, 3, 38, BC.grass, 'grass');
    const Y = 3;
    const m = b.building({
      x: 0, z: -16, w: 72, d: 40, floors: 3, fh: 12, y: Y, color: WHITE, mat: 'concrete', trim: GOLD, floorColor: 0x9b6a3c, floorMat: 'wood',
      door: 'S', doorW: 7, spacing: 8, winW: 4, winH: 7, stairColor: WOOD, roofColor: 0x5d6064, furnish: false, ladder: false,
      interior: (bb, i) => {
        const y0 = i.levelY(0), y1 = i.levelY(1), y2 = i.levelY(2);
        // ---- living room (west): sofas round a rug, the fireplace, a TV ----
        b.box(i.ix0 + 6, y0, -24, i.ix0 + 20, y0 + 0.1, -10, RUG, 'fabric', { collide: false });
        b.block(i.ix0 + 1.2, y0, -17, 2.4, 6, 8, BC.darkStone, 'brick');
        b.block(i.ix0 + 1.2, y0 + 6, -17, 1.6, 6, 4, BC.darkStone, 'brick');
        for (let k = 0; k < 3; k++) b.part({ pos: [i.ix0 + 3, y0 + 0.5, -18.6 + k * 1.6], size: [0.8, 2.6, 0.8], color: WOOD, mat: 'wood', shape: 'cyl', rot: [90, 0, 0], tags: k === 1 ? ['fire', 'flammable'] : ['flammable'] });
        b.block(i.ix0 + 13, y0, -27, 10, 2.2, 3, 0x2f4f8a, 'fabric', { tags: ['flammable', 'seat'] });
        b.block(i.ix0 + 13, y0, -7, 10, 2.2, 3, 0x2f4f8a, 'fabric', { tags: ['flammable', 'seat'] });
        b.block(i.ix0 + 13, y0, -17, 5, 1.6, 3, WOOD, 'wood');
        b.block(i.ix0 + 21, y0, -17, 1, 4, 6, BC.black, 'plastic');
        // ---- dining room (middle): long table, chairs, chandelier ----
        b.table(0, y0, -18, 16, 4, WOOD);
        for (const x of [-6, -2, 2, 6]) { b.chair(x, y0, -21, 0, RUG); b.chair(x, y0, -15, 180, RUG); }
        b.block(0, y0 + 9.4, -18, 0.2, 1.6, 0.2, GOLD, 'metal');
        b.block(0, y0 + 8.4, -18, 3, 1, 3, 0xfff2b0, 'neon');
        // ---- kitchen (east): counters, stove, fridge, island ----
        b.box(i.ix1 - 20, y0, i.iz0 + 6, i.ix1 - 1, y0 + 3.6, i.iz0 + 8.5, BC.white, 'concrete');
        b.block(i.ix1 - 14, y0 + 3.6, i.iz0 + 7.2, 3, 0.3, 2, BC.black, 'metal');
        b.block(i.ix1 - 2.5, y0, i.iz0 + 12, 3, 7, 3, 0xd9d9d9, 'metal');
        b.block(i.ix1 - 11, y0, -14, 8, 3.6, 4, WOOD, 'wood');
        b.block(i.ix1 - 11, y0 + 3.6, -14, 8.4, 0.3, 4.4, BC.white, 'concrete');
        // ---- bedrooms upstairs ----
        for (const [x, z] of [[-20, -18], [0, -24], [20, -18]]) {
          b.block(x, y1, z, 6, 2, 8, BC.white, 'fabric', { tags: ['flammable'] });
          b.block(x, y1 + 2, z - 3.4, 6, 2, 1, WOOD, 'wood');
        }
        // ---- games room on the top floor ----
        b.block(-6, y2, -18, 10, 3, 5.6, 0x2f6b3a, 'fabric');
        b.box(-11.2, y2, -21, 0.8, y2 + 3.2, -20.8, WOOD, 'wood', { collide: false });
        for (const x of [12, 18, 24]) b.block(x, y2, i.iz0 + 6, 5, 9, 1.6, WOOD, 'wood');
      },
    });
    // columned porch with the balcony above
    b.box(-16, Y, m.z1, 16, Y + 0.6, m.z1 + 9, WHITE, 'concrete');
    for (const x of [-14, -7, 7, 14]) b.cyl(x, Y + 0.6, m.z1 + 7.5, 2, 11.4, WHITE, 'concrete');
    b.box(-16, Y + 12, m.z1, 16, Y + 13, m.z1 + 9, WHITE, 'concrete');
    b.box(-16, Y + 13, m.z1 + 8.6, 16, Y + 15.4, m.z1 + 9, GOLD, 'metal');
    for (const s of [-1, 1]) b.box(s * 16 - 0.2, Y + 13, m.z1, s * 16 + 0.2, Y + 15.4, m.z1 + 8.6, GOLD, 'metal');
    b.part({ pos: [0, Y + 14.8, m.z1 + 8.2], size: [34, 6, 1], color: WHITE, mat: 'concrete', shape: 'wedge', rot: [0, 180, 0] });
    // the grand steps down the mound and the drive
    for (let k = 0; k < 3; k++) b.box(-10, 0, m.z1 + 9 + k * 2, 10, Y - k, m.z1 + 11 + k * 2, WHITE, 'concrete');
    b.box(-6, 0, m.z1 + 15, 6, 0.2, 104, 0xb5b0a4, 'concrete');
    // pool on the west lawn
    b.box(-62, Y, 14, -24, Y + 0.6, 34, WHITE, 'concrete');
    b.box(-60, Y + 0.6, 16, -26, Y + 0.7, 32, 0x3fa9f5, 'glass', { collide: false, tags: ['glass'] });
    b.box(-62, Y + 0.6, 14, -24, Y + 1.2, 16, WHITE, 'concrete');
    b.box(-62, Y + 0.6, 32, -24, Y + 1.2, 34, WHITE, 'concrete');
    for (const x of [-56, -48, -40]) b.block(x, Y, 9, 2.4, 1, 5, BC.white, 'plastic', { tags: ['seat'] });
    // gazebo on the east lawn
    const GX = 50, GZ = 20;
    b.cyl(GX, Y, GZ, 16, 0.8, WHITE, 'wood');
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.cyl(GX + Math.cos(a) * 7, Y + 0.8, GZ + Math.sin(a) * 7, 0.8, 9, WHITE, 'wood'); }
    b.cyl(GX, Y + 9.8, GZ, 17, 0.6, WHITE, 'wood');
    b.part({ pos: [GX, Y + 12.8, GZ], size: [17, 5.4, 17], color: 0x2f6b3a, mat: 'slate', shape: 'cone' });
    b.bench(GX, GZ + 4, 180, WHITE);
    b.spot('indoor', GX - 2, Y + 0.8, GZ - 1, [V(GX - 12, Y, GZ + 12), V(GX - 5, Y + 0.8, GZ + 5), V(GX - 2, Y + 0.8, GZ - 1)]);
    // fountain and hedges out front
    b.cyl(34, Y, 2, 10, 1.4, BC.mediumStone, 'concrete');
    b.cyl(34, Y + 1.4, 2, 8.6, 0.1, 0x3fa9f5, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(34, Y + 1.4, 2, 1.6, 5, WHITE, 'concrete');
    for (const [x0, x1] of [[-76, -20], [20, 76]]) b.box(x0, Y, 36, x1, Y + 3, 38, 0x2f6b3a, 'grass', { tags: ['flammable'] });
    for (const [x, z] of [[-74, -50], [74, -50], [-74, 0], [74, -10], [-100, 30], [100, 30]]) b.tree(x, z, 1.1, 'pine');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
