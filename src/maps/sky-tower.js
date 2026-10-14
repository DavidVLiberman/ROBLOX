// Sky Tower
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Sky Tower',
  build(b) {
    b.box(-45, 0, -45, 45, 0.3, 45, BC.mediumStone, 'concrete');
    const info = b.building({
      x: 0, z: 0, w: 32, d: 28, floors: 10, fh: 10, color: 0x2c3e50, mat: 'metal', trim: 0x5f7f99, spacing: 7, winW: 5, winH: 6, sill: 2, glassColor: 0x8fd0f0, floorColor: BC.mediumStone, floorMat: 'plastic',
      interior: (bb, i) => { b.table(8, 0.3, 0, 4, 4, BC.brown, ['fire']); b.table(-6, 0.3, 4, 6, 3); },
    });
    b.cyl(0, info.top, 0, 2, 22, BC.mediumStone, 'metal');
    b.ball(0, info.top + 22, 0, 2, BC.brightRed, 'neon');
    for (const [x, z] of [[-35, 30], [35, 30], [-35, -30], [35, -30]]) b.tree(x, z, 0.8);
    b.bench(-15, 28, 0); b.bench(15, 28, 0);
    b.sign(0, 7.6, 14.2, 14, 1.8, 'SKY TOWER', { bg: '#1b2a35' });
    ringSpawns(b, 32, 12, 0.3);
  },
};
