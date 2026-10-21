// PvP: two players race the same round on two boards side by side (pvp.html), each one playing all three roles.
//
// Each board is an <iframe> of the game in board mode (core/main.js initBoard): its own scene, HUD, sounds and maths,
// with no menus or loop of its own. This page owns the match — setup → round intro → play → round result → … → final —
// and steps both boards together, 60 times a second, from the same seed (same garden, map and customers for both).
//
// The match is a pure function of the button presses and menu actions it is fed, so online both players' browsers run
// the very same match in lockstep: the server stamps every event with the tick to apply it at, exactly like the co-op
// rooms in core/online.js (a room of kind 'pvp'). On one computer, one player uses the keyboard and the other a phone
// (pad.html through server.js), or both use phones.
import { theme, loadTheme } from './theme.js';
import { net, initNet, pushState, padURL, playerName } from './net.js';

const TICK_MS = 1000 / 60;
const BUFFER = 3;        // online: play this many ticks behind the server so jitter does not stall the picture
const HASH_EVERY = 120;  // online: compare the match with the other browsers every 2 s
const DIFFS = ['easy', 'normal', 'hard'];
const DIFF = { easy: '🌼 Dễ', normal: '🌷 Thường', hard: '🔥 Thử thách' };
const SIDE = ['bên trái', 'bên phải'];
const MENU_KEYS = new Set(['Space', 'Enter', 'NumpadEnter']);
const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = k => `<span class="key">${k}</span>`;
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
const q0 = new URLSearchParams(location.search);

// ------------------------------------------------------------------ the match (the same on every browser of a room)
const boards = [null, null]; // each iframe's window.board
const M = {};
function resetMatch(seed) {
  Object.assign(M, { phase: 'setup', t: 0, fmt: 'all', round: theme.rounds[0].id, diff: 'normal', seed, no: 0,
    list: [], idx: 0, res: [], wins: [0, 0], tot: [0, 0], pids: [null, null], done: [false, false] });
}
const curRound = () => theme.rounds.find(r => r.id === M.list[M.idx]);
const roundSeed = () => ((M.seed * 31 + M.no * 1009 + M.idx * 7919) >>> 0) || 1;
const inRound = () => M.phase === 'intro' || M.phase === 'play';
function setPhase(p) { M.phase = p; M.t = 0; }
// a menu action: 'fmt:all|one', 'round:<id>', 'diff:<d>', 'go[:pid1:pid2]', 'start', 'next', 'again', 'menu'
function act(a) {
  const [k, v, w] = String(a).split(':');
  if (k === 'menu') { boards.forEach(b => b.stop()); setPhase('setup'); return; }
  if (M.phase === 'setup') {
    if (k === 'fmt') M.fmt = v === 'one' ? 'one' : 'all';
    if (k === 'round' && theme.rounds.some(r => r.id === v)) M.round = v;
    if (k === 'diff' && DIFFS.includes(v)) M.diff = v;
    if (k === 'go') { M.pids = [v || null, w || null]; M.no++; startMatch(); }
    return;
  }
  if (k === 'start' && M.phase === 'intro') { boards.forEach(b => b.start(curRound().id, M.diff, roundSeed())); M.done = [false, false]; setPhase('play'); }
  if (k === 'next' && M.phase === 'roundEnd' && M.t > 30) {
    if (M.idx + 1 < M.list.length) { M.idx++; showRound(); } else { boards.forEach(b => b.stop()); setPhase('final'); }
  }
  if (k === 'again' && M.phase === 'final') { M.no++; startMatch(); }
}
function startMatch() {
  M.list = M.fmt === 'one' ? [M.round] : theme.rounds.map(r => r.id);
  M.idx = 0; M.res = []; M.wins = [0, 0]; M.tot = [0, 0];
  showRound();
}
// both boards show the round's intro card (roles and keys; a key press makes that role hop) until someone starts it
function showRound() { boards.forEach(b => b.show(curRound().id, M.diff, roundSeed())); setPhase('intro'); }
// one 1/60 s step of the whole match
function tick() {
  M.t++;
  boards.forEach(b => b.step());
  if (M.phase !== 'play') return;
  const st = boards.map(b => b.status());
  M.done = st.map(s => s.state === 'result');
  if (M.done[0] && M.done[1]) {
    const sc = st.map(s => s.score || 0), win = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1;
    M.res.push({ id: curRound().id, sc, win });
    if (win >= 0) M.wins[win]++;
    M.tot = [M.tot[0] + sc[0], M.tot[1] + sc[1]];
    setPhase('roundEnd');
  }
}
// more rounds won; on a tie, more points in total; else a draw (-1)
const champion = () => (M.wins[0] !== M.wins[1] ? (M.wins[0] > M.wins[1] ? 0 : 1) : M.tot[0] !== M.tot[1] ? (M.tot[0] > M.tot[1] ? 0 : 1) : -1);
const matchHash = () => [M.phase, M.t, M.idx, M.wins.join(), M.tot.join(), boards[0].hash(), boards[1].hash()].join('|');

