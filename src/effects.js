// Sky, lighting, fog, weather particles, explosions, flames, lightning.
import * as THREE from 'three';
import { clamp, lerp, rand } from './util.js';

export const SKY_PRESETS = {
  clear:   { top: 0x3f8fe0, bottom: 0xbfe3ff, fog: 0xbfe3ff, fogNear: 300, fogFar: 1600, sun: 1.9, amb: 1.35, cloud: 0xffffff, cloudOpacity: 0.95 },
  dark:    { top: 0x2b3038, bottom: 0x5a616b, fog: 0x4c535c, fogNear: 120, fogFar: 700, sun: 0.7, amb: 0.65, cloud: 0x3a3f46, cloudOpacity: 1 },
  acid:    { top: 0x262d22, bottom: 0x4e5a45, fog: 0x495440, fogNear: 110, fogFar: 650, sun: 0.65, amb: 0.65, cloud: 0x343b30, cloudOpacity: 1 },
  white:   { top: 0xdfe6ec, bottom: 0xf5f8fa, fog: 0xeef2f5, fogNear: 10, fogFar: 170, sun: 1.0, amb: 1.1, cloud: 0xffffff, cloudOpacity: 1 },
  snowy:   { top: 0xb9c7d4, bottom: 0xe9eef2, fog: 0xdfe6ec, fogNear: 80, fogFar: 520, sun: 1.3, amb: 1.0, cloud: 0xf2f4f7, cloudOpacity: 1 },
  yellow:  { top: 0xb08a4a, bottom: 0xdcbf86, fog: 0xd6b679, fogNear: 15, fogFar: 230, sun: 1.2, amb: 1.0, cloud: 0xc9a466, cloudOpacity: 1 },
  volcano: { top: 0x3d2b25, bottom: 0x8a5a3c, fog: 0x7a5a48, fogNear: 150, fogFar: 900, sun: 1.1, amb: 0.8, cloud: 0x4a3a34, cloudOpacity: 1 },
};

const skyVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const skyFrag = `uniform vec3 top; uniform vec3 bottom; uniform vec3 camPos; varying vec3 vW;
void main(){ float h = normalize(vW - camPos).y; float t = clamp(h * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }`;

