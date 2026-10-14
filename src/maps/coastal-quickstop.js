// Coastal Quickstop
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Coastal Quickstop',
  build(b) {
    b.box(-60, 0, -45, 60, 0.3, 45, BC.sand, 'sand');
    const hut = (x) => b.building({
      x, z: -5, w: 22, d: 16, floors: 1, color: BC.nougat, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, roofMat: 'wood', floorColor: BC.brown, spacing: 7,
      interior: (bb, i) => {
        b.block(x, 0.3, i.iz0 + 1.5, 5, 4, 2, BC.darkStone, 'brick', { tags: ['fire'] });
        b.block(x, 4.3, i.iz0 + 1, 3, 9, 1.5, BC.darkStone, 'brick');
        b.table(x - 5, 0.3, i.iz0 + 8, 5, 3); b.chair(x - 5, 0.3, i.iz0 + 10.5, 180);
      },
    });
    hut(-24); hut(24);
    // boardwalk & pier
    b.box(-50, 0.3, 30, 50, 1.2, 40, BC.reddishBrown, 'wood');
    for (let x = -48; x <= 48; x += 12) b.block(x, 1.2, 40, 0.8, 3, 0.8, BC.reddishBrown, 'wood');
    // fuel pump + sign
    b.block(0, 0.3, 14, 2, 5, 2, BC.brightRed, 'metal'); b.block(0, 5.3, 14, 2.6, 1, 2.6, BC.white, 'plastic');
    b.cyl(48, 0, -35, 1.2, 22, BC.darkStone, 'metal'); b.sign(48, 22, -35, 12, 6, 'COASTAL\nQUICKSTOP', { bg: '#da8541', depth: 1 });
    for (const [x, z] of [[-40, 26], [-20, 27], [20, 27], [40, 26]]) b.bush(x, z, 0.8);
    for (const [x, z] of [[-50, 20], [-40, -38], [40, -38], [52, 18], [-8, 26], [10, -38]]) b.tree(x, z, 1, 'palm');
    b.table(-12, 0.3, 22, 6, 3); b.table(12, 0.3, 22, 6, 3);
    b.chair(-12, 0.3, 19.5, 0); b.chair(12, 0.3, 19.5, 0);
    b.car(30, 20, 90, BC.brightBlue);
    ringSpawns(b, 32, 12, 0.3);
  },
};
