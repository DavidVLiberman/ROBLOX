// Multiplayer. Everyone who opens the game joins the same server (a Trystero room):
// signalling goes through public Nostr relays, game traffic is peer-to-peer WebRTC,
// so the site still works from any static host with no game server.
//
// Like a Roblox server, one machine is in charge: the host (whoever has been in
// the server longest). It runs the round, makes every random disaster decision,
// simulates the bots and owns every map brick's physics. Each player simulates
// their own character (Roblox gives clients network ownership of their
// character) and reports it 15 times a second; everyone else sees a smoothed copy.
import { Character, STATES, TOOL_IDS, EMOTES } from './character.js';
import { NOOB_COLORS } from './avatar.js';
import { MAPS } from './maps.js';

const APP_ID = 'nds-web-remake';
export const PROTOCOL = 1;
const STATE_DT = 1 / 15, WORLD_DT = 1 / 10, ROUND_DT = 1;
const DISCOVERY_MS = 7000;   // how long to look for an existing server before starting one
const r2 = (v) => Math.round(v * 100) / 100;
const POS_Q = 20, ROT_Q = 32767;

export class Net {
  constructor(game, { room = 'main', relays = null, turn = null } = {}) {
    this.g = game;
    this.roomName = room;
    this.relays = relays;
    this.turn = turn;
    this.peers = new Map();       // peerId -> { id, hi, since, name, playing, ... }
    this.ents = new Map();        // eid -> remote Character (players and the host's bots)
    this.selfId = 'local';
    this.hostId = null;           // null while still looking for a server
    this.since = Date.now();
    this.stateT = 0; this.worldT = 0; this.roundT = 0;
    this.wev = [];
    this.refreshAt = 0;
    this.online = false;
  }

  get isHost() { return this.hostId === this.selfId; }
  get decided() { return this.hostId !== null; }
  // real people in the server (including us)
  humans() { return 1 + [...this.peers.values()].filter(p => p.hi && p.playing).length; }

  async start() {
    const { joinRoom, selfId } = await import('trystero');
    this.selfId = selfId;
    this.t0 = performance.now();
    const cfg = { appId: APP_ID, relayConfig: { warnOnRelayFailure: false, redundancy: 6 } };
    if (this.relays) cfg.relayConfig.urls = this.relays;
    if (this.turn) cfg.turnConfig = this.turn;
    this.room = joinRoom(cfg, `${this.roomName}-p${PROTOCOL}`, { onJoinError: (e) => console.warn('[net]', e.error) });
    this.jA = this.room.makeAction('j');
    this.bA = this.room.makeAction('b');
    this.jA.onMessage = (d, { peerId }) => { try { this.onJson(d, peerId); } catch (e) { console.error('[net] message', d?.t, e); } };
    this.bA.onMessage = (d, { peerId }) => { try { this.onBinary(d, peerId); } catch (e) { console.error('[net] binary', e); } };
    this.room.onPeerJoin = (id) => { if (!this.peers.has(id)) this.peers.set(id, { id, hi: false }); this.sendHi(id); };
    this.room.onPeerLeave = (id) => this.peerLeft(id);
    this.online = true;
    addEventListener('pagehide', () => { try { this.room.leave(); } catch { /* closing */ } });
    // nobody answered: this machine starts its own server
    setTimeout(() => { if (!this.decided) this.setHost(this.selfId); }, DISCOVERY_MS);
  }

  // ---------------------------------------------------------------- sending
  send(msg, target) {
    if (!this.online) return;
    this.jA.send(msg, target ? { target } : undefined).catch(() => {});
  }
  sendBin(buf, target) {
    if (!this.online) return;
    this.bA.send(buf, target ? { target } : undefined).catch(() => {});
  }
  // the player's own entity id on the network
  get myEid() { return this.selfId; }
  eidOf(c) { return c.isPlayer ? this.selfId : c.eid; }
  charByEid(eid) {
    if (eid === this.selfId) return this.g.player;
    return this.ents.get(eid) || this.g.bots.find(b => b.eid === eid) || null;
  }

  sendHi(target) {
    const g = this.g, p = g.player;
    this.send({
      t: 'hi', since: this.since, host: this.hostId, name: p.name, colors: p.avatar.colors,
      surv: p.survivals, playing: !!g.started, proto: PROTOCOL,
    }, target);
  }

