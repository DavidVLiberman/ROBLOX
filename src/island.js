// The permanent world: grass island with brown rim, endless ocean,
// and the tall safety tower (lobby) with scoreboard + Weather Machine.
import * as THREE from 'three';
import { BC, ISLAND_HALF, RIM_HALF, OCEAN_LEVEL } from './util.js';
import { makeLabelTexture } from './materials.js';

export const TOWER = { x: 0, z: -232, half: 12, top: 70, deckHalf: 26 };

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
    const { x: tx, z: tz, half, top, deckHalf } = TOWER;
    const g = this.game;
    // rock base in the sea + bridge to the island rim
    P({ pos: [tx + 8, -10, tz], size: [96, 20, 100], color: BC.rock, mat: 'slate' });
    const baseEdge = tz + 50;
    P({ pos: [tx + 30, -0.5, (baseEdge - RIM_HALF) / 2], size: [16, 1, -RIM_HALF - baseEdge + 2], color: BC.reddishBrown, mat: 'wood' });
    // tower core
    const col = BC.mediumStone;
    P({ pos: [tx, top / 2, tz], size: [half * 2, top, half * 2], color: col, mat: 'concrete' });
    // deck
    P({ pos: [tx, top + 1, tz], size: [deckHalf * 2, 2, deckHalf * 2], color: BC.darkStone, mat: 'concrete' });
    // glass railing (gap on the east side where the ramps start)
    const rh = 3.5, ry = top + 2 + rh / 2;
    const glass = (cx, cz, sx, sz) => P({ pos: [cx, ry, cz], size: [sx, rh, sz], color: 0xa9d4f5, mat: 'glass', tags: ['glass'] });
    for (const s of [-1, 1]) glass(tx, tz + s * (deckHalf - 0.25), deckHalf * 2, 0.5);
    glass(tx - (deckHalf - 0.25), tz, 0.5, deckHalf * 2);
    const gap0 = tz + 12, gap1 = tz + 24;
    glass(tx + deckHalf - 0.25, (tz - deckHalf + gap0) / 2, 0.5, gap0 - (tz - deckHalf));
    glass(tx + deckHalf - 0.25, (gap1 + tz + deckHalf) / 2, 0.5, tz + deckHalf - gap1);

    // switch-back ramps down the east face so spectators can walk to the island
    const rampW = 6;
    const rampSeg = (ax, az, ay, bx, bz, by) => {
      const len = Math.hypot(bx - ax, bz - az);
      const ang = Math.atan2(bx - ax, bz - az);
      const pitch = Math.atan2(ay - by, len);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, ang, 0, 'YXZ'));
      P({ pos: [(ax + bx) / 2, (ay + by) / 2 - 0.5, (az + bz) / 2], size: [rampW, 1, Math.hypot(len, ay - by) + 0.6], color: BC.reddishBrown, mat: 'wood', rot: q });
    };
    const laneA = tx + deckHalf + 3, laneB = laneA + rampW;
    const zN = tz - 38, zS = tz + 38;
    const landing = (zc, y) => P({ pos: [(laneA + laneB) / 2, y - 0.5, zc], size: [rampW * 2, 1, 8], color: BC.reddishBrown, mat: 'wood' });
    P({ pos: [laneA, top + 1.5, (gap0 + gap1) / 2], size: [rampW, 1, gap1 - gap0], color: BC.reddishBrown, mat: 'wood' });
    let y = top + 2;
    rampSeg(laneA, gap0, y, laneA, zN, y - 14); y -= 14;
    landing(zN - 4, y);
    let lane = laneB, atNorth = true;
    while (y > 0.5) {
      const ny = Math.max(0, y - 18);
      rampSeg(lane, atNorth ? zN : zS, y, lane, atNorth ? zS : zN, ny);
      y = ny;
      atNorth = !atNorth;
      if (y > 0.5) landing(atNorth ? zN - 4 : zS + 4, y);
      lane = lane === laneA ? laneB : laneA;
    }
    this.rampStart = new THREE.Vector3(laneA, top + 2, (gap0 + gap1) / 2);
    this.rampBottom = new THREE.Vector3(lane === laneA ? laneB : laneA, 0, atNorth ? zN - 3 : zS + 3);

    // scoreboard facing the island (+z)
    this.boardTex = makeLabelTexture(['Natural Disaster Survival'], { w: 1024, h: 512 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: this.boardTex }));
    board.position.set(tx, top + 14, tz - deckHalf + 1);
    g.scene.add(board);
    P({ pos: [tx, top + 14, tz - deckHalf + 0.4], size: [31, 16, 0.8], color: BC.black, mat: 'metal' });
    for (const s of [-1, 1]) P({ pos: [tx + s * 13, top + 4, tz - deckHalf + 0.6], size: [1, 6, 1], color: BC.black, mat: 'metal' });
    this.board = board;

    // Weather Machine console
    const wmx = tx - 16, wmz = tz + 6;
    P({ pos: [wmx, top + 4.5, wmz], size: [6, 5, 4], color: 0x3a3f50, mat: 'metal' });
    P({ pos: [wmx, top + 8.5, wmz - 1.2], size: [6, 3, 0.6], color: 0x222222, mat: 'metal' });
    this.wmTex = makeLabelTexture(['WEATHER MACHINE', { text: '0', size: 90, color: '#7cf' }], { w: 256, h: 160, size: 26 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6), new THREE.MeshBasicMaterial({ map: this.wmTex }));
    screen.position.set(wmx, top + 8.5, wmz - 0.85);
    g.scene.add(screen);
    P({ pos: [wmx, top + 7.2, wmz + 0.8], size: [1.6, 0.6, 1.6], color: BC.brightRed, mat: 'neon', shape: 'cyl' });
    // swirling dish on top
    P({ pos: [wmx, top + 11, wmz], size: [3, 0.6, 3], color: 0x7fd6ff, mat: 'neon', shape: 'cyl' });
    this.weatherMachine = new THREE.Vector3(wmx, top + 2, wmz);

    // lobby spawn locations on the deck
    this.spawnPoints = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.spawnPoints.push(new THREE.Vector3(tx + Math.cos(a) * 9, top + 2.1, tz + 8 + Math.sin(a) * 6));
    }
    // SpawnLocation pad
    P({ pos: [tx, top + 2.1, tz + 8], size: [10, 0.2, 10], color: BC.mediumStone, mat: 'plastic' });
  }

  inTower(p) {
    const { x, z } = TOWER;
    return p.x > x - 42 && p.x < x + 58 && p.z > z - 52 && p.z < z + 52 && p.y > -3;
  }

  onIsland(p) {
    return Math.abs(p.x) < RIM_HALF + 2 && Math.abs(p.z) < RIM_HALF + 2 && p.y > OCEAN_LEVEL - 4 && !this.inTower(p);
  }

  randomSpawn() {
    const s = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    return s.clone().add(new THREE.Vector3((Math.random() - .5) * 2, 0, (Math.random() - .5) * 2));
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
