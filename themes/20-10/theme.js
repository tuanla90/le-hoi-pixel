// Tiệm Hoa 20/10: three sisters open a flower shop in three rounds — grow the plants, drive them to the shop, opening day.
// See core/theme.js for what a theme provides. Tiệm Hoa 8/3 (themes/8-3) borrows the sisters, the art and the
// title / finale scenes from here.
import * as S from './sprites.js';
import { INFO, ROLES, CONTROLS } from './meta.js';
import { drawCard } from './card.js';

// a 3-round total (each round counted after softCap, × its difficulty): about 100 per round is a good team
export const FLOWER_RANKS = [[375, 'Tiệm hoa Thần thoại', '✨'], [330, 'Tiệm hoa Huyền thoại', '👑'], [276, 'Tiệm hoa Nổi tiếng', '🌷'], [216, 'Tiệm hoa Dễ thương', '🌼'], [0, 'Tiệm hoa Mới mở', '🌱']];

export default {
  ...INFO,
  store: 'thoa_', // the records saved before themes existed keep working
  roles: ROLES,
  avatar: (i, dir, frame, carry) => S.girl(i, dir, frame, carry),
  rounds: [
    { id: 'garden', num: 1, title: 'Trồng cây', spr: () => S.plant('hong', 3) },
    { id: 'drive', num: 2, title: 'Chở cây', spr: () => S.truckSide },
    { id: 'shop', num: 3, title: 'Ngày khai trương', spr: () => S.potBloom(12) },
  ],
  controls: CONTROLS,
  drawCard,
  cheers: [S.heart, S.star, S.note, S.sparkleFlower[0]],
  // what the shared title and finale scenes show for this theme
  look: {
    logo: ['Tiệm Hoa', '20<i>/</i>10'], sub: 'Ba chị em · Một cửa hàng · Ba thử thách',
    finale: {
      opening: '🎉 Khai trương! 🎉', headline: '20 / 10', date: '20/10', ranks: FLOWER_RANKS,
      titles: ['Bông Đào rạng rỡ', 'Nàng Mai khéo tay', 'Đoá Lan tinh tế'],
      wishes: [
        'Chúc bạn luôn xinh đẹp, rạng rỡ như những bông hoa trong tiệm!',
        'Chúc bạn một mùa 20/10 thật nhiều niềm vui, nhiều yêu thương và nhiều hoa!',
        'Cảm ơn bạn đã cùng ba chị em mở tiệm — chúc bạn luôn tươi tắn và hạnh phúc!',
        'Chúc bạn mỗi ngày đều nở hoa: công việc thuận lợi, nụ cười luôn trên môi!',
        'Chúc bạn luôn tự tin, toả sáng và được yêu thương thật nhiều!',
      ],
    },
  },
  scenes: () => Promise.all(['title', 'garden', 'drive', 'shop', 'final'].map(n => import(`./scenes/${n}.js`))),
};
