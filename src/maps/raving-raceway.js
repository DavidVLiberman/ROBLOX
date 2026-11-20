// Raving Raceway: a racing circuit round the island -- two long straights joined by
// banked-looking hairpins with red-and-white curbs and tyre walls -- with eight
// drivable racecars lined up on the grid under the start lights. A covered grandstand
// faces the main straight; the infield has the pit garages and a tall control tower.
import { BC } from '../util.js';
import { V } from './helpers.js';

const ASPHALT = 0x3a3a3c, TYRE = 0x1b1b1d;
const CARS = [BC.brightRed, BC.brightBlue, BC.brightYellow, BC.brightGreen, 0xf28c28, 0x6a3fb5, BC.white, 0x1b1b1d];

export default {
  name: 'Raving Raceway',
  build(b) {
    // ---------------- the circuit ----------------
    const W = 20, CXR = 95, CZ = -10, R = 45;
    const line = [];
    const arc = (cx, a0, a1, k = 14) => { for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; line.push(V(cx + Math.sin(a) * R, 0, CZ + Math.cos(a) * R)); } };
    arc(CXR, Math.PI, 0);              // north straight end -> east hairpin -> south straight
    arc(-CXR, 0, -Math.PI);            // south straight -> west hairpin -> north straight
    for (let i = 0; i < line.length; i++) {
      const a = line[i], c = line[(i + 1) % line.length];
      const dx = c.x - a.x, dz = c.z - a.z, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz) * 180 / Math.PI;
      const ux = dx / L, uz = dz / L, mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
      b.part({ pos: [mx, 0.1, mz], size: [W, 0.2, L + 1.2], color: ASPHALT, mat: 'asphalt', rot: [0, yaw, 0] });
      const curve = Math.abs(a.x) > CXR - 1 && Math.abs(c.x) > CXR - 1;
      for (const s of [-1, 1]) {
        const ox = uz * s * (W / 2 - 0.6), oz = -ux * s * (W / 2 - 0.6);
        if (curve) b.part({ pos: [mx + ox, 0.25, mz + oz], size: [1.2, 0.3, L + 0.2], color: i % 2 ? BC.brightRed : BC.white, mat: 'plastic', rot: [0, yaw, 0] });
        else b.part({ pos: [mx + ox, 0.21, mz + oz], size: [0.6, 0.05, L], color: BC.white, mat: 'plastic', rot: [0, yaw, 0] });
      }
      // tyre wall round the outside of the hairpins
      if (curve && i % 2 === 0) {
        const cx = Math.sign(a.x) * CXR, ox = mx - cx, oz = mz - CZ, d = Math.hypot(ox, oz);
        for (let k = 0; k < 2; k++) b.cyl(cx + ox / d * (R + W / 2 + 2.5), k * 1.2, CZ + oz / d * (R + W / 2 + 2.5), 3, 1.2, k ? BC.brightRed : TYRE, 'plastic');
      }
    }
    // the straights' centre line is z = -55 (north) and z = 35 (south): start/finish on the south one
    for (let k = 0; k < 19; k++) {
      b.block(-0.5, 0.2, 26 + k, 1, 0.06, 1, k % 2 ? BC.white : BC.black, 'plastic');
      b.block(0.5, 0.2, 26 + k, 1, 0.06, 1, k % 2 ? BC.black : BC.white, 'plastic');
    }
    // start-light gantry over the line
    for (const z of [23.5, 46.5]) b.block(3, 0, z, 1.4, 14, 1.4, BC.darkStone, 'metal');
    b.box(2.2, 14, 23, 3.8, 16, 47, BC.darkStone, 'metal');
    for (let k = 0; k < 5; k++) b.ball(2.2, 14.4, 29 + k * 3, 1.4, BC.brightRed, 'neon');
    b.sign(3.85, 14, 35, 12, 2, 'RAVING RACEWAY', { bg: '#c4281c', rotY: 90, depth: 0.1 });
    // the grid: eight racecars in two rows
    CARS.forEach((color, i) => {
      const x = -12 - Math.floor(i / 2) * 13, z = i % 2 ? 40 : 30;
      b.vehicle(x, z, 90, { kind: 'racecar', maxSpeed: 90, accel: 46, turn: 1.4, length: 11 }, (add) => {
        add(0, 1.6, 0, 2.8, 1, 10, color, 'metal', 'box', null, i === 2 ? ['fire'] : []);
        add(0, 1.5, 5.6, 2.4, 0.8, 2, color, 'metal', 'wedge');
        add(0, 1, 6.4, 6.2, 0.3, 1.2, color, 'metal');
        for (const s of [-1, 1]) add(s * 1.9, 1.6, -0.6, 1, 1.1, 4, color, 'metal');
        for (const s of [-1, 1]) add(s * 1.2, 2.9, -4.6, 0.3, 1.6, 0.6, BC.darkStone, 'metal');
        add(0, 3.8, -4.8, 5, 0.3, 1.4, color, 'metal');
        add(0, 2.7, -1.8, 1.8, 1.2, 0.3, BC.darkStone, 'metal');
        for (const [x2, z2] of [[-2.5, 3.6], [2.5, 3.6], [-2.5, -3.4], [2.5, -3.4]]) add(x2, 1.1, z2, 2.2, 1.4, 2.2, TYRE, 'plastic', 'cyl', [0, 0, 90]);
        return add(0, 2.15, -0.6, 1.6, 0.3, 1.8, BC.black, 'fabric', 'box', null, ['seat']);
      });
    });

    // ---------------- grandstand facing the main straight ----------------
    const G = { x0: -72, x1: -12, z0: 48 };
    for (let r = 0; r < 6; r++) {
      const y = 1 + r * 1.8, z = G.z0 + r * 3;
      b.box(G.x0, 0, z, G.x1, y, z + 3, BC.mediumStone, 'concrete');
      for (let x = G.x0 + 3; x < G.x1 - 1; x += 4) b.block(x, y, z + 1.3, 2, 0.4, 1.6, r % 2 ? BC.brightBlue : BC.white, 'plastic', { tags: ['seat'] });
    }
    const gTop = G.z0 + 18;
    for (let x = G.x0; x <= G.x1; x += 15) { b.block(x, 0, gTop - 0.6, 1, 19, 1, BC.darkStone, 'metal'); b.block(x, 0, G.z0 + 0.6, 0.8, 19, 0.8, BC.darkStone, 'metal'); }
    b.box(G.x0 - 1, 19, G.z0 - 1, G.x1 + 1, 19.8, gTop + 0.5, BC.brightRed, 'metal');
    b.box(G.x0, 0, gTop, G.x1, 12, gTop + 0.6, BC.mediumStone, 'concrete');
    b.truss(G.x0 - 2, 0, gTop - 2, 20.2);
    b.spot('high', G.x0 + 8, 19.8, gTop - 6, [V(G.x0 - 6, 0, gTop - 2), V(G.x0 - 2, 20.2, gTop - 2), V(G.x0 + 8, 19.8, gTop - 6)]);
    b.spot('indoor', -40, 10, gTop - 1.5, [V(-40, 0, G.z0 - 2), V(-40, 1, G.z0 + 1.5), V(-40, 2.8, G.z0 + 4.5), V(-40, 4.6, G.z0 + 7.5), V(-40, 6.4, G.z0 + 10.5), V(-40, 8.2, G.z0 + 13.5), V(-40, 10, gTop - 1.5)]);

    // ---------------- infield: pit garages and the control tower ----------------
    b.box(-62, 0, 16, 12, 0.22, 24.5, 0x4a4a4c, 'asphalt');
    b.building({
      x: -25, z: 6, w: 52, d: 14, floors: 1, fh: 9, color: BC.white, mat: 'metal', trim: BC.brightRed, windows: false,
      door: 'S', doorW: 40, roofColor: BC.darkStone, furnish: false, ladder: true, ladderSide: 'W',
      interior: (bb, i) => {
        for (let x = i.ix0 + 4; x < i.ix1 - 2; x += 10) {
          b.block(x, 0.3, i.iz0 + 1.2, 3, 3, 1.6, BC.brightRed, 'metal');
          for (let k = 0; k < 3; k++) b.cyl(x + 3.4, 0.3 + k * 1, i.iz0 + 1.6, 2, 1, TYRE, 'plastic');
        }
      },
    });
    b.sign(-25, 9.2, 13.1, 20, 2, 'PIT LANE', { bg: '#1b1b1d', depth: 0.1 });
    const tw = b.building({
      x: 38, z: -16, w: 18, d: 18, floors: 5, fh: 10, color: BC.white, mat: 'concrete', trim: BC.brightRed,
      spacing: 5, winW: 4, winH: 7, glassColor: 0x8fd0f0, door: 'S', furnish: false,
    });
    b.cyl(38, tw.top + 2, -16, 1, 8, BC.darkStone, 'metal');
    b.sign(38, tw.top - 7, tw.z1 + 0.05, 14, 2.4, 'RACE CONTROL', { bg: '#c4281c', depth: 0.1 });

    // floodlights at the hairpins, tyre stacks, trees
    for (const [x, z] of [[-150, -10], [150, -10], [-60, -78], [60, -78]]) {
      b.cyl(x, 0, z, 1.4, 30, BC.mediumStone, 'metal');
      b.box(x - 4, 30, z - 1, x + 4, 33, z + 1, BC.darkStone, 'metal');
      b.box(x - 3.6, 30.4, z + 1, x + 3.6, 32.6, z + 1.1, 0xfff2b0, 'neon');
    }
    for (const [x, z] of [[-70, -20], [70, 6], [0, -24]]) for (let k = 0; k < 3; k++) b.cyl(x, k * 1.2, z, 3, 1.2, TYRE, 'plastic');
    for (const [x, z] of [[-110, 70], [110, 70], [-120, -80], [120, -80], [90, 60]]) b.tree(x, z, 1.0);
    b.box(-5, 0, 60, 25, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(1 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
  },
};
