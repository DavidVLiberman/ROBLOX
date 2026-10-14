// Safety Second
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Safety Second',
  build(b) {
    b.box(-60, 0, -50, 60, 0.2, 50, BC.dirt, 'sand');
    // steel frame of an unfinished building
    const xs = [-30, -15, 0, 15], zs = [-30, -18, -6];
    for (let l = 0; l < 3; l++) {
      const y = l * 12;
      for (const x of xs) for (const z of zs) b.block(x, y, z, 1.2, 12, 1.2, BC.brightOrange, 'metal');
      for (const z of zs) b.box(-30.6, y + 11.4, z - 0.6, 15.6, y + 12, z + 0.6, BC.brightOrange, 'metal');
      for (const x of xs) b.box(x - 0.6, y + 11.4, -30.6, x + 0.6, y + 12, -5.4, BC.brightOrange, 'metal');
      if (l < 2) b.box(-30, y + 12, -30, l === 0 ? 15 : 0, y + 12.6, -6, BC.mediumStone, 'concrete');
    }
    // scaffolding with ladders
    for (let l = 0; l < 3; l++) {
      const y = l * 10;
      for (const x of [-30, -20, -10, 0, 10]) for (const z of [-2, 2]) b.block(x, y, z, 0.4, 10, 0.4, BC.mediumStone, 'metal');
      b.box(-30, y + 9.6, -2, 10, y + 10, 2, BC.nougat, 'wood', { tags: ['flammable'] });
    }
    b.truss(12, 0, 0, 30.4);
    b.spot('high', -10, 30, 0, [V(15, 0, 0), V(12, 30, 0), V(0, 30, 0)]);
    // crane
    b.block(40, 2, -25, 2, 58, 2, BC.brightYellow, 'metal');
    ladderTo(b, 40, 0, -21.5, 62.4, [40, 0, -18], [30, 62, -25]);
    b.sign(-10, 10.2, 2.4, 14, 3, 'SAFETY SECOND', { bg: '#f2b50f', fg: '#1b1b1b' });
    b.block(40, 0, -25, 6, 2, 6, BC.brightYellow, 'concrete');
    b.box(10, 60, -26, 60, 62, -24, BC.brightYellow, 'metal');
    b.block(56, 56, -25, 5, 4, 3, BC.darkStone, 'concrete');
    b.block(14, 50, -25, 0.3, 10, 0.3, BC.black, 'metal');
    b.block(14, 48, -25, 4, 2, 4, BC.brightYellow, 'metal');
    // material lockers (fire)
    for (let i = 0; i < 4; i++) b.block(-40 + i * 3.2, 0.2, 20, 3, 7, 3, BC.brightBlue, 'metal', { tags: i === 1 ? ['fire'] : [] });
    // dirt piles, cones, portable toilet, cement mixer
    b.part({ pos: [30, 3, 25], size: [16, 6, 16], color: BC.dirt, mat: 'sand', shape: 'frustum' });
    for (let i = 0; i < 8; i++) b.part({ pos: [-20 + i * 6, 1, 38], size: [1.5, 2, 1.5], color: BC.brightOrange, mat: 'plastic', shape: 'cone' });
    b.block(-50, 0.2, -40, 4, 8, 4, BC.brightBlue, 'plastic');
    b.cyl(45, 2, 40, 5, 6, BC.brightOrange, 'metal'); b.block(45, 0.2, 40, 7, 2, 8, BC.darkStone, 'metal');
    ringSpawns(b, 45, 12);
  },
};
