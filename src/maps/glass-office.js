// Glass Office
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Glass Office',
  build(b) {
    b.box(-50, 0, -45, 50, 0.3, 45, BC.mediumStone, 'concrete');
    b.building({
      x: 0, z: 0, w: 46, d: 32, floors: 5, fh: 12, color: 0x3a4652, mat: 'metal', floorColor: BC.lightBlue, floorMat: 'plastic',
      winW: 6.2, winH: 8.5, spacing: 7, glassColor: 0x8fd0f0, trim: 0x2a3440, doorW: 6,
      interior: (bb, i) => {
        desks(b, i);
        const y = i.levelY(3);
        b.table(i.ix0 + 4, y, 0, 3, 6, BC.brown, ['fire']);
      },
    });
    for (const [x, z] of [[-40, 30], [40, 30], [-40, -35], [40, -35]]) { b.block(x, 0.3, z, 6, 2, 6, BC.mediumStone, 'concrete'); b.tree(x, z, 0.8); }
    b.bench(-20, 30, 0); b.bench(20, 30, 0);
    b.sign(0, 0.3, 24, 14, 2.4, 'GLASS OFFICE', { bg: '#2a3440' });
    ringSpawns(b, 42, 12, 0.3);
  },
};
