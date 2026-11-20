// Fort Indestructible: an army fort of high grey walls with a gate, battlements you can
// walk along and a tower at each corner. Inside the courtyard are three drivable tanks
// (driver and gunner), a helicopter on its pad -- its rotor spins up when someone takes
// the pilot's seat, and the blades are deadly -- a tall radio tower, the barracks, a
// supply depot and a flagpole. The fire starts in one of the tanks.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const STONE = 0x8d9096, DARK = 0x6b6e72, OLIVE = 0x4f5d34, OLIVE2 = 0x3f4b2a, SAND = 0xc8b37a;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default {
  name: 'Fort Indestructible',
  build(b, game) {
    const updates = [];
    const X0 = -75, X1 = 75, Z0 = -80, Z1 = 60, H = 16, T = 4;
    // ---------------- walls, gate, battlements ----------------
    b.box(X0, 0, Z0, X1, 0.2, Z1, SAND, 'sand');
    const wall = (x0, z0, x1, z1) => b.box(x0, 0, z0, x1, H, z1, STONE, 'slate');
    wall(X0, Z0, X1, Z0 + T);
    wall(X0, Z0 + T, X0 + T, Z1 - T);
    wall(X1 - T, Z0 + T, X1, Z1 - T);
    wall(X0, Z1 - T, -10, Z1);
    wall(10, Z1 - T, X1, Z1);
    b.box(-10, 12, Z1 - T, 10, H, Z1, STONE, 'slate');
    b.sign(0, 12.3, Z1 + 0.05, 18, 3.2, 'FORT INDESTRUCTIBLE', { bg: '#3d4a2f', depth: 0.1 });
    // merlons along the outside edge of the wall-walk
    const merlons = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 6);
      for (let i = 0; i <= n; i++) { const t = i / n; b.block(ax + (bx - ax) * t, H, az + (bz - az) * t, 2, 2.2, 2, STONE, 'slate'); }
    };
    merlons(X0 + 1, Z0 + 1, X1 - 1, Z0 + 1);
    merlons(X0 + 1, Z0 + 1, X0 + 1, Z1 - 1);
    merlons(X1 - 1, Z0 + 1, X1 - 1, Z1 - 1);
    merlons(X0 + 1, Z1 - 1, X1 - 1, Z1 - 1);
    // corner towers
    for (const [cx, cz] of [[X0 + 3, Z0 + 3], [X1 - 3, Z0 + 3], [X0 + 3, Z1 - 3], [X1 - 3, Z1 - 3]]) {
      b.block(cx, 0, cz, 14, 26, 14, DARK, 'slate');
      for (const [ox, oz] of [[-6, -6], [0, -6], [6, -6], [-6, 6], [0, 6], [6, 6], [-6, 0], [6, 0]]) b.block(cx + ox, 26, cz + oz, 2, 2.4, 2, DARK, 'slate');
      b.block(cx, 26, cz, 1.6, 2, 1.6, BC.darkStone, 'metal');
      b.block(cx, 28, cz, 2.4, 1.6, 2.4, 0xfff2b0, 'neon');
      // ladder on the courtyard side
      const ix = cx < 0 ? cx + 8 : cx - 8, iz = cz < 0 ? cz + 8 : cz - 8;
      b.truss(ix, 0.2, cz < 0 ? cz + 7 : cz - 7, 26.2);
      b.spot('high', cx + (cx < 0 ? 2 : -2), 26, cz + (cz < 0 ? 2 : -2), [V(ix, 0.2, iz + (cz < 0 ? 4 : -4)), V(ix, 26.4, cz < 0 ? cz + 7 : cz - 7), V(cx + (cx < 0 ? 2 : -2), 26, cz + (cz < 0 ? 2 : -2))]);
    }
    // ladders up to the wall-walk on the west and east walls
    for (const s of [-1, 1]) {
      const x = s < 0 ? X0 + T + 1 : X1 - T - 1;
      b.truss(x, 0.2, -10, H + 0.2);
      const wx = s < 0 ? X0 + T - 1.7 : X1 - T + 1.7;
      b.spot('high', wx, H, -18, [V(x - s * 4, 0.2, -10), V(x, H + 0.4, -10), V(wx, H, -10), V(wx, H, -18)]);
    }

    // ---------------- the tanks ----------------
    const tank = (x, z, rotY, fire) => b.vehicle(x, z, rotY, { kind: 'tank', maxSpeed: 30, accel: 16, turn: 0.8, length: 12 }, (add) => {
      for (const s of [-1, 1]) add(s * 3.4, 1.2, 0, 1.8, 2.4, 12, BC.reallyBlack, 'metal');
      add(0, 2.3, 0, 5.2, 2.2, 11, OLIVE, 'metal', 'box', null, fire ? ['fire'] : []);
      add(0, 4.3, -0.6, 4.4, 1.8, 5.2, OLIVE2, 'metal');
      add(0, 4.4, 4.6, 0.7, 0.7, 6.6, BC.darkStone, 'metal', 'cyl', [90, 0, 0]);
      add(0, 5.5, -1.6, 1.6, 0.6, 1.6, BC.darkStone, 'metal');
      const driver = add(-1.4, 3.6, 3.2, 1.4, 0.4, 1.4, BC.black, 'fabric', 'box', null, ['seat']);
      const gunner = add(1.2, 5.4, -2.4, 1.4, 0.4, 1.4, BC.black, 'fabric', 'box', null, ['seat']);
      return [driver, gunner];
    });
    tank(-42, 22, 180, true); tank(-22, 34, 180, false); tank(36, 26, 200, false);

    // ---------------- the helicopter ----------------
    const HX = 40, HZ = -44;
    b.cyl(HX, 0.2, HZ, 26, 0.2, BC.mediumStone, 'concrete');
    b.cyl(HX, 0.4, HZ, 14, 0.05, BC.white, 'plastic', { collide: false });
    b.cyl(HX, 0.42, HZ, 12, 0.05, BC.mediumStone, 'concrete', { collide: false });
    const heli = [];
    const hp = (o) => { const p = b.part(o); p.tags.add('helicopter'); heli.push(p); return p; };
    const hb = (x0, y0, z0, x1, y1, z1, color, mat = 'metal', extra = {}) => hp({ pos: [HX + (x0 + x1) / 2, (y0 + y1) / 2, HZ + (z0 + z1) / 2], size: [x1 - x0, y1 - y0, z1 - z0], color, mat, ...extra });
    for (const s of [-1, 1]) { hb(s * 2.6 - 0.2, 0.4, -4, s * 2.6 + 0.2, 0.8, 4.5, BC.black); hb(s * 2.4 - 0.15, 0.8, -2, s * 2.4 + 0.15, 1.4, -1.6, BC.black); hb(s * 2.4 - 0.15, 0.8, 2, s * 2.4 + 0.15, 1.4, 2.4, BC.black); }
    hb(-2.6, 1.4, -3.5, 2.6, 1.8, 3.5, OLIVE);
    hb(-2.6, 5.6, -3.5, 2.6, 6.2, 3.5, OLIVE);
    for (const [x, z] of [[-2.45, -3.35], [2.45, -3.35], [-2.45, 3.35], [2.45, 3.35]]) hb(x - 0.15, 1.8, z - 0.15, x + 0.15, 5.6, z + 0.15, OLIVE);
    hb(-2.6, 1.8, -3.9, 2.6, 5.6, -3.5, OLIVE);
    hb(-2.6, 1.8, 3.5, 2.6, 5.6, 3.9, 0xa9d4f5, 'glass', { tags: ['glass'] });
    hb(-2.6, 0.9, 3.5, 2.6, 1.8, 5, OLIVE);
    hb(-0.7, 3.4, -14, 0.7, 4.8, -3.9, OLIVE);
    hb(-0.15, 4.8, -14, 0.15, 8, -12, OLIVE);
    hb(0.15, 5, -13.6, 0.35, 7.6, -13.4, BC.black);
    hb(-1.6, 6.2, -2.5, 1.6, 7.2, 1.5, OLIVE2);
    hp({ pos: [HX, 7.6, HZ], size: [0.6, 0.8, 0.6], color: BC.black, mat: 'metal', shape: 'cyl' });
    const pilot = hb(-1.9, 1.8, 1.6, -0.3, 2.2, 3.2, BC.black, 'fabric', { tags: ['seat'] });
    hb(0.3, 1.8, 1.6, 1.9, 2.2, 3.2, BC.black, 'fabric', { tags: ['seat'] });
    for (const x of [-1.2, 1.2]) hb(x - 0.8, 1.8, -3.4, x + 0.8, 2.2, -1.8, BC.black, 'fabric', { tags: ['seat'] });
    const rotor = collect(b, () => {
      hp({ pos: [HX, 8.15, HZ], size: [26, 0.25, 1.2], color: BC.reallyBlack, mat: 'metal' });
      hp({ pos: [HX, 8.15, HZ], size: [1.2, 0.25, 26], color: BC.reallyBlack, mat: 'metal' });
      hp({ pos: [HX, 8.15, HZ], size: [1.4, 0.5, 1.4], color: BC.darkStone, mat: 'metal', shape: 'cyl' });
    });
    const rotorRig = rig(game, rotor, V(HX, 0, HZ));
    let spin = 0, angle = 0;
    updates.push((dt) => {
      // the rotor spins up while someone sits in the pilot's seat
      const want = pilot.occupant ? 16 : 0;
      spin += Math.sign(want - spin) * Math.min(Math.abs(want - spin), dt * (want ? 4 : 2.5));
      if (spin < 0.01) return;
      angle += spin * dt;
      rotorRig.set(V(HX, 0, HZ), new THREE.Quaternion().setFromAxisAngle(Y_AXIS, angle));
      if (spin < 4) return;
      // the blades are deadly
      for (const c of game.localChars()) {
        if (!c.alive || c.seat?.tags?.has('helicopter')) continue;
        const d = Math.hypot(c.pos.x - HX, c.pos.z - HZ);
        if (d < 13.4 && c.pos.y < 8.6 && c.pos.y + 5 > 7.8) c.die('helicopter');
      }
    });
    b.sign(HX, 0.45, HZ - 10.5, 6, 1.2, 'H', { bg: '#3d4a2f', depth: 0.1 });

    // ---------------- radio tower ----------------
    const RX = -52, RZ = -56;
    for (let k = 0; k < 7; k++) b.block(RX, k * 7, RZ, 4, 7, 4, k % 2 ? BC.white : BC.brightRed, 'metal');
    // platform on top, ending where the ladder comes up its south side
    b.box(RX - 5, 49, RZ - 6, RX + 5, 50, RZ + 2, BC.darkStone, 'metal');
    for (const s of [-1, 1]) b.box(RX + s * 5 - 0.2, 50, RZ - 6, RX + s * 5 + 0.2, 53, RZ + 2, BC.brightYellow, 'metal');
    b.box(RX - 5, 50, RZ - 6.2, RX + 5, 53, RZ - 5.8, BC.brightYellow, 'metal');
    for (const s of [-1, 1]) b.box(RX + s * 1.6, 50, RZ + 1.8, RX + s * 5, 53, RZ + 2.2, BC.brightYellow, 'metal');
    b.cyl(RX + 2, 50, RZ - 2, 0.6, 20, BC.mediumStone, 'metal');
    b.ball(RX + 2, 69.6, RZ - 2, 1.4, BC.brightRed, 'neon');
    for (const [dx, dz] of [[3, 2], [-3, -2]]) b.part({ pos: [RX + dx, 54, RZ + dz], size: [3, 3, 0.4], color: BC.white, mat: 'metal', shape: 'cyl', rot: [90, 0, 30] });
    b.truss(RX, 0.2, RZ + 3, 50.2);
    b.spot('high', RX - 2.5, 50, RZ - 3, [V(RX, 0.2, RZ + 8), V(RX, 50.4, RZ + 3), V(RX - 2.5, 50, RZ - 3)]);

    // ---------------- barracks, depot, flagpole ----------------
    b.building({
      x: -8, z: -50, w: 40, d: 16, floors: 1, fh: 10, color: OLIVE, mat: 'metal', trim: OLIVE2, floorColor: 0x6b5a3a, floorMat: 'wood',
      door: 'S', spacing: 8, winW: 4, winH: 3, roofColor: OLIVE2, furnish: false, ladder: true,
      interior: (bb, i) => {
        for (let x = i.ix0 + 3; x < i.ix1 - 3; x += 7) {
          b.block(x, 0.3, i.iz0 + 2, 3, 1.6, 6, 0x5d4a2a, 'wood');
          b.block(x, 1.9, i.iz0 + 2, 3, 0.4, 6, BC.white, 'fabric');
        }
      },
    });
    b.sign(-8, 7.8, -41.95, 12, 1.6, 'BARRACKS', { bg: '#3d4a2f', depth: 0.1 });
    for (const [x, z] of [[54, 34], [58, 34], [54, 38], [58, 38], [56, 36]]) b.block(x, z === 36 ? 4 : 0.2, z, 3.6, 3.8, 3.6, 0x8a6a3a, 'wood', { tags: ['flammable'] });
    for (const [x0, z0, x1, z1] of [[-6, 2, 6, 3.6], [-30, -18, -18, -16.4], [18, -16, 30, -14.4]]) b.box(x0, 0.2, z0, x1, 2.4, z1, SAND, 'fabric');
    b.cyl(0, 0.2, -6, 0.6, 30, BC.white, 'metal');
    b.block(2.6, 25.4, -6, 5, 3.2, 0.1, 0x3d6b2a, 'fabric');

    for (const [x, z] of [[-110, 40], [110, 40], [-100, -100], [100, -100], [-120, -20]]) b.tree(x, z, 1.0);
    b.box(-8, 0, Z1, 8, 0.2, 104, BC.mediumStone, 'concrete');
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);

    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
