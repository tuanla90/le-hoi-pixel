import { C, Painter, sprite, makeCanvas, rng } from './gfx.js';

// ---------------------------------------------------------------- girls
export const GIRLS = [
  // named after flowers that match the dress: Đào (hoa đào, hồng) · Mai (hoa mai, vàng) · Lan (hoa lan xanh lam); each owns one paint in round 4
  { id: 'dao', name: 'Đào', hair: C.hair1, hairD: C.hair1D, dress: '#ff7aa2', dressD: '#d9507e', acc: C.yellow, style: 'long', paint: '#ff5a6e' },
  { id: 'mai', name: 'Mai', hair: C.hair2, hairD: C.hair2D, dress: C.yellow, dressD: C.yellowD, acc: C.white, style: 'pony', paint: '#ffd23f' },
  { id: 'lan', name: 'Lan', hair: C.hair3, hairD: C.hair3D, dress: '#6ab4f5', dressD: '#3f86cf', acc: C.yellow, style: 'bob', paint: '#4aa3ff' },
];

function drawGirl(p, o, dir, f, carry) {
  const step = f % 2 === 1 ? (f === 1 ? -1 : 1) : 0; // -1 left foot forward, 1 right
  // hair behind the body
  if (dir !== 'side') {
    if (o.style === 'long') p.rect(4, 8, 10, dir === 'up' ? 9 : 7, o.hairD);
    if (o.style === 'pony') { p.rect(13, 6, 3, 7, o.hair); p.rect(14, 12, 2, 3, o.hairD); }
  } else {
    if (o.style === 'long') p.rect(4, 8, 5, 8, o.hairD);
    if (o.style === 'pony') { p.rect(2, 6, 3, 7, o.hair); p.rect(2, 12, 2, 3, o.hairD); }
  }
  // legs + shoes
  if (dir === 'side') {
    const a = step === 0 ? 0 : 2;
    p.rect(7 - a, 20, 2, 2, C.skin); p.rect(10 + a, 20, 2, 2, C.skinD);
    p.rect(7 - a, 22, 2, 1, C.brownD); p.rect(10 + a, 22, 2, 1, C.brownD);
  } else {
    const l = step === -1 ? 1 : 0, r = step === 1 ? 1 : 0;
    p.rect(6, 20, 2, 2 - l, C.skin); p.rect(10, 20, 2, 2 - r, C.skin);
    p.rect(6, 22 - l, 2, 1, C.brownD); p.rect(10, 22 - r, 2, 1, C.brownD);
  }
  // dress
  const rows = dir === 'side' ? [[6, 6], [6, 6], [5, 8], [5, 8], [5, 9], [4, 10], [4, 10]] : [[6, 6], [6, 6], [5, 8], [5, 8], [4, 10], [4, 10], [4, 10]];
  rows.forEach(([x, w], i) => { p.rect(x, 13 + i, w, 1, o.dress); p.px(x + w - 1, 13 + i, o.dressD); });
  p.rect(rows[6][0], 19, rows[6][1], 1, o.dressD);
  if (dir === 'down') { p.rect(7, 13, 4, 1, C.white); p.px(8, 14, C.white); p.px(9, 14, C.white); }
  // arms
  if (carry) {
    if (dir === 'side') p.rect(11, 12, 3, 2, C.skin);
    else { p.rect(3, 12, 2, 2, C.skin); p.rect(13, 12, 2, 2, C.skin); }
  } else if (dir === 'side') {
    p.rect(8 + step, 14, 2, 3, C.skinD); p.px(8 + step, 17, C.skin);
  } else {
    p.rect(3, 14 + (step === 1 ? 1 : 0), 1, 3, C.skin); p.rect(14, 14 + (step === -1 ? 1 : 0), 1, 3, C.skin);
  }
  // head
  if (dir === 'down') {
    p.ell(9, 7.5, 6, 6, o.hair);
    p.ell(9, 9.2, 4.6, 3.9, C.skin);
    p.rect(5, 5, 8, 2, o.hair); p.px(5, 7, o.hair); p.px(12, 7, o.hair); p.px(8, 7, o.hair);
    p.rect(4, 4, 10, 1, o.hair);
    p.rect(6, 9, 1, 2, C.out); p.rect(11, 9, 1, 2, C.out);
    p.px(5, 11, C.pink); p.px(12, 11, C.pink);
    p.px(8, 12, C.rose); p.px(9, 12, C.rose);
    p.px(7, 3, o.hairD); p.px(8, 2, o.hairD); // shine-ish strands
    if (o.style === 'bob') { p.rect(3, 8, 1, 4, o.hair); p.rect(14, 8, 1, 4, o.hair); }
  } else if (dir === 'up') {
    p.ell(9, 7.5, 6, 6, o.hair); p.rect(3, 8, 12, 4, o.hair); p.rect(5, 11, 8, 1, o.hairD);
    p.px(7, 4, o.hairD); p.px(10, 5, o.hairD);
  } else {
    p.ell(8.5, 7.5, 6, 6, o.hair);
    p.ell(10.6, 9.2, 3.6, 3.8, C.skin);
    p.rect(7, 4, 7, 2, o.hair); p.px(13, 6, o.hair); p.px(10, 6, o.hair);
    p.rect(3, 8, 4, 4, o.hair);
    p.rect(12, 9, 1, 2, C.out); p.px(13, 11, C.pink); p.px(11, 12, C.rose);
  }
  // accessory
  const bx = dir === 'up' ? 4 : dir === 'side' ? 5 : 12;
  if (o.style === 'long') { p.rect(bx, 2, 3, 2, o.acc); p.px(bx + 1, 1, o.acc); p.px(bx + 1, 4, o.acc); }
  if (o.style === 'pony') { p.circ(bx + 1.5, 3, 1.6, C.pink); p.px(bx + 1, 2, C.yellow); }
  if (o.style === 'bob') p.rect(4, 3, 10, 1, o.acc);
}

const girlCache = {};
export function girl(i, dir = 'down', frame = 0, carry = false) {
  const k = `${i}${dir}${frame}${carry}`;
  if (!girlCache[k]) girlCache[k] = sprite(18, 24, p => drawGirl(p, GIRLS[i], dir, frame, carry));
  return girlCache[k];
}
export function girlPortrait(i) { // bigger avatar for UI cards
  return girl(i, 'down', 0, false);
}

// ---------------------------------------------------------------- garden
export const PLANT_TYPES = ['hong', 'tulip', 'huongduong', 'cuc'];
const HEAD = {
  hong: (p, x, y, dim) => { p.circ(x, y, 4.6, dim ? C.brownL : C.red); p.circ(x, y, 3, dim ? C.brown : C.redD); p.circ(x, y, 2, dim ? C.brownL : C.red); p.px(x - 1, y - 1, dim ? C.brown : C.redD); p.px(x - 2, y - 3, C.pinkL); },
  tulip: (p, x, y, dim) => { p.ell(x, y + 0.5, 4, 4.4, dim ? C.brownL : C.pink); p.px(x - 0.5, y - 4, null); p.rect(x - 1, y - 4, 1, 2, null); p.line(x - 0.5, y - 1, x - 0.5, y + 3, dim ? C.brown : C.pinkD); p.px(x - 3, y - 1, C.pinkL); },
  huongduong: (p, x, y, dim) => { p.circ(x, y, 5.6, dim ? C.creamD : C.yellow); for (let a = 0; a < 8; a++) p.px(x + Math.cos(a * .785) * 5.2, y + Math.sin(a * .785) * 5.2, dim ? C.brownL : C.yellowD); p.circ(x, y, 2.8, C.brown); p.px(x - 1, y - 1, C.brownD); p.px(x + 1, y, C.brownD); },
  cuc: (p, x, y, dim) => { p.circ(x, y, 4.8, dim ? C.creamD : C.white); for (let a = 0; a < 6; a++) p.px(x + Math.cos(a * 1.047 + .5) * 4, y + Math.sin(a * 1.047 + .5) * 4, dim ? C.brownL : C.lavL); p.circ(x, y, 2, dim ? C.brown : C.yellow); },
};
const BUD = { hong: C.red, tulip: C.pink, huongduong: C.yellow, cuc: C.white };

