// Mechanic: three flashlights against creatures creeping in from the dark (Halloween round "Soi đèn đuổi ma").
// The rules live here; a theme dresses them with a skin (names, texts, art) — see themes/halloween/scenes/ghosts.js.
//
// The three players huddle at the bottom of a dark screen, each turning one beam with two buttons. Creatures drift in
// from the edges towards them. A small one wears one player's colour and only that player's beam drives it away; a big
// one needs two beams on it at once, the king all three. Any beam slows a creature down, so a teammate can hold one off
// while its owner turns round. A creature that reaches the players scares them and costs points.
//
// skin = {
//   id                       scene id (also the round id in the theme)
//   text                     player-facing strings (see the Halloween skin)
//   demoScript               [{ at, text, focus: 'kids' | 'small' | 'big' | 'king' }]
//   art: {
//     background(g)          the static night scene (players stand at HOME)
//     creature(kind, colour, frame)   sprite of a 'small' (tinted with a player's colour), 'big' or 'king' creature
//     banish                 particle colours when a creature is driven away
//   }
// }
import { input, key, W, H, cheer, game } from '../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { theme } from '../core/theme.js';

const DURATION = 60;
// per role: [turn left (counter-clockwise), turn right]
const KEYS = [[['KeyA'], ['KeyD']], [['ArrowLeft'], ['ArrowRight']], [['KeyJ'], ['KeyL']]];
export const LAYOUT = { HOME: { x: W / 2, y: 232 } };
const { HOME } = LAYOUT;
const ORIGINS = [-26, 0, 26].map(dx => ({ x: HOME.x + dx, y: HOME.y - 14 })); // where each beam leaves its torch
const START = [140, 90, 40];             // beam angles at the start (degrees, 90 = straight up, 180 = left)
const MIN_A = 10, MAX_A = 170;          // the beams sweep the upper half
const REACH = 320;                      // beam length (px)
const SPAWN_R = 255, CATCH_R = 30;      // creatures appear this far from HOME and scare the players this close
const DEG = Math.PI / 180;
// need: beams at once to hurt it · hp: seconds of enough light to drive it away · speed: × the round's creep speed
const KINDS = {
  small: { need: 1, hp: 0.7, speed: 1, pts: 10, r: 7 },
  big: { need: 2, hp: 1.0, speed: 0.72, pts: 25, r: 10 },
  king: { need: 3, hp: 1.3, speed: 0.55, pts: 50, r: 13 },
};
const SCARE = 10;  // points lost when a creature reaches the players
const SLOW = 0.45; // speed of a creature caught in any beam
// speed: px/s creep · gap: seconds between creatures (start → end) · half: beam half-width (deg) · turn: deg/s
// big: chance a creature is big (after the first few seconds) · kings: when kings appear (s) · div: points per round point.
// div measured with bots (60 s, no input lag): a perfect aimer scores 330 / 470 / 660 points → ~140–150; a team that
// looks up every 0.35 s and misses 15% of the time 290 / 280 / 445 → ~85–120.
const TUNE = {
  easy: { speed: 17, gap: 2.6, gapEnd: 1.9, half: 15, turn: 110, big: 0.2, kings: [32], div: 2.4 },
  normal: { speed: 21, gap: 2.3, gapEnd: 1.6, half: 13, turn: 105, big: 0.28, kings: [24, 46], div: 3.3 },
  hard: { speed: 25, gap: 2.0, gapEnd: 1.3, half: 11, turn: 100, big: 0.33, kings: [20, 36, 50], div: 4.4 },
};
const num = v => String(v).replace('.', ',');

