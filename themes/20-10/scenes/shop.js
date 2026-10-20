// Round 5 — opening day: customers queue at the counter and the three sisters work as one assembly line.
// The rules are mechanics/assembly-line.js; this file is the 20/10 skin: flowers, gift wrap / card / bow, the shop room.
// Đào picks the flowers, Mai finishes them, Lan moves every order along: customer → Đào's bench → Mai's table → customer.
import { register, W, H } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import { AssemblyLine, LAYOUT } from '../../../mechanics/assembly-line.js';

// flowers use the round-4 paint masks so the colours match: hồng (đỏ) · hướng dương (vàng) · cẩm tú cầu (xanh dương)
const MASKS = [1, 2, 4];
const PARTS = [
  { name: 'Hồng', emoji: '🌹', color: S.PAINTS[1].c },
  { name: 'Hướng dương', emoji: '🌻', color: S.PAINTS[2].c },
  { name: 'Cẩm tú cầu', emoji: '💠', color: S.PAINTS[4].c },
];
// Mai's finishing touches; an order asks for one or more of them, in any order
const EXTRAS = [
  { id: 'wrap', name: 'gói giấy', emoji: '🎁', sfx: 'snip' },
  { id: 'card', name: 'thiệp', emoji: '💌' },
  { id: 'bow', name: 'nơ', emoji: '🎀' },
];
const [DAO, MAI, LAN] = LAYOUT.STATION;
const fl = i => `<b style="color:${S.PAINTS[MASKS[i]].d}">${PARTS[i].name}</b>`;

const TEXT = {
  desc: 'Tiệm mở cửa, khách xếp hàng! <b>Lan</b> là người chuyển đơn: nhận đơn của khách đưa sang bàn Đào, chuyển bó hoa sang bàn Mai, rồi trả hoa cho khách. <b>Đào</b> cắm đúng màu hoa, <b>Mai</b> thêm đúng những món khách dặn: gói giấy, thiệp, nơ.',
  tip: max => `Không phải đơn nào cũng cần đủ gói giấy, thiệp và nơ — nhìn kỹ đơn nhé! <b>Bấm bừa bị khựng tay</b>: bấm sai, bấm khi bàn mình chưa có việc, thêm món đã có hoặc bấm nhiều nút một lúc đều làm người đó đứng im 1–2 giây. Bảng chỉ treo ${max} đơn.`,
  diffInfo: (e, num) => `khách đến mỗi ${num(e.gap)}→${num(e.gapEnd)} giây, chờ được ${e.patience} giây · mỗi bó ${e.stems[0] === e.stems[1] ? e.stems[0] : e.stems.join('–')} cành · ${e.extra < 0.75 ? 'ít' : e.extra < 0.83 ? 'vừa' : 'nhiều'} món gói kèm · làm nhầm khựng ${num(e.stun)} giây`,
  roles: [
    { act: `<b>Cắm hoa</b> theo đơn: 1 ${fl(0)} · 2 ${fl(1)} · 3 ${fl(2)}`, short: 'Cắm hoa' },
    { act: '<b>Hoàn thiện</b> đúng món trong đơn: Q 🎁 gói giấy · W 💌 thiệp · E 🎀 nơ', short: 'Gói · thiệp · nơ' },
    { act: '<b>Chuyển đơn</b>: ↑ nhận đơn → bàn Đào · → chuyển bó hoa sang bàn Mai · ↓ trả hoa cho khách', short: 'Chuyển đơn' },
  ],
  runnerKeys: ['↑ nhận đơn', '→ sang Mai', '↓ trả hoa'],
  hud: (served, left, wrongs) => `bó ${served} · bỏ ${left} · sai ${wrongs}`, // bouquets handed over · customers who left · slips
  noCustomer: 'Chưa có khách chờ!', railFull: 'Bảng đơn đầy!', nothingBuilt: 'Bàn Đào chưa xong bó nào!',
  noOrder: 'Chưa có đơn!', wrongPart: n => `Đơn không cần ${n}!`,
  noProduct: 'Chưa có bó hoa!', wrongExtra: n => `Đơn không cần ${n}!`, extraDone: n => `Có ${n} rồi!`,
  nothingReady: 'Chưa có hoa để trả!',
  took: 'Nhận đơn!', passed: 'Sang bàn Mai →', built: 'Cắm xong!', ready: 'Xong bó hoa!', tipWord: 'boa',
  leave: 'Khách chờ lâu quá nên bỏ về 😢',
  stages: { build: ['Đào cắm hoa', '#ff7aa2'], built: ['Lan chuyển →', '#3f86cf'], finish: ['Mai hoàn thiện', C.yellowD], ready: ['Lan trả hoa ↓', '#3f86cf'] },
  emptyRail: 'Chưa có đơn — Lan bấm ↑ nhận đơn',
  banner: 'Đóng cửa!', served: 'Bó hoa đã giao', tips: 'Tiền boa', left: 'Khách bỏ về',
  demoSlip: 'Ối, <b>Mai</b> thêm món thừa hoặc bấm trùng → <b>khựng tay</b> một lúc, cả dây chuyền chậm lại',
};
const DEMO = [
  { at: 0, text: 'Khách vào tiệm, mỗi người một <b>đơn</b>: mấy cành hoa màu gì + món gói kèm (🎁 · 💌 · 🎀). Thanh dưới là <b>sức chờ</b>', focus: 'queue' },
  { at: 5, text: '<b>Lan</b> ↑ <b>nhận đơn</b> của khách có mũi tên (khách sắp hết kiên nhẫn nhất) → đơn sang bàn Đào', focus: 'rail' },
  { at: 10, text: '<b>Đào</b> cắm đúng màu hoa trong đơn: 1 hồng · 2 hướng dương · 3 cẩm tú cầu', focus: 'maker' },
  { at: 14, text: 'Cắm xong → <b>Lan</b> bấm → <b>chuyển</b> bó hoa sang bàn Mai', focus: 'pass' },
  { at: 17, text: '<b>Mai</b> chỉ thêm <b>đúng những món</b> đơn cần: Q gói giấy · W thiệp · E nơ', focus: 'finisher' },
  { at: 21, text: '<b>Lan</b> ↓ <b>trả hoa</b> và thu tiền — khách chờ càng ít, tiền boa càng nhiều', focus: 'runner' },
  { at: 26, text: 'Khách chờ quá lâu sẽ <b>bỏ về</b>. Bấm bừa cũng bị phạt — cả đội làm nhịp nhàng nhé!', focus: 'queue' },
];

