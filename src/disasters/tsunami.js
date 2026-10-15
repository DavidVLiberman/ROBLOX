import * as THREE from 'three';
import { clamp, rand, OCEAN_LEVEL } from '../util.js';
import { V, isHost, locals } from './common.js';

// NDS: one bright blue wave, about 50 studs high, coming from any direction at about
// 40 studs a second. It forms far out at sea, so you can watch it come in, and keeps its
// height all the way across the island. It washes away the bricks it covers; the water
// dissolves anyone it covers past the waist (feet-deep water just hurts and shoves you).
const SPEED = 40, TOP = 50, THICK = 40, SPAN = 640;
const DELAY = 2;                     // seconds after the warning the wave appears
const START = -1100, END = 720;      // where the front starts and ends, along the travel direction
const FORMED = -700;                 // it has grown to full height by here

function waveShape(H) {
  // cross-section: long back slope, a crest that curls forward, steep face
  const s = new THREE.Shape();
  s.moveTo(-THICK, 0);
  s.bezierCurveTo(-THICK * 0.55, H * 0.15, -THICK * 0.4, H * 0.95, -6, H);
  s.bezierCurveTo(-1, H * 1.02, 3, H * 0.96, 4.5, H * 0.82);   // curling lip
  s.bezierCurveTo(2.5, H * 0.78, 1, H * 0.7, 1.2, H * 0.55);
  s.bezierCurveTo(1.6, H * 0.3, 3, H * 0.1, 4, 0);
  s.lineTo(-THICK, 0);
  return s;
}

export default {
  name: 'Tsunami',
  warning: 'Tsunami! Get to higher ground!',
  duration: 90,
  bot: 'high-ish',
  // any direction (radians, the way the wave travels); `h` is the wave's top for the bots
  params() { return { a: Math.round(rand() * 6283) / 1000, h: TOP }; },
  start(g, st) {
    const a = st.p.a ?? (st.p.dir ? Math.atan2(st.p.dir[1], st.p.dir[0]) : 0);
    st.dir = V(Math.cos(a), 0, Math.sin(a));
    st.t = st.late || 0;
    // rushing water, louder as the wave gets closer
    g.audio.loop('roar', true, { type: 'brown', freq: 260, gain: 0.05, lfo: 0.3 });
  },
  spawnWave(g, st) {
    const H = TOP - OCEAN_LEVEL;
    const geo = new THREE.ExtrudeGeometry(waveShape(H), { depth: SPAN, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -SPAN / 2);
    // NDS's wave is a bright, shiny ("Foil") blue that stands out against the darker sea
    const mat = new THREE.MeshStandardMaterial({ color: 0x38b2ff, emissive: 0x0c4f8f, metalness: 0.15, roughness: 0.25, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    // white foam along the crest
    const foam = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, SPAN), new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.6, transparent: true, opacity: 0.92 }));
    foam.position.set(-3, H - 0.4, 0);
    mesh.add(foam);
    // the shape points along +x: turn it to face the travel direction
    mesh.rotation.y = Math.atan2(-st.dir.z, st.dir.x);
    g.scene.add(mesh);
    st.mesh = mesh; st.H = H;
  },
  update(g, st, dt) {
    st.t += dt;
    const front = START + SPEED * (st.t - DELAY);
    if (st.t >= DELAY && !st.mesh && !st.done && front < END) this.spawnWave(g, st);
    if (st.mesh) this.moveWave(g, st, front);
    if (st.drainAt && st.t >= st.drainAt) { st.drainAt = 0; g.recedeWater(18); }
  },
  moveWave(g, st, front) {
    const scale = clamp(0.2 + 0.8 * (front - START) / (FORMED - START), 0.2, 1);
    const top = OCEAN_LEVEL + st.H * scale;
    const c = st.dir.clone().multiplyScalar(front);
    st.mesh.position.set(c.x, OCEAN_LEVEL, c.z);
    st.mesh.scale.set(1, scale, 1);
    const back = front - THICK, ahead = front + 3;
    // the roar grows as it comes in
    const cam = g.camera.position;
    const dist = Math.abs(cam.x * st.dir.x + cam.z * st.dir.z - front);
    const loop = g.audio.loops.roar;
    if (loop) loop.g.gain.value = 0.05 + 0.45 * clamp(1 - dist / 700, 0, 1) ** 2;
    // spray off the crest
    if (Math.random() < 0.6) {
      const sp = V(c.x, top + 1, c.z).addScaledVector(V(st.dir.z, 0, -st.dir.x), (Math.random() - .5) * SPAN * 0.7);
      g.effects.puff(sp, 0xffffff, 6, 1.2, V(st.dir.x * SPEED, 6, st.dir.z * SPEED));
    }
    const overIsland = ahead > -260 && back < 260;
    // the wave washes away the bricks it covers
    if (overIsland && isHost(g)) {
      const push = { x: st.dir.x * 62, y: 10, z: st.dir.z * 62 };
      for (const p of g.world.parts) {
        if (p.tags.has('indestructible') || p.tags.has('corpse')) continue;
        const t = p.body.translation();
        const s = t.x * st.dir.x + t.z * st.dir.z;
        if (s < back || s > ahead || t.y > top) continue;
        g.world.unanchor(p);
        g.world.push(p, push, false);
        if (!p.lifetime) p.lifetime = (g.world.time - p.created) + 8;
      }
    }
    if (overIsland) {
      for (const ch of locals(g)) {
        if (!ch.alive || g.island.inTower(ch.pos)) continue;
        const s = ch.pos.x * st.dir.x + ch.pos.z * st.dir.z;
        if (s < back || s > ahead) continue;
        if (top > ch.pos.y + 2.2) ch.die('tsunami');
        else if (top > ch.pos.y && (ch.waveHit || 0) < g.time) {
          ch.waveHit = g.time + 0.6;
          ch.damage(20, 'tsunami');
          ch.addVelocity({ x: st.dir.x * 40, y: 12, z: st.dir.z * 40 });
        }
      }
    }
    if (front > -200 && !st.splashed) { st.splashed = true; g.audio.noise('brown', 4, { freq: 500, gain: 0.8 }); g.shakeAll(0.4, 2); }
    if (front > END) {
      st.done = true;
      this.removeWave(g, st);
      // leftover water drains slowly
      g.setWaterLevel(3);
      st.drainAt = st.t + 2;
      g.audio.loop('roar', false);
    }
  },
  removeWave(g, st) {
    if (!st.mesh) return;
    g.scene.remove(st.mesh);
    st.mesh.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    st.mesh = null;
  },
  stop(g, st) {
    this.removeWave(g, st);
    g.audio.loop('roar', false);
    g.recedeWater();
  },
};
