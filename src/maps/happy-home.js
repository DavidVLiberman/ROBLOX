// Happy Home
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Happy Home',
  build(b) {
    b.building({
      x: 0, z: 0, w: 36, d: 26, floors: 2, fh: 12, color: BC.institutionalWhite, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, roofMat: 'slate',
      floorColor: BC.nougat, floorMat: 'wood', spacing: 8, trim: BC.lightBlue, ladderSide: 'W',
      interior: (bb, i) => {
        b.block(i.ix0 + 2.5, 0.3, 2, 3, 4, 6, BC.brightRed, 'fabric', { tags: ['fire', 'flammable'] }); // couch by the left window
        b.table(-4, 0.3, 4, 6, 4);
        b.chair(-4, 0.3, 7, 180); b.chair(-4, 0.3, 1, 0);
        b.block(12, 0.3, 6, 4, 6, 2, BC.brown, 'wood', { tags: ['flammable'] });
        const y = i.levelY(1);
        b.block(-8, y, 5, 8, 2, 10, BC.white, 'fabric', { tags: ['flammable'] });     // bed
        b.block(-8, y + 2, 1, 6, 1, 2, BC.lightBlue, 'fabric');
        b.block(10, y, 6, 4, 5, 2, BC.brown, 'wood', { tags: ['flammable'] });
      },
    });
    b.building({ x: 30, z: 4, w: 18, d: 18, floors: 1, fh: 11, color: BC.institutionalWhite, mat: 'wood', roof: 'flat', roofColor: BC.darkStone, windows: false, doorW: 12, roofAccess: false, furnish: false, ladder: true });
    for (const x of [-14, -8, 8, 14]) b.bush(x, 15, 0.8);
    b.cyl(-6, 0, 38, 0.4, 3.5, BC.reddishBrown, 'wood'); b.block(-6, 3.5, 38, 1, 1, 1.8, BC.brightBlue, 'metal');
    b.box(-40, 0, 13, 22, 0.25, 40, BC.grass, 'grass');
    b.box(22, 0, 13, 38, 0.3, 45, BC.mediumStone, 'concrete');
    b.fence(-45, 40, 15, 40); b.fence(-45, -30, -45, 40); b.fence(-45, -30, 40, -30);
    b.tree(-32, 28); b.tree(-30, -18, 1.2); b.tree(36, -20);
    b.cyl(-20, 0, 30, 3, 2.5, BC.brown, 'wood');
    b.bench(8, 30, 0, BC.brightRed);
    b.car(30, 26, 0, BC.brightRed);
    ringSpawns(b, 30, 10); b.spawn(-10, 0, 32); b.spawn(10, 0, 22);
  },
};
