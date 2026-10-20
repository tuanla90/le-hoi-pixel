// Round 4 — paint flowers onto the shop sign, in rhythm.
// One stream of flowers falls onto the palette; each girl owns one paint (Đào đỏ, Mai vàng, Lan xanh dương).
// Mixed colours need several people pressing together; long garlands need a hand-off between painters.
import { register, input, key, W, H, cheer, game, el, tune } from '../../../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { Round } from '../../../core/round.js';
import { INFO } from '../meta.js';

const SHOP_NAME = INFO.shopName;

let BPM = 112, BEAT = 60 / BPM, BAR = BEAT * 4; // tuned per difficulty in init()
const COL_X = 240, HIT_Y = 194, TOP_Y = 70, SPEED = 95; // px per second of song time
let WIN = 0.13, PERFECT = 0.065, SYNC = 0.12, WRONG = 0.5; // timing windows (seconds), points lost per wrong press
const BITS = [1, 2, 4];
const KEYS = [['KeyJ', 'KeyA'], ['KeyK', 'KeyS'], ['KeyL', 'KeyD']];
const CHIME = { 1: 72, 2: 76, 4: 79 };
const SX0 = 96, SX1 = 384, SY0 = 20, SY1 = 60;          // the sign on the canvas

const bits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
// scoring: every flower painted on the beat = 1 point; team combo milestones add a bonus (+3 at 5, 15, 25…, +6 at 10, 20, 30…)
// → a flawless 84-flower song on Thường/Thử thách scores 156, a choppy one stays near the flower count
let BIG_BONUS = 6; // bonus at every 10th combo: +6, or +7 on Thử thách so the hardest song has the highest ceiling
const comboBonus = c => (c % 10 === 0 ? BIG_BONUS : c % 5 === 0 ? 3 : 0);

function buildChart(level, demo) {
  const easy = level === 'easy', lateHints = level !== 'hard'; // Thường keeps the colour hints in the finale
  const notes = [];
  const at = (bar, beat) => bar * BAR + beat * BEAT;
  const tap = (bar, beat, mask, hint) => notes.push({ kind: 'tap', t: at(bar, beat), mask, hint, pressed: 0, ptimes: [], done: false });
  const hold = (bar, beat, segs, hint) => { // segs: [[mask, beats], ...] — the colour changes are hand-offs
    let t = at(bar, beat); const out = [];
    for (const [mask, len] of segs) { out.push({ mask, t0: t, t1: t + len * BEAT }); t += len * BEAT; }
    notes.push({ kind: 'hold', t: out[0].t0, end: t, mask: out[0].mask, segs: out, hint, pressed: 0, ptimes: [], done: false, active: false, broken: false });
  };
  const row = (bar, steps, perBeat, hint) => steps.forEach((m, i) => m && tap(bar, i / perBeat, m, hint));
  if (demo) { // a short tour for the guided demo: singles → mixes → garlands → rainbow
    row(1, [1, 0, 2, 0], 1, true); row(2, [4, 0, 1, 2], 1, true);
    row(3, [3, 0, 6, 0], 1, true); row(4, [5, 0, 7, 0], 1, true);
    hold(5, 0, [[3, 2]], true); tap(5, 3, 4, true);
    hold(6, 0, [[1, 1], [2, 1], [4, 1.5]], true);
    row(7, [6, 0, 5, 0], 1, true); tap(8, 0, 7, true);
    return notes.sort((a, b) => a.t - b.t);
  }
  // 1 · warm-up: single colours on the beat
  [[1, 0, 2, 0], [4, 0, 1, 0], [2, 0, 4, 0], [1, 2, 4, 0], [1, 0, 1, 2], [4, 0, 2, 0], [1, 2, 1, 4], [2, 4, 1, 0]].forEach((r, i) => row(1 + i, r, 1, true));
  // 2 · mixing: two paints at once, first garlands (with hint dots)
  row(9, [3, 0, 1, 2], 1, true); row(10, [6, 0, 2, 4], 1, true); row(11, [5, 0, 1, 4], 1, true);
  hold(12, 0, [[3, 2]], true); tap(12, 3, 4, true);
  row(13, [3, 1, 6, 4], 1, true); row(14, [5, 0, 3, 0], 1, true); row(15, [6, 2, 5, 1], 1, true);
  hold(16, 0, [[1, 1], [2, 1]], true); tap(16, 3, 7, true);
  // 3 · finale: eighth notes, no hints, hand-off garlands, rainbows
  if (easy) { // Dễ: the finale stays on quarter notes and keeps the colour hints
    row(17, [1, 2, 4, 2], 1, true); row(18, [3, 5, 6, 7], 1, true);
    hold(19, 0, [[1, 1], [2, 1], [4, 1.5]], true);
    row(20, [6, 1, 5, 2], 1, true); row(21, [1, 2, 4, 7], 1, true);
    hold(22, 0, [[3, 1.5], [6, 1.5]], true);
    row(23, [7, 3, 6, 5], 1, true); row(24, [1, 4, 3, 7], 1, true);
    tap(25, 0, 7, true);
    return notes.sort((a, b) => a.t - b.t);
  }
  const h = lateHints;
  row(17, [1, 2, 4, 2, 1, 2, 4, 0], 2, h);
  row(18, [3, 0, 5, 0, 6, 0, 7, 0], 2, h);
  hold(19, 0, [[1, 1], [2, 1], [4, 1.5]], h);
  row(20, [6, 1, 6, 1, 5, 2, 5, 0], 2, h);
  row(21, [1, 1, 2, 2, 4, 4, 7, 0], 2, h);
  hold(22, 0, [[3, 1.5], [6, 1.5], [5, 0.75]], h);
  row(23, [7, 0, 3, 6, 5, 0, 7, 0], 2, h);
  row(24, [1, 2, 4, 3, 6, 5, 7, 0], 2, h);
  tap(25, 0, 7, h);
  return notes.sort((a, b) => a.t - b.t);
}

