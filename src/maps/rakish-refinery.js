// Rakish Refinery
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Rakish Refinery',
  build(b) {
    b.box(-65, 0, -55, 65, 0.2, 55, BC.darkStone, 'concrete');
    for (const [x, z] of [[-38, -30], [-38, 4], [-8, -34]]) {
      b.cyl(x, 0, z, 24, 18, BC.white, 'metal');
      b.cyl(x, 18, z, 25, 1, BC.mediumStone, 'metal');
      b.truss(x + 13, 0, z, 18.6);
      b.spot('high', x, 19, z, [V(x + 15, 0, z), V(x + 13, 19, z), V(x + 6, 19, z)]);
    }
    // distillation columns + catwalk
    for (const x of [20, 32]) { b.cyl(x, 0, -30, 7, 44, BC.mediumStone, 'metal'); b.cyl(x, 44, -30, 8, 1, BC.darkStone, 'metal'); }
    for (let l = 1; l <= 3; l++) b.box(14, l * 12, -36, 38, l * 12 + 0.6, -24, BC.brightYellow, 'metal');
    b.truss(39.5, 0, -30, 36.6);
    // pipes
    b.part({ pos: [-23, 10, -14], size: [2, 30, 2], color: BC.brightYellow, mat: 'metal', shape: 'cyl', rot: [0, 0, 90] });
    b.part({ pos: [6, 7.5, -30], size: [2, 24, 2], color: BC.brightYellow, mat: 'metal', shape: 'cyl', rot: [0, 0, 90] });
    for (const x of [-30, -10, 10]) b.block(x, 0, -14, 1, 10, 1, BC.darkStone, 'metal');
    // chimney + boiler
    b.cyl(40, 0, 25, 9, 72, BC.brightRed, 'brick');
    for (let i = 0; i < 4; i++) b.cyl(40, 12 + i * 16, 25, 9.6, 2, BC.white, 'metal');
    b.cyl(40, 72, 25, 2, 4, 0xff7a1a, 'neon');
    ladderTo(b, 45.6, 0, 25, 72.4, [48.8, 0, 25], [40, 72, 22.3]);
    b.block(28, 0.2, 25, 10, 8, 10, BC.darkStone, 'metal', { tags: ['fire'] });
    b.cyl(28, 8.2, 25, 3, 4, BC.mediumStone, 'metal');
    // control building
    b.building({ x: -18, z: 34, w: 34, d: 22, floors: 2, fh: 12, color: BC.brickYellow, mat: 'brick', trim: BC.brightRed, spacing: 7, interior: (bb, i) => desks(b, i) });
    b.sign(-18, 8.4, 45.2, 18, 2.2, 'RAKISH REFINERY', { bg: '#7a1d1d' });
    ringSpawns(b, 55, 12); b.spawn(0, 0, 10); b.spawn(10, 0, -5);
  },
};
