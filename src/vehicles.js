// Drivable cars: the parts stay anchored and are moved as a group.
import * as THREE from 'three';
import { clamp, RIM_HALF } from './util.js';

const _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0);

export function stepVehicles(game, dt) {
  for (const v of game.vehicles) {
    if (v.broken) continue;
    if (v.parts.some(p => !p.alive || !p.anchored)) {
      v.broken = true;
      if (v.seat.occupant) v.seat.occupant.unsit();
      continue;
    }
    const driver = v.seat.occupant;
    let throttle = 0, steer = 0;
    if (driver && v.drivable) {
      if (driver.isPlayer) {
        const i = game.input;
        throttle = (i.down('w', 'arrowup') ? 1 : 0) - (i.down('s', 'arrowdown') ? 1 : 0);
        steer = (i.down('a') ? 1 : 0) - (i.down('d') ? 1 : 0);
        if (i.touch.joy) { throttle = -i.touch.joyY; steer = -i.touch.joyX; }
      }
    }
    v.speed += throttle * 34 * dt;
    v.speed *= Math.exp(-dt * (throttle ? 0.4 : 1.6));
    v.speed = clamp(v.speed, -22, 70);
    if (Math.abs(v.speed) < 0.05 && !throttle) { v.speed = 0; for (const p of v.parts) p.lastDelta = null; continue; }
    v.yaw += steer * dt * clamp(v.speed / 20, -1.6, 1.6);
    const fwd = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
    const move = fwd.clone().multiplyScalar(v.speed * dt);
    // crash into things in front
    const dir = v.speed >= 0 ? fwd : fwd.clone().negate();
    const origin = v.pos.clone().add(new THREE.Vector3(0, 2.5, 0));
    const hit = game.world.raycast(origin, dir, Math.abs(v.speed * dt) + 5.6, { chars: false, filter: (c) => !v.parts.some(p => p.collider.handle === c.handle) && !c.isSensor() });
    if (hit) {
      if (Math.abs(v.speed) > 35 && hit.object && hit.object.size && !hit.object.tags.has('indestructible')) game.world.unanchor(hit.object, { x: dir.x * v.speed * 0.6, y: 8, z: dir.z * v.speed * 0.6 });
      game.audio.crash(hit.point);
      v.speed = 0;
      continue;
    }
    const np = v.pos.clone().add(move);
    if (Math.abs(np.x) > RIM_HALF - 4 || Math.abs(np.z) > RIM_HALF - 4) { v.speed = 0; continue; }
    v.pos.copy(np);
    _q.setFromAxisAngle(_y, v.yaw);
    for (const p of v.parts) {
      const off = p.local.off.clone().applyQuaternion(_q);
      const old = p.body.translation();
      const pos = new THREE.Vector3(v.pos.x + off.x, off.y, v.pos.z + off.z);
      p.lastDelta = { x: pos.x - old.x, y: 0, z: pos.z - old.z };
      p._moved = true;
      game.world.movePart(p, pos, _q.clone().multiply(p.local.rot));
    }
    // run people over
    for (const c of game.chars) {
      if (!c.alive || c === driver) continue;
      if (c.pos.distanceTo(v.pos) < 5 && Math.abs(v.speed) > 25) { c.damage(Math.abs(v.speed) * 0.8, 'car'); c.addVelocity({ x: dir.x * v.speed, y: 20, z: dir.z * v.speed }); }
    }
  }
}
