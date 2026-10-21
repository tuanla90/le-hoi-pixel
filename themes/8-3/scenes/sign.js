// Round 2 — paint flowers onto a giant 8/3 greeting card in the shop window, in rhythm.
// The rules are mechanics/rhythm-color.js; this file is the 8/3 skin: the three paints, the card, texts and art
// (flowers and paint pots are the sisters' own, from themes/20-10).
// Each girl owns one paint (Đào đỏ, Mai vàng, Lan xanh dương); mixed colours need several people pressing together.
import { register, W, H } from '../../../core/main.js';
import { C } from '../../../core/gfx.js';
import * as S from '../../20-10/sprites.js';
import { RhythmColor, LAYOUT } from '../../../mechanics/rhythm-color.js';

const { COL_X, HIT_Y, TOP_Y, SX0, SX1, SY0, SY1 } = LAYOUT;
const P = S.PAINTS;
const sw = m => `<b style="color:${P[m].d}">${P[m].name}</b>`;
const TEXT = {
  desc: 'Cùng <b>vẽ hoa</b> lên tấm <b>thiệp 8/3 khổng lồ</b> dán ở cửa kính tiệm, theo nhạc! Mỗi người giữ một hũ sơn. Hoa rơi tới bảng pha màu thì ai có màu trong bông hoa phải bấm — màu pha thì <b>bấm cùng lúc</b>.',
  tip: 'Cam = Đỏ+Vàng · Xanh lá = Vàng+Xanh dương · Tím = Đỏ+Xanh dương · Cầu vồng = cả ba. Vòng hoa dài: giữ phím, tới chỗ đổi màu thì chuyền cho bạn.',
  diffInfo: {
    easy: 'nhạc chậm 100 BPM · bấm lệch tới ~0,18 giây vẫn tính · không có nốt nhanh · luôn có chấm gợi ý màu · bấm sai màu chỉ mất combo',
    normal: 'nhạc 106 BPM · lệch tới ~0,15 giây · đoạn cuối có nốt nhanh · vẫn có chấm gợi ý màu · bấm sai màu bị trừ 0,5 điểm',
    hard: 'nhạc nhanh 112 BPM · lệch tối đa ~0,13 giây · nốt nhanh, đoạn cuối bỏ gợi ý màu · bấm sai màu bị trừ 0,5 điểm',
  },
  scoreLabel: 'Điểm',
  roles: [
    { act: `Sơn ${sw(1)}`, short: 'Sơn đỏ' },
    { act: `Sơn ${sw(2)}`, short: 'Sơn vàng' },
    { act: `Sơn ${sw(4)}`, short: 'Sơn xanh dương' },
  ],
  demoKeys: ['J đỏ', 'K vàng', 'L xanh'],
  demoWrong: 'Ối, <b>Đào</b> bấm nhầm! Hoa Xanh dương là của <b>Lan</b> → <b>Sai màu</b>, mất combo và bị trừ điểm',
  demoPartial: 'Chỉ có <b>Mai</b> bấm, <b>Lan</b> quên mất → hoa màu pha phải <b>đủ người</b> mới tính, trượt rồi!',
  demo: {
    note: 'Hoa', longNote: 'Vòng hoa',
    handoff: seq => `Vòng hoa đổi màu: giữ phím, tới vạch thì <b>chuyền</b> cho bạn (${seq})`,
    hold: (name, who) => `Vòng hoa <b>${name}</b>: ${who} <b>giữ phím</b> tới hết dây`,
    rainbow: who => `Hoa <b>Cầu vồng</b> → cả ba ${who} cùng bấm!`,
    mix: (kind, name, parts, who) => `${kind} <b>${name}</b> = ${parts} → ${who} bấm <b>cùng lúc</b>`,
    single: (kind, name, who, k) => `${kind} <b>${name}</b> → chỉ ${who} bấm <b>${k}</b>`,
    idle: 'Hoa rơi xuống <b>bảng pha màu</b>. Mỗi người một màu: <b>Đào</b> Đỏ (J) · <b>Mai</b> Vàng (K) · <b>Lan</b> Xanh dương (L)',
  },
  judge: { perfect: 'Hoàn hảo!', good: 'Tốt!', unsynced: 'Chưa đều tay!', holdDone: 'Vòng hoa trọn vẹn!', holdBroken: 'Đứt vòng hoa!', missingPartner: 'Thiếu người!', miss: 'Trượt rồi!', wrong: 'Sai màu!' },
  comboToast: (n, b) => `Combo ${n}! +${b} điểm 🌸`,
  legend: 'Bảng pha màu', comboTitle: 'Combo cả đội', nextMilestone: n => `khi combo đạt ${n}`, accuracy: p => `Chính xác ${p}%`, painted: n => `Hoa đã vẽ: ${n}`,
  banner: 'Thiệp xong rồi!',
  hits: 'Hoa vẽ đúng nhịp (1 điểm/bông)', bonus: 'Thưởng mốc combo', bestCombo: 'Combo cao nhất', holds: 'Vòng hoa giữ trọn', wrongs: 'Bấm sai màu', wrongsNone: '0 — chuẩn!',
  resultExtra: '<div class="signpreview"><b>Mừng 8/3 💐</b></div>',
};