const plantCache = {};
// mood: ok | thirsty | wilt
export function plant(type, stage, mood = 'ok') {
  const k = type + stage + mood;
  if (plantCache[k]) return plantCache[k];
  return (plantCache[k] = sprite(24, 28, p => {
    const dry = mood !== 'ok';
    const lf = mood === 'wilt' ? C.brownL : mood === 'thirsty' ? '#b7b84f' : C.green;
    const lfD = mood === 'wilt' ? C.brown : mood === 'thirsty' ? '#8d8a3a' : C.greenD;
    const top = 26 - [6, 11, 15, 18][stage];
    const droop = dry ? 3 : 0;
    const hx = 12 + droop, hy = top + droop;
    // stem
    if (dry) { p.line(12, 26, 12, top + 5, lfD); p.line(12, top + 5, hx, hy, lfD); }
    else p.line(12, 26, 12, top, lfD);
    // leaves
    const ly = dry ? 1 : 0;
    if (stage === 0) { p.ell(9, 22 + ly, 3, 1.6, lf); p.ell(15, 22 + ly, 3, 1.6, lf); p.px(8, 22 + ly, lfD); }
    else {
      p.ell(8, 22 + ly, 4, 2, lf); p.ell(16, 21 + ly, 4, 2, lf);
      p.px(6, 22 + ly, lfD); p.px(18, 21 + ly, lfD);
      if (stage >= 2) { p.ell(8.5, 17 + ly * 2, 3.5, 1.7, lf); p.ell(15.5, 16 + ly * 2, 3.5, 1.7, lf); }
      if (!dry) { p.px(7, 21, C.greenL); p.px(15, 20, C.greenL); }
    }
    if (stage === 2) { p.ell(hx, hy - 1, 2, 3, mood === 'wilt' ? C.brownL : BUD[type]); p.px(hx - 1, hy + 1, C.green); p.px(hx + 1, hy + 1, C.green); }
    if (stage === 3) HEAD[type](p, hx, hy - 2, mood === 'wilt');
  }));
}

export const soilPlot = (wet) => sprite(30, 26, p => {
  p.rect(1, 1, 28, 24, wet ? C.soilW : C.soil);
  p.rect(0, 2, 30, 22, wet ? C.soilW : C.soil);
  for (let y = 5; y < 24; y += 5) p.rect(2, y, 26, 1, wet ? C.soilWD : C.soilD);
  const r = rng(wet ? 7 : 3);
  for (let i = 0; i < 18; i++) p.px(2 + r() * 26, 2 + r() * 21, wet ? '#6a3a28' : C.brownL);
  if (wet) { p.px(5, 3, C.water); p.px(22, 13, C.water); p.px(12, 19, C.water); }
}, { outline: C.outSoft });

export const weeds = sprite(26, 18, p => {
  const r = rng(11);
  for (let i = 0; i < 9; i++) {
    const x = 2 + r() * 22, h = 5 + r() * 9;
    p.line(x, 17, x + (r() - .5) * 6, 17 - h, i % 2 ? C.greenD : '#4a8a2a');
  }
  p.ell(5, 14, 3, 2, '#4a8a2a'); p.ell(21, 13, 3.5, 2, C.greenD); p.ell(13, 15, 3, 1.5, '#3c7a28');
  p.px(4, 9, C.yellowD); p.px(20, 7, C.lavD);
});

export const bug = [0, 1].map(f => sprite(13, 8, p => {
  const c = '#a4e05a', cD = '#6fb33a';
  for (let i = 0; i < 4; i++) p.circ(3 + i * 2.4, 4 + ((i + f) % 2 ? -0.6 : 0.6), 1.9, i % 2 ? cD : c);
  p.circ(11, 3.5, 2.2, '#7bc94a'); p.px(12, 3, C.out); p.px(10, 1, C.out); p.px(12, 0, C.out);
}));

// tiny icons (8x8) used inside need bubbles and on the tool bar
const ICON_PAL = { k: C.out, b: C.water, B: C.blue, w: C.white, g: '#a4e05a', G: C.greenD, s: C.gray, S: C.grayD, p: C.pink, P: C.pinkD };
export const ICON8 = {
  water: ['...b....', '..bbb...', '..bbb...', '.bbwbb..', '.bwbbb..', '.bbbbB..', '..bbB...', '........'],
  bug: ['........', '......k.', '.....gg.', '.g.gggk.', 'gggggGg.', 'gGgGg...', '........', '........'],
  trim: ['p.....s.', 'pp...s..', '.pp.s...', '..ps....', '..sp....', '.s.pp...', 's...pp..', '.....p..'],
};
export const bubble = Object.fromEntries(Object.entries(ICON8).map(([k, rows]) => [k, sprite(14, 14, p => {
  p.rect(1, 0, 11, 11, C.white); p.rect(0, 1, 13, 9, C.white); p.rect(5, 11, 3, 1, C.white); p.px(6, 12, C.white);
  p.map(rows, ICON_PAL, 3, 1);
})]));

// tools 16x16
export const tools = {
  water: sprite(18, 16, p => {
    p.rect(6, 6, 9, 8, C.mint); p.rect(6, 12, 9, 2, C.mintD); p.rect(14, 6, 1, 8, C.mintD);
    p.rect(7, 3, 7, 1, C.grayD); p.px(6, 4, C.grayD); p.px(14, 4, C.grayD); p.px(6, 5, C.grayD); p.px(14, 5, C.grayD);
    p.line(5, 9, 1, 5, C.mintD); p.line(5, 10, 2, 7, C.mint); p.rect(0, 3, 2, 3, C.gray);
    p.px(8, 8, C.mintL); p.px(8, 9, C.mintL);
  }),
  bug: sprite(16, 16, p => {
    p.circ(10, 5.5, 4.6, C.white); p.circ(10, 5.5, 3.6, C.grayL);
    for (let i = 7; i < 14; i += 2) p.line(i, 2, i, 9, C.white);
    p.line(7, 9, 1, 15, C.brown); p.line(8, 9, 2, 15, C.brownL);
  }),
  trim: sprite(16, 16, p => {
    p.line(3, 13, 12, 2, C.grayD); p.line(4, 13, 13, 2, C.gray);
    p.line(3, 2, 12, 13, C.grayD); p.line(4, 2, 13, 13, C.gray);
    p.circ(3, 12.5, 2.4, C.pink); p.circ(12.5, 12.5, 2.4, C.pink); p.px(3, 12, C.out); p.px(12, 12, C.out);
    p.px(8, 7, C.yellow);
  }),
};

