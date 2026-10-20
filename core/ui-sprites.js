// Pixel icons the shared UI needs whatever the theme: result stars, cheer hearts/notes, and the <img> helper.
import { C, sprite, makeCanvas } from './gfx.js';

export function star4(p, cx, cy, r, c) { for (let i = -r; i <= r; i++) { const w = Math.max(0, Math.round((r - Math.abs(i)) / 3)); p.rect(cx - w, cy + i, w * 2 + 1, 1, c); p.rect(cx + i, cy - w, 1, w * 2 + 1, c); } }

export const heart = sprite(11, 10, p => { p.circ(3, 3.5, 2.8, C.pink); p.circ(8, 3.5, 2.8, C.pink); for (let y = 4; y < 9; y++) p.rect(1 + (y - 4), y, 9 - (y - 4) * 2, 1, C.pink); p.px(2, 2, C.white); });
export const star = sprite(13, 13, p => { star4(p, 6, 6, 6, C.yellow); p.circ(6, 6, 2.6, C.yellow); p.px(5, 4, C.white); });
export const starEmpty = sprite(13, 13, p => { star4(p, 6, 6, 6, C.grayL); p.circ(6, 6, 2.6, C.grayL); }, { outline: C.grayD });
export const note = sprite(9, 11, p => { p.rect(5, 0, 1, 8, C.lavD); p.rect(5, 0, 3, 2, C.lavD); p.circ(3.5, 8, 2.4, C.lavD); });

export function toURL(cv, scale = 4) {
  const big = makeCanvas(cv.width * scale, cv.height * scale, g => { g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, cv.width * scale, cv.height * scale); });
  return big.toDataURL();
}
export function img(cv, cls = '') { return `<img class="px ${cls}" src="${toURL(cv, 4)}" alt="">`; }
