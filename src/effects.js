// Sky, lighting, fog, weather particles, explosions, flames, lightning.
import * as THREE from 'three';
import { clamp, lerp, rand } from './util.js';

export const SKY_PRESETS = {
  clear:   { top: 0x3f8fe0, bottom: 0xbfe3ff, fog: 0xbfe3ff, fogNear: 1400, fogFar: 3600, sun: 1.9, amb: 1.35, cloud: 0xffffff, cloudOpacity: 0.95 },
  dark:    { top: 0x2b3038, bottom: 0x5a616b, fog: 0x4c535c, fogNear: 120, fogFar: 700, sun: 0.7, amb: 0.65, cloud: 0x3a3f46, cloudOpacity: 1 },
  acid:    { top: 0x262d22, bottom: 0x4e5a45, fog: 0x495440, fogNear: 110, fogFar: 650, sun: 0.65, amb: 0.65, cloud: 0x343b30, cloudOpacity: 1 },
  white:   { top: 0xdfe6ec, bottom: 0xf5f8fa, fog: 0xeef2f5, fogNear: 10, fogFar: 170, sun: 1.0, amb: 1.1, cloud: 0xffffff, cloudOpacity: 1 },
  snowy:   { top: 0xb9c7d4, bottom: 0xe9eef2, fog: 0xdfe6ec, fogNear: 80, fogFar: 520, sun: 1.3, amb: 1.0, cloud: 0xf2f4f7, cloudOpacity: 1 },
  yellow:  { top: 0xb08a4a, bottom: 0xdcbf86, fog: 0xd6b679, fogNear: 15, fogFar: 230, sun: 1.2, amb: 1.0, cloud: 0xc9a466, cloudOpacity: 1 },
  volcano: { top: 0x3d2b25, bottom: 0x8a5a3c, fog: 0x7a5a48, fogNear: 150, fogFar: 900, sun: 1.1, amb: 0.8, cloud: 0x4a3a34, cloudOpacity: 1 },
};

