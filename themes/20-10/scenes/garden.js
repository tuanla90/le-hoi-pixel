// Round 1 — tend the garden: plants call for water, bug catching or trimming before they wilt.
// The rules are mechanics/grid-care.js; this file is the 20/10 skin: plants, tools, the garden around the bed.
// Đào moves the frame up/down, Mai left/right, Lan uses the tools.
import { register, W, H } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as A from '../../../core/audio.js';
import * as S from '../sprites.js';
import { grassField, scatter } from '../world.js';
import { GridCare, LAYOUT } from '../../../mechanics/grid-care.js';

const { COLS, ROWS, CW, CH, GX, GY } = LAYOUT;
const NEEDS = [{ id: 'water', verb: 'tưới' }, { id: 'bug', verb: 'bắt sâu' }, { id: 'trim', verb: 'tỉa' }];
const TOOLS = NEEDS.map(n => S.tools[n.id]);

const TEXT = {
  desc: 'Cây trong vườn cần chăm! Đưa khung chọn tới cây đang “kêu cứu” rồi dùng đúng dụng cụ trước khi cây héo.',
  tip: 'Chăm <b>cây gần khung nhất</b> trước, đừng chạy ngang vườn đuổi theo cây sắp héo. Chăm liền nhiều cây bằng <b>cùng một dụng cụ</b> để ăn combo. Dùng sai hoặc bấm nhiều dụng cụ một lúc bị khựng và mất combo.',
  diffInfo: (e, num, d) => `cây chờ ${num(e.wait)} giây (cuối vòng ${num(e.wait - 2)}) · ${e.max}→${e.max + e.ramp} cây kêu cùng lúc · dùng sai khựng ${num(e.stun)} giây${d === 'hard' ? ' · cần chăm nhiều cây hơn mới đủ 100' : ''}`,
  roles: [
    { act: 'Đưa khung <b>lên / xuống</b>', short: 'Lên / Xuống' },
    { act: 'Đưa khung <b>trái / phải</b>', short: 'Trái / Phải' },
    { act: 'Dùng <b>dụng cụ</b>: tưới · bắt sâu · tỉa', short: 'Dụng cụ' },
  ],
  oneTool: 'Một dụng cụ thôi!', wrongTool: 'Sai dụng cụ!', noNeed: 'Cây ổn mà!',
  combo: (verb, n) => `Combo ${verb} x${n}! 🌸`,
  banner: 'Hết giờ!', cares: 'Chăm đúng', bestCombo: 'Combo cùng dụng cụ dài nhất', bonus: 'Điểm thưởng combo', wilts: 'Cây bị héo',
};
const DEMO = [
  { at: 0, text: 'Cây nào cần chăm sẽ hiện <b>bong bóng</b>: 💧 cần tưới · 🐛 có sâu · ✂️ cần tỉa', focus: 'need' },
  { at: 5, text: '<b>Đào</b> bấm ↑ ↓ đưa khung lên xuống · <b>Mai</b> bấm ← → đưa khung trái phải', focus: 'cursor' },
  { at: 10, text: 'Khung đã tới đúng cây → <b>Lan</b> bấm <b>1 · 2 · 3</b> để dùng đúng dụng cụ', focus: 'cursor' },
  { at: 14.3, text: 'Ối, <b>dùng sai dụng cụ</b> → cả đội bị khựng lại một chút và <b>mất combo</b>', focus: 'cursor' },
  { at: 19, text: 'Mải chăm cây khác, quên mất cây này… thanh chờ cạn là <b>cây héo</b>, mất combo!', focus: 'victim' },
  { at: 26, text: 'Chăm liền nhiều cây bằng <b>cùng một dụng cụ</b> để ăn combo thưởng — càng nhiều càng tốt!', focus: 'cursor' },
];

// ------------------------------------------------ art
function background(g) {
  grassField(W, H, 21, g);
  // garden bed frame
  g.fillStyle = C.brownD; g.fillRect(GX - 7, GY - 7, COLS * CW + 14, ROWS * CH + 14);
  g.fillStyle = '#b57a4a'; g.fillRect(GX - 6, GY - 6, COLS * CW + 12, ROWS * CH + 12);
  g.fillStyle = '#8f5a35'; g.fillRect(GX - 3, GY - 3, COLS * CW + 6, ROWS * CH + 6);
  for (let x = GX - 6; x < GX + COLS * CW + 6; x += 10) { g.fillStyle = '#c98e5a'; g.fillRect(x, GY - 6, 5, 2); g.fillRect(x + 4, GY + ROWS * CH + 4, 5, 2); }
  // fence top row
  for (let x = GX - 30; x < GX + COLS * CW + 30; x += 16) drawAt(g, S.fenceH, x + 8, GY - 12);
  drawAt(g, S.shed, 40, 92); drawAt(g, S.tree, 440, 70); drawAt(g, S.treeRound, 20, 150); drawAt(g, S.pond, 432, 244);
  drawAt(g, S.wheelbarrow, 450, 150); drawAt(g, S.signPost, 98, 58);
  scatter(g, W, H, 9, 40, (x, y) => (x > GX - 30 && x < GX + COLS * CW + 30 && y > GY - 30 && y < GY + ROWS * CH + 70) || y < 30 || (x > 380 && y > 210) || (x < 70 && y < 100));
}
function cell(g, p, x, y, T) {
  drawAt(g, S.soilPlot(p.cared > 0 && p.caredBy === 0), x, y + 13); // freshly watered soil stays dark for a while
  if (p.need === 'trim') drawAt(g, S.weeds, x, y + 12);
  const mood = p.wilt > 0 ? 'wilt' : (p.need === 'water' ? 'thirsty' : 'ok');
  const sq = p.bounce > 0 ? 1 + Math.sin(p.bounce * 20) * 0.08 : 1;
  drawAt(g, S.plant(p.kind, p.stage, mood), x + Math.round(Math.sin(p.sway * 1.6) * 0.6), y + 8, { sy: sq, sx: 2 - sq });
  if (p.need === 'trim') drawAt(g, S.weeds, x + 2, y + 9, { flip: true, sy: 0.8 });
  if (p.need === 'bug') drawAt(g, S.bug[((T * 4) | 0) % 2], x + 4 + Math.sin(T * 3) * 2, y - 2);
}
function care(i, x, y, fx) {
  if (i === 0) { A.sfx.water(); fx.burst(x, y - 4, 12, { colors: [C.water, C.white, C.skyL], speed: 30, g: 80, up: 20 }); }
  if (i === 1) { A.sfx.catchBug(); fx.add({ x, y: y - 8, vx: 50 * (Math.random() < .5 ? -1 : 1), vy: -90, g: 220, life: 0.9, drag: 0, img: S.bug[0] }); }
  if (i === 2) { A.sfx.snip(); fx.burst(x, y - 6, 12, { colors: [C.green, C.greenD, C.greenL], speed: 45, g: 90, up: 30 }); }
}

const SKIN = {
  id: 'garden', kinds: S.PLANT_TYPES, needs: NEEDS, text: TEXT, demoScript: DEMO,
  art: { background, cell, care, bubble: i => S.bubble[NEEDS[i].id], tool: i => TOOLS[i], cursor: f => S.cursorFrame[f], wilt: [C.brownL, C.brown] },
};

export default function () { register('garden', p => new GridCare(SKIN, p)); }
