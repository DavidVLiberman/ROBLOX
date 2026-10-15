import * as THREE from 'three';
import { V, isHost, locals, inIsland, randomIslandPoint } from './common.js';
import { rand } from '../util.js';

const EDGE = 20;       // stays this far inside the edge of the grass
const N = 900, HEIGHT = 140;

// streaky swirl texture for the funnel walls
let swirlTex = null;
function swirl() {
  if (swirlTex) return swirlTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, len = 30 + Math.random() * 90;
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.35})`;
    ctx.lineWidth = 1 + Math.random() * 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 256, y); ctx.lineTo(x - 256 + len, y - len * 0.35); ctx.stroke();
  }
  swirlTex = new THREE.CanvasTexture(c);
  swirlTex.wrapS = swirlTex.wrapT = THREE.RepeatWrapping;
  return swirlTex;
}

// A grey-white funnel that wanders the island along a random path of waypoints (it never
// goes after anyone). Everything it touches is torn loose and spun up in a helix; players
// get thrown into the air. The host steers it; everyone sees it move.
export default {
  name: 'Tornado',
  warning: 'Tornado! Stay clear of its path!',
  duration: 90,
  bot: 'away-tornado',
  params() {
    const c = randomIslandPoint(EDGE + 10);
    return { x: Math.round(c.x), z: Math.round(c.z) };
  },
  preWarn(g) {
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 400, gain: 0.08, lfo: 0.2 });
  },
  start(g, st) {
    st.pos = V(st.p.x ?? 0, 0, st.p.z ?? 0);
    st.target = st.pos.clone();
    st.wp = this.waypoint(g, st.pos);
    st.t = 0;
    const group = new THREE.Group();
    const tex = swirl();
    st.layers = [];
    for (const [r0, r1, color, op, rep] of [[13, 50, 0xc3c8cf, 0.5, 3], [9, 40, 0x9ea5ae, 0.55, 2], [5, 28, 0x7c838c, 0.45, 2]]) {
      const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep, 1.5);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, HEIGHT, 32, 8, true),
        new THREE.MeshBasicMaterial({ color, map: t, alphaMap: t, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));
      m.position.y = HEIGHT / 2;
      group.add(m);
      st.layers.push(m);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshBasicMaterial({ color: 0x4f545b, transparent: true, opacity: 0.85, depthWrite: false }));
    cap.scale.set(80, 12, 80); cap.position.y = HEIGHT + 4;
    group.add(cap);
    st.group = group;
    // orbiting debris and dust
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    st.seeds = Array.from({ length: N }, () => [Math.random(), Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.6]);
    st.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd9e4ee, map: g.effects.smokeTex, size: 7, transparent: true, opacity: 0.85, depthWrite: false }));
    st.points.frustumCulled = false;
    g.scene.add(st.points, group);
    g.hazardPos = st.pos;
    g.audio.loop('tornado', true, { type: 'brown', freq: 380, q: 0.6, gain: 0.5, lfo: 0.5 });
  },
  // the next point on its random path: somewhere else on the island, not too close
  waypoint(g, from) {
    let best = null;
    for (let i = 0; i < 8; i++) {
      const p = randomIslandPoint(EDGE);
      if (!from || p.distanceTo(from) > 50) return p;
      if (!best || p.distanceTo(from) > best.distanceTo(from)) best = p;
    }
    return best;
  },
  radiusAt(y) { return 13 + Math.max(0, y) * 0.22; },
  netState(st) { return [Math.round(st.pos.x * 10) / 10, Math.round(st.pos.z * 10) / 10]; },
  applyNetState(g, st, s) { st.target.set(s[0], 0, s[1]); },
  update(g, st, dt) {
    st.t += dt;
    if (isHost(g)) {
      const to = st.wp.clone().sub(st.pos); to.y = 0;
      if (to.length() < 6) st.wp = this.waypoint(g, st.pos);
      else {
        // steer smoothly toward the waypoint instead of turning on the spot
        const want = to.normalize();
        st.heading = st.heading ? st.heading.lerp(want, Math.min(1, dt * 0.8)).normalize() : want;
        st.pos.addScaledVector(st.heading, 15 * dt);
      }
      if (!inIsland(st.pos.x, st.pos.z, EDGE - 6)) st.pos.multiplyScalar(0.995);
    } else st.pos.lerp(st.target, Math.min(1, dt * 4));
    // funnel: spinning layers that sway a little
    st.group.position.set(st.pos.x, 0, st.pos.z);
    st.group.rotation.z = Math.sin(st.t * 0.6) * 0.06;
    st.group.rotation.x = Math.cos(st.t * 0.45) * 0.05;
    st.layers.forEach((m, i) => { m.rotation.y -= dt * (3.2 + i * 1.3); m.material.map.offset.y -= dt * 0.35; });
    const arr = st.points.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const s = st.seeds[i];
      s[0] = (s[0] + dt * 0.08 * s[2]) % 1;
      s[1] += dt * (5 - s[0] * 2.5) * s[2];
      const y = s[0] * HEIGHT, r = this.radiusAt(y) * (0.6 + 0.4 * Math.sin(s[1] * 0.5 + i));
      arr[i * 3] = st.pos.x + Math.cos(s[1]) * r;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = st.pos.z + Math.sin(s[1]) * r;
    }
    st.points.geometry.attributes.position.needsUpdate = true;
    // dust kicked up at the base
    if (Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 10;
      g.effects.puff(V(st.pos.x + Math.cos(a) * r, 1 + Math.random() * 3, st.pos.z + Math.sin(a) * r), 0x8f8270, 9, 1.6, V(-Math.sin(a) * 25, 8, Math.cos(a) * 25));
    }

    // suck up and fling bricks (host)
    if (isHost(g)) {
      for (const p of g.world.parts) {
        if (p.tags.has('indestructible') || p.tags.has('corpse')) continue;
        const t = p.body.translation();
        const dx = t.x - st.pos.x, dz = t.z - st.pos.z;
        const d = Math.hypot(dx, dz);
        const R = this.radiusAt(t.y);
        if (d > R + 4 || t.y > 140) continue;
        const vol = p.size.x * p.size.y * p.size.z;
        if (p.anchored) {
          if (vol > 6000 || Math.random() > dt * (d < R * 0.7 ? 5 : 2.5)) continue;
          g.world.unanchor(p);
        }
        const nx = dx / (d || 1), nz = dz / (d || 1);
        const tang = 70, inward = t.y < 90 ? 14 : -60, up = t.y < 100 ? 45 : 5;
        g.world.push(p, { x: -nz * tang - nx * inward, y: up, z: nx * tang - nz * inward }, false);
      }
    }
    // lift players: the funnel itself does no damage, the debris and the fall do
    for (const c of locals(g)) {
      if (!c.alive) continue;
      const dx = c.pos.x - st.pos.x, dz = c.pos.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > this.radiusAt(c.pos.y) + 2 || c.pos.y > 140) continue;
      if (c.seat) c.unsit();
      c.climbing = null;
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const out = c.pos.y > 80 ? 70 : -10;
      c.ext.x = -nz * 45 + nx * out; c.ext.z = nx * 45 + nz * out;
      c.vel.y = c.pos.y < 85 ? Math.max(c.vel.y, 32) : c.vel.y;
      c.grounded = false;
    }
    if (g.player) {
      const d = g.player.pos.distanceTo(st.pos);
      g.audio.loops.tornado && (g.audio.loops.tornado.g.gain.value = Math.max(0.08, Math.min(0.8, 50 / (d + 10))));
      if (d < 60) g.camController.shake = Math.max(g.camController.shake, 0.25);
    }
  },
  promote(g, st) { st.wp = this.waypoint(g, st.pos); },
  stop(g, st) {
    if (st.points) { g.scene.remove(st.points, st.group); st.points.geometry.dispose(); }
    // the roar carries on for a moment after the round ends, then dies away
    if (g.audio.fadeLoop) g.audio.fadeLoop('tornado', 2, 5); else g.audio.loop('tornado', false);
    g.audio.loop('wind', false);
    g.hazardPos = null;
  },
};