// ------------------------------------------------------------------ who plays where
let mode = 'local';      // 'local' (one computer, keyboard + phones) or 'online' (a room on the server)
let screen = 'local';    // setup screen: 'local', 'join' (name + room code) or 'online'
const L = { kb: 0, mute: false, held: new Set() }; // local: which player the keyboard plays
const S = { ws: null, code: '', name: '', epoch: 0, ready: false, room: null, events: [], simTick: 0, lastU: 0, lastURecv: 0,
  catching: false, held: new Set(), closedByUs: false, sceneSent: 0, available: false };
// one id per tab (kept across reloads), so two tabs of one browser can face each other
S.pid = (() => { try { let p = sessionStorage.getItem('pvp_pid'); if (!p) { p = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('pvp_pid', p); } return p; } catch (e) { return Math.random().toString(36).slice(2, 12); } })();
const isHost = () => S.room?.host === S.pid;
const roomPlayer = pid => S.room?.players.find(p => p.pid === pid);
// the player (0 · 1) this browser plays online, or -1 when watching
const me = () => (mode !== 'online' ? -1 : M.phase === 'setup' ? (S.room?.roles || []).slice(0, 2).indexOf(S.pid) : M.pids.indexOf(S.pid));
function nameOf(p) {
  if (mode === 'online') {
    const pid = M.phase === 'setup' ? S.room?.roles[p] : M.pids[p];
    return pid ? roomPlayer(pid)?.name || 'Người chơi' : `Người chơi ${p + 1}`;
  }
  return net.roles[p] ? playerName(net.roles[p]) : `Người chơi ${p + 1}`;
}

// ------------------------------------------------------------------ input
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (BLOCK.has(e.code)) e.preventDefault();
  if (!e.repeat) keyIn(e.code, true);
});
addEventListener('keyup', e => keyIn(e.code, false));
addEventListener('blur', () => keyIn(null, false));
addEventListener('pointerdown', () => boards.forEach(b => b?.unlock()));
window.__pvpKey = keyIn; // a click focused one of the boards: its keys come here

function keyIn(code, down) {
  boards.forEach(b => b?.unlock());
  if (mode === 'online') { onlineKey(code, down); return; }
  if (code == null) { for (const c of L.held) boards[L.kb]?.key(c, false); L.held.clear(); return; }
  if (down && code === 'KeyM') { L.mute = !L.mute; return; }
  if (down && MENU_KEYS.has(code) && M.phase !== 'play') { primary(); return; }
  const b = boards[L.kb]; if (!b) return;
  if (down) { if (!inRound() || L.held.has(code) || !b.codes().includes(code)) return; L.held.add(code); }
  else { if (!L.held.has(code)) return; L.held.delete(code); }
  b.key(code, down);
}
function onlineKey(code, down) {
  if (!S.ready) return;
  if (code == null) { for (const c of [...S.held]) onlineKey(c, false); return; }
  if (down && code === 'KeyM') { L.mute = !L.mute; return; }
  if (down && MENU_KEYS.has(code) && M.phase !== 'play') { primary(); return; }
  const p = me(); if (p < 0) return;
  if (down) { if (!inRound() || S.held.has(code) || !boards[p].codes().includes(code)) return; S.held.add(code); }
  else { if (!S.held.has(code)) return; S.held.delete(code); }
  send({ t: 'ev', e: { k: code, d: down, c: S.simTick } });
}
// Space / Enter press the panel's main button
function primary() { const b = $('panel').querySelector('[data-primary]'); if (b && !b.disabled) b.click(); }
// a menu button: locally it acts at once; online only the room host's clicks count, at the same tick on every browser
function doAct(a) {
  if (mode === 'local') { act(a); saveCfg(); return; }
  if (!isHost()) { toast('Chủ phòng 👑 bấm nút này nhé 🙂'); return; }
  if (a === 'go') { const r = S.room.roles; a = `go:${r[0] || ''}:${r[1] || ''}`; }
  send({ t: 'ev', e: { a } });
}
const saveCfg = () => { if (M.phase === 'setup' || M.phase === 'intro') ls.set(`lhp_${theme.id}_pvp`, JSON.stringify({ fmt: M.fmt, round: M.round, diff: M.diff })); };
function loadCfg() { try { const c = JSON.parse(ls.get(`lhp_${theme.id}_pvp`) || '{}'); if (c.fmt) act('fmt:' + c.fmt); if (c.round) act('round:' + c.round); if (c.diff) act('diff:' + c.diff); } catch (e) { /* ignore */ } }

