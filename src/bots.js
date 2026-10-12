// Simulated server players. They wander the lobby, explore the map,
// then guess the right kind of spot once the warning pops up.
import * as THREE from 'three';
import { BC, pick, rand, clamp } from './util.js';
import { NOOB_COLORS } from './avatar.js';
import { TOWER } from './island.js';

export const BOT_NAMES = [
  'Guest 1337', 'xXNoobSlayerXx', 'builderkid2008', 'CoolDude_42', 'Guest 8821', 'PizzaLover9000', 'blox_master', 'SurvivorPro',
  'tornado_chaser', 'Guest 4096', 'oofmaster', 'LavaWalker', 'iSurviveEverything', 'brickbuilder77', 'StormRunner', 'CaptainNoob',
  'GamerGirl_2012', 'TsunamiSurfer', 'kitty_cat_33', 'MeteorDodger', 'Guest 6060', 'cheesyfries', 'xX_Disaster_Xx', 'NotABot_Trust',
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

export class BotBrain {
  constructor(game, char) {
    this.g = game;
    this.c = char;
    this.path = [];
    this.idx = 0;
    this.smart = 0.35 + rand() * 0.6;
    this.wait = 0;
    this.lastPos = new THREE.Vector3();
    this.stuckT = 0;
    this.replanT = 0;
    this.mode = 'lobby';
  }

  setPath(points) { this.path = points.map(p => p.clone()); this.idx = 0; this.stuckT = 0; }

  lobbyWander() {
    const { x, z, top } = TOWER;
    this.setPath([V(x + (rand() - .5) * 36, top + 2, z + (rand() - .5) * 30)]);
    this.wait = 1 + rand() * 4;
  }

  chooseSpot(strategy) {
    const map = this.g.map;
    if (!map) return;
    const spots = map.spots;
    const byType = (t) => spots.filter(s => s.type === t);
    let choice = null;
    const smartPick = rand() < this.smart;
    const hz = this.g.hazardPos;
    const far = (list, from) => list.sort((a, b) => b.pos.distanceTo(from) - a.pos.distanceTo(from))[Math.floor(rand() * Math.min(3, list.length))];
    const open = byType('open');
    if (!smartPick) choice = pick(spots);
    else switch (strategy) {
      case 'high': case 'high-ish': {
        const hi = byType('high');
        if (hi.length) choice = pick(hi);
        else { const ind = byType('indoor').sort((a, b) => b.pos.y - a.pos.y); choice = ind[Math.floor(rand() * Math.min(2, ind.length))]; }
        break;
      }
      case 'indoor': choice = pick(byType('indoor')); break;
      case 'indoor-low': { const ind = byType('indoor'); const minY = Math.min(...ind.map(s => s.pos.y)); choice = pick(ind.filter(s => s.pos.y <= minY + 1)); break; }
      case 'away-volcano': case 'away-mountain': case 'away-fire': case 'away-tornado':
        choice = hz ? far([...open], hz) : pick(open); break;
      case 'upwind': {
        const w = this.g.windDir;
        choice = w ? open.sort((a, b) => (a.pos.x * w.x + a.pos.z * w.z) - (b.pos.x * w.x + b.pos.z * w.z))[Math.floor(rand() * 3)] : pick(open);
        break;
      }
      case 'avoid-crowd': case 'open': default:
        choice = pick(open); break;
    }
    choice ||= pick(spots);
    if (!choice) return;
    const jitter = V((rand() - .5) * 3, 0, (rand() - .5) * 3);
    const end = choice.pos.clone().add(jitter);
    // if we are already inside the right building, skip the door waypoints
    this.setPath(choice.path.length ? [...choice.path, end] : [end]);
    this.target = choice;
  }

  update(dt) {
    const c = this.c, g = this.g;
    c.move.set(0, 0, 0);
    c.jump = false;
    if (!c.alive) return;
    if (c.seat) { if (rand() < dt * 0.1) c.jump = true; return; }
    const phase = g.round.phase;
    const inLobby = g.island.inTower(c.pos);

    // decide what to do
    if (inLobby && (!c.inRound || phase === 'intermission' || phase === 'announce')) {
      if (this.mode !== 'lobby') { this.mode = 'lobby'; this.lobbyWander(); }
      if (this.idx >= this.path.length) { this.wait -= dt; if (this.wait <= 0) this.lobbyWander(); return; }
    } else if (c.inRound) {
      if (phase === 'roam' && this.mode !== 'roam') {
        this.mode = 'roam';
        const s = pick(this.g.map?.spots || []);
        if (s) this.setPath([...s.path, s.pos]);
        this.wait = 0;
      } else if (phase === 'disaster' && this.mode !== 'disaster') {
        this.mode = 'disaster';
        const reactDelay = 0.4 + rand() * 1.6;
        this.pendingStrategy = g.round.active[0]?.def.bot || 'open';
        this.reactAt = g.time + reactDelay;
      }
      if (this.pendingStrategy && g.time >= this.reactAt) { this.chooseSpot(this.pendingStrategy); this.strategy = this.pendingStrategy; this.pendingStrategy = null; }
      if (phase === 'disaster') {
        this.replanT -= dt;
        const hz = g.hazardPos;
        if (this.replanT <= 0 && (this.strategy === 'away-tornado' || this.strategy === 'avoid-crowd')) {
          this.replanT = 2.5;
          let danger = false;
          if (this.strategy === 'away-tornado' && hz && Math.hypot(hz.x - c.pos.x, hz.z - c.pos.z) < 45) danger = true;
          if (this.strategy === 'avoid-crowd') danger = g.chars.some(o => o !== c && o.alive && o.pos.distanceTo(c.pos) < 10);
          if (danger) {
            const away = hz && this.strategy === 'away-tornado' ? V(c.pos.x - hz.x, 0, c.pos.z - hz.z).normalize() : V(rand() - .5, 0, rand() - .5).normalize();
            const t = c.pos.clone().addScaledVector(away, 40);
            t.x = clamp(t.x, -140, 140); t.z = clamp(t.z, -140, 140); t.y = 0;
            this.setPath([t]);
          }
        }
        if (this.strategy === 'open' && c.grounded && rand() < dt * 2.5) c.jump = true;   // earthquake hop
      }
      if (this.idx >= this.path.length && phase === 'roam') { this.wait -= dt; if (this.wait <= 0) { this.wait = 3 + rand() * 4; const s = pick(g.map?.spots || []); if (s && rand() < 0.4) this.setPath([...s.path, s.pos]); } }
    } else {
      // spectator walking about the island: return toward the tower sometimes
      if (this.mode !== 'spectate') { this.mode = 'spectate'; this.setPath([g.island.rampBottom || V(0, 0, -150)]); }
    }

    // follow the path
    if (this.idx >= this.path.length) return;
    const wp = this.path[this.idx];
    const dx = wp.x - c.pos.x, dz = wp.z - c.pos.z, dy = wp.y - c.pos.y;
    const hd = Math.hypot(dx, dz);
    if (hd < 2.3 && Math.abs(dy) < 3.5) { this.idx++; this.stuckT = 0; return; }
    if (hd > 0.01) c.move.set(dx / hd, 0, dz / hd);
    if (hd < 2.3 && dy > 0) c.move.set(dx / (hd || 1) * 0.6, 0, dz / (hd || 1) * 0.6); // keep pushing into a truss
    // hop obstacles
    if (c.grounded && hd > 1) {
      const fwd = V(c.move.x, 0, c.move.z);
      const low = g.world.raycast(V(c.pos.x, c.pos.y + 0.8, c.pos.z), fwd, 2.4);
      const high = g.world.raycast(V(c.pos.x, c.pos.y + 4.5, c.pos.z), fwd, 2.4);
      if (low && !high && !low.object?.tags?.has('truss')) c.jump = true;
    }
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      const moved = c.pos.distanceTo(this.lastPos);
      this.lastPos.copy(c.pos);
      if (moved < 1.5 && !c.state.startsWith('climb')) {
        this.stuckCount = (this.stuckCount || 0) + 1;
        c.jump = true;
        if (this.stuckCount > 3) { this.idx++; this.stuckCount = 0; }
      } else this.stuckCount = 0;
      this.stuckT = 0;
    }
  }
}
