// Small building helpers shared by the map files.
import * as THREE from 'three';
import { BC, DEG } from '../util.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const RAINBOW = [0xe0302b, 0xf28c28, 0xf5cd30, 0x4bb84b, 0x2f86d8, 0x6a3fb5];

export function ringSpawns(b, r, n = 12, y = 0, cx = 0, cz = 0) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    b.spawn(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  }
}

export function trashCan(b, x, y, z, fire = false) {
  b.cyl(x, y, z, 2, 3, BC.darkStone, 'metal', { tags: fire ? ['fire', 'flammable'] : ['flammable'] });
}

export function pillarStack(b, x, z, w, h, color, mat, seg = 6) {
  const n = Math.ceil(h / seg);
  for (let i = 0; i < n; i++) b.block(x, i * seg, z, w, Math.min(seg, h - i * seg), w, color, mat);
}

// A climbable truss plus a "high ground" spot the bots know how to reach.
export function ladderTo(b, x, y, z, h, from, to) {
  b.truss(x, y, z, h);
  b.spot('high', to[0], to[1], to[2], [V(...from), V(x, y + h - 0.4, z), V(...to)]);
}

export function signPost(b, x, z, text, rotY = 0, opts = {}) {
  const r = rotY * DEG, ox = Math.cos(r) * 3.2, oz = -Math.sin(r) * 3.2;
  for (const s of [-1, 1]) b.cyl(x + s * ox, 0, z + s * oz, 0.5, 6, BC.darkStone, 'metal');
  b.sign(x, 3.4, z, 8, 2.6, text, { rotY, ...opts });
}

export function desks(b, info, color = BC.brown) {
  for (let k = 0; k < info.floors; k++) {
    const y = info.levelY(k);
    const cx = (info.x0 + info.x1) / 2, cz = (info.z0 + info.z1) / 2;
    for (const dx of [-8, 8]) {
      b.table(cx + dx, y, cz + 2, 6, 3, color);
      b.chair(cx + dx, y, cz + 4.5, 180, BC.black);
    }
  }
}