export const cursorFrame = [0, 1].map(f => sprite(36, 32, p => {
  const c = f ? C.white : C.yellow, l = 7;
  const o = f ? 0 : 1;
  [[o, o, 1, 1], [35 - o, o, -1, 1], [o, 31 - o, 1, -1], [35 - o, 31 - o, -1, -1]].forEach(([x, y, dx, dy]) => {
    p.rect(Math.min(x, x + dx * (l - 1)), y, l, 2, c); p.rect(x - (dx < 0 ? 1 : 0), Math.min(y, y + dy * (l - 1)), 2, l, c);
  });
}));

// ---------------------------------------------------------------- scenery
export const tree = sprite(34, 40, p => {
  p.rect(14, 28, 6, 10, C.brown); p.rect(18, 28, 2, 10, C.brownD); p.rect(12, 37, 10, 2, C.brownD);
  p.circ(17, 16, 14, C.greenD); p.circ(13, 13, 10, C.green); p.circ(22, 12, 8, C.green); p.circ(15, 9, 7, C.greenL);
  p.circ(24, 21, 6, C.green); p.circ(9, 22, 5, C.green);
  [[9, 9], [14, 6], [20, 8], [11, 15], [24, 16]].forEach(([x, y]) => p.px(x, y, '#c4ef8f'));
  [[10, 18], [22, 22], [16, 24]].forEach(([x, y]) => p.circ(x, y, 1.3, C.pink));
});
export const treeRound = sprite(26, 30, p => {
  p.rect(11, 22, 4, 7, C.brown); p.circ(13, 12, 11, C.greenD); p.circ(11, 10, 8, C.green); p.circ(9, 8, 4, C.greenL);
  p.circ(17, 13, 1.5, C.red); p.circ(8, 15, 1.5, C.red); p.circ(14, 6, 1.5, C.red);
});
export const bush = sprite(20, 14, p => {
  p.ell(10, 8, 9, 5.5, C.greenD); p.ell(8, 6.5, 6, 4, C.green); p.ell(14, 7, 4, 3, C.green); p.px(6, 4, C.greenL); p.px(7, 4, C.greenL);
  p.px(4, 8, C.pink); p.px(13, 5, C.yellow); p.px(16, 9, C.pink);
});
export const flowerTuft = [C.pink, C.yellow, C.lav, C.white, C.red].map(col => sprite(9, 8, p => {
  p.line(4, 7, 4, 3, C.greenD); p.px(3, 6, C.green); p.px(5, 5, C.green);
  p.px(4, 1, col); p.px(3, 2, col); p.px(5, 2, col); p.px(4, 3, col); p.px(4, 2, C.yellow === col ? C.orange : C.yellow);
}, { outline: null }));
export const fenceH = sprite(16, 14, p => {
  p.rect(0, 4, 16, 2, C.creamD); p.rect(0, 9, 16, 2, C.creamD);
  p.rect(2, 1, 3, 12, C.cream); p.rect(11, 1, 3, 12, C.cream); p.px(3, 0, C.cream); p.px(12, 0, C.cream);
  p.rect(4, 2, 1, 11, C.creamD); p.rect(13, 2, 1, 11, C.creamD);
});
export const fenceV = sprite(6, 18, p => { p.rect(1, 0, 4, 18, C.cream); p.rect(4, 0, 1, 18, C.creamD); p.rect(1, 5, 4, 1, C.creamD); p.rect(1, 12, 4, 1, C.creamD); });
export const rock = sprite(12, 9, p => { p.ell(6, 5, 5.5, 3.6, C.gray); p.ell(5, 4, 3.5, 2.2, C.grayL); p.px(8, 6, C.grayD); });
export const mushroom = sprite(9, 9, p => { p.rect(3, 5, 3, 3, C.cream); p.ell(4.5, 4, 4, 3, C.red); p.px(3, 2, C.white); p.px(6, 3, C.white); });
export const butterfly = [0, 1].map(f => sprite(9, 7, p => {
  const w = f ? 2 : 4; p.ell(4.5 - w / 2, 3, w / 2 + .3, 2.5, C.pink); p.ell(4.5 + w / 2, 3, w / 2 + .3, 2.5, C.pink); p.rect(4, 1, 1, 5, C.out);
}, { outline: null }));

export const shed = sprite(56, 52, p => {
  p.rect(4, 22, 48, 28, C.brownL); for (let x = 4; x < 52; x += 6) p.rect(x, 22, 1, 28, C.brown);
  p.rect(20, 32, 16, 18, C.brownD); p.rect(21, 33, 14, 17, C.brown); p.line(21, 33, 34, 49, C.brownD); p.line(34, 33, 21, 49, C.brownD);
  p.rect(7, 28, 9, 8, C.skyL); p.rect(7, 28, 9, 1, C.white); p.rect(11, 28, 1, 8, C.white); p.rect(40, 28, 9, 8, C.skyL); p.rect(44, 28, 1, 8, C.white);
  for (let y = 0; y < 22; y++) { const w = 2 + y * 2.4; p.rect(28 - w, y + 2, w * 2, 1, y % 4 === 3 ? C.lavD : C.lav); }
  p.rect(0, 22, 56, 2, C.lavD);
  p.ell(11, 50, 6, 2.5, C.greenD); p.ell(45, 50, 6, 2.5, C.greenD); p.px(9, 48, C.pink); p.px(46, 48, C.yellow); p.px(12, 49, C.pink);
});
export const pond = sprite(64, 34, p => {
  p.ell(32, 17, 31, 16, C.grayL); p.ell(32, 17, 28, 13.5, C.water); p.ell(30, 14, 22, 9, '#8fd6f5');
  p.rect(14, 12, 6, 1, C.white); p.rect(38, 21, 8, 1, C.white);
  p.ell(45, 12, 5, 3, C.green); p.px(45, 12, C.pink); p.px(44, 11, C.pinkL); p.ell(18, 22, 4, 2.4, C.green);
});
export const signPost = sprite(22, 26, p => { p.rect(10, 12, 2, 14, C.brownD); p.rect(1, 2, 20, 11, C.brownL); p.rect(1, 11, 20, 2, C.brown); });
export const wheelbarrow = sprite(26, 18, p => {
  p.rect(4, 4, 16, 7, C.blue); p.rect(4, 4, 16, 2, '#7fb6ef'); p.line(20, 6, 25, 3, C.brownD); p.line(4, 10, 1, 13, C.grayD);
  p.circ(6, 13, 3.4, C.out); p.circ(6, 13, 1.6, C.gray);
  p.circ(9, 3, 2.5, C.pink); p.circ(14, 3, 2.5, C.yellow); p.circ(18, 3, 2, C.red); p.px(11, 1, C.green);
});