// Roblox's default sky: a blue gradient with soft painted cumulus clouds and a big
// sun with a glow (all procedural: no images)
const skyVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const skyFrag = `uniform vec3 top; uniform vec3 bottom; uniform vec3 camPos; uniform vec3 sunDir; uniform vec3 cloudCol;
uniform float cloudAmt; uniform float sunAmt; uniform float cover; uniform float time; varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec3 d = normalize(vW - camPos);
  float h = d.y;
  vec3 col = mix(bottom, top, clamp(h * 1.6 + 0.15, 0.0, 1.0));
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.96, 0.85) * (smoothstep(0.9963, 0.998, s) * 1.6 + pow(s, 60.0) * 0.35 + pow(s, 8.0) * 0.08) * sunAmt;
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.3 + vec2(time * 0.004, time * 0.0016);
    float n = fbm(uv);
    float c = smoothstep(0.5 - cover, 0.7 - cover, n) * smoothstep(0.0, 0.14, h);
    float lit = smoothstep(0.45, 0.85, fbm(uv * 1.8 + 3.7));
    vec3 cc = mix(cloudCol * 0.8, cloudCol, lit) + vec3(1.0, 0.97, 0.9) * pow(s, 20.0) * 0.25 * sunAmt;
    col = mix(col, cc, c * cloudAmt);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _bp = new THREE.Vector3(), _bv = new THREE.Vector3(), _c3 = new THREE.Color();

const pVert = `attribute float size; attribute float alpha; attribute vec3 tint;
uniform float scale; varying vec3 vTint; varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vTint = tint; vAlpha = alpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(0.5, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const pFrag = `uniform sampler2D map; varying vec3 vTint; varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vTint * t.rgb, t.a * vAlpha);
  if (gl_FragColor.a < 0.01) discard;
  #include <fog_fragment>
}`;

// Ring buffer of camera-facing soft particles drawn as one THREE.Points.
class Particles {
  constructor(scene, map, blending, cap) {
    this.cap = cap; this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.tint = new Float32Array(cap * 3);
    this.size = new Float32Array(cap); this.alpha = new Float32Array(cap);
    this.vel = new Float32Array(cap * 3); this.age = new Float32Array(cap); this.life = new Float32Array(cap);
    this.s0 = new Float32Array(cap); this.s1 = new Float32Array(cap); this.a0 = new Float32Array(cap);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: map }, scale: { value: 400 } }]);
    this.uniforms.map.value = map;
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: pVert, fragmentShader: pFrag, transparent: true, depthWrite: false, blending, fog: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.geo = geo;
    this.live = 0;
    scene.add(this.points);
  }
  emit(p, color, size0, size1, life, vel, alpha = 1) {
    const i = this.next; this.next = (this.next + 1) % this.cap;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    _c3.set(color);
    this.tint[i * 3] = _c3.r; this.tint[i * 3 + 1] = _c3.g; this.tint[i * 3 + 2] = _c3.b;
    this.vel[i * 3] = vel ? vel.x : 0; this.vel[i * 3 + 1] = vel ? vel.y : 0; this.vel[i * 3 + 2] = vel ? vel.z : 0;
    this.age[i] = 0; this.life[i] = life; this.s0[i] = size0; this.s1[i] = size1; this.a0[i] = alpha;
    this.size[i] = size0; this.alpha[i] = alpha;
    this.live = Math.min(this.cap, this.live + 1);
  }
  update(dt, camera) {
    this.uniforms.scale.value = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
    let any = false;
    for (let i = 0; i < this.cap; i++) {
      if (this.alpha[i] <= 0) continue;
      any = true;
      const a = (this.age[i] += dt);
      const k = a / this.life[i];
      if (k >= 1) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      this.alpha[i] = this.a0[i] * (1 - k);
    }
    if (!any && !this.dirty) return;
    this.dirty = any;
    for (const n of ['position', 'tint', 'size', 'alpha']) this.geo.attributes[n].needsUpdate = true;
  }
  clear() { this.alpha.fill(0); this.size.fill(0); this.dirty = true; }
}

export class Effects {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.scene = scene;
    this.skyUniforms = {
      top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, camPos: { value: new THREE.Vector3() },
      sunDir: { value: new THREE.Vector3() }, cloudCol: { value: new THREE.Color() }, cloudAmt: { value: 1 }, sunAmt: { value: 1 }, cover: { value: 0 }, time: { value: 0 },
    };
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
    this.skyUniforms.sunDir.value.copy(this.sunDir);


    this.cur = { ...SKY_PRESETS.clear };
    this.target = SKY_PRESETS.clear;
    this.applyNow(SKY_PRESETS.clear);

