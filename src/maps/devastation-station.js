// Devastation Station: a railway loop round the island that runs out over the sea on
// a wooden trestle. Inside the loop are the brick station and its platform, a siding
// with boxcars, the coal hopper (where the fire starts) whose button dumps its coal,
// and a tall water tower. A drivable saddle-tank locomotive and two handcars run on
// the loop, and the level crossing on the road in has gates you can lower and raise.
import * as THREE from 'three';
import { BC } from '../util.js';
import { V, rig, collect } from './helpers.js';

const GRAVEL = 0x7d7468, TIE = 0x5c3a1e, RAIL = 0x6b6e70, BRICK = 0x9c3b2a, CREAM = 0xefe0c4, WOOD = 0x8a5a32;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const offIsland = (x, z) => (x / 158) ** 2 + (z / 140) ** 2 > 1;

// ballast, sleepers and two rails along a polyline (trestle under it over the sea)
function track(b, pts, loop) {
  const n = pts.length, segs = loop ? n : n - 1;
  let carry = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], c = pts[(i + 1) % n];
    const dx = c.x - a.x, dz = c.z - a.z, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz) * 180 / Math.PI;
    const ux = dx / L, uz = dz / L, mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
    b.part({ pos: [mx, 0.15, mz], size: [6.4, 0.3, L + 0.8], color: GRAVEL, mat: 'concrete', rot: [0, yaw, 0] });
    for (const s of [-1, 1]) b.part({ pos: [mx + uz * s * 2.2, 0.7, mz - ux * s * 2.2], size: [0.4, 0.28, L + 0.5], color: RAIL, mat: 'metal', rot: [0, yaw, 0] });
    for (let d = carry; d < L; d += 4.5) b.part({ pos: [a.x + ux * d, 0.43, a.z + uz * d], size: [7.2, 0.26, 1.1], color: TIE, mat: 'wood', rot: [0, yaw, 0] });
    carry = (carry - L) % 4.5; if (carry < 0) carry += 4.5;
    // the trestle: a plank deck and a timber bent under every piece out over the water
    if (offIsland(mx, mz) || offIsland(a.x, a.z)) {
      b.part({ pos: [mx, -0.4, mz], size: [8, 0.8, L + 0.6], color: WOOD, mat: 'wood', rot: [0, yaw, 0], tags: ['flammable'] });
      for (const s of [-1, 1]) b.part({ pos: [mx + uz * s * 3.2, -8, mz - ux * s * 3.2], size: [1, 15, 1], color: WOOD, mat: 'wood', rot: [0, yaw, 0], tags: ['flammable'] });
      b.part({ pos: [mx, -5, mz], size: [7.4, 0.6, 0.6], color: WOOD, mat: 'wood', rot: [0, yaw + 90, 0], collide: false });
    }
  }
}

