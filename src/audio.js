// All sounds are synthesized with WebAudio (no external assets).
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.loops = {};
    this.muted = false;
    this.volume = 0.7;
  }

  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.white = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.white.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.brown = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.loop('ocean', true, { type: 'brown', filter: 'lowpass', freq: 500, gain: 0.12, lfo: 0.15 });
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  // distance attenuation for positional one-shots
  att(pos) {
    if (!pos) return 1;
    const c = this.game.camera.position;
    const d = Math.hypot(pos.x - c.x, pos.y - c.y, pos.z - c.z);
    return Math.max(0.05, Math.min(1, 40 / (d + 10)));
  }

  noise(type, dur, { filter = 'lowpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, freqEnd = null, pos = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = type === 'brown' ? this.brown : this.white;
    src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    const peak = gain * this.att(pos);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  tone(freq, dur, { type = 'sine', gain = 0.3, freqEnd = null, attack = 0.01, delay = 0, pos = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.att(pos), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  loop(name, on, { type = 'white', filter = 'lowpass', freq = 800, q = 0.7, gain = 0.3, lfo = 0 } = {}) {
    if (!this.ctx) return;
    if (!on) {
      const l = this.loops[name];
      if (l) {
        const t = this.ctx.currentTime;
        l.g.gain.cancelScheduledValues(t);
        l.g.gain.setValueAtTime(l.g.gain.value, t);
        l.g.gain.linearRampToValueAtTime(0, t + 1.5);
        l.src.stop(t + 1.6);
        delete this.loops[name];
      }
      return;
    }
    if (this.loops[name]) { this.loops[name].g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 1); return; }
    const src = this.ctx.createBufferSource(); src.buffer = type === 'brown' ? this.brown : this.white; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 2);
    src.connect(f); f.connect(g); g.connect(this.master);
    if (lfo) {
      const o = this.ctx.createOscillator(); o.frequency.value = lfo;
      const og = this.ctx.createGain(); og.gain.value = freq * 0.6;
      o.connect(og); og.connect(f.frequency); o.start();
      src.onended = () => o.stop();
    }
    src.start();
    this.loops[name] = { src, g, f };
  }

  stopLoops(except = ['ocean']) {
    for (const k of Object.keys(this.loops)) if (!except.includes(k)) this.loop(k, false);
  }

  // ---- named sounds ----
  explosion(pos, big = 1) {
    this.noise('brown', 1.4 * big, { freq: 900, freqEnd: 80, gain: 0.9 * big, pos });
    this.tone(90, 0.6, { type: 'sine', gain: 0.6 * big, freqEnd: 30, pos });
  }
  thunder(pos) {
    this.noise('white', 0.25, { filter: 'highpass', freq: 1500, gain: 0.7, pos });
    this.noise('brown', 3.2, { freq: 600, freqEnd: 60, gain: 1.0, attack: 0.05, delay: 0.05 });
  }
  crash(pos) { this.noise('white', 0.35, { filter: 'bandpass', freq: 1800, q: 0.8, gain: 0.35, pos }); }
  glass(pos) { for (let i = 0; i < 3; i++) this.tone(2500 + Math.random() * 2000, 0.25, { type: 'triangle', gain: 0.08, delay: i * 0.04, pos }); }
  whistle(pos) { this.tone(1400, 1.1, { type: 'sine', gain: 0.1, freqEnd: 400, pos }); }
  cough(pos) {
    this.noise('white', 0.18, { filter: 'bandpass', freq: 700, q: 2, gain: 0.5, pos });
    this.noise('white', 0.16, { filter: 'bandpass', freq: 600, q: 2, gain: 0.4, delay: 0.22, pos });
  }
  pop(pos) { this.noise('white', 0.08, { filter: 'highpass', freq: 1200, gain: 0.6, pos }); }
  eat() { for (let i = 0; i < 3; i++) this.noise('white', 0.07, { filter: 'bandpass', freq: 2200, q: 3, gain: 0.3, delay: i * 0.12 }); }
  click() { this.tone(900, 0.06, { type: 'square', gain: 0.05 }); }
  // A short synthesized "oof"-like grunt (not the original asset).
  oof(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.28);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * this.att(pos), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
  }
  warning() {
    // ominous sting: low minor chord swell
    for (const [f, d] of [[110, 0], [130.8, 0], [164.8, 0], [55, 0]]) this.tone(f, 2.2, { type: 'sawtooth', gain: 0.07, attack: 0.25, delay: d });
    this.tone(880, 0.35, { type: 'square', gain: 0.05 });
    this.tone(660, 0.5, { type: 'square', gain: 0.05, delay: 0.18 });
  }
  chime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.2, { type: 'sine', gain: 0.18, delay: i * 0.12 }));
  }
  badge() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.15, delay: i * 0.09 })); }
  lava(pos) { this.noise('brown', 0.5, { freq: 300, gain: 0.5, pos }); }
}
