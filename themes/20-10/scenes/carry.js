import { register, input, K, key, W, H, cheer, game } from '../../../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { Round } from '../../../core/round.js';
import { grassField } from '../world.js';

const T = 16, MW = 40, MH = 30;
const MAX_TIME = 120;
let PAR = 38, SPEED = 70, CHASE = 56, KICK = 1, FALL = 85; // tuned per difficulty in init()
const DROP_TIME = 1.2; // seconds lost scooping the soil back after a drop
let DROP_PTS = 6;      // points lost per drop (the plant gets bruised) — keeps Lan's balancing worth it
// balance (Lan): the pot is an inverted pendulum — it keeps tipping unless corrected with Q/E
let TIP = 1.4, DAMP = 1.4, FIX = 5, GUST = 0.9;
const OFF = [[0, -11], [-10, 5.5], [10, 5.5]]; // Đào front, Mai back-left, Lan back-right (mean must be 0)
const R = 5; // girl radius
// Dễ / Thường / Thử thách
const TUNE = {
  //       par  speed chase kick  drop tip   damp  fix  gust  fall  bridge stones flower fast
  easy:   [44,  62,   46,   0.72, 3,   1.0,  1.65, 5.3, 0.62, 58,   4,     3,     1.5,   1],
  normal: [40,  65,   51,   0.9,  4,   1.28, 1.48, 5.0, 0.85, 74,   3,     3,     1.5,   2],
  hard:   [37,  68,   56,   1.08, 5,   1.55, 1.32, 4.7, 1.02, 90,   3,     2,     2,     3],
};

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
// rough-footing zones around each crossing (tile coords, [x0, x1) × [y0, y1)): the whole band feels it, not just the gap
const GATES = [
  { k: 'r', x: [1, 12], y: [9, 12] },
  { k: 's', x: [10, 15], y: [21, 28] },
  { k: 'r', x: [27, 39], y: [10, 12.5] },
  { k: 'e', x: [27, 39], y: [12.5, 16] }, // muddy ground right after the second bridge
];
const WINDY = { x: [27, 39], y: [17.5, 29] }; // the open field by the truck: gusts are twice as strong
const TREES = [[9, 1.5], [1.5, 8], [2, 25], [6, 27.5], [22, 2.5], [24, 7], [37, 4.5], [29, 9], [28, 15.5], [20, 27.5], [37, 27.5], [19.5, 6.5]];
const SPRINKLERS = [[25.2, 13.2], [27.8, 21.5]];
// bonus flowers (each one is planted in the carried pot): most sit on the stone path,
// a few need a small detour or sit next to a hazard
const STARS = [[6.5, 4.2], [9.5, 6.5], [5, 11], [2.5, 14.5], [6, 17], [9.5, 21], [15, 23.75], [19.5, 20], [22, 16.5], [23, 13.5], [19, 11.5], [15.5, 7], [21, 2.5], [28, 4], [32, 8.5], [34, 15], [33, 19], [30, 22.5]];
let STAR_PTS = 2, FAST_PTS = 2; // per flower, per second under par — set per difficulty in init() so harder = higher ceiling
const GOAL = { x: 33.5 * T, y: 23 * T }; // behind the truck
const ROUTE = [[3, 4], [9.5, 4.2], [9.5, 8.2], [5, 8.5], [5, 12.2], [2.5, 12.2], [2.5, 17], [9.5, 17], [9.5, 23.75], [19.5, 23.75], [19.5, 16.5], [23, 16.5], [23, 11.5], [15.5, 11.5], [15.5, 4], [32, 4], [32, 15], [36, 15], [36, 19], [30, 19], [30, 25], [36, 25.5]].map(([x, y]) => [x * T + 8, y * T + 8]);
const inBox = (b, x, y) => x >= b.x[0] * T && x < b.x[1] * T && y >= b.y[0] * T && y < b.y[1] * T;
function segDist(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

class Carry extends Round {
  constructor(p) {
    super({ id: 'carry' }, p);
    const info = (tn, d) => `${d} · cầu treo ${tn[10]} ô, khe đá ${tn[11]} ô · đổ chậu −${tn[4]} điểm · về trong ${tn[0]} giây là 100 điểm · mỗi bông hoa +${String(tn[12]).replace(".", ",")}, mỗi giây sớm hơn +${tn[13]}`;
    this.diffInfo = {
      easy: info(TUNE.easy, 'chậu nghiêng chậm, gió nhẹ, cún chạy chậm'),
      normal: info(TUNE.normal, 'chậu nghiêng vừa'),
      hard: info(TUNE.hard, 'chậu nghiêng nhanh, gió mạnh, cún chạy nhanh'),
    };
    this.desc = 'Ba chị em cùng bê chậu cây to lên xe giao hàng. Đào dẫn lên/xuống, Mai dẫn trái/phải, Lan <b>giữ chậu thăng bằng</b>. Va hàng rào, bị cún xô, dính vòi tưới, giẫm vũng nước… đều làm chậu nghiêng — nghiêng quá là <b>đổ chậu</b>!';
    this.tip = 'Nhặt <b>hoa</b> dọc đường để cắm thêm vào chậu, về sớm hơn mốc còn được thưởng theo giây. Đường ngoằn ngoèo lên xuống nên <b>Đào và Mai</b> thay nhau dẫn. Giữ chấm trắng trên thước thăng bằng ở giữa. Mỗi lần đổ chậu mất khoảng 1 giây hốt đất và bị trừ điểm. Cún chạy chậm hơn nhóm, cứ đi tiếp là thoát.';
    this.scoreLabel = 'Chậu';
    this.initialScore = '🌸 0 · đổ 0';
    this.roles = [
      { act: 'Dẫn nhóm <b>lên / xuống</b>', short: 'Lên / Xuống', keys: key('↑') + key('↓') },
      { act: 'Dẫn nhóm <b>trái / phải</b>', short: 'Trái / Phải', keys: key('←') + key('→') },
      { act: 'Giữ chậu <b>thăng bằng</b>: Q kéo về trái · E kéo về phải', short: 'Cân chậu', keys: key('Q') + key('E') },
    ];
    this.roleCodes = [[...K.up, ...K.down], [...K.left, ...K.right], ['KeyQ', 'KeyE']];
    // ---- guided demo
    this.demoKeys = [[['ArrowUp', '↑'], ['ArrowDown', '↓']], [['ArrowLeft', '←'], ['ArrowRight', '→']], [['KeyQ', 'Q ↶'], ['KeyE', 'E ↷']]];
    const potF = r => () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 10, r });
    const levelF = () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 40, r: 24 });
    this.demoScript = [
      { at: 0, text: '<b>Đào</b> bấm ↑ ↓ và <b>Mai</b> bấm ← → để dẫn cả nhóm đi theo <b>đường lát đá</b>', focus: potF(36) },
      { at: 6, text: '<b>Thước thăng bằng</b> trên đầu chậu: chấm trắng lệch sang bên nào là chậu đang <b>nghiêng</b> bên đó', focus: levelF },
      { at: 11, text: 'Chậu nghiêng phải → <b>Lan</b> bấm <b>Q</b> kéo về · nghiêng trái → bấm <b>E</b>', focus: levelF },
      { at: 16, text: 'Ối, <b>Lan</b> lơ là không cân → chấm trắng trôi dần ra mép, chậu nghiêng dần…', focus: levelF },
      { at: 19, text: 'Lại còn <b>bấm nhầm phía</b> → chậu nghiêng hẳn sang một bên!', focus: levelF },
      { at: 24, text: 'Va hàng rào, cún, vòi tưới, vũng nước đều làm chậu <b>nghiêng</b> — đi khéo nhé!', focus: potF(40) },
    ];
  }
  demoCaption(t) {
    if (this.dropped) return { text: 'Chậu nghiêng quá nên <b>đổ</b>! Cả nhóm mất khoảng 1 giây hốt đất và bị <b>trừ điểm</b>', focus: () => ({ x: this.dropped.x - this.cam.x, y: this.dropped.y - this.cam.y, r: 34 }) };
    if (this.demoDropped && t < 24) return { text: 'Hốt xong đất thì cân lại và đi tiếp — lần này bấm <b>đúng phía</b> nhé!', focus: () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 40, r: 24 }) };
    return super.demoCaption(t);
  }
  // demo bot: follows the stone path and balances lazily (so the tilt is easy to see);
  // from 16s it stops balancing (then presses the wrong way) until the pot falls, to show what a drop costs
  demoStep() {
    const tgt = ROUTE[this.wp], dx = tgt[0] - this.pot.x, dy = tgt[1] - this.pot.y;
    this.vhold('ArrowRight', dx > 3); this.vhold('ArrowLeft', dx < -3);
    this.vhold('ArrowDown', dy > 3); this.vhold('ArrowUp', dy < -3);
    const p = this.tilt + 0.35 * this.tiltV;
    if (this.demo.t >= 16 && !this.demoDropped) {
      if (this.dropped) { this.demoDropped = true; this.vhold('KeyQ', false); this.vhold('KeyE', false); return; }
      const wrong = this.demo.t >= 19; // first Lan just stops balancing, then pushes the wrong way
      this.vhold('KeyQ', wrong && p < 0); this.vhold('KeyE', wrong && p >= 0);
      return;
    }
    this.vhold('KeyQ', p > 0.4); this.vhold('KeyE', p < -0.4);
  }
  init() {
    // Dễ: the pot tips slower and gentler, dogs are lazier, drops cost fewer points, a more forgiving par, wider gaps
    const tn = TUNE[game.diff];
    [PAR, SPEED, CHASE, KICK, DROP_PTS, TIP, DAMP, FIX, GUST, FALL] = tn;
    this.map = buildMap(tn[10], tn[11]);
    [STAR_PTS, FAST_PTS] = [tn[12], tn[13]];
    const sx = 3 * T + 8, sy = 4 * T + 8;
    this.girls = OFF.map(([ox, oy]) => ({ x: sx + ox, y: sy + oy, vx: 0, vy: 0 }));
    this.pot = { x: sx, y: sy }; this.dir = 'side'; this.flip = false; this.walkT = 0; this.moving = false;
    this.jolt = 0; this.drops = 0; this.dropped = null; this.safe = 0; this.wob = 0;
    this.cam = { x: 0, y: 0 }; this.parts = new Particles(); this.sweat = 0; this.done = false;
    this.demoDropped = false;
    this.stars = STARS.map(([x, y]) => ({ x: x * T + 8, y: y * T + 8, got: false })); this.starCount = 0;
    this.wp = 1; this.tilt = 0; this.tiltV = 0; this.pvx = 0; 
    this.spr = SPRINKLERS.map(([x, y], i) => ({ x: x * T, y: y * T, ang: i * 2, sp: 1.5 + i * 0.3 }));
    // each dog patrols across the path: band 1 corridor, band 2 bottom, the field below the truck
    this.dogs = [
      { x: 8 * T + 8, y: 15 * T, a: [8 * T + 8, 15.2 * T], b: [8 * T + 8, 18.6 * T], sp: 46, t: 0, cool: 0, mode: 'patrol' },
      { x: 16.5 * T, y: 19 * T, a: [16.5 * T + 8, 18.4 * T], b: [16.5 * T + 8, 28.3 * T], sp: 50, t: 0.5, cool: 0, mode: 'patrol' },
      { x: 28 * T, y: 24 * T, a: [27.6 * T, 24 * T], b: [32.6 * T, 24 * T], sp: 52, t: 0.2, cool: 0, mode: 'patrol' },
    ];
    this.cat = { x: 22.5 * T, y: 21 * T };
    this.butterflies = [0, 1, 2].map(i => ({ x: 90 + i * 200, y: 70 + i * 130, ph: i * 2 }));
    this.bg = makeCanvas(MW * T, MH * T, g => {
      grassField(MW * T, MH * T, 33, g);
      // stone path along the intended route, with a visible rope bridge crossing
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        if (this.map[y][x] !== '.') continue;
        let d = 1e9; for (let i = 0; i < ROUTE.length - 1; i++) d = Math.min(d, segDist(x * T + 8, y * T + 8, ROUTE[i], ROUTE[i + 1]));
        if (d < 13) g.drawImage(S.stoneTile, x * T, y * T);
      }
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = this.map[y][x];
      if (c === 'p') { g.fillStyle = '#7ec9ee'; g.fillRect(x * T, y * T, T, T); g.fillStyle = '#a6dcf6'; if ((x + y) % 2) g.fillRect(x * T + 3, y * T + 5, 6, 1); }
        if (c === 'f') g.drawImage(S.flowerBed, x * T, y * T);
        if (c === 's') { g.fillStyle = '#9f9ba8'; g.fillRect(x*T+2,y*T+3,12,10); g.fillStyle='#cbc7d0'; g.fillRect(x*T+4,y*T+4,7,2); }
        if (c === 'e') { g.fillStyle = '#b99a70'; g.fillRect(x*T+3,y*T+2,10,12); g.fillStyle='#e1c89f'; g.fillRect(x*T+5,y*T+4,6,7); }
        if (c === 'r') { g.fillStyle = '#7ec9ee'; g.fillRect(x*T,y*T,T,T); g.fillStyle='#5f412f'; g.fillRect(x*T+3,y*T,T-6,T); g.fillStyle='#c68b54'; for(let yy=0;yy<T;yy+=4)g.fillRect(x*T+4,y*T+yy,T-8,2); g.fillStyle='#f0c486'; g.fillRect(x*T+5,y*T+1,1,T-2); g.fillRect(x*T+T-6,y*T+1,1,T-2); }
      }
      // puddle edges
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (this.map[y][x] === 'p') { g.fillStyle = '#5fb0d9'; if (this.map[y + 1]?.[x] !== 'p') g.fillRect(x * T, y * T + T - 2, T, 2); }
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = this.map[y][x];
        if (c === '#') g.drawImage(S.hedge, x * T, y * T);
        if (c === 'F') { g.drawImage(S.fenceV, x * T + 5, y * T - 2); }
      }
      // muddy patch after the second bridge
      const mud = GATES[3]; let seed = 7; const rr = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      g.globalAlpha = 0.45; g.fillStyle = '#8a6a45'; g.fillRect(mud.x[0] * T, mud.y[0] * T, (mud.x[1] - mud.x[0]) * T, (mud.y[1] - mud.y[0]) * T);
      g.globalAlpha = 0.8; for (let i = 0; i < 60; i++) { g.fillStyle = rr() < .5 ? '#6e5236' : '#a4825a'; g.fillRect(mud.x[0] * T + rr() * (mud.x[1] - mud.x[0]) * T, mud.y[0] * T + rr() * (mud.y[1] - mud.y[0]) * T, 3 + rr() * 5, 2); }
      g.globalAlpha = 1;
      // start greenhouse + goal (the delivery truck, loaded from behind)
      drawAt(g, S.shed, 3 * T, 2.2 * T);
      g.drawImage(S.doormat, 34 * T, 23.4 * T);
      drawAt(g, S.truckSide, 36 * T, 23 * T + 2);
    });
  }
  solid(tx, ty) { const c = this.map[ty]?.[tx]; return c === undefined || c === '#' || c === 'f' || c === 'F' || c === 'X' || c === 'e'; }
  wet(x, y) { return this.map[Math.floor(y / T)]?.[Math.floor(x / T)] === 'p'; }
  collide(o) {
    const tx0 = Math.floor((o.x - R) / T), tx1 = Math.floor((o.x + R) / T), ty0 = Math.floor((o.y - R) / T), ty1 = Math.floor((o.y + R) / T);
    let hit = false;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!this.solid(tx, ty)) continue;
      const cx = clamp(o.x, tx * T, tx * T + T), cy = clamp(o.y, ty * T, ty * T + T);
      let dx = o.x - cx, dy = o.y - cy; const d = Math.hypot(dx, dy);
      if (d < R) { hit = true; if (d === 0) { dx = 0; dy = -1; } else { dx /= d; dy /= d; } o.x += dx * (R - d); o.y += dy * (R - d); const vn = o.vx * dx + o.vy * dy; if (vn < 0) { o.vx -= vn * dx; o.vy -= vn * dy; } }
    }
    for (const [tx, ty] of TREES) { const cx = tx * T + 8, cy = ty * T + 10; const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy), rr = R + 5; if (d < rr && d > 0) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); hit = true; } }
    for (const c of [this.cat, ...this.spr]) { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy), rr = R + (c === this.cat ? 6 : 4); if (d < rr && d > 0) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); hit = true; } }
    return hit;
  }
  play(dt) {
    const tt = this.t;
    this.setTimer(`${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`, tt > MAX_TIME - 20);
    if (tt >= MAX_TIME) { this.finish(false); return; }
    this.safe = Math.max(0, this.safe - dt);
    this.updateDogs(dt); this.updateSprinklers(dt, !this.dropped);
    if (this.dropped) { this.scoop(dt); this.common(dt); return; }
    // input → shared intent
    let ix = 0, iy = 0;
    if (input.down(...K.left)) ix--; if (input.down(...K.right)) ix++;
    if (input.down(...K.up)) iy--; if (input.down(...K.down)) iy++;
    const lq = input.down('KeyQ'), re = input.down('KeyE');
    if (iy) this.pulse(0); if (ix) this.pulse(1); if (lq || re) this.pulse(2);
    const len = Math.hypot(ix, iy) || 1;
    const vx = ix / len * SPEED, vy = iy / len * SPEED;
    this.moving = !!(ix || iy);
    if (ix) { this.dir = 'side'; this.flip = ix < 0; } else if (iy) this.dir = iy < 0 ? 'up' : 'down';
    if (this.moving) this.walkT += dt * 8;
    // centroid & springs
    const cx = this.girls.reduce((s, g) => s + g.x, 0) / 3, cy = this.girls.reduce((s, g) => s + g.y, 0) / 3;
    this.girls.forEach((gl, i) => {
      const sx = cx + OFF[i][0], sy = cy + OFF[i][1];
      const kx = vx + (sx - gl.x) * 7, ky = vy + (sy - gl.y) * 7;
      const tile = this.map[Math.floor(gl.y / T)]?.[Math.floor(gl.x / T)];
      // rough footing covers a band around each crossing, so skirting the gap tile itself does not avoid it
      const gate = GATES.find(z => inBox(z, gl.x, gl.y))?.k;
      const footing = gate || tile;
      const trac = this.wet(gl.x, gl.y) ? 1.6 : footing === 'r' ? 2.4 : footing === 's' ? 5 : footing === 'e' ? 7 : 16;
      gl.vx += (kx - gl.vx) * Math.min(1, trac * dt); gl.vy += (ky - gl.vy) * Math.min(1, trac * dt);
      gl.vx += (gl.push?.[0] || 0) * dt; gl.vy += (gl.push?.[1] || 0) * dt; gl.push = null;
      gl.x += gl.vx * dt; gl.y += gl.vy * dt;
      // The rope bridge has poor footing: the trio drifts and the carried pot wobbles.
      if (footing === 'r') {
        gl.vx += Math.sin(this.t * 5 + i * 2) * 32 * dt;
        this.tiltV += Math.sin(this.t * 4 + i) * 0.9 * dt;
      }
      if (footing === 's') this.tiltV += Math.sin(this.t * 8 + i * 1.7) * 2.2 * dt;
      if (footing === 'e') { gl.vx *= 0.82; gl.vy *= 0.82; this.tiltV += Math.sin(this.t * 6 + i) * 1.3 * dt; }
      // every obstacle tips the pot: a knock when someone bumps in, then a nudge while scraping along
      const hit = this.collide(gl), side = Math.sign(gl.x - cx) || (Math.random() < .5 ? -1 : 1);
      if (hit && !gl.touch && this.moving) this.kick(side * 0.75);
      if (hit && this.moving) this.tiltV += side * 1.2 * dt;
      gl.touch = hit;
      if (this.wet(gl.x, gl.y)) this.tiltV += (Math.random() - 0.5) * 7 * dt;
    });
    this.pot.x = (this.girls[0].x + this.girls[1].x + this.girls[2].x) / 3; this.pot.y = (this.girls[0].y + this.girls[1].y + this.girls[2].y) / 3;
    // balance: sideways acceleration + gusts tip the pot; Q/E push it back
    const pvx = (this.pot.x - (this.prevX ?? this.pot.x)) / dt; this.prevX = this.pot.x;
    const ax = clamp((pvx - this.pvx) / dt, -1500, 1500); this.pvx = pvx;
    const onWindyRidge = inBox(WINDY, this.pot.x, this.pot.y);
    const gust = (Math.sin(this.t * 1.7) * 0.6 + Math.sin(this.t * 3.1 + 2) * 0.4) * (this.moving ? GUST : 0.35) * Math.min(1, this.t / 4) * (onWindyRidge ? 2.1 : 1);
    if (this.safe <= 0) {
      this.tiltV += (this.tilt * TIP - ax * 0.0011 + gust) * dt;
      this.tiltV += ((re ? 1 : 0) - (lq ? 1 : 0)) * FIX * dt;
      this.tiltV *= 1 - DAMP * dt;
      this.tilt += this.tiltV * dt;
    } else { this.tilt *= 1 - 4 * dt; this.tiltV = 0; }
    if (Math.abs(this.tilt) > 0.65) this.cue(2, 60, 'tilt', 0.7);
    if (this.safe <= 0 && Math.abs(this.tilt) >= 1) this.drop();
    // bonus stars: picked up when the pot passes over them
    for (const st of this.stars) if (!st.got && Math.hypot(st.x - this.pot.x, st.y - this.pot.y) < 15) {
      st.got = true; this.starCount++; this.potPop = 0.35; A.sfx.pickup(); this.hudScore();
      this.parts.burst(st.x, st.y - 8, 10, { colors: [C.pink, C.white, C.yellow], speed: 45, g: 0 });
    }
    // route progress (for the guide arrow)
    while (this.wp < ROUTE.length - 1 && Math.hypot(ROUTE[this.wp][0] - this.pot.x, ROUTE[this.wp][1] - this.pot.y) < 24) this.wp++;
    // goal
    if (this.pot.x > GOAL.x && this.pot.y > GOAL.y) this.finish(true);
    this.common(dt);
  }
  updateDogs(dt) {
    const playing = this.state === 'play' && !this.dropped;
    for (const d of this.dogs) {
      d.cool = Math.max(0, d.cool - dt);
      let near = null, nd = 1e9;
      for (const gl of this.girls) { const dd = Math.hypot(gl.x - d.x, gl.y - d.y); if (dd < nd) { nd = dd; near = gl; } }
      if (d.mode === 'patrol') {
        if (d.cool > 0.5) continue;
        d.t += dt * d.sp / Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
        const k = (Math.sin(d.t * Math.PI - Math.PI / 2) + 1) / 2;
        const nx = d.a[0] + (d.b[0] - d.a[0]) * k, ny = d.a[1] + (d.b[1] - d.a[1]) * k;
        d.face = nx !== d.x ? (nx < d.x ? -1 : 1) : d.face || 1; d.x = nx; d.y = ny;
        if (playing && d.cool <= 0 && nd < 80) { d.mode = 'chase'; d.home = [d.x, d.y]; d.chaseT = 0; A.sfx.woof(); this.cue([0, 1], [40, 40, 40], 'dog', 2); }
      } else {
        // chase the nearest girl (a bit slower than the team), give up past the leash, then trot home
        const chase = d.mode === 'chase';
        const tx = chase ? near.x : d.home[0], ty = chase ? near.y : d.home[1];
        const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy) || 1, sp = chase ? CHASE : 60;
        d.x += dx / dist * Math.min(dist, sp * dt); d.y += dy / dist * Math.min(dist, sp * dt);
        if (Math.abs(dx) > 1) d.face = dx < 0 ? -1 : 1;
        if (chase) { d.chaseT += dt; if (!playing || Math.hypot(d.x - d.home[0], d.y - d.home[1]) > 130 || d.chaseT > 5) d.mode = 'back'; }
        else if (dist < 2) { d.mode = 'patrol'; d.cool = 1.5; }
      }
      if (!playing || d.cool > 0 || d.mode === 'back') continue;
      for (const gl of this.girls) {
        const dx = gl.x - d.x, dy = gl.y - d.y, dist = Math.hypot(dx, dy);
        if (dist < 11) {
          gl.vx += dx / (dist || 1) * 160; gl.vy += dy / (dist || 1) * 160; this.kick(Math.sign(dx || 1) * 1.1);
          d.cool = 1.5; if (d.mode === 'chase') d.mode = 'back'; A.sfx.woof(); this.toast('Gâu! Cún xô vào 🐶', 'bad'); this.cue('all', [80, 40, 80]); break;
        }
      }
    }
  }
  updateSprinklers(dt, push) {
    for (const s of this.spr) {
      s.ang += s.sp * dt;
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      if (Math.random() < 0.7) this.parts.add({ x: s.x + ca * 4, y: s.y - 4 + sa * 4, vx: ca * (70 + Math.random() * 30) + (Math.random() - .5) * 15, vy: sa * (70 + Math.random() * 30) - 10, g: 60, life: 0.55, color: Math.random() < .5 ? C.water : C.white, size: 2, drag: 0.5 });
      if (!push) continue;
      for (const gl of this.girls) {
        const dx = gl.x - s.x, dy = gl.y - s.y, d = Math.hypot(dx, dy);
        if (d > 60 || d < 1) continue;
        let da = Math.atan2(dy, dx) - s.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 0.4) { gl.push = [ca * 650, sa * 650]; this.tiltV += ca * 1.6 * dt; this.jolt = Math.max(this.jolt, 0.1); if (!this.splashT || this.t - this.splashT > 1.2) { this.splashT = this.t; A.sfx.water(); } }
      }
    }
  }
  kick(v) { if (this.safe > 0) return; this.tiltV += v * KICK; this.jolt = 0.25; A.sfx.move(); }
  drop() {
    this.cue('all', 250);
    this.drops++; this.hudScore();
    this.tilt = 0; this.tiltV = 0;
    this.dropped = { x: this.pot.x, y: this.pot.y, t: 0, dig: 0 };
    A.sfx.drop(); this.parts.burst(this.pot.x, this.pot.y, 26, { colors: [C.soil, C.soilD, C.brownL, C.pot], speed: 70, g: 160, up: 40 });
    this.toast(`Úi, đổ chậu rồi! −${DROP_PTS} điểm · Hốt đất nào…`, 'bad');
    this.girls.forEach(gl => { gl.vx = 0; gl.vy = 0; });
  }
  scoop(dt) { // automatic: the girls scoop the soil back for DROP_TIME seconds
    const d = this.dropped; d.t += dt; d.dig -= dt;
    if (d.dig <= 0) { d.dig = 0.3; A.sfx.shovel(); this.parts.burst(d.x + (Math.random() - .5) * 20, d.y + 4, 5, { colors: [C.soil, C.brownL], speed: 40, g: 150, up: 50 }); }
    if (d.t >= DROP_TIME) {
      // regroup around the drop point, keeping each girl out of walls
      this.girls.forEach((gl, i) => { const ox = gl.x, oy = gl.y; gl.x = d.x + OFF[i][0]; gl.y = d.y + OFF[i][1]; gl.touch = false; if (this.collide(gl)) { gl.x = ox; gl.y = oy; } });
      this.dropped = null; this.safe = 1.0; A.sfx.ok();
    }
  }
  hudScore() { this.setScoreText(`🌸 ${this.starCount} · đổ ${this.drops}`); }
  finish(won) {
    if (this.done) return; this.done = true;
    const t = this.t;
    let score;
    const fast = won && t < PAR ? (PAR - t) * FAST_PTS : 0;
    if (won) score = (t <= PAR ? 100 + fast : 100 - ((t - PAR) / (MAX_TIME - PAR)) * FALL) - this.drops * DROP_PTS + this.starCount * STAR_PTS;
    else { const prog = this.progress(); score = 15 * prog; }
    if (won) { cheer(10); A.sfx.fanfare(); }
    this.end(won ? 'Tới nơi rồi!' : 'Hết giờ!', { score, lines: [['Thời gian', won ? `${t.toFixed(1)} giây` : 'quá 2 phút'], ['Số lần đổ chậu', this.drops ? `${this.drops} (−${this.drops * DROP_PTS} điểm)` : '0 — tuyệt vời!'], ['Hoa cắm vào chậu', `${this.starCount}/${STARS.length} (+${Math.round(this.starCount * STAR_PTS)})`], ['Về sớm hơn mốc ' + PAR + ' giây', fast ? `+${Math.round(fast)}` : '—']] });
  }
  progress() { return (this.wp - 1) / (ROUTE.length - 1); }
  common(dt) {
    this.parts.update(dt); this.wob += dt; this.potPop = Math.max(0, (this.potPop || 0) - dt);
    const k = Math.min(1, dt * 6);
    this.cam.x += (clamp(this.pot.x - W / 2, 0, MW * T - W) - this.cam.x) * k;
    this.cam.y += (clamp(this.pot.y - H / 2 + 6, 0, MH * T - H) - this.cam.y) * k;
    this.jolt = Math.max(0, this.jolt - dt);
    if (Math.abs(this.tilt) > 0.6 && !this.dropped) { this.sweat -= dt; if (this.sweat < 0) { this.sweat = 0.25; const gl = this.girls[(Math.random() * 3) | 0]; this.parts.add({ x: gl.x + 4, y: gl.y - 22, vx: 15, vy: -20, g: 80, life: 0.5, color: C.skyL, size: 2 }); } }
  }
  idle(dt) { this.updateDogs(dt); this.updateSprinklers(dt, false); this.common(dt); }

  drawWorld(g) {
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.drawImage(this.bg, -cx, -cy);
    const items = [];
    TREES.forEach(([tx, ty]) => items.push({ y: ty * T + 14, d: () => drawAt(g, (tx + ty) % 3 ? S.tree : S.treeRound, tx * T + 8 - cx, ty * T + 16 - cy) }));
    for (const s of this.spr) items.push({ y: s.y, d: () => drawAt(g, S.sprinkler, s.x - cx, s.y + 4 - cy) });
    items.push({ y: this.cat.y, d: () => { drawAt(g, S.cat, this.cat.x - cx, this.cat.y + 5 - cy); if (((this.wob * 1.5) | 0) % 2) { g.fillStyle = C.lavD; g.fillRect(this.cat.x - cx + 3, this.cat.y - cy - 10, 3, 1); g.fillRect(this.cat.x - cx + 5, this.cat.y - cy - 9, 1, 1); g.fillRect(this.cat.x - cx + 3, this.cat.y - cy - 8, 3, 1); } } });
    for (const d of this.dogs) items.push({ y: d.y, d: () => drawAt(g, S.dog[((this.wob * 8) | 0) % 2], d.x - cx, d.y + 6 - cy, { flip: d.face < 0 }) });
    const f = this.moving ? ((this.walkT) | 0) % 4 : 0;
    this.girls.forEach((gl, i) => items.push({ y: gl.y, d: () => {
      if (this.dropped) { // everyone crouches and scoops the soil back, out of step with each other
        const ph = this.dropped.t * 9 + i * 2.1, up = Math.sin(ph) > 0;
        drawAt(g, S.girl(i, 'down', up ? 0 : 2, up), gl.x - cx, gl.y + 8 - cy - (up ? 2 : 0));
        return;
      }
      drawAt(g, S.girl(i, this.dir, f, true), gl.x - cx, gl.y + 8 - cy - (f % 2 ? 1 : 0), { flip: this.dir === 'side' && this.flip });
    } }));
    if (this.dropped) {
      const d = this.dropped;
      items.push({ y: d.y + 10, d: () => {
        drawAt(g, S.brokenPot, d.x - cx, d.y + 12 - cy);
        const w = 30; g.fillStyle = C.out; g.fillRect(d.x - cx - w / 2 - 1, d.y - cy - 34, w + 2, 6); g.fillStyle = C.white; g.fillRect(d.x - cx - w / 2, d.y - cy - 33, w, 4);
        g.fillStyle = C.mint; g.fillRect(d.x - cx - w / 2, d.y - cy - 33, Math.round(w * Math.min(1, d.t / DROP_TIME)), 4);
        g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.out; g.fillText('Hốt đất…', d.x - cx + 1, d.y - cy - 37); g.fillStyle = C.white; g.fillText('Hốt đất…', d.x - cx, d.y - cy - 38);
      } });
    } else {
      const wob = this.tilt * 0.55 + (this.jolt > 0 ? Math.sin(this.wob * 50) * this.jolt * 0.4 : 0);
      const pop = this.potPop > 0 ? 1 + Math.sin(this.potPop / 0.35 * Math.PI) * 0.18 : 1; // the pot bounces when a flower is planted
      items.push({ y: this.pot.y + 1, d: () => drawAt(g, S.potBloom(2 + this.starCount), this.pot.x - cx, this.pot.y - 6 - cy, { rot: wob, sx: pop, sy: pop }) });
    }
    for (const st of this.stars) if (!st.got) items.push({ y: st.y - 6, d: () => drawAt(g, S.sparkleFlower[((this.wob * 3 + st.x) | 0) % 2], st.x - cx, st.y - cy - 4 + Math.sin(this.wob * 4 + st.x) * 2, { ay: .5 }) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.d());
    // stability meter above the pot
    if (!this.dropped) {
      // spirit level for Lan: keep the bubble in the middle
      const lx = Math.round(this.pot.x - cx) - 20, ly = Math.round(this.pot.y - cy) - 42, b = Math.round(clamp(this.tilt, -1, 1) * 18);
      g.fillStyle = C.out; g.fillRect(lx - 1, ly - 1, 42, 6); g.fillStyle = C.mintL; g.fillRect(lx, ly, 40, 4);
      g.fillStyle = '#ffb3c4'; g.fillRect(lx, ly, 6, 4); g.fillRect(lx + 34, ly, 6, 4);
      g.fillStyle = C.outSoft; g.fillRect(lx + 19, ly, 2, 4);
      g.fillStyle = Math.abs(this.tilt) > 0.7 ? C.red : Math.abs(this.tilt) > 0.4 ? C.yellow : C.white; g.fillRect(lx + 18 + b, ly, 4, 4);
      if (this.safe > 0 && ((this.safe * 8) | 0) % 2) { g.fillStyle = '#ffffffaa'; g.fillRect(lx, ly, 40, 4); }
      if (Math.abs(this.tilt) > 0.45 && ((this.wob * 6) | 0) % 2) {
        g.font = 'bold 9px "Baloo 2", sans-serif'; g.textAlign = 'center'; const k = this.tilt > 0 ? 'Q' : 'E', kx = this.tilt > 0 ? lx - 8 : lx + 48;
        g.fillStyle = C.out; g.fillText(k, kx + 1, ly + 6); g.fillStyle = C.yellow; g.fillText(k, kx, ly + 5);
      }
    }
    for (const b of this.butterflies) { b.ph += 0.016; drawAt(g, S.butterfly[((this.wob * 8) | 0) % 2], b.x + Math.sin(b.ph * .7) * 50 - cx, b.y + Math.sin(b.ph * 1.3) * 20 - cy, { ay: .5 }); }
    this.parts.draw(g, cx, cy);
    // goal arrow when off-screen
    this.drawGoalArrow(g, cx, cy);
  }
  drawGoalArrow(g, cx, cy) {
    // follow the stone path: point toward the next route waypoint
    const p = this.pot, tgt = ROUTE[this.wp];
    const ang = Math.atan2(tgt[1] - p.y, tgt[0] - p.x);
    const ax = p.x - cx + Math.cos(ang) * 30, ay = p.y - cy - 8 + Math.sin(ang) * 22;
    const bob = Math.sin(this.wob * 6) * 2;
    g.save(); g.translate(Math.round(ax + Math.cos(ang) * bob), Math.round(ay + Math.sin(ang) * bob)); g.rotate(ang);
    g.fillStyle = C.out; g.beginPath(); g.moveTo(6, 0); g.lineTo(-3, -5); g.lineTo(-3, 5); g.closePath(); g.fill();
    g.fillStyle = C.yellow; g.beginPath(); g.moveTo(4, 0); g.lineTo(-2, -3); g.lineTo(-2, 3); g.closePath(); g.fill();
    g.restore();
  }
}

export default function () { register('carry', p => new Carry(p)); }
