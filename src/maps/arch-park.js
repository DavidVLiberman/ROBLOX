// Arch Park
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Arch Park',
  build(b) {
    b.box(-70, 0, -2, 70, 0.2, 2, BC.mediumStone, 'concrete');
    b.box(-2, 0, -70, 2, 0.2, 70, BC.mediumStone, 'concrete');
    // big stone arch made of stacked blocks
    for (const sx of [-16, 16]) pillarStack(b, sx, -35, 6, 30, BC.mediumStone, 'slate', 6);
    for (let i = 0; i < 7; i++) b.block(-18 + i * 6, 30, -35, 6, 6, 6, BC.mediumStone, 'slate');
    b.block(0, 36, -35, 12, 3, 6, BC.darkStone, 'slate');
    // ladders: up the arch, and onto the pavilion roof
    ladderTo(b, -16, 0, -30, 36.4, [-16, 0, -26.5], [-8, 36, -35]);
    ladderTo(b, -55, 0, 36, 13.4, [-58.5, 0, 36], [-44, 13, 36]);
    signPost(b, -6, 59, 'ARCH PARK', 0, { bg: '#2f6b2f' });
    for (const [x, z] of [[-6, 12], [6, 12], [-6, 32], [6, 32], [-30, -25], [30, -25], [-60, 50], [58, -12]]) b.bush(x, z, 0.9);
    // fountain
    b.cyl(0, 0, 22, 18, 2.2, BC.mediumStone, 'concrete');
    b.cyl(0, 0.2, 22, 15.5, 2.2, 0x4fa3e8, 'glass', { tags: ['glass'] });
    b.cyl(0, 2.2, 22, 2, 6, BC.mediumStone, 'concrete');
    b.cyl(0, 8.2, 22, 6, 1, BC.mediumStone, 'concrete');
    b.cyl(0, 9.2, 22, 1, 2, 0x8fd0ff, 'neon');
    trashCan(b, 11, 0, 22, true);
    // pavilion (shelter)
    for (const [px, pz] of [[-52, 28], [-36, 28], [-52, 44], [-36, 44]]) b.block(px, 0, pz, 1.5, 12, 1.5, BC.white, 'concrete');
    b.box(-54, 12, 26, -34, 13, 46, BC.brightRed, 'slate');
    b.bench(-44, 33, 0); b.bench(-44, 40, 180);
    // restrooms
    b.building({ x: 46, z: -40, w: 18, d: 14, floors: 1, color: BC.sand, mat: 'brick', roof: 'flat', windows: true, spacing: 7, door: 'S', roofAccess: false, furnish: false });
    b.sign(46, 8.4, -32.8, 9, 1.8, 'RESTROOMS', { bg: '#1b4f8a' });
    // trees, benches, lamps
    const trees = [[-30, -10], [30, -10], [-28, 15], [28, 15], [-55, -45], [55, 10], [-60, 0], [60, 45], [-20, 55], [25, 55], [-58, -20], [40, -60]];
    for (const [x, z] of trees) b.tree(x, z, 1 + (x % 3) * 0.1);
    for (const [x, z, r] of [[-12, 8, 0], [12, 8, 0], [-12, 36, 180], [12, 36, 180], [-25, -50, 90], [25, -50, -90]]) b.bench(x, z, r);
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 52], [8, 52], [-40, 0], [40, 0]]) b.lamp(x, z);
    // hedge walls
    b.box(-70, 0, 62, -10, 3, 64, BC.darkGreen, 'grass');
    b.box(10, 0, 62, 70, 3, 64, BC.darkGreen, 'grass');
    b.box(-24, 0, -20, -6, 4, -18, BC.mediumStone, 'brick');
    b.box(6, 0, -20, 24, 4, -18, BC.mediumStone, 'brick');
    ringSpawns(b, 30, 10); ringSpawns(b, 55, 10);
  },
};
