import * as THREE from 'three';
import { V, randomMapPoint, sphereMesh, disposeMesh } from './common.js';

export default {
  name: 'Meteor Shower',
  warning: 'Meteor Shower! Watch the skies and find shelter',
  icon: '☄️',
  duration: 95,
  sky: 'clear',
  bot: 'indoor-low',
  start(g, st) {
    st.list = []; st.next = 1;
    g.effects.setSky('volcano');
  },
  update(g, st, dt) {
    st.next -= dt;
    if (st.next <= 0) {
      st.next = 0.45 + Math.random() * 0.7;
      const target = randomMapPoint(95);
      const start = target.clone().add(V((Math.random() - .5) * 140, 260, (Math.random() - .5) * 140));
      const vel = target.clone().sub(start).normalize().multiplyScalar(140);
      const r = 1.4 + Math.random() * 1.6;
      const mesh = sphereMesh(g, r, 0xff6a1a, true);
      const core = sphereMesh(g, r * 0.75, 0x5a3420, false);
      mesh.add(core); core.position.set(0, 0, 0);
      mesh.material.transparent = true; mesh.material.opacity = 0.8;
      mesh.position.copy(start);
      st.list.push({ mesh, pos: start, vel, r });
      g.audio.whistle(target);
    }
    for (let i = st.list.length - 1; i >= 0; i--) {
      const m = st.list[i];
      const step = m.vel.clone().multiplyScalar(dt);
      const len = step.length();
      const hit = g.world.raycast(m.pos, step.clone().normalize(), len + m.r, { chars: true });
      if (Math.random() < 0.7) g.effects.puff(m.pos.clone(), 0xffa040, m.r * 3, 0.5);
      if (hit || m.pos.y < 0) {
        const p = hit ? hit.point : m.pos.clone().setY(0);
        this.impact(g, p, m.r);
        disposeMesh(g, m.mesh);
        st.list.splice(i, 1);
        continue;
      }
      m.pos.add(step);
      m.mesh.position.copy(m.pos);
    }
  },
  impact(g, p, r) {
    const R = 7 + r * 2;
    g.world.explode(p, R, 70, { destroyChance: 0.25 });
    g.effects.burst(p, { size: R * 1.6, life: 0.7, count: 3 });
    g.audio.explosion(p, 0.8);
    for (const c of g.chars) {
      if (!c.alive) continue;
      const d = c.center.distanceTo(p);
      if (d < r + 3.2) c.die('meteor');
      else if (d < R + 3) {
        c.damage(45 * (1 - d / (R + 3)), 'meteor');
        c.addVelocity(c.center.sub(p).normalize().multiplyScalar(40));
      }
    }
    if (g.camController && g.player.alive && g.player.pos.distanceTo(p) < 60) g.camController.shake = Math.max(g.camController.shake, 0.7);
    // a few burning fragments
    for (let k = 0; k < 3; k++) {
      const f = g.world.addPart({ pos: [p.x, p.y + 2, p.z], size: [1.2, 1.2, 1.2], color: 0x5a3420, mat: 'slate', anchored: false, tags: ['debris'] });
      f.lifetime = 8;
      g.world.push(f, { x: (Math.random() - .5) * 60, y: 30 + Math.random() * 30, z: (Math.random() - .5) * 60 }, false);
      g.trackTemp(f);
    }
  },
  stop(g, st) {
    for (const m of st.list || []) disposeMesh(g, m.mesh);
    st.list = [];
  },
};
void THREE;
