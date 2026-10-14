// Lucky Mart
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Lucky Mart',
  build(b) {
    b.box(-60, 0, 10, 60, 0.2, 55, BC.darkStone, 'asphalt');
    for (let x = -48; x <= 48; x += 12) b.box(x - 0.2, 0.2, 30, x + 0.2, 0.25, 48, BC.white, 'plastic');
    b.building({
      x: 0, z: -18, w: 56, d: 36, floors: 1, fh: 14, color: BC.lightBlue, mat: 'brick', trim: BC.brightGreen, spacing: 7, winW: 6, winH: 7, floorColor: BC.white, floorMat: 'plastic', doorW: 8, roofAccess: true,
      interior: (bb, i) => {
        for (const x of [-18, -8, 2, 12]) b.box(x - 1.5, 0.3, -30, x + 1.5, 6, -14, BC.white, 'metal');
        for (const x of [-18, -8, 2, 12]) for (const z of [-27, -22, -17]) b.block(x, 6, z, 2.5, 1, 2.5, [BC.brightRed, BC.brightYellow, BC.brightGreen][Math.abs(z) % 3], 'plastic');
        b.box(-24, 0.3, -6, -14, 3.6, -3, BC.brightGreen, 'wood', { tags: ['fire'] });
        b.block(-19, 3.6, -4.5, 1.6, 1.2, 1.2, BC.black, 'metal');
        b.box(18, 0.3, -32, 26, 7, -29, BC.white, 'metal');
      },
    });
    b.cyl(-40, 0, 40, 1, 20, BC.mediumStone, 'metal');
    b.sign(-40, 20, 40, 14, 6, 'LUCKY\nMART', { bg: '#2e8b3e', depth: 1 });
    b.sign(0, 9.4, 0.2, 26, 3.2, 'LUCKY MART', { bg: '#2e8b3e' });
    for (const x of [-24, -14, 14, 24]) b.bush(x, 4, 0.8);
    b.car(-30, 38, 0, BC.brightRed); b.car(6, 40, 180, BC.brightBlue); b.car(30, 38, 0, BC.white);
    for (let i = 0; i < 3; i++) b.block(36 + i * 3, 0.2, 14, 2, 3, 3, BC.mediumStone, 'metal');
    b.tree(-55, -30); b.tree(55, -30); b.tree(55, 0, 0.9);
    ringSpawns(b, 48, 12);
  },
};
