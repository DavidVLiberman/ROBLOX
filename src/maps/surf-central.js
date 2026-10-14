// Surf Central
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Surf Central',
  build(b) {
    b.box(-60, 0, -50, 60, 0.3, 55, BC.sand, 'sand');
    b.building({
      x: 0, z: -14, w: 36, d: 26, floors: 3, fh: 12, color: BC.teal, mat: 'wood', trim: BC.white, floorColor: BC.nougat, spacing: 7, winW: 4, winH: 5, stairFire: true,
      interior: (bb, i) => {
        for (let k = 0; k < 4; k++) b.part({ pos: [-12 + k * 3, 4, i.iz0 + 1.6], size: [2, 7, 0.4], color: RAINBOW[k], mat: 'plastic', rot: [8, 0, 0] });
        b.box(4, 0.3, 4, 14, 3.6, 6, BC.white, 'wood');
      },
    });
    // lifeguard tower
    for (const [ox, oz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) b.block(30 + ox, 0.3, 30 + oz, 0.8, 12, 0.8, BC.white, 'wood');
    b.block(30, 12.3, 30, 7, 0.8, 7, BC.white, 'wood');
    b.block(30, 19, 30, 8, 0.6, 8, BC.brightRed, 'wood');
    for (const [ox, oz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) b.block(30 + ox, 13.1, 30 + oz, 0.4, 6, 0.4, BC.white, 'wood');
    b.truss(30, 0.3, 34.5, 12.9);
    b.spot('high', 30, 13, 30, [V(30, 0, 37), V(30, 13, 34.5), V(30, 13, 30)]);
    // umbrellas + surfboards + towels
    for (const [x, z, c] of [[-30, 25, BC.brightRed], [-15, 38, BC.brightYellow], [5, 30, BC.brightBlue], [-40, 42, BC.brightGreen]]) {
      b.cyl(x, 0.3, z, 0.4, 8, BC.white, 'metal');
      b.part({ pos: [x, 9, z], size: [9, 2.5, 9], color: c, mat: 'fabric', shape: 'cone' });
      b.block(x + 3, 0.3, z + 2, 3, 0.15, 6, c, 'fabric');
    }
    for (let k = 0; k < 5; k++) b.part({ pos: [40 + k * 3, 3.5, -10], size: [2, 7, 0.4], color: RAINBOW[k], mat: 'plastic', rot: [-10, 0, 0] });
    b.box(-55, 0.3, -48, 55, 1, -42, BC.reddishBrown, 'wood');
    b.sign(0, 8.6, -0.8, 18, 2.6, 'SURF CENTRAL', { bg: '#0b8f8a' });
    for (const [x, z] of [[-50, 10], [50, 15], [-45, -35], [48, -38]]) b.tree(x, z, 1, 'palm');
    ringSpawns(b, 40, 12, 0.3);
  },
};
