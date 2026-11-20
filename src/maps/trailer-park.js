// Trailer Park: a T-shaped path leads in from the road. Four coloured houses line the
// top of the T, two each side of the tall water tower in the middle (a red light
// blinks on its top), and a white trailer sits on blocks beside the path in. Eleven
// trees shade the yards; the fire starts in the oak by the water tower.
import { BC } from '../util.js';
import { V } from './helpers.js';

const PATH = 0xb5b0a4, TOWER = 0x7fb3d5;

export default {
  name: 'Trailer Park',
  build(b, game) {
    // ---------------- the T-shaped path ----------------
    b.box(-4, 0, -18, 4, 0.2, 104, PATH, 'concrete');
    b.box(-96, 0, -20, 96, 0.2, -12, PATH, 'concrete');

    // ---------------- four coloured houses along the top of the T ----------------
    const houses = [[-78, 0x8fc1e3], [-46, 0xf2d16b], [46, 0x9fd18b], [78, 0xf2a7c3]];
    for (const [x, color] of houses) {
      const h = b.building({
        x, z: -40, w: 22, d: 16, floors: 1, fh: 10, color, mat: 'wood', roof: 'gable', roofColor: 0x6b4a3a, roofMat: 'slate',
        floorColor: 0xc9a77a, floorMat: 'wood', trim: BC.white, door: 'S', doorW: 4, spacing: 6, winW: 3, winH: 4,
        ladderSide: x < 0 ? 'W' : 'E',
      });
      // porch step, path to the street, mailbox
      b.box(x - 2.5, 0, h.z1, x + 2.5, 0.5, h.z1 + 2.4, BC.mediumStone, 'concrete');
      b.box(x - 1.5, 0, h.z1 + 2.4, x + 1.5, 0.2, -20, PATH, 'concrete');
      b.block(x + 4, 0, -21.5, 0.3, 3.4, 0.3, 0x5c3a1e, 'wood');
      b.block(x + 4, 3.4, -21.5, 1, 1, 1.8, color, 'metal');
    }

    // ---------------- the water tower in the middle ----------------
    const WX = 0, WZ = -44, LEG = 34;
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.block(WX + dx, 0, WZ + dz, 1.2, LEG, 1.2, 0x8f9194, 'metal');
    for (const y of [11, 22]) for (const s of [-1, 1]) {
      b.box(WX - 5, y, WZ + s * 5 - 0.2, WX + 5, y + 0.4, WZ + s * 5 + 0.2, 0x8f9194, 'metal');
      b.box(WX + s * 5 - 0.2, y, WZ - 5, WX + s * 5 + 0.2, y + 0.4, WZ + 5, 0x8f9194, 'metal');
    }
    b.cyl(WX, LEG, WZ, 16, 0.6, 0x8f9194, 'metal');
    b.cyl(WX, LEG + 0.6, WZ, 14, 11, TOWER, 'metal');
    b.cyl(WX, LEG + 11.6, WZ, 14.4, 0.5, 0x8f9194, 'metal');
    b.sign(WX, LEG + 4, WZ + 7.05, 10, 2.4, 'TRAILER PARK', { bg: '#2f6fb5', depth: 0.1 });
    b.part({ pos: [WX, LEG + 13.6, WZ], size: [6, 3.6, 6], color: TOWER, mat: 'metal', shape: 'cone' });
    b.cyl(WX, LEG + 15.4, WZ, 0.4, 1.4, BC.darkStone, 'metal');
    const light = b.ball(WX, LEG + 16.6, WZ, 1.6, 0xff2020, 'neon');
    let blink = 0, on = true;
    b.extras.update = (dt) => {
      blink += dt;
      if (blink > 0.8) { blink = 0; on = !on; game.world.setColor(light, on ? 0xff2020 : 0x5a1010, true); }
    };
    // ladder up the tank's front to its top
    b.truss(WX, 0, WZ + 8.2, LEG + 12.5);
    b.spot('high', WX + 4.5, LEG + 12.1, WZ - 1, [V(WX, 0, WZ + 13), V(WX, LEG + 12.5, WZ + 8.2), V(WX + 3, LEG + 12.1, WZ + 4.5), V(WX + 4.5, LEG + 12.1, WZ - 1)]);

    // ---------------- the white trailer by the path in ----------------
    const tr = b.building({
      x: 26, z: 36, w: 12, d: 30, floors: 1, fh: 8, y: 1.4, color: BC.white, mat: 'metal', roof: 'flat', parapet: false,
      roofColor: BC.mediumStone, roofMat: 'metal', trim: 0x2a9d8f, door: 'N', doorX: 0, doorW: 4, spacing: 6, winW: 3, winH: 3,
      groundTile: true, roofDetails: false,
    });
    for (const z of [24, 32, 40, 48]) for (const dx of [-4, 4]) b.block(26 + dx, 0, z, 2, 1.4, 1.4, BC.mediumStone, 'concrete');
    b.box(23, 0, tr.z0 - 3.4, 29, 0.7, tr.z0, BC.mediumStone, 'concrete');
    b.box(23.5, 0.7, tr.z0 - 2, 28.5, 1.4, tr.z0, BC.mediumStone, 'concrete');
    b.box(12, 0, 30, 20, 0.2, 34, PATH, 'concrete');
    b.table(14, 0, 44, 6, 3, 0x8a5a32);
    b.chair(10, 0, 44, 90, BC.white); b.chair(18, 0, 44, -90, BC.white);
    // clothesline
    for (const z of [30, 46]) b.block(40, 0, z, 0.3, 6, 0.3, BC.mediumStone, 'metal');
    b.box(39.95, 5.6, 30, 40.05, 5.7, 46, BC.white, 'plastic', { collide: false });
    for (const [z, c] of [[34, BC.brightRed], [38, BC.brightBlue], [42, BC.brightYellow]]) b.box(39.9, 3.6, z - 1, 40.1, 5.6, z + 1, c, 'fabric', { collide: false, tags: ['flammable'] });

    // ---------------- eleven trees (the oak by the tower starts the fire) ----------------
    b.tree(-14, -36, 1.1, 'oak', true);
    for (const [x, z, kind] of [[16, -60, 'oak'], [-62, -64, 'pine'], [62, -64, 'pine'], [-100, -62, 'oak'], [100, -62, 'oak'],
      [-30, 20, 'oak'], [-50, 50, 'pine'], [50, 4, 'oak'], [60, 60, 'pine'], [-20, 70, 'oak']]) b.tree(x, z, 1.0, kind);
    signPost(b, -14, 96, 'TRAILER PARK', 0, { bg: '#2f6b2f' });

    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};

function signPost(b, x, z, text, rotY, opts) {
  for (const s of [-1, 1]) b.cyl(x + s * 3.2, 0, z, 0.5, 6, BC.darkStone, 'metal');
  b.sign(x, 3.4, z, 8, 2.6, text, { rotY, ...opts });
}
