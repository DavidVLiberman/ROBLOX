// Saved data per player (localStorage): Survivals, streak, badges, items.
const KEY = 'nds-web-save-v1';

export const BADGES = {
  survive1: { name: 'Survived a Disaster', desc: 'Survive a round', icon: '🥉' },
  survive10: { name: 'Survived 10 Disasters', desc: 'Survive 10 rounds', icon: '🥈' },
  survive25: { name: 'Survived 25 Disasters', desc: 'Survive 25 rounds', icon: '🥇' },
  survive50: { name: 'Survived 50 Disasters', desc: 'Survive 50 rounds', icon: '🏅' },
  survive100: { name: 'Survived 100 Disasters', desc: 'Survive 100 rounds', icon: '🎖️' },
  survive200: { name: 'Survived 200 Disasters', desc: 'Survive 200 rounds', icon: '🏆' },
  survive400: { name: 'Survived 400 Disasters', desc: 'Survive 400 rounds', icon: '👑' },
  survive1000: { name: 'Survived 1000 Disasters', desc: 'Survive 1000 rounds', icon: '💎' },
  streak5: { name: 'High Survive Five!', desc: 'Survive 5 rounds in a row', icon: '🖐️' },
  closecall: { name: 'Close Call', desc: 'Survive a round with 10 health or less', icon: '😰' },
  chance: { name: 'Chance', desc: 'Get killed by the final lightning strike of a Thunder Storm', icon: '⚡' },
  surfsup: { name: "Surf's Up!", desc: 'Survive Tsunami on Surf Central', icon: '🏄' },
  barnfire: { name: 'Barn Fire', desc: 'Survive Fire on Sunny Ranch', icon: '🔥' },
  houseflood: { name: 'House Flood', desc: 'Survive Flash Flood on Happy Home', icon: '🏠' },
  choppa: { name: 'GET TO THE CHOPPA!', desc: 'Survive Thunder Storm inside the helicopter on Fort Indestructible', icon: '🚁' },
  trailer: { name: 'Tornado vs. Trailer Park', desc: 'Survive Tornado on Trailer Park', icon: '🌪️' },
  rocket: { name: 'Rocket Escape!', desc: 'Launch the rocket on Launch Land', icon: '🚀' },
  multi2: { name: 'Survive Power 2 Multi-Disaster', desc: 'Survive a round with 2 disasters at once', icon: '2️⃣' },
  multi3: { name: 'Survive Power 3 Multi-Disaster', desc: 'Survive a round with 3 disasters at once', icon: '3️⃣' },
  multi4: { name: 'Survive Power 4 Multi-Disaster', desc: 'Survive a round with 4 disasters at once', icon: '4️⃣' },
  multi5: { name: 'Survive Power 5 Multi-Disaster', desc: 'Survive a round with 5 disasters at once', icon: '5️⃣' },
  multi6: { name: 'Survive Power 6 Multi-Disaster', desc: 'Survive a round with 6 disasters at once', icon: '6️⃣' },
  multi7: { name: 'Survive Power 7 Multi-Disaster', desc: 'Survive a round with 7 disasters at once', icon: '7️⃣' },
};

// map + disaster combos that award a badge (GET TO THE CHOPPA! also needs the
// helicopter, so round.js checks that one itself)
export const COMBO_BADGES = [
  ['Surf Central', 'Tsunami', 'surfsup'],
  ['Sunny Ranch', 'Fire', 'barnfire'],
  ['Happy Home', 'Flash Flood', 'houseflood'],
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
