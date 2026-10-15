// Humanoid: kinematic capsule driven by Rapier's character controller.
// Shared by the local player and the bots. Other people's characters are
// "remote": they are not simulated here, they follow the owner's reports.
import * as THREE from 'three';
import { RAPIER, IG_CHAR } from './world.js';
import { Avatar, NOOB_COLORS } from './avatar.js';
import { GRAVITY, WALK_SPEED, JUMP_POWER, MAX_HEALTH, clamp } from './util.js';

export const STATES = ['idle', 'walk', 'jump', 'fall', 'climb', 'swim', 'sit', 'down'];
export const TOOL_IDS = [null, 'balloon', 'apple', 'hammer', 'compass'];
export const EMOTES = [null, 'dance', 'dance2', 'dance3', 'wave', 'point', 'cheer', 'laugh'];

const HALF = 2.5; // capsule centre above feet
let sharedKCC = null;
// Movement only collides with bricks; characters are separated softly below so
// crowds at spawn never lock anyone in place.
const QUERY_GROUPS = ((0xffff) << 16) | 0x0001;
const COYOTE = 0.12;      // seconds after walking off a ledge that a jump still works
const CLIMB_SPEED = 11.2; // Roblox: Humanoids climb at 70% of WalkSpeed
const GRAB = 1.45;        // how close (studs from the capsule axis) a truss must be to grab it
const REMOTE_DELAY = 120; // ms: remote characters are drawn slightly in the past for smoothness

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
    this.climbing = null;               // truss part we hold on to
    this.climbV = 0;
    this.climbCd = 0;
    this.emote = null;
    this.swings = 0;
    this.remote = false;
    this.samples = [];
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
      // Humanoid.MaxSlopeAngle is 89: you can walk up almost any wedge
      sharedKCC.setMaxSlopeClimbAngle(89 * Math.PI / 180);
      sharedKCC.setMinSlopeSlideAngle(89.5 * Math.PI / 180);
      sharedKCC.setApplyImpulsesToDynamicBodies(true);
      sharedKCC.setCharacterMass(10);
      sharedKCC.setUp({ x: 0, y: 1, z: 0 });
    }
    this.kcc = sharedKCC;
    this.avatar.setVisible(false);
  }

  get head() { return new THREE.Vector3(this.pos.x, this.pos.y + 4.6, this.pos.z); }
  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + HALF, this.pos.z); }
  get local() { return !this.remote; }

  spawn(pos, yaw = 0) {
    this.alive = true;
    this.health = this.maxHealth;
    this.inRound = false;
    this.infected = false;
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    this.seat = null;
    this.climbing = null;
    this.emote = null;
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
    this.pos.set(pos.x, pos.y, pos.z);
    this.prevPos.copy(this.pos);
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    if (this.seat) this.seat.occupant = null;
    this.seat = null;
    this.climbing = null;
    this.body.setTranslation({ x: pos.x, y: pos.y + HALF, z: pos.z }, true);
    this.body.setNextKinematicTranslation({ x: pos.x, y: pos.y + HALF, z: pos.z });
  }

  // /e emotes: dances loop until you move, the others play once
  setEmote(e) {
    this.emote = e;
    this.emoteUntil = ['wave', 'point', 'cheer', 'laugh'].includes(e) ? this.game.time + 2.6 : 0;
  }

  equip(kind) {
    if (kind && !this.items[kind]) return;
    this.equipped = this.equipped === kind ? null : kind;
    this.avatar.hold(this.equipped);
  }

  // a hard hit knocks you over for a moment (Humanoid FallingDown), then you get up
  knockDown(t = 1.6) {
    if (this.remote || this.seat) return;
    this.downUntil = Math.max(this.downUntil || 0, this.game.time + t);
    this.climbing = null;
  }

  addVelocity(v) {
    if (this.remote) return;
    this.vel.y += v.y;
    this.ext.x += v.x; this.ext.z += v.z;
    if (v.y > 5) { this.grounded = false; this.climbing = null; }
    if (this.seat && (Math.abs(v.x) + Math.abs(v.z) + Math.abs(v.y) > 30)) this.unsit();
  }

  // env: environmental damage (acid, cold, virus, water) does not hurt
  // spectators who walk back onto the island.
  // Players waiting in the Lobby Tower are safe from disasters.
  safeInLobby() { return !this.inRound && this.game.island?.inTower(this.pos); }

  damage(amount, cause = 'unknown', env = false) {
    if (!this.alive || amount <= 0 || this.remote) return;
    if (env && !this.inRound) return;
    if (this.safeInLobby()) return;
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
    if (!this.alive || this.remote) return;
    this.health = Math.min(this.maxHealth, this.health + n);
    this.avatar.drawTag(this.health / this.maxHealth);
  }

  die(cause = 'unknown') {
    if (!this.alive) return;
    if (!this.remote && cause !== 'reset' && cause !== 'fell' && cause !== 'unknown' && this.safeInLobby()) return;
    this.alive = false;
    this.health = 0;
    const wasInRound = this.inRound;
    this.inRound = false;
    if (this.seat) this.seat.occupant = null;
    this.seat = null;
    this.climbing = null;
    this.infected = false;
    this.emote = null;
    // R6 death (BreakJointsOnDeath): the joints let go and the six pieces just
    // collapse, keeping the body's own momentum. They go when you respawn.
    const w = this.game.world, v = this.lastVel || { x: 0, y: 0, z: 0 };
    this.corpse = [];
    for (const l of this.avatar.limbs()) {
      const p = w.addPart({ pos: [l.pos.x, l.pos.y, l.pos.z], size: l.size, color: l.color, rot: l.rot, anchored: false, corpse: true, tags: ['corpse', 'nodamage'] });
      p.lifetime = 5;
      w.push(p, { x: v.x + (Math.random() - .5) * 1.5, y: v.y + Math.random() * 0.8, z: v.z + (Math.random() - .5) * 1.5 }, false);
      this.corpse.push(p);
    }
    this.avatar.setVisible(false);
    this.teleportHidden();
    if (this.fallingLoud) { this.fallingLoud = false; this.game.audio?.falling(false); }
    this.game.audio?.oof(this.isPlayer ? null : this.pos);
    this.game.onDeath?.(this, cause, wasInRound);
    this.respawnAt = this.remote ? 0 : this.game.time + 5;
  }

  teleportHidden() {
    this.body.setTranslation({ x: 0, y: -1000 - this.userId * 10, z: 0 }, true);
    this.body.setNextKinematicTranslation({ x: 0, y: -1000 - this.userId * 10, z: 0 });
  }

  sit(seatPart) {
    this.seat = seatPart;
    seatPart.occupant = this;
    this.vel.set(0, 0, 0); this.ext.set(0, 0, 0);
    this.climbing = null;
    this.emote = null;
    this.game.onSit?.(this, seatPart);
  }

  unsit() {
    if (!this.seat) return;
    const s = this.seat;
    s.occupant = null;
    this.seat = null;
    this.unsitTime = this.game.time;
    (this.seatCd ||= new Map()).set(s, this.game.time + 3);   // Seat: 3 s before the same seat takes you again
    this.vel.y = JUMP_POWER;
    this.game.onUnsit?.(this, s);
  }

  // ---------- fixed-step physics ----------
  step(dt) {
    if (this.remote) return this.stepRemote();
    if (!this.alive) {
      if (this.respawnAt && this.game.time >= this.respawnAt) { this.respawnAt = 0; this.game.respawn(this); }
      return;
    }
    const game = this.game;
    this.prevPos.copy(this.pos);
    // the default Health script: +1% of MaxHealth every second
    if (this.health < this.maxHealth) {
      this.regenT = (this.regenT || 0) + dt;
      if (this.regenT >= 1) { this.regenT -= 1; this.heal(this.maxHealth * 0.01); }
    } else this.regenT = 0;
    if (this.seat) {
      // a seat that breaks loose keeps you in it (you ride the falling chair)
      if (!this.seat.alive) { this.unsit(); }
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
    // knocked over by a hard hit (FallingDown): no walking or jumping until you get up
    const down = (this.downUntil || 0) > game.time;
    if (down) { this.move.set(0, 0, 0); this.jump = false; }
    const mlen = Math.hypot(this.move.x, this.move.z);
    if (mlen > 0.1 || this.jump || (this.emoteUntil && game.time > this.emoteUntil)) { this.emote = null; this.emoteUntil = 0; }
    const g = GRAVITY * this.gravityScale;
    const speed = WALK_SPEED * this.speedMul * (swimming ? 0.875 : 1);   // Humanoids swim at 87.5% of WalkSpeed

    const climb = this.updateClimb(dt, mlen);
    let dx, dz;
    if (climb) {
      // on a truss: forward climbs, back climbs down, sideways shuffles along it,
      // no input holds on (Roblox characters never slide off a truss)
      this.vel.y = this.climbV;
      dx = (climb.side.x * climb.lateral * speed * 0.5 + climb.n.x * 3 + this.ext.x * 0.2) * dt;
      dz = (climb.side.z * climb.lateral * speed * 0.5 + climb.n.z * 3 + this.ext.z * 0.2) * dt;
    } else {
      if (swimming) {
        // swimming follows the camera: look down and walk forward to dive
        const dive = this.diveDir < -0.6 && mlen > 0.3 ? Math.sin(this.diveDir) * speed : 0;
        const target = this.jump ? 16 : dive || (centerY < water - 1.2 ? 9 : -1);
        this.vel.y += (target - this.vel.y) * Math.min(1, dt * 5);
        if (this.jump && centerY > water - 1.5) this.vel.y = Math.max(this.vel.y, 26);
      } else {
        this.vel.y -= g * dt;
        if (this.vel.y < -250) this.vel.y = -250;
      }
      const canJump = this.grounded || game.time - this.lastGrounded < COYOTE;
      if (this.jump && canJump && !swimming && this.vel.y <= 1 && game.time - (this.jumpedAt || 0) > 0.2) {
        this.vel.y = JUMP_POWER;
        this.grounded = false;
        this.lastGrounded = -1;
        this.jumpedAt = game.time;
        this.sfx('jump');
      }
      dx = (this.move.x * speed + this.ext.x) * dt;
      dz = (this.move.z * speed + this.ext.z) * dt;
    }
    // walk up stair steps and curbs (up to 1.6 studs): Rapier's own autostep refuses
    // square steps, so lift the character onto the step ourselves
    if (!climb && !swimming && this.vel.y <= 1 && (this.grounded || game.time - this.lastGrounded < 0.1)) {
      const h = this.findStep(dx, dz);
      if (h > 0) {
        this.pos.y += h + 0.03;
        this.collider.setTranslation({ x: this.pos.x, y: this.pos.y + HALF, z: this.pos.z });
        this.vel.y = Math.max(this.vel.y, 0);
      } else if (this.isPlayer && game.input?.isTouch && this.grounded && mlen > 0.3) {
        // AutoJumpEnabled (touch): walking into a ledge you can jump onto jumps
        const f = { x: this.move.x / mlen, y: 0, z: this.move.z / mlen }, w = game.world;
        const low = w.raycast({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, f, 1.6);
        if (low && Math.abs(low.normal.y) < 0.5 && !low.object?.tags?.has('truss') && !w.raycast({ x: this.pos.x, y: this.pos.y + 5.6, z: this.pos.z }, f, 2.2)
          && game.time - (this.jumpedAt || 0) > 0.5) {
          this.vel.y = JUMP_POWER; this.grounded = false; this.lastGrounded = -1; this.jumpedAt = game.time;
        }
      }
    }
    const dy = this.vel.y * dt;
    this.kcc.computeColliderMovement(this.collider, { x: dx, y: dy, z: dz }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, QUERY_GROUPS);
    const mv = this.kcc.computedMovement();
    const wasGrounded = this.grounded;
    this.grounded = this.kcc.computedGrounded();
    // grounded can flicker on edges and stairs: confirm with a short probe
    if (!this.grounded && this.vel.y <= 0 && !climb) {
      const probe = game.world.raycast({ x: this.pos.x + mv.x, y: this.pos.y + mv.y + 0.6, z: this.pos.z + mv.z }, { x: 0, y: -1, z: 0 }, 1.0);
      if (probe) this.grounded = true;
    }
    if (this.grounded) this.lastGrounded = game.time;
    if (this.grounded && this.vel.y < 0) {
      // landing impact: Roblox has no fall damage, keep it that way; a hard
      // landing (falling faster than 75 studs/s) thuds
      if (!wasGrounded && this.vel.y < -75) this.sfx('land', Math.min(1, (-this.vel.y - 50) / 50));
      this.vel.y = -0.5;
    }
    if (climb && this.grounded && this.climbV < 0) this.climbing = null;   // climbed back down
    if (this.vel.y > 0 && dy > 0 && mv.y < dy * 0.25 && !climb) this.vel.y = 0; // bonked head
    if (!this.grounded && wasGrounded && this.vel.y <= 0) this.vel.y = Math.min(this.vel.y, 0);
    // ride moving platforms (vehicles, rocket, rising volcano)
    // standing on a loose brick that is moving carries you along with it
    if (this.groundPart && this.groundPart.alive && !this.groundPart.anchored && this.groundPart.body) {
      const gv = this.groundPart.netVel || this.groundPart.body.linvel();
      mv.x += gv.x * dt; mv.z += gv.z * dt;
    }
    if (this.groundPart && this.groundPart.alive && this.groundPart.anchored && this.groundPart.lastDelta) {
      mv.x += this.groundPart.lastDelta.x; mv.y += this.groundPart.lastDelta.y; mv.z += this.groundPart.lastDelta.z;
    }
    this.pos.x += mv.x; this.pos.y += mv.y; this.pos.z += mv.z;
    // walking but not getting anywhere: if we're wedged inside a brick (debris landed
    // on us, a wall fell over us) the controller can't get out by itself
    if (mlen > 0.3 && !climb && Math.hypot(mv.x, mv.z) < speed * mlen * dt * 0.1) {
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 0.35) { this.stuckT = 0; this.unwedge(); }
    } else this.stuckT = 0;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + HALF, z: this.pos.z });

    // external velocity decays faster on the ground
    const decay = Math.exp(-dt * (this.grounded ? 6 : 0.6));
    this.ext.x *= decay; this.ext.z *= decay;
    if (Math.abs(mv.x) < Math.abs(dx) * 0.3) this.ext.x *= 0.5;
    if (Math.abs(mv.z) < Math.abs(dz) * 0.3) this.ext.z *= 0.5;

    // facing: climbers face the truss
    if (climb) {
      const target = Math.atan2(climb.n.x, climb.n.z);
      let d = target - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 14);
    } else if (this.faceYaw !== null) this.yaw = this.faceYaw;
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

    // characters push each other instead of blocking: everyone moves themselves out of
    // overlaps, and walking into a character you simulate shoves them
    for (const o of game.chars) {
      if (o === this || !o.alive || o.seat) continue;
      if (Math.abs(o.pos.y - this.pos.y) > 4.5) continue;
      const ox = o.pos.x - this.pos.x, oz = o.pos.z - this.pos.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 2.1 * 2.1) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = d2 > 1e-4 ? ox / d : Math.random() - .5, nz = d2 > 1e-4 ? oz / d : Math.random() - .5;
      const overlap = 2.1 - d;
      this.ext.x -= nx * overlap * 18 * dt; this.ext.z -= nz * overlap * 18 * dt;
      if (o.local && mlen > 0.2 && (nx * this.move.x + nz * this.move.z) > 0) { o.ext.x += this.move.x * 26 * dt; o.ext.z += this.move.z * 26 * dt; }
    }

    // seats: touching one sits you in it (players); bots sit when they step onto one.
    // Each seat waits 3 s before it takes back the person who just got off it.
    if (!this.seat && game.time - this.unsitTime > 0.35 && this.vel.y <= 1 && !climb) {
      for (const s of game.seats) {
        if (!s.alive || s.occupant || (this.seatCd?.get(s) || 0) > game.time) continue;
        const b = game.world.aabb(s), top = b.maxY;
        const touch = this.isPlayer
          ? this.pos.x > b.minX - 0.9 && this.pos.x < b.maxX + 0.9 && this.pos.z > b.minZ - 0.9 && this.pos.z < b.maxZ + 0.9 && top > this.pos.y - 1 && top < this.pos.y + 3
          : this.pos.x > b.minX - 0.4 && this.pos.x < b.maxX + 0.4 && this.pos.z > b.minZ - 0.4 && this.pos.z < b.maxZ + 0.4 && Math.abs(this.pos.y - top) < 1.0;
        if (touch) { this.sit(s); break; }
      }
    }

    if (this.pos.y < -45) this.die('fell');

    // animation state
    const hs = Math.hypot(mv.x, mv.z) / dt;
    this.lastVel = { x: mv.x / dt, y: mv.y / dt, z: mv.z / dt };
    this.hSpeed = climb ? Math.abs(this.climbV) + Math.abs(climb.lateral) * 4 : hs;
    if (down) this.state = 'down';
    else if (climb) this.state = 'climb';
    else if (swimming) this.state = 'swim';
    else if (!this.grounded) this.state = this.vel.y > 0 ? 'jump' : 'fall';
    else if (hs > 1.5 && mlen > 0.1) this.state = 'walk';
    else this.state = 'idle';

    // footsteps (walking and climbing), swim strokes, a splash going in, wind while falling
    if (this.state === 'walk' || (this.state === 'climb' && Math.abs(this.climbV) > 1)) {
      this.stepDist = (this.stepDist || 0) + this.hSpeed * dt;
      if (this.stepDist > (this.state === 'walk' ? 2.7 : 2.2)) { this.stepDist = 0; this.sfx('footstep'); }
    } else if (this.state === 'swim' && hs > 2) {
      this.stepDist = (this.stepDist || 0) + hs * dt;
      if (this.stepDist > 5) { this.stepDist = 0; this.sfx('swimStroke'); }
    }
    if (swimming && !this.wasSwimming && this.lastVel.y < -8) this.sfx('splash');
    this.wasSwimming = swimming;
    if (this.isPlayer) {
      const fast = !this.grounded && !climb && !swimming && this.vel.y < -75;
      if (fast !== !!this.fallingLoud) { this.fallingLoud = fast; game.audio?.falling(fast); }
    }
  }

  // a character sound: your own at full volume, everyone else's by distance (and not
  // at all from far away)
  sfx(kind, k) {
    const a = this.game.audio;
    if (!a?.ctx) return;
    if (!this.isPlayer && this.game.camera.position.distanceTo(this.pos) > 70) return;
    a[kind]?.(this.isPlayer ? null : this.pos, k);
  }

  // Pop out of a brick we're stuck inside: the nearest free spot around us (the way
  // we want to go first) or just above. Touching a wall or the floor doesn't count.
  unwedge() {
    const w = this.game.world;
    const free = (x, y, z) => !w.overlapsCapsule(x, y + HALF + 0.15, z, 1.4, 0.9);
    const p = this.pos;
    if (free(p.x, p.y, p.z)) return false;
    const m = Math.hypot(this.move.x, this.move.z) || 1, mx = this.move.x / m, mz = this.move.z / m;
    for (const r of [0.8, 1.6, 2.5, 3.5]) {
      for (let i = 0; i < 12; i++) {
        // 0, +30, -30, +60 ... degrees from the direction we're walking
        const a = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 6, ca = Math.cos(a), sa = Math.sin(a);
        const x = p.x + (mx * ca - mz * sa) * r, z = p.z + (mx * sa + mz * ca) * r;
        for (const dy of [0, 0.8]) if (free(x, p.y + dy, z)) { this.nudge(x, p.y + dy, z); return true; }
      }
      if (free(p.x, p.y + r, p.z)) { this.nudge(p.x, p.y + r, p.z); return true; }
    }
    return false;
  }
  nudge(x, y, z) {
    this.pos.set(x, y, z);
    this.collider.setTranslation({ x, y: y + HALF, z });
  }

  // Height of a step right in front of the feet in the move direction (0 = none).
  findStep(dx, dz) {
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return 0;
    const fx = dx / len, fz = dz / len, w = this.game.world, p = this.pos;
    const reach = 1.05 + len + 0.12;
    const fwd = { x: fx, y: 0, z: fz };
    // something at ankle height that is a wall (not a ramp)...
    const low = w.raycast({ x: p.x, y: p.y + 0.2, z: p.z }, fwd, reach);
    if (!low || Math.abs(low.normal.y) > 0.6 || low.object?.tags?.has('truss')) return 0;
    // ...but clear at knee height above the step
    for (const side of [0, -0.7, 0.7]) {
      const o = { x: p.x - fz * side, y: p.y + 1.75, z: p.z + fx * side };
      if (w.raycast(o, fwd, low.dist + 0.6)) return 0;
    }
    // top of the step just past its face
    const d = low.dist + 0.3;
    const down = w.raycast({ x: p.x + fx * d, y: p.y + 1.75, z: p.z + fz * d }, { x: 0, y: -1, z: 0 }, 1.75);
    if (!down || down.normal.y < 0.7) return 0;
    const h = down.point.y - p.y;
    if (h < 0.08 || h > 1.65) return 0;
    // room for our head after stepping up
    if (w.raycast({ x: p.x, y: p.y + 4.9, z: p.z }, { x: 0, y: 1, z: 0 }, h + 0.2)) return 0;
    return h;
  }

  // Nearest climbable truss within reach: closest point, direction to it, distance.
  nearestTruss() {
    let best = null;
    for (const t of this.game.trusses) {
      if (!t.alive || !t.anchored) continue;
      const b = this.game.world.aabb(t);
      if (this.pos.x + 3 < b.minX || this.pos.x - 3 > b.maxX || this.pos.z + 3 < b.minZ || this.pos.z - 3 > b.maxZ) continue;
      if (this.pos.y > b.maxY + 0.05 || this.pos.y + 5 < b.minY) continue;
      const cx = clamp(this.pos.x, b.minX, b.maxX) - this.pos.x, cz = clamp(this.pos.z, b.minZ, b.maxZ) - this.pos.z;
      const dist = Math.hypot(cx, cz);
      if (dist > GRAB + 0.6) continue;
      if (!best || dist < best.dist) {
        // inside the truss footprint (shouldn't happen): face its centre
        const n = dist > 0.01 ? new THREE.Vector3(cx / dist, 0, cz / dist)
          : new THREE.Vector3((b.minX + b.maxX) / 2 - this.pos.x, 0, (b.minZ + b.maxZ) / 2 - this.pos.z).normalize();
        best = { t, b, dist, n };
      }
    }
    return best;
  }

  // Truss climbing like a Roblox Humanoid. Returns climb info or null.
  updateClimb(dt, mlen) {
    this.climbCd -= dt;
    if (!this.climbing) this.climbV = 0;
    if (this.climbCd > 0) { this.climbing = null; return null; }
    const tr = this.nearestTruss();
    if (!tr) { this.climbing = null; return null; }
    const toward = mlen > 0.05 ? (this.move.x * tr.n.x + this.move.z * tr.n.z) : 0;
    const side = new THREE.Vector3(-tr.n.z, 0, tr.n.x);
    const lateral = mlen > 0.05 ? this.move.x * side.x + this.move.z * side.z : 0;
    if (!this.climbing) {
      // grab it by walking (or jumping) into it (bots only when they mean to climb)
      if (tr.dist > GRAB || toward < 0.35 || this.pos.y > tr.b.maxY - 0.6 || this.noClimb) return null;
      this.climbing = tr.t;
    } else if (tr.t !== this.climbing && tr.dist > GRAB) { this.climbing = null; return null; }
    if (tr.dist > GRAB + 0.5) { this.climbing = null; return null; }
    // jumping lets go and kicks off backwards
    if (this.jump && this.game.time - (this.jumpedAt || 0) > 0.25) {
      this.climbing = null; this.climbCd = 0.35;
      this.jumpedAt = this.game.time;
      this.vel.y = JUMP_POWER * 0.7;
      this.ext.x -= tr.n.x * 22; this.ext.z -= tr.n.z * 22;
      return null;
    }
    // over the top: pull up onto the ledge
    if (this.pos.y >= tr.b.maxY - 0.25 && toward > -0.2) {
      this.climbing = null; this.climbCd = 0.4;
      this.vel.y = 22;
      this.ext.x += tr.n.x * 14; this.ext.z += tr.n.z * 14;
      return null;
    }
    const k = Math.abs(toward) < 0.2 ? 0 : clamp(toward / 0.7, -1, 1);
    // speed ramps like the Humanoid's climbing (no instant snap)
    this.climbV += (CLIMB_SPEED * k * this.speedMul - this.climbV) * Math.min(1, dt * 14);
    return { n: tr.n, side, lateral: Math.abs(lateral) > 0.3 ? lateral : 0 };
  }

  // ---------- remote characters ----------
  // s = [eid, x, y, z, yaw, state, speed, health, flags, tool, emote, seatNid, swings, coldLevel]
  netState(now, s) {
    const [, x, y, z, yaw, st, hs, hp, fl, tool, emote, seatNid, swings, cold] = s;
    const alive = !!(fl & 1);
    if (alive && !this.alive) {
      this.alive = true;
      this.samples.length = 0;
      this.pos.set(x, y, z); this.yaw = yaw;
      this.avatar.setVisible(true);
      this.avatar.hold(this.equipped);
    } else if (!alive && this.alive) this.netDie('unknown');
    if (!alive) return;
    // teleported (into the map, back to the lobby): snap instead of sliding across
    const last = this.samples[this.samples.length - 1];
    if (last && Math.abs(last.x - x) + Math.abs(last.y - y) + Math.abs(last.z - z) > 40) this.samples.length = 0;
    this.samples.push({ t: now, x, y, z, yaw });
    if (this.samples.length > 12) this.samples.shift();
    this.state = STATES[st] || 'idle';
    this.hSpeed = hs;
    if (hp !== this.health) { this.health = hp; this.avatar.drawTag(hp / this.maxHealth); }
    this.inRound = !!(fl & 2); this.infected = !!(fl & 4); this.cold = !!(fl & 8);
    this.coldLevel = cold || 0;
    const eq = TOOL_IDS[tool] || null;
    if (eq !== this.equipped) { this.equipped = eq; this.avatar.hold(eq); }
    this.emote = EMOTES[emote] || null;
    const seat = seatNid >= 0 ? this.game.world.byNid.get(seatNid) || null : null;
    if (seat !== this.seat) {
      if (this.seat && this.seat.occupant === this) this.seat.occupant = null;
      this.seat = seat;
      if (seat) seat.occupant = this;
    }
    if (swings !== this.swings) { this.swings = swings; this.avatar.swing = 1; }
  }

  netDie(cause) {
    if (!this.alive) return;
    this.die(cause);
    this.samples.length = 0;
  }

  remotePose(now) {
    const s = this.samples;
    if (!s.length) return;
    const rt = now - REMOTE_DELAY;
    let a = s[0], b = s[s.length - 1];
    for (let i = 0; i < s.length - 1; i++) if (s[i].t <= rt && s[i + 1].t >= rt) { a = s[i]; b = s[i + 1]; break; }
    if (rt <= s[0].t) { a = b = s[0]; }
    let k = b.t > a.t ? clamp((rt - a.t) / (b.t - a.t), 0, 1) : 1;
    if (rt > s[s.length - 1].t && s.length > 1) {
      // brief extrapolation if a packet is late
      a = s[s.length - 2]; b = s[s.length - 1];
      k = 1 + Math.min(0.15, (rt - b.t) / 1000) / Math.max(0.03, (b.t - a.t) / 1000);
    }
    this.pos.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
    let d = b.yaw - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw = a.yaw + d * Math.min(1, k);
  }

  stepRemote() {
    if (!this.alive) return;
    this.remotePose(performance.now());
    this.prevPos.copy(this.pos);
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + HALF, z: this.pos.z });
  }

  dispose() {
    const w = this.game.world;
    if (this.seat && this.seat.occupant === this) this.seat.occupant = null;
    this.game.scene.remove(this.avatar.root);
    w.byCollider.delete(this.collider.handle);
    w.physics.removeRigidBody(this.body);
    this.alive = false;
  }

  // smooth position between fixed physics steps (alpha = fraction of the next step)
  renderPos(alpha) {
    return this._rp = (this._rp || new THREE.Vector3()).copy(this.prevPos).lerp(this.pos, alpha);
  }

  render(dt, alpha = 1) {
    if (!this.alive) return;
    const r = this.avatar.root;
    if (this.remote) { this.remotePose(performance.now()); r.position.copy(this.pos); }
    else r.position.copy(this.renderPos(alpha));
    r.rotation.y = this.yaw;
    if (this.avatar.tag) this.avatar.tag.visible = this.game.camera.position.distanceTo(this.pos) < 100;
    this.avatar.animate(dt, this.state, this.hSpeed || 0, this.emote);
  }
}
