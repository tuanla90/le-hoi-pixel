// Đêm Halloween pixel art, drawn from shapes in code (same Painter + 1px outline as every theme).
import { C, sprite } from '../../core/gfx.js';
import { star4 } from '../../core/ui-sprites.js';
export { heart, star, starEmpty, note, toURL } from '../../core/ui-sprites.js';

// night palette (6-digit hex only: the Painter parses #rrggbb)
export const N = {
  sky0: '#1b1230', sky1: '#241839', sky2: '#2d1f45', sky3: '#382852', sky4: '#43305c',
  ground: '#2c3a2a', groundD: '#223022', groundL: '#3b4d36', soil: '#4a3426', soilD: '#35241a',
  moon: '#fff4c9', moonD: '#e8d79a', stone: '#8d8aa3', stoneD: '#5f5c78', stoneL: '#b3b0c8',
  pumpkin: '#f58a2a', pumpkinD: '#c95e1a', pumpkinL: '#ffb35c', glow: '#ffe066', glowD: '#ffb52e',
  purple: '#7e5bc2', purpleD: '#553a8f', purpleL: '#b58cff', night: '#3a3346', nightD: '#26212f',
  wood: '#5a3a2a', woodD: '#3e271c', woodL: '#7a5238', bone: '#efe6d2',
};
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// ---------------------------------------------------------------- the three kids in costume
// Bí wears a pumpkin hood, Dơi a bat hood with ears and wings, Mèo a black-cat hood with a tail
export const KIDS = [
  { id: 'bi', name: 'Bí', suit: '#ff9a3c', suitD: '#d0722b', hood: N.pumpkin, hoodD: N.pumpkinD, style: 'pumpkin' },
  { id: 'doi', name: 'Dơi', suit: '#9b74e6', suitD: N.purpleD, hood: N.purple, hoodD: N.purpleD, style: 'bat' },
  { id: 'meo', name: 'Mèo', suit: '#5fd38a', suitD: '#2f9a5a', hood: N.night, hoodD: N.nightD, style: 'cat' },
];
function drawKid(p, o, dir, f, carry) {
  const step = f % 2 === 1 ? (f === 1 ? -1 : 1) : 0;
  // things behind the body: bat wings, cat tail
  if (o.style === 'bat' && dir !== 'down') { p.rect(1, 12, 4, 5, o.hoodD); p.rect(13, 12, 4, 5, o.hoodD); p.px(1, 17, o.hoodD); p.px(16, 17, o.hoodD); }
  if (o.style === 'cat' && dir !== 'down') { const tx = dir === 'side' ? 2 : 13; p.rect(tx, 15, 2, 5, o.hood); p.rect(tx + (dir === 'side' ? -1 : 1), 12, 2, 4, o.hood); }
  // legs + shoes
  if (dir === 'side') {
    const a = step === 0 ? 0 : 2;
    p.rect(7 - a, 20, 2, 2, o.suitD); p.rect(10 + a, 20, 2, 2, o.suitD);
    p.rect(7 - a, 22, 2, 1, N.nightD); p.rect(10 + a, 22, 2, 1, N.nightD);
  } else {
    const l = step === -1 ? 1 : 0, r = step === 1 ? 1 : 0;
    p.rect(6, 20, 2, 2 - l, o.suitD); p.rect(10, 20, 2, 2 - r, o.suitD);
    p.rect(6, 22 - l, 2, 1, N.nightD); p.rect(10, 22 - r, 2, 1, N.nightD);
  }
  // body suit
  for (let i = 0; i < 7; i++) { const x = i < 2 ? 6 : 5, w = i < 2 ? 6 : 8; p.rect(x, 13 + i, w, 1, o.suit); p.px(x + w - 1, 13 + i, o.suitD); }
  if (o.style === 'pumpkin') { p.rect(8, 14, 1, 5, o.suitD); p.rect(10, 14, 1, 5, o.suitD); }
  if (o.style === 'cat' && dir === 'down') { p.rect(8, 13, 2, 1, C.yellow); }
  if (o.style === 'bat' && dir === 'down') { p.rect(7, 15, 4, 1, N.purpleL); }
  // arms (carry = holding a torch or a bag up front)
  if (carry) {
    if (dir === 'side') p.rect(11, 13, 3, 2, C.skin);
    else { p.rect(3, 13, 2, 2, C.skin); p.rect(13, 13, 2, 2, C.skin); }
  } else if (dir === 'side') { p.rect(8 + step, 14, 2, 3, o.suitD); p.px(8 + step, 17, C.skin); }
  else { p.rect(3, 14 + (step === 1 ? 1 : 0), 1, 3, o.suit); p.px(3, 17, C.skin); p.rect(14, 14 + (step === -1 ? 1 : 0), 1, 3, o.suit); p.px(14, 17, C.skin); }
  // hood around the head
  p.ell(9, 7.5, 6.5, 6.5, o.hood);
  if (o.style === 'pumpkin') { p.rect(6, 2, 1, 10, o.hoodD); p.rect(11, 2, 1, 10, o.hoodD); p.rect(8, -1, 2, 3, C.greenD); p.px(10, 0, C.green); }
  if (o.style === 'bat') { p.line(4, 3, 3, -1, o.hood); p.line(5, 2, 4, 0, o.hood); p.line(13, 3, 14, -1, o.hood); p.line(12, 2, 13, 0, o.hood); }
  if (o.style === 'cat') { p.rect(3, 0, 3, 4, o.hood); p.px(4, 1, C.pink); p.px(4, 2, C.pink); p.rect(12, 0, 3, 4, o.hood); p.px(13, 1, C.pink); p.px(13, 2, C.pink); }
  // face
  if (dir === 'down') {
    p.ell(9, 9, 4.4, 3.8, C.skin);
    p.rect(7, 8, 1, 2, C.out); p.rect(11, 8, 1, 2, C.out);
    p.px(6, 10, C.pink); p.px(12, 10, C.pink); p.px(9, 11, C.rose);
    if (o.style === 'cat') { p.px(5, 10, C.out); p.px(13, 10, C.out); }
  } else if (dir === 'side') {
    p.ell(11, 9, 3, 3.6, C.skin); p.rect(12, 8, 1, 2, C.out); p.px(13, 10, C.pink);
  }
}
const kidCache = {};
export function kid(i, dir = 'down', frame = 0, carry = false) {
  const k = `${i}${dir}${frame}${carry}`;
  return kidCache[k] || (kidCache[k] = sprite(18, 24, p => drawKid(p, KIDS[i], dir, frame, carry)));
}

