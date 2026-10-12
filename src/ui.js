// HUD. Two layers, like a real Roblox experience:
//  * Roblox CoreGui look-alikes: top bar, chat + bubble chat, player list,
//    backpack (hotbar + inventory), ProximityPrompts, notifications,
//    purchase prompt and the Esc menu (People / Settings / Report / Help).
//  * The experience's own GUI: status, disaster warning, health bar,
//    survivors list, map vote and the item buttons on the left.
import * as THREE from 'three';
import { BADGES } from './data.js';
import { makeToolModel } from './avatar.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tools as they appear in the backpack (no TextureId, so Roblox shows the tool name).
export const TOOLS = { balloon: 'Green Balloon', apple: 'Red Apple', hammer: 'Blue Hammer' };
const TOOL_ORDER = ['balloon', 'apple', 'hammer'];

// Roblox legacy chat name colours + the name -> colour hash Roblox uses.
const NAME_COLORS = ['#FD2943', '#01A2FF', '#02B857', '#6B327C', '#DA8541', '#F5CD30', '#E8BAC8', '#D7C59A'];
export function nameColor(name) {
  let v = 0;
  for (let i = 1; i <= name.length; i++) {
    let c = name.charCodeAt(i - 1);
    let rev = name.length - i + 1;
    if (name.length % 2 === 1) rev -= 1;
    if (rev % 4 >= 2) c = -c;
    v += c;
  }
  return NAME_COLORS[((v % NAME_COLORS.length) + NAME_COLORS.length) % NAME_COLORS.length];
}

const SHOP = {
  balloon: { name: 'Green Balloon', type: 'Game Pass', price: 80 },
  apple: { name: 'Red Apple', type: 'Game Pass', price: 80 },
  compass: { name: 'Yellow Compass', type: 'Game Pass', price: 60 },
  hammer: { name: 'Blue Hammer', type: 'Item', price: 0 },
  multi: { name: 'Multi-Disaster', type: 'Developer Product', price: 75 },
};

const _v = new THREE.Vector3();

export class UI {
  constructor(game) {
    this.g = game;
    this.el = {
      statusText: $('status-text'), statusTime: $('status-time'), warnings: $('warnings'), messages: $('messages'),
      health: $('health-fill'), healthText: $('health-text'), healthWrap: $('health'),
      survivors: $('survivors'), survivorList: $('survivor-list'), vote: $('vote'),
      hurt: $('hurt'), cold: $('cold'), sick: $('sick'),
      hotbar: $('hotbar'), backpack: $('backpack'), invGrid: $('inv-grid'), invSearch: $('inv-search'),
      plRows: $('pl-rows'), playerlist: $('playerlist'),
      chat: $('chat'), chatLog: $('chat-log'), chatInput: $('chat-input'),
      prompts: $('prompts'), bubbles: $('bubbles'), notifs: $('notifications'),
      hub: $('hub'), purchase: $('purchase'), mouselock: $('mouselock'), perf: $('perfstats'),
    };
    this.settings = Object.assign({
      shiftLockSwitch: true, cameraMode: 'Classic', sensitivity: 4, inverted: false, volume: 8,
      fullscreen: false, graphicsMode: 'Automatic', quality: 8, perfStats: false,
    }, game.data.d.settings.rbx || {});
    this.lbTimer = 0;
    this.bubbleMap = new Map();
    this.headshots = new Map();
    this.chatActiveAt = 0;
    this.bindTopbar();
    this.bindChat();
    this.bindBackpack();
    this.bindHub();
    this.bindShop();
    this.applySettings();
  }

  // ============================== game GUI ==============================
  status(text, time = null) {
    if (this._st !== text) { this.el.statusText.textContent = text; this._st = text; }
    const t = time === null ? '' : String(Math.max(0, time));
    if (this._tt !== t) { this.el.statusTime.textContent = t; this.el.statusTime.style.display = t ? '' : 'none'; this._tt = t; }
  }

