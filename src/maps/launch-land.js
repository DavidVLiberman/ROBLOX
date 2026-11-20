// Launch Land: a space shuttle (white orbiter on an orange fuel tank between two
// white boosters) stands on a concrete launch pad between two red lattice towers.
// The tall main tower has stairs and a crew access arm across to the orbiter's
// cabin, which seats six. A launch takes four buttons, in order:
//   1. release the access arm (main tower, beside the arm)
//   2. open the fuel valves (top of the second tower)
//   3. start the main engines (red button inside the shuttle)
//   4. launch (console at the bottom of the second tower)
// Then a ten second countdown, the arm swings away and the shuttle lifts off --
// unless the launch fails and it blows up. Lightning can destroy it on the pad.
import * as THREE from 'three';
import { BC, rand } from '../util.js';
import { V } from './helpers.js';

const RED = 0xb5352a, GRATE = 0x5d5f61, WHITE = 0xf2f3f3, ORANGE = 0xd9822b, BLACK = 0x1b1b1d;
const PAD = 1.2;            // top of the concrete pad
const LEVEL = PAD + 5 * 10; // the main tower's 6th floor = the cabin floor = the arm

// a railing round the open edges of a lattice tower floor (gaps: [[side, a0, a1]])
function rails(b, info, y, gaps = []) {
  const { x0, x1, z0, z1 } = info, h = 3.2;
  const run = (side, a0, a1, mk) => {
    let cuts = [[a0, a1]];
    for (const [s, g0, g1] of gaps) if (s === side) cuts = cuts.flatMap(([c0, c1]) => g1 <= c0 || g0 >= c1 ? [[c0, c1]] : [[c0, g0], [g1, c1]].filter(([u, v]) => v - u > 0.2));
    for (const [c0, c1] of cuts) mk(c0, c1);
  };
  run('N', x0, x1, (a, c) => b.box(a, y, z0 - 0.2, c, y + h, z0 + 0.2, RED, 'metal'));
  run('S', x0, x1, (a, c) => b.box(a, y, z1 - 0.2, c, y + h, z1 + 0.2, RED, 'metal'));
  run('W', z0 + 0.2, z1 - 0.2, (a, c) => b.box(x0 - 0.2, y, a, x0 + 0.2, y + h, c, RED, 'metal'));
  run('E', z0 + 0.2, z1 - 0.2, (a, c) => b.box(x1 - 0.2, y, a, x1 + 0.2, y + h, c, RED, 'metal'));
}

// lattice cross-bracing on the faces of a tower (decoration: nothing to bump into)
function braces(b, info, skip = () => false) {
  const { x0, x1, z0, z1, x, z } = info, fh = info.fh;
  const w = x1 - x0, d = z1 - z0;
  for (let k = 0; k < info.floors; k++) {
    const y = info.levelY(k) + fh / 2, s = k % 2 ? 1 : -1;
    const ax = Math.atan2(w, fh) * 180 / Math.PI, az = Math.atan2(d, fh) * 180 / Math.PI;
    for (const [face, zz] of [['N', z0], ['S', z1]]) if (!skip(face, k)) b.part({ pos: [x, y, zz], size: [0.4, Math.hypot(w, fh), 0.4], color: RED, mat: 'metal', rot: [0, 0, s * ax], collide: false });
    for (const [face, xx] of [['W', x0], ['E', x1]]) if (!skip(face, k)) b.part({ pos: [xx, y, z], size: [0.4, Math.hypot(d, fh), 0.4], color: RED, mat: 'metal', rot: [s * az, 0, 0], collide: false });
  }
}