// ---------------------------------------------------------------- pumpkin patch (round 1)
export const PUMPKIN_KINDS = ['cam', 'trang', 'xanh', 'cam'];
const PK = {
  cam: [N.pumpkin, N.pumpkinD, N.pumpkinL],
  trang: ['#efe6d2', '#c9bfa8', '#ffffff'],
  xanh: ['#7fb04a', '#55803a', '#a3d06a'],
};
const pkCache = {};
// stage 0 sprout → 3 big carved lantern; mood 'ok' (lit face), 'dark' (candle out), 'wilt' (rotting)
export function pumpkin(kind, stage, mood = 'ok') {
  const k = kind + stage + mood; if (pkCache[k]) return pkCache[k];
  return (pkCache[k] = sprite(28, 26, p => {
    const rot = mood === 'wilt';
    const [c, d, l] = rot ? ['#8a8f5a', '#626640', '#a6aa70'] : PK[kind];
    if (stage === 0) { p.line(14, 25, 14, 18, C.greenD); p.ell(11, 19, 3, 1.6, C.green); p.ell(17, 18, 3, 1.6, C.green); p.circ(14, 22, 2.4, c); return; }
    const rx = [0, 6, 8.5, 11][stage], ry = [0, 4.6, 6.4, 8.2][stage], cy = 25 - ry - (rot ? -1 : 0);
    p.ell(14, cy, rx, ry, c);
    for (const dx of [-rx * 0.45, rx * 0.45]) p.ell(14 + dx, cy, 1, ry - 1, d);
    p.ell(14 - rx * 0.6, cy - ry * 0.3, 1.2, ry * 0.4, l);
    p.rect(13, Math.round(cy - ry) - 3, 2, 4, C.greenD); p.px(15, Math.round(cy - ry) - 3, C.green);
    if (stage >= 1) {
      const lit = mood === 'ok', f = lit ? N.glow : C.out, s = stage / 3;
      const ey = cy - ry * 0.25, ex = rx * 0.42;
      for (const sx of [-1, 1]) { const x = 14 + sx * ex; p.px(x, ey - 1, f); p.rect(x - 1, ey, 3, 1, f); if (stage >= 2) p.rect(x - 1, ey + 1, 3, 1, f); }
      const my = cy + ry * 0.35, mw = Math.max(2, Math.round(rx * 0.9));
      p.rect(14 - mw, my, mw * 2, Math.max(1, Math.round(2 * s)), f);
      if (stage >= 2) { p.px(14 - mw + 2, my - 1, f); p.px(14 + mw - 3, my - 1, f); p.px(14, my + Math.max(1, Math.round(2 * s)), f); }
      if (lit && stage === 3) { p.px(14 - ex, ey, N.glowD); p.px(14 + ex, ey, N.glowD); }
    }
  }));
}
export const patch = sprite(30, 12, p => { p.ell(15, 7, 14, 4.6, N.soil); p.ell(15, 6, 11, 3, N.soilD); p.line(3, 8, 8, 5, C.greenD); p.line(22, 5, 27, 8, C.greenD); p.px(5, 6, C.green); p.px(25, 6, C.green); });
export const web = sprite(22, 16, p => {
  const c = '#e7e3f5';
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI / 2; p.line(1, 1, 1 + Math.cos(a) * 20, 1 + Math.sin(a) * 15, c); }
  for (const r of [5, 9, 13]) for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; p.px(1 + Math.cos(a) * r * 1.3, 1 + Math.sin(a) * r, c); }
}, { outline: null });
export const bat = [0, 1].map(f => sprite(15, 9, p => {
  p.ell(7.5, 4.5, 2.4, 2.6, N.night); p.px(6, 2, N.night); p.px(9, 2, N.night); p.px(6, 4, C.red); p.px(8, 4, C.red);
  if (f === 0) { p.rect(1, 2, 5, 2, N.night); p.rect(10, 2, 5, 2, N.night); p.px(0, 4, N.night); p.px(14, 4, N.night); p.px(3, 4, N.night); p.px(11, 4, N.night); }
  else { p.rect(2, 5, 4, 2, N.night); p.rect(10, 5, 4, 2, N.night); p.px(1, 7, N.night); p.px(13, 7, N.night); }
}));
// need bubbles: 🔥 candle out · 🕸 cobweb · 🦇 bat on it
const bubbleOf = draw => sprite(14, 14, p => { p.circ(7, 6.5, 6.4, C.white); p.rect(5, 12, 3, 2, C.white); draw(p); });
export const bubble = {
  candle: bubbleOf(p => { p.rect(6, 8, 3, 3, C.cream); p.ell(7.5, 5.5, 1.8, 2.6, C.orange); p.px(7, 5, C.yellow); p.px(8, 6, C.yellow); }),
  web: bubbleOf(p => { const c = '#8a86a8'; p.line(3, 3, 11, 10, c); p.line(11, 3, 3, 10, c); p.line(7, 2, 7, 11, c); p.line(3, 6, 11, 6, c); p.px(5, 4, c); p.px(9, 8, c); }),
  bat: bubbleOf(p => { p.ell(7, 7, 1.8, 2, N.night); p.rect(2, 5, 4, 2, N.night); p.rect(9, 5, 4, 2, N.night); p.px(6, 7, C.red); p.px(8, 7, C.red); }),
};
export const tools = {
  candle: sprite(14, 18, p => { p.rect(5, 7, 4, 10, C.cream); p.rect(8, 7, 1, 10, C.creamD); p.ell(7, 4, 2.4, 3.4, C.orange); p.ell(7, 5, 1.2, 1.8, C.yellow); p.rect(3, 16, 8, 2, N.stoneD); }),
  broom: sprite(18, 18, p => { p.line(2, 2, 11, 11, N.woodL); p.line(3, 2, 12, 11, N.wood); for (let i = 0; i < 5; i++) p.line(10 + i, 11 - (i % 2), 13 + i, 16, C.yellowD); p.rect(10, 10, 3, 2, C.red); }),
  bell: sprite(16, 16, p => { p.ell(8, 8, 5, 6, C.yellow); p.rect(3, 11, 10, 2, C.yellowD); p.circ(8, 14, 1.6, C.orange); p.rect(7, 1, 2, 2, C.yellowD); p.px(6, 5, C.white); }),
};
export const cursorFrame = [0, 1].map(f => sprite(36, 32, p => {
  const c = f ? N.glow : C.orange, o = f ? 0 : 1, L = 8;
  [[o, o, 1, 1], [35 - o, o, -1, 1], [o, 31 - o, 1, -1], [35 - o, 31 - o, -1, -1]].forEach(([x, y, sx, sy]) => { p.rect(Math.min(x, x + sx * (L - 1)), y, L, 2, c); p.rect(x, Math.min(y, y + sy * (L - 1)), 2, L, c); });
}));