// ------------------------------------------------------------------ local: phones through server.js
function startPhones() {
  initNet({
    key(pid, code, down) {
      if (mode !== 'local') return;
      const p = net.roles.indexOf(pid), b = boards[p]; if (p < 0 || p > 1 || !b) return;
      if (down && (!inRound() || !b.codes().includes(code))) return;
      b.key(code, down);
    },
    release(pid) { const p = net.roles.indexOf(pid); if (p === 0 || p === 1) boards[p]?.release(); },
    // what the phones show: the round being played (all three roles' buttons) and whether players are locked in
    phase: () => ({ scene: M.phase === 'setup' || M.phase === 'final' ? 'title' : curRound().id, state: { intro: 'intro', play: 'play', roundEnd: 'result' }[M.phase] || 'menu', team: '', pvp: true }),
    setTeam: () => '',
    toast,
  });
}

// ------------------------------------------------------------------ online: a PvP room on the server
function connect(code, name) {
  S.name = name; S.code = code; S.closedByUs = false;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/room?code=${encodeURIComponent(code)}&pid=${S.pid}&name=${encodeURIComponent(name)}&theme=${encodeURIComponent(theme.id)}&kind=pvp`);
  S.ws = ws; banner('Đang kết nối phòng…');
  ws.onmessage = e => handle(JSON.parse(e.data));
  ws.onclose = () => {
    if (S.ws !== ws || S.closedByUs) return;
    if (!S.ready) { banner(''); return; }
    banner('Mất kết nối… đang nối lại');
    setTimeout(() => connect(S.code, S.name), 1500); // the welcome replays the match from its history
  };
}
const send = o => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); };
function handle(m) {
  if (m.t === 'err') { banner(''); toast(m.msg); S.closedByUs = true; S.ws?.close(); return; }
  if (m.t === 'kicked') { S.closedByUs = true; banner('Trận này đã mở ở tab khác'); return; }
  if (m.t === 'welcome') {
    S.closedByUs = m.kind !== 'pvp' || m.theme !== theme.id;
    if (m.kind !== 'pvp') { S.ws.close(); location.href = `/?theme=${encodeURIComponent(m.theme)}&room=${m.code}`; return; } // a co-op room
    if (m.theme !== theme.id) {
      S.ws.close();
      if (q0.get('theme') !== m.theme) location.href = `/pvp.html?theme=${encodeURIComponent(m.theme)}&room=${m.code}`;
      else banner('Máy này không mở được chủ đề của phòng — tải lại trang thử nhé'); // never loop
      return;
    }
    S.code = m.code; history.replaceState(null, '', `?theme=${encodeURIComponent(theme.id)}&room=${m.code}`);
    startGame(m.epoch, m.seed, m.ev, m.u);
    return;
  }
  if (m.t === 'reset') { startGame(m.epoch, m.seed, m.ev, m.u); return; }
  if (m.t === 'room') { S.room = m; return; }
  if (m.t === 'f') { if (!S.ready) return; for (const r of m.ev) S.events.push(r); S.lastU = m.u; S.lastURecv = performance.now(); return; }
  if (m.t === 'desync') banner('⚠️ Màn hình của bạn lệch với phòng — chạm vào đây để đồng bộ lại', () => location.reload());
}
// (re)start the shared match from tick 0 and fast-forward through the room's history
function startGame(epoch, seed, history, u) {
  mode = 'online'; screen = 'online';
  S.epoch = epoch; S.events = history.slice(); S.simTick = 0; S.lastU = u; S.lastURecv = performance.now(); S.held.clear(); S.ready = true;
  boards.forEach(b => b.stop());
  resetMatch(seed * 7919 + epoch);
  S.catching = u > 30; banner(S.catching ? 'Đang đồng bộ trận đấu…' : '');
}
function pump(now) {
  if (!S.ready) return;
  const est = S.lastU + (now - S.lastURecv) / TICK_MS;
  const target = Math.min(S.lastU, Math.floor(est) - BUFFER), n = target - S.simTick;
  if (n > 120 && !S.catching) S.catching = true;
  if (S.catching) { const t0 = performance.now(); while (S.simTick < target && performance.now() - t0 < 40) stepOnce(); } // big silent chunks
  else for (let i = 0; i < Math.min(n, 4); i++) stepOnce();
  if (S.catching && target - S.simTick <= 4) { S.catching = false; banner(''); }
  if (isHost() && now - S.sceneSent > 1000) { S.sceneSent = now; send({ t: 'scene', s: M.phase === 'setup' || M.phase === 'final' ? 'title' : 'pvp' }); } // the server freshens an idle room
}
function stepOnce() {
  const t = S.simTick;
  while (S.events.length && S.events[0][0] <= t) applyEvent(S.events.shift());
  tick();
  S.simTick++;
  if (S.simTick % HASH_EVERY === 0) send({ t: 'hash', tick: S.simTick, epoch: S.epoch, h: matchHash() });
}
function applyEvent([t, who, e]) {
  if (e.k) {
    // a key of one of the two players (the pids are fixed when the match starts, so a replay maps them the same way)
    const p = M.pids.indexOf(who), b = boards[p]; if (p < 0 || !b || !inRound()) return;
    if (e.d && !b.codes().includes(e.k)) return;
    const lag = Math.max(0, t - (e.c | 0)); // the press happened this many ticks before it could be applied
    b.key(e.k, e.d, Math.max(0, b.tick - lag));
    return;
  }
  if (e.a) act(e.a);
}

// ------------------------------------------------------------------ drawing the page
let lastPanel = '', lastHead = '', lastCtl = '', quiet = [null, null], sizes = [0, 0];
function frame(now) { requestAnimationFrame(frame); update(now); }
function update(now) {
  try {
    if (mode === 'local') step(now); else pump(now);
    const show = M.phase !== 'setup' && M.phase !== 'final';
    if (show) boards.forEach((b, i) => { const w = $('b' + i).clientWidth; if (w !== sizes[i]) { sizes[i] = w; b.resize(); } }); // a frame shown or resized
    if (show && !S.catching) boards.forEach(b => b.render());
    document.body.className = M.phase + (lastCtl ? ' touchpad' : '');
    drawLabels(); drawHead(); drawPanel(); drawControls(); syncSound();
    if (mode === 'local') pushState();
  } catch (e) { console.error('[PvP] frame error', e); }
}
let acc = 0, last = performance.now();
function step(now) {
  acc += Math.max(0, Math.min(100, now - last)); last = now;
  let n = 0;
  while (acc >= TICK_MS && n < 4) { tick(); acc -= TICK_MS; n++; }
  if (n === 4) acc = 0; // a slow machine runs slower rather than in bursts
}
// locally the left board makes the sounds (two copies of every sound would clash); online, your own board
function syncSound() {
  const loud = mode === 'online' ? Math.max(0, me()) : 0;
  [0, 1].forEach(i => {
    const qq = L.mute || S.catching || i !== loud;
    if (quiet[i] !== qq) { quiet[i] = qq; boards[i].quiet(qq); }
  });
}
function drawLabels() {
  const mine = me();
  [0, 1].forEach(i => {
    const dev = mode === 'local' ? (L.kb === i ? ' ⌨️' : '') + (net.roles[i] ? ' 📱' : '') : '';
    const txt = `${i ? '🟦' : '🟥'} ${nameOf(i)}${mine === i ? ' (bạn)' : ''}${dev}`;
    if ($('lbl' + i).textContent !== txt) $('lbl' + i).textContent = txt;
    $('wait' + i).hidden = !(M.phase === 'play' && M.done[i] && !M.done[1 - i]);
    $('slot' + i).classList.toggle('mine', mine === i); $('slot' + i).classList.toggle('opp', mine >= 0 && mine !== i);
  });
}
function drawHead() {
  const h = $('head');
  if (M.phase === 'setup') { h.hidden = true; lastHead = ''; return; }
  const r = curRound() || theme.rounds[0];
  const sig = [M.phase, M.idx, M.wins, M.tot, nameOf(0), nameOf(1)].join('|'); if (sig === lastHead) return; lastHead = sig;
  h.hidden = false;
  const who = p => `<div class="who p${p} ${p ? 'r' : ''}"><span class="tag">P${p + 1}</span><span class="nm">${esc(nameOf(p))}</span><span class="wins">${'⭐'.repeat(M.wins[p])}</span><span class="tot">${M.tot[p]}</span></div>`;
  h.innerHTML = `${who(0)}<div class="mid">${M.phase === 'final' ? 'Chung cuộc' : `Vòng<b>${M.idx + 1}/${M.list.length}</b>${esc(r.title)}`}</div>${who(1)}`;
}
// the panel under the boards (or the big card in setup and at the end); rebuilt only when what it shows changes
function drawPanel() {
  const online = mode === 'online', can = !online || isHost();
  const sig = JSON.stringify([screen, M.phase, M.fmt, M.round, M.diff, M.idx, M.res.length, L.kb, can, online ? S.room : [net.ok, net.roles, [...net.players]], S.code, S.available]);
  if (sig === lastPanel) return; lastPanel = sig;
  const p = $('panel');
  p.innerHTML = M.phase === 'setup' ? setupHTML(can) : M.phase === 'final' ? finalHTML(can) : stripHTML(can);
  p.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => doAct(b.dataset.a)));
  p.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', e => localAct(b.dataset.l, e)));
  p.querySelector('form')?.addEventListener('submit', e => { e.preventDefault(); localAct('join'); });
}
const segs = (k, list, cur, can) => list.map(([v, label]) => `<button class="seg ${cur === v ? 'on' : ''}" data-a="${k}:${v}" ${can ? '' : 'disabled'}>${label}</button>`).join('');
function rulesHTML(can) {
  const n = theme.rounds.length;
  return `<div class="row"><span class="k">Thể thức</span>${segs('fmt', [['all', `🏁 Cả ${n} vòng`], ['one', '🎯 Một vòng']], M.fmt, can)}</div>
    ${M.fmt === 'one' ? `<div class="row"><span class="k">Vòng</span>${segs('round', theme.rounds.map(r => [r.id, `${r.num}. ${esc(r.title)}`]), M.round, can)}</div>` : ''}
    <div class="row"><span class="k">Độ khó</span>${segs('diff', DIFFS.map(d => [d, DIFF[d]]), M.diff, can)}</div>`;
}
function qr(text, size = 4) {
  if (typeof window.qrcode !== 'function' || !text) return '';
  const c = window.qrcode(0, 'M'); c.addData(text); c.make(); return `<img src="${c.createDataURL(size, 2)}" alt="Mã QR">`;
}
function setupHTML(can) {
  const head = `<div class="ribbon">⚔️ Đấu PvP · ${esc(theme.name)}</div><h1>Ai nhanh tay hơn?</h1>
    <p class="lead">Hai người chơi cùng một vòng trên hai màn hình song song — mỗi người tự điều khiển <b>cả 3 vai</b>. Cùng bản đồ, cùng đề, cùng thời gian: ai nhiều điểm hơn thắng vòng đó.</p>`;
  const back = `<a class="btn alt" href="/?theme=${encodeURIComponent(theme.id)}">← Về trò chơi</a>`;
  if (screen === 'join') {
    return `<form class="card big-card">${head}
      <div class="row"><span class="k">Tên bạn</span><input class="txt" id="nm" maxlength="14" placeholder="VD: Hương" value="${esc(ls.get('thoa_name') || '')}" autocomplete="off"></div>
      <div class="row"><button class="btn big" type="button" data-l="create">✨ Tạo phòng đấu</button></div>
      <div class="row"><span class="k">hoặc</span><input class="txt code" id="code" maxlength="6" placeholder="MÃ PHÒNG" value="${esc(q0.get('room') || '')}" autocomplete="off"><button class="btn mint" type="submit">Vào phòng</button></div>
      <p class="note">Mỗi người chơi trên máy tính hoặc điện thoại của mình, ở đâu cũng được. Người vào sau người thứ hai sẽ được xem.</p>
      <div class="err" id="err"></div>
      <div class="btns"><button class="btn alt" type="button" data-l="local">🖥️ Đấu trên một máy</button>${back}</div></form>`;
  }
  if (screen === 'online') {
    const r = S.room; if (!r) return '<div class="card big-card"><p class="lead">Đang vào phòng…</p></div>';
    const link = `${location.origin}/pvp.html?theme=${encodeURIComponent(theme.id)}&room=${S.code}`;
    const ready = [0, 1].every(i => r.roles[i] && roomPlayer(r.roles[i])?.on);
    const pl = i => {
      const h = r.roles[i], hp = roomPlayer(h);
      return `<div class="pl p${i}"><b>Người chơi ${i + 1} · ${SIDE[i]}</b>
        <div class="dev">${h ? `${hp?.pid === r.host ? '👑 ' : ''}${esc(hp?.name || '?')}${h === S.pid ? ' (bạn)' : ''}${hp?.on ? '' : ' <em>(vắng)</em>'}` : '<em>Chưa có ai — gửi link mời nhé</em>'}</div>
        ${h === S.pid ? `<button class="seg" data-l="role:${i}">Nhường chỗ</button>` : !h || !hp?.on || isHost() ? `<button class="seg" data-l="role:${i}">Ngồi chỗ này</button>` : ''}</div>`;
    };
    const watchers = r.players.filter(p => !r.roles.slice(0, 2).includes(p.pid));
    return `<div class="card big-card">${head}
      <div class="qrbox">${qr(link)}<div>Mã phòng <b style="font-size:24px;letter-spacing:3px">${S.code}</b><br><code>${esc(link)}</code><br><button class="seg" data-l="copy">📋 Sao chép link mời</button></div></div>
      <div class="players">${pl(0)}${pl(1)}</div>
      ${watchers.length ? `<p class="note">👀 Đang xem: ${watchers.map(p => esc(p.name) + (p.pid === S.pid ? ' (bạn)' : '')).join(' · ')}</p>` : ''}
      ${rulesHTML(can)}
      <div class="btns">${can ? `<button class="btn big" data-a="go" data-primary ${ready ? '' : 'disabled'}>⚔️ Vào trận! ${key('Space')}</button>` : '<span class="note">⏳ Chờ chủ phòng 👑 chọn luật và bắt đầu…</span>'}
        <button class="btn alt" data-l="leave">🚪 Rời phòng</button></div>
      ${can && !ready ? '<p class="note">Cần đủ 2 người chơi đang online để vào trận.</p>' : ''}</div>`;
  }
  const url = padURL();
  const pl = i => `<div class="pl p${i}"><b>Người chơi ${i + 1} · ${SIDE[i]}</b>
      <div class="dev">${L.kb === i ? '⌨️ Bàn phím ' : ''}${net.roles[i] ? `📱 ${esc(playerName(net.roles[i]))}` : L.kb === i ? '' : '<em>📱 Chưa có điện thoại</em>'}</div>
      ${L.kb === i ? '' : `<button class="seg" data-l="kb:${i}">⌨️ Cho dùng bàn phím</button>`}</div>`;
  return `<div class="card big-card">${head}
    <div class="players">${pl(0)}${pl(1)}</div>
    ${url ? `<div class="qrbox">${qr(url)}<div>📱 Quét mã để dùng điện thoại làm tay cầm, rồi chọn <b>Người chơi 1</b> hoặc <b>2</b>.<br><code>${esc(url)}</code></div></div>`
      : `<p class="note">${net.ok ? '' : 'Bàn phím chỉ đủ cho một người: mở game bằng <b>Choi-game.bat</b> (server.js) để người kia cầm điện thoại, hoặc đấu online.'}</p>`}
    ${rulesHTML(true)}
    <div class="btns"><button class="btn big" data-a="go" data-primary>⚔️ Vào trận! ${key('Space')}</button>
      ${S.available ? '<button class="btn mint" data-l="online">🌐 Đấu online</button>' : ''}${back}</div></div>`;
}
function stripHTML(can) {
  const r = curRound(), n = M.list.length, wait = '<span class="t">⏳ Chờ chủ phòng 👑…</span>';
  const kb = mode === 'local' ? `<span class="s">⌨️ Bàn phím: ${segs2()}</span>` : '';
  const quit = can ? '<button class="btn alt" data-a="menu">Thoát trận</button>' : '';
  if (M.phase === 'intro') {
    return `<div class="card strip"><span class="t">Vòng ${M.idx + 1}/${n} · ${esc(r.title)} · ${DIFF[M.diff]}</span>
      <span class="s">Bấm thử phím — nhân vật trên bảng của ${mode === 'online' ? 'bạn' : 'mỗi người'} sẽ nhảy lên ✓</span>${kb}
      ${can ? `<button class="btn big" data-a="start" data-primary>Bắt đầu! ${key('Space')}</button>` : wait}${quit}</div>`;
  }
  if (M.phase === 'play') return `<div class="card strip"><span class="t">⚔️ Đang đấu: ${esc(r.title)}</span><span class="s">Mỗi người lo cả 3 vai trên bảng của mình!</span>${kb}</div>`;
  const res = M.res[M.res.length - 1], last = M.idx + 1 >= n;
  return `<div class="card strip"><span class="t">🏁 ${esc(r.title)}</span>
    <div class="vs"><span class="a">${res.sc[0]}</span>–<span class="b">${res.sc[1]}</span></div>
    <span class="t">${res.win >= 0 ? `${esc(nameOf(res.win))} thắng vòng! ⭐` : 'Hoà vòng này! 🤝'}</span>
    ${can ? `<button class="btn big" data-a="next" data-primary>${last ? 'Xem kết quả 🏆' : 'Vòng tiếp theo'} ${key('Space')}</button>` : wait}${quit}</div>`;
}
const segs2 = () => [0, 1].map(i => `<button class="seg ${L.kb === i ? 'on' : ''}" data-l="kb:${i}">P${i + 1}</button>`).join('');
function finalHTML(can) {
  const w = champion(), nm = [nameOf(0), nameOf(1)];
  const rows = M.res.map(x => { const r = theme.rounds.find(y => y.id === x.id); return `<tr><td>${r.num}. ${esc(r.title)}</td><td class="${x.win === 0 ? 'w' : ''}">${x.sc[0]}</td><td class="${x.win === 1 ? 'w' : ''}">${x.sc[1]}</td></tr>`; }).join('');
  return `<div class="card big-card"><div class="ribbon">🏆 Kết quả trận đấu · ${DIFF[M.diff]}</div>
    <div class="crown">${w >= 0 ? '👑' : '🤝'}</div>
    <h1>${w >= 0 ? `${esc(nm[w])} thắng!` : 'Hoà nhau!'}</h1>
    <p class="lead">${M.list.length > 1 ? `Thắng <b>${M.wins[0]} – ${M.wins[1]}</b> vòng · ` : ''}Tổng điểm <b>${M.tot[0]} – ${M.tot[1]}</b></p>
    <table><thead><tr><th>Vòng</th><th>🟥 ${esc(nm[0])}</th><th>🟦 ${esc(nm[1])}</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>Tổng</td><td>${M.tot[0]}</td><td>${M.tot[1]}</td></tr></tfoot></table>
    <div class="btns">${can ? `<button class="btn big" data-a="again" data-primary>⚔️ Đấu lại ${key('Space')}</button><button class="btn alt" data-a="menu">Đổi luật</button>` : '<span class="note">⏳ Chờ chủ phòng 👑…</span>'}
      ${mode === 'online' ? '<button class="btn alt" data-l="leave">🚪 Rời phòng</button>' : `<a class="btn alt" href="/?theme=${encodeURIComponent(theme.id)}">← Về trò chơi</a>`}</div></div>`;
}
// buttons that only change something on this device
function localAct(a) {
  const [k, v] = a.split(':');
  if (k === 'kb') { for (const c of L.held) boards[L.kb]?.key(c, false); L.held.clear(); L.kb = +v; lastPanel = ''; }
  if (k === 'online') { screen = 'join'; lastPanel = ''; }
  if (k === 'local') { screen = 'local'; lastPanel = ''; }
  if (k === 'create' || k === 'join') {
    const name = ($('nm')?.value || '').trim().slice(0, 14), code = k === 'create' ? 'NEW' : ($('code')?.value || '').trim().toUpperCase();
    if (!name) { $('err').textContent = 'Nhập tên của bạn trước nhé!'; $('nm').focus(); return; }
    if (!code) { $('err').textContent = 'Nhập mã phòng (4 ký tự).'; return; }
    ls.set('thoa_name', name); connect(code, name);
  }
  if (k === 'role') send({ t: 'role', role: +v });
  if (k === 'copy') navigator.clipboard?.writeText(`${location.origin}/pvp.html?theme=${encodeURIComponent(theme.id)}&room=${S.code}`).then(() => toast('Đã sao chép link mời!'));
  if (k === 'leave') { S.closedByUs = true; S.ws?.close(); location.href = `/pvp.html?theme=${encodeURIComponent(theme.id)}`; }
}

// online on a touch screen: big buttons for every role of the round under your board
function drawControls() {
  const p = me(), touch = matchMedia('(pointer: coarse)').matches;
  const defs = inRound() && p >= 0 && touch && mode === 'online' ? theme.controls[curRound().id] : null;
  const sig = defs ? curRound().id : '';
  if (sig === lastCtl) return; lastCtl = sig;
  const bar = $('controls'); bar.hidden = !defs;
  if (!defs) { bar.innerHTML = ''; return; }
  bar.innerHTML = defs.roles.map((d, i) => { const R = theme.roles[i]; return `<div class="ctl-role" style="--c:${R.c};--cd:${R.cd}"><div class="ctl-name">${R.icon} ${esc(R.name)}</div>
    ${d.b.map(b => `<button class="ctl-btn" data-k="${b.k}"><span>${b.l}</span><small>${esc(b.s)}</small></button>`).join('')}</div>`; }).join('');
  const held = new Map();
  bar.onpointerdown = e => { const b = e.target.closest('.ctl-btn'); if (!b) return; e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } held.set(e.pointerId, b); b.classList.add('on'); keyIn(b.dataset.k, true); navigator.vibrate?.(10); };
  const up = e => { const b = held.get(e.pointerId); if (!b) return; held.delete(e.pointerId); if (![...held.values()].includes(b)) { b.classList.remove('on'); keyIn(b.dataset.k, false); } };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => bar.addEventListener(n, up));
}

let bannerEl = null;
function banner(text, onClick) {
  if (!text) { bannerEl?.remove(); bannerEl = null; return; }
  if (!bannerEl) { bannerEl = document.createElement('div'); bannerEl.className = 'banner'; document.body.appendChild(bannerEl); }
  bannerEl.textContent = text; bannerEl.onclick = onClick || null; bannerEl.style.cursor = onClick ? 'pointer' : '';
}
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ------------------------------------------------------------------ boot: the theme, then both boards, then play
async function boot() {
  await loadTheme(q0.get('theme'));
  document.title = `Đấu PvP · ${theme.name}`;
  resetMatch((Math.random() * 2 ** 31) >>> 0);
  loadCfg();
  await new Promise(ok => {
    window.__pvpBoardReady = w => { const i = [0, 1].find(j => $('b' + j).contentWindow === w); boards[i] = w.board; if (boards[0] && boards[1]) ok(); };
    [0, 1].forEach(i => { $('b' + i).src = `index.html?board=1&theme=${encodeURIComponent(theme.id)}`; });
  });
  requestAnimationFrame(frame);
  startPhones();
  try { const r = await fetch('/api/ping', { cache: 'no-store' }); S.available = r.ok; } catch (e) { /* static hosting: one computer only */ }
  const code = q0.get('room');
  if (code && S.available) {
    screen = 'join';
    const name = ls.get('thoa_name');
    if (name) connect(code.toUpperCase(), name);
  }
}
window.__pvp = { M, S, L, boards, act, update, tick }; // for debugging in the console
boot();
