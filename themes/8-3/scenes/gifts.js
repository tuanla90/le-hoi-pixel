// Round 3 — stack the 8/3 gift tower in the shop window.
// The rules are mechanics/stack-tower.js; this file is the 8/3 skin: gift boxes, the little crane, the display table.
// Đào drives the crane's trolley, Mai releases each gift box, Lan keeps the tower from tipping over.
import { register, W, H } from '../../../core/main.js';
import { C, sprite, drawAt } from '../../../core/gfx.js';
import * as S from '../../20-10/sprites.js';
import { StackTower, LAYOUT } from '../../../mechanics/stack-tower.js';

const { RAIL_Y } = LAYOUT;
// box colours and their ribbons
const COLORS = ['#ff8fb1', '#ffd23f', '#b79ced', '#6fd3b8', '#6ab4f5'];
const RIBBON = { '#ff8fb1': '#ffffff', '#ffd23f': '#e8485f', '#b79ced': '#ffd23f', '#6fd3b8': '#ff8fb1', '#6ab4f5': '#ffffff' };
const SHADE = { '#ff8fb1': '#d9628f', '#ffd23f': '#e8a92a', '#b79ced': '#8b6bd0', '#6fd3b8': '#3fa88e', '#6ab4f5': '#3f86cf' };
// the round's icon: a little gift box
export const giftIcon = sprite(18, 18, p => {
  p.rect(2, 7, 14, 10, '#ff8fb1'); p.rect(2, 7, 14, 2, '#ffc4d6'); p.rect(8, 7, 2, 10, '#ffffff'); p.rect(2, 11, 14, 2, '#ffffff');
  p.ell(6, 5, 3, 2, '#ffffff'); p.ell(12, 5, 3, 2, '#ffffff'); p.rect(8, 4, 2, 3, '#ffd23f');
});

const TEXT = {
  desc: 'Xếp <b>tháp quà 8/3</b> trưng ở cửa kính tiệm! Móc cẩu lấy hộp quà ở kệ hai bên, hộp treo trên móc và <b>đung đưa</b>: <b>Đào</b> đẩy móc về ngay trên đỉnh tháp, <b>Mai</b> thả hộp đúng lúc, <b>Lan</b> giữ tháp khỏi nghiêng đổ.',
  tip: 'Đẩy móc <b>êm tay</b>: chạy rồi dừng gấp là hộp đung đưa mạnh. Hộp rơi <b>trúng giữa</b> được thưởng và cộng combo. Hộp đặt lệch kéo tháp nghiêng về phía đó, tháp càng cao càng dễ nghiêng — nghiêng quá là <b>đổ 3 hộp trên cùng</b>.',
  diffInfo: (e, num, d) => `${{ easy: 'hộp to, ít đung đưa', normal: 'hộp vừa', hard: 'hộp nhỏ, đung đưa mạnh' }[d]} · trúng giữa trong ${e.perfect} px là hoàn hảo · lệch quá ${Math.round(e.slide * 100)}% là hộp trượt rơi · tháp ${d === 'easy' ? 'nghiêng chậm' : d === 'normal' ? 'nghiêng vừa' : 'nghiêng nhanh'}`,
  scoreLabel: 'Tháp',
  hud: (boxes, perfects) => `🎁 ${boxes} · ⭐ ${perfects}`, // boxes on the tower · perfect drops
  roles: [
    { act: 'Đẩy <b>móc cẩu</b> trái / phải — đẩy êm tay cho hộp bớt đung đưa', short: 'Móc cẩu' },
    { act: '<b>Thả hộp</b> đúng lúc nó nằm ngay trên đỉnh tháp', short: 'Thả hộp' },
    { act: 'Giữ <b>tháp thăng bằng</b>: Q đỡ về trái · E đỡ về phải', short: 'Giữ tháp' },
  ],
  demoKeys: ['← móc', 'móc →', '↓ thả hộp'],
  slid: 'Trượt rồi!', perfect: pts => `Trúng giữa! +${pts}`, perfectCombo: (n, pts) => `Combo ${n}! +${pts}`,
  collapse: pts => `Tháp nghiêng quá, đổ mất 3 hộp! −${pts} điểm`,
  banner: 'Tháp quà xong!',
  standing: 'Hộp quà trên tháp', perfects: 'Thả trúng giữa', slides: 'Hộp trượt rơi', collapses: 'Tháp đổ', collapsesNone: '0 — vững vàng!',
};
const DEMO = [
  { at: 0, text: 'Móc cẩu tự chạy ra <b>kệ</b> lấy hộp quà. <b>Đào</b> bấm ← → đẩy móc về ngay trên đỉnh tháp (vạch chấm chỉ chỗ hộp sẽ rơi)', focus: 'hook' },
  { at: 6, text: 'Vạch chấm chuyển <b>xanh</b> là hộp đang ngay giữa → <b>Mai</b> bấm ↓ <b>thả hộp</b>. Trúng giữa được thưởng thêm!', focus: 'top' },
  { at: 11, text: 'Ối, thả <b>lệch</b> → tháp bị kéo nghiêng về phía đó', focus: 'top' },
  { at: 14, text: '<b>Lan</b> nhìn <b>thước thăng bằng</b>: chấm lệch phải bấm <b>Q</b>, lệch trái bấm <b>E</b>', focus: 'level' },
  { at: 19, text: 'Lan lơ là, rồi còn đỡ nhầm phía → tháp nghiêng quá là <b>đổ mất 3 hộp</b> trên cùng!', focus: 'level' },
  { at: 26, text: 'Tháp càng cao càng dễ nghiêng — cả đội nhịp nhàng để xếp thật cao!', focus: 'base' },
];