// slots around the sign border where painted flowers land (filled from the middle outwards)
function signSlots() {
  const s = [];
  for (let k = 0; k < 12; k++) for (const dir of [-1, 1]) { const x = 240 + dir * (6 + k * 12); s.push([x, SY0 + 3], [x, SY1 - 3]); }
  for (const y of [SY0 + 13, SY1 - 13]) s.push([SX0 + 4, y], [SX1 - 4, y]);
  return s;
}

class Sign extends Round {
  constructor(p) {
    super({ id: 'sign' }, p);
    this.ownMusic = true; // the rhythm game plays its own song in sync with the chart
    this.diffInfo = {
      easy: 'nhạc chậm 100 BPM · bấm lệch tới ~0,18 giây vẫn tính · không có nốt nhanh · luôn có chấm gợi ý màu · bấm sai màu chỉ mất combo',
      normal: 'nhạc 106 BPM · lệch tới ~0,15 giây · đoạn cuối có nốt nhanh · vẫn có chấm gợi ý màu · bấm sai màu bị trừ 0,5 điểm',
      hard: 'nhạc nhanh 112 BPM · lệch tối đa ~0,13 giây · nốt nhanh, đoạn cuối bỏ gợi ý màu · bấm sai màu bị trừ 0,5 điểm',
    };
    this.desc = 'Cùng <b>vẽ hoa</b> trang trí biển hiệu theo nhạc! Mỗi người giữ một hũ sơn. Hoa rơi tới bảng pha màu thì ai có màu trong bông hoa phải bấm — màu pha thì <b>bấm cùng lúc</b>.';
    this.tip = 'Cam = Đỏ+Vàng · Xanh lá = Vàng+Xanh dương · Tím = Đỏ+Xanh dương · Cầu vồng = cả ba. Vòng hoa dài: giữ phím, tới chỗ đổi màu thì chuyền cho bạn.';
    this.scoreLabel = 'Điểm'; this.initialScore = '0';
    const sw = m => `<b style="color:${S.PAINTS[m].d}">${S.PAINTS[m].name}</b>`;
    this.roles = [
      { act: `Sơn ${sw(1)}`, short: 'Sơn đỏ', keys: key('J') + ' / ' + key('A') },
      { act: `Sơn ${sw(2)}`, short: 'Sơn vàng', keys: key('K') + ' / ' + key('S') },
      { act: `Sơn ${sw(4)}`, short: 'Sơn xanh dương', keys: key('L') + ' / ' + key('D') },
    ];
    this.roleCodes = KEYS;
    // ---- guided demo
    this.demoKeys = [[['KeyJ', 'J đỏ']], [['KeyK', 'K vàng']], [['KeyL', 'L xanh']]];
    this.demoSpeed = 0.75; this.demoLen = 31;
  }
  demoSetup() { this.root.appendChild(el(`<div class="paint-sign"><b>${SHOP_NAME}</b></div>`)); this.capAt = -9; this.cap = null; this.demoErrCap = null; }
  // demo bot: presses exactly on the beat and hands garlands over at each colour change —
  // except two planted mistakes (see init): a wrong colour, and a mixed flower with only one painter
  demoStep(dt) {
    const t = this.t + dt, KEY = { 1: 'KeyJ', 2: 'KeyK', 4: 'KeyL' }, pressed = new Set();
    for (const n of this.notes) {
      if (n.done || n.active || n.botted) continue;
      if (n.t > t + 0.005) continue;
      n.botted = true;
      if (n.demoErr === 'wrong') { this.vpress('KeyJ'); pressed.add(1); this.demoErrCap = { text: 'Ối, <b>Đào</b> bấm nhầm! Hoa Xanh dương là của <b>Lan</b> → <b>Sai màu</b>, mất combo và bị trừ điểm', until: this.demo.t + 2.6 }; continue; }
      if (n.demoErr === 'partial') { this.vpress('KeyK'); pressed.add(2); this.demoErrCap = { text: 'Chỉ có <b>Mai</b> bấm, <b>Lan</b> quên mất → hoa màu pha phải <b>đủ người</b> mới tính, trượt rồi!', until: this.demo.t + 2.6 }; continue; }
      BITS.forEach(b => { if (n.mask & b) { this.vpress(KEY[b]); pressed.add(b); } });
    }
    let held = 0;
    for (const n of this.notes) if (n.kind === 'hold' && n.botted && t < n.end) { const seg = n.segs.find(s => t + 0.04 < s.t1) || n.segs[n.segs.length - 1]; held |= seg.mask; }
    BITS.forEach(b => {
      if ((held & b) && !(this.dHeld & b) && !pressed.has(b)) this.vpress(KEY[b]); // take over the garland
      if (held & b) this.vhold(KEY[b], true); else if (!pressed.has(b)) this.vhold(KEY[b], false);
    });
    this.dHeld = held;
  }
  // captions follow the next flower: who has to press, and why
  demoCaption() {
    const GIRL = { 1: ['Đào', 'J'], 2: ['Mai', 'K'], 4: ['Lan', 'L'] }, P = S.PAINTS;
    const who = m => BITS.filter(b => m & b).map(b => `<b>${GIRL[b][0]}</b>`).join(m === 7 ? ', ' : ' và ');
    const palette = { x: COL_X, y: HIT_Y, r: 22 };
    if (this.demoErrCap && this.demo.t < this.demoErrCap.until) return { text: this.demoErrCap.text, focus: () => palette };
    let text, focus;
    const act = this.notes.find(n => n.active && !n.broken), nx = this.notes.find(n => !n.done && !n.active);
    if (act) {
      text = act.segs.length > 1 ? `Vòng hoa đổi màu: giữ phím, tới vạch thì <b>chuyền</b> cho bạn (${act.segs.map(s => GIRL[s.mask] ? GIRL[s.mask][0] : P[s.mask].name).join(' → ')})`
        : `Vòng hoa <b>${P[act.mask].name}</b>: ${who(act.mask)} <b>giữ phím</b> tới hết dây`;
      focus = { x: COL_X, y: Math.max(TOP_Y + 10, (HIT_Y + this.ny(act.end)) / 2), r: 40 };
    } else if (nx && nx.t - this.t < 2.2) {
      const m = nx.mask, name = P[m].name, garland = nx.kind === 'hold' ? 'Vòng hoa' : 'Hoa';
      if (m === 7) text = `Hoa <b>Cầu vồng</b> → cả ba ${who(7)} cùng bấm!`;
      else if (bits(m) > 1) text = `${garland} <b>${name}</b> = ${BITS.filter(b => m & b).map(b => P[b].name).join(' + ')} → ${who(m)} bấm <b>cùng lúc</b>`;
      else text = `${garland} <b>${name}</b> → chỉ ${who(m)} bấm <b>${GIRL[m][1]}</b>`;
      focus = nx.t - this.t < 0.5 ? palette : { x: COL_X, y: clamp(this.ny(nx.t), TOP_Y, HIT_Y), r: 18 };
    } else {
      text = 'Hoa rơi xuống <b>bảng pha màu</b>. Mỗi người một màu: <b>Đào</b> Đỏ (J) · <b>Mai</b> Vàng (K) · <b>Lan</b> Xanh dương (L)';
      focus = palette;
    }
    // keep each caption on screen long enough to read
    const now = this.demo.t;
    if (this.cap && text !== this.cap.text && now - this.capAt < 0.9) return { text: this.cap.text, focus: () => this.cap.focus };
    if (!this.cap || text !== this.cap.text) { this.cap = { text }; this.capAt = now; }
    this.cap.focus = focus;
    return { text, focus: () => focus };
  }
  init() {
    // Dễ: slow song, wide windows, no eighth notes · Thường: in between, keeps hints · Thử thách: fast, tight, no hints
    BPM = tune(100, 106, 112); BIG_BONUS = tune(6, 6, 7); BEAT = 60 / BPM; BAR = BEAT * 4;
    [WIN, PERFECT, SYNC, WRONG] = tune([0.18, 0.09, 0.18, 0], [0.155, 0.075, 0.15, 0.5], [0.13, 0.065, 0.12, 0.5]); // a wrong press always breaks the combo; on Thường/Thử thách it also costs points, so tapping every flower without reading its colour does not pay
    this.notes = buildChart(game.diff, !!this.demo);
    if (this.demo) { // planted mistakes for the demo: a wrong colour (bar 2) and a missing partner (bar 7)
      const at = b => this.notes.find(n => Math.abs(n.t - b * BAR) < 1e-6);
      if (at(2)) at(2).demoErr = 'wrong'; if (at(7)) at(7).demoErr = 'partial';
    }
    this.lastT = Math.max(...this.notes.map(n => n.end || n.t));
    this.done = false; this.points = 0; this.bonus = 0; this.penalty = 0; this.wrongs = 0; this.combo = 0; this.bestCombo = 0;
    this.hits = 0; this.perfects = 0; this.holdsOK = 0; this.holds = this.notes.filter(n => n.kind === 'hold').length;
    this.step = 0; this.down = 0; this.dHeld = 0; this.glow = [0, 0, 0]; this.judge = null; this.shake = 0;
    this.slots = signSlots(); this.slotI = 0; this.painted = []; this.flying = [];
    this.parts = new Particles(); this.anim = 0;
    this.bg = makeCanvas(W, H, g => {
      for (let x = 0; x < W; x += 12) { g.fillStyle = (x / 12) % 2 ? '#ffe3ec' : '#fff1f5'; g.fillRect(x, 0, 12, 176); }
      g.fillStyle = '#ffd0de'; for (let x = 6; x < W; x += 24) for (let y = 10; y < 170; y += 22) { g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
      g.fillStyle = C.lav; g.fillRect(0, 150, W, 26); g.fillStyle = C.lavD; g.fillRect(0, 150, W, 2); g.fillRect(0, 174, W, 2);
      for (let x = 0; x < W; x += 30) { g.fillStyle = '#c9b2f2'; g.fillRect(x + 4, 156, 22, 14); }
      for (let y = 176; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#c48a5a' : '#b97e4f'; g.fillRect(0, y, W, 8); g.fillStyle = C.brown; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
      // the falling lane: a soft paper strip
      g.fillStyle = '#ffffffaa'; g.fillRect(COL_X - 14, TOP_Y - 6, 28, HIT_Y - TOP_Y + 6);
      g.fillStyle = '#f0c9d6'; g.fillRect(COL_X - 14, TOP_Y - 6, 1, HIT_Y - TOP_Y + 6); g.fillRect(COL_X + 13, TOP_Y - 6, 1, HIT_Y - TOP_Y + 6);
      for (let y = TOP_Y; y < HIT_Y; y += 8) { g.fillStyle = '#f6dbe4'; g.fillRect(COL_X - 1, y, 2, 4); }
      // side panels
      [[12, 70, 124, 120], [346, 70, 122, 120]].forEach(([x, y, w, h]) => { g.fillStyle = C.out; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = C.cream; g.fillRect(x, y, w, h); g.fillStyle = C.pinkL; g.fillRect(x, y, w, 2); });
    });
  }
  beginCount() {
    super.beginCount();
    const nm = el(`<div class="paint-sign"><b>${SHOP_NAME}</b></div>`);
    this.root.appendChild(nm); this.$sign = nm;
  }

  // ------------------------------------------------ music: our own little sequencer, locked to song time
  music() {
    const PROG = [[48, [60, 64, 67]], [45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]]];
    if (this.demo) return; // the demo runs slowed down, so it plays without the soundtrack
    const endBar = Math.ceil(this.lastT / BAR) + 1;
    while (this.step * BEAT / 2 < this.t + 0.15) {
      const st = this.step * BEAT / 2, d = st - this.t, s8 = this.step % 8, bar = Math.floor(this.step / 8);
      this.step++;
      if (d < -0.03 || bar > endBar) continue;
      const [root, ch] = PROG[bar % 4];
      if (bar === endBar) { if (s8 === 0) ch.forEach((n, i) => A.tone(A.N(n + 12), 1.2, { type: 'triangle', vol: 0.12, delay: d + i * 0.04 })); continue; }
      if (s8 % 2 === 0) A.tone(110, 0.12, { type: 'sine', vol: 0.35, slide: -60, delay: d });
      if (s8 === 2 || s8 === 6) A.noise(0.1, { freq: 2500, vol: 0.1, delay: d });
      if (s8 % 2 === 1) A.noise(0.03, { freq: 9000, vol: 0.05, delay: d });
      if (bar === 0) { if (s8 % 2 === 0) A.tone(1500, 0.04, { type: 'square', vol: 0.06, delay: d }); continue; }
      if (s8 === 0 || s8 === 4) A.tone(A.N(root), BEAT * 1.7, { type: 'triangle', vol: 0.22, delay: d });
      A.tone(A.N(ch[[0, 1, 2, 1][s8 % 4]] + 12), BEAT * 0.45, { type: 'square', vol: 0.035, delay: d });
    }
  }

  // ------------------------------------------------ gameplay
  play(dt) {
    const t = this.t;
    this.music();
    const left = Math.max(0, this.lastT + 1 - t);
    this.setTimer(String(Math.ceil(left)), left < 8);
    let down = 0;
    BITS.forEach((b, i) => { if (input.down(...KEYS[i])) down |= b; });
    this.down = down;
    BITS.forEach((b, i) => {
      if (!input.hit(...KEYS[i])) return;
      this.pulse(i); this.glow[i] = 0.2;
      // judge at the moment the key was pressed (keyboard event or phone timestamp), not when this frame runs
      const w = input.hitTime(...KEYS[i]);
      this.press(b, w == null ? t : clamp(t - (game.frameWall - w) / 1000, t - 0.25, t));
    });
    for (const n of this.notes) {
      if (n.done) continue;
      if (n.active) this.sustain(n, t, dt);
      else if (t > n.t + WIN) this.miss(n, n.pressed ? 'Thiếu người!' : 'Trượt rồi!');
    }
    if (t > this.lastT + 1.2) this.finish();
    this.common(dt);
  }
  press(bit, t) {
    A.tone(A.N(CHIME[bit]), 0.25, { type: 'triangle', vol: 0.18 });
    const i = BITS.indexOf(bit), gx = [168, 240, 312][i];
    this.parts.burst(gx, 212, 6, { colors: [S.PAINTS[bit].c, C.white], speed: 40, g: 80, up: 40 });
    // joining (or taking over) a garland that is already being painted is always fine
    const h = this.notes.find(n => n.active && !n.broken && t <= n.end + 0.05);
    if (h && h.segs.some(s => (s.mask & bit) && t >= s.t0 - 0.25 && t <= s.t1)) return;
    let best = null, bd = 1e9;
    for (const n of this.notes) {
      if (n.done || n.active || !(n.mask & bit) || (n.pressed & bit)) continue;
      const d = Math.abs(n.t - t); if (d <= WIN && d < bd) { bd = d; best = n; }
    }
    if (!best) { this.wrong(bit); return; }
    best.pressed |= bit; best.ptimes.push(t);
    if (best.pressed === best.mask) this.hit(best, t);
  }
  hit(n, t) {
    const w = bits(n.mask);
    const spread = Math.max(...n.ptimes) - Math.min(...n.ptimes), dev = Math.max(...n.ptimes.map(p => Math.abs(p - n.t)));
    if (spread > SYNC) { this.breakCombo(); this.say('Chưa đều tay!', C.orange); } // a mixed flower only counts when everyone presses together
    else {
      const perfect = dev <= PERFECT;
      this.points += 1; this.hits++; if (perfect) this.perfects++;
      this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const b = comboBonus(this.combo);
      if (b) { this.points += b; this.bonus += b; }
      this.setScoreText(this.pointsNow());
      this.say(perfect ? 'Hoàn hảo!' : 'Tốt!', perfect ? C.yellow : C.white);
      if (b) { cheer(b > 3 ? 3 : 1); this.toast(`Combo ${this.combo}! +${b} điểm 🌸`, 'good'); if (b > 3) A.sfx.great(); }
      if (n.mask === 7) { cheer(2); this.parts.burst(COL_X, HIT_Y, 18, { colors: ['#ff5a6e', '#ffd23f', '#4aa3ff', '#5fd36a', '#a46cf0'], speed: 80, g: 20 }); }
    }
    this.paint(n.mask);
    if (n.kind === 'hold') { n.active = true; n.activeAt = t; } else n.done = true;
  }
  sustain(n, t, dt) {
    if (t >= n.end) {
      n.active = false; n.done = true;
      if (!n.broken) { this.holdsOK++; this.say('Vòng hoa trọn vẹn!', C.mint); A.sfx.great(); this.paint(n.segs[n.segs.length - 1].mask); }
      return;
    }
    if (n.broken) return;
    const si = n.segs.findIndex(s => t < s.t1), seg = n.segs[Math.max(0, si)], prev = n.segs[si - 1], next = n.segs[si + 1];
    if (next && next.t0 - t < 0.5) this.cue(BITS.map((b, i) => (next.mask & b) && !(seg.mask & b) ? i : -1).filter(i => i >= 0), 60, 'hand' + n.t + '_' + si, 99);
    // around a colour change both the old and the new painter may hold (or one may already have let go)
    const nearNext = next && next.t0 - t < 0.15, justAfter = prev && t - seg.t0 < 0.2, starting = t - n.activeAt < 0.1;
    const allowed = seg.mask | (nearNext ? next.mask : 0) | (justAfter ? prev.mask : 0);
    const have = m => (this.down & m) === m;
    const ok = (starting || justAfter || have(seg.mask) || (nearNext && have(next.mask))) && (this.down & ~allowed & 7) === 0;
    if (ok) { if (Math.random() < dt * 8) this.parts.burst(COL_X, HIT_Y - 4, 2, { colors: [S.PAINTS[seg.mask].c], speed: 30, g: 0 }); }
    else { n.broken = true; this.breakCombo(); this.say('Đứt vòng hoa!', C.pinkL); A.sfx.wilt(); }
  }
  miss(n, msg) {
    n.done = true; if (n.kind === 'hold') n.broken = true;
    this.breakCombo(); this.say(msg, C.pinkL);
  }
  wrong(bit) { this.cue(BITS.indexOf(bit), 120); this.wrongs++; this.penalty += WRONG; this.setScoreText(this.pointsNow()); this.breakCombo(); this.say('Sai màu!', C.pinkL); A.sfx.bad(); }
  breakCombo() {
    if (this.combo >= 5) { this.shake = 0.3; this.$sign?.classList.remove('wobble'); void this.$sign?.offsetWidth; this.$sign?.classList.add('wobble'); }
    this.combo = 0;
  }
  say(text, color) { this.judge = { text, color, t: 0 }; }
  paint(mask) {
    const slot = this.slots[this.slotI % this.slots.length], jitter = Math.floor(this.slotI / this.slots.length) * 3; this.slotI++;
    this.flying.push({ mask, x0: COL_X, y0: HIT_Y, x1: slot[0] + jitter, y1: slot[1] - jitter * 0.5, t: 0 });
  }
  finish() {
    if (this.done) return; this.done = true;
    const score = this.pointsNow();
    const taps = this.notes.length;
    this.end('Biển hiệu xong!', {
      score,
      lines: [['Hoa vẽ đúng nhịp (1 điểm/bông)', `${this.hits}/${taps}`], ['Thưởng mốc combo', `+${this.bonus}`], ['Combo cao nhất', `${this.bestCombo}`], ['Vòng hoa giữ trọn', `${this.holdsOK}/${this.holds}`], ['Bấm sai màu', this.wrongs ? `${this.wrongs} lần${this.penalty ? ` (−${Math.round(this.penalty)} điểm)` : ' (mất combo)'}` : '0 — chuẩn!']],
      extra: `<div class="signpreview"><b>${SHOP_NAME}</b></div>`,
    });
  }
  common(dt) {
    this.anim += dt; this.parts.update(dt); this.shake = Math.max(0, this.shake - dt);
    for (let i = 0; i < 3; i++) this.glow[i] = Math.max(0, this.glow[i] - dt);
    if (this.judge) { this.judge.t += dt; if (this.judge.t > 0.6) this.judge = null; }
    for (const f of this.flying) { f.t += dt; if (f.t >= 0.45 && !f.landed) { f.landed = true; this.painted.push(f); this.parts.burst(f.x1, f.y1, 4, { colors: [S.PAINTS[f.mask].c, C.white], speed: 25, g: 0 }); } }
    this.flying = this.flying.filter(f => !f.landed);
  }
  idle(dt) { this.common(dt); }

  // ------------------------------------------------ drawing
  ny(t) { return HIT_Y - (t - this.t) * SPEED; }
  drawWorld(g) {
    g.drawImage(this.bg, 0, 0);
    const T = this.anim, sh = this.shake > 0 ? Math.round(Math.sin(this.shake * 60) * 2) : 0;
    // sign board
    g.fillStyle = C.brownD; g.fillRect(SX0 - 3 + sh, SY0 - 3, SX1 - SX0 + 6, SY1 - SY0 + 6);
    g.fillStyle = C.brownL; g.fillRect(SX0 - 1 + sh, SY0 - 1, SX1 - SX0 + 2, SY1 - SY0 + 2);
    g.fillStyle = C.white; g.fillRect(SX0 + 1 + sh, SY0 + 1, SX1 - SX0 - 2, SY1 - SY0 - 2);
    for (const f of this.painted) drawAt(g, S.paintFlower(f.mask, 9), f.x1 + sh, f.y1, { ay: .5 });
    // mixing legend (left) and combo (right)
    this.drawLegend(g);
    this.drawCombo(g);
    // falling flowers & garlands
    g.save(); g.beginPath(); g.rect(COL_X - 30, TOP_Y - 8, 60, HIT_Y - TOP_Y + 24); g.clip();
    for (const n of this.notes) {
      if (n.kind === 'hold') { this.drawGarland(g, n); continue; }
      if (n.done) continue;
      const y = this.ny(n.t); if (y < TOP_Y - 20 || y > HIT_Y + 20) continue;
      this.drawFlower(g, n.mask, y, n.hint, n.pressed);
    }
    g.restore();
    // palette (hit zone)
    this.drawPalette(g);
    // painters
    [[168, 0], [240, 1], [312, 2]].forEach(([x, i]) => {
      const on = this.glow[i] > 0 || (this.down & BITS[i]), hop = this.glow[i] > 0 ? Math.round(Math.sin(this.glow[i] / 0.2 * Math.PI) * 3) : 0;
      if (on) { g.globalAlpha = 0.35; g.fillStyle = S.PAINTS[BITS[i]].c; g.beginPath(); g.ellipse(x, 237, 14, 4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      drawAt(g, S.paintBucket[BITS[i]], x + (i === 1 ? 18 : i === 0 ? -16 : 16), 238);
      drawAt(g, S.girl(i, 'up', on ? 1 : 0, !!on), x, 238 - hop);
    });
    // flowers flying up to the sign
    for (const f of this.flying) {
      const k = Math.min(1, f.t / 0.45), e = 1 - Math.pow(1 - k, 3);
      drawAt(g, S.paintFlower(f.mask, k < 0.6 ? 15 : 9), f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 30, { ay: .5 });
    }
    this.parts.draw(g);
    // judgement text
    if (this.judge) {
      const k = this.judge.t / 0.6; g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'left';
      const x = COL_X + 32, y = HIT_Y - 18 - k * 6;
      g.fillStyle = C.out; g.fillText(this.judge.text, x + 1, y + 1); g.fillStyle = this.judge.color; g.fillText(this.judge.text, x, y);
    }
  }
  drawFlower(g, mask, y, hint, pressed) {
    const img = S.paintFlower(mask, 15);
    drawAt(g, img, COL_X, y, { ay: .5 });
    if (hint && bits(mask) > 1) {
      const comps = BITS.filter(b => mask & b), w = comps.length * 5;
      comps.forEach((b, i) => { const x = COL_X - w / 2 + i * 5 + 2, yy = Math.round(y) + 9; g.fillStyle = C.out; g.fillRect(x - 1, yy - 1, 4, 4); g.fillStyle = S.PAINTS[b].c; g.fillRect(x, yy, 2, 2); if (pressed & b) { g.fillStyle = C.white; g.fillRect(x, yy, 1, 1); } });
    }
  }
  drawGarland(g, n) {
    if (n.done && !n.active) return;
    const yTop = this.ny(n.end), yBot = n.active ? HIT_Y : this.ny(n.t);
    if (yBot < TOP_Y - 20 || yTop > HIT_Y + 20) return;
    g.fillStyle = n.broken ? C.grayD : C.greenD; g.fillRect(COL_X - 1, Math.round(yTop), 3, Math.round(yBot - yTop));
    for (let y = yBot; y >= yTop; y -= 9) {
      const tt = this.t + (HIT_Y - y) / SPEED, seg = n.segs.find(s => tt < s.t1) || n.segs[n.segs.length - 1];
      if (n.broken) { g.fillStyle = C.gray; g.fillRect(COL_X - 2, Math.round(y) - 1, 4, 3); continue; }
      drawAt(g, S.paintFlower(seg.mask, 9), COL_X + (Math.round(y / 9) % 2 ? -4 : 4), y, { ay: .5 });
    }
    // hand-off markers: a little arrow where the colour changes
    if (!n.broken) for (let i = 1; i < n.segs.length; i++) {
      const y = Math.round(this.ny(n.segs[i].t0)); if (y > HIT_Y || y < TOP_Y - 10) continue;
      g.fillStyle = C.out; g.fillRect(COL_X - 16, y - 1, 32, 3); g.fillStyle = S.PAINTS[n.segs[i].mask].c; g.fillRect(COL_X - 15, y, 30, 1);
    }
    if (!n.active) this.drawFlower(g, n.mask, this.ny(n.t), n.hint, n.pressed);
  }
  drawPalette(g) {
    const x = COL_X, y = HIT_Y + 4;
    g.fillStyle = C.out; g.beginPath(); g.ellipse(x, y, 30, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e6b97a'; g.beginPath(); g.ellipse(x, y, 29, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d59f5f'; g.beginPath(); g.ellipse(x + 20, y + 3, 4, 3, 0, 0, Math.PI * 2); g.fill();
    BITS.forEach((b, i) => {
      const bx = x - 18 + i * 9, by = y + 5, on = this.down & b;
      g.fillStyle = S.PAINTS[b].d; g.fillRect(bx - 3, by - 2, 6, 4); g.fillStyle = S.PAINTS[b].c; g.fillRect(bx - 2, by - 2, on ? 5 : 4, 3);
      if (on) { g.fillStyle = C.white; g.fillRect(bx - 1, by - 2, 1, 1); }
    });
    // target ring shows the colour the team is mixing right now
    const mix = this.down && S.PAINTS[this.down];
    g.strokeStyle = C.out; g.lineWidth = 2; g.beginPath(); g.arc(x, HIT_Y, 10, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = mix ? mix.c : '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(x, HIT_Y, 10, 0, Math.PI * 2); g.stroke();
    if (mix) { g.globalAlpha = 0.45; g.fillStyle = mix.c; g.beginPath(); g.arc(x, HIT_Y, 9, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
  drawLegend(g) {
    g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'left'; g.fillStyle = C.pinkD; g.fillText('Bảng pha màu', 18, 84);
    const rows = [[[1, 2], 3], [[2, 4], 6], [[1, 4], 5], [[1, 2, 4], 7]];
    rows.forEach(([parts, res], r) => {
      const y = 100 + r * 22; let x = 22;
      parts.forEach((b, i) => { drawAt(g, S.paintFlower(b, 9), x, y, { ay: .5 }); x += 9; if (i < parts.length - 1) { g.fillStyle = C.out; g.fillText('+', x - 3, y + 3); x += 6; } });
      g.fillStyle = C.out; g.fillText('=', x - 1, y + 3); x += 10;
      drawAt(g, S.paintFlower(res, 13), x, y, { ay: .5 });
      g.fillStyle = res === 7 ? C.lavD : S.PAINTS[res].d; g.fillText(S.PAINTS[res].name, x + 9, y + 3);
    });
  }
  drawCombo(g) {
    g.textAlign = 'center'; g.font = 'bold 8px "Baloo 2", sans-serif'; g.fillStyle = C.pinkD; g.fillText('Combo cả đội', 407, 84);
    const pulse = this.combo > 0 ? 1 + Math.max(0, 0.15 - (this.anim % 0.5)) : 1;
    g.font = `${Math.round(30 * pulse)}px "VT323", monospace`; g.fillStyle = C.out; g.fillText(String(this.combo), 393, 121); g.fillStyle = this.combo >= 10 ? C.pinkD : C.lavD; g.fillText(String(this.combo), 392, 120);
    // next combo milestone as a little badge
    const next = (Math.floor(this.combo / 5) + 1) * 5, mx = 428, my = 105;
    g.fillStyle = C.out; g.fillRect(mx - 15, my - 9, 30, 15); g.fillStyle = comboBonus(next) > 3 ? C.yellow : C.pinkL; g.fillRect(mx - 14, my - 8, 28, 13);
    g.font = '13px "VT323", monospace'; g.fillStyle = C.out; g.fillText(`+${comboBonus(next)}`, mx, my + 3);
    g.font = 'bold 6px "Baloo 2", sans-serif'; g.fillStyle = C.out; g.fillText(`khi combo đạt ${next}`, 407, 131);
    const acc = Math.round(100 * this.hits / Math.max(1, this.seenCount()));
    g.font = 'bold 8px "Baloo 2", sans-serif'; g.fillStyle = C.out; g.fillText(`Chính xác ${clamp(acc, 0, 100)}%`, 407, 142);
    g.fillText(`Hoa đã vẽ: ${this.painted.length}`, 407, 158);
    const prog = clamp(this.t / (this.lastT + 1), 0, 1);
    g.fillStyle = C.out; g.fillRect(358, 168, 98, 6); g.fillStyle = C.white; g.fillRect(359, 169, 96, 4); g.fillStyle = C.pink; g.fillRect(359, 169, Math.round(96 * prog), 4);
  }
  pointsNow() { return Math.max(0, Math.round(this.points - this.penalty)); }
  seenCount() { let c = 0; for (const n of this.notes) { if (n.t > this.t - WIN) break; c++; } return c; } // flowers already due
}

export default function () { register('sign', p => new Sign(p)); }
