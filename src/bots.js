// Simulated server players. They wander the lobby, explore the map,
// then guess the right kind of spot once the warning pops up.
import * as THREE from 'three';
import { BC, pick, rand, clamp } from './util.js';
import { NOOB_COLORS } from './avatar.js';
import { TOWER } from './island.js';
import { NavGrid } from './nav.js';

export const BOT_NAMES = [
  'Guest 1337', 'xXNoobSlayerXx', 'builderkid2008', 'CoolDude_42', 'Guest 8821', 'PizzaLover9000', 'blox_master', 'SurvivorPro',
  'tornado_chaser', 'Guest 4096', 'oofmaster', 'LavaWalker', 'iSurviveEverything', 'brickbuilder77', 'StormRunner', 'CaptainNoob',
  'GamerGirl_2012', 'TsunamiSurfer', 'kitty_cat_33', 'MeteorDodger', 'Guest 6060', 'cheesyfries', 'xX_Disaster_Xx', 'NoobDefender',
];

const SHIRTS = [BC.brightRed, BC.brightGreen, BC.white, BC.black, BC.brightOrange, BC.mauve, BC.pastelBlue, BC.brightYellow, BC.navy, BC.pink];
const PANTS = [BC.black, BC.brightBlue, BC.reddishBrown, BC.darkStone, BC.navy, BC.white, BC.yellowGreen];
const SKIN = [BC.brightYellow, BC.nougat, 0xead1b3, 0x7c5c46, 0xcc8e69, BC.brightYellow];

