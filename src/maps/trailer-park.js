// Trailer Park
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Trailer Park',
  build(b) {
    b.box(-60, 0, -10, 60, 0.2, 2, BC.darkStone, 'asphalt');
    const colors = [BC.white, BC.lightBlue, BC.brickYellow, BC.institutionalWhite, BC.sand, BC.pastelBlue, BC.white, BC.nougat];
    for (let i = 0; i < 8; i++) {
      const x = -48 + (i % 4) * 32, z = i < 4 ? -30 : 22;
      b.building({ x, z, w: 24, d: 11, floors: 1, fh: 9, color: colors[i], mat: 'metal', roof: 'flat', parapet: false, roofColor: BC.mediumStone, roofMat: 'metal', spacing: 6, winW: 3, winH: 3, door: i < 4 ? 'S' : 'N', doorX: -6, doorW: 4, trim: BC.brightRed, noStairs: true, y: 1 });
      for (const ox of [-8, 8]) b.block(x + ox, 0, z, 2, 1, 9, BC.darkStone, 'concrete');
    }
    // water tower + tree (fire)
    const wx = 40, wz = 45;
    for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.block(wx + ox, 0, wz + oz, 1.2, 30, 1.2, BC.mediumStone, 'metal');
    b.block(wx, 30, wz, 14, 1, 14, BC.mediumStone, 'metal');
    b.cyl(wx, 31, wz, 13, 12, BC.lightBlue, 'metal');
    b.part({ pos: [wx, 46, wz], size: [14, 6, 14], color: BC.mediumStone, mat: 'metal', shape: 'cone' });
    b.truss(wx - 7.8, 0, wz, 31.2);
    b.spot('high', wx - 5, 31, wz - 5, [V(wx - 10, 0, wz), V(wx - 7.8, 31, wz), V(wx - 5, 31, wz - 5.5)]);
    b.tree(wx - 16, wz - 4, 1, 'oak', true);
    for (const [x, z] of [[-20, 45], [0, 45]]) { b.table(x, 0, z, 6, 3); b.bench(x, z - 2.5, 0); }
    b.fence(-60, -45, 60, -45); b.fence(-60, 55, 20, 55);
    for (const [x, z] of [[-55, 45], [58, -2], [-58, -2]]) b.tree(x, z, 1, 'pine');
    b.car(-20, -4, 90, BC.brightGreen);
    signPost(b, -54, -14, 'TRAILER PARK', 0, { bg: '#2f6b2f' });
    ringSpawns(b, 20, 6, 0.2, 0, -4); b.spawn(-50, 0, 45); b.spawn(50, 0, 20); b.spawn(0, 0, 50); b.spawn(-50, 0, -50); b.spawn(50, 0, -50);
  },
};