// ---------------------------------------------------------------- carry
export const bigPot = sprite(26, 28, p => {
  p.ell(13, 9, 11, 8, C.greenD); p.ell(11, 7, 8, 6, C.green); p.ell(16, 6, 5, 4, C.green); p.circ(9, 5, 2, C.greenL);
  [[6, 7, C.pink], [12, 3, C.yellow], [18, 8, C.pink], [15, 11, C.white], [8, 12, C.yellow], [20, 4, C.red]].forEach(([x, y, c]) => { p.circ(x, y, 1.6, c); });
  for (let y = 15; y < 27; y++) { const w = 9 - (y - 15) * 0.25; p.rect(13 - w, y, w * 2, 1, C.pot); p.px(13 + w - 1, y, C.potD); }
  p.rect(2, 14, 22, 3, C.potL); p.rect(2, 16, 22, 1, C.potD); p.rect(6, 20, 14, 1, C.potD); p.px(7, 19, C.white);
});
export const brokenPot = sprite(32, 18, p => {
  p.ell(16, 12, 15, 5, C.soil); p.ell(14, 11, 9, 3, C.soilD);
  p.rect(3, 9, 6, 4, C.pot); p.rect(22, 10, 7, 5, C.pot); p.rect(13, 13, 5, 4, C.potD);
  p.ell(18, 7, 5, 3, C.green); p.circ(16, 6, 1.5, C.pink); p.circ(20, 6, 1.5, C.yellow);
});
export const dog = [0, 1].map(f => sprite(20, 15, p => {
  p.ell(9, 8, 7, 4, C.orange); p.ell(9, 9.5, 5, 2, C.cream);
  p.circ(16, 5, 3.8, C.orange); p.ell(17.5, 6.5, 2, 1.5, C.cream); p.px(19, 6, C.out); p.px(16, 4, C.out);
  p.rect(13, 1, 2, 2, C.orangeD); p.px(17, 1, C.orangeD);
  p.line(2, 6, 0, f ? 2 : 4, C.orange);
  const a = f ? 1 : -1; p.rect(4 + a, 11, 2, 3, C.orangeD); p.rect(12 - a, 11, 2, 3, C.orangeD); p.rect(7 - a, 11, 2, 3, C.orange); p.rect(14 + a, 11, 2, 3, C.orange);
}));
export const cat = sprite(16, 12, p => {
  p.ell(8, 8, 7, 3.6, C.grayL); p.circ(4, 6, 3.2, C.grayL); p.px(2, 2, C.grayL); p.px(1, 3, C.grayL); p.px(6, 2, C.grayL); p.px(6, 3, C.grayL);
  p.line(3, 6, 4, 6, C.out); p.line(6, 6, 6, 6, C.out); p.line(14, 9, 15, 5, C.gray); p.ell(11, 8, 2, 1.5, C.gray);
});
export const hedge = sprite(16, 16, p => {
  p.rect(0, 2, 16, 13, C.greenD); p.ell(4, 4, 4, 3, C.green); p.ell(12, 4, 4, 3, C.green); p.ell(8, 8, 5, 4, C.green);
  p.px(3, 3, C.greenL); p.px(11, 3, C.greenL); p.px(7, 7, C.greenL); p.rect(0, 14, 16, 2, '#245e2c');
}, { outline: null });
export const flowerBed = sprite(16, 16, p => {
  p.rect(0, 3, 16, 12, C.soil); p.rect(0, 14, 16, 2, C.brownD);
  [[3, 6, C.pink], [8, 5, C.yellow], [13, 7, C.red], [5, 11, C.lav], [11, 11, C.pink]].forEach(([x, y, c]) => { p.px(x, y + 1, C.green); p.px(x - 1, y + 2, C.green); p.circ(x, y, 1.5, c); });
}, { outline: null });
export const stoneTile = makeCanvas(16, 16, g => {
  g.fillStyle = '#e9d9b6'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#d9c39a'; g.fillRect(0, 7, 16, 1); g.fillRect(7, 0, 1, 7); g.fillRect(12, 8, 1, 8); g.fillRect(3, 8, 1, 8);
  g.fillStyle = '#f5ead0'; g.fillRect(1, 1, 3, 1); g.fillRect(9, 9, 2, 1);
});
export const doormat = sprite(36, 22, p => {
  p.rect(0, 0, 36, 22, C.pink); p.rect(2, 2, 32, 18, C.pinkL);
  for (let x = 4; x < 32; x += 4) { p.rect(x, 2, 2, 18, C.pink); }
  p.circ(18, 11, 5, C.white); p.circ(18, 11, 3, C.yellow);
});