export function botColors() {
  if (rand() < 0.5) return NOOB_COLORS;
  const skin = pick(SKIN);
  return { head: skin, arms: rand() < 0.5 ? skin : pick(SHIRTS), torso: pick(SHIRTS), legs: pick(PANTS) };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Which way to play each disaster (from how good players survive them).
const STRATEGY_PRIORITY = ['high', 'high-ish', 'away-volcano', 'away-mountain', 'away-tornado', 'away-fire', 'upwind', 'indoor-low', 'indoor', 'open', 'avoid-crowd'];

export class BotBrain {
  constructor(game, char) {
    this.g = game;
    this.c = char;
    this.path = [];
    this.idx = 0;
    this.smart = 0.6 + rand() * 0.4;          // how often they make the right call
    this.wait = 0;
    this.mode = 'lobby';
    this.progressT = 0; this.bestDist = Infinity; this.stuckCount = 0;
    this.detour = 0; this.detourT = 0;
    this.dodgeUntil = 0; this.thinkT = 0;
    this.avoid = new Set(); this.avoidMap = null; this.replans = 0;   // spots it got stuck at
    // some bots own the game passes too
    char.items.balloon = rand() < 0.3;
    char.items.apple = rand() < 0.35;
  }

  // the island's walk grid (rebuilt every few seconds as things get destroyed)
  nav() {
    const g = this.g;
    if (!g.nav) g.nav = new NavGrid(g.world);
    if (g.nav.mapRef !== g.map || g.time - g.nav.builtAt > 4) { g.nav.build(g.world.parts, g.time); g.nav.mapRef = g.map; }
    return g.nav;
  }

  // Plan the ground-level part of a route with A* (around buildings, through doors,
  // past furniture) up to the last waypoint that is still on the ground; the
  // stair and ladder waypoints the map gives take over from there.
  route(points) {
    const c = this.c;
    if (!points.length || !this.g.map || c.pos.y > 4 || this.g.island.inTower(c.pos)) return points;
    const nav = this.nav();
    if (this.avoidMap !== this.g.map || this.avoid.size > 40) { this.avoid.clear(); this.avoidMap = this.g.map; }
    let last = -1;
    while (last + 1 < points.length && points[last + 1].y < 3.5) last++;
    // first stop is up on a hill: go round to the bottom of its steps
    const ramps = this.g.map.ramps;
    if (last < 0 && ramps?.length) {
      const cost = (r) => r.foot.distanceTo(c.pos) + r.top.distanceTo(points[0]);
      const r = ramps.reduce((a, b) => cost(b) < cost(a) ? b : a);
      if (Math.abs(r.top.y - points[0].y) < 4) { points = [r.foot, r.top, ...points]; last = 0; }
    }
    // plan only to a waypoint the grid can see clearly (tight corners by stairs are
    // walked straight from the doorway instead)
    while (last > 0 && nav.nearestWalkable(nav.idx(points[last].x, points[last].z), 1) < 0) last--;
    if (last < 0) last = 0;     // first stop is up a ladder: walk to its foot
    // a waypoint the grid can't reach (boxed in by stair steps) is walked straight
    // from the one before it
    for (; last >= 0; last--) {
      const goal = points[last];
      if (Math.hypot(goal.x - c.pos.x, goal.z - c.pos.z) < 3) return points.slice(last);
      const pre = nav.findPath(c.pos, goal, 30000, false, this.avoid.size ? this.avoid : null);
      if (pre) return [...pre, ...points.slice(last + 1)];
    }
    return points;
  }

  setPath(points, goal = null) {
    this.path = points.map(p => p.clone()); this.idx = 0;
    this.progressT = 0; this.bestDist = Infinity; this.stuckCount = 0;
    this.goal = goal; this.replans = 0;
  }

  // wander around the Lobby Tower, sometimes taking the blue stairs to the roof
  lobbyWander() {
    const isl = this.g.island, c = this.c;
    const target = isl.lobbySpot(rand);
    const onRoof = c.pos.y > TOWER.roof - 3, toRoof = target.y > TOWER.roof - 3;
    const st = pick(isl.stairs);
    if (onRoof && !toRoof) this.setPath([st.landing, st.top, st.bottom, target]);
    else if (!onRoof && toRoof) this.setPath([st.bottom, st.top, st.landing, target]);
    else this.setPath([target]);
    this.wait = 1 + rand() * 4;
  }

  // ---------- choosing where to stand ----------
  strategy() {
    const list = this.g.round.active.map(a => a.def.bot);
    return STRATEGY_PRIORITY.find(s => list.includes(s)) || list[0] || 'open';
  }

  // Score every spot on the map for a strategy; smart bots take one of the best.
  chooseSpot(strategy) {
    const g = this.g, map = g.map;
    if (!map || !map.spots.length) return;
    const c = this.c, spots = this.reachable();
    const hz = g.hazardPos;
    const taken = g.bots.filter(b => b !== c && b.brain?.goal).map(b => b.brain.goal);
    const tallest = map.tallest || 30;
    const wave = g.round.active.find(a => a.def.name === 'Tsunami')?.st.p?.h;
    const score = (s) => {
      const p = s.pos;
      let v = 0;
      switch (strategy) {
        case 'high': v = p.y * 2 + (s.type === 'high' ? 6 : 0); break;
        case 'high-ish': {   // above the wave, but not the tallest (it tends to fall)
          const want = (wave || tallest * 0.6) + 5;
          v = -Math.abs(p.y - want) * 1.5 + (p.y > (wave || 0) + 2 ? 20 : -30) - (p.y > tallest * 0.9 ? 15 : 0);
          break;
        }
        case 'indoor-low': v = (s.type === 'indoor' ? 40 : -40) - p.y * 1.5; break;
        case 'indoor': {
          v = s.type === 'indoor' ? 40 : -40;
          // blizzard: other people keep you warm
          if (g.round.active.some(a => a.def.name === 'Blizzard')) v += Math.min(3, taken.filter(t => t.distanceTo(p) < 8).length) * 6;
          break;
        }
        case 'open': v = (s.type === 'open' ? 30 : -40) + Math.min(30, this.clearance(p)); break;
        case 'upwind': {
          const w = g.windDir;
          v = (s.type === 'open' ? 20 : -20) - (w ? (p.x * w.x + p.z * w.z) * 0.4 : 0);
          break;
        }
        case 'avoid-crowd': v = (s.type === 'open' ? 10 : 0) + Math.min(40, Math.min(...g.chars.filter(o => o !== c && o.alive && o.inRound).map(o => o.pos.distanceTo(p)), 99)); break;
        default:      // away-*
          v = hz ? Math.min(160, Math.hypot(p.x - hz.x, p.z - hz.z)) * 0.6 : 0;
          if (strategy === 'away-fire') v += s.type === 'open' ? 15 : -10;
          if (strategy === 'away-tornado') v += s.type === 'open' ? 10 : 0;
          if (strategy === 'away-mountain') v += s.type === 'indoor' ? 8 : 0;
      }
      // spread out, and prefer spots that are not far away
      v -= taken.filter(t => t.distanceTo(p) < 5).length * (strategy === 'avoid-crowd' ? 30 : 6);
      v -= c.pos.distanceTo(p) / 25;
      return v + rand() * 4;
    };
    let choice;
    if (rand() < this.smart) {
      const ranked = spots.map(s => [s, score(s)]).sort((a, b) => b[1] - a[1]);
      choice = ranked[Math.floor(rand() * Math.min(3, ranked.length))][0];
    } else choice = pick(spots);
    const jitter = V((rand() - .5) * 2.5, 0, (rand() - .5) * 2.5);
    const end = choice.pos.clone().add(jitter);
    this.setPath(this.route(choice.path.length ? [...choice.path, end] : [end]), end);
    this.target = choice;
  }

  // Spots on the ground floor that can't actually be walked to (locked cells,
  // closed-off rooms) are left out. Checked once per map on the walk grid.
  reachable() {
    const g = this.g, map = g.map;
    if (map._reach) return map._reach;
    const nav = this.nav();
    map._reach = map.spots.filter(s => {
      if (s.pos.y > 3.5 || !s.path.length) return true;
      const from = s.path.find(p => p.y < 3.5) || s.path[0];
      return !!nav.findPath(from, s.pos, 30000, true);
    });
    if (!map._reach.length) map._reach = map.spots;
    return map._reach;
  }

  // distance to the nearest tall structure (for earthquakes)
  clearance(p) {
    const g = this.g;
    if (!this._tall || this._tallMap !== g.map) {
      this._tallMap = g.map;
      this._tall = g.map.parts.filter(q => q.alive && q.anchored && g.world.aabb(q).maxY > 10).map(q => q.position);
    }
    let best = 60;
    for (const t of this._tall) best = Math.min(best, Math.hypot(t.x - p.x, t.z - p.z));
    return best;
  }

  // ---------- reacting to danger as it happens ----------
  // Returns a direction to run (or null when it's safe where we are).
  danger() {
    const g = this.g, c = this.c, P = c.pos;
    const away = (x, z, w = 1) => { const v = V(P.x - x, 0, P.z - z); const l = v.length() || 1; return v.multiplyScalar(w / l); };
    let flee = null;
    const add = (v) => { flee = flee ? flee.add(v) : v; };
    for (const a of g.round.active) {
      const st = a.st, n = a.def.name;
      if (!st.started) continue;
      if (n === 'Tornado' && st.pos && Math.hypot(P.x - st.pos.x, P.z - st.pos.z) < 55) add(away(st.pos.x, st.pos.z, 2));
      if (n === 'Volcanic Eruption') {
        for (const b of st.blobs || []) {   // predict where each lava block lands
          if (b.vel.y > 10) continue;
          const t = (b.vel.y + Math.sqrt(Math.max(0, b.vel.y * b.vel.y + 2 * 60 * Math.max(0, b.pos.y - P.y)))) / 60;
          const lx = b.pos.x + b.vel.x * t, lz = b.pos.z + b.vel.z * t;
          if (Math.hypot(lx - P.x, lz - P.z) < b.r + 6) add(away(lx, lz, 3));
        }
      }
      if (n === 'Meteor Shower') {
        for (const m of st.list || []) {
          const t = (m.pos.y - P.y) / Math.max(1, -m.vel.y);
          const lx = m.pos.x + m.vel.x * t, lz = m.pos.z + m.vel.z * t;
          if (t < 2.5 && Math.hypot(lx - P.x, lz - P.z) < 9) add(away(lx, lz, 3));
        }
      }
      if (n === 'Avalanche' && st.chunks && st.dir) {
        const side = V(st.dir.z, 0, -st.dir.x);
        for (const b of st.chunks) {
          const rel = P.clone().sub(b.pos);
          const ahead = rel.x * st.dir.x + rel.z * st.dir.z, lat = rel.x * side.x + rel.z * side.z;
          if (ahead > 0 && ahead < 50 && Math.abs(lat) < b.r + 3) add(side.clone().multiplyScalar(lat >= 0 ? 3 : -3));
        }
      }
      if (n === 'Deadly Virus') {
        for (const o of g.chars) if (o !== c && o.alive && o.inRound && o.pos.distanceTo(P) < (o.infected ? 14 : 8)) add(away(o.pos.x, o.pos.z, o.infected ? 2 : 1));
        for (const d of st.drops || []) if (Math.hypot(d.pos.x - P.x, d.pos.z - P.z) < 3 && Math.abs(d.pos.y - P.y) < 3) add(away(d.pos.x, d.pos.z, 2));
      }
    }
    // burning bricks
    for (const p of g.effects.burning) {
      if (!p.alive) continue;
      const t = p.body.translation();
      if (Math.abs(t.y - P.y) < 8 && Math.hypot(t.x - P.x, t.z - P.z) < Math.max(p.size.x, p.size.z) / 2 + 6) add(away(t.x, t.z, 2));
    }
    // flying debris heading our way
    for (const p of g.world.dynamic) {
      const v = p.body.linvel();
      if (v.x * v.x + v.z * v.z < 30 * 30) continue;
      const t = p.body.translation();
      const rel = V(P.x - t.x, 0, P.z - t.z), d = rel.length();
      if (d < 14 && (rel.x * v.x + rel.z * v.z) / (d * Math.hypot(v.x, v.z)) > 0.8) add(V(-v.z, 0, v.x).normalize().multiplyScalar(2));
    }
    return flee && flee.lengthSq() > 0.01 ? flee : null;
  }

  // ---------- using items ----------
  useItems(dt) {
    const c = this.c, g = this.g;
    // Red Apple when hurt
    if (c.items.apple && c.health < 60 && c.alive && (c.appleCd || 0) < g.time) {
      if (c.equipped !== 'apple') c.equip('apple');
      c.appleCd = g.time + 5; c.heal(c.maxHealth * 0.15); c.avatar.swing = 1; c.swings++;
    }
    // Green Balloon to float above rising water
    const water = g.waterLevel;
    const wantBalloon = c.items.balloon && !c.balloonPopped && c.inRound && water > c.pos.y - 1.5 && water > 0;
    if (wantBalloon && c.equipped !== 'balloon') c.equip('balloon');
    const floating = c.equipped === 'balloon' && !c.balloonPopped;
    c.gravityScale = floating ? 0.3 : 1;
    if (floating) { this.balloonJump = (this.balloonJump || 0) - dt; if (c.grounded || c.swimming) c.jump = true; }
    if (floating && c.pos.y > 170) { c.balloonPopped = true; c.equip(null); g.audio.pop(c.pos); }
  }

  // ---------- following a path ----------
  follow(dt) {
    const c = this.c, g = this.g;
    if (this.idx >= this.path.length) return 'arrived';
    const wp = this.path[this.idx];
    const dx = wp.x - c.pos.x, dz = wp.z - c.pos.z, dy = wp.y - c.pos.y;
    const hd = Math.hypot(dx, dz);
    const last = this.idx === this.path.length - 1;
    c.noClimb = dy < 2.5;    // only grab a truss when the next waypoint is up it
    // line up properly at the foot of stairs/ladders; climbers have to actually
    // reach the top before moving on
    const foot = !last && this.path[this.idx + 1].y - wp.y > 3;
    if (hd < (last ? 1.5 : foot ? 1.4 : 2.2) && Math.abs(dy) < (c.climbing ? 0.8 : 3.5)) { this.idx++; this.progressT = 0; this.bestDist = Infinity; this.stuckCount = 0; return this.idx >= this.path.length ? 'arrived' : 'moving'; }
    let mx = hd > 0.01 ? dx / hd : 0, mz = hd > 0.01 ? dz / hd : 0;
    // keep pushing into a truss when the waypoint is above us
    if (hd < 2.3 && dy > 1.5) {
      c.move.set(mx * 0.7, 0, mz * 0.7);
      // under a high waypoint with nothing to climb: this way doesn't work
      if (!c.climbing && dy > 3) { this.progressT += dt; if (this.progressT > 2.5) { this.progressT = 0; return 'stuck'; } }
      return 'moving';
    }
    // steer around walls in the way (keep the chosen side for a moment)
    this.detourT -= dt;
    const chest = V(c.pos.x, c.pos.y + 2.6, c.pos.z);
    const blocked = (ax, az) => {
      const h = g.world.raycast(chest, V(ax, 0, az), Math.min(3, hd));
      return h && Math.abs(h.normal.y) < 0.5 && !h.object?.tags?.has('truss');
    };
    if (this.detourT > 0 && this.detour) {
      const a = this.detour; const ca = Math.cos(a), sa = Math.sin(a);
      [mx, mz] = [mx * ca - mz * sa, mx * sa + mz * ca];
    } else if (blocked(mx, mz)) {
      this.detour = 0;
      for (const a of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
        const ca = Math.cos(a), sa = Math.sin(a);
        if (!blocked(mx * ca - mz * sa, mx * sa + mz * ca)) { this.detour = a; this.detourT = 0.6; break; }
      }
      if (this.detour) { const ca = Math.cos(this.detour), sa = Math.sin(this.detour); [mx, mz] = [mx * ca - mz * sa, mx * sa + mz * ca]; }
    }
    // don't walk off a roof by accident (unless the waypoint is down there)
    if (c.grounded && c.pos.y > 6 && dy > -3) {
      const ahead = g.world.raycast(V(c.pos.x + mx * 2, c.pos.y + 1, c.pos.z + mz * 2), V(0, -1, 0), 7);
      if (!ahead) { mx *= -0.3; mz *= -0.3; this.stuckCount++; }
    }
    c.move.set(mx, 0, mz);
    // hop over things the step-up can't handle (fences, low walls)
    if (c.grounded && hd > 1) {
      const fwd = V(mx, 0, mz);
      const low = g.world.raycast(V(c.pos.x, c.pos.y + 0.8, c.pos.z), fwd, 2.2);
      const high = g.world.raycast(V(c.pos.x, c.pos.y + 4.5, c.pos.z), fwd, 2.4);
      if (low && !high && !low.object?.tags?.has('truss') && Math.abs(low.normal.y) < 0.5) c.jump = true;
    }
    // stuck? jump, then try another way round, then give up on this waypoint
    const d = hd + Math.abs(dy) * 0.5;
    if (d < this.bestDist - 0.5) { this.bestDist = d; this.progressT = 0; }
    else this.progressT += dt;
    if (this.progressT > 1.1 && !c.climbing) {
      this.progressT = 0; this.stuckCount++;
      c.jump = true;
      this.detour = rand() < 0.5 ? 1.4 : -1.4; this.detourT = 0.7;
      // close enough to the final spot (furniture or someone is standing there)
      if (last && hd < 4.5 && Math.abs(dy) < 3) return 'arrived';
      if (this.stuckCount > 4) {
        this.stuckCount = 0;
        // walking into something the grid thinks is open (a narrow gap, a prop):
        // remember the spot and plan a way round it
        if (!last && wp.y < 3.5 && c.pos.y < 4 && hd > 0.5 && this.replans < 3 && g.map) {
          const nav = this.nav(), k = nav.idx(c.pos.x + dx / hd * 1.6, c.pos.z + dz / hd * 1.6);
          if (k >= 0) this.avoid.add(k);
          const replans = this.replans + 1, goal = this.goal;
          this.setPath(this.route(this.path.slice(this.idx)), goal);
          this.replans = replans;
          return 'moving';
        }
        if (!last) this.idx++; else return 'stuck';
      }
    }
    return 'moving';
  }

  update(dt) {
    const c = this.c, g = this.g;
    c.move.set(0, 0, 0);
    c.jump = false;
    if (!c.alive) return;
    if (c.seat) { if (rand() < dt * 0.1 || (g.round.phase === 'disaster' && this.mode === 'disaster' && rand() < dt)) c.jump = true; return; }
    const phase = g.round.phase;
    const inLobby = g.island.inTower(c.pos);
    this.useItems(dt);

    if (inLobby && (!c.inRound || phase === 'intermission' || phase === 'announce')) {
      if (this.mode !== 'lobby') { this.mode = 'lobby'; this.lobbyWander(); }
      if (this.follow(dt) !== 'moving') { this.wait -= dt; if (this.wait <= 0) this.lobbyWander(); }
      return;
    }
    if (!c.inRound) {
      // spectator who walked off the tower: head back toward it
      if (this.mode !== 'spectate') { this.mode = 'spectate'; this.setPath(this.route([g.island.rampBottom])); }
      this.follow(dt);
      return;
    }
    if (phase === 'roam') {
      if (this.mode !== 'roam') { this.mode = 'roam'; this.explore(); }
      // weather hint before the warning: careful players start moving early
      if (g.round.prewarned && !this.hinted && this.smart > 0.8) {
        this.hinted = true;
        const sky = g.effects.skyName;
        if (sky === 'dark') this.chooseSpot('high-ish');
        else if (sky === 'snowy' || sky === 'white') this.chooseSpot('indoor');
        else if (sky === 'yellow') this.chooseSpot('upwind');
      }
      if (this.follow(dt) !== 'moving') { this.wait -= dt; if (this.wait <= 0) this.explore(); }
      return;
    }
    if (phase === 'disaster') {
      if (this.mode !== 'disaster') {
        this.mode = 'disaster';
        this.hinted = false;
        this.strategyName = null; this.target = null;
        this.pendingStrategy = this.strategy();
        this.reactAt = g.time + 0.3 + rand() * (1.6 - this.smart);
      }
      if (this.pendingStrategy && g.time >= this.reactAt) { this.strategyName = this.pendingStrategy; this.pendingStrategy = null; this.chooseSpot(this.strategyName); }
      // look around for danger a few times a second
      this.thinkT -= dt;
      if (this.thinkT <= 0) {
        this.thinkT = 0.25;
        const flee = rand() < 0.2 + this.smart ? this.danger() : null;
        if (flee) {
          const t = c.pos.clone().addScaledVector(flee.normalize(), 12);
          t.x = clamp(t.x, -150, 150); t.z = clamp(t.z, -150, 150);
          this.setPath([t], null);
          this.dodgeUntil = g.time + 1.2;
        } else if (this.dodgeUntil && g.time > this.dodgeUntil) {
          this.dodgeUntil = 0;
          if (this.strategyName) this.chooseSpot(this.strategyName);
        }
        // rising water: find somewhere higher
        if (g.waterLevel > c.pos.y - 2 && g.waterLevel > -2 && (!this.target || this.target.pos.y < g.waterLevel + 3)) this.chooseSpot('high');
        // virus/crowd: keep re-checking
        if (this.strategyName === 'avoid-crowd' && !this.dodgeUntil && rand() < 0.1) this.chooseSpot('avoid-crowd');
      }
      const st = this.follow(dt);
      if (st === 'stuck') this.chooseSpot(this.strategyName || 'open');
      if (this.strategyName === 'open' && c.grounded && rand() < dt * 2.5) c.jump = true;   // earthquake hops
      return;
    }
    // survivors screen etc.
    this.follow(dt);
  }

  explore() {
    const s = pick(this.g.map?.spots || []);
    if (s && rand() < 0.7) this.setPath(this.route([...s.path, s.pos]));
    this.wait = 2 + rand() * 4;
  }
}

// ---------------- bot chatter (shows in the chat window and as bubbles) ----------------
const LINES = {
  idle: ['what disaster next', 'anyone wanna team?', 'pls no tsunami', 'i love this game', 'hi guys', 'someone buy multi disaster lol', 'lag', 'brb', 'how do u get the balloon', 'flood is so easy', 'i hate fire', 'gg last round'],
  teleport: ['this map again', 'where do i go', 'i love this map', 'lets go', 'ez', 'i call the roof', 'hide spot is mine'],
  high: ['GET HIGH', 'go to the roof!!', 'climb climb climb', 'up up up'],
  'high-ish': ['GET HIGH', 'not the tallest one!', 'roof!!'],
  indoor: ['GO INSIDE', 'hide inside!!', 'get under something'],
  'indoor-low': ['GO INSIDE', 'bottom floor!!', 'stay under the roof'],
  open: ['GET OUT OF THE BUILDING', 'outside!!', 'jump jump jump'],
  'away-tornado': ['RUN', 'its coming this way', 'nooo the tornado'],
  'away-volcano': ['RUN FROM THE VOLCANO', 'lava!!'],
  'away-mountain': ['AVALANCHE RUN', 'snowballs!!'],
  'away-fire': ['FIRE', 'dont touch the fire', 'get away from the building'],
  upwind: ['sandstorm noo', 'hide behind something'],
  'avoid-crowd': ['dont come near me', 'stay away from me lol', 'who has the virus'],
  died: ['oof', 'noooo', 'bruh', 'lag', 'that was unfair', 'rip', 'NOOOO', 'i was so close'],
  survived: ['gg', 'ez', 'yay', 'i survived!!', 'gg everyone', 'lets goooo', 'ez clap'],
};

export function botChat(game, event, who = null) {
  const bots = game.bots;
  if (!bots.length) return;
  const lines = LINES[event];
  if (!lines) return;
  const queue = (c, delay) => game.chatQueue.push({ at: game.time + delay, char: c, text: pick(lines) });
  if (who) { if (rand() < 0.45) queue(who, 0.8 + rand() * 1.5); return; }
  const pool = event === 'survived' ? bots.filter(c => c.alive && c.inRound) : bots.filter(c => c.alive);
  const n = event === 'idle' ? 1 : Math.min(pool.length, 1 + Math.floor(rand() * 2.5));
  for (let i = 0; i < n; i++) if (pool.length) queue(pick(pool), 0.6 + rand() * 3);
}

// Bots answer people in chat now and then (greetings, gg, lol, questions).
const REPLIES = [
  [/\b(hi+|hey+|hello+|yo|sup|hai)\b/i, ['hi', 'hey', 'hello', 'yo', 'hii', 'sup'], 2],
  [/\b(gg|good game|ggs)\b/i, ['gg', 'gg!', 'ggs', 'gg wp'], 2],
  [/\b(lol|lmao|haha+|xd)\b/i, ['lol', 'lmao', 'xD', 'haha'], 1],
  [/\b(what|which|next) (map|disaster)\b/i, ['idk', 'hopefully not tsunami', 'i hope its flood', 'fire probably lol'], 1],
  [/\b(team|teams|follow me)\b/i, ['ok', 'sure', 'no thanks', 'ok wait for me'], 1],
  [/\bnoob\b/i, ['no u', 'hey!', 'ur the noob lol'], 1],
  [/\b(bye|gtg|cya)\b/i, ['bye', 'cya', 'bye!'], 1],
  [/\b(how|help)\b/i, ['read the warning', 'get high when its a flood', 'go inside for meteors'], 1],
  [/\?\s*$/, ['idk', 'yes', 'no', 'maybe', 'idk lol'], 1],
];

export function botReply(game, from, text) {
  const bots = game.bots.filter(b => b.alive && b !== from);
  if (!bots.length) return;
  // mentioning a bot by name gets its attention
  const named = bots.find(b => text.toLowerCase().includes(b.name.toLowerCase().slice(0, 6)));
  for (const [re, lines, max] of REPLIES) {
    if (!re.test(text)) continue;
    const n = named ? 1 : Math.min(bots.length, rand() < 0.55 ? 1 + Math.floor(rand() * max) : 0);
    for (let i = 0; i < n; i++) {
      const c = named || pick(bots);
      game.chatQueue.push({ at: game.time + 1.2 + rand() * 2.5 + i * 1.3, char: c, text: pick(lines) });
    }
    return;
  }
  if (named && rand() < 0.7) game.chatQueue.push({ at: game.time + 1.5 + rand() * 2, char: named, text: pick(['what', 'yes?', 'hi', 'huh']) });
}
