import * as THREE from 'three';
import { V, isHost, locals, randomIslandPoint } from './common.js';
import { rand } from '../util.js';

// NDS: storm clouds like a thunder storm (the wind starts at the teleport), then the rain
// comes in at an angle with the round's wind, so a wall shelters the side away from the
// wind. Every drop that lands on a brick eats at it, whatever its size: the 1st hit turns
// it grey, the 2nd green and loose (green bricks burn to touch), the 3rd black, and the
// 4th dissolves it. The rain itself stings anyone standing out in it.
const GREY = 0x8e8e8e, GREEN = 0x4fbf3a, BLACK = 0x141414;
const SLANT = 0.6;          // sideways studs per stud of fall
const DROPS = 5;            // drops that land on the island every quarter second (host)

export default {
  name: 'Acid Rain',
  warning: 'Acid Rain! Stay Indoors!',
  duration: 95,
  bot: 'indoor-low',
  params() { return { a: Math.round(rand() * 6283) / 1000 }; },
  wind(st) {
    if (!st.fall) {
      const a = st.p.a ?? 0;
      st.windDir = V(Math.cos(a), 0, Math.sin(a));
      // the way the drops travel
      st.fall = V(st.windDir.x * SLANT, -1, st.windDir.z * SLANT).normalize();
    }
    return st.fall;
  },
  preWarn(g, st) {
    this.wind(st);
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 500, gain: 0.12, lfo: 0.25 });
  },
  start(g, st) {
    this.wind(st);
    st.tick = 0;
    g.effects.setSky('dark');
    g.audio.loop('wind', true, { freq: 500, gain: 0.12, lfo: 0.25 });
    g.audio.loop('rain', true, { filter: 'highpass', freq: 2200, gain: 0.2 });
    this.makeRain(g, st);
  },
  // slanted streaks around the camera (the shared weather rain only falls straight down)
  makeRain(g, st) {
    const n = g.lowGfx ? 1500 : 3500, range = 90, height = 80;
    st.rain = { n, range, height, seeds: [] };
    for (let i = 0; i < n; i++) st.rain.seeds.push([Math.random() * range * 2 - range, Math.random() * height, Math.random() * range * 2 - range]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    st.rain.obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc4d8b4, transparent: true, opacity: 0.6, depthWrite: false }));
    st.rain.obj.frustumCulled = false;
    g.scene.add(st.rain.obj);
  },
  updateRain(g, st, dt) {
    const R = st.rain;
    if (!R) return;
    const f = st.fall, speed = 85;
    const vx = f.x * speed, vy = f.y * speed, vz = f.z * speed;
    const cam = g.camera.position, arr = R.obj.geometry.attributes.position.array;
    for (let i = 0; i < R.n; i++) {
      const s = R.seeds[i];
      s[0] += vx * dt; s[1] += vy * dt; s[2] += vz * dt;
      if (s[1] < -5) s[1] += R.height;
      if (s[0] < -R.range) s[0] += R.range * 2; else if (s[0] > R.range) s[0] -= R.range * 2;
      if (s[2] < -R.range) s[2] += R.range * 2; else if (s[2] > R.range) s[2] -= R.range * 2;
      const x = cam.x + s[0], y = cam.y - 30 + s[1], z = cam.z + s[2];
      arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x - f.x * 2.6; arr[i * 6 + 4] = y - f.y * 2.6; arr[i * 6 + 5] = z - f.z * 2.6;
    }
    R.obj.geometry.attributes.position.needsUpdate = true;
  },
  // out in the rain: nothing between you and the sky, looking back up the way the drops come
  exposed(g, st, c) {
    const up = st.fall.clone().negate();
    return !g.world.raycast(V(c.pos.x, c.pos.y + 5.2, c.pos.z), up, 240);
  },
  corrode(g, part, point) {
    part.acid = (part.acid || 0) + 1;
    const n = part.acid;
    if (n >= 4) { g.effects.puff(point, 0x3d6b2e, 4, 1); g.world.removePart(part); return; }
    g.world.setColor(part, n === 1 ? GREY : n === 2 ? GREEN : BLACK);
    if (n === 2) {
      g.world.addNetTag(part, 'acidic');
      g.effects.puff(point, 0x7bd34b, 4, 1);
      // a whole floor or roof slab doesn't drop in one piece: it just goes on corroding
      if (part.size.x * part.size.z < 300 || part.size.y > 4) g.world.unanchor(part, { x: 0, y: 1, z: 0 });
    }
  },
  // a player who takes over hosting reads how far each brick has gone from its colour
  promote(g, st) {
    const stage = { [GREY]: 1, [GREEN]: 2, [BLACK]: 3 };
    if (g.map) for (const p of g.map.parts) if (p.alive && stage[p.color.getHex()]) p.acid = stage[p.color.getHex()];
  },
  update(g, st, dt) {
    this.updateRain(g, st, dt);
    st.tick += dt;
    if (st.tick < 0.25) return;
    st.tick = 0;
    if (isHost(g)) {
      // drops corrode the first thing they hit on the way down
      const f = st.fall, back = 220 / -f.y;
      for (let i = 0; i < DROPS; i++) {
        const p = randomIslandPoint(-12);
        const from = V(p.x - f.x * back, 220, p.z - f.z * back);
        const hit = g.world.raycast(from, f, back + 40);
        if (!hit || !hit.object || !hit.object.tags || hit.object.tags.has('indestructible') || hit.object.tags.has('corpse')) continue;
        this.corrode(g, hit.object, hit.point);
      }
    }
    for (const c of locals(g)) {
      if (!c.alive || !g.island.onIsland(c.pos)) continue;
      if (this.exposed(g, st, c)) c.damage(1.2, 'acid', true);
      // touching corroded bricks burns
      const gp = c.groundPart;
      let touching = gp && gp.tags.has('acidic');
      if (!touching) {
        for (const q of g.world.partsNear(c.center, 3, q => q.tags.has('acidic'))) {
          const b = g.world.aabb(q);
          if (c.pos.x + 1.3 > b.minX && c.pos.x - 1.3 < b.maxX && c.pos.z + 1.3 > b.minZ && c.pos.z - 1.3 < b.maxZ && c.pos.y + 5.2 > b.minY && c.pos.y - 0.3 < b.maxY) { touching = true; break; }
        }
      }
      if (touching) c.damage(1, 'acid', true);
    }
  },
  stop(g, st) {
    if (st.rain) { g.scene.remove(st.rain.obj); st.rain.obj.geometry.dispose(); st.rain.obj.material.dispose(); st.rain = null; }
    g.audio.loop('rain', false); g.audio.loop('wind', false);
  },
};
