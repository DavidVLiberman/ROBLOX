// Rainbow Ride: a giant rainbow Ferris wheel on a fairground plaza. Twenty gondolas
// hang from its rim and stay level as it slowly turns; you board them from the
// platform at the bottom. A ladder up one of the A-frames reaches a platform beside
// the hub. Round about are the ticket booth, a candy-floss stand and a balloon cart.
// The fire starts in one of the gondolas.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, RAINBOW, rig, collect, signPost } from './helpers.js';

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const NONE = new THREE.Quaternion();

export default {
  name: 'Rainbow Ride',
  build(b, game) {
    const updates = [];
    const WX = 0, WZ = -30, H = 44, R = 36, N = 20;
    // ---------------- plaza ----------------
    b.box(-56, 0, -60, 56, 0.2, 14, 0xd8d2c4, 'concrete');
    for (let i = 0; i < 6; i++) b.box(-3 + 0, 0.2, 14 + i * 12, 3, 0.25, 26 + i * 12, RAINBOW[i], 'plastic');
    b.box(-6, 0, 14, -3, 0.2, 104, BC.mediumStone, 'concrete');
    b.box(3, 0, 14, 6, 0.2, 104, BC.mediumStone, 'concrete');
    // ---------------- the wheel's frame ----------------
    for (const sz of [-1, 1]) {
      const z = WZ + sz * 8;
      for (const sx of [-1, 1]) {
        const ang = Math.atan2(18, H) * 180 / Math.PI;
        b.part({ pos: [WX + sx * 9, H / 2, z], size: [2, Math.hypot(18, H) + 1, 2], color: BC.white, mat: 'metal', rot: [0, 0, sx * ang] });
      }
      b.box(WX - 12, 14, z - 0.5, WX + 12, 15, z + 0.5, BC.white, 'metal');
    }
    b.part({ pos: [WX, H, WZ], size: [4.4, 18, 4.4], color: BC.white, mat: 'metal', shape: 'cyl', rot: [90, 0, 0] });
    // platform beside the hub, up a ladder on the front A-frame
    const PZ = WZ + 10.5;
    const PY = H + 8;
    b.box(WX - 4, PY - 0.6, WZ + 9, WX + 4, PY, WZ + 13, BC.mediumStone, 'metal');
    b.box(WX - 0.6, H, WZ + 9, WX + 0.6, PY - 0.6, WZ + 10, BC.white, 'metal');
    for (const s of [-1, 1]) b.box(WX + s * 4 - 0.2, PY, WZ + 9, WX + s * 4 + 0.2, PY + 3, WZ + 13, BC.brightYellow, 'metal');
    b.box(WX - 4, PY, WZ + 12.8, WX + 1.6, PY + 3, WZ + 13, BC.brightYellow, 'metal');
    b.truss(WX + 3, 0.2, WZ + 14, PY - 0.2 + 0.4);
    b.spot('high', WX - 2, PY, PZ, [V(WX + 3, 0.2, WZ + 18), V(WX + 3, PY + 0.4, WZ + 14), V(WX + 2.6, PY, WZ + 11.4), V(WX - 2, PY, PZ)]);

    // ---------------- the turning wheel ----------------
    const wheel = collect(b, () => {
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, a2 = (i + 1) / N * Math.PI * 2;
        const x1 = WX + Math.cos(a) * R, y1 = H + Math.sin(a) * R, x2 = WX + Math.cos(a2) * R, y2 = H + Math.sin(a2) * R;
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        for (const sz of [-3, 3]) {
          b.part({ pos: [(x1 + x2) / 2, (y1 + y2) / 2, WZ + sz], size: [Math.hypot(x2 - x1, y2 - y1) + 0.6, 1.4, 1.2], color: RAINBOW[Math.floor(i / (N / 6)) % 6], mat: 'neon', rot: [0, 0, ang] });
          if (i % 2 === 0) b.part({ pos: [WX + Math.cos(a) * R / 2, H + Math.sin(a) * R / 2, WZ + sz], size: [R, 0.7, 0.7], color: BC.white, mat: 'metal', rot: [0, 0, a * 180 / Math.PI] });
        }
      }
    });
    const wheelRig = rig(game, wheel, V(WX, H, WZ));
    // gondolas: each keeps level, hanging from its point on the rim
    const gondolas = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, px = WX + Math.cos(a) * R, py = H + Math.sin(a) * R;
      const col = RAINBOW[i % 6];
      const parts = collect(b, () => {
        b.box(px - 0.3, py - 1.6, WZ - 2.95, px + 0.3, py + 0.2, WZ + 2.95, BC.white, 'metal');
        b.box(px - 2.6, py - 2.1, WZ - 2.4, px + 2.6, py - 1.6, WZ + 2.4, col, 'plastic');
        for (const s of [-1, 1]) b.box(px + s * 2.45 - 0.15, py - 6, WZ - 2.4, px + s * 2.45 + 0.15, py - 2.1, WZ + 2.4, col, 'plastic');
        b.box(px - 2.6, py - 6.4, WZ - 2.4, px + 2.6, py - 6, WZ + 2.4, i === 7 ? 0x1b2a6b : BC.white, 'plastic', { tags: i === 7 ? ['fire', 'flammable'] : ['flammable'] });
        for (const s of [-1, 1]) b.box(px + s * 1.2 - 0.8, py - 6, WZ - 0.8, px + s * 1.2 + 0.8, py - 5.6, WZ + 0.8, BC.black, 'fabric', { tags: ['seat'] });
      });
      gondolas.push({ rig: rig(game, parts, V(px, py, WZ)), a });
    }
    let wheelT = 0;
    updates.push((dt) => {
      wheelT += dt;
      const th = wheelT * Math.PI * 2 / 70;
      wheelRig.set(V(WX, H, WZ), new THREE.Quaternion().setFromAxisAngle(Z_AXIS, th));
      for (const g of gondolas) g.rig.set(V(WX + Math.cos(g.a + th) * R, H + Math.sin(g.a + th) * R, WZ), NONE);
    });
    // boarding platform at the bottom, with steps up from the front
    const floorY = H - R - 6.4;
    b.box(WX - 7, 0, WZ - 6, WX + 7, floorY, WZ + 6, BC.mediumStone, 'concrete');
    b.box(WX - 4, 0, WZ + 6, WX + 4, floorY * 0.5, WZ + 8, BC.mediumStone, 'concrete');
    for (const s of [-1, 1]) b.box(WX + s * 7 - 0.2, floorY, WZ - 6, WX + s * 7 + 0.2, floorY + 3, WZ + 6, BC.brightYellow, 'metal');
    signPost(b, WX + 12, WZ + 12, 'RAINBOW RIDE', 0, { bg: '#6a3fb5' });
    // a low fence round the wheel, open at the front
    b.fence(-30, -50, 30, -50, 3, BC.white, 'metal');
    b.fence(-30, -50, -30, -10, 3, BC.white, 'metal');
    b.fence(30, -50, 30, -10, 3, BC.white, 'metal');
    b.fence(-30, -10, -8, -10, 3, BC.white, 'metal');
    b.fence(8, -10, 30, -10, 3, BC.white, 'metal');

    // ---------------- stands round the plaza ----------------
    b.building({ x: 38, z: 2, w: 14, d: 12, floors: 1, fh: 10, color: 0xf2a7c3, mat: 'wood', roof: 'gable', roofColor: BC.white, spacing: 5, winW: 3, door: 'S', furnish: false, ladder: false });
    b.sign(38, 7.4, 8.1, 8, 1.6, 'TICKETS', { bg: '#c2185b', depth: 0.1 });
    // candy floss stand
    b.box(-42, 0.2, 0, -32, 3.6, 4, 0xf2a7c3, 'wood');
    for (const [x, z] of [[-41.6, 0.4], [-32.4, 0.4], [-41.6, 3.6], [-32.4, 3.6]]) b.block(x, 3.6, z, 0.5, 5, 0.5, BC.white, 'wood');
    b.box(-43, 8.6, -0.8, -31, 9.2, 4.8, 0x6ec6e8, 'fabric');
    for (const x of [-40, -37, -34]) b.ball(x, 3.6, 2, 2, x === -37 ? 0x9ad0f5 : 0xf7b6d2, 'fabric');
    b.sign(-37, 9.2, 4.85, 10, 1.4, 'CANDY FLOSS', { bg: '#c2185b', depth: 0.1 });
    // balloon cart
    b.block(-20, 0.2, 8, 3, 2.4, 2, BC.brightRed, 'wood');
    for (let k = 0; k < 6; k++) {
      b.cyl(-20 + (k - 2.5) * 0.4, 2.6, 8, 0.1, 6 + (k % 3), BC.white, 'plastic', { collide: false });
      b.ball(-20 + (k - 2.5) * 0.4 - 0.9, 8.6 + (k % 3), 8, 1.8, RAINBOW[k], 'plastic');
    }
    for (const [x, z] of [[-20, -4], [20, -4]]) b.bench(x, z, 180);
    for (const [x, z] of [[-14, 12], [14, 12], [-48, -40], [48, -40]]) b.lamp(x, z, 11);
    for (const [x, z] of [[-70, 30], [70, 40], [-80, -40], [80, -50], [-50, 60], [50, 66]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.25, 82 + Math.floor(i / 4) * 6);

    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
