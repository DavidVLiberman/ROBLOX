// Saved data per player (localStorage): Survivals, streak, badges, items.
const KEY = 'nds-web-save-v1';

export const BADGES = {
  welcome: { name: 'Welcome!', desc: 'Join the game', icon: '👋' },
  survive1: { name: 'Survivor', desc: 'Survive 1 round', icon: '🥉' },
  survive10: { name: 'Survive 10 Rounds', desc: 'Survive 10 rounds', icon: '🥈' },
  survive25: { name: 'Survive 25 Rounds', desc: 'Survive 25 rounds', icon: '🥇' },
  survive50: { name: 'Survive 50 Rounds', desc: 'Survive 50 rounds', icon: '🏅' },
  survive100: { name: 'Survive 100 Rounds', desc: 'Survive 100 rounds', icon: '🎖️' },
  survive200: { name: 'Survive 200 Rounds', desc: 'Survive 200 rounds', icon: '🏆' },
  survive400: { name: 'Survive 400 Rounds', desc: 'Survive 400 rounds', icon: '👑' },
  survive1000: { name: 'Survive 1000 Rounds', desc: 'Survive 1000 rounds', icon: '💎' },
  streak3: { name: 'Three in a Row', desc: 'Survive 3 rounds in a row', icon: '3️⃣' },
  streak5: { name: 'High Survive Five!', desc: 'Survive 5 rounds in a row', icon: '🖐️' },
  closecall: { name: 'Close Call', desc: 'Survive a round with under 10 HP', icon: '😰' },
  chance: { name: 'Chance', desc: 'Get killed by the final lightning strike of a Thunder Storm', icon: '⚡' },
  surfsup: { name: "Surf's Up!", desc: 'Survive Tsunami on Surf Central', icon: '🏄' },
  barnfire: { name: 'Barn Fire', desc: 'Survive Fire on Sunny Ranch', icon: '🔥' },
  houseflood: { name: 'House Flood', desc: 'Survive Flash Flood on Happy Home', icon: '🏠' },
  choppa: { name: 'GET TO THE CHOPPA!', desc: 'Survive Thunder Storm on Fort Indestructible', icon: '🚁' },
  trailer: { name: 'Tornado vs. Trailer Park', desc: 'Survive Tornado on Trailer Park', icon: '🌪️' },
  rocket: { name: 'Rocket Escape!', desc: 'Launch and ride the rocket on Launch Land', icon: '🚀' },
  multi2: { name: 'Multi-Disaster x2', desc: 'Survive 2 disasters at once', icon: '2️⃣' },
  multi3: { name: 'Multi-Disaster x3', desc: 'Survive 3 disasters at once', icon: '3️⃣' },
  multi4: { name: 'Multi-Disaster x4', desc: 'Survive 4 disasters at once', icon: '4️⃣' },
  multi5: { name: 'Multi-Disaster x5', desc: 'Survive 5 disasters at once', icon: '5️⃣' },
  multi6: { name: 'Multi-Disaster x6', desc: 'Survive 6 disasters at once', icon: '6️⃣' },
  multi7: { name: 'Multi-Disaster x7', desc: 'Survive 7 disasters at once', icon: '7️⃣' },
};

// map + disaster combos that award a badge
export const COMBO_BADGES = [
  ['Surf Central', 'Tsunami', 'surfsup'],
  ['Sunny Ranch', 'Fire', 'barnfire'],
  ['Happy Home', 'Flash Flood', 'houseflood'],
  ['Fort Indestructible', 'Thunder Storm', 'choppa'],
  ['Trailer Park', 'Tornado', 'trailer'],
];

export class SaveData {
  constructor() {
    this.d = { survivals: 0, streak: 0, bestStreak: 0, badges: {}, items: { balloon: false, apple: false, compass: false }, hammerAds: { day: '', n: 0 }, name: '', settings: {} };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.d = { ...this.d, ...JSON.parse(raw) };
    } catch { /* storage unavailable: play without saving */ }
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch { /* ignore */ }
  }
  hasBadge(id) { return !!this.d.badges[id]; }
  award(id) {
    if (this.d.badges[id] || !BADGES[id]) return false;
    this.d.badges[id] = Date.now();
    this.save();
    return true;
  }
}
