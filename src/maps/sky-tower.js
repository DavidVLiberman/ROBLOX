// Sky Tower: a skyscraper in three stepped tiers -- a wide base, a narrower middle and
// a thin spire topped by a sparkling rod -- with a balcony round each step. The floors
// are empty. Each tier's stairs come out on its roof balcony, right by the door of the
// tier above. The fire starts at a first-floor window, centre-right.
import { BC } from '../util.js';
import { V } from './helpers.js';

const WALL = 0x2c3e50, TRIM = 0x5f7f99, GLASS = 0x8fd0f0, FLOOR = BC.mediumStone;

// waypoints from the street to the roof of a building() (its own path plus the roof flight)
function roofPath(info) {
  const f = info.flightInfo[info.floors - 1], prev = info.flightInfo[info.floors - 2];
  const fx = f.xs - f.dir * 1.6, y = info.levelY(f.k), band = (f.bz0 + f.bz1) / 2;
  const p = [...info.path];
  if (prev) p.push(V(fx, y, (prev.bz0 + prev.bz1) / 2));
  p.push(V(fx, y, band), V(f.xe + f.dir * 1.8, info.top, band));
  return p;
}

export default {
  name: 'Sky Tower',
  build(b) {
    const common = { mat: 'metal', color: WALL, trim: TRIM, glassColor: GLASS, floorColor: FLOOR, floorMat: 'plastic', spacing: 10, winW: 7, winH: 6, furnish: false, ladder: false };
    // tiers: each sits on the roof of the one below; the tier above has its door on the
    // side where the stairs below come out
    const tiers = [
      { w: 56, d: 48, floors: 5, door: 'S' },
      { w: 40, d: 34, floors: 5, door: 'N' },
      { w: 24, d: 22, floors: 6, door: 'S' },
    ];
    let y = 0, below = [];
    for (let t = 0; t < tiers.length; t++) {
      const T = tiers[t], first = b.spots.length;
      const info = b.building({ ...common, x: 0, z: 0, w: T.w, d: T.d, floors: T.floors, fh: 10, y, door: T.door, roofAccess: true });
      // spots in the upper tiers are reached through every tier below
      for (let i = first; i < b.spots.length; i++) b.spots[i].path = [...below, ...b.spots[i].path];
      below = [...below, ...roofPath(info)];
      y = info.top;
    }
    // the sparkling rod on the spire
    b.cyl(0, y, 0, 2, 24, BC.mediumStone, 'metal');
    b.ball(0, y + 24, 0, 2.4, BC.brightRed, 'neon');
    // the fire starts at a first-floor window, centre-right of the front
    b.block(9, 0.3, 22.4, 4, 6, 0.4, BC.white, 'fabric', { tags: ['fire', 'flammable'] });

    // plaza and path at the front
    b.box(-34, 0, 24, 34, 0.25, 40, BC.mediumStone, 'concrete');
    b.box(-5, 0, 40, 5, 0.25, 100, BC.mediumStone, 'concrete');
    b.sign(0, 7.6, 24.2, 16, 2, 'SKY TOWER', { bg: '#1b2a35' });
    for (const [x, z] of [[-48, 30], [48, 30], [-48, -34], [48, -34], [-60, 0], [60, 0]]) b.tree(x, z, 0.9);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0, 84 + Math.floor(i / 4) * 6);
  },
};
