// Humanoid: kinematic capsule driven by Rapier's character controller.
// Shared by the local player and the bots.
import * as THREE from 'three';
import { RAPIER, IG_CHAR } from './world.js';
import { Avatar, NOOB_COLORS } from './avatar.js';
import { GRAVITY, WALK_SPEED, JUMP_POWER, MAX_HEALTH, clamp } from './util.js';

const HALF = 2.5; // capsule centre above feet
let sharedKCC = null;
// Movement only collides with bricks; characters are separated softly below so
// crowds at spawn never lock anyone in place.
const QUERY_GROUPS = ((0xffff) << 16) | 0x0001;
const COYOTE = 0.12;      // seconds after walking off a ledge that a jump still works
const CLIMB_SPEED = 12;   // studs/s, about WalkSpeed * 0.75 like Roblox ladders

export class Character {
  constructor(game, { name, isPlayer = false, colors = NOOB_COLORS, userId = 0 }) {
    this.game = game;
    this.name = name;
    this.isPlayer = isPlayer;
    this.userId = userId;
    this.avatar = new Avatar(colors, isPlayer ? '' : name);
    game.scene.add(this.avatar.root);
    this.pos = new THREE.Vector3();
    this.prevPos = new THREE.Vector3();   // for render interpolation between physics steps
    this.lastGrounded = -1;
    this.vel = new THREE.Vector3();
    this.ext = new THREE.Vector3();     // external horizontal velocity (pushes, wind, tornado)
    this.move = new THREE.Vector3();    // desired move direction (world, |m| <= 1)
    this.jump = false;                  // jump held
    this.yaw = 0;
    this.faceYaw = null;                // forced facing (shift-lock)
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.alive = false;
    this.inRound = false;               // teleported onto the map this round and still alive
    this.grounded = false;
    this.state = 'idle';
    this.survivals = 0;
    this.streak = 0;
    this.lastDamage = {};
    this.seat = null;
    this.unsitTime = 0;
    this.items = { balloon: false, apple: false, compass: false, hammer: false };
    this.equipped = null;
    this.gravityScale = 1;
    this.infected = false;
    this.speedMul = 1;
    this.lastInput = 0;
    const w = game.world;
    this.body = w.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -500, 0));
    this.collider = w.physics.createCollider(
      RAPIER.ColliderDesc.capsule(1.5, 1.0).setCollisionGroups(IG_CHAR).setSolverGroups(IG_CHAR), this.body);
    w.byCollider.set(this.collider.handle, this);
    if (!sharedKCC) {
      sharedKCC = w.physics.createCharacterController(0.04);
      // step up curbs, stairs and small ledges without jumping
      sharedKCC.enableAutostep(1.6, 0.3, true);
      sharedKCC.enableSnapToGround(0.9);
      sharedKCC.setSlideEnabled(true);
      sharedKCC.setMaxSlopeClimbAngle(55 * Math.PI / 180);
      sharedKCC.setMinSlopeSlideAngle(60 * Math.PI / 180);
      sharedKCC.setApplyImpulsesToDynamicBodies(true);
      sharedKCC.setCharacterMass(10);
      sharedKCC.setUp({ x: 0, y: 1, z: 0 });
    }
    this.kcc = sharedKCC;
    this.avatar.setVisible(false);
  }

  get head() { return new THREE.Vector3(this.pos.x, this.pos.y + 4.6, this.pos.z); }
  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + HALF, this.pos.z); }

  spawn(pos, yaw = 0) {
    this.alive = true;
    this.health = this.maxHealth;
    this.inRound = false;
    this.infected = false;
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    this.seat = null;
    this.yaw = yaw;
    this.minHealthThisRound = this.maxHealth;
    this.teleport(pos);
    this.avatar.setVisible(true);
    this.avatar.drawTag(1);
    this.items.hammer = this.items.hammerPending || false;
    this.items.hammerPending = false;
    this.balloonPopped = false;
    if (this.equipped === 'hammer' && !this.items.hammer) this.equip(null);
    else this.avatar.hold(this.equipped);
    this.game.onSpawn?.(this);
  }

  teleport(pos) {
    this.pos.copy(pos);
    this.prevPos.copy(pos);
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    if (this.seat) this.seat.occupant = null;
    this.seat = null;
    this.body.setTranslation({ x: pos.x, y: pos.y + HALF, z: pos.z }, true);
    this.body.setNextKinematicTranslation({ x: pos.x, y: pos.y + HALF, z: pos.z });
  }

  equip(kind) {
    if (kind && !this.items[kind]) return;
    this.equipped = this.equipped === kind ? null : kind;
    this.avatar.hold(this.equipped);
  }

  addVelocity(v) {
    this.vel.y += v.y;
    this.ext.x += v.x; this.ext.z += v.z;
    if (v.y > 5) this.grounded = false;
    if (this.seat && (Math.abs(v.x) + Math.abs(v.z) + Math.abs(v.y) > 30)) this.unsit();
  }

  // env: environmental damage (acid, cold, virus, water) does not hurt
  // spectators who walk back onto the island.
  damage(amount, cause = 'unknown', env = false) {
    if (!this.alive || amount <= 0) return;
    if (env && !this.inRound) return;
    if (this.game.godMode && this.isPlayer) return;
    this.health = Math.max(0, this.health - amount);
    if (this.inRound) this.minHealthThisRound = Math.min(this.minHealthThisRound, this.health);
    this.lastHurt = this.game.time;
    this.lastCause = cause;
    this.avatar.drawTag(this.health / this.maxHealth);
    if (this.isPlayer && (amount >= 4 || this.game.time - (this.lastFlash || 0) > 1.2)) {
      this.lastFlash = this.game.time;
      this.game.ui?.hurtFlash();
    }
    if (this.health <= 0) this.die(cause);
  }

  heal(n) {
    if (!this.alive) return;
    this.health = Math.min(this.maxHealth, this.health + n);
    this.avatar.drawTag(this.health / this.maxHealth);
  }

  die(cause = 'unknown') {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    const wasInRound = this.inRound;
    this.inRound = false;
    if (this.seat) this.seat.occupant = null;
    this.seat = null;
    this.infected = false;
    // R6 death: the body falls apart into its six pieces.
    const w = this.game.world;
    for (const l of this.avatar.limbs()) {
      const p = w.addPart({ pos: [l.pos.x, l.pos.y, l.pos.z], size: l.size, color: l.color, rot: l.rot, anchored: false, corpse: true, tags: ['corpse', 'nodamage'] });
      p.lifetime = 6;
      w.push(p, { x: (Math.random() - .5) * 14 + this.ext.x * 0.5, y: 6 + Math.random() * 6, z: (Math.random() - .5) * 14 + this.ext.z * 0.5 }, false);
    }
    this.avatar.setVisible(false);
    this.teleportHidden();
    this.game.audio?.oof(this.isPlayer ? null : this.pos);
    this.game.onDeath?.(this, cause, wasInRound);
    this.respawnAt = this.game.time + 5;
  }

  teleportHidden() {
    this.body.setTranslation({ x: 0, y: -1000 - this.userId * 10, z: 0 }, true);
    this.body.setNextKinematicTranslation({ x: 0, y: -1000 - this.userId * 10, z: 0 });
  }

  sit(seatPart) {
    this.seat = seatPart;
    seatPart.occupant = this;
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    this.game.onSit?.(this, seatPart);
  }

  unsit() {
    if (!this.seat) return;
    const s = this.seat;
    s.occupant = null;
    this.seat = null;
    this.unsitTime = this.game.time;
    this.vel.y = 30;
    this.game.onUnsit?.(this, s);
  }

  // ---------- fixed-step physics ----------
  step(dt) {
    if (!this.alive) {
      if (this.respawnAt && this.game.time >= this.respawnAt) { this.respawnAt = 0; this.game.respawn(this); }
      return;
    }
    const game = this.game;
    this.prevPos.copy(this.pos);
    if (this.seat) {
      if (!this.seat.alive || !this.seat.anchored) { this.unsit(); }
      else {
        const t = this.seat.body.translation(), r = this.seat.body.rotation();
        const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
        const up = new THREE.Vector3(0, this.seat.size.y / 2 - 0.4, 0).applyQuaternion(q);
        this.pos.set(t.x + up.x, t.y + up.y, t.z + up.z);
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        this.yaw = Math.atan2(fwd.x, fwd.z) + (this.seat.seatYaw || 0);
        this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + HALF, z: this.pos.z });
        this.state = 'sit';
        if (this.jump) this.unsit();
        return;
      }
    }
    const water = game.waterLevel;
    const centerY = this.pos.y + HALF;
    const swimming = centerY < water;
    this.swimming = swimming;
    const climbing = this.checkClimb();
    const g = GRAVITY * this.gravityScale;
    const speed = WALK_SPEED * this.speedMul * (swimming ? 0.8 : 1);

    if (climbing) {
      this.vel.y = CLIMB_SPEED;
    } else if (swimming) {
      const target = this.jump ? 16 : (centerY < water - 1.2 ? 9 : -1);
      this.vel.y += (target - this.vel.y) * Math.min(1, dt * 5);
      if (this.jump && centerY > water - 1.5) this.vel.y = Math.max(this.vel.y, 26);
    } else {
      this.vel.y -= g * dt;
      if (this.vel.y < -250) this.vel.y = -250;
    }
    const canJump = this.grounded || game.time - this.lastGrounded < COYOTE;
    if (this.jump && canJump && !swimming && !climbing && this.vel.y <= 1 && game.time - (this.jumpedAt || 0) > 0.2) {
      this.vel.y = JUMP_POWER;
      this.grounded = false;
      this.lastGrounded = -1;
      this.jumpedAt = game.time;
    }

    const dx = (this.move.x * speed + this.ext.x) * dt;
    const dz = (this.move.z * speed + this.ext.z) * dt;
    const dy = this.vel.y * dt;
    this.kcc.computeColliderMovement(this.collider, { x: dx, y: dy, z: dz }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, QUERY_GROUPS);
    const mv = this.kcc.computedMovement();
    const wasGrounded = this.grounded;
    this.grounded = this.kcc.computedGrounded();
    // grounded can flicker on edges and stairs: confirm with a short probe
    if (!this.grounded && this.vel.y <= 0 && !climbing) {
      const probe = game.world.raycast({ x: this.pos.x + mv.x, y: this.pos.y + mv.y + 0.6, z: this.pos.z + mv.z }, { x: 0, y: -1, z: 0 }, 1.0);
      if (probe) this.grounded = true;
    }
    if (this.grounded) this.lastGrounded = game.time;
    if (this.grounded && this.vel.y < 0) {
      // landing impact: Roblox has no fall damage, keep it that way
      this.vel.y = -0.5;
    }
    if (this.vel.y > 0 && dy > 0 && mv.y < dy * 0.25) this.vel.y = 0; // bonked head
    if (!this.grounded && wasGrounded && this.vel.y <= 0) this.vel.y = Math.min(this.vel.y, 0);
    // ride moving platforms (vehicles, rocket, rising volcano)
    if (this.groundPart && this.groundPart.alive && this.groundPart.anchored && this.groundPart.lastDelta) {
      mv.x += this.groundPart.lastDelta.x; mv.y += this.groundPart.lastDelta.y; mv.z += this.groundPart.lastDelta.z;
    }
    this.pos.x += mv.x; this.pos.y += mv.y; this.pos.z += mv.z;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + HALF, z: this.pos.z });

    // external velocity decays faster on the ground
    const decay = Math.exp(-dt * (this.grounded ? 6 : 0.6));
    this.ext.x *= decay; this.ext.z *= decay;
    if (Math.abs(mv.x) < Math.abs(dx) * 0.3) this.ext.x *= 0.5;
    if (Math.abs(mv.z) < Math.abs(dz) * 0.3) this.ext.z *= 0.5;

    // facing
    const mlen = Math.hypot(this.move.x, this.move.z);
    if (this.faceYaw !== null) this.yaw = this.faceYaw;
    else if (mlen > 0.1) {
      const target = Math.atan2(this.move.x, this.move.z);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 18);
    }

    // ground probe
    this.groundPart = null;
    if (this.grounded) {
      const hit = game.world.raycast({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, { x: 0, y: -1, z: 0 }, 2.5);
      if (hit && hit.object && hit.object.size) this.groundPart = hit.object;
    }

    // characters push each other instead of blocking (griefers still shove people off ledges)
    for (const o of game.chars) {
      if (o === this || !o.alive || o.seat) continue;
      if (Math.abs(o.pos.y - this.pos.y) > 4.5) continue;
      const ox = o.pos.x - this.pos.x, oz = o.pos.z - this.pos.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 2.1 * 2.1) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = d2 > 1e-4 ? ox / d : Math.random() - .5, nz = d2 > 1e-4 ? oz / d : Math.random() - .5;
      const overlap = 2.1 - d;
      o.ext.x += nx * overlap * 18 * dt; o.ext.z += nz * overlap * 18 * dt;
      if (mlen > 0.2 && (nx * this.move.x + nz * this.move.z) > 0) { o.ext.x += this.move.x * 26 * dt; o.ext.z += this.move.z * 26 * dt; }
    }

    // seats
    if (!this.seat && game.time - this.unsitTime > 1.2 && this.vel.y <= 0) {
      for (const s of game.seats) {
        if (!s.alive || !s.anchored || s.occupant) continue;
        const t = s.body.translation();
        const top = t.y + s.size.y / 2;
        if (Math.abs(this.pos.x - t.x) < s.size.x / 2 + 0.4 && Math.abs(this.pos.z - t.z) < s.size.z / 2 + 0.4 && Math.abs(this.pos.y - top) < 1.0) {
          this.sit(s); break;
        }
      }
    }

    if (this.pos.y < -45) this.die('fell');

    // animation state
    const hs = Math.hypot(mv.x, mv.z) / dt;
    this.hSpeed = hs;
    if (climbing) this.state = 'climb';
    else if (swimming) this.state = 'swim';
    else if (!this.grounded) this.state = this.vel.y > 0 ? 'jump' : 'fall';
    else if (hs > 1.5 && mlen > 0.1) this.state = 'walk';
    else this.state = 'idle';
  }

  checkClimb() {
    const mlen = Math.hypot(this.move.x, this.move.z);
    this.climbMove = mlen;
    if (mlen < 0.1) return false;
    for (const t of this.game.trusses) {
      if (!t.alive || !t.anchored) continue;
      const b = this.game.world.aabb(t);
      if (this.pos.x + 1.6 < b.minX || this.pos.x - 1.6 > b.maxX || this.pos.z + 1.6 < b.minZ || this.pos.z - 1.6 > b.maxZ) continue;
      if (this.pos.y > b.maxY - 0.1 || this.pos.y + 5 < b.minY) continue;
      const cx = clamp(this.pos.x, b.minX, b.maxX) - this.pos.x, cz = clamp(this.pos.z, b.minZ, b.maxZ) - this.pos.z;
      const cl = Math.hypot(cx, cz);
      if (cl < 0.01 || (cx * this.move.x + cz * this.move.z) / cl / mlen > 0.3) return true;
    }
    return false;
  }

  // smooth position between fixed physics steps (alpha = fraction of the next step)
  renderPos(alpha) {
    return this._rp = (this._rp || new THREE.Vector3()).copy(this.prevPos).lerp(this.pos, alpha);
  }

  render(dt, alpha = 1) {
    if (!this.alive) return;
    const r = this.avatar.root;
    r.position.copy(this.renderPos(alpha));
    r.rotation.y = this.yaw;
    if (this.avatar.tag) this.avatar.tag.visible = this.game.camera.position.distanceTo(this.pos) < 100;
    this.avatar.animate(dt, this.state, this.hSpeed || 0);
  }
}
