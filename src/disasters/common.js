import * as THREE from 'three';
import { rand, ISLAND_HALF } from '../util.js';

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

export function inIsland(x, z, margin = 0) {
  return Math.abs(x) < ISLAND_HALF - margin && Math.abs(z) < ISLAND_HALF - margin;
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
