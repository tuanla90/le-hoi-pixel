// Mechanic: a self-driving delivery run down a winding road (20/10 round 3 "Chở cây").
// The rules live here; a theme dresses them with a skin (names, texts, art) — see themes/20-10/scenes/drive.js.
//
// The vehicle drives itself up to top speed. Role 0 steers left, role 1 steers right, role 2 only brakes: at red lights,
// to deliver to customers waving at the kerb, and before narrow stretches. Obstacles (cones, potholes, puddles, slow
// traffic, oncoming cars, animals crossing) knock cargo off; pickups add points; running a red light gets the vehicle
// held for a while. The road, customers, lights and obstacles are generated here, the same for every theme.
//
// skin = {
//   id                       scene id (also the round id in the theme)
//   text                     player-facing strings (see the 20/10 skin)
//   demoScript               [{ at, text, focus: 'vehicle' | 'vehicleWide' | 'obstacle' }]
//   art: {
//     ground()               a 256 px tall strip that scrolls under the road (W + 8 wide)
//     finish()               the building at the end of the road
//     vehicle                top-down sprite (26 × 42) · cargo(i) one of the six loads it carries (9 × 9)
//     ob(g, o, y, frame, t)  draws obstacle o at screen y ('cone' 'pothole' 'puddle' 'tractor' 'scooter' 'oncoming'
//                            'flower' 'ducks' 'dog'; o.scared counts up while a crossing animal flees)
//     deco(g, o, y)          roadside scenery o ('tree' 'house' 'tuft' 'lamp' 'bush' 'rock', o.v a variant 0–4)
//     customer(look, frame)  · wants(look) the load a customer waves for · police(frame) at the traffic lights
//     road                   optional colours { verge, road, road2, kerb: [a, b], line }
//     colors: { dust, deliver, pickup, splash, cone }
//   }
//   sfx: { crosser } name in core/audio.js sfx (default 'quack')
// }
import { input, K, key, W, H, cheer, game } from '../core/main.js';
import { C, drawAt, rng, Particles, clamp } from '../core/gfx.js';
import * as A from '../core/audio.js';
import { Round } from '../core/round.js';
import { heart } from '../core/ui-sprites.js';

const LEN = 7800, MAX_TIME = 125;
// the vehicle drives itself up to VMAX; role 2 only brakes (lights, deliveries, narrow stretches), so nobody holds a key all game
const VMAX = 175, ACC = 125, GRASS_MAX = 60;
// stops along the road: customers to deliver a load to, and traffic lights
const CUSTOMERS = [1050, 2350, 3650, 5000, 6350], LIGHTS = [1700, 3200, 4650, 6100, 7300];
const WARN_D = 340;              // warn this far (px) before a light that will not be green on arrival
const SLOW_V = 72;               // deliver only below this speed (≈ 25 km/h on the speedometer)
const CYCLE = [5, 1.5, 5];       // green, yellow, red seconds — a short red keeps the wait (and the brake hold) from dominating the round
const PULL_OVER = 5;             // running a red light: the police hold the vehicle this long — real seconds, nothing is added to the clock
const POT_PTS = 4;               // each load still on board at the end
// Dễ / Thường / Thử thách: par seconds, extra road half-width, extra obstacle spacing, brake decel,
// points per delivery, chance a pothole knocks a load off, points per star, points per second under par,
// curve = extra bend that grows along the road (px), funnels = where the road narrows, narrow = half-width there,
// cones = the narrow stretch is lined with cones (hitting one costs a load) instead of soft grass, bump = points lost per crash
const TUNE = {
  easy: { par: 78, wide: 12, gap: 70, brake: 290, deliver: 8, pothole: 0, star: 1.5, fast: 1, bump: 0, curve: 18, funnels: [5550], narrow: 34, cones: false },
  normal: { par: 66, wide: 6, gap: 35, brake: 265, deliver: 10, pothole: 0.3, star: 1.5, fast: 2, bump: 1, curve: 28, funnels: [2775, 5550], narrow: 30, cones: false },
  hard: { par: 64, wide: 0, gap: 0, brake: 240, deliver: 12, pothole: 0.6, star: 2, fast: 3, bump: 3, curve: 36, funnels: [2775, 4150, 5550], narrow: 26, cones: true },
};
const F_FLAT = 125, F_TAPER = 200; // a funnel: 200 px squeezing in, 250 px narrow, 200 px opening out
const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const num = v => String(v).replace('.', ',');
const TY = 212; // vehicle screen y
const POTS = 6;
export const LAYOUT = { LEN, CUSTOMERS, LIGHTS, PULL_OVER, POT_PTS, POTS };
const ROAD = { verge: '#d9c39a', road: C.road, road2: '#807d8f', kerb: [C.white, C.red], line: C.cream };

