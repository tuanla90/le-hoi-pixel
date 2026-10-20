// The active theme: one festival's characters, rounds, art and texts (themes/<id>/theme.js).
// The core never names a festival; it reads everything festival-specific from `theme`, which boot fills once.
//
// A theme module's default export:
//   id, name                  'tet', 'Chợ Tết'
//   store                     localStorage prefix for its records (defaults to 'lhp_<id>_')
//   roles[3]                  { name, icon, desc, c, cd, ink }: chip colour, its darker shade, text colour on cards
//   avatar(i, dir, frame, x)  the role's pixel sprite (dir 'down' | 'up' | 'side')
//   rounds[]                  { id, num, title, spr: () => canvas } in play order; each id is also a scene name
//   controls                  per round: phone buttons for each role (see themes/20-10/meta.js)
//   drawCard(card)            the personal card at the finale, as a PNG data URL
//   cheers                    sprites floating up from the corner when the team does well
//   scenes()                  imports the theme's scene modules (title, every round, final)
//   cardName, cardFile, teamExample, captainHint   short texts the shared dialogs use
import { img, heart, star, note } from './ui-sprites.js';

export const DEFAULT_THEME = '20-10';
export const theme = {};

// the catalogue the server and the leaderboard also read: [{ id, name, rounds: [[id, label], …] }]
export async function themeList() {
  try { const r = await fetch('themes/themes.json', { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch (e) { /* static file missing */ }
  return [];
}

export async function loadTheme(wanted) {
  const list = await themeList();
  const id = list.some(t => t.id === wanted) ? wanted : list[0]?.id || DEFAULT_THEME;
  const mod = (await import(`../themes/${id}/theme.js`)).default;
  Object.assign(theme, { cheers: [heart, star, note], store: `lhp_${id}_` }, mod, { id });
  // pixel-art round icons (emoji like 🪴 are missing on older Windows fonts), drawn on first use
  theme.rounds.forEach(r => { let c; Object.defineProperty(r, 'icon', { get: () => c || (c = img(r.spr(), 'ricon')) }); });
  return theme;
}

// localStorage key for one of the theme's records (best scores, difficulty, team name)
export const storeKey = k => theme.store + k;
