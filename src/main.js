import * as THREE from 'three';
import { World, RAPIER } from './world.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { CameraController } from './camera.js';
import { Island } from './island.js';
import { Character } from './character.js';
import { BotBrain, BOT_NAMES, botColors } from './bots.js';
import { RoundManager } from './round.js';
import { UI } from './ui.js';
import { SaveData } from './data.js';
import { buildMap } from './maps.js';
import { MapBuilder } from './builder.js';
import { stepVehicles } from './vehicles.js';
import { NOOB_COLORS } from './avatar.js';
import { OCEAN_LEVEL, setSeed, shuffle, clamp } from './util.js';

const STEP = 1 / 60;

class Game {
  async init() {
    const q = new URLSearchParams(location.search);
    this.opts = {
      map: q.get('map'),
      disasters: q.get('disaster') ? q.get('disaster').split(',') : null,
      bots: q.has('bots') ? clamp(parseInt(q.get('bots'), 10) || 0, 0, 20) : 9,
      fast: q.has('fast'),
      autostart: q.has('autostart'),
    };
    if (q.has('seed')) setSeed(parseInt(q.get('seed'), 10));
    this.godMode = q.has('god');
    this.data = new SaveData();
    this.lowGfx = q.has('low') || this.data.d.settings.lowGfx || false;

    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowGfx, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.lowGfx ? 1 : 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = !this.lowGfx;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 5000);
    addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    });

    await RAPIER.init();
    this.time = 0;
    this.world = new World(this.scene);
    this.input = new Input(canvas);
    this.camController = new CameraController(this.camera, this);
    this.effects = new Effects(this);
    this.audio = new Audio(this);
    this.audio.muted = !!this.data.d.settings.muted;
    this.island = new Island(this);
    this.waterLevel = OCEAN_LEVEL; this.waterTarget = OCEAN_LEVEL; this.waterRate = 2;
    this.seats = []; this.trusses = []; this.vehicles = []; this.temp = [];
    this.map = null; this.hazardPos = null;
    this.chars = [];

    const name = (this.data.d.name || '').trim() || 'Noob' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('name-input').value = name;
    this.player = new Character(this, { name, isPlayer: true, colors: NOOB_COLORS, userId: 1 });
    this.player.items.balloon = !!this.data.d.items.balloon;
    this.player.items.apple = !!this.data.d.items.apple;
    this.player.items.compass = !!this.data.d.items.compass;
    this.player.survivals = this.data.d.survivals || 0;
    this.player.streak = this.data.d.streak || 0;
    this.chars.push(this.player);

    const names = shuffle([...BOT_NAMES]);
    this.bots = [];
    for (let i = 0; i < this.opts.bots; i++) {
      const c = new Character(this, { name: names[i % names.length], colors: botColors(), userId: i + 2 });
      c.survivals = Math.floor(Math.random() * Math.random() * 400);
      c.brain = new BotBrain(this, c);
      this.chars.push(c);
      this.bots.push(c);
    }

    this.round = new RoundManager(this, this.opts);
    this.ui = new UI(this);
    this.island.drawBoard(0, [...this.chars].sort((a, b) => b.survivals - a.survivals), []);
    this.island.drawWeatherMachine(0);
    this.interactables = [{
      pos: this.island.weatherMachine, radius: 9,
      label: () => `Weather Machine — add a disaster (${this.round.multi}/7)`,
      action: () => {
        if (this.round.addMulti()) { this.ui.toast(`Multi-Disaster: ${this.round.multi} extra disaster${this.round.multi > 1 ? 's' : ''} next round!`); this.audio.chime(); }
        else this.ui.toast('The Weather Machine is maxed out (7)!');
      },
    }];

    for (const c of this.chars) c.spawn(this.island.randomSpawn(), Math.PI);
    this.camController.target.copy(this.player.pos).add(new THREE.Vector3(0, 4.5, 0));
    this.setupTouch();

    this.started = false;
    const go = () => {
      const nm = document.getElementById('name-input').value.trim().replace(/[^\w ]/g, '').slice(0, 20);
      if (nm) { this.player.name = nm; this.data.d.name = nm; this.data.save(); }
      document.getElementById('start').classList.add('hide');
      this.audio.start();
      this.started = true;
      this.awardBadge('welcome');
    };
    document.getElementById('play-btn').onclick = go;
    document.getElementById('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    if (this.opts.autostart) go();
    document.getElementById('loading').classList.add('hide');

    this.last = performance.now();
    this.acc = 0;
    window.game = this;
    requestAnimationFrame(() => this.frame());
  }

  setupTouch() {
    const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    this.input.showJoy = (x, y, dx, dy) => {
      if (x === null) { joy.style.display = 'none'; return; }
      joy.style.display = 'block';
      joy.style.left = `${x - 60}px`; joy.style.top = `${y - 60}px`;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const jb = document.getElementById('jump-btn');
    const set = (v) => (e) => { e.preventDefault(); this.input.touch.jump = v; this.input.isTouch = true; };
    jb.addEventListener('touchstart', set(true), { passive: false });
    jb.addEventListener('touchend', set(false), { passive: false });
    jb.addEventListener('touchcancel', set(false), { passive: false });
    document.getElementById('prompt').addEventListener('click', () => this.interactNearest(true));
    if ('ontouchstart' in window) document.body.classList.add('touch');
  }

  // ---------- map lifecycle ----------
  loadMap(def) {
    this.map = buildMap(this, def, MapBuilder);
    this.seats = this.map.seats;
    this.trusses = this.map.trusses;
    this.vehicles = this.map.vehicles;
  }

  unloadMap() {
    for (const c of this.chars) if (c.seat) c.unsit();
    if (this.map) for (const p of this.map.parts) this.world.removePart(p);
    for (const p of this.temp) this.world.removePart(p);
    for (const p of [...this.world.dynamic]) if (!p.tags.has('corpse')) this.world.removePart(p);
    this.temp = [];
    this.map = null;
    this.seats = []; this.trusses = []; this.vehicles = [];
    this.hazardPos = null; this.windDir = null;
    this.effects.reset();
    this.audio.stopLoops();
    this.setWaterLevel(OCEAN_LEVEL);
    this.shakeUntil = 0;
  }

  trackTemp(p) { this.temp.push(p); }

  setWaterLevel(level) { this.waterLevel = level; this.waterTarget = level; }
  recedeWater(seconds = 8) {
    this.waterTarget = OCEAN_LEVEL;
    this.waterRate = Math.max(0.5, (this.waterLevel - OCEAN_LEVEL) / seconds);
  }

  shakeAll(amount, seconds) {
    this.shakeAmt = amount;
    this.shakeUntil = Math.max(this.shakeUntil || 0, this.time + seconds);
  }

  respawn(c) {
    c.spawn(this.island.randomSpawn(), Math.PI);
    if (c.brain) c.brain.mode = '';
  }

  onDeath(c, cause, wasInRound) {
    if (wasInRound) {
      c.streak = 0;
      if (c.isPlayer) { this.data.d.streak = 0; this.data.save(); }
    }
    if (c.isPlayer) c.items.hammerPending = false;
  }

  onSpawn(c) {
    if (c.isPlayer) {
      c.gravityScale = 1;
      this.camController.dist = Math.max(this.camController.dist, 8);
    }
  }

  awardBadge(id) {
    if (this.data.award(id)) { this.ui.badge(id); this.audio.badge(); }
  }

  equipSlot(i) {
    const k = this.ui.slotKeys?.[i];
    if (!k) return;
    this.player.equip(k);
    this.audio.click();
  }

  setLowGfx(v) {
    this.lowGfx = v;
    this.data.d.settings.lowGfx = v; this.data.save();
    this.renderer.shadowMap.enabled = !v;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, v ? 1 : 1.5));
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }

  interactNearest(fire) {
    const p = this.player;
    if (!p.alive) return null;
    let best = null, bd = Infinity;
    const list = [...this.interactables, ...(this.map?.interact || [])];
    for (const it of list) {
      if (it.cond && !it.cond()) continue;
      const d = it.pos.distanceTo(p.pos);
      if (d < it.radius && d < bd) { bd = d; best = it; }
    }
    // vehicle seats
    if (!best) for (const v of this.vehicles) {
      if (v.broken || v.seat.occupant || !v.drivable) continue;
      const t = v.seat.body.translation();
      const d = Math.hypot(t.x - p.pos.x, t.z - p.pos.z);
      if (d < 7 && d < bd && Math.abs(t.y - p.pos.y) < 6) { bd = d; best = { label: 'Drive', action: () => p.sit(v.seat), pos: null }; }
    }
    if (fire && best) best.action(p);
    return best;
  }

  // ---------- player control ----------
  controlPlayer(dt) {
    const p = this.player, input = this.input, cam = this.camController;
    if (!this.started || this.ui.el.menu.classList.contains('show')) { p.move.set(0, 0, 0); p.jump = false; return; }
    const { f, r } = input.moveAxes();
    const { fwd, right } = cam.basis();
    const m = fwd.multiplyScalar(f).add(right.multiplyScalar(r));
    if (m.length() > 1) m.normalize();
    const driving = p.seat && p.seat.vehicle;
    p.move.copy(driving ? new THREE.Vector3() : m);
    p.jump = input.jumpHeld();
    p.faceYaw = (input.shiftLock || cam.firstPerson) && !p.seat ? cam.yaw : null;

    for (let i = 0; i < 3; i++) if (input.wasPressed(String(i + 1))) this.equipSlot(i);
    if (input.wasPressed('e')) this.interactNearest(true);
    this.ui.prompt(this.interactNearest(false));

    // balloon: low gravity, pops way up high
    const balloon = p.equipped === 'balloon' && !p.balloonPopped;
    p.gravityScale = balloon ? 0.3 : 1;
    if (balloon && p.pos.y > 170) {
      p.balloonPopped = true; p.equip(null); this.audio.pop(p.pos); this.ui.toast('Your balloon popped!');
    }
    if (input.clicked && p.alive) {
      if (p.equipped === 'apple') {
        if ((p.appleCd || 0) < this.time) {
          p.appleCd = this.time + 8;
          p.heal(p.maxHealth * 0.15);
          p.avatar.swing = 1;
          this.audio.eat();
        } else this.ui.toast(`Apple cooldown: ${Math.ceil(p.appleCd - this.time)}s`, 1200);
      } else if (p.equipped === 'hammer') {
        if ((p.hammerCd || 0) < this.time) {
          const ndc = new THREE.Vector2(input.clickX / innerWidth * 2 - 1, -(input.clickY / innerHeight) * 2 + 1);
          const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
          const hit = this.world.raycast(this.camera.position, ray.ray.direction, 300);
          if (hit && hit.object && hit.object.size && !hit.object.tags.has('indestructible') && hit.point.distanceTo(p.pos) < 40) {
            p.hammerCd = this.time + 3;
            p.avatar.swing = 1;
            const d = ray.ray.direction;
            this.world.unanchor(hit.object, { x: d.x * 30, y: 10, z: d.z * 30 });
            this.audio.crash(hit.point);
          }
        }
      }
    }
  }

  debrisDamage() {
    const fast = [];
    for (const p of this.world.dynamic) {
      if (p.tags.has('nodamage')) continue;
      const v = p.body.linvel();
      const s2 = v.x * v.x + v.y * v.y + v.z * v.z;
      if (s2 > 26 * 26) fast.push([p, Math.sqrt(s2)]);
    }
    if (!fast.length) return;
    for (const c of this.chars) {
      if (!c.alive || (c.debrisCd || 0) > this.time) continue;
      for (const [p, sp] of fast) {
        const t = p.body.translation();
        const dx = t.x - c.pos.x, dz = t.z - c.pos.z;
        const reach = Math.max(p.size.x, p.size.y, p.size.z) * 0.42 + 1.3;
        if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
        const cy = clamp(t.y, c.pos.y + 1, c.pos.y + 4);
        const dy = t.y - cy;
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        const vol = p.size.x * p.size.y * p.size.z;
        const dmg = clamp((sp - 26) * Math.sqrt(Math.max(1, vol)) * 0.3, 0, 100);
        if (dmg < 2) continue;
        c.debrisCd = this.time + 0.3;
        c.damage(dmg, 'debris');
        if (p.mat === 'glass') this.audio.glass(t); else this.audio.crash(t);
        break;
      }
    }
  }

  // ---------- main loop ----------
  frame() {
    requestAnimationFrame(() => this.frame());
    const now = performance.now();
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    const t0 = performance.now();
    this.controlPlayer(dt);
    for (const b of this.bots) b.brain.update(dt);
    if (this.started) this.round.update(dt);

    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) {
      for (const c of this.chars) c.step(STEP);
      stepVehicles(this, STEP);
      this.map?.extras.update?.(STEP);
      this.world.step(STEP);
      this.debrisDamage();
      if (this.world.supportDirty) {
        this.world.supportTimer -= STEP;
        if (this.world.supportTimer <= 0 && this.map) { this.world.supportDirty = false; this.world.supportTimer = 0.25; this.world.updateSupport(this.map.parts); }
      }
      this.acc -= STEP; n++;
    }
    if (n === 4) this.acc = 0;
    this.world.sync(dt);

    // water
    if (this.waterLevel > this.waterTarget) this.waterLevel = Math.max(this.waterTarget, this.waterLevel - this.waterRate * dt);
    this.island.setWater(this.waterLevel);
    for (const c of this.chars) {
      if (!c.alive) continue;
      if (c.pos.y + 4.6 < this.waterLevel) c.damage(6 * dt, 'drown', true);
      else if (c.swimming) c.damage(1.5 * dt, 'water', true);
    }
    if (this.shakeUntil > this.time && this.player.alive && this.island.onIsland(this.player.pos)) this.camController.shake = Math.max(this.camController.shake, this.shakeAmt);

    for (const c of this.chars) c.render(dt);
    const p = this.player;
    const subj = p.alive ? new THREE.Vector3(p.pos.x, p.pos.y + 4.5, p.pos.z) : null;
    this.camController.update(dt, this.input, subj);
    p.avatar.setVisible(p.alive && !this.camController.firstPerson);
    this.effects.update(dt);
    this.ui.update(dt);
    this.input.endFrame();
    const t1 = performance.now();
    this.renderer.render(this.scene, this.camera);
    const t2 = performance.now();
    this.perf = this.perf || { logic: 0, render: 0, frame: 0 };
    this.perf.logic += (t1 - t0 - this.perf.logic) * 0.05;
    this.perf.render += (t2 - t1 - this.perf.render) * 0.05;
    this.perf.frame += (dt * 1000 - this.perf.frame) * 0.05;
  }
}

new Game().init().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  l.textContent = 'Failed to start: ' + e.message;
  l.classList.remove('hide');
});
