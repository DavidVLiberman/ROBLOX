import * as THREE from 'three';
import * as U from '../util.js';
const { rand } = U;

// How disasters work in multiplayer:
//  * g.isAuthority (the host) makes every random decision and does everything to bricks;
//    decisions reach the other players as events (emit -> onEvent on every machine).
//  * every machine draws the effects and applies damage to the characters it
//    simulates (g.localChars(): your own character, plus the bots on the host).
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const MAP_R = 85;

export const isHost = (g) => g.isAuthority;
export const locals = (g) => g.localChars();
export function emit(g, st, ev) { g.round.emit(st, ev); }

// Small seeded RNG so every machine expands an event (e.g. a cough's droplets) the same way.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomMapPoint(r = MAP_R) {
  return V((rand() * 2 - 1) * r, 0, (rand() * 2 - 1) * r);
}

// Characters standing somewhere on the island (alive, not in the lobby).
export function charsOnIsland(g, includeSpectators = true) {
  return g.chars.filter(c => c.alive && (includeSpectators || c.inRound) && g.island.onIsland(c.pos));
}

export function isOutdoors(g, c, height = 220) {
  const hit = g.world.raycast(V(c.pos.x, c.pos.y + 5.2, c.pos.z), V(0, 1, 0), height);
  return !hit;
}

// Topmost surface at (x, z).
export function groundAt(g, x, z, from = 300) {
  const hit = g.world.raycast(V(x, from, z), V(0, -1, 0), from + 20);
  return hit ? hit.point.y : 0;
}

export function mapParts(g) {
  return g.map ? g.map.parts.filter(p => p.alive) : [];
}

// The island's grass (an oval once util.js has ISLAND_RX/ISLAND_RZ, a square before that).
export const ISL_RX = U.ISLAND_RX ?? U.ISLAND_HALF ?? 160;
export const ISL_RZ = U.ISLAND_RZ ?? U.ISLAND_HALF ?? 160;
export function inIsland(x, z, margin = 0) {
  if (U.insideIsland) return U.insideIsland(x, z, -margin);
  return Math.abs(x) < ISL_RX - margin && Math.abs(z) < ISL_RZ - margin;
}
// A random point on the grass, at least `margin` in from its edge.
export function randomIslandPoint(margin = 0, rnd = rand) {
  for (let i = 0; i < 20; i++) {
    const x = (rnd() * 2 - 1) * (ISL_RX - margin), z = (rnd() * 2 - 1) * (ISL_RZ - margin);
    if (inIsland(x, z, margin)) return V(x, 0, z);
  }
  return V(0, 0, 0);
}
// Distance from the island centre to the grass edge along a horizontal direction.
export function islandEdge(dx, dz) {
  const l = Math.hypot(dx, dz) || 1;
  const x = dx / l, z = dz / l;
  return 1 / Math.sqrt((x / ISL_RX) ** 2 + (z / ISL_RZ) ** 2);
}

// Simple projectile meshes (meteors, droplets).
export function sphereMesh(g, radius, color, emissive = false) {
  const mat = emissive ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), mat);
  m.castShadow = true;
  g.scene.add(m);
  return m;
}

export function disposeMesh(g, m) {
  g.scene.remove(m);
  m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}

export const toArr = (v) => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
export const fromArr = (a) => V(a[0], a[1], a[2]);