  warning(def, index) {
    const d = document.createElement('div');
    d.className = 'warning';
    d.style.animationDelay = `${index * 0.25}s`;
    const cut = def.warning.indexOf('!');
    d.innerHTML = '<div class="w-title"></div><div class="w-tip"></div>';
    d.querySelector('.w-title').textContent = def.warning.slice(0, cut + 1);
    d.querySelector('.w-tip').textContent = def.warning.slice(cut + 1).trim();
    this.el.warnings.appendChild(d);
    setTimeout(() => d.classList.add('out'), 6500 + index * 250);
    setTimeout(() => d.remove(), 7300 + index * 250);
  }

  showSurvivors(names) {
    const l = this.el.survivorList;
    l.innerHTML = '';
    if (!names.length) { const li = document.createElement('li'); li.className = 'none'; li.textContent = 'No survivors'; l.appendChild(li); }
    for (const n of names) { const li = document.createElement('li'); li.textContent = n; l.appendChild(li); }
    this.el.survivors.classList.add('show');
  }
  hideSurvivors() { this.el.survivors.classList.remove('show'); }

  // short game message under the status bar
  toast(text, ms = 3500) {
    const d = document.createElement('div');
    d.className = 'gmsg'; d.textContent = text;
    this.el.messages.appendChild(d);
    while (this.el.messages.children.length > 3) this.el.messages.firstChild.remove();
    setTimeout(() => d.classList.add('out'), ms);
    setTimeout(() => d.remove(), ms + 600);
  }

  hurtFlash() {
    const h = this.el.hurt;
    h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash');
    const w = this.el.healthWrap;
    w.classList.remove('hit'); void w.offsetWidth; w.classList.add('hit');
  }

  showVote(votes) {
    const v = this.el.vote;
    v.innerHTML = '<div class="vote-title">Vote for the next map</div><div class="vote-cards"></div>';
    const cards = v.querySelector('.vote-cards');
    for (const name of votes.options) {
      const b = document.createElement('button');
      b.className = 'vote-card';
      b.dataset.name = name;
      b.innerHTML = '<div class="vc-name"></div><div class="vc-count">0 votes</div>';
      b.querySelector('.vc-name').textContent = name;
      b.onclick = () => { this.g.round.vote(name, this.g.player); this.g.audio.click(); };
      cards.appendChild(b);
    }
    v.classList.add('show');
    this.updateVote(votes);
  }
  updateVote(votes) {
    for (const b of this.el.vote.querySelectorAll('.vote-card')) {
      const n = votes.counts.get(b.dataset.name) || 0;
      b.querySelector('.vc-count').textContent = `${n} vote${n === 1 ? '' : 's'}`;
      b.classList.toggle('mine', votes.mine === b.dataset.name);
    }
  }
  hideVote() { this.el.vote.classList.remove('show'); }

  // ============================== notifications ==============================
  notify(title, text, ms = 5000) {
    const d = document.createElement('div');
    d.className = 'notif';
    d.innerHTML = '<div class="n-title"></div><div class="n-text"></div>';
    d.querySelector('.n-title').textContent = title;
    d.querySelector('.n-text').textContent = text;
    this.el.notifs.appendChild(d);
    setTimeout(() => d.classList.add('out'), ms);
    setTimeout(() => d.remove(), ms + 600);
  }

  badge(id) {
    const b = BADGES[id];
    this.notify('Badge Awarded', `You won the "${b.name}" award!`);
  }

