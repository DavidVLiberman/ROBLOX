// RoundManager: intermission -> map -> teleport -> free roam -> disaster -> survivors -> repeat.
// In multiplayer only the host runs this loop; everyone else follows the host's
// round snapshots ("rs") and runs the disasters' effects for their own character.
import { MAPS } from './maps.js';
import { DISASTERS } from './disasters/index.js';
import { pick, shuffle, rand, setSeed } from './util.js';
import { COMBO_BADGES } from './data.js';
import { botChat } from './bots.js';

export const TIMES = { intermission: 15, announce: 5, roam: 20, prewarn: 15, survivors: 6 };

export class RoundManager {
  constructor(game, opts = {}) {
    this.g = game;
    this.opts = opts;
    this.phase = 'intermission';
    this.timer = opts.fast ? 4 : TIMES.intermission;
    this.history = [];
    this.multi = 0;
    this.active = [];
    this.votes = null;
    this.totalRounds = 0;
    this.lastSurvivors = [];
    this.roundNo = 0;
    this.seed = 1;
    this.T = opts.fast ? { intermission: 4, announce: 2, roam: 6, prewarn: 5, survivors: 4 } : TIMES;
  }

  get host() { return this.g.isAuthority; }
  broadcast() { if (this.host) this.g.net?.send(this.snapshot()); }

  snapshot() {
    return {
      t: 'rs', ph: this.phase, tm: Math.round(this.timer * 10) / 10, map: this.g.map ? this.mapName : null, seed: this.seed,
      rn: this.roundNo, multi: this.multi, pw: !!this.prewarned, tr: this.totalRounds, ls: this.lastSurvivors,
      el: this.phase === 'disaster' ? Math.round((this.duration - this.timer) * 10) / 10 : 0, du: this.duration || 0,
      dis: this.active.map(a => ({ n: a.def.name, p: a.st.p || {} })),
      votes: this.votes ? { o: this.votes.options, c: this.votes.options.map(n => this.votes.counts.get(n) || 0) } : null,
    };
  }

  addMulti() {
    if (!this.host) { this.g.net?.send({ t: 'req', k: 'multi' }, this.g.net.hostId); return true; }
    if (this.multi >= 7) return false;
    this.multi++;
    this.g.island.drawWeatherMachine(this.multi);
    this.broadcast();
    return true;
  }

  pickMap() {
    if (this.opts.map) {
      const m = MAPS.find(m => m.name.toLowerCase() === this.opts.map.toLowerCase());
      if (m) return m;
    }
    if (this.votes) {
      let best = null, bc = 0;
      for (const [name, n] of this.votes.counts) if (n > bc) { bc = n; best = name; }
      if (best) return MAPS.find(m => m.name === best);
    }
    const pool = MAPS.filter(m => !this.history.includes(m.name));
    return pick(pool.length ? pool : MAPS);
  }

  pickDisasters(n) {
    if (this.opts.disasters?.length) {
      const list = this.opts.disasters.map(nm => DISASTERS.find(d => d.name.toLowerCase().includes(nm.toLowerCase()))).filter(Boolean);
      if (list.length) return list;
    }
    return shuffle([...DISASTERS]).slice(0, Math.min(n, DISASTERS.length));
  }

  startVote() {
    const pool = shuffle(MAPS.filter(m => !this.history.includes(m.name))).slice(0, 3);
    this.votes = { options: pool.map(m => m.name), counts: new Map(pool.map(m => [m.name, 0])), by: new Map(), mine: null };
    // bots with a compass vote too
    for (const c of this.g.bots) if (c.alive && rand() < 0.3) this.vote(pick(this.votes.options), c);
    if (this.g.player.items.compass) this.g.ui.showVote(this.votes);
    this.broadcast();
  }