// ------------------------------------------------ art
const flower = (g, i, x, y, size, alpha = 1) => drawAt(g, S.paintFlower(MASKS[i], size), x, y, { ay: 1, alpha });
// tiny icons for the finishing touches: 🎁 gift paper · 💌 card · 🎀 bow
function extra(g, i, cx, cy, s = 1, alpha = 1) {
  const x = EXTRAS[i].id;
  g.save(); g.globalAlpha = alpha; g.translate(Math.round(cx), Math.round(cy)); g.scale(s, s);
  if (x === 'wrap') { g.fillStyle = C.out; g.beginPath(); g.moveTo(-5, -4); g.lineTo(5, -4); g.lineTo(1, 5); g.lineTo(-1, 5); g.closePath(); g.fill(); g.fillStyle = '#ffb3c7'; g.beginPath(); g.moveTo(-4, -3); g.lineTo(4, -3); g.lineTo(0.5, 4); g.lineTo(-0.5, 4); g.closePath(); g.fill(); }
  if (x === 'card') { g.fillStyle = C.out; g.fillRect(-5, -4, 10, 8); g.fillStyle = C.white; g.fillRect(-4, -3, 8, 6); g.fillStyle = C.pinkD; g.fillRect(-3, -2, 1, 1); g.fillRect(-2, -1, 4, 1); g.fillRect(2, -2, 1, 1); }
  if (x === 'bow') { g.fillStyle = C.out; g.fillRect(-5, -3, 10, 6); g.fillStyle = C.red; g.fillRect(-4, -2, 3, 4); g.fillRect(1, -2, 3, 4); g.fillStyle = C.redD; g.fillRect(-1, -1, 2, 2); }
  g.restore();
}
function bouquet(g, x, y, stems, done, scale = 1) {
  const n = stems.length;
  for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.35; g.strokeStyle = C.greenD; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 14 * scale); g.lineTo(x + Math.sin(a) * 9 * scale, y); g.stroke(); }
  if (done.wrap) {
    g.fillStyle = '#e07a9a'; g.beginPath(); g.moveTo(x - 9 * scale, y - 1); g.lineTo(x + 9 * scale, y - 1); g.lineTo(x + 2, y + 16 * scale); g.lineTo(x - 2, y + 16 * scale); g.closePath(); g.fill();
    g.fillStyle = '#ffb3c7'; g.beginPath(); g.moveTo(x - 7 * scale, y); g.lineTo(x + 7 * scale, y); g.lineTo(x + 1, y + 14 * scale); g.lineTo(x - 1, y + 14 * scale); g.closePath(); g.fill();
  }
  stems.forEach((m, i) => { const a = (i - (n - 1) / 2) * 0.35; flower(g, m, x + Math.sin(a) * 9 * scale, y + 3 - Math.cos(a) * 2, Math.round(9 * scale)); });
  if (done.card) extra(g, 1, x + 7 * scale, y + 6 * scale, 0.8 * scale);
  if (done.bow) extra(g, 2, x, y + 10 * scale, 0.8 * scale);
}
function background(g) {
  // wall with striped paper, shelves of potted flowers and a window
  for (let x = 0; x < W; x += 12) { g.fillStyle = (x / 12) % 2 ? '#ffe3ec' : '#fff1f5'; g.fillRect(x, 0, 12, 128); }
  g.fillStyle = '#ffd0de'; for (let x = 6; x < W; x += 24) for (let y = 10; y < 120; y += 22) { g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
  drawAt(g, S.windowIn, 250, 58, { ay: 1 }); drawAt(g, S.shelf, 360, 46, { ay: 1 }); drawAt(g, S.shelf, 432, 46, { ay: 1 });
  // shop door (customers come in on the right)
  g.fillStyle = C.brownD; g.fillRect(452, 52, 30, 76); g.fillStyle = C.brownL; g.fillRect(455, 55, 24, 73); g.fillStyle = C.skyL; g.fillRect(459, 60, 16, 22); g.fillStyle = C.yellow; g.fillRect(474, 92, 3, 3);
  // ticket rail
  g.fillStyle = C.brownD; g.fillRect(8, 24, 214, 4); g.fillStyle = C.brownL; g.fillRect(8, 24, 214, 2);
  // floor
  for (let y = 128; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#c48a5a' : '#b97e4f'; g.fillRect(0, y, W, 8); g.fillStyle = C.brown; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
  g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center';
  // Đào's flower bench with three buckets
  g.fillStyle = C.brownD; g.fillRect(DAO - 50, 198, 100, 18); g.fillStyle = C.brownL; g.fillRect(DAO - 50, 198, 100, 4);
  MASKS.forEach((m, i) => {
    const x = DAO - 32 + i * 32;
    g.fillStyle = C.grayD; g.fillRect(x - 8, 188, 16, 12); g.fillStyle = C.gray; g.fillRect(x - 7, 188, 14, 11); g.fillStyle = C.grayL; g.fillRect(x - 7, 188, 14, 2);
    for (let k = 0; k < 3; k++) { g.fillStyle = C.greenD; g.fillRect(x - 4 + k * 4, 180, 1, 9); flower(g, i, x - 4 + k * 4, 184 - (k % 2) * 3, 9); }
    g.fillStyle = C.white; g.fillText(String(i + 1), x, 210);
  });
  // Mai's table: gift paper, a stack of cards, ribbon
  g.fillStyle = C.brownD; g.fillRect(MAI - 50, 198, 100, 18); g.fillStyle = C.brownL; g.fillRect(MAI - 50, 198, 100, 4);
  EXTRAS.forEach((x, i) => { extra(g, i, MAI - 32 + i * 32, 190, 1.4); g.fillStyle = C.white; g.fillText('QWE'[i], MAI - 32 + i * 32, 210); });
  // Lan's counter with the till
  g.fillStyle = C.brownD; g.fillRect(LAN - 50, 198, 110, 18); g.fillStyle = C.brownL; g.fillRect(LAN - 50, 198, 110, 4);
  g.fillStyle = C.grayD; g.fillRect(LAN + 34, 180, 22, 18); g.fillStyle = C.mint; g.fillRect(LAN + 37, 183, 16, 6); g.fillStyle = C.grayL; g.fillRect(LAN + 36, 191, 18, 5);
}
// the counter in front of the queue is drawn over the customers' legs
function counter(g) { g.fillStyle = C.brownD; g.fillRect(232, 125, 216, 14); g.fillStyle = C.brownL; g.fillRect(232, 125, 216, 4); g.fillStyle = '#e3a874'; g.fillRect(232, 125, 216, 1); }

const SKIN = {
  id: 'shop', parts: PARTS, extras: EXTRAS, text: TEXT, demoScript: DEMO,
  art: { background, counter, part: flower, extra, product: bouquet, customer: (look, f) => S.customer[look][f] },
};

export default function () { register('shop', p => new AssemblyLine(SKIN, p)); }
