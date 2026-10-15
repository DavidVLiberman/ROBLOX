// Glass Office: a seven-storey office block of dark metal and big blue windows.
// Floors 2-6 wrap round an open atrium, so each is U-shaped, and there are
// stairwells at both ends. A truss on the 7th floor climbs through a hatch to the
// roof. A road and bushes run along the front. The fire starts on the 4th floor,
// west side.
import { BC } from '../util.js';
import { V } from './helpers.js';

export default {
  name: 'Glass Office',
  build(b) {
    const X = 0, Z = -10, W = 72, D = 50, F = 7, FH = 12;
    const x0 = X - W / 2, z0 = Z - D / 2, z1 = Z + D / 2;
    // the atrium: open from the ground floor up to the 6th floor's ceiling
    const atr = { x0: -18, x1: 18, z0: -24, z1: 6 };
    const hatch = { x0: 20.5, x1: 27.5, z0: -25.5, z1: -18.5 };
    const holes = [];
    for (let k = 1; k <= 5; k++) holes.push({ level: k, ...atr });
    holes.push({ level: F, ...hatch });
    const first = b.spots.length;
    const info = b.building({
      x: X, z: Z, w: W, d: D, floors: F, fh: FH, color: 0x3a4652, mat: 'metal', floorColor: BC.lightBlue, floorMat: 'plastic',
      winW: 6.2, winH: 8.5, spacing: 7, glassColor: 0x8fd0f0, trim: 0x2a3440, doorW: 6, door: 'S',
      roofAccess: false, ladder: false, furnish: false, extraHoles: holes,
    });
    // spots on the open floors: none hanging over the atrium, and the way to them goes
    // round it through the side wings rather than straight across
    const inAtr = (q, m = 0) => q.x > atr.x0 - m && q.x < atr.x1 + m && q.z > atr.z0 - m && q.z < atr.z1 + m;
    for (let i = first; i < b.spots.length; i++) {
      const sp = b.spots[i];
      if (sp.pos.y > 1 && sp.pos.y < info.levelY(F - 1) - 1 && inAtr(sp.pos, 2)) {
        sp.pos.x = sp.pos.x < X ? atr.x0 - 6 : atr.x1 + 6;
        sp.path[sp.path.length - 1] = sp.pos.clone();
      }
      const out = [];
      for (const q of sp.path) {
        const prev = out[out.length - 1];
        if (prev && q.y > 1 && Math.abs(prev.y - q.y) < 1 && q.y < info.levelY(F - 1) - 1) {
          // does the straight walk cross the atrium?
          let cross = false;
          for (let t = 0.05; t < 1; t += 0.05) if (inAtr({ x: prev.x + (q.x - prev.x) * t, z: prev.z + (q.z - prev.z) * t }, 1.5)) cross = true;
          if (cross) {
            // step off the stair band first (its stairwell is open below), then go
            // along the side wing and on to the spot
            const side = (prev.x + q.x) / 2 < X ? atr.x0 - 6 : atr.x1 + 6;
            const zc = Math.max(atr.z0 - 4, Math.min(atr.z1 + 2.5, prev.z));
            out.push(V(prev.x, q.y, zc), V(side, q.y, zc), V(side, q.y, q.z));
          }
        }
        out.push(q);
      }
      sp.path = out;
    }
    // glass railings round the atrium on every open floor
    for (let k = 1; k <= 5; k++) {
      const y = info.levelY(k);
      b.box(atr.x0, y, atr.z0 - 0.3, atr.x1, y + 3.2, atr.z0, 0xa9d4f5, 'glass', { tags: ['glass'] });
      b.box(atr.x0, y, atr.z1, atr.x1, y + 3.2, atr.z1 + 0.3, 0xa9d4f5, 'glass', { tags: ['glass'] });
      b.box(atr.x0 - 0.3, y, atr.z0, atr.x0, y + 3.2, atr.z1, 0xa9d4f5, 'glass', { tags: ['glass'] });
      b.box(atr.x1, y, atr.z0, atr.x1 + 0.3, y + 3.2, atr.z1, 0xa9d4f5, 'glass', { tags: ['glass'] });
    }
    // a skylight over the atrium and plants on its floor
    for (const [x, z] of [[-12, -18], [12, -18], [-12, 0], [12, 0]]) b.bush(x, z, 0.9);
    // desks in the wings round the atrium
    for (let k = 0; k < F; k++) {
      const y = info.levelY(k);
      for (const [x, z] of [[-27, -14], [-27, -2], [27, -14], [27, -2], [-8, -28], [8, -28]]) {
        b.table(x, y, z, 5, 3, BC.brown);
        b.chair(x, y, z + 2.6, 180, BC.black);
      }
    }
    // the fire starts at a desk on the 4th floor, west side
    b.table(x0 + 6, info.levelY(3), Z + 2, 3, 6, BC.brown, ['fire']);
    // a truss on the 7th floor up through the roof hatch
    const tx = (hatch.x0 + hatch.x1) / 2, tz = (hatch.z0 + hatch.z1) / 2, y7 = info.levelY(F - 1);
    b.truss(tx, y7, tz, info.top - y7 + 0.4);
    b.spot('high', tx - 6, info.top, tz + 8, [...info.path, V(tx, y7, tz + 3), V(tx, info.top + 0.2, tz), V(tx - 6, info.top, tz + 8)]);

    // pavement, road and bushes along the front
    b.box(-60, 0, z1, 60, 0.3, z1 + 14, BC.mediumStone, 'concrete');
    b.box(-150, 0, z1 + 14, 150, 0.2, z1 + 32, 0x3b3b3e, 'asphalt');
    for (let x = -140; x < 150; x += 16) b.box(x, 0.2, z1 + 22.6, x + 8, 0.25, z1 + 23.4, BC.white, 'plastic');
    for (let x = -32; x <= 32; x += 8) if (Math.abs(x) > 6) b.bush(x, z1 + 2.5, 0.8);
    b.sign(0, 0.3, z1 + 8, 16, 2.4, 'GLASS OFFICE', { bg: '#2a3440' });
    for (let i = 0; i < 12; i++) b.spawn(-21 + (i % 6) * 8 + (i % 6 > 2 ? 4 : -4), 0.3, z1 + 9 + Math.floor(i / 6) * 3);
  },
};