    this.flashT = 0;
    this.weather = {};
    this.flameTex = radialTexture([[0, 'rgba(255,255,200,1)'], [0.25, 'rgba(255,190,60,0.95)'], [0.6, 'rgba(255,80,0,0.5)'], [1, 'rgba(255,0,0,0)']]);
    this.smokeTex = radialTexture([[0, 'rgba(80,80,80,0.6)'], [1, 'rgba(60,60,60,0)']]);
    this.sparkTex = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
    this.smoke = new Particles(scene, this.sparkTex, THREE.NormalBlending, game.lowGfx ? 1500 : 3500);
    this.fire = new Particles(scene, this.flameTex, THREE.AdditiveBlending, 800);
    this.flames = new Map();   // part -> { level, sprites }
    this.flameLevels = new Map();
    this.burning = new Set();
    this.scorches = [];
    this.boltGeo = new THREE.BoxGeometry(1, 1, 1);
    this.scorchGeo = new THREE.PlaneGeometry(1, 1);
    this.scorchTex = radialTexture([[0, 'rgba(20,16,14,0.9)'], [0.55, 'rgba(30,24,20,0.6)'], [1, 'rgba(30,24,20,0)']]);
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
    this.skyUniforms.cloudCol.value.set(c.cloud);
    this.skyUniforms.cloudAmt.value = c.cloudOpacity ?? 1;
    // the sun shows through on clear days and fades out under storm clouds
    this.skyUniforms.sunAmt.value = Math.max(0, Math.min(1, (c.sun - 0.9) / 1.0));
    this.skyUniforms.cover.value = Math.max(0, Math.min(0.42, (1.35 - c.sun) / 1.2));   // storms are overcast
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
    const count = (this.game.lowGfx ? 1500 : 3500) * (kind === 'sand' ? 1.6 : 1) | 0;
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
      // acid rain looks like rain: it is the bricks that change colour
      const color = kind === 'acid' ? 0xc4d8b4 : kind === 'sand' ? 0xf0dcae : 0xaac8e8;
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
  // All puffs, sparks and explosion flashes go through two pooled particle systems
  // (normal + additive) so a busy disaster costs two draw calls, not hundreds.
  burst(pos, { color = 0xffa040, size = 8, life = 0.6, smoke = true, count = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const p = _bp.copy(pos).add(_bv.set((Math.random() - .5) * size * .3, (Math.random() - .5) * size * .3, (Math.random() - .5) * size * .3));
      this.fire.emit(p, color, size * 0.3, size * 1.2, life, null);
    }
    if (smoke) this.smoke.emit(pos, 0x5a5a5a, size * 0.5, size * 1.9, life * 3, _bv.set(0, 6, 0), 0.75);
  }

  puff(pos, color, size = 1.2, life = 1.2, vel = null) {
    this.smoke.emit(pos, color, size, size, life, vel, 1);
  }

