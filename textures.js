/**
 * Procedural textures built from seamless (periodic) noise, so they tile
 * without seams or mirroring. Generated once per world at load.
 */

function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Periodic value noise: repeats every `period` cells in x and y. */
function valueNoise(x, y, period, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const w = (v) => ((v % period) + period) % period;
  const a = hash(w(x0), w(y0), seed), b = hash(w(x0 + 1), w(y0), seed);
  const c = hash(w(x0), w(y0 + 1), seed), d = hash(w(x0 + 1), w(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal noise in [0,1], seamless over a unit square (u, v in [0,1)). */
export function fbm(u, v, { octaves = 5, base = 4, seed = 1 } = {}) {
  let sum = 0, amp = 0.5, norm = 0, freq = base;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(u * freq, v * freq, freq, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeTexture(THREE, width, height, paint, { repeat = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  paint(image.data, width, height);
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  else texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Lava crust: dark basalt plates (seamless Voronoi cells) split by glowing seams. */
export function lavaCrustTexture(THREE, size = 512, cells = 9) {
  const points = [];
  for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) points.push([(gx + hash(gx, gy, 3)) / cells, (gy + hash(gx, gy, 7)) / cells]);
  return makeTexture(THREE, size, size, (data, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Domain warp so plates are irregular rather than a honeycomb grid.
        const u0 = x / w, v0 = y / h;
        const wu = (fbm(u0, v0, { octaves: 3, base: 4, seed: 13 }) - 0.5) * 0.09;
        const wv = (fbm(u0, v0, { octaves: 3, base: 4, seed: 19 }) - 0.5) * 0.09;
        const u = ((u0 + wu) % 1 + 1) % 1, v = ((v0 + wv) % 1 + 1) % 1;
        const cx = Math.floor(u * cells), cy = Math.floor(v * cells);
        let d1 = 9, d2 = 9;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox, gy = cy + oy;
          const p = points[((gy + cells) % cells) * cells + ((gx + cells) % cells)];
          const px = p[0] + Math.floor(gx / cells) * 1, py = p[1] + Math.floor(gy / cells) * 1;
          const dx = u - px, dy = v - py, d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        const edge = (d2 - d1) * cells;
        const n = fbm(u0, v0, { octaves: 4, base: 8, seed: 5 });
        const width = 0.03 + Math.pow(fbm(u0, v0, { octaves: 3, base: 6, seed: 29 }), 2) * 0.16;
        const crack = Math.max(0, 1 - Math.abs(fbm(u0, v0, { octaves: 4, base: 12, seed: 37 }) - 0.5) * 40) * 0.35;
        const glow = Math.min(1, Math.max(0, 1 - edge / width) + crack * (1 - Math.min(1, edge * 3)));
        const crust = mix3([18, 10, 9], [58, 34, 26], n);
        const hot = glow > 0.6 ? mix3([255, 120, 30], [255, 222, 120], (glow - 0.6) / 0.4) : mix3(crust, [230, 70, 20], glow / 0.6);
        const i = (y * w + x) * 4;
        data[i] = hot[0]; data[i + 1] = hot[1]; data[i + 2] = hot[2]; data[i + 3] = 255;
      }
    }
  }, { repeat: true });
}

/** Earth surface: oceans with depth shading and fractal continents (equirectangular, wraps in x). */
export function earthSurfaceTexture(THREE, width = 768, height = 384) {
  return makeTexture(THREE, width, height, (data, w, h) => {
    for (let y = 0; y < h; y++) {
      const lat = Math.abs(y / h - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const e = fbm(u, v, { octaves: 6, base: 3, seed: 11 }) - lat * 0.18;
        let c;
        if (lat > 0.88) c = [235, 242, 250];
        else if (e < 0.5) c = mix3([10, 40, 92], [28, 92, 158], Math.max(0, (e - 0.25) / 0.25));
        else if (e < 0.53) c = [196, 184, 140];
        else c = mix3([52, 108, 58], [128, 112, 74], Math.min(1, (e - 0.53) / 0.2));
        const i = (y * w + x) * 4;
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
      }
    }
  });
}

/** Soft cloud layer (alpha), for a slightly larger sphere around Earth. */
export function earthCloudTexture(THREE, width = 768, height = 384) {
  return makeTexture(THREE, width, height, (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(x / w, y / h, { octaves: 5, base: 5, seed: 23 });
      const a = Math.max(0, Math.min(1, (n - 0.6) / 0.14));
      const i = (y * w + x) * 4;
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a * 190;
    }
  });
}

/** Gas giant: smooth latitude bands warped by turbulence, with an optional storm oval. */
export function gasGiantTexture(THREE, palette, { storm = null, width = 512, height = 256, seed = 31 } = {}) {
  const colors = palette.map(hex);
  return makeTexture(THREE, width, height, (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const warp = (fbm(u, v, { octaves: 4, base: 6, seed }) - 0.5) * 0.06;
      const band = (v + warp) * colors.length * 2.2;
      const k = Math.floor(band), t = band - k;
      const s = t * t * (3 - 2 * t);
      let c = mix3(colors[((k % colors.length) + colors.length) % colors.length], colors[(((k + 1) % colors.length) + colors.length) % colors.length], s);
      const shade = 0.88 + fbm(u, v, { octaves: 3, base: 16, seed: seed + 3 }) * 0.24;
      c = c.map((ch) => ch * shade);
      if (storm) {
        const dx = (u - storm.u) / storm.rx, dy = (v - storm.v) / storm.ry, d = dx * dx + dy * dy;
        if (d < 1) c = mix3(c, hex(storm.color), (1 - d) * 0.85);
      }
      const i = (y * w + x) * 4;
      data[i] = Math.min(255, c[0]); data[i + 1] = Math.min(255, c[1]); data[i + 2] = Math.min(255, c[2]); data[i + 3] = 255;
    }
  });
}
