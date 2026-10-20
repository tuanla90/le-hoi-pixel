import { register, input, K, key, img, W, H, cheer, game } from '../main.js';
import { C, makeCanvas, drawAt, rng, Particles, clamp } from '../gfx.js';
import * as S from '../sprites.js';
import * as A from '../audio.js';
import { Round } from '../round.js';
import { grassField, scatter } from '../world.js';

// a square bed: Đào (up/down) and Mai (left/right) walk the frame about the same number of steps
const COLS = 4, ROWS = 4, CW = 48, CH = 32;
const GX = Math.round((W - COLS * CW) / 2), GY = 60;
const DURATION = 60;
const NEEDS = ['water', 'bug', 'trim'];
const TOOL_KEYS = { water: ['Digit1', 'KeyJ', 'Numpad1'], bug: ['Digit2', 'KeyK', 'Numpad2'], trim: ['Digit3', 'KeyL', 'Numpad3'] };
// wait: seconds a plant waits at the start (2 s less by the end) · gap: seconds between requests · max/ramp: plants asking
// at once (start → +ramp by the end) · stun: freeze after a slip · div: garden points per round point
const TUNE = {
  easy: { wait: 9.5, gap: 1.45, max: 2, ramp: 2, stun: 0.35, div: 5 },
  normal: { wait: 8.2, gap: 1.25, max: 3, ramp: 2, stun: 0.5, div: 5.5 },
  hard: { wait: 7.8, gap: 1.1, max: 4, ramp: 2, stun: 0.6, div: 6 },
};
const num = v => String(Math.round(v * 10) / 10).replace('.', ',');

