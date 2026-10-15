import * as THREE from 'three';
import { V, isHost, locals, emit, seeded, islandEdge } from './common.js';
import { BC, pick, rand } from '../util.js';

// NDS: a snowy mountain stands at the edge of the island from the moment you are
// teleported (the sky stays sunny). After the warning snow piles up on its peak, then the
// whole pile collapses in one big slide that sweeps across the island, and for the rest of
// the round smaller lumps keep trickling down. Caves in the foot of the mountain are a
// place to hide: the snow flies over their mouths.
const MH = 95, MW = 340;              // peak height, width
const CH = 14;                        // the cliff at the foot of the mountain (the caves are in it)
const SLOPE = 80;                     // length of the slope (along the snow's path)
const TOE = 8;                        // flat ledge between the bottom of the slope and the cliff edge
const PLATEAU = 26;                   // flat top behind the peak, where the snow piles up
const DEPTH = SLOPE + TOE + PLATEAU;  // the whole mountain, front to back
const CAVES = [-95, 0, 95], CW = 12, CAVE_H = 8, CAVE_D = 26;   // lateral offsets, width, height, depth
const PILE_T = 14;                    // seconds after the warning the pile collapses
const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 0.95 });

export default {
  name: 'Avalanche',
  warning: 'Avalanche! Avoid the path of the snow!',
  duration: 80,
  bot: 'away-mountain',
  // the mountain never rises on the lobby tower's side (-z)
  params() { return { dir: pick([[1, 0], [-1, 0], [0, -1]]) }; },
  // where things are, as distance along the snow's path (s), sideways (u) and height
  at(st, s, u, y) { return st.dir.clone().multiplyScalar(s).addScaledVector(st.side, u).setY(y); },
  setup(g, st) {
    if (st.parts) return;
    st.dir = V(st.p.dir?.[0] ?? 1, 0, st.p.dir?.[1] ?? 0);   // the way the snow travels
    st.side = V(st.dir.z, 0, -st.dir.x);
    // the cliff stands just past the edge of the grass
    st.front = -(islandEdge(-st.dir.x, -st.dir.z) + 3);
    st.toe = st.front - TOE;                      // bottom of the slope
    st.peak = st.toe - SLOPE;                     // top of the slope
    st.backS = st.front - DEPTH;
    g.hazardPos = this.at(st, st.front, 0, 0);
    const yaw = Math.atan2(st.dir.x, st.dir.z) * 180 / Math.PI;
    st.parts = [];
    // a block (or a wedge sloping down toward the island) between s0..s1, u0..u1, y0..y1;
    // `turn` = ±90 turns a wedge to slope down sideways instead
    const mk = (s0, s1, u0, u1, y0, y1, color, mat, shape, turn = 0) => {
      const c = this.at(st, (s0 + s1) / 2, (u0 + u1) / 2, (y0 + y1) / 2);
      const size = turn ? [s1 - s0, y1 - y0, u1 - u0] : [u1 - u0, y1 - y0, s1 - s0];
      const p = g.world.addPart({ pos: [c.x, c.y, c.z], size, color, mat, shape, rot: [0, yaw + turn, 0], tags: ['indestructible', 'mountain'] });
      st.parts.push(p); g.trackTemp(p);
      return p;
    };
    const rock = BC.rock, snow = 0xf4f7fa, W = MW / 2;
    // under the waterline
    mk(st.backS, st.front, -W, W, -30, 0, rock, 'slate');
    // the cliff, with the caves cut into it
    let u = -W;
    for (const cu of CAVES) {
      mk(st.backS, st.front, u, cu - CW / 2, 0, CH, rock, 'slate');
      mk(st.backS, st.front - CAVE_D, cu - CW / 2, cu + CW / 2, 0, CH, rock, 'slate');     // the back of the cave
      mk(st.front - CAVE_D, st.front, cu - CW / 2, cu + CW / 2, CAVE_H, CH, rock, 'slate'); // its roof
      u = cu + CW / 2;
    }
    mk(st.backS, st.front, u, W, 0, CH, rock, 'slate');
    // snow on the ledge, the slope (rock under a layer of snow) and the plateau at the top
    mk(st.toe, st.front, -W, W, CH, CH + 0.8, snow, 'sand');
    mk(st.peak, st.toe, -W, W, CH, MH, rock, 'slate', 'wedge');
    mk(st.peak, st.toe, -W + 3, W - 3, CH + 1.2, MH + 1.2, snow, 'sand', 'wedge');
    mk(st.backS, st.peak, -W, W, CH, MH, rock, 'slate');
    mk(st.backS, st.peak + 0.5, -W + 3, W - 3, MH, MH + 1.2, snow, 'sand');
    // the summit ridge behind the snowfield, and the flanks either side, so it reads as a mountain
    const SR = 40, FL = 46;
    mk(st.backS - SR, st.backS, -W * 0.75, W * 0.75, -30, MH, rock, 'slate');
    mk(st.backS - SR, st.backS, -W * 0.75, W * 0.75, MH, MH + 38, rock, 'slate', 'wedge');
    mk(st.backS - SR * 0.5, st.backS + 0.3, -W * 0.6, W * 0.6, MH + 15, MH + 39, snow, 'sand', 'wedge');
    for (const sg of [-1, 1]) {
      const u0 = sg > 0 ? W : -W - FL, u1 = sg > 0 ? W + FL : -W;
      mk(st.backS - SR * 0.5, st.front, u0, u1, -30, CH, rock, 'slate');
      // sloping down and out to the sides (local +z of a wedge is its low end)
      mk(st.backS - SR * 0.5, st.toe, u0, u1, CH, MH + 18, rock, 'slate', 'wedge', sg > 0 ? 90 : -90);
    }
    // a dock or bridge reaching out over the sea where the mountain stands breaks off
    if (isHost(g)) {
      for (const pp of g.world.parts) {
        if (pp.tags.has('indestructible')) continue;
        const t = pp.body.translation();
        const s = t.x * st.dir.x + t.z * st.dir.z;
        if (s < st.front + 1 && t.y < this.surfaceY(st, s) + 1) g.world.unanchor(pp, { x: st.dir.x * 15, y: 8, z: st.dir.z * 15 });
      }
    }
  },
  // it is there straight away at the teleport (preWarn runs then), or for a late joiner at the start
  preWarn(g, st) { this.setup(g, st); },
  // height of the mountain's surface at distance s along the snow's path
  surfaceY(st, s) {
    if (s >= st.front) return 0;
    if (s >= st.toe) return CH + 0.8;
    if (s >= st.peak) return CH + 1.2 + (MH - CH) * (st.toe - s) / SLOPE;
    return MH + 1.2;
  },
  start(g, st) {
    this.setup(g, st);
    st.t = st.late || 0;
    st.chunks = []; st.next = 4;
    st.collapsed = st.t > PILE_T + 0.5;
    if (!st.collapsed) {
      // the pile of snow building up on the peak
      st.pile = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), snowMat);
      st.pile.castShadow = true;
      const c = this.at(st, st.peak - PLATEAU * 0.45, 0, MH + 1);
      st.pile.position.copy(c);
      st.pile.rotation.y = Math.atan2(st.dir.x, st.dir.z);
      g.scene.add(st.pile);
    }
    g.audio.loop('rumble', true, { type: 'brown', freq: 110, gain: 0.25 });
  },
  // host: the big slide (one event; every machine expands it into the same lumps)
  collapse(g, st) { emit(g, st, { k: 'slide', seed: (rand() * 1e9) | 0 }); },
  // host: a small lump breaking off
  release(g, st) {
    emit(g, st, { k: 'c', lat: Math.round((rand() - .5) * (MW - 30)), s: Math.round((2.5 + rand() * 3) * 10) / 10, sp: Math.round(20 + rand() * 12), y: Math.round(rand() * 90) });
  },
  addChunk(g, st, lat, size, speed, yaw, back = 0) {
    const s = st.peak - 4 - back;
    const pos = this.at(st, s, lat, this.surfaceY(st, s) + size / 2);
    const mesh = new THREE.Mesh(chunkGeo, snowMat);
    mesh.scale.set(size * 1.3, size, size * 1.1);
    mesh.rotation.y = yaw * Math.PI / 180;
    mesh.castShadow = true;
    g.scene.add(mesh);
    st.chunks.push({ mesh, pos, r: size / 2, speed, vy: 0 });
  },
  onEvent(g, st, ev) {
    if (!st.chunks) return;
    if (ev.k === 'c') this.addChunk(g, st, ev.lat, ev.s, ev.sp, ev.y);
    if (ev.k === 'slide') {
      st.collapsed = true;
      const r = seeded(ev.seed);
      for (let i = 0; i < 22; i++) {
        const lat = -MW / 2 + 14 + (MW - 28) * (i + r()) / 22;
        this.addChunk(g, st, lat, 6 + r() * 5, 26 + r() * 14, r() * 90, r() * 18);
      }
      g.audio.noise('brown', 5, { freq: 260, freqEnd: 60, gain: 0.9 });
      g.shakeAll(0.8, 6);
    }
  },
  update(g, st, dt) {
    st.t += dt;
    if (!st.chunks) return;
    // the pile grows on the peak, then goes all at once
    if (st.pile) {
      if (!st.collapsed) {
        const k = Math.min(1, st.t / PILE_T);
        st.pile.scale.set(MW * 0.42 * (0.4 + 0.6 * k), 2 + 16 * k, PLATEAU * 0.5 + 6 * k);
        if (Math.random() < dt * 6) g.effects.puff(this.at(st, st.peak - PLATEAU * 0.4, (Math.random() - .5) * MW * 0.8, MH + 4 + 14 * k), 0xffffff, 6, 1.5, V(0, 2, 0));
        if (isHost(g) && st.t >= PILE_T) this.collapse(g, st);
      } else {
        st.pile.scale.y -= dt * 14;
        if (st.pile.scale.y <= 0.5) { g.scene.remove(st.pile); st.pile.geometry.dispose(); st.pile = null; }
      }
    }
    // after the big slide, small lumps keep trickling down
    if (isHost(g) && st.collapsed) {
      st.next -= dt;
      if (st.next <= 0) { st.next = 2 + rand() * 2.5; this.release(g, st); }
    }
    for (let i = st.chunks.length - 1; i >= 0; i--) {
      const b = st.chunks[i];
      const s0 = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      const onSlope = s0 >= st.peak && s0 < st.toe;
      // fast down the slope, then the snow loses speed on flat ground and breaks up
      b.speed = Math.min(70, b.speed + (onSlope ? 40 : s0 < st.front ? -2 : -20) * dt);
      b.pos.addScaledVector(st.dir, b.speed * dt);
      const s = b.pos.x * st.dir.x + b.pos.z * st.dir.z;
      // it follows the surface, and flies off the cliff edge
      const ground = this.surfaceY(st, s) + b.r;
      if (b.pos.y > ground + 0.05) { b.vy -= 110 * dt; b.pos.y = Math.max(ground, b.pos.y + b.vy * dt); }
      else { b.pos.y = ground; b.vy = 0; }
      b.mesh.position.copy(b.pos);
      // tumbles end over end
      b.mesh.rotateOnWorldAxis(st.side, -b.speed * dt / (b.r * 1.4));
      if (Math.random() < 0.6) g.effects.puff(b.pos.clone().add(V(0, -b.r * 0.6, 0)), 0xffffff, b.r * 2.5, 1.2, V(0, 3, 0));
      if (isHost(g)) {
        // small things get swept along; walls and floors take a while to give way
        for (const p of g.world.partsNear(b.pos, b.r + 1, q => !q.tags.has('indestructible'))) {
          const vol = p.size.x * p.size.y * p.size.z;
          if (p.anchored && vol > 40 && Math.random() > dt * (b.r > 3 ? 3 : 1.2)) continue;
          g.world.unanchor(p);
          g.world.push(p, { x: st.dir.x * b.speed * 0.9, y: 10, z: st.dir.z * b.speed * 0.9 }, false);
          b.speed *= vol > 40 ? 0.9 : 0.99;
        }
      }
      // hitbox a bit smaller than the visual
      for (const c of locals(g)) {
        if (!c.alive) continue;
        if (c.center.distanceTo(b.pos) < b.r * 0.8 + 1.5 && (c.snowHit || 0) < g.time) {
          c.snowHit = g.time + 0.8;
          if (b.r > 3.8) c.die('avalanche');
          else { c.damage(40, 'avalanche'); c.addVelocity({ x: st.dir.x * 60, y: 25, z: st.dir.z * 60 }); }
        }
      }
      if (s > 260 || b.speed < 6) {
        g.effects.puff(b.pos.clone(), 0xffffff, b.r * 4, 1.5, V(0, 2, 0));
        g.scene.remove(b.mesh); st.chunks.splice(i, 1);
      }
    }
    if (st.chunks.length && Math.random() < dt * 2) g.audio.noise('brown', 1.2, { freq: 200, gain: 0.25 });
  },
  stop(g, st) {
    for (const b of st.chunks || []) g.scene.remove(b.mesh);
    st.chunks = null;
    if (st.pile) { g.scene.remove(st.pile); st.pile.geometry.dispose(); st.pile = null; }
    g.audio.loop('rumble', false);
    g.hazardPos = null;
  },
};
