// Shared night backdrops for the Halloween scenes.
import { C, rng, drawAt } from '../../core/gfx.js';
import * as S from './sprites.js';

// a starry purple sky, the moon, rolling dark hills and a grassy ground from `groundY` down
export function night(g, seed = 1, groundY = 0) {
  const { width: W, height: H } = g.canvas, r = rng(seed), N = S.N;
  const bands = [N.sky0, N.sky1, N.sky2, N.sky3, N.sky4];
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 26, W, 26); });
  for (let i = 1; i < bands.length; i++) { g.fillStyle = bands[i]; for (let x = 0; x < W; x += 2) g.fillRect(x + (i % 2), i * 26 - 1, 1, 1); }
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < .7 ? '#cfc4ff' : C.white; g.fillRect((r() * W) | 0, (r() * 120) | 0, 1, 1); }
  drawAt(g, S.moon, 420, 52);
  const hill = (col, base, amp, f, ph) => { g.fillStyle = col; for (let x = 0; x < W; x++) { const y = base - Math.round(Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph) * amp * .4); g.fillRect(x, y, 1, H - y); } };
  hill('#2a2440', 128, 12, 0.013, 1); hill('#232035', 142, 10, 0.02, 4);
  const gy = groundY || 150;
  g.fillStyle = N.ground; g.fillRect(0, gy, W, H - gy);
  for (let i = 0; i < 600; i++) { g.fillStyle = r() < .5 ? N.groundD : N.groundL; g.fillRect((r() * W) | 0, gy + ((r() * (H - gy)) | 0), 1, 2); }
}
