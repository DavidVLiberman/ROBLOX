// Sunny Ranch
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Sunny Ranch',
  build(b) {
    // barn
    b.building({
      x: -15, z: -15, w: 40, d: 28, floors: 1, fh: 18, color: BC.brightRed, mat: 'wood', roof: 'gable', roofColor: BC.darkStone, roofMat: 'slate', windows: true, spacing: 10, winW: 3, winH: 4, sill: 8, doorW: 12, floorColor: BC.sand, floorMat: 'sand', trim: BC.white, roofAccess: false,
      interior: (bb, i) => {
        b.box(i.ix0, 9, i.iz0, i.ix0 + 14, 10, i.iz1, BC.nougat, 'wood', { tags: ['flammable'] });
        b.truss(i.ix0 + 15, 0.3, i.iz1 - 4, 10);
        for (let k = 0; k < 6; k++) b.block(i.ix0 + 2 + (k % 3) * 4, 10, i.iz0 + 4 + Math.floor(k / 3) * 6, 3.6, 2.6, 5, BC.brickYellow, 'grass', { tags: ['flammable'] });
      },
    });
    b.cyl(16, 0, -25, 12, 32, BC.mediumStone, 'metal');
    b.cyl(16, 32, -25, 13, 1, BC.darkStone, 'metal');
    b.part({ pos: [16, 36, -25], size: [8, 6, 8], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    ladderTo(b, 23, 0, -25, 33.4, [26, 0, -25], [11.4, 33, -25]);
    b.sign(-15, 11, -0.8, 16, 3, 'SUNNY RANCH', { bg: '#7a1d1d' });
    // farmhouse
    b.building({ x: 34, z: 26, w: 26, d: 20, floors: 2, fh: 11, color: BC.white, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, spacing: 7, winW: 3 });
    // fences / pasture
    b.fence(-55, 10, -55, 50); b.fence(-55, 50, 10, 50); b.fence(10, 50, 10, 10); b.fence(-55, 10, -10, 10);
    // lanterns (fire)
    for (const [x, z, f] of [[-30, 8, true], [0, 8, false], [-60, -40, false], [50, -10, false]]) {
      b.block(x, 0, z, 0.6, 8, 0.6, BC.reddishBrown, 'wood');
      b.block(x, 8, z, 1.4, 1.8, 1.4, 0xffd27a, 'neon', { tags: f ? ['fire'] : [] });
    }
    // tractor
    b.block(-30, 1.6, 30, 6, 3, 10, BC.brightGreen, 'metal');
    b.block(-30, 4.6, 32, 5, 4, 4, BC.brightGreen, 'metal');
    for (const [x, z, d] of [[-33.6, 26, 3], [-26.4, 26, 3], [-33.6, 34, 5], [-26.4, 34, 5]]) b.part({ pos: [x, d / 2, z], size: [d, 1.2, d], color: BC.reallyBlack, mat: 'plastic', shape: 'cyl', rot: [0, 0, 90] });
    b.part({ pos: [-30, 4.8, 27.8], size: [2, 0.4, 2], color: BC.black, mat: 'fabric', tags: ['seat'] });
    for (let k = 0; k < 6; k++) b.part({ pos: [-10 + k * 4, 1.5, 32 + (k % 2) * 4], size: [3, 3, 3], color: BC.brickYellow, mat: 'grass', shape: 'cyl', rot: [0, 0, 90], tags: ['flammable'] });
    b.block(-45, 0, 30, 8, 2, 3, BC.mediumStone, 'metal');
    for (const [x, z] of [[50, -40], [-58, -10], [55, 5]]) b.tree(x, z);
    ringSpawns(b, 48, 12);
  },
};
