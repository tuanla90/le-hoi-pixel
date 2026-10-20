// Pixel painter: sprites are drawn from shapes on a tiny grid, then get an
// automatic 1px outline — the same trick farm games use for a cohesive look.

export const C = {
  out: '#3b2a3a', outSoft: '#6b4a5a',
  white: '#fffaf2', cream: '#ffe9b8', creamD: '#f2cf8f',
  yellow: '#ffd23f', yellowD: '#e8a92a', orange: '#f59e42', orangeD: '#d0722b',
  red: '#e8485f', redD: '#b8304a', pink: '#ff8fb1', pinkL: '#ffc4d6', pinkD: '#d9628f', rose: '#d94f86',
  lav: '#b79ced', lavL: '#dcccff', lavD: '#8b6bd0', violet: '#7e5bc2',
  green: '#5fb34a', greenD: '#2f7a3a', greenL: '#8fd16a', mint: '#6fd3b8', mintL: '#b4f0dc', mintD: '#3fa88e',
  brown: '#9a5b3c', brownD: '#6a3b2a', brownL: '#c48a5a',
  skin: '#ffd8b8', skinD: '#f0aa88',
  sky: '#9ed8ff', skyL: '#cdeeff', blue: '#4a90d9', blueD: '#2f62a8', water: '#6cc4f0',
  gray: '#a7a9bc', grayD: '#6d6f86', grayL: '#d8d9e6',
  soil: '#8a5538', soilD: '#6a3d27', soilW: '#5a3020', soilWD: '#43231a',
  pot: '#d9734a', potD: '#a84f33', potL: '#f0a070',
  grass: '#7cc95a', grassD: '#5fae46', grassL: '#9fdc74',
  road: '#7d7a8c', roadD: '#6a6779', roadL: '#9693a6',
  hair1: '#5a3424', hair1D: '#3e2219', hair2: '#2c2232', hair2D: '#1a1420', hair3: '#c9774a', hair3D: '#9c5532',
};

export class Painter {
  constructor(w, h) { this.w = w; this.h = h; this.buf = new Array(w * h).fill(null); }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c; return this; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.buf[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    return this;
  }
  circ(cx, cy, r, c) { return this.ell(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  // rows of chars; pal maps char -> color ('.' / ' ' = skip)
  map(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) this.px(ox + x, oy + y, c); }));
    return this;
  }
  // paint only where a pixel already exists (for shading)
  over(fn) { const old = this.buf.slice(); fn(); for (let i = 0; i < this.buf.length; i++) if (!old[i]) this.buf[i] = null; return this; }
  outline(c = C.out, diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
        (diag && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
      if (n) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.px(x, y, c));
    return this;
  }
  canvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d'); const id = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.buf.length; i++) {
      const c = this.buf[i]; if (!c) continue;
      const n = parseInt(c.slice(1), 16);
      id.data[i * 4] = n >> 16; id.data[i * 4 + 1] = (n >> 8) & 255; id.data[i * 4 + 2] = n & 255; id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0); return cv;
  }
}

// paint into a fresh canvas with the 2D context (used for big backgrounds)
export function makeCanvas(w, h, fn) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; fn && fn(g, cv); return cv;
}

export function sprite(w, h, fn, { outline = C.out, diag = false } = {}) {
  const p = new Painter(w, h); fn(p); if (outline) p.outline(outline, diag); return p.canvas();
}

// draw a sprite anchored at its bottom-centre (feet), optionally flipped
export function drawAt(g, img, x, y, { flip = false, ax = 0.5, ay = 1, alpha = 1, rot = 0, sx = 1, sy = 1 } = {}) {
  if (!img) return;
  x = Math.round(x); y = Math.round(y);
  if (!flip && rot === 0 && sx === 1 && sy === 1 && alpha === 1) {
    g.drawImage(img, x - Math.round(img.width * ax), y - Math.round(img.height * ay)); return;
  }
  g.save(); g.globalAlpha = alpha; g.translate(x, y); if (rot) g.rotate(rot); g.scale(flip ? -sx : sx, sy);
  g.drawImage(img, -Math.round(img.width * ax), -Math.round(img.height * ay)); g.restore();
}

// deterministic RNG so backgrounds look the same every run
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ease = { outBack: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, outCubic: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };

// small particle system shared by all scenes
export class Particles {
  constructor() { this.list = []; }
  add(p) { this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, t: 0, size: 1, color: C.white, drag: 0, kind: 'px' }, p)); }
  burst(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (opts.speed || 40) * (0.4 + Math.random() * 0.8);
      const colors = opts.colors || [C.white];
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), g: opts.g ?? 60, life: (opts.life || 0.7) * (0.6 + Math.random() * 0.6), size: opts.size || (Math.random() < .5 ? 1 : 2), color: colors[(Math.random() * colors.length) | 0], drag: opts.drag ?? 1.5, kind: opts.kind || 'px', img: opts.img });
    }
  }
  update(dt) {
    for (const p of this.list) { p.t += dt; p.vy += p.g * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt * 0.3; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.list = this.list.filter(p => p.t < p.life);
  }
  draw(g, ox = 0, oy = 0) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      if (p.img) { drawAt(g, p.img, p.x - ox, p.y - oy, { ay: 0.5, alpha: Math.min(1, k * 2) }); continue; }
      g.globalAlpha = Math.min(1, k * 2); g.fillStyle = p.color;
      const s = p.kind === 'shrink' ? Math.max(1, Math.round(p.size * k)) : p.size;
      g.fillRect(Math.round(p.x - ox - s / 2), Math.round(p.y - oy - s / 2), s, s);
    }
    g.globalAlpha = 1;
  }
}