// ---------------------------------------------------------------- night scenery
export const moon = sprite(34, 34, p => { p.circ(17, 17, 16, N.moon); p.circ(11, 12, 3, N.moonD); p.circ(21, 22, 4, N.moonD); p.circ(24, 10, 2, N.moonD); }, { outline: null });
export const deadTree = sprite(34, 46, p => {
  const c = N.nightD; p.rect(15, 18, 4, 28, c); p.rect(13, 42, 8, 4, c);
  p.line(16, 26, 6, 14, c); p.line(17, 26, 7, 14, c); p.line(6, 14, 2, 12, c); p.line(8, 17, 4, 20, c);
  p.line(18, 22, 28, 10, c); p.line(17, 22, 27, 10, c); p.line(27, 10, 31, 9, c); p.line(24, 14, 29, 17, c); p.line(16, 18, 15, 6, c); p.line(15, 6, 12, 2, c);
}, { outline: null });
export const grave = [0, 1, 2].map(k => sprite(16, 18, p => {
  if (k === 0) { p.rect(3, 4, 10, 14, N.stone); p.ell(8, 4, 5, 3.5, N.stone); p.rect(5, 8, 6, 1, N.stoneD); p.rect(5, 11, 6, 1, N.stoneD); }
  if (k === 1) { p.rect(6, 1, 4, 17, N.stone); p.rect(2, 5, 12, 4, N.stone); p.px(7, 3, N.stoneL); }
  if (k === 2) { p.rect(2, 7, 12, 11, N.stoneD); p.rect(3, 6, 10, 2, N.stone); p.rect(4, 10, 8, 1, N.stone); }
  p.px(4, 6 + k, N.stoneL);
}));
export const ironFence = sprite(16, 16, p => { p.rect(0, 4, 16, 1, N.nightD); p.rect(0, 11, 16, 1, N.nightD); for (const x of [2, 7, 12]) { p.rect(x, 2, 2, 14, N.nightD); p.px(x, 1, N.nightD); p.px(x + 1, 0, N.nightD); } });
export const candy = [C.pink, C.mint, C.yellow, N.purpleL].map(c => sprite(11, 7, p => { p.ell(5.5, 3.5, 3, 2.6, c); p.rect(0, 2, 2, 3, c); p.rect(9, 2, 2, 3, c); p.px(5, 2, C.white); }));
export const jackMini = sprite(11, 10, p => { p.ell(5.5, 5.5, 5, 4, N.pumpkin); p.rect(5, 0, 2, 2, C.greenD); p.px(3, 4, N.glow); p.px(7, 4, N.glow); p.rect(3, 7, 5, 1, N.glow); });
export const leaf = [N.pumpkin, N.pumpkinD, C.yellowD, N.wood].map(c => sprite(4, 3, p => { p.rect(1, 0, 2, 3, c); p.rect(0, 1, 4, 1, c); }, { outline: null }));
export const lantern = sprite(10, 16, p => { p.rect(4, 0, 2, 3, N.nightD); p.rect(1, 3, 8, 2, N.nightD); p.rect(2, 5, 6, 8, N.glow); p.rect(4, 6, 2, 6, C.white); p.rect(1, 13, 8, 2, N.nightD); });
export const sparkle = sprite(9, 9, p => star4(p, 4, 4, 4, N.glow), { outline: null });
// the haunted house on the title screen and the finale (its door is where the kids go trick-or-treating)
export function hauntedHouse() {
  return sprite(130, 120, p => {
    const w = N.night, wd = N.nightD, r = N.purpleD;
    p.rect(14, 52, 102, 68, w); p.rect(14, 52, 102, 3, wd);
    for (let x = 6; x < 124; x++) { const h = 30 - Math.abs(x - 65) * 0.42; if (h > 0) p.rect(x, 52 - h, 1, h, r); }
    p.rect(84, 4, 22, 46, w); for (let x = 80; x < 110; x++) { const h = 16 - Math.abs(x - 95) * 1.1; if (h > 0) p.rect(x, 4 - h + 6, 1, h, r); }
    p.rect(90, 2, 2, 8, wd); p.rect(91, 0, 1, 3, wd);
    const win = (x, y, w2, h2) => { p.rect(x, y, w2, h2, N.glow); p.rect(x + (w2 >> 1), y, 1, h2, N.glowD); p.rect(x, y + (h2 >> 1), w2, 1, N.glowD); };
    win(90, 16, 10, 12); win(24, 64, 14, 12); win(92, 64, 14, 12); win(58, 30, 14, 10);
    p.rect(56, 86, 18, 34, N.woodD); p.rect(58, 88, 14, 32, N.wood); p.px(69, 104, C.yellow);
    p.rect(52, 116, 26, 4, N.stoneD);
    p.ell(65, 70, 7, 5.6, N.pumpkin); p.px(62, 69, N.glow); p.px(68, 69, N.glow); p.rect(62, 72, 7, 1, N.glow);
  });
}

