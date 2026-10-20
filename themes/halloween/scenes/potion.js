// Round 3 — the witch's potion shop: monsters queue for potions brewed on an assembly line.
// The rules are mechanics/assembly-line.js; this file is the Halloween skin. Bí adds the ingredients, Dơi finishes the
// bottle (cork · label · magic dust, only what the order asks for), Mèo takes orders, passes bottles on and hands them over.
import { register, W, H } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import { AssemblyLine, LAYOUT } from '../../../mechanics/assembly-line.js';

const PARTS = [
  { name: 'Nấm độc', emoji: '🍄', color: S.INGREDIENT_COLORS[0] },
  { name: 'Rêu ma', emoji: '🌿', color: S.INGREDIENT_COLORS[1] },
  { name: 'Cánh dơi', emoji: '🦇', color: S.INGREDIENT_COLORS[2] },
];
const EXTRAS = [
  { id: 'cork', name: 'nút chai', emoji: '🍾' },
  { id: 'label', name: 'nhãn', emoji: '🏷️', sfx: 'snip' },
  { id: 'magic', name: 'bụi phép', emoji: '✨' },
];
const [BI, DOI, MEO] = LAYOUT.STATION;
const TEXT = {
  desc: 'Tiệm thuốc phù thủy mở cửa, quái vật xếp hàng mua thuốc! <b>Mèo</b> nhận đơn đưa sang bàn Bí, chuyển chai sang bàn Dơi rồi trao thuốc cho khách. <b>Bí</b> bỏ đúng nguyên liệu, <b>Dơi</b> hoàn thiện đúng những món khách dặn: nút chai, nhãn, bụi phép.',
  tip: max => `Không phải đơn nào cũng cần đủ nút chai, nhãn và bụi phép — nhìn kỹ đơn nhé! <b>Bấm bừa bị khựng tay</b>: bấm sai, bấm khi bàn mình chưa có việc, thêm món đã có hoặc bấm nhiều nút một lúc đều làm người đó đứng im 1–2 giây. Bảng chỉ treo ${max} đơn.`,
  diffInfo: (e, num) => `khách đến mỗi ${num(e.gap)}→${num(e.gapEnd)} giây, chờ được ${e.patience} giây · mỗi chai ${e.stems[0] === e.stems[1] ? e.stems[0] : e.stems.join('–')} nguyên liệu · ${e.extra < 0.75 ? 'ít' : e.extra < 0.83 ? 'vừa' : 'nhiều'} món hoàn thiện · làm nhầm khựng ${num(e.stun)} giây`,
  roles: [
    { act: '<b>Bỏ nguyên liệu</b> theo đơn: 1 🍄 nấm độc · 2 🌿 rêu ma · 3 🦇 cánh dơi', short: 'Nguyên liệu' },
    { act: '<b>Hoàn thiện</b> đúng món trong đơn: Q 🍾 nút chai · W 🏷️ nhãn · E ✨ bụi phép', short: 'Nút · nhãn · phép' },
    { act: '<b>Chuyển đơn</b>: ↑ nhận đơn → bàn Bí · → chuyển chai sang bàn Dơi · ↓ trao thuốc cho khách', short: 'Chuyển đơn' },
  ],
  runnerKeys: ['↑ nhận đơn', '→ sang Dơi', '↓ trao thuốc'],
  hud: (served, left, wrongs) => `chai ${served} · bỏ ${left} · sai ${wrongs}`,
  noCustomer: 'Chưa có khách chờ!', railFull: 'Bảng đơn đầy!', nothingBuilt: 'Bàn Bí chưa xong chai nào!',
  noOrder: 'Chưa có đơn!', wrongPart: n => `Đơn không cần ${n}!`,
  noProduct: 'Chưa có chai thuốc!', wrongExtra: n => `Đơn không cần ${n}!`, extraDone: n => `Có ${n} rồi!`,
  nothingReady: 'Chưa có thuốc để trao!',
  took: 'Nhận đơn!', passed: 'Sang bàn Dơi →', built: 'Đủ nguyên liệu!', ready: 'Xong chai thuốc!', tipWord: 'boa',
  leave: 'Khách chờ lâu quá nên bỏ đi 👻',
  stages: { build: ['Bí bỏ nguyên liệu', '#e07a1f'], built: ['Mèo chuyển →', '#2f9a5a'], finish: ['Dơi hoàn thiện', '#7e5bc2'], ready: ['Mèo trao ↓', '#2f9a5a'] },
  emptyRail: 'Chưa có đơn — Mèo bấm ↑ nhận đơn',
  banner: 'Đóng cửa!', served: 'Chai thuốc đã bán', tips: 'Tiền boa', left: 'Khách bỏ đi',
  demoSlip: 'Ối, <b>Dơi</b> thêm món thừa hoặc bấm trùng → <b>khựng tay</b> một lúc, cả dây chuyền chậm lại',
};
const DEMO = [
  { at: 0, text: 'Quái vật vào tiệm, mỗi khách một <b>đơn</b>: nguyên liệu gì + món hoàn thiện (🍾 · 🏷️ · ✨). Thanh dưới là <b>sức chờ</b>', focus: 'queue' },
  { at: 5, text: '<b>Mèo</b> ↑ <b>nhận đơn</b> của khách có mũi tên (khách sắp hết kiên nhẫn nhất) → đơn sang bàn Bí', focus: 'rail' },
  { at: 10, text: '<b>Bí</b> bỏ đúng nguyên liệu trong đơn: 1 nấm độc · 2 rêu ma · 3 cánh dơi', focus: 'maker' },
  { at: 14, text: 'Đủ nguyên liệu → <b>Mèo</b> bấm → <b>chuyển</b> chai sang bàn Dơi', focus: 'pass' },
  { at: 17, text: '<b>Dơi</b> chỉ thêm <b>đúng những món</b> đơn cần: Q nút chai · W nhãn · E bụi phép', focus: 'finisher' },
  { at: 21, text: '<b>Mèo</b> ↓ <b>trao thuốc</b> và thu tiền — khách chờ càng ít, tiền boa càng nhiều', focus: 'runner' },
  { at: 26, text: 'Khách chờ quá lâu sẽ <b>bỏ đi</b>. Bấm bừa cũng bị phạt — cả đội làm nhịp nhàng nhé!', focus: 'queue' },
];

