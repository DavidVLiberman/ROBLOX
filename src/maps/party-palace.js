// Party Palace
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Party Palace',
  build(b) {
    b.box(-60, 0, -50, 60, 0.2, 50, BC.sand, 'sand');
    const stall = (x, z, color) => {
      for (const [ox, oz] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) b.block(x + ox, 0, z + oz, 0.6, 8, 0.6, BC.white, 'wood');
      b.block(x, 0, z - 2, 10, 3.5, 2, BC.brown, 'wood', { tags: ['flammable'] });
      b.part({ pos: [x, 8.6, z - 2.4], size: [11, 0.4, 5.6], color, mat: 'fabric', rot: [-25, 0, 0], tags: ['flammable'] });
      b.part({ pos: [x, 8.6, z + 2.4], size: [11, 0.4, 5.6], color, mat: 'fabric', rot: [25, 0, 0], tags: ['flammable'] });
    };
    [[-40, -30], [-20, -30], [0, -30], [20, -30], [40, -30], [-40, 10], [40, 10]].forEach(([x, z], i) => stall(x, z, RAINBOW[i % RAINBOW.length]));
    // popcorn wagon (fire)
    b.block(0, 1.2, 12, 7, 3, 4, BC.brightRed, 'wood', { tags: ['fire'] });
    b.block(0, 4.2, 12, 6, 4, 3.4, 0xfff6c8, 'glass', { tags: ['glass'] });
    b.block(0, 8.2, 12, 7.4, 0.6, 4.4, BC.brightRed, 'wood');
    for (const s of [-1, 1]) b.part({ pos: [s * 2.5, 1.2, 14.4], size: [2.4, 0.5, 2.4], color: BC.black, mat: 'plastic', shape: 'cyl', rot: [0, 0, 90] });
    // bouncy castle
    b.box(-30, 0, 25, -10, 4, 45, BC.brightBlue, 'plastic');
    for (const [x, z] of [[-30, 25], [-10, 25], [-30, 45], [-10, 45]]) { b.cyl(x, 4, z, 4, 8, BC.brightRed, 'plastic'); b.ball(x, 12, z, 4, BC.brightYellow, 'plastic'); }
    b.box(-28, 4, 43, -12, 10, 45, BC.brightYellow, 'plastic');
    // stage
    b.box(15, 0, 28, 45, 4, 45, BC.reddishBrown, 'wood');
    b.box(15, 4, 44, 45, 18, 45, BC.black, 'fabric');
    for (const x of [15, 45]) b.block(x, 4, 30, 1, 14, 1, BC.black, 'metal');
    b.box(14, 18, 28, 46, 19, 46, BC.black, 'metal');
    ladderTo(b, 47.5, 0, 30, 19.4, [50.5, 0, 30], [30, 19, 36]);
    b.sign(0, 8.8, 12, 6, 1.6, 'POPCORN', { bg: '#c4281c' });
    for (const sx of [-10, 10]) b.cyl(sx, 0, -48, 0.8, 10, BC.white, 'metal');
    b.sign(0, 7, -48, 22, 3, 'PARTY PALACE', { bg: '#6a3fb5' });
    // balloons
    for (let i = 0; i < 8; i++) b.ball(-50 + i * 14, 14 + (i % 3) * 3, 48, 3, RAINBOW[i % 6], 'plastic', { tags: ['float'] });
    for (const [x, z] of [[-15, 0], [15, 0]]) { b.table(x, 0.2, z, 6, 3); b.chair(x - 2, 0.2, z + 2.5, 180); b.chair(x + 2, 0.2, z - 2.5, 0); }
    ringSpawns(b, 25, 8); ringSpawns(b, 55, 8);
  },
};
