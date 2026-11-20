// Prison Panic: a fenced prison. Inside the main block are twelve cells (each with a
// bed and a toilet) either side of a corridor, the gym, the visiting room and the
// "snapshot room" -- step on its orange pad and you're locked in a random cell for a
// while. The cafeteria is upstairs (the fire starts in its bin). Out in the yard are a
// basketball court and the one watchtower, reached by its stairs. Barbed wire tops the
// fence (30 damage) and a security booth guards the gate.
import { BC } from '../util.js';
import { V, rig, trashCan } from './helpers.js';
import * as THREE from 'three';

const WALL = 0xa7a9ac, DARK = 0x4f5359, BARS = 0x2b2d30, ORANGE = 0xf28c28;
const NONE = new THREE.Quaternion();

export default {
  name: 'Prison Panic',
  build(b, game) {
    const updates = [];
    // ---------------- the main block ----------------
    const cells = [];
    const pb = b.building({
      x: 0, z: -45, w: 80, d: 50, floors: 2, fh: 13, color: WALL, mat: 'concrete', trim: DARK, floorColor: 0x7d7f82, floorMat: 'concrete',
      door: 'S', doorW: 6, spacing: 9, winW: 2.4, winH: 3.5, glassColor: 0x8faabb, furnish: false, ladder: false,
      interior: (bb, i) => {
        // two rows of six cells facing each other across the corridor
        const rows = [{ z0: i.iz0, z1: i.iz0 + 8, front: i.iz0 + 8, out: 1 }, { z0: i.iz0 + 20, z1: i.iz0 + 28, front: i.iz0 + 20, out: -1 }];
        const cw = 8, cx0 = -16;
        for (const r of rows) {
          if (r.out < 0) b.box(cx0 - 0.3, 0.3, r.z1, cx0 + 6 * cw + 0.3, 10, r.z1 + 0.6, WALL, 'concrete');
          for (let c = 0; c <= 6; c++) b.box(cx0 + c * cw - 0.3, 0.3, r.z0, cx0 + c * cw + 0.3, 10, r.z1, WALL, 'concrete');
          for (let c = 0; c < 6; c++) {
            const x0 = cx0 + c * cw, xm = x0 + cw / 2;
            // bars, leaving a doorway in the middle
            for (let x = x0 + 0.9; x < x0 + cw - 0.5; x += 1.1) if (Math.abs(x - xm) > 2.1) b.box(x - 0.12, 0.3, r.front - 0.12, x + 0.12, 10, r.front + 0.12, BARS, 'metal');
            b.box(x0 + 0.3, 9.4, r.front - 0.2, x0 + cw - 0.3, 10, r.front + 0.2, BARS, 'metal');
            const back = r.out > 0 ? r.z0 : r.z1;
            // bed along one wall, toilet in the back corner
            b.box(x0 + 0.3, 0.3, back + (r.out > 0 ? 0 : -6), x0 + 3, 1.6, back + (r.out > 0 ? 6 : 0), BC.white, 'fabric', { tags: ['flammable'] });
            b.block(x0 + cw - 1.6, 0.3, back + r.out * 1.2, 1.6, 1.6, 1.6, BC.white, 'plastic');
            b.block(x0 + cw - 1.6, 1.9, back + r.out * 0.5, 1.6, 1.4, 0.6, BC.white, 'plastic');
            // the cell door: slid open behind the bars until someone gets locked in
            const door = b.box(xm + 2.1, 0.3, r.front + r.out * 0.4 - 0.12, xm + 6.1, 9.4, r.front + r.out * 0.4 + 0.12, BARS, 'metal');
            const open = V(xm + 4.1, 0, r.front), shut = V(xm, 0, r.front);
            const dr = rig(game, [door], open);
            cells.push({ rig: dr, open, shut, inside: V(xm, 0.3, back + r.out * 4), timer: 0, door });
          }
        }
        // gym in the west wing
        b.box(i.ix0 + 2, 0.3, i.iz0 + 10, i.ix0 + 20, 0.5, i.iz0 + 26, 0x2b4f8a, 'plastic');
        b.block(i.ix0 + 6, 0.3, i.iz0 + 14, 1.6, 1.6, 5, DARK, 'fabric');
        b.block(i.ix0 + 6, 3.4, i.iz0 + 14, 0.3, 0.3, 7, BC.mediumStone, 'metal');
        for (const s of [-1, 1]) b.cyl(i.ix0 + 6, 3, i.iz0 + 14 + s * 3.2, 2, 1, BC.black, 'metal');
        b.box(i.ix0 + 12, 0.3, i.iz0 + 11, i.ix0 + 18, 3.4, i.iz0 + 12.2, DARK, 'metal');
        b.cyl(i.ix0 + 15, 3, i.iz0 + 22, 2.2, 5, BC.brightRed, 'fabric');
        b.box(i.ix0 + 14.7, 8, i.iz0 + 21.7, i.ix0 + 15.3, 12.4, i.iz0 + 22.3, BARS, 'metal');
        b.sign(i.ix0 + 11, 7, i.iz0 + 26.6, 8, 1.4, 'GYM', { bg: '#2b4f8a', depth: 0.1 });
      },
    });
    // snapshot room and visiting room by the entrance
    const sx0 = pb.ix0 + 1, sz0 = pb.iz0 + 29;
    b.box(sx0, 0.3, sz0, sx0 + 12, 10, sz0 + 0.6, WALL, 'concrete');
    b.box(sx0 + 12, 0.3, sz0, sx0 + 12.6, 10, sz0 + 6, WALL, 'concrete');
    b.box(sx0 + 12, 0.3, sz0 + 10, sx0 + 12.6, 10, pb.iz1, WALL, 'concrete');
    for (let k = 0; k < 6; k++) b.box(pb.ix0 + 0.05, 1 + k * 1.2, sz0 + 2, pb.ix0 + 0.15, 1.5 + k * 1.2, sz0 + 9, k % 2 ? BC.white : BC.black, 'plastic', { collide: false });
    b.sign(pb.ix0 + 0.15, 8.4, sz0 + 5.5, 7, 1.2, 'SNAPSHOT', { bg: '#1b1b1d', rotY: 90, depth: 0.1 });
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [0, 0.7]]) b.block(sx0 + 9 + dx, 0.3, sz0 + 5.5 + dz, 0.2, 4, 0.2, BARS, 'metal');
    b.block(sx0 + 9, 4.3, sz0 + 5.5, 1.6, 1.2, 1.2, BC.black, 'metal');
    const pad = b.block(sx0 + 4, 0.3, sz0 + 5.5, 4, 0.2, 4, ORANGE, 'neon');
    // visiting room: a glass screen with phones between two rows of chairs
    const vx0 = sx0 + 13;
    b.box(vx0, 0.3, sz0 + 3, vx0 + 12, 3.4, sz0 + 4, DARK, 'wood');
    b.box(vx0, 3.4, sz0 + 3.3, vx0 + 12, 9, sz0 + 3.7, 0xa9d4f5, 'glass', { tags: ['glass'] });
    for (let x = vx0 + 2; x < vx0 + 12; x += 4) {
      b.chair(x, 0.3, sz0 + 1.4, 0, BC.brightBlue); b.chair(x, 0.3, sz0 + 6, 180, ORANGE);
      b.block(x + 1, 3.4, sz0 + 2.9, 0.4, 1.2, 0.4, BC.black, 'plastic');
    }
    b.sign(vx0 + 6, 9.2, sz0 + 3.5, 8, 1.2, 'VISITING', { bg: '#3a3f46', depth: 0.1 });
    // the cafeteria upstairs (the fire starts in its bin)
    const y2 = pb.levelY(1);
    for (const x of [-20, -2, 16]) {
      b.table(x, y2, -36, 12, 3, BC.mediumStone);
      for (const z of [-38.6, -33.4]) b.box(x - 5, y2, z - 0.7, x + 5, y2 + 1.6, z + 0.7, DARK, 'metal', { tags: ['seat'] });
    }
    b.box(pb.ix1 - 14, y2, pb.iz1 - 3, pb.ix1 - 2, y2 + 3.6, pb.iz1 - 1, BC.mediumStone, 'metal');
    trashCan(b, pb.ix1 - 2, y2, pb.iz0 + 30, true);
    b.sign(0, 9, pb.z1 + 0.05, 16, 2.4, 'STATE PRISON', { bg: '#3a3f46', depth: 0.1 });

    // the photo pad: stand on it and you're locked in a random cell for a while
    let jailN = 0, padCd = 0;
    const jailIdx = b.interact.length;
    b.interact.push({
      pos: V(sx0 + 4, 0.5, sz0 + 5.5), radius: 0, height: 0, object: 'Snapshot', label: '', hidden: true, part: pad,
      action: () => {
        jailN++;
        const cell = cells[Math.floor(Math.abs(Math.sin(jailN * 91.7 + 3.3) * 1e4) % cells.length)];
        // each machine moves its own people who are standing on the pad
        for (const c of game.localChars()) {
          if (!c.alive || c.seat) continue;
          if (Math.abs(c.pos.x - (sx0 + 4)) < 2.6 && Math.abs(c.pos.z - (sz0 + 5.5)) < 2.6 && c.pos.y < 3) {
            c.teleport(cell.inside.clone().add(V(0, 0.2, 0)));
            if (c.isPlayer) game.ui?.toast('Snap! You have been locked up.', 3000);
          }
        }
        game.audio.click();
        cell.timer = 25;
      },
    });
    updates.push((dt) => {
      // standing on the pad (this machine's player, or the host's bots) sets it off
      padCd -= dt;
      if (padCd <= 0) {
        for (const c of game.localChars()) {
          if (!c.alive || !c.inRound || c.seat || (c !== game.player && !game.isAuthority)) continue;
          if (Math.abs(c.pos.x - (sx0 + 4)) < 2 && Math.abs(c.pos.z - (sz0 + 5.5)) < 2 && c.pos.y < 2) { padCd = 2; game.triggerMapAction(jailIdx); break; }
        }
      }
      for (const cell of cells) {
        const was = cell.timer > 0;
        cell.timer = Math.max(0, cell.timer - dt);
        if (was || cell.moving) {
          // the door slides shut, stays shut while the timer runs, then slides open
          const want = cell.timer > 0 ? 1 : 0;
          cell.k = (cell.k ?? 0) + Math.sign(want - (cell.k ?? 0)) * Math.min(Math.abs(want - (cell.k ?? 0)), dt * 1.5);
          cell.moving = cell.k !== want;
          cell.rig.set(cell.open.clone().lerp(cell.shut, cell.k), NONE);
        }
      }
    });

    // ---------------- the yard: fence, barbed wire, gate, booth ----------------
    const FX0 = -70, FX1 = 70, FZ0 = -80, FZ1 = 40, FH = 12;
    const wires = [];
    const fence = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 8)), yaw = Math.atan2(bx - ax, bz - az) * 180 / Math.PI;
      for (let k = 0; k <= n; k++) b.block(ax + (bx - ax) * k / n, 0, az + (bz - az) * k / n, 0.6, FH + 1, 0.6, DARK, 'metal');
      b.part({ pos: [(ax + bx) / 2, FH / 2, (az + bz) / 2], size: [0.15, FH, L], color: 0x9aa3a8, mat: 'glass', rot: [0, yaw, 0], tags: ['glass'] });
      wires.push(b.part({ pos: [(ax + bx) / 2, FH + 0.6, (az + bz) / 2], size: [1.2, 1.2, L], color: 0x7d8186, mat: 'metal', rot: [0, yaw, 0] }));
      wires[wires.length - 1].wire = { ax, az, bx, bz };
    };
    fence(FX0, FZ0, FX1, FZ0); fence(FX0, FZ0, FX0, FZ1); fence(FX1, FZ0, FX1, FZ1);
    fence(FX0, FZ1, -8, FZ1); fence(8, FZ1, FX1, FZ1);
    const hurtAt = new Map();
    updates.push(() => {
      for (const c of game.localChars()) {
        if (!c.alive || !c.inRound || c.pos.y + 5 < FH || c.pos.y > FH + 1.6) continue;
        for (const w of wires) {
          const { ax, az, bx, bz } = w.wire, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
          const t = Math.max(0, Math.min(1, ((c.pos.x - ax) * dx + (c.pos.z - az) * dz) / L2));
          if (Math.hypot(ax + dx * t - c.pos.x, az + dz * t - c.pos.z) > 1.6) continue;
          if ((hurtAt.get(c) || 0) > game.time) break;
          hurtAt.set(c, game.time + 1);
          c.damage(30, 'barbed wire');
          break;
        }
      }
    });
    // security booth and barrier at the gate
    b.box(10, 0, FZ1 - 4, 18, 8, FZ1 + 2, WALL, 'concrete');
    b.box(9.9, 3, FZ1 - 3, 10, 6, FZ1 + 1, 0xa9d4f5, 'glass', { tags: ['glass'] });
    b.box(9.4, 8, FZ1 - 4.6, 18.6, 8.6, FZ1 + 2.6, DARK, 'concrete');
    b.block(-9, 0, FZ1 + 1.5, 1, 3.6, 1, DARK, 'metal');
    b.box(-8.5, 3, FZ1 + 1.3, 6, 3.4, FZ1 + 1.7, BC.brightRed, 'plastic');
    b.sign(14, 6.2, FZ1 + 2.05, 6, 1.2, 'SECURITY', { bg: '#3a3f46', depth: 0.1 });
    b.box(-6, 0, FZ1, 6, 0.2, 104, BC.mediumStone, 'concrete');
    b.box(-6, 0, pb.z1, 6, 0.2, FZ1, BC.mediumStone, 'concrete');

    // basketball court with a ball to throw around
    b.box(14, 0, -12, 54, 0.2, 14, 0x3b3b3e, 'asphalt');
    b.box(33.8, 0.2, -12, 34.2, 0.22, 14, BC.white, 'plastic');
    b.cyl(34, 0.2, 1, 7, 0.03, BC.white, 'plastic', { collide: false });
    for (const [x, s] of [[16, 1], [52, -1]]) {
      b.block(x - s * 1.2, 0, 1, 0.6, 10, 0.6, DARK, 'metal');
      b.block(x, 9, 1, 0.3, 3.6, 5, BC.white, 'plastic');
      b.part({ pos: [x + s * 1.2, 9.4, 1], size: [2, 0.2, 2], color: ORANGE, mat: 'metal', shape: 'cyl' });
    }
    const ball = b.ball(34, 0.2, 4, 1.4, ORANGE, 'plastic');
    let freed = false;
    updates.push(() => { if (!freed && game.isAuthority) { freed = true; game.world.unanchor(ball); } });
    for (const [x, z] of [[-30, 10], [-50, 20]]) { b.table(x, 0, z, 6, 3, BC.mediumStone); b.bench(x, z - 2.5, 0, BC.mediumStone); b.bench(x, z + 2.5, 180, BC.mediumStone); }

    // the one watchtower, up its own stairs
    const wt = b.building({
      x: -48, z: 24, w: 22, d: 14, floors: 6, fh: 8, color: DARK, mat: 'concrete', trim: WALL, door: 'S', doorW: 4,
      spacing: 6, winW: 2, winH: 2, floorColor: 0x7d7f82, floorMat: 'concrete', furnish: false, ladder: false,
    });
    for (const [x, z] of [[wt.x0 + 1, wt.z0 + 1], [wt.x1 - 1, wt.z0 + 1], [wt.x0 + 1, wt.z1 - 1], [wt.x1 - 1, wt.z1 - 1]]) b.block(x, wt.top, z, 0.6, 7, 0.6, DARK, 'metal');
    b.box(wt.x0 - 1, wt.top + 7, wt.z0 - 1, wt.x1 + 1, wt.top + 7.6, wt.z1 + 1, DARK, 'metal');
    b.block(wt.x1 - 3, wt.top + 2, wt.z1 - 3, 1.4, 1.4, 2, 0xfff2b0, 'neon');

    for (const [x, z] of [[-100, 60], [100, 60], [-110, -60], [110, -60]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0.2, 82 + Math.floor(i / 4) * 6);
    b.extras.update = (dt) => { for (const u of updates) u(dt); };
  },
};
