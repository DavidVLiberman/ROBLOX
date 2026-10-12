// Classic R6 "Noob" avatar: yellow head & arms, blue torso, green legs,
// rounded cylinder head with the classic Smile face.
import * as THREE from 'three';
import { makeFaceTexture } from './materials.js';
import { BC } from './util.js';

export const NOOB_COLORS = { head: BC.brightYellow, torso: BC.brightBlue, arms: BC.brightYellow, legs: BC.yellowGreen };

const HEAD_R = 0.6, HEAD_H = 1.2;
let headGeom = null;
function getHeadGeom() {
  if (headGeom) return headGeom;
  // Rounded-cylinder profile like the Roblox "Head" mesh.
  const pts = [];
  const r = HEAD_R, h = HEAD_H, b = 0.2;
  pts.push(new THREE.Vector2(0.001, -h / 2));
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b));
  }
  pts.push(new THREE.Vector2(0.001, h / 2));
  // phiStart = PI puts u = 0.5 on the +z (front) side.
  headGeom = new THREE.LatheGeometry(pts, 32, Math.PI, Math.PI * 2);
  // Re-map v to height so the face texture is drawn in plain stud space.
  const pos = headGeom.attributes.position, uv = headGeom.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) + h / 2) / h);
  return headGeom;
}

const boxGeom = new THREE.BoxGeometry(1, 2, 1);
// Limb pivots at the top (shoulder/hip), so shift geometry down by 1.
const limbGeom = boxGeom.clone().translate(0, -1, 0);
const torsoGeom = new THREE.BoxGeometry(2, 2, 1);
const matCache = new Map();
function plastic(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0 }));
  return matCache.get(color);
}

