// Drivable cars: the parts stay anchored and are moved as a group.
// In multiplayer the driver's machine drives the car and tells everyone where it is.
import * as THREE from 'three';
import { clamp, RIM_HALF } from './util.js';

const _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0);

function placeParts(game, v) {
  _q.setFromAxisAngle(_y, v.yaw);
  for (const p of v.parts) {
    const off = p.local.off.clone().applyQuaternion(_q);
    const old = p.body.translation();
    const pos = new THREE.Vector3(v.pos.x + off.x, off.y, v.pos.z + off.z);
    p.lastDelta = { x: pos.x - old.x, y: 0, z: pos.z - old.z };
    p._moved = true;
    game.world.movePart(p, pos, _q.clone().multiply(p.local.rot));
  }
}

export function stepVehicles(game, dt) {
  game.vehicles.forEach((v, vi) => {
    if (v.broken) return;
    if (v.parts.some(p => !p.alive || !p.anchored)) {
      v.broken = true;
      if (v.seat.occupant && v.seat.occupant.local) v.seat.occupant.unsit();
      return;
    }
    const driver = v.seat.occupant;
    let dir = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
    if (driver && driver.remote) {
      // someone else is driving: ease toward their reported position
      const n = v.net;
      if (!n) return;
      const k = Math.min(1, dt * 12);
      v.pos.x += (n.x - v.pos.x) * k; v.pos.z += (n.z - v.pos.z) * k;
      let dy = n.yaw - v.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      v.yaw += dy * k;
      v.speed = n.speed;
      placeParts(game, v);
      dir = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
    } else {
      let throttle = 0, steer = 0;
      if (driver && v.drivable && driver.isPlayer) {
        const i = game.input;
        throttle = (i.down('w', 'arrowup') ? 1 : 0) - (i.down('s', 'arrowdown') ? 1 : 0);
        steer = (i.down('a') ? 1 : 0) - (i.down('d') ? 1 : 0);
        if (i.touch.joy) { throttle = -i.touch.joyY; steer = -i.touch.joyX; }
      }
      const max = v.maxSpeed ?? 70;
      v.speed += throttle * (v.accel ?? 34) * dt;
      v.speed *= Math.exp(-dt * (throttle ? 0.4 : 1.6));
      v.speed = clamp(v.speed, -Math.min(22, max), max);
      if (Math.abs(v.speed) < 0.05 && !throttle) {
        if (v.speed !== 0 || v.moving) { v.speed = 0; v.moving = false; sendState(game, v, vi, true); }
        for (const p of v.parts) p.lastDelta = null;
        return;
      }
      v.moving = true;
      if (v.rail) {
        // trains and handcars: follow the track, steering does nothing
        const at = railStep(v, v.speed * dt);
        if (!at) { v.speed = 0; sendState(game, v, vi, true); return; }
        v.pos.set(at.x, 0, at.z); v.yaw = at.yaw;
        placeParts(game, v);
        sendState(game, v, vi, false);
        dir = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw)).multiplyScalar(Math.sign(v.speed) || 1);
      } else {
      v.yaw += steer * dt * clamp(v.speed / 20, -1.6, 1.6) * (v.turn ?? 1);
      const fwd = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
      const move = fwd.clone().multiplyScalar(v.speed * dt);
      // crash into things in front
      dir = v.speed >= 0 ? fwd : fwd.clone().negate();
      const origin = v.pos.clone().add(new THREE.Vector3(0, 2.5, 0));
      const hit = game.world.raycast(origin, dir, Math.abs(v.speed * dt) + 5.6, { chars: false, filter: (c) => !v.parts.some(p => p.collider.handle === c.handle) && !c.isSensor() });
      if (hit) {
        if (Math.abs(v.speed) > 35 && hit.object && hit.object.size && !hit.object.tags.has('indestructible')) game.world.unanchor(hit.object, { x: dir.x * v.speed * 0.6, y: 8, z: dir.z * v.speed * 0.6 });
        game.audio.crash(hit.point);
        v.speed = 0;
        sendState(game, v, vi, true);
        return;
      }
      const np = v.pos.clone().add(move);
      if (Math.abs(np.x) > RIM_HALF - 4 || Math.abs(np.z) > RIM_HALF - 4) { v.speed = 0; return; }
      v.pos.copy(np);
      placeParts(game, v);
      sendState(game, v, vi, false);
      }
    }
    // run people over (each machine checks the characters it simulates)
    if (Math.abs(v.speed) > 25) {
      for (const c of game.chars) {
        if (!c.alive || c === driver || c.remote) continue;
        if (c.pos.distanceTo(v.pos) < 5) { c.damage(Math.abs(v.speed) * 0.8, 'car'); c.addVelocity({ x: dir.x * v.speed, y: 20, z: dir.z * v.speed }); }
      }
    }
  });
}

// Move a rail vehicle ds studs along its track (a polyline, maybe a loop).
// Returns its new position and heading, or null at the end of an open track.
function railStep(v, ds) {
  const r = v.rail, pts = r.pts, n = pts.length;
  if (r.len === undefined) {
    r.seg = []; r.len = 0;
    for (let i = 0; i < (r.loop ? n : n - 1); i++) { const d = pts[i].distanceTo(pts[(i + 1) % n]); r.seg.push(d); r.len += d; }
    // start where the vehicle was placed
    let best = Infinity, acc = 0;
    for (let i = 0; i < r.seg.length; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const t = clamp(((v.pos.x - a.x) * (b.x - a.x) + (v.pos.z - a.z) * (b.z - a.z)) / (r.seg[i] * r.seg[i] || 1), 0, 1);
      const d = Math.hypot(a.x + (b.x - a.x) * t - v.pos.x, a.z + (b.z - a.z) * t - v.pos.z);
      if (d < best) { best = d; r.s = acc + t * r.seg[i]; }
      acc += r.seg[i];
    }
  }
  let s = r.s + ds;
  if (r.loop) s = ((s % r.len) + r.len) % r.len;
  else if (s < 0 || s > r.len) return null;
  r.s = s;
  for (let i = 0, acc = 0; i < r.seg.length; i++) {
    if (s <= acc + r.seg[i] || i === r.seg.length - 1) {
      const a = pts[i], b = pts[(i + 1) % n], t = r.seg[i] ? (s - acc) / r.seg[i] : 0;
      // keep the heading the way the vehicle faces (it may be reversing)
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    acc += r.seg[i];
  }
  return null;
}

function sendState(game, v, vi, force) {
  const net = game.net;
  if (!net) return;
  const now = performance.now();
  if (!force && now - (v.sentAt || 0) < 66) return;
  v.sentAt = now;
  net.send({ t: 'veh', vi, x: Math.round(v.pos.x * 100) / 100, z: Math.round(v.pos.z * 100) / 100, yaw: Math.round(v.yaw * 1000) / 1000, sp: Math.round(v.speed * 10) / 10 });
}
