// Party Palace: a walled fairground with a turret at each corner. You come in past
// three ticket booths with turnstiles. Left of the fountain in the middle are the
// swinging Viking ship and the High-Striker; right are the burger grill and the pony
// carousel. At the back stands the drop tower with the popcorn machine (where the
// fire starts) beside it, and the whack-a-mole stand plays its own tune.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, RAINBOW, rig, collect, trashCan, signPost } from './helpers.js';

const WALL = 0xefe0c4, PURPLE = 0x6a3fb5, GOLD = 0xd8b23a, WOOD = 0x8a5a32;
const Y_AXIS = new THREE.Vector3(0, 1, 0), Z_AXIS = new THREE.Vector3(0, 0, 1);
const smooth = (t) => t * t * (3 - 2 * t);

export default {
  name: 'Party Palace',
  build(b, game) {
    const updates = [];
    // ---------------- walls, turrets, gate ----------------
    const X0 = -92, X1 = 92, Z0 = -86, Z1 = 60, H = 10;
    const wall = (x0, z0, x1, z1) => {
      b.box(x0, 0, z0, x1, H, z1, WALL, 'brick');
      b.box(x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 0.8, z1 + 0.3, PURPLE, 'plastic');
    };
    wall(X0, Z0, X1, Z0 + 2);
    wall(X0, Z0 + 2, X0 + 2, Z1);
    wall(X1 - 2, Z0 + 2, X1, Z1);
    wall(X0 + 2, Z1 - 2, -19, Z1);
    wall(19, Z1 - 2, X1 - 2, Z1);
    for (const [x, z] of [[X0 + 1, Z0 + 1], [X1 - 1, Z0 + 1], [X0 + 1, Z1 - 1], [X1 - 1, Z1 - 1]]) {
      b.cyl(x, 0, z, 10, 16, WALL, 'brick');
      b.part({ pos: [x, 20, z], size: [11.5, 8, 11.5], color: PURPLE, mat: 'slate', shape: 'cone' });
      b.cyl(x, 24, z, 0.3, 5, BC.black, 'metal');
      b.block(x + 1.2, 27, z, 2.4, 1.4, 0.1, RAINBOW[(x > 0 ? 1 : 0) + (z > 0 ? 2 : 0)], 'fabric');
    }
    // gate arch over the ticket booths
    for (const s of [-1, 1]) b.block(s * 20.5, 0, Z1 - 1, 3, 18, 3, WALL, 'brick');
    b.box(-22, 14, Z1 - 2, 22, 18, Z1, PURPLE, 'plastic');
    b.sign(0, 14.4, Z1 + 0.05, 30, 3.2, 'PARTY PALACE', { bg: '#6a3fb5', depth: 0.1 });
    // three ticket booths, turnstiles in the lanes between them
    [-16, 0, 16].forEach((x, i) => {
      b.box(x - 3, 0, Z1 - 2.5, x + 3, 7, Z1 + 1.5, BC.white, 'wood');
      b.box(x - 2, 2.6, Z1 + 1.5, x + 2, 5.4, Z1 + 1.6, 0xa9d4f5, 'glass', { tags: ['glass'] });
      b.box(x - 3.8, 7, Z1 - 3.2, x + 3.8, 7.6, Z1 + 2.6, RAINBOW[i * 2], 'fabric');
      b.sign(x, 5.6, Z1 + 1.6, 5, 1.2, 'TICKETS', { bg: '#c4281c', depth: 0.1 });
      for (let k = 0; k < 3; k++) b.ball(x - 1.5 + k * 1.5, 11 + (k % 2), Z1, 1.6, RAINBOW[(i + k) % 6], 'plastic', { tags: ['float'] });
    });
    for (const x of [-8, 8]) {
      b.cyl(x, 0, Z1 - 0.5, 1, 3.2, BC.mediumStone, 'metal');
      for (const a of [0, 120, 240]) b.part({ pos: [x + Math.sin(a * Math.PI / 180) * 1.1, 2.6, Z1 - 0.5 + Math.cos(a * Math.PI / 180) * 1.1], size: [0.25, 0.25, 2.2], color: BC.mediumStone, mat: 'metal', rot: [0, a, 0], collide: false });
    }

    // ---------------- paths, fountain ----------------
    b.box(-6, 0, Z1, 6, 0.2, 104, BC.mediumStone, 'concrete');
    b.box(-5, 0, -50, 5, 0.2, Z1, BC.mediumStone, 'concrete');
    b.box(-84, 0, -9, 84, 0.2, -1, BC.mediumStone, 'concrete');
    b.cyl(0, 0, -5, 46, 0.25, 0xd8d2c4, 'concrete');
    b.cyl(0, 0, -5, 22, 1.8, BC.mediumStone, 'concrete');
    b.cyl(0, 1.8, -5, 20, 0.15, 0x5aa9e6, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(0, 1.8, -5, 5, 5, BC.mediumStone, 'concrete');
    b.cyl(0, 6.8, -5, 10, 0.8, BC.mediumStone, 'concrete');
    b.cyl(0, 7.6, -5, 8.6, 0.12, 0x5aa9e6, 'glass', { collide: false, tags: ['glass'] });
    b.cyl(0, 7.6, -5, 1.6, 3, BC.mediumStone, 'concrete');
    b.cyl(0, 10.6, -5, 5, 0.6, BC.mediumStone, 'concrete');
    b.ball(0, 11.2, -5, 1.8, 0x5aa9e6, 'neon');
    for (const a of [45, 135, 225, 315]) {
      const r = a * Math.PI / 180;
      b.bench(Math.sin(r) * 17, -5 + Math.cos(r) * 17, a + 180, BC.reddishBrown);
    }
    for (const [x, z] of [[-9, 40], [9, 40], [-9, 18], [9, 18], [-9, -32], [9, -32]]) b.lamp(x, z, 12);
    for (const [x, z] of [[-8, 30], [8, 30], [-24, -12], [24, -12]]) trashCan(b, x, 0.2, z);

    // ---------------- Viking ship (left) ----------------
    const P = V(-52, 26, -36);
    for (const s of [-1, 1]) for (const dz of [-9, 9]) {
      b.part({ pos: [P.x + s * 5, 13, P.z + dz], size: [1.2, Math.hypot(10, 26), 1.2], color: BC.brightBlue, mat: 'metal', rot: [0, 0, -s * Math.atan2(10, 26) * 180 / Math.PI] });
    }
    b.part({ pos: [P.x, P.y, P.z], size: [1.4, 20, 1.4], color: BC.darkStone, mat: 'metal', shape: 'cyl', rot: [90, 0, 0] });
    const ship = collect(b, () => {
      const R = (x0, y0, z0, x1, y1, z1, color, mat = 'wood', extra = {}) => b.box(P.x + x0, P.y + y0, P.z + z0, P.x + x1, P.y + y1, P.z + z1, color, mat, extra);
      R(-11, -18, -4.6, 11, -17, 4.6, WOOD);
      R(-9, -19.5, -2, 9, -18, 2, 0x5c3a1e);
      for (const s of [-1, 1]) {
        R(-12, -18, s * 4.6, 12, -14.5, s * 5.2, WOOD);
        R(-12, -15.6, s * 5.2, 12, -14.8, s * 5.5, BC.brightRed, 'plastic');
        for (let k = -2; k <= 2; k++) b.part({ pos: [P.x + k * 4, P.y - 16.4, P.z + s * 5.5], size: [2.2, 0.3, 2.2], color: RAINBOW[(k + 2 + (s > 0 ? 3 : 0)) % 6], mat: 'metal', shape: 'cyl', rot: [90, 0, 0] });
        // the arms it hangs from
        R(-0.5, -17, s * 5.4 - 0.3, 0.5, 0, s * 5.4 + 0.3, BC.brightBlue, 'metal');
        for (const sx of [-1, 1]) b.part({ pos: [P.x + sx * 4.5, P.y - 7.5, P.z + s * 5.7], size: [0.8, Math.hypot(9, 15), 0.6], color: BC.brightBlue, mat: 'metal', rot: [0, 0, sx * Math.atan2(9, 15) * 180 / Math.PI] });
      }
      // raised bow and stern, dragon head and tail
      b.part({ pos: [P.x + 14.5, P.y - 15, P.z], size: [10.4, 6, 5], color: WOOD, mat: 'wood', shape: 'wedge', rot: [0, -90, 0] });
      b.part({ pos: [P.x - 14.5, P.y - 15, P.z], size: [10.4, 6, 5], color: WOOD, mat: 'wood', shape: 'wedge', rot: [0, 90, 0] });
      R(16.4, -12, -0.7, 17.6, -6.5, 0.7, 0x2f8a3c, 'plastic');
      b.ball(P.x + 17.4, P.y - 6.7, P.z, 2.8, 0x2f8a3c, 'plastic');
      R(17.8, -6.2, -0.6, 20, -5, 0.6, 0x2f8a3c, 'plastic');
      R(-17.6, -12, -0.6, -16.4, -7, 0.6, 0x2f8a3c, 'plastic');
      for (const x of [-8, -4, 0, 4, 8]) for (const z of [-2.4, 2.4]) R(x - 1, -17, z - 1, x + 1, -16.4, z + 1, BC.brightRed, 'fabric', { tags: ['seat'] });
    });
    const shipRig = rig(game, ship, P);
    b.fence(-80, -54, -24, -54, 3, BC.white, 'metal');
    b.fence(-80, -18, -24, -18, 3, BC.white, 'metal');
    b.fence(-80, -54, -80, -18, 3, BC.white, 'metal');
    b.fence(-24, -54, -24, -40, 3, BC.white, 'metal');
    b.fence(-24, -32, -24, -18, 3, BC.white, 'metal');
    signPost(b, -20, -46, 'VIKING SHIP', 90, { bg: '#1b4f8a' });
    let shipT = 0;
    updates.push((dt) => { shipT += dt; shipRig.set(P, new THREE.Quaternion().setFromAxisAngle(Z_AXIS, 0.95 * Math.sin(shipT * Math.PI * 2 / 7))); });

    // ---------------- High-Striker ----------------
    const HS = V(-32, 0, 14);
    b.block(HS.x, 0, HS.z, 5, 0.6, 5, BC.reddishBrown, 'wood');
    b.block(HS.x, 0.6, HS.z - 1.5, 1, 26, 1, BC.white, 'wood');
    for (let k = 0; k < 6; k++) b.block(HS.x, 2 + k * 4, HS.z - 0.95, 0.8, 3.6, 0.1, RAINBOW[5 - k], 'neon', { collide: false });
    b.ball(HS.x, 26.4, HS.z - 1.5, 2.4, GOLD, 'metal');
    b.block(HS.x, 0.6, HS.z + 1, 2.2, 0.6, 2.2, BC.brightRed, 'plastic');
    b.sign(HS.x, 0.6, HS.z + 2.4, 4.6, 1.2, 'HIGH STRIKER', { bg: '#c4281c', depth: 0.1 });
    b.part({ pos: [HS.x + 2, 1.6, HS.z + 2], size: [0.4, 3.6, 0.4], color: WOOD, mat: 'wood', rot: [0, 0, 20] });
    const puck = b.block(HS.x, 1.2, HS.z - 0.6, 1.4, 1, 0.8, BC.brightRed, 'neon');
    const puckRig = rig(game, [puck], V(HS.x, 1.2, HS.z - 0.6));
    const hs = { active: false, t: 0, h: 0, ding: false, n: 0, rang: false };
    b.interact.push({
      pos: V(HS.x, 0, HS.z + 3.5), radius: 4.5, height: 5, object: 'High Striker', label: 'Swing', part: puck,
      cond: () => !hs.active,
      action: () => {
        // the same "random" swing on every machine
        hs.n++;
        const power = Math.abs(Math.sin(hs.n * 78.233 + 12.9898) * 43758.5453) % 1;
        Object.assign(hs, { active: true, t: 0, h: 1 + power * 24.4, ding: power > 0.86, rang: false });
        game.audio.crash(V(HS.x, 1, HS.z));
      },
    });
    updates.push((dt) => {
      if (!hs.active) return;
      hs.t += dt;
      const up = 0.7, down = 0.9;
      let y;
      if (hs.t < up) y = hs.h * (1 - (1 - hs.t / up) ** 2);
      else y = hs.h * Math.max(0, 1 - ((hs.t - up) / down) ** 2);
      if (hs.t >= up && hs.ding && !hs.rang) {
        hs.rang = true;
        game.audio.chime();
        if (game.player.pos.distanceTo(HS) < 30) game.ui?.toast('DING DING DING!', 2000);
      }
      if (hs.t > up + down) { hs.active = false; y = 0; }
      puckRig.set(V(HS.x, 1.2 + y, HS.z - 0.6), new THREE.Quaternion());
    });

    // ---------------- whack-a-mole (with its own music) ----------------
    const WM = V(-62, 0, 22);
    for (const [dx, dz] of [[-7, -4], [7, -4], [-7, 4], [7, 4]]) b.block(WM.x + dx, 0, WM.z + dz, 0.6, 9, 0.6, BC.white, 'wood');
    for (let k = 0; k < 5; k++) b.box(WM.x - 7.5 + k * 3, 9, WM.z - 4.5, WM.x - 4.5 + k * 3, 9.6, WM.z + 4.5, k % 2 ? BC.white : BC.brightGreen, 'fabric');
    b.sign(WM.x, 9.6, WM.z + 4.5, 12, 1.8, 'WHACK-A-MOLE', { bg: '#2f8a3c', depth: 0.2 });
    b.box(WM.x - 6, 0, WM.z - 2.5, WM.x + 6, 3, WM.z + 2, 0x2f8a3c, 'plastic');
    const moles = [];
    for (let i = 0; i < 9; i++) {
      const mx = WM.x - 4 + (i % 3) * 4, mz = WM.z - 1.4 + Math.floor(i / 3) * 1.6;
      b.cyl(mx, 3, mz, 1.5, 0.05, BC.black, 'plastic', { collide: false });
      const m = b.cyl(mx, 1.6, mz, 1.2, 1.4, 0x7a5230, 'plastic');
      moles.push({ rig: rig(game, [m], V(mx, 1.6, mz)), x: mx, z: mz, up: 0 });
    }
    const tune = [523, 659, 784, 659, 523, 659, 784, 1047, 988, 784, 659, 587, 523, 0, 392, 0];
    let molesT = 0, note = 0, noteT = 0;
    updates.push((dt) => {
      molesT += dt;
      moles.forEach((m, i) => {
        const want = Math.sin(molesT * 2.3 + i * 1.7) * Math.sin(molesT * 0.9 + i) > 0.35 ? 1 : 0;
        m.up += Math.sign(want - m.up) * Math.min(Math.abs(want - m.up), dt * 6);
        m.rig.set(V(m.x, 1.6 + m.up * 1.6, m.z), new THREE.Quaternion());
      });
      // the stand's jingle, for whoever is nearby
      noteT -= dt;
      if (noteT <= 0) {
        noteT = 0.24;
        const f = tune[note++ % tune.length];
        if (f && game.camera.position.distanceTo(WM) < 70) game.audio.tone(f, 0.2, { type: 'square', gain: 0.05, pos: V(WM.x, 4, WM.z) });
      }
    });

    // ---------------- burger grill (right) ----------------
    const bg = b.building({
      x: 58, z: 22, w: 22, d: 14, floors: 1, fh: 10, color: 0xf3c44f, mat: 'wood', trim: BC.brightRed, roofColor: BC.brightRed,
      floorColor: 0xd9d4c7, floorMat: 'plastic', door: 'S', doorW: 6, spacing: 7, winW: 4, furnish: false,
      interior: (bb, i) => {
        b.box(i.ix0 + 6, 0, i.iz0, i.ix1 - 1, 3, i.iz0 + 2.5, BC.darkStone, 'metal');
        for (let k = 0; k < 4; k++) b.cyl(i.ix0 + 8 + k * 3, 3, i.iz0 + 1.2, 2, 0.5, 0x6b3b1f, 'plastic', { tags: k === 0 ? ['flammable'] : [] });
        b.box(i.ix0 + 6, 0, i.iz0 + 4.5, i.ix1 - 4, 3.4, i.iz0 + 5.5, BC.brightRed, 'wood');
      },
    });
    // the giant burger on the roof
    const bx = 64.5, bz = 22, by = bg.top + 2;
    for (const sp of b.spots) if (sp.pos.y === bg.top && sp.pos.x > 54) { sp.pos.x = 53; sp.path[sp.path.length - 1].x = 53; }
    b.cyl(bx, by, bz, 8, 1.4, 0xe0a050, 'plastic');
    b.cyl(bx, by + 1.4, bz, 8.6, 1.6, 0x6b3b1f, 'plastic');
    b.block(bx, by + 3, bz, 8.4, 0.3, 8.4, 0xf5cd30, 'plastic', { rot: [0, 45, 0] });
    b.cyl(bx, by + 3.3, bz, 8.8, 0.4, 0x4bb84b, 'grass');
    b.ball(bx, by + 3.7, bz, 8, 0xe0a050, 'plastic');
    b.sign(58, 7.2, bz + 7.05, 10, 2, 'BURGERS', { bg: '#c4281c', depth: 0.2 });

    // ---------------- pony carousel ----------------
    const C = V(54, 0, -38);
    b.cyl(C.x, 0, C.z, 26, 1.2, BC.brightRed, 'wood');
    b.cyl(C.x, 1.2, C.z, 2.4, 13, GOLD, 'metal');
    b.cyl(C.x, 13.4, C.z, 30, 1.2, BC.brightYellow, 'plastic');
    b.part({ pos: [C.x, 17.6, C.z], size: [30, 6, 30], color: BC.brightRed, mat: 'fabric', shape: 'cone' });
    b.ball(C.x, 20.2, C.z, 1.6, GOLD, 'metal');
    const ponies = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, px = C.x + Math.cos(a) * 9, pz = C.z + Math.sin(a) * 9;
      const fx = -Math.sin(a), fz = Math.cos(a), yaw = Math.atan2(fx, fz) * 180 / Math.PI;
      const col = i % 2 ? BC.white : 0x9b6a3c;
      const parts = collect(b, () => {
        const at = (f, y, size, color, extra = {}) => b.part({ pos: [px + fx * f, y, pz + fz * f], size, color, mat: 'plastic', rot: [0, yaw, 0], ...extra });
        b.cyl(px, 1.2, pz, 0.4, 12.2, GOLD, 'metal', { collide: false });
        at(0, 4.4, [1.4, 1.8, 3.6], col);
        at(2.1, 5.6, [1.2, 2.4, 1.4], col);
        at(1.2, 2.6, [1.2, 2, 0.6], col);
        at(-1.2, 2.6, [1.2, 2, 0.6], col);
        at(-2.1, 4.6, [0.4, 1.6, 0.6], BC.black);
        at(0, 5.5, [1.5, 0.4, 1.6], RAINBOW[i % 6], { tags: ['seat'] });
      });
      ponies.push({ rig: rig(game, parts, C), i });
    }
    let carT = 0;
    updates.push((dt) => {
      carT += dt;
      const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -carT * Math.PI * 2 / 18);
      for (const p of ponies) p.rig.set(V(C.x, 0.9 * Math.sin(carT * 2.4 + p.i * Math.PI / 2), C.z), q);
    });
    b.spot('indoor', C.x - 3, 1.2, C.z + 3, [V(C.x, 0, C.z + 18), V(C.x - 3, 1.2, C.z + 3)]);

    // ---------------- drop tower and the popcorn machine ----------------
    const D = V(0, 0, -66);
    for (let k = 0; k < 8; k++) b.block(D.x, k * 8, D.z, 5, 8, 5, k % 2 ? BC.white : BC.brightRed, 'metal');
    b.box(D.x - 6, 64, D.z - 2.5, D.x + 6, 65, D.z + 6, BC.darkStone, 'metal');
    b.box(D.x - 6, 65, D.z + 5.6, D.x + 6, 68, D.z + 6, BC.brightYellow, 'metal');
    for (const s of [-1, 1]) b.box(D.x + s * 6 - 0.2, 65, D.z - 2.5, D.x + s * 6 + 0.2, 68, D.z + 5.6, BC.brightYellow, 'metal');
    for (const s of [-1, 1]) b.box(D.x + s * 1.6, 65, D.z - 2.9, D.x + s * 6, 68, D.z - 2.5, BC.brightYellow, 'metal');
    b.ball(D.x, 65, D.z + 2, 2, BC.brightRed, 'neon');
    b.sign(D.x, 52, D.z + 2.55, 4.6, 8, 'DROP', { bg: '#1b1b1d', depth: 0.1 });
    b.truss(D.x, 0, D.z - 3.5, 65.4);
    b.spot('high', D.x + 3, 65, D.z + 3, [V(D.x, 0, D.z - 8), V(D.x, 65.4, D.z - 3.5), V(D.x + 3, 65, D.z + 3)]);
    const car = collect(b, () => {
      for (const s of [-1, 1]) {
        b.box(D.x + s * 2.5, 1, D.z - 3.4, D.x + s * 3.4, 4.6, D.z + 3.4, BC.darkStone, 'metal');
        for (const z of [-2, 0, 2]) {
          b.box(D.x + s * 3.4, 2.2, D.z + z - 0.8, D.x + s * 5, 2.7, D.z + z + 0.8, BC.brightBlue, 'fabric', { tags: ['seat'] });
          b.box(D.x + s * 3.4, 4.3, D.z + z - 0.15, D.x + s * 4.8, 4.6, D.z + z + 0.15, BC.brightYellow, 'metal', { collide: false });
        }
      }
    });
    for (const p of car) if (p.tags.has('seat')) p.seatYaw = 0;
    const carRig = rig(game, car, V(D.x, 0, D.z));
    let dropT = 0, dropY = 0, dropping = false;
    updates.push((dt) => {
      // wait at the bottom, a slow climb, a pause at the top, then the drop
      dropT = (dropT + dt) % 30;
      const t = dropT;
      let y;
      if (t < 8) y = 0;
      else if (t < 22) y = 50 * smooth((t - 8) / 14);
      else if (t < 25) y = 50;
      else y = Math.max(0, 50 - 0.5 * 30 * (t - 25) ** 2);
      if (t >= 25 && y > 0 && !dropping) { dropping = true; game.audio.whistle(V(D.x, 40, D.z)); }
      if (y === 0 && dropping) { dropping = false; game.audio.crash(V(D.x, 2, D.z)); }
      if (Math.abs(y - dropY) > 1e-4 || t < dt * 2) carRig.set(V(D.x, y, D.z), new THREE.Quaternion());
      dropY = y;
    });
    // popcorn machine: the fire starts here
    const PC = V(12, 0, -56);
    b.block(PC.x, 1.2, PC.z, 6, 3, 4, BC.brightRed, 'wood', { tags: ['fire'] });
    b.block(PC.x, 4.2, PC.z, 5.4, 4, 3.4, 0xfff6c8, 'glass', { tags: ['glass'] });
    b.block(PC.x, 8.2, PC.z, 6.4, 0.6, 4.4, BC.brightRed, 'wood');
    for (const s of [-1, 1]) b.part({ pos: [PC.x + s * 2.2, 1.2, PC.z + 2.1], size: [2.4, 0.5, 2.4], color: BC.black, mat: 'plastic', shape: 'cyl', rot: [0, 0, 90] });
    b.sign(PC.x, 8.8, PC.z + 2.25, 6, 1.6, 'POPCORN', { bg: '#c4281c', depth: 0.1 });

    // whack-a-mole stand is covered
    b.spot('indoor', WM.x + 3, 0, WM.z + 4, [V(WM.x + 3, 0, WM.z + 10), V(WM.x + 3, 0, WM.z + 4)]);
    for (const [x, z] of [[-80, 44], [80, 44], [-80, -72], [80, -72], [-40, -76], [40, -76]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 74 + Math.floor(i / 4) * 6);

    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