function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Effects {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.scene = scene;
    this.skyUniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, camPos: { value: new THREE.Vector3() } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    this.sky.renderOrder = -10;
    scene.add(this.sky);
    scene.fog = new THREE.Fog(0xbfe3ff, 300, 1600);

    this.hemi = new THREE.HemisphereLight(0xe4efff, 0x8a8470, 1.25);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 1; sc.far = 700;
    this.sun.shadow.mapSize.set(game.lowGfx ? 1024 : 2048, game.lowGfx ? 1024 : 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.4;
    scene.add(this.sun, this.sun.target);
    this.sunDir = new THREE.Vector3(-0.45, 1, 0.35).normalize();

    // clouds: flattened soft blobs
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8a8a8a, transparent: true, opacity: 0.95, fog: false });
    this.cloudMat = cloudMat;
    const blob = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(blob, cloudMat);
        m.scale.set(30 + rand() * 30, 10 + rand() * 6, 22 + rand() * 18);
        m.position.set(k * 30 - n * 15, rand() * 6, (rand() - .5) * 20);
        c.add(m);
      }
      const a = rand() * Math.PI * 2, r = 200 + rand() * 900;
      c.position.set(Math.cos(a) * r, 260 + rand() * 80, Math.sin(a) * r);
      this.clouds.add(c);
    }
    scene.add(this.clouds);

    this.cur = { ...SKY_PRESETS.clear };
    this.target = SKY_PRESETS.clear;
    this.applyNow(SKY_PRESETS.clear);

    this.flashT = 0;
    this.weather = {};
    this.flameTex = radialTexture([[0, 'rgba(255,255,200,1)'], [0.25, 'rgba(255,190,60,0.95)'], [0.6, 'rgba(255,80,0,0.5)'], [1, 'rgba(255,0,0,0)']]);
    this.smokeTex = radialTexture([[0, 'rgba(80,80,80,0.6)'], [1, 'rgba(60,60,60,0)']]);
    this.sparkTex = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
    this.bursts = [];
    this.flames = new Map();   // part -> sprite
    this.bolts = [];
  }

  setSky(name, instant = false) {
    this.target = SKY_PRESETS[name] || SKY_PRESETS.clear;
    this.skyName = name;
    if (instant) this.applyNow(this.target);
  }

  applyNow(p) {
    this.cur = { ...p };
    this.applyCur();
  }

  applyCur() {
    const c = this.cur;
    this.skyUniforms.top.value.set(c.top);
    this.skyUniforms.bottom.value.set(c.bottom);
    this.game.scene.fog.color.set(c.fog);
    this.game.scene.fog.near = c.fogNear;
    this.game.scene.fog.far = c.fogFar;
    this.sun.intensity = c.sun;
    this.hemi.intensity = c.amb;
    this.cloudMat.color.set(c.cloud);
  }

  // ---------- weather particles ----------
  // kind: rain | acid | snow | sand
  setWeather(kind, on, opts = {}) {
    if (!on) {
      const w = this.weather[kind];
      if (w) { this.scene.remove(w.obj); w.obj.geometry.dispose(); delete this.weather[kind]; }
      return;
    }
    if (this.weather[kind]) return;
    const count = this.game.lowGfx ? 1500 : 3500;
    const range = kind === 'sand' ? 120 : 90, height = 70;
    const pos = new Float32Array(count * 6);
    const seeds = [];
    for (let i = 0; i < count; i++) seeds.push([Math.random() * range * 2 - range, Math.random() * height, Math.random() * range * 2 - range, Math.random()]);
    const geo = new THREE.BufferGeometry();
    let obj;
    if (kind === 'snow') {
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, map: this.sparkTex, size: 0.9, transparent: true, opacity: 0.95, depthWrite: false }));
    } else {
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const color = kind === 'acid' ? 0x7dff4a : kind === 'sand' ? 0xf0dcae : 0xaac8e8;
      obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: kind === 'sand' ? 0.55 : 0.6, depthWrite: false }));
    }
    obj.frustumCulled = false;
    this.scene.add(obj);
    this.weather[kind] = { obj, seeds, range, height, kind, wind: opts.wind || new THREE.Vector3() };
  }

  updateWeather(dt) {
    const cam = this.game.camera.position;
    for (const w of Object.values(this.weather)) {
      const arr = w.obj.geometry.attributes.position.array;
      const n = w.seeds.length;
      let vy = -90, vx = 0, vz = 0, len = 2.2;
      if (w.kind === 'snow') { vy = -14; vx = w.wind.x * 0.6; vz = w.wind.z * 0.6; }
      if (w.kind === 'sand') { vy = -2; vx = w.wind.x * 3; vz = w.wind.z * 3; len = 0.12; }
      if (w.kind === 'acid') vy = -75;
      const t = this.game.time;
      for (let i = 0; i < n; i++) {
        const s = w.seeds[i];
        s[0] += vx * dt + (w.kind === 'snow' ? Math.sin(t * 2 + i) * dt * 2 : 0);
        s[1] += vy * dt;
        s[2] += vz * dt;
        if (s[1] < -5) s[1] += w.height;
        if (s[0] < -w.range) s[0] += w.range * 2; if (s[0] > w.range) s[0] -= w.range * 2;
        if (s[2] < -w.range) s[2] += w.range * 2; if (s[2] > w.range) s[2] -= w.range * 2;
        const x = cam.x + s[0], y = cam.y - 25 + s[1], z = cam.z + s[2];
        if (w.kind === 'snow') { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }
        else {
          arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
          arr[i * 6 + 3] = x - vx * dt * len * 3; arr[i * 6 + 4] = y - vy * 0.025 * (w.kind === 'sand' ? 0 : 1); arr[i * 6 + 5] = z - vz * dt * len * 3;
          if (w.kind === 'sand') { arr[i * 6 + 3] = x - vx * 0.08; arr[i * 6 + 5] = z - vz * 0.08; }
        }
      }
      w.obj.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ---------- one-shot effects ----------
  burst(pos, { color = 0xffa040, size = 8, life = 0.6, smoke = true, count = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * size * .3, (Math.random() - .5) * size * .3, (Math.random() - .5) * size * .3));
      sp.scale.setScalar(size * 0.3);
      this.scene.add(sp);
      this.bursts.push({ sp, t: 0, life, size, grow: true });
    }
    if (smoke) {
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false }));
      sm.position.copy(pos); sm.scale.setScalar(size * 0.5);
      this.scene.add(sm);
      this.bursts.push({ sp: sm, t: 0, life: life * 3, size: size * 1.6, grow: true, rise: 6 });
    }
  }

  puff(pos, color, size = 1.2, life = 1.2, vel = null) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color, transparent: true, depthWrite: false }));
    sp.position.copy(pos); sp.scale.setScalar(size);
    this.scene.add(sp);
    this.bursts.push({ sp, t: 0, life, size, vel });
  }

  updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1) { this.scene.remove(b.sp); b.sp.material.dispose(); this.bursts.splice(i, 1); continue; }
      if (b.grow) b.sp.scale.setScalar(b.size * (0.3 + k * 0.9));
      if (b.rise) b.sp.position.y += b.rise * dt;
      if (b.vel) b.sp.position.addScaledVector(b.vel, dt);
      b.sp.material.opacity = 1 - k;
    }
  }

  // Persistent flame on a burning part.
  setFlame(part, on) {
    if (on && !this.flames.has(part)) {
      if (this.flames.size > (this.game.lowGfx ? 70 : 160)) return;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const s = Math.min(10, Math.max(3, Math.max(part.size.x, part.size.z) * 0.9));
      sp.userData.base = s;
      sp.scale.set(s, s * 1.4, 1);
      this.scene.add(sp);
      this.flames.set(part, sp);
    } else if (!on && this.flames.has(part)) {
      const sp = this.flames.get(part);
      this.scene.remove(sp); sp.material.dispose();
      this.flames.delete(part);
    }
  }

  updateFlames() {
    const t = this.game.time;
    for (const [part, sp] of this.flames) {
      if (!part.alive) { this.setFlame(part, false); continue; }
      const p = part.body.translation();
      sp.position.set(p.x, p.y + part.size.y / 2 + sp.userData.base * 0.4, p.z);
      const f = 0.85 + Math.sin(t * 13 + part.id) * 0.12 + Math.random() * 0.06;
      sp.scale.set(sp.userData.base * f, sp.userData.base * 1.4 * f, 1);
      if (Math.random() < 0.02) this.puff(new THREE.Vector3(p.x, p.y + part.size.y / 2 + 3, p.z), 0x444444, 4, 2.5, new THREE.Vector3(0, 6, 0));
    }
  }

  lightning(from, to) {
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const p = from.clone().lerp(to, i / n);
      if (i > 0 && i < n) { p.x += (Math.random() - .5) * 8; p.z += (Math.random() - .5) * 8; }
      pts.push(p);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true }));
    const glow = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x9fc6ff, transparent: true, opacity: 0.5 }));
    glow.scale.set(1.02, 1, 1.02);
    this.scene.add(line, glow);
    this.bolts.push({ objs: [line, glow], t: 0 });
    this.flashT = 0.25;
  }

  update(dt) {
    // ease sky toward target
    const k = Math.min(1, dt * 0.6);
    const c = this.cur, tg = this.target;
    const mixC = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
    c.top = mixC(c.top, tg.top); c.bottom = mixC(c.bottom, tg.bottom); c.fog = mixC(c.fog, tg.fog);
    c.cloud = mixC(c.cloud, tg.cloud);
    c.fogNear = lerp(c.fogNear, tg.fogNear, k); c.fogFar = lerp(c.fogFar, tg.fogFar, k);
    c.sun = lerp(c.sun, tg.sun, k); c.amb = lerp(c.amb, tg.amb, k);
    this.applyCur();
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.hemi.intensity = c.amb + clamp(this.flashT * 12, 0, 3);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += dt;
      for (const o of b.objs) o.material.opacity = Math.max(0, 1 - b.t / 0.35) * (Math.random() < 0.3 ? 0.3 : 1);
      if (b.t > 0.35) { for (const o of b.objs) { this.scene.remove(o); o.geometry.dispose(); } this.bolts.splice(i, 1); }
    }
    const cam = this.game.camera.position;
    this.sky.position.copy(cam);
    this.skyUniforms.camPos.value.copy(cam);
    this.clouds.position.x = (this.game.time * 2) % 400 - 200;
    // shadow camera follows the subject
    const focus = this.game.camController.target;
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 350);
    this.sun.target.position.copy(focus);
    this.updateWeather(dt);
    this.updateBursts(dt);
    this.updateFlames();
  }

  reset() {
    for (const k of Object.keys(this.weather)) this.setWeather(k, false);
    for (const p of [...this.flames.keys()]) this.setFlame(p, false);
    this.setSky('clear');
  }
}
