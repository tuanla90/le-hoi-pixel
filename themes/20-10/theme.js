// Tiệm Hoa 20/10: three sisters open a flower shop in five rounds. See core/theme.js for what a theme provides.
import * as S from './sprites.js';
import { INFO, ROLES, CONTROLS } from './meta.js';
import { drawCard } from './card.js';

export default {
  ...INFO,
  store: 'thoa_', // the records saved before themes existed keep working
  roles: ROLES,
  avatar: (i, dir, frame, carry) => S.girl(i, dir, frame, carry),
  rounds: [
    { id: 'garden', num: 1, title: 'Trồng cây', spr: () => S.plant('hong', 3) },
    { id: 'carry', num: 2, title: 'Bê cây', spr: () => S.bigPot },
    { id: 'drive', num: 3, title: 'Chở cây', spr: () => S.truckSide },
    { id: 'sign', num: 4, title: 'Làm biển hiệu', spr: () => S.signPost },
    { id: 'shop', num: 5, title: 'Ngày khai trương', spr: () => S.potBloom(12) },
  ],
  controls: CONTROLS,
  drawCard,
  cheers: [S.heart, S.star, S.note, S.sparkleFlower[0]],
  scenes: () => Promise.all(['title', 'garden', 'carry', 'drive', 'sign', 'shop', 'final'].map(n => import(`./scenes/${n}.js`))),
};
