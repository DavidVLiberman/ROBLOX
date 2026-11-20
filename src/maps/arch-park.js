// Arch Park: a big town park inside a hedge. Two paths cross at the fountain plaza
// (the bin by the fountain is where the fire starts); a great stone arch spans the
// north path, with a ladder up its side to the top; a pavilion with picnic tables,
// the restrooms, a duck pond with a footbridge, a statue, flower beds, benches,
// lamps and plenty of trees. The arch's top stays just under the flood line.
import { BC } from '../util.js';
import { V, trashCan } from './helpers.js';

const STONE = 0x9a958c, PATH = 0xc9c2b0, HEDGE = 0x2f6b3a;

export default {
  name: 'Arch Park',
  build(b) {
    // ---------------- hedge round the park, paths, plaza ----------------
    const HX = 100, HZ0 = -90, HZ1 = 64;
    b.box(-HX, 0, HZ0, HX, 3.4, HZ0 + 2, HEDGE, 'grass', { tags: ['flammable'] });
    b.box(-HX, 0, HZ0 + 2, -HX + 2, 3.4, HZ1, HEDGE, 'grass', { tags: ['flammable'] });
    b.box(HX - 2, 0, HZ0 + 2, HX, 3.4, HZ1, HEDGE, 'grass', { tags: ['flammable'] });
    b.box(-HX, 0, HZ1 - 2, -8, 3.4, HZ1, HEDGE, 'grass', { tags: ['flammable'] });
    b.box(8, 0, HZ1 - 2, HX, 3.4, HZ1, HEDGE, 'grass', { tags: ['flammable'] });
    for (const s of [-1, 1]) b.block(s * 8, 0, HZ1 - 1, 2, 6, 2, STONE, 'slate');
    b.box(-4, 0, HZ0 + 2, 4, 0.2, 104, PATH, 'concrete');
    b.box(-HX + 2, 0, -4, HX - 2, 0.2, 4, PATH, 'concrete');
    b.cyl(0, 0, 0, 44, 0.25, 0xd8d2c4, 'concrete');

    // ---------------- the fountain ----------------
    b.cyl(0, 0, 0, 22, 2.2, STONE, 'concrete');
    b.cyl(0, 2.2, 0, 19, 0.12, 0x4fa3e8, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(0, 2.2, 0, 3, 6, STONE, 'concrete');
    b.cyl(0, 8.2, 0, 9, 1, STONE, 'concrete');
    b.cyl(0, 9.2, 0, 7.6, 0.1, 0x4fa3e8, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(0, 9.2, 0, 1.2, 3, STONE, 'concrete');
    b.ball(0, 12.2, 0, 1.6, 0x8fd0ff, 'neon');
    trashCan(b, 14, 0.25, 6, true);
    for (const a of [30, 150, 210, 330]) b.bench(Math.sin(a * Math.PI / 180) * 17, Math.cos(a * Math.PI / 180) * 17, a + 180);

    // ---------------- the great arch over the north path ----------------
    const AZ = -52, AT = 39;
    for (const s of [-1, 1]) {
      b.block(s * 14, 0, AZ, 8, 4, 10, 0x8a857c, 'slate');
      b.block(s * 14, 4, AZ, 7, AT - 7 - 4, 8, STONE, 'slate');
    }
    b.box(-17.5, AT - 7, AZ - 4, 17.5, AT, AZ + 4, STONE, 'slate');
    for (let k = 0; k < 5; k++) b.box(-9 + k * 3.6, AT - 9, AZ - 3.5, -7 + k * 3.6, AT - 7, AZ + 3.5, 0x8a857c, 'slate');
    b.block(0, AT - 7, AZ + 4.05, 3, 4, 0.2, 0x8a857c, 'slate');
    b.sign(0, AT - 5.6, AZ + 4.1, 14, 2, 'ARCH PARK', { bg: '#4a463f', depth: 0.1 });
    b.truss(-18.6, 0, AZ, AT + 0.4);
    b.spot('high', -6, AT, AZ, [V(-24, 0.2, AZ), V(-18.6, AT + 0.4, AZ), V(-14, AT, AZ), V(-6, AT, AZ)]);

    // ---------------- pavilion with picnic tables ----------------
    const PX = -58, PZ = 30;
    b.box(PX - 13, 0, PZ - 11, PX + 13, 0.5, PZ + 11, STONE, 'concrete');
    for (const [dx, dz] of [[-12, -10], [12, -10], [-12, 10], [12, 10]]) b.block(PX + dx, 0.5, PZ + dz, 1.4, 11.5, 1.4, BC.white, 'wood');
    b.box(PX - 14, 12, PZ - 12, PX + 14, 13, PZ + 12, 0xa8322a, 'slate');
    for (const dz of [-4, 4]) {
      b.table(PX, 0.5, PZ + dz, 8, 3, 0x8a5a32);
      for (const s of [-1, 1]) b.box(PX - 4, 0.5, PZ + dz + s * 2.6 - 0.5, PX + 4, 2.1, PZ + dz + s * 2.6 + 0.5, 0x8a5a32, 'wood', { tags: ['seat'] });
    }
    b.truss(PX - 15.2, 0, PZ, 13.4);
    b.spot('high', PX - 6, 13, PZ, [V(PX - 20, 0.2, PZ), V(PX - 15.2, 13.4, PZ), V(PX - 6, 13, PZ)]);
    b.spot('indoor', PX + 8, 0.5, PZ - 6, [V(PX + 18, 0.2, PZ - 6), V(PX + 8, 0.5, PZ - 6)]);

    // ---------------- restrooms ----------------
    b.building({ x: 58, z: 30, w: 22, d: 14, floors: 1, fh: 10, color: 0xd9c38f, mat: 'brick', trim: BC.white, roof: 'flat', spacing: 7, winW: 3, winH: 2, door: 'N', roofAccess: false, furnish: false, ladder: true, ladderSide: 'E' });
    b.sign(58, 7.6, 22.9, 10, 1.6, 'RESTROOMS', { bg: '#1b4f8a', rotY: 180, depth: 0.1 });

    // ---------------- duck pond and footbridge ----------------
    const QX = 56, QZ = -44;
    b.cyl(QX, 0, QZ, 40, 0.3, 0xc9b27a, 'sand');
    b.cyl(QX, 0.3, QZ, 36, 0.05, 0x3f8fd8, 'glass', { collide: false, tags: ['glass'] });
    b.box(QX - 22, 0, QZ - 2.5, QX + 22, 1.2, QZ + 2.5, 0x8a5a32, 'wood');
    for (const s of [-1, 1]) b.box(QX - 22, 1.2, QZ + s * 2.5 - 0.2, QX + 22, 3.4, QZ + s * 2.5 + 0.2, 0x6b3b1f, 'wood');
    for (const [dx, dz] of [[-8, 8], [6, -9], [10, 7]]) {
      b.block(QX + dx, 0.3, QZ + dz, 1.4, 0.9, 2, BC.white, 'plastic');
      b.block(QX + dx, 1.2, QZ + dz + 0.9, 0.7, 0.8, 0.7, 0x2f8a3c, 'plastic');
    }

    // ---------------- statue, flower beds, trees, lamps ----------------
    const SX = -56, SZ = -44;
    b.block(SX, 0, SZ, 8, 4, 8, STONE, 'concrete');
    b.block(SX, 4, SZ, 2.4, 3, 1.4, 0x6f8a6a, 'metal');
    b.block(SX, 7, SZ, 3.6, 3, 1.4, 0x6f8a6a, 'metal');
    b.block(SX, 10, SZ, 1.6, 1.6, 1.6, 0x6f8a6a, 'metal');
    b.block(SX + 2.4, 8.4, SZ, 1, 3.6, 1, 0x6f8a6a, 'metal');
    for (const [x, z] of [[-22, 14], [22, 14], [-22, -14], [22, -14]]) {
      b.box(x - 7, 0, z - 3, x + 7, 0.8, z + 3, 0x6b4a2a, 'grass');
      for (let k = 0; k < 5; k++) b.ball(x - 5 + k * 2.5, 0.8, z, 1.4, [BC.brightRed, BC.brightYellow, 0xf2a7c3, BC.white, 0x6a3fb5][k], 'grass', { tags: ['flammable'] });
    }
    for (const [x, z] of [[-30, -28], [30, -24], [-80, -10], [80, -14], [-84, 50], [84, 48], [-30, 46], [30, 50],
      [-80, -70], [82, -74], [-24, -76], [24, -78], [-50, 4], [46, 6]]) b.tree(x, z, 1 + ((x + z) % 3) * 0.08);
    for (const [x, z] of [[-8, -30], [8, -30], [-8, 30], [8, 30], [-40, -8], [40, -8], [-40, 8], [40, 8]]) b.lamp(x, z, 11);
    for (const [x, z, r] of [[-12, 40, 90], [12, 40, -90], [-60, -6, 0], [60, -6, 0]]) b.bench(x, z, r);

    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
