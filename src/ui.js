// HUD: status banner, disaster warning popups, health bar, survivors list,
// leaderboard, shop, hotbar, map vote, prompts, badges, menu.
import { BADGES } from './data.js';
import { MAPS } from './maps.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.el = {
      status: $('status'), statusText: $('status-text'), statusTime: $('status-time'),
      warnings: $('warnings'), health: $('health-fill'), healthText: $('health-text'), healthWrap: $('health'),
      survivors: $('survivors'), survivorList: $('survivor-list'), lb: $('lb-body'), toasts: $('toasts'), badges: $('badges'),
      vote: $('vote'), prompt: $('prompt'), hurt: $('hurt'), cold: $('cold'), sick: $('sick'), hotbar: $('hotbar'),
      menu: $('menu'), shop: $('shop-modal'), dead: $('dead'),
    };
    this.lastHealth = 100;
    this.lbTimer = 0;
    this.bindMenu();
    this.bindShop();
  }

  status(text, time = null) {
    if (this._st !== text) { this.el.statusText.textContent = text; this._st = text; }
    const t = time === null ? '' : String(Math.max(0, time));
    if (this._tt !== t) { this.el.statusTime.textContent = t; this.el.statusTime.style.display = t ? '' : 'none'; this._tt = t; }
  }

  warning(def, index) {
    const d = document.createElement('div');
    d.className = 'warning';
    d.style.animationDelay = `${index * 0.25}s`;
    d.innerHTML = `<div class="w-icon">${def.icon}</div><div><div class="w-title"></div><div class="w-tip"></div></div>`;
    const [title, ...rest] = def.warning.split('!');
    d.querySelector('.w-title').textContent = title + '!';
    d.querySelector('.w-tip').textContent = rest.join('!').trim();
    this.el.warnings.appendChild(d);
    setTimeout(() => d.classList.add('out'), 6500 + index * 250);
    setTimeout(() => d.remove(), 7300 + index * 250);
  }

  showSurvivors(names) {
    const l = this.el.survivorList;
    l.innerHTML = '';
    if (!names.length) { const li = document.createElement('li'); li.className = 'none'; li.textContent = 'No survivors'; l.appendChild(li); }
    for (const n of names) {
      const li = document.createElement('li');
      li.textContent = n;
      if (n === this.g.player.name) li.className = 'me';
      l.appendChild(li);
    }
    this.el.survivors.classList.add('show');
  }
  hideSurvivors() { this.el.survivors.classList.remove('show'); }

  toast(text, ms = 3500) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), ms);
    setTimeout(() => d.remove(), ms + 600);
  }

  badge(id) {
    const b = BADGES[id];
    const d = document.createElement('div');
    d.className = 'badge-toast';
    d.innerHTML = `<div class="b-icon">${b.icon}</div><div><div class="b-head">Badge Awarded</div><div class="b-name"></div><div class="b-desc"></div></div>`;
    d.querySelector('.b-name').textContent = b.name;
    d.querySelector('.b-desc').textContent = b.desc;
    this.el.badges.appendChild(d);
    setTimeout(() => d.classList.add('out'), 5000);
    setTimeout(() => d.remove(), 5700);
  }

  hurtFlash() {
    const h = this.el.hurt;
    h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash');
    this.el.healthWrap.classList.remove('hit'); void this.el.healthWrap.offsetWidth; this.el.healthWrap.classList.add('hit');
  }

  showVote(votes) {
    const v = this.el.vote;
    v.innerHTML = '<div class="vote-title">🧭 Vote for the next map</div><div class="vote-cards"></div>';
    const cards = v.querySelector('.vote-cards');
    for (const name of votes.options) {
      const b = document.createElement('button');
      b.className = 'vote-card';
      b.dataset.name = name;
      b.innerHTML = `<div class="vc-name"></div><div class="vc-count">0 votes</div>`;
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

  prompt(item) {
    const p = this.el.prompt;
    if (!item) { if (this._pr) { p.classList.remove('show'); this._pr = null; } return; }
    if (this._pr !== item) {
      this._pr = item;
      p.innerHTML = `<span class="key">${this.g.input.isTouch ? 'Tap' : 'E'}</span><span class="pl"></span>`;
      p.querySelector('.pl').textContent = typeof item.label === 'function' ? item.label() : item.label;
      p.classList.add('show');
    }
  }

  hotbar() {
    const g = this.g, c = g.player;
    const slots = [['balloon', '🎈', 'Balloon'], ['apple', '🍎', 'Apple'], ['hammer', '🔨', 'Hammer']].filter(([k]) => c.items[k]);
    const key = slots.map(s => s[0]).join() + '|' + c.equipped + '|' + (c.appleCd > g.time ? 1 : 0);
    if (key === this._hb) return;
    this._hb = key;
    const h = this.el.hotbar;
    h.innerHTML = '';
    slots.forEach(([k, icon, name], i) => {
      const b = document.createElement('button');
      b.className = 'slot' + (c.equipped === k ? ' on' : '') + (k === 'apple' && c.appleCd > g.time ? ' cd' : '');
      b.innerHTML = `<span class="n">${i + 1}</span><span class="i">${icon}</span><span class="t">${name}</span>`;
      b.onclick = (e) => { e.stopPropagation(); g.equipSlot(i); };
      h.appendChild(b);
    });
    this.slotKeys = slots.map(s => s[0]);
  }

  update(dt) {
    const g = this.g, p = g.player;
    const hp = p.alive ? p.health : 0;
    const frac = hp / p.maxHealth;
    this.el.health.style.width = `${frac * 100}%`;
    this.el.health.style.background = frac > 0.5 ? '#3fd13f' : frac > 0.25 ? '#f5cd30' : '#e2412e';
    this.el.healthText.textContent = `${Math.ceil(hp)} / ${p.maxHealth}`;
    this.el.cold.style.opacity = p.cold && p.alive ? 0.7 : 0;
    this.el.sick.style.opacity = p.infected && p.alive ? 0.6 : 0;
    this.el.dead.classList.toggle('show', !p.alive);
    this.hotbar();
    this.lbTimer -= dt;
    if (this.lbTimer <= 0) { this.lbTimer = 0.5; this.leaderboard(); }
  }

  leaderboard() {
    const g = this.g;
    const rows = [...g.chars].sort((a, b) => b.survivals - a.survivals || a.name.localeCompare(b.name));
    const html = rows.map(c => {
      const state = !c.alive ? ' dead' : c.inRound ? ' alive' : '';
      return `<tr class="${c.isPlayer ? 'me' : ''}${state}"><td class="nm">${esc(c.name)}</td><td>${c.survivals}</td></tr>`;
    }).join('');
    if (html !== this._lb) { this.el.lb.innerHTML = html; this._lb = html; }
  }

  bindMenu() {
    const g = this.g;
    $('menu-btn').onclick = () => this.toggleMenu();
    $('m-resume').onclick = () => this.toggleMenu(false);
    $('m-reset').onclick = () => { this.toggleMenu(false); if (g.player.alive) g.player.die('reset'); };
    $('m-mute').onclick = (e) => { g.audio.setMuted(!g.audio.muted); e.target.textContent = g.audio.muted ? 'Sound: Off' : 'Sound: On'; g.data.d.settings.muted = g.audio.muted; g.data.save(); };
    $('m-gfx').onclick = (e) => { g.setLowGfx(!g.lowGfx); e.target.textContent = g.lowGfx ? 'Graphics: Low' : 'Graphics: High'; };
    $('m-badges').onclick = () => this.showBadges();
    $('m-help').onclick = () => { $('help').classList.toggle('show'); };
    $('m-skip').onclick = () => { if (g.round.phase === 'intermission') g.round.timer = Math.min(g.round.timer, 1); this.toggleMenu(false); };
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggleMenu();
      if (this.el.menu.classList.contains('show') && e.key.toLowerCase() === 'r') { this.toggleMenu(false); if (g.player.alive) g.player.die('reset'); }
    });
    $('m-mute').textContent = g.audio.muted ? 'Sound: Off' : 'Sound: On';
  }

  toggleMenu(force) {
    const m = this.el.menu;
    const show = force ?? !m.classList.contains('show');
    m.classList.toggle('show', show);
    if (!show) { $('help').classList.remove('show'); $('badge-list').classList.remove('show'); }
    if (show && document.pointerLockElement) document.exitPointerLock();
  }

  showBadges() {
    const l = $('badge-list');
    l.innerHTML = Object.entries(BADGES).map(([id, b]) => `<div class="bl ${this.g.data.hasBadge(id) ? 'got' : ''}"><span>${b.icon}</span><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div></div>`).join('');
    l.classList.toggle('show');
  }

  bindShop() {
    const g = this.g;
    const items = {
      balloon: { icon: '🎈', name: 'Green Balloon', price: '80 R$', desc: 'Hold it to float: jumps go about 3× higher and you fall slowly. Pops if you go too high.' },
      apple: { icon: '🍎', name: 'Red Apple', price: '80 R$', desc: 'Click while holding it to eat: restores 15% health, 8 s cooldown. Counters acid, cold, fire, virus and water damage.' },
      compass: { icon: '🧭', name: 'Yellow Compass', price: '60 R$', desc: 'Vote between 3 random maps during every intermission.' },
      hammer: { icon: '🔨', name: 'Blue Hammer', price: 'Free', desc: 'Click a structure part to knock it loose. Lost when you die. Up to 12 per day.' },
      multi: { icon: '🌩️', name: 'Multi-Disaster', price: '75 R$', desc: 'Adds an extra disaster to the next round (stacks up to 7). Use the Weather Machine in the lobby.' },
    };
    for (const btn of document.querySelectorAll('[data-shop]')) {
      btn.onclick = (e) => {
        e.stopPropagation();
        const k = btn.dataset.shop, it = items[k];
        const m = this.el.shop;
        const owned = k === 'multi' ? false : k === 'hammer' ? g.player.items.hammer || g.player.items.hammerPending : g.player.items[k];
        m.innerHTML = `<div class="sm-card"><div class="sm-icon">${it.icon}</div><div class="sm-name">${it.name}</div>
          <div class="sm-price"><s>${it.price}</s> <b>FREE on this site</b></div><div class="sm-desc">${it.desc}</div>
          <div class="sm-btns"><button class="sm-get" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : k === 'hammer' ? 'Get Hammer' : k === 'multi' ? 'Add Disaster' : 'Get'}</button><button class="sm-close">Close</button></div></div>`;
        m.classList.add('show');
        m.querySelector('.sm-close').onclick = () => m.classList.remove('show');
        m.querySelector('.sm-get').onclick = () => {
          if (k === 'multi') { if (g.round.addMulti()) this.toast(`Weather Machine: ${g.round.multi} extra disaster${g.round.multi > 1 ? 's' : ''} queued`); else this.toast('The Weather Machine is maxed out (7)!'); }
          else if (k === 'hammer') {
            const today = new Date().toDateString();
            const ha = g.data.d.hammerAds;
            if (ha.day !== today) { ha.day = today; ha.n = 0; }
            if (ha.n >= 12) { this.toast('Daily hammer limit reached (12/day).'); }
            else { ha.n++; g.data.save(); g.player.items.hammer = true; this.toast('You got the Blue Hammer! (lost on death)'); }
          } else { g.player.items[k] = true; g.data.d.items[k] = true; g.data.save(); this.toast(`${it.name} unlocked!`); }
          g.audio.chime();
          m.classList.remove('show');
        };
      };
    }
  }
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export { MAPS };