export default {
  name: 'Devastation Station',
  build(b, game) {
    const updates = [];
    // ---------------- the loop ----------------
    const loop = [];
    const arc = (cx, cz, r, a0, a1, k = 12) => { for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; loop.push(V(cx + Math.sin(a) * r, 0, cz + Math.cos(a) * r)); } };
    // north side eastward, out round the trestle, south side westward, back round the west end
    arc(140, -17, 45, Math.PI, 0);          // (140,-62) -> (185,-17) -> (140,28)
    arc(-100, -17, 45, 0, -Math.PI);        // (-100,28) -> (-145,-17) -> (-100,-62)
    track(b, loop, true);
    // siding along the north side, with buffer stops
    const siding = [V(-52, 0, -44), V(44, 0, -44)];
    track(b, siding, false);
    for (const x of [-53.5, 45.5]) { b.block(x, 0, -44, 1.2, 2.4, 6, BC.brightRed, 'wood'); b.block(x, 2.4, -44, 1.4, 0.6, 6.4, BC.white, 'metal'); }

    // ---------------- station and platform ----------------
    const st = b.building({
      x: -45, z: 2, w: 44, d: 22, floors: 2, fh: 12, color: BRICK, mat: 'brick', trim: CREAM, floorColor: 0x7a5a3a, floorMat: 'wood',
      door: 'S', doorW: 6, spacing: 8, winW: 4, winH: 6, furnish: false, ladder: false,
      interior: (bb, i) => {
        b.box(i.ix1 - 12, 0, i.iz0 + 1, i.ix1 - 1, 3.6, i.iz0 + 3, WOOD, 'wood');
        b.sign(i.ix1 - 6.5, 4.5, i.iz0 + 0.05, 8, 1.6, 'TICKETS', { bg: '#7a1d1d', depth: 0.1 });
        for (const x of [-56, -46, -36]) b.bench(x, 6, 0, WOOD);
      },
    });
    b.part({ pos: [-45, st.top - 5, st.z1 + 0.2], size: [5, 0.4, 5], color: BC.white, mat: 'plastic', shape: 'cyl', rot: [90, 0, 0] });
    b.block(-45, st.top - 5.2, st.z1 + 0.45, 0.3, 2, 0.1, BC.black, 'plastic');
    b.part({ pos: [-44.4, st.top - 4.6, st.z1 + 0.45], size: [0.3, 1.5, 0.1], color: BC.black, mat: 'plastic', rot: [0, 0, -60] });
    b.box(-82, 0, 18, -8, 1.6, 25.2, BC.mediumStone, 'concrete');
    b.box(-82, 1.6, 24.4, -8, 1.65, 25.2, BC.brightYellow, 'plastic');
    for (let x = -78; x <= -12; x += 11) b.block(x, 1.6, 19.6, 0.8, 9.4, 0.8, 0x2f5d3a, 'metal');
    b.box(-82, 11, 17.2, -8, 11.6, 25.8, 0x2f5d3a, 'metal');
    b.sign(-45, 8.2, 19.6, 18, 2.2, 'DEVASTATION STATION', { bg: '#7a1d1d', depth: 0.2 });
    for (const x of [-70, -20]) b.lamp(x, 15, 9);

    // ---------------- level crossing on the road in ----------------
    b.box(14, 0, 33, 26, 0.2, 104, 0x3b3b3e, 'asphalt');
    b.box(14, 0, -2, 26, 0.2, 23, 0x3b3b3e, 'asphalt');
    b.box(14.5, 0.3, 25.6, 25.5, 0.6, 30.4, WOOD, 'wood');
    const gates = { down: false, t: 1, blink: 0 };
    const gateArm = (px, pz, dir) => {
      b.cyl(px, 0, pz, 0.9, 5, BC.white, 'metal');
      const lights = [b.block(px - 0.7, 3.8, pz, 0.8, 0.8, 0.5, 0x5a1010, 'neon'), b.block(px + 0.7, 3.8, pz, 0.8, 0.8, 0.5, 0x5a1010, 'neon')];
      b.part({ pos: [px, 5.6, pz], size: [2.6, 2.6, 0.2], color: BC.white, mat: 'plastic', rot: [0, 0, 45] });
      // the arm is built raised (straight up) and swings down across the road
      const arm = collect(b, () => {
        for (let k = 0; k < 4; k++) b.block(px, 3 + k * 3, pz + 0.6, 0.5, 3, 0.4, k % 2 ? BC.white : BC.brightRed, 'plastic');
      });
      const pivot = V(px, 3, pz + 0.6);
      return { lights, rig: rig(game, arm, pivot), dir, pivot };
    };
    const arms = [gateArm(12.4, 34, -1), gateArm(27.6, 22, 1)];
    b.block(9, 0, 36, 0.8, 3.4, 0.8, BC.darkStone, 'metal');
    const gbtn = b.block(9, 3.4, 36, 1, 0.4, 1, BC.brightRed, 'neon');
    b.interact.push({
      pos: V(9, 0, 37.5), radius: 4.5, height: 5, object: 'Crossing Gates', label: 'Switch', part: gbtn,
      action: () => { gates.down = !gates.down; gates.t = 0; game.audio.click(); },
    });
    updates.push((dt) => {
      if (gates.t < 1) {
        gates.t = Math.min(1, gates.t + dt / 2);
        const k = gates.down ? gates.t : 1 - gates.t;
        for (const a of arms) a.rig.set(a.pivot, new THREE.Quaternion().setFromAxisAngle(Z_AXIS, a.dir * k * Math.PI / 2));
      }
      // flashing lights and the bell while the gates are down
      if (gates.down || gates.t < 1) {
        const was = Math.floor(gates.blink * 2);
        gates.blink += dt;
        const on = Math.floor(gates.blink * 2);
        if (on !== was) {
          for (const a of arms) a.lights.forEach((l, i) => game.world.setColor(l, (on + i) % 2 ? 0xff2020 : 0x5a1010, true));
          if (game.camera.position.distanceTo(V(20, 0, 28)) < 90) game.audio.tone(1300, 0.25, { type: 'triangle', gain: 0.07, pos: V(20, 4, 28) });
        }
      } else if (gates.blink) {
        gates.blink = 0;
        for (const a of arms) for (const l of a.lights) game.world.setColor(l, 0x5a1010, true);
      }
    });

    // ---------------- boxcars and the coal hopper on the siding ----------------
    const boxcar = (x, color) => {
      for (const s of [-1, 1]) b.block(x + s * 6, 0.85, -44, 4.4, 1.4, 4, BC.darkStone, 'metal');
      b.box(x - 9, 2.25, -46.8, x + 9, 8.4, -41.2, color, 'metal');
      b.box(x - 9.3, 8.4, -47.1, x + 9.3, 8.8, -40.9, BC.darkStone, 'metal');
      for (const s of [-1, 1]) b.box(x - 2.5, 2.8, -44 + s * 2.85, x + 2.5, 7.8, -44 + s * 2.95, BC.darkStone, 'metal');
    };
    boxcar(-36, 0x8a3324); boxcar(-14, 0x6b4a2a);
    b.truss(-46, 0, -44, 9.2);
    b.spot('high', -36, 8.8, -44, [V(-50, 0, -38), V(-49.5, 0, -44), V(-46, 9.2, -44), V(-36, 8.8, -44)]);
    // coal wagon under the hopper
    const HX = 20, HZ = -44;
    for (const s of [-1, 1]) b.block(HX + s * 4, 0.85, HZ, 4.4, 1.4, 4, BC.darkStone, 'metal');
    b.box(HX - 6.5, 2.25, HZ - 2.8, HX + 6.5, 3, HZ + 2.8, BC.darkStone, 'metal');
    for (const s of [-1, 1]) { b.box(HX - 6.5, 3, HZ + s * 2.8 - 0.2, HX + 6.5, 5.4, HZ + s * 2.8 + 0.2, 0x3a3a3c, 'metal'); b.box(HX + s * 6.5 - 0.2, 3, HZ - 2.6, HX + s * 6.5 + 0.2, 5.4, HZ + 2.6, 0x3a3a3c, 'metal'); }
    b.box(HX - 6.3, 3, HZ - 2.6, HX + 6.3, 4.6, HZ + 2.6, BC.reallyBlack, 'slate');
    // the hopper: a wooden bin of coal on four legs
    for (const [dx, dz] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) b.block(HX + dx, 0, HZ + dz, 1, 27, 1, WOOD, 'wood', { tags: ['flammable'] });
    const gate = b.box(HX - 6, 15, HZ - 6, HX + 6, 16, HZ + 6, 0x5c3a1e, 'wood', { tags: ['flammable'] });
    b.box(HX - 6, 16, HZ - 6, HX + 6, 27, HZ - 5, WOOD, 'wood', { tags: ['fire', 'flammable'] });
    b.box(HX - 6, 16, HZ + 5, HX + 6, 27, HZ + 6, WOOD, 'wood', { tags: ['flammable'] });
    for (const s of [-1, 1]) b.box(HX + s * 5.5 - 0.5, 16, HZ - 5, HX + s * 5.5 + 0.5, 27, HZ + 5, WOOD, 'wood', { tags: ['flammable'] });
    b.box(HX - 6.6, 27, HZ - 6.6, HX + 6.6, 27.6, HZ + 6.6, BC.darkStone, 'slate');
    b.sign(HX, 22, HZ + 6.05, 8, 1.8, 'COAL', { bg: '#1b1b1d', depth: 0.1 });
    const coal = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 2; k++) {
      coal.push(b.block(HX - 3.75 + i * 2.5, 16 + k * 2.05, HZ - 3.75 + j * 2.5, 2, 2, 2, BC.reallyBlack, 'slate', { tags: ['flammable'] }));
    }
    b.truss(HX + 7.6, 0, HZ, 28);
    b.spot('high', HX + 2, 27.6, HZ, [V(HX + 12, 0, HZ + 2), V(HX + 11, 0, HZ), V(HX + 7.6, 28, HZ), V(HX + 2, 27.6, HZ)]);
    b.block(HX + 14, 0, HZ + 8, 0.8, 3.4, 0.8, BC.darkStone, 'metal');
    const hbtn = b.block(HX + 14, 3.4, HZ + 8, 1, 0.4, 1, BC.brightRed, 'neon');
    let dumped = false;
    b.interact.push({
      pos: V(HX + 14, 0, HZ + 10), radius: 4.5, height: 5, object: 'Coal Hopper', label: 'Dump Coal', part: hbtn,
      cond: () => !dumped && gate.alive,
      action: () => {
        dumped = true;
        game.audio.crash(V(HX, 15, HZ));
        if (!game.isAuthority) return;
        game.world.removePart(gate);
        for (const c of coal) game.world.unanchor(c, { x: (Math.random() - 0.5) * 6, y: -4, z: (Math.random() - 0.5) * 6 });
      },
    });

    // ---------------- water tower ----------------
    const WX = 62, WZ = -50;
    for (const [dx, dz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) b.cyl(WX + dx, 0, WZ + dz, 1.2, 36, WOOD, 'wood', { tags: ['flammable'] });
    for (const y of [12, 24]) {
      b.box(WX - 4.5, y, WZ - 4.8, WX + 4.5, y + 0.6, WZ - 4.2, WOOD, 'wood');
      b.box(WX - 4.5, y, WZ + 4.2, WX + 4.5, y + 0.6, WZ + 4.8, WOOD, 'wood');
    }
    b.cyl(WX, 35.4, WZ, 13.6, 0.6, WOOD, 'wood');
    b.cyl(WX, 36, WZ, 13, 9, 0x7a4a26, 'wood', { tags: ['flammable'] });
    for (const y of [38, 42]) b.cyl(WX, y, WZ, 13.3, 0.4, BC.darkStone, 'metal');
    b.cyl(WX, 45, WZ, 13.6, 0.4, BC.darkStone, 'metal');
    b.part({ pos: [WX, 46.4, WZ], size: [5, 2.8, 5], color: BC.darkStone, mat: 'metal', shape: 'cone' });
    b.box(WX - 0.6, 37, WZ - 13, WX + 0.6, 38.2, WZ - 6.5, BC.darkStone, 'metal');
    b.box(WX - 0.5, 31, WZ - 13, WX + 0.5, 37, WZ - 12, BC.darkStone, 'metal');
    b.truss(WX, 0, WZ + 7.5, 45.8);
    b.spot('high', WX + 3.5, 45.4, WZ + 2, [V(WX, 0, WZ + 12), V(WX, 45.8, WZ + 7.5), V(WX + 3.5, 45.4, WZ + 2)]);

    // ---------------- the trains ----------------
    const rail = { pts: loop, loop: true, id: 'loop' };
    b.vehicle(-30, 28, -90, { kind: 'train', maxSpeed: 40, accel: 14, length: 16, rail }, (add) => {
      const GREEN = 0x2f6b3a;
      add(0, 2.6, 0, 4.4, 1, 15, BC.black, 'metal');
      for (const s of [-1, 1]) add(0, 2.6, s * 7.7, 5.8, 1.1, 0.4, BC.brightRed, 'metal');
      for (const s of [-1, 1]) for (const z of [-4.5, 0, 4.5]) add(s * 2.35, 1.9, z, 2.6, 0.5, 2.6, BC.reallyBlack, 'metal', 'cyl', [0, 0, 90]);
      add(0, 4.6, 2, 3.6, 9, 3.6, BC.black, 'metal', 'cyl', [90, 0, 0]);
      add(0, 5.6, 2.2, 4.6, 2.4, 7.4, GREEN, 'metal');
      add(0, 7.5, 6.2, 1.3, 3, 1.3, BC.black, 'metal', 'cyl');
      add(0, 7.2, 3.2, 1.6, 1.4, 1.6, 0xd8b23a, 'metal', 'ball');
      add(0, 4.6, 6.6, 3.4, 3.4, 0.4, BC.darkStone, 'metal', 'cyl', [90, 0, 0]);
      add(0, 3.25, -4.6, 4.6, 0.3, 5, BC.darkStone, 'metal');
      add(0, 5.9, -2.3, 4.6, 5, 0.4, GREEN, 'metal');
      for (const s of [-1, 1]) { add(s * 2.15, 4.5, -4.6, 0.3, 2.2, 5, GREEN, 'metal'); add(s * 2.15, 6.4, -6.9, 0.3, 4.6, 0.4, GREEN, 'metal'); }
      add(0, 8.6, -4.6, 5.2, 0.4, 5.8, BC.black, 'metal');
      add(0, 4.3, -6.7, 4.2, 1.8, 0.8, BC.reallyBlack, 'slate');
      add(0, 4.6, 6.85, 1.8, 1.2, 0.1, BC.brightYellow, 'plastic');
      const driver = add(-1.1, 3.6, -4.4, 1.6, 0.4, 1.6, BC.black, 'fabric', 'box', null, ['seat']);
      const fireman = add(1.1, 3.6, -4.4, 1.6, 0.4, 1.6, BC.black, 'fabric', 'box', null, ['seat']);
      return [driver, fireman];
    });
    const handcar = (x, z, rotY) => b.vehicle(x, z, rotY, { kind: 'handcar', maxSpeed: 22, accel: 10, length: 7, rail }, (add) => {
      add(0, 2.2, 0, 4.6, 0.4, 6.4, WOOD, 'wood');
      for (const s of [-1, 1]) for (const zz of [-2.2, 2.2]) add(s * 2.35, 1.6, zz, 1.8, 0.4, 1.8, BC.reallyBlack, 'metal', 'cyl', [0, 0, 90]);
      add(0, 3.8, 0, 0.6, 2.8, 0.6, BC.darkStone, 'metal');
      add(0, 5.3, 0, 0.4, 0.3, 4.6, BC.darkStone, 'metal');
      for (const s of [-1, 1]) add(0, 5.3, s * 2.3, 3, 0.3, 0.3, BC.darkStone, 'metal');
      const a = add(0, 2.6, -2.2, 1.6, 0.4, 1.6, BC.brightRed, 'fabric', 'box', null, ['seat']);
      const c = add(0, 2.6, 2.2, 1.6, 0.4, 1.6, BC.brightRed, 'fabric', 'box', null, ['seat']);
      return [a, c];
    });
    handcar(10, -62, 90);
    handcar(100, 28, -90);

    // ---------------- around the edges ----------------
    b.sign(20, 0.3, 66, 18, 2.6, 'DEVASTATION STATION', { bg: '#7a1d1d' });
    for (const [x, z] of [[-110, 60], [-70, 70], [70, 66], [110, 56], [-30, -100], [30, -104], [90, -96]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(11 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);

    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
