// Surf Central: a three-storey teal surf shop at the top of the beach, a giant
// surfboard on its roof. The fire starts on its stairs. A boardwalk runs along the
// sand, with a pier out over the sea to a little bait hut, a tall lifeguard tower,
// a snack shack, a volleyball net, umbrellas and surfboards stuck in the sand.
import { BC } from '../util.js';
import { V, RAINBOW } from './helpers.js';

const TEAL = 0x2a9d8f, SANDC = 0xe8d6a0, PLANK = 0x9b6a3c, DARK = 0x5c3a1e;

export default {
  name: 'Surf Central',
  build(b) {
    // ---------------- the surf shop ----------------
    const shop = b.building({
      x: -10, z: -58, w: 40, d: 26, floors: 3, fh: 11, color: TEAL, mat: 'wood', trim: BC.white, floorColor: 0xd8c39a, floorMat: 'wood',
      door: 'S', doorW: 6, spacing: 7, winW: 4, winH: 5, stairFire: true, stairColor: PLANK, roofColor: 0x1f6f66, furnish: false,
      interior: (bb, i) => {
        // ground floor: board racks along the north wall and the till
        for (let k = 0; k < 8; k++) b.part({ pos: [i.ix0 + 8 + k * 2.6, 3.8, i.iz0 + 7.6], size: [2, 7, 0.4], color: RAINBOW[k % 6], mat: 'plastic', rot: [8, 0, 0] });
        b.box(i.ix1 - 9, 0.3, i.iz1 - 8, i.ix1 - 2, 3.6, i.iz1 - 6.5, BC.white, 'wood');
        // the café upstairs
        const y = i.levelY(1);
        for (const x of [i.ix0 + 10, i.ix0 + 20, i.ix0 + 30]) { b.table(x, y, i.iz0 + 9, 4, 4, PLANK); b.chair(x - 2.8, y, i.iz0 + 9, 90, TEAL); b.chair(x + 2.8, y, i.iz0 + 9, -90, TEAL); }
      },
    });
    // the giant surfboard on the roof
    const SX = -10, SZ = shop.z0 + 6, SY = shop.top + 2;
    b.box(SX - 3, shop.top, SZ - 1, SX + 3, SY, SZ + 1, BC.darkStone, 'metal');
    b.block(SX, SY, SZ, 5, 16, 0.8, BC.brightYellow, 'plastic');
    b.ball(SX, SY + 13.5, SZ, 5, BC.brightYellow, 'plastic', { tags: [] });
    b.block(SX, SY, SZ - 0.45, 1, 16, 0.1, BC.brightRed, 'plastic', { collide: false });
    b.sign(-10, shop.top - 6, shop.z1 + 0.05, 22, 3, 'SURF CENTRAL', { bg: '#0b8f8a', depth: 0.1 });
    // deck along the beach side
    b.box(shop.x0 - 4, 0, shop.z0 - 8, shop.x1 + 4, 0.8, shop.z0, PLANK, 'wood');
    for (let x = shop.x0 - 3.5; x <= shop.x1 + 4; x += 8.8) b.block(x, 0.8, shop.z0 - 7.6, 0.5, 3, 0.5, BC.white, 'wood');
    for (const x of [shop.x0 + 4, shop.x1 - 4]) b.bench(x, shop.z0 - 3, 180, BC.white);

    // ---------------- beach and boardwalk ----------------
    b.box(-80, 0, -128, 80, 0.3, -74, SANDC, 'sand');
    b.box(-80, 0.3, -86, 80, 1, -80, PLANK, 'wood');
    for (let x = -78; x <= 78; x += 12) b.cyl(x, 1, -86, 0.5, 2.4, DARK, 'wood');
    b.box(-4, 0, -47, 4, 0.2, -10, BC.mediumStone, 'concrete');
    // car park in front of the shop, where everyone arrives
    b.box(-40, 0, -10, 40, 0.2, 26, 0x3b3b3e, 'asphalt');
    for (let x = -36; x <= 36; x += 8) if (Math.abs(x) > 12) b.box(x, 0.2, -6, x + 0.4, 0.25, 4, BC.white, 'plastic');
    // changing huts either side of the shop
    for (const [x, c] of [[-46, BC.brightRed], [-38, BC.brightBlue], [26, BC.brightYellow], [34, BC.brightGreen]]) {
      b.box(x - 3, 0, -72, x + 3, 7, -66, c, 'wood', { tags: ['flammable'] });
      b.box(x - 3.4, 7, -72.4, x + 3.4, 7.5, -65.6, BC.white, 'wood');
    }
    b.box(-14, 0, -80, -6, 0.6, -71, PLANK, 'wood');
    // pier out to the bait hut
    const PX = 44;
    b.box(PX - 3, 0.3, -170, PX + 3, 1.1, -86, PLANK, 'wood');
    for (let z = -164; z <= -130; z += 8.5) for (const s of [-1, 1]) b.cyl(PX + s * 3.4, -10, z, 1, 12, DARK, 'wood');
    for (const s of [-1, 1]) b.box(PX + s * 3 - 0.2, 1.1, -170, PX + s * 3 + 0.2, 3.6, -96, BC.white, 'wood');
    b.box(PX - 7, 0.3, -182, PX + 7, 1.1, -170, PLANK, 'wood');
    for (const [x, z] of [[PX - 6.4, -181.4], [PX + 6.4, -181.4], [PX - 6.4, -170.6], [PX + 6.4, -170.6]]) b.cyl(x, -10, z, 1, 12, DARK, 'wood');
    b.box(PX - 4, 1.1, -180, PX + 4, 8, -174, 0xe76f51, 'wood', { tags: ['flammable'] });
    b.box(PX - 5, 8, -181, PX + 5, 8.6, -173, BC.white, 'wood');
    b.sign(PX, 5, -173.95, 6, 1.4, 'BAIT', { bg: '#1b4f8a', depth: 0.1 });
    for (const x of [PX - 5.5, PX + 5.5]) b.part({ pos: [x, 3, -181], size: [0.15, 5, 0.15], color: DARK, mat: 'wood', rot: [-25, 0, 0], collide: false });

    // ---------------- lifeguard tower ----------------
    const LX = 62, LZ = -106;
    for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.block(LX + ox, 0.3, LZ + oz, 0.8, 16, 0.8, BC.white, 'wood');
    b.block(LX, 16.3, LZ, 8, 0.8, 8, BC.white, 'wood');
    b.box(LX - 3.4, 17.1, LZ - 3.4, LX + 3.4, 23.4, LZ - 3, BC.brightRed, 'wood');
    for (const s of [-1, 1]) b.box(LX + s * 3.4 - 0.2, 17.1, LZ - 3, LX + s * 3.4 + 0.2, 19.2, LZ + 3.4, BC.white, 'wood');
    for (const [ox, oz] of [[-3.6, 3.6], [3.6, 3.6]]) b.block(LX + ox, 17.1, LZ + oz, 0.4, 6.3, 0.4, BC.white, 'wood');
    b.block(LX, 23.4, LZ, 9, 0.6, 9, BC.brightRed, 'wood');
    b.cyl(LX + 4, 24, LZ - 4, 0.3, 6, BC.white, 'metal');
    b.block(LX + 5.2, 28, LZ - 4, 2.4, 1.6, 0.1, BC.brightRed, 'fabric');
    b.truss(LX, 0.3, LZ + 5, 16.9);
    b.spot('high', LX - 1, 17.1, LZ - 1, [V(LX, 0.3, LZ + 9), V(LX, 17.3, LZ + 5), V(LX - 1, 17.1, LZ - 1)]);

    // ---------------- snack shack, volleyball, umbrellas, boards ----------------
    b.box(-66, 0.3, -100, -50, 7, -92, 0xf4a261, 'wood', { tags: ['flammable'] });
    b.box(-67, 7, -102.5, -49, 7.6, -91, BC.brightYellow, 'fabric');
    b.box(-66, 0.3, -101.5, -50, 3.6, -100, BC.white, 'wood');
    b.sign(-58, 7.6, -102.55, 10, 1.4, 'SNACKS', { bg: '#e63946', depth: 0.1 });
    for (const x of [-30, -10]) b.cyl(x, 0.3, -112, 0.5, 8, BC.white, 'metal');
    b.box(-30, 5, -112.1, -10, 7.4, -111.9, BC.white, 'fabric');
    b.ball(-20, 0.3, -106, 2, BC.white, 'plastic');
    for (const [x, z, c] of [[-46, -116, BC.brightRed], [6, -100, BC.brightBlue], [24, -118, BC.brightYellow], [-60, -122, BC.brightGreen]]) {
      b.cyl(x, 0.3, z, 0.4, 8, BC.white, 'metal');
      b.part({ pos: [x, 9, z], size: [9, 2.5, 9], color: c, mat: 'fabric', shape: 'cone' });
      b.block(x + 3, 0.3, z + 2, 3, 0.15, 6, c, 'fabric');
    }
    for (let k = 0; k < 5; k++) b.part({ pos: [12 + k * 3, 3.8, -92], size: [2, 7, 0.4], color: RAINBOW[k], mat: 'plastic', rot: [-10, 0, 0] });
    for (const [x, z] of [[-74, -76], [-40, -96], [30, -78], [74, -82], [-90, -30], [90, -20], [-70, 30], [70, 40]]) b.tree(x, z, 1.0, 'palm');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 8 + Math.floor(i / 4) * 5);
  },
};
