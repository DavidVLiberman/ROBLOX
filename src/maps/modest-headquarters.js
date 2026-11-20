// Modest Headquarters: twin office towers on a big grass mound, joined by a glass
// skybridge, with a big red logo on each, two balconies per tower and a fountain
// out front. The fire starts at a table on the 6th floor of the left tower.
import { BC } from '../util.js';

const WALL = 0xd9d4c7, WALL2 = 0xc7d0d9, GLASS = 0x7fc8f8, LOGO = '#c4281c';

export default {
  name: 'Modest Headquarters',
  build(b) {
    // the grass mound, in two low steps you can walk up
    b.box(-76, 0, -36, 76, 1.5, 36, BC.grass, 'grass');
    b.box(-68, 1.5, -30, 68, 3, 30, BC.grass, 'grass');
    const Y = 3, F = 10, FH = 12;
    const towers = [];
    for (const [x, color] of [[-34, WALL], [34, WALL2]]) {
      const left = x < 0;
      const info = b.building({
        x, z: -2, w: 34, d: 30, floors: F, fh: FH, y: Y, color, mat: 'concrete', trim: BC.brightBlue, spacing: 9, winW: 6, winH: 7,
        glassColor: GLASS, floorColor: BC.mediumStone, floorMat: 'plastic', furnish: false, ladder: false, roofAccess: true,
        interior: (bb, i) => {
          // office desks on every other floor
          for (let k = 0; k < F; k += 2) {
            const y = i.levelY(k);
            for (const dx of [-7, 7]) { b.table(x + dx, y, -2, 5, 3, BC.brown); b.chair(x + dx, y, 0.6, 180, BC.black); }
          }
          // the fire: a table on the 6th floor of the left tower
          if (left) b.table(x - 9, i.levelY(5), -10, 4, 3, BC.brown, ['fire']);
        },
      });
      towers.push(info);
      // big red logo near the top of the front
      b.sign(x, info.top - 14, 13.6, 14, 9, 'MHQ', { bg: LOGO, depth: 0.6, glow: false });
      // two balconies on the front of each tower
      for (const k of [4, 8]) {
        const y = info.levelY(k);
        b.box(x - 10, y - 1, 13, x + 10, y, 18, BC.mediumStone, 'concrete');
        b.box(x - 10, y, 17.6, x + 10, y + 3, 18, GLASS, 'glass', { tags: ['glass'] });
        for (const s of [-1, 1]) b.box(x + s * 10 - (s > 0 ? 0.4 : 0), y, 13, x + s * 10 + (s < 0 ? 0.4 : 0), y + 3, 17.6, GLASS, 'glass', { tags: ['glass'] });
      }
    }
    // glass skybridge between the towers on the 5th floor
    const sy = towers[0].levelY(4);
    b.box(-17, sy - 1, -5, 17, sy, 1, BC.darkStone, 'metal');
    b.box(-17, sy, -5, 17, sy + 5, -4.6, GLASS, 'glass', { tags: ['glass'] });
    b.box(-17, sy, 0.6, 17, sy + 5, 1, GLASS, 'glass', { tags: ['glass'] });
    b.box(-17, sy + 5, -5, 17, sy + 5.5, 1, BC.darkStone, 'metal');

    // fountain and the walk up to the doors
    b.cyl(0, 0, 50, 16, 1.6, BC.mediumStone, 'concrete');
    b.cyl(0, 1.6, 50, 13, 0.3, 0x5aa9e6, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(0, 1.6, 50, 2, 9, BC.brightBlue, 'metal');
    b.box(-5, 0, 36, 5, 0.25, 104, BC.mediumStone, 'concrete');
    b.box(-40, 3, 13, 40, 3.25, 30, BC.mediumStone, 'concrete');
    b.sign(0, 0.3, 66, 20, 2.6, 'MODEST HEADQUARTERS', { bg: '#1b4f8a' });
    for (const [x, z] of [[-60, 46], [60, 46], [-84, 0], [84, 0], [-60, -46], [60, -46]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0, 82 + Math.floor(i / 4) * 6);
  },
};
