// Procedural Roblox-style material textures + a triplanar shader patch so
// textures keep a fixed world scale no matter how big a part is.
import * as THREE from 'three';

function canvas(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function noise(ctx, size, amount, base = 235) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = img.data[i] + n;
    img.data[i + 1] = img.data[i + 1] + n;
    img.data[i + 2] = img.data[i + 2] + n;
  }
  ctx.putImageData(img, 0, 0);
}

const builders = {
  plastic(ctx, s) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 6);
  },
  studs(ctx, s) {
    ctx.fillStyle = '#ececec'; ctx.fillRect(0, 0, s, s);
    const n = 2, cell = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell;
      const g = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, cell * 0.32);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8c8c8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  },
  brick(ctx, s) {
    ctx.fillStyle = '#c9c9c9'; ctx.fillRect(0, 0, s, s);
    const rows = 4, bh = s / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (s / 4);
      for (let c = -1; c < 3; c++) {
        const shade = 225 + Math.floor(Math.random() * 30);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(c * (s / 2) + off + 3, r * bh + 3, s / 2 - 6, bh - 6);
      }
    }
    noise(ctx, s, 18);
  },
  wood(ctx, s) {
    ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * s;
      ctx.strokeStyle = `rgba(120,120,120,${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,80,80,0.35)';
    for (let p = 0; p < 4; p++) ctx.fillRect(0, p * (s / 4), s, 2);
  },
  concrete(ctx, s) {
    ctx.fillStyle = '#e4e4e4'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 40);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(90,90,90,${Math.random() * 0.15})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  },
  metal(ctx, s) {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.fillRect(0, y, s, 1);
    }
    ctx.fillStyle = 'rgba(120,120,120,0.35)';
    for (let i = 0; i < s; i += 16) for (let j = (i / 16) % 2 * 8; j < s; j += 16) ctx.fillRect(i + 4, j + 2, 6, 2);
  },
  grass(ctx, s) {
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const v = 170 + Math.floor(Math.random() * 85);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 2 + Math.random() * 3);
    }
  },
  sand(ctx, s) {
    ctx.fillStyle = '#ececec'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 34);
  },
  slate(ctx, s) {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(${Math.random() < .5 ? 255 : 90},${Math.random() < .5 ? 255 : 90},${Math.random() < .5 ? 255 : 90},0.12)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, Math.random() * s);
      for (let k = 0; k < 4; k++) ctx.lineTo(Math.random() * s, Math.random() * s);
      ctx.fill();
    }
    noise(ctx, s, 30);
  },
  fabric(ctx, s) {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < s; i += 4) { ctx.fillRect(i, 0, 1, s); ctx.fillRect(0, i, s, 1); }
  },
  asphalt(ctx, s) {
    ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 60);
  },
  // Roblox TrussPart look: square frame with diagonal braces, open in between
  truss(ctx, s) {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = '#e6e6e6'; ctx.lineCap = 'square';
    ctx.lineWidth = s * 0.12; ctx.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.1); ctx.lineTo(s * 0.9, s * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.9, s * 0.1); ctx.lineTo(s * 0.1, s * 0.9); ctx.stroke();
  },
};

// Studs per texture repeat for each material.
const SCALE = { plastic: 8, studs: 2, brick: 4, wood: 6, concrete: 10, metal: 6, grass: 10, sand: 8, slate: 12, fabric: 4, asphalt: 12, truss: 2 };

const texCache = {};
function getTexture(kind) {
  if (texCache[kind]) return texCache[kind];
  const [c, ctx] = canvas(128);
  (builders[kind] || builders.plastic)(ctx, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache[kind] = tex;
  return tex;
}

function triplanar(material, scale, edge = 0.8) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTexScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriHalf;\nvarying vec3 vTriNormal;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 triScale = vec3(1.0);
        #ifdef USE_INSTANCING
          triScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        #endif
        vTriPos = position * triScale;
        vTriHalf = triScale * 0.5;
        vTriNormal = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriHalf;\nvarying vec3 vTriNormal;\nuniform float uTexScale;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 an = abs(vTriNormal);
          bool fx = an.x > an.y && an.x > an.z;
          bool fy = !fx && an.y > an.z;
          vec2 tuv = fx ? vTriPos.zy : (fy ? vTriPos.xz : vTriPos.xy);
          vec4 sampledDiffuseColor = texture2D(map, tuv / uTexScale);
          diffuseColor *= sampledDiffuseColor;
          // soft darkening toward each face's edges so stacked bricks read clearly
          vec2 hp = fx ? vTriHalf.zy : (fy ? vTriHalf.xz : vTriHalf.xy);
          vec2 ed = hp - abs(tuv);
          float edge = min(ed.x, ed.y);
          diffuseColor.rgb *= mix(${edge.toFixed(2)}, 1.0, smoothstep(0.0, 0.45, edge));
        #endif`);
  };
  material.customProgramCacheKey = () => 'tri' + scale + ':' + edge;
  return material;
}

