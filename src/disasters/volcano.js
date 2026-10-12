import { V, randomMapPoint, sphereMesh, disposeMesh } from './common.js';
import { BC } from '../util.js';

const H = 48, D = 76;

export default {
  name: 'Volcanic Eruption',
  warning: 'Volcanic Eruption! Get away from the volcano',
  icon: '🌋',
  duration: 60,
  sky: 'volcano',
  bot: 'away-volcano',
  preWarn(g, st) {
    const a = Math.random() * Math.PI * 2;
    const r = 112;
    st.pos = V(Math.cos(a) * r, 0, Math.sin(a) * r);
    st.pos.x = Math.max(-118, Math.min(118, st.pos.x));
    st.pos.z = Math.max(-118, Math.min(118, st.pos.z));
    g.hazardPos = st.pos.clone();
    st.parts = [];
    st.rise = 0;
    const mk = (o, yOff) => {
      const p = g.world.addPart({ ...o, tags: ['indestructible', 'volcano'] });
      p.yOff = yOff;
      st.parts.push(p);
      g.trackTemp(p);
      return p;
    };
    mk({ pos: [st.pos.x, -H, st.pos.z], size: [D, H, D], color: BC.rock, mat: 'slate', shape: 'frustum' }, H / 2);
    mk({ pos: [st.pos.x, -H, st.pos.z], size: [D * 0.3, 1, D * 0.3], color: 0xff5a00, mat: 'neon', shape: 'cyl' }, H + 0.2);
    mk({ pos: [st.pos.x, -H, st.pos.z], size: [D * 0.55, H * 0.35, D * 0.55], color: 0x4a3a34, mat: 'slate', shape: 'frustum' }, H * 0.82);
    st.rising = true;
    g.effects.setSky('volcano');
    g.audio.loop('rumble', true, { type: 'brown', freq: 120, gain: 0.5 });
    g.shakeAll(0.8, 15);
  },
  update(g, st, dt) {
    if (st.rising) {
      st.rise = Math.min(1, st.rise + dt / 14);
      const base = -H + H * st.rise;
      for (const p of st.parts) {
        const old = p.body.translation();
        const ny = base + p.yOff;
        p._moved = true;
        p.lastDelta = { x: 0, y: ny - old.y, z: 0 };
        g.world.movePart(p, V(old.x, ny, old.z));
      }
      // shove anything inside the cone aside
      const top = base + H;
      for (const p of g.world.partsNear(st.pos, D / 2 + 4, q => !q.tags.has('volcano') && !q.tags.has('indestructible'))) {
        const t = p.body.translation();
        if (t.y < top) { const dir = V(t.x - st.pos.x, 0, t.z - st.pos.z).normalize(); g.world.unanchor(p, { x: dir.x * 20, y: 15, z: dir.z * 20 }); }
      }
      for (const c of g.chars) {
        if (!c.alive) continue;
        const dx = c.pos.x - st.pos.x, dz = c.pos.z - st.pos.z, d = Math.hypot(dx, dz);
        const rAt = (D / 2) * (1 - 0.7 * Math.max(0, Math.min(1, (c.pos.y - base) / H)));
        if (d < rAt + 1.5 && c.pos.y < top) c.addVelocity({ x: dx / (d || 1) * 30 * dt * 10, y: 40 * dt * 10, z: dz / (d || 1) * 30 * dt * 10 });
      }
      if (st.rise >= 1) { st.rising = false; for (const p of st.parts) p.lastDelta = null; }
    }
    if (!st.erupting) return;
    st.next -= dt;
    const crater = V(st.pos.x, H + 1, st.pos.z);
    if (Math.random() < 0.5) g.effects.burst(crater.clone().add(V((Math.random() - .5) * 8, Math.random() * 10, (Math.random() - .5) * 8)), { size: 10, life: 0.8 });
    if (st.next <= 0) {
      st.next = 0.18 + Math.random() * 0.3;
      const target = randomMapPoint(95);
      const T = 2.2 + Math.random() * 1.6, G = 70;
      const vel = target.clone().sub(crater).divideScalar(T);
      vel.y += 0.5 * G * T;
      const r = 1 + Math.random() * 1.4;
      const mesh = sphereMesh(g, r, 0xff4a00, true);
      st.blobs.push({ mesh, pos: crater.clone(), vel, r, G });
      if (Math.random() < 0.3) g.audio.lava(crater);
    }
    for (let i = st.blobs.length - 1; i >= 0; i--) {
      const b = st.blobs[i];
      b.vel.y -= b.G * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      if (Math.random() < 0.3) g.effects.puff(b.pos.clone(), 0xff7a20, b.r * 2.5, 0.4);
      // lava passes through walls and roofs, destroying what it touches
      if (b.vel.y < 0) {
        for (const p of g.world.partsNear(b.pos, b.r + 1.2, q => !q.tags.has('indestructible') && !q.tags.has('lava'))) {
          g.world.setColor(p, 0x2a1a12);
          if (Math.random() < 0.5) g.world.removePart(p); else g.world.unanchor(p, { x: b.vel.x * 0.3, y: 5, z: b.vel.z * 0.3 });
        }
      }
      for (const c of g.chars) if (c.alive && c.center.distanceTo(b.pos) < b.r + 2.4) c.die('lava');
      if (b.pos.y <= 0.4) {
        const puddle = g.world.addPart({ pos: [b.pos.x, 0.25, b.pos.z], size: [b.r * 4, 0.5, b.r * 4], color: 0xff5a00, mat: 'neon', shape: 'cyl', collide: false, tags: ['lava', 'indestructible'] });
        puddle.lifetime = 999;
        st.puddles.push({ part: puddle, until: g.time + 18 });
        g.trackTemp(puddle);
        disposeMesh(g, b.mesh);
        st.blobs.splice(i, 1);
      }
    }
    for (let i = st.puddles.length - 1; i >= 0; i--) {
      const pd = st.puddles[i];
      if (g.time > pd.until) { g.world.removePart(pd.part); st.puddles.splice(i, 1); continue; }
      const t = pd.part.body.translation(), hs = pd.part.size.x / 2;
      for (const c of g.chars) if (c.alive && Math.abs(c.pos.x - t.x) < hs + 0.6 && Math.abs(c.pos.z - t.z) < hs + 0.6 && c.pos.y < 1.5) c.die('lava');
    }
  },
  start(g, st) {
    if (!st.parts) this.preWarn(g, st);
    st.erupting = true; st.next = 0.5; st.blobs = []; st.puddles = [];
    g.audio.explosion(V(st.pos.x, H, st.pos.z), 2);
    g.shakeAll(1, 3);
  },
  stop(g, st) {
    for (const b of st.blobs || []) disposeMesh(g, b.mesh);
    st.blobs = []; st.erupting = false;
    g.audio.loop('rumble', false);
    g.hazardPos = null;
  },
};