export class Avatar {
  constructor(colors = NOOB_COLORS, name = '') {
    this.colors = colors;
    this.root = new THREE.Group();      // positioned at the feet
    this.body = new THREE.Group();      // allows tilting (swim) without moving root
    this.root.add(this.body);
    const torso = new THREE.Mesh(torsoGeom, plastic(colors.torso));
    torso.position.y = 3;
    this.torso = torso;
    const head = new THREE.Mesh(getHeadGeom(), new THREE.MeshStandardMaterial({
      map: makeFaceTexture(colors.head, Math.PI * 2 * HEAD_R, HEAD_H), roughness: 0.62,
    }));
    head.position.y = 4 + HEAD_H / 2;
    this.head = head;
    const mk = (color, x, y) => {
      const g = new THREE.Group(); g.position.set(x, y, 0);
      const m = new THREE.Mesh(limbGeom, plastic(color)); g.add(m);
      return g;
    };
    this.leftArm = mk(colors.arms, -1.5, 4);
    this.rightArm = mk(colors.arms, 1.5, 4);
    this.leftLeg = mk(colors.legs, -0.5, 2);
    this.rightLeg = mk(colors.legs, 0.5, 2);
    this.body.add(torso, head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.phase = 0;
    this.held = null;
    if (name) this.setNameTag(name);
  }

  setNameTag(name) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    this.tagCanvas = c;
    this.tagName = name;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.tagTex = tex;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true, sizeAttenuation: false }));
    sp.scale.set(0.2, 0.05, 1);
    sp.center.set(0.5, 0);
    sp.position.y = 5.6;
    sp.renderOrder = 5;
    this.tag = sp;
    this.root.add(sp);
    this.drawTag(1);
  }

  drawTag(healthFrac) {
    if (!this.tagCanvas) return;
    const ctx = this.tagCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    // Humanoid display: name above a health bar that only shows when hurt
    ctx.font = '600 24px Montserrat, "Gotham SSm", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineJoin = 'round';
    ctx.strokeText(this.tagName, 128, 26);
    ctx.fillStyle = '#fff'; ctx.fillText(this.tagName, 128, 26);
    if (healthFrac < 0.999) {
      // Humanoid health display: outlined bar in the Roblox health colour
      const f = Math.max(0, healthFrac);
      const c = f > 0.5 ? mixRGB([250, 235, 0], [27, 252, 107], (f - 0.5) * 2) : mixRGB([255, 28, 0], [250, 235, 0], f * 2);
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(79, 38, 98, 10);
      ctx.fillStyle = c; ctx.fillRect(81, 40, 94 * f, 6);
    }
    this.tagTex.needsUpdate = true;
  }

  // Holdable tool models attached to the right hand.
  hold(kind) {
    if (this.held) { this.rightArm.remove(this.held); this.held = null; }
    this.heldKind = kind;
    if (!kind) return;
    const g = makeToolModel(kind);
    const offs = { balloon: [0, -2, 0], apple: [0, -2.1, -0.6], hammer: [0, -2.1, 0.7], compass: [0, -2.1, -0.5] };
    g.position.set(...(offs[kind] || [0, -2.1, 0]));
    this.held = g;
    this.rightArm.add(g);
  }

  // state: idle | walk | jump | fall | climb | sit | swim
  // Mirrors the classic R6 "Animate" script: walking swings limbs with
  // amplitude 1 at frequency 9, climbing adds a PI offset to the arms,
  // jumping/falling raises both arms straight up, idle is a 0.1 sway at
  // frequency 1, and the shoulder/hip motors are speed-limited (MaxVelocity).
  animate(dt, state, speed) {
    this.t = (this.t || 0) + dt;
    let amp = 0.1, freq = 1, fudge = 0, maxVel = 0.15, la, ra, ll, rl, tilt = 0;
    if (state === 'walk') { amp = 1; freq = 9; }
    else if (state === 'climb') { amp = 1; freq = 9; fudge = Math.PI; maxVel = 0.5; }
    else if (state === 'swim') { amp = 1; freq = 6; fudge = Math.PI * 0.8; maxVel = 0.5; tilt = 1.2; }
    if (state === 'jump' || state === 'fall') {
      maxVel = 0.5; la = Math.PI; ra = Math.PI; ll = 0; rl = 0;
    } else if (state === 'sit') {
      maxVel = 0.15; la = ra = ll = rl = Math.PI / 2;
    } else {
      const a = amp * Math.sin(this.t * freq);
      ra = a + fudge; la = -a + fudge; rl = -a; ll = a;
      if (state === 'climb' || state === 'swim') { la = a + fudge; ra = -a + fudge; }
    }
    // tool held: right arm points forward ("toolnone"), balloon is held up high
    if (this.heldKind && state !== 'sit' && state !== 'jump' && state !== 'fall' && state !== 'climb') ra = Math.PI / 2;
    if (this.heldKind === 'balloon') ra = Math.PI;
    if (this.swing > 0) { ra = Math.PI / 2 + Math.sin(this.swing * Math.PI) * 1.2; this.swing -= dt * 3; maxVel = 1; }
    // Motor6D MaxVelocity is per 1/30 s step in the legacy engine
    const step = maxVel * 30 * dt;
    const mv = (cur, target) => cur + Math.max(-step, Math.min(step, target - cur));
    const L = this.leftArm.rotation, R = this.rightArm.rotation, LL = this.leftLeg.rotation, RL = this.rightLeg.rotation;
    // positive = forward swing; limbs hang along -y so forward is a negative X rotation
    L.x = mv(L.x, -la); R.x = mv(R.x, -ra); LL.x = mv(LL.x, -ll); RL.x = mv(RL.x, -rl);
    const k = Math.min(1, dt * 10);
    this.body.rotation.x += (tilt - this.body.rotation.x) * k;
    this.body.position.y = state === 'sit' ? -1.6 : (tilt ? 1.5 : 0);
  }

  setVisible(v) { this.body.visible = v; if (this.tag) this.tag.visible = v; }

  // Bounding info for spawning death debris (R6 "falls apart" on death).
  limbs() {
    this.root.updateMatrixWorld(true);
    const out = [];
    const add = (obj, size, color, centerOffset) => {
      const p = new THREE.Vector3(0, centerOffset, 0).applyMatrix4(obj.matrixWorld);
      const q = new THREE.Quaternion(); obj.getWorldQuaternion(q);
      out.push({ pos: p, rot: q, size, color });
    };
    add(this.torso, [2, 2, 1], this.colors.torso, 0);
    add(this.head, [1.2, 1.2, 1.2], this.colors.head, 0);
    add(this.leftArm, [1, 2, 1], this.colors.arms, -1);
    add(this.rightArm, [1, 2, 1], this.colors.arms, -1);
    add(this.leftLeg, [1, 2, 1], this.colors.legs, -1);
    add(this.rightLeg, [1, 2, 1], this.colors.legs, -1);
    return out;
  }
}

function mixRGB(a, b, t) { return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }

// Tool models (also used for the purchase prompt thumbnails).
export function makeToolModel(kind) {
  const g = new THREE.Group();
  if (kind === 'balloon') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 14), new THREE.MeshStandardMaterial({ color: 0x3fcf3f, roughness: 0.35 }));
    b.scale.y = 1.2; b.position.set(0, 6.5, 0);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    s.position.y = 3.8;
    g.add(b, s);
  } else if (kind === 'apple') {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd01c1c, roughness: 0.4 }));
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
    st.position.y = 0.45;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: 0x3f9a2f }));
    leaf.position.set(0.13, 0.55, 0); leaf.rotation.z = 0.4;
    g.add(a, st, leaf);
  } else if (kind === 'hammer') {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.6), new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x2f6fd8, metalness: 0.3 }));
    hd.rotation.y = Math.PI / 2; hd.position.z = 1.2;
    g.add(h, hd);
  } else if (kind === 'compass') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 20), new THREE.MeshStandardMaterial({ color: 0xf5cd30, metalness: 0.4, roughness: 0.4 }));
    c.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), new THREE.MeshStandardMaterial({ color: 0xf2f3f3 }));
    face.position.z = 0.08;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.02), new THREE.MeshBasicMaterial({ color: 0xc4281c }));
    needle.position.z = 0.1; needle.rotation.z = 0.5;
    g.add(c, face, needle);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
