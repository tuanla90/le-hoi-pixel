// Online rooms: everyone plays on their own phone or computer, from anywhere.
//
// Lockstep: every browser in the room runs the very same simulation. The server stamps each button press with the
// tick (1/60 s) at which everyone must apply it and tells us how far we may simulate ("u"). We replay those events in
// order, with deterministic maths (detmath.js), so all screens show the same game — cards, HUD and results included.
// Joining late (or reconnecting) replays the room's history from the start of the current game, silently.
import { game, online, uiRoot, el, simStep, render, resetSim, applyKey, resize, setTeam } from './main.js';
import { withDet, seedDet } from './detmath.js';
import { net, CAPTAIN } from './net.js';
import { esc, openTeamDialog } from './lobby.js';
import { theme } from './theme.js';
import * as A from './audio.js';

const TICK_MS = 1000 / 60;
const BUFFER = 3;           // play this many ticks behind the server so jitter does not stall the picture
const HASH_EVERY = 120;     // compare game state with the others every 2 s
const MENU_KEYS = ['Space', 'Enter', 'NumpadEnter', 'Escape', 'KeyH', 'KeyV']; // only the room host drives menus and cards
const LOCAL_ACTS = new Set(['phones', 'team', 'sound', 'online', 'board']);   // buttons that only open something on this device
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

const S = {
  ws: null, code: '', pid: '', name: '', epoch: 0, seed: 1, ready: false,
  room: null,               // { host, roles[], players[] }
  events: [],               // [tick, pid, e] not applied yet (sorted by tick)
  simTick: 0, lastU: 0, lastURecv: 0, catching: false, held: new Set(), gameNo: 0, desync: false, closedByUs: false, hashLog: {},
};
let pid = store.get('thoa_pid'); if (!pid) { pid = Math.random().toString(36).slice(2, 12); store.set('thoa_pid', pid); }
S.pid = pid; net.myPid = pid;

// ------------------------------------------------------------------ entry points
export async function initOnline() {
  try { const r = await fetch('/api/ping', { cache: 'no-store' }); if (!r.ok) return; } catch (e) { return; } // static hosting: offline only
  net.onlineAvailable = true;
  game.scene?.renderMenu?.(); // the title screen grows "Chơi online" / "Bảng xếp hạng" buttons
  net.openOnline = openOnline;
  const code = new URLSearchParams(location.search).get('room');
  if (code) openOnline(code.toUpperCase());
}

// "Chơi online" dialog: name + create a room, or a code to join one
function openOnline(prefill = '') {
  if (S.ready) { openRoom(); return; }
  if (game.modal) return;
  const box = el(`<div class="lobby"><form class="card online-card pop"><div class="ribbon">🌐 Chơi online</div>
    <label>Tên của bạn <input class="team-input" name="nm" maxlength="14" placeholder="VD: Hương" value="${esc(store.get('thoa_name') || '')}" autocomplete="off"></label>
    <div class="online-row"><button class="btn big" type="button" data-new>✨ Tạo phòng mới</button></div>
    <div class="online-or">— hoặc vào phòng của bạn bè —</div>
    <div class="online-row"><input class="team-input code-input" name="code" maxlength="6" placeholder="MÃ PHÒNG" value="${esc(prefill)}" autocomplete="off"><button class="btn mint" type="submit">Vào phòng</button></div>
    <p class="online-note">Mỗi người chơi trên điện thoại hoặc máy tính của mình, ở đâu cũng được. Phòng có 3 vai ${theme.roles.map(R => R.name).join(' · ')}, người vào sau xem cùng.</p>
    <div class="btns"><a class="btn alt" href="${boardURL()}" target="_blank" rel="noopener">🏆 Bảng xếp hạng</a><button class="btn alt" type="button" data-x>Đóng <span class="key">Esc</span></button></div>
    <div class="online-err"></div>
  </form></div>`);
  uiRoot.appendChild(box);
  const f = box.querySelector('form'), err = box.querySelector('.online-err');
  const close = () => { box.remove(); game.modal = null; };
  const go = code => {
    const name = f.nm.value.trim().slice(0, 14);
    if (!name) { err.textContent = 'Nhập tên của bạn trước nhé!'; f.nm.focus(); return; }
    store.set('thoa_name', name); close(); connect(code, name);
  };
  box.querySelector('[data-new]').addEventListener('click', () => go('NEW'));
  f.addEventListener('submit', e => { e.preventDefault(); const c = f.code.value.trim().toUpperCase(); if (!c) { err.textContent = 'Nhập mã phòng (4 ký tự).'; return; } go(c); });
  box.querySelector('[data-x]').addEventListener('click', close);
  game.modal = { close };
  setTimeout(() => (prefill ? f.nm : f.nm).focus(), 30);
}

