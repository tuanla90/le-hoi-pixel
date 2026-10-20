// Round 3 — drive the truck full of potted plants to the shop.
// The rules are mechanics/auto-drive.js; this file is the 20/10 skin: the truck, the countryside, texts and art.
// The truck drives itself: Đào steers left, Mai right, Lan brakes for red lights, deliveries and narrow stretches.
import { register, W } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import { grassField } from '../world.js';
import { AutoDrive, LAYOUT } from '../../../mechanics/auto-drive.js';

const { CUSTOMERS, LIGHTS, PULL_OVER, POT_PTS } = LAYOUT;
const potholes = { 0: 'ổ gà không làm rơi chậu', 0.3: 'ổ gà đôi khi làm rơi chậu', 0.6: 'ổ gà dễ làm rơi chậu' };
const TEXT = {
  desc: 'Chở thùng cây tới cửa hàng! <b>Xe tự chạy</b>: Đào và Mai lái theo đường cong, né chướng ngại và giữ xe giữa những đoạn đường hẹp; Lan <b>phanh</b> đúng lúc ở đèn đỏ, chỗ giao hoa và trước đoạn hẹp.',
  tip: `Có ${CUSTOMERS.length} khách và ${LIGHTS.length} cột đèn. Giao cho khách đáng hơn hẳn mang chậu về tiệm (+${POT_PTS}). Vượt đèn đỏ bị chú công an giữ xe lại tận ${PULL_OVER} giây. Góc trái báo đèn phía trước còn mấy giây và đoạn đường hẹp sắp tới. Nhặt <b>sao</b> để được thưởng.`,
  diffInfo: (e, num, d) => `${{ easy: 'đường rộng, cua nhẹ, chướng ngại thưa', normal: 'đường hơi rộng, cua vừa', hard: 'đường hẹp, cua gắt, chướng ngại dày' }[d]} · ${e.funnels.length} đoạn đường hẹp${e.cones ? ' có cọc tiêu (đụng là rơi chậu)' : ''} · ${potholes[e.pothole]}${e.bump ? ` · mỗi lần va chạm −${e.bump}` : ''} · giao hoa +${e.deliver} · về trong ${e.par} giây là đủ điểm thời gian, mỗi giây sớm hơn +${e.fast}`,
  scoreLabel: 'Chậu',
  hud: (pots, total, delivered) => `${pots}/${total} · giao ${delivered}`,
  roles: [
    { act: 'Lái sang <b>trái</b>', short: 'Lái trái' },
    { act: 'Lái sang <b>phải</b>', short: 'Lái phải' },
    { act: '<b>Giữ phanh</b> để chậm lại: dừng đèn đỏ, giao hoa cho khách, qua đoạn đường hẹp — buông ra là xe tự chạy tiếp', short: 'Phanh' },
  ],
  demoKeys: ['← lái trái', 'lái phải →', '↓ giữ phanh'],
  demoCustomer: (side, pts) => `Khách vẫy tay! <b>${side < 0 ? 'Đào lái sát lề trái' : 'Mai lái sát lề phải'}</b>, <b>Lan giữ phanh</b> chạy chậm qua ô GIAO → giao một chậu +${pts}`,
  demoLight: {
    red: `Đèn <b>đỏ</b> phía trước → <b>Lan giữ phanh</b>, dừng trước vạch kẻ. Vượt đèn đỏ bị chú công an giữ xe ${PULL_OVER} giây!`,
    yellow: 'Đèn <b>vàng</b> → sắp đỏ, chuẩn bị phanh',
    green: 'Đèn <b>xanh</b> → đi tiếp, nhưng để ý góc trái xem đèn còn mấy giây',
  },
  demoNarrow: '<b>Đường hẹp</b> phía trước! <b>Đào</b> và <b>Mai</b> giữ xe ở giữa, <b>Lan</b> phanh bớt cho dễ lái',
  delivered: pts => `Giao hoa thành công! +${pts} 💐`,
  ranRed: s => `Vượt đèn đỏ! Chú công an giữ xe ${s} giây 👮`,
  dogCrossing: 'Chó bất ngờ băng qua! Giảm ga và né nhé!', ducksCrossing: 'Quạc quạc! Nhường đường cho vịt nhé 🦆',
  lostLoad: 'Rơi mất một chậu cây! 😢',
  dropOff: 'GIAO',
  lightNames: { red: 'ĐỎ', yellow: 'VÀNG', green: 'XANH' },
  redWarn: m => `🚦 SẮP ĐẾN ĐÈN ĐỎ — LAN PHANH! (${m}m)`,
  pulledOver: s => `👮 Bị giữ xe… ${s}s`,
  narrowNow: 'ĐƯỜNG HẸP!', narrowIn: m => `HẸP sau ${m}m`,
  arrived: 'Tới tiệm rồi!', timeUp: 'Hết giờ!',
  time: 'Thời gian', deliveries: 'Giao hoa cho khách', loadsHome: 'Chậu mang về tiệm', redLights: 'Vượt đèn đỏ', redLightsNone: '0 — gương mẫu!',
  stars: 'Sao nhặt được', early: par => 'Về sớm hơn mốc ' + par + ' giây', crashes: 'Va chạm',
};
const DEMO = [
  { at: 0, text: '<b>Xe tự chạy!</b> <b>Lan</b> giữ ↓ để <b>phanh</b> — buông ra là xe tự tăng tốc lại', focus: 'vehicle' },
  { at: 7, text: '<b>Đào</b> giữ ← lái sang trái · <b>Mai</b> giữ → lái sang phải để <b>né chướng ngại</b>', focus: 'obstacle' },
  { at: 14, text: 'Ối, lái không kịp… <b>đâm vào chướng ngại</b> là xe khựng lại và <b>rơi mất một chậu cây</b>!', focus: 'obstacle' },
  { at: 21, text: 'Đàn vịt qua đường thì nhường nhé · ra <b>bãi cỏ</b> xe chạy rất chậm', focus: 'vehicleWide' },
  { at: 26, text: 'Nhặt <b>sao</b> dọc đường để được thưởng, về tới tiệm càng nhanh càng tốt!', focus: 'vehicleWide' },
];

