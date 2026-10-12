// The 23 maps. Each is a small themed set piece made of ordinary bricks,
// with spawn points and a fixed fire start (tag 'fire').
import * as THREE from 'three';
import { BC, DEG } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RAINBOW = [0xe0302b, 0xf28c28, 0xf5cd30, 0x4bb84b, 0x2f86d8, 0x6a3fb5];

function ringSpawns(b, r, n = 12, y = 0, cx = 0, cz = 0) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    b.spawn(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  }
}

function trashCan(b, x, y, z, fire = false) {
  b.cyl(x, y, z, 2, 3, BC.darkStone, 'metal', { tags: fire ? ['fire', 'flammable'] : ['flammable'] });
}

function pillarStack(b, x, z, w, h, color, mat, seg = 6) {
  const n = Math.ceil(h / seg);
  for (let i = 0; i < n; i++) b.block(x, i * seg, z, w, Math.min(seg, h - i * seg), w, color, mat);
}

// A climbable truss plus a "high ground" spot the bots know how to reach.
function ladderTo(b, x, y, z, h, from, to) {
  b.truss(x, y, z, h);
  b.spot('high', to[0], to[1], to[2], [V(...from), V(x, y + h - 0.4, z), V(...to)]);
}

function signPost(b, x, z, text, rotY = 0, opts = {}) {
  const r = rotY * DEG, ox = Math.cos(r) * 3.2, oz = -Math.sin(r) * 3.2;
  for (const s of [-1, 1]) b.cyl(x + s * ox, 0, z + s * oz, 0.5, 6, BC.darkStone, 'metal');
  b.sign(x, 3.4, z, 8, 2.6, text, { rotY, ...opts });
}

function desks(b, info, color = BC.brown) {
  for (let k = 0; k < info.floors; k++) {
    const y = info.levelY(k);
    const cx = (info.x0 + info.x1) / 2, cz = (info.z0 + info.z1) / 2;
    for (const dx of [-8, 8]) {
      b.table(cx + dx, y, cz + 2, 6, 3, color);
      b.chair(cx + dx, y, cz + 4.5, 180, BC.black);
    }
  }
}

