// Roblox "Classic" camera (PlayerModule defaults): orbit with right-drag, scroll / I / O
// to zoom, arrow keys turn, Shift for shift-lock, first person when fully zoomed in.
import * as THREE from 'three';
import { clamp } from './util.js';

const MIN_ZOOM = 0.5, MAX_ZOOM = 400;   // CameraMinZoomDistance / CameraMaxZoomDistance
const PITCH = 80 * Math.PI / 180;      // the camera never goes past 80 degrees up or down
const ROT = 0.0087;                    // radians per pixel of mouse movement (vertical x0.77)

export class CameraController {
  constructor(camera, game) {
    this.camera = camera;
    this.game = game;
    this.yaw = Math.PI;      // looking toward -z by default
    this.pitch = -0.35;
    this.dist = 12.5;        // zoom the player asked for
    this.curDist = 12.5;     // zoom right now (eases toward dist)
    this.popDist = Infinity; // pulled in front of an obstacle
    this.target = new THREE.Vector3();
    this.shake = 0;
    this.firstPerson = false;
    this.spectate = null;
    this.sensitivity = 1;
    this.inverted = false;
    this.follow = false;
  }

  update(dt, input, subject) {
    const sens = ROT * this.sensitivity;
    const touch = input.isTouch ? 1.68 : 1;  // touch look is ~0.0175 rad/px (input already x1.2)
    this.yaw -= input.mouseDX * sens * touch;
    this.pitch = clamp(this.pitch - input.mouseDY * sens * touch * (input.isTouch ? 0.66 : 0.77) * (this.inverted ? -1 : 1), -PITCH, PITCH);
    // "Follow" camera mode swings around behind the character while walking
    const p = this.game.player;
    // (but not while walking toward the camera: swinging round would turn "back" into
    // "forward" and the character would spin on the spot instead of walking back)
    if (this.follow && p && p.alive && !input.dragging && !input.shiftLock && p.hSpeed > 2) {
      let d = p.yaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 1.75) this.yaw += d * Math.min(1, dt * 1.5);
    }
    if (input.down('arrowleft')) this.yaw += dt * 2.09;
    if (input.down('arrowright')) this.yaw -= dt * 2.09;
    if (input.down('i')) this.dist *= Math.pow(0.2, dt);
    if (input.down('o')) this.dist *= Math.pow(5, dt);
    // each wheel notch: out z + (1 + z/2), in (z - 1) / 1.5, then a spring eases to it
    const wh = input.wheel;
    if (Number.isInteger(wh)) for (let n = 0; n < Math.abs(wh); n++) this.dist = wh > 0 ? this.dist + 1 + this.dist * 0.5 : (this.dist - 1) / 1.5;
    else this.dist *= Math.pow(1.6, wh);          // pinch zoom on touch screens
    this.dist = clamp(this.dist, MIN_ZOOM, MAX_ZOOM);
    if (this.dist < 1) this.dist = MIN_ZOOM;     // snaps into first person
    this.curDist += (this.dist - this.curDist) * (1 - Math.exp(-dt * 9));
    if (Math.abs(this.dist - this.curDist) < 0.01) this.curDist = this.dist;
    this.firstPerson = this.curDist < 1;
    input.setWantLock?.(this.firstPerson);       // first person: mouse locked to the centre

    if (subject) this.target.copy(subject);      // no lag: the focus is the character itself
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
    let d = this.curDist;
    if (!this.firstPerson) {
      // pop in front of walls instantly, ease back out; see-through parts,
      // trusses and parts you can walk through don't count
      const w = this.game.world;
      const back = dir.clone().multiplyScalar(-1);
      const hit = w.raycast(look, back, d + 0.5, { filter: (c) => { const o = w.byCollider.get(c.handle); return !c.isSensor() && !o?.tags?.has('glass') && !o?.tags?.has('truss'); } });
      const want = hit ? Math.max(0.6, hit.dist - 0.6) : Infinity;
      this.popDist = want < this.popDist ? want : Math.min(want, this.popDist + dt * Math.max(8, this.popDist * 4));
      d = Math.min(d, this.popDist);
    } else this.popDist = Infinity;
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