// ------------------------------------------------ art
function ob(g, o, y, fl, anim) {
  if (o.type === 'cone') drawAt(g, S.cone, o.x, y + 6);
  if (o.type === 'pothole') drawAt(g, S.pothole, o.x, y, { ay: .5 });
  if (o.type === 'puddle') drawAt(g, S.puddle, o.x, y, { ay: .5 });
  if (o.type === 'tractor') drawAt(g, S.tractor, o.x, y, { ay: .5 });
  if (o.type === 'scooter') drawAt(g, S.scooter, o.x, y, { ay: .5 });
  if (o.type === 'oncoming') drawAt(g, S.tractor, o.x, y, { ay: .5, flip: true });
  if (o.type === 'flower') drawAt(g, S.star, o.x, y + Math.sin(anim * 5 + o.d) * 2, { ay: .5 });
  if (o.type === 'ducks') {
    const up = o.scared ? -o.scared * 40 : 0;
    drawAt(g, S.duck[fl], o.x, y + 5 + up, { flip: o.dir < 0, alpha: o.scared ? Math.max(0, 1 - o.scared / 1.5) : 1 });
    for (let i = 1; i <= 3; i++) drawAt(g, S.duckling[(fl + i) % 2], o.x - o.dir * i * 9, y + 4 + up * (1 + i * .2), { flip: o.dir < 0, alpha: o.scared ? Math.max(0, 1 - o.scared / 1.5) : 1 });
  }
  if (o.type === 'dog') {
    const up = o.scared ? -o.scared * 35 : 0;
    drawAt(g, S.dog[(anim * 6 | 0) % S.dog.length], o.x, y + 4 + up, { flip: o.dir < 0, alpha: o.scared ? Math.max(0, 1 - o.scared / 1.5) : 1 });
  }
}
function deco(g, o, y) {
  if (o.type === 'tree') drawAt(g, o.v % 2 ? S.tree : S.treeRound, o.x, y);
  else if (o.type === 'house') drawAt(g, S.house[o.v % 4], o.x, y);
  else if (o.type === 'tuft') drawAt(g, S.flowerTuft[o.v], o.x, y);
  else if (o.type === 'lamp') drawAt(g, S.lampPost, o.x, y);
  else if (o.type === 'bush') drawAt(g, S.bush, o.x, y);
  else drawAt(g, S.rock, o.x, y);
}

const SKIN = {
  id: 'drive', text: TEXT, demoScript: DEMO,
  art: {
    ground: () => grassField(W + 8, 256, 5), finish: () => S.shopFacade(),
    vehicle: S.truck, cargo: i => S.potTop[i], ob, deco,
    customer: (look, f) => S.customer[look][f], wants: look => S.potTop[look], police: f => S.police[f],
    colors: { dust: C.creamD, deliver: [C.pink, C.yellow, C.white], pickup: [C.yellow, C.white, C.pinkL], splash: [C.water, C.white], cone: [C.orange, C.white] },
  },
};

export default function () { register('drive', p => new AutoDrive(SKIN, p)); }
