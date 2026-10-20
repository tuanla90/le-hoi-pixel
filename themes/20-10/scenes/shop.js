// Round 5 — opening day: customers queue at the counter and the three sisters work as one assembly line.
// Đào picks the flowers, Mai finishes them, and Lan is the runner who moves every order along: customer → Đào's bench →
// Mai's table → back to the customer. Nobody can complete a bouquet alone.
// Three buttons per role: Đào 3 flower colours · Mai gift wrap / card / bow (each order needs only some) · Lan take / pass / hand over.
// A wrong or useless press (no work at that station, an extra already added, two buttons at once) is a slip: that sister freezes
// for 1–2 s. Time is the only cost — no points are taken.
import { register, input, key, W, H, cheer, game } from '../../../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { Round } from '../../../core/round.js';

const DURATION = 75;
// flowers use the round-4 paint masks so the colours match: 1 hồng (đỏ) · 2 hướng dương (vàng) · 4 cẩm tú cầu (xanh dương)
const FLOWERS = { 1: 'Hồng', 2: 'Hướng dương', 4: 'Cẩm tú cầu' };
// Mai's finishing touches; an order asks for one or more of them, in any order
const EXTRAS = ['wrap', 'card', 'bow'];
const EXTRA_NAME = { wrap: 'gói giấy', card: 'thiệp', bow: 'nơ' };
const KEYS = {
  flower: { 1: ['Digit1', 'Numpad1'], 2: ['Digit2', 'Numpad2'], 4: ['Digit3', 'Numpad3'] },
  extra: { wrap: ['KeyQ'], card: ['KeyW'], bow: ['KeyE'] },
  take: ['ArrowUp'], pass: ['ArrowRight'], give: ['ArrowDown'],
};
const SLOTS = [262, 312, 362, 412], CUST_Y = 122, DOOR_X = 492;
const MAX_TICKETS = 3;
const WALK = 175;        // px/s customers walk in and out (door → counter in about 1.3 s)
const OPENING = [0, 0.7]; // the first two customers are already at the door when the shop opens
const BOUQUET = 10, TIP = 5, LEAVE = 5; // shop points: per bouquet, max tip for a quick one, a customer walking out
// gap: seconds between customers (start → end) · patience: how long a customer waits · stems: bouquet size range
// extra: chance each finishing touch is on an order (at least one always is) · stun: freeze after a mistake · div: shop points per round point
const TUNE = {
  easy: { gap: 3.8, gapEnd: 3, patience: 38, stems: [2, 2], extra: 0.7, stun: 1, div: 2.2 },
  normal: { gap: 3.7, gapEnd: 2.8, patience: 34, stems: [2, 3], extra: 0.8, stun: 1.5, div: 2.4 },
  hard: { gap: 3, gapEnd: 2.3, patience: 28, stems: [2, 4], extra: 0.85, stun: 2, div: 3 },
};
const STATION = { dao: 120, mai: 240, lan: 380 }; // where each girl works (x)
const num = v => String(v).replace('.', ',');

