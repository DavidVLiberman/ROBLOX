// Manic Mansion
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Manic Mansion',
  build(b) {
    b.box(-65, 0, -50, 65, 0.25, 55, BC.grass, 'grass');
    b.building({
      x: 0, z: -12, w: 62, d: 34, floors: 3, fh: 12, color: BC.institutionalWhite, mat: 'concrete', trim: BC.gold, floorColor: BC.reddishBrown, floorMat: 'wood', spacing: 8, winH: 6, doorW: 7,
      interior: (bb, i) => {
        // fireplace with firewood
        b.block(20, 0.3, i.iz0 + 1.5, 8, 6, 2, BC.darkStone, 'brick');
        for (let k = 0; k < 3; k++) b.part({ pos: [18 + k * 2, 0.7, i.iz0 + 3.2], size: [0.8, 3, 0.8], color: BC.reddishBrown, mat: 'wood', shape: 'cyl', rot: [0, 0, 90], tags: k === 1 ? ['fire', 'flammable'] : ['flammable'] });
        b.block(-10, 0.3, -12, 10, 3, 4, BC.brightRed, 'fabric', { tags: ['flammable'] });
        b.table(-10, 0.3, -6, 8, 4, BC.brown);
        for (let k = 1; k < 3; k++) { const y = i.levelY(k); b.block(-14, y, -10, 8, 2, 10, BC.white, 'fabric'); b.block(14, y, -10, 8, 2, 10, BC.white, 'fabric'); }
      },
    });
    // front columns + balcony
    for (const x of [-12, -4, 4, 12]) b.cyl(x, 0, 9, 2, 12, BC.white, 'concrete');
    b.box(-15, 11, 5, 15, 12, 12, BC.white, 'concrete');
    // pool
    b.box(-40, 0, 22, 0, 0.6, 46, BC.white, 'concrete');
    b.box(-37, 0.6, 25, -3, 0.7, 43, 0x3fa9f5, 'glass', { tags: ['glass'] });
    b.box(-40, 0.6, 22, 0, 1.2, 25, BC.white, 'concrete'); b.box(-40, 0.6, 43, 0, 1.2, 46, BC.white, 'concrete');
    // garden
    b.cyl(28, 0, 32, 10, 2, BC.mediumStone, 'concrete'); b.cyl(28, 2, 32, 2, 5, BC.white, 'concrete');
    for (let x = 10; x <= 50; x += 10) b.block(x, 0, 48, 8, 3, 2, BC.darkGreen, 'grass');
    for (const x of [-26, -20, 20, 26]) b.bush(x, 7, 1);
    for (const [x, z] of [[-55, -40], [55, -40], [-55, 30], [55, 20]]) b.tree(x, z, 1.1, 'pine');
    b.car(48, 10, 0, BC.reallyBlack);
    ringSpawns(b, 45, 12);
  },
};