export const MAPS = [
  // ------------------------------------------------------------------
  {
    name: 'Arch Park',
    build(b) {
      b.box(-70, 0, -2, 70, 0.2, 2, BC.mediumStone, 'concrete');
      b.box(-2, 0, -70, 2, 0.2, 70, BC.mediumStone, 'concrete');
      // big stone arch made of stacked blocks
      for (const sx of [-16, 16]) pillarStack(b, sx, -35, 6, 30, BC.mediumStone, 'slate', 6);
      for (let i = 0; i < 7; i++) b.block(-18 + i * 6, 30, -35, 6, 6, 6, BC.mediumStone, 'slate');
      b.block(0, 36, -35, 12, 3, 6, BC.darkStone, 'slate');
      // ladders: up the arch, and onto the pavilion roof
      ladderTo(b, -16, 0, -30, 36.4, [-16, 0, -26.5], [-8, 36, -35]);
      ladderTo(b, -55, 0, 36, 13.4, [-58.5, 0, 36], [-44, 13, 36]);
      signPost(b, -6, 59, 'ARCH PARK', 0, { bg: '#2f6b2f' });
      for (const [x, z] of [[-6, 12], [6, 12], [-6, 32], [6, 32], [-30, -25], [30, -25], [-60, 50], [58, -12]]) b.bush(x, z, 0.9);
      // fountain
      b.cyl(0, 0, 22, 18, 2.2, BC.mediumStone, 'concrete');
      b.cyl(0, 0.2, 22, 15.5, 2.2, 0x4fa3e8, 'glass', { tags: ['glass'] });
      b.cyl(0, 2.2, 22, 2, 6, BC.mediumStone, 'concrete');
      b.cyl(0, 8.2, 22, 6, 1, BC.mediumStone, 'concrete');
      b.cyl(0, 9.2, 22, 1, 2, 0x8fd0ff, 'neon');
      trashCan(b, 11, 0, 22, true);
      // pavilion (shelter)
      for (const [px, pz] of [[-52, 28], [-36, 28], [-52, 44], [-36, 44]]) b.block(px, 0, pz, 1.5, 12, 1.5, BC.white, 'concrete');
      b.box(-54, 12, 26, -34, 13, 46, BC.brightRed, 'slate');
      b.bench(-44, 33, 0); b.bench(-44, 40, 180);
      // restrooms
      b.building({ x: 46, z: -40, w: 18, d: 14, floors: 1, color: BC.sand, mat: 'brick', roof: 'flat', windows: true, spacing: 7, door: 'S', roofAccess: false, furnish: false });
      b.sign(46, 8.4, -32.8, 9, 1.8, 'RESTROOMS', { bg: '#1b4f8a' });
      // trees, benches, lamps
      const trees = [[-30, -10], [30, -10], [-28, 15], [28, 15], [-55, -45], [55, 10], [-60, 0], [60, 45], [-20, 55], [25, 55], [-58, -20], [40, -60]];
      for (const [x, z] of trees) b.tree(x, z, 1 + (x % 3) * 0.1);
      for (const [x, z, r] of [[-12, 8, 0], [12, 8, 0], [-12, 36, 180], [12, 36, 180], [-25, -50, 90], [25, -50, -90]]) b.bench(x, z, r);
      for (const [x, z] of [[-8, -8], [8, -8], [-8, 52], [8, 52], [-40, 0], [40, 0]]) b.lamp(x, z);
      // hedge walls
      b.box(-70, 0, 62, -10, 3, 64, BC.darkGreen, 'grass');
      b.box(10, 0, 62, 70, 3, 64, BC.darkGreen, 'grass');
      b.box(-24, 0, -20, -6, 4, -18, BC.mediumStone, 'brick');
      b.box(6, 0, -20, 24, 4, -18, BC.mediumStone, 'brick');
      ringSpawns(b, 30, 10); ringSpawns(b, 55, 10);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Coastal Quickstop',
    build(b) {
      b.box(-60, 0, -45, 60, 0.3, 45, BC.sand, 'sand');
      const hut = (x) => b.building({
        x, z: -5, w: 22, d: 16, floors: 1, color: BC.nougat, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, roofMat: 'wood', floorColor: BC.brown, spacing: 7,
        interior: (bb, i) => {
          b.block(x, 0.3, i.iz0 + 1.5, 5, 4, 2, BC.darkStone, 'brick', { tags: ['fire'] });
          b.block(x, 4.3, i.iz0 + 1, 3, 9, 1.5, BC.darkStone, 'brick');
          b.table(x - 5, 0.3, i.iz0 + 8, 5, 3); b.chair(x - 5, 0.3, i.iz0 + 10.5, 180);
        },
      });
      hut(-24); hut(24);
      // boardwalk & pier
      b.box(-50, 0.3, 30, 50, 1.2, 40, BC.reddishBrown, 'wood');
      for (let x = -48; x <= 48; x += 12) b.block(x, 1.2, 40, 0.8, 3, 0.8, BC.reddishBrown, 'wood');
      // fuel pump + sign
      b.block(0, 0.3, 14, 2, 5, 2, BC.brightRed, 'metal'); b.block(0, 5.3, 14, 2.6, 1, 2.6, BC.white, 'plastic');
      b.cyl(48, 0, -35, 1.2, 22, BC.darkStone, 'metal'); b.sign(48, 22, -35, 12, 6, 'COASTAL\nQUICKSTOP', { bg: '#da8541', depth: 1 });
      for (const [x, z] of [[-40, 26], [-20, 27], [20, 27], [40, 26]]) b.bush(x, z, 0.8);
      for (const [x, z] of [[-50, 20], [-40, -38], [40, -38], [52, 18], [-8, 26], [10, -38]]) b.tree(x, z, 1, 'palm');
      b.table(-12, 0.3, 22, 6, 3); b.table(12, 0.3, 22, 6, 3);
      b.chair(-12, 0.3, 19.5, 0); b.chair(12, 0.3, 19.5, 0);
      b.car(30, 20, 90, BC.brightBlue);
      ringSpawns(b, 32, 12, 0.3);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Devastation Station',
    build(b) {
      for (const tz of [-46, -16]) {
        for (let x = -72; x <= 72; x += 8) b.block(x, 0, tz, 1.4, 0.4, 8, BC.reddishBrown, 'wood');
        for (const o of [-2.2, 2.2]) b.box(-74, 0.4, tz + o - 0.3, 74, 1.1, tz + o + 0.3, BC.darkStone, 'metal');
      }
      // platform
      b.box(-60, 0, -38, 60, 3, -24, BC.mediumStone, 'concrete');
      for (let x = -50; x <= 50; x += 20) for (const z of [-36, -26]) b.block(x, 3, z, 1.2, 12, 1.2, BC.darkStone, 'metal');
      b.box(-56, 15, -39, 56, 16, -23, BC.brightGreen, 'metal');
      b.bench(-30, -31, 0); b.bench(0, -31, 0); b.bench(30, -31, 0);
      b.sign(0, 13, -31, 14, 2, 'PLATFORM 1', { bg: '#1b3a6b' });
      ladderTo(b, -57.5, 3, -31, 13.4, [-57.5, 3, -27.5], [-48, 16, -31]);
      // stairs onto platform
      for (let i = 0; i < 3; i++) b.box(-6, 0, -24 + i * 1.3, 6, 3 - i, -24 + (i + 1) * 1.3, BC.mediumStone, 'concrete');
      // train
      for (let c = 0; c < 3; c++) {
        const x = -40 + c * 26;
        b.box(x - 11, 1.1, -50, x + 11, 3, -42, BC.darkStone, 'metal');
        b.building({ x, z: -46, w: 22, d: 8, floors: 1, fh: 9, y: 3, color: c === 0 ? BC.brightRed : BC.mauve, mat: 'metal', floorColor: BC.darkStone, roof: 'flat', parapet: false, spacing: 5, winW: 3, winH: 3, door: 'N', noStairs: true, roofColor: BC.darkStone, groundTile: false });
      }
      // station building, coal loading dock on the 2nd floor
      b.building({
        x: 0, z: 22, w: 44, d: 24, floors: 2, color: BC.brightRed, mat: 'brick', trim: BC.white, floorColor: BC.reddishBrown, door: 'N', doorX: 0,
        interior: (bb, i) => {
          b.table(-10, 0.3, 22, 8, 3); b.table(10, 0.3, 22, 8, 3);
          b.chair(-10, 0.3, 19, 0); b.chair(10, 0.3, 19, 0);
          // coal dock balcony on east side at floor 2
          const y = i.levelY(1);
          b.box(22, y - 1, 12, 34, y, 32, BC.darkStone, 'metal');
          for (let k = 0; k < 4; k++) b.block(26 + (k % 2) * 4, y, 16 + k * 4, 3.5, 2.5, 3.5, BC.reallyBlack, 'slate', { tags: k === 1 ? ['fire', 'flammable'] : ['flammable'] });
          b.block(15, y, 22, 3, 2.5, 3, BC.reallyBlack, 'slate', { tags: ['flammable'] });
          b.box(33.5, y, 12, 34, y + 3, 32, BC.black, 'metal');
          b.truss(34.5, 0, 34, y + 0.5);
        },
      });
      b.sign(0, 8.4, 9.8, 18, 2.4, 'DEVASTATION STATION', { bg: '#7a1d1d', rotY: 180 });
      b.lamp(-30, 0); b.lamp(30, 0);
      b.tree(-55, 30); b.tree(55, 50); b.tree(-50, 55, 1.1);
      for (const x of [-50, -20, 20, 50]) b.spawn(x, 3, -31);
      ringSpawns(b, 50, 10, 0, 0, 25);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Factory Frenzy',
    build(b) {
      b.box(-70, 0, -50, 70, 0.2, 50, BC.darkStone, 'asphalt');
      b.building({
        x: -6, z: 0, w: 64, d: 42, floors: 3, fh: 13, color: BC.mediumStone, mat: 'metal', floorColor: BC.darkStone, floorMat: 'concrete', spacing: 9, winW: 5, winH: 5,
        trim: BC.brightOrange, door: 'S', doorX: 10, doorW: 10, stairColor: BC.brightYellow,
        interior: (bb, i) => {
          b.box(-30, 0.3, -2, 10, 3, 2, BC.black, 'metal');                 // conveyor
          for (let x = -26; x <= 6; x += 8) b.block(x, 3, 0, 2.5, 2.5, 2.5, BC.brown, 'wood');
          for (let k = 0; k < 3; k++) {
            const y = i.levelY(k);
            b.block(-20, y, 10, 8, 5, 6, BC.brightBlue, 'metal');
            b.block(14, y, 10, 6, 4, 6, BC.brightYellow, 'metal');
          }
          // 2nd floor lighting (fire start)
          const y2 = i.levelY(1);
          for (let x = -24; x <= 16; x += 10) b.block(x, y2 + 11.4, 6, 6, 0.6, 1.2, 0xfff2b0, 'neon', { tags: x === -4 ? ['fire'] : [] });
        },
      });
      b.cyl(36, 0, -12, 8, 64, BC.brightRed, 'brick');
      b.cyl(36, 64, -12, 9, 2, BC.darkStone, 'metal');
      ladderTo(b, 41.2, 0, -12, 66.4, [44.5, 0, -12], [36, 66, -12]);
      b.sign(-6, 30.5, 21.2, 26, 4, 'FACTORY FRENZY', { bg: '#c25d14' });
      for (let i = 0; i < 6; i++) b.block(40 + (i % 3) * 4, Math.floor(i / 3) * 4, 30, 3.8, 4, 3.8, BC.brown, 'wood', { tags: ['flammable'] });
      b.block(48, 0, 12, 10, 9, 22, BC.white, 'metal'); b.block(48, 0, -2, 9, 6, 7, BC.brightBlue, 'metal');
      b.lamp(-50, 32); b.lamp(30, 40);
      ringSpawns(b, 55, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Fort Indestructible',
    build(b) {
      const H = 14, S = 55, T = 4, col = BC.darkStone;
      b.box(-S, 0, -S, S, 0.2, S, BC.sand, 'sand');
      // perimeter walls (gate on the south)
      for (let x = -S; x < S; x += 22) {
        const x1 = Math.min(S, x + 22);
        b.box(x, 0, -S, x1, H, -S + T, col, 'slate');
        if (!(x >= -11 && x < 11)) b.box(x, 0, S - T, x1, H, S, col, 'slate');
        else { b.box(x, 9, S - T, x1, H, S, col, 'slate'); }
      }
      for (let z = -S + T; z < S - T; z += 22) {
        const z1 = Math.min(S - T, z + 22);
        b.box(-S, 0, z, -S + T, H, z1, col, 'slate');
        b.box(S - T, 0, z, S, H, z1, col, 'slate');
      }
      // corner towers with ladders
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const cx = sx * (S - 4), cz = sz * (S - 4);
        b.block(cx, 0, cz, 12, 24, 12, BC.mediumStone, 'slate');
        for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.block(cx + ox, 24, cz + oz, 2, 3, 2, BC.mediumStone, 'slate');
        b.truss(cx - sx * 7, 0, cz - sz * 7 + sz * 3, 24.4);
        b.spot('high', cx, 24, cz, [V(cx - sx * 9, 0, cz - sz * 9), V(cx - sx * 7, 24, cz - sz * 4), V(cx, 24, cz)]);
      }
      // ladders onto the wall walkways + gate sign
      ladderTo(b, 10, 0, -50, 14.4, [10, 0, -46.5], [10, 14, -53]);
      ladderTo(b, -50, 0, 20, 14.4, [-46.5, 0, 20], [-53, 14, 20]);
      b.sign(0, 10, 55.2, 18, 3, 'FORT INDESTRUCTIBLE', { bg: '#3d4a2f' });
      // keep
      b.building({ x: -10, z: -20, w: 34, d: 24, floors: 2, color: BC.mediumStone, mat: 'slate', floorColor: BC.darkStone, floorMat: 'concrete', spacing: 9, winW: 2, winH: 4 });
      // tanks
      const tank = (x, z, rot, fire) => {
        const r = rot * DEG;
        b.part({ pos: [x, 2, z], size: [8, 3, 12], color: BC.darkGreen, mat: 'metal', rot: [0, rot, 0], tags: fire ? ['fire'] : [] });
        b.part({ pos: [x, 4.5, z], size: [5, 2, 6], color: 0x3f6b3a, mat: 'metal', rot: [0, rot, 0] });
        b.part({ pos: [x + Math.sin(r) * 6, 4.6, z + Math.cos(r) * 6], size: [0.8, 0.8, 7], color: 0x3f6b3a, mat: 'metal', rot: [0, rot, 0] });
        for (const s of [-1, 1]) b.part({ pos: [x + Math.cos(r) * s * 4.4, 1.2, z - Math.sin(r) * s * 4.4], size: [1.4, 2.4, 13], color: BC.reallyBlack, mat: 'metal', rot: [0, rot, 0] });
      };
      tank(32, 0, 0, true); tank(30, 30, 30, false); tank(-36, 25, -20, false);
      // helicopters on pads
      const heli = (x, z) => {
        b.cyl(x, 0, z, 18, 0.3, BC.mediumStone, 'concrete');
        b.block(x, 0.3, z, 6, 6, 10, 0x4a5a3a, 'metal');
        b.block(x, 2.5, z - 10, 1.5, 1.5, 10, 0x4a5a3a, 'metal');
        b.cyl(x, 6.3, z, 0.6, 1, BC.black, 'metal');
        b.block(x, 7.3, z, 22, 0.3, 1, BC.black, 'metal');
        b.block(x, 7.3, z, 1, 0.3, 22, BC.black, 'metal');
        b.chair(x, 0.3, z + 2, 0, BC.black);
      };
      heli(-30, 30); heli(18, -38);
      b.spawn(0, 0, 40); b.spawn(-20, 0, 10); b.spawn(20, 0, 10); b.spawn(-40, 0, -40); b.spawn(40, 0, -20); b.spawn(0, 0, -45);
      b.spawn(0, 0, 70); b.spawn(-30, 0, 70); b.spawn(30, 0, 70); b.spawn(-70, 0, 0); b.spawn(70, 0, 0);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Furious Station',
    build(b) {
      b.box(-60, 0, -45, 60, 0.2, 45, BC.darkStone, 'asphalt');
      // canopy
      for (const x of [-18, 0, 18]) for (const z of [8, 28]) b.block(x, 0, z, 1.6, 14, 1.6, BC.white, 'metal');
      b.box(-24, 14, 2, 24, 16, 34, BC.brightRed, 'metal');
      b.box(-24, 13.3, 2, 24, 14, 34, BC.white, 'plastic');
      for (const x of [-9, 9]) for (const z of [12, 24]) {
        b.block(x, 0.2, z, 3, 0.6, 5, BC.mediumStone, 'concrete');
        b.block(x, 0.8, z, 2, 5, 2.5, BC.white, 'metal');
        b.block(x, 5.8, z, 2.2, 1, 2.7, BC.brightRed, 'plastic');
      }
      // store with microwaves
      b.building({
        x: 0, z: -24, w: 40, d: 20, floors: 1, fh: 13, color: BC.white, mat: 'brick', trim: BC.brightRed, spacing: 7, winW: 5, winH: 6, floorColor: BC.mediumStone, floorMat: 'concrete', roofAccess: true,
        interior: () => {
          b.box(-16, 0.3, -30, 0, 3.5, -28, BC.brightRed, 'wood');
          b.block(-13, 3.5, -29, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
          b.block(-9, 3.5, -29, 2, 1.2, 1.4, BC.white, 'metal', { tags: ['fire'] });
          for (const x of [6, 12]) b.box(x - 1, 0.3, -32, x + 1, 6, -20, BC.lightBlue, 'metal');
          b.block(16, 0.3, -31, 4, 8, 3, BC.brightBlue, 'glass', { tags: ['glass'] });
        },
      });
      b.cyl(44, 0, -30, 1.5, 30, BC.mediumStone, 'metal');
      b.sign(44, 30, -30, 14, 7, 'FURIOUS\nSTATION', { bg: '#c4281c', depth: 1 });
      b.sign(0, 9, -13.8, 16, 2.6, 'FOOD MART', { bg: '#c4281c' });
      ladderTo(b, -25.5, 0, 20, 16.4, [-29, 0, 20], [-12, 16, 20]);
      b.block(38, 0.2, 40, 4, 5, 3, BC.brightBlue, 'metal');
      b.car(-9, 36, 0, BC.brightYellow); b.car(30, 15, 90, BC.white);
      for (const [x, z] of [[-50, 30], [50, 38], [-52, -30]]) b.tree(x, z);
      ringSpawns(b, 45, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Glass Office',
    build(b) {
      b.box(-50, 0, -45, 50, 0.3, 45, BC.mediumStone, 'concrete');
      b.building({
        x: 0, z: 0, w: 46, d: 32, floors: 5, fh: 12, color: 0x3a4652, mat: 'metal', floorColor: BC.lightBlue, floorMat: 'plastic',
        winW: 6.2, winH: 8.5, spacing: 7, glassColor: 0x8fd0f0, trim: 0x2a3440, doorW: 6,
        interior: (bb, i) => {
          desks(b, i);
          const y = i.levelY(3);
          b.table(i.ix0 + 4, y, 0, 3, 6, BC.brown, ['fire']);
        },
      });
      for (const [x, z] of [[-40, 30], [40, 30], [-40, -35], [40, -35]]) { b.block(x, 0.3, z, 6, 2, 6, BC.mediumStone, 'concrete'); b.tree(x, z, 0.8); }
      b.bench(-20, 30, 0); b.bench(20, 30, 0);
      b.sign(0, 0.3, 24, 14, 2.4, 'GLASS OFFICE', { bg: '#2a3440' });
      ringSpawns(b, 42, 12, 0.3);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Happy Home',
    build(b) {
      b.building({
        x: 0, z: 0, w: 36, d: 26, floors: 2, fh: 12, color: BC.institutionalWhite, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, roofMat: 'slate',
        floorColor: BC.nougat, floorMat: 'wood', spacing: 8, trim: BC.lightBlue, ladderSide: 'W',
        interior: (bb, i) => {
          b.block(i.ix0 + 2.5, 0.3, 2, 3, 4, 6, BC.brightRed, 'fabric', { tags: ['fire', 'flammable'] }); // couch by the left window
          b.table(-4, 0.3, 4, 6, 4);
          b.chair(-4, 0.3, 7, 180); b.chair(-4, 0.3, 1, 0);
          b.block(12, 0.3, 6, 4, 6, 2, BC.brown, 'wood', { tags: ['flammable'] });
          const y = i.levelY(1);
          b.block(-8, y, 5, 8, 2, 10, BC.white, 'fabric', { tags: ['flammable'] });     // bed
          b.block(-8, y + 2, 1, 6, 1, 2, BC.lightBlue, 'fabric');
          b.block(10, y, 6, 4, 5, 2, BC.brown, 'wood', { tags: ['flammable'] });
        },
      });
      b.building({ x: 30, z: 4, w: 18, d: 18, floors: 1, fh: 11, color: BC.institutionalWhite, mat: 'wood', roof: 'flat', roofColor: BC.darkStone, windows: false, doorW: 12, roofAccess: false, furnish: false, ladder: true });
      for (const x of [-14, -8, 8, 14]) b.bush(x, 15, 0.8);
      b.cyl(-6, 0, 38, 0.4, 3.5, BC.reddishBrown, 'wood'); b.block(-6, 3.5, 38, 1, 1, 1.8, BC.brightBlue, 'metal');
      b.box(-40, 0, 13, 22, 0.25, 40, BC.grass, 'grass');
      b.box(22, 0, 13, 38, 0.3, 45, BC.mediumStone, 'concrete');
      b.fence(-45, 40, 15, 40); b.fence(-45, -30, -45, 40); b.fence(-45, -30, 40, -30);
      b.tree(-32, 28); b.tree(-30, -18, 1.2); b.tree(36, -20);
      b.cyl(-20, 0, 30, 3, 2.5, BC.brown, 'wood');
      b.bench(8, 30, 0, BC.brightRed);
      b.car(30, 26, 0, BC.brightRed);
      ringSpawns(b, 30, 10); b.spawn(-10, 0, 32); b.spawn(10, 0, 22);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Heights School',
    build(b) {
      const hy = 8;
      b.box(-50, 0, -40, 50, hy, 30, BC.grass, 'grass');
      // stairs up the hill on the south side
      for (let i = 0; i < 8; i++) b.box(-8, 0, 30 + (7 - i) * 1.5, 8, i + 1, 30 + (8 - i) * 1.5, BC.mediumStone, 'concrete');
      b.part({ pos: [-40, hy / 2, 37], size: [12, hy, 14], color: BC.grass, mat: 'grass', shape: 'wedge', rot: [0, 0, 0] });
      b.part({ pos: [40, hy / 2, 37], size: [12, hy, 14], color: BC.grass, mat: 'grass', shape: 'wedge', rot: [0, 0, 0] });
      const info = b.building({
        x: 0, z: -10, w: 64, d: 28, floors: 2, fh: 12, y: hy, color: BC.brightRed, mat: 'brick', trim: BC.white, floorColor: BC.mediumStone, floorMat: 'concrete', spacing: 8,
        interior: (bb, i) => {
          for (let k = 0; k < 2; k++) {
            const y = i.levelY(k);
            for (const x of [-20, -12, 12, 20]) for (const z of [-12, -6]) { b.table(x, y, z, 3, 2, BC.lightBlue); b.chair(x, y, z + 2, 180, BC.brightBlue); }
          }
          trashCan(b, 3, i.levelY(1), -4, true);
        },
      });
      // clock tower on the roof
      const ty = info.top;
      b.block(0, ty, -10, 10, 18, 10, BC.brightRed, 'brick');
      b.part({ pos: [0, ty + 13, -4.9], size: [6, 6, 0.3], color: BC.white, mat: 'plastic', shape: 'cyl', rot: [90, 0, 0] });
      b.block(0, ty + 13, -4.6, 0.4, 2.6, 0.2, BC.black, 'plastic');
      b.block(0, ty + 18, -10, 12, 1, 12, BC.white, 'concrete');
      b.truss(0, ty, -2.6, 19.4);
      b.sign(0, hy + 8.4, 4.2, 20, 2.4, 'HEIGHTS SCHOOL', { bg: '#7a1d1d' });
      for (const [x, z] of [[-40, -30], [40, -30], [-35, 15], [35, 15]]) b.tree(x, z, 0.9, 'pine');
      // flagpole + playground
      b.cyl(-30, hy, 20, 0.5, 20, BC.mediumStone, 'metal'); b.block(-27.5, hy + 17, 20, 4.5, 2.6, 0.2, BC.brightBlue, 'fabric');
      b.block(30, 0, 50, 10, 0.3, 10, BC.sand, 'sand');
      b.part({ pos: [30, 3, 50], size: [3, 6, 10], color: BC.brightYellow, mat: 'plastic', shape: 'wedge', rot: [0, 90, 0] });
      for (const x of [-40, -20, 20, 40]) b.spawn(x, hy, 20);
      ringSpawns(b, 60, 8);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Launch Land',
    build(b, game) {
      b.box(-40, 0, -40, 40, 2, 40, BC.mediumStone, 'concrete');
      const rocket = [];
      const R = (o) => { const p = b.part(o); rocket.push(p); return p; };
      const rx = 0, rz = 0;
      R({ pos: [rx, 2 + 27, rz], size: [9, 50, 9], color: BC.white, mat: 'metal', shape: 'cyl' });
      R({ pos: [rx, 2 + 52 + 6, rz], size: [9, 12, 9], color: BC.brightRed, mat: 'metal', shape: 'cone' });
      for (const s of [-1, 1]) {
        R({ pos: [rx + s * 6.5, 2 + 12, rz], size: [3.6, 22, 3.6], color: BC.mediumStone, mat: 'metal', shape: 'cyl' });
        R({ pos: [rx + s * 6.5, 2 + 25.5, rz], size: [3.6, 5, 3.6], color: BC.brightRed, mat: 'metal', shape: 'cone' });
      }
      for (let i = 0; i < 4; i++) R({ pos: [rx + Math.sin(i * Math.PI / 2) * 5.5, 2 + 4, rz + Math.cos(i * Math.PI / 2) * 5.5], size: [0.6, 8, 4], color: BC.brightRed, mat: 'metal', rot: [0, i * 90, 0] });
      R({ pos: [rx, 2 + 1, rz], size: [6, 2, 6], color: BC.darkStone, mat: 'metal', shape: 'cyl' });
      // capsule seats inside the nose area (a platform on top to ride)
      const top = R({ pos: [rx, 2 + 52.4, rz], size: [8.6, 0.6, 8.6], color: BC.white, mat: 'metal', shape: 'cyl' });
      // walkway ring around the rocket at bridge level: stand on it at launch to ride the rocket
      const ry = 2 + 44.8;
      for (const [x0, z0, x1, z1] of [[-7.6, -7.6, 7.6, -4.6], [-7.6, 4.6, 7.6, 7.6], [4.6, -4.6, 7.6, 4.6], [-7.6, -4.6, -4.6, 4.6]]) {
        R({ pos: [(x0 + x1) / 2, ry - 0.4, (z0 + z1) / 2], size: [x1 - x0, 0.8, z1 - z0], color: BC.darkStone, mat: 'metal' });
      }
      for (const p of rocket) p.tags.add('rocket');
      // launch tower with 4 levels, truss ladder, and bridge to rocket at level 4
      const tx = 22;
      for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) b.block(tx + ox, 2, rz + oz, 1.4, 52, 1.4, BC.brightRed, 'metal');
      for (let l = 1; l <= 4; l++) b.block(tx, 2 + l * 11, rz, 10, 0.8, 10, BC.darkStone, 'metal');
      b.truss(tx + 5.8, 2, rz, 44.8 + 0.2);
      const by = 2 + 44.8;
      b.box(7.6, by - 0.8, -2, tx - 5, by, 2, BC.darkStone, 'metal', { tags: ['fire'] });
      b.box(7.6, by, -2.2, tx - 5, by + 3, -2, BC.brightYellow, 'metal');
      b.spot('high', tx, 2 + 44.8, rz, [V(tx + 8, 2, rz), V(tx + 5.8, 2 + 44.8, rz), V(tx, 2 + 44.8, rz)]);
      b.spot('high', 6, by, 6, [V(tx + 8, 2, rz), V(tx + 5.8, by, rz), V(tx, by, rz), V(10, by, 0), V(6, by, 6)]);
      ladderTo(b, -22, 2, -24, 12.4, [-19, 2, -24], [-28, 14, -24]);
      b.sign(-26, 10, 36.2, 12, 1.6, 'LAUNCH CONTROL', { bg: '#1b2a35' });
      // control bunker + launch button
      b.building({ x: -26, z: 28, w: 26, d: 16, floors: 1, fh: 10, color: BC.mediumStone, mat: 'concrete', windows: true, spacing: 6, winW: 3, winH: 2, door: 'S', y: 2, roofAccess: false });
      const btn = b.block(-26, 2.3, 26, 2, 3.5, 2, BC.brightRed, 'neon');
      // fuel tanks
      b.cyl(-28, 2, -24, 10, 12, BC.white, 'metal'); b.cyl(-14, 2, -28, 7, 9, BC.white, 'metal');
      b.box(-10, 4, -1, -4.5, 5, 1, BC.mediumStone, 'metal');
      const state = { launched: false, t: 0, base: rocket.map(p => p.body.translation()), riders: new Set() };
      b.extras.rocket = { parts: rocket, state, top };
      b.interact.push({
        pos: V(-26, 2, 26), radius: 6, height: 5, object: 'Rocket', label: 'Launch', part: btn,
        cond: () => !state.launched,
        action: () => {
          state.launched = true; state.t = 0;
          for (const c of game.chars) if (c.alive && c.pos.distanceTo(V(rx, c.pos.y, rz)) < 6 && c.pos.y > 40) state.riders.add(c);
          game.audio.explosion(V(rx, 2, rz), 1.5);
          game.ui?.toast('3... 2... 1... Liftoff!');
        },
      });
      b.extras.update = (dt) => {
        if (!state.launched) return;
        state.t += dt;
        if (state.t < 3) { game.effects.burst(V(rx + (Math.random() - .5) * 8, 3, rz + (Math.random() - .5) * 8), { size: 12, life: 1 }); game.camController.shake = Math.max(game.camController.shake, 0.6); return; }
        const tt = state.t - 3;
        const rise = 4 * tt * tt;
        const dy = rise - (state.lastRise || 0);
        state.lastRise = rise;
        if (Math.random() < 0.6) game.effects.burst(V(rx, 2 + rise, rz), { size: 14, life: 0.8 });
        // the host flies the rocket; everyone else gets its position from the host
        if (game.isAuthority) {
          for (let i = 0; i < rocket.length; i++) {
            const p = rocket[i];
            if (!p.alive || !p.anchored) continue;
            const t0 = p.body.translation();
            p.lastDelta = { x: 0, y: dy, z: 0 };
            game.world.movePart(p, V(t0.x, t0.y + dy, t0.z));
            p._moved = true;
          }
        }
        const pl = game.player;
        if (pl.alive && pl.groundPart?.tags?.has('rocket') && rise > 20 && !state.badged) { state.badged = true; game.awardBadge('rocket'); }
        if (rise > 600) {
          if (game.isAuthority) for (const p of rocket) if (p.alive) game.world.removePart(p);
          state.launched = false; state.t = 0; b.extras.update = null;
        }
      };
      b.spawn(30, 2, 30); b.spawn(-30, 2, 0); b.spawn(0, 2, 30); b.spawn(30, 2, -30); b.spawn(0, 2, -30); b.spawn(-20, 2, 40);
      ringSpawns(b, 55, 10);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Lucky Mart',
    build(b) {
      b.box(-60, 0, 10, 60, 0.2, 55, BC.darkStone, 'asphalt');
      for (let x = -48; x <= 48; x += 12) b.box(x - 0.2, 0.2, 30, x + 0.2, 0.25, 48, BC.white, 'plastic');
      b.building({
        x: 0, z: -18, w: 56, d: 36, floors: 1, fh: 14, color: BC.lightBlue, mat: 'brick', trim: BC.brightGreen, spacing: 7, winW: 6, winH: 7, floorColor: BC.white, floorMat: 'plastic', doorW: 8, roofAccess: true,
        interior: (bb, i) => {
          for (const x of [-18, -8, 2, 12]) b.box(x - 1.5, 0.3, -30, x + 1.5, 6, -14, BC.white, 'metal');
          for (const x of [-18, -8, 2, 12]) for (const z of [-27, -22, -17]) b.block(x, 6, z, 2.5, 1, 2.5, [BC.brightRed, BC.brightYellow, BC.brightGreen][Math.abs(z) % 3], 'plastic');
          b.box(-24, 0.3, -6, -14, 3.6, -3, BC.brightGreen, 'wood', { tags: ['fire'] });
          b.block(-19, 3.6, -4.5, 1.6, 1.2, 1.2, BC.black, 'metal');
          b.box(18, 0.3, -32, 26, 7, -29, BC.white, 'metal');
        },
      });
      b.cyl(-40, 0, 40, 1, 20, BC.mediumStone, 'metal');
      b.sign(-40, 20, 40, 14, 6, 'LUCKY\nMART', { bg: '#2e8b3e', depth: 1 });
      b.sign(0, 9.4, 0.2, 26, 3.2, 'LUCKY MART', { bg: '#2e8b3e' });
      for (const x of [-24, -14, 14, 24]) b.bush(x, 4, 0.8);
      b.car(-30, 38, 0, BC.brightRed); b.car(6, 40, 180, BC.brightBlue); b.car(30, 38, 0, BC.white);
      for (let i = 0; i < 3; i++) b.block(36 + i * 3, 0.2, 14, 2, 3, 3, BC.mediumStone, 'metal');
      b.tree(-55, -30); b.tree(55, -30); b.tree(55, 0, 0.9);
      ringSpawns(b, 48, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Manic Mansion',
    build(b) {
      b.box(-65, 0, -50, 65, 0.25, 55, BC.grass, 'grass');
      b.building({
        x: 0, z: -12, w: 62, d: 34, floors: 3, fh: 12, color: BC.institutionalWhite, mat: 'concrete', trim: BC.gold, floorColor: BC.reddishBrown, floorMat: 'wood', spacing: 8, winH: 6, doorW: 7,
        interior: (bb, i) => {
          // fireplace with firewood
          b.block(20, 0.3, i.iz0 + 1.5, 8, 6, 2, BC.darkStone, 'brick');
          for (let k = 0; k < 3; k++) b.part({ pos: [18 + k * 2, 0.7, i.iz0 + 3.2], size: [0.8, 3, 0.8], color: BC.reddishBrown, mat: 'wood', shape: 'cyl', rot: [0, 0, 90], tags: k === 1 ? ['fire', 'flammable'] : ['flammable'] });
          b.block(-10, 0.3, -12, 10, 3, 4, BC.brightRed, 'fabric', { tags: ['flammable'] });
          b.table(-10, 0.3, -6, 8, 4, BC.brown);
          for (let k = 1; k < 3; k++) { const y = i.levelY(k); b.block(-14, y, -10, 8, 2, 10, BC.white, 'fabric'); b.block(14, y, -10, 8, 2, 10, BC.white, 'fabric'); }
        },
      });
      // front columns + balcony
      for (const x of [-12, -4, 4, 12]) b.cyl(x, 0, 9, 2, 12, BC.white, 'concrete');
      b.box(-15, 11, 5, 15, 12, 12, BC.white, 'concrete');
      // pool
      b.box(-40, 0, 22, 0, 0.6, 46, BC.white, 'concrete');
      b.box(-37, 0.6, 25, -3, 0.7, 43, 0x3fa9f5, 'glass', { tags: ['glass'] });
      b.box(-40, 0.6, 22, 0, 1.2, 25, BC.white, 'concrete'); b.box(-40, 0.6, 43, 0, 1.2, 46, BC.white, 'concrete');
      // garden
      b.cyl(28, 0, 32, 10, 2, BC.mediumStone, 'concrete'); b.cyl(28, 2, 32, 2, 5, BC.white, 'concrete');
      for (let x = 10; x <= 50; x += 10) b.block(x, 0, 48, 8, 3, 2, BC.darkGreen, 'grass');
      for (const x of [-26, -20, 20, 26]) b.bush(x, 7, 1);
      for (const [x, z] of [[-55, -40], [55, -40], [-55, 30], [55, 20]]) b.tree(x, z, 1.1, 'pine');
      b.car(48, 10, 0, BC.reallyBlack);
      ringSpawns(b, 45, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Modest Headquarters',
    build(b) {
      b.box(-60, 0, -40, 60, 0.3, 40, BC.mediumStone, 'concrete');
      b.building({
        x: -28, z: 0, w: 32, d: 28, floors: 4, fh: 12, color: 0xd9d4c7, mat: 'concrete', trim: BC.brightBlue, spacing: 6, winW: 4, winH: 7, glassColor: 0x7fc8f8, floorColor: BC.mediumStone, floorMat: 'plastic',
        interior: (bb, i) => { desks(b, i); b.table(-28, 0.3, 0, 4, 4, BC.brown, ['fire']); },
      });
      b.building({
        x: 28, z: 0, w: 30, d: 26, floors: 3, fh: 12, color: 0xc7d0d9, mat: 'concrete', trim: BC.brightBlue, spacing: 6, winW: 4, winH: 7, glassColor: 0x7fc8f8, floorColor: BC.mediumStone, floorMat: 'plastic',
        interior: (bb, i) => desks(b, i),
      });
      // skybridge on the 3rd floor
      b.box(-12, 23, -3, 13, 24, 3, BC.darkStone, 'metal');
      b.box(-12, 24, -3, 13, 28, -2.6, 0x7fc8f8, 'glass', { tags: ['glass'] });
      b.box(-12, 24, 2.6, 13, 28, 3, 0x7fc8f8, 'glass', { tags: ['glass'] });
      b.box(-12, 28, -3, 13, 28.5, 3, BC.darkStone, 'metal');
      b.cyl(0, 0, 30, 10, 1.5, BC.mediumStone, 'concrete'); b.cyl(0, 1.5, 30, 1.5, 8, BC.brightBlue, 'metal');
      b.sign(0, 0.3, 20, 18, 2.4, 'MODEST HEADQUARTERS', { bg: '#1b4f8a' });
      b.tree(-50, 30, 0.9); b.tree(50, 30, 0.9); b.tree(-50, -32, 0.9); b.tree(50, -32, 0.9);
      ringSpawns(b, 45, 12, 0.3);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Party Palace',
    build(b) {
      b.box(-60, 0, -50, 60, 0.2, 50, BC.sand, 'sand');
      const stall = (x, z, color) => {
        for (const [ox, oz] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) b.block(x + ox, 0, z + oz, 0.6, 8, 0.6, BC.white, 'wood');
        b.block(x, 0, z - 2, 10, 3.5, 2, BC.brown, 'wood', { tags: ['flammable'] });
        b.part({ pos: [x, 8.6, z - 2.4], size: [11, 0.4, 5.6], color, mat: 'fabric', rot: [-25, 0, 0], tags: ['flammable'] });
        b.part({ pos: [x, 8.6, z + 2.4], size: [11, 0.4, 5.6], color, mat: 'fabric', rot: [25, 0, 0], tags: ['flammable'] });
      };
      [[-40, -30], [-20, -30], [0, -30], [20, -30], [40, -30], [-40, 10], [40, 10]].forEach(([x, z], i) => stall(x, z, RAINBOW[i % RAINBOW.length]));
      // popcorn wagon (fire)
      b.block(0, 1.2, 12, 7, 3, 4, BC.brightRed, 'wood', { tags: ['fire'] });
      b.block(0, 4.2, 12, 6, 4, 3.4, 0xfff6c8, 'glass', { tags: ['glass'] });
      b.block(0, 8.2, 12, 7.4, 0.6, 4.4, BC.brightRed, 'wood');
      for (const s of [-1, 1]) b.part({ pos: [s * 2.5, 1.2, 14.4], size: [2.4, 0.5, 2.4], color: BC.black, mat: 'plastic', shape: 'cyl', rot: [0, 0, 90] });
      // bouncy castle
      b.box(-30, 0, 25, -10, 4, 45, BC.brightBlue, 'plastic');
      for (const [x, z] of [[-30, 25], [-10, 25], [-30, 45], [-10, 45]]) { b.cyl(x, 4, z, 4, 8, BC.brightRed, 'plastic'); b.ball(x, 12, z, 4, BC.brightYellow, 'plastic'); }
      b.box(-28, 4, 43, -12, 10, 45, BC.brightYellow, 'plastic');
      // stage
      b.box(15, 0, 28, 45, 4, 45, BC.reddishBrown, 'wood');
      b.box(15, 4, 44, 45, 18, 45, BC.black, 'fabric');
      for (const x of [15, 45]) b.block(x, 4, 30, 1, 14, 1, BC.black, 'metal');
      b.box(14, 18, 28, 46, 19, 46, BC.black, 'metal');
      ladderTo(b, 47.5, 0, 30, 19.4, [50.5, 0, 30], [30, 19, 36]);
      b.sign(0, 8.8, 12, 6, 1.6, 'POPCORN', { bg: '#c4281c' });
      for (const sx of [-10, 10]) b.cyl(sx, 0, -48, 0.8, 10, BC.white, 'metal');
      b.sign(0, 7, -48, 22, 3, 'PARTY PALACE', { bg: '#6a3fb5' });
      // balloons
      for (let i = 0; i < 8; i++) b.ball(-50 + i * 14, 14 + (i % 3) * 3, 48, 3, RAINBOW[i % 6], 'plastic', { tags: ['float'] });
      for (const [x, z] of [[-15, 0], [15, 0]]) { b.table(x, 0.2, z, 6, 3); b.chair(x - 2, 0.2, z + 2.5, 180); b.chair(x + 2, 0.2, z - 2.5, 0); }
      ringSpawns(b, 25, 8); ringSpawns(b, 55, 8);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Prison Panic',
    build(b) {
      b.box(-65, 0, -55, 65, 0.2, 55, BC.mediumStone, 'concrete');
      b.building({
        x: 0, z: -15, w: 70, d: 42, floors: 2, fh: 13, t: 2.2, color: BC.mediumStone, mat: 'concrete', trim: BC.darkStone, spacing: 9, winW: 2, winH: 3, floorColor: BC.darkStone, floorMat: 'concrete', glassColor: 0x8faabb,
        interior: (bb, i) => {
          // cells on ground floor
          for (let c = 0; c < 6; c++) {
            const x = -28 + c * 9;
            b.box(x, 0.3, -12, x + 0.6, 10, -3, BC.darkStone, 'concrete');
            for (let k = 0; k < 4; k++) b.box(x + 1 + k * 2, 0.3, -3.3, x + 1.4 + k * 2, 10, -2.9, BC.black, 'metal');
            b.block(x + 4.5, 0.3, -10, 6, 1.5, 2.5, BC.white, 'fabric');
          }
          b.box(26, 0.3, -12, 26.6, 10, -3, BC.darkStone, 'concrete');
          // cafeteria on the 2nd floor
          const y = i.levelY(1);
          for (const x of [-20, -6, 8]) { b.table(x, y, -14, 10, 3, BC.mediumStone); b.bench(x, -16.5, 0, BC.mediumStone); }
          trashCan(b, i.ix1 - 2, y, i.iz1 - 2, true);
        },
      });
      b.sign(0, 9, 6.2, 16, 2.4, 'STATE PRISON', { bg: '#3a3f46' });
      // yard fence
      const F = 52;
      for (const [a, c, d, e] of [[-F, 15, F, 15], [-F, 50, F, 50], [-F, 15, -F, 50], [F, 15, F, 50]]) {
        const len = Math.hypot(d - a, e - c);
        const n = Math.round(len / 8);
        for (let k = 0; k <= n; k++) b.block(a + (d - a) * k / n, 0, c + (e - c) * k / n, 0.6, 14, 0.6, BC.darkStone, 'metal');
        b.part({ pos: [(a + d) / 2, 13.6, (c + e) / 2], size: [Math.abs(d - a) + 0.6, 0.4, Math.abs(e - c) + 0.6], color: BC.darkStone, mat: 'metal' });
        b.part({ pos: [(a + d) / 2, 7, (c + e) / 2], size: [Math.abs(d - a) + 0.2, 13, Math.abs(e - c) + 0.2], color: 0x9aa3a8, mat: 'glass', tags: ['glass'] });
      }
      b.block(0, 0.2, 32, 18, 0.3, 12, BC.darkStone, 'asphalt');
      b.cyl(0, 0, 32, 0.4, 10, BC.white, 'metal'); b.block(0, 10, 31.65, 4, 3, 0.3, BC.white, 'wood');
      // guard towers
      for (const sx of [-1, 1]) {
        const x = sx * 58, z = 48;
        for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.block(x + ox, 0, z + oz, 1, 22, 1, BC.darkStone, 'metal');
        b.block(x, 22, z, 9, 1, 9, BC.darkStone, 'metal');
        b.block(x, 23, z, 9, 3, 0.4, BC.darkStone, 'metal');
        for (const [ox, oz] of [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]]) b.block(x + ox, 23, z + oz, 0.5, 5, 0.5, BC.darkStone, 'metal');
        b.block(x, 28, z, 10, 1, 10, BC.darkStone, 'metal');
        b.truss(x - sx * 5.6, 0, z, 23.2);
        b.spot('high', x, 23, z, [V(x - sx * 8, 0, z), V(x - sx * 5.6, 23, z), V(x, 23, z)]);
      }
      ringSpawns(b, 30, 6, 0, 0, 30); b.spawn(-55, 0, -45); b.spawn(55, 0, -45); b.spawn(-60, 0, 5); b.spawn(60, 0, 5);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Rainbow Ride',
    build(b) {
      b.box(-60, 0, -50, 60, 0.2, 50, BC.mediumStone, 'concrete');
      const cx = 0, cy = 38, cz = -18, R = 30, n = 24;
      // A-frame legs
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
        const leg = { x: cx + sx * 16, z: cz + sz * 5 };
        const ang = Math.atan2(16, cy) / DEG * sx;
        b.part({ pos: [(leg.x + cx) / 2, cy / 2, leg.z], size: [2, Math.hypot(16, cy) + 1, 2], color: BC.white, mat: 'metal', rot: [0, 0, ang] });
      }
      b.part({ pos: [cx, cy, cz], size: [4, 14, 4], color: BC.white, mat: 'metal', shape: 'cyl', rot: [90, 0, 0], tags: ['hub'] });
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
        const x1 = cx + Math.cos(a) * R, y1 = cy + Math.sin(a) * R, x2 = cx + Math.cos(a2) * R, y2 = cy + Math.sin(a2) * R;
        const ang = Math.atan2(y2 - y1, x2 - x1) / DEG;
        for (const sz of [-3, 3]) b.part({ pos: [(x1 + x2) / 2, (y1 + y2) / 2, cz + sz], size: [Math.hypot(x2 - x1, y2 - y1) + 0.5, 1.2, 1.2], color: RAINBOW[Math.floor(i / 4) % 6], mat: 'neon', rot: [0, 0, ang] });
        if (i % 2 === 0) {
          b.part({ pos: [cx + Math.cos(a) * R / 2, cy + Math.sin(a) * R / 2, cz], size: [R, 0.8, 0.8], color: BC.white, mat: 'metal', rot: [0, 0, a / DEG] });
          const gx = x1, gy = y1 - 4;
          const car = b.block(gx, gy - 2, cz, 5, 4, 5, i === 6 ? BC.navy : RAINBOW[(i / 2) % 6], 'metal', { tags: i === 6 ? ['fire'] : [] });
          b.block(gx, gy + 2, cz, 0.6, 2.4, 0.6, BC.white, 'metal');
          void car;
        }
      }
      // ladder up to a deck on top of the hub
      b.box(-3, 40, -24, 3, 40.6, -9.8, BC.white, 'metal');
      ladderTo(b, 0, 0, cz + 8.5, 40.4, [0, 0, cz + 12], [0, 40.6, -14]);
      // carousel
      b.cyl(-35, 0, 25, 22, 1.2, BC.brightRed, 'wood');
      b.cyl(-35, 1.2, 25, 2, 12, BC.gold, 'metal');
      b.part({ pos: [-35, 15, 25], size: [24, 6, 24], color: BC.brightYellow, mat: 'fabric', shape: 'cone' });
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const x = -35 + Math.cos(a) * 8, z = 25 + Math.sin(a) * 8;
        b.cyl(x, 1.2, z, 0.4, 10.8, BC.gold, 'metal');
        b.part({ pos: [x, 4, z], size: [1.2, 1.4, 3], color: RAINBOW[i % 6], mat: 'plastic', tags: ['seat'] });
      }
      // ticket booth + candy stand
      b.building({ x: 35, z: 30, w: 14, d: 12, floors: 1, fh: 10, color: BC.pink, mat: 'wood', roof: 'gable', roofColor: BC.white, spacing: 5, winW: 3, roofAccess: false, furnish: false });
      b.sign(35, 7.6, 36.2, 7, 1.5, 'TICKETS', { bg: '#c2185b' });
      b.block(10, 0.2, 35, 6, 4, 3, BC.pink, 'wood'); b.ball(10, 4.2, 35, 3, BC.pink, 'fabric');
      for (const [x, z] of [[-55, -40], [55, -40], [-55, 0], [55, 0]]) b.tree(x, z, 0.9);
      ringSpawns(b, 50, 12); b.spawn(0, 0, 20); b.spawn(0, 0, 40);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Rakish Refinery',
    build(b) {
      b.box(-65, 0, -55, 65, 0.2, 55, BC.darkStone, 'concrete');
      for (const [x, z] of [[-38, -30], [-38, 4], [-8, -34]]) {
        b.cyl(x, 0, z, 24, 18, BC.white, 'metal');
        b.cyl(x, 18, z, 25, 1, BC.mediumStone, 'metal');
        b.truss(x + 13, 0, z, 18.6);
        b.spot('high', x, 19, z, [V(x + 15, 0, z), V(x + 13, 19, z), V(x + 6, 19, z)]);
      }
      // distillation columns + catwalk
      for (const x of [20, 32]) { b.cyl(x, 0, -30, 7, 44, BC.mediumStone, 'metal'); b.cyl(x, 44, -30, 8, 1, BC.darkStone, 'metal'); }
      for (let l = 1; l <= 3; l++) b.box(14, l * 12, -36, 38, l * 12 + 0.6, -24, BC.brightYellow, 'metal');
      b.truss(39.5, 0, -30, 36.6);
      // pipes
      b.part({ pos: [-23, 10, -14], size: [2, 30, 2], color: BC.brightYellow, mat: 'metal', shape: 'cyl', rot: [0, 0, 90] });
      b.part({ pos: [6, 6, -30], size: [2, 24, 2], color: BC.brightYellow, mat: 'metal', shape: 'cyl', rot: [0, 0, 90] });
      for (const x of [-30, -10, 10]) b.block(x, 0, -14, 1, 10, 1, BC.darkStone, 'metal');
      // chimney + boiler
      b.cyl(40, 0, 25, 9, 72, BC.brightRed, 'brick');
      for (let i = 0; i < 4; i++) b.cyl(40, 12 + i * 16, 25, 9.6, 2, BC.white, 'metal');
      b.cyl(40, 72, 25, 2, 4, 0xff7a1a, 'neon');
      ladderTo(b, 45.6, 0, 25, 72.4, [48.8, 0, 25], [40, 72, 22.3]);
      b.block(28, 0.2, 25, 10, 8, 10, BC.darkStone, 'metal', { tags: ['fire'] });
      b.cyl(28, 8.2, 25, 3, 4, BC.mediumStone, 'metal');
      // control building
      b.building({ x: -18, z: 34, w: 34, d: 22, floors: 2, fh: 12, color: BC.brickYellow, mat: 'brick', trim: BC.brightRed, spacing: 7, interior: (bb, i) => desks(b, i) });
      b.sign(-18, 8.4, 45.2, 18, 2.2, 'RAKISH REFINERY', { bg: '#7a1d1d' });
      ringSpawns(b, 55, 12); b.spawn(0, 0, 10); b.spawn(10, 0, -5);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Raving Raceway',
    build(b) {
      // oval track
      const segs = 28, rx = 62, rz = 42, wTrack = 16;
      for (let i = 0; i < segs; i++) {
        const a = i / segs * Math.PI * 2, a2 = (i + 1) / segs * Math.PI * 2;
        const x1 = Math.cos(a) * rx, z1 = Math.sin(a) * rz, x2 = Math.cos(a2) * rx, z2 = Math.sin(a2) * rz;
        const len = Math.hypot(x2 - x1, z2 - z1);
        b.part({ pos: [(x1 + x2) / 2, 0.1, (z1 + z2) / 2], size: [wTrack, 0.2, len + 3], color: 0x3a3a3a, mat: 'asphalt', rot: [0, Math.atan2(x2 - x1, z2 - z1) / DEG, 0] });
        if (i % 2 === 0) {
          const ox = Math.cos(a) * (wTrack / 2 + 1.5), oz = Math.sin(a) * (wTrack / 2 + 1.5) * rx / rz;
          b.part({ pos: [x1 + ox * 0.95, 1, z1 + oz * 0.7], size: [1, 2, len], color: i % 4 ? BC.white : BC.brightRed, mat: 'plastic', rot: [0, Math.atan2(x2 - x1, z2 - z1) / DEG, 0] });
        }
      }
      for (let k = 0; k < 8; k++) b.block(rx - 7 + k * 2, 0.2, 0, 2, 0.1, 2, k % 2 ? BC.white : BC.black, 'plastic');
      // grandstand (stepped seats)
      for (let r = 0; r < 5; r++) b.box(-30, 0, -10 + r * 3, 30, 1.5 + r * 1.8, -10 + (r + 1) * 3, BC.mediumStone, 'concrete');
      for (let r = 0; r < 5; r++) for (let x = -26; x <= 26; x += 6) b.part({ pos: [x, 1.7 + r * 1.8, -8.5 + r * 3], size: [2, 0.4, 1.6], color: BC.brightBlue, mat: 'plastic', tags: ['seat'] });
      for (const x of [-30, 0, 30]) b.block(x, 0, 6, 1, 16, 1, BC.darkStone, 'metal');
      b.box(-31, 16, -11, 31, 17, 7, BC.brightRed, 'metal');
      b.sign(0, 13.4, 7.2, 30, 2.6, 'RAVING RACEWAY', { bg: '#c4281c' });
      ladderTo(b, -32.5, 0, -2, 17.4, [-36, 0, -2], [-15, 17, -2]);
      // pit garage + control tower
      b.building({ x: 0, z: 22, w: 40, d: 12, floors: 1, fh: 9, color: BC.white, mat: 'metal', windows: false, door: 'N', doorW: 30, roofAccess: false });
      b.building({ x: -6, z: -30, w: 26, d: 18, floors: 3, fh: 10, color: BC.white, mat: 'concrete', trim: BC.brightRed, spacing: 6, winW: 4, winH: 5, door: 'S' });
      // tire stacks
      for (const [x, z] of [[-75, 0], [75, 18], [75, -18], [-70, 25], [-70, -25]]) for (let k = 0; k < 3; k++) b.cyl(x, k * 1.2, z, 3, 1.2, BC.reallyBlack, 'plastic');
      b.car(52, -18, 0, BC.brightYellow, { fire: true });
      b.car(70, -10, 0, BC.brightRed); b.car(-62, 6, 180, BC.brightBlue); b.car(-52, -14, 180, BC.brightGreen);
      ringSpawns(b, 40, 6, 0, 0, 0); b.spawn(62, 0, 0); b.spawn(-62, 0, 0); b.spawn(0, 0, 42); b.spawn(0, 0, -42);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Safety Second',
    build(b) {
      b.box(-60, 0, -50, 60, 0.2, 50, BC.dirt, 'sand');
      // steel frame of an unfinished building
      const xs = [-30, -15, 0, 15], zs = [-30, -18, -6];
      for (let l = 0; l < 3; l++) {
        const y = l * 12;
        for (const x of xs) for (const z of zs) b.block(x, y, z, 1.2, 12, 1.2, BC.brightOrange, 'metal');
        for (const z of zs) b.box(-30.6, y + 11.4, z - 0.6, 15.6, y + 12, z + 0.6, BC.brightOrange, 'metal');
        for (const x of xs) b.box(x - 0.6, y + 11.4, -30.6, x + 0.6, y + 12, -5.4, BC.brightOrange, 'metal');
        if (l < 2) b.box(-30, y + 12, -30, l === 0 ? 15 : 0, y + 12.6, -6, BC.mediumStone, 'concrete');
      }
      // scaffolding with ladders
      for (let l = 0; l < 3; l++) {
        const y = l * 10;
        for (const x of [-30, -20, -10, 0, 10]) for (const z of [-2, 2]) b.block(x, y, z, 0.4, 10, 0.4, BC.mediumStone, 'metal');
        b.box(-30, y + 9.6, -2, 10, y + 10, 2, BC.nougat, 'wood', { tags: ['flammable'] });
      }
      b.truss(12, 0, 0, 30.4);
      b.spot('high', -10, 30, 0, [V(15, 0, 0), V(12, 30, 0), V(0, 30, 0)]);
      // crane
      b.block(40, 2, -25, 2, 58, 2, BC.brightYellow, 'metal');
      ladderTo(b, 40, 0, -21.5, 62.4, [40, 0, -18], [30, 62, -25]);
      b.sign(-10, 10.2, 2.4, 14, 3, 'SAFETY SECOND', { bg: '#f2b50f', fg: '#1b1b1b' });
      b.block(40, 0, -25, 6, 2, 6, BC.brightYellow, 'concrete');
      b.box(10, 60, -26, 60, 62, -24, BC.brightYellow, 'metal');
      b.block(56, 56, -25, 5, 4, 3, BC.darkStone, 'concrete');
      b.block(14, 50, -25, 0.3, 10, 0.3, BC.black, 'metal');
      b.block(14, 48, -25, 4, 2, 4, BC.brightYellow, 'metal');
      // material lockers (fire)
      for (let i = 0; i < 4; i++) b.block(-40 + i * 3.2, 0.2, 20, 3, 7, 3, BC.brightBlue, 'metal', { tags: i === 1 ? ['fire'] : [] });
      // dirt piles, cones, portable toilet, cement mixer
      b.part({ pos: [30, 3, 25], size: [16, 6, 16], color: BC.dirt, mat: 'sand', shape: 'frustum' });
      for (let i = 0; i < 8; i++) b.part({ pos: [-20 + i * 6, 1, 38], size: [1.5, 2, 1.5], color: BC.brightOrange, mat: 'plastic', shape: 'cone' });
      b.block(-50, 0.2, -40, 4, 8, 4, BC.brightBlue, 'plastic');
      b.cyl(45, 2, 40, 5, 6, BC.brightOrange, 'metal'); b.block(45, 0.2, 40, 7, 2, 8, BC.darkStone, 'metal');
      ringSpawns(b, 45, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Sky Tower',
    build(b) {
      b.box(-45, 0, -45, 45, 0.3, 45, BC.mediumStone, 'concrete');
      const info = b.building({
        x: 0, z: 0, w: 32, d: 28, floors: 10, fh: 10, color: 0x2c3e50, mat: 'metal', trim: 0x5f7f99, spacing: 7, winW: 5, winH: 6, sill: 2, glassColor: 0x8fd0f0, floorColor: BC.mediumStone, floorMat: 'plastic',
        interior: (bb, i) => { b.table(8, 0.3, 0, 4, 4, BC.brown, ['fire']); b.table(-6, 0.3, 4, 6, 3); },
      });
      b.cyl(0, info.top, 0, 2, 22, BC.mediumStone, 'metal');
      b.ball(0, info.top + 22, 0, 2, BC.brightRed, 'neon');
      for (const [x, z] of [[-35, 30], [35, 30], [-35, -30], [35, -30]]) b.tree(x, z, 0.8);
      b.bench(-15, 28, 0); b.bench(15, 28, 0);
      b.sign(0, 7.6, 14.2, 14, 1.8, 'SKY TOWER', { bg: '#1b2a35' });
      ringSpawns(b, 32, 12, 0.3);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Sunny Ranch',
    build(b) {
      // barn
      b.building({
        x: -15, z: -15, w: 40, d: 28, floors: 1, fh: 18, color: BC.brightRed, mat: 'wood', roof: 'gable', roofColor: BC.darkStone, roofMat: 'slate', windows: true, spacing: 10, winW: 3, winH: 4, sill: 8, doorW: 12, floorColor: BC.sand, floorMat: 'sand', trim: BC.white, roofAccess: false,
        interior: (bb, i) => {
          b.box(i.ix0, 9, i.iz0, i.ix0 + 14, 10, i.iz1, BC.nougat, 'wood', { tags: ['flammable'] });
          b.truss(i.ix0 + 15, 0.3, i.iz1 - 4, 10);
          for (let k = 0; k < 6; k++) b.block(i.ix0 + 2 + (k % 3) * 4, 10, i.iz0 + 4 + Math.floor(k / 3) * 6, 3.6, 2.6, 5, BC.brickYellow, 'grass', { tags: ['flammable'] });
        },
      });
      b.cyl(16, 0, -25, 12, 32, BC.mediumStone, 'metal');
      b.cyl(16, 32, -25, 13, 1, BC.darkStone, 'metal');
      b.part({ pos: [16, 36, -25], size: [8, 6, 8], color: BC.brightRed, mat: 'metal', shape: 'cone' });
      ladderTo(b, 23, 0, -25, 33.4, [26, 0, -25], [11.4, 33, -25]);
      b.sign(-15, 11, -0.8, 16, 3, 'SUNNY RANCH', { bg: '#7a1d1d' });
      // farmhouse
      b.building({ x: 34, z: 26, w: 26, d: 20, floors: 2, fh: 11, color: BC.white, mat: 'wood', roof: 'gable', roofColor: BC.reddishBrown, spacing: 7, winW: 3 });
      // fences / pasture
      b.fence(-55, 10, -55, 50); b.fence(-55, 50, 10, 50); b.fence(10, 50, 10, 10); b.fence(-55, 10, -10, 10);
      // lanterns (fire)
      for (const [x, z, f] of [[-30, 8, true], [0, 8, false], [-60, -40, false], [50, -10, false]]) {
        b.block(x, 0, z, 0.6, 8, 0.6, BC.reddishBrown, 'wood');
        b.block(x, 8, z, 1.4, 1.8, 1.4, 0xffd27a, 'neon', { tags: f ? ['fire'] : [] });
      }
      // tractor
      b.block(-30, 1.6, 30, 6, 3, 10, BC.brightGreen, 'metal');
      b.block(-30, 4.6, 32, 5, 4, 4, BC.brightGreen, 'metal');
      for (const [x, z, d] of [[-33.6, 26, 3], [-26.4, 26, 3], [-33.6, 34, 5], [-26.4, 34, 5]]) b.part({ pos: [x, d / 2, z], size: [d, 1.2, d], color: BC.reallyBlack, mat: 'plastic', shape: 'cyl', rot: [0, 0, 90] });
      b.part({ pos: [-30, 4.8, 27.8], size: [2, 0.4, 2], color: BC.black, mat: 'fabric', tags: ['seat'] });
      for (let k = 0; k < 6; k++) b.part({ pos: [-10 + k * 4, 1.5, 32 + (k % 2) * 4], size: [3, 3, 3], color: BC.brickYellow, mat: 'grass', shape: 'cyl', rot: [0, 0, 90], tags: ['flammable'] });
      b.block(-45, 0, 30, 8, 2, 3, BC.mediumStone, 'metal');
      for (const [x, z] of [[50, -40], [-58, -10], [55, 5]]) b.tree(x, z);
      ringSpawns(b, 48, 12);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Surf Central',
    build(b) {
      b.box(-60, 0, -50, 60, 0.3, 55, BC.sand, 'sand');
      b.building({
        x: 0, z: -14, w: 36, d: 26, floors: 3, fh: 12, color: BC.teal, mat: 'wood', trim: BC.white, floorColor: BC.nougat, spacing: 7, winW: 4, winH: 5, stairFire: true,
        interior: (bb, i) => {
          for (let k = 0; k < 4; k++) b.part({ pos: [-12 + k * 3, 4, i.iz0 + 1.6], size: [2, 7, 0.4], color: RAINBOW[k], mat: 'plastic', rot: [8, 0, 0] });
          b.box(4, 0.3, 4, 14, 3.6, 6, BC.white, 'wood');
        },
      });
      // lifeguard tower
      for (const [ox, oz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) b.block(30 + ox, 0.3, 30 + oz, 0.8, 12, 0.8, BC.white, 'wood');
      b.block(30, 12.3, 30, 7, 0.8, 7, BC.white, 'wood');
      b.block(30, 19, 30, 8, 0.6, 8, BC.brightRed, 'wood');
      for (const [ox, oz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) b.block(30 + ox, 13.1, 30 + oz, 0.4, 6, 0.4, BC.white, 'wood');
      b.truss(30, 0.3, 34.5, 12.9);
      b.spot('high', 30, 13, 30, [V(30, 0, 37), V(30, 13, 34.5), V(30, 13, 30)]);
      // umbrellas + surfboards + towels
      for (const [x, z, c] of [[-30, 25, BC.brightRed], [-15, 38, BC.brightYellow], [5, 30, BC.brightBlue], [-40, 42, BC.brightGreen]]) {
        b.cyl(x, 0.3, z, 0.4, 8, BC.white, 'metal');
        b.part({ pos: [x, 9, z], size: [9, 2.5, 9], color: c, mat: 'fabric', shape: 'cone' });
        b.block(x + 3, 0.3, z + 2, 3, 0.15, 6, c, 'fabric');
      }
      for (let k = 0; k < 5; k++) b.part({ pos: [40 + k * 3, 3.5, -10], size: [2, 7, 0.4], color: RAINBOW[k], mat: 'plastic', rot: [-10, 0, 0] });
      b.box(-55, 0.3, -48, 55, 1, -42, BC.reddishBrown, 'wood');
      b.sign(0, 8.6, -0.8, 18, 2.6, 'SURF CENTRAL', { bg: '#0b8f8a' });
      for (const [x, z] of [[-50, 10], [50, 15], [-45, -35], [48, -38]]) b.tree(x, z, 1, 'palm');
      ringSpawns(b, 40, 12, 0.3);
    },
  },
  // ------------------------------------------------------------------
  {
    name: 'Trailer Park',
    build(b) {
      b.box(-60, 0, -10, 60, 0.2, 2, BC.darkStone, 'asphalt');
      const colors = [BC.white, BC.lightBlue, BC.brickYellow, BC.institutionalWhite, BC.sand, BC.pastelBlue, BC.white, BC.nougat];
      for (let i = 0; i < 8; i++) {
        const x = -48 + (i % 4) * 32, z = i < 4 ? -30 : 22;
        b.building({ x, z, w: 24, d: 11, floors: 1, fh: 9, color: colors[i], mat: 'metal', roof: 'flat', parapet: false, roofColor: BC.mediumStone, roofMat: 'metal', spacing: 6, winW: 3, winH: 3, door: i < 4 ? 'S' : 'N', doorX: -6, doorW: 3, trim: BC.brightRed, noStairs: true, y: 1 });
        for (const ox of [-8, 8]) b.block(x + ox, 0, z, 2, 1, 9, BC.darkStone, 'concrete');
      }
      // water tower + tree (fire)
      const wx = 40, wz = 45;
      for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.block(wx + ox, 0, wz + oz, 1.2, 30, 1.2, BC.mediumStone, 'metal');
      b.block(wx, 30, wz, 14, 1, 14, BC.mediumStone, 'metal');
      b.cyl(wx, 31, wz, 13, 12, BC.lightBlue, 'metal');
      b.part({ pos: [wx, 46, wz], size: [14, 6, 14], color: BC.mediumStone, mat: 'metal', shape: 'cone' });
      b.truss(wx - 7.8, 0, wz, 31.2);
      b.spot('high', wx - 5, 31, wz - 5, [V(wx - 10, 0, wz), V(wx - 7.8, 31, wz), V(wx - 5, 31, wz - 5.5)]);
      b.tree(wx - 16, wz - 4, 1, 'oak', true);
      for (const [x, z] of [[-20, 45], [0, 45]]) { b.table(x, 0, z, 6, 3); b.bench(x, z - 2.5, 0); }
      b.fence(-60, -45, 60, -45); b.fence(-60, 55, 20, 55);
      for (const [x, z] of [[-55, 45], [58, -2], [-58, -2]]) b.tree(x, z, 1, 'pine');
      b.car(-20, -4, 90, BC.brightGreen);
      signPost(b, -54, -14, 'TRAILER PARK', 0, { bg: '#2f6b2f' });
      ringSpawns(b, 20, 6, 0.2, 0, -4); b.spawn(-50, 0, 45); b.spawn(50, 0, 20); b.spawn(0, 0, 50); b.spawn(-50, 0, -50); b.spawn(50, 0, -50);
    },
  },
];

export function buildMap(game, def, MapBuilder) {
  const b = new MapBuilder(game, def.name);
  def.build(b, game);
  const map = b.finish();
  game.world.buildSupport(map.parts, 0);
  return map;
}