  // Persistent flames on a part. level 1 = burning (hurts on touch),
  // level 2 = small flames: the part is heating up and about to catch fire.
  setFlame(part, level) {
    level = level === true ? 1 : (level || 0);
    // `burning` tracks every part on fire (touching it hurts) even when the sprite cap is hit
    if (level === 1) this.burning.add(part); else this.burning.delete(part);
    if (part.nid != null && (this.flameLevels.get(part) || 0) !== level) this.game.net?.onFlame(part, level);
    if (level) this.flameLevels.set(part, level); else this.flameLevels.delete(part);
    const cur = this.flames.get(part);
    if (cur && (!level || cur.level !== level)) {
      for (const sp of cur.sprites) { this.scene.remove(sp); sp.material.dispose(); }
      this.flames.delete(part);
    }
    if (!level || this.flames.has(part)) return;
    if (this.flames.size > (this.game.lowGfx ? 70 : 160)) return;
    const base = Math.min(10, Math.max(3, Math.max(part.size.x, part.size.z) * 0.9)) * (level === 2 ? 0.35 : 1);
    const n = level === 2 || this.game.lowGfx ? 1 : 3;
    const sprites = [];
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.userData.base = base * (i ? 0.7 : 1);
      sp.userData.off = new THREE.Vector3(i ? (Math.random() - .5) * part.size.x * 0.6 : 0, 0, i ? (Math.random() - .5) * part.size.z * 0.6 : 0);
      sp.userData.ph = Math.random() * 10;
      this.scene.add(sp);
      sprites.push(sp);
    }
    this.flames.set(part, { level, sprites });
  }
  flameLevel(part) { return this.flameLevels.get(part) || 0; }

  updateFlames() {
    const t = this.game.time;
    for (const [part, f] of this.flames) {
      if (!part.alive) { this.setFlame(part, 0); continue; }
      const p = part.body.translation();
      for (const sp of f.sprites) {
        const b = sp.userData.base;
        const k = 0.8 + Math.sin(t * 13 + part.id + sp.userData.ph) * 0.14 + Math.random() * 0.08;
        sp.position.set(p.x + sp.userData.off.x, p.y + part.size.y / 2 + b * 0.45 * k, p.z + sp.userData.off.z);
        sp.scale.set(b * k, b * 1.5 * k, 1);
      }
      if (f.level === 1 && Math.random() < 0.035) this.puff(new THREE.Vector3(p.x, p.y + part.size.y / 2 + 4, p.z), 0x3a3a3a, 5, 3, new THREE.Vector3((Math.random() - .5) * 2, 7, (Math.random() - .5) * 2));
    }
  }

  // Lightning: a jagged bolt with a couple of side branches, drawn as thin glowing
  // boxes so it reads at any distance, plus a sky flash.
  lightning(from, to, color = 0xfff27a) {
    const objs = [];
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, fog: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffc8, transparent: true, opacity: 0.35, fog: false, depthWrite: false });
    const seg = (a, b, w) => {
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(this.boltGeo, mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.scale.set(w, len, w);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const gl = new THREE.Mesh(this.boltGeo, glowMat);
      gl.position.copy(m.position); gl.quaternion.copy(m.quaternion); gl.scale.set(w * 4, len, w * 4);
      this.scene.add(m, gl);
      objs.push(m, gl);
    };
    const path = (a, b, n, jag, w, branches) => {
      let prev = a;
      for (let i = 1; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        if (i < n) { p.x += (Math.random() - .5) * jag; p.z += (Math.random() - .5) * jag; p.y += (Math.random() - .5) * jag * 0.3; }
        seg(prev, p, w);
        if (branches && i > 2 && i < n - 2 && Math.random() < 0.25) {
          const end = p.clone().add(new THREE.Vector3((Math.random() - .5) * 40, -20 - Math.random() * 40, (Math.random() - .5) * 40));
          path(p, end, 5, jag * 0.6, w * 0.5, false);
        }
        prev = p;
      }
    };
    path(from, to, 16, 14, 0.7, true);
    this.bolts.push({ objs, mats: [mat, glowMat], t: 0 });
    this.flashT = 0.3;
  }

  // dark mark left on the ground by impacts (meteors, lightning, lava)
  scorch(pos, r = 4) {
    const m = new THREE.Mesh(this.scorchGeo, new THREE.MeshBasicMaterial({ map: this.scorchTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, pos.y + 0.06, pos.z);
    m.scale.setScalar(r * 2);
    m.renderOrder = 1;
    this.scene.add(m);
    this.scorches.push({ m, t: 0 });
    if (this.scorches.length > 80) { const o = this.scorches.shift(); this.scene.remove(o.m); o.m.material.dispose(); }
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
      const f = Math.max(0, 1 - b.t / 0.45) * (Math.random() < 0.3 ? 0.35 : 1);
      b.mats[0].opacity = f; b.mats[1].opacity = f * 0.35;
      if (b.t > 0.45) { for (const o of b.objs) this.scene.remove(o); for (const m of b.mats) m.dispose(); this.bolts.splice(i, 1); }
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.t += dt;
      if (s.t > 40) { s.m.material.opacity = Math.max(0, 0.85 - (s.t - 40) / 8); if (s.t > 48) { this.scene.remove(s.m); s.m.material.dispose(); this.scorches.splice(i, 1); } }
    }
    const cam = this.game.camera.position;
    this.sky.position.copy(cam);
    this.skyUniforms.camPos.value.copy(cam);
    this.skyUniforms.time.value = this.game.time % 10000;
    // shadow camera follows the subject
    const focus = this.game.camController.target;
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 350);
    this.sun.target.position.copy(focus);
    this.updateWeather(dt);
    this.fire.update(dt, this.game.camera);
    this.smoke.update(dt, this.game.camera);
    this.updateFlames();
  }

  reset() {
    for (const k of Object.keys(this.weather)) this.setWeather(k, false);
    for (const p of [...this.flames.keys()]) this.setFlame(p, 0);
    this.flameLevels.clear();
    this.burning.clear();
    for (const s of this.scorches) { this.scene.remove(s.m); s.m.material.dispose(); }
    this.scorches = [];
    this.setSky('clear');
  }
}
