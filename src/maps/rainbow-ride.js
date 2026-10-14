// Rainbow Ride
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Rainbow Ride',
  build(b) {
    b.box(-60, 0, -50, 60, 0.2, 50, BC.mediumStone, 'concrete');
    const cx = 0, cy = 38, cz = -18, R = 30, n = 24;
    // A-frame legs
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const leg = { x: cx + sx * 16, z: cz + sz * 5 };
      const ang = Math.atan2(16, cy) / DEG * sx;
      b.part({ pos: [(leg.x + cx) / 2, cy / 2, leg.z], size: [2, Math.hypot(16, cy) + 1, 2], color: BC.white, mat: 'metal', rot: [0, 0, ang] });
    }
    b.part({ pos: [cx, cy, cz], size: [4, 14, 4], color: BC.white, mat: 'metal', shape: 'cyl', rot: [90, 0, 0], tags: ['hub'] });
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
      const x1 = cx + Math.cos(a) * R, y1 = cy + Math.sin(a) * R, x2 = cx + Math.cos(a2) * R, y2 = cy + Math.sin(a2) * R;
      const ang = Math.atan2(y2 - y1, x2 - x1) / DEG;
      for (const sz of [-3, 3]) b.part({ pos: [(x1 + x2) / 2, (y1 + y2) / 2, cz + sz], size: [Math.hypot(x2 - x1, y2 - y1) + 0.5, 1.2, 1.2], color: RAINBOW[Math.floor(i / 4) % 6], mat: 'neon', rot: [0, 0, ang] });
      if (i % 2 === 0) {
        b.part({ pos: [cx + Math.cos(a) * R / 2, cy + Math.sin(a) * R / 2, cz], size: [R, 0.8, 0.8], color: BC.white, mat: 'metal', rot: [0, 0, a / DEG] });
        const gx = x1, gy = y1 - 4;
        const car = b.block(gx, gy - 2, cz, 5, 4, 5, i === 6 ? BC.navy : RAINBOW[(i / 2) % 6], 'metal', { tags: i === 6 ? ['fire'] : [] });
        b.block(gx, gy + 2, cz, 0.6, 2.4, 0.6, BC.white, 'metal');
        void car;
      }
    }
    // ladder up to a deck on top of the hub
    b.box(-3, 40, -24, 3, 40.6, -9.8, BC.white, 'metal');
    ladderTo(b, 0, 0, cz + 8.5, 40.4, [0, 0, cz + 12], [0, 40.6, -14]);
    // carousel
    b.cyl(-35, 0, 25, 22, 1.2, BC.brightRed, 'wood');
    b.cyl(-35, 1.2, 25, 2, 12, BC.gold, 'metal');
    b.part({ pos: [-35, 15, 25], size: [24, 6, 24], color: BC.brightYellow, mat: 'fabric', shape: 'cone' });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const x = -35 + Math.cos(a) * 8, z = 25 + Math.sin(a) * 8;
      b.cyl(x, 1.2, z, 0.4, 10.8, BC.gold, 'metal');
      b.part({ pos: [x, 4, z], size: [1.2, 1.4, 3], color: RAINBOW[i % 6], mat: 'plastic', tags: ['seat'] });
    }
    // ticket booth + candy stand
    b.building({ x: 35, z: 30, w: 14, d: 12, floors: 1, fh: 10, color: BC.pink, mat: 'wood', roof: 'gable', roofColor: BC.white, spacing: 5, winW: 3, roofAccess: false, furnish: false });
    b.sign(35, 7.6, 36.2, 7, 1.5, 'TICKETS', { bg: '#c2185b' });
    b.block(10, 0.2, 35, 6, 4, 3, BC.pink, 'wood'); b.ball(10, 4.2, 35, 3, BC.pink, 'fabric');
    for (const [x, z] of [[-55, -40], [55, -40], [-55, 0], [55, 0]]) b.tree(x, z, 0.9);
    ringSpawns(b, 50, 12); b.spawn(0, 0, 20); b.spawn(0, 0, 40);
  },
};
