// HUD. Two layers, like a real Roblox experience:
//  * Roblox CoreGui look-alikes: top bar, chat + bubble chat, player list,
//    backpack (hotbar + inventory), ProximityPrompts, notifications,
//    purchase prompt and the Esc menu (People / Settings / Report / Help).
//  * The experience's own GUI: status, disaster warning, health bar, survivors
//    list, the Welcome screen, the "Next Map" card, the Yellow Compass map vote
//    and the "Passes & Gear" menu on the left.
import * as THREE from 'three';
import { BADGES } from './data.js';
import { makeToolModel } from './avatar.js';
import { filterChat } from './chatfilter.js';
import { botReply } from './bots.js';
import { isTyping } from './input.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tools as they appear in the backpack (no TextureId, so Roblox shows the tool name).
export const TOOLS = { balloon: 'Green Balloon', apple: 'Red Apple', compass: 'Yellow Compass', hammer: 'Blue Hammer' };
const TOOL_ORDER = ['balloon', 'apple', 'compass', 'hammer'];

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

// Passes & Gear (prices from the live game)
const SHOP = {
  balloon: { name: 'Green Balloon', type: 'Game Pass', price: 95, desc: 'Float up high above the disasters. It pops if you go too high.' },
  apple: { name: 'Red Apple', type: 'Game Pass', price: 80, desc: 'Take a bite to get 15 health back. Red apples last forever!' },
  compass: { name: 'Yellow Compass', type: 'Game Pass', price: 60, desc: 'Take it out during the intermission to vote for the next map.' },
  multi: { name: 'Power Up Machine', type: 'Developer Product', price: 75, desc: 'Add a disaster to the next round, up to 7 at once. Extra power-ups carry over.' },
  hammer: { name: 'Blue Hammer', type: 'Item', price: 25, desc: 'Knock bricks loose for one round. Free, up to 12 a day.' },
};
const GEAR_ORDER = ['balloon', 'apple', 'compass', 'multi', 'hammer'];

// icons (inline SVG so they look the same everywhere)
const WARN_ICON = '<svg class="w-ico" viewBox="0 0 48 44" aria-hidden="true"><path d="M24 3 46 41H2Z" fill="#ffd21f" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/><path d="M24 15v13" stroke="#1b1b1b" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="34.5" r="2.9" fill="#1b1b1b"/></svg>';
const SKULL_ICON = '<svg class="sv-skull" viewBox="0 0 48 48" aria-hidden="true"><path fill="#2f7fe0" d="M24 3C13 3 5 11 5 21c0 6 3 10.5 7 13v6.5c0 1.4 1.1 2.5 2.5 2.5h19c1.4 0 2.5-1.1 2.5-2.5V34c4-2.5 7-7 7-13C43 11 35 3 24 3Z"/><circle cx="16.5" cy="22" r="5" fill="#0d2a52"/><circle cx="31.5" cy="22" r="5" fill="#0d2a52"/><path fill="#0d2a52" d="m24 27 3.2 5.5h-6.4Z"/><path stroke="#0d2a52" stroke-width="2.4" d="M18.5 37v6M24 37v6M29.5 37v6"/></svg>';
const WELCOME_ROWS = [
  ['storm', 'Do your best to survive the natural disasters.'],
  ['dice', 'Every round features a random map and disaster.'],
  ['eye', 'If you die, you can spectate other players from the lobby.'],
  ['clock', 'Get ready a new round will begin soon.'],
];
const WELCOME_ICONS = {
  storm: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M9 13a6 6 0 0 1 11.6-2.2A4.6 4.6 0 1 1 23 20H9.5A3.6 3.6 0 0 1 9 13Z"/><path fill="#ffd21f" d="m16 19-3 6h3l-1.5 5 5-7h-3l2-4Z"/></svg>',
  dice: '<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="5" fill="#fff"/><g fill="#d4392c"><circle cx="11" cy="11" r="2.3"/><circle cx="21" cy="11" r="2.3"/><circle cx="16" cy="16" r="2.3"/><circle cx="11" cy="21" r="2.3"/><circle cx="21" cy="21" r="2.3"/></g></svg>',
  eye: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M16 8C9 8 4 16 4 16s5 8 12 8 12-8 12-8-5-8-12-8Z"/><circle cx="16" cy="16" r="5" fill="#2f7fe0"/><circle cx="16" cy="16" r="2.2" fill="#0d2a52"/></svg>',
  clock: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="11" fill="#fff"/><path stroke="#1d4f91" stroke-width="2.6" stroke-linecap="round" fill="none" d="M16 11v6.5l4 2.5"/><path fill="#fff" d="M12 3h8v3h-8z"/></svg>',
};
const GEAR_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M4 8.5h16l-1.3 11.2a1.5 1.5 0 0 1-1.5 1.3H6.8a1.5 1.5 0 0 1-1.5-1.3Z"/><path fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/></svg>';
const POWER_ICON = '<svg viewBox="0 0 64 64"><rect x="10" y="50" width="44" height="7" rx="2" fill="#3b3a3f"/><rect x="19" y="18" width="26" height="33" rx="5" fill="#f5cd30"/><rect x="17" y="27" width="30" height="3" fill="#b98c46"/><rect x="17" y="40" width="30" height="3" fill="#b98c46"/><ellipse cx="32" cy="18" rx="13" ry="8" fill="#f5cd30"/><rect x="29" y="5" width="6" height="8" fill="#3b3a3f"/><circle cx="12" cy="34" r="7" fill="#b98c46"/><circle cx="52" cy="34" r="7" fill="#b98c46"/><circle cx="32" cy="35" r="7" fill="#efe4c8"/><path d="M32 35l4-4" stroke="#c4281c" stroke-width="2"/></svg>';
const CONFETTI = ['#ff4b4b', '#ffd21f', '#33c3ff', '#5ee36b', '#ff7ad9', '#9b6cff', '#ff9f2f'];