export class BeamGuard extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const X = (this.skin = skin).text;
    this.diffInfo = Object.fromEntries(Object.entries(TUNE).map(([d, e]) => [d, X.diffInfo(e, num)]));
    this.desc = X.desc;
    this.tip = X.tip;
    this.scoreLabel = X.scoreLabel;
    const keys = [key('A') + key('D'), key('←') + key('→'), key('J') + key('L')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = KEYS.map(k => k.flat());
    // ---- guided demo
    this.demoKeys = KEYS.map((k, i) => [[k[0][0], `${['A', '←', 'J'][i]} ◀`], [k[1][0], `${['D', '→', 'L'][i]} ▶`]]);
    this.demoSpeed = 0.7;
    const at = kind => () => { const m = this.mobs.filter(q => q.kind === kind).sort((a, b) => a.r - b.r)[0]; if (!m) return { x: HOME.x, y: HOME.y - 20, r: 44 }; const [x, y] = this.pos(m); return { x, y, r: kind === 'small' ? 22 : 30 }; };
    const FOCUS = { kids: () => ({ x: HOME.x, y: HOME.y - 20, r: 44 }), small: at('small'), big: at('big'), king: at('king') };
    this.demoScript = skin.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
    this.demoCapTop = true; // the players stand at the bottom: keep the caption up there
  }
  // the demo shows a big creature early and a king before it ends
  demoSetup() { this.kings = [13]; this.bigFrom = 3; }
  // demo bot (and the calibration bot in tools): every role aims at its target, holding its turn buttons
  aims() {
    const out = [null, null, null], king = this.mobs.filter(m => m.kind === 'king').sort((a, b) => a.r - b.r)[0];
    if (king) return [king, king, king];
    for (let i = 0; i < 3; i++) out[i] = this.mobs.filter(m => m.kind === 'small' && m.color === i).sort((a, b) => a.r - b.r)[0] || null;
    const big = this.mobs.filter(m => m.kind === 'big').sort((a, b) => a.r - b.r)[0];
    if (big) [0, 1, 2].sort((a, b) => (out[b] ? out[b].r : 1e9) - (out[a] ? out[a].r : 1e9)).slice(0, 2).forEach(i => { out[i] = big; });
    return out;
  }
  aimKeys() { // per role: the key to hold now, or null
    return this.aims().map((m, i) => {
      if (!m) return null;
      const [x, y] = this.pos(m), want = clamp(Math.atan2(ORIGINS[i].y - y, x - ORIGINS[i].x) / DEG, MIN_A, MAX_A), d = want - this.beams[i];
      return Math.abs(d) < 3 ? null : KEYS[i][d > 0 ? 0 : 1][0];
    });
  }
  demoStep() {
    const want = this.aimKeys();
    KEYS.forEach((k, i) => k.forEach(([code]) => this.vhold(code, want[i] === code)));
  }
  init() {
    this.E = TUNE[game.diff];
    this.beams = START.slice(); this.turning = [0, 0, 0];
    this.mobs = []; this.nextId = 1; this.spawnT = 1.2; this.kings = this.E.kings.slice(); this.bigFrom = 8;
    this.points = 0; this.banished = { small: 0, big: 0, king: 0 }; this.scares = 0; this.lastSec = DURATION; this.done = false;
    this.fx = new Particles(); this.floats = []; this.anim = 0; this.shake = 0;
    this.seed = 777 + (game.diff === 'hard' ? 7 : game.diff === 'easy' ? 3 : 0); // the same creatures every try, so tries are comparable
    this.bg = makeCanvas(W, H, g => this.skin.art.background(g));
    this.dark = this.dark || makeCanvas(W, H, () => {});
  }
  rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  pos(m) { const a = m.ang * DEG, w = Math.sin(m.wob + this.anim * 2) * 6; return [HOME.x + Math.cos(a) * m.r - Math.sin(a) * w, HOME.y - Math.sin(a) * m.r - Math.cos(a) * w]; }
  // how many beams shine on m right now, and which
  litBy(m) {
    const [x, y] = this.pos(m), r = KINDS[m.kind].r, out = [];
    ORIGINS.forEach((o, i) => {
      const dx = x - o.x, dy = o.y - y, dist = Math.hypot(dx, dy);
      if (dist > REACH) return;
      const d = Math.abs(Math.atan2(dy, dx) / DEG - this.beams[i]), size = Math.atan(r / Math.max(dist, 1)) / DEG;
      if (d < this.E.half + size) out.push(i);
    });
    return out;
  }
  float(text, x, y, color = C.white, size = 1) { this.floats.push({ text, x, y, color, size, t: 0 }); }

  play(dt) {
    const left = DURATION - this.t, sec = Math.ceil(left);
    this.setTimer(String(Math.max(0, sec)), left <= 10);
    if (sec < this.lastSec && sec <= 10 && sec > 0) A.sfx.tick();
    this.lastSec = sec;
    if (left <= 0) { this.finish(); return; }
    // turn the beams
    KEYS.forEach(([l, r], i) => {
      const dir = (input.down(...l) ? 1 : 0) - (input.down(...r) ? 1 : 0);
      if (input.hit(...l, ...r)) this.pulse(i);
      this.turning[i] = dir;
      this.beams[i] = clamp(this.beams[i] + dir * this.E.turn * dt, MIN_A, MAX_A);
    });
    // creatures arrive
    const prog = this.t / DURATION;
    this.spawnT -= dt;
    if (this.kings.length && this.t >= this.kings[0]) { this.kings.shift(); this.spawn('king'); }
    else if (this.spawnT <= 0 && left > 4) {
      this.spawnT = this.E.gap + (this.E.gapEnd - this.E.gap) * prog;
      this.spawn(this.t > this.bigFrom && this.rand() < this.E.big ? 'big' : 'small');
    }
    // light, creep, banish, scare
    for (const m of this.mobs.slice()) {
      const K = KINDS[m.kind], lit = this.litBy(m), hurt = m.kind === 'small' ? (lit.includes(m.color) ? 1 : 0) : lit.length;
      m.lit = lit; m.wob += dt;
      if (hurt >= K.need) m.light += dt; else m.light = Math.max(0, m.light - dt * 0.4);
      m.r -= this.E.speed * K.speed * (lit.length ? SLOW : 1) * dt;
      if (m.light >= K.hp) { this.banish(m); continue; }
      if (!m.warned && m.r < 100) { m.warned = true; this.cue(m.kind === 'small' ? m.color : 'all', [30, 30, 30], 'near' + m.id, 99); }
      if (m.r <= CATCH_R) this.scare(m);
    }
    this.common(dt);
  }
  spawn(kind) {
    const ang = MIN_A + 6 + this.rand() * (MAX_A - MIN_A - 12);
    const m = { id: this.nextId++, kind, color: kind === 'small' ? Math.floor(this.rand() * 3) : -1, ang, r: SPAWN_R, wob: this.rand() * 6, light: 0, lit: [], warned: false };
    this.mobs.push(m);
    if (kind === 'king') { this.toast(this.skin.text.kingComes, 'bad'); this.cue('all', [60, 40, 60]); A.sfx.wilt(); }
  }
  banish(m) {
    const K = KINDS[m.kind], [x, y] = this.pos(m);
    this.mobs.splice(this.mobs.indexOf(m), 1);
    this.points += K.pts; this.banished[m.kind]++;
    this.float(`+${K.pts}`, x, y - 12, m.kind === 'small' ? theme.roles[m.color].c : C.yellow, m.kind === 'king' ? 1.4 : 1);
    this.fx.burst(x, y, m.kind === 'small' ? 10 : 20, { colors: this.skin.art.banish, speed: 50, g: -20 });
    if (m.kind === 'small') A.sfx.pop(); else { A.sfx.great(); cheer(m.kind === 'king' ? 5 : 2); }
    this.setScoreText(Math.floor(this.points / this.E.div));
  }
  scare(m) {
    const X = this.skin.text;
    this.mobs.splice(this.mobs.indexOf(m), 1);
    this.points -= SCARE; this.scares++; this.shake = 0.4;
    this.float(X.boo, HOME.x, HOME.y - 44, C.red, 1.6); A.sfx.bad(); this.cue('all', [80, 40, 80]);
    if (this.scares === 1) this.toast(X.firstScare, 'bad');
    this.setScoreText(Math.floor(this.points / this.E.div));
  }
  finish() {
    if (this.done) return; this.done = true;
    const X = this.skin.text, b = this.banished;
    this.end(X.banner, { score: this.points / this.E.div, lines: [
      [X.small, `${b.small} (+${b.small * KINDS.small.pts})`], [X.big, `${b.big} (+${b.big * KINDS.big.pts})`], [X.king, `${b.king} (+${b.king * KINDS.king.pts})`],
      [X.scares, this.scares ? `${this.scares} (−${this.scares * SCARE})` : X.scaresNone]] });
  }
  common(dt) {
    this.anim += dt; this.fx.update(dt); this.shake = Math.max(0, this.shake - dt);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < 0.9);
  }
  idle(dt) { this.common(dt); }

  // ------------------------------------------------ drawing
  beamPath(g, i, len = REACH) {
    const o = ORIGINS[i], a = this.beams[i] * DEG, h = this.E.half * DEG;
    g.beginPath(); g.moveTo(o.x, o.y);
    g.lineTo(o.x + Math.cos(a + h) * len, o.y - Math.sin(a + h) * len);
    g.lineTo(o.x + Math.cos(a - h) * len, o.y - Math.sin(a - h) * len);
    g.closePath();
  }
  drawWorld(g) {
    const art = this.skin.art, T = this.anim;
    const sx = this.shake > 0 ? Math.round(Math.sin(this.shake * 70) * 2) : 0;
    g.save(); g.translate(sx, 0);
    g.drawImage(this.bg, 0, 0);
    // creatures (under the darkness: dim in the dark, bright in a beam)
    const pos = this.mobs.map(m => [m, ...this.pos(m)]);
    for (const [m, x, y] of pos) drawAt(g, art.creature(m.kind, m.kind === 'small' ? theme.roles[m.color].c : null, ((T * 3 + m.id) | 0) % 2), x, y, { ay: 0.5, flip: Math.cos(m.ang * DEG) > 0 });
    // the darkness, with the beams and a little lantern glow cut out of it
    const d = this.dark.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.fillStyle = 'rgba(10,6,24,0.86)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 3; i++) {
      const o = ORIGINS[i], gr = d.createRadialGradient(o.x, o.y, 4, o.x, o.y, REACH);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)');
      d.fillStyle = gr; this.beamPath(d, i); d.fill();
    }
    const glow = d.createRadialGradient(HOME.x, HOME.y - 8, 6, HOME.x, HOME.y - 8, 48);
    glow.addColorStop(0, 'rgba(0,0,0,0.9)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = glow; d.fillRect(HOME.x - 60, HOME.y - 70, 120, 90);
    g.drawImage(this.dark, 0, 0);
    // a tint of each player's colour in their beam
    for (let i = 0; i < 3; i++) { g.globalAlpha = 0.13; g.fillStyle = theme.roles[i].c; this.beamPath(g, i); g.fill(); }
    g.globalAlpha = 1;
    // eyes glow through the dark in the creature's colour; a ring fills while it is being driven away
    for (const [m, x, y] of pos) {
      const K = KINDS[m.kind], col = m.kind === 'small' ? theme.roles[m.color].c : m.kind === 'king' ? C.orange : C.white, e = K.r * 0.4;
      g.fillStyle = col; g.fillRect(Math.round(x - e - 1), Math.round(y - 2), 2, 2); g.fillRect(Math.round(x + e - 1), Math.round(y - 2), 2, 2);
      if (m.light > 0) {
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(x, y, K.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, m.light / K.hp)); g.stroke();
      }
      if (K.need > 1) { // how many beams it takes, and how many are on it
        g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center';
        const txt = `${m.lit.length}/${K.need} 🔦`; g.fillStyle = C.out; g.fillText(txt, x + 1, y - K.r - 5); g.fillStyle = m.lit.length >= K.need ? C.mint : C.white; g.fillText(txt, x, y - K.r - 6);
      }
    }
    // the players with their torches
    ORIGINS.forEach((o, i) => {
      const bob = this.turning[i] ? Math.round(Math.sin(T * 14)) : 0;
      drawAt(g, theme.avatar(i, 'up', this.turning[i] ? ((T * 6) | 0) % 2 : 0, true), o.x, HOME.y + 6 + bob);
      const a = this.beams[i] * DEG; g.fillStyle = theme.roles[i].c; g.fillRect(Math.round(o.x + Math.cos(a) * 6) - 2, Math.round(o.y - Math.sin(a) * 6) - 2, 4, 4);
    });
    this.fx.draw(g);
    for (const f of this.floats) {
      const k = f.t / 0.9; g.font = `bold ${Math.round(8 * (f.size || 1))}px "Baloo 2", sans-serif`; g.textAlign = 'center';
      g.fillStyle = C.out; g.fillText(f.text, f.x + 1, f.y - k * 12 + 1); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y - k * 12);
    }
    g.restore();
  }
}