class Garden extends Round {
  constructor(p) {
    super({ id: 'garden' }, p);
    const info = (e, extra) => `cây chờ ${num(e.wait)} giây (cuối vòng ${num(e.wait - 2)}) · ${e.max}→${e.max + e.ramp} cây kêu cùng lúc · dùng sai khựng ${num(e.stun)} giây${extra}`;
    this.diffInfo = { easy: info(TUNE.easy, ''), normal: info(TUNE.normal, ''), hard: info(TUNE.hard, ' · cần chăm nhiều cây hơn mới đủ 100') };
    this.desc = 'Cây trong vườn cần chăm! Đưa khung chọn tới cây đang “kêu cứu” rồi dùng đúng dụng cụ trước khi cây héo.';
    this.tip = 'Chăm <b>cây gần khung nhất</b> trước, đừng chạy ngang vườn đuổi theo cây sắp héo. Chăm liền nhiều cây bằng <b>cùng một dụng cụ</b> để ăn combo. Dùng sai hoặc bấm nhiều dụng cụ một lúc bị khựng và mất combo.';
    const t = (cv) => img(cv, 'tool-ico');
    this.roles = [
      { act: 'Đưa khung <b>lên / xuống</b>', short: 'Lên / Xuống', keys: key('W') + key('S') + ' / ' + key('↑') + key('↓') },
      { act: 'Đưa khung <b>trái / phải</b>', short: 'Trái / Phải', keys: key('A') + key('D') + ' / ' + key('←') + key('→') },
      { act: 'Dùng <b>dụng cụ</b>: tưới · bắt sâu · tỉa', short: 'Dụng cụ', keys: key('1') + t(S.tools.water) + key('2') + t(S.tools.bug) + key('3') + t(S.tools.trim) },
    ];
    this.roleCodes = [[...K.up, ...K.down], [...K.left, ...K.right], Object.values(TOOL_KEYS).flat()];
    // ---- guided demo
    this.demoKeys = [[['ArrowUp', '↑'], ['ArrowDown', '↓']], [['ArrowLeft', '←'], ['ArrowRight', '→']],
      [['Digit1', '1' + t(S.tools.water)], ['Digit2', '2' + t(S.tools.bug)], ['Digit3', '3' + t(S.tools.trim)]]];
    const plotF = r => () => { const p = this.demoTarget || this.plots.find(q => q.need); if (!p) return null; const [x, y] = this.plotXY(p); return { x, y: y - 2, r }; };
    const curF = () => ({ x: GX + this.cur.dx * CW + CW / 2, y: GY + this.cur.dy * CH + CH / 2, r: 26 });
    const victimF = () => { const p = this.demoVictim; if (!p) return curF(); const [x, y] = this.plotXY(p); return { x: x + 4, y: y - 6, r: 24 }; };
    this.demoScript = [
      { at: 0, text: 'Cây nào cần chăm sẽ hiện <b>bong bóng</b>: 💧 cần tưới · 🐛 có sâu · ✂️ cần tỉa', focus: plotF(26) },
      { at: 5, text: '<b>Đào</b> bấm ↑ ↓ đưa khung lên xuống · <b>Mai</b> bấm ← → đưa khung trái phải', focus: curF },
      { at: 10, text: 'Khung đã tới đúng cây → <b>Lan</b> bấm <b>1 · 2 · 3</b> để dùng đúng dụng cụ', focus: curF },
      { at: 14.3, text: 'Ối, <b>dùng sai dụng cụ</b> → cả đội bị khựng lại một chút và <b>mất combo</b>', focus: curF },
      { at: 19, text: 'Mải chăm cây khác, quên mất cây này… thanh chờ cạn là <b>cây héo</b>, mất combo!', focus: victimF },
      { at: 26, text: 'Chăm liền nhiều cây bằng <b>cùng một dụng cụ</b> để ăn combo thưởng — càng nhiều càng tốt!', focus: curF },
    ];
  }
  // demo bot: walks the frame to the most urgent plant one deliberate step at a time, then uses the right tool.
  // It slips on purpose so viewers see the penalties: one wrong tool (~14s) and one forgotten plant that wilts (~19s).
  demoStep(dt) {
    const T = this.demo.t;
    if (T >= 19 && !this.demoVictim) {
      const v = this.plots.filter(q => q.need && q !== this.demoTarget).sort((a, b) => b.needT - a.needT)[0];
      if (v) { this.demoVictim = v; v.needT = Math.max(v.needT, v.needMax - 3.2); }
    }
    this.dcool = (this.dcool ?? 0.9) - dt;
    if (this.dcool > 0) return;
    const p = this.plots.filter(q => q.need && q !== this.demoVictim).sort((a, b) => (a.needMax - a.needT) - (b.needMax - b.needT))[0];
    if (!p) return;
    this.demoTarget = p;
    const dx = p.x - this.cur.x, dy = p.y - this.cur.y;
    if (dy) { this.vpress(dy > 0 ? 'ArrowDown' : 'ArrowUp'); this.dcool = 0.35; return; }
    if (dx) { this.vpress(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); this.dcool = 0.35; return; }
    const right = { water: 'Digit1', bug: 'Digit2', trim: 'Digit3' }[p.need];
    if (T >= 14 && !this.demoSlip) { this.demoSlip = true; this.vpress(['Digit1', 'Digit2', 'Digit3'].find(k => k !== right)); this.dcool = 1.1; return; }
    this.vpress(right); this.dcool = 0.7;
  }
  init() {
    const r = rng((Math.random() * 0xffff) | 0); // online, Math.random is the room's seeded generator, so every browser grows the same garden
    this.rand = r;
    // Dễ: plants wait longer, fewer ask at once, a slip costs less time. div is set so a first-time team lands near
    // par on every difficulty; a very fast team reaches ~160 raw on Thường (halved above par by softCap).
    // Short spawn gaps make concurrent requests routine, so the team must triage instead of chaining one request at a time.
    this.E = TUNE[game.diff];
    this.plots = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
      this.plots.push({ x, y, type: S.PLANT_TYPES[(x + y * 2) % 4], stage: 1 + ((r() * 2.6) | 0), need: null, needT: 0, needMax: 7, wilt: 0, wet: 0, bounce: 0, sway: r() * 6 });
    this.cur = { x: 1, y: 1, dx: 1, dy: 1 }; this.dcool = 0.9; this.demoTarget = null; this.demoSlip = false; this.demoVictim = null; // dx/dy = drawn (tweened) position
    this.rep = {}; this.stun = 0; this.shake = 0;
    this.spawnT = 1.0; this.points = 0; this.lastTool = null; this.bonusPts = 0; this.cares = 0; this.misses = 0; this.wilts = 0; this.combo = 0; this.bestCombo = 0;
    this.parts = new Particles(); this.anims = []; this.hops = [0, 0, 0];
    this.lastSec = DURATION;
    this.bg = makeCanvas(W, H, g => {
      grassField(W, H, 21, g);
      // garden bed frame
      g.fillStyle = C.brownD; g.fillRect(GX - 7, GY - 7, COLS * CW + 14, ROWS * CH + 14);
      g.fillStyle = '#b57a4a'; g.fillRect(GX - 6, GY - 6, COLS * CW + 12, ROWS * CH + 12);
      g.fillStyle = '#8f5a35'; g.fillRect(GX - 3, GY - 3, COLS * CW + 6, ROWS * CH + 6);
      for (let x = GX - 6; x < GX + COLS * CW + 6; x += 10) { g.fillStyle = '#c98e5a'; g.fillRect(x, GY - 6, 5, 2); g.fillRect(x + 4, GY + ROWS * CH + 4, 5, 2); }
      // fence top row
      for (let x = GX - 30; x < GX + COLS * CW + 30; x += 16) drawAt(g, S.fenceH, x + 8, GY - 12);
      drawAt(g, S.shed, 40, 92); drawAt(g, S.tree, 440, 70); drawAt(g, S.treeRound, 20, 150); drawAt(g, S.pond, 432, 244);
      drawAt(g, S.wheelbarrow, 450, 150); drawAt(g, S.signPost, 98, 58);
      scatter(g, W, H, 9, 40, (x, y) => (x > GX - 30 && x < GX + COLS * CW + 30 && y > GY - 30 && y < GY + ROWS * CH + 70) || y < 30 || (x > 380 && y > 210) || (x < 70 && y < 100));
    });
  }
  plotXY(p) { return [GX + p.x * CW + CW / 2, GY + p.y * CH + CH / 2]; }
  get here() { return this.plots[this.cur.y * COLS + this.cur.x]; }