export default {
  name: 'Launch Land',
  build(b, game) {
    // ---------------- the pad ----------------
    b.box(-60, 0, -66, 60, PAD, 24, 0xc9c9c4, 'concrete');
    // mobile launch platform under the stack, with the flame holes
    b.box(-18, PAD, -44, 18, 8, -6, BC.mediumStone, 'metal');
    for (const [x, z] of [[-11.5, -32], [11.5, -32], [0, -17]]) b.cyl(x, 7.9, z, 7, 0.2, BC.black, 'metal', { collide: false });

    // ---------------- the shuttle ----------------
    const shuttle = [];
    const S = (o) => { const p = b.part(o); p.tags.add('shuttle'); p.tags.add('rocket'); shuttle.push(p); return p; };
    const blk = (x0, y0, z0, x1, y1, z1, color, mat = 'metal', extra = {}) => S({ pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], size: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], color, mat, ...extra });
    const ET = { x: 0, z: -32, r: 7.5 };
    // orange external tank with its pointed nose
    S({ pos: [ET.x, 8 + 33, ET.z], size: [ET.r * 2, 66, ET.r * 2], color: ORANGE, mat: 'plastic', shape: 'cyl' });
    S({ pos: [ET.x, 74 + 6, ET.z], size: [ET.r * 2, 12, ET.r * 2], color: ORANGE, mat: 'plastic', shape: 'cone' });
    // two white solid rocket boosters
    for (const s of [-1, 1]) {
      const x = s * 11.5;
      S({ pos: [x, 8 + 1.5, ET.z], size: [7.6, 3, 7.6], color: BC.darkStone, mat: 'metal', shape: 'cyl' });
      S({ pos: [x, 11 + 27.5, ET.z], size: [6.5, 55, 6.5], color: WHITE, mat: 'plastic', shape: 'cyl' });
      S({ pos: [x, 66 + 3, ET.z], size: [6.5, 6, 6.5], color: WHITE, mat: 'plastic', shape: 'cone' });
      S({ pos: [x, 30, ET.z], size: [6.7, 0.6, 6.7], color: BC.black, mat: 'plastic', shape: 'cyl' });
      blk(x - s * 3.5, 20, ET.z - 0.6, x - s * 3.1, 22, ET.z + 0.6, BC.mediumStone);   // attach struts
      blk(x - s * 3.5, 60, ET.z - 0.6, x - s * 3.1, 62, ET.z + 0.6, BC.mediumStone);
    }
    // the orbiter, belly to the tank
    const OZ0 = ET.z + ET.r + 1, OZ1 = OZ0 + 12, OZ = (OZ0 + OZ1) / 2;   // -23.5 .. -11.5
    const CF = LEVEL - 1;                                                 // cabin floor slab
    blk(-6, 14, OZ0, 6, CF, OZ1, WHITE, 'plastic');
    blk(-6, 14, OZ0 - 0.4, 6, CF + 11, OZ0, BLACK, 'plastic');            // black heat-shield belly
    blk(-1.5, 30, OZ0 - 1, 1.5, 32, OZ0 - 0.4, BC.mediumStone);           // tank struts
    blk(-1.5, 12, OZ0 - 1, 1.5, 14, OZ0 - 0.4, BC.mediumStone);
    for (const [x, z] of [[-2.8, OZ0 + 3], [2.8, OZ0 + 3], [0, OZ0 + 8]]) S({ pos: [x, 11.5, z], size: [4, 5, 4], color: BC.darkStone, mat: 'metal', shape: 'cone' });
    for (const s of [-1, 1]) blk(s * 4 - 1.6, 14, OZ1, s * 4 + 1.6, 22, OZ1 + 2, WHITE, 'plastic');   // OMS pods
    // delta wings and the tail fin
    for (const s of [-1, 1]) S({ pos: [s * 11, 14 + 11, OZ0 + 1.5], size: [1, 22, 10], color: WHITE, mat: 'plastic', shape: 'wedge', rot: [0, s * 90, 0] });
    for (const s of [-1, 1]) S({ pos: [s * 15.6, 14.2, OZ0 + 1.5], size: [0.8, 0.4, 1.2], color: BLACK, mat: 'plastic' });
    S({ pos: [0, 14 + 9, OZ1 + 4.5], size: [1, 18, 9], color: WHITE, mat: 'plastic', shape: 'wedge' });
    // the crew cabin: hollow, door on the tower side, six seats and the engine button
    blk(-6, CF, OZ0, 6, LEVEL, OZ1, 0xc9c9c4, 'plastic', { tags: ['floor'] });
    const WH = 8.5, ix0 = -5.2, ix1 = 5.2, iz0 = OZ0 + 0.8, iz1 = OZ1 - 0.8, DZ0 = OZ - 2.2, DZ1 = OZ + 2.2;
    blk(-6, LEVEL, OZ0, 6, LEVEL + WH, iz0, WHITE, 'plastic');                    // belly wall
    blk(-6, LEVEL, iz1, 6, LEVEL + WH, OZ1, WHITE, 'plastic');                    // back wall
    blk(-6, LEVEL, iz0, ix0, LEVEL + WH, iz1, WHITE, 'plastic');                  // west wall
    blk(ix1, LEVEL, iz0, 6, LEVEL + WH, DZ0, WHITE, 'plastic');                   // east wall, either side of the door
    blk(ix1, LEVEL, DZ1, 6, LEVEL + WH, iz1, WHITE, 'plastic');
    blk(ix1, LEVEL + 7, DZ0, 6, LEVEL + WH, DZ1, WHITE, 'plastic');
    for (const x of [-3.5, 0, 3.5]) blk(x - 1.2, LEVEL + 5.6, OZ1 - 0.05, x + 1.2, LEVEL + 7.2, OZ1 + 0.05, BLACK, 'glass', { tags: ['glass'] });   // cockpit windows
    blk(-6, LEVEL + WH, OZ0, 6, LEVEL + WH + 1, OZ1, WHITE, 'plastic');            // roof
    S({ pos: [0, LEVEL + WH + 1 + 4.5, OZ], size: [12, 9, 12], color: WHITE, mat: 'plastic', shape: 'wedge' });   // nose
    blk(-6.05, LEVEL + WH + 6.5, OZ0, 6.05, LEVEL + WH + 10, OZ0 + 1.6, BLACK, 'plastic');                      // black nose cap
    const seats = [];
    for (const z of [iz0 + 1.6, iz1 - 1.6]) for (const x of [-3.6, -1.2, 1.2]) seats.push(b.chair(x, LEVEL, z, z < OZ ? 0 : 180, BC.mediumStone));
    // the chairs belong to the shuttle too
    for (const p of b.parts.slice(-seats.length * 3)) { p.tags.add('shuttle'); p.tags.add('rocket'); shuttle.push(p); }
    blk(ix0, LEVEL, OZ - 1.4, ix0 + 0.8, LEVEL + 3.2, OZ + 1.4, BC.darkStone);
    const btn3 = blk(ix0 + 0.8, LEVEL + 2.2, OZ - 0.5, ix0 + 1.1, LEVEL + 3, OZ + 0.5, BC.brightRed, 'neon');
    b.sign(0, 30, OZ1 + 0.05, 6, 3, 'USA', { bg: '#f2f3f3', fg: '#1b1b1d', depth: 0.1 });

    // ---------------- main tower, crew access arm ----------------
    const lattice = { walls: false, t: 0.6, color: RED, mat: 'metal', floorColor: GRATE, floorMat: 'metal', stairColor: BC.mediumStone, roofColor: GRATE, roofMat: 'metal', furnish: false, ladder: false, roofDetails: false, y: PAD };
    const main = b.building({ ...lattice, x: 32, z: OZ - 3, w: 24, d: 16, floors: 6, fh: 10, door: 'S' });
    const armZ0 = OZ - 2.4, armZ1 = OZ + 2.4;      // matches the cabin door
    for (let k = 1; k < 6; k++) rails(b, main, main.levelY(k), k === 5 ? [['W', armZ0, armZ1]] : []);
    braces(b, main, (face, k) => face === 'W' && k >= 4);
    b.box(main.x0 - 0.6, LEVEL - 1, armZ0 + 0.4, main.x0 + 0.6, LEVEL, armZ1 - 0.4, GRATE, 'metal');
    // hammerhead crane and the lightning mast on top
    b.block(main.x + 6, main.top, main.z0 + 3, 2, 6, 2, RED, 'metal');
    b.box(main.x0 + 2, main.top + 6, main.z0 + 2.2, main.x1 + 4, main.top + 7.4, main.z0 + 3.8, RED, 'metal');
    b.cyl(main.x - 4, main.top, main.z0 + 3, 1.6, 34, BC.institutionalWhite, 'metal');
    b.ball(main.x - 4, main.top + 34, main.z0 + 3, 1.4, BC.brightRed, 'neon');
    // the arm: a white enclosed walkway; it swings away during the countdown
    const arm = [
      b.box(6, LEVEL - 1, armZ0 + 0.4, main.x0 - 0.6, LEVEL, armZ1 - 0.4, GRATE, 'metal'),
      b.box(6, LEVEL, armZ0, main.x0 - 0.6, LEVEL + 7, armZ0 + 0.4, WHITE, 'plastic'),
      b.box(6, LEVEL, armZ1 - 0.4, main.x0 - 0.6, LEVEL + 7, armZ1, WHITE, 'plastic'),
      b.box(6, LEVEL + 7, armZ0, main.x0 - 0.6, LEVEL + 7.6, armZ1, WHITE, 'plastic'),
    ];
    const hinge = { x: main.x0 - 0.6, z: armZ1 };
    const armBase = arm.map(p => p.body.translation()).map(t => ({ x: t.x, y: t.y, z: t.z }));
    // button 1, beside the arm
    b.block(main.x0 + 3, LEVEL, armZ0 - 2.5, 1.6, 3.4, 1.6, BC.darkStone, 'metal');
    const btn1 = b.block(main.x0 + 3, LEVEL + 3.4, armZ0 - 2.5, 1, 0.4, 1, BC.brightRed, 'neon');

    // ---------------- second tower ----------------
    const second = b.building({ ...lattice, x: -38, z: -24, w: 16, d: 16, floors: 6, fh: 10, door: 'S' });
    for (let k = 1; k < 6; k++) rails(b, second, second.levelY(k));
    braces(b, second);
    // button 2 on its roof
    b.block(second.x + 5, second.top, second.z + 5, 1.6, 3.4, 1.6, BC.darkStone, 'metal');
    const btn2 = b.block(second.x + 5, second.top + 3.4, second.z + 5, 1, 0.4, 1, BC.brightRed, 'neon');
    // button 4 and the status lights at its foot
    const cz = second.z1 + 3.5;
    b.block(second.x, PAD, cz, 3, 3, 2, BC.mediumStone, 'metal');
    const btn4 = b.block(second.x, PAD + 3, cz, 1.4, 0.5, 1.2, BC.brightRed, 'neon');
    b.block(second.x, PAD + 3, cz - 0.9, 7, 4, 0.4, BLACK, 'metal');
    const lamps = [0, 1, 2, 3].map(i => b.block(second.x - 2.25 + i * 1.5, PAD + 5.3, cz - 0.6, 1, 1, 0.3, BC.brightRed, 'neon'));
    b.sign(second.x, PAD + 7, cz - 0.9, 7, 1.4, 'LAUNCH', { bg: '#1b1b1d', depth: 0.2 });

    // fire starts at the generator at the foot of the main tower
    b.block(main.x1 + 3, PAD, main.z + 2, 3, 3.5, 5, BC.darkStone, 'metal', { tags: ['fire'] });
    b.block(main.x1 + 3, PAD + 3.5, main.z + 2, 1, 2, 1, BC.black, 'metal');

    // ---------------- the way in ----------------
    b.box(-5, 0, 24, 5, 0.25, 104, BC.mediumStone, 'concrete');
    b.sign(0, 0.3, 56, 16, 2.6, 'LAUNCH LAND', { bg: '#1b2a35' });
    for (const x of [-54, 54]) for (const z of [-60, 18]) { b.cyl(x, PAD, z, 0.8, 18, BC.mediumStone, 'metal'); b.block(x, PAD + 18, z, 3, 1, 3, 0xfff2b0, 'neon'); }
    for (const [x, z] of [[-80, 40], [80, 40], [-96, -20], [96, -20], [-70, 70], [70, 70]]) b.tree(x, z, 1.0);
    for (let i = 0; i < 12; i++) b.spawn(-9 + (i % 4) * 6, 0, 82 + Math.floor(i / 4) * 6);

    // ---------------- bot spots in the shuttle ----------------
    // (a building's path ends on its top floor, which is the arm's floor)
    const toArm = [...main.path, V(main.x1 - 2, LEVEL, armZ0 + 1.6), V(main.x0 + 1.5, LEVEL, OZ), V(12, LEVEL, OZ), V(3.5, LEVEL, OZ)];
    b.spot('indoor', 0, LEVEL, OZ, [...toArm, V(0, LEVEL, OZ)]);
    b.spot('high', 12, LEVEL, OZ, [...toArm.slice(0, -1)]);

    // ---------------- the launch ----------------
    const state = { step: 0, countdown: -1, launched: false, t: 0, rise: 0, broken: false, failed: false, fails: rand() < 0.2, checkT: 0 };
    b.extras.rocket = { parts: shuttle, state, top: LEVEL };
    const say = (text) => game.ui?.toast(text, 3000);
    const lamp = (i) => game.world.setColor(lamps[i], BC.brightGreen, true);
    const ok = () => !state.broken && !state.launched && state.countdown < 0;
    const steps = [
      { pos: V(main.x0 + 3, LEVEL, armZ0 - 1), part: btn1, object: 'Access Arm', label: 'Release' },
      { pos: V(second.x + 5, second.top, second.z + 6.5), part: btn2, object: 'Fuel Valves', label: 'Open' },
      { pos: V(ix0 + 2.5, LEVEL, OZ), part: btn3, object: 'Main Engines', label: 'Start' },
      { pos: V(second.x, PAD, cz + 2.5), part: btn4, object: 'Launch', label: 'Launch!' },
    ];
    const msgs = ['Access arm released (1/4)', 'Fuel valves open (2/4)', 'Main engines armed (3/4)'];
    steps.forEach((s, i) => b.interact.push({
      pos: s.pos, radius: 4.5, height: 5, object: s.object, label: s.label, part: s.part,
      cond: () => ok() && state.step === i,
      action: () => {
        state.step = i + 1;
        lamp(i);
        game.audio.click();
        if (i < 3) { say(msgs[i]); return; }
        state.countdown = 10;
        say('Launch sequence started! T-10');
        // whoever pushed the button launched the rocket
        const pl = game.player;
        if (pl.alive && pl.inRound && pl.pos.distanceTo(s.pos) < 9) game.awardBadge('rocket');
      },
    }));

    const center = () => { const t = shuttle[0].body.translation(); return V(t.x, t.y, t.z); };
    // everything still standing falls apart (lightning, a failed launch)
    const breakUp = (why, kill) => {
      state.broken = true; state.launched = false; state.countdown = -1;
      game.audio.loop('rocket', false);
      const c = center();
      for (let i = 0; i < 6; i++) game.effects.burst(c.clone().add(V((Math.random() - .5) * 16, (Math.random() - .5) * 50, (Math.random() - .5) * 16)), { size: 18, life: 1.2 });
      game.audio.explosion(c, 2);
      if (game.isAuthority) game.world.explode(c, 60, 60, { filter: (p) => p.tags.has('shuttle') });
      if (kill) for (const ch of game.localChars()) if (ch.alive && ch.inRound && ch.pos.distanceTo(c) < kill) ch.die('explosion');
      say(why);
    };
    const swingArm = (a) => {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const ca = Math.cos(a), sa = Math.sin(a);
      arm.forEach((p, i) => {
        if (!p.alive || !p.anchored) return;
        const o = armBase[i], dx = o.x - hinge.x, dz = o.z - hinge.z;
        const nx = hinge.x + dx * ca + dz * sa, nz = hinge.z - dx * sa + dz * ca;
        const t = p.body.translation();
        p.lastDelta = { x: nx - t.x, y: 0, z: nz - t.z };
        game.world.movePart(p, V(nx, o.y, nz), q);
        p._moved = true;
      });
    };

    b.extras.update = (dt) => {
      if (state.broken) return;
      // lightning (or anything else) knocked a piece loose: the whole stack comes down
      state.checkT -= dt;
      if (state.checkT <= 0) {
        state.checkT = 0.25;
        if (shuttle.some(p => !p.alive || !p.anchored)) { breakUp('The shuttle was destroyed!', 0); return; }
      }
      if (state.countdown >= 0) {
        const before = Math.ceil(state.countdown);
        state.countdown -= dt;
        const now = Math.ceil(state.countdown);
        if (now !== before && now > 0) say(`T-${now}`);
        // the arm swings clear between T-8 and T-3
        if (game.isAuthority && state.countdown < 8 && state.countdown > 2.5) swingArm(Math.min(1, (8 - state.countdown) / 5) * Math.PI / 2);
        if (state.countdown <= 3) {
          for (const x of [-11.5, 11.5, 0]) game.effects.burst(V(x + (Math.random() - .5) * 4, 6, (x ? ET.z : OZ0 + 5) + (Math.random() - .5) * 4), { size: 10, life: 0.8 });
          game.camController.shake = Math.max(game.camController.shake, 0.3);
        }
        if (state.countdown <= 0) {
          state.countdown = -1; state.launched = true; state.t = 0;
          say('Liftoff!');
          game.audio.explosion(center(), 1.5);
          game.audio.loop('rocket', true, { type: 'brown', filter: 'lowpass', freq: 260, gain: 0.5 });
        }
        return;
      }
      if (!state.launched) return;
      state.t += dt;
      const rise = 1.6 * state.t * state.t, dy = rise - state.rise;
      state.rise = rise;
      // exhaust under the boosters and engines
      for (const x of [-11.5, 11.5]) game.effects.burst(V(x, 7 + rise, ET.z), { size: 14, life: 0.9 });
      if (Math.random() < 0.5) game.effects.burst(V(0, 9 + rise, OZ0 + 5), { size: 10, life: 0.6 });
      if (rise < 80) game.camController.shake = Math.max(game.camController.shake, 0.5);
      if (state.fails && state.t > 3.5) { state.failed = true; breakUp('The launch failed!', 40); return; }
      // the host flies the shuttle; everyone else follows the host
      if (game.isAuthority) {
        for (const p of shuttle) {
          if (!p.alive || !p.anchored) continue;
          const t0 = p.body.translation();
          p.lastDelta = { x: 0, y: dy, z: 0 };
          game.world.movePart(p, V(t0.x, t0.y + dy, t0.z));
          p._moved = true;
        }
      }
      const pl = game.player;
      if (pl.alive && rise > 20 && !state.badged && (pl.groundPart?.tags?.has('shuttle') || pl.seat?.tags?.has('shuttle'))) { state.badged = true; game.awardBadge('rocket'); }
      if (rise > 600) {
        game.audio.loop('rocket', false);
        if (game.isAuthority) for (const p of shuttle) if (p.alive) game.world.removePart(p);
        state.launched = false; state.broken = true;
      }
    };
  },
};