// ---------------------------------------------------------------- ghosts (round 2)
const ghostCache = {};
// kind 'small' tinted with a player's colour, 'big' white sheet, 'king' pumpkin-headed with a crown; 2 wobble frames
export function ghost(kind, tint, frame) {
  const k = kind + tint + frame; if (ghostCache[k]) return ghostCache[k];
  const size = { small: 16, big: 22, king: 28 }[kind];
  return (ghostCache[k] = sprite(size, size + 2, p => {
    const s = size, body = kind === 'small' ? mix(tint, '#ffffff', 0.55) : '#f2f0ff', shade = kind === 'small' ? mix(tint, '#ffffff', 0.15) : '#c9c3e6';
    const hr = s * 0.42, cx = s / 2;
    p.circ(cx, hr + 1, hr, body); p.rect(cx - hr, hr + 1, hr * 2, s * 0.45, body);
    const bot = Math.round(hr + 1 + s * 0.45);
    for (let x = Math.round(cx - hr); x < Math.round(cx + hr); x++) { const up = ((x + frame * 2) >> 1) % 2; p.rect(x, bot, 1, 2 - up, body); }
    p.rect(Math.round(cx + hr) - 2, hr + 2, 2, s * 0.45, shade);
    if (kind === 'king') {
      p.ell(cx, hr - 1, hr * 0.9, hr * 0.75, N.pumpkin); p.rect(cx - 1, 0, 2, 3, C.greenD);
      p.rect(cx - 5, hr - 3, 3, 2, N.glow); p.rect(cx + 2, hr - 3, 3, 2, N.glow); p.rect(cx - 4, hr + 2, 8, 1, N.glow);
      p.rect(cx - 6, 1, 12, 2, C.yellow); p.px(cx - 6, 0, C.yellow); p.px(cx - 1, 0, C.yellow); p.px(cx + 5, 0, C.yellow);
    } else {
      const ey = Math.round(hr), ex = Math.round(hr * 0.42);
      p.rect(cx - ex - 1, ey, 2, 3, C.out); p.rect(cx + ex - 1, ey, 2, 3, C.out);
      if (kind === 'big') p.ell(cx, ey + 6, 2, 2.4, C.out);
      else p.rect(cx - 1, ey + 4, 2, 1, C.out);
    }
  }));
}