// ---------------------------------------------------------------- drive
export const truck = sprite(26, 42, p => {
  p.rect(1, 6, 3, 7, C.out); p.rect(22, 6, 3, 7, C.out); p.rect(1, 29, 3, 8, C.out); p.rect(22, 29, 3, 8, C.out);
  p.rect(4, 2, 18, 14, C.cream); p.rect(5, 1, 16, 1, C.cream); p.rect(4, 13, 18, 3, C.creamD);
  p.rect(6, 4, 14, 5, C.sky); p.rect(7, 5, 3, 1, C.white); p.rect(12, 7, 2, 1, C.white);
  p.rect(5, 1, 3, 1, C.yellow); p.rect(18, 1, 3, 1, C.yellow);
  p.rect(6, 10, 14, 3, C.pinkL);
  p.rect(3, 16, 20, 24, C.cream); p.rect(5, 18, 16, 20, C.brownL);
  for (let y = 21; y < 38; y += 4) p.rect(5, y, 16, 1, C.brown);
  p.rect(3, 38, 20, 2, C.creamD); p.px(4, 39, C.red); p.px(21, 39, C.red);
});
export const truckSide = sprite(76, 42, p => {
  p.rect(4, 14, 44, 18, C.cream); p.rect(4, 14, 44, 3, C.white); p.rect(4, 26, 70, 6, C.creamD);
  p.rect(48, 6, 22, 26, C.cream); p.rect(70, 16, 5, 16, C.cream); p.rect(51, 9, 14, 9, C.sky); p.rect(53, 10, 4, 2, C.white);
  p.rect(48, 6, 22, 2, C.pinkL); p.rect(72, 20, 3, 3, C.yellow); p.rect(56, 21, 4, 1, C.creamD);
  for (let x = 8; x < 46; x += 9) { p.rect(x, 18, 6, 6, C.pot); p.rect(x - 1, 17, 8, 2, C.potL); p.ell(x + 3, 12, 5, 5, C.green); p.circ(x + 1, 11, 1.8, [C.pink, C.red, C.yellow, C.lav, C.pink][(x / 9) | 0]); p.circ(x + 5, 13, 1.5, C.white); }
  [[16, 34], [60, 34]].forEach(([x, y]) => { p.circ(x, y, 6.5, C.out); p.circ(x, y, 3, C.gray); p.circ(x, y, 1.2, C.grayL); });
  p.rect(10, 28, 30, 1, C.pinkD);
});
export const potTop = [C.pink, C.red, C.yellow, C.lav, C.white, C.pink].map(col => sprite(9, 9, p => {
  p.circ(4.5, 4.5, 4, C.pot); p.circ(4.5, 4.5, 3, C.green); p.circ(3.5, 3.5, 1.6, col); p.px(6, 6, col);
}));
export const cone = sprite(11, 13, p => {
  for (let y = 0; y < 10; y++) { const w = 1 + y * 0.45; p.rect(5.5 - w, y + 1, w * 2, 1, C.orange); }
  p.rect(2, 5, 7, 2, C.white); p.rect(0, 10, 11, 2, C.orangeD);
});
export const pothole = sprite(22, 12, p => {
  p.ell(11, 6, 10, 5, C.roadD); p.ell(11, 6.5, 8, 3.5, '#4a4758'); p.px(3, 3, C.roadL); p.px(18, 8, C.roadL); p.line(19, 3, 21, 1, '#4a4758');
}, { outline: null });
export const puddle = sprite(26, 13, p => { p.ell(13, 6.5, 12.5, 6, C.water); p.ell(11, 5, 7, 3, '#9fdcf7'); p.rect(6, 4, 4, 1, C.white); p.rect(15, 8, 3, 1, C.white); }, { outline: null });
export const duck = [0, 1].map(f => sprite(13, 13, p => {
  p.ell(6, 8, 5, 3.5, C.white); p.circ(9, 4, 2.8, C.white); p.rect(11, 4, 2, 1, C.orange); p.px(9, 3, C.out);
  p.ell(5, 8, 2.5, 1.6, C.grayL); p.rect(4 + (f ? 1 : 0), 11, 1, 2, C.orange); p.rect(7 - (f ? 1 : 0), 11, 1, 2, C.orange);
}));
export const duckling = [0, 1].map(f => sprite(9, 9, p => {
  p.ell(4, 5.5, 3.5, 2.5, C.yellow); p.circ(6, 3, 2, C.yellow); p.px(8, 3, C.orange); p.px(6, 2, C.out); p.px(3 + f, 8, C.orange); p.px(5 - f, 8, C.orange);
}));
export const tractor = sprite(24, 32, p => {
  p.rect(0, 18, 6, 12, C.out); p.rect(18, 18, 6, 12, C.out); p.rect(2, 3, 4, 6, C.out); p.rect(18, 3, 4, 6, C.out);
  p.rect(6, 2, 12, 16, C.red); p.rect(7, 3, 10, 3, '#ff7a8a'); p.rect(5, 16, 14, 14, C.redD); p.rect(7, 19, 10, 8, C.grayL); p.rect(9, 21, 6, 4, C.out);
  p.rect(16, 0, 2, 4, C.grayD);
});
export const scooter = sprite(12, 26, p => {
  p.rect(4, 0, 4, 5, C.out); p.rect(4, 21, 4, 5, C.out); p.rect(3, 4, 6, 17, C.mint); p.rect(1, 6, 10, 2, C.grayD);
  p.circ(6, 13, 3.6, C.yellow); p.circ(6, 12.5, 2.4, C.yellowD); p.rect(4, 17, 4, 3, C.lav);
});
export const sparkleFlower = [0, 1].map(f => sprite(13, 13, p => {
  const c = f ? C.pinkL : C.pink;
  for (let a = 0; a < 5; a++) p.circ(6.5 + Math.cos(a * 1.257 - 1.57) * 3.3, 6.5 + Math.sin(a * 1.257 - 1.57) * 3.3, 2.2, c);
  p.circ(6.5, 6.5, 1.8, C.yellow); p.px(5, 5, C.white);
}));
export const house = [C.pinkL, C.lavL, C.mintL, C.cream].map((wall, i) => sprite(40, 40, p => {
  const roof = [C.rose, C.lavD, C.mintD, C.orange][i];
  p.rect(2, 14, 36, 24, wall); p.rect(2, 34, 36, 4, C.creamD);
  for (let y = 0; y < 14; y++) p.rect(20 - (y * 1.5 + 4), y + 1, (y * 1.5 + 4) * 2, 1, y % 3 === 2 ? C.out : roof);
  p.rect(16, 24, 8, 14, C.brown); p.px(22, 31, C.yellow); p.rect(5, 19, 8, 7, C.sky); p.rect(27, 19, 8, 7, C.sky); p.rect(8, 19, 1, 7, C.white); p.rect(30, 19, 1, 7, C.white);
}));
export const lampPost = sprite(8, 30, p => { p.rect(3, 6, 2, 24, C.grayD); p.rect(1, 1, 6, 5, C.cream); p.rect(2, 2, 4, 3, C.yellow); p.rect(1, 28, 6, 2, C.grayD); });

// ---------------------------------------------------------------- shop facade (title & finale)
export function shopFacade(w = 230, h = 168) {
  return sprite(w, h, p => {
    const cx = w / 2;
    // roof
    for (let y = 0; y < 34; y++) { const half = cx - 22 + y * 0.9; p.rect(cx - half, y + 4, half * 2, 1, y % 6 === 5 ? C.lavD : C.lav); }
    p.rect(cx - 30, 0, 60, 6, C.lavD); p.rect(cx - 6, 8, 12, 14, C.white); p.circ(cx, 15, 4, C.pink); p.circ(cx, 15, 2, C.yellow);
    p.rect(10, 37, w - 20, 3, C.lavD);
    // walls
    p.rect(14, 40, w - 28, h - 46, C.cream); for (let y = 46; y < h - 8; y += 7) p.rect(14, y, w - 28, 1, C.creamD);
    p.rect(14, 40, 5, h - 46, C.creamD); p.rect(w - 19, 40, 5, h - 46, C.creamD);
    // sign board (blank — text is overlaid in the DOM)
    p.rect(cx - 72, 42, 144, 26, C.brownD); p.rect(cx - 70, 44, 140, 22, C.white); p.rect(cx - 70, 63, 140, 3, C.pinkL);
    [[cx - 74, 42], [cx + 70, 42]].forEach(([x, y]) => { p.circ(x + 2, y + 13, 4, C.pink); p.circ(x + 2, y + 13, 2, C.yellow); });
    // awning with scallops
    for (let x = 12; x < w - 12; x++) p.rect(x, 72, 1, 14, (((x - 12) / 9) | 0) % 2 ? C.white : C.pink);
    for (let x = 12; x < w - 12; x += 9) p.ell(x + 4.5, 86, 4.5, 3, ((((x - 12) / 9) | 0) % 2) ? C.white : C.pink);
    p.rect(12, 71, w - 24, 2, C.pinkD);
    // string lights
    for (let x = 16; x < w - 16; x += 8) { p.px(x, 92 + Math.round(Math.sin(x * 0.4) * 1.5), [C.yellow, C.pink, C.mint, C.lav][(x / 8) % 4 | 0]); }
    // windows
    [[26, 98], [w - 82, 98]].forEach(([x, y]) => {
      p.rect(x, y, 56, 42, C.white); p.rect(x + 3, y + 3, 50, 36, C.skyL); p.rect(x + 27, y + 3, 2, 36, C.white);
      p.line(x + 8, y + 30, x + 20, y + 6, C.white); p.line(x + 35, y + 26, x + 44, y + 8, C.white);
      p.rect(x - 2, y + 40, 60, 4, C.creamD);
      for (let i = 0; i < 5; i++) { p.rect(x + 3 + i * 11, y + 32, 7, 7, C.pot); p.ell(x + 6.5 + i * 11, y + 29, 4, 3.5, C.green); p.circ(x + 6 + i * 11, y + 27, 2, [C.pink, C.yellow, C.red, C.lav, C.white][i]); }
    });
    // door
    p.rect(cx - 19, 96, 38, h - 102, C.brownD); p.rect(cx - 17, 98, 34, h - 104, C.pink); p.rect(cx - 1, 98, 2, h - 104, C.pinkD);
    p.circ(cx - 8, 112, 5, C.skyL); p.circ(cx + 8, 112, 5, C.skyL); p.px(cx - 4, 132, C.yellow); p.px(cx + 3, 132, C.yellow);
    p.ell(cx, 100, 10, 4, C.green); [[-6, 99], [0, 97], [6, 100], [-2, 101]].forEach(([dx, y], i) => p.circ(cx + dx, y, 1.6, [C.red, C.white, C.yellow, C.pink][i]));
    // flower buckets along the bottom
    const r = rng(5);
    for (let x = 8; x < w - 8; x += 13) {
      if (Math.abs(x + 5 - cx) < 24) continue;
      p.rect(x, h - 12, 10, 11, [C.mint, C.lav, C.yellowD, C.pinkL][(x / 13 | 0) % 4]); p.rect(x - 1, h - 13, 12, 2, C.grayL);
      const col = [C.red, C.pink, C.yellow, C.white, C.lav, C.orange][(r() * 6) | 0];
      for (let k = 0; k < 4; k++) { p.circ(x + 2 + r() * 6, h - 17 - r() * 6, 2.2, col); }
      p.px(x + 5, h - 13, C.green); p.px(x + 3, h - 14, C.green);
    }
  });
}

