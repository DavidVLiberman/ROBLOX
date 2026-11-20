// Lucky Mart: a big supermarket with green walls. Inside are rows of shelves,
// checkouts by the doors, freezers along the back and a dining area with a food
// counter, whose fryer is where the fire starts. Turbine vents spin on the roof, and
// a truss climbs the service tower at the back. Out front is the empty car park.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const GREEN = 0x2e8b3e, Y_AXIS = new THREE.Vector3(0, 1, 0);
const PRODUCTS = [BC.brightRed, BC.brightYellow, BC.brightBlue, 0xf28c28, BC.white, 0x6a3fb5];

export default {
  name: 'Lucky Mart',
  build(b, game) {
    const updates = [];
    // ---------------- the store ----------------
    const st = b.building({
      x: 0, z: -36, w: 72, d: 42, floors: 1, fh: 14, color: GREEN, mat: 'brick', trim: BC.white, floorColor: 0xeeeeea, floorMat: 'plastic',
      door: 'S', doorW: 10, spacing: 8, winW: 6, winH: 7, roofColor: 0x5d6064, furnish: false, ladder: false,
      interior: (bb, i) => {
        // aisles of shelves
        for (let x = i.ix0 + 8; x <= i.ix0 + 38; x += 7.5) {
          b.box(x - 1.2, 0.3, i.iz0 + 9, x + 1.2, 6.5, i.iz1 - 13, BC.mediumStone, 'metal');
          for (let k = 0; k < 4; k++) for (const s of [-1, 1]) b.box(x + s * 1.25 - 0.15, 1 + k * 1.4, i.iz0 + 10, x + s * 1.25 + 0.15, 1.9 + k * 1.4, i.iz1 - 14, PRODUCTS[(k + Math.round(x)) % 6], 'plastic', { collide: false });
        }
        // freezers along the back wall
        b.box(i.ix0 + 8, 0.3, i.iz0 + 5.5, i.ix0 + 44, 3.4, i.iz0 + 7.5, BC.white, 'metal');
        b.box(i.ix0 + 8, 3.4, i.iz0 + 5.6, i.ix0 + 44, 3.6, i.iz0 + 7.4, 0xa9d4f5, 'glass', { tags: ['glass'] });
        // checkouts by the doors
        for (const x of [-22, -12, 12]) {
          b.box(x - 1, 0.3, i.iz1 - 8, x + 1, 3.4, i.iz1 - 3, BC.darkStone, 'metal');
          b.block(x, 3.4, i.iz1 - 4, 1, 1.2, 0.8, BC.black, 'plastic');
        }
        // dining area in the east corner: tables and the food counter
        for (const [x, z] of [[i.ix1 - 6, i.iz1 - 6], [i.ix1 - 14, i.iz1 - 6], [i.ix1 - 6, i.iz1 - 14], [i.ix1 - 14, i.iz1 - 14]]) {
          b.table(x, 0.3, z, 4, 4, BC.white);
          b.chair(x - 2.8, 0.3, z, 90, BC.brightRed); b.chair(x + 2.8, 0.3, z, -90, BC.brightRed);
        }
        b.box(i.ix1 - 20, 0.3, i.iz0 + 12, i.ix1 - 1, 3.6, i.iz0 + 14, BC.brightRed, 'wood');
        b.block(i.ix1 - 6, 0.3, i.iz0 + 10, 3, 3.6, 2.4, BC.darkStone, 'metal', { tags: ['fire'] });
        b.sign(i.ix1 - 10.5, 8, i.iz0 + 0.05, 14, 2, 'LUCKY DINER', { bg: '#c4281c', depth: 0.1 });
      },
    });
    b.sign(0, 9.6, st.z1 + 0.05, 30, 3.4, 'LUCKY MART', { bg: '#2e8b3e', depth: 0.3 });
    b.box(-6, 0, st.z1, 6, 0.2, st.z1 + 3, BC.mediumStone, 'concrete');
    b.box(-8, 13.2, st.z1, 8, 13.8, st.z1 + 4, GREEN, 'metal');

    // ---------------- spinning turbine vents on the roof ----------------
    for (const [x, z] of [[-24, -48], [-8, -48], [8, -48], [24, -48]]) {
      b.cyl(x, st.top, z, 2.4, 2, BC.mediumStone, 'metal');
      const cap = collect(b, () => {
        b.cyl(x, st.top + 2, z, 3, 2.4, 0xb8bbbe, 'metal');
        b.cyl(x, st.top + 4.4, z, 2, 0.6, 0xb8bbbe, 'metal');
        for (let k = 0; k < 6; k++) { const a = k / 6 * 360; b.part({ pos: [x + Math.cos(a * Math.PI / 180) * 1.5, st.top + 3.2, z + Math.sin(a * Math.PI / 180) * 1.5], size: [0.2, 2.4, 0.9], color: 0x8f9194, mat: 'metal', rot: [0, -a, 0], collide: false }); }
      });
      const r = rig(game, cap, V(x, 0, z));
      let a = Math.random() * 6;
      updates.push((dt) => { a += dt * 3; r.set(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(Y_AXIS, a)); });
    }
    for (const x of [-30, 30]) b.block(x, st.top, -26, 6, 3, 4, BC.mediumStone, 'metal');

    // ---------------- service tower at the back, up a truss ----------------
    const TX = 20, TZ = st.z0 - 8, TH = 46;
    b.block(TX, 0, TZ, 8, TH, 8, 0xc9c9c4, 'concrete');
    b.box(TX - 6, TH, TZ - 6, TX + 6, TH + 0.6, TZ + 6, BC.darkStone, 'metal');
    for (const s of [-1, 1]) b.box(TX + s * 6 - 0.2, TH + 0.6, TZ - 6, TX + s * 6 + 0.2, TH + 3.4, TZ + 6, GREEN, 'metal');
    b.box(TX - 6, TH + 0.6, TZ - 6.2, TX + 6, TH + 3.4, TZ - 5.8, GREEN, 'metal');
    b.sign(TX, TH - 10, TZ - 4.05, 7, 7, 'LM', { bg: '#2e8b3e', rotY: 180, depth: 0.1 });
    b.truss(TX - 7, 0, TZ, TH + 0.9);
    b.spot('high', TX + 2, TH + 0.6, TZ + 2, [V(TX - 11, 0, TZ), V(TX - 7, TH + 1, TZ), V(TX - 3, TH + 0.6, TZ), V(TX + 2, TH + 0.6, TZ + 2)]);
    b.box(TX - 3, 0, st.z0 - 2, TX + 3, 0.2, TZ, BC.mediumStone, 'concrete');

    // ---------------- the car park (no cars) ----------------
    b.box(-60, 0, st.z1 + 3, 60, 0.2, 52, 0x3b3b3e, 'asphalt');
    for (let x = -54; x <= 54; x += 9) if (Math.abs(x) > 8) { b.box(x - 0.2, 0.2, 6, x + 0.2, 0.25, 18, BC.white, 'plastic'); b.box(x - 0.2, 0.2, 30, x + 0.2, 0.25, 42, BC.white, 'plastic'); }
    // cart corral and a few carts
    b.box(30, 0.2, 22, 42, 3, 22.3, BC.mediumStone, 'metal');
    b.box(30, 0.2, 26, 42, 3, 26.3, BC.mediumStone, 'metal');
    const cart = (x, z, yaw) => {
      b.part({ pos: [x, 2, z], size: [2.2, 1.6, 3.2], color: 0xb8bbbe, mat: 'metal', rot: [0, yaw, 0] });
      b.part({ pos: [x, 0.7, z], size: [1.8, 1, 2.8], color: BC.darkStone, mat: 'metal', rot: [0, yaw, 0] });
    };
    for (const k of [0, 1, 2]) cart(32.5 + k * 3.2, 24.1, 90);
    cart(-20, 28, 20); cart(14, 10, -40);
    for (const [x, z] of [[-30, 24], [30, 2], [-30, 46], [30, 46]]) b.lamp(x, z, 14);
    // the big pole sign by the road
    b.cyl(-44, 0, 58, 1.4, 22, BC.mediumStone, 'metal');
    b.sign(-44, 22, 58, 16, 7, 'LUCKY\nMART', { bg: '#2e8b3e', depth: 1 });
    for (const x of [-26, -16, 16, 26]) b.bush(x, st.z1 + 1.5, 0.8);
    for (const [x, z] of [[-70, -40], [70, -40], [-75, 20], [75, 20], [-60, -80], [60, -80]]) b.tree(x, z, 1.0);
    b.box(-6, 0, 52, 6, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