class Shop extends Round {
  constructor(p) {
    super({ id: 'shop' }, p);
    const info = e => `khách đến mỗi ${num(e.gap)}→${num(e.gapEnd)} giây, chờ được ${e.patience} giây · mỗi bó ${e.stems[0] === e.stems[1] ? e.stems[0] : e.stems.join('–')} cành · ${e.extra < 0.75 ? 'ít' : e.extra < 0.83 ? 'vừa' : 'nhiều'} món gói kèm · làm nhầm khựng ${num(e.stun)} giây`;
    this.diffInfo = { easy: info(TUNE.easy), normal: info(TUNE.normal), hard: info(TUNE.hard) };
    this.desc = 'Tiệm mở cửa, khách xếp hàng! <b>Lan</b> là người chuyển đơn: nhận đơn của khách đưa sang bàn Đào, chuyển bó hoa sang bàn Mai, rồi trả hoa cho khách. <b>Đào</b> cắm đúng màu hoa, <b>Mai</b> thêm đúng những món khách dặn: gói giấy, thiệp, nơ.';
    this.tip = `Không phải đơn nào cũng cần đủ gói giấy, thiệp và nơ — nhìn kỹ đơn nhé! <b>Bấm bừa bị khựng tay</b>: bấm sai, bấm khi bàn mình chưa có việc, thêm món đã có hoặc bấm nhiều nút một lúc đều làm người đó đứng im 1–2 giây. Bảng chỉ treo ${MAX_TICKETS} đơn.`;
    this.scoreLabel = 'Khách';
    this.initialScore = 'bó 0 · bỏ 0 · sai 0';
    const fl = m => `<b style="color:${S.PAINTS[m].d}">${FLOWERS[m]}</b>`;
    this.roles = [
      { act: `<b>Cắm hoa</b> theo đơn: 1 ${fl(1)} · 2 ${fl(2)} · 3 ${fl(4)}`, short: 'Cắm hoa', keys: key('1') + key('2') + key('3') },
      { act: '<b>Hoàn thiện</b> đúng món trong đơn: Q 🎁 gói giấy · W 💌 thiệp · E 🎀 nơ', short: 'Gói · thiệp · nơ', keys: key('Q') + key('W') + key('E') },
      { act: '<b>Chuyển đơn</b>: ↑ nhận đơn → bàn Đào · → chuyển bó hoa sang bàn Mai · ↓ trả hoa cho khách', short: 'Chuyển đơn', keys: key('↑') + key('→') + key('↓') },
    ];
    this.roleCodes = [Object.values(KEYS.flower).flat(), Object.values(KEYS.extra).flat(), [...KEYS.take, ...KEYS.pass, ...KEYS.give]];
    // ---- guided demo
    this.demoKeys = [[['Digit1', '1 🌹'], ['Digit2', '2 🌻'], ['Digit3', '3 💠']], [['KeyQ', 'Q 🎁'], ['KeyW', 'W 💌'], ['KeyE', 'E 🎀']], [['ArrowUp', '↑ nhận đơn'], ['ArrowRight', '→ sang Mai'], ['ArrowDown', '↓ trả hoa']]];
    this.demoSpeed = 0.7;
    const queueF = () => ({ x: 337, y: 92, r: 60 });
    const railF = () => ({ x: 112, y: 62, r: 56 });
    const stF = x => () => ({ x, y: 196, r: 36 });
    this.demoScript = [
      { at: 0, text: 'Khách vào tiệm, mỗi người một <b>đơn</b>: mấy cành hoa màu gì + món gói kèm (🎁 · 💌 · 🎀). Thanh dưới là <b>sức chờ</b>', focus: queueF },
      { at: 5, text: '<b>Lan</b> ↑ <b>nhận đơn</b> của khách có mũi tên (khách sắp hết kiên nhẫn nhất) → đơn sang bàn Đào', focus: railF },
      { at: 10, text: '<b>Đào</b> cắm đúng màu hoa trong đơn: 1 hồng · 2 hướng dương · 3 cẩm tú cầu', focus: stF(STATION.dao) },
      { at: 14, text: 'Cắm xong → <b>Lan</b> bấm → <b>chuyển</b> bó hoa sang bàn Mai', focus: stF((STATION.dao + STATION.mai) / 2) },
      { at: 17, text: '<b>Mai</b> chỉ thêm <b>đúng những món</b> đơn cần: Q gói giấy · W thiệp · E nơ', focus: stF(STATION.mai) },
      { at: 21, text: '<b>Lan</b> ↓ <b>trả hoa</b> và thu tiền — khách chờ càng ít, tiền boa càng nhiều', focus: stF(STATION.lan) },
      { at: 26, text: 'Khách chờ quá lâu sẽ <b>bỏ về</b>. Bấm bừa cũng bị phạt — cả đội làm nhịp nhàng nhé!', focus: queueF },
    ];
  }
  demoCaption(t) {
    if (this.demoErr && this.demo.t < this.demoErr) return { text: 'Ối, <b>Mai</b> thêm món thừa hoặc bấm trùng → <b>khựng tay</b> một lúc, cả dây chuyền chậm lại', focus: () => ({ x: STATION.mai, y: 190, r: 36 }) };
    return super.demoCaption(t);
  }
  // demo bot: one action per role every ~0.5 s; Mai slips once (an extra the order did not ask for) so viewers see the penalty
  demoStep(dt) {
    const cd = this.dcd || (this.dcd = [0.6, 0.6, 0.6]);
    for (let i = 0; i < 3; i++) cd[i] -= dt;
    if (cd[2] <= 0) {
      cd[2] = 0.5;
      if (this.tickets.some(k => k.stage === 'ready')) this.vpress('ArrowDown');
      else if (this.tickets.some(k => k.stage === 'built')) this.vpress('ArrowRight');
      else if (this.nextCustomer() && this.tickets.length < 2) this.vpress('ArrowUp');
      else cd[2] = 0.2;
    }
    const build = this.tickets.find(k => k.stage === 'build');
    if (cd[0] <= 0 && build) { cd[0] = 0.55; this.vpress(KEYS.flower[this.missing(build)[0]][0]); }
    const fin = this.tickets.find(k => k.stage === 'finish');
    if (cd[1] <= 0 && fin) {
      cd[1] = 0.6;
      // the planted slip: an extra the order did not ask for, or one already added
      const todo = EXTRAS.filter(x => fin.order.extras[x] && !fin.done[x]), skip = EXTRAS.find(x => !fin.order.extras[x]) || EXTRAS.find(x => fin.done[x]);
      if (this.demo.t > 14 && !this.demoSlipped && skip) { this.demoSlipped = true; this.demoErr = this.demo.t + 3; this.vpress(KEYS.extra[skip][0]); }
      else if (todo.length) this.vpress(KEYS.extra[todo[0]][0]);
    }
  }
  init() {
    this.E = TUNE[game.diff];
    this.slots = [null, null, null, null]; this.walkers = []; this.tickets = [];
    this.spawnT = OPENING[0]; this.opening = 1; this.points = 0; this.served = 0; this.left = 0; this.tips = 0; this.wrongs = 0; this.nextId = 1;
    this.stun = [0, 0, 0]; this.hops = [0, 0, 0]; this.flash = [0, 0, 0]; this.lastSec = DURATION; this.done = false;
    this.parts = new Particles(); this.floats = []; this.anim = 0;
    this.dcd = null; this.demoSlipped = false; this.demoErr = 0;
    this.seed = 1234 + (game.diff === 'hard' ? 7 : game.diff === 'easy' ? 3 : 0); // same customers every try, so tries are comparable
    this.bg = makeCanvas(W, H, g => {
      // wall with striped paper, shelves of potted flowers and a window
      for (let x = 0; x < W; x += 12) { g.fillStyle = (x / 12) % 2 ? '#ffe3ec' : '#fff1f5'; g.fillRect(x, 0, 12, 128); }
      g.fillStyle = '#ffd0de'; for (let x = 6; x < W; x += 24) for (let y = 10; y < 120; y += 22) { g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
      drawAt(g, S.windowIn, 250, 58, { ay: 1 }); drawAt(g, S.shelf, 360, 46, { ay: 1 }); drawAt(g, S.shelf, 432, 46, { ay: 1 });
      // shop door (customers come in on the right)
      g.fillStyle = C.brownD; g.fillRect(452, 52, 30, 76); g.fillStyle = C.brownL; g.fillRect(455, 55, 24, 73); g.fillStyle = C.skyL; g.fillRect(459, 60, 16, 22); g.fillStyle = C.yellow; g.fillRect(474, 92, 3, 3);
      // ticket rail
      g.fillStyle = C.brownD; g.fillRect(8, 24, 214, 4); g.fillStyle = C.brownL; g.fillRect(8, 24, 214, 2);
      // floor
      for (let y = 128; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#c48a5a' : '#b97e4f'; g.fillRect(0, y, W, 8); g.fillStyle = C.brown; g.fillRect(0, y + 7, W, 1); for (let x = ((y / 8) % 3) * 23; x < W; x += 70) g.fillRect(x, y, 1, 7); }
      g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center';
      // Đào's flower bench with three buckets
      g.fillStyle = C.brownD; g.fillRect(STATION.dao - 50, 198, 100, 18); g.fillStyle = C.brownL; g.fillRect(STATION.dao - 50, 198, 100, 4);
      [1, 2, 4].forEach((m, i) => {
        const x = STATION.dao - 32 + i * 32;
        g.fillStyle = C.grayD; g.fillRect(x - 8, 188, 16, 12); g.fillStyle = C.gray; g.fillRect(x - 7, 188, 14, 11); g.fillStyle = C.grayL; g.fillRect(x - 7, 188, 14, 2);
        for (let k = 0; k < 3; k++) { g.fillStyle = C.greenD; g.fillRect(x - 4 + k * 4, 180, 1, 9); drawAt(g, S.paintFlower(m, 9), x - 4 + k * 4, 184 - (k % 2) * 3, { ay: 1 }); }
        g.fillStyle = C.white; g.fillText(String(i + 1), x, 210);
      });
      // Mai's table: gift paper, a stack of cards, ribbon
      g.fillStyle = C.brownD; g.fillRect(STATION.mai - 50, 198, 100, 18); g.fillStyle = C.brownL; g.fillRect(STATION.mai - 50, 198, 100, 4);
      EXTRAS.forEach((x, i) => { this.drawExtra(g, x, STATION.mai - 32 + i * 32, 190, 1.4); g.fillStyle = C.white; g.fillText('QWE'[i], STATION.mai - 32 + i * 32, 210); });
      // Lan's counter with the till
      g.fillStyle = C.brownD; g.fillRect(STATION.lan - 50, 198, 110, 18); g.fillStyle = C.brownL; g.fillRect(STATION.lan - 50, 198, 110, 4);
      g.fillStyle = C.grayD; g.fillRect(STATION.lan + 34, 180, 22, 18); g.fillStyle = C.mint; g.fillRect(STATION.lan + 37, 183, 16, 6); g.fillStyle = C.grayL; g.fillRect(STATION.lan + 36, 191, 18, 5);
    });
  }
  // the counter in front of the queue is drawn over the customers' legs
  drawCounter(g) { g.fillStyle = C.brownD; g.fillRect(232, 125, 216, 14); g.fillStyle = C.brownL; g.fillRect(232, 125, 216, 4); g.fillStyle = '#e3a874'; g.fillRect(232, 125, 216, 1); }

  rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  makeOrder() {
    const E = this.E, n = E.stems[0] + Math.floor(this.rand() * (E.stems[1] - E.stems[0] + 1));
    const flowers = Array.from({ length: n }, () => [1, 2, 4][Math.floor(this.rand() * 3)]).sort((a, b) => a - b);
    const extras = Object.fromEntries(EXTRAS.map(x => [x, this.rand() < E.extra]));
    if (!EXTRAS.some(x => extras[x])) extras[EXTRAS[Math.floor(this.rand() * 3)]] = true;
    return { flowers, extras };
  }
  missing(k) { const left = [...k.order.flowers]; for (const s of k.stems) left.splice(left.indexOf(s), 1); return left; }
  waiting() { return this.slots.filter(c => c && c.state === 'wait' && !c.ticket); }
  // the customer Lan's next ↑ serves: whoever is closest to walking out (marked with the blue arrow)
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
      [1, 2, 4].filter(m => input.hit(...KEYS.flower[m])).map(m => () => this.addStem(m)),
      EXTRAS.filter(x => input.hit(...KEYS.extra[x])).map(x => () => this.addExtra(x)),
      [[KEYS.take, () => this.takeOrder()], [KEYS.pass, () => this.pass()], [KEYS.give, () => this.give()]].filter(([k]) => input.hit(...k)).map(([, f]) => f),
    ];
    acts.forEach((list, who) => {
      if (!list.length) return;
      this.pulse(who); this.hops[who] = 0.25;
      if (this.stun[who] > 0) return; // frozen after a slip: presses are ignored, not punished again
      if (list.length > 1) this.slip(who, 'Bấm từng nút thôi!');
      else list[0]();
    });
  }
  // every wrong or useless press freezes that sister for E.stun seconds (no points lost); made visible on purpose:
  // the reason pops up, the station flashes red, the sister shakes under a 💫 countdown, the HUD counts “sai”,
  // and the first slip of the round explains the rule in a toast
  slip(who, text) {
    this.wrongs++; this.stun[who] = this.E.stun; A.sfx.bad(); this.cue(who, 120);
    const x = [STATION.dao, STATION.mai, STATION.lan][who];
    this.float(`Khựng ${num(this.E.stun)}s!`, x, 150, C.red, 1.3); this.float(text, x, 168, C.pinkL);
    this.flash[who] = 0.45; this.hudScore();
    if (this.wrongs === 1) this.toast(`Bấm sai hoặc bấm bừa: người đó khựng tay ${num(this.E.stun)} giây!`, 'bad');
  }
  // Lan ↑: the most impatient waiting customer's order goes to Đào's bench
  takeOrder() {
    const c = this.nextCustomer();
    if (!c) { this.slip(2, 'Chưa có khách chờ!'); return; }
    if (this.tickets.length >= MAX_TICKETS) { this.slip(2, 'Bảng đơn đầy!'); return; }
    const k = { cust: c, order: c.order, stems: [], done: {}, stage: 'build', pop: 0.3 };
    c.ticket = k; this.tickets.push(k); A.sfx.ok(); this.cue(0, 40);
    this.float('Nhận đơn!', SLOTS[c.slot], 96, C.yellow);
  }
  // Lan →: carry the oldest finished arrangement from Đào's bench to Mai's table
  pass() {
    const k = this.tickets.find(q => q.stage === 'built');
    if (!k) { this.slip(2, 'Bàn Đào chưa xong bó nào!'); return; }
    k.stage = 'finish'; k.pop = 0.3; A.sfx.move(); this.cue(1, 40);
    this.float('Sang bàn Mai →', (STATION.dao + STATION.mai) / 2, 166, C.yellow);
  }
  addStem(m) {
    const k = this.tickets.find(q => q.stage === 'build');
    if (!k) { this.slip(0, 'Chưa có đơn!'); return; }
    if (!this.missing(k).includes(m)) { this.slip(0, `Đơn không cần ${FLOWERS[m]}!`); return; }
    k.stems.push(m); A.sfx.pickup(); this.parts.burst(STATION.dao, 176, 6, { colors: [S.PAINTS[m].c, C.white], speed: 30, g: 40 });
    if (!this.missing(k).length) { k.stage = 'built'; k.pop = 0.3; A.sfx.great(); this.cue(2, 40); this.float('Cắm xong!', STATION.dao, 166, C.mint); }
  }
  addExtra(x) {
    const k = this.tickets.find(q => q.stage === 'finish');
    if (!k) { this.slip(1, 'Chưa có bó hoa!'); return; }
    if (!k.order.extras[x]) { this.slip(1, `Đơn không cần ${EXTRA_NAME[x]}!`); return; }
    if (k.done[x]) { this.slip(1, `Có ${EXTRA_NAME[x]} rồi!`); return; }
    k.done[x] = true; x === 'wrap' ? A.sfx.snip() : A.sfx.pickup();
    if (EXTRAS.every(e => !k.order.extras[e] || k.done[e])) { k.stage = 'ready'; k.pop = 0.3; A.sfx.ok(); this.cue(2, 40); this.float('Xong bó hoa!', STATION.mai, 166, C.mint); }
  }
  // Lan ↓: hand the oldest finished bouquet to its customer
  give() {
    const k = this.tickets.find(q => q.stage === 'ready');
    if (!k) { this.slip(2, 'Chưa có hoa để trả!'); return; }
    const c = k.cust, tip = Math.round(TIP * clamp(c.patience / this.E.patience, 0, 1));
    this.points += BOUQUET + tip; this.tips += tip; this.served++;
    this.float(`+${BOUQUET}${tip ? ` +${tip} boa` : ''}`, SLOTS[c.slot], 92, C.yellow);
    A.sfx.great(); cheer(tip >= 3 ? 3 : 1);
    this.parts.burst(SLOTS[c.slot], 100, 14, { colors: [C.pink, C.yellow, C.white], speed: 50, g: 0 });
    this.leave(c, true);
  }
  leave(c, happy) {
    this.slots[c.slot] = null;
    if (c.ticket) this.tickets.splice(this.tickets.indexOf(c.ticket), 1);
    c.state = happy ? 'happy' : 'angry'; c.t = 0; this.walkers.push(c);
    if (!happy) { this.left++; this.points -= LEAVE; A.sfx.wilt(); this.cue('all', [80, 40, 80]); this.toast('Khách chờ lâu quá nên bỏ về 😢', 'bad'); }
    this.hudScore();
  }
  hudScore() { this.setScoreText(`bó ${this.served} · bỏ ${this.left} · sai ${this.wrongs}`); } // bouquets handed over · customers who left · slips
  finish() {
    if (this.done) return; this.done = true;
    this.end('Đóng cửa!', { score: this.points / this.E.div, lines: [['Bó hoa đã giao', `${this.served} (+${this.served * BOUQUET})`], ['Tiền boa', `+${this.tips}`], ['Khách bỏ về', this.left ? `${this.left} (−${this.left * LEAVE})` : '0 — tuyệt vời!'], ['Bấm nhầm / bấm bừa', this.wrongs ? `${this.wrongs} lần (khựng ${num(this.wrongs * this.E.stun)} giây)` : '0 — chuẩn!']] });
  }
  common(dt) {
    this.anim += dt; this.parts.update(dt);
    for (let i = 0; i < 3; i++) { this.hops[i] = Math.max(0, this.hops[i] - dt); this.flash[i] = Math.max(0, this.flash[i] - dt); }
    for (const k of this.tickets) k.pop = Math.max(0, k.pop - dt);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < 0.9);
    for (const c of this.walkers) { c.t += dt; c.x += WALK * 0.8 * dt; }
    this.walkers = this.walkers.filter(c => c.x < DOOR_X + 10);
  }
  idle(dt) { this.common(dt); }

  // ------------------------------------------------ drawing
  // tiny icons for the finishing touches: 🎁 gift paper · 💌 card · 🎀 bow
  drawExtra(g, x, cx, cy, s = 1, alpha = 1) {
    g.save(); g.globalAlpha = alpha; g.translate(Math.round(cx), Math.round(cy)); g.scale(s, s);
    if (x === 'wrap') { g.fillStyle = C.out; g.beginPath(); g.moveTo(-5, -4); g.lineTo(5, -4); g.lineTo(1, 5); g.lineTo(-1, 5); g.closePath(); g.fill(); g.fillStyle = '#ffb3c7'; g.beginPath(); g.moveTo(-4, -3); g.lineTo(4, -3); g.lineTo(0.5, 4); g.lineTo(-0.5, 4); g.closePath(); g.fill(); }
    if (x === 'card') { g.fillStyle = C.out; g.fillRect(-5, -4, 10, 8); g.fillStyle = C.white; g.fillRect(-4, -3, 8, 6); g.fillStyle = C.pinkD; g.fillRect(-3, -2, 1, 1); g.fillRect(-2, -1, 4, 1); g.fillRect(2, -2, 1, 1); }
    if (x === 'bow') { g.fillStyle = C.out; g.fillRect(-5, -3, 10, 6); g.fillStyle = C.red; g.fillRect(-4, -2, 3, 4); g.fillRect(1, -2, 3, 4); g.fillStyle = C.redD; g.fillRect(-1, -1, 2, 2); }
    g.restore();
  }
  drawBouquet(g, x, y, stems, done, scale = 1) {
    const n = stems.length;
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.35; g.strokeStyle = C.greenD; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 14 * scale); g.lineTo(x + Math.sin(a) * 9 * scale, y); g.stroke(); }
    if (done.wrap) {
      g.fillStyle = '#e07a9a'; g.beginPath(); g.moveTo(x - 9 * scale, y - 1); g.lineTo(x + 9 * scale, y - 1); g.lineTo(x + 2, y + 16 * scale); g.lineTo(x - 2, y + 16 * scale); g.closePath(); g.fill();
      g.fillStyle = '#ffb3c7'; g.beginPath(); g.moveTo(x - 7 * scale, y); g.lineTo(x + 7 * scale, y); g.lineTo(x + 1, y + 14 * scale); g.lineTo(x - 1, y + 14 * scale); g.closePath(); g.fill();
    }
    stems.forEach((m, i) => { const a = (i - (n - 1) / 2) * 0.35; drawAt(g, S.paintFlower(m, Math.round(9 * scale)), x + Math.sin(a) * 9 * scale, y + 3 - Math.cos(a) * 2, { ay: 1 }); });
    if (done.card) this.drawExtra(g, 'card', x + 7 * scale, y + 6 * scale, 0.8 * scale);
    if (done.bow) this.drawExtra(g, 'bow', x, y + 10 * scale, 0.8 * scale);
  }
  drawOrder(g, x, y, order, k = null) {
    // flower icons (faded until Đào adds them), then the finishing touches the order asks for (faded until Mai adds them)
    const n = order.flowers.length, w = n * 9;
    const have = k ? [...k.stems] : null;
    order.flowers.forEach((m, i) => {
      let got = true; if (have) { const j = have.indexOf(m); got = j >= 0; if (got) have.splice(j, 1); }
      drawAt(g, S.paintFlower(m, 9), x - w / 2 + 4.5 + i * 9, y + 9, { ay: 1, alpha: got ? 1 : 0.35 });
    });
    const ex = EXTRAS.filter(e => order.extras[e]);
    ex.forEach((e, i) => this.drawExtra(g, e, x - (ex.length - 1) * 6 + i * 12, y + 15, 0.9, k && !k.done[e] ? 0.35 : 1));
  }
  drawWorld(g) {
    g.drawImage(this.bg, 0, 0);
    const T = this.anim;
    // queue: customers with their orders and patience
    const people = [...this.slots.filter(Boolean), ...this.walkers];
    for (const c of people) {
      const sp = S.customer[c.look][c.state === 'wait' ? ((T * 2 + c.bob) | 0) % 2 : 0];
      drawAt(g, sp, Math.round(c.x), CUST_Y + 8, { flip: c.state === 'happy' || c.state === 'angry' });
      if (c.state === 'happy') { this.drawBouquet(g, c.x + 8, CUST_Y - 10, c.order.flowers, c.order.extras, 0.7); drawAt(g, S.heart, c.x, CUST_Y - 32 - c.t * 12, { ay: .5, alpha: Math.max(0, 1 - c.t) }); }
      if (c.state === 'angry') { g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.red; g.fillText('💢', c.x, CUST_Y - 26); }
    }
    this.drawCounter(g);
    for (const c of this.slots) {
      if (!c || c.state !== 'wait') continue;
      const x = SLOTS[c.slot], y = 62, k = clamp(c.patience / this.E.patience, 0, 1);
      g.fillStyle = C.out; g.fillRect(x - 23, y - 1, 46, 26); g.fillStyle = c.ticket ? '#fff6d8' : C.white; g.fillRect(x - 22, y, 44, 24);
      g.fillRect(x - 2, y + 24, 4, 3);
      this.drawOrder(g, x, y + 2, c.order);
      if (c.ticket) { g.fillStyle = C.mintD; g.font = 'bold 6px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText('✓ đã nhận', x, y - 3); }
      g.fillStyle = C.out; g.fillRect(x - 18, y + 28, 36, 4); g.fillStyle = k > .5 ? C.mint : k > .25 ? C.yellow : C.red; g.fillRect(x - 17, y + 29, Math.max(1, Math.round(34 * k)), 2);
    }
    // blue arrow over the customer Lan's next ↑ will serve
    const cur = this.nextCustomer();
    if (cur) {
      const cx = SLOTS[cur.slot], bob = Math.round(Math.sin(T * 6) * 2);
      g.fillStyle = C.out; g.beginPath(); g.moveTo(cx - 6, 46 + bob); g.lineTo(cx + 6, 46 + bob); g.lineTo(cx, 54 + bob); g.closePath(); g.fill();
      g.fillStyle = '#4aa3ff'; g.beginPath(); g.moveTo(cx - 4, 47 + bob); g.lineTo(cx + 4, 47 + bob); g.lineTo(cx, 52 + bob); g.closePath(); g.fill();
    }
    // ticket rail: the orders the team is working on, oldest first
    this.tickets.forEach((k, i) => {
      const x = 14 + i * 70, y = 30, s = 1 + k.pop * 0.3;
      g.save(); g.translate(x + 32, y + 30); g.scale(s, s); g.translate(-(x + 32), -(y + 30));
      g.fillStyle = C.out; g.fillRect(x - 1, y - 1, 66, 62); g.fillStyle = '#fffdf6'; g.fillRect(x, y, 64, 60);
      g.fillStyle = C.red; g.fillRect(x + 30, y - 3, 4, 4);
      this.drawOrder(g, x + 32, y + 8, k.order, k);
      const [who, col] = { build: ['Đào cắm hoa', '#ff7aa2'], built: ['Lan chuyển →', '#3f86cf'], finish: ['Mai hoàn thiện', C.yellowD], ready: ['Lan trả hoa ↓', '#3f86cf'] }[k.stage];
      g.fillStyle = col; g.fillRect(x + 4, y + 44, 56, 12); g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(who, x + 32, y + 53);
      g.restore();
    });
    if (!this.tickets.length) { g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.outSoft; g.fillText('Chưa có đơn — Lan bấm ↑ nhận đơn', 115, 62); }
    // work in progress at each station
    const build = this.tickets.find(k => k.stage === 'build'); if (build) this.drawBouquet(g, STATION.dao, 160, build.stems, {}, 1.3);
    // arrangements waiting for Lan to carry them to Mai sit at the end of Đào's bench, with a blinking arrow
    this.tickets.filter(k => k.stage === 'built').forEach((k, i) => {
      this.drawBouquet(g, STATION.dao + 44 + i * 8, 172 - i * 4, k.order.flowers, {}, 1);
      if (i === 0 && ((T * 4) | 0) % 2) { g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.out; g.fillText('→', STATION.dao + 63, 179); g.fillStyle = '#4aa3ff'; g.fillText('→', STATION.dao + 62, 178); }
    });
    const fin = this.tickets.find(k => k.stage === 'finish'); if (fin) this.drawBouquet(g, STATION.mai, 158, fin.order.flowers, fin.done, 1.3);
    this.tickets.filter(k => k.stage === 'ready').forEach((k, i) => this.drawBouquet(g, STATION.lan - 34 + i * 22, 172, k.order.flowers, k.done, 1));
    // the sisters at their stations
    [STATION.dao, STATION.mai, STATION.lan].forEach((x, i) => {
      if (this.flash[i] > 0) { g.globalAlpha = Math.min(0.55, this.flash[i] * 1.6); g.fillStyle = C.red; g.fillRect(x - 52, 176, 106, 42); g.globalAlpha = 1; }
      const hop = this.hops[i] > 0 ? Math.round(Math.sin((this.hops[i] / 0.25) * Math.PI) * 3) : 0;
      const frozen = this.stun[i] > 0, shake = frozen ? Math.round(Math.sin(T * 60) * 2) : 0;
      drawAt(g, S.girl(i, 'up', this.hops[i] > 0 ? 1 : 0, false), x + shake, 238 - hop, { alpha: frozen ? 0.7 : 1 });
      if (frozen) {
        g.font = 'bold 10px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText('💫', x + Math.sin(T * 8) * 4, 206);
        const txt = num(this.stun[i].toFixed(1)) + 's'; g.font = 'bold 8px "Baloo 2", sans-serif'; g.fillStyle = C.out; g.fillText(txt, x + 13, 220); g.fillStyle = C.red; g.fillText(txt, x + 12, 219);
      }
    });
    this.parts.draw(g);
    for (const f of this.floats) {
      const k = f.t / 0.9; g.font = `bold ${Math.round(8 * (f.size || 1))}px "Baloo 2", sans-serif`; g.textAlign = 'center';
      g.fillStyle = C.out; g.fillText(f.text, f.x + 1, f.y - k * 12 + 1); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y - k * 12);
    }
  }
}

export default function () { register('shop', p => new Shop(p)); }
