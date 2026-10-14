// Raving Raceway
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Raving Raceway',
  build(b) {
    // oval track
    const segs = 28, rx = 62, rz = 42, wTrack = 16;
    for (let i = 0; i < segs; i++) {
      const a = i / segs * Math.PI * 2, a2 = (i + 1) / segs * Math.PI * 2;
      const x1 = Math.cos(a) * rx, z1 = Math.sin(a) * rz, x2 = Math.cos(a2) * rx, z2 = Math.sin(a2) * rz;
      const len = Math.hypot(x2 - x1, z2 - z1);
      b.part({ pos: [(x1 + x2) / 2, 0.1, (z1 + z2) / 2], size: [wTrack, 0.2, len + 3], color: 0x3a3a3a, mat: 'asphalt', rot: [0, Math.atan2(x2 - x1, z2 - z1) / DEG, 0] });
      if (i % 2 === 0) {
        const ox = Math.cos(a) * (wTrack / 2 + 1.5), oz = Math.sin(a) * (wTrack / 2 + 1.5) * rx / rz;
        b.part({ pos: [x1 + ox * 0.95, 1, z1 + oz * 0.7], size: [1, 2, len], color: i % 4 ? BC.white : BC.brightRed, mat: 'plastic', rot: [0, Math.atan2(x2 - x1, z2 - z1) / DEG, 0] });
      }
    }
    for (let k = 0; k < 8; k++) b.block(rx - 7 + k * 2, 0.2, 0, 2, 0.1, 2, k % 2 ? BC.white : BC.black, 'plastic');
    // grandstand (stepped seats)
    for (let r = 0; r < 5; r++) b.box(-30, 0, -10 + r * 3, 30, 1.5 + r * 1.8, -10 + (r + 1) * 3, BC.mediumStone, 'concrete');
    for (let r = 0; r < 5; r++) for (let x = -26; x <= 26; x += 6) b.part({ pos: [x, 1.7 + r * 1.8, -8.5 + r * 3], size: [2, 0.4, 1.6], color: BC.brightBlue, mat: 'plastic', tags: ['seat'] });
    for (const x of [-30, 0, 30]) b.block(x, 0, 6, 1, 16, 1, BC.darkStone, 'metal');
    b.box(-31, 16, -11, 31, 17, 7, BC.brightRed, 'metal');
    b.sign(0, 13.4, 7.2, 30, 2.6, 'RAVING RACEWAY', { bg: '#c4281c' });
    ladderTo(b, -32.5, 0, -2, 17.4, [-36, 0, -2], [-15, 17, -2]);
    // pit garage + control tower
    b.building({ x: 0, z: 22, w: 40, d: 12, floors: 1, fh: 9, color: BC.white, mat: 'metal', windows: false, door: 'N', doorW: 30, roofAccess: false });
    b.building({ x: -6, z: -30, w: 26, d: 18, floors: 3, fh: 10, color: BC.white, mat: 'concrete', trim: BC.brightRed, spacing: 6, winW: 4, winH: 5, door: 'S' });
    // tire stacks
    for (const [x, z] of [[-75, 0], [75, 18], [75, -18], [-70, 25], [-70, -25]]) for (let k = 0; k < 3; k++) b.cyl(x, k * 1.2, z, 3, 1.2, BC.reallyBlack, 'plastic');
    b.car(52, -18, 0, BC.brightYellow, { fire: true });
    b.car(70, -10, 0, BC.brightRed); b.car(-62, 6, 180, BC.brightBlue); b.car(-52, -14, 180, BC.brightGreen);
    ringSpawns(b, 40, 6, 0, 0, 0); b.spawn(62, 0, 0); b.spawn(-62, 0, 0); b.spawn(0, 0, 42); b.spawn(0, 0, -42);
  },
};
