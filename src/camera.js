// Roblox "Classic" camera: orbit with right-drag (left-drag also works),
// scroll / I / O to zoom, arrow keys turn, Shift for shift-lock,
// first person when fully zoomed in.
import * as THREE from 'three';
import { clamp } from './util.js';

export class CameraController {
  constructor(camera, game) {
    this.camera = camera;
    this.game = game;
    this.yaw = Math.PI;      // looking toward -z by default
    this.pitch = -0.35;
    this.dist = 14;
    this.target = new THREE.Vector3();
    this.shake = 0;
    this.firstPerson = false;
    this.spectate = null;
    this.sensitivity = 1;
    this.inverted = false;
    this.follow = false;
  }

  update(dt, input, subject) {
    const sens = 0.0045 * this.sensitivity;
    this.yaw -= input.mouseDX * sens;
    this.pitch = clamp(this.pitch - input.mouseDY * sens * (this.inverted ? -1 : 1), -1.45, 1.35);
    // "Follow" camera mode swings around behind the character while walking
    const p = this.game.player;
    if (this.follow && p && p.alive && !input.dragging && !input.shiftLock && p.hSpeed > 2) {
      let d = p.yaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 1.5);
    }
    if (input.down('arrowleft')) this.yaw += dt * 2.6;
    if (input.down('arrowright')) this.yaw -= dt * 2.6;
    if (input.down('i')) this.dist *= Math.pow(0.2, dt);
    if (input.down('o')) this.dist *= Math.pow(5, dt);
    if (input.wheel) this.dist *= Math.pow(1.15, input.wheel);
    this.dist = clamp(this.dist, 0.5, 80);
    this.firstPerson = this.dist < 1.2;

    if (subject) this.target.lerp(subject, Math.min(1, dt * 20));
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    // camera sits behind the look direction
    const look = this.target.clone();
    if (input.shiftLock && !this.firstPerson) {
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      look.addScaledVector(right, -1.75);
    }
    let d = this.dist;
    if (!this.firstPerson) {
      const back = dir.clone().multiplyScalar(-1);
      const hit = this.game.world.raycast(look, back, d + 0.5, { filter: (c) => !this.game.world.byCollider.get(c.handle)?.tags?.has('glass') && !c.isSensor() });
      if (hit) d = Math.max(0.6, hit.dist - 0.6);
    }
    const pos = look.clone().addScaledVector(dir, -d);
    if (this.shake > 0) {
      const s = this.shake;
      pos.x += (Math.random() - .5) * s; pos.y += (Math.random() - .5) * s; pos.z += (Math.random() - .5) * s;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look.clone().addScaledVector(dir, 10));
  }

  // Horizontal forward/right for movement relative to the camera.
  basis() {
    return {
      fwd: new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)),
      right: new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw)),
    };
  }
}
