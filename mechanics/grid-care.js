// Mechanic: tend a 4×4 grid against the clock (20/10 round 1 "Trồng cây").
// The rules live here; a theme dresses them with a skin (names, texts, art) — see themes/20-10/scenes/garden.js.
//
// Cells call for one of three kinds of help (a bubble with a countdown). Role 0 moves the frame up/down, role 1 left/right,
// role 2 uses one of three tools on the cell under the frame. The right tool helps the cell grow a stage and scores; the
// same tool several times in a row builds a combo. A wrong tool, a tool on a healthy cell or two tools at once is a slip:
// the frame freezes for a moment and the combo breaks. A cell nobody helps in time wilts (and shrinks a stage).
//
// skin = {
//   id                       scene id (also the round id in the theme)
//   kinds[]                  what grows in the cells (cell.kind), laid out (x + 2y) % kinds.length
//   needs[3]                 { id, verb }: what a cell can ask for; tool i (keys 1 · 2 · 3) answers need i; verb names a combo
//   text                     player-facing strings (see the 20/10 skin)
//   demoScript               [{ at, text, focus: 'need' | 'cursor' | 'victim' }]
//   art: {
//     background(g)          the static scene around the grid (use LAYOUT)
//     cell(g, c, x, y, t)    one cell and its growth; c = { kind, stage 0–3, need, wilt, bounce, sway, cared, caredBy }
//     bubble(i)              sprite of need i's bubble
//     tool(i)                sprite of tool i (swung over the cell, shown next to its key)
//     cursor(frame)          the selection frame (2 frames)
//     care(i, x, y, fx)      sound and particles when tool i helps a cell (fx: Particles)
//     wilt                   particle colours when a cell wilts
//   }
// }
import { input, K, key, img, W, H, cheer, game } from '../core/main.js';
import { C, makeCanvas, drawAt, rng, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { theme } from '../core/theme.js';

// a square grid: role 0 (up/down) and role 1 (left/right) walk the frame about the same number of steps
const COLS = 4, ROWS = 4, CW = 48, CH = 32;
export const LAYOUT = { COLS, ROWS, CW, CH, GX: Math.round((W - COLS * CW) / 2), GY: 60 };
const { GX, GY } = LAYOUT;
const DURATION = 60;
const TOOL_KEYS = [['Digit1', 'KeyJ', 'Numpad1'], ['Digit2', 'KeyK', 'Numpad2'], ['Digit3', 'KeyL', 'Numpad3']];
// wait: seconds a cell waits at the start (2 s less by the end) · gap: seconds between requests · max/ramp: cells asking
// at once (start → +ramp by the end) · stun: freeze after a slip · div: points per round point
const TUNE = {
  easy: { wait: 9.5, gap: 1.45, max: 2, ramp: 2, stun: 0.35, div: 5 },
  normal: { wait: 8.2, gap: 1.25, max: 3, ramp: 2, stun: 0.5, div: 5.5 },
  hard: { wait: 7.8, gap: 1.1, max: 4, ramp: 2, stun: 0.6, div: 6 },
};
const num = v => String(Math.round(v * 10) / 10).replace('.', ',');

export class GridCare extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const S = this.skin = skin, X = skin.text;
    this.diffInfo = Object.fromEntries(Object.entries(TUNE).map(([d, e]) => [d, X.diffInfo(e, num, d)]));
    this.desc = X.desc;
    this.tip = X.tip;
    const t = i => img(S.art.tool(i), 'tool-ico');
    const keys = [key('W') + key('S') + ' / ' + key('↑') + key('↓'), key('A') + key('D') + ' / ' + key('←') + key('→'), [0, 1, 2].map(i => key(String(i + 1)) + t(i)).join('')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = [[...K.up, ...K.down], [...K.left, ...K.right], TOOL_KEYS.flat()];
    // ---- guided demo
    this.demoKeys = [[['ArrowUp', '↑'], ['ArrowDown', '↓']], [['ArrowLeft', '←'], ['ArrowRight', '→']], [0, 1, 2].map(i => [TOOL_KEYS[i][0], (i + 1) + t(i)])];
    const needF = r => () => { const c = this.demoTarget || this.cells.find(q => q.need); if (!c) return null; const [x, y] = this.cellXY(c); return { x, y: y - 2, r }; };
    const curF = () => ({ x: GX + this.cur.dx * CW + CW / 2, y: GY + this.cur.dy * CH + CH / 2, r: 26 });
    const victimF = () => { const c = this.demoVictim; if (!c) return curF(); const [x, y] = this.cellXY(c); return { x: x + 4, y: y - 6, r: 24 }; };
    const FOCUS = { need: needF(26), cursor: curF, victim: victimF };
    this.demoScript = S.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
  }
  // demo bot: walks the frame to the most urgent cell one deliberate step at a time, then uses the right tool.
  // It slips on purpose so viewers see the penalties: one wrong tool (~14s) and one forgotten cell that wilts (~19s).
  demoStep(dt) {
    const T = this.demo.t;
    if (T >= 19 && !this.demoVictim) {
      const v = this.cells.filter(q => q.need && q !== this.demoTarget).sort((a, b) => b.needT - a.needT)[0];
      if (v) { this.demoVictim = v; v.needT = Math.max(v.needT, v.needMax - 3.2); }
    }
    this.dcool = (this.dcool ?? 0.9) - dt;
    if (this.dcool > 0) return;
    const c = this.cells.filter(q => q.need && q !== this.demoVictim).sort((a, b) => (a.needMax - a.needT) - (b.needMax - b.needT))[0];
    if (!c) return;
    this.demoTarget = c;
    const dx = c.x - this.cur.x, dy = c.y - this.cur.y;
    if (dy) { this.vpress(dy > 0 ? 'ArrowDown' : 'ArrowUp'); this.dcool = 0.35; return; }
    if (dx) { this.vpress(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); this.dcool = 0.35; return; }
    const right = TOOL_KEYS[this.needIndex(c.need)][0];
    if (T >= 14 && !this.demoSlip) { this.demoSlip = true; this.vpress(TOOL_KEYS.map(k => k[0]).find(k => k !== right)); this.dcool = 1.1; return; }
    this.vpress(right); this.dcool = 0.7;
  }
  init() {
    const r = rng((Math.random() * 0xffff) | 0); // online, Math.random is the room's seeded generator, so every browser grows the same grid
    this.rand = r;
    // Dễ: cells wait longer, fewer ask at once, a slip costs less time. div is set so a first-time team lands near
    // par on every difficulty; a very fast team reaches ~160 raw on Thường (halved above par by softCap).
    // Short spawn gaps make concurrent requests routine, so the team must triage instead of chaining one request at a time.
    this.E = TUNE[game.diff];
    const kinds = this.skin.kinds;
    this.cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
      this.cells.push({ x, y, kind: kinds[(x + y * 2) % kinds.length], stage: 1 + ((r() * 2.6) | 0), need: null, needT: 0, needMax: 7, wilt: 0, cared: 0, caredBy: -1, bounce: 0, sway: r() * 6 });
    this.cur = { x: 1, y: 1, dx: 1, dy: 1 }; this.dcool = 0.9; this.demoTarget = null; this.demoSlip = false; this.demoVictim = null; // dx/dy = drawn (tweened) position
    this.rep = {}; this.stun = 0; this.shake = 0;
    this.spawnT = 1.0; this.points = 0; this.lastTool = null; this.bonusPts = 0; this.cares = 0; this.misses = 0; this.wilts = 0; this.combo = 0; this.bestCombo = 0;
    this.fx = new Particles(); this.anims = []; this.hops = [0, 0, 0];
    this.lastSec = DURATION;
    this.bg = makeCanvas(W, H, g => this.skin.art.background(g));
  }
  needIndex(id) { return this.skin.needs.findIndex(n => n.id === id); }
  cellXY(c) { return [GX + c.x * CW + CW / 2, GY + c.y * CH + CH / 2]; }
  get here() { return this.cells[this.cur.y * COLS + this.cur.x]; }

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
    const X = this.skin.text, left = DURATION - this.t;
    const sec = Math.ceil(left);
    this.setTimer(String(Math.max(0, sec)), left <= 10);
    if (sec < this.lastSec && sec <= 10 && sec > 0) A.sfx.tick();
    this.lastSec = sec;
    if (left <= 0) { this.finish(); return; }
    this.stun = Math.max(0, this.stun - dt);
    // movement (role 0: vertical, role 1: horizontal)
    const can = this.stun <= 0;
    const mv = (dx, dy, who) => {
      const nx = clamp(this.cur.x + dx, 0, COLS - 1), ny = clamp(this.cur.y + dy, 0, ROWS - 1);
      if (nx !== this.cur.x || ny !== this.cur.y) { this.cur.x = nx; this.cur.y = ny; A.sfx.move(); if (this.here.need) this.cue(2, 35, 'here', 0.25); }
      this.pulse(who); this.hops[who] = 0.2;
    };
    const u = this.rpt('u', K.up, dt), d = this.rpt('d', K.down, dt), l = this.rpt('l', K.left, dt), r = this.rpt('r', K.right, dt);
    if (can) { if (u) mv(0, -1, 0); if (d) mv(0, 1, 0); if (l) mv(-1, 0, 1); if (r) mv(1, 0, 1); }
    // tools (role 2)
    // pressing several tools at once counts as one slip, so mashing 1+2+3 never beats reading the bubble
    const tools = [0, 1, 2].filter(i => input.hit(...TOOL_KEYS[i]));
    if (can && tools.length === 1) this.useTool(tools[0]);
    else if (can && tools.length > 1) { const [x, y] = this.cellXY(this.here); this.pulse(2); this.slip(X.oneTool, x, y); }
    // spawn needs
    const prog = this.t / DURATION;
    this.spawnT -= dt;
    const active = this.cells.filter(c => c.need).length, maxActive = this.E.max + Math.floor(prog * this.E.ramp);
    if (this.spawnT <= 0) {
      this.spawnT = this.E.gap - prog * 0.75 + this.rand() * 0.4;
      if (active < maxActive) {
        const free = this.cells.filter(c => !c.need && c.wilt <= 0 && c !== this.here);
        if (free.length) { const c = free[(this.rand() * free.length) | 0]; c.need = this.skin.needs[(this.rand() * 3) | 0].id; c.needT = 0; c.warned = false; c.needMax = this.E.wait - prog * 2; c.bounce = 0.3; A.sfx.pop(); }
      }
    }
    // tick cells
    for (const c of this.cells) {
      c.bounce = Math.max(0, c.bounce - dt); c.cared = Math.max(0, c.cared - dt); c.sway += dt;
      if (c.wilt > 0) { c.wilt -= dt; continue; }
      if (c.need) {
        c.needT += dt;
        if (!c.warned && c.needT > c.needMax - 2.2) { c.warned = true; this.cue([0, 1], [30, 40, 30], 'urgent', 1.2); }
        if (c.needT >= c.needMax) {
          c.need = null; c.wilt = 3; c.stage = Math.max(0, c.stage - 1); this.wilts++; this.combo = 0; this.lastTool = null; A.sfx.wilt(); this.cue('all', [40, 30, 40], 'wilt', 1);
          const [x, y] = this.cellXY(c); this.fx.burst(x, y - 6, 8, { colors: this.skin.art.wilt, speed: 25, g: 40 });
        }
      }
    }
    this.common(dt);
  }
  useTool(i) {
    const X = this.skin.text, c = this.here, [x, y] = this.cellXY(c), id = this.skin.needs[i].id;
    this.pulse(2); this.hops[2] = 0.25; A.sfx.tool();
    this.anims.push({ tool: i, x, y, t: 0 });
    if (c.need === id) {
      c.need = null; c.bounce = 0.4; this.cares++;
      // combo = cares in a row with the same tool; switching tools starts a new chain, a slip or a wilt breaks it
      this.combo = id === this.lastTool ? this.combo + 1 : 1; this.lastTool = id;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const bonus = Math.min(20, (this.combo - 1) * 5); // +5, +10, +15, then +20 per care while the chain lasts
      this.bonusPts += bonus;
      let pts = 10 + bonus;
      if (c.stage < 3) c.stage++; else { pts += 5; this.fx.burst(x, y - 14, 10, { colors: [C.yellow, C.white, C.pinkL], speed: 50, g: 0 }); }
      this.points += pts; this.setScoreText(Math.floor(this.points / this.E.div));
      this.floatText(this.combo >= 2 ? `Combo x${this.combo} +${(pts / this.E.div).toFixed(1)}` : `+${(pts / this.E.div).toFixed(1)}`, x, y - 20, this.combo >= 2 ? C.yellow : C.white);
      c.cared = 4; c.caredBy = i;
      this.skin.art.care(i, x, y, this.fx);
      A.sfx.ok();
      if (this.combo >= 3) { cheer(this.combo >= 5 ? 4 : 2); this.toast(X.combo(this.skin.needs[i].verb, this.combo), 'good'); if (this.combo % 5 === 0) A.sfx.great(); }
    } else this.slip(c.need ? X.wrongTool : X.noNeed, x, y);
  }
  slip(text, x, y) {
    this.misses++; this.combo = 0; this.lastTool = null; this.stun = this.E.stun; this.shake = 0.3; A.sfx.bad(); this.cue(2, 120);
    this.floatText(text, x, y - 20, C.pinkL);
  }
  // the HUD shows points on the same scale as the other rounds (100 = par); there is no ceiling
  finish() {
    const X = this.skin.text;
    this.end(X.banner, { score: this.points / this.E.div, lines: [[X.cares, `${this.cares} lần`], [X.bestCombo, `x${this.bestCombo}`],
      [X.bonus, `+${Math.round(this.bonusPts / this.E.div)}`], [X.wilts, `${this.wilts}`]] });
  }
  floatText(text, x, y, color) { this.anims.push({ text, x, y, color, t: 0 }); }
  common(dt) {
    this.fx.update(dt); this.shake = Math.max(0, this.shake - dt);
    for (const a of this.anims) a.t += dt; this.anims = this.anims.filter(a => a.t < (a.text ? 0.9 : 0.45));
    for (let i = 0; i < 3; i++) this.hops[i] = Math.max(0, this.hops[i] - dt);
    const k = Math.min(1, dt * 22); this.cur.dx += (this.cur.x - this.cur.dx) * k; this.cur.dy += (this.cur.y - this.cur.dy) * k;
  }
  idle(dt) { this.common(dt); for (const c of this.cells) c.sway += dt; }

  drawWorld(g) {
    const art = this.skin.art;
    g.drawImage(this.bg, 0, 0);
    const T = this.t;
    for (const c of this.cells) { const [x, y] = this.cellXY(c); art.cell(g, c, x, y, T); }
    // need bubbles (on top of the cells)
    for (const c of this.cells) {
      if (!c.need) continue;
      const [x, y] = this.cellXY(c);
      const urgent = c.needT > c.needMax - 2.2;
      const bob = Math.round(Math.sin(T * 5 + c.x) * 1.5) + (urgent ? Math.round(Math.sin(T * 40)) : 0);
      const pop = c.bounce > 0 ? 1 + c.bounce : 1;
      drawAt(g, art.bubble(this.needIndex(c.need)), x + 10, y - 10 + bob, { sx: pop, sy: pop });
      const k = 1 - c.needT / c.needMax;
      g.fillStyle = C.out; g.fillRect(x + 3, y - 9 + bob, 14, 3);
      g.fillStyle = k > .5 ? C.mint : k > .28 ? C.yellow : C.red; g.fillRect(x + 4, y - 8 + bob, Math.max(1, Math.round(12 * k)), 1);
    }
    // cursor
    const cx = GX + this.cur.dx * CW + CW / 2 + (this.shake > 0 ? Math.sin(this.shake * 60) * 2 : 0), cy = GY + this.cur.dy * CH + CH / 2;
    drawAt(g, art.cursor(((T * 3) | 0) % 2), cx, cy, { ay: 0.5 });
    // tool swings & floating text
    for (const a of this.anims) {
      if (a.text) {
        const k = a.t / 0.9; g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center';
        g.fillStyle = C.out; g.fillText(a.text, a.x + 1, a.y - k * 14 + 1); g.fillStyle = a.color; g.fillText(a.text, a.x, a.y - k * 14);
        continue;
      }
      const k = a.t / 0.45;
      drawAt(g, art.tool(a.tool), a.x - 10, a.y - 14 - Math.sin(k * Math.PI) * 4, { ay: .5, rot: a.tool === 0 ? -0.6 * Math.sin(k * Math.PI) : Math.sin(k * 12) * 0.3 });
    }
    this.fx.draw(g);
    // the three players' characters below the grid (role reminder)
    const pos = [[W / 2 - 76, 226], [W / 2, 230], [W / 2 + 76, 226]];
    pos.forEach(([x, y], i) => {
      const hop = this.hops[i] > 0 ? Math.round(Math.sin((this.hops[i] / 0.25) * Math.PI) * 3) : 0;
      drawAt(g, theme.avatar(i, 'up', this.hops[i] > 0 ? 1 : 0, false), x, y - hop);
    });
  }
}
