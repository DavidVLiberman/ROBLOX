// Furious Station
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Furious Station',
  build(b) {
    b.box(-60, 0, -45, 60, 0.2, 45, BC.darkStone, 'asphalt');
    // canopy
    for (const x of [-18, 0, 18]) for (const z of [8, 28]) b.block(x, 0, z, 1.6, 14, 1.6, BC.white, 'metal');
    b.box(-24, 14, 2, 24, 16, 34, BC.brightRed, 'metal');
    b.box(-24, 13.3, 2, 24, 14, 34, BC.white, 'plastic');
    for (const x of [-9, 9]) for (const z of [12, 24]) {
      b.block(x, 0.2, z, 3, 0.6, 5, BC.mediumStone, 'concrete');
      b.block(x, 0.8, z, 2, 5, 2.5, BC.white, 'metal');
      b.block(x, 5.8, z, 2.2, 1, 2.7, BC.brightRed, 'plastic');
    }
    // store with microwaves
    b.building({
      x: 0, z: -24, w: 40, d: 20, floors: 1, fh: 13, color: BC.white, mat: 'brick', trim: BC.brightRed, spacing: 7, winW: 5, winH: 6, floorColor: BC.mediumStone, floorMat: 'concrete', roofAccess: true,
      interior: () => {
        b.box(-16, 0.3, -27.5, 0, 3.5, -25.5, BC.brightRed, 'wood');   // counter (clear of the stairs)
        b.block(-13, 3.5, -26.5, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
        b.block(-9, 3.5, -26.5, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
        for (const x of [6, 12]) b.box(x - 1, 0.3, -32, x + 1, 6, -20, BC.lightBlue, 'metal');
        b.block(16, 0.3, -31, 4, 8, 3, BC.brightBlue, 'glass', { tags: ['glass'] });
      },
    });
    b.cyl(44, 0, -30, 1.5, 30, BC.mediumStone, 'metal');
    b.sign(44, 30, -30, 14, 7, 'FURIOUS\nSTATION', { bg: '#c4281c', depth: 1 });
    b.sign(0, 9, -13.8, 16, 2.6, 'FOOD MART', { bg: '#c4281c' });
    ladderTo(b, -25.5, 0, 20, 16.4, [-29, 0, 20], [-12, 16, 20]);
    b.block(38, 0.2, 40, 4, 5, 3, BC.brightBlue, 'metal');
    b.car(-9, 36, 0, BC.brightYellow); b.car(30, 15, 90, BC.white);
    for (const [x, z] of [[-50, 30], [50, 38], [-52, -30]]) b.tree(x, z);
    ringSpawns(b, 45, 12);
  },
};
