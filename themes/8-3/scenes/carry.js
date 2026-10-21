// Round 2 — carry the big potted plant from the greenhouse to the delivery truck.
// The rules are mechanics/carry-balance.js; this file is the 20/10 skin: the garden course, texts and art.
// Đào leads up/down, Mai left/right, Lan keeps the pot balanced.
import { register } from '../../../core/main.js';
import { C, drawAt } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import { grassField } from '../world.js';
import { CarryBalance, LAYOUT, segDist } from '../../../mechanics/carry-balance.js';

const { T } = LAYOUT;
const MW = 40, MH = 30;
// The route snakes through three vertical bands (down band 1, up band 2, down band 3) joined at the bottom and the top,
// with hedge stubs that make it weave sideways, so Đào (up/down) and Mai (left/right) lead about equally.
// bridge = width of the two rope bridges (crossed walking up/down), stones = width of the stepping-stone gap (crossed sideways)
function buildMap(bridge, stones) {
  const m = Array.from({ length: MH }, () => Array(MW).fill('.'));
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m[j][i] = c; };
  rect(0, 0, MW, 1, '#'); rect(0, MH - 1, MW, 1, '#'); rect(0, 0, 1, MH, '#'); rect(MW - 1, 0, 1, MH, '#');
  rect(12, 0, 1, MH, '#');        // band 1 | band 2: only the stepping stones get through
  rect(26, 8, 1, MH - 8, '#');    // band 2 | band 3: open along the top (rows 1-7)
  // band 1 (x 1-11), walking down
  rect(1, 6, 7, 1, '#'); rect(5, 14, 7, 1, '#'); rect(1, 19, 6, 1, '#');
  rect(1, 1, 2, 1, 'f'); rect(10, 13, 2, 1, 'f'); rect(1, 27, 3, 1, 'f');
  // band 2 (x 13-25), walking up
  rect(13, 14, 7, 1, '#'); rect(19, 9, 7, 1, '#');
  rect(21, 17, 2, 2, 'p'); rect(13, 6, 1, 2, 'f'); rect(23, 27, 3, 1, 'f'); rect(24, 1, 2, 1, 'f');
  // band 3 (x 27-38), walking down; the delivery truck parks across its lower half
  rect(27, 17, 7, 1, '#'); rect(33, 21, 6, 2, 'X');
  rect(37, 1, 2, 2, 'f'); rect(27, 12, 1, 2, 'f'); rect(36, 9, 3, 1, 'p');
  // three compulsory crossings: a rope bridge in band 1, stepping stones between bands 1 and 2, a rope bridge in band 3
  for (let x = 1; x <= 11; x++) m[10][x] = x >= 4 && x < 4 + bridge ? 'r' : '#';
  for (let x = 27; x <= 38; x++) m[11][x] = x >= 31 && x < 31 + bridge ? 'r' : '#';
  for (let y = 23; y < 23 + stones; y++) m[y][12] = 's';
  return m;
}
const ROUTE = [[3, 4], [9.5, 4.2], [9.5, 8.2], [5, 8.5], [5, 12.2], [2.5, 12.2], [2.5, 17], [9.5, 17], [9.5, 23.75], [19.5, 23.75], [19.5, 16.5], [23, 16.5], [23, 11.5], [15.5, 11.5], [15.5, 4], [32, 4], [32, 15], [36, 15], [36, 19], [30, 19], [30, 25], [36, 25.5]].map(([x, y]) => [x * T + 8, y * T + 8]);
const LEVEL = {
  MW, MH, build: buildMap, route: ROUTE,
  start: [3 * T + 8, 4 * T + 8],
  goal: { x: 33.5 * T, y: 23 * T }, // behind the truck
  // rough-footing zones around each crossing (tile coords, [x0, x1) × [y0, y1)): the whole band feels it, not just the gap
  gates: [
    { k: 'r', x: [1, 12], y: [9, 12] },
    { k: 's', x: [10, 15], y: [21, 28] },
    { k: 'r', x: [27, 39], y: [10, 12.5] },
    { k: 'e', x: [27, 39], y: [12.5, 16] }, // muddy ground right after the second bridge
  ],
  windy: { x: [27, 39], y: [17.5, 29] }, // the open field by the truck: gusts are twice as strong
  trees: [[9, 1.5], [1.5, 8], [2, 25], [6, 27.5], [22, 2.5], [24, 7], [37, 4.5], [29, 9], [28, 15.5], [20, 27.5], [37, 27.5], [19.5, 6.5]],
  sprayers: [[25.2, 13.2], [27.8, 21.5]],
  // bonus flowers (each one is planted in the carried pot): most sit on the stone path, a few need a detour or sit next to a hazard
  stars: [[6.5, 4.2], [9.5, 6.5], [5, 11], [2.5, 14.5], [6, 17], [9.5, 21], [15, 23.75], [19.5, 20], [22, 16.5], [23, 13.5], [19, 11.5], [15.5, 7], [21, 2.5], [28, 4], [32, 8.5], [34, 15], [33, 19], [30, 22.5]],
  // each dog patrols across the path: band 1 corridor, band 2 bottom, the field below the truck
  chasers: [
    { x: 8 * T + 8, y: 15 * T, a: [8 * T + 8, 15.2 * T], b: [8 * T + 8, 18.6 * T], sp: 46, t: 0 },
    { x: 16.5 * T, y: 19 * T, a: [16.5 * T + 8, 18.4 * T], b: [16.5 * T + 8, 28.3 * T], sp: 50, t: 0.5 },
    { x: 28 * T, y: 24 * T, a: [27.6 * T, 24 * T], b: [32.6 * T, 24 * T], sp: 52, t: 0.2 },
  ],
  blocker: { x: 22.5 * T, y: 21 * T }, // a sleeping cat
};