// ---------------------------------------------------------------- word drawings (round 4)
function star4(p, cx, cy, r, c) { for (let i = -r; i <= r; i++) { const w = Math.max(0, Math.round((r - Math.abs(i)) / 3)); p.rect(cx - w, cy + i, w * 2 + 1, 1, c); p.rect(cx + i, cy - w, 1, w * 2 + 1, c); } }
const DRAW = {
  hong: p => { p.line(16, 31, 16, 14, C.greenD); p.line(17, 31, 17, 14, C.green); p.ell(11, 23, 5, 2.5, C.green); p.ell(22, 26, 5, 2.5, C.green); p.circ(16.5, 10, 8, C.red); p.circ(12, 4, 3, C.red); p.circ(21, 4, 3, C.red); p.circ(16.5, 10, 5.5, C.redD); p.circ(16.5, 10, 4.3, C.red); p.circ(16.5, 10, 2.6, C.redD); p.circ(16.5, 10, 1.4, C.red); p.px(12, 6, C.pinkL); p.px(13, 5, C.pinkL); },
  cuc: p => { p.line(16, 31, 16, 18, C.greenD); p.ell(11, 26, 5, 2, C.green); p.ell(22, 24, 4, 1.8, C.green); for (let a = 0; a < 12; a++) { const t = a * 0.5236; p.ell(16.5 + Math.cos(t) * 8.5, 12 + Math.sin(t) * 8.5, 2.2, 2.2, C.white); p.line(16.5 + Math.cos(t) * 4, 12 + Math.sin(t) * 4, 16.5 + Math.cos(t) * 10, 12 + Math.sin(t) * 10, C.white); } for (let a = 0; a < 12; a++) { const t = a * 0.5236 + .26; p.line(16.5 + Math.cos(t) * 6, 12 + Math.sin(t) * 6, 16.5 + Math.cos(t) * 9, 12 + Math.sin(t) * 9, C.lavL); } p.circ(16.5, 12, 4.2, C.yellow); p.px(15, 11, C.yellowD); p.px(18, 13, C.yellowD); p.px(16, 14, C.orange); },
  sen: p => { p.ell(16.5, 27, 15, 4, C.green); p.ell(16.5, 27, 10, 2, C.greenD); p.ell(7, 20, 4, 5, C.pinkL); p.ell(26, 20, 4, 5, C.pinkL); p.ell(11, 15, 4, 8, C.pink); p.ell(22, 15, 4, 8, C.pink); p.ell(16.5, 12, 4.5, 10, C.pinkL); p.line(16.5, 4, 16.5, 20, C.pink); p.px(16, 3, C.rose); p.px(10, 8, C.rose); p.px(23, 8, C.rose); },
  huongduong: p => { p.line(16, 31, 16, 22, C.greenD); p.ell(10, 27, 5, 2, C.green); p.circ(16.5, 13, 12, C.yellow); for (let a = 0; a < 16; a++) { const t = a * 0.393; p.px(16.5 + Math.cos(t) * 11.5, 13 + Math.sin(t) * 11.5, null); p.px(16.5 + Math.cos(t + .2) * 9, 13 + Math.sin(t + .2) * 9, C.yellowD); } p.circ(16.5, 13, 6.5, C.brown); for (let i = 0; i < 9; i++) p.px(13 + (i % 3) * 3, 10 + ((i / 3) | 0) * 3, C.brownD); },
  meo: p => { p.ell(16.5, 19, 13, 11, C.orange); for (let y = 0; y < 9; y++) { p.rect(5 + y * 0.4, 3 + y, 1 + y * 0.9, 1, C.orange); p.rect(28 - y * 0.4 - y * 0.9, 3 + y, 1 + y * 0.9, 1, C.orange); } p.ell(16.5, 22, 7, 5, C.cream); p.rect(9, 15, 3, 4, C.out); p.rect(21, 15, 3, 4, C.out); p.px(10, 15, C.white); p.px(22, 15, C.white); p.rect(15, 20, 3, 2, C.pink); p.line(16, 22, 14, 24, C.out); p.line(17, 22, 19, 24, C.out); p.line(2, 19, 9, 21, C.out); p.line(2, 24, 9, 23, C.out); p.line(31, 19, 24, 21, C.out); p.line(31, 24, 24, 23, C.out); p.rect(12, 8, 1, 3, C.orangeD); p.rect(16, 7, 1, 4, C.orangeD); p.rect(20, 8, 1, 3, C.orangeD); },
  vit: p => { p.ell(18, 22, 12, 8, C.yellow); p.circ(10, 11, 7, C.yellow); p.ell(1.5, 13, 3, 2, C.orange); p.rect(1, 12, 4, 3, C.orange); p.rect(9, 9, 2, 2, C.out); p.ell(20, 21, 6, 3.5, C.yellowD); p.ell(28, 16, 3, 2, C.yellow); p.ell(16, 30.5, 8, 1.5, C.water); },
  banhmi: p => { for (let i = 0; i <= 20; i++) { const t = i / 20; p.circ(4 + t * 24, 25 - t * 17, 5 - Math.abs(t - .5) * 2, C.orange); } for (let i = 0; i <= 20; i++) { const t = i / 20; p.circ(4 + t * 24, 23 - t * 17, 2.5 - Math.abs(t - .5) * 2, C.yellowD); } [[9, 19], [15, 15], [21, 11]].forEach(([x, y]) => { p.line(x, y + 2, x + 4, y - 2, C.cream); p.line(x + 1, y + 2, x + 5, y - 2, C.cream); }); },
  trasua: p => { for (let y = 8; y < 30; y++) { const w = 8 - (y - 8) * 0.12; p.rect(16.5 - w, y, w * 2, 1, '#e8c39a'); } p.rect(9, 8, 15, 3, C.white); for (let i = 0; i < 7; i++) p.circ(11 + (i % 4) * 3.4 + (i > 3 ? 1.6 : 0), 27 - (i > 3 ? 3 : 0), 1.4, C.out); p.ell(16.5, 7, 9, 3.5, C.lavL); p.rect(7, 7, 19, 1, C.lav); p.line(19, 0, 17, 7, C.pink); p.line(20, 0, 18, 7, C.pinkD); p.rect(11, 15, 2, 6, '#f5dcc0'); },
  ngaingu: p => { p.circ(14, 19, 11, C.yellow); p.line(7, 18, 11, 18, C.out); p.px(7, 17, C.out); p.px(11, 17, C.out); p.line(16, 18, 20, 18, C.out); p.px(16, 17, C.out); p.px(20, 17, C.out); p.ell(13.5, 24, 2, 1.5, C.brownD); p.px(18, 25, C.water); p.px(18, 26, C.water); p.ell(9, 21, 2, 1, C.pink); p.ell(19, 21, 2, 1, C.pink); const Z = (x, y, s) => { p.line(x, y, x + s, y, C.lavD); p.line(x + s, y, x, y + s, C.lavD); p.line(x, y + s, x + s, y + s, C.lavD); }; Z(23, 2, 6); Z(27, 10, 3); p.rect(5, 6, 18, 2, C.lav); p.rect(5, 4, 4, 2, C.lav); },
  cay: p => { for (let i = 0; i <= 24; i++) { const t = i / 24; p.circ(9 + t * 14 + Math.sin(t * 3) * 3, 9 + t * 19, 5 - t * 4, C.red); } p.px(9, 7, C.pinkL); p.px(10, 8, C.pinkL); p.rect(7, 2, 4, 4, C.green); p.line(9, 2, 12, 0, C.greenD); [[24, 6, C.orange, 4], [28, 12, C.yellow, 3], [21, 1, C.yellow, 2.5]].forEach(([x, y, c, r]) => { p.ell(x, y, r, r + 1.5, c); p.px(x, y - r - 2, c); }); p.ell(24, 7, 2, 2.5, C.yellow); },
  lapanh: p => { star4(p, 15, 15, 12, C.yellow); star4(p, 15, 15, 7, C.white); star4(p, 27, 5, 4, C.pink); star4(p, 5, 26, 4, C.lav); star4(p, 27, 26, 3, C.mint); star4(p, 4, 4, 2, C.pink); },
  lanh: p => { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; const dx = Math.cos(a) * 13, dy = Math.sin(a) * 13; p.line(16 - dx, 16 - dy, 16 + dx, 16 + dy, C.blue); p.line(16.5 - dx, 16.5 - dy, 16.5 + dx, 16.5 + dy, C.water); for (const s of [-1, 1]) { const bx = 16 + s * dx * .6, by = 16 + s * dy * .6, b2 = a + Math.PI / 4, b3 = a - Math.PI / 4; p.line(bx, by, bx + Math.cos(b2) * 4 * s, by + Math.sin(b2) * 4 * s, C.blue); p.line(bx, by, bx + Math.cos(b3) * 4 * s, by + Math.sin(b3) * 4 * s, C.blue); } } p.circ(16, 16, 2.5, C.white); },
};
const drawCache = {};
export function wordArt(key) { return drawCache[key] || (drawCache[key] = sprite(33, 33, DRAW[key])); }