export class AutoDrive extends Round {
  constructor(skin, p) {
    super({ id: skin.id }, p);
    const X = (this.skin = { sfx: { crosser: 'quack' }, ...skin }).text;
    this.road = { ...ROAD, ...skin.art.road };
    this.diffInfo = Object.fromEntries(Object.entries(TUNE).map(([d, e]) => [d, X.diffInfo(e, num, d)]));
    this.desc = X.desc;
    this.tip = X.tip;
    this.scoreLabel = X.scoreLabel;
    this.initialScore = X.hud(POTS, POTS, 0);
    const keys = [key('A') + ' / ' + key('←'), key('D') + ' / ' + key('→'), key('S') + key('↓') + ' / ' + key('Space')];
    this.roles = X.roles.map((r, i) => ({ ...r, keys: keys[i] }));
    this.roleCodes = [K.left, K.right, K.down]; // Space also brakes, but on the intro card it starts the round
    // ---- guided demo
    this.demoKeys = [[['ArrowLeft', X.demoKeys[0]]], [['ArrowRight', X.demoKeys[1]]], [['ArrowDown', X.demoKeys[2]]]];
    this.demoCapTop = true; // the vehicle sits at the bottom of the screen
    const truckF = r => () => ({ x: this.truck.x, y: TY, r });
    const obF = () => { const o = this.demoAhead(140); return o ? { x: o.x, y: this.sy(o.d), r: 24 } : truckF(30)(); };
    const FOCUS = { vehicle: truckF(32), vehicleWide: truckF(34), obstacle: obF };
    this.demoScript = skin.demoScript.map(s => ({ ...s, focus: FOCUS[s.focus] }));
  }
  // the road for the current difficulty: centre line, half-width, how narrow it is around each funnel
  roadX(d) {
    return W / 2 + 62 * Math.sin(d / 560) + 30 * Math.sin(d / 210 + 1) * Math.min(1, d / 600)
      + this.E.curve * clamp((d - 900) / 4000, 0, 1) * Math.sin(d / 300 + 2);
  }
  // 0 = normal road … 1 = fully narrowed
  squeeze(d) {
    let k = 0;
    for (const c of this.E.funnels) { const x = Math.abs(d - c); if (x < F_FLAT) return 1; if (x < F_FLAT + F_TAPER) { const u = 1 - (x - F_FLAT) / F_TAPER; k = Math.max(k, u * u * (3 - 2 * u)); } }
    return k;
  }
  roadHW(d) { if (d > LEN - 150) return 90; const hw = 60 + this.E.wide + 16 * Math.sin(d / 760 + 2); return hw + (Math.min(hw, this.E.narrow) - hw) * this.squeeze(d); }
  nearFunnel(d, pad) { return this.E.funnels.some(c => Math.abs(d - c) < F_FLAT + F_TAPER + pad); }
  // demo captions: a customer or a traffic light coming up takes priority over the timed script
  demoCaption(t) {
    const X = this.skin.text, tr = this.truck;
    const c = this.customers.find(q => !q.served && q.d > tr.d - 30 && q.d - tr.d < 230);
    if (c) return { text: X.demoCustomer(c.side, this.deliverPts), focus: () => ({ x: this.edgeX(c), y: this.sy(c.d), r: 28 }) };
    const l = this.lights.find(q => q.d > tr.d - 10 && q.d - tr.d < 250);
    if (l) { const st = this.lightState(l); return { text: X.demoLight[st.s], focus: () => ({ x: this.lightX(l) + 6, y: this.sy(l.d) - 30, r: 26 }) }; }
    const f = this.funnelAhead(320);
    if (f !== undefined) return { text: X.demoNarrow, focus: () => ({ x: this.roadX(f), y: this.sy(f), r: 36 }) };
    return super.demoCaption(t);
  }
  // centre of the next narrow stretch within `range` px ahead (or the one the vehicle is in)
  funnelAhead(range) { const d = this.truck.d; return this.E.funnels.find(c => c + F_FLAT > d && c - F_FLAT - F_TAPER - d < range); }
  demoAhead(range) { const tr = this.truck; return this.ob.filter(o => !o.gone && o.type !== 'flower' && !o.kerb && o.d > tr.d - 10 && o.d < tr.d + range).sort((a, b) => a.d - b.d)[0]; }
  // demo bot: full throttle, steer around the next obstacle, otherwise follow the road (and grab stars);
  // between 14s and its first crash it steers straight into an obstacle to show the penalty
  demoStep() {
    const tr = this.truck;
    let target = this.roadX(tr.d + 60);
    if (this.demo.t >= 14 && this.hits === 0) {
      const o = this.ob.filter(q => !q.gone && ['cone', 'pothole', 'tractor', 'scooter'].includes(q.type) && q.d > tr.d && q.d < tr.d + 220).sort((a, b) => a.d - b.d)[0];
      if (o) target = o.x;
    } else {
      const o = this.demoAhead(150);
      if (o && Math.abs(o.x - tr.x) < 30) target = o.x + (o.x > tr.x ? -36 : 36);
      else { const f = this.ob.find(q => !q.gone && q.type === 'flower' && q.d > tr.d && q.d < tr.d + 120); if (f) target = f.x; }
    }
    let gas = true;
    // deliver: hug the customer's kerb and slow down through the zone
    const c = this.customers.find(q => !q.served && q.d > tr.d - 30 && q.d - tr.d < 220);
    if (c) { target = this.edgeX(c); if (c.d - tr.d < 130 && tr.v > SLOW_V - 15) gas = false; }
    // traffic light: stop if it will be red (or turning) when we get there
    const l = this.lights.find(q => q.d - tr.d > 15 && q.d - tr.d < 260);
    if (l) {
      const dist = l.d - tr.d - 22, arrive = dist / Math.max(tr.v, 50), st = this.lightState(l, this.t + arrive);
      if (st.s !== 'green' && dist < (tr.v * tr.v) / (2 * this.E.brake) + 30) gas = false;
    }
    if (this.funnelAhead(160) !== undefined && tr.v > 120) gas = false; // ease off into a narrow stretch
    this.vhold('ArrowDown', !gas);
    this.vhold('ArrowLeft', target < tr.x - 5); this.vhold('ArrowRight', target > tr.x + 5);
  }
  init() {
    // Dễ: wider road, fewer obstacles, potholes never knock a load off, a more forgiving par
    const e = this.E = TUNE[game.diff];
    this.deliverPts = e.deliver; // worth clearly more than bringing the load home, even after slowing down for it
    this.potholeLoss = e.pothole;
    [this.starPts, this.fastPts, this.bumpPts] = [e.star, e.fast, e.bump]; // harder = higher ceiling, but crashes cost more
    const r = rng(77);
    this.truck = { x: this.roadX(0), d: 0, v: 0, vx: 0, tilt: 0 };
    this.pots = POTS; this.flowers = 0; this.hits = 0; this.inv = 0; this.shake = 0; this.slip = 0; this.done = false;
    this.parts = new Particles(); this.anim = 0;
    // obstacles
    const ob = [];
    let d = 420;
    while (d < LEN - 260) {
      const k = r(), cx = this.roadX(d), hw = this.roadHW(d) - 14;
      // Scripted surprise beats alternate with regular traffic so players get a
      // clear reaction window, then face either a dog crossing or oncoming car.
      const beat = Math.round((d - 420) / 620);
      if (beat % 5 === 2) {
        const dir = r() < 0.5 ? 1 : -1;
        ob.push({ type: 'dog', x: cx - dir * (hw + 28), d, dir, w: 18, h: 13, go: false, scared: 0 });
      } else if (beat % 5 === 4) {
        const lane = r() < 0.5 ? -1 : 1;
        ob.push({ type: 'oncoming', x: cx + lane * hw * 0.48, d, w: 22, h: 28, v: 125, lane });
      } else if (k < 0.28) { const n = 2 + ((r() * 2) | 0), x0 = cx + (r() * 2 - 1) * (hw - n * 8); for (let i = 0; i < n; i++) ob.push({ type: 'cone', x: x0 + (i - (n - 1) / 2) * 12, d: d + (i % 2) * 6, w: 9, h: 8 }); }
      else if (k < 0.45) ob.push({ type: 'pothole', x: cx + (r() * 2 - 1) * hw, d, w: 18, h: 8 });
      else if (k < 0.58) ob.push({ type: 'puddle', x: cx + (r() * 2 - 1) * hw, d, w: 22, h: 9 });
      else if (k < 0.7) ob.push({ type: 'tractor', x: cx + (r() < .5 ? -1 : 1) * hw * 0.5, d, w: 22, h: 28, v: 62 });
      else if (k < 0.8) ob.push({ type: 'scooter', x: cx + (r() * 2 - 1) * hw * 0.6, d, w: 10, h: 22, v: 95, ph: r() * 6, x0: 0 });
      else if (k < 0.9) { const dir = r() < .5 ? 1 : -1; ob.push({ type: 'ducks', x: cx - dir * (hw + 34), d, dir, w: 34, h: 10, go: false, scared: 0 }); }
      else { for (let i = 0; i < 5; i++) ob.push({ type: 'flower', x: cx + Math.sin(d / 50 + i) * 30, d: d + i * 22, w: 10, h: 10 }); }
      d += 150 + e.gap + r() * 110 - Math.min(50, d / 120);
    }
    ob.forEach(o => { if (o.type === 'scooter') o.x0 = o.x; });
    // keep the road clear around customers and crossings, and keep all traffic clear of the scripted surprise beats as
    // well as stops; the narrow stretches stay clear of everything: squeezing through is the challenge there
    this.ob = ob.filter(o => !this.nearFunnel(o.d, 120) && (['dog', 'oncoming'].includes(o.type) || [...CUSTOMERS, ...LIGHTS].every(fd => Math.abs(o.d - fd) > 150)));
    // a line of stars down the middle of each narrow stretch rewards keeping the vehicle centred
    for (const c of e.funnels) for (let i = -1; i <= 1; i++) this.ob.push({ type: 'flower', x: this.roadX(c + i * 60), d: c + i * 60, w: 10, h: 10 });
    // Thử thách: cones line both kerbs of each narrow stretch
    if (e.cones) for (const c of e.funnels) for (let dd = c - F_FLAT - 40; dd <= c + F_FLAT + 40; dd += 26) for (const side of [-1, 1]) this.ob.push({ type: 'cone', x: this.roadX(dd) + side * (this.roadHW(dd) + 10), d: dd, w: 9, h: 8, kerb: true });
    this.customers = CUSTOMERS.map((d, i) => ({ d, side: r() < 0.5 ? -1 : 1, look: i % 3, served: false, happy: 0 }));
    this.lights = LIGHTS.map(d => ({ d, off: r() * (CYCLE[0] + CYCLE[1] + CYCLE[2]), fined: false, whistle: 0 }));
    this.delivered = 0; this.fines = 0; this.pulled = 0; this.redWarn = null;
    // roadside scenery
    this.deco = [];
    for (let dd = -100; dd < LEN + 400; dd += 18 + r() * 22) {
      for (const side of [-1, 1]) {
        if (r() < 0.2) continue;
        const k = r(), off = this.roadHW(dd) + 24 + r() * 160;
        const type = k < 0.3 ? 'tree' : k < 0.45 ? 'house' : k < 0.75 ? 'tuft' : k < 0.85 ? 'lamp' : k < 0.93 ? 'bush' : 'rock';
        if (dd > LEN - 60 || (type === 'lamp' && this.nearFunnel(dd, 0))) continue;
        this.deco.push({ type, x: this.roadX(dd) + side * (type === 'lamp' ? this.roadHW(dd) + 10 : off), d: dd, v: (r() * 5) | 0 });
      }
    }
    this.shop = this.skin.art.finish();
    this.grass = this.skin.art.ground();
    this.lastPotLost = 0;
    // "road narrows" signs on both kerbs before each funnel
    this.signs = e.funnels.map(c => ({ d: c - F_FLAT - F_TAPER - 110 }));
  }
  sy(d) { return TY - (d - this.truck.d); }
  edgeX(c) { return this.roadX(c.d) + c.side * (this.roadHW(c.d) - 16); } // the delivery spot hugs the customer's kerb
  lightX(l) { return this.roadX(l.d) + this.roadHW(l.d) + 12; }
  lightState(l, at = this.t) {
    const T = CYCLE[0] + CYCLE[1] + CYCLE[2], ph = (at + l.off) % T;
    if (ph < CYCLE[0]) return { s: 'green', left: CYCLE[0] - ph };
    if (ph < CYCLE[0] + CYCLE[1]) return { s: 'yellow', left: CYCLE[0] + CYCLE[1] - ph };
    return { s: 'red', left: T - ph };
  }
  hudScore() { this.setScoreText(this.skin.text.hud(this.pots, POTS, this.delivered)); }

