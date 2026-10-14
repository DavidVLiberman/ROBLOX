// Launch Land
import * as THREE from 'three';
import { BC, DEG } from '../util.js';
import { V, RAINBOW, ringSpawns, trashCan, pillarStack, ladderTo, signPost, desks } from './helpers.js';

export default {
  name: 'Launch Land',
  build(b, game) {
    b.box(-40, 0, -40, 40, 2, 40, BC.mediumStone, 'concrete');
    const rocket = [];
    const R = (o) => { const p = b.part(o); rocket.push(p); return p; };
    const rx = 0, rz = 0;
    R({ pos: [rx, 2 + 27, rz], size: [9, 50, 9], color: BC.white, mat: 'metal', shape: 'cyl' });
    R({ pos: [rx, 2 + 52 + 6, rz], size: [9, 12, 9], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    for (const s of [-1, 1]) {
      R({ pos: [rx + s * 6.5, 2 + 12, rz], size: [3.6, 22, 3.6], color: BC.mediumStone, mat: 'metal', shape: 'cyl' });
      R({ pos: [rx + s * 6.5, 2 + 25.5, rz], size: [3.6, 5, 3.6], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    }
    for (let i = 0; i < 4; i++) R({ pos: [rx + Math.sin(i * Math.PI / 2) * 5.5, 2 + 4, rz + Math.cos(i * Math.PI / 2) * 5.5], size: [0.6, 8, 4], color: BC.brightRed, mat: 'metal', rot: [0, i * 90, 0] });
    R({ pos: [rx, 2 + 1, rz], size: [6, 2, 6], color: BC.darkStone, mat: 'metal', shape: 'cyl' });
    // capsule seats inside the nose area (a platform on top to ride)
    const top = R({ pos: [rx, 2 + 52.4, rz], size: [8.6, 0.6, 8.6], color: BC.white, mat: 'metal', shape: 'cyl' });
    // walkway ring around the rocket at bridge level: stand on it at launch to ride the rocket
    const ry = 2 + 44.8;
    for (const [x0, z0, x1, z1] of [[-7.6, -7.6, 7.6, -4.6], [-7.6, 4.6, 7.6, 7.6], [4.6, -4.6, 7.6, 4.6], [-7.6, -4.6, -4.6, 4.6]]) {
      R({ pos: [(x0 + x1) / 2, ry - 0.4, (z0 + z1) / 2], size: [x1 - x0, 0.8, z1 - z0], color: BC.darkStone, mat: 'metal' });
    }
    for (const p of rocket) p.tags.add('rocket');
    // launch tower with 4 levels, truss ladder, and bridge to rocket at level 4
    const tx = 22;
    for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) b.block(tx + ox, 2, rz + oz, 1.4, 52, 1.4, BC.brightRed, 'metal');
    for (let l = 1; l <= 4; l++) b.block(tx, 2 + l * 11, rz, 10, 0.8, 10, BC.darkStone, 'metal');
    b.truss(tx + 5.8, 2, rz, 44.8 + 0.2);
    const by = 2 + 44.8;
    b.box(7.6, by - 0.8, -2, tx - 5, by, 2, BC.darkStone, 'metal', { tags: ['fire'] });
    b.box(7.6, by, -2.2, tx - 5, by + 3, -2, BC.brightYellow, 'metal');
    b.spot('high', tx, 2 + 44.8, rz, [V(tx + 8, 2, rz), V(tx + 5.8, 2 + 44.8, rz), V(tx, 2 + 44.8, rz)]);
    b.spot('high', 6, by, 6, [V(tx + 8, 2, rz), V(tx + 5.8, by, rz), V(tx, by, rz), V(6.2, by, 0), V(6, by, 6)]);
    ladderTo(b, -22, 2, -24, 12.4, [-19, 2, -24], [-28, 14, -24]);
    b.sign(-26, 10, 36.2, 12, 1.6, 'LAUNCH CONTROL', { bg: '#1b2a35' });
    // control bunker + launch button
    b.building({ x: -26, z: 28, w: 26, d: 16, floors: 1, fh: 10, color: BC.mediumStone, mat: 'concrete', windows: true, spacing: 6, winW: 3, winH: 2, door: 'S', y: 2, roofAccess: false });
    const btn = b.block(-26, 2.3, 26, 2, 3.5, 2, BC.brightRed, 'neon');
    // fuel tanks
    b.cyl(-28, 2, -24, 10, 12, BC.white, 'metal'); b.cyl(-14, 2, -28, 7, 9, BC.white, 'metal');
    b.box(-10, 4, -1, -4.5, 5, 1, BC.mediumStone, 'metal');
    const state = { launched: false, t: 0, base: rocket.map(p => p.body.translation()), riders: new Set() };
    b.extras.rocket = { parts: rocket, state, top };
    b.interact.push({
      pos: V(-26, 2, 26), radius: 6, height: 5, object: 'Rocket', label: 'Launch', part: btn,
      cond: () => !state.launched,
      action: () => {
        state.launched = true; state.t = 0;
        for (const c of game.chars) if (c.alive && c.pos.distanceTo(V(rx, c.pos.y, rz)) < 6 && c.pos.y > 40) state.riders.add(c);
        game.audio.explosion(V(rx, 2, rz), 1.5);
        game.ui?.toast('3... 2... 1... Liftoff!');
      },
    });
    b.extras.update = (dt) => {
      if (!state.launched) return;
      state.t += dt;
      if (state.t < 3) { game.effects.burst(V(rx + (Math.random() - .5) * 8, 3, rz + (Math.random() - .5) * 8), { size: 12, life: 1 }); game.camController.shake = Math.max(game.camController.shake, 0.6); return; }
      const tt = state.t - 3;
      const rise = 4 * tt * tt;
      const dy = rise - (state.lastRise || 0);
      state.lastRise = rise;
      if (Math.random() < 0.6) game.effects.burst(V(rx, 2 + rise, rz), { size: 14, life: 0.8 });
      // the host flies the rocket; everyone else gets its position from the host
      if (game.isAuthority) {
        for (let i = 0; i < rocket.length; i++) {
          const p = rocket[i];
          if (!p.alive || !p.anchored) continue;
          const t0 = p.body.translation();
          p.lastDelta = { x: 0, y: dy, z: 0 };
          game.world.movePart(p, V(t0.x, t0.y + dy, t0.z));
          p._moved = true;
        }
      }
      const pl = game.player;
      if (pl.alive && pl.groundPart?.tags?.has('rocket') && rise > 20 && !state.badged) { state.badged = true; game.awardBadge('rocket'); }
      if (rise > 600) {
        if (game.isAuthority) for (const p of rocket) if (p.alive) game.world.removePart(p);
        state.launched = false; state.t = 0; b.extras.update = null;
      }
    };
    b.spawn(30, 2, 30); b.spawn(-30, 2, 0); b.spawn(0, 2, 30); b.spawn(30, 2, -30); b.spawn(0, 2, -30); b.spawn(-20, 2, 40);
    ringSpawns(b, 55, 10);
  },
};
