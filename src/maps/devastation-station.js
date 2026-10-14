// Devastation Station
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Devastation Station',
  build(b) {
    for (const tz of [-46, -16]) {
      for (let x = -72; x <= 72; x += 8) b.block(x, 0, tz, 1.4, 0.4, 8, BC.reddishBrown, 'wood');
      for (const o of [-2.2, 2.2]) b.box(-74, 0.4, tz + o - 0.3, 74, 1.1, tz + o + 0.3, BC.darkStone, 'metal');
    }
    // platform
    b.box(-60, 0, -41.9, 60, 3, -24, BC.mediumStone, 'concrete');   // runs right up to the train
    for (let x = -50; x <= 50; x += 20) for (const z of [-36, -26]) b.block(x, 3, z, 1.2, 12, 1.2, BC.darkStone, 'metal');
    b.box(-56, 15, -39, 56, 16, -23, BC.brightGreen, 'metal');
    b.bench(-30, -31, 0); b.bench(0, -31, 0); b.bench(30, -31, 0);
    b.sign(0, 13, -31, 14, 2, 'PLATFORM 1', { bg: '#1b3a6b' });
    ladderTo(b, -57.5, 3, -31, 13.4, [-57.5, 3, -27.5], [-48, 16, -31]);
    // stairs onto platform
    for (let i = 0; i < 3; i++) b.box(-6, 0, -24 + i * 1.3, 6, 3 - i, -24 + (i + 1) * 1.3, BC.mediumStone, 'concrete');
    // train
    for (let c = 0; c < 3; c++) {
      const x = -40 + c * 26;
      b.box(x - 11, 1.1, -50, x + 11, 3, -42, BC.darkStone, 'metal');
      b.building({ x, z: -46, w: 22, d: 8, floors: 1, fh: 9, y: 3, color: c === 0 ? BC.brightRed : BC.mauve, mat: 'metal', floorColor: BC.darkStone, roof: 'flat', parapet: false, spacing: 5, winW: 3, winH: 3, door: 'S', noStairs: true, roofColor: BC.darkStone, groundTile: false });
    }
    // station building, coal loading dock on the 2nd floor
    b.building({
      x: 0, z: 22, w: 44, d: 24, floors: 2, color: BC.brightRed, mat: 'brick', trim: BC.white, floorColor: BC.reddishBrown, door: 'N', doorX: 0,
      interior: (bb, i) => {
        b.table(-10, 0.3, 22, 8, 3); b.table(10, 0.3, 22, 8, 3);
        b.chair(-10, 0.3, 19, 0); b.chair(10, 0.3, 19, 0);
        // coal dock balcony on east side at floor 2
        const y = i.levelY(1);
        b.box(22, y - 1, 12, 34, y, 32, BC.darkStone, 'metal');
        for (let k = 0; k < 4; k++) b.block(26 + (k % 2) * 4, y, 16 + k * 4, 3.5, 2.5, 3.5, BC.reallyBlack, 'slate', { tags: k === 1 ? ['fire', 'flammable'] : ['flammable'] });
        b.block(15, y, 22, 3, 2.5, 3, BC.reallyBlack, 'slate', { tags: ['flammable'] });
        b.box(33.5, y, 12, 34, y + 3, 32, BC.black, 'metal');
        b.truss(34.5, 0, 34, y + 0.5);
      },
    });
    b.sign(0, 8.4, 9.8, 18, 2.4, 'DEVASTATION STATION', { bg: '#7a1d1d', rotY: 180 });
    b.lamp(-30, 0); b.lamp(30, 0);
    b.tree(-55, 30); b.tree(55, 50); b.tree(-50, 55, 1.1);
    for (const x of [-50, -20, 20, 50]) b.spawn(x, 3, -31);
    ringSpawns(b, 50, 10, 0, 0, 25);
  },
};