// ------------------------------------------------ art
const part = (g, i, x, y, size, alpha = 1) => drawAt(g, S.ingredient[i], x, y, { ay: 1, alpha, sx: size / 9, sy: size / 9 });
// tiny icons for the finishing touches: 🍾 cork · 🏷️ label · ✨ magic dust
function extra(g, i, cx, cy, s = 1, alpha = 1) {
  const x = EXTRAS[i].id;
  g.save(); g.globalAlpha = alpha; g.translate(Math.round(cx), Math.round(cy)); g.scale(s, s);
  if (x === 'cork') { g.fillStyle = C.out; g.fillRect(-3, -4, 6, 8); g.fillStyle = '#c48a5a'; g.fillRect(-2, -3, 4, 6); g.fillStyle = '#9a5b3c'; g.fillRect(-2, 1, 4, 1); }
  if (x === 'label') { g.fillStyle = C.out; g.fillRect(-5, -4, 10, 8); g.fillStyle = S.N.bone; g.fillRect(-4, -3, 8, 6); g.fillStyle = S.N.purple; g.fillRect(-3, -1, 6, 1); g.fillRect(-2, 1, 4, 1); }
  if (x === 'magic') { g.fillStyle = S.N.glow; g.fillRect(-1, -4, 2, 8); g.fillRect(-4, -1, 8, 2); g.fillStyle = C.white; g.fillRect(-1, -1, 2, 2); g.fillStyle = S.N.purpleL; g.fillRect(3, -4, 1, 1); g.fillRect(-4, 3, 1, 1); }
  g.restore();
}
// a round flask: one band of colour per ingredient added, cork / label / sparkles once the finisher adds them
function flask(g, x, y, parts, done, scale = 1) {
  const r = 8 * scale, cy = y + 6 * scale, n = parts.length;
  g.fillStyle = C.out; g.beginPath(); g.arc(x, cy, r + 1, 0, Math.PI * 2); g.fill(); g.fillRect(x - 3 * scale - 1, y - 8 * scale - 1, 6 * scale + 2, 10 * scale);
  g.fillStyle = '#dfe6f5'; g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.fill(); g.fillRect(x - 3 * scale, y - 8 * scale, 6 * scale, 10 * scale);
  g.save(); g.beginPath(); g.arc(x, cy, r - 1, 0, Math.PI * 2); g.clip();
  const band = (2 * r) / 4;
  parts.forEach((m, i) => { g.fillStyle = S.INGREDIENT_COLORS[m]; g.fillRect(x - r, cy + r - band * (i + 1), 2 * r, band + 0.5); });
  g.restore();
  if (n) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(x - r * 0.55), Math.round(cy - r * 0.4), Math.max(1, Math.round(scale)), Math.max(1, Math.round(2 * scale))); }
  if (done.cork) extra(g, 0, x, y - 8 * scale, 0.8 * scale);
  if (done.label) extra(g, 1, x, cy + 1, 0.7 * scale);
  if (done.magic) { extra(g, 2, x + r, y - 2 * scale, 0.6 * scale); extra(g, 2, x - r, cy + r * 0.5, 0.5 * scale); }
}
function background(g) {
  // stone wall, a round window with the moon, shelves of jars and a bubbling cauldron
  for (let y = 0; y < 128; y += 10) for (let x = (y / 10) % 2 ? -10 : 0; x < W; x += 20) { g.fillStyle = (x + y) % 3 ? '#3b3150' : '#43385a'; g.fillRect(x + 1, y + 1, 18, 8); }
  g.fillStyle = '#2a2240'; for (let y = 0; y < 128; y += 10) g.fillRect(0, y, W, 1);
  drawAt(g, S.roundWindow, 250, 52); drawAt(g, S.jarShelf, 360, 46); drawAt(g, S.jarShelf, 432, 46);
  drawAt(g, S.cauldron, 34, 124);
  // the shop door (customers come in on the right)
  g.fillStyle = S.N.woodD; g.fillRect(452, 52, 30, 76); g.fillStyle = S.N.wood; g.fillRect(455, 55, 24, 73); g.fillStyle = S.N.glow; g.fillRect(459, 60, 16, 12); g.fillStyle = C.yellow; g.fillRect(474, 92, 3, 3);
  // ticket rail
  g.fillStyle = S.N.woodD; g.fillRect(8, 24, 214, 4); g.fillStyle = S.N.woodL; g.fillRect(8, 24, 214, 2);
  // floor boards
  for (let y = 128; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#4a3a52' : '#42344a'; g.fillRect(0, y, W, 8); g.fillStyle = '#2f2538'; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
  g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center';
  // Bí's bench with three ingredient jars
  g.fillStyle = S.N.woodD; g.fillRect(BI - 50, 198, 100, 18); g.fillStyle = S.N.woodL; g.fillRect(BI - 50, 198, 100, 4);
  [0, 1, 2].forEach(i => {
    const x = BI - 32 + i * 32;
    g.fillStyle = C.out; g.fillRect(x - 8, 182, 16, 18); g.fillStyle = '#cfd8e8'; g.fillRect(x - 7, 183, 14, 16); g.fillStyle = S.N.wood; g.fillRect(x - 7, 181, 14, 3);
    part(g, i, x, 197, 11);
    g.fillStyle = C.white; g.fillText(String(i + 1), x, 210);
  });
  // Dơi's table: corks, labels, a pouch of magic dust
  g.fillStyle = S.N.woodD; g.fillRect(DOI - 50, 198, 100, 18); g.fillStyle = S.N.woodL; g.fillRect(DOI - 50, 198, 100, 4);
  EXTRAS.forEach((x, i) => { extra(g, i, DOI - 32 + i * 32, 190, 1.4); g.fillStyle = C.white; g.fillText('QWE'[i], DOI - 32 + i * 32, 210); });
  // Mèo's counter with a crystal ball for a till
  g.fillStyle = S.N.woodD; g.fillRect(MEO - 50, 198, 110, 18); g.fillStyle = S.N.woodL; g.fillRect(MEO - 50, 198, 110, 4);
  drawAt(g, S.crystalBall, MEO + 45, 199);
}
function counter(g) { g.fillStyle = S.N.woodD; g.fillRect(232, 125, 216, 14); g.fillStyle = S.N.woodL; g.fillRect(232, 125, 216, 4); g.fillStyle = '#9a6a4a'; g.fillRect(232, 125, 216, 1); }

const SKIN = {
  id: 'potion', parts: PARTS, extras: EXTRAS, text: TEXT, demoScript: DEMO,
  art: { background, counter, part, extra, product: flask, customer: (look, f) => S.monster[look][f], hint: '#cfc4ff' },
};

export default function () { register('potion', p => new AssemblyLine(SKIN, p)); }