// "Mai"'s version: same subject, crayon-sketch outline with hatching
export function sketchArt(key) {
  const k = key + '_s'; if (drawCache[k]) return drawCache[k];
  const src = wordArt(key), g = src.getContext('2d'), d = g.getImageData(0, 0, 33, 33).data;
  const op = (x, y) => x >= 0 && y >= 0 && x < 33 && y < 33 && d[(y * 33 + x) * 4 + 3] > 0;
  const p = new Painter(33, 33);
  for (let y = 0; y < 33; y++) for (let x = 0; x < 33; x++) {
    if (!op(x, y)) continue;
    const i = (y * 33 + x) * 4; const dark = d[i] + d[i + 1] + d[i + 2] < 200;
    const edge = !op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1);
    if (edge || dark) p.px(x, y, C.violet);
    else if ((x + y) % 4 === 0) p.px(x, y, C.lav);
  }
  return (drawCache[k] = p.canvas());
}

// ---------------------------------------------------------------- UI / cheer icons
export const heart = sprite(11, 10, p => { p.circ(3, 3.5, 2.8, C.pink); p.circ(8, 3.5, 2.8, C.pink); for (let y = 4; y < 9; y++) p.rect(1 + (y - 4), y, 9 - (y - 4) * 2, 1, C.pink); p.px(2, 2, C.white); });
export const star = sprite(13, 13, p => { star4(p, 6, 6, 6, C.yellow); p.circ(6, 6, 2.6, C.yellow); p.px(5, 4, C.white); });
export const starEmpty = sprite(13, 13, p => { star4(p, 6, 6, 6, C.grayL); p.circ(6, 6, 2.6, C.grayL); }, { outline: C.grayD });
export const note = sprite(9, 11, p => { p.rect(5, 0, 1, 8, C.lavD); p.rect(5, 0, 3, 2, C.lavD); p.circ(3.5, 8, 2.4, C.lavD); });
export const petal = [C.pink, C.pinkL, C.white, C.lavL].map(c => sprite(4, 3, p => { p.rect(1, 0, 2, 3, c); p.rect(0, 1, 4, 1, c); }, { outline: null }));

export function toURL(cv, scale = 4) {
  const big = makeCanvas(cv.width * scale, cv.height * scale, g => { g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, cv.width * scale, cv.height * scale); });
  return big.toDataURL();
}

export const easel = sprite(30, 40, p => {
  p.line(6, 39, 13, 2, C.brownD); p.line(7, 39, 14, 2, C.brown); p.line(23, 39, 16, 2, C.brownD); p.line(22, 39, 15, 2, C.brown);
  p.line(15, 4, 15, 38, C.brownD);
  p.rect(2, 6, 26, 22, C.creamD); p.rect(3, 7, 24, 20, '#f7e7c4'); p.rect(3, 27, 24, 2, C.brown);
  p.rect(1, 28, 28, 2, C.brownL);
});
export const shelf = sprite(70, 26, p => {
  p.rect(0, 20, 70, 4, C.brownL); p.rect(0, 23, 70, 2, C.brownD);
  for (let i = 0; i < 5; i++) { const x = 4 + i * 14; p.rect(x, 12, 9, 8, [C.pot, C.mint, C.lav, C.pot, C.yellowD][i]); p.ell(x + 4.5, 9, 5, 4, C.green); p.circ(x + 3, 7, 1.8, [C.pink, C.red, C.yellow, C.white, C.pink][i]); p.circ(x + 6, 10, 1.4, [C.white, C.yellow, C.pink, C.pink, C.red][i]); }
});
export const windowIn = sprite(56, 44, p => {
  p.rect(0, 0, 56, 44, C.white); p.rect(3, 3, 50, 36, C.sky); p.rect(3, 26, 50, 13, '#a6e3a0'); p.ell(18, 26, 14, 5, C.green); p.ell(42, 27, 12, 4, C.greenD);
  p.rect(27, 3, 2, 36, C.white); p.rect(3, 20, 50, 2, C.white); p.rect(8, 8, 8, 3, C.white); p.rect(36, 10, 10, 3, C.white);
  p.rect(-2, 39, 60, 5, C.creamD);
  p.rect(0, 0, 10, 40, C.pinkL); p.rect(46, 0, 10, 40, C.pinkL); p.rect(9, 0, 1, 40, C.pink); p.rect(46, 0, 1, 40, C.pink);
});
export const heartEmpty = sprite(11, 10, p => { p.circ(3, 3.5, 2.8, C.grayL); p.circ(8, 3.5, 2.8, C.grayL); for (let y = 4; y < 9; y++) p.rect(1 + (y - 4), y, 9 - (y - 4) * 2, 1, C.grayL); }, { outline: C.grayD });
export const sprinkler = sprite(12, 10, p => { p.ell(6, 7, 5.5, 2.6, C.grayD); p.ell(6, 6.5, 4, 1.8, C.gray); p.rect(5, 1, 2, 6, C.grayL); p.rect(4, 0, 4, 2, C.blue); });

