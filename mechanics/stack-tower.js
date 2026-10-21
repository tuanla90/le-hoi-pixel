// Mechanic: stack a tower as a crane crew (8/3 round "Tháp quà").
// The rules live here; a theme dresses them with a skin (names, texts, art) — see themes/8-3/scenes/gifts.js.
//
// A block hangs from a trolley on a rail at the top and swings with every start and stop. After each release the trolley
// fetches the next block from the shelf at one end of the rail; role 0 drives it back over the tower, role 1 releases it, role 2 keeps the tower upright. A block that lands near the middle of the one
// below counts double (a combo builds while drops stay perfect); one that lands too far out slides off. Blocks off the
// centre pull the tower's lean their way, a taller tower tips faster, and role 2 pushes it back with Q/E. Lean too far
// and the top three blocks tumble down.
//
// skin = {
//   id                       scene id (also the round id in the theme)
//   colors                   [n] block colours (index stored on each block)
//   text                     player-facing strings (see the 8/3 skin)
//   demoScript               [{ at, text, focus: 'hook' | 'top' | 'level' | 'base' }]
//   art: {
//     background(g)          the room behind the tower (W × H)
//     rail(g)                the rail along the top (y ≈ LAYOUT.RAIL_Y)
//     trolley(g, x)          the trolley on the rail · block(g, x, y, w, h, color, alpha) one block, centred
//     base(g, x, y, w)       what the tower stands on, top surface at y
//     debris                 particle colours when blocks tumble
//   }
// }
import { input, K, key, W, H, cheer, game } from '../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { theme } from '../core/theme.js';

const DURATION = 60;
const RAIL_Y = 30, ROPE = 34, BH = 14;      // rail height, rope length, block height (px)
const BASE_X = 240, BASE_Y = 206, BASE_W = 70; // the tower's foot (screen at camera 0), clear of the role bar below
const TX0 = 70, TX1 = 410;                  // trolley range
const GRAV = 300;                           // pendulum gravity (px/s²): with ROPE that swings about once every 2 s
const FALL_G = 700;                         // a released block falls this fast
const RELOAD = 0.35;                        // seconds to hook the next block once the trolley reaches the shelf
const FETCH = 260;                          // px/s the trolley runs to the shelf by itself
const KEEP_TOP = 104;                       // the camera keeps the tower's top at least this far down the screen
export const LAYOUT = { RAIL_Y, ROPE, BH, BASE_X, BASE_Y, BASE_W, W, H };
const KEYS = { left: K.left, right: K.right, drop: ['ArrowDown', 'KeyS'], q: ['KeyQ'], e: ['KeyE'] };
// trolley: px/s · swing: how much the trolley's starts and stops swing the block · damp: swing damping
// w: block widths [min, max] · perfect: px from centre for a perfect drop · slide: share of the overlap that still holds
// torque: lean kick per px of offset · com: steady lean per px the tower's mass sits off centre · tip / tipH: how fast
// the lean grows (and how much more per block) · fix: Q/E strength · ldamp: lean damping · div: points per round point.
// div measured with bots (60 s): a perfect-drop team scores 410 / 260 / 160, a good one 350 / 250 / 130, an average one
// (looks up every 0.35 s, misses 15%) 245 / 225 / 160, a slow one 220 / 175 / 122 → about 145 / 130 / 115 / 90 round points.
const TUNE = {
  easy: { trolley: 110, swing: 0.16, damp: 1.0, w: [44, 52], perfect: 5, slide: 0.8, torque: 0.022, com: 0.0012, tip: 0.45, tipH: 0.03, fix: 3.0, ldamp: 2.4, div: 2.8 },
  normal: { trolley: 125, swing: 0.24, damp: 0.8, w: [38, 48], perfect: 4, slide: 0.72, torque: 0.028, com: 0.0016, tip: 0.55, tipH: 0.04, fix: 2.8, ldamp: 2.1, div: 2.0 },
  hard: { trolley: 140, swing: 0.32, damp: 0.65, w: [32, 44], perfect: 3, slide: 0.66, torque: 0.034, com: 0.002, tip: 0.65, tipH: 0.05, fix: 2.6, ldamp: 1.9, div: 1.25 },
};
const PTS = 10, BONUS = 5, BONUS_MAX = 15, LOSS = 6; // per block, per perfect in the combo (capped), per block that tumbles
const num = v => String(v).replace('.', ',');

