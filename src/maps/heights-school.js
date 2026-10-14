// Heights School
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Heights School',
  build(b) {
    const hy = 8;
    b.box(-50, 0, -40, 50, hy, 30, BC.grass, 'grass');
    // stairs up the hill on the south side
    for (let i = 0; i < 8; i++) b.box(-8, 0, 30 + (7 - i) * 1.5, 8, i + 1, 30 + (8 - i) * 1.5, BC.mediumStone, 'concrete');
    b.ramp(V(0, 0, 45), V(0, hy, 27));
    b.part({ pos: [-40, hy / 2, 37], size: [12, hy, 14], color: BC.grass, mat: 'grass', shape: 'wedge', rot: [0, 0, 0] });
    b.part({ pos: [40, hy / 2, 37], size: [12, hy, 14], color: BC.grass, mat: 'grass', shape: 'wedge', rot: [0, 0, 0] });
    const info = b.building({
      x: 0, z: -10, w: 64, d: 28, floors: 2, fh: 12, y: hy, color: BC.brightRed, mat: 'brick', trim: BC.white, floorColor: BC.mediumStone, floorMat: 'concrete', spacing: 8,
      interior: (bb, i) => {
        for (let k = 0; k < 2; k++) {
          const y = i.levelY(k);
          for (const x of [-20, -12, 12, 20]) for (const z of [-12, -6]) { b.table(x, y, z, 3, 2, BC.lightBlue); b.chair(x, y, z + 2, 180, BC.brightBlue); }
        }
        trashCan(b, 3, i.levelY(1), -4, true);
      },
    });
    // clock tower on the roof
    const ty = info.top;
    b.block(0, ty, -10, 10, 18, 10, BC.brightRed, 'brick');
    b.part({ pos: [0, ty + 13, -4.9], size: [6, 6, 0.3], color: BC.white, mat: 'plastic', shape: 'cyl', rot: [90, 0, 0] });
    b.block(0, ty + 13, -4.6, 0.4, 2.6, 0.2, BC.black, 'plastic');
    b.block(0, ty + 18, -10, 12, 1, 12, BC.white, 'concrete');
    b.truss(0, ty, -2.6, 19.4);
    b.sign(0, hy + 8.4, 4.2, 20, 2.4, 'HEIGHTS SCHOOL', { bg: '#7a1d1d' });
    for (const [x, z] of [[-40, -30], [40, -30], [-35, 15], [35, 15]]) b.tree(x, z, 0.9, 'pine');
    // flagpole + playground
    b.cyl(-30, hy, 20, 0.5, 20, BC.mediumStone, 'metal'); b.block(-27.5, hy + 17, 20, 4.5, 2.6, 0.2, BC.brightBlue, 'fabric');
    b.block(30, 0, 50, 10, 0.3, 10, BC.sand, 'sand');
    b.part({ pos: [30, 3, 50], size: [3, 6, 10], color: BC.brightYellow, mat: 'plastic', shape: 'wedge', rot: [0, 90, 0] });
    for (const x of [-40, -20, 20, 40]) b.spawn(x, hy, 20);
    ringSpawns(b, 60, 8);
  },
};