  // ---------------------------------------------------------------- host election
  // Joining players adopt the host the server already has. Two hosts that meet
  // (people who opened the game at the same moment) settle it by who joined first.
  setHost(id) {
    const prev = this.hostId;
    if (prev === id) return;
    this.hostId = id;
    this.sendHi();
    const wasHost = prev === this.selfId, isHost = id === this.selfId;
    if (isHost && !wasHost) this.g.becomeHost(prev !== null);
    else if (!isHost && (wasHost || prev === null)) this.g.becomeClient(wasHost);
    if (!isHost) this.send({ t: 'req', k: 'sync' }, id);
  }

  rank(id) {
    const since = id === this.selfId ? this.since : this.peers.get(id)?.since;
    return since ?? Infinity;
  }
  older(a, b) { const ra = this.rank(a), rb = this.rank(b); return ra < rb || (ra === rb && a < b); }

  peerLeft(id) {
    const p = this.peers.get(id);
    this.peers.delete(id);
    const c = this.ents.get(id);
    if (c && p?.playing) this.g.ui.system(`${c.name} left the game.`);
    if (c) this.removeEnt(id);
    if (id === this.hostId) {
      // the host left: its bots go with it, and the most senior player takes over
      for (const eid of [...this.ents.keys()]) if (this.ents.get(eid).isBot) this.removeEnt(eid);
      let best = this.selfId;
      for (const q of this.peers.values()) if (q.hi && this.older(q.id, best)) best = q.id;
      this.setHost(best);
    }
  }

  // ---------------------------------------------------------------- entities
  ensureEnt(eid, info) {
    let c = this.ents.get(eid);
    if (!c) {
      c = new Character(this.g, { name: info.name || 'Player', colors: info.colors || NOOB_COLORS, userId: 1000 + this.ents.size });
      c.remote = true; c.eid = eid; c.isBot = !!info.bot;
      this.ents.set(eid, c);
      this.g.chars.push(c);
    } else if (info.name && info.name !== c.name) {
      c.name = info.name; c.avatar.setNameTag(info.name);
    }
    if (info.surv != null) c.survivals = info.surv;
    return c;
  }

  removeEnt(eid) {
    const c = this.ents.get(eid);
    if (!c) return;
    this.ents.delete(eid);
    this.g.removeChar(c);
  }

  // ---------------------------------------------------------------- receiving
  onJson(d, from) {
    const g = this.g;
    switch (d.t) {
      case 'hi': {
        if (d.proto !== PROTOCOL) return;
        const p = this.peers.get(from) || { id: from };
        const wasPlaying = p.playing;
        Object.assign(p, { hi: true, since: d.since, name: d.name, colors: d.colors, playing: d.playing, host: d.host });
        this.peers.set(from, p);
        if (d.playing) {
          const c = this.ensureEnt(from, { name: d.name, colors: d.colors, surv: d.surv });
          if (!wasPlaying && g.started) g.ui.system(`${c.name} joined the game.`);
        }
        // host bookkeeping
        if (!this.decided) { if (d.host) this.setHost(d.host); }
        else if (d.host && d.host !== this.hostId) {
          // two servers met: the senior host wins everywhere
          if (this.older(d.host, this.hostId)) this.setHost(d.host);
          else this.sendHi(from);
        }
        if (this.isHost && !p.synced) { p.synced = true; this.syncPeer(from); }
        break;
      }
      case 'cs': this.applyStates(d.s); break;
      case 'ents': {
        for (const b of d.add || []) this.ensureEnt(b[0], { name: b[1], colors: b[2], surv: b[3], bot: true });
        for (const eid of d.gone || []) this.removeEnt(eid);
        break;
      }
      case 'die': { const c = this.ents.get(d.eid); if (c) c.netDie(d.cause); break; }
      case 'chat': { const c = this.charByEid(d.eid); if (c) g.ui.receiveChat(c, d.text, d.w); break; }
      case 'typing': { const c = this.ents.get(d.eid); if (c) { c.typing = d.on; g.ui.typing(c, d.on); } break; }
      case 'sys': g.ui.system(d.text); break;
      case 'rs': if (from === this.hostId && !this.isHost) g.round.applyNet(d); break;
      case 'tp': if (from === this.hostId) {
        const s = d.list[this.selfId];
        if (s && g.player.alive) { g.player.teleport({ x: s[0], y: s[1], z: s[2] }); g.player.inRound = true; g.player.minHealthThisRound = g.player.health; }
        break;
      }
      case 'surv': if (from === this.hostId) g.round.applySurvivors(d.list); break;
      case 'dz': g.round.applyDisasterEvent(d.i, d.ev, d.r); break;
      case 'dzs': if (from === this.hostId) g.round.applyDisasterState(d.i, d.s); break;
      case 'we': if (from === this.hostId) this.applyWorldEvents(d.e); break;
      case 'wsync': if (from === this.hostId) this.applyWorldSync(d); break;
      case 'veh': g.applyVehicle(d, from); break;
      case 'mapact': if (from === this.hostId) g.runMapAction(d.i, false); break;
      case 'req': if (this.isHost) this.handleRequest(d, from); break;
    }
  }