const TEXT = {
  desc: 'Ba chị em cùng bê chậu cây to lên xe giao hàng. Đào dẫn lên/xuống, Mai dẫn trái/phải, Lan <b>giữ chậu thăng bằng</b>. Va hàng rào, bị cún xô, dính vòi tưới, giẫm vũng nước… đều làm chậu nghiêng — nghiêng quá là <b>đổ chậu</b>!',
  tip: 'Nhặt <b>hoa</b> dọc đường để cắm thêm vào chậu, về sớm hơn mốc còn được thưởng theo giây. Đường ngoằn ngoèo lên xuống nên <b>Đào và Mai</b> thay nhau dẫn. Giữ chấm trắng trên thước thăng bằng ở giữa. Mỗi lần đổ chậu mất khoảng 1 giây hốt đất và bị trừ điểm. Cún chạy chậm hơn nhóm, cứ đi tiếp là thoát.',
  diffInfo: (e, num, d) => `${{ easy: 'chậu nghiêng chậm, gió nhẹ, cún chạy chậm', normal: 'chậu nghiêng vừa', hard: 'chậu nghiêng nhanh, gió mạnh, cún chạy nhanh' }[d]} · cầu treo ${e.bridge} ô, khe đá ${e.stones} ô · đổ chậu −${e.drop} điểm · về trong ${e.par} giây là 100 điểm · mỗi bông hoa +${num(e.flower)}, mỗi giây sớm hơn +${e.fast}`,
  scoreLabel: 'Chậu',
  hud: (flowers, drops) => `🌸 ${flowers} · đổ ${drops}`,
  roles: [
    { act: 'Dẫn nhóm <b>lên / xuống</b>', short: 'Lên / Xuống' },
    { act: 'Dẫn nhóm <b>trái / phải</b>', short: 'Trái / Phải' },
    { act: 'Giữ chậu <b>thăng bằng</b>: Q kéo về trái · E kéo về phải', short: 'Cân chậu' },
  ],
  chaserHit: 'Gâu! Cún xô vào 🐶',
  dropToast: pts => `Úi, đổ chậu rồi! −${pts} điểm · Hốt đất nào…`,
  scooping: 'Hốt đất…',
  demoDrop: 'Chậu nghiêng quá nên <b>đổ</b>! Cả nhóm mất khoảng 1 giây hốt đất và bị <b>trừ điểm</b>',
  demoAfterDrop: 'Hốt xong đất thì cân lại và đi tiếp — lần này bấm <b>đúng phía</b> nhé!',
  arrived: 'Tới nơi rồi!', timeUp: 'Hết giờ!',
  time: 'Thời gian', tooLate: 'quá 2 phút', drops: 'Số lần đổ chậu', dropsNone: '0 — tuyệt vời!', pickups: 'Hoa cắm vào chậu', early: par => 'Về sớm hơn mốc ' + par + ' giây',
};
const DEMO = [
  { at: 0, text: '<b>Đào</b> bấm ↑ ↓ và <b>Mai</b> bấm ← → để dẫn cả nhóm đi theo <b>đường lát đá</b>', focus: 'pot' },
  { at: 6, text: '<b>Thước thăng bằng</b> trên đầu chậu: chấm trắng lệch sang bên nào là chậu đang <b>nghiêng</b> bên đó', focus: 'level' },
  { at: 11, text: 'Chậu nghiêng phải → <b>Lan</b> bấm <b>Q</b> kéo về · nghiêng trái → bấm <b>E</b>', focus: 'level' },
  { at: 16, text: 'Ối, <b>Lan</b> lơ là không cân → chấm trắng trôi dần ra mép, chậu nghiêng dần…', focus: 'level' },
  { at: 19, text: 'Lại còn <b>bấm nhầm phía</b> → chậu nghiêng hẳn sang một bên!', focus: 'level' },
  { at: 24, text: 'Va hàng rào, cún, vòi tưới, vũng nước đều làm chậu <b>nghiêng</b> — đi khéo nhé!', focus: 'potWide' },
];

