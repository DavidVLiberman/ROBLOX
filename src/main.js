import * as THREE from 'three';
import { World, RAPIER } from './world.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { CameraController } from './camera.js';
import { Island } from './island.js';
import { Character } from './character.js';
import { BotBrain, BOT_NAMES, botColors, botChat } from './bots.js';
import { RoundManager } from './round.js';
import { UI } from './ui.js';
import { SaveData } from './data.js';
import { buildMap } from './maps.js';
import { MapBuilder } from './builder.js';
import { stepVehicles } from './vehicles.js';
import { NOOB_COLORS } from './avatar.js';
import { Net } from './net.js';
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
      solo: q.has('solo') || q.has('map') || q.has('disaster') || q.has('seed'),
      room: (q.get('server') || q.get('room') || 'main').replace(/[^\w-]/g, '').slice(0, 32) || 'main',
      relays: q.get('relay') ? q.get('relay').split(',') : null,
    };
    if (q.has('online')) this.opts.solo = false;
    if (q.has('seed')) setSeed(parseInt(q.get('seed'), 10));
    this.godMode = q.has('god');
    this.data = new SaveData();
    this.lowGfx = q.has('low') || this.data.d.settings.lowGfx || false;

    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowGfx, powerPreference: 'high-performance', preserveDrawingBuffer: false });
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
    this.island = new Island(this);
    this.waterLevel = OCEAN_LEVEL; this.waterTarget = OCEAN_LEVEL; this.waterRate = 2;
    this.seats = []; this.trusses = []; this.vehicles = []; this.temp = [];
    this.map = null; this.hazardPos = null;
    this.chars = [];
    this.bots = [];
    this.chatQueue = [];
    this.nextIdleChat = 20;

    const name = (q.get('name') || this.data.d.name || '').trim().replace(/[^\w ]/g, '').slice(0, 20) || 'Noob' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('name-input').value = name;
    this.player = new Character(this, { name, isPlayer: true, colors: NOOB_COLORS, userId: 1 });
    this.player.items.balloon = !!this.data.d.items.balloon;
    this.player.items.apple = !!this.data.d.items.apple;
    this.player.items.compass = !!this.data.d.items.compass;
    this.player.survivals = this.data.d.survivals || 0;
    this.player.streak = this.data.d.streak || 0;
    this.player.afk = true;           // not in rounds until Play is pressed
    this.chars.push(this.player);
    this.botNames = shuffle([...BOT_NAMES]);
    this.nextBotId = 0;

    this.round = new RoundManager(this, this.opts);
    this.ui = new UI(this);
    this.island.drawWeatherMachine(0);
    // the Weather Machine sells Multi-Disaster through the standard purchase prompt
    this.interactables = [{
      pos: this.island.weatherMachine, radius: 9, height: 9,
      object: () => `Weather Machine (${this.round.multi}/7)`,
      label: 'Add Disaster',
      action: () => this.ui.openPurchase('multi'),
    }];
    // the item signs on the lobby roof open the purchase prompt, like clicking them in NDS
    for (const sg of this.island.signs) {
      this.interactables.push({ pos: sg.pos, radius: 7, height: 7, object: sg.title.toLowerCase().replace(/\b\w/g, m => m.toUpperCase()), label: 'Get', action: () => this.ui.openPurchase(sg.kind) });
    }
    this.spectating = null;

    this.player.spawn(this.island.randomSpawn(), 0);
    this.camController.target.copy(this.player.pos).add(new THREE.Vector3(0, 4.5, 0));
    this.setupTouch();

    // multiplayer: join the public server right away so it is ready by the time Play is pressed
    this.net = null;
    if (!this.opts.solo) {
      try {
        this.net = new Net(this, { room: this.opts.room, relays: this.opts.relays });
        this.world.onMutate = (op, part, arg) => this.net.onMutate(op, part, arg);
        await this.net.start();
      } catch (e) {
        console.warn('Multiplayer unavailable, playing offline:', e);
        this.net = null; this.world.onMutate = null;
      }
    }
    if (!this.net) this.syncBots();
    this.island.drawBoard(0, [...this.chars].sort((a, b) => b.survivals - a.survivals), []);

    this.started = false;
    const loading = document.getElementById('loading');
    const go = () => {
      const nm = document.getElementById('name-input').value.trim().replace(/[^\w ]/g, '').slice(0, 20);
      if (nm) { this.player.name = nm; this.data.d.name = nm; this.data.save(); }
      document.getElementById('start').classList.add('hide');
      this.audio.start();
      this.ui.applySettings();
      // Roblox-style loading screen while joining the server
      loading.classList.remove('hide');
      const t0 = performance.now();
      const ready = () => {
        // wait (briefly) until we know whether someone is already hosting this server
        if (this.net && !this.net.decided && performance.now() - t0 < 8000) { setTimeout(ready, 200); return; }
        loading.classList.add('hide');
        this.started = true;
        this.player.afk = false;
        this.net?.sendHi();
        const n = this.chars.filter(c => c.isPlayer || c.remote || this.bots.includes(c)).length;
        this.ui.system(`Welcome to Natural Disaster Survival! ${n} player${n === 1 ? ' is' : 's are'} on this server.`);
        this.awardBadge('welcome');
      };
      setTimeout(ready, this.opts.autostart ? 0 : 1600);
    };
    document.getElementById('play-btn').onclick = go;
    document.getElementById('name-input').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    this.input.blocked = () => this.ui.blocking();
    this.thumbnail();
    if (this.opts.autostart) go();
    else loading.classList.add('hide');

    // the experience page shows how many people are in the server right now
    const active = document.getElementById('xp-active');
    const showActive = () => {
      if (!this.net) active.textContent = 'Offline';
      else if (!this.net.decided) active.textContent = 'Connecting…';
      else active.textContent = String(this.net.humans() - (this.started ? 0 : 1));
    };
    showActive(); setInterval(showActive, 1000);

    this.last = performance.now();
    this.acc = 0;
    window.game = this;
    requestAnimationFrame(() => this.frame());
  }

  // the host decides everything that is random and owns the bricks
  get isAuthority() { return !this.net || this.net.isHost; }
  localChars() { return this.chars.filter(c => !c.remote); }

  // ---------- multiplayer roles ----------
  becomeHost(promoted) {
    const w = this.world;
    w.replica = false;
    // bricks that were following the old host become real physics bodies again
    for (const p of [...w.replicas]) {
      w.replicas.delete(p);
      if (!p.alive) continue;
      if (p.anchored) { p.body.setBodyType(RAPIER.RigidBodyType.Fixed, true); continue; }
      p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      if (p.netVel) p.body.setLinvel({ x: p.netVel.x, y: p.netVel.y, z: p.netVel.z }, true);
      w.dynamic.add(p);
    }
    if (this.map) w.buildSupport(this.map.parts.filter(p => p.alive), 0);
    for (const a of this.round.active) if (a.st.started) a.def.promote?.(this, a.st);
    if (promoted) this.ui.system('The server host left. You are now hosting this server.');
    this.syncBots();
    this.round.broadcast();
  }

  becomeClient(wasHost) {
    this.world.replica = true;
    for (const b of [...this.bots]) this.removeBot(b);
    if (wasHost && this.map) {
      this.round.stopAll();
      this.round.active = [];
      for (const c of this.localChars()) if (c.inRound && c.alive) { c.teleport(this.island.randomSpawn()); c.inRound = false; }
      this.unloadMap();
      this.round.phase = 'intermission';
    }
    this.ui.hideVote?.();
  }

  // Simulated players fill the server up to 10 people; real players take their place.
  syncBots() {
    if (!this.isAuthority) return;
    const humans = this.net ? this.net.humans() : 1;
    const target = Math.max(0, this.opts.bots - (humans - 1));
    const add = [], gone = [];
    while (this.bots.length < target) add.push(this.addBot());
    while (this.bots.length > target) { const b = this.bots[this.bots.length - 1]; gone.push(b.eid); this.removeBot(b); }
    if (this.net && (add.length || gone.length)) this.net.send({ t: 'ents', add: add.map(b => [b.eid, b.name, b.avatar.colors, b.survivals]), gone });
  }

  addBot() {
    const used = new Set(this.chars.map(c => c.name));
    const name = this.botNames.find(n => !used.has(n)) || `Guest ${1000 + Math.floor(Math.random() * 9000)}`;
    const c = new Character(this, { name, colors: botColors(), userId: 2 + this.nextBotId });
    c.eid = `${this.net ? this.net.selfId.slice(0, 8) : 'local'}-b${this.nextBotId++}`;
    c.survivals = Math.floor(Math.random() * Math.random() * 400);
    c.brain = new BotBrain(this, c);
    this.chars.push(c);
    this.bots.push(c);
    c.spawn(this.island.randomSpawn(), 0);
    return c;
  }

  removeBot(b) {
    this.bots = this.bots.filter(x => x !== b);
    this.removeChar(b);
  }

  removeChar(c) {
    this.chars = this.chars.filter(x => x !== c);
    this.ui.forgetChar?.(c);
    c.dispose();
  }

  // the server's chat: show it here and send it to everyone
  sayChat(c, text, whisperTo = null) {
    if (!c || !text) return;
    this.ui.say(c, text, whisperTo);
    if (this.net && (c.isPlayer || this.bots.includes(c))) this.net.send({ t: 'chat', eid: this.net.eidOf(c), text, w: whisperTo ? whisperTo.eid : undefined }, whisperTo?.eid);
  }

  // map buttons (rocket launch): the host runs them for everyone
  runMapAction(i, broadcast) {
    const it = this.map?.interact?.[i];
    if (!it || (it.cond && !it.cond())) return;
    it.action(this.player);
    if (broadcast && this.net) this.net.send({ t: 'mapact', i });
  }

  // vehicle driven by another player
  applyVehicle(d) {
    const v = this.vehicles[d.vi];
    if (!v || v.broken) return;
    v.net = { x: d.x, z: d.z, yaw: d.yaw, speed: d.sp, at: performance.now() };
  }

  // the experience page thumbnail is a real render of the island
  thumbnail() {
    try {
      const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 5000);
      cam.position.set(150, 95, 170);
      cam.lookAt(0, 10, -60);
      this.effects.update(0);
      this.renderer.setSize(960, 540, false);
      this.renderer.render(this.scene, cam);
      const url = this.renderer.domElement.toDataURL('image/jpeg', 0.85);
      this.renderer.setSize(innerWidth, innerHeight);
      const t = document.querySelector('.xp-thumb');
      t.style.background = `url(${url}) center / cover`;
      t.querySelector('.xp-thumb-title').style.display = 'none';
    } catch { /* keep the fallback */ }
  }

  setupTouch() {
    const joy = document.getElementById('thumb'), knob = document.getElementById('thumb-knob');
    this.input.showJoy = (x, y, dx, dy) => {
      if (x === null) { joy.style.display = 'none'; return; }
      joy.style.display = 'block';
      joy.style.left = `${x - 60}px`; joy.style.top = `${y - 60}px`;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const jb = document.getElementById('jump-btn');
    const set = (v) => (e) => { e.preventDefault(); this.input.touch.jump = v; this.input.isTouch = true; jb.classList.toggle('down', v); };
    jb.addEventListener('touchstart', set(true), { passive: false });
    jb.addEventListener('touchend', set(false), { passive: false });
    jb.addEventListener('touchcancel', set(false), { passive: false });
    if ('ontouchstart' in window) document.body.classList.add('touch');
  }

  // ---------- map lifecycle ----------
  loadMap(def) {
    this.map = buildMap(this, def, MapBuilder);
    this.world.assignNids(this.map.parts);
    this.seats = this.map.seats;
    this.trusses = this.map.trusses;
    this.vehicles = this.map.vehicles;
    for (const v of this.vehicles) for (const p of v.parts) p.vehicle = v;
  }

  unloadMap() {
    for (const c of this.chars) if (c.seat && c.local) c.unsit();
    for (const c of this.chars) { c.seat = null; c.climbing = null; }
    if (this.map) for (const p of this.map.parts) this.world.removePart(p, true);
    for (const p of this.temp) this.world.removePart(p, true);
    for (const p of [...this.world.dynamic]) if (!p.tags.has('corpse')) this.world.removePart(p, true);
    this.world.replicas.clear();
    this.world.byNid.clear();
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

  // after dying you come back in the Lobby Tower, facing the map
  respawn(c) {
    c.spawn(this.island.randomSpawn(), 0);
    if (c.brain) c.brain.mode = '';
  }

  onDeath(c, cause, wasInRound) {
    if (c.remote) return;
    if (this.net) this.net.send({ t: 'die', eid: this.net.eidOf(c), cause });
    if (!c.isPlayer && wasInRound) botChat(this, 'died', c);
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
      this.camController.yaw = 0;          // look out over the map
      this.camController.pitch = -0.25;
    }
  }

  // ---------- spectating from the lobby ----------
  spectateTargets() { return this.chars.filter(c => c !== this.player && c.alive && c.inRound); }
  spectate(dir) {
    const list = this.spectateTargets();
    if (!list.length) { this.spectating = null; return; }
    const i = list.indexOf(this.spectating);
    this.spectating = list[i < 0 ? 0 : (i + dir + list.length) % list.length];
  }
  stopSpectating() { this.spectating = null; }

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
    if (fire && best) {
      const mi = this.map?.interact?.indexOf(best) ?? -1;
      if (mi >= 0 && this.net) {
        if (this.isAuthority) this.runMapAction(mi, true);
        else this.net.send({ t: 'req', k: 'act', i: mi }, this.net.hostId);
      } else best.action(p);
    }
    return best;
  }

  // ---------- player control ----------
  controlPlayer(dt) {
    const p = this.player, input = this.input, cam = this.camController;
    if (!this.started || this.ui.blocking() || this.spectating) { p.move.set(0, 0, 0); p.jump = false; this.ui.prompt(null); return; }
    const { f, r } = input.moveAxes();
    const { fwd, right } = cam.basis();
    const m = fwd.multiplyScalar(f).add(right.multiplyScalar(r));
    if (m.length() > 1) m.normalize();
    const driving = p.seat && p.seat.vehicle;
    p.move.copy(driving ? new THREE.Vector3() : m);
    p.jump = input.jumpHeld();
    p.faceYaw = (input.shiftLock || cam.firstPerson) && !p.seat ? cam.yaw : null;

    for (let i = 0; i < 10; i++) if (input.wasPressed(String((i + 1) % 10))) this.equipSlot(i);
    if (input.wasPressed('e')) this.interactNearest(true);
    this.ui.prompt(this.interactNearest(false));

    // balloon: low gravity, pops way up high
    const balloon = p.equipped === 'balloon' && !p.balloonPopped;
    p.gravityScale = balloon ? 0.3 : 1;
    if (balloon && p.pos.y > 170) {
      p.balloonPopped = true; p.equip(null); this.audio.pop(p.pos);
    }
    if (input.clicked && p.alive) {
      if (p.equipped === 'apple') {
        if ((p.appleCd || 0) < this.time) {
          p.appleCd = this.time + 5;
          p.heal(p.maxHealth * 0.15);
          p.avatar.swing = 1; p.swings++;
          this.audio.eat();
        }
      } else if (p.equipped === 'hammer') {
        if ((p.hammerCd || 0) < this.time) {
          const ndc = new THREE.Vector2(input.clickX / innerWidth * 2 - 1, -(input.clickY / innerHeight) * 2 + 1);
          const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
          const hit = this.world.raycast(this.camera.position, ray.ray.direction, 300);
          if (hit && hit.object && hit.object.size && !hit.object.tags.has('indestructible') && hit.point.distanceTo(p.pos) < 40) {
            p.hammerCd = this.time + 3;
            p.avatar.swing = 1; p.swings++;
            const d = ray.ray.direction;
            const v = { x: d.x * 30, y: 10, z: d.z * 30 };
            if (this.isAuthority) this.world.unanchor(hit.object, v);
            else if (hit.object.nid != null) this.net.send({ t: 'req', k: 'hammer', nid: hit.object.nid, v: [v.x, v.y, v.z] }, this.net.hostId);
            this.audio.crash(hit.point);
          }
        }
      }
    }
  }

  // "Capture" from the top bar menu: save a screenshot
  capture() {
    this.captureNext = false;
    try {
      const a = document.createElement('a');
      a.href = this.renderer.domElement.toDataURL('image/png');
      a.download = `NaturalDisasterSurvival-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      a.click();
      this.ui.notify('Capture saved', 'Your screenshot was downloaded.');
    } catch { this.ui.notify('Capture failed', 'Your browser blocked the screenshot.'); }
  }

  // fast flying bricks hurt the characters this machine simulates
  debrisDamage() {
    const fast = [];
    const consider = (p, v) => {
      if (p.tags.has('nodamage')) return;
      const s2 = v.x * v.x + v.y * v.y + v.z * v.z;
      if (s2 > 26 * 26) fast.push([p, Math.sqrt(s2)]);
    };
    for (const p of this.world.dynamic) if (!this.world.replicas.has(p)) consider(p, p.body.linvel());
    for (const p of this.world.replicas) if (!p.anchored && p.netVel) consider(p, p.netVel);
    if (!fast.length) return;
    for (const c of this.chars) {
      if (!c.alive || c.remote || (c.debrisCd || 0) > this.time) continue;
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
    this.dt = dt;

    const t0 = performance.now();
    this.controlPlayer(dt);
    for (const b of this.bots) b.brain.update(dt);
    // the round runs once we know who hosts (and someone is actually here)
    const someone = this.started || (this.net && this.net.peers.size > 0);
    if (someone && (!this.net || this.net.decided)) this.round.update(dt);

    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) {
      for (const c of this.chars) c.step(STEP);
      stepVehicles(this, STEP);
      this.map?.extras.update?.(STEP);
      if (this.world.replica) this.world.stepReplicas(performance.now(), STEP);
      this.world.step(STEP);
      this.debrisDamage();
      if (this.world.supportDirty && this.isAuthority) {
        this.world.supportTimer -= STEP;
        if (this.world.supportTimer <= 0 && this.map) { this.world.supportDirty = false; this.world.supportTimer = 0.25; this.world.updateSupport(this.map.parts); }
      }
      this.acc -= STEP; n++;
    }
    if (n === 4) this.acc = 0;
    this.world.sync(dt);
    this.net?.update(dt);

    // water
    if (this.waterLevel > this.waterTarget) this.waterLevel = Math.max(this.waterTarget, this.waterLevel - this.waterRate * dt);
    this.island.setWater(this.waterLevel);
    for (const c of this.chars) {
      if (!c.alive || c.remote) continue;
      if (c.pos.y + 4.6 < this.waterLevel) c.damage(6 * dt, 'drown', true);
      else if (c.swimming) c.damage(1.5 * dt, 'water', true);
    }
    if (this.shakeUntil > this.time && this.player.alive && this.island.onIsland(this.player.pos)) this.camController.shake = Math.max(this.camController.shake, this.shakeAmt);

    // queued bot chat
    for (let i = this.chatQueue.length - 1; i >= 0; i--) {
      const q = this.chatQueue[i];
      if (this.time >= q.at) { this.chatQueue.splice(i, 1); if (q.char.alive || q.char.respawnAt !== undefined) this.sayChat(q.char, q.text); }
    }
    if (this.time > this.nextIdleChat) { this.nextIdleChat = this.time + 25 + Math.random() * 35; if (this.round.phase === 'intermission' && this.started) botChat(this, 'idle'); }

    const alpha = Math.min(1, this.acc / STEP);
    for (const c of this.chars) c.render(dt, alpha);
    const p = this.player;
    // secret lab circles
    if (p.alive && this.started) this.island.updateLabPortals(p, dt);
    // spectating: follow someone who is still in the round
    if (this.spectating && (p.inRound || !this.spectating.alive || !this.spectating.inRound || !this.chars.includes(this.spectating))) {
      if (p.inRound) this.spectating = null; else this.spectate(1);
    }
    const sc = this.spectating || p;
    const rp = sc.renderPos(alpha);
    const subj = sc.alive ? new THREE.Vector3(rp.x, rp.y + 4.5, rp.z) : null;
    this.camController.update(dt, this.input, subj);
    p.avatar.setVisible(p.alive && !this.camController.firstPerson);
    this.effects.update(dt);
    this.ui.update(dt);
    this.input.endFrame();
    const t1 = performance.now();
    this.renderer.render(this.scene, this.camera);
    if (this.captureNext) this.capture();
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
