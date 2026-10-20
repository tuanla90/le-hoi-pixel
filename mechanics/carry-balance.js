// Mechanic: carry something wobbly through a walled course as a trio (20/10 round 2 "Bê cây").
// The rules live here; a theme dresses them with a skin (the course, names, texts, art) — see themes/20-10/scenes/carry.js.
//
// The three players walk as one group: role 0 leads up/down, role 1 left/right, role 2 keeps the load balanced. The load
// is an inverted pendulum that keeps tipping; sideways acceleration, gusts, bumps into walls, chasers, sprayers, puddles,
// rope bridges, stepping stones and mud all tip it further, and Q/E push it back. Tip too far and it falls: the trio
// scoops it up for a moment and loses points. Pickups along the way add points, arriving before par adds more.
//
// skin = {
//   id                    scene id (also the round id in the theme)
//   level: {              the course, in tiles of LAYOUT.T px (see the 20/10 skin for a full example)
//     MW, MH              size in tiles
//     build(bridge, stones)   the tile map: '#' wall · 'f' flower bed · 'X' parked vehicle (all solid), 'p' puddle,
//                         'r' rope bridge, 's' stepping stone, 'e' mud; bridge / stones = gap widths for the difficulty
//     gates               rough-footing zones [{ k: 'r' | 's' | 'e', x: [x0, x1], y: [y0, y1] }] (tiles)
//     windy               { x, y } the zone where gusts are twice as strong (tiles)
//     trees, sprayers     [[tx, ty]] round obstacles; sprayers turn and push whoever they hit
//     chasers             [{ x, y, a, b, sp, t }] patrol a → b and chase the nearest player (px)
//     blocker             { x, y } a sleeping animal in the way (px)
//     stars               [[tx, ty]] pickups · route [[px, py]] the path the guide arrow and the demo follow
//     start [px, py] · goal { x, y } (reached when right of x and below y)
//   }
//   text                  player-facing strings (see the 20/10 skin)
//   demoScript            [{ at, text, focus: 'pot' | 'potWide' | 'level' }]
//   art: {
//     background(g, map)  the whole course, painted once (MW·T × MH·T)
//     tree(tx, ty)        sprite for a tree · sprayer · chaser(frame) · pickup(frame) · flyer(frame) · spilled
//     blocker(g, x, y, t) draws the sleeping animal at screen (x, y)
//     load(pickups)       sprite of the carried load with that many pickups on it
//     colors: { spill, scoop, pickup, spray[2], sweat }
//   }
//   sfx: { chaser, spray } names in core/audio.js sfx (default 'woof', 'water')
// }
import { input, K, key, W, H, cheer, game } from '../core/main.js';
import { C, makeCanvas, drawAt, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { theme } from '../core/theme.js';

const T = 16;
export const LAYOUT = { T };
const MAX_TIME = 120;
const DROP_TIME = 1.2; // seconds lost scooping the load back up after a drop
const OFF = [[0, -11], [-10, 5.5], [10, 5.5]]; // role 0 front, role 1 back-left, role 2 back-right (mean must be 0)
const R = 5; // player radius
// par: seconds for 100 · speed / chase: px/s of the trio / chasers · kick: tip from a bump · drop: points lost per drop
// tip / damp / fix / gust: the pendulum (fall rate, damping, Q/E strength, wind) · fall: points lost by arriving at
// MAX_TIME instead of par · bridge / stones: gap widths (tiles) · flower: points per pickup · fast: per second under par
const TUNE = {
  easy:   { par: 44, speed: 62, chase: 46, kick: 0.72, drop: 3, tip: 1.0,  damp: 1.65, fix: 5.3, gust: 0.62, fall: 58, bridge: 4, stones: 3, flower: 1.5, fast: 1 },
  normal: { par: 40, speed: 65, chase: 51, kick: 0.9,  drop: 4, tip: 1.28, damp: 1.48, fix: 5.0, gust: 0.85, fall: 74, bridge: 3, stones: 3, flower: 1.5, fast: 2 },
  hard:   { par: 37, speed: 68, chase: 56, kick: 1.08, drop: 5, tip: 1.55, damp: 1.32, fix: 4.7, gust: 1.02, fall: 90, bridge: 3, stones: 2, flower: 2,   fast: 3 },
};
const num = v => String(v).replace('.', ',');
const inBox = (b, x, y) => x >= b.x[0] * T && x < b.x[1] * T && y >= b.y[0] * T && y < b.y[1] * T;
export function segDist(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

export class CarryBalance extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const X = (this.skin = { sfx: { chaser: 'woof', spray: 'water' }, ...skin }).text, L = skin.level;
    this.diffInfo = Object.fromEntries(Object.entries(TUNE).map(([d, e]) => [d, X.diffInfo(e, num, d)]));
    this.desc = X.desc;
    this.tip = X.tip;
    this.scoreLabel = X.scoreLabel;
    this.initialScore = X.hud(0, 0);
    const keys = [key('↑') + key('↓'), key('←') + key('→'), key('Q') + key('E')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = [[...K.up, ...K.down], [...K.left, ...K.right], ['KeyQ', 'KeyE']];
    // ---- guided demo
    this.demoKeys = [[['ArrowUp', '↑'], ['ArrowDown', '↓']], [['ArrowLeft', '←'], ['ArrowRight', '→']], [['KeyQ', 'Q ↶'], ['KeyE', 'E ↷']]];
    const potF = r => () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 10, r });
    const levelF = () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 40, r: 24 });
    const FOCUS = { pot: potF(36), potWide: potF(40), level: levelF };
    this.demoScript = skin.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
    this.L = L;
  }
  demoCaption(t) {
    const X = this.skin.text;
    if (this.dropped) return { text: X.demoDrop, focus: () => ({ x: this.dropped.x - this.cam.x, y: this.dropped.y - this.cam.y, r: 34 }) };
    if (this.demoDropped && t < 24) return { text: X.demoAfterDrop, focus: () => ({ x: this.pot.x - this.cam.x, y: this.pot.y - this.cam.y - 40, r: 24 }) };
    return super.demoCaption(t);
  }
  // demo bot: follows the route and balances lazily (so the tilt is easy to see);
  // from 16s it stops balancing (then presses the wrong way) until the load falls, to show what a drop costs
  demoStep() {
    const tgt = this.L.route[this.wp], dx = tgt[0] - this.pot.x, dy = tgt[1] - this.pot.y;
    this.vhold('ArrowRight', dx > 3); this.vhold('ArrowLeft', dx < -3);
    this.vhold('ArrowDown', dy > 3); this.vhold('ArrowUp', dy < -3);
    const p = this.tilt + 0.35 * this.tiltV;
    if (this.demo.t >= 16 && !this.demoDropped) {
      if (this.dropped) { this.demoDropped = true; this.vhold('KeyQ', false); this.vhold('KeyE', false); return; }
      const wrong = this.demo.t >= 19; // first role 2 just stops balancing, then pushes the wrong way
      this.vhold('KeyQ', wrong && p < 0); this.vhold('KeyE', wrong && p >= 0);
      return;
    }
    this.vhold('KeyQ', p > 0.4); this.vhold('KeyE', p < -0.4);
  }
  init() {
    // Dễ: the load tips slower and gentler, chasers are lazier, drops cost fewer points, a more forgiving par, wider gaps
    const E = this.E = TUNE[game.diff], L = this.L;
    this.map = L.build(E.bridge, E.stones);
    const [sx, sy] = L.start;
    this.girls = OFF.map(([ox, oy]) => ({ x: sx + ox, y: sy + oy, vx: 0, vy: 0 }));
    this.pot = { x: sx, y: sy }; this.dir = 'side'; this.flip = false; this.walkT = 0; this.moving = false;
    this.jolt = 0; this.drops = 0; this.dropped = null; this.safe = 0; this.wob = 0;
    this.cam = { x: 0, y: 0 }; this.parts = new Particles(); this.sweat = 0; this.done = false;
    this.demoDropped = false;
    this.stars = L.stars.map(([x, y]) => ({ x: x * T + 8, y: y * T + 8, got: false })); this.starCount = 0;
    this.wp = 1; this.tilt = 0; this.tiltV = 0; this.pvx = 0;
    this.spr = L.sprayers.map(([x, y], i) => ({ x: x * T, y: y * T, ang: i * 2, sp: 1.5 + i * 0.3 }));
    this.dogs = L.chasers.map(d => ({ ...d, a: d.a.slice(), b: d.b.slice(), cool: 0, mode: 'patrol' }));
    this.cat = { ...L.blocker };
    this.butterflies = [0, 1, 2].map(i => ({ x: 90 + i * 200, y: 70 + i * 130, ph: i * 2 }));
    this.bg = makeCanvas(L.MW * T, L.MH * T, g => this.skin.art.background(g, this.map));
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
    for (const [tx, ty] of this.L.trees) { const cx = tx * T + 8, cy = ty * T + 10; const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy), rr = R + 5; if (d < rr && d > 0) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); hit = true; } }
    for (const c of [this.cat, ...this.spr]) { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy), rr = R + (c === this.cat ? 6 : 4); if (d < rr && d > 0) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); hit = true; } }
    return hit;
  }
  play(dt) {
    const E = this.E, L = this.L, tt = this.t;
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
    const vx = ix / len * E.speed, vy = iy / len * E.speed;
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
      const gate = L.gates.find(z => inBox(z, gl.x, gl.y))?.k;
      const footing = gate || tile;
      const trac = this.wet(gl.x, gl.y) ? 1.6 : footing === 'r' ? 2.4 : footing === 's' ? 5 : footing === 'e' ? 7 : 16;
      gl.vx += (kx - gl.vx) * Math.min(1, trac * dt); gl.vy += (ky - gl.vy) * Math.min(1, trac * dt);
      gl.vx += (gl.push?.[0] || 0) * dt; gl.vy += (gl.push?.[1] || 0) * dt; gl.push = null;
      gl.x += gl.vx * dt; gl.y += gl.vy * dt;
      // the rope bridge has poor footing: the trio drifts and the carried load wobbles
      if (footing === 'r') {
        gl.vx += Math.sin(this.t * 5 + i * 2) * 32 * dt;
        this.tiltV += Math.sin(this.t * 4 + i) * 0.9 * dt;
      }
      if (footing === 's') this.tiltV += Math.sin(this.t * 8 + i * 1.7) * 2.2 * dt;
      if (footing === 'e') { gl.vx *= 0.82; gl.vy *= 0.82; this.tiltV += Math.sin(this.t * 6 + i) * 1.3 * dt; }
      // every obstacle tips the load: a knock when someone bumps in, then a nudge while scraping along
      const hit = this.collide(gl), side = Math.sign(gl.x - cx) || (Math.random() < .5 ? -1 : 1);
      if (hit && !gl.touch && this.moving) this.kick(side * 0.75);
      if (hit && this.moving) this.tiltV += side * 1.2 * dt;
      gl.touch = hit;
      if (this.wet(gl.x, gl.y)) this.tiltV += (Math.random() - 0.5) * 7 * dt;
    });
    this.pot.x = (this.girls[0].x + this.girls[1].x + this.girls[2].x) / 3; this.pot.y = (this.girls[0].y + this.girls[1].y + this.girls[2].y) / 3;
    // balance: sideways acceleration + gusts tip the load; Q/E push it back
    const pvx = (this.pot.x - (this.prevX ?? this.pot.x)) / dt; this.prevX = this.pot.x;
    const ax = clamp((pvx - this.pvx) / dt, -1500, 1500); this.pvx = pvx;
    const onWindyRidge = inBox(L.windy, this.pot.x, this.pot.y);
    const gust = (Math.sin(this.t * 1.7) * 0.6 + Math.sin(this.t * 3.1 + 2) * 0.4) * (this.moving ? E.gust : 0.35) * Math.min(1, this.t / 4) * (onWindyRidge ? 2.1 : 1);
    if (this.safe <= 0) {
      this.tiltV += (this.tilt * E.tip - ax * 0.0011 + gust) * dt;
      this.tiltV += ((re ? 1 : 0) - (lq ? 1 : 0)) * E.fix * dt;
      this.tiltV *= 1 - E.damp * dt;
      this.tilt += this.tiltV * dt;
    } else { this.tilt *= 1 - 4 * dt; this.tiltV = 0; }
    if (Math.abs(this.tilt) > 0.65) this.cue(2, 60, 'tilt', 0.7);
    if (this.safe <= 0 && Math.abs(this.tilt) >= 1) this.drop();
    // pickups: collected when the load passes over them
    for (const st of this.stars) if (!st.got && Math.hypot(st.x - this.pot.x, st.y - this.pot.y) < 15) {
      st.got = true; this.starCount++; this.potPop = 0.35; A.sfx.pickup(); this.hudScore();
      this.parts.burst(st.x, st.y - 8, 10, { colors: this.skin.art.colors.pickup, speed: 45, g: 0 });
    }
    // route progress (for the guide arrow)
    while (this.wp < L.route.length - 1 && Math.hypot(L.route[this.wp][0] - this.pot.x, L.route[this.wp][1] - this.pot.y) < 24) this.wp++;
    // goal
    if (this.pot.x > L.goal.x && this.pot.y > L.goal.y) this.finish(true);
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
        if (playing && d.cool <= 0 && nd < 80) { d.mode = 'chase'; d.home = [d.x, d.y]; d.chaseT = 0; A.sfx[this.skin.sfx.chaser](); this.cue([0, 1], [40, 40, 40], 'dog', 2); }
      } else {
        // chase the nearest player (a bit slower than the team), give up past the leash, then trot home
        const chase = d.mode === 'chase';
        const tx = chase ? near.x : d.home[0], ty = chase ? near.y : d.home[1];
        const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy) || 1, sp = chase ? this.E.chase : 60;
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
          d.cool = 1.5; if (d.mode === 'chase') d.mode = 'back'; A.sfx[this.skin.sfx.chaser](); this.toast(this.skin.text.chaserHit, 'bad'); this.cue('all', [80, 40, 80]); break;
        }
      }
    }
  }
  updateSprinklers(dt, push) {
    const spray = this.skin.art.colors.spray;
    for (const s of this.spr) {
      s.ang += s.sp * dt;
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      if (Math.random() < 0.7) this.parts.add({ x: s.x + ca * 4, y: s.y - 4 + sa * 4, vx: ca * (70 + Math.random() * 30) + (Math.random() - .5) * 15, vy: sa * (70 + Math.random() * 30) - 10, g: 60, life: 0.55, color: Math.random() < .5 ? spray[0] : spray[1], size: 2, drag: 0.5 });
      if (!push) continue;
      for (const gl of this.girls) {
        const dx = gl.x - s.x, dy = gl.y - s.y, d = Math.hypot(dx, dy);
        if (d > 60 || d < 1) continue;
        let da = Math.atan2(dy, dx) - s.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 0.4) { gl.push = [ca * 650, sa * 650]; this.tiltV += ca * 1.6 * dt; this.jolt = Math.max(this.jolt, 0.1); if (!this.splashT || this.t - this.splashT > 1.2) { this.splashT = this.t; A.sfx[this.skin.sfx.spray](); } }
      }
    }
  }
  kick(v) { if (this.safe > 0) return; this.tiltV += v * this.E.kick; this.jolt = 0.25; A.sfx.move(); }
  drop() {
    this.cue('all', 250);
    this.drops++; this.hudScore();
    this.tilt = 0; this.tiltV = 0;
    this.dropped = { x: this.pot.x, y: this.pot.y, t: 0, dig: 0 };
    A.sfx.drop(); this.parts.burst(this.pot.x, this.pot.y, 26, { colors: this.skin.art.colors.spill, speed: 70, g: 160, up: 40 });
    this.toast(this.skin.text.dropToast(this.E.drop), 'bad');
    this.girls.forEach(gl => { gl.vx = 0; gl.vy = 0; });
  }
  scoop(dt) { // automatic: the trio scoops the load back up for DROP_TIME seconds
    const d = this.dropped; d.t += dt; d.dig -= dt;
    if (d.dig <= 0) { d.dig = 0.3; A.sfx.shovel(); this.parts.burst(d.x + (Math.random() - .5) * 20, d.y + 4, 5, { colors: this.skin.art.colors.scoop, speed: 40, g: 150, up: 50 }); }
    if (d.t >= DROP_TIME) {
      // regroup around the drop point, keeping each player out of walls
      this.girls.forEach((gl, i) => { const ox = gl.x, oy = gl.y; gl.x = d.x + OFF[i][0]; gl.y = d.y + OFF[i][1]; gl.touch = false; if (this.collide(gl)) { gl.x = ox; gl.y = oy; } });
      this.dropped = null; this.safe = 1.0; A.sfx.ok();
    }
  }
  hudScore() { this.setScoreText(this.skin.text.hud(this.starCount, this.drops)); }
  finish(won) {
    if (this.done) return; this.done = true;
    const E = this.E, X = this.skin.text, t = this.t;
    let score;
    const fast = won && t < E.par ? (E.par - t) * E.fast : 0;
    if (won) score = (t <= E.par ? 100 + fast : 100 - ((t - E.par) / (MAX_TIME - E.par)) * E.fall) - this.drops * E.drop + this.starCount * E.flower;
    else { const prog = this.progress(); score = 15 * prog; }
    if (won) { cheer(10); A.sfx.fanfare(); }
    this.end(won ? X.arrived : X.timeUp, { score, lines: [[X.time, won ? `${t.toFixed(1)} giây` : X.tooLate], [X.drops, this.drops ? `${this.drops} (−${this.drops * E.drop} điểm)` : X.dropsNone], [X.pickups, `${this.starCount}/${this.L.stars.length} (+${Math.round(this.starCount * E.flower)})`], [X.early(E.par), fast ? `+${Math.round(fast)}` : '—']] });
  }
  progress() { return (this.wp - 1) / (this.L.route.length - 1); }
  common(dt) {
    this.parts.update(dt); this.wob += dt; this.potPop = Math.max(0, (this.potPop || 0) - dt);
    const k = Math.min(1, dt * 6), L = this.L;
    this.cam.x += (clamp(this.pot.x - W / 2, 0, L.MW * T - W) - this.cam.x) * k;
    this.cam.y += (clamp(this.pot.y - H / 2 + 6, 0, L.MH * T - H) - this.cam.y) * k;
    this.jolt = Math.max(0, this.jolt - dt);
    if (Math.abs(this.tilt) > 0.6 && !this.dropped) { this.sweat -= dt; if (this.sweat < 0) { this.sweat = 0.25; const gl = this.girls[(Math.random() * 3) | 0]; this.parts.add({ x: gl.x + 4, y: gl.y - 22, vx: 15, vy: -20, g: 80, life: 0.5, color: this.skin.art.colors.sweat, size: 2 }); } }
  }
  idle(dt) { this.updateDogs(dt); this.updateSprinklers(dt, false); this.common(dt); }

  drawWorld(g) {
    const art = this.skin.art, cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.drawImage(this.bg, -cx, -cy);
    const items = [];
    this.L.trees.forEach(([tx, ty]) => items.push({ y: ty * T + 14, d: () => drawAt(g, art.tree(tx, ty), tx * T + 8 - cx, ty * T + 16 - cy) }));
    for (const s of this.spr) items.push({ y: s.y, d: () => drawAt(g, art.sprayer, s.x - cx, s.y + 4 - cy) });
    items.push({ y: this.cat.y, d: () => art.blocker(g, this.cat.x - cx, this.cat.y - cy, this.wob) });
    for (const d of this.dogs) items.push({ y: d.y, d: () => drawAt(g, art.chaser(((this.wob * 8) | 0) % 2), d.x - cx, d.y + 6 - cy, { flip: d.face < 0 }) });
    const f = this.moving ? ((this.walkT) | 0) % 4 : 0;
    this.girls.forEach((gl, i) => items.push({ y: gl.y, d: () => {
      if (this.dropped) { // everyone crouches and scoops the load back up, out of step with each other
        const ph = this.dropped.t * 9 + i * 2.1, up = Math.sin(ph) > 0;
        drawAt(g, theme.avatar(i, 'down', up ? 0 : 2, up), gl.x - cx, gl.y + 8 - cy - (up ? 2 : 0));
        return;
      }
      drawAt(g, theme.avatar(i, this.dir, f, true), gl.x - cx, gl.y + 8 - cy - (f % 2 ? 1 : 0), { flip: this.dir === 'side' && this.flip });
    } }));
    if (this.dropped) {
      const d = this.dropped, txt = this.skin.text.scooping;
      items.push({ y: d.y + 10, d: () => {
        drawAt(g, art.spilled, d.x - cx, d.y + 12 - cy);
        const w = 30; g.fillStyle = C.out; g.fillRect(d.x - cx - w / 2 - 1, d.y - cy - 34, w + 2, 6); g.fillStyle = C.white; g.fillRect(d.x - cx - w / 2, d.y - cy - 33, w, 4);
        g.fillStyle = C.mint; g.fillRect(d.x - cx - w / 2, d.y - cy - 33, Math.round(w * Math.min(1, d.t / DROP_TIME)), 4);
        g.font = 'bold 8px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.out; g.fillText(txt, d.x - cx + 1, d.y - cy - 37); g.fillStyle = C.white; g.fillText(txt, d.x - cx, d.y - cy - 38);
      } });
    } else {
      const wob = this.tilt * 0.55 + (this.jolt > 0 ? Math.sin(this.wob * 50) * this.jolt * 0.4 : 0);
      const pop = this.potPop > 0 ? 1 + Math.sin(this.potPop / 0.35 * Math.PI) * 0.18 : 1; // the load bounces when a pickup lands on it
      items.push({ y: this.pot.y + 1, d: () => drawAt(g, art.load(this.starCount), this.pot.x - cx, this.pot.y - 6 - cy, { rot: wob, sx: pop, sy: pop }) });
    }
    for (const st of this.stars) if (!st.got) items.push({ y: st.y - 6, d: () => drawAt(g, art.pickup(((this.wob * 3 + st.x) | 0) % 2), st.x - cx, st.y - cy - 4 + Math.sin(this.wob * 4 + st.x) * 2, { ay: .5 }) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.d());
    // spirit level above the load for role 2: keep the bubble in the middle
    if (!this.dropped) {
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
    for (const b of this.butterflies) { b.ph += 0.016; drawAt(g, art.flyer(((this.wob * 8) | 0) % 2), b.x + Math.sin(b.ph * .7) * 50 - cx, b.y + Math.sin(b.ph * 1.3) * 20 - cy, { ay: .5 }); }
    this.parts.draw(g, cx, cy);
    this.drawGoalArrow(g, cx, cy);
  }
  drawGoalArrow(g, cx, cy) {
    // follow the route: point toward the next waypoint
    const p = this.pot, tgt = this.L.route[this.wp];
    const ang = Math.atan2(tgt[1] - p.y, tgt[0] - p.x);
    const ax = p.x - cx + Math.cos(ang) * 30, ay = p.y - cy - 8 + Math.sin(ang) * 22;
    const bob = Math.sin(this.wob * 6) * 2;
    g.save(); g.translate(Math.round(ax + Math.cos(ang) * bob), Math.round(ay + Math.sin(ang) * bob)); g.rotate(ang);
    g.fillStyle = C.out; g.beginPath(); g.moveTo(6, 0); g.lineTo(-3, -5); g.lineTo(-3, 5); g.closePath(); g.fill();
    g.fillStyle = C.yellow; g.beginPath(); g.moveTo(4, 0); g.lineTo(-2, -3); g.lineTo(-2, 3); g.closePath(); g.fill();
    g.restore();
  }
}
