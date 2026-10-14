// Fort Indestructible
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Fort Indestructible',
  build(b) {
    const H = 14, S = 55, T = 4, col = BC.darkStone;
    b.box(-S, 0, -S, S, 0.2, S, BC.sand, 'sand');
    // perimeter walls (gate on the south)
    for (let x = -S; x < S; x += 22) {
      const x1 = Math.min(S, x + 22);
      b.box(x, 0, -S, x1, H, -S + T, col, 'slate');
      if (!(x >= -11 && x < 11)) b.box(x, 0, S - T, x1, H, S, col, 'slate');
      else { b.box(x, 9, S - T, x1, H, S, col, 'slate'); }
    }
    for (let z = -S + T; z < S - T; z += 22) {
      const z1 = Math.min(S - T, z + 22);
      b.box(-S, 0, z, -S + T, H, z1, col, 'slate');
      b.box(S - T, 0, z, S, H, z1, col, 'slate');
    }
    // corner towers with ladders
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (S - 4), cz = sz * (S - 4);
      b.block(cx, 0, cz, 12, 24, 12, BC.mediumStone, 'slate');
      for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.block(cx + ox, 24, cz + oz, 2, 3, 2, BC.mediumStone, 'slate');
      b.truss(cx - sx * 7, 0, cz - sz * 7 + sz * 3, 24.4);
      b.spot('high', cx, 24, cz, [V(cx - sx * 9, 0, cz - sz * 9), V(cx - sx * 7, 24, cz - sz * 4), V(cx, 24, cz)]);
    }
    // ladders onto the wall walkways + gate sign
    ladderTo(b, 10, 0, -50, 14.4, [10, 0, -46.5], [10, 14, -53]);
    ladderTo(b, -50, 0, 20, 14.4, [-46.5, 0, 20], [-53, 14, 20]);
    b.sign(0, 10, 55.2, 18, 3, 'FORT INDESTRUCTIBLE', { bg: '#3d4a2f' });
    // keep
    b.building({ x: -10, z: -20, w: 34, d: 24, floors: 2, color: BC.mediumStone, mat: 'slate', floorColor: BC.darkStone, floorMat: 'concrete', spacing: 9, winW: 2, winH: 4 });
    // tanks
    const tank = (x, z, rot, fire) => {
      const r = rot * DEG;
      b.part({ pos: [x, 2, z], size: [8, 3, 12], color: BC.darkGreen, mat: 'metal', rot: [0, rot, 0], tags: fire ? ['fire'] : [] });
      b.part({ pos: [x, 4.5, z], size: [5, 2, 6], color: 0x3f6b3a, mat: 'metal', rot: [0, rot, 0] });
      b.part({ pos: [x + Math.sin(r) * 6, 4.6, z + Math.cos(r) * 6], size: [0.8, 0.8, 7], color: 0x3f6b3a, mat: 'metal', rot: [0, rot, 0] });
      for (const s of [-1, 1]) b.part({ pos: [x + Math.cos(r) * s * 4.4, 1.2, z - Math.sin(r) * s * 4.4], size: [1.4, 2.4, 13], color: BC.reallyBlack, mat: 'metal', rot: [0, rot, 0] });
    };
    tank(32, 0, 0, true); tank(30, 30, 30, false); tank(-36, 25, -20, false);
    // helicopters on pads
    const heli = (x, z) => {
      b.cyl(x, 0, z, 18, 0.3, BC.mediumStone, 'concrete');
      b.block(x, 0.3, z, 6, 6, 10, 0x4a5a3a, 'metal');
      b.block(x, 2.5, z - 10, 1.5, 1.5, 10, 0x4a5a3a, 'metal');
      b.cyl(x, 6.3, z, 0.6, 1, BC.black, 'metal');
      b.block(x, 7.3, z, 22, 0.3, 1, BC.black, 'metal');
      b.block(x, 7.3, z, 1, 0.3, 22, BC.black, 'metal');
      b.chair(x, 0.3, z + 2, 0, BC.black);
    };
    heli(-30, 30); heli(18, -38);
    b.spawn(0, 0, 40); b.spawn(-20, 0, 10); b.spawn(20, 0, 10); b.spawn(-40, 0, -40); b.spawn(40, 0, -20); b.spawn(0, 0, -45);
    b.spawn(0, 0, 70); b.spawn(-30, 0, 70); b.spawn(30, 0, 70); b.spawn(-70, 0, 0); b.spawn(70, 0, 0);
  },
};