  play(dt) {
    const X = this.skin.text, t = this.t, tr = this.truck, prevD = tr.d;
    this.setTimer(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, t > MAX_TIME - 15);
    if (t >= MAX_TIME) { this.finish(false); return; }
    const L = input.down(...K.left), R = input.down(...K.right), brake = input.down(...K.down, 'Space');
    if (L) this.pulse(0); if (R) this.pulse(1); if (brake) this.pulse(2);
    const cx = this.roadX(tr.d), hw = this.roadHW(tr.d);
    const off = Math.abs(tr.x - cx) > hw - 4;
    const vmax = off ? GRASS_MAX : VMAX;
    if (brake) tr.v = Math.max(0, tr.v - this.E.brake * dt); else tr.v = Math.min(Math.max(tr.v, vmax), tr.v + ACC * dt);
    if (tr.v > vmax) tr.v = Math.max(vmax, tr.v - 200 * dt);
    if (this.pulled > 0) { this.pulled -= dt; tr.v = 0; } // pulled over by the police
    const steer = (R ? 1 : 0) - (L ? 1 : 0);
    const grip = this.slip > 0 ? 1.2 : 9;
    const target = steer * 105 * Math.min(1, 0.25 + tr.v / 110);
    tr.vx += (target - tr.vx) * Math.min(1, grip * dt);
    tr.x = clamp(tr.x + tr.vx * dt, 20, W - 20); tr.d += tr.v * dt;
    tr.tilt += ((tr.vx / 105) * 0.18 - tr.tilt) * Math.min(1, dt * 10);
    this.slip = Math.max(0, this.slip - dt); this.inv = Math.max(0, this.inv - dt); this.shake = Math.max(0, this.shake - dt);
    A.engine(tr.v / VMAX);
    if (off && tr.v > 20 && Math.random() < 0.5) this.parts.add({ x: tr.x + (Math.random() - .5) * 20, y: this.sy(tr.d) + 20 - TY, vx: (Math.random() - .5) * 20, vy: 30, g: 0, life: 0.5, color: this.skin.art.colors.dust, size: 2, kind: 'shrink', world: true });
    // obstacles
    for (const o of this.ob) {
      if (o.gone) continue;
      if (o.type === 'tractor') o.d += o.v * dt;
      if (o.type === 'scooter') { o.d += o.v * dt; o.ph += dt * 1.5; o.x = o.x0 + Math.sin(o.ph) * 18; }
      if (o.type === 'oncoming') { o.d -= o.v * dt; o.x = this.roadX(o.d) + o.lane * (this.roadHW(o.d) * 0.48); }
      if (o.type === 'ducks' || o.type === 'dog') {
        if (!o.go && o.d - tr.d < 300) { o.go = true; A.sfx[this.skin.sfx.crosser](); }
        if (o.go && !o.scared) o.x += o.dir * (o.type === 'dog' ? 58 : 22) * dt;
        if (o.scared) { o.scared += dt; if (o.scared > 1.5) o.gone = true; }
        if (Math.abs(o.x - this.roadX(o.d)) > this.roadHW(o.d) + 60 && o.go) o.gone = true;
      }
      const dx = Math.abs(o.x - tr.x), dd = Math.abs(o.d - tr.d);
      if (dx < 10 + o.w / 2 && dd < 17 + o.h / 2) this.hit(o);
    }
    // deliveries: slow and close to the customer's kerb inside the zone
    for (const c of this.customers) {
      if (c.served || this.pots <= 0) continue;
      if (tr.d > c.d - 45 && tr.d < c.d + 25 && Math.abs(tr.x - this.edgeX(c)) < 20 && tr.v < SLOW_V) {
        c.served = true; c.happy = 2; this.pots--; this.delivered++; this.hudScore();
        A.sfx.great(); cheer(4); this.toast(X.delivered(this.deliverPts), 'good');
        this.parts.burst(this.edgeX(c), c.d, 14, { colors: this.skin.art.colors.deliver, speed: 60, g: 0 });
      }
    }
    // traffic lights: crossing the stop line on red costs time
    for (const l of this.lights) {
      if (prevD + 20 < l.d && tr.d + 20 >= l.d && this.lightState(l).s === 'red' && !l.fined) {
        l.fined = true; l.whistle = 1.5 + PULL_OVER; this.fines++; this.pulled = PULL_OVER; this.cue('all', 400);
        A.tone(2600, 0.12, { type: 'square', vol: 0.12 }); A.tone(2400, 0.25, { type: 'square', vol: 0.12, delay: 0.14 });
        this.toast(X.ranRed(PULL_OVER), 'bad'); this.shake = 0.2;
      }
      l.whistle = Math.max(0, l.whistle - dt);
    }
    for (const c of this.customers) c.happy = Math.max(0, c.happy - dt);
    // phone cues a little ahead of each stop: the side driver + role 2 for customers, role 2 for a light that will not be green, all for a narrow stretch
    this.customers.forEach((c, i) => { if (!c.served && this.pots > 0 && c.d - tr.d > 0 && c.d - tr.d < 260) this.cue([c.side < 0 ? 0 : 1, 2], [50, 50, 50], 'cust' + i, 99); });
    this.lights.forEach((l, i) => { const dist = l.d - tr.d; if (dist > 0 && dist < 300 && this.lightState(l, this.t + dist / Math.max(tr.v, 60)).s !== 'green') this.cue(2, [80, 60, 80], 'light' + i + '_' + Math.floor(this.t / 12.5), 99); });
    // red-light warning: the next light is close and will be red or yellow by the time the vehicle gets there
    const nl = this.lights.find(l => l.d - tr.d > 10 && l.d - tr.d < WARN_D);
    const warn = nl && this.lightState(nl, this.t + (nl.d - tr.d) / Math.max(tr.v, 60)).s !== 'green' ? nl : null;
    if (warn && this.redWarn !== warn) { A.tone(1320, 0.09, { type: 'square', vol: 0.1 }); A.tone(1320, 0.09, { type: 'square', vol: 0.1, delay: 0.16 }); }
    this.redWarn = warn;
    this.E.funnels.forEach(c => { if (c - F_FLAT - F_TAPER - tr.d > 0 && c - F_FLAT - F_TAPER - tr.d < 400) this.cue('all', [40, 40, 40], 'fun' + c, 99); });
    if (tr.d >= LEN) this.finish(true);
    this.common(dt);
  }
  hit(o) {
    const X = this.skin.text, CO = this.skin.art.colors, tr = this.truck;
    if (o.type === 'flower') { o.gone = true; this.flowers++; A.sfx.pickup(); this.parts.burst(o.x, o.d, 8, { colors: CO.pickup, speed: 40, g: 0 }); return; } // a bonus star
    if (o.type === 'puddle') { if (this.slip <= 0) { this.slip = 0.7; tr.vx += (Math.random() < .5 ? -1 : 1) * 90; A.sfx.water(); this.parts.burst(o.x, o.d, 10, { colors: CO.splash, speed: 50, g: 0 }); } return; }
    if (this.inv > 0) return;
    if (o.type === 'ducks' || o.type === 'dog') {
      o.scared = 0.01; tr.v *= o.type === 'dog' ? 0.35 : 0.2; this.inv = 0.8;
      A.sfx[this.skin.sfx.crosser](); this.toast(o.type === 'dog' ? X.dogCrossing : X.ducksCrossing, 'bad'); this.shake = 0.2; return;
    }
    this.hits++; this.inv = 1.3; this.shake = 0.4; A.sfx.bump(); this.cue('all', 150);
    tr.v *= o.type === 'pothole' ? 0.45 : 0.2;
    if (o.type === 'cone') { o.gone = true; this.parts.burst(o.x, o.d, 8, { colors: CO.cone, speed: 60, g: 0 }); }
    if (o.type === 'tractor' || o.type === 'scooter' || o.type === 'oncoming') { tr.vx = (tr.x < o.x ? -1 : 1) * 80; }
    if (this.pots > 0 && (o.type !== 'pothole' || Math.random() < this.potholeLoss)) {
      this.pots--; this.hudScore();
      this.parts.add({ x: tr.x + 6, y: 0, vx: (Math.random() < .5 ? -1 : 1) * 60, vy: -80, g: 200, life: 0.8, drag: 0, img: this.skin.art.cargo(this.pots % 6), world: false, sy0: TY });
      this.toast(X.lostLoad, 'bad');
    }
  }
  finish(won) {
    if (this.done) return; this.done = true; A.engine(-1);
    const X = this.skin.text, E = this.E, t = this.t;
    const fast = won && t < E.par ? (E.par - t) * this.fastPts : 0;
    const timePts = won ? (t <= E.par ? 70 + fast : Math.max(0, 70 - ((t - E.par) / (MAX_TIME - E.par)) * 70)) : 0;
    const prog = clamp(this.truck.d / LEN, 0, 1);
    const score = (won ? timePts + this.pots * POT_PTS + this.flowers * this.starPts + this.delivered * this.deliverPts : prog * 25 + this.delivered * this.deliverPts) - this.hits * this.bumpPts;
    if (won) cheer(10);
    this.end(won ? X.arrived : X.timeUp, { score, lines: [[X.time, won ? `${t.toFixed(1)} giây` : `quá ${clock(MAX_TIME)}`], [X.deliveries, `${this.delivered}/${CUSTOMERS.length} (+${this.delivered * this.deliverPts})`], [X.loadsHome, `${this.pots} (+${this.pots * POT_PTS})`], [X.redLights, this.fines ? `${this.fines} lần (bị giữ xe ${this.fines * PULL_OVER} giây)` : X.redLightsNone], [X.stars, `${this.flowers} (+${Math.round(this.flowers * this.starPts)})`], [X.early(E.par), fast ? `+${Math.round(fast)}` : '—'], [X.crashes, this.hits && this.bumpPts ? `${this.hits} (−${this.hits * this.bumpPts})` : `${this.hits}`]] });
  }
  common(dt) { this.anim += dt; this.parts.update(dt); }
  idle(dt) { this.common(dt); }

