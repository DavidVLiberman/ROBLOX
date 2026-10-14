// Prison Panic
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Prison Panic',
  build(b) {
    b.box(-65, 0, -55, 65, 0.2, 55, BC.mediumStone, 'concrete');
    b.building({
      x: 0, z: -15, w: 70, d: 42, floors: 2, fh: 13, t: 2.2, color: BC.mediumStone, mat: 'concrete', trim: BC.darkStone, spacing: 9, winW: 2, winH: 3, floorColor: BC.darkStone, floorMat: 'concrete', glassColor: 0x8faabb,
      interior: (bb, i) => {
        // cells on ground floor
        for (let c = 0; c < 6; c++) {
          const x = -28 + c * 9;
          b.box(x, 0.3, -12, x + 0.6, 10, -3, BC.darkStone, 'concrete');
          for (let k = 0; k < 4; k++) b.box(x + 1 + k * 2, 0.3, -3.3, x + 1.4 + k * 2, 10, -2.9, BC.black, 'metal');
          b.block(x + 4.5, 0.3, -10, 6, 1.5, 2.5, BC.white, 'fabric');
        }
        b.box(26, 0.3, -12, 26.6, 10, -3, BC.darkStone, 'concrete');
        // cafeteria on the 2nd floor
        const y = i.levelY(1);
        for (const x of [-20, -6, 8]) { b.table(x, y, -14, 10, 3, BC.mediumStone); b.bench(x, -16.5, 0, BC.mediumStone); }
        trashCan(b, i.ix1 - 2, y, i.iz0 + 2, true);   // (kept out of the stairwell)
      },
    });
    b.sign(0, 9, 6.2, 16, 2.4, 'STATE PRISON', { bg: '#3a3f46' });
    // yard fence
    const F = 52;
    // (a gate in the fence lines up with the prison door)
    for (const [a, c, d, e] of [[-F, 15, -7, 15], [7, 15, F, 15], [-F, 50, F, 50], [-F, 15, -F, 50], [F, 15, F, 50]]) {
      const len = Math.hypot(d - a, e - c);
      const n = Math.round(len / 8);
      for (let k = 0; k <= n; k++) b.block(a + (d - a) * k / n, 0, c + (e - c) * k / n, 0.6, 14, 0.6, BC.darkStone, 'metal');
      b.part({ pos: [(a + d) / 2, 13.6, (c + e) / 2], size: [Math.abs(d - a) + 0.6, 0.4, Math.abs(e - c) + 0.6], color: BC.darkStone, mat: 'metal' });
      b.part({ pos: [(a + d) / 2, 7, (c + e) / 2], size: [Math.abs(d - a) + 0.2, 13, Math.abs(e - c) + 0.2], color: 0x9aa3a8, mat: 'glass', tags: ['glass'] });
    }
    b.block(0, 0.2, 32, 18, 0.3, 12, BC.darkStone, 'asphalt');
    b.cyl(0, 0, 32, 0.4, 10, BC.white, 'metal'); b.block(0, 10, 31.65, 4, 3, 0.3, BC.white, 'wood');
    // guard towers
    for (const sx of [-1, 1]) {
      const x = sx * 58, z = 48;
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.block(x + ox, 0, z + oz, 1, 22, 1, BC.darkStone, 'metal');
      b.block(x, 22, z, 9, 1, 9, BC.darkStone, 'metal');
      b.block(x, 23, z + 4.3, 9, 3, 0.4, BC.darkStone, 'metal');   // half wall on the outer edge
      for (const [ox, oz] of [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]]) b.block(x + ox, 23, z + oz, 0.5, 6.5, 0.5, BC.darkStone, 'metal');
      b.block(x, 29.5, z, 10, 1, 10, BC.darkStone, 'metal');   // high enough to step off the ladder under it
      b.truss(x - sx * 5.6, 0, z, 23.2);
      b.spot('high', x, 23, z, [V(x - sx * 8, 0, z), V(x - sx * 5.6, 23, z), V(x, 23, z)]);
    }
    ringSpawns(b, 30, 6, 0, 0, 30); b.spawn(-55, 0, -45); b.spawn(55, 0, -45); b.spawn(-60, 0, 5); b.spawn(60, 0, 5);
  },
};