  // ============================== top bar ==============================
  bindTopbar() {
    $('tb-menu').onclick = () => this.toggleHub();
    const setChat = (open) => {
      this.el.chat.classList.toggle('hidden', !open);
      $('tb-chat').classList.toggle('on', open);
      document.body.classList.toggle('chat-open', open);
    };
    $('tb-chat').onclick = () => setChat(this.el.chat.classList.contains('hidden'));
    // like Roblox mobile, chat starts collapsed on touch screens
    setChat(!('ontouchstart' in window));
    $('tb-backpack').onclick = () => this.toggleInventory();
    // mobile: the player list starts collapsed behind a top bar button
    const setList = (open) => { this.el.playerlist.classList.toggle('hidden', !open); $('tb-players').classList.toggle('on', open); };
    $('tb-players').onclick = () => setList(this.el.playerlist.classList.contains('hidden'));
    setList(!('ontouchstart' in window) || innerWidth > 700);
  }

  // ============================== chat ==============================
  bindChat() {
    const inp = this.el.chatInput;
    inp.addEventListener('focus', () => { this.el.chat.classList.add('active'); this.chatActiveAt = performance.now(); });
    inp.addEventListener('blur', () => { this.el.chat.classList.remove('active'); this.chatActiveAt = performance.now(); });
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { this.sendChat(); inp.blur(); }
      if (e.key === 'Escape') inp.blur();
    });
    $('chat-send').onclick = () => this.sendChat();
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '/' && this.g.started && !this.hubOpen()) {
        e.preventDefault();
        if (this.el.chat.classList.contains('hidden')) $('tb-chat').click();
        inp.focus();
      }
    });
    this.el.chat.addEventListener('mouseenter', () => { this.chatActiveAt = performance.now(); });
  }

  sendChat() {
    const inp = this.el.chatInput;
    const t = inp.value.trim().slice(0, 200);
    inp.value = '';
    if (!t || !this.g.player) return;
    this.say(this.g.player, t);
  }

  chatLine(name, text, color) {
    const d = document.createElement('div');
    d.className = 'msg' + (name ? '' : ' sys');
    if (name) {
      const n = document.createElement('span'); n.className = 'nm'; n.style.color = color || nameColor(name); n.textContent = name + ': ';
      d.appendChild(n);
    }
    d.appendChild(document.createTextNode(text));
    const log = this.el.chatLog;
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.appendChild(d);
    while (log.children.length > 80) log.firstChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
    this.chatActiveAt = performance.now();
  }

  system(text) { this.chatLine('', text); }

  say(char, text) {
    this.chatLine(char.name, text);
    let b = this.bubbleMap.get(char);
    if (!b) {
      const el = document.createElement('div'); el.className = 'bstack';
      this.el.bubbles.appendChild(el);
      b = { el, list: [] }; this.bubbleMap.set(char, b);
    }
    const bub = document.createElement('div'); bub.className = 'bubble'; bub.textContent = text;
    b.el.appendChild(bub);
    b.list.push({ el: bub, until: this.g.time + 12 });
    while (b.list.length > 3) b.list.shift().el.remove();
    this.layoutBubble(b);
  }

  layoutBubble(b) {
    b.list.forEach((x, i) => { x.el.classList.toggle('last', i === b.list.length - 1); x.el.classList.toggle('old', i < b.list.length - 1); });
  }

  updateBubbles() {
    const cam = this.g.camera;
    for (const [char, b] of this.bubbleMap) {
      for (let i = b.list.length - 1; i >= 0; i--) if (this.g.time > b.list[i].until || !char.alive) { b.list[i].el.remove(); b.list.splice(i, 1); this.layoutBubble(b); }
      if (!b.list.length) { b.el.style.display = 'none'; continue; }
      _v.set(char.pos.x, char.pos.y + 6.4, char.pos.z);
      const dist = _v.distanceTo(cam.position);
      _v.project(cam);
      if (_v.z > 1 || dist > 110 || (char.isPlayer && this.g.camController.firstPerson)) { b.el.style.display = 'none'; continue; }
      b.el.style.display = '';
      b.el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`;
      b.el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
    }
  }

  // ============================== backpack ==============================
  bindBackpack() {
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '`' || e.key === '~') { e.preventDefault(); this.toggleInventory(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        this.el.playerlist.classList.toggle('hidden');
      }
    });
    this.el.invSearch.addEventListener('input', () => { this._hb = null; });
    this.el.invSearch.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') this.el.invSearch.blur(); });
    $('inv-clear').onclick = () => { this.el.invSearch.value = ''; this._hb = null; };
  }

  toggleInventory(force) {
    const open = force ?? !this.el.backpack.classList.contains('open');
    this.el.backpack.classList.toggle('open', open);
    document.body.classList.toggle('backpack-open', open);
    $('tb-backpack').classList.toggle('on', open);
    this._hb = null;
  }

  tools() {
    const c = this.g.player;
    if (!c.alive) return [];
    return TOOL_ORDER.filter(k => c.items[k] && !(k === 'balloon' && c.balloonPopped));
  }

  slot(k, i, showNum) {
    const g = this.g, c = g.player;
    const b = document.createElement('button');
    if (!k) { b.className = 'slot empty'; if (showNum) b.innerHTML = `<span class="num">${(i + 1) % 10}</span>`; return b; }
    const cd = k === 'apple' && (c.appleCd || 0) > g.time;
    b.className = 'slot' + (c.equipped === k ? ' equipped' : '') + (cd ? ' cooldown' : '');
    b.innerHTML = `${showNum ? `<span class="num">${(i + 1) % 10}</span>` : ''}<span class="tname"></span><span class="tip"></span>`;
    b.querySelector('.tname').textContent = TOOLS[k];
    b.querySelector('.tip').textContent = TOOLS[k];
    b.onclick = (e) => { e.stopPropagation(); g.player.equip(k); g.audio.click(); this._hb = null; };
    return b;
  }

  renderBackpack() {
    const g = this.g, c = g.player;
    const tools = this.tools();
    const open = this.el.backpack.classList.contains('open');
    const q = this.el.invSearch.value.trim().toLowerCase();
    const key = tools.join() + '|' + c.equipped + '|' + ((c.appleCd || 0) > g.time) + '|' + open + '|' + q;
    if (key === this._hb) return;
    this._hb = key;
    const hb = this.el.hotbar;
    hb.innerHTML = '';
    const n = open ? 10 : tools.length;
    for (let i = 0; i < n; i++) hb.appendChild(this.slot(tools[i], i, true));
    const grid = this.el.invGrid;
    grid.innerHTML = '';
    if (open) for (const k of tools) if (!q || TOOLS[k].toLowerCase().includes(q)) grid.appendChild(this.slot(k, 0, false));
    this.slotKeys = tools;
  }

  // ============================== player list ==============================
  playerList() {
    const g = this.g;
    const rows = [g.player, ...[...g.chars].filter(c => !c.isPlayer).sort((a, b) => b.survivals - a.survivals || a.name.localeCompare(b.name))];
    const html = rows.map(c => `<div class="pl-row${c.isPlayer ? ' me' : ''}"><div class="pl-n"><span>${esc(c.name)}</span></div><div class="pl-v">${c.survivals}</div></div>`).join('');
    if (html !== this._pl) { this.el.plRows.innerHTML = html; this._pl = html; }
  }

  // ============================== ProximityPrompt ==============================
  prompt(item) {
    const layer = this.el.prompts;
    if (!item || this.hubOpen()) {
      if (this._pp) { this._pp.remove(); this._pp = null; this._ppItem = null; }
      return;
    }
    if (this._ppItem !== item) {
      if (this._pp) this._pp.remove();
      const d = document.createElement('div');
      d.className = 'pprompt';
      d.innerHTML = `<div class="pp-key"><span>${this.g.input.isTouch ? '' : 'E'}</span></div><div class="pp-txt"><div class="pp-obj"></div><div class="pp-act"></div></div>`;
      d.onclick = () => this.g.interactNearest(true);
      layer.appendChild(d);
      this._pp = d; this._ppItem = item;
    }
    this._pp.querySelector('.pp-obj').textContent = typeof item.object === 'function' ? item.object() : (item.object || '');
    this._pp.querySelector('.pp-act').textContent = typeof item.label === 'function' ? item.label() : item.label;
    _v.copy(item.pos).add(new THREE.Vector3(0, item.height ?? 6, 0)).project(this.g.camera);
    if (_v.z > 1) { this._pp.style.display = 'none'; return; }
    this._pp.style.display = '';
    this._pp.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`;
    this._pp.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
  }

  // ============================== frame update ==============================
  update(dt) {
    const g = this.g, p = g.player;
    const hp = p.alive ? p.health : 0;
    this.el.health.style.width = `${(hp / p.maxHealth) * 100}%`;
    this.el.healthText.textContent = String(Math.ceil(hp));
    this.el.cold.style.opacity = p.cold && p.alive ? 0.7 : 0;
    this.el.sick.style.opacity = p.infected && p.alive ? 0.6 : 0;
    this.renderBackpack();
    this.lbTimer -= dt;
    if (this.lbTimer <= 0) { this.lbTimer = 0.5; this.playerList(); }
    this.updateBubbles();
    this.el.mouselock.classList.toggle('on', g.input.shiftLock || (g.camController.firstPerson && p.alive));
    // chat fades out when idle
    const idle = performance.now() - this.chatActiveAt > 12000 && document.activeElement !== this.el.chatInput;
    this.el.chat.classList.toggle('faded', idle);
    if (this.settings.perfStats) {
      this._pt = (this._pt || 0) - dt;
      if (this._pt <= 0 && g.perf) { this._pt = 0.5; this.el.perf.textContent = `${Math.round(1000 / Math.max(1, g.perf.frame))} FPS · ${g.perf.logic.toFixed(1)} ms`; }
    }
  }

  // anything that should freeze character input
  blocking() {
    const a = document.activeElement;
    return this.hubOpen() || this.el.purchase.classList.contains('show') || (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
  }

  // ============================== Esc menu ==============================
  hubOpen() { return this.el.hub.classList.contains('show'); }

  toggleHub(force, tab = 'settings') {
    const show = force ?? !this.hubOpen();
    this.el.hub.classList.toggle('show', show);
    $('tb-menu').classList.toggle('on', show);
    document.body.classList.toggle('hub-open', show);
    if (show) {
      if (document.pointerLockElement) document.exitPointerLock();
      this.g.input.shiftLock = false;
      this.hubPage(tab);
    }
  }

  hubPage(name) {
    this.page = name;
    for (const t of document.querySelectorAll('.hub-tab')) t.classList.toggle('on', t.dataset.tab === name);
    for (const p of document.querySelectorAll('.hub-page')) p.classList.toggle('on', p.dataset.page === name);
    document.querySelector('.hub-bottom').style.display = name === 'reset' || name === 'leave' ? 'none' : '';
    if (name === 'players') this.renderPlayers();
    if (name === 'settings') this.renderSettings();
    if (name === 'help') this.renderHelp();
    if (name === 'report') $('report-player').textContent = this.g.chars.find(c => !c.isPlayer)?.name || '—';
  }

  bindHub() {
    const g = this.g;
    for (const t of document.querySelectorAll('.hub-tab')) t.onclick = () => this.hubPage(t.dataset.tab);
    $('hub-resume').onclick = () => this.toggleHub(false);
    $('hub-reset').onclick = () => this.hubPage('reset');
    $('hub-leave').onclick = () => this.hubPage('leave');
    $('reset-no').onclick = () => this.hubPage('settings');
    $('leave-no').onclick = () => this.hubPage('settings');
    $('reset-yes').onclick = () => { this.toggleHub(false); if (g.player.alive) g.player.die('reset'); };
    $('leave-yes').onclick = () => location.reload();
    this.el.hub.addEventListener('mousedown', (e) => { if (e.target === this.el.hub) this.toggleHub(false); });
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!g.started) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (this.el.purchase.classList.contains('show')) { this.el.purchase.classList.remove('show'); return; }
        if (this.hubOpen() && (this.page === 'reset' || this.page === 'leave')) { this.hubPage('settings'); return; }
        this.toggleHub();
        return;
      }
      if (!this.hubOpen()) return;
      if (k === 'r') this.page === 'reset' ? $('reset-yes').click() : this.hubPage('reset');
      else if (k === 'l') this.page === 'leave' ? $('leave-yes').click() : this.hubPage('leave');
      else if (k === 'enter' && this.page === 'reset') $('reset-yes').click();
      else if (k === 'enter' && this.page === 'leave') $('leave-yes').click();
    });
  }

  renderPlayers() {
    const g = this.g;
    const list = [g.player, ...g.chars.filter(c => !c.isPlayer)];
    $('hub-players').innerHTML = `<div class="hub-section">${list.length} ${list.length === 1 ? 'person' : 'people'} in this server</div>` +
      list.map((c, i) => `<div class="player-row"><img data-i="${i}" alt=""><div class="pr-names"><span class="pr-dn">${esc(c.name)}</span><span class="pr-un">@${esc(c.name.replace(/\s+/g, '_'))}</span></div><span class="pr-tag">${c.isPlayer ? 'You' : `${c.survivals} survivals`}</span></div>`).join('');
    // headshots are real renders of each avatar
    const imgs = $('hub-players').querySelectorAll('img');
    imgs.forEach((img) => {
      const c = list[+img.dataset.i];
      img.src = this.headshot(c);
    });
  }

  renderHelp() {
    const rows = [
      ['Move', ['W', 'A', 'S', 'D']], ['Jump', ['Space']], ['Rotate Camera', ['Right Mouse', '←', '→']], ['Zoom', ['I', 'O', 'Wheel']],
      ['Shift Lock', ['Shift']], ['Chat', ['/']], ['Backpack', ['`']], ['Equip Tool', ['1', '2', '3']], ['Use Tool', ['Left Click']],
      ['Interact', ['E']], ['Player List', ['Tab']], ['Menu', ['Esc']], ['Reset Character', ['Esc', 'R', 'Enter']],
    ];
    $('hub-help').innerHTML = '<div class="hub-section">Keyboard &amp; Mouse</div><div class="help-grid">' +
      rows.map(([a, ks]) => `<div class="help-item"><span>${a}</span><span class="help-keys">${ks.map(k => `<span class="keycap">${esc(k)}</span>`).join('')}</span></div>`).join('') + '</div>' +
      '<div class="hub-section" style="margin-top:18px">Natural Disaster Survival</div><p class="hub-note">Read the warning as soon as it appears. Flood &amp; Tsunami: get high, but not on the tallest tower. Acid Rain &amp; Meteor Shower: get under a roof on a low floor. Earthquake &amp; Fire: get outside, away from buildings. Blizzard: stand between walls near other players. Tornado: keep moving away from it. Deadly Virus: stay alone. Health is not restored between rounds, so reset in the lobby if you are low.</p>';
  }

  renderSettings() {
    const s = this.settings;
    const rows = [
      ['Shift Lock Switch', 'sel', 'shiftLockSwitch', [true, false], v => v ? 'On' : 'Off'],
      ['Camera Mode', 'sel', 'cameraMode', ['Classic', 'Follow'], v => v === 'Classic' ? 'Default (Classic)' : v],
      ['Movement Mode', 'sel', null, ['Default (Keyboard)'], v => v],
      ['Camera Inverted', 'sel', 'inverted', [false, true], v => v ? 'On' : 'Off'],
      ['Camera Sensitivity', 'slider', 'sensitivity'],
      ['Volume', 'slider', 'volume'],
      ['Fullscreen', 'sel', 'fullscreen', [false, true], v => v ? 'On' : 'Off'],
      ['Graphics Mode', 'sel', 'graphicsMode', ['Automatic', 'Manual'], v => v],
      ['Graphics Quality', 'slider', 'quality'],
      ['Performance Stats', 'sel', 'perfStats', [false, true], v => v ? 'On' : 'Off'],
    ];
    const box = $('hub-settings');
    box.innerHTML = '';
    for (const [label, type, key, opts, fmt] of rows) {
      const row = document.createElement('div'); row.className = 'set-row';
      row.innerHTML = `<span class="set-label">${label}</span>`;
      if (type === 'sel') {
        const sel = document.createElement('div'); sel.className = 'selector';
        const cur = key ? s[key] : opts[0];
        sel.innerHTML = '<button class="sel-arrow">‹</button><span class="sel-val"></span><button class="sel-arrow">›</button>';
        sel.querySelector('.sel-val').textContent = fmt(cur);
        const [l, r] = sel.querySelectorAll('.sel-arrow');
        const step = (d) => {
          if (!key) return;
          const i = opts.indexOf(s[key]);
          s[key] = opts[(i + d + opts.length) % opts.length];
          this.applySettings(key);
          this.renderSettings();
        };
        l.onclick = () => step(-1); r.onclick = () => step(1);
        row.appendChild(sel);
      } else {
        const disabled = key === 'quality' && s.graphicsMode === 'Automatic';
        const sl = document.createElement('div'); sl.className = 'slider';
        sl.style.opacity = disabled ? 0.4 : 1;
        sl.innerHTML = `<button class="pm">−</button><div class="steps">${Array.from({ length: 10 }, (_, i) => `<div class="st${i < s[key] ? ' on' : ''}" data-v="${i + 1}"></div>`).join('')}</div><button class="pm">+</button>`;
        const set = (v) => { if (disabled) return; s[key] = Math.max(1, Math.min(10, v)); this.applySettings(key); this.renderSettings(); };
        const [m, p] = sl.querySelectorAll('.pm');
        m.onclick = () => set(s[key] - 1); p.onclick = () => set(s[key] + 1);
        for (const st of sl.querySelectorAll('.st')) st.onclick = () => set(+st.dataset.v);
        row.appendChild(sl);
      }
      box.appendChild(row);
    }
  }

  applySettings(changed) {
    const g = this.g, s = this.settings;
    g.input.shiftLockEnabled = s.shiftLockSwitch;
    g.camController.sensitivity = 0.25 * s.sensitivity;
    g.camController.inverted = s.inverted;
    g.camController.follow = s.cameraMode === 'Follow';
    if (g.audio) { g.audio.volume = s.volume / 10; g.audio.setMuted(s.volume === 0); }
    const low = s.graphicsMode === 'Manual' && s.quality <= 4;
    if (low !== g.lowGfx && changed) g.setLowGfx(low);
    this.el.perf.classList.toggle('on', s.perfStats);
    if (changed === 'fullscreen') {
      if (s.fullscreen) document.documentElement.requestFullscreen?.().catch(() => { s.fullscreen = false; });
      else if (document.fullscreenElement) document.exitFullscreen?.();
    }
    g.data.d.settings.rbx = { ...s, fullscreen: false };
    g.data.save();
  }

  // ============================== purchase prompt ==============================
  bindShop() {
    for (const btn of document.querySelectorAll('[data-shop]')) {
      btn.onclick = (e) => { e.stopPropagation(); this.openPurchase(btn.dataset.shop); };
    }
  }

  openPurchase(k) {
    const g = this.g, it = SHOP[k], m = this.el.purchase;
    const owned = k === 'multi' ? false : k === 'hammer' ? !!g.player.items.hammer : !!g.player.items[k];
    const img = k === 'multi' ? '' : `<img src="${this.toolThumb(k)}" alt="">`;
    const price = it.price ? `R$${it.price}` : 'Free';
    m.innerHTML = `<div class="pp-card"><div class="pp-top"><button class="pp-x" aria-label="Close">×</button>${owned ? 'Item Owned' : 'Buy Item'}</div>
      <div class="pp-mid"><div class="pp-img">${img}</div><div class="pp-desc">${owned
        ? `You already own <b>${esc(it.name)}</b>.`
        : `Would you like to buy the ${it.type} <b>${esc(it.name)}</b> from <b>Natural Disaster Survival</b> for <b>${price}</b>?`}</div></div>
      <div class="pp-bot"><button class="pp-buy">${owned ? 'OK' : `Buy${it.price ? ' — Free here' : ''}`}</button>
      <div class="pp-bal">${owned ? '' : it.price ? `Normally ${price}. Everything is free in this remake.` : 'Free item.'}</div></div></div>`;
    m.classList.add('show');
    m.querySelector('.pp-x').onclick = () => m.classList.remove('show');
    m.querySelector('.pp-buy').onclick = () => {
      if (owned) { m.classList.remove('show'); return; }
      const ok = this.grant(k);
      if (!ok) { m.classList.remove('show'); return; }
      g.audio.chime();
      m.querySelector('.pp-top').lastChild.textContent = 'Purchase Completed';
      m.querySelector('.pp-desc').innerHTML = `You have successfully bought <b>${esc(it.name)}</b>.`;
      const b = m.querySelector('.pp-buy'); b.textContent = 'OK'; b.onclick = () => m.classList.remove('show');
      m.querySelector('.pp-bal').textContent = '';
    };
  }

  grant(k) {
    const g = this.g;
    if (k === 'multi') {
      if (!g.round.addMulti()) { this.notify('Weather Machine', 'The Weather Machine is already at the maximum of 7 extra disasters.'); return false; }
      this.system(`${g.player.name} added a disaster with the Weather Machine! (${g.round.multi}/7)`);
      return true;
    }
    if (k === 'hammer') {
      const today = new Date().toDateString();
      const ha = g.data.d.hammerAds;
      if (ha.day !== today) { ha.day = today; ha.n = 0; }
      if (ha.n >= 12) { this.notify('Blue Hammer', 'You have reached the limit of 12 hammers today.'); return false; }
      ha.n++; g.data.save();
      g.player.items.hammer = true;
      this._hb = null;
      return true;
    }
    g.player.items[k] = true; g.data.d.items[k] = true; g.data.save();
    this._hb = null;
    return true;
  }

  // ============================== renders (headshots / item thumbnails) ==============================
  snapshot(object, camPos, look, size = 128) {
    const r = this.g.renderer;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(2, 4, 5); scene.add(sun);
    scene.add(object);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.copy(camPos); cam.lookAt(look);
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
    const prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, cam);
    const px = new Uint8Array(size * size * 4);
    r.readRenderTargetPixels(rt, 0, 0, size, size, px);
    r.setRenderTarget(null);
    r.setClearColor(prevClear, prevAlpha);
    rt.dispose();
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    scene.remove(object);
    return c.toDataURL();
  }

  headshot(char) {
    if (this.headshots.has(char)) return this.headshots.get(char);
    const a = char.avatar;
    const clone = a.body.clone(true);
    clone.rotation.set(0, 0, 0); clone.position.set(0, 0, 0);
    clone.traverse(o => { if (o.isSprite) o.visible = false; });
    for (const limb of [clone.children[2], clone.children[3], clone.children[4], clone.children[5]]) if (limb) limb.rotation.set(0, 0, 0);
    const url = this.snapshot(clone, new THREE.Vector3(1.1, 4.9, 4.6), new THREE.Vector3(0, 4.3, 0));
    this.headshots.set(char, url);
    return url;
  }

  toolThumb(k) {
    const key = 'tool:' + k;
    if (this.headshots.has(key)) return this.headshots.get(key);
    const m = makeToolModel(k);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const d = Math.max(s.x, s.y, s.z) * 2.3 + 0.5;
    const url = this.snapshot(m, c.clone().add(new THREE.Vector3(d * 0.45, d * 0.25, d)), c);
    this.headshots.set(key, url);
    return url;
  }
}
