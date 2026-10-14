// Factory Frenzy
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Factory Frenzy',
  build(b) {
    b.box(-70, 0, -50, 70, 0.2, 50, BC.darkStone, 'asphalt');
    b.building({
      x: -6, z: 0, w: 64, d: 42, floors: 3, fh: 13, color: BC.mediumStone, mat: 'metal', floorColor: BC.darkStone, floorMat: 'concrete', spacing: 9, winW: 5, winH: 5,
      trim: BC.brightOrange, door: 'S', doorX: 10, doorW: 10, stairColor: BC.brightYellow,
      interior: (bb, i) => {
        b.box(-30, 0.3, -2, 10, 3, 2, BC.black, 'metal');                 // conveyor
        for (let x = -26; x <= 6; x += 8) b.block(x, 3, 0, 2.5, 2.5, 2.5, BC.brown, 'wood');
        for (let k = 0; k < 3; k++) {
          const y = i.levelY(k);
          b.block(-20, y, 10, 8, 5, 6, BC.brightBlue, 'metal');
          b.block(14, y, 10, 6, 4, 6, BC.brightYellow, 'metal');
        }
        // 2nd floor lighting (fire start)
        const y2 = i.levelY(1);
        for (let x = -24; x <= 16; x += 10) b.block(x, y2 + 11.4, 6, 6, 0.6, 1.2, 0xfff2b0, 'neon', { tags: x === -4 ? ['fire'] : [] });
      },
    });
    b.cyl(36, 0, -12, 8, 64, BC.brightRed, 'brick');
    b.cyl(36, 64, -12, 9, 2, BC.darkStone, 'metal');
    ladderTo(b, 41.2, 0, -12, 66.4, [44.5, 0, -12], [36, 66, -12]);
    b.sign(-6, 30.5, 21.2, 26, 4, 'FACTORY FRENZY', { bg: '#c25d14' });
    for (let i = 0; i < 6; i++) b.block(40 + (i % 3) * 4, Math.floor(i / 3) * 4, 30, 3.8, 4, 3.8, BC.brown, 'wood', { tags: ['flammable'] });
    b.block(48, 0, 12, 10, 9, 22, BC.white, 'metal'); b.block(48, 0, -2, 9, 6, 7, BC.brightBlue, 'metal');
    b.lamp(-50, 32); b.lamp(30, 40);
    ringSpawns(b, 55, 12);
  },
};