  // one vote per player; changing your mind moves it
  vote(name, who) {
    if (!this.votes || !this.votes.counts.has(name)) return;
    if (who === this.g.player) this.votes.mine = name;
    if (!this.host) { this.g.net?.send({ t: 'req', k: 'vote', m: name }, this.g.net.hostId); this.g.ui.updateVote?.(this.votes); return; }
    this.votes.by.set(who.eid || who.name, name);
    for (const k of this.votes.counts.keys()) this.votes.counts.set(k, 0);
    for (const v of this.votes.by.values()) this.votes.counts.set(v, this.votes.counts.get(v) + 1);
    this.g.ui.updateVote?.(this.votes);
    this.broadcast();
  }

  loadMap(def, seed) {
    // same seed everywhere -> identical map and part network ids on every machine
    this.seed = seed;
    setSeed(seed);
    this.g.loadMap(def);
    this.mapName = def.name;
  }

  // ---------------------------------------------------------------- disasters (all machines)
  makeActive(list) {
    this.active = list.map(({ def, p }, i) => ({ def, st: { p: p || {}, i, def } }));
    this.prewarned = false;
  }
  preWarnAll() { this.prewarned = true; for (const a of this.active) a.def.preWarn?.(this.g, a.st); }
  startAll(late = 0) {
    const g = this.g;
    g.audio.warning();
    this.active.forEach((a, k) => g.ui.warning(a.def, k));
    for (const a of this.active) { a.st.late = late; a.def.start(g, a.st); a.st.started = true; }
  }
  stopAll() {
    for (const a of this.active) if (a.st.started) { a.def.stop(this.g, a.st); a.st.started = false; }
  }

  // A disaster event (meteor spawned, lightning strike, ...). The host (or the owner of
  // the character involved, e.g. a cough) decides it; every machine plays it.
  emit(st, ev) {
    this.g.net?.send({ t: 'dz', i: st.i, ev, r: this.roundNo });
    st.def.onEvent?.(this.g, st, ev);
  }
  applyDisasterEvent(i, ev, r) {
    if (r !== this.roundNo) return;
    const a = this.active[i];
    if (a && a.st.started) a.def.onEvent?.(this.g, a.st, ev);
  }
  sendDisasterStates() {
    if (this.phase !== 'disaster') return;
    for (const a of this.active) {
      if (!a.def.netState || !a.st.started) continue;
      const s = a.def.netState(a.st);
      if (s) this.g.net?.send({ t: 'dzs', i: a.st.i, s });
    }
  }
  applyDisasterState(i, s) {
    const a = this.active[i];
    if (a && a.st.started) a.def.applyNetState?.(this.g, a.st, s);
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.g;
    this.timer -= dt;
    if (!this.host) return this.followerUpdate(dt);
    switch (this.phase) {
      case 'intermission':
        g.ui.status('Intermission', Math.ceil(this.timer));
        if (!this.votes && this.timer <= 10) this.startVote();
        if (this.timer <= 0) {
          g.ui.hideVote();
          const def = this.pickMap();
          this.votes = null;
          this.history.push(def.name); if (this.history.length > 4) this.history.shift();
          this.loadMap(def, (Math.random() * 0x7fffffff) | 0);
          this.phase = 'announce'; this.timer = this.T.announce;
          g.ui.status(`Map: ${def.name}`);
          g.audio.click();
          this.broadcast();
        }
        break;
      case 'announce':
        g.ui.status(`Map: ${this.mapName}`);
        if (this.timer <= 0) {
          this.roundNo++;
          const n = 1 + this.multi;
          const defs = this.pickDisasters(n);
          this.multi = 0;
          g.island.drawWeatherMachine(0);
          // the host makes every random choice up front (directions, spots) and shares them
          this.makeActive(defs.map(def => ({ def, p: def.params?.(g) || {} })));
          // teleport every living, non-AFK player
          const spawns = shuffle([...g.map.spawns]);
          let i = 0;
          const remote = {};
          for (const c of g.chars) {
            if (!c.alive || c.afk || (c.remote && c.isBot)) continue;
            const s = spawns[i++ % spawns.length].clone();
            s.x += (rand() - .5) * 4; s.z += (rand() - .5) * 4; s.y += 0.5;
            if (c.remote) { remote[c.eid] = [s.x, s.y, s.z]; continue; }
            c.teleport(s);
            c.inRound = true;
            c.minHealthThisRound = c.health;
          }
          this.phase = 'roam'; this.timer = this.T.roam;
          this.broadcast();
          if (Object.keys(remote).length) g.net?.send({ t: 'tp', list: remote });
          botChat(g, 'teleport');
        }
        break;
      case 'roam':
        g.ui.status(`Map: ${this.mapName}`);
        if (!this.prewarned && this.timer <= this.T.prewarn) { this.preWarnAll(); this.broadcast(); }
        if (this.timer <= 0) {
          this.phase = 'disaster';
          this.duration = Math.max(...this.active.map(a => a.def.duration)) * (this.opts.fast ? 0.5 : 1);
          this.timer = this.duration;
          this.broadcast();
          this.startAll();
          botChat(g, this.active[0].def.bot);
        }
        break;
      case 'disaster': {
        this.disasterTick(dt);
        if (this.timer <= 0) this.endDisaster();
        break;
      }
      case 'survivors':
        if (this.timer <= 0) this.toIntermission();
        break;
    }
  }