// ------------------------------------------------ art
function background(g) {
  for (let x = 0; x < W; x += 12) { g.fillStyle = (x / 12) % 2 ? '#ffe3ec' : '#fff1f5'; g.fillRect(x, 0, 12, 176); }
  g.fillStyle = '#ffd0de'; for (let x = 6; x < W; x += 24) for (let y = 10; y < 170; y += 22) { g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
  g.fillStyle = C.lav; g.fillRect(0, 150, W, 26); g.fillStyle = C.lavD; g.fillRect(0, 150, W, 2); g.fillRect(0, 174, W, 2);
  for (let x = 0; x < W; x += 30) { g.fillStyle = '#c9b2f2'; g.fillRect(x + 4, 156, 22, 14); }
  for (let y = 176; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#c48a5a' : '#b97e4f'; g.fillRect(0, y, W, 8); g.fillStyle = C.brown; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
  // the falling lane: a soft paper strip
  g.fillStyle = '#ffffffaa'; g.fillRect(COL_X - 14, TOP_Y - 6, 28, HIT_Y - TOP_Y + 6);
  g.fillStyle = '#f0c9d6'; g.fillRect(COL_X - 14, TOP_Y - 6, 1, HIT_Y - TOP_Y + 6); g.fillRect(COL_X + 13, TOP_Y - 6, 1, HIT_Y - TOP_Y + 6);
  for (let y = TOP_Y; y < HIT_Y; y += 8) { g.fillStyle = '#f6dbe4'; g.fillRect(COL_X - 1, y, 2, 4); }
  // side panels
  [[12, 70, 124, 120], [346, 70, 122, 120]].forEach(([x, y, w, h]) => { g.fillStyle = C.out; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = C.cream; g.fillRect(x, y, w, h); g.fillStyle = C.pinkL; g.fillRect(x, y, w, 2); });
}
// the wooden shop sign the flowers are painted onto
function board(g, sh) {
  g.fillStyle = C.brownD; g.fillRect(SX0 - 3 + sh, SY0 - 3, SX1 - SX0 + 6, SY1 - SY0 + 6);
  g.fillStyle = C.brownL; g.fillRect(SX0 - 1 + sh, SY0 - 1, SX1 - SX0 + 2, SY1 - SY0 + 2);
  g.fillStyle = C.white; g.fillRect(SX0 + 1 + sh, SY0 + 1, SX1 - SX0 - 2, SY1 - SY0 - 2);
}

const SKIN = {
  id: 'sign', paints: P, text: TEXT,
  boardHtml: '<div class="paint-sign"><b>Mừng 8/3 💐</b></div>',
  art: { background, board, note: (m, size) => S.paintFlower(m, size), bucket: b => S.paintBucket[b] },
};

export default function () { register('sign', p => new RhythmColor(SKIN, p)); }