  // key with auto-repeat
  rpt(name, codes, dt) {
    const r = this.rep[name] || (this.rep[name] = { t: 0, held: false });
    if (input.down(...codes)) {
      if (!r.held) { r.held = true; r.t = 0.2; return true; }
      r.t -= dt; if (r.t <= 0) { r.t = 0.085; return true; }
      return false;
    }
    r.held = false; return false;
  }

  play(dt) {
    const left = DURATION - this.t;
    const sec = Math.ceil(left);
    this.setTimer(String(Math.max(0, sec)), left <= 10);
    if (sec < this.lastSec && sec <= 10 && sec > 0) A.sfx.tick();
    this.lastSec = sec;
    if (left <= 0) { this.finish(); return; }
    this.stun = Math.max(0, this.stun - dt);
    // movement (Đào: vertical, Mai: horizontal)
    const can = this.stun <= 0;
    const mv = (dx, dy, who) => {
      const nx = clamp(this.cur.x + dx, 0, COLS - 1), ny = clamp(this.cur.y + dy, 0, ROWS - 1);
      if (nx !== this.cur.x || ny !== this.cur.y) { this.cur.x = nx; this.cur.y = ny; A.sfx.move(); if (this.here.need) this.cue(2, 35, 'here', 0.25); }
      this.pulse(who); this.hops[who] = 0.2;
    };
    const u = this.rpt('u', K.up, dt), d = this.rpt('d', K.down, dt), l = this.rpt('l', K.left, dt), r = this.rpt('r', K.right, dt);
    if (can) { if (u) mv(0, -1, 0); if (d) mv(0, 1, 0); if (l) mv(-1, 0, 1); if (r) mv(1, 0, 1); }
    // tools (Lan)
    // pressing several tools at once counts as one slip, so mashing 1+2+3 never beats reading the bubble
    const tools = NEEDS.filter(tool => input.hit(...TOOL_KEYS[tool]));
    if (can && tools.length === 1) this.useTool(tools[0]);
    else if (can && tools.length > 1) { const [x, y] = this.plotXY(this.here); this.pulse(2); this.slip('Một dụng cụ thôi!', x, y); }
    // spawn needs
    const prog = this.t / DURATION;
    this.spawnT -= dt;
    const active = this.plots.filter(p => p.need).length, maxActive = this.E.max + Math.floor(prog * this.E.ramp);
    if (this.spawnT <= 0) {
      this.spawnT = this.E.gap - prog * 0.75 + this.rand() * 0.4;
      if (active < maxActive) {
        const free = this.plots.filter(p => !p.need && p.wilt <= 0 && p !== this.here);
        if (free.length) { const p = free[(this.rand() * free.length) | 0]; p.need = NEEDS[(this.rand() * 3) | 0]; p.needT = 0; p.warned = false; p.needMax = this.E.wait - prog * 2; p.bounce = 0.3; A.sfx.pop(); }
      }
    }
    // tick plants
    for (const p of this.plots) {
      p.bounce = Math.max(0, p.bounce - dt); p.wet = Math.max(0, p.wet - dt); p.sway += dt;
      if (p.wilt > 0) { p.wilt -= dt; continue; }
      if (p.need) {
        p.needT += dt;
        if (!p.warned && p.needT > p.needMax - 2.2) { p.warned = true; this.cue([0, 1], [30, 40, 30], 'urgent', 1.2); }
        if (p.needT >= p.needMax) {
          p.need = null; p.wilt = 3; p.stage = Math.max(0, p.stage - 1); this.wilts++; this.combo = 0; this.lastTool = null; A.sfx.wilt(); this.cue('all', [40, 30, 40], 'wilt', 1);
          const [x, y] = this.plotXY(p); this.parts.burst(x, y - 6, 8, { colors: [C.brownL, C.brown], speed: 25, g: 40 });
        }
      }
    }
    this.common(dt);
  }
  useTool(tool) {
    const p = this.here, [x, y] = this.plotXY(p);
    this.pulse(2); this.hops[2] = 0.25; A.sfx.tool();
    this.anims.push({ tool, x, y, t: 0 });
    if (p.need === tool) {
      p.need = null; p.bounce = 0.4; this.cares++;
      // combo = cares in a row with the same tool; switching tools starts a new chain, a slip or a wilt breaks it
      this.combo = tool === this.lastTool ? this.combo + 1 : 1; this.lastTool = tool;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const bonus = Math.min(20, (this.combo - 1) * 5); // +5, +10, +15, then +20 per care while the chain lasts
      this.bonusPts += bonus;
      let pts = 10 + bonus;
      if (p.stage < 3) p.stage++; else { pts += 5; this.parts.burst(x, y - 14, 10, { colors: [C.yellow, C.white, C.pinkL], speed: 50, g: 0 }); }
      this.points += pts; this.setScoreText(Math.floor(this.points / this.E.div));
      this.floatText(this.combo >= 2 ? `Combo x${this.combo} +${(pts / this.E.div).toFixed(1)}` : `+${(pts / this.E.div).toFixed(1)}`, x, y - 20, this.combo >= 2 ? C.yellow : C.white);
      if (tool === 'water') { p.wet = 4; A.sfx.water(); this.parts.burst(x, y - 4, 12, { colors: [C.water, C.white, C.skyL], speed: 30, g: 80, up: 20 }); }
      if (tool === 'bug') { A.sfx.catchBug(); this.parts.add({ x, y: y - 8, vx: 50 * (Math.random() < .5 ? -1 : 1), vy: -90, g: 220, life: 0.9, drag: 0, img: S.bug[0] }); }
      if (tool === 'trim') { A.sfx.snip(); this.parts.burst(x, y - 6, 12, { colors: [C.green, C.greenD, C.greenL], speed: 45, g: 90, up: 30 }); }
      A.sfx.ok();
      if (this.combo >= 3) { cheer(this.combo >= 5 ? 4 : 2); this.toast(`Combo ${{ water: 'tưới', bug: 'bắt sâu', trim: 'tỉa' }[tool]} x${this.combo}! 🌸`, 'good'); if (this.combo % 5 === 0) A.sfx.great(); }
    } else this.slip(p.need ? 'Sai dụng cụ!' : 'Cây ổn mà!', x, y);
  }
  slip(text, x, y) {
    this.misses++; this.combo = 0; this.lastTool = null; this.stun = this.E.stun; this.shake = 0.3; A.sfx.bad(); this.cue(2, 120);
    this.floatText(text, x, y - 20, C.pinkL);
  }
  // the HUD shows points on the same scale as the other rounds (100 = par); there is no ceiling
  finish() {
    this.end('Hết giờ!', { score: this.points / this.E.div, lines: [['Chăm đúng', `${this.cares} lần`], ['Combo cùng dụng cụ dài nhất', `x${this.bestCombo}`],
      ['Điểm thưởng combo', `+${Math.round(this.bonusPts / this.E.div)}`], ['Cây bị héo', `${this.wilts}`]] });
  }
  floatText(text, x, y, color) { this.anims.push({ text, x, y, color, t: 0 }); }
  common(dt) {
    this.parts.update(dt); this.shake = Math.max(0, this.shake - dt);
    for (const a of this.anims) a.t += dt; this.anims = this.anims.filter(a => a.t < (a.text ? 0.9 : 0.45));
    for (let i = 0; i < 3; i++) this.hops[i] = Math.max(0, this.hops[i] - dt);
    const k = Math.min(1, dt * 22); this.cur.dx += (this.cur.x - this.cur.dx) * k; this.cur.dy += (this.cur.y - this.cur.dy) * k;
  }
  idle(dt) { this.common(dt); for (const p of this.plots) p.sway += dt; }

