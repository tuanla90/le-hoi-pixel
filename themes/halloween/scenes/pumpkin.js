// Round 1 — the pumpkin patch: lanterns go dark, cobwebs creep over them, bats land on them.
// The rules are mechanics/grid-care.js; this file is the Halloween skin. Bí moves the frame up/down, Dơi left/right,
// Mèo uses the tools: a candle, a broom, a bell.
import { register } from '../../../core/main.js';
import { C, drawAt, rng } from '../../../core/gfx.js';
import * as A from '../../../core/audio.js';
import * as S from '../sprites.js';
import { night } from '../world.js';
import { GridCare, LAYOUT } from '../../../mechanics/grid-care.js';

const { COLS, ROWS, CW, CH, GX, GY } = LAYOUT;
const NEEDS = [{ id: 'candle', verb: 'thắp nến' }, { id: 'web', verb: 'quét mạng nhện' }, { id: 'bat', verb: 'đuổi dơi' }];
const TOOLS = [S.tools.candle, S.tools.broom, S.tools.bell];

const TEXT = {
  desc: 'Đêm nay cả vườn bí ngô phải sáng đèn! Quả nào gặp chuyện sẽ hiện bong bóng: <b>nến tắt</b>, <b>mạng nhện</b> phủ kín hay <b>dơi</b> đậu lên. Đưa khung tới đó và dùng đúng dụng cụ trước khi bí bị thối.',
  tip: 'Lo <b>quả gần khung nhất</b> trước, đừng chạy ngang vườn. Dùng liền nhiều lần <b>cùng một dụng cụ</b> để ăn combo. Dùng sai hoặc bấm nhiều dụng cụ một lúc bị khựng và mất combo.',
  diffInfo: (e, num, d) => `bí chờ ${num(e.wait)} giây (cuối vòng ${num(e.wait - 2)}) · ${e.max}→${e.max + e.ramp} quả kêu cùng lúc · dùng sai khựng ${num(e.stun)} giây${d === 'hard' ? ' · cần cứu nhiều quả hơn mới đủ 100' : ''}`,
  roles: [
    { act: 'Đưa khung <b>lên / xuống</b>', short: 'Lên / Xuống' },
    { act: 'Đưa khung <b>trái / phải</b>', short: 'Trái / Phải' },
    { act: 'Dùng <b>dụng cụ</b>: thắp nến · quét mạng nhện · rung chuông đuổi dơi', short: 'Dụng cụ' },
  ],
  oneTool: 'Một dụng cụ thôi!', wrongTool: 'Sai dụng cụ!', noNeed: 'Quả này ổn mà!',
  combo: (verb, n) => `Combo ${verb} x${n}! 🎃`,
  banner: 'Hết giờ!', cares: 'Cứu đúng', bestCombo: 'Combo cùng dụng cụ dài nhất', bonus: 'Điểm thưởng combo', wilts: 'Bí bị thối',
};
const DEMO = [
  { at: 0, text: 'Quả bí nào gặp chuyện sẽ hiện <b>bong bóng</b>: 🔥 nến tắt · 🕸️ mạng nhện · 🦇 dơi đậu', focus: 'need' },
  { at: 5, text: '<b>Bí</b> bấm ↑ ↓ đưa khung lên xuống · <b>Dơi</b> bấm ← → đưa khung trái phải', focus: 'cursor' },
  { at: 10, text: 'Khung đã tới đúng quả → <b>Mèo</b> bấm <b>1 · 2 · 3</b>: thắp nến · quét nhện · rung chuông', focus: 'cursor' },
  { at: 14.3, text: 'Ối, <b>dùng sai dụng cụ</b> → cả đội bị khựng lại một chút và <b>mất combo</b>', focus: 'cursor' },
  { at: 19, text: 'Mải lo quả khác, quên mất quả này… thanh chờ cạn là <b>bí bị thối</b>, mất combo!', focus: 'victim' },
  { at: 26, text: 'Dùng liền nhiều lần <b>cùng một dụng cụ</b> để ăn combo thưởng — cả vườn sáng rực nào!', focus: 'cursor' },
];

// ------------------------------------------------ art
function background(g) {
  night(g, 31, 46); // the patch fills most of the screen: just a strip of sky above it
  const r = rng(7);
  // the patch: a dark soil bed with a low stone border
  g.fillStyle = S.N.soilD; g.fillRect(GX - 8, GY - 8, COLS * CW + 16, ROWS * CH + 16);
  g.fillStyle = S.N.soil; g.fillRect(GX - 5, GY - 5, COLS * CW + 10, ROWS * CH + 10);
  for (let x = GX - 8; x < GX + COLS * CW + 8; x += 9) { g.fillStyle = r() < .5 ? S.N.stone : S.N.stoneD; g.fillRect(x, GY - 10, 7, 3); g.fillRect(x + 3, GY + ROWS * CH + 7, 7, 3); }
  for (let x = GX - 34; x < GX + COLS * CW + 34; x += 16) drawAt(g, S.ironFence, x + 8, GY - 12);
  drawAt(g, S.deadTree, 54, 150); drawAt(g, S.deadTree, 430, 140, { flip: true });
  [[40, 230, 0], [86, 214, 1], [400, 222, 2], [446, 240, 0], [24, 180, 2]].forEach(([x, y, k]) => drawAt(g, S.grave[k], x, y));
  drawAt(g, S.lantern, 108, 108); drawAt(g, S.lantern, 372, 108);
}
function cell(g, p, x, y, T) {
  drawAt(g, S.patch, x, y + 14);
  const mood = p.wilt > 0 ? 'wilt' : p.need === 'candle' ? 'dark' : 'ok';
  const sq = p.bounce > 0 ? 1 + Math.sin(p.bounce * 20) * 0.08 : 1;
  drawAt(g, S.pumpkin(p.kind, p.stage, mood), x + Math.round(Math.sin(p.sway * 1.4) * 0.6), y + 11, { sy: sq, sx: 2 - sq });
  if (p.cared > 0 && p.caredBy === 0 && p.stage >= 1) { g.globalAlpha = Math.min(0.35, p.cared * 0.12); g.fillStyle = S.N.glow; g.beginPath(); g.arc(x, y + 4, 13, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; } // a freshly lit lantern glows
  if (p.need === 'web') drawAt(g, S.web, x - 3, y + 8, { alpha: 0.9 });
  if (p.need === 'bat') drawAt(g, S.bat[((T * 5) | 0) % 2], x + 2, y - 1 + Math.round(Math.sin(T * 6)), { ay: 0.5 });
}
function care(i, x, y, fx) {
  if (i === 0) { A.sfx.pickup(); fx.burst(x, y - 2, 12, { colors: [S.N.glow, C.orange, C.white], speed: 30, g: -30 }); }
  if (i === 1) { A.sfx.snip(); fx.burst(x, y - 2, 12, { colors: ['#e7e3f5', S.N.stoneL], speed: 45, g: 60, up: 20 }); }
  if (i === 2) { A.sfx.catchBug(); fx.add({ x, y: y - 6, vx: 60 * (Math.random() < .5 ? -1 : 1), vy: -80, g: -40, life: 1, drag: 0, img: S.bat[0] }); }
}

const SKIN = {
  id: 'pumpkin', kinds: S.PUMPKIN_KINDS, needs: NEEDS, text: TEXT, demoScript: DEMO,
  art: { background, cell, care, bubble: i => S.bubble[NEEDS[i].id], tool: i => TOOLS[i], cursor: f => S.cursorFrame[f], wilt: ['#8a8f5a', '#626640'] },
};

export default function () { register('pumpkin', p => new GridCare(SKIN, p)); }