// ---------------------------------------------------------------- witch's potion shop (round 3)
// ingredients (9×9): 🍄 poison mushroom · 🌿 ghost moss · 🦇 bat wing
export const ingredient = [
  sprite(9, 9, p => { p.ell(4.5, 3.5, 4.2, 3, C.red); p.rect(3, 5, 3, 4, C.cream); p.px(2, 2, C.white); p.px(6, 3, C.white); p.px(4, 1, C.white); }),
  sprite(9, 9, p => { p.ell(4.5, 5, 3.6, 3.6, '#5fbf6a'); p.line(4, 8, 4, 2, '#2f7a3a'); p.line(4, 5, 7, 3, '#2f7a3a'); p.line(4, 6, 1, 4, '#2f7a3a'); p.px(6, 6, '#a3e6a0'); }),
  sprite(9, 9, p => { p.rect(1, 3, 7, 2, N.purple); p.px(0, 5, N.purple); p.px(3, 5, N.purple); p.px(6, 5, N.purple); p.rect(1, 2, 2, 1, N.purpleL); p.px(8, 2, N.purpleD); }),
];
export const INGREDIENT_COLORS = [C.red, '#5fbf6a', N.purple];
// monsters queueing for potions: vampire · mummy · zombie (2 frames)
export const monster = [
  { skin: '#e8e0f0', hair: N.nightD, shirt: '#2a2030', trim: C.red },
  { skin: N.bone, hair: N.bone, shirt: N.bone, trim: '#c9bfa8' },
  { skin: '#8fc47a', hair: '#4a3a2a', shirt: '#5a7ab0', trim: '#3f5a8a' },
].map((m, i) => [0, 1].map(f => sprite(16, 23, p => {
  p.rect(4, 12, 8, 8, m.shirt); p.rect(4, 19, 3, 3, i === 1 ? m.trim : N.nightD); p.rect(9, 19, 3, 3, i === 1 ? m.trim : N.nightD);
  if (i === 0) { p.rect(2, 10, 12, 10, C.red); p.rect(4, 11, 8, 9, m.shirt); p.rect(7, 12, 2, 4, C.white); }
  if (i === 1) { for (let y = 12; y < 20; y += 2) p.rect(4, y, 8, 1, m.trim); }
  if (i === 2) { p.rect(4, 16, 3, 1, m.trim); p.px(10, 14, m.trim); }
  const arm = f ? 1 : 0; p.rect(2, 12 + arm, 2, 5, i === 2 ? m.skin : m.shirt); p.rect(12, 12 + (1 - arm), 2, 5, i === 2 ? m.skin : m.shirt);
  p.ell(8, 6.5, 4.6, 5, m.skin);
  if (i === 0) { p.rect(3, 1, 10, 3, m.hair); p.px(8, 4, m.hair); p.px(6, 9, C.white); p.px(9, 9, C.white); }
  if (i === 1) { p.rect(4, 4, 8, 1, '#c9bfa8'); p.rect(4, 8, 8, 1, '#c9bfa8'); }
  if (i === 2) { p.rect(4, 2, 8, 2, m.hair); p.px(10, 4, m.hair); p.px(5, 9, '#3f6a32'); }
  p.rect(6, 6, 1, 2, C.out); p.rect(10, 6, 1, 2, i === 2 ? C.red : C.out);
})));
export const jarShelf = sprite(70, 26, p => {
  p.rect(0, 22, 70, 4, N.wood); p.rect(0, 22, 70, 1, N.woodL);
  [[6, '#5fbf6a'], [18, C.red], [30, N.purpleL], [44, C.yellow], [57, '#6cc4f0']].forEach(([x, c], i) => {
    const h = 12 + (i % 2) * 4; p.rect(x - 4, 22 - h, 9, h, '#cfd8e8'); p.rect(x - 3, 22 - h + 4, 7, h - 5, c); p.rect(x - 3, 21 - h, 7, 2, N.wood); p.px(x - 2, 22 - h + 5, C.white);
  });
});
export const cauldron = sprite(32, 26, p => {
  p.ell(16, 16, 13, 9, N.nightD); p.ell(16, 9, 12, 3, '#6cdc7a'); p.ell(16, 9, 9, 2, '#a6f0a0'); p.rect(3, 8, 26, 2, N.night);
  p.rect(6, 23, 3, 3, N.nightD); p.rect(23, 23, 3, 3, N.nightD); p.circ(12, 6, 1.6, '#a6f0a0'); p.circ(19, 4, 1.2, '#a6f0a0');
});
export const roundWindow = sprite(46, 46, p => { p.circ(23, 23, 22, N.woodD); p.circ(23, 23, 19, N.sky2); p.circ(30, 15, 6, N.moon); p.rect(22, 4, 2, 38, N.woodD); p.rect(4, 22, 38, 2, N.woodD); });
export const crystalBall = sprite(18, 20, p => { p.circ(9, 8, 7.5, '#b9a4f0'); p.circ(7, 6, 2.5, '#efe6ff'); p.rect(4, 15, 10, 3, N.woodD); p.rect(2, 18, 14, 2, N.wood); });
