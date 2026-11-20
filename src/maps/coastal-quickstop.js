// Coastal Quickstop: a stop on the coast road. A brown two-storey wooden house with
// a porch and a fireplace (where the fire starts), the little Quickstop shop with its
// fuel pumps, and a path down to the beach, where a wooden dock runs out over the sea
// past a moored rowboat. A striped lighthouse stands on the rocks, its lamp turning.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const BROWN = 0x8a5a32, DARKWOOD = 0x5c3a1e, SANDC = 0xe3d08f, ROCK = 0x6e6a64;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default {
  name: 'Coastal Quickstop',
  build(b, game) {
    const updates = [];
    // ---------------- the brown house ----------------
    const house = b.building({
      x: -42, z: 6, w: 30, d: 22, floors: 2, fh: 11, color: BROWN, mat: 'wood', roof: 'gable', roofColor: DARKWOOD, roofMat: 'wood',
      floorColor: 0xb08a5a, floorMat: 'wood', trim: BC.white, door: 'S', spacing: 8, winW: 4, winH: 5, stairColor: DARKWOOD,
      ladderSide: 'E', furnish: true,
      interior: (bb, i) => {
        // the fireplace on the west wall: the fire starts here
        b.block(i.ix0 + 1, 0.3, i.z0 + 11 - 4, 2, 4, 5, BC.darkStone, 'brick', { tags: ['fire'] });
        b.block(i.ix0 + 0.6, 4.3, i.z0 + 11 - 4, 1.2, 6.4, 3, BC.darkStone, 'brick');
      },
    });
    b.block(house.x0 - 1.5, 0, house.z0 + 7, 3, house.top + 13, 3, 0x9c3b2a, 'brick');
    // porch along the front
    b.box(house.x0 + 2, 0, house.z1, house.x1 - 2, 0.8, house.z1 + 6, DARKWOOD, 'wood');
    for (let x = house.x0 + 2.5; x <= house.x1 - 2; x += 6.25) b.block(x, 0.8, house.z1 + 5.5, 0.6, 8.2, 0.6, BC.white, 'wood');
    b.box(house.x0 + 1.5, 9, house.z1, house.x1 - 1.5, 9.6, house.z1 + 6.5, DARKWOOD, 'wood');
    b.bench(house.x0 + 8, house.z1 + 3, 180, BC.white);

    // ---------------- the Quickstop shop and pumps ----------------
    b.building({
      x: 40, z: 18, w: 26, d: 18, floors: 1, fh: 10, color: 0xf2f2ee, mat: 'concrete', trim: 0x2a9d8f, door: 'S', doorW: 6,
      spacing: 6, winW: 5, winH: 5, roofColor: BC.darkStone, furnish: false, ladder: true, ladderSide: 'E',
      interior: (bb, i) => {
        for (const z of [i.iz0 + 3, i.iz0 + 8]) {
          b.box(i.ix0 + 3, 0.3, z, i.ix1 - 10, 5, z + 1.6, BC.mediumStone, 'metal');
          for (let x = i.ix0 + 4; x < i.ix1 - 10; x += 2.5) b.block(x, 5, z + 0.8, 1.6, 1, 1, [BC.brightRed, BC.brightYellow, BC.brightBlue, BC.brightGreen][Math.floor(x) % 4 & 3], 'plastic');
        }
        b.box(i.ix1 - 7, 0.3, i.iz1 - 7, i.ix1 - 1, 3.8, i.iz1 - 5.6, 0x2a9d8f, 'wood');
      },
    });
    b.sign(40, 10.2, 27.2, 18, 3, 'QUICKSTOP', { bg: '#2a9d8f', depth: 0.3 });
    for (const [x, z] of [[33, 42], [47, 42]]) {
      b.block(x, 0.2, z, 4, 0.6, 2.6, BC.mediumStone, 'concrete');
      b.block(x, 0.8, z, 1.8, 4.6, 1.4, BC.brightRed, 'metal');
      b.block(x, 5.4, z, 2.2, 0.8, 1.8, BC.white, 'plastic');
    }
    for (const [x, z] of [[30, 38], [50, 38], [30, 46], [50, 46]]) b.block(x, 0.2, z, 0.8, 8, 0.8, BC.white, 'metal');
    b.box(28, 8.2, 36, 52, 9, 48, 0x2a9d8f, 'metal');
    b.box(26, 0, 32, 54, 0.2, 52, 0x3b3b3e, 'asphalt');

    // ---------------- paths, beach, dock ----------------
    b.box(-4, 0, -96, 4, 0.2, 104, BC.mediumStone, 'concrete');
    b.box(-30, 0, 20, -4, 0.2, 26, BC.mediumStone, 'concrete');
    b.box(4, 0, 26, 26, 0.2, 32, BC.mediumStone, 'concrete');
    b.box(-72, 0, -128, 72, 0.3, -94, SANDC, 'sand');
    for (const [x, z, c] of [[-40, -110, BC.brightRed], [-18, -116, BC.brightBlue], [26, -112, BC.brightYellow]]) {
      b.cyl(x, 0.3, z, 0.3, 7, BC.white, 'wood');
      b.part({ pos: [x, 7.6, z], size: [8, 1.6, 8], color: c, mat: 'fabric', shape: 'cone' });
      b.block(x + 3, 0.3, z + 1, 2, 0.4, 5, BC.white, 'fabric', { tags: ['seat'] });
    }
    for (const [x, z] of [[-64, -100], [-30, -122], [56, -104], [60, -120], [-66, 40], [70, 60], [-80, -40], [80, -30]]) b.tree(x, z, 1.0, 'palm');
    // the dock, out over the sea
    const DX = -46;
    b.box(DX - 3, 0.3, -174, DX + 3, 1.1, -124, BC.reddishBrown, 'wood');
    b.box(DX - 10, 0.3, -174, DX + 10, 1.1, -164, BC.reddishBrown, 'wood');
    for (let z = -168; z <= -130; z += 8) for (const s of [-1, 1]) b.cyl(DX + s * 3.4, -10, z, 1, 12, DARKWOOD, 'wood');
    for (const s of [-1, 1]) b.cyl(DX + s * 10.4, -10, -169, 1, 12, DARKWOOD, 'wood');
    for (const [x, z] of [[DX - 9, -173], [DX + 9, -173], [DX + 3.4, -148]]) b.cyl(x, 1.1, z, 1, 1.6, BC.darkStone, 'metal');
    b.lamp(DX - 8, -166, 9);
    // moored rowboat
    const BX = DX + 8, BZ = -148;
    b.box(BX - 2.2, -1.4, BZ - 6, BX + 2.2, -0.8, BZ + 6, 0x2f6fb5, 'wood');
    for (const s of [-1, 1]) b.box(BX + s * 2.2 - (s > 0 ? 0.4 : 0), -1.4, BZ - 6, BX + s * 2.2 + (s < 0 ? 0.4 : 0), 0.4, BZ + 6, BC.white, 'wood');
    for (const s of [-1, 1]) b.box(BX - 1.8, -1.4, BZ + s * 6 - (s > 0 ? 0.4 : 0), BX + 1.8, 0.4, BZ + s * 6 + (s < 0 ? 0.4 : 0), BC.white, 'wood');
    b.box(BX - 1.8, -0.8, BZ - 0.6, BX + 1.8, -0.4, BZ + 0.6, BROWN, 'wood', { tags: ['seat'] });
    b.spot('open', DX, 1.1, -168, [V(0, 0.2, -96), V(DX, 0.3, -118), V(DX, 1.1, -168)]);

    // ---------------- lighthouse on the rocks ----------------
    const LX = 96, LZ = -98;
    for (const [dx, dz, w, h, d] of [[0, 0, 26, 3, 22], [-6, 6, 12, 5, 10], [7, -5, 11, 4, 12], [0, 0, 16, 6, 16]]) b.block(LX + dx, 0, LZ + dz, w, h, d, ROCK, 'slate');
    const seg = [[14, 6, 0], [13, 18, 1], [12, 30, 0], [11, 42, 1]];
    for (const [diam, y, k] of seg) b.cyl(LX, y, LZ, diam, 12, k ? BC.brightRed : BC.white, 'concrete');
    const GY = 54;
    b.cyl(LX, GY - 0.6, LZ, 16, 0.6, BC.darkStone, 'metal');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, a2 = (i + 1) / 12 * Math.PI * 2;
      const x1 = LX + Math.cos(a) * 7.8, z1 = LZ + Math.sin(a) * 7.8, x2 = LX + Math.cos(a2) * 7.8, z2 = LZ + Math.sin(a2) * 7.8;
      if (i === 3) continue;   // gap where the ladder comes up
      b.part({ pos: [(x1 + x2) / 2, GY + 1.5, (z1 + z2) / 2], size: [0.3, 3, Math.hypot(x2 - x1, z2 - z1) + 0.2], color: BC.darkStone, mat: 'metal', rot: [0, Math.atan2(x2 - x1, z2 - z1) * 180 / Math.PI + 90, 0] });
    }
    b.cyl(LX, GY, LZ, 8, 6, 0xfff6c8, 'glass', { tags: ['glass'] });
    b.cyl(LX, GY + 6, LZ, 9, 0.6, BC.darkStone, 'metal');
    b.part({ pos: [LX, GY + 8.6, LZ], size: [9, 4.6, 9], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    b.cyl(LX, GY, LZ, 1.2, 2.4, BC.darkStone, 'metal');
    const beam = collect(b, () => {
      b.block(LX, GY + 2.4, LZ, 6.8, 1, 1, 0xfff2b0, 'neon', { collide: false });
      b.block(LX, GY + 2.4, LZ, 1.6, 1.6, 1.6, 0xfff2b0, 'neon', { collide: false });
    });
    const beamRig = rig(game, beam, V(LX, 0, LZ));
    let beamT = 0;
    updates.push((dt) => { beamT += dt; beamRig.set(V(LX, 0, LZ), new THREE.Quaternion().setFromAxisAngle(Y_AXIS, beamT * 1.2)); });
    // ladder up the outside of the tower (on its south side) to the gallery
    const ga = 3 / 12 * Math.PI * 2 + Math.PI / 12;
    const tx = LX + Math.cos(ga) * 6.6, tz = LZ + Math.sin(ga) * 6.6;
    b.truss(tx, 6, tz, GY - 6 + 0.4);
    // round the gallery (between the lantern and the railing) from the ladder
    const ring = [80, 50, 20, -10, -40].map(d => V(LX + Math.cos(d * Math.PI / 180) * 5.9, GY, LZ + Math.sin(d * Math.PI / 180) * 5.9));
    const end = ring[ring.length - 1];
    b.spot('high', end.x, GY, end.z, [V(LX - 4, 0, LZ + 16), V(tx, 6, tz + 3), V(tx, GY + 0.4, tz), ...ring]);
    // steps up the rocks to the foot of the ladder
    for (let k = 0; k < 4; k++) b.box(tx - 2, 0, tz + 3 + (4 - k) * 2.2, tx + 2, 1.5 * (k + 1), tz + 3 + (5 - k) * 2.2, ROCK, 'slate');

    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
