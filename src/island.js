// The permanent world: grass island with brown rim, endless ocean,
// and the tall safety tower (lobby) with scoreboard + Weather Machine.
import * as THREE from 'three';
import { BC, ISLAND_HALF, RIM_HALF, OCEAN_LEVEL } from './util.js';
import { makeLabelTexture, signTexture } from './materials.js';

// The Lobby Tower: a two-storey round building held up by a dark grey pole at the
// edge of the island, looking straight over the map. Players spawn on the first
// floor; two blue staircases lead up to the roof, where the Survivalist Leaderboard,
// the item signs and the Weather Machine stand.
export const TOWER = { x: 0, z: -196, r: 30, upperR: 20, top: 70, roof: 84 };
// hidden Secret Lab (reached through the glowing circle between the staircases)
export const LAB = { x: 2400, y: 420, z: 2400 };

export class Island {
  constructor(game) {
    this.game = game;
    const w = game.world;
    const P = (o) => w.addPart({ ...o, tags: ['indestructible', ...(o.tags || [])] });
    // grass top
    P({ pos: [0, -5, 0], size: [ISLAND_HALF * 2, 10, ISLAND_HALF * 2], color: BC.grass, mat: 'grass' });
    // brown rim (tornado never enters it)
    const rw = RIM_HALF - ISLAND_HALF;
    for (const s of [-1, 1]) {
      P({ pos: [0, -5.6, s * (ISLAND_HALF + rw / 2)], size: [RIM_HALF * 2, 11.2, rw], color: BC.dirt, mat: 'slate' });
      P({ pos: [s * (ISLAND_HALF + rw / 2), -5.6, 0], size: [rw, 11.2, ISLAND_HALF * 2], color: BC.dirt, mat: 'slate' });
    }
    // rocky base under water
    P({ pos: [0, -30, 0], size: [RIM_HALF * 2 + 6, 40, RIM_HALF * 2 + 6], color: BC.rock, mat: 'slate' });

    // ---- ocean ----
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x2a74b8, transparent: true, opacity: 0.82, roughness: 0.2, metalness: 0.1 });
    this.oceanMat = oceanMat;
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = OCEAN_LEVEL;
    ocean.receiveShadow = true;
    ocean.renderOrder = 1;
    game.scene.add(ocean);
    this.ocean = ocean;

    this.buildTower(P);
  }

  buildTower(P) {
    const { x: tx, z: tz, r, upperR, top, roof } = TOWER;
    const g = this.game;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const white = 0xe9ebee, grey = BC.mediumStone, dark = 0x4f4d52, blue = 0x2f6fd8;
    // the pole, a flared collar under the floor, and the first floor
    P({ pos: [tx, (top - 2 - 10) / 2, tz], size: [14, top - 2 + 10, 14], color: dark, mat: 'concrete', shape: 'cyl' });
    P({ pos: [tx, top - 9, tz], size: [r * 1.7, 14, r * 1.7], color: grey, mat: 'concrete', shape: 'frustum', rot: [180, 0, 0] });
    P({ pos: [tx, top - 1, tz], size: [r * 2, 2, r * 2], color: white, mat: 'plastic', shape: 'cyl' });
    P({ pos: [tx, top - 2.1, tz], size: [r * 2 + 1, 0.6, r * 2 + 1], color: blue, mat: 'plastic', shape: 'cyl' });
    // glass railing around the first floor, so the whole map is in view
    const ring = (rad, y, h, n, color, mat, tags = [], skip = null) => {
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * Math.PI * 2;
        if (skip && skip(a)) continue;
        const len = 2 * rad * Math.sin(Math.PI / n) + 0.1;
        P({ pos: [tx + Math.cos(a) * rad, y, tz + Math.sin(a) * rad], size: [0.5, h, len], color, mat, rot: [0, -a * 180 / Math.PI, 0], tags });
      }
    };
    ring(r - 0.3, top + 1.75, 3.5, 40, 0xa9d4f5, 'glass', ['glass']);
    ring(r - 0.3, top + 3.6, 0.3, 40, white, 'metal');
    // second storey on eight white columns
    // (no columns on the side facing the map, so nothing blocks the view)
    for (const deg of [0, 30, 150, 180, 225, 270, 315]) {
      const a = deg * Math.PI / 180;
      P({ pos: [tx + Math.cos(a) * (upperR - 2), top + (roof - 2 - top) / 2, tz + Math.sin(a) * (upperR - 2)], size: [1.6, roof - 2 - top, 1.6], color: white, mat: 'plastic', shape: 'cyl' });
    }
    P({ pos: [tx, roof - 1, tz], size: [upperR * 2, 2, upperR * 2], color: white, mat: 'plastic', shape: 'cyl' });
    P({ pos: [tx, roof - 2.1, tz], size: [upperR * 2 + 0.6, 0.4, upperR * 2 + 0.6], color: blue, mat: 'plastic', shape: 'cyl' });
    // two blue staircases up the outside of the second storey (west and east)
    const steps = 16, rise = (roof - top) / steps, runZ0 = tz + 9;
    this.stairs = [];
    for (const sx of [-1, 1]) {
      const x = tx + sx * (upperR + 1.2);
      for (let i = 0; i < steps; i++) {
        const h = (i + 1) * rise;
        P({ pos: [x, top + h / 2, runZ0 - i - 0.5], size: [5, h, 1], color: blue, mat: 'plastic' });
      }
      // landing onto the roof
      P({ pos: [tx + sx * (upperR - 0.5), roof - 1, runZ0 - steps - 2], size: [8, 2, 4], color: blue, mat: 'plastic' });
      // hand rail on the open side of the stairs
      const railX = x + sx * 2.6, rl = Math.hypot(steps, roof - top);
      P({ pos: [railX, (top + roof) / 2 + 3, runZ0 - steps / 2], size: [0.3, 0.3, rl], color: white, mat: 'metal', rot: [Math.atan2(roof - top, steps) * 180 / Math.PI, 0, 0] });
      for (const k of [0.5, steps / 2, steps - 0.5]) P({ pos: [railX, top + k * rise + 1.5, runZ0 - k], size: [0.3, 3, 0.3], color: white, mat: 'metal' });
      this.stairs.push({ bottom: V(x, top, runZ0 + 2), top: V(x, roof, runZ0 - steps - 1), landing: V(tx + sx * (upperR - 4), roof, runZ0 - steps - 2) });
    }
    // roof railing, open where the stairs arrive
    const landA = (sx) => Math.atan2(runZ0 - steps - 2 - tz, sx * (upperR - 0.5));
    const nearLanding = (a) => [landA(-1), landA(1)].some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.22);
    ring(upperR - 0.3, roof + 1.75, 3.5, 30, 0xa9d4f5, 'glass', ['glass'], nearLanding);
    ring(upperR - 0.3, roof + 3.6, 0.3, 30, white, 'metal', [], nearLanding);

    // spawn area: two SpawnLocations on the first floor, on the side facing the map
    for (const sx of [-1, 1]) P({ pos: [tx + sx * 6, top + 0.1, tz + 22], size: [7, 0.2, 5], color: grey, mat: 'plastic' });
    this.spawnPoints = [];
    for (let i = 0; i < 16; i++) {
      const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      this.spawnPoints.push(V(tx + sx * (3.5 + (k % 4) * 1.6), top + 0.3, tz + 21 + (k < 4 ? -1 : 1.2)));
    }

    // the glowing circle between the staircases (Secret Lab entrance)
    P({ pos: [tx, top + 0.06, tz], size: [5, 0.12, 5], color: 0x58e6ff, mat: 'neon', shape: 'cyl', collide: false });
    this.labCircle = V(tx, top, tz);

    // ---- roof: signs and fixtures facing the roof centre and the map ----
    const onArc = (deg, rad) => { const a = deg * Math.PI / 180; return V(tx + Math.cos(a) * rad, roof, tz + Math.sin(a) * rad); };
    const face = (p) => Math.atan2(tx - p.x, tz - p.z);   // yaw that faces the roof centre
    const board = (p, w, h, tex, y0 = 1) => {
      const yaw = face(p);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const panel = P({ pos: [p.x, roof + y0 + h / 2, p.z], size: [w + 0.6, h + 0.6, 0.6], color: BC.black, mat: 'metal', rot: q });
      for (const s of [-1, 1]) P({ pos: [p.x + Math.cos(yaw) * s * w * 0.35, roof + y0 / 2, p.z - Math.sin(yaw) * s * w * 0.35], size: [0.8, y0, 0.8], color: BC.black, mat: 'metal' });
      g.world.addDecal(panel, tex, 'front', { w, h, transparent: false, emissive: true });
      return panel;
    };
    this.signs = [];
    const sign = (deg, kind, title, sub, color) => {
      const p = onArc(deg, upperR - 3);
      board(p, 6.5, 4.5, itemSignTexture(kind, title, sub, color), 1.2);
      this.signs.push({ kind, title, pos: p });
    };
    // left to right as you face them: Red Apple, Compass, Leaderboard, Green Balloon, Weather Machine
    sign(-145, 'apple', 'RED APPLE', 'Heals you', '#c4281c');
    sign(-120, 'compass', 'YELLOW COMPASS', 'Vote for maps', '#d4a017');
    // Survivalist Leaderboard
    this.boardTex = makeLabelTexture(['Natural Disaster Survival'], { w: 1024, h: 512 });
    const lb = onArc(-90, upperR - 2.5);
    this.board = board(lb, 16, 8, this.boardTex, 1.5);
    sign(-60, 'balloon', 'GREEN BALLOON', 'Float up high', '#3f9a2f');

    // Weather Machine console
    const wm = onArc(-35, upperR - 4.5);
    const wmx = wm.x, wmz = wm.z, wy = roof;
    const wyaw = face(wm), fx = Math.sin(wyaw), fz = Math.cos(wyaw);
    const wq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wyaw);
    P({ pos: [wmx, wy + 2.5, wmz], size: [6, 5, 4], color: 0x3a3f50, mat: 'metal', rot: wq });
    this.wmTex = makeLabelTexture(['WEATHER MACHINE', { text: '0', size: 90, color: '#7cf' }], { w: 256, h: 160, size: 26 });
    const wscreen = P({ pos: [wmx - fx * 1.4, wy + 6.5, wmz - fz * 1.4], size: [6, 3, 0.6], color: 0x222222, mat: 'metal', rot: wq });
    g.world.addDecal(wscreen, this.wmTex, 'front', { w: 5.4, h: 2.6, transparent: false, emissive: true });
    P({ pos: [wmx + fx * 0.9, wy + 5.2, wmz + fz * 0.9], size: [1.6, 0.6, 1.6], color: BC.brightRed, mat: 'neon', shape: 'cyl' });
    P({ pos: [wmx, wy + 9, wmz], size: [3, 0.6, 3], color: 0x7fd6ff, mat: 'neon', shape: 'cyl' });
    P({ pos: [wmx, wy + 8.2, wmz], size: [0.5, 1.6, 0.5], color: 0x7fd6ff, mat: 'metal', shape: 'cyl' });
    this.weatherMachine = new THREE.Vector3(wmx, wy, wmz);

    // where bots walk to leave the lobby, and where they wander inside it
    this.rampBottom = V(tx, 0, tz + r + 14);
    this.buildLab(P);
  }

  // Secret Lab: a hidden room with models of four maps; the glowing pad goes back.
  buildLab(P) {
    const { x, y, z } = LAB;
    const g = this.game;
    P({ pos: [x, y - 1, z], size: [36, 2, 36], color: 0xd9dde2, mat: 'plastic' });
    P({ pos: [x, y + 13, z], size: [36, 2, 36], color: 0xb8bcc2, mat: 'plastic' });
    for (const [px, pz, sx, sz] of [[0, 18, 36, 1], [0, -18, 36, 1], [18, 0, 1, 36], [-18, 0, 1, 36]]) P({ pos: [x + px, y + 6, z + pz], size: [sx, 12, sz], color: 0xc9ced4, mat: 'plastic' });
    for (const px of [-12, 0, 12]) P({ pos: [x + px, y + 11.9, z], size: [1, 0.3, 30], color: 0xf4f8ff, mat: 'neon' });
    const sign = P({ pos: [x, y + 9, z - 17.3], size: [14, 3, 0.4], color: 0x1b2a35, mat: 'metal' });
    g.world.addDecal(sign, signTexture('SECRET LAB', 14, 3, { bg: '#1b2a35' }), 'front', { transparent: false, emissive: true });
    // mini models on pedestals: Arch Park, Heights School, Launch Land, Modest Headquarters
    const ped = (px, pz) => P({ pos: [x + px, y + 1.5, z + pz], size: [6, 3, 6], color: 0x9aa0a8, mat: 'metal' });
    ped(-10, -8); ped(-3.3, -8); ped(3.3, -8); ped(10, -8);
    P({ pos: [x - 11.5, y + 4.5, z - 8], size: [0.8, 3, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 8.5, y + 4.5, z - 8], size: [0.8, 3, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 10, y + 6.3, z - 8], size: [4, 0.7, 0.8], color: BC.mediumStone, mat: 'concrete' });
    P({ pos: [x - 3.3, y + 4.6, z - 8], size: [4, 3.2, 2.4], color: 0xa0442b, mat: 'brick' });
    P({ pos: [x - 3.3, y + 6.9, z - 8], size: [1, 1.4, 1], color: 0xa0442b, mat: 'brick' });
    P({ pos: [x + 3.3, y + 5.5, z - 8], size: [1.2, 5, 1.2], color: BC.white, mat: 'metal', shape: 'cyl' });
    P({ pos: [x + 3.3, y + 8.5, z - 8], size: [1.2, 1.2, 1.2], color: BC.brightRed, mat: 'metal', shape: 'cone' });
    P({ pos: [x + 10, y + 5.2, z - 8], size: [2.4, 4.4, 2.4], color: 0x8fc4e8, mat: 'glass' });
    // the way back
    P({ pos: [x, y + 0.06, z + 10], size: [5, 0.12, 5], color: 0x58e6ff, mat: 'neon', shape: 'cyl', collide: false });
    this.labReturn = new THREE.Vector3(x, y, z + 10);
    this.labSpawn = new THREE.Vector3(x, y + 0.5, z + 4);
  }

  inLab(p) { return Math.abs(p.x - LAB.x) < 20 && Math.abs(p.z - LAB.z) < 20 && Math.abs(p.y - LAB.y) < 15; }

  // stepping into a glowing circle for a moment takes you to the lab (or back)
  updateLabPortals(c, dt) {
    const near = (pt) => Math.hypot(c.pos.x - pt.x, c.pos.z - pt.z) < 2.3 && Math.abs(c.pos.y - pt.y) < 1.5;
    const pt = near(this.labCircle) ? 'lab' : near(this.labReturn) ? 'back' : null;
    if (!pt) { c.portalT = 0; return; }
    c.portalT = (c.portalT || 0) + dt;
    if (c.portalT < 1.2) return;
    c.portalT = -2;   // don't bounce straight back
    if (pt === 'lab') { c.teleport(this.labSpawn); this.game.ui?.toast('You found the Secret Lab!'); }
    else c.teleport(this.randomSpawn());
  }

  inTower(p) {
    const { x, z, r, top } = TOWER;
    const d = Math.hypot(p.x - x, p.z - z);
    return (d < r + 6 && p.y > top - 20) || (d < 9 && p.y > -10) || this.inLab(p);
  }

  onIsland(p) {
    return Math.abs(p.x) < RIM_HALF + 2 && Math.abs(p.z) < RIM_HALF + 2 && p.y > OCEAN_LEVEL - 4 && !this.inTower(p);
  }

  randomSpawn() {
    const s = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    return s.clone().add(new THREE.Vector3((Math.random() - .5) * 1.2, 0, (Math.random() - .5) * 1.2));
  }

  // a random spot in the lobby for idle bots (first floor or the roof)
  lobbySpot(rand) {
    const { x, z, r, upperR, top, roof } = TOWER;
    if (rand() < 0.3) {
      const a = rand() * Math.PI * 2, d = rand() * (upperR - 6);
      return new THREE.Vector3(x + Math.cos(a) * d, roof, z + Math.sin(a) * d);
    }
    const a = rand() * Math.PI * 2, d = upperR + 1.5 + rand() * (r - upperR - 4);
    return new THREE.Vector3(x + Math.cos(a) * d, top, z + Math.sin(a) * d);
  }

  drawBoard(totalRounds, entries, lastSurvivors) {
    const c = this.boardTex.image;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1b2a35'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#f5cd30'; ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Source Sans Pro", Arial'; ctx.fillText('Natural Disaster Survival', 512, 70);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 38px "Source Sans Pro", Arial';
    ctx.fillText(`Rounds survived on this server: ${totalRounds}`, 512, 130);
    ctx.textAlign = 'left'; ctx.font = '30px "Source Sans Pro", Arial';
    ctx.fillStyle = '#9fc6ff'; ctx.fillText('Top survivors', 80, 190);
    entries.slice(0, 7).forEach((e, i) => {
      ctx.fillStyle = i === 0 ? '#f5cd30' : '#fff';
      ctx.fillText(`${i + 1}. ${e.name}`, 80, 235 + i * 38);
      ctx.textAlign = 'right'; ctx.fillText(String(e.survivals), 480, 235 + i * 38); ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#9fc6ff'; ctx.fillText('Last round', 560, 190);
    ctx.fillStyle = '#fff';
    const ls = lastSurvivors || [];
    if (!ls.length) ctx.fillText('—', 560, 235);
    ls.slice(0, 7).forEach((n, i) => ctx.fillText(n, 560, 235 + i * 38));
    this.boardTex.needsUpdate = true;
  }

  drawWeatherMachine(count) {
    const c = this.wmTex.image, ctx = c.getContext('2d');
    ctx.fillStyle = '#10161c'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 24px "Source Sans Pro", Arial'; ctx.fillText('WEATHER MACHINE', 128, 32);
    ctx.font = 'bold 84px "Source Sans Pro", Arial'; ctx.fillStyle = count ? '#ff6a6a' : '#7cf';
    ctx.fillText(String(count), 128, 115);
    ctx.font = '18px "Source Sans Pro", Arial'; ctx.fillStyle = '#ccc';
    ctx.fillText('extra disasters queued', 128, 148);
    this.wmTex.needsUpdate = true;
  }

  setWater(level) {
    // the ocean plane doubles as the flood plane when it covers the island
    this.ocean.position.y = level;
  }
}

// Lobby item signs: the tool's name, a simple drawn icon, and a line about it.
function itemSignTexture(kind, title, sub, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 360;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 360);
  grd.addColorStop(0, '#2a3a48'); grd.addColorStop(1, '#16212b');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 360);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 40px Roboto, Arial, sans-serif'; ctx.fillText(title, 256, 34);
  // icon
  ctx.save(); ctx.translate(256, 190);
  if (kind === 'apple') {
    ctx.fillStyle = '#d01c1c'; ctx.beginPath(); ctx.arc(-26, 10, 52, 0, Math.PI * 2); ctx.arc(26, 10, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-5, -78, 10, 34);
    ctx.fillStyle = '#3f9a2f'; ctx.beginPath(); ctx.ellipse(28, -62, 26, 12, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'balloon') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 50); ctx.quadraticCurveTo(14, 90, 0, 110); ctx.stroke();
    ctx.fillStyle = '#3fcf3f'; ctx.beginPath(); ctx.ellipse(0, -20, 56, 68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-20, -44, 12, 20, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'compass') {
    ctx.fillStyle = '#f5cd30'; ctx.beginPath(); ctx.arc(0, 0, 76, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2f3f3'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(0.5);
    ctx.fillStyle = '#c4281c'; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.fill();
    ctx.fillStyle = '#1b2a35'; ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#d7dde3'; ctx.font = '700 30px Roboto, Arial, sans-serif'; ctx.fillText(sub, 256, 318);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
