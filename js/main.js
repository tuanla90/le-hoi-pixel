import * as A from './audio.js';
import { C, drawAt } from './gfx.js';
import * as S from './sprites.js';
import { initNet, pushState } from './net.js';

export const W = 480, H = 270;
const cv = document.getElementById('game');
const g = cv.getContext('2d');
const stage = document.getElementById('stage');
export const uiRoot = document.getElementById('ui');

// ------------------------------------------------------------------ online play
// js/online.js turns this on: every browser in a room runs the same simulation, stepped 60 times a second by the
// server's clock, with everyone's button presses delivered as timestamped events (lockstep). While on, the local
// keyboard does not touch the simulation directly; online.onKey turns allowed keys into events instead.
export const online = { on: false, reserve: 0, reserveRight: 0, onKey: null, pump: null };

// ------------------------------------------------------------------ scaling
export function resize() {
  // online phones keep room for touch buttons: below the game when held upright, on the right when sideways
  const s = Math.min((innerWidth - online.reserveRight) / W, (innerHeight - online.reserve) / H);
  stage.style.width = W * s + 'px'; stage.style.height = H * s + 'px';
  document.documentElement.style.setProperty('--u', s + 'px');
  // online on a phone: cards and HUD get the whole area beside the touch buttons (not just the small game picture),
  // scaled up as far as the cards fit, so they stay readable
  const phone = online.reserve || online.reserveRight;
  if (phone) {
    const aw = innerWidth - online.reserveRight, ah = innerHeight - online.reserve, u = Math.max(s, Math.min(aw / 340, ah / 240));
    Object.assign(uiRoot.style, { position: 'fixed', left: '0', top: '0', width: aw + 'px', height: ah + 'px' }); uiRoot.style.setProperty('--u', u + 'px');
  } else uiRoot.removeAttribute('style');
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ input
const down = new Set(), hits = new Set();
const hitAt = {};              // code -> performance.now() of the latest press (keyboard or phone)
const remote = new Map();      // phone pid -> Set of key codes it holds
const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
addEventListener('keydown', e => {
  A.unlock();
  const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (typing && e.code !== 'Escape') return;
  if (BLOCK.has(e.code)) e.preventDefault();
  if (online.on) { if (!e.repeat) online.onKey?.(e.code, true); return; }
  if (!e.repeat) { hits.add(e.code); hitAt[e.code] = e.timeStamp || performance.now(); }
  down.add(e.code);
});
addEventListener('keyup', e => { if (online.on) online.onKey?.(e.code, false); else down.delete(e.code); });
addEventListener('blur', () => { if (online.on) online.onKey?.(null, false); else down.clear(); });
addEventListener('pointerdown', () => A.unlock());
// demos drive the game through a virtual keyboard: while set, scenes read it instead of the real keys
let virt = null;
const remoteDown = k => { for (const s of remote.values()) if (s.has(k)) return true; return false; };
export const input = {
  down: (...c) => c.some(k => (virt ? virt.down.has(k) : down.has(k) || remoteDown(k))),
  hit: (...c) => c.some(k => (virt ? virt.hits : hits).has(k)),
  rawHit: (...c) => c.some(k => hits.has(k)),
  eat: (...c) => c.forEach(k => hits.delete(k)),
  setVirtual(v) { virt = v; },
  // when (performance.now() clock) the newest of these keys was pressed this frame, or null
  hitTime: (...c) => { let t = null; for (const k of c) if (hits.has(k) && hitAt[k] != null) t = Math.max(t ?? -1e9, hitAt[k]); return t; },
};
// phone controllers feed the same key codes as the keyboard
function remoteKey(pid, code, isDown, ts) {
  A.unlock();
  const set = remote.get(pid) || new Set(); remote.set(pid, set);
  if (isDown) { if (!set.has(code)) { hits.add(code); hitAt[code] = Math.min(performance.now(), ts || performance.now()); } set.add(code); }
  else if (hits.has(code)) pendingUp.push([pid, code]); // a quick tap whose press and release land in one frame still counts as held for that frame
  else set.delete(code);
}
const pendingUp = [];
const releaseRemote = pid => remote.delete(pid);
// online: a press or release from player `pid`, applied at a fixed simulation tick on every browser.
// hitMs is the simulation clock (ms) when the player actually pressed, so the rhythm round judges what they saw.
export function applyKey(pid, code, isDown, hitMs) {
  const set = remote.get(pid) || new Set(); remote.set(pid, set);
  if (isDown) { if (!set.has(code)) { hits.add(code); hitAt[code] = hitMs; } set.add(code); }
  else if (hits.has(code)) pendingUp.push([pid, code]);
  else set.delete(code);
}
export const releaseKeys = pid => { if (pid == null) remote.clear(); else remote.delete(pid); };
export const K = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  ok: ['Space', 'Enter', 'NumpadEnter'], back: ['Escape'],
};