  // requests from players to the host
  handleRequest(d, from) {
    const g = this.g, who = this.ents.get(from);
    switch (d.k) {
      case 'sync': this.syncPeer(from); break;
      case 'multi':
        if (g.round.addMulti()) this.broadcastSystem(`${who?.name || 'Someone'} powered up the Power Up Machine! (${g.round.powerText()})`);
        break;
      case 'vote': if (who) g.round.vote(d.m, who); break;
      case 'hammer': {
        const p = g.world.byNid.get(d.nid);
        if (p && p.alive && !p.tags.has('indestructible')) { g.world.unanchor(p, { x: d.v[0], y: d.v[1], z: d.v[2] }); g.audio.crash(p.position); }
        break;
      }
      case 'act': g.runMapAction(d.i, true); break;
    }
  }

  broadcastSystem(text) { this.g.ui.system(text); this.send({ t: 'sys', text }); }

  // ---------------------------------------------------------------- character states
  packChar(c) {
    const fl = (c.alive ? 1 : 0) | (c.inRound ? 2 : 0) | (c.infected ? 4 : 0) | (c.cold ? 8 : 0) | (c.typing ? 16 : 0);
    return [this.eidOf(c), r2(c.pos.x), r2(c.pos.y), r2(c.pos.z), r2(c.yaw), STATES.indexOf(c.state), r2(c.hSpeed || 0),
      Math.round(c.health * 10) / 10, fl, TOOL_IDS.indexOf(c.equipped), EMOTES.indexOf(c.emote || null), c.seat?.nid ?? -1, c.swings || 0, c.coldLevel || 0];
  }

  applyStates(list) {
    const now = performance.now();
    for (const s of list) {
      const c = this.ents.get(s[0]);
      if (c) c.netState(now, s);
    }
  }

  // ---------------------------------------------------------------- world replication (host -> players)
  onMutate(op, part, arg) {
    if (!this.isHost || !this.g.map) return;
    this.wev.push(arg === undefined ? [op, part.nid] : [op, part.nid, arg]);
  }
  onFlame(part, level) {
    if (this.isHost && this.g.map && !this.g.world.replica) this.wev.push(['f', part.nid, level]);
  }

  applyWorldEvents(list) {
    const w = this.g.world;
    for (const [op, nid, arg] of list) {
      const p = w.byNid.get(nid);
      if (!p || !p.alive) continue;
      if (op === 'u') w.makeReplica(p, true);
      else if (op === 'r') w.removePart(p, true);
      else if (op === 'c') w.setColor(p, arg, true);
      else if (op === 'f') this.g.effects.setFlame(p, arg);
      else if (op === 't') { p.tags.add(arg); (p.netTags ||= new Set()).add(arg); }
    }
  }

  // everything a player who just arrived needs to see the map as it is now
  syncPeer(id) {
    const g = this.g;
    this.send(g.round.snapshot(), id);
    const bots = g.bots.map(b => [b.eid, b.name, b.avatar.colors, b.survivals]);
    if (bots.length) this.send({ t: 'ents', add: bots }, id);
    if (!g.map) return;
    const removed = [], colors = [], dyn = [], flames = [], tags = [];
    g.map.parts.forEach((p, nid) => {
      if (!p.alive) { removed.push(nid); return; }
      if (!p.color.equals(p.baseColor)) colors.push([nid, p.color.getHex()]);
      if (!p.anchored || p._moved) {
        const t = p.body.translation(), r = p.body.rotation();
        dyn.push([nid, r2(t.x), r2(t.y), r2(t.z), r.x, r.y, r.z, r.w, p.anchored ? 1 : 0]);
      }
      const fl = g.effects.flameLevel(p);
      if (fl) flames.push([nid, fl]);
      if (p.netTags) for (const tg of p.netTags) tags.push([nid, tg]);
    });
    this.send({ t: 'wsync', map: g.map.name, removed, colors, dyn, flames, tags }, id);
  }