  disasterTick(dt) {
    const g = this.g;
    const names = this.active.map(a => a.def.name).join(' + ');
    g.ui.status(names, Math.ceil(Math.max(0, this.timer)));
    for (const a of this.active) if (a.st.started) a.def.update(g, a.st, dt);
    // hiding in the lobby tower is not allowed
    for (const c of g.localChars()) {
      if (c.alive && c.inRound && g.island.inTower(c.pos)) {
        c.damage(12 * dt, 'tower');
        if (c.isPlayer && (this.towerWarn || 0) < g.time) { this.towerWarn = g.time + 3; g.ui.toast('Get back to the map! The tower is not a safe spot.'); }
      }
    }
  }

  toIntermission() {
    const g = this.g;
    g.ui.hideSurvivors();
    for (const c of g.localChars()) if (c.alive && c.inRound) c.teleport(g.island.randomSpawn());
    for (const c of g.localChars()) c.inRound = false;
    g.unloadMap();
    this.active = [];
    this.phase = 'intermission'; this.timer = this.T.intermission;
    if (this.host) { g.syncBots?.(); this.broadcast(); }
  }

  endDisaster() {
    const g = this.g;
    this.stopAll();
    const survivors = g.chars.filter(c => c.alive && c.inRound && g.island.onIsland(c.pos));
    this.survivors = survivors;
    this.lastSurvivors = survivors.map(c => c.name);
    this.totalRounds += survivors.length;
    const list = survivors.map(c => ({ eid: g.net ? g.net.eidOf(c) : c.name, name: c.name, health: Math.ceil(c.health), max: c.maxHealth }));
    this.phase = 'survivors';
    this.timer = this.T.survivors;
    this.broadcast();
    g.net?.send({ t: 'surv', list });
    for (const c of g.bots) if (survivors.includes(c)) { c.survivals++; c.streak++; }
    if (g.bots.length) g.net?.send({ t: 'ents', add: g.bots.map(b => [b.eid, b.name, b.avatar.colors, b.survivals]) });
    this.showSurvivors(list, survivors.includes(g.player));
    // bots sometimes buy Multi-Disaster for the next round
    const buyer = pick(g.bots);
    if (buyer && rand() < 0.12 && this.addMulti()) {
      const text = `${buyer.name} added a disaster with the Weather Machine! (${this.multi}/7)`;
      if (g.net) g.net.broadcastSystem(text); else g.ui.system(text);
    }
  }

