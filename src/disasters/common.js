import * as THREE from 'three';
import { rand, ISLAND_HALF } from '../util.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const MAP_R = 85;

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

// Simple pooled projectile meshes (meteors, lava blobs, droplets, snowballs).
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