  applyWorldSync(d) {
    const g = this.g, w = g.world;
    if (!g.map || g.map.name !== d.map) return;
    const now = performance.now();
    for (const nid of d.removed) { const p = w.byNid.get(nid); if (p) w.removePart(p, true); }
    for (const [nid, hex] of d.colors) { const p = w.byNid.get(nid); if (p) w.setColor(p, hex, true); }
    for (const [nid, x, y, z, qx, qy, qz, qw, anch] of d.dyn) {
      const p = w.byNid.get(nid);
      if (!p || !p.alive) continue;
      w.makeReplica(p, !anch);
      w.addSample(p, now - 500, x, y, z, qx, qy, qz, qw);
      w.addSample(p, now, x, y, z, qx, qy, qz, qw);
    }
    for (const [nid, fl] of d.flames) { const p = w.byNid.get(nid); if (p) g.effects.setFlame(p, fl); }
    for (const [nid, tg] of d.tags || []) { const p = w.byNid.get(nid); if (p) { p.tags.add(tg); (p.netTags ||= new Set()).add(tg); } }
  }

  sendWorld() {
    const g = this.g, w = g.world;
    if (this.wev.length) { this.send({ t: 'we', e: this.wev }); this.wev = []; }
    if (!g.map || !this.peers.size) return;
    const now = performance.now();
    const full = now > this.refreshAt;
    if (full) this.refreshAt = now + 3000;
    const out = [];
    const consider = (p) => {
      if (p.nid == null || !p.alive || p.vehicle) return;
      const t = p.body.translation(), r = p.body.rotation();
      const ls = p._ns;
      if (!full && ls && Math.abs(ls[0] - t.x) < 0.03 && Math.abs(ls[1] - t.y) < 0.03 && Math.abs(ls[2] - t.z) < 0.03
        && Math.abs(ls[3] - r.x) < 0.003 && Math.abs(ls[4] - r.y) < 0.003 && Math.abs(ls[5] - r.z) < 0.003) return;
      p._ns = [t.x, t.y, t.z, r.x, r.y, r.z];
      out.push(p.nid, Math.round(t.x * POS_Q), Math.round(t.y * POS_Q), Math.round(t.z * POS_Q),
        Math.round(r.x * ROT_Q), Math.round(r.y * ROT_Q), Math.round(r.z * ROT_Q), Math.round(r.w * ROT_Q));
    };
    for (const p of w.dynamic) consider(p);
    for (const p of g.map.parts) if (p.anchored && p._moved) consider(p);
    // keep packets small enough for one data-channel message
    for (let i = 0; i < out.length; i += 8 * 400) {
      const chunk = out.slice(i, i + 8 * 400);
      const arr = new Int16Array(chunk.length);
      for (let k = 0; k < chunk.length; k++) arr[k] = Math.max(-32768, Math.min(32767, chunk[k]));
      this.sendBin(arr.buffer);
    }
  }

  onBinary(d, from) {
    if (from !== this.hostId || this.isHost) return;
    const w = this.g.world;
    const arr = new Int16Array(d instanceof ArrayBuffer ? d : d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    const now = performance.now();
    for (let i = 0; i + 7 < arr.length; i += 8) {
      const p = w.byNid.get(arr[i]);
      if (!p || !p.alive || p.vehicle) continue;
      w.addSample(p, now, arr[i + 1] / POS_Q, arr[i + 2] / POS_Q, arr[i + 3] / POS_Q,
        arr[i + 4] / ROT_Q, arr[i + 5] / ROT_Q, arr[i + 6] / ROT_Q, arr[i + 7] / ROT_Q);
    }
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    if (!this.online) return;
    const g = this.g;
    this.stateT += dt;
    if (this.stateT >= STATE_DT) {
      this.stateT = 0;
      const list = [];
      if (g.started && g.player) list.push(this.packChar(g.player));
      if (this.isHost) for (const b of g.bots) list.push(this.packChar(b));
      if (list.length && this.peers.size) this.send({ t: 'cs', s: list });
    }
    if (this.isHost) {
      this.worldT += dt;
      if (this.worldT >= WORLD_DT) { this.worldT = 0; this.sendWorld(); g.round.sendDisasterStates?.(); }
      this.roundT += dt;
      if (this.roundT >= ROUND_DT) { this.roundT = 0; if (this.peers.size) this.send(g.round.snapshot()); }
    }
  }
}

export function mapByName(name) { return MAPS.find(m => m.name === name); }