  // survivors screen + the local player's stats and badges (every machine)
  showSurvivors(list, iSurvived) {
    const g = this.g;
    const names = this.active.map(a => a.def.name);
    const n = this.active.length;
    const p = g.player;
    if (iSurvived) {
      p.survivals++; p.streak++;
      g.data.d.survivals = p.survivals;
      g.data.d.streak = p.streak;
      g.data.d.bestStreak = Math.max(g.data.d.bestStreak, p.streak);
      g.data.save();
      for (const [k, id] of [[1, 'survive1'], [10, 'survive10'], [25, 'survive25'], [50, 'survive50'], [100, 'survive100'], [200, 'survive200'], [400, 'survive400'], [1000, 'survive1000']]) if (p.survivals >= k) g.awardBadge(id);
      if (p.streak >= 3) g.awardBadge('streak3');
      if (p.streak >= 5) g.awardBadge('streak5');
      if (p.health < 10) g.awardBadge('closecall');
      if (n >= 2) g.awardBadge('multi' + Math.min(7, n));
      for (const [m, d, id] of COMBO_BADGES) if (this.mapName === m && names.includes(d)) g.awardBadge(id);
      g.net?.sendHi();
    }
    g.ui.showSurvivors(list.map(s => ({ name: s.name, health: s.health, max: s.max })));
    botChat(g, 'survived');
    g.audio.chime();
    g.audio.stopLoops();
    g.ui.status('Survivors');
    g.island.drawBoard(this.totalRounds, [...g.chars].sort((a, b) => b.survivals - a.survivals), this.lastSurvivors);
  }

  // ---------------------------------------------------------------- followers
  followerUpdate(dt) {
    const g = this.g;
    switch (this.phase) {
      case 'intermission': g.ui.status('Intermission', Math.ceil(Math.max(0, this.timer))); break;
      case 'announce': case 'roam': g.ui.status(`Map: ${this.mapName}`); break;
      case 'disaster': this.disasterTick(dt); break;
      case 'survivors': g.ui.status('Survivors'); break;
    }
  }

  applySurvivors(list) {
    const net = this.g.net;
    this.lastSurvivors = list.map(s => s.name);
    this.showSurvivors(list, list.some(s => s.eid === net.selfId));
  }

  // follow the host's round snapshot
  applyNet(s) {
    const g = this.g;
    if (Math.abs(this.timer - s.tm) > 0.4 || s.ph !== this.phase) this.timer = s.tm;
    if (s.multi !== this.multi) { this.multi = s.multi; g.island.drawWeatherMachine(s.multi); }
    this.totalRounds = s.tr;
    // map vote
    if (s.votes) {
      const fresh = !this.votes || this.votes.options.join() !== s.votes.o.join();
      if (fresh) this.votes = { options: s.votes.o, counts: new Map(), by: new Map(), mine: null };
      s.votes.o.forEach((n, i) => this.votes.counts.set(n, s.votes.c[i]));
      if (fresh && g.player.items.compass) g.ui.showVote(this.votes); else g.ui.updateVote?.(this.votes);
    } else if (this.votes) { this.votes = null; g.ui.hideVote(); }

    const prev = this.phase;
    const needMap = s.map && s.ph !== 'intermission';
    if (needMap && (!g.map || this.mapName !== s.map || this.seed !== s.seed)) {
      if (g.map) { this.stopAll(); this.active = []; g.unloadMap(); }
      const def = MAPS.find(m => m.name === s.map);
      if (def) this.loadMap(def, s.seed);
      if (prev === 'intermission' || s.ph === 'announce') g.audio.click();
    }
    // disasters chosen for this round
    if ((s.ph === 'roam' || s.ph === 'disaster') && s.dis.length && (s.rn !== this.roundNo || !this.active.length)) {
      this.stopAll();
      this.roundNo = s.rn;
      this.makeActive(s.dis.map(d => ({ def: DISASTERS.find(x => x.name === d.n), p: d.p })).filter(x => x.def));
    }
    this.roundNo = s.rn;
    if (s.pw && !this.prewarned && this.active.length && (s.ph === 'roam' || s.ph === 'disaster')) this.preWarnAll();
    this.phase = s.ph;
    this.duration = s.du;
    if (s.ph === prev) return;
    if (s.ph === 'announce') g.ui.hideVote();
    if (s.ph === 'disaster' && this.active.length && !this.active[0].st.started) {
      this.startAll(prev === 'roam' ? 0 : s.el);
      g.player.minHealthThisRound = g.player.health;
    }
    if (s.ph === 'survivors') this.stopAll();
    if (s.ph === 'intermission' && prev !== 'intermission') { this.stopAll(); this.toIntermission(); this.timer = s.tm; }
  }
}