// ------------------------------------------------------------------ connection
function connect(code, name) {
  S.name = name; S.code = code; S.closedByUs = false;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/room?code=${encodeURIComponent(code)}&pid=${S.pid}&name=${encodeURIComponent(name)}&theme=${encodeURIComponent(theme.id)}`);
  S.ws = ws;
  banner('Đang kết nối phòng…');
  ws.onmessage = e => handle(JSON.parse(e.data));
  ws.onclose = () => {
    if (S.ws !== ws || S.closedByUs) return;
    if (!S.ready) { banner(''); return; }
    banner('Mất kết nối… đang nối lại');
    setTimeout(() => connect(S.code, S.name), 1500); // rejoin: the welcome replays the game from its history
  };
}
const send = o => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); };

function handle(m) {
  if (m.t === 'err') { banner(''); toastLocal(m.msg); S.ws?.close(); return; }
  if (m.t === 'kicked') { S.closedByUs = true; banner('Phòng này đã mở ở tab khác'); return; }
  if (m.t === 'welcome') {
    // the room plays another festival: reload into that theme, then join again from the link
    if (m.theme && m.theme !== theme.id) {
      S.closedByUs = true; S.ws?.close();
      if (new URLSearchParams(location.search).get('theme') !== m.theme) location.href = `/?theme=${encodeURIComponent(m.theme)}&room=${m.code}`;
      else banner('Máy này không mở được chủ đề của phòng — tải lại trang thử nhé'); // the theme failed to load: never loop
      return;
    }
    S.code = m.code; history.replaceState(null, '', `?theme=${encodeURIComponent(theme.id)}&room=${m.code}`);
    startGame(m.epoch, m.seed, m.ev, m.u);
    return;
  }
  if (m.t === 'reset') { startGame(m.epoch, m.seed, m.ev, m.u); return; }
  if (m.t === 'room') { S.room = m; syncNet(); refreshRoomPanel(); return; }
  if (m.t === 'f') {
    if (!S.ready) return;
    for (const r of m.ev) S.events.push(r);
    S.lastU = m.u; S.lastURecv = performance.now();
    return;
  }
  if (m.t === 'desync') { S.desync = true; banner('⚠️ Màn hình của bạn lệch với phòng — chạm vào đây để đồng bộ lại', () => location.reload()); }
}

// (re)start the shared simulation from tick 0 and fast-forward through the history
function startGame(epoch, seed, history, u) {
  S.epoch = epoch; S.seed = seed; S.events = history.slice(); S.simTick = 0; S.hashLog = {}; S.lastU = u; S.lastURecv = performance.now(); S.gameNo = 0; S.desync = false;
  S.held.clear();
  online.on = true; net.online = true;
  withDet(() => { seedDet(seed * 7919 + epoch); resetSim('title'); });
  if (!S.ready) { S.ready = true; installUi(); }
  S.catching = u > 30; A.setQuiet(S.catching); if (S.catching) banner('Đang đồng bộ trận đấu…'); else banner('');
  syncNet(); buildControls(true);
}

// ------------------------------------------------------------------ the loop (main.js calls pump every animation frame)
online.pump = now => {
  if (!S.ready) { render(); return; }
  const est = S.lastU + (now - S.lastURecv) / TICK_MS;
  const target = Math.min(S.lastU, Math.floor(est) - BUFFER);
  const n = target - S.simTick;
  if (n > 120 && !S.catching) { S.catching = true; A.setQuiet(true); }
  if (S.catching) { const t0 = performance.now(); while (S.simTick < target && performance.now() - t0 < 40) stepOnce(); } // big silent chunks
  else for (let i = 0; i < Math.min(n, 4); i++) stepOnce(); // normally 1 step per 60 Hz frame; a little faster when slightly behind
  if (S.catching && target - S.simTick <= 4) { S.catching = false; A.setQuiet(false); banner(''); }
  render();
  buildControls();
  if (isHost() && now - (S.sceneSent || 0) > 1000) { S.sceneSent = now; send({ t: 'scene', s: game.sceneName }); } // lets the server start a fresh clock when idle
};
function stepOnce() {
  const t = S.simTick;
  withDet(() => {
    while (S.events.length && S.events[0][0] <= t) applyEvent(S.events.shift());
    simStep(1 / 60, t * TICK_MS);
  });
  S.simTick++;
  if (S.simTick % HASH_EVERY === 0) {
    const h = stateHash(); send({ t: 'hash', tick: S.simTick, epoch: S.epoch, h });
    S.hashLog[S.simTick] = h; delete S.hashLog[S.simTick - HASH_EVERY * 60]; // last two minutes, for debugging in the console
  }
}
function applyEvent([, who, e]) {
  if (e.k) { applyKey(who, e.k, e.d, e.c * TICK_MS); return; }
  if (e.a) { const sc = game.scene; if (sc?.action) sc.action(e.a); else if (sc?.act) sc.act(e.a); return; }
  if (e.team != null) setTeam(e.team);
}
// a cheap fingerprint of the simulation (numbers rounded so it is the same on every engine)
function stateHash() {
  let h = 2166136261 >>> 0;
  const mix = v => { const s = typeof v === 'number' ? v.toFixed(5) : String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  const sc = game.scene || {};
  mix(game.sceneName); mix(game.time); mix(game.team);
  for (const k of Object.keys(sc).sort()) {
    const v = sc[k];
    if (typeof v === 'number' || typeof v === 'boolean') { mix(k); mix(v); }
    else if (typeof v === 'string' && v.length < 40) { mix(k); mix(v); }
    else if (Array.isArray(v)) { mix(k); mix(v.length); }
  }
  return h.toString(36);
}

// ------------------------------------------------------------------ who controls what
const myRoles = () => { const r = S.room; if (!r) return []; return [0, 1, 2].filter(i => r.roles[i] === S.pid || (r.host === S.pid && (!r.roles[i] || !r.players.find(p => p.pid === r.roles[i])?.on))); };
const isHost = () => S.room?.host === S.pid;
function sceneCodes(roles) {
  const sc = game.scene; const codes = sc?.roleCodes || (sc?.demoKeys || []).map(ks => ks.map(k => k[0]));
  const out = new Set(); roles.forEach(r => (codes[r] || []).forEach(c => out.add(c)));
  return out;
}
// local keyboard → events (only your role's keys; the host also has the menu keys). P/N/M stay on this device.
online.onKey = (code, down) => {
  if (!S.ready) return;
  if (code == null) { for (const c of [...S.held]) online.onKey(c, false); return; }
  if (down && code === 'KeyP') { openRoom(); return; }
  if (down && code === 'KeyN') { if (isHost() || S.room?.roles[CAPTAIN] === S.pid) openTeamDialog(); return; }
  if (down && code === 'KeyM') { A.toggleMute(); return; }
  if (game.modal && down) return; // a panel is open on this device (releases still go through, so no key gets stuck)
  const allowed = sceneCodes(myRoles());
  if (isHost()) MENU_KEYS.forEach(k => allowed.add(k));
  if (!allowed.has(code) && !S.held.has(code)) return;
  if (down) { if (S.held.has(code)) return; S.held.add(code); } else { if (!S.held.has(code)) return; S.held.delete(code); }
  send({ t: 'ev', e: { k: code, d: down, c: S.simTick } });
};

// clicks on card/menu buttons become events so every browser presses them at the same tick
function installUi() {
  document.addEventListener('click', e => {
    if (!S.ready) return;
    const b = e.target.closest('[data-act],[data-a]'); if (!b || !uiRoot.contains(b) || b.closest('.lobby')) return;
    const v = b.dataset.act || b.dataset.a;
    if (LOCAL_ACTS.has(v)) return; // opens a panel on this device only
    e.preventDefault(); e.stopPropagation();
    if (isHost()) send({ t: 'ev', e: { a: v } }); else toastLocal('Chủ phòng bấm nút này nhé 🙂');
  }, true);
  net.openRoom = openRoom;
  net.sendTeam = name => send({ t: 'ev', e: { team: name } });
  net.showCard = showCard;
  net.onFinal = onFinal;
  const lastBuzz = {};
  net.localBuzz = (who, pattern, tag, gap = 0.6) => {
    const mine = myRoles(), list = who === 'all' ? [0, 1, 2] : [].concat(who);
    if (!list.some(r => mine.includes(r)) || !navigator.vibrate || S.catching) return;
    const now = performance.now() / 1000; if (tag) { if (now - (lastBuzz[tag] ?? -99) < gap) return; lastBuzz[tag] = now; }
    navigator.vibrate(pattern);
  };
  document.body.classList.add('online');
  addEventListener('resize', () => buildControls(true));
}
// the room's players and roles, in the shape the existing UI (role chips, HUD names, personal cards) reads
function syncNet() {
  const r = S.room; if (!r) return;
  net.roles = r.roles.slice();
  net.players = new Map(r.players.map(p => [p.pid, { name: p.name, on: p.on }]));
  net.onlineRoom = r;
  game.scene?.renderMenu?.();
}

// ------------------------------------------------------------------ touch buttons (phones) under the game
let ctlKey = '';
function buildControls(force = false) {
  const touch = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const scene = game.sceneName, roles = myRoles(), key = [touch, scene, roles.join(), innerWidth > innerHeight].join('|');
  if (!force && key === ctlKey) return;
  ctlKey = key;
  let bar = document.getElementById('controls');
  const defs = theme.controls[scene];
  if (!touch || !defs || !roles.length) { bar?.remove(); if (online.reserve || online.reserveRight) { online.reserve = online.reserveRight = 0; document.body.classList.remove('side'); resize(); } return; }
  if (!bar) { bar = el('<div id="controls"></div>'); document.body.appendChild(bar); }
  bar.innerHTML = roles.map(r => {
    const d = defs.roles[r], R = theme.roles[r];
    return `<div class="ctl-role" style="--c:${R.c};--cd:${R.cd}"><div class="ctl-name">${R.icon} ${R.name} · ${esc(d.d)}</div>
      <div class="ctl-btns">${d.b.map(b => `<button class="ctl-btn" data-k="${b.k}"><span>${b.l}</span><small>${esc(b.s)}</small></button>`).join('')}</div></div>`;
  }).join('');
  const held = new Map();
  bar.onpointerdown = e => { const b = e.target.closest('.ctl-btn'); if (!b) return; e.preventDefault(); A.unlock(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } held.set(e.pointerId, b); b.classList.add('on'); online.onKey(b.dataset.k, true); navigator.vibrate?.(10); };
  const up = e => { const b = held.get(e.pointerId); if (!b) return; held.delete(e.pointerId); if (![...held.values()].includes(b)) { b.classList.remove('on'); online.onKey(b.dataset.k, false); } };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => bar.addEventListener(n, up));
  // upright: the game spans the width and the buttons fill everything below it; sideways: buttons in a column on the right
  const side = innerWidth > innerHeight;
  bar.classList.toggle('side', side); document.body.classList.toggle('side', side);
  if (side) {
    online.reserve = 0; online.reserveRight = Math.max(140, Math.min(innerWidth * 0.36, innerWidth - innerHeight * 480 / 270 - 6));
    Object.assign(bar.style, { top: '0', left: 'auto', right: '0', bottom: '0', height: 'auto', width: online.reserveRight + 'px' });
  } else {
    online.reserveRight = 0; online.reserve = Math.max(200, Math.min(innerHeight * 0.42, innerHeight - innerWidth * 270 / 480 - 6));
    Object.assign(bar.style, { top: 'auto', left: '0', right: '0', bottom: '0', width: 'auto', height: online.reserve + 'px' });
  }
  resize();
}

// ------------------------------------------------------------------ room panel
let roomBox = null;
function openRoom() {
  if (roomBox) return;
  roomBox = el(`<div class="lobby room-panel"><div class="card lobby-card pop"><div class="ribbon">🌐 Phòng</div><div class="room-body"></div>
    <div class="btns"><button class="btn" data-x>Xong <span class="key">Esc</span></button></div></div></div>`);
  uiRoot.appendChild(roomBox);
  const close = () => { roomBox?.remove(); roomBox = null; game.modal = null; };
  roomBox.querySelector('[data-x]').addEventListener('click', close);
  roomBox.addEventListener('click', e => { if (e.target === roomBox) close(); });
  game.modal = { close };
  refreshRoomPanel();
}
function refreshRoomPanel() {
  if (!roomBox || !S.room) return;
  const r = S.room, link = `${location.origin}/?theme=${encodeURIComponent(theme.id)}&room=${S.code}`;
  const qr = typeof window.qrcode === 'function' ? (() => { const q = window.qrcode(0, 'M'); q.addData(link); q.make(); return `<img class="qr" src="${q.createDataURL(6, 2)}" alt="Mã QR vào phòng">`; })() : '';
  const name = p => esc(r.players.find(x => x.pid === p)?.name || '?');
  const body = roomBox.querySelector('.room-body');
  body.innerHTML = `
    <div class="room-top">${qr}<div><div class="room-code">Mã phòng <b>${S.code}</b></div>
      <div class="room-link">${esc(link)}</div>
      <button class="seg" data-copy>📋 Sao chép link mời</button>
      <div class="room-team">🏷️ Đội: <b>${esc(game.team || 'chưa đặt')}</b> ${isHost() || r.roles[CAPTAIN] === S.pid ? '<button class="seg" data-team>✏️ Đổi</button>' : ''}</div></div></div>
    <div class="room-roles">${theme.roles.map((R, i) => {
      const h = r.roles[i], mine = h === S.pid;
      return `<button class="room-role ${mine ? 'mine' : ''}" data-role="${i}" style="--rc:${R.c}"><b>${R.icon} ${R.name}</b><small>${h ? name(h) + (r.players.find(x => x.pid === h)?.on ? '' : ' (vắng)') : 'Trống — chủ phòng điều khiển'}</small><span>${mine ? 'Bạn ✓ (bấm để bỏ)' : h ? '' : 'Nhận vai'}</span></button>`;
    }).join('')}</div>
    <div class="room-players">Trong phòng: ${r.players.map(p => `<span class="pl ${p.on ? '' : 'off'}">${p.pid === r.host ? '👑 ' : ''}${esc(p.name)}${p.pid === S.pid ? ' (bạn)' : ''}</span>`).join(' ')}</div>
    <div class="room-actions">${isHost() ? '<button class="seg" data-newgame>🔄 Ván mới (về màn hình chính)</button>' : ''}<a class="seg" href="${boardURL()}" target="_blank" rel="noopener">🏆 Bảng xếp hạng</a><button class="seg" data-leave>🚪 Rời phòng</button></div>
    <small class="room-hint">Chủ phòng 👑 điều khiển menu và thẻ. Mỗi vai bấm phím của mình${matchMedia('(pointer: coarse)').matches ? ' bằng nút dưới màn hình' : ' trên bàn phím'}; vai trống do chủ phòng điều khiển.</small>`;
  body.querySelectorAll('[data-role]').forEach(b => b.addEventListener('click', () => send({ t: 'role', role: +b.dataset.role })));
  body.querySelector('[data-copy]')?.addEventListener('click', () => { navigator.clipboard?.writeText(link).then(() => toastLocal('Đã sao chép link mời!')); });
  body.querySelector('[data-team]')?.addEventListener('click', () => { roomBox.remove(); roomBox = null; game.modal = null; openTeamDialog(openRoom); });
  body.querySelector('[data-newgame]')?.addEventListener('click', () => { if (confirm('Bắt đầu ván mới cho cả phòng?')) send({ t: 'newgame' }); });
  body.querySelector('[data-leave]')?.addEventListener('click', () => { S.closedByUs = true; S.ws?.close(); location.href = `/?theme=${encodeURIComponent(theme.id)}`; });
}

// ------------------------------------------------------------------ finale: personal card + leaderboard
function showCard(card) {
  if (!card) { toastLocal('Bạn chỉ xem ván này nên chưa có thiệp — nhận một vai ở ván sau nhé!'); return; }
  const url = theme.drawCard(card);
  const box = el(`<div class="lobby"><div class="card card-view pop"><img src="${url}" alt="${esc(theme.cardName)}">
    <div class="btns"><a class="btn mint" href="${url}" download="${theme.cardFile}.png">⬇️ Lưu ảnh</a><button class="btn alt" data-x>Đóng</button></div>
    <small>Điện thoại: nhấn giữ vào ảnh để lưu.</small></div></div>`);
  uiRoot.appendChild(box);
  box.querySelector('[data-x]').addEventListener('click', () => box.remove());
}
function onFinal({ scores, diffs, total, rankName, team }) {
  S.gameNo++; // the same count on every browser, so a replay posts the same key and the server ignores the duplicate
  if (!isHost() || S.catching) return;
  const r = S.room, members = [...new Set(r.roles.filter(Boolean).map(p => r.players.find(x => x.pid === p)?.name).filter(Boolean))];
  fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme: theme.id, room: S.code, epoch: S.epoch, game: S.gameNo, team, members, scores, diffs, total, rankName }) })
    .then(r => r.json()).then(j => { if (j.place) toastLocal(`🏆 Đội đứng hạng #${j.place} trên bảng xếp hạng!`); else if (j.error === 'incomplete game') toastLocal(`Chỉ ván đủ ${theme.rounds.length} vòng mới lên bảng xếp hạng.`); })
    .catch(() => toastLocal('Không gửi được điểm lên bảng xếp hạng.'));
}

// ------------------------------------------------------------------ small UI helpers (outside the simulation)
const boardURL = () => `/leaderboard.html?theme=${encodeURIComponent(theme.id)}`;
let bannerEl = null;
function banner(text, onClick) {
  if (!text) { bannerEl?.remove(); bannerEl = null; return; }
  if (!bannerEl) { bannerEl = el('<div class="online-banner"></div>'); document.body.appendChild(bannerEl); }
  bannerEl.textContent = text; bannerEl.onclick = onClick || null; bannerEl.style.cursor = onClick ? 'pointer' : '';
}
function toastLocal(text) {
  const t = el(`<div class="online-toast">${esc(text)}</div>`); document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
export const onlineState = S; // for debugging in the console
window.__online = S;
