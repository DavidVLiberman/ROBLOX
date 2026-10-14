// Modest Headquarters
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Modest Headquarters',
  build(b) {
    b.box(-60, 0, -40, 60, 0.3, 40, BC.mediumStone, 'concrete');
    b.building({
      x: -28, z: 0, w: 32, d: 28, floors: 4, fh: 12, color: 0xd9d4c7, mat: 'concrete', trim: BC.brightBlue, spacing: 6, winW: 4, winH: 7, glassColor: 0x7fc8f8, floorColor: BC.mediumStone, floorMat: 'plastic',
      interior: (bb, i) => { desks(b, i); b.table(-28, 0.3, 0, 4, 4, BC.brown, ['fire']); },
    });
    b.building({
      x: 28, z: 0, w: 30, d: 26, floors: 3, fh: 12, color: 0xc7d0d9, mat: 'concrete', trim: BC.brightBlue, spacing: 6, winW: 4, winH: 7, glassColor: 0x7fc8f8, floorColor: BC.mediumStone, floorMat: 'plastic',
      interior: (bb, i) => desks(b, i),
    });
    // skybridge on the 3rd floor
    b.box(-12, 23, -3, 13, 24, 3, BC.darkStone, 'metal');
    b.box(-12, 24, -3, 13, 28, -2.6, 0x7fc8f8, 'glass', { tags: ['glass'] });
    b.box(-12, 24, 2.6, 13, 28, 3, 0x7fc8f8, 'glass', { tags: ['glass'] });
    b.box(-12, 28, -3, 13, 28.5, 3, BC.darkStone, 'metal');
    b.cyl(0, 0, 30, 10, 1.5, BC.mediumStone, 'concrete'); b.cyl(0, 1.5, 30, 1.5, 8, BC.brightBlue, 'metal');
    b.sign(0, 0.3, 20, 18, 2.4, 'MODEST HEADQUARTERS', { bg: '#1b4f8a' });
    b.tree(-50, 30, 0.9); b.tree(50, 30, 0.9); b.tree(-50, -32, 0.9); b.tree(50, -32, 0.9);
    ringSpawns(b, 45, 12, 0.3);
  },
};
