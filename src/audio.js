// All sounds are synthesized with WebAudio (no external assets).
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.loops = {};
    this.muted = false;
    this.volume = 0.7;
    this.fxLevel = 0.35;   // disaster effects are much quieter than UI sounds
  }

  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    // separate bus for disaster / world effects
    this.fx = this.ctx.createGain();
    this.fx.gain.value = this.fxLevel;
    this.fx.connect(this.master);
    // soften harsh peaks (explosions, thunder) so nothing blasts
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.25;
    this.fx.disconnect(); this.fx.connect(comp); comp.connect(this.master);
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

  noise(type, dur, { filter = 'lowpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, freqEnd = null, pos = null, delay = 0, ui = false } = {}) {
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
    src.connect(f); f.connect(g); g.connect(ui ? this.master : this.fx);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  tone(freq, dur, { type = 'sine', gain = 0.3, freqEnd = null, attack = 0.01, delay = 0, pos = null, ui = false } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.att(pos), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ui ? this.master : this.fx);
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
    src.connect(f); f.connect(g); g.connect(name === 'ocean' ? this.master : this.fx);
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
  eat() { for (let i = 0; i < 3; i++) this.noise('white', 0.07, { filter: 'bandpass', freq: 2200, q: 3, gain: 0.3, delay: i * 0.12, ui: true }); }
  click() { this.tone(900, 0.06, { type: 'square', gain: 0.05, ui: true }); }
  // A short synthesized "oof"-like grunt (not the original asset).
  // a short vocal "oof" when someone dies (sound-alike of the classic death sound)
  oof(pos) {
    if (!this.ctx) return;
    this.voice(330, 175, 0.3, { gain: 0.5, formant: 560, q: 3.2, pos });
    this.voice(660, 350, 0.26, { gain: 0.12, formant: 1100, q: 4, pos });
  }
  warning() {
    // ominous sting: low minor chord swell
    for (const [f, d] of [[110, 0], [130.8, 0], [164.8, 0], [55, 0]]) this.tone(f, 2.2, { type: 'sawtooth', gain: 0.05, attack: 0.25, delay: d, ui: true });
    this.tone(880, 0.35, { type: 'square', gain: 0.04, ui: true });
    this.tone(660, 0.5, { type: 'square', gain: 0.04, delay: 0.18, ui: true });
  }
  chime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.2, { type: 'sine', gain: 0.18, delay: i * 0.12, ui: true }));
  }
  badge() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.15, delay: i * 0.09, ui: true })); }
  lava(pos) { this.noise('brown', 0.5, { freq: 300, gain: 0.5, pos }); }

  // ---- lobby / round GUI sounds (sound-alikes, synthesized) ----
  // A crowd clapping: lots of short, bright noise bursts that swell and die away.
  applause(dur = 3.2) {
    if (!this.ctx) return;
    const n = Math.round(dur * 34);
    for (let i = 0; i < n; i++) {
      const t = Math.pow(Math.random(), 1.35) * dur;
      const env = Math.min(1, t / 0.35) * Math.max(0.15, 1 - t / dur);
      this.noise('white', 0.035 + Math.random() * 0.03, { filter: 'bandpass', freq: 900 + Math.random() * 1900, q: 1.4, gain: (0.06 + Math.random() * 0.1) * env, attack: 0.002, delay: t, ui: true });
    }
    this.noise('white', dur, { filter: 'bandpass', freq: 1500, q: 0.5, gain: 0.025, attack: 0.3, ui: true });
  }
  // the Power Up Machine winding up (bought a power-up) / winding down (round used it)
  powerUp(pos = null) {
    this.tone(160, 0.7, { type: 'sawtooth', gain: 0.07, freqEnd: 900, attack: 0.03, pos, ui: !pos });
    this.tone(320, 0.7, { type: 'square', gain: 0.03, freqEnd: 1800, attack: 0.03, pos, ui: !pos });
    [988, 1319, 1760].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', gain: 0.07, delay: 0.55 + i * 0.07, pos, ui: !pos }));
  }
  powerDown(pos = null) {
    this.tone(900, 1.1, { type: 'sawtooth', gain: 0.06, freqEnd: 90, attack: 0.02, pos, ui: !pos });
    this.tone(450, 1.1, { type: 'square', gain: 0.025, freqEnd: 45, attack: 0.02, pos, ui: !pos });
    this.noise('brown', 0.8, { freq: 600, freqEnd: 120, gain: 0.15, delay: 0.3, pos, ui: !pos });
  }
  // party popper for the welcome screen's confetti
  confettiPop() {
    this.noise('white', 0.09, { filter: 'highpass', freq: 900, gain: 0.5, attack: 0.002, ui: true });
    this.tone(180, 0.12, { type: 'sine', gain: 0.25, freqEnd: 60, ui: true });
    for (let i = 0; i < 6; i++) this.tone(2000 + Math.random() * 2500, 0.18, { type: 'triangle', gain: 0.04, delay: 0.08 + Math.random() * 0.35, ui: true });
  }

  // ---- disaster sounds (sound-alikes, synthesized) ----
  // Let a loop ring on for `hold` seconds after its disaster ends, then fade out over
  // `fade` seconds. It leaves this.loops at once, so stopLoops() at the end of the
  // round doesn't cut it short (the tornado's roar dies away like this).
  fadeLoop(name, hold = 2, fade = 5) {
    const l = this.loops[name];
    if (!this.ctx || !l) return;
    delete this.loops[name];
    const t = this.ctx.currentTime, v = l.g.gain.value;
    l.g.gain.cancelScheduledValues(t);
    l.g.gain.setValueAtTime(v, t);
    l.g.gain.setValueAtTime(v, t + hold);
    l.g.gain.linearRampToValueAtTime(0, t + hold + fade);
    l.src.stop(t + hold + fade + 0.1);
  }
  // a voiced sound: a buzzy tone through a vowel-like filter, gliding in pitch
  voice(f0, f1, dur, { gain = 0.2, formant = 800, q = 4, delay = 0, pos = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = formant; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.att(pos), t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.fx);
    o.start(t); o.stop(t + dur + 0.05);
    this.noise('white', dur, { filter: 'bandpass', freq: formant * 1.6, q: 1.5, gain: gain * 0.5, attack: dur * 0.5, delay, pos });
  }
  // "ah... ah... CHOO!"
  sneeze(pos) {
    this.voice(300, 420, 0.32, { gain: 0.16, formant: 850, pos });
    this.voice(330, 520, 0.38, { gain: 0.2, formant: 900, delay: 0.38, pos });
    this.noise('white', 0.3, { filter: 'bandpass', freq: 2800, q: 0.9, gain: 0.75, attack: 0.004, delay: 0.82, pos });
    this.noise('white', 0.22, { filter: 'lowpass', freq: 1100, gain: 0.45, attack: 0.004, delay: 0.84, pos });
  }
  // a cat's tiny sneeze: a quick high squeak and a little puff of air
  catSneeze(pos) {
    this.tone(1300, 0.09, { type: 'triangle', gain: 0.12, freqEnd: 1900, pos });
    this.noise('white', 0.12, { filter: 'highpass', freq: 3500, gain: 0.5, attack: 0.003, delay: 0.1, pos });
    this.tone(2100, 0.06, { type: 'sine', gain: 0.08, freqEnd: 1500, delay: 0.11, pos });
  }

  // ---- character sounds (RbxCharacterSounds sound-alikes) ----
  footstep(pos) {
    this.noise('white', 0.055, { filter: 'bandpass', freq: 2300, q: 1.3, gain: 0.32, attack: 0.003, pos });
    this.tone(150, 0.05, { type: 'sine', gain: 0.07, freqEnd: 90, attack: 0.003, pos });
  }
  jump(pos) {
    this.noise('white', 0.17, { filter: 'bandpass', freq: 450, freqEnd: 1500, q: 1.1, gain: 0.28, attack: 0.01, pos });
  }
  land(pos, k = 1) {
    this.noise('brown', 0.25, { filter: 'lowpass', freq: 380, gain: 0.9 * k, attack: 0.004, pos });
    this.tone(85, 0.2, { type: 'sine', gain: 0.25 * k, freqEnd: 45, attack: 0.004, pos });
  }
  swimStroke(pos) {
    this.noise('white', 0.28, { filter: 'bandpass', freq: 1100, freqEnd: 420, q: 0.8, gain: 0.3, attack: 0.03, pos });
  }
  splash(pos) {
    this.noise('white', 0.55, { filter: 'lowpass', freq: 2600, freqEnd: 500, gain: 0.7, attack: 0.005, pos });
    this.noise('brown', 0.4, { filter: 'lowpass', freq: 600, gain: 0.6, attack: 0.005, pos });
  }
  // wind rushing past while falling fast (local player only)
  falling(on) { this.loop('falling', on, { type: 'white', filter: 'bandpass', freq: 650, q: 0.5, gain: 0.22 }); }
}