// ------------------------------------------------ art
function background(g, map) {
  grassField(MW * T, MH * T, 33, g);
  // stone path along the intended route, with a visible rope bridge crossing
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (map[y][x] !== '.') continue;
    let d = 1e9; for (let i = 0; i < ROUTE.length - 1; i++) d = Math.min(d, segDist(x * T + 8, y * T + 8, ROUTE[i], ROUTE[i + 1]));
    if (d < 13) g.drawImage(S.stoneTile, x * T, y * T);
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = map[y][x];
    if (c === 'p') { g.fillStyle = '#7ec9ee'; g.fillRect(x * T, y * T, T, T); g.fillStyle = '#a6dcf6'; if ((x + y) % 2) g.fillRect(x * T + 3, y * T + 5, 6, 1); }
    if (c === 'f') g.drawImage(S.flowerBed, x * T, y * T);
    if (c === 's') { g.fillStyle = '#9f9ba8'; g.fillRect(x * T + 2, y * T + 3, 12, 10); g.fillStyle = '#cbc7d0'; g.fillRect(x * T + 4, y * T + 4, 7, 2); }
    if (c === 'e') { g.fillStyle = '#b99a70'; g.fillRect(x * T + 3, y * T + 2, 10, 12); g.fillStyle = '#e1c89f'; g.fillRect(x * T + 5, y * T + 4, 6, 7); }
    if (c === 'r') { g.fillStyle = '#7ec9ee'; g.fillRect(x * T, y * T, T, T); g.fillStyle = '#5f412f'; g.fillRect(x * T + 3, y * T, T - 6, T); g.fillStyle = '#c68b54'; for (let yy = 0; yy < T; yy += 4) g.fillRect(x * T + 4, y * T + yy, T - 8, 2); g.fillStyle = '#f0c486'; g.fillRect(x * T + 5, y * T + 1, 1, T - 2); g.fillRect(x * T + T - 6, y * T + 1, 1, T - 2); }
  }
  // puddle edges
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === 'p') { g.fillStyle = '#5fb0d9'; if (map[y + 1]?.[x] !== 'p') g.fillRect(x * T, y * T + T - 2, T, 2); }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = map[y][x];
    if (c === '#') g.drawImage(S.hedge, x * T, y * T);
    if (c === 'F') { g.drawImage(S.fenceV, x * T + 5, y * T - 2); }
  }
  // muddy patch after the second bridge
  const mud = LEVEL.gates[3]; let seed = 7; const rr = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  g.globalAlpha = 0.45; g.fillStyle = '#8a6a45'; g.fillRect(mud.x[0] * T, mud.y[0] * T, (mud.x[1] - mud.x[0]) * T, (mud.y[1] - mud.y[0]) * T);
  g.globalAlpha = 0.8; for (let i = 0; i < 60; i++) { g.fillStyle = rr() < .5 ? '#6e5236' : '#a4825a'; g.fillRect(mud.x[0] * T + rr() * (mud.x[1] - mud.x[0]) * T, mud.y[0] * T + rr() * (mud.y[1] - mud.y[0]) * T, 3 + rr() * 5, 2); }
  g.globalAlpha = 1;
  // start greenhouse + goal (the delivery truck, loaded from behind)
  drawAt(g, S.shed, 3 * T, 2.2 * T);
  g.drawImage(S.doormat, 34 * T, 23.4 * T);
  drawAt(g, S.truckSide, 36 * T, 23 * T + 2);
}
// the sleeping cat, with a little "z" now and then
function blocker(g, x, y, t) {
  drawAt(g, S.cat, x, y + 5);
  if (((t * 1.5) | 0) % 2) { g.fillStyle = C.lavD; g.fillRect(x + 3, y - 10, 3, 1); g.fillRect(x + 5, y - 9, 1, 1); g.fillRect(x + 3, y - 8, 3, 1); }
}

const SKIN = {
  id: 'carry', level: LEVEL, text: TEXT, demoScript: DEMO,
  art: {
    background, blocker,
    tree: (tx, ty) => ((tx + ty) % 3 ? S.tree : S.treeRound),
    sprayer: S.sprinkler, chaser: f => S.dog[f], pickup: f => S.sparkleFlower[f], flyer: f => S.butterfly[f],
    spilled: S.brokenPot, load: n => S.potBloom(2 + n),
    colors: { spill: [C.soil, C.soilD, C.brownL, C.pot], scoop: [C.soil, C.brownL], pickup: [C.pink, C.white, C.yellow], spray: [C.water, C.white], sweat: C.skyL },
  },
};

export default function () { register('carry', p => new CarryBalance(SKIN, p)); }
