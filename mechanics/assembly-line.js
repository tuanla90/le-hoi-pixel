// Mechanic: a three-person assembly line serving a queue of customers (20/10 round 5 "Ngày khai trương").
// The rules live here; a theme dresses them with a skin (names, texts, art) — see themes/20-10/scenes/shop.js.
//
// Customers queue at the counter, each with an order: 2–4 parts (three kinds) plus one or more of three extras.
// Role 2 is the runner who moves every order along: customer → role 0's bench → role 1's table → back to the customer.
// Role 0 adds the parts the order lists, role 1 adds exactly the extras it asks for. Nobody can complete an order alone.
// A wrong or useless press (no work at that station, an extra already added, two buttons at once) is a slip: that role
// freezes for 1–2 s. Time is the only cost — no points are taken.
//
// skin = {
//   id                      scene id (also the round id in the theme)
//   parts[3]                { name, emoji, color }: what role 0 adds (an order lists parts by index 0–2)
//   extras[3]               { id, name, emoji, sfx? }: what role 1 adds when the order asks for it
//   text                    every player-facing string (see the 20/10 skin; anything in DEFAULT_TEXT is optional)
//   demoScript              [{ at, text, focus: 'queue' | 'rail' | 'maker' | 'pass' | 'finisher' | 'runner' }]
//   art: {
//     background(g)         the static room: wall, door, ticket rail, floor, the three stations (use LAYOUT)
//     counter(g)            the counter drawn over the waiting customers' legs
//     part(g, i, x, y, size, alpha)            one part icon, bottom-centred at (x, y)
//     extra(g, i, cx, cy, scale, alpha)        one extra icon, centred
//     product(g, x, y, parts, done, scale)     the order in progress (done: { extraId: true })
//     customer(look, frame)                    sprite of customer look 0–2
//     hint                                     colour of the hint over an empty ticket rail (optional; for dark rooms)
//   }
// }
import { input, key, W, H, cheer, game } from '../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { heart } from '../core/ui-sprites.js';
import { theme } from '../core/theme.js';

const DURATION = 75;
const KEYS = {
  part: [['Digit1', 'Numpad1'], ['Digit2', 'Numpad2'], ['Digit3', 'Numpad3']],
  extra: [['KeyQ'], ['KeyW'], ['KeyE']],
  take: ['ArrowUp'], pass: ['ArrowRight'], give: ['ArrowDown'],
};
// where things stand on screen; a skin's background is painted around these
export const LAYOUT = {
  SLOTS: [262, 312, 362, 412], CUST_Y: 122, DOOR_X: 492,
  STATION: [120, 240, 380], // where each role works (x): maker · finisher · runner
};
const { SLOTS, CUST_Y, DOOR_X, STATION } = LAYOUT;
const MAX_TICKETS = 3;
const WALK = 175;        // px/s customers walk in and out (door → counter in about 1.3 s)
const OPENING = [0, 0.7]; // the first two customers are already at the door when the shop opens
const ORDER = 10, TIP = 5, LEAVE = 5; // points: per order handed over, max tip for a quick one, a customer walking out
// gap: seconds between customers (start → end) · patience: how long a customer waits · stems: parts per order
// extra: chance each extra is on an order (at least one always is) · stun: freeze after a mistake · div: points per round point
const TUNE = {
  easy: { gap: 3.8, gapEnd: 3, patience: 38, stems: [2, 2], extra: 0.7, stun: 1, div: 2.2 },
  normal: { gap: 3.7, gapEnd: 2.8, patience: 34, stems: [2, 3], extra: 0.8, stun: 1.5, div: 2.4 },
  hard: { gap: 3, gapEnd: 2.3, patience: 28, stems: [2, 4], extra: 0.85, stun: 2, div: 3 },
};
const num = v => String(v).replace('.', ',');
// texts a skin may leave out (they name no festival)
const DEFAULT_TEXT = {
  scoreLabel: 'Khách',
  mash: 'Bấm từng nút thôi!',
  stun: s => `Khựng ${s}s!`,
  firstSlip: s => `Bấm sai hoặc bấm bừa: người đó khựng tay ${s} giây!`,
  taken: '✓ đã nhận',
  wrongs: 'Bấm nhầm / bấm bừa', wrongsNone: '0 — chuẩn!', leftNone: '0 — tuyệt vời!',
};

