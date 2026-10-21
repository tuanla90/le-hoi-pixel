// Tiệm Hoa 8/3: the same three sisters, at their flower shop in the busiest season of the year — three rounds:
// carry a big pot of orchids to the truck, paint a giant 8/3 card for the shop window, stack the 8/3 gift tower.
// The sisters, their art and the title / finale scenes come from Tiệm Hoa 20/10 (themes/20-10).
// See core/theme.js for what a theme provides.
import * as S from '../20-10/sprites.js';
import { FLOWER_RANKS } from '../20-10/theme.js';
import { INFO, ROLES, CONTROLS } from './meta.js';
import { drawCard } from './card.js';
import { giftIcon } from './scenes/gifts.js';

export default {
  ...INFO,
  roles: ROLES,
  avatar: (i, dir, frame, carry) => S.girl(i, dir, frame, carry),
  rounds: [
    { id: 'carry', num: 1, title: 'Bê chậu lan', spr: () => S.bigPot },
    { id: 'sign', num: 2, title: 'Vẽ thiệp 8/3', spr: () => S.paintFlower(5, 15) },
    { id: 'gifts', num: 3, title: 'Tháp quà 8/3', spr: () => giftIcon },
  ],
  controls: CONTROLS,
  drawCard,
  cheers: [S.heart, S.star, S.note, S.sparkleFlower[0]],
  look: {
    logo: ['Tiệm Hoa', '8<i>/</i>3'], sub: 'Ba chị em · Mùa quà 8/3 · Ba thử thách',
    finale: {
      opening: '💐 Mừng 8/3! 💐', headline: '8 / 3', date: '8/3', ranks: FLOWER_RANKS,
      titles: ['Bông Đào duyên dáng', 'Nàng Mai chu đáo', 'Đoá Lan dịu dàng'],
      wishes: [
        'Chúc bạn một ngày 8/3 thật nhiều hoa, nhiều quà và nhiều yêu thương!',
        'Chúc bạn luôn xinh đẹp, tự tin và hạnh phúc — không chỉ hôm nay mà mỗi ngày!',
        'Cảm ơn bạn đã cùng ba chị em lo mùa quà 8/3 — chúc bạn luôn rạng rỡ như hoa!',
        'Chúc bạn sức khoẻ dồi dào, công việc thuận lợi và nụ cười luôn trên môi!',
        'Chúc bạn được trân trọng và yêu thương thật nhiều, ngày 8/3 và cả năm!',
      ],
    },
  },
  scenes: () => Promise.all([
    import('../20-10/scenes/title.js'), import('./scenes/carry.js'), import('./scenes/sign.js'), import('./scenes/gifts.js'), import('../20-10/scenes/final.js'),
  ]),
};
