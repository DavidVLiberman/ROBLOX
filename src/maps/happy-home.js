// Happy Home: a two-storey family house with tan walls, a light-blue floor, arched
// windows, a red roof and a chimney. It's empty inside apart from the dark-brown
// stairs. A grey path leads to the front door, a slide and seesaw sit on the left
// and three pine trees on the right. The fire starts by the back-left window.
import { BC } from '../util.js';
import { V } from './helpers.js';

const TAN = 0xd7c59a, FLOOR = 0xb4d2e4, ROOF = 0xc4281c, STAIRS = 0x5e3a1f;

export default {
  name: 'Happy Home',
  build(b) {
    const X = 0, Z = -12, W = 56, D = 40, FH = 14, WIN = { winW: 4, winH: 6, spacing: 9 };
    const info = b.building({
      x: X, z: Z, w: W, d: D, floors: 2, fh: FH, color: TAN, mat: 'wood', roof: 'gable', roofColor: ROOF, roofMat: 'slate',
      floorColor: FLOOR, floorMat: 'wood', stairColor: STAIRS, trim: BC.white, door: 'S', doorW: 6, ladderSide: 'E',
      furnish: false, ...WIN,
    });
    // arched tops on every window
    const x0 = X - W / 2, x1 = X + W / 2, z0 = Z - D / 2, z1 = Z + D / 2;
    for (let k = 0; k < 2; k++) {
      const y = info.levelY(k);
      const along = (a0, a1) => b.windowsAlong(a0, a1, y, { ...WIN, sill: 3 });
      for (const [z, openings] of [[z0, along(x0 + 1, x1 - 1)], [z1, along(x0 + 1, x1 - 1)]]) {
        for (const o of openings) {
          if (k === 0 && z === z1 && o.a < X + 5 && o.b > X - 5) continue;     // no window over the door
          b.part({ pos: [(o.a + o.b) / 2, o.y1, z], size: [WIN.winW, 1.6, WIN.winW], color: 0xa9d4f5, mat: 'glass', shape: 'cyl', rot: [90, 0, 0], tags: ['glass'] });
        }
      }
      for (const [x, openings] of [[x0, along(z0 + 1, z1 - 1)], [x1, along(z0 + 1, z1 - 1)]]) {
        for (const o of openings) b.part({ pos: [x, o.y1, (o.a + o.b) / 2], size: [WIN.winW, 1.6, WIN.winW], color: 0xa9d4f5, mat: 'glass', shape: 'cyl', rot: [0, 0, 90], tags: ['glass'] });
      }
    }
    // brick chimney up the outside of the left wall, past the roof
    b.block(x0 - 2, 0, Z - 6, 4, info.top + 12, 4, BC.brightRed, 'brick');
    // the fire starts at the curtains by the back-left window, first floor
    b.block(x0 + 5, 0.3, z0 + 1.6, 4, 7, 0.4, BC.white, 'fabric', { tags: ['fire', 'flammable'] });

    // grey path from the road to the front door
    b.box(X - 4, 0, z1, X + 4, 0.25, 100, BC.mediumStone, 'concrete');
    b.box(X - 10, 0, 92, X + 10, 0.25, 104, BC.mediumStone, 'concrete');
    for (const x of [-14, -9, 9, 14]) b.bush(x, z1 + 3, 0.9);

    // playground on the left: yellow slide with a blue frame, and a seesaw
    const sx = -62, sz = 6;
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.block(sx + dx, 0, sz + dz, 0.8, 8, 0.8, BC.brightBlue, 'metal');
    b.block(sx, 8, sz, 5, 0.6, 5, BC.brightBlue, 'metal');
    b.truss(sx, 0, sz - 3.4, 8.6);
    b.part({ pos: [sx, 4.2, sz + 9.5], size: [3.6, 8.4, 14], color: BC.brightYellow, mat: 'plastic', shape: 'wedge' });
    for (const s of [-1, 1]) b.block(sx + s * 2, 8.6, sz, 0.4, 2, 5, BC.brightBlue, 'metal');
    b.spot('high', sx, 8.6, sz, [V(sx, 0, sz - 6), V(sx, 8.6, sz - 3.4), V(sx, 8.6, sz)]);
    const ssx = -60, ssz = 32;
    b.block(ssx, 0, ssz, 1.6, 1.8, 1.6, BC.brightBlue, 'metal');
    b.part({ pos: [ssx, 2.2, ssz], size: [1.4, 0.5, 16], color: BC.brightYellow, mat: 'wood', rot: [8, 0, 0] });
    for (const s of [-1, 1]) b.block(ssx, 2.2 + s * -1.1 + 0.4, ssz + s * 7, 1.2, 0.3, 1.2, BC.brightBlue, 'plastic', { tags: ['seat'] });

    // three dark-green pines on the right
    for (const [x, z, s] of [[52, -18, 1.2], [62, 2, 1.0], [54, 24, 1.15]]) b.tree(x, z, s, 'pine');

    // everyone arrives at the end of the path
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0, 86 + Math.floor(i / 4) * 6);
  },
};
