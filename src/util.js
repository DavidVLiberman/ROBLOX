// Small shared helpers.
import * as THREE from 'three';

export const GRAVITY = 196.2;          // Roblox default, studs/s^2
export const WALK_SPEED = 16;
export const JUMP_POWER = 50;
export const MAX_HEALTH = 100;
export const OCEAN_LEVEL = -6;
// The island is a squished oval of grass (semi-axes ISLAND_RX by ISLAND_RZ) with a
// dirt edge and rock layers under it. Maps keep their walkable footprint inside
// insideIsland(x, z, -7), i.e. (x/158)^2 + (z/140)^2 <= 1.
export const ISLAND_RX = 165;
export const ISLAND_RZ = 148;
export function insideIsland(x, z, pad = 0) {
  const a = x / (ISLAND_RX + pad), b = z / (ISLAND_RZ + pad);
  return a * a + b * b <= 1;
}
// (older square bounds, still used by some code: the oval fits inside them)
export const ISLAND_HALF = 160;
export const RIM_HALF = 178;

// Seeded RNG (mulberry32) so maps/disasters can be reproduced from the URL.
let seed = (Date.now() ^ 0x5f3759df) >>> 0;
export function setSeed(s) { seed = (s >>> 0) || 1; }
export function rand() {
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (a, b) => a + (b - a) * rand();
export const randInt = (a, b) => Math.floor(randRange(a, b + 1));
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const DEG = Math.PI / 180;

// Roblox BrickColor palette (classic names used by the noob and maps).
export const BC = {
  brightYellow: 0xf5cd30,
  brightBlue: 0x0d69ac,
  yellowGreen: 0xa4bd47,
  brightRed: 0xc4281c,
  brightGreen: 0x4b974b,
  darkGreen: 0x287f47,
  white: 0xf2f3f3,
  institutionalWhite: 0xf8f8f8,
  mediumStone: 0xa3a2a5,
  darkStone: 0x635f62,
  black: 0x1b2a35,
  reallyBlack: 0x111111,
  brown: 0x7c5c46,
  reddishBrown: 0x694028,
  nougat: 0xcc8e69,
  sand: 0xe0c48c,
  brickYellow: 0xd7c59a,
  brightOrange: 0xda8541,
  deepOrange: 0xff6a00,
  pastelBlue: 0x80bbdc,
  lightBlue: 0xb4d2e4,
  navy: 0x002060,
  teal: 0x12eed4,
  magenta: 0xaa00aa,
  pink: 0xff66cc,
  lime: 0x00ff00,
  cyan: 0x04afec,
  grass: 0x5a9e3c,
  dirt: 0x7a5a3a,
  rock: 0x6e6a64,
  slate: 0x5c5c5c,
  pine: 0x2c6e3a,
  mauve: 0x8a6f8f,
  gold: 0xd4a017,
  rust: 0x8f4c2a,
};

export const tmpV = new THREE.Vector3();
export const tmpV2 = new THREE.Vector3();
export const tmpQ = new THREE.Quaternion();
export const tmpM = new THREE.Matrix4();

export function eulerDeg(rx = 0, ry = 0, rz = 0) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'YXZ'));
}

export function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return `${s}`;
}