  drawWorld(g) {
    const art = this.skin.art, X = this.skin.text, RC = this.road, tr = this.truck, shx = this.shake > 0 ? Math.round(Math.sin(this.shake * 70) * 2) : 0;
    g.save(); g.translate(shx, 0);
    // scrolling ground, then the road row by row
    const gy = (Math.floor(tr.d) % 256) - 256;
    for (let y = gy; y < H; y += 256) g.drawImage(this.grass, -4, y);
    for (let y = -2; y < H + 2; y += 2) {
      const d = tr.d + (TY - y), cx = Math.round(this.roadX(d)), hw = Math.round(this.roadHW(d));
      const band = Math.floor(d / 8) % 2;
      g.fillStyle = RC.verge; g.fillRect(cx - hw - 8, y, hw * 2 + 16, 2);
      g.fillStyle = band ? RC.road : RC.road2; g.fillRect(cx - hw, y, hw * 2, 2);
      g.fillStyle = Math.floor(d / 16) % 2 ? RC.kerb[0] : RC.kerb[1]; g.fillRect(cx - hw - 3, y, 3, 2); g.fillRect(cx + hw, y, 3, 2);
      if (Math.floor(d / 22) % 2 && d < LEN) { g.fillStyle = RC.line; g.fillRect(cx - 1, y, 2, 2); }
      for (const l of this.lights) { // stop line + zebra crossing
        if (d > l.d - 3 && d < l.d) { g.fillStyle = C.white; g.fillRect(cx - hw, y, hw * 2, 2); }
        if (d > l.d + 2 && d < l.d + 18) for (let x = cx - hw + 3; x < cx + hw - 4; x += 9) { g.fillStyle = C.white; g.fillRect(x, y, 5, 2); }
      }
      for (const c of this.customers) if (!c.served && d > c.d - 45 && d < c.d + 25) { // delivery zone hugging the kerb
        const ex = Math.round(c.side < 0 ? cx - hw : cx + hw - 32), edge = d < c.d - 42 || d > c.d + 22;
        g.fillStyle = edge || Math.floor(d / 6) % 2 ? C.yellow : '#ffd23f55'; g.fillRect(ex, y, 32, 2);
      }
      if (d > LEN && d < LEN + 14) { for (let x = cx - hw; x < cx + hw; x += 6) { g.fillStyle = (Math.floor(x / 6) + Math.floor(d / 6)) % 2 ? C.white : C.out; g.fillRect(x, y, 6, 2); } }
    }
    // the building at the finish
    const shopY = this.sy(LEN + 210);
    if (shopY > -20) { drawAt(g, this.shop, this.roadX(LEN), shopY); }
    // collect drawables
    const items = [];
    for (const o of this.deco) {
      const y = this.sy(o.d); if (y < -50 || y > H + 50) continue;
      items.push({ y, f: () => art.deco(g, o, y) });
    }
    for (const o of this.ob) {
      if (o.gone && !o.scared) continue;
      const y = this.sy(o.d); if (y < -40 || y > H + 40) continue;
      const fl = ((this.anim * 6) | 0) % 2;
      const ground = o.type === 'pothole' || o.type === 'puddle';
      items.push({ y: ground ? -999 : y + o.h / 2, f: () => art.ob(g, o, y, fl, this.anim) });
    }
    for (const c of this.customers) {
      const y = this.sy(c.d); if (y < -40 || y > H + 40) continue;
      const x = this.roadX(c.d) + c.side * (this.roadHW(c.d) + 18);
      items.push({ y, f: () => {
        drawAt(g, art.customer(c.look, c.served ? 0 : ((this.anim * 4) | 0) % 2), x, y + 4, { flip: c.side > 0 });
        if (c.served) { if (c.happy > 0) drawAt(g, heart, x, y - 26 - (2 - c.happy) * 8, { ay: .5, alpha: Math.min(1, c.happy) }); }
        else drawAt(g, art.wants(c.look), x + c.side * -2, y - 26 + Math.sin(this.anim * 5) * 2, { ay: .5 });
        if (!c.served) { g.font = 'bold 7px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = C.out; g.fillText(X.dropOff, this.edgeX(c) + 1, y - 46); g.fillStyle = C.yellow; g.fillText(X.dropOff, this.edgeX(c), y - 47); }
      } });
    }
    for (const l of this.lights) {
      const y = this.sy(l.d); if (y < -40 || y > H + 40) continue;
      const x = this.lightX(l), st = this.lightState(l).s;
      items.push({ y: y + 1, f: () => {
        g.fillStyle = C.grayD; g.fillRect(x - 1, y - 30, 3, 31);
        g.fillStyle = C.out; g.fillRect(x - 5, y - 52, 11, 25); g.fillStyle = '#2b2533'; g.fillRect(x - 4, y - 51, 9, 23);
        [['red', '#ff4d5e', -46], ['yellow', '#ffd23f', -39], ['green', '#4fd16a', -32]].forEach(([k, col, dy]) => {
          g.fillStyle = st === k ? col : '#4a4458'; g.beginPath(); g.arc(x + 0.5, y + dy, 3, 0, Math.PI * 2); g.fill();
          if (st === k) { g.globalAlpha = 0.25; g.beginPath(); g.arc(x + 0.5, y + dy, 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
        });
        drawAt(g, art.police(l.whistle > 0 && ((this.anim * 8) | 0) % 2 ? 1 : 0), x + 14, y + 2);
      } });
    }
    // "road narrows" signs: a yellow diamond with two arrows pointing in
    for (const sg of this.signs) {
      const y = this.sy(sg.d); if (y < -40 || y > H + 40) continue;
      for (const side of [-1, 1]) {
        const x = Math.round(this.roadX(sg.d) + side * (this.roadHW(sg.d) + 16));
        items.push({ y: y + 1, f: () => {
          g.fillStyle = C.grayD; g.fillRect(x - 1, y - 22, 2, 23);
          g.fillStyle = C.out; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 11, y - 29); g.lineTo(x, y - 18); g.lineTo(x - 11, y - 29); g.closePath(); g.fill();
          g.fillStyle = C.yellow; g.beginPath(); g.moveTo(x, y - 38); g.lineTo(x + 9, y - 29); g.lineTo(x, y - 20); g.lineTo(x - 9, y - 29); g.closePath(); g.fill();
          g.fillStyle = C.out; g.fillRect(x - 6, y - 30, 3, 2); g.fillRect(x - 4, y - 32, 1, 6); g.fillRect(x + 3, y - 30, 3, 2); g.fillRect(x + 3, y - 32, 1, 6);
        } });
      }
    }
    // the vehicle and its cargo
    const blink = this.inv > 0 && ((this.inv * 10) | 0) % 2;
    items.push({ y: TY + 20, f: () => {
      if (blink) return;
      g.fillStyle = '#00000033'; g.fillRect(Math.round(tr.x - 11), TY + 18, 24, 4);
      g.save(); g.translate(Math.round(tr.x), TY); g.rotate(tr.tilt);
      g.drawImage(art.vehicle, -13, -21);
      const slots = [[-4.5, 1], [4.5, 1], [-4.5, 8], [4.5, 8], [-4.5, 15], [4.5, 15]];
      for (let i = 0; i < this.pots; i++) g.drawImage(art.cargo(i), Math.round(slots[i][0] - 4.5), Math.round(slots[i][1] - 4.5));
      g.restore();
    } });
    items.sort((a, b) => a.y - b.y).forEach(i => i.f());
    // particles in world space: convert d→y
    for (const p of this.parts.list) {
      const y = p.sy0 !== undefined ? p.sy0 + p.y : (p.world ? p.y + TY : this.sy(p.y));
      g.globalAlpha = Math.min(1, (1 - p.t / p.life) * 2);
      if (p.img) drawAt(g, p.img, p.x, y, { ay: .5 }); else { g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(y), p.size, p.size); }
    }
    g.globalAlpha = 1;
    // speed lines
    if (tr.v > VMAX * 0.8) { g.fillStyle = '#ffffff66'; for (let i = 0; i < 6; i++) { const x = (i * 83 + this.anim * 7) % W, y = (this.anim * 600 + i * 47) % H; g.fillRect(x, y, 1, 14); } }
    g.restore();
    // progress bar (right edge)
    const bx = W - 12, by0 = 40, bh = 160, k = clamp(tr.d / LEN, 0, 1);
    g.fillStyle = C.out; g.fillRect(bx - 1, by0 - 1, 6, bh + 2); g.fillStyle = C.cream; g.fillRect(bx, by0, 4, bh);
    g.fillStyle = C.pink; g.fillRect(bx, by0 + bh - Math.round(bh * k), 4, Math.round(bh * k));
    drawAt(g, heart, bx + 2, by0 - 2, {});
    g.fillStyle = C.out; g.fillRect(bx - 3, by0 + bh - Math.round(bh * k) - 2, 10, 4); g.fillStyle = C.yellow; g.fillRect(bx - 2, by0 + bh - Math.round(bh * k) - 1, 8, 2);
    // speedometer
    const sp = Math.round(tr.v / VMAX * 60);
    g.fillStyle = C.out; g.fillRect(6, 29, 46, 15); g.fillStyle = C.cream; g.fillRect(7, 30, 44, 13);
    g.fillStyle = C.pink; g.fillRect(8, 40, Math.round(42 * tr.v / VMAX), 2);
    g.font = '12px "VT323", monospace'; g.textAlign = 'left'; g.fillStyle = C.out; g.fillText(`${sp} km/h`, 10, 39);
    if (tr.v < SLOW_V && tr.v > 1) { g.fillStyle = C.mintD; g.fillRect(53, 30, 4, 13); } // green tick: slow enough to deliver
    // next traffic light: colour + seconds left
    const l = this.lights.find(q => q.d - tr.d > -5 && q.d - tr.d < 700);
    if (l) {
      const st = this.lightState(l), col = { red: '#ff4d5e', yellow: '#ffd23f', green: '#4fd16a' }[st.s], name = X.lightNames[st.s];
      g.fillStyle = C.out; g.fillRect(6, 47, 58, 15); g.fillStyle = C.cream; g.fillRect(7, 48, 56, 13);
      g.fillStyle = col; g.beginPath(); g.arc(14, 54.5, 4, 0, Math.PI * 2); g.fill();
      g.font = '12px "VT323", monospace'; g.fillStyle = C.out; g.fillText(`${name} ${st.left.toFixed(1)}s`, 21, 58);
    }
    // big blinking banner before a light that will be red on arrival
    if (this.redWarn && this.state !== 'ending' && ((this.anim * 4) | 0) % 2 === 0) {
      const m = Math.max(0, Math.round((this.redWarn.d - tr.d) / 10)), txt = X.redWarn(m);
      g.font = 'bold 11px "Baloo 2", sans-serif'; g.textAlign = 'center'; const w = Math.ceil(g.measureText(txt).width) + 16;
      g.fillStyle = C.out; g.fillRect(W / 2 - w / 2 - 1, 87, w + 2, 20); g.fillStyle = C.red; g.fillRect(W / 2 - w / 2, 88, w, 18);
      g.fillStyle = C.white; g.fillText(txt, W / 2, 101); g.textAlign = 'left';
    }
    // pulled over: a big countdown over the vehicle so everyone sees what the red light cost
    if (this.pulled > 0) {
      const txt = X.pulledOver(Math.ceil(this.pulled)), bx = Math.round(clamp(tr.x, 60, W - 60));
      g.font = 'bold 12px "Baloo 2", sans-serif'; g.textAlign = 'center';
      g.fillStyle = C.out; g.fillRect(bx - 56, TY - 58, 112, 18); g.fillStyle = C.red; g.fillRect(bx - 55, TY - 57, 110, 16);
      g.fillStyle = C.white; g.fillText(txt, bx, TY - 45); g.textAlign = 'left';
    }
    // next narrow stretch: distance in metres-ish, blinking once the vehicle is inside
    const fc = this.funnelAhead(900);
    if (fc !== undefined) {
      const m = Math.max(0, Math.round((fc - F_FLAT - F_TAPER - tr.d) / 10)), inside = m === 0;
      if (!inside || ((this.anim * 4) | 0) % 2) {
        g.fillStyle = C.out; g.fillRect(6, 65, 72, 15); g.fillStyle = inside ? C.yellow : C.cream; g.fillRect(7, 66, 70, 13);
        g.font = '12px "VT323", monospace'; g.textAlign = 'left'; g.fillStyle = C.out; g.fillText(inside ? X.narrowNow : X.narrowIn(m), 10, 76);
      }
    }
  }
}