// ------------------------------------------------ art
function background(g) {
  // pink striped wallpaper, the big shop window with the street outside, a flower shelf
  for (let x = 0; x < W; x += 12) { g.fillStyle = (x / 12) % 2 ? '#ffe3ec' : '#fff1f5'; g.fillRect(x, 0, 12, H); }
  g.fillStyle = '#ffd0de'; for (let x = 6; x < W; x += 24) for (let y = 10; y < 220; y += 22) { g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
  g.fillStyle = C.brownD; g.fillRect(146, 44, 188, 178); g.fillStyle = '#cdeeff'; g.fillRect(150, 48, 180, 170);
  g.fillStyle = '#e7f6ff'; for (let i = 0; i < 4; i++) g.fillRect(160 + i * 44, 52 + (i % 2) * 8, 18, 3);
  g.fillStyle = C.grass; g.fillRect(150, 196, 180, 22); g.fillStyle = '#ecdcb4'; g.fillRect(150, 206, 180, 12);
  drawAt(g, S.tree, 176, 200); drawAt(g, S.house[1], 300, 200);
  g.fillStyle = C.brownL; g.fillRect(146, 44, 188, 3); g.fillRect(238, 44, 4, 178);
  // "Mừng 8/3" bunting across the window
  const flags = ['#ff8fb1', '#ffd23f', '#b79ced', '#6fd3b8'];
  for (let i = 0; i < 11; i++) { const x = 152 + i * 16; g.fillStyle = flags[i % 4]; g.beginPath(); g.moveTo(x, 60); g.lineTo(x + 12, 60); g.lineTo(x + 6, 70); g.closePath(); g.fill(); }
  // shelves of potted flowers on both sides
  for (const x of [10, 362]) {
    drawAt(g, S.shelf, x + 54, 120, { ay: 1 }); drawAt(g, S.shelf, x + 54, 170, { ay: 1 });
  }
  // floor
  for (let y = 222; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#c48a5a' : '#b97e4f'; g.fillRect(0, y, W, 8); g.fillStyle = C.brown; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
}
function rail(g) {
  g.fillStyle = C.out; g.fillRect(40, RAIL_Y - 4, W - 80, 7); g.fillStyle = C.brownL; g.fillRect(41, RAIL_Y - 3, W - 82, 5); g.fillStyle = '#e1b07a'; g.fillRect(41, RAIL_Y - 3, W - 82, 1);
  for (const x of [44, W - 48]) { g.fillStyle = C.out; g.fillRect(x - 1, 0, 6, RAIL_Y); g.fillStyle = C.brown; g.fillRect(x, 0, 4, RAIL_Y); }
}
function trolley(g, x) {
  x = Math.round(x);
  g.fillStyle = C.out; g.fillRect(x - 9, RAIL_Y - 8, 18, 9); g.fillStyle = '#ff8fb1'; g.fillRect(x - 8, RAIL_Y - 7, 16, 7); g.fillStyle = '#ffc4d6'; g.fillRect(x - 8, RAIL_Y - 7, 16, 2);
  g.fillStyle = C.out; g.fillRect(x - 7, RAIL_Y - 10, 4, 3); g.fillRect(x + 3, RAIL_Y - 10, 4, 3);
  g.fillStyle = C.grayD; g.fillRect(x - 1, RAIL_Y + 1, 2, 2);
}
// a gift box w × h centred on (x, y), with a ribbon cross and a bow on top
function block(g, x, y, w, h, col, alpha = 1) {
  const L = Math.round(x - w / 2), T = Math.round(y - h / 2);
  g.globalAlpha = alpha;
  g.fillStyle = C.out; g.fillRect(L - 1, T - 1, w + 2, h + 2);
  g.fillStyle = col; g.fillRect(L, T, w, h);
  g.fillStyle = SHADE[col]; g.fillRect(L, T + h - 2, w, 2); g.fillRect(L + w - 2, T, 2, h);
  g.fillStyle = RIBBON[col]; g.fillRect(Math.round(x) - 1, T, 3, h); g.fillRect(L, Math.round(y) - 1, w, 2);
  g.fillRect(Math.round(x) - 5, T - 3, 4, 3); g.fillRect(Math.round(x) + 2, T - 3, 4, 3);
  g.globalAlpha = 1;
}
// the round display table the tower stands on
function base(g, x, y, w) {
  g.fillStyle = C.out; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 7); g.fillStyle = '#fff6e3'; g.fillRect(x - w / 2, y, w, 5); g.fillStyle = '#ffc4d6'; for (let i = 0; i < w; i += 6) g.fillRect(x - w / 2 + i, y + 3, 3, 2);
  g.fillStyle = C.out; g.fillRect(x - 4, y + 6, 8, 22); g.fillStyle = C.brownL; g.fillRect(x - 3, y + 6, 6, 22);
  g.fillStyle = C.out; g.fillRect(x - 18, y + 27, 36, 4); g.fillStyle = C.brown; g.fillRect(x - 17, y + 27, 34, 3);
}

const SKIN = {
  id: 'gifts', colors: COLORS, text: TEXT, demoScript: DEMO,
  art: { background, rail, trolley, block, base, debris: ['#ff8fb1', '#ffd23f', '#b79ced', '#ffffff'] },
};

export default function () { register('gifts', p => new StackTower(SKIN, p)); }
