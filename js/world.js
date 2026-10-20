import { C, makeCanvas, rng, drawAt } from './gfx.js';
import * as S from './sprites.js';

// painted grass field with tufts, tiny flowers and darker patches
export function grassField(w, h, seed = 1, g0 = null) {
  const paint = g => {
    const r = rng(seed);
    g.fillStyle = C.grass; g.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / 220; i++) { g.fillStyle = r() < 0.55 ? C.grassD : '#86d062'; const x = (r() * w) | 0, y = (r() * h) | 0, s = 6 + r() * 14; g.globalAlpha = 0.35; g.fillRect(x, y, s, s * 0.6); g.globalAlpha = 1; }
    for (let i = 0; i < (w * h) / 40; i++) {
      const x = (r() * w) | 0, y = (r() * h) | 0;
      g.fillStyle = r() < 0.6 ? C.grassD : C.grassL; g.fillRect(x, y, 1, 2); if (r() < .4) g.fillRect(x + 2, y + 1, 1, 2);
    }
    for (let i = 0; i < (w * h) / 900; i++) { const x = (r() * w) | 0, y = (r() * h) | 0; g.fillStyle = [C.white, C.yellow, C.pinkL, C.lavL][(r() * 4) | 0]; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x, y + 2, 1, 1); }
  };
  if (g0) { paint(g0); return null; }
  return makeCanvas(w, h, paint);
}

export function scatter(g, w, h, seed, n, avoid = () => false) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h; if (avoid(x, y)) continue;
    const k = r();
    if (k < 0.55) drawAt(g, S.flowerTuft[(r() * 5) | 0], x, y);
    else if (k < 0.75) drawAt(g, S.rock, x, y);
    else if (k < 0.9) drawAt(g, S.mushroom, x, y);
    else drawAt(g, S.bush, x, y);
  }
}
