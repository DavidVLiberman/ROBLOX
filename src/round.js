// RoundManager: intermission -> map -> teleport -> free roam -> disaster -> survivors -> repeat.
import { MAPS, buildMap } from './maps.js';
import { MapBuilder } from './builder.js';
import { DISASTERS } from './disasters/index.js';
import { pick, shuffle, rand } from './util.js';
import { COMBO_BADGES } from './data.js';

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
    this.T = opts.fast ? { intermission: 4, announce: 2, roam: 6, prewarn: 5, survivors: 4 } : TIMES;
  }

  addMulti() {
    if (this.multi >= 7) return false;
    this.multi++;
    this.g.island.drawWeatherMachine(this.multi);
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
    this.votes = { options: pool.map(m => m.name), counts: new Map(pool.map(m => [m.name, 0])), mine: null };
    // bots with a compass vote too
    for (const c of this.g.chars) if (!c.isPlayer && c.alive && rand() < 0.3) this.vote(pick(this.votes.options), c);
    if (this.g.player.items.compass) this.g.ui.showVote(this.votes);
  }

  vote(name, who) {
    if (!this.votes || !this.votes.counts.has(name)) return;
    if (who === this.g.player) {
      if (this.votes.mine) this.votes.counts.set(this.votes.mine, this.votes.counts.get(this.votes.mine) - 1);
      this.votes.mine = name;
    }
    this.votes.counts.set(name, this.votes.counts.get(name) + 1);
    this.g.ui.updateVote?.(this.votes);
  }

  update(dt) {
    const g = this.g;
    this.timer -= dt;
    switch (this.phase) {
      case 'intermission':
        g.ui.status('Intermission', Math.ceil(this.timer));
        if (!this.votes && this.timer <= 10) this.startVote();
        if (this.timer <= 0) {
          g.ui.hideVote();
          const def = this.pickMap();
          this.votes = null;
          this.history.push(def.name); if (this.history.length > 4) this.history.shift();
          g.loadMap(def);
          this.mapName = def.name;
          this.phase = 'announce'; this.timer = this.T.announce;
          g.ui.status(`Map: ${def.name}`);
          g.audio.click();
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
          this.active = defs.map(def => ({ def, st: {} }));
          this.prewarned = false;
          // teleport every living, non-AFK player
          const spawns = shuffle([...g.map.spawns]);
          let i = 0;
          for (const c of g.chars) {
            if (!c.alive || c.afk) continue;
            const s = spawns[i++ % spawns.length].clone();
            s.x += (rand() - .5) * 4; s.z += (rand() - .5) * 4; s.y += 0.5;
            c.teleport(s);
            c.inRound = true;
            c.minHealthThisRound = c.health;
          }
          this.phase = 'roam'; this.timer = this.T.roam;
        }
        break;
      case 'roam':
        g.ui.status(`Map: ${this.mapName}`);
        if (!this.prewarned && this.timer <= this.T.prewarn) {
          this.prewarned = true;
          for (const a of this.active) a.def.preWarn?.(g, a.st);
        }
        if (this.timer <= 0) {
          this.phase = 'disaster';
          this.duration = Math.max(...this.active.map(a => a.def.duration)) * (this.opts.fast ? 0.5 : 1);
          this.timer = this.duration;
          g.audio.warning();
          this.active.forEach((a, k) => g.ui.warning(a.def, k));
          for (const a of this.active) a.def.start(g, a.st);
        }
        break;
      case 'disaster': {
        const names = this.active.map(a => a.def.name).join(' + ');
        g.ui.status(names, Math.ceil(this.timer));
        for (const a of this.active) a.def.update(g, a.st, dt);
        // hiding in the lobby tower is not allowed
        for (const c of g.chars) {
          if (c.alive && c.inRound && g.island.inTower(c.pos)) {
            c.damage(12 * dt, 'tower');
            if (c.isPlayer && (this.towerWarn || 0) < g.time) { this.towerWarn = g.time + 3; g.ui.toast('Get back to the map! The tower is not a safe spot.'); }
          }
        }
        if (this.timer <= 0) this.endDisaster();
        break;
      }
      case 'survivors':
        if (this.timer <= 0) {
          g.ui.hideSurvivors();
          for (const c of this.survivors) if (c.alive) { c.teleport(g.island.randomSpawn()); c.inRound = false; }
          for (const c of g.chars) c.inRound = false;
          g.unloadMap();
          this.phase = 'intermission'; this.timer = this.T.intermission;
        }
        break;
    }
  }

  endDisaster() {
    const g = this.g;
    for (const a of this.active) a.def.stop(g, a.st);
    const survivors = g.chars.filter(c => c.alive && c.inRound && g.island.onIsland(c.pos));
    this.survivors = survivors;
    this.lastSurvivors = survivors.map(c => c.name);
    const n = this.active.length;
    const names = this.active.map(a => a.def.name);
    for (const c of g.chars) {
      if (survivors.includes(c)) {
        c.survivals++; c.streak++;
        this.totalRounds++;
      }
    }
    const p = g.player;
    if (survivors.includes(p)) {
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
    }
    g.ui.showSurvivors(survivors.map(c => c.name));
    g.audio.chime();
    g.audio.stopLoops();
    this.phase = 'survivors';
    this.timer = this.T.survivors;
    g.ui.status('Survivors');
    g.island.drawBoard(this.totalRounds, [...g.chars].sort((a, b) => b.survivals - a.survivals), this.lastSurvivors);
    // bots sometimes buy Multi-Disaster for the next round
    if (rand() < 0.12) { this.addMulti(); g.ui.toast(`${pick(g.chars.filter(c => !c.isPlayer))?.name || 'Someone'} used the Weather Machine!`); }
  }
}