  drawWorld(g) {
    g.drawImage(this.bg, 0, 0);
    const T = this.t;
    // plots and plants
    for (const p of this.plots) {
      const [x, y] = this.plotXY(p);
      drawAt(g, S.soilPlot(p.wet > 0), x, y + 13);
      if (p.need === 'trim') drawAt(g, S.weeds, x, y + 12);
      const mood = p.wilt > 0 ? 'wilt' : (p.need === 'water' ? 'thirsty' : 'ok');
      const sq = p.bounce > 0 ? 1 + Math.sin(p.bounce * 20) * 0.08 : 1;
      drawAt(g, S.plant(p.type, p.stage, mood), x + Math.round(Math.sin(p.sway * 1.6) * 0.6), y + 8, { sy: sq, sx: 2 - sq });
      if (p.need === 'trim') drawAt(g, S.weeds, x + 2, y + 9, { flip: true, sy: 0.8 });
      if (p.need === 'bug') drawAt(g, S.bug[((T * 4) | 0) % 2], x + 4 + Math.sin(T * 3) * 2, y - 2);
    }
    // need bubbles (on top of plants)
    for (const p of this.plots) {
      if (!p.need) continue;
      const [x, y] = this.plotXY(p);
      const urgent = p.needT > p.needMax - 2.2;
      const bob = Math.round(Math.sin(T * 5 + p.x) * 1.5) + (urgent ? Math.round(Math.sin(T * 40)) : 0);
      const pop = p.bounce > 0 ? 1 + p.bounce : 1;
      drawAt(g, S.bubble[p.need], x + 10, y - 10 + bob, { sx: pop, sy: pop });
      const k = 1 - p.needT / p.needMax;
      g.fillStyle = C.out; g.fillRect(x + 3, y - 9 + bob, 14, 3);
      g.fillStyle = k > .5 ? C.mint : k > .28 ? C.yellow : C.red; g.fillRect(x + 4, y - 8 + bob, Math.max(1, Math.round(12 * k)), 1);
    }
    // cursor
    const cx = GX + this.cur.dx * CW + CW / 2 + (this.shake > 0 ? Math.sin(this.shake * 60) * 2 : 0), cy = GY + this.cur.dy * CH + CH / 2;
    drawAt(g, S.cursorFrame[((T * 3) | 0) % 2], cx, cy, { ay: 0.5 });
    // tool swings & floating text
    for (const a of this.anims) {
      if (a.text) {
        const k = a.t / 0.9; g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center';
        g.fillStyle = C.out; g.fillText(a.text, a.x + 1, a.y - k * 14 + 1); g.fillStyle = a.color; g.fillText(a.text, a.x, a.y - k * 14);
        continue;
      }
      const k = a.t / 0.45;
      drawAt(g, S.tools[a.tool], a.x - 10, a.y - 14 - Math.sin(k * Math.PI) * 4, { ay: .5, rot: a.tool === 'water' ? -0.6 * Math.sin(k * Math.PI) : Math.sin(k * 12) * 0.3 });
    }
    this.parts.draw(g);
    // the three girls (role reminder): Đào, Mai, Lan
    const pos = [[W / 2 - 76, 226], [W / 2, 230], [W / 2 + 76, 226]];
    pos.forEach(([x, y], i) => {
      const hop = this.hops[i] > 0 ? Math.round(Math.sin((this.hops[i] / 0.25) * Math.PI) * 3) : 0;
      drawAt(g, S.girl(i, 'up', this.hops[i] > 0 ? 1 : 0, false), x, y - hop);
    });
  }
}

export default function () { register('garden', p => new Garden(p)); }