const matCache = {};
export function getMaterial(kind) {
  if (matCache[kind]) return matCache[kind];
  let m;
  if (kind === 'glass') {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3, depthWrite: false });
  } else if (kind === 'neon') {
    m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  } else if (kind === 'forcefield') {
    m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  } else if (kind === 'truss') {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getTexture('truss'), roughness: 0.5, metalness: 0.3, alphaTest: 0.5, side: THREE.DoubleSide });
    triplanar(m, SCALE.truss, 1.0);
  } else if (kind === 'water') {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.1, depthWrite: false });
  } else {
    const rough = { metal: 0.45, plastic: 0.7, studs: 0.7, glass: 0.1 }[kind] ?? 0.9;
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: getTexture(kind), roughness: rough, metalness: kind === 'metal' ? 0.35 : 0 });
    triplanar(m, SCALE[kind] || 8, kind === 'grass' || kind === 'sand' ? 0.92 : 0.8);
  }
  matCache[kind] = m;
  return m;
}

export function isTransparent(kind) { return kind === 'glass' || kind === 'forcefield' || kind === 'water'; }

// Roblox "Smile" classic face drawn onto the head colour.
// circumference/height are the head's size in studs, so the face can be
// drawn in stud space and come out undistorted once wrapped on the lathe.
export function makeFaceTexture(headColor, circumference, height) {
  const [c, ctx] = canvas(512);
  ctx.fillStyle = '#' + new THREE.Color(headColor).getHexString();
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.scale(512 / circumference, 512 / height);
  ctx.fillStyle = '#000';
  for (const ex of [-0.15, 0.15]) {
    ctx.beginPath(); ctx.ellipse(ex, -0.13, 0.052, 0.115, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#000'; ctx.lineWidth = 0.045; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, -0.02, 0.24, 0.2, 0, Math.PI * 0.17, Math.PI * 0.83);
  ctx.stroke();
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeLabelTexture(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || '#1b2a35'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = opts.fg || '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = h / (lines.length + 0.5);
  lines.forEach((l, i) => {
    const size = typeof l === 'object' ? l.size : (opts.size || 36);
    const text = typeof l === 'object' ? l.text : l;
    ctx.font = `bold ${size}px "Source Sans Pro", Arial, sans-serif`;
    if (typeof l === 'object' && l.color) ctx.fillStyle = l.color; else ctx.fillStyle = opts.fg || '#fff';
    ctx.fillText(text, w / 2, lh * (i + 0.75));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Text for signs (drawn at 64 px per stud, capped).
export function signTexture(text, w, h, { bg = '#1b2a35', fg = '#ffffff', font = 'Roboto' } = {}) {
  const ppu = Math.min(64, 1024 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(32, Math.round(w * ppu)); c.height = Math.max(16, Math.round(h * ppu));
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = Math.max(2, c.height * 0.05);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, c.width - ctx.lineWidth, c.height - ctx.lineWidth);
  const lines = String(text).split('\n');
  let size = c.height * 0.62 / lines.length;
  ctx.font = `900 ${size}px ${font}, Arial, sans-serif`;
  const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
  if (widest > c.width * 0.88) { size *= c.width * 0.88 / widest; ctx.font = `900 ${size}px ${font}, Arial, sans-serif`; }
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, c.height * (i + 0.5) / lines.length + size * 0.04));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