export class StackTower extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const X = (this.skin = skin).text;
    this.diffInfo = Object.fromEntries(Object.entries(TUNE).map(([d, e]) => [d, X.diffInfo(e, num, d)]));
    this.desc = X.desc;
    this.tip = X.tip;
    this.scoreLabel = X.scoreLabel;
    this.initialScore = X.hud(0, 0);
    const keys = [key('←') + key('→') + ' / ' + key('A') + key('D'), key('↓') + ' / ' + key('S'), key('Q') + key('E')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = [[...KEYS.left, ...KEYS.right], KEYS.drop, [...KEYS.q, ...KEYS.e]];
    // ---- guided demo
    this.demoKeys = [[['ArrowLeft', X.demoKeys[0]], ['ArrowRight', X.demoKeys[1]]], [['ArrowDown', X.demoKeys[2]]], [['KeyQ', 'Q ↶'], ['KeyE', 'E ↷']]];
    const FOCUS = {
      hook: () => ({ x: this.hangX(), y: RAIL_Y + ROPE, r: 30 }),
      top: () => ({ x: this.topX(), y: this.topY(), r: 32 }),
      level: () => ({ x: clamp(Math.round(this.topX()) - 62, 28, W - 30), y: clamp(Math.round(this.topY()) - 2, 46, 238), r: 26 }),
      base: () => ({ x: BASE_X, y: Math.min(BASE_Y, this.topY() + 40), r: 50 }),
    };
    this.demoScript = skin.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
    this.demoSpeed = 0.8;
  }
  // ---- geometry
  hangX() { return this.trolley.x + Math.sin(this.swing.a) * ROPE; }
  top() { return this.stack[this.stack.length - 1] || { x: BASE_X, w: BASE_W }; }
  topX() { return this.top().x; }
  topY() { return BASE_Y + this.cam - this.stack.length * BH; } // the tower's top surface on screen
  // demo bot (and the calibration bots): drive over the tower, drop once the block is within `tol` px of the top and
  // swinging slower than `calm` rad/s; balance unless lazy. The defaults aim for a perfect drop.
  aimKeys({ lazy = false, tol = this.E.perfect * 0.7, calm = 0.25, still = 12 } = {}) {
    const out = [], v = this.trolley.v;
    const want = this.topX() - Math.sin(this.swing.a) * ROPE * 0.2, dx = want - this.trolley.x;
    // let go early: the trolley coasts about v / 7 px after the key is released
    if (Math.abs(dx) > 2.5 + (Math.sign(v) === Math.sign(dx) ? Math.abs(v) / 7 : 0)) out.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
    if (this.hanging && !this.falling && Math.abs(this.hangX() - this.topX()) < tol && Math.abs(this.swing.v) < calm && Math.abs(v) < still) out.push('ArrowDown');
    const p = this.lean + 0.35 * this.leanV;
    if (!lazy) { if (p > 0.12) out.push('KeyQ'); if (p < -0.12) out.push('KeyE'); }
    return out;
  }
  demoSetup() { this.demoSlip = 0; }
  // demo bot: plays well, except one drop released early (~12 s, to show the lean) and a lazy balancer from 19 s until the tower tumbles
  demoStep() {
    const T = this.demo.t, keys = this.aimKeys({ lazy: T >= 19 && !this.collapses, tol: 6, calm: 0.6, still: 20 });
    if (T >= 11 && T < 13 && !this.demoSlip && this.hanging && !this.falling && Math.abs(this.hangX() - this.topX()) > 9 && Math.abs(this.hangX() - this.topX()) < 16) { this.demoSlip = 1; keys.push('ArrowDown'); }
    if (T >= 19 && !this.collapses) { const wrong = this.lean > 0 ? 'KeyE' : 'KeyQ'; if (T >= 22) keys.push(wrong); }
    ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'KeyQ', 'KeyE'].forEach(k => this.vhold(k, keys.includes(k)));
    if (keys.includes('ArrowDown')) this.vpress('ArrowDown');
  }
  init() {
    this.E = TUNE[game.diff];
    this.seed = 31 + (game.diff === 'hard' ? 7 : game.diff === 'easy' ? 3 : 0); // the same blocks every try
    this.trolley = { x: BASE_X, v: 0 }; this.swing = { a: 0, v: 0 };
    this.stack = []; this.hanging = null; this.falling = null; this.reload = 0.3; this.cam = 0; this.camTo = 0; this.shelf = null;
    this.lean = 0; this.leanV = 0; this.safe = 0;
    this.points = 0; this.perfects = 0; this.combo = 0; this.bestCombo = 0; this.misses = 0; this.collapses = 0; this.lost = 0;
    this.fx = new Particles(); this.floats = []; this.tumbling = []; this.anim = 0; this.hops = [0, 0, 0]; this.lastSec = DURATION; this.done = false;
    this.bg = makeCanvas(W, H, g => this.skin.art.background(g));
  }
  rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  newBlock() {
    const [w0, w1] = this.E.w;
    return { w: Math.round(w0 + this.rand() * (w1 - w0)), c: Math.floor(this.rand() * this.skin.colors.length) };
  }
  float(text, x, y, color = C.white, size = 1) { this.floats.push({ text, x, y, color, size, t: 0 }); }

  play(dt) {
    const E = this.E, X = this.skin.text, left = DURATION - this.t, sec = Math.ceil(left);
    this.setTimer(String(Math.max(0, sec)), left <= 10);
    if (sec < this.lastSec && sec <= 10 && sec > 0) A.sfx.tick();
    this.lastSec = sec;
    if (left <= 0) { this.finish(); return; }
    // role 0: the trolley; its starts and stops swing the hanging block. With no block on the hook it runs to a shelf
    // at either end of the rail by itself and hooks the next one there
    const dir = (input.down(...KEYS.right) ? 1 : 0) - (input.down(...KEYS.left) ? 1 : 0);
    if (dir) { this.pulse(0); this.hops[0] = 0.2; }
    const v0 = this.trolley.v, tr = this.trolley;
    if (!this.hanging) {
      if (this.shelf == null) this.shelf = this.rand() < 0.5 ? TX0 : TX1;
      const d = this.shelf - tr.x; tr.v = Math.sign(d) * Math.min(FETCH, Math.abs(d) / dt); tr.x += tr.v * dt;
      if (Math.abs(this.shelf - tr.x) < 0.5) { tr.x = this.shelf; tr.v = 0; this.reload -= dt; }
      if (this.reload <= 0) { this.hanging = this.newBlock(); this.shelf = null; this.swing.a = 0; this.swing.v = 0; A.sfx.pop(); }
    } else {
      tr.v += (dir * E.trolley - tr.v) * Math.min(1, 7 * dt);
      tr.x = clamp(tr.x + tr.v * dt, TX0, TX1);
      if (tr.x === TX0 || tr.x === TX1) tr.v = 0;
    }
    const acc = this.hanging ? (tr.v - v0) / dt : 0;
    const s = this.swing;
    s.v += (-(GRAV / ROPE) * Math.sin(s.a) - (acc / ROPE) * Math.cos(s.a) * E.swing) * dt;
    s.v *= 1 - E.damp * dt; s.a += s.v * dt;
    // role 1: release
    if (input.hit(...KEYS.drop)) {
      this.pulse(1); this.hops[1] = 0.25;
      if (this.hanging && !this.falling) {
        this.falling = { ...this.hanging, x: this.hangX(), y: RAIL_Y + ROPE + BH / 2, vx: Math.cos(s.a) * s.v * ROPE * 0.35, vy: 0 };
        this.hanging = null; this.reload = RELOAD; A.sfx.tool();
      }
    }
    if (this.falling) this.fall(dt);
    // role 2: the tower leans with its off-centre mass and grows tippier with height; Q/E push it back
    const q = input.down(...KEYS.q), e = input.down(...KEYS.e);
    if (q || e) this.pulse(2);
    if (this.safe > 0) { this.safe -= dt; this.lean *= 1 - 4 * dt; this.leanV = 0; }
    else if (this.stack.length) {
      let com = 0; for (const b of this.stack) com += b.x - BASE_X; com /= this.stack.length;
      this.leanV += (this.lean * (E.tip + E.tipH * this.stack.length) + com * E.com * this.stack.length) * dt;
      this.leanV += ((e ? 1 : 0) - (q ? 1 : 0)) * E.fix * dt;
      this.leanV *= 1 - E.ldamp * dt;
      this.lean += this.leanV * dt;
      if (Math.abs(this.lean) > 0.65) this.cue(2, 60, 'lean', 0.7);
      if (Math.abs(this.lean) >= 1) this.collapse();
    }
    // the camera keeps the top of the tower in view
    this.camTo = Math.max(0, this.stack.length * BH - (BASE_Y - KEEP_TOP));
    this.common(dt);
  }
  fall(dt) {
    const E = this.E, X = this.skin.text, f = this.falling;
    f.vy += FALL_G * dt; f.y += f.vy * dt; f.x += f.vx * dt;
    const topY = this.topY();
    if (f.y + BH / 2 < topY) return;
    const top = this.top(), off = f.x - top.x;
    this.falling = null;
    if (Math.abs(off) > (top.w + f.w) / 2 * E.slide) { // slides off the edge
      this.misses++; this.combo = 0; A.sfx.bad(); this.cue(1, 120);
      this.tumbling.push({ ...f, y: topY - BH / 2, vx: Math.sign(off) * 60, vy: -60, rot: 0, vr: Math.sign(off) * 5 });
      this.float(X.slid, f.x, topY - 16, C.pinkL);
      this.hudScore(); return;
    }
    this.stack.push({ x: f.x, w: f.w, c: f.c });
    let pts = PTS;
    if (Math.abs(off) <= E.perfect) {
      this.perfects++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const b = Math.min(BONUS_MAX, BONUS * this.combo); pts += b;
      this.float(this.combo > 1 ? X.perfectCombo(this.combo, pts) : X.perfect(pts), f.x, topY - 18, C.yellow);
      A.sfx.great(); if (this.combo >= 3) cheer(this.combo >= 5 ? 3 : 1);
      this.fx.burst(f.x, topY, 10, { colors: [C.yellow, C.white], speed: 40, g: 0 });
    } else {
      this.combo = 0; A.sfx.pickup(); this.float(`+${pts}`, f.x, topY - 18, C.white);
    }
    this.points += pts;
    if (this.safe <= 0) this.leanV += off * E.torque;
    this.hudScore();
  }
  collapse() {
    const X = this.skin.text, n = Math.min(3, this.stack.length), topY = this.topY();
    for (let i = 0; i < n; i++) {
      const b = this.stack.pop(), y = topY + i * BH + BH / 2;
      this.tumbling.push({ ...b, y, vx: (this.lean > 0 ? 1 : -1) * (40 + i * 25), vy: -40 - i * 20, rot: 0, vr: (this.lean > 0 ? 1 : -1) * (3 + i) });
    }
    this.lost += n; this.collapses++; this.points -= n * LOSS; this.combo = 0;
    this.lean = 0; this.leanV = 0; this.safe = 1.2;
    A.sfx.drop(); this.cue('all', [120, 60, 120]);
    this.fx.burst(BASE_X, topY, 18, { colors: this.skin.art.debris, speed: 70, g: 120 });
    this.toast(X.collapse(n * LOSS), 'bad');
    this.hudScore();
  }
  hudScore() { this.setScoreText(this.skin.text.hud(this.stack.length, this.perfects)); }
  finish() {
    if (this.done) return; this.done = true;
    const X = this.skin.text;
    this.end(X.banner, { score: this.points / this.E.div, lines: [[X.standing, `${this.stack.length}`], [X.perfects, `${this.perfects} · combo dài nhất ${this.bestCombo}`], [X.slides, `${this.misses}`], [X.collapses, this.collapses ? `${this.collapses} lần (−${this.lost * LOSS})` : X.collapsesNone]] });
  }
  common(dt) {
    this.anim += dt; this.fx.update(dt);
    this.cam += (this.camTo - this.cam) * Math.min(1, 5 * dt);
    for (let i = 0; i < 3; i++) this.hops[i] = Math.max(0, this.hops[i] - dt);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < 0.9);
    for (const b of this.tumbling) { b.vy += FALL_G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; }
    this.tumbling = this.tumbling.filter(b => b.y < H + 30);
  }
  idle(dt) {
    this.common(dt);
    this.swing.v += -(GRAV / ROPE) * Math.sin(this.swing.a) * dt; this.swing.v *= 1 - this.E.damp * dt; this.swing.a += this.swing.v * dt;
  }

  // ------------------------------------------------ drawing
  drawWorld(g) {
    const art = this.skin.art, CL = this.skin.colors, T = this.anim;
    g.drawImage(this.bg, 0, 0);
    // the tower, leaning about its foot
    const footY = BASE_Y + this.cam;
    g.save(); g.translate(BASE_X, footY); g.rotate(this.lean * 0.12); g.translate(-BASE_X, -footY);
    art.base(g, BASE_X, footY, BASE_W);
    this.stack.forEach((b, i) => art.block(g, b.x, footY - i * BH - BH / 2, b.w, BH, CL[b.c], 1));
    g.restore();
    // blocks tumbling off
    for (const b of this.tumbling) { g.save(); g.translate(b.x, b.y); g.rotate(b.rot); art.block(g, 0, 0, b.w, BH, CL[b.c], 1); g.restore(); }
    // rail, trolley, rope and the hanging block; a guide line down to the tower's top
    art.rail(g);
    const tx = this.trolley.x, hx = this.hangX(), hy = RAIL_Y + Math.cos(this.swing.a) * ROPE;
    if (this.hanging) {
      const topY = this.topY(), ok = Math.abs(hx - this.topX()) <= this.E.perfect;
      g.fillStyle = ok ? C.mint : '#ffffff88'; for (let y = hy + BH; y < topY - 2; y += 6) g.fillRect(Math.round(hx), y, 1, 3);
    }
    g.strokeStyle = C.out; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, RAIL_Y + 2); g.lineTo(hx, hy); g.stroke();
    art.trolley(g, tx);
    if (this.hanging) { g.save(); g.translate(hx, hy + BH / 2); g.rotate(this.swing.a); art.block(g, 0, 0, this.hanging.w, BH, CL[this.hanging.c], 1); g.restore(); }
    if (this.falling) art.block(g, this.falling.x, this.falling.y, this.falling.w, BH, CL[this.falling.c], 1);
    // spirit level for role 2, beside the top of the tower (where everyone is looking anyway)
    const lx = clamp(Math.round(this.topX()) - 82, 8, W - 50), ly = clamp(Math.round(this.topY()) - 4, 44, 236), b = Math.round(clamp(this.lean, -1, 1) * 18);
    g.fillStyle = C.out; g.fillRect(lx - 1, ly - 1, 42, 6); g.fillStyle = C.mintL; g.fillRect(lx, ly, 40, 4);
    g.fillStyle = '#ffb3c4'; g.fillRect(lx, ly, 6, 4); g.fillRect(lx + 34, ly, 6, 4);
    g.fillStyle = C.outSoft; g.fillRect(lx + 19, ly, 2, 4);
    g.fillStyle = Math.abs(this.lean) > 0.7 ? C.red : Math.abs(this.lean) > 0.4 ? C.yellow : C.white; g.fillRect(lx + 18 + b, ly, 4, 4);
    if (Math.abs(this.lean) > 0.45 && ((T * 6) | 0) % 2) {
      g.font = 'bold 9px "Baloo 2", sans-serif'; g.textAlign = 'center'; const k = this.lean > 0 ? 'Q' : 'E', kx = this.lean > 0 ? lx - 8 : lx + 48;
      g.fillStyle = C.out; g.fillText(k, kx + 1, ly + 6); g.fillStyle = C.yellow; g.fillText(k, kx, ly + 5);
    }
    // the crew: role 0 by the trolley's controls, role 1 by the release lever, role 2 at the tower's foot
    [[50, 262], [432, 262], [372, 262]].forEach(([x, y], i) => {
      const hop = this.hops[i] > 0 ? Math.round(Math.sin((this.hops[i] / 0.25) * Math.PI) * 3) : 0;
      drawAt(g, theme.avatar(i, 'up', this.hops[i] > 0 ? 1 : 0, i === 2), x, y - hop);
    });
    this.fx.draw(g);
    for (const f of this.floats) {
      const k = f.t / 0.9; g.font = `bold ${Math.round(8 * (f.size || 1))}px "Baloo 2", sans-serif`; g.textAlign = 'center';
      g.fillStyle = C.out; g.fillText(f.text, f.x + 1, f.y - k * 12 + 1); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y - k * 12);
    }
  }
}