export class AssemblyLine extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const T = this.skin = { ...skin, text: { ...DEFAULT_TEXT, ...skin.text } }, X = T.text;
    this.diffInfo = { easy: X.diffInfo(TUNE.easy, num), normal: X.diffInfo(TUNE.normal, num), hard: X.diffInfo(TUNE.hard, num) };
    this.desc = X.desc;
    this.tip = X.tip(MAX_TICKETS);
    this.scoreLabel = X.scoreLabel;
    this.initialScore = X.hud(0, 0, 0);
    const keys = [key('1') + key('2') + key('3'), key('Q') + key('W') + key('E'), key('↑') + key('→') + key('↓')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = [KEYS.part.flat(), KEYS.extra.flat(), [...KEYS.take, ...KEYS.pass, ...KEYS.give]];
    // ---- guided demo
    this.demoKeys = [
      T.parts.map((pt, i) => [KEYS.part[i][0], `${i + 1} ${pt.emoji}`]),
      T.extras.map((ex, i) => [KEYS.extra[i][0], `${'QWE'[i]} ${ex.emoji}`]),
      [KEYS.take, KEYS.pass, KEYS.give].map((k, i) => [k[0], X.runnerKeys[i]]),
    ];
    this.demoSpeed = 0.7;
    const st = x => () => ({ x, y: 196, r: 36 });
    const FOCUS = { queue: () => ({ x: 337, y: 92, r: 60 }), rail: () => ({ x: 112, y: 62, r: 56 }), maker: st(STATION[0]), pass: st((STATION[0] + STATION[1]) / 2), finisher: st(STATION[1]), runner: st(STATION[2]) };
    this.demoScript = T.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
  }
  demoCaption(t) {
    if (this.demoErr && this.demo.t < this.demoErr) return { text: this.skin.text.demoSlip, focus: () => ({ x: STATION[1], y: 190, r: 36 }) };
    return super.demoCaption(t);
  }
  // demo bot: one action per role every ~0.5 s; the finisher slips once (an extra the order did not ask for) so viewers see the penalty
  demoStep(dt) {
    const cd = this.dcd || (this.dcd = [0.6, 0.6, 0.6]);
    for (let i = 0; i < 3; i++) cd[i] -= dt;
    if (cd[2] <= 0) {
      cd[2] = 0.5;
      if (this.tickets.some(k => k.stage === 'ready')) this.vpress(KEYS.give[0]);
      else if (this.tickets.some(k => k.stage === 'built')) this.vpress(KEYS.pass[0]);
      else if (this.nextCustomer() && this.tickets.length < 2) this.vpress(KEYS.take[0]);
      else cd[2] = 0.2;
    }
    const build = this.tickets.find(k => k.stage === 'build');
    if (cd[0] <= 0 && build) { cd[0] = 0.55; this.vpress(KEYS.part[this.missing(build)[0]][0]); }
    const fin = this.tickets.find(k => k.stage === 'finish');
    if (cd[1] <= 0 && fin) {
      cd[1] = 0.6;
      // the planted slip: an extra the order did not ask for, or one already added
      const ids = this.skin.extras.map(e => e.id), todo = ids.filter(x => fin.order.extras[x] && !fin.done[x]);
      const skip = ids.find(x => !fin.order.extras[x]) || ids.find(x => fin.done[x]);
      if (this.demo.t > 14 && !this.demoSlipped && skip) { this.demoSlipped = true; this.demoErr = this.demo.t + 3; this.vpress(KEYS.extra[ids.indexOf(skip)][0]); }
      else if (todo.length) this.vpress(KEYS.extra[ids.indexOf(todo[0])][0]);
    }
  }
  init() {
    this.E = TUNE[game.diff];
    this.slots = [null, null, null, null]; this.walkers = []; this.tickets = [];
    this.spawnT = OPENING[0]; this.opening = 1; this.points = 0; this.served = 0; this.left = 0; this.tips = 0; this.wrongs = 0; this.nextId = 1;
    this.stun = [0, 0, 0]; this.hops = [0, 0, 0]; this.flash = [0, 0, 0]; this.lastSec = DURATION; this.done = false;
    this.fx = new Particles(); this.floats = []; this.anim = 0;
    this.dcd = null; this.demoSlipped = false; this.demoErr = 0;
    this.seed = 1234 + (game.diff === 'hard' ? 7 : game.diff === 'easy' ? 3 : 0); // same customers every try, so tries are comparable
    this.bg = makeCanvas(W, H, g => this.skin.art.background(g));
  }

  rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  makeOrder() {
    const E = this.E, ids = this.skin.extras.map(e => e.id), n = E.stems[0] + Math.floor(this.rand() * (E.stems[1] - E.stems[0] + 1));
    const parts = Array.from({ length: n }, () => Math.floor(this.rand() * 3)).sort((a, b) => a - b);
    const extras = Object.fromEntries(ids.map(x => [x, this.rand() < E.extra]));
    if (!ids.some(x => extras[x])) extras[ids[Math.floor(this.rand() * 3)]] = true;
    return { parts, extras };
  }
  missing(k) { const left = [...k.order.parts]; for (const s of k.parts) left.splice(left.indexOf(s), 1); return left; }
  waiting() { return this.slots.filter(c => c && c.state === 'wait' && !c.ticket); }
  // the customer the runner's next ↑ serves: whoever is closest to walking out (marked with an arrow)
  nextCustomer() { return this.waiting().sort((a, b) => a.patience - b.patience)[0]; }
  float(text, x, y, color = C.white, size = 1) { this.floats.push({ text, x, y, color, size, t: 0 }); }

  play(dt) {
    const left = DURATION - this.t, sec = Math.ceil(left);
    this.setTimer(String(Math.max(0, sec)), left <= 10);
    if (sec < this.lastSec && sec <= 10 && sec > 0) A.sfx.tick();
    this.lastSec = sec;
    if (left <= 0) { this.finish(); return; }
    for (let i = 0; i < 3; i++) this.stun[i] = Math.max(0, this.stun[i] - dt);
    const prog = this.t / DURATION;
    // customers arrive
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const free = this.slots.findIndex(c => !c);
      if (free >= 0 && left > 6) {
        this.slots[free] = { id: this.nextId++, slot: free, x: DOOR_X, look: this.nextId % 3, order: this.makeOrder(), patience: this.E.patience, state: 'walk', ticket: null, bob: this.rand() * 6 };
        A.sfx.pop(); this.spawnT = this.opening < OPENING.length ? OPENING[this.opening++] : this.E.gap + (this.E.gapEnd - this.E.gap) * prog;
      } else this.spawnT = 0.5;
    }
    this.roleInput();
    // patience runs out → the customer walks away
    for (const c of this.slots) {
      if (!c) continue;
      if (c.state === 'walk') { c.x = Math.max(SLOTS[c.slot], c.x - WALK * dt); if (c.x === SLOTS[c.slot]) c.state = 'wait'; continue; }
      c.patience -= dt;
      if (!c.ticket && c.patience < this.E.patience * 0.3) this.cue(2, 50, 'imp' + c.id, 99);
      if (c.patience <= 0) this.leave(c, false);
    }
    this.common(dt);
  }
  roleInput() {
    // each role's buttons this frame; pressing two or more at once is mashing, which counts as one slip
    const acts = [
      [0, 1, 2].filter(i => input.hit(...KEYS.part[i])).map(i => () => this.addPart(i)),
      this.skin.extras.filter((x, i) => input.hit(...KEYS.extra[i])).map(x => () => this.addExtra(x.id)),
      [[KEYS.take, () => this.takeOrder()], [KEYS.pass, () => this.pass()], [KEYS.give, () => this.give()]].filter(([k]) => input.hit(...k)).map(([, f]) => f),
    ];
    acts.forEach((list, who) => {
      if (!list.length) return;
      this.pulse(who); this.hops[who] = 0.25;
      if (this.stun[who] > 0) return; // frozen after a slip: presses are ignored, not punished again
      if (list.length > 1) this.slip(who, this.skin.text.mash);
      else list[0]();
    });
  }
  // every wrong or useless press freezes that role for E.stun seconds (no points lost); made visible on purpose:
  // the reason pops up, the station flashes red, the worker shakes under a 💫 countdown, the HUD counts slips,
  // and the first slip of the round explains the rule in a toast
  slip(who, text) {
    const X = this.skin.text;
    this.wrongs++; this.stun[who] = this.E.stun; A.sfx.bad(); this.cue(who, 120);
    const x = STATION[who];
    this.float(X.stun(num(this.E.stun)), x, 150, C.red, 1.3); this.float(text, x, 168, C.pinkL);
    this.flash[who] = 0.45; this.hudScore();
    if (this.wrongs === 1) this.toast(X.firstSlip(num(this.E.stun)), 'bad');
  }
  // runner ↑: the most impatient waiting customer's order goes to the maker's bench
  takeOrder() {
    const X = this.skin.text, c = this.nextCustomer();
    if (!c) { this.slip(2, X.noCustomer); return; }
    if (this.tickets.length >= MAX_TICKETS) { this.slip(2, X.railFull); return; }
    const k = { cust: c, order: c.order, parts: [], done: {}, stage: 'build', pop: 0.3 };
    c.ticket = k; this.tickets.push(k); A.sfx.ok(); this.cue(0, 40);
    this.float(X.took, SLOTS[c.slot], 96, C.yellow);
  }
  // runner →: carry the oldest finished build from the maker's bench to the finisher's table
  pass() {
    const k = this.tickets.find(q => q.stage === 'built');
    if (!k) { this.slip(2, this.skin.text.nothingBuilt); return; }
    k.stage = 'finish'; k.pop = 0.3; A.sfx.move(); this.cue(1, 40);
    this.float(this.skin.text.passed, (STATION[0] + STATION[1]) / 2, 166, C.yellow);
  }
  addPart(i) {
    const X = this.skin.text, k = this.tickets.find(q => q.stage === 'build');
    if (!k) { this.slip(0, X.noOrder); return; }
    if (!this.missing(k).includes(i)) { this.slip(0, X.wrongPart(this.skin.parts[i].name)); return; }
    k.parts.push(i); A.sfx.pickup(); this.fx.burst(STATION[0], 176, 6, { colors: [this.skin.parts[i].color, C.white], speed: 30, g: 40 });
    if (!this.missing(k).length) { k.stage = 'built'; k.pop = 0.3; A.sfx.great(); this.cue(2, 40); this.float(X.built, STATION[0], 166, C.mint); }
  }
  addExtra(id) {
    const X = this.skin.text, ex = this.skin.extras, k = this.tickets.find(q => q.stage === 'finish');
    if (!k) { this.slip(1, X.noProduct); return; }
    const name = ex.find(e => e.id === id).name;
    if (!k.order.extras[id]) { this.slip(1, X.wrongExtra(name)); return; }
    if (k.done[id]) { this.slip(1, X.extraDone(name)); return; }
    k.done[id] = true; A.sfx[ex.find(e => e.id === id).sfx || 'pickup']();
    if (ex.every(e => !k.order.extras[e.id] || k.done[e.id])) { k.stage = 'ready'; k.pop = 0.3; A.sfx.ok(); this.cue(2, 40); this.float(X.ready, STATION[1], 166, C.mint); }
  }
  // runner ↓: hand the oldest finished order to its customer
  give() {
    const k = this.tickets.find(q => q.stage === 'ready');
    if (!k) { this.slip(2, this.skin.text.nothingReady); return; }
    const c = k.cust, tip = Math.round(TIP * clamp(c.patience / this.E.patience, 0, 1));
    this.points += ORDER + tip; this.tips += tip; this.served++;
    this.float(`+${ORDER}${tip ? ` +${tip} ${this.skin.text.tipWord}` : ''}`, SLOTS[c.slot], 92, C.yellow);
    A.sfx.great(); cheer(tip >= 3 ? 3 : 1);
    this.fx.burst(SLOTS[c.slot], 100, 14, { colors: [C.pink, C.yellow, C.white], speed: 50, g: 0 });
    this.leave(c, true);
  }
  leave(c, happy) {
    this.slots[c.slot] = null;
    if (c.ticket) this.tickets.splice(this.tickets.indexOf(c.ticket), 1);
    c.state = happy ? 'happy' : 'angry'; c.t = 0; this.walkers.push(c);
    if (!happy) { this.left++; this.points -= LEAVE; A.sfx.wilt(); this.cue('all', [80, 40, 80]); this.toast(this.skin.text.leave, 'bad'); }
    this.hudScore();
  }
  hudScore() { this.setScoreText(this.skin.text.hud(this.served, this.left, this.wrongs)); } // orders handed over · customers who left · slips
  finish() {
    if (this.done) return; this.done = true;
    const X = this.skin.text;
    this.end(X.banner, { score: this.points / this.E.div, lines: [[X.served, `${this.served} (+${this.served * ORDER})`], [X.tips, `+${this.tips}`], [X.left, this.left ? `${this.left} (−${this.left * LEAVE})` : X.leftNone], [X.wrongs, this.wrongs ? `${this.wrongs} lần (khựng ${num(this.wrongs * this.E.stun)} giây)` : X.wrongsNone]] });
  }
  common(dt) {
    this.anim += dt; this.fx.update(dt);
    for (let i = 0; i < 3; i++) { this.hops[i] = Math.max(0, this.hops[i] - dt); this.flash[i] = Math.max(0, this.flash[i] - dt); }
    for (const k of this.tickets) k.pop = Math.max(0, k.pop - dt);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < 0.9);
    for (const c of this.walkers) { c.t += dt; c.x += WALK * 0.8 * dt; }
    this.walkers = this.walkers.filter(c => c.x < DOOR_X + 10);
  }
  idle(dt) { this.common(dt); }

  // ------------------------------------------------ drawing
  drawOrder(g, x, y, order, k = null) {
    // part icons (faded until the maker adds them), then the extras the order asks for (faded until the finisher adds them)
    const art = this.skin.art, n = order.parts.length, w = n * 9;
    const have = k ? [...k.parts] : null;
    order.parts.forEach((m, i) => {
      let got = true; if (have) { const j = have.indexOf(m); got = j >= 0; if (got) have.splice(j, 1); }
      art.part(g, m, x - w / 2 + 4.5 + i * 9, y + 9, 9, got ? 1 : 0.35);
    });
    const ex = this.skin.extras.map((e, i) => [e.id, i]).filter(([id]) => order.extras[id]);
    ex.forEach(([id, ei], i) => art.extra(g, ei, x - (ex.length - 1) * 6 + i * 12, y + 15, 0.9, k && !k.done[id] ? 0.35 : 1));
  }
  drawWorld(g) {
    const art = this.skin.art, X = this.skin.text;
    g.drawImage(this.bg, 0, 0);
    const T = this.anim;
    // queue: customers with their orders and patience
    const people = [...this.slots.filter(Boolean), ...this.walkers];
    for (const c of people) {
      const sp = art.customer(c.look, c.state === 'wait' ? ((T * 2 + c.bob) | 0) % 2 : 0);
      drawAt(g, sp, Math.round(c.x), CUST_Y + 8, { flip: c.state === 'happy' || c.state === 'angry' });
      if (c.state === 'happy') { art.product(g, c.x + 8, CUST_Y - 10, c.order.parts, c.order.extras, 0.7); drawAt(g, heart, c.x, CUST_Y - 32 - c.t * 12, { ay: .5, alpha: Math.max(0, 1 - c.t) }); }
      if (c.state === 'angry') { g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.red; g.fillText('💢', c.x, CUST_Y - 26); }
    }
    art.counter(g);
    for (const c of this.slots) {
      if (!c || c.state !== 'wait') continue;
      const x = SLOTS[c.slot], y = 62, k = clamp(c.patience / this.E.patience, 0, 1);
      g.fillStyle = C.out; g.fillRect(x - 23, y - 1, 46, 26); g.fillStyle = c.ticket ? '#fff6d8' : C.white; g.fillRect(x - 22, y, 44, 24);
      g.fillRect(x - 2, y + 24, 4, 3);
      this.drawOrder(g, x, y + 2, c.order);
      if (c.ticket) { g.fillStyle = C.mintD; g.font = 'bold 6px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText(X.taken, x, y - 3); }
      g.fillStyle = C.out; g.fillRect(x - 18, y + 28, 36, 4); g.fillStyle = k > .5 ? C.mint : k > .25 ? C.yellow : C.red; g.fillRect(x - 17, y + 29, Math.max(1, Math.round(34 * k)), 2);
    }
    // an arrow in the runner's colour over the customer their next ↑ will serve
    const cur = this.nextCustomer();
    if (cur) {
      const cx = SLOTS[cur.slot], bob = Math.round(Math.sin(T * 6) * 2);
      g.fillStyle = C.out; g.beginPath(); g.moveTo(cx - 6, 46 + bob); g.lineTo(cx + 6, 46 + bob); g.lineTo(cx, 54 + bob); g.closePath(); g.fill();
      g.fillStyle = theme.roles[2].c; g.beginPath(); g.moveTo(cx - 4, 47 + bob); g.lineTo(cx + 4, 47 + bob); g.lineTo(cx, 52 + bob); g.closePath(); g.fill();
    }
    // ticket rail: the orders the team is working on, oldest first
    this.tickets.forEach((k, i) => {
      const x = 14 + i * 70, y = 30, s = 1 + k.pop * 0.3;
      g.save(); g.translate(x + 32, y + 30); g.scale(s, s); g.translate(-(x + 32), -(y + 30));
      g.fillStyle = C.out; g.fillRect(x - 1, y - 1, 66, 62); g.fillStyle = '#fffdf6'; g.fillRect(x, y, 64, 60);
      g.fillStyle = C.red; g.fillRect(x + 30, y - 3, 4, 4);
      this.drawOrder(g, x + 32, y + 8, k.order, k);
      const [who, col] = X.stages[k.stage];
      g.fillStyle = col; g.fillRect(x + 4, y + 44, 56, 12); g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(who, x + 32, y + 53);
      g.restore();
    });
    if (!this.tickets.length) { g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = art.hint || C.outSoft; g.fillText(X.emptyRail, 115, 62); }
    // work in progress at each station
    const build = this.tickets.find(k => k.stage === 'build'); if (build) art.product(g, STATION[0], 160, build.parts, {}, 1.3);
    // builds waiting for the runner to carry them on sit at the end of the maker's bench, with a blinking arrow
    this.tickets.filter(k => k.stage === 'built').forEach((k, i) => {
      art.product(g, STATION[0] + 44 + i * 8, 172 - i * 4, k.order.parts, {}, 1);
      if (i === 0 && ((T * 4) | 0) % 2) { g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.out; g.fillText('→', STATION[0] + 63, 179); g.fillStyle = theme.roles[2].c; g.fillText('→', STATION[0] + 62, 178); }
    });
    const fin = this.tickets.find(k => k.stage === 'finish'); if (fin) art.product(g, STATION[1], 158, fin.order.parts, fin.done, 1.3);
    this.tickets.filter(k => k.stage === 'ready').forEach((k, i) => art.product(g, STATION[2] - 34 + i * 22, 172, k.order.parts, k.done, 1));
    // the three workers at their stations
    STATION.forEach((x, i) => {
      if (this.flash[i] > 0) { g.globalAlpha = Math.min(0.55, this.flash[i] * 1.6); g.fillStyle = C.red; g.fillRect(x - 52, 176, 106, 42); g.globalAlpha = 1; }
      const hop = this.hops[i] > 0 ? Math.round(Math.sin((this.hops[i] / 0.25) * Math.PI) * 3) : 0;
      const frozen = this.stun[i] > 0, shake = frozen ? Math.round(Math.sin(T * 60) * 2) : 0;
      drawAt(g, theme.avatar(i, 'up', this.hops[i] > 0 ? 1 : 0, false), x + shake, 238 - hop, { alpha: frozen ? 0.7 : 1 });
      if (frozen) {
        g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText('💫', x + Math.sin(T * 8) * 4, 206);
        const txt = num(this.stun[i].toFixed(1)) + 's'; g.font = 'bold 8px "Baloo 2", sans-serif'; g.fillStyle = C.out; g.fillText(txt, x + 13, 220); g.fillStyle = C.red; g.fillText(txt, x + 12, 219);
      }
    });
    this.fx.draw(g);
    for (const f of this.floats) {
      const k = f.t / 0.9; g.font = `bold ${Math.round(8 * (f.size || 1))}px "Baloo 2", sans-serif`; g.textAlign = 'center';
      g.fillStyle = C.out; g.fillText(f.text, f.x + 1, f.y - k * 12 + 1); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y - k * 12);
    }
  }
}