// ------------------------------------------------------------------ scenes & transitions
const scenes = {};
export function register(name, factory) { scenes[name] = factory; }
export const game = { scene: null, sceneName: '', campaign: null, time: 0, diff: 'normal', frameWall: 0, modal: null };
// difficulty is chosen per round ('easy' = Dễ; 'normal' = Thường, default; 'hard' = Thử thách) and remembered per browser;
// game.diff holds the difficulty of the round currently on screen
export const DIFFS = ['easy', 'normal', 'hard'];
export const isEasy = () => game.diff === 'easy';
// pick a tuning value for the current difficulty: tune(Dễ, Thường, Thử thách)
export const tune = (e, n, h) => (game.diff === 'hard' ? h : game.diff === 'normal' ? n : e);
// online, the choice belongs to the room's simulation (identical on every browser), not to this browser's storage
export function diffOf(id) {
  if (online.on) return (game.roomDiffs || {})[id] || 'normal';
  try { const d = localStorage.getItem('thoa_diff_' + id); return DIFFS.includes(d) ? d : 'normal'; } catch (e) { return 'normal'; }
}
export function setDiffOf(id, d) {
  if (online.on) { (game.roomDiffs ||= {})[id] = d; return; }
  try { localStorage.setItem('thoa_diff_' + id, d); } catch (e) { /* ignore */ }
}
export const DIFF_NAME = { easy: 'Dễ', normal: 'Thường', hard: 'Thử thách' };
export const DIFF_ICON = { easy: '🌼', normal: '🌷', hard: '🔥' };
// each round's score is multiplied by this before it counts toward the total
export const DIFF_MULT = { easy: 0.9, normal: 1.0, hard: 1.1 };
// 100 is par in every round; only half of anything above par counts, so no single round can run away with the total
export const OVERPAR = 0.5;
export const softCap = raw => (raw <= 100 ? raw : 100 + (raw - 100) * OVERPAR);
export const SHOP_NAME = 'Tiệm Hoa Ba Chị Em';
// team name: set by the MC (title screen, intro card, phone lobby) or by whoever plays Lan on a phone;
// remembered in this browser and shown on intro/result cards, the final board and every personal card
export const TEAM_MAX = 24;
game.team = (() => { try { return localStorage.getItem('thoa_team') || ''; } catch (e) { return ''; } })();
const teamListeners = new Set();
export const onTeam = fn => { teamListeners.add(fn); return () => teamListeners.delete(fn); };
export function setTeam(name) {
  const n = String(name || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().replace(/^đội\s+/i, '').slice(0, TEAM_MAX); // "Đội X" is shown as "Đội X", not "Đội Đội X"
  game.team = n; if (!online.on) try { localStorage.setItem('thoa_team', n); } catch (e) { /* ignore */ }
  pushState(true); teamListeners.forEach(fn => fn());
  return n;
}
export const teamTag = () => (game.team ? `Đội ${game.team}` : '');
// best scores are kept separately per difficulty
export const bestKey = (id, d = game.diff) => 'thoa_best_' + id + ({ normal: '_th', hard: '_tt' }[d] || '');
let trans = null; // {t, dur, next, params, swapped}

export function go(name, params = {}) {
  if (trans) return;
  A.sfx.click();
  trans = { t: 0, dur: 0.75, next: name, params, swapped: false };
  uiRoot.classList.add('fading');
}
function swap(name, params) {
  if (game.scene && game.scene.exit) game.scene.exit();
  uiRoot.innerHTML = ''; cheers.length = 0;
  game.scene = scenes[name](params); game.sceneName = name;
  if (game.scene.enter) game.scene.enter();
}
export function start(name, params) { swap(name, params); }

// ------------------------------------------------------------------ cheering crowd (audience emoji)
const cheers = [];
const CHEER_IMG = [S.heart, S.star, S.note, S.sparkleFlower[0]];
export function cheer(n = 3, kind = -1) {
  for (let i = 0; i < n; i++) cheers.push({ x: W - 14 - Math.random() * 26, y: H + 6 + Math.random() * 20, vy: -(26 + Math.random() * 18), ph: Math.random() * 6, t: 0, life: 2.4 + Math.random(), img: CHEER_IMG[kind >= 0 ? kind : (Math.random() * 4) | 0] });
}

// ------------------------------------------------------------------ loop
let last = performance.now();
// debug: advance the simulation by `sec` seconds (used for automated testing)
window.__step = (sec, press) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { if (press && i === 0) press.forEach(k => { hits.add(k); }); tick(1 / 60); } };
window.__game = game;
window.__hold = (codes, on) => codes.forEach(k => on ? down.add(k) : down.delete(k));
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  // schedule first so one bad frame can never freeze the whole game
  requestAnimationFrame(frame);
  try { if (online.on) online.pump(now); else tick(dt); } catch (e) { console.error('[Tiệm Hoa] frame error', e); }
}
function tick(dt) { simStep(dt); pushState(); render(); }
// one step of game logic. Online it runs at exactly 1/60 s inside withDet(), with `wall` = the simulation clock (ms).
export function simStep(dt, wall = performance.now()) {
  game.time += dt; game.frameWall = wall;
  // an open overlay (QR lobby) takes the keys so Esc/Space don't leak into the scene behind it (local play only:
  // online, an overlay on one browser must not change what the others simulate)
  if (game.modal && !online.on) { if (hits.has('Escape')) game.modal.close(); hits.clear(); }
  if (trans) {
    trans.t += dt;
    if (!trans.swapped && trans.t >= trans.dur / 2) { trans.swapped = true; swap(trans.next, trans.params); uiRoot.classList.remove('fading'); }
    if (trans.t >= trans.dur) trans = null;
  }
  const sc = game.scene;
  if (sc && (!trans || trans.swapped)) sc.update(dt);
  hits.clear();
  for (const [pid, code] of pendingUp.splice(0)) remote.get(pid)?.delete(code);
  for (const c of cheers) { c.t += dt; c.y += c.vy * dt; c.ph += dt * 3; }
  for (let i = cheers.length - 1; i >= 0; i--) if (cheers[i].t > cheers[i].life) cheers.splice(i, 1);
}
// start the simulation over from a known state (online: entering a room, or the room starting a fresh game)
export function resetSim(sceneName = 'title') {
  down.clear(); hits.clear(); remote.clear(); pendingUp.length = 0; virt = null; trans = null; cheers.length = 0;
  for (const k in hitAt) delete hitAt[k];
  game.time = 0; game.campaign = null; game.diff = 'normal'; game.roomDiffs = {}; game.team = ''; game.modal?.close?.(); game.modal = null;
  uiRoot.classList.remove('fading');
  swap(sceneName, {});
}
export function render() {
  const sc = game.scene;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  if (sc) sc.draw(g);
  // cheers
  for (const c of cheers) drawAt(g, c.img, c.x + Math.sin(c.ph) * 4, c.y, { ay: .5, alpha: Math.min(1, (c.life - c.t) * 2) });
  // iris transition
  if (trans) {
    const k = trans.t / trans.dur, r = (k < .5 ? 1 - k * 2 : (k - .5) * 2);
    const rad = r * 300;
    g.fillStyle = C.out; g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, Math.max(0, rad), 0, Math.PI * 2, true); g.fill('evenodd');
    if (rad < 70) { drawAt(g, S.heart, W / 2, H / 2, { ay: .5, sx: 3, sy: 3, alpha: 1 - rad / 70 }); }
  }
}

// ------------------------------------------------------------------ helpers for DOM UI
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export function key(k) { return `<span class="key">${k}</span>`; }
export function img(cv, cls = '') { return `<img class="px ${cls}" src="${S.toURL(cv, 4)}" alt="">`; }

export async function boot() {
  const mods = await Promise.all([import('./scenes/title.js'), import('./scenes/garden.js'), import('./scenes/carry.js'), import('./scenes/drive.js'), import('./scenes/sign.js'), import('./scenes/shop.js'), import('./scenes/final.js')]);
  mods.forEach(m => m.default && m.default());
  const q = new URLSearchParams(location.search).get('scene');
  start(q && scenes[q] ? q : 'title', {});
  requestAnimationFrame(frame);
  import('./online.js').then(m => m.initOnline()); // offers online rooms when the server supports them (and handles ?room= links)
  initNet({
    key: remoteKey, release: releaseRemote,
    phase: () => ({ scene: game.sceneName, state: game.scene?.state || 'menu', team: game.team }),
    setTeam,
    toast: text => game.scene?.toast?.(text),
  });
}
boot();