// ---------------------------------------------------------------- round 4: paint flowers
// colours are bitmasks: 1 đỏ (Đào) · 2 vàng (Mai) · 4 xanh dương (Lan); mixes like real paint
export const PAINTS = {
  1: { name: 'Đỏ', c: '#ff5a6e', d: '#c93a50' }, 2: { name: 'Vàng', c: '#ffd23f', d: '#e0a92a' }, 4: { name: 'Xanh dương', c: '#4aa3ff', d: '#2f72c9' },
  3: { name: 'Cam', c: '#ff9a3c', d: '#d06f1e' }, 6: { name: 'Xanh lá', c: '#5fd36a', d: '#36a046' }, 5: { name: 'Tím', c: '#a46cf0', d: '#7848c2' },
  7: { name: 'Cầu vồng', c: '#ffffff', d: '#d8d9e6' },
};
const RAINBOW = ['#ff5a6e', '#ff9a3c', '#ffd23f', '#5fd36a', '#4aa3ff', '#a46cf0'];
const flowerCache = {};
export function paintFlower(mask, size = 15) {
  const k = mask + '_' + size; if (flowerCache[k]) return flowerCache[k];
  const P = PAINTS[mask], c = size / 2, pr = size * 0.2, pd = size * 0.27;
  return (flowerCache[k] = sprite(size, size, p => {
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3 - Math.PI / 2;
      p.circ(c + Math.cos(ang) * pd, c + Math.sin(ang) * pd, pr, mask === 7 ? RAINBOW[a] : P.c);
    }
    p.circ(c, c, size * 0.17, mask === 2 ? C.orange : C.yellow);
    if (size >= 12) { p.px(c - 2, c - pd - 2, C.white); p.px(c - 1, c - 1, C.white); } // shine
  }));
}
export const paintBucket = Object.fromEntries([1, 2, 4].map(m => [m, sprite(14, 14, p => {
  p.rect(2, 4, 10, 9, C.grayL); p.rect(10, 4, 2, 9, C.gray); p.rect(1, 3, 12, 2, C.gray);
  p.ell(7, 4, 5, 1.6, PAINTS[m].c); p.rect(2, 6, 10, 2, PAINTS[m].c); p.px(4, 8, PAINTS[m].c); p.px(9, 9, PAINTS[m].c);
  p.line(1, 3, 7, 0, C.grayD); p.line(13, 3, 7, 0, C.grayD);
})]));
export const brush = sprite(16, 6, p => { p.rect(0, 2, 9, 2, C.brownL); p.rect(9, 1, 3, 4, C.grayL); p.rect(12, 1, 4, 4, C.brownD); });

// round 2: the carried pot fills up with every flower the team picks up (n = flowers in the pot)
const bloomCache = {};
const BLOOM_SLOTS = (() => { // fixed spots inside the bush, inner ones first
  const r = rng(42), out = [];
  for (let i = 0; i < 40 && out.length < 20; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = 13 + Math.cos(a) * d * 9.5, y = 8.5 + Math.sin(a) * d * 6.5;
    if (out.every(([px, py]) => Math.hypot(px - x, py - y) > 2.6)) out.push([x, y]);
  }
  return out.sort((p, q) => Math.hypot(p[0] - 13, p[1] - 8.5) - Math.hypot(q[0] - 13, q[1] - 8.5));
})();
const BLOOM_COLORS = [C.pink, C.yellow, C.red, C.white, C.lav, C.orange, C.pinkL];
export function potBloom(n) {
  n = Math.max(0, Math.min(BLOOM_SLOTS.length, n | 0));
  if (bloomCache[n]) return bloomCache[n];
  return (bloomCache[n] = sprite(26, 28, p => {
    const lush = n / BLOOM_SLOTS.length; // the bush gets fuller as flowers are added
    p.ell(13, 9, 9 + lush * 2, 6.5 + lush * 1.5, C.greenD); p.ell(11, 7, 6.5 + lush * 1.5, 5, C.green); p.ell(16, 6, 4 + lush, 3.4, C.green); p.circ(9, 5, 1.6 + lush * 0.6, C.greenL);
    if (n === 0) { p.px(10, 4, C.greenL); p.px(15, 5, C.greenL); }
    for (let i = 0; i < n; i++) {
      const [x, y] = BLOOM_SLOTS[i], c = BLOOM_COLORS[i % BLOOM_COLORS.length];
      p.circ(x, y, 1.7, c); p.px(x, y, c === C.yellow ? C.orange : C.yellow);
    }
    for (let y = 15; y < 27; y++) { const w = 9 - (y - 15) * 0.25; p.rect(13 - w, y, w * 2, 1, C.pot); p.px(13 + w - 1, y, C.potD); }
    p.rect(2, 14, 22, 3, C.potL); p.rect(2, 16, 22, 1, C.potD); p.rect(6, 20, 14, 1, C.potD); p.px(7, 19, C.white);
  }));
}
export const BLOOM_MAX = BLOOM_SLOTS.length;

// round 3: customers waiting by the road (they wave until served) and the traffic police
export const customer = [[C.lav, C.hair1], [C.mint, C.grayD], [C.orange, C.hair2]].map(([shirt, hair]) => [0, 1].map(f => sprite(16, 23, p => {
  p.rect(5, 17, 2, 5, C.brownD); p.rect(9, 17, 2, 5, C.brownD);
  p.rect(4, 9, 8, 9, shirt); p.rect(11, 9, 1, 9, C.outSoft); p.rect(4, 17, 8, 1, C.outSoft);
  p.circ(8, 5.5, 4, C.skin); p.rect(4, 1, 8, 3, hair); p.px(4, 4, hair); p.px(11, 4, hair);
  p.px(6, 6, C.out); p.px(9, 6, C.out); p.px(7, 8, C.rose); p.px(8, 8, C.rose);
  p.rect(2, 10, 2, 5, C.skin);
  if (f) p.rect(12, 2, 2, 8, C.skin); else { p.rect(12, 5, 2, 5, C.skin); p.rect(13, 3, 2, 3, C.skin); } // waving
}, { outline: C.out })));
export const police = [0, 1].map(f => sprite(16, 24, p => {
  p.rect(5, 18, 2, 5, C.blueD); p.rect(9, 18, 2, 5, C.blueD);
  p.rect(4, 10, 8, 9, C.blue); p.rect(7, 10, 2, 9, C.blueD); p.px(5, 12, C.yellow);
  p.circ(8, 6.5, 3.6, C.skin); p.rect(3, 2, 10, 3, '#2a3f7a'); p.rect(5, 1, 6, 1, '#2a3f7a'); p.px(8, 2, C.yellow);
  p.px(6, 7, C.out); p.px(9, 7, C.out);
  p.rect(2, 11, 2, 5, C.blue);
  if (f) { p.rect(12, 4, 2, 7, C.blue); p.px(10, 8, C.white); p.px(11, 8, C.gray); } // whistling, arm up
  else p.rect(12, 11, 2, 5, C.blue);
}, { outline: C.out }));
