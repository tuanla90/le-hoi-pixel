// Big-screen side of the phone controllers. Only active when the game is served by server.js
// (plain static hosting just keeps the keyboard). The big screen is the authority on who plays which role.
import * as S from './sprites.js';

export const net = {
  ok: false,                 // connected to server.js (LAN phone relay)
  online: false,             // in an online room (js/online.js fills players/roles and the hooks below)
  openRoom: null, sendTeam: null, localBuzz: null, showCard: null, onFinal: null, myPid: null,
  ips: [], port: 0,          // LAN addresses for the QR code
  players: new Map(),        // pid -> { name, on }
  roles: [null, null, null], // pid holding Đào / Mai / Lan
};
const listeners = new Set();
export const onNet = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const changed = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

let ws = null, hooks = null, lastState = '';
const BUSY = new Set(['count', 'play', 'paused', 'ending']);

// hooks: { key(pid, code, down, ts), release(pid), phase() -> { scene, state } , toast(text) }
export async function initNet(h) {
  hooks = h;
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch('/info', { cache: 'no-store' });
    if (!r.ok) return;
    const info = await r.json(); net.ips = info.ips || []; net.port = info.port;
    if (info.lan === false) return; // hosted on the internet: only online rooms, no LAN phone relay
  } catch (e) { return; } // not served by server.js: keyboard only
  connect();
}
function connect() {
  ws = new WebSocket(`ws://${location.host}/ws?role=host`);
  ws.onopen = () => { net.ok = true; lastState = ''; changed(); };
  ws.onclose = () => { net.ok = false; changed(); setTimeout(connect, 1500); };
  ws.onmessage = e => handle(JSON.parse(e.data));
}
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const roleOf = pid => net.roles.indexOf(pid);
export const playerName = pid => (pid && net.players.get(pid)?.name) || 'Người chơi';

function handle(m) {
  const p = m.pid;
  if (m.t === 'pads') m.pids.forEach(id => net.players.set(id, { name: net.players.get(id)?.name || '', on: true }));
  if (m.t === 'join') { const pl = net.players.get(p) || { name: '' }; pl.on = true; net.players.set(p, pl); }
  if (m.t === 'leave') {
    const pl = net.players.get(p); if (pl) pl.on = false;
    hooks.release(p);
    const r = roleOf(p); if (r >= 0 && pl) hooks.toast(`📱 ${pl.name || 'Một bạn'} (${S.GIRLS[r].name}) mất kết nối`);
  }
  if (m.t === 'hello') { const pl = net.players.get(p) || { on: true }; pl.name = String(m.name || '').slice(0, 14); net.players.set(p, pl); }
  if (m.t === 'pick') {
    const ph = hooks.phase();
    if (!BUSY.has(ph.state)) {
      const want = m.role, cur = roleOf(p);
      // a role is free if nobody holds it or its holder's phone has dropped off (so a new phone can take over)
      const holder = net.roles[want], free = !holder || holder === p || !net.players.get(holder)?.on;
      if (want === -1 && cur >= 0) net.roles[cur] = null;
      else if (want >= 0 && want <= 2 && free) { if (cur >= 0) net.roles[cur] = null; net.roles[want] = p; }
    }
  }
  if (m.t === 'restore' && net.roles.every(r => !r)) net.roles = m.roles.map(r => r || null).slice(0, 3);
  if (m.t === 'key') { if (roleOf(p) >= 0) hooks.key(p, m.code, !!m.down, m.ts); }
  // only the phone playing Lan may rename the team (the MC can always do it on the big screen)
  if (m.t === 'team' && roleOf(p) === 2) { const n = hooks.setTeam(m.name); hooks.toast(n ? `✏️ ${playerName(p)} (Lan) đặt tên đội: ${n}` : `✏️ ${playerName(p)} (Lan) xoá tên đội`); }
  if (m.t === 'sync') send({ t: 'sync', to: p, c: m.c, h: performance.now() });
  if (m.t !== 'key' && m.t !== 'sync') { pushState(true); changed(); }
}
// tell every phone where the game is and who holds which role (called every frame; sends on change)
export function pushState(force = false) {
  if (!net.ok) return;
  const ph = hooks.phase();
  const msg = { t: 'state', scene: ph.scene, state: ph.state, team: ph.team || '', roles: net.roles.map(pid => pid ? { pid, name: playerName(pid), on: !!net.players.get(pid)?.on } : null) };
  const k = JSON.stringify(msg);
  if (!force && k === lastState) return;
  lastState = k; send(msg);
}
// vibrate the phones of the given roles (0 Đào · 1 Mai · 2 Lan, an array, or 'all'); pattern is a navigator.vibrate() value.
// With a tag, the same cue repeats on a role at most once every `gap` seconds.
const lastBuzz = {};
export function buzz(who, pattern = 40, tag = '', gap = 0.6) {
  if (net.localBuzz) { net.localBuzz(who, pattern, tag, gap); return; } // online: vibrate this device if it plays that role
  if (!net.ok) return;
  const now = performance.now() / 1000;
  for (const r of who === 'all' ? [0, 1, 2] : [].concat(who)) {
    const pid = net.roles[r]; if (!pid) continue;
    if (tag) { const k = r + tag; if (now - (lastBuzz[k] ?? -99) < gap) continue; lastBuzz[k] = now; }
    send({ t: 'buzz', to: pid, p: pattern });
  }
}
// send something to one phone only (e.g. its personal card at the end)
export const sendTo = (pid, msg) => send({ ...msg, to: pid });
export const roleLabel = i => {
  const pid = net.roles[i]; if (!pid) return null;
  const pl = net.players.get(pid); return { name: pl?.name || 'Người chơi', on: !!pl?.on };
};
export function padURL(ip = net.ips[0]?.address) { return ip ? `http://${ip}:${net.port}/pad.html` : ''; }