const _v = new THREE.Vector3();

// Roblox health colours (TopbarConstants): red -> yellow -> green
const H_RED = [255, 28, 0], H_YEL = [250, 235, 0], H_GRN = [27, 252, 107];
export function healthColor(f) {
  f = Math.max(0, Math.min(1, f));
  const [a, b, t] = f > 0.5 ? [H_YEL, H_GRN, (f - 0.5) * 2] : [H_RED, H_YEL, f * 2];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

export class UI {
  constructor(game) {
    this.g = game;
    this.el = {
      statusText: $('status-text'), statusTime: $('status-time'), warnings: $('warnings'), messages: $('messages'),
      health: $('health-fill'), healthText: $('health-text'), healthWrap: $('health'),
      survivors: $('survivors'), vote: $('vote'), nextMap: $('nextmap'), welcome: $('welcome'), confetti: $('confetti'),
      gear: $('gear'), gearBtn: $('gear-btn'), status: $('status'),
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
    this.bindSpectate();
    // clicking the round timer closes the survivors list
    this.el.status.addEventListener('click', () => { if (this.survivorsOpen()) { this.hideSurvivors(); this.g.audio.click(); } });
    this.applySettings();
  }

  // ============================== game GUI ==============================
  status(text, time = null) {
    if (this._st !== text) { this.el.statusText.textContent = text; this._st = text; }
    const t = time === null ? '' : String(Math.max(0, time));
    if (this._tt !== t) { this.el.statusTime.textContent = t; this.el.statusTime.style.display = t ? '' : 'none'; this._tt = t; }
  }

  // Red "DISASTER WARNING" box with a warning sign each side and the disaster's tip
  // underneath; it flashes for a few seconds, then goes away.
  warning(def, index) {
    const d = document.createElement('div');
    d.className = 'warning';
    const delay = index * 0.25;
    d.style.animationDelay = `${delay}s, ${delay + 0.35}s`;
    d.innerHTML = `${WARN_ICON}<div class="w-mid"><div class="w-head">DISASTER WARNING</div><div class="w-tip"></div></div>${WARN_ICON}`;
    d.querySelector('.w-tip').textContent = def.warning;
    this.el.warnings.appendChild(d);
    setTimeout(() => d.classList.add('out'), 6500 + index * 250);
    setTimeout(() => d.remove(), 7300 + index * 250);
  }

  // Survivors list: a two-tone banner with "Survivors" on the left and the usernames
  // in a light-blue box (clicking the round timer closes it).
  showSurvivors(names) {
    const el = this.el.survivors;
    this.el.warnings.innerHTML = '';
    el.innerHTML = '<div class="sv-banner"><div class="sv-label">Survivors</div><div class="sv-stripe"></div><div class="sv-names"></div></div>';
    const box = el.querySelector('.sv-names');
    if (!names.length) {
      box.classList.add('none');
      box.innerHTML = `${SKULL_ICON}<span>There were no survivors</span>`;
    }
    for (const n of names) {
      const sp = document.createElement('span'); sp.className = 'sv-n'; sp.textContent = n;
      box.appendChild(sp);
    }
    el.classList.add('show');
    document.body.classList.add('surv-open');
  }
  hideSurvivors() { this.el.survivors.classList.remove('show'); document.body.classList.remove('surv-open'); }
  survivorsOpen() { return this.el.survivors.classList.contains('show'); }

  // "Next Map" card while the map loads, with a picture of it
  showNextMap(name) {
    const el = this.el.nextMap;
    el.innerHTML = '<div class="nm-card"><div class="nm-head">Next Map</div><div class="nm-img"></div><div class="nm-name"></div></div>';
    el.querySelector('.nm-name').textContent = name;
    let url = null;
    try { url = this.mapPreview(); } catch { /* no picture */ }
    if (url) { const img = document.createElement('img'); img.alt = ''; img.src = url; el.querySelector('.nm-img').appendChild(img); }
    else el.querySelector('.nm-img').remove();
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._nmT);
    this._nmT = setTimeout(() => this.hideNextMap(), 6500);
  }
  hideNextMap() { clearTimeout(this._nmT); this.el.nextMap.classList.remove('show'); }
  nextMapOpen() { return this.el.nextMap.classList.contains('show'); }

  // a quick aerial render of the map that was just loaded
  mapPreview() {
    const g = this.g;
    if (!g.map) return null;
    const W = 384, H = 216, r = g.renderer;
    // frame the map's bricks from above and in front
    const box = new THREE.Box3();
    for (const p of g.map.parts) if (p.alive && p.collide) { const a = g.world.aabb(p); box.expandByPoint(_v.set(a.minX, a.minY, a.minZ)); box.expandByPoint(_v.set(a.maxX, a.maxY, a.maxZ)); }
    if (box.isEmpty()) box.set(new THREE.Vector3(-60, 0, -60), new THREE.Vector3(60, 30, 60));
    const c = box.getCenter(new THREE.Vector3()), R = Math.max(25, box.getSize(new THREE.Vector3()).length() / 2);
    const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 5000);
    cam.position.copy(c).addScaledVector(new THREE.Vector3(0.6, 0.48, 0.64).normalize(), R * 2.05);
    cam.lookAt(c);
    for (const pool of g.world.pools.values()) pool.flush();   // bricks added this frame
    const sky = g.effects?.sky, skyAt = sky?.position.clone();
    sky?.position.copy(cam.position);   // the sky dome follows whichever camera looks
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    r.setRenderTarget(rt);
    r.render(g.scene, cam);
    if (sky) sky.position.copy(skyAt);
    const px = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, px);
    r.setRenderTarget(null);
    rt.dispose();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/jpeg', 0.85);
  }

  // Welcome screen when you join; "I'm ready!" throws confetti
  showWelcome() {
    const el = this.el.welcome;
    el.innerHTML = `<div class="wc-card"><div class="wc-title"></div><div class="wc-rows">${WELCOME_ROWS.map(([ic, t]) =>
      `<div class="wc-row"><span class="wc-ico wc-${ic}">${WELCOME_ICONS[ic]}</span><span class="wc-txt">${esc(t)}</span></div>`).join('')}</div><button class="wc-ready">I'm ready!</button></div>`;
    el.querySelector('.wc-title').textContent = `Welcome ${this.g.player.name}!`;
    el.classList.add('show');
    const btn = el.querySelector('.wc-ready');
    btn.onclick = (e) => {
      e.stopPropagation();
      const b = btn.getBoundingClientRect();
      this.confetti(b.left + b.width / 2, b.top + b.height / 2);
      this.g.audio.confettiPop?.();
      el.classList.remove('show');
    };
  }
  welcomeOpen() { return this.el.welcome.classList.contains('show'); }

  confetti(x, y, n = 140) {
    const layer = this.el.confetti;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      const w = 6 + Math.random() * 7, h = w * (0.4 + Math.random() * 0.8);
      d.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${CONFETTI[i % CONFETTI.length]};${Math.random() < 0.3 ? 'border-radius:50%;' : ''}`;
      layer.appendChild(d);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 220 + Math.random() * 380;
      const dx = Math.cos(a) * sp, dy = Math.sin(a) * sp, fall = innerHeight * (0.6 + Math.random() * 0.5);
      const spin = (Math.random() - 0.5) * 1440, dur = 2200 + Math.random() * 1600;
      d.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin * 0.3}deg)`, opacity: 1, offset: 0.22 },
        { transform: `translate(calc(-50% + ${dx * 1.5}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
    }
  }

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

  // ---- Yellow Compass map vote ----
  // Taking the compass out opens the vote (during the intermission); it can't be
  // used while the survivors list or the next map card is up.
  compassBlocked() { return this.survivorsOpen() || this.nextMapOpen(); }
  useCompass(fromClick = false) {
    const g = this.g;
    if (this.compassBlocked()) { if (fromClick || !this._cmpWarned) this.toast("You can't use the compass right now."); this._cmpWarned = true; return false; }
    if (!g.round.votes) { if (fromClick || !this._cmpWarned) this.toast('Map voting opens during the intermission.'); this._cmpWarned = true; return false; }
    if (!this.voteShown()) { this.showVote(g.round.votes); if (fromClick) g.audio.click(); }
    return true;
  }
  // a new vote started: show it straight away if the compass is out
  voteOpened(votes) {
    const p = this.g.player;
    if (p.alive && p.equipped === 'compass' && !this.compassBlocked()) this.showVote(votes);
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
  voteShown() { return this.el.vote.classList.contains('show'); }

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
    const more = $('tb-more'), menu = $('unibar-menu');
    $('tb-menu').onclick = () => { this.closeUnibar(); this.toggleHub(); };
    more.onclick = (e) => { e.stopPropagation(); const open = !menu.classList.contains('show'); menu.classList.toggle('show', open); more.classList.toggle('on', open); };
    addEventListener('mousedown', (e) => { if (!menu.contains(e.target) && !more.contains(e.target)) this.closeUnibar(); });
    for (const b of menu.querySelectorAll('button')) b.onclick = () => {
      this.closeUnibar();
      const act = b.dataset.act;
      if (act === 'leaderboard') this.setPlayerList(this.el.playerlist.classList.contains('hidden'));
      else if (act === 'backpack') this.toggleInventory();
      else if (act === 'capture') this.g.captureNext = true;
      else if (act === 'report') this.toggleHub(true, 'report');
    };
    const setChat = (open) => {
      this.el.chat.classList.toggle('hidden', !open);
      $('tb-chat').classList.toggle('on', open);
      document.body.classList.toggle('chat-open', open);
    };
    this.setChat = setChat;
    $('tb-chat').onclick = () => setChat(this.el.chat.classList.contains('hidden'));
    // like Roblox mobile, chat and the leaderboard start collapsed on small touch screens
    const touch = 'ontouchstart' in window;
    setChat(!touch);
    document.querySelector('.pl-close').onclick = () => this.setPlayerList(false);
    this.setPlayerList(!touch || innerWidth > 700);
  }

  closeUnibar() { $('unibar-menu').classList.remove('show'); $('tb-more').classList.remove('on'); }
  setPlayerList(open) { this.el.playerlist.classList.toggle('hidden', !open); }

  // ============================== chat ==============================
  bindChat() {
    const inp = this.el.chatInput;
    this.muted = new Set();
    inp.addEventListener('focus', () => { this.el.chat.classList.add('active'); this.chatActiveAt = performance.now(); });
    inp.addEventListener('blur', () => { this.el.chat.classList.remove('active'); this.chatActiveAt = performance.now(); this.setTyping(false); });
    inp.addEventListener('input', () => this.setTyping(inp.value.trim().length > 0 && !inp.value.startsWith('/')));
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { this.sendChat(); inp.blur(); }
      if (e.key === 'Escape') inp.blur();
    });
    $('chat-send').onclick = () => this.sendChat();
    addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      if (e.key === '/' && this.g.started && !this.hubOpen()) {
        e.preventDefault();
        if (this.el.chat.classList.contains('hidden')) $('tb-chat').click();
        inp.focus();
      }
    });
    this.el.chat.addEventListener('mouseenter', () => { this.chatActiveAt = performance.now(); });
  }

  // bubble chat shows "..." over people who are typing
  setTyping(on) {
    const g = this.g;
    if (this._typing === on) return;
    this._typing = on;
    g.player.typing = on;
    if (g.net) g.net.send({ t: 'typing', eid: g.net.selfId, on });
  }

  sendChat() {
    const inp = this.el.chatInput;
    const t = inp.value.trim().slice(0, 200);
    inp.value = '';
    this.setTyping(false);
    if (!t || !this.g.player) return;
    if (t.startsWith('/') && this.command(t)) return;
    const clean = filterChat(t);
    this.g.sayChat(this.g.player, clean);
    if (this.g.isAuthority) botReply(this.g, this.g.player, clean);
  }

  findSpeaker(name) {
    const n = name.replace(/^@/, '').toLowerCase();
    const list = this.g.chars.filter(c => c !== this.g.player);
    return list.find(c => c.name.toLowerCase() === n) || list.find(c => c.name.toLowerCase().startsWith(n)) || null;
  }

  // TextChatService's default commands
  command(t) {
    const g = this.g;
    const parts = t.slice(1).split(/\s+/);
    const cmd = parts.shift().toLowerCase();
    switch (cmd) {
      case 'e': case 'emote': {
        const e = (parts[0] || '').toLowerCase();
        // "/e dance" picks one of the three dances; emotes only start while standing still
        const map = { dance: ['dance', 'dance2', 'dance3'][Math.floor(Math.random() * 3)], dance1: 'dance', dance2: 'dance2', dance3: 'dance3', wave: 'wave', point: 'point', cheer: 'cheer', laugh: 'laugh' };
        const p = g.player;
        const still = p.grounded && (p.hSpeed || 0) < 0.5 && !p.seat && !p.climbing && !p.swimming;
        if (map[e] && p.alive && still) p.setEmote(map[e]);
        else if (!map[e]) this.system('Available emotes: /e dance, /e dance1, /e dance2, /e dance3, /e wave, /e point, /e cheer, /e laugh');
        return true;
      }
      case 'w': case 'whisper': {
        const who = parts.length ? this.findSpeaker(parts[0]) : null;
        const msg = parts.slice(1).join(' ');
        if (!who) { this.system('Speaker not found.'); return true; }
        if (!msg) { this.system(`Type /w ${who.name} followed by your message to whisper to them.`); return true; }
        g.sayChat(g.player, filterChat(msg), who);
        return true;
      }
      case 'cls': case 'clear': this.el.chatLog.innerHTML = ''; return true;
      case '?': case 'help':
        for (const l of ['/e <emote> - play an emote: dance, dance2, dance3, wave, point, cheer, laugh', '/w <name> <message> - whisper to someone',
          '/m <name> - mute someone, /um <name> - unmute them', '/cls - clear the chat', '/v - version']) this.system(l);
        return true;
      case 'm': case 'mute': case 'um': case 'unmute': {
        const who = parts.length ? this.findSpeaker(parts[0]) : null;
        if (!who) { this.system('Speaker not found.'); return true; }
        const mute = cmd === 'm' || cmd === 'mute';
        if (mute) this.muted.add(who.name); else this.muted.delete(who.name);
        this.system(`${who.name} has been ${mute ? 'muted' : 'unmuted'}.`);
        return true;
      }
      case 'v': case 'version':
        this.system(`Natural Disaster Survival (web remake) · ${g.net ? `server "${g.net.roomName}", ${g.net.isHost ? 'you are the host' : 'connected'}` : 'offline'}`);
        return true;
    }
    return false;
  }

  chatLine(name, text, color, cls = '') {
    const d = document.createElement('div');
    d.className = 'msg' + (name ? '' : ' sys') + (cls ? ' ' + cls : '');
    if (name) {
      const n = document.createElement('span'); n.className = 'nm'; n.style.color = color || nameColor(name); n.textContent = name + ': ';
      d.appendChild(n);
    }
    d.appendChild(document.createTextNode(text));
    const log = this.el.chatLog;
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.appendChild(d);
    while (log.children.length > 100) log.firstChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
    this.chatActiveAt = performance.now();
  }

  system(text) { this.chatLine('', text); }

  // a message from someone in this server (already filtered)
  say(char, text, whisperTo = null) {
    if (whisperTo) { this.chatLine(`[To ${whisperTo.name}]`, text, '#c8c8c8', 'whisper'); return; }
    this.chatLine(char.name, text);
    this.bubble(char, text);
  }

  receiveChat(char, text, whisper) {
    if (this.muted.has(char.name)) return;
    const clean = filterChat(String(text).slice(0, 200));
    if (whisper) { this.chatLine(`[From ${char.name}]`, clean, '#c8c8c8', 'whisper'); return; }
    this.say(char, clean);
    if (this.g.isAuthority && !char.isBot) botReply(this.g, char, clean);
  }

  bubble(char, text) {
    const b = this.bubbleStack(char);
    b.typing?.remove(); b.typing = null;
    const bub = document.createElement('div'); bub.className = 'bubble'; bub.textContent = text;
    b.el.appendChild(bub);
    b.list.push({ el: bub, until: this.g.time + 15 });
    while (b.list.length > 3) b.list.shift().el.remove();
    this.layoutBubble(b);
  }

  bubbleStack(char) {
    let b = this.bubbleMap.get(char);
    if (!b) {
      const el = document.createElement('div'); el.className = 'bstack';
      const mini = document.createElement('div'); mini.className = 'bubble mini last'; mini.textContent = '⋯';
      el.appendChild(mini);
      this.el.bubbles.appendChild(el);
      b = { el, mini, list: [], typing: null }; this.bubbleMap.set(char, b);
    }
    return b;
  }

  typing(char, on) {
    const b = this.bubbleStack(char);
    if (on && !b.typing) {
      const t = document.createElement('div'); t.className = 'bubble typing last'; t.innerHTML = '<i></i><i></i><i></i>';
      b.el.appendChild(t); b.typing = t;
    } else if (!on && b.typing) { b.typing.remove(); b.typing = null; }
    this.layoutBubble(b);
  }

  forgetChar(char) {
    const b = this.bubbleMap.get(char);
    if (b) { b.el.remove(); this.bubbleMap.delete(char); }
  }

  layoutBubble(b) {
    b.list.forEach((x, i) => { x.el.classList.toggle('last', i === b.list.length - 1 && !b.typing); x.el.classList.toggle('old', i < b.list.length - 1); });
  }

  updateBubbles() {
    const cam = this.g.camera;
    for (const [char, b] of this.bubbleMap) {
      for (let i = b.list.length - 1; i >= 0; i--) if (this.g.time > b.list[i].until || !char.alive) { b.list[i].el.remove(); b.list.splice(i, 1); this.layoutBubble(b); }
      if (b.typing && !char.alive) { b.typing.remove(); b.typing = null; }
      if (!b.list.length && !b.typing) { b.el.style.display = 'none'; continue; }
      _v.set(char.pos.x, char.pos.y + 6.4, char.pos.z);
      const dist = _v.distanceTo(cam.position);
      _v.project(cam);
      if (_v.z > 1 || dist > 100 || (char.isPlayer && this.g.camController.firstPerson)) { b.el.style.display = 'none'; continue; }
      b.el.style.display = '';
      // far away, the bubbles shrink into a single "..." bubble (MinimizeDistance 40)
      b.el.classList.toggle('far', dist > 40);
      b.el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`;
      b.el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
    }
  }

  // ============================== backpack ==============================
  bindBackpack() {
    addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      if (e.key === '`' || e.key === '~') { e.preventDefault(); this.toggleInventory(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        this.setPlayerList(this.el.playerlist.classList.contains('hidden'));
      }
    });
    this.el.invSearch.addEventListener('input', () => { this._hb = null; document.querySelector('.inv-search').classList.toggle('has', !!this.el.invSearch.value); });
    this.el.invSearch.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') this.el.invSearch.blur(); });
    $('inv-clear').onclick = () => { this.el.invSearch.value = ''; this._hb = null; document.querySelector('.inv-search').classList.remove('has'); };
  }

  toggleInventory(force) {
    const open = force ?? !this.el.backpack.classList.contains('open');
    this.el.backpack.classList.toggle('open', open);
    document.body.classList.toggle('backpack-open', open);
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
    const showN = showNum && !g.input.isTouch;
    if (!k) { b.className = 'slot empty'; if (showN) b.innerHTML = `<span class="num">${(i + 1) % 10}</span>`; return b; }
    const cd = k === 'apple' && (c.appleCd || 0) > g.time;
    b.className = 'slot' + (c.equipped === k ? ' equipped' : '') + (cd ? ' cooldown' : '');
    b.innerHTML = `${showN ? `<span class="num">${(i + 1) % 10}</span>` : ''}<span class="tname"></span><span class="tip"></span>`;
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
    const html = rows.map(c => `<div class="pl-row${c.isPlayer ? ' me' : ''}"><span class="pl-n">${esc(c.name)}</span><span class="pl-v">${c.survivals}</span></div>`).join('');
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
      d.innerHTML = `<div class="pp-key"><div class="pp-ring">${this.g.input.isTouch ? '' : '<div class="pp-cap">E</div>'}</div></div><div class="pp-txt"><div class="pp-obj"></div><div class="pp-act"></div></div>`;
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

  // ============================== spectate ==============================
  // From the Lobby Tower you can follow anyone still in the round.
  bindSpectate() {
    const g = this.g;
    $('spec-toggle').onclick = () => { if (g.spectating) g.stopSpectating(); else g.spectate(0); g.audio.click(); };
    $('spec-prev').onclick = () => { g.spectate(-1); g.audio.click(); };
    $('spec-next').onclick = () => { g.spectate(1); g.audio.click(); };
  }

  updateSpectate() {
    const g = this.g, p = g.player;
    const can = g.started && !p.inRound && (g.round.phase === 'roam' || g.round.phase === 'disaster') && g.spectateTargets().length > 0;
    const el = $('spectate');
    el.classList.toggle('show', can || !!g.spectating);
    el.classList.toggle('on', !!g.spectating);
    $('spec-toggle').textContent = g.spectating ? 'Stop Spectating' : 'Spectate';
    if (g.spectating && this._specName !== g.spectating.name) { this._specName = g.spectating.name; $('spec-name').textContent = g.spectating.name; }
  }

  // ============================== frame update ==============================
  update(dt) {
    const g = this.g, p = g.player;
    const hp = p.alive ? p.health : 0;
    this.el.health.style.width = `${(hp / p.maxHealth) * 100}%`;
    this.el.health.style.background = healthColor(hp / p.maxHealth);
    this.el.healthText.textContent = String(Math.ceil(hp));
    // blizzard: the screen frosts over in three stages as you get colder
    this.el.cold.style.opacity = p.alive ? [0, 0.3, 0.6, 0.9][p.coldLevel || 0] : 0;
    this.el.sick.style.opacity = p.infected && p.alive ? 0.6 : 0;
    this.renderBackpack();
    this.lbTimer -= dt;
    if (this.lbTimer <= 0) { this.lbTimer = 0.5; this.playerList(); }
    this.updateBubbles();
    this.updateSpectate();
    // the Yellow Compass: out = vote open (when it can be used)
    const cmp = p.alive && p.equipped === 'compass';
    if (cmp && !this._cmpOut) { this._cmpWarned = false; this.useCompass(); }
    if (cmp && !this.voteShown() && g.round.votes && !this.compassBlocked()) this.showVote(g.round.votes);
    if (this.voteShown() && (!cmp || this.compassBlocked() || !g.round.votes)) this.hideVote();
    this._cmpOut = cmp;
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
    return this.hubOpen() || this.el.purchase.classList.contains('show') || isTyping();
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
    if (name === 'home') this.renderHome();
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
      if (isTyping(e.target)) return;
      if (!g.started) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (this.el.purchase.classList.contains('show')) { this.el.purchase.classList.remove('show'); return; }
        if (this.gearOpen()) { this.toggleGear(false); return; }
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
    $('hub-players').innerHTML =
      list.map((c, i) => `<div class="player-row"><img data-i="${i}" alt=""><div class="pr-names"><span class="pr-dn">${esc(c.name)}</span><span class="pr-un">@${esc(c.name.replace(/\s+/g, '_'))}</span></div><span class="pr-tag">${c.isPlayer ? 'You' : `${c.survivals} survivals`}</span></div>`).join('');
    // headshots are real renders of each avatar
    const imgs = $('hub-players').querySelectorAll('img');
    imgs.forEach((img) => {
      const c = list[+img.dataset.i];
      img.src = this.headshot(c);
    });
  }

  renderHome() {
    $('hub-home').innerHTML = `<div class="home-info"><h2>Natural Disaster Survival</h2><div class="hi-by">By David · browser fan remake</div>
      <p>Survive a series of natural disasters! The map and disaster are picked at random each round. Read the warning, pick your spot, and stay alive until the timer runs out.</p>
      <p>Round ${this.g.round.roundNo} · ${this.g.chars.length} people in this server · Your survivals: ${this.g.player.survivals} · Best streak: ${this.g.data.d.bestStreak || 0}</p></div>`;
  }

  renderHelp() {
    const rows = [
      ['Move', ['W', 'A', 'S', 'D']], ['Jump', ['Space']], ['Rotate Camera', ['Right Mouse', '←', '→']], ['Zoom', ['I', 'O', 'Wheel']],
      ['Shift Lock', ['Shift']], ['Chat', ['/']], ['Backpack', ['`']], ['Equip Tool', ['1', '2', '3', '4']], ['Use Tool', ['Left Click']],
      ['Interact', ['E']], ['Player List', ['Tab']], ['Menu', ['Esc']], ['Reset Character', ['Esc', 'R', 'Enter']],
      ['Climb a truss', ['W', 'S']], ['Let go of a truss', ['Space']],
    ];
    $('hub-help').innerHTML = '<div class="help-grid">' +
      rows.map(([a, ks]) => `<div class="help-item"><span>${a}</span><span class="help-keys">${ks.map(k => `<span class="keycap">${esc(k)}</span>`).join('')}</span></div>`).join('') + '</div>' +
      '<p class="hub-note" style="margin-top:16px">Read the warning as soon as it appears. Flood &amp; Tsunami: get high, but not on the tallest tower. Acid Rain &amp; Meteor Shower: get under a roof on a low floor. Earthquake &amp; Fire: get outside, away from buildings. Blizzard: stand between walls near other players. Tornado: keep moving away from it. Deadly Virus: stay alone. Sandstorm: stay upwind, out in the open. Health is not restored between rounds, so reset in the lobby if you are low.</p>' +
      '<p class="hub-note">Passes &amp; Gear (on the left) has the Green Balloon, the Red Apple, the Yellow Compass (take it out during the intermission to vote for the next map), the Power Up Machine (one more disaster next round, up to 7) and the Blue Hammer.</p>' +
      '<p class="hub-note">Everyone who opens this game plays on the same server; add <b>?server=</b> and any name to the link to make a private server for your friends. Chat commands: /e dance, /e dance2, /e dance3, /e wave, /e point, /e cheer, /e laugh · /w name message · /m name, /um name · /cls · /help.</p>';
  }

  renderSettings() {
    const s = this.settings;
    const rows = [
      ['Shift Lock Switch', 'sel', 'shiftLockSwitch', [true, false], v => v ? 'On' : 'Off'],
      ['Camera Mode', 'sel', 'cameraMode', ['Classic', 'Follow'], v => v === 'Classic' ? 'Default (Classic)' : v],
      ['Movement Mode', 'sel', null, ['Default (Keyboard)'], v => v],
      ['Output Device', 'sel', null, ['Default'], v => v],
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
        sel.innerHTML = '<button class="chev">‹</button><span class="sel-val"></span><button class="chev">›</button>';
        sel.querySelector('.sel-val').textContent = fmt(cur);
        const [l, r] = sel.querySelectorAll('.chev');
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
        const sl = document.createElement('div'); sl.className = 'slider' + (disabled ? ' off' : '');
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

  // ============================== Passes & Gear ==============================
  bindShop() {
    this.el.gearBtn.onclick = (e) => { e.stopPropagation(); this.toggleGear(); this.g.audio.click(); };
  }
  gearOpen() { return this.el.gear.classList.contains('show'); }
  toggleGear(force) {
    const open = force ?? !this.gearOpen();
    this.el.gear.classList.toggle('show', open);
    this.el.gearBtn.classList.toggle('on', open);
    if (open) this.renderGear();
  }
  renderGear() {
    const g = this.g, el = this.el.gear;
    el.innerHTML = '<div class="gear-head"><span>Passes &amp; Gear</span><button class="gear-x" aria-label="Close">&#x2715;</button></div><div class="gear-list"></div>';
    el.querySelector('.gear-x').onclick = () => this.toggleGear(false);
    const list = el.querySelector('.gear-list');
    for (const k of GEAR_ORDER) {
      const it = SHOP[k];
      const owned = (k === 'balloon' || k === 'apple' || k === 'compass') && !!g.player.items[k];
      const row = document.createElement('div');
      row.className = 'gear-item' + (owned ? ' owned' : '');
      row.innerHTML = `<div class="gi-img">${k === 'multi' ? POWER_ICON : `<img alt="" src="${this.toolThumb(k)}">`}</div><div class="gi-info"><div class="gi-name"></div><div class="gi-type"></div><div class="gi-desc"></div></div><button class="gi-buy"></button>`;
      row.querySelector('.gi-name').textContent = it.name;
      row.querySelector('.gi-type').textContent = it.type;
      row.querySelector('.gi-desc').textContent = it.desc;
      const buy = row.querySelector('.gi-buy');
      buy.textContent = owned ? 'Owned' : k === 'hammer' ? 'Free' : `R$ ${it.price}`;
      buy.onclick = (e) => { e.stopPropagation(); this.openPurchase(k); };
      list.appendChild(row);
    }
  }

  // ============================== purchase prompt ==============================
  openPurchase(k) {
    const g = this.g, it = SHOP[k], m = this.el.purchase;
    const owned = k === 'multi' ? false : !!g.player.items[k];
    const img = k === 'multi' ? POWER_ICON : `<img src="${this.toolThumb(k)}" alt="">`;
    const close = () => m.classList.remove('show');
    const card = (title, msg, buttons, footer) => {
      m.innerHTML = `<div class="buy"><div class="buy-title">${title}</div><div class="buy-img">${img}</div><div class="buy-msg">${msg}</div><div class="buy-btns">${buttons}</div>${footer ? `<div class="buy-bal">${footer}</div>` : ''}</div>`;
    };
    if (owned) {
      card('Buy Item', 'You already own this item. Your account has not been charged.', '<button class="buy-ok">OK</button>');
      m.querySelector('.buy-ok').onclick = close;
    } else {
      card('Buy Item', `Would you like to buy "${esc(it.name)}"?`, '<button class="buy-cancel">Cancel</button><button class="buy-ok">Free</button>',
        it.price ? `Normally R$${it.price} in the original game. Everything is free in this remake.` : '');
      m.querySelector('.buy-cancel').onclick = close;
      m.querySelector('.buy-ok').onclick = () => {
        if (!this.grant(k)) { close(); return; }
        g.audio.chime();
        card('Purchase completed', `You have successfully bought "${esc(it.name)}".`, '<button class="buy-ok">OK</button>');
        m.querySelector('.buy-ok').onclick = close;
        if (this.gearOpen()) this.renderGear();
      };
    }
    m.classList.add('show');
  }

  grant(k) {
    const g = this.g;
    if (k === 'multi') {
      if (!g.round.addMulti()) { this.notify('Power Up Machine', 'The Power Up Machine is full. Try again after the next round.'); return false; }
      // in multiplayer the host announces it to everyone
      if (g.isAuthority) {
        const text = `${g.player.name} powered up the Power Up Machine! (${g.round.powerText()})`;
        if (g.net) g.net.broadcastSystem(text); else this.system(text);
      }
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
