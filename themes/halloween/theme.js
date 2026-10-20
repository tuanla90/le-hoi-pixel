// Đêm Halloween: three kids in costume (Bí, Dơi, Mèo) get through a spooky night in three rounds.
// Rounds 1 and 3 dress the shared mechanics (grid care, assembly line); round 2 is the torch mechanic made for this theme.
// See core/theme.js for what a theme provides.
import * as S from './sprites.js';
import * as A from '../../core/audio.js';
import { INFO, ROLES, CONTROLS } from './meta.js';
import { drawCard } from './card.js';

// spooky tunes in A minor (MIDI notes; 0 = rest) for the title screen, the round cards and the rounds
A.setSongs({
  title: { bpm: 104, lead: [69, 0, 72, 0, 76, 0, 75, 0, 74, 0, 72, 0, 71, 0, 68, 0, 69, 0, 72, 0, 76, 0, 81, 0, 80, 0, 76, 0, 72, 0, 0, 0], bass: [45, 52, 45, 52, 41, 48, 40, 47, 45, 52, 45, 52, 41, 48, 40, 40] },
  calm: { bpm: 88, lead: [76, 0, 0, 72, 0, 0, 69, 0, 71, 0, 72, 0, 71, 0, 68, 0, 76, 0, 0, 79, 0, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0], bass: [45, 45, 41, 41, 43, 43, 40, 40, 45, 45, 41, 41, 38, 40, 45, 45] },
  play: { bpm: 132, lead: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 71, 72, 74, 0, 69, 72, 76, 81, 80, 76, 72, 76, 77, 76, 74, 71, 68, 0, 69, 0], bass: [45, 45, 52, 52, 41, 41, 48, 48, 43, 43, 50, 50, 40, 40, 45, 45] },
});

export default {
  ...INFO,
  roles: ROLES,
  avatar: (i, dir, frame, carry) => S.kid(i, dir, frame, carry),
  rounds: [
    { id: 'pumpkin', num: 1, title: 'Vườn bí ngô', spr: () => S.pumpkin('cam', 3) },
    { id: 'ghosts', num: 2, title: 'Soi đèn đuổi ma', spr: () => S.ghost('big', '', 0) },
    { id: 'potion', num: 3, title: 'Tiệm thuốc phù thủy', spr: () => S.cauldron },
  ],
  controls: CONTROLS,
  drawCard,
  cheers: [S.jackMini, S.candy[0], S.bat[0], S.star],
  scenes: () => Promise.all(['title', 'pumpkin', 'ghosts', 'potion', 'final'].map(n => import(`./scenes/${n}.js`))),
};
