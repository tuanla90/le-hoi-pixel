// Round 2 — chase the ghosts away with torches: the new way to play in this theme.
// The rules are mechanics/beam-guard.js; this file is the Halloween skin. Each kid turns one torch: Bí orange, Dơi purple,
// Mèo green. A small ghost wears one kid's colour; a big one needs two torches at once, the pumpkin king all three.
import { register, W } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import { night } from '../world.js';
import { BeamGuard, LAYOUT } from '../../../mechanics/beam-guard.js';
import { ROLES } from '../meta.js';

const col = i => `<b style="color:${ROLES[i].ink}">${['cam', 'tím', 'xanh'][i]}</b>`;
const TEXT = {
  desc: 'Nửa đêm, ma kéo tới từ bóng tối! Mỗi bạn cầm một <b>đèn pin</b>: ma nhỏ màu nào thì chỉ đèn <b>cùng màu</b> mới đuổi được. <b>Ma to</b> cần <b>2 đèn</b> chiếu cùng lúc, <b>vua bí ngô</b> cần cả <b>3 đèn</b>.',
  tip: 'Đèn nào chiếu vào ma cũng làm ma <b>đi chậm lại</b> — giữ chân ma của bạn mình trong lúc bạn ấy xoay đèn tới. Ma to tới thì hô nhau dồn đèn! Ma chạm tới các bạn là bị <b>hù</b>, mất điểm.',
  diffInfo: (e, num) => `ma bay ${e.speed} px/giây, cứ ${num(e.gap)}→${num(e.gapEnd)} giây một con · đèn rộng ${e.half * 2}° · ${Math.round(e.big * 100)}% là ma to · ${e.kings.length} lần vua bí ngô`,
  scoreLabel: 'Điểm',
  roles: [
    { act: `Xoay <b>đèn ${col(0)}</b>: A ◀ · D ▶`, short: 'Đèn cam' },
    { act: `Xoay <b>đèn ${col(1)}</b>: ← ◀ · → ▶`, short: 'Đèn tím' },
    { act: `Xoay <b>đèn ${col(2)}</b>: J ◀ · L ▶`, short: 'Đèn xanh' },
  ],
  kingComes: '🎃👑 Vua bí ngô tới — cả 3 đèn chiếu vào!',
  boo: 'HÙ!', firstScare: 'Ma chạm tới là bị hù, mất 10 điểm 😱',
  banner: 'Trời sáng rồi!', small: 'Ma nhỏ đuổi được', big: 'Ma to (2 đèn)', king: 'Vua bí ngô (3 đèn)', scares: 'Bị ma hù', scaresNone: '0 — gan dạ!',
};
const DEMO = [
  { at: 0, text: 'Ma bay tới từ bóng tối. <b>Mắt ma</b> sáng màu gì thì <b>đèn màu đó</b> mới đuổi được', focus: 'small' },
  { at: 5, text: '<b>Bí</b> A D · <b>Dơi</b> ← → · <b>Mèo</b> J L để <b>xoay đèn</b> — giữ đèn trên ma tới khi vòng sáng đầy', focus: 'kids' },
  { at: 10, text: '<b>Ma to</b> trắng cần <b>2 đèn</b> cùng lúc (số đèn hiện trên đầu ma)', focus: 'big' },
  { at: 18, text: '<b>Vua bí ngô</b> 👑 cần <b>cả 3 đèn</b> — cả đội dồn đèn vào!', focus: 'king' },
  { at: 25, text: 'Đèn nào chiếu vào ma cũng làm ma <b>chậm lại</b>. Ma chạm tới các bạn là bị <b>hù</b>, mất điểm', focus: 'kids' },
];
function background(g) {
  night(g, 53, 150);
  drawAt(g, S.deadTree, 40, 160); drawAt(g, S.deadTree, 444, 156, { flip: true }); drawAt(g, S.deadTree, 330, 150);
  [[70, 200, 0], [120, 186, 2], [168, 206, 1], [312, 200, 0], [362, 188, 1], [410, 206, 2], [24, 236, 1], [456, 240, 0]].forEach(([x, y, k]) => drawAt(g, S.grave[k], x, y));
  for (let x = 8; x < W; x += 16) if (x < 170 || x > 310) drawAt(g, S.ironFence, x, 160);
  const { HOME } = LAYOUT; g.fillStyle = S.N.soilD; g.beginPath(); g.ellipse(HOME.x, HOME.y + 4, 56, 10, 0, 0, Math.PI * 2); g.fill();
  drawAt(g, S.lantern, HOME.x - 46, HOME.y + 4); drawAt(g, S.candy[0], HOME.x + 46, HOME.y + 4);
}
const SKIN = {
  id: 'ghosts', text: TEXT, demoScript: DEMO,
  art: { background, creature: (kind, tint, f) => S.ghost(kind, tint || '', f), banish: [C.white, S.N.glow, S.N.purpleL, '#cfc4ff'] },
};

export default function () { register('ghosts', p => new BeamGuard(SKIN, p)); }
