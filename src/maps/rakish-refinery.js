// Rakish Refinery: an oil refinery. Four big white storage tanks (ladders to their
// roofs), a distillation unit of tall columns wrapped in yellow catwalks, a flare
// stack burning on top, pipe racks running between the units, the boiler house with
// its tall chimney (the fire starts at the boiler), and the control building.
import { BC } from '../util.js';
import { V } from './helpers.js';

const STEEL = 0x9aa0a6, YELLOW = 0xf2c230, CONCRETE = 0x8d8f92;

export default {
  name: 'Rakish Refinery',
  build(b, game) {
    b.box(-92, 0, -82, 92, 0.2, 50, CONCRETE, 'concrete');
    // ---------------- storage tanks ----------------
    for (const [x, z, label] of [[-62, -52, 'R'], [-62, -18, 'A'], [-28, -56, 'K'], [-28, -20, 'R']]) {
      b.cyl(x, 0.2, z, 24, 20, 0xeeeeea, 'metal');
      b.cyl(x, 20.2, z, 24.6, 0.6, STEEL, 'metal');
      b.part({ pos: [x, 21.8, z], size: [24, 2.6, 24], color: 0xeeeeea, mat: 'metal', shape: 'cone' });
      for (const y of [7, 14]) b.cyl(x, y, z, 24.3, 0.5, STEEL, 'metal');
      b.truss(x + 13, 0.2, z, 21.2);
      b.spot('high', x + 8, 20.8, z, [V(x + 17, 0.2, z), V(x + 13, 21.2, z), V(x + 8, 20.8, z)]);
      b.sign(x, 10, z + 12.05, 6, 6, label, { bg: '#c4281c', depth: 0.1 });
    }
    // bund walls round the tank farm
    b.box(-80, 0.2, -72, -12, 2, -71, CONCRETE, 'concrete');
    b.box(-80, 0.2, -6, -12, 2, -5, CONCRETE, 'concrete');
    b.box(-81, 0.2, -72, -80, 2, -5, CONCRETE, 'concrete');

    // ---------------- distillation unit ----------------
    const DX = 26, DZ = -42;
    for (const [dx, dz, d, h] of [[-6, -4, 8, 56], [6, -4, 6.4, 48], [0, 6, 5.6, 40]]) {
      b.cyl(DX + dx, 0.2, DZ + dz, d, h, STEEL, 'metal');
      b.cyl(DX + dx, h + 0.2, DZ + dz, d + 0.8, 0.8, BC.darkStone, 'metal');
    }
    const levels = [12, 24, 36, 47];
    for (const y of levels) {
      b.box(DX - 14, y - 0.6, DZ - 12, DX + 14, y, DZ + 12, YELLOW, 'metal');
      for (const s of [-1, 1]) b.box(DX - 14, y, DZ + s * 12 - 0.15, DX + 14, y + 3, DZ + s * 12 + 0.15, YELLOW, 'metal');
      b.box(DX - 14.15, y, DZ - 12, DX - 13.85, y + 3, DZ + 12, YELLOW, 'metal');
      b.box(DX + 13.85, y, DZ - 12, DX + 14.15, y + 3, DZ - 2, YELLOW, 'metal');
      b.box(DX + 13.85, y, DZ + 2, DX + 14.15, y + 3, DZ + 12, YELLOW, 'metal');
    }
    for (const [x, z] of [[DX - 14, DZ - 12], [DX + 14, DZ - 12], [DX - 14, DZ + 12], [DX + 14, DZ + 12]]) b.block(x, 0.2, z, 1, 47, 1, YELLOW, 'metal');
    b.truss(DX + 15, 0.2, DZ, 47.4);
    b.spot('high', DX + 10, 47, DZ - 8, [V(DX + 19, 0.2, DZ), V(DX + 15, 47.4, DZ), V(DX + 10, 47, DZ), V(DX + 10, 47, DZ - 8)]);
    b.sign(DX, 12, DZ + 12.2, 14, 2, 'RAKISH REFINERY', { bg: '#1b1b1d', depth: 0.1 });

    // ---------------- flare stack ----------------
    const FX = 66, FZ = -60;
    b.cyl(FX, 0.2, FZ, 3, 70, BC.mediumStone, 'metal');
    for (const y of [20, 40, 60]) b.cyl(FX, y, FZ, 3.6, 0.6, BC.brightRed, 'metal');
    b.part({ pos: [FX, 73.2, FZ], size: [3.4, 6, 3.4], color: 0xff7a1a, mat: 'neon', shape: 'cone', collide: false });
    let smokeT = 0;
    b.extras.update = (dt) => {
      smokeT -= dt;
      if (smokeT > 0) return;
      smokeT = 0.15;
      game.effects.burst?.(V(FX + (Math.random() - 0.5), 74, FZ + (Math.random() - 0.5)), { color: 0xff8a2a, size: 4, life: 0.6, smoke: Math.random() < 0.3 });
    };

    // ---------------- pipe racks ----------------
    for (let x = -76; x <= 60; x += 12) {
      b.block(x, 0.2, -2, 0.8, 9, 0.8, STEEL, 'metal');
      b.box(x - 0.4, 9.2, -4, x + 0.4, 9.8, 0, STEEL, 'metal');
    }
    for (const [dz, c] of [[-3, YELLOW], [-1, STEEL], [1, BC.brightRed]]) b.part({ pos: [-8, 10.6, -2 + dz], size: [1.6, 138, 1.6], color: c, mat: 'metal', shape: 'cyl', rot: [0, 0, 90] });
    b.part({ pos: [DX - 14, 10.6, -16], size: [1.6, 28, 1.6], color: YELLOW, mat: 'metal', shape: 'cyl', rot: [90, 0, 0] });

    // ---------------- boiler house and chimney ----------------
    const bh = b.building({
      x: 56, z: 18, w: 26, d: 18, floors: 1, fh: 12, color: 0xb35a3a, mat: 'brick', trim: BC.darkStone, door: 'S', doorW: 6,
      spacing: 7, winW: 3, winH: 4, floorColor: CONCRETE, floorMat: 'concrete', furnish: false,
      interior: (bb, i) => {
        b.block(i.ix0 + 6, 0.3, i.iz1 - 4.5, 9, 7, 6, BC.darkStone, 'metal', { tags: ['fire'] });
        b.cyl(i.ix0 + 6, 7.3, i.iz1 - 4.5, 3, 3.4, STEEL, 'metal');
        for (let k = 0; k < 3; k++) b.block(i.ix1 - 3, 0.3, i.iz1 - 3 - k * 3, 2.4, 2.4, 2.4, 0x4a4a4c, 'metal');
      },
    });
    b.cyl(bh.x0 - 6, 0.2, bh.z, 9, 64, BC.brightRed, 'brick');
    for (const y of [16, 32, 48]) b.cyl(bh.x0 - 6, y, bh.z, 9.6, 1.4, BC.white, 'metal');
    b.cyl(bh.x0 - 6, 64.2, bh.z, 10, 1, BC.darkStone, 'metal');

    // ---------------- control building ----------------
    b.building({
      x: -48, z: 26, w: 34, d: 20, floors: 2, fh: 12, color: 0xd9c38f, mat: 'brick', trim: BC.brightRed, spacing: 7, winW: 4, winH: 5,
      door: 'S', furnish: false,
      interior: (bb, i) => {
        for (let k = 0; k < 2; k++) {
          const y = i.levelY(k);
          const cz = (i.iz0 + i.iz1) / 2;
          b.box(i.ix0 + 4, y, cz - 0.8, i.ix0 + 14, y + 3.6, cz + 0.8, BC.darkStone, 'metal');
          for (let x = i.ix0 + 5.5; x < i.ix0 + 14; x += 3) b.block(x, y + 3.6, cz, 2, 1.6, 0.4, 0x2f6fb5, 'neon');
        }
      },
    });
    for (const [x, z] of [[-110, 30], [110, 20], [-100, -90], [100, -90]]) b.tree(x, z, 1.0, 'pine');
    b.box(-6, 0, 50, 6, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
