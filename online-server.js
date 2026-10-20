// Online rooms + leaderboard for Lễ Hội Pixel (no dependencies, Node 18+). Every room plays one theme (festival).
//
// Lockstep model: every browser in a room runs the same game simulation. The server owns the clock — a room's tick
// counts 60 per second from the moment the room (or its current game) started — and stamps every button press it
// receives with the tick at which all browsers must apply it. Frames {u, ev} go out ~30 times a second: "you may
// simulate up to tick u, and here are the new events". Someone joining late gets the whole event history and fast-
// forwards. Browsers report a hash of their game state now and then; the server flags any mismatch.
//
// Leaderboard: the room host's browser posts the final result; entries live in memory and are saved to a JSON file
// (DATA_DIR, or a Railway Volume) or, when UPSTASH_REDIS_REST_URL/TOKEN are set, to Upstash Redis (survives restarts on free hosting).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { wsAccept, wsSend, wsReader } = require('./ws-lite.js');

const TICK_MS = 1000 / 60;
const FRAME_MS = 33;
const ROLES = 3;
// the festivals and their rounds (the same catalogue the browser reads); a theme's leaderboard needs all its rounds
const THEMES = require('./themes/themes.json');
const themeOf = id => THEMES.find(t => t.id === id) || THEMES[0];
const roundIds = theme => themeOf(theme).rounds.map(r => r[0]);
const LEGACY_THEME = '20-10'; // leaderboard entries saved before themes existed
const DIFFS = ['easy', 'normal', 'hard'];
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

const rooms = new Map(); // code -> room
const clean = (s, n) => String(s ?? '').replace(/[<>&"\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

function newCode() {
  for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]; if (!rooms.has(c)) return c; }
}
function makeRoom(hostPid, theme) {
  const room = {
    code: newCode(), host: hostPid, theme: themeOf(theme).id, created: Date.now(), players: new Map(), roles: Array(ROLES).fill(null),
    epoch: 1, t0: Date.now(), seed: crypto.randomInt(1, 2 ** 31), history: [], pending: [], lastStamp: 0,
    lastEventAt: Date.now(), scene: 'title', team: '', hashes: new Map(), hostGoneAt: 0, emptySince: 0, games: new Set(),
  };
  rooms.set(room.code, room);
  return room;
}
const tickOf = room => Math.floor((Date.now() - room.t0) / TICK_MS);
const roomInfo = room => ({
  t: 'room', code: room.code, host: room.host, epoch: room.epoch, roles: room.roles,
  players: [...room.players.entries()].map(([pid, p]) => ({ pid, name: p.name, on: !!p.sock })),
});
const broadcast = (room, msg) => { const s = JSON.stringify(msg); room.players.forEach(p => p.sock && wsSend(p.sock, s)); };
const announce = room => broadcast(room, roomInfo(room));

// a fresh game in the same room: the clock restarts at 0 so late joiners only replay the current game
function resetEpoch(room) {
  room.epoch++; room.t0 = Date.now(); room.seed = crypto.randomInt(1, 2 ** 31);
  room.history = room.team ? [[0, 'sys', { team: room.team }]] : []; room.pending = []; room.lastStamp = 0; room.hashes.clear();
  room.lastEventAt = Date.now();
  broadcast(room, { t: 'reset', epoch: room.epoch, seed: room.seed, u: 0, ev: room.history });
  announce(room);
}

function onMessage(room, pid, m) {
  const p = room.players.get(pid); if (!p) return;
  if (m.t === 'ev' && m.e && typeof m.e === 'object') {
    const e = {};
    // a key press/release: code, down, and the client's own tick when it was pressed (for timing-judged rounds)
    if (typeof m.e.k === 'string') { e.k = m.e.k.slice(0, 16); e.d = !!m.e.d; e.c = Number.isFinite(m.e.c) ? Math.floor(m.e.c) : 0; }
    else if (typeof m.e.a === 'string') { if (pid !== room.host) return; e.a = m.e.a.slice(0, 32); } // menu / card buttons: host only
    else if (typeof m.e.team === 'string') { if (pid !== room.host && !room.roles.includes(pid)) return; e.team = clean(m.e.team, 24); room.team = e.team; }
    else return;
    const tick = Math.max(room.lastStamp, tickOf(room) + 1); room.lastStamp = tick;
    const rec = [tick, pid, e]; room.history.push(rec); room.pending.push(rec); room.lastEventAt = Date.now();
    if (room.history.length > 400000) resetEpoch(room); // safety valve for very long sessions
    return;
  }
  if (m.t === 'role') {
    const r = m.role | 0; if (r < 0 || r >= ROLES) return;
    const holder = room.roles[r];
    if (holder === pid) room.roles[r] = null;
    else if (!holder || !room.players.get(holder)?.sock || pid === room.host) room.roles[r] = pid; // host may take over any role
    announce(room); return;
  }
  if (m.t === 'name') { p.name = clean(m.name, 14) || p.name; announce(room); return; }
  if (m.t === 'scene') { if (pid === room.host) room.scene = String(m.s || '').slice(0, 16); return; }
  if (m.t === 'newgame') { if (pid === room.host) resetEpoch(room); return; }
  if (m.t === 'hash' && Number.isFinite(m.tick) && m.epoch === room.epoch) {
    const prev = room.hashes.get(m.tick);
    if (!prev) { room.hashes.set(m.tick, { h: m.h, pid }); if (room.hashes.size > 60) room.hashes.delete(room.hashes.keys().next().value); }
    else if (prev.h !== m.h && prev.pid !== pid) {
      console.warn(`[room ${room.code}] desync at tick ${m.tick}: ${prev.pid} ${prev.h} vs ${pid} ${m.h}`);
      broadcast(room, { t: 'desync', tick: m.tick });
    }
  }
}

function attach(room, pid, sock, name) {
  const old = room.players.get(pid);
  if (old?.sock && old.sock !== sock) { wsSend(old.sock, { t: 'kicked' }); old.sock.destroy(); }
  room.players.set(pid, { name: clean(name, 14) || old?.name || 'Người chơi', sock });
  room.emptySince = 0; if (pid === room.host) room.hostGoneAt = 0;
  // free roles go to the first players by default, so a 3-player room is ready without fiddling
  if (!room.roles.includes(pid)) { const free = room.roles.indexOf(null); if (free >= 0) room.roles[free] = pid; }
  wsSend(sock, { t: 'welcome', code: room.code, theme: room.theme, pid, epoch: room.epoch, seed: room.seed, u: tickOf(room), ev: room.history });
  announce(room);
  wsReader(sock, m => onMessage(room, pid, m), 64 * 1024);
  const gone = () => {
    const p = room.players.get(pid); if (!p || p.sock !== sock) return;
    p.sock = null; if (pid === room.host) room.hostGoneAt = Date.now();
    if ([...room.players.values()].every(q => !q.sock)) room.emptySince = Date.now();
    announce(room);
  };
  sock.on('close', gone); sock.on('error', gone);
}

// WebSocket /room?code=ABCD&pid=..&name=..&theme=..   (no code, or code=new → create a room playing that theme)
function upgrade(req, sock, url) {
  if (!wsAccept(req, sock)) return;
  const pid = (url.searchParams.get('pid') || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || crypto.randomBytes(6).toString('hex');
  const name = url.searchParams.get('name') || '';
  let code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  let room = code && code !== 'NEW' ? rooms.get(code) : null;
  if (code && code !== 'NEW' && !room) { wsSend(sock, { t: 'err', msg: `Không tìm thấy phòng ${code}` }); sock.end(); return; }
  if (!room) room = makeRoom(pid, url.searchParams.get('theme'));
  attach(room, pid, sock, name);
}

// the clock: send frames, hand over the host role if the host left, start fresh games when idle, drop empty rooms
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const u = tickOf(room);
    const msg = JSON.stringify({ t: 'f', u, ev: room.pending }); room.pending = [];
    room.players.forEach(p => p.sock && wsSend(p.sock, msg));
    if (room.hostGoneAt && now - room.hostGoneAt > 15000) {
      const next = [...room.players.entries()].find(([, p]) => p.sock);
      if (next) { room.host = next[0]; room.hostGoneAt = 0; announce(room); }
    }
    // a room idling on the title screen gets a fresh clock, so anyone joining later has little to replay
    if (room.scene === 'title' && now - room.lastEventAt > 20000 && u > 60 * 60) resetEpoch(room);
    if (room.emptySince && now - room.emptySince > 10 * 60 * 1000) rooms.delete(room.code);
  }
}, FRAME_MS);

// ------------------------------------------------------------------ leaderboard storage
// Railway: attach a Volume and the leaderboard file lands on it automatically (RAILWAY_VOLUME_MOUNT_PATH)
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'leaderboard.json');
const UP_URL = process.env.UPSTASH_REDIS_REST_URL, UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN, UP_KEY = 'tiemhoa:leaderboard';
let board = [];
const MAX_ENTRIES = 5000;
async function loadBoard() {
  try {
    if (UP_URL && UP_TOKEN) {
      const r = await fetch(`${UP_URL}/get/${UP_KEY}`, { headers: { Authorization: `Bearer ${UP_TOKEN}` } });
      const j = await r.json(); board = j.result ? JSON.parse(j.result) : [];
    } else if (fs.existsSync(FILE)) board = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) { console.warn('[leaderboard] load failed:', e.message); board = []; }
  console.log(`  Bảng xếp hạng: ${board.length} kết quả (${UP_URL ? 'Upstash Redis' : FILE})`);
}
let saving = null;
function saveBoard() {
  if (saving) return; // coalesce bursts
  saving = setTimeout(async () => {
    saving = null;
    try {
      if (UP_URL && UP_TOKEN) await fetch(`${UP_URL}/set/${UP_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${UP_TOKEN}` }, body: JSON.stringify(board) });
      else { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE + '.tmp', JSON.stringify(board)); fs.renameSync(FILE + '.tmp', FILE); }
    } catch (e) { console.warn('[leaderboard] save failed:', e.message); }
  }, 300);
}

// ------------------------------------------------------------------ HTTP API
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const posts = new Map(); // ip -> [timestamps] (simple rate limit)
function readBody(req, max = 16 * 1024) {
  return new Promise((ok, fail) => { let b = ''; req.on('data', c => { b += c; if (b.length > max) { fail(new Error('too big')); req.destroy(); } }); req.on('end', () => ok(b)); req.on('error', fail); });
}
// the difficulty most of the rounds were played at (ties go to the harder one)
function mainDiff(diffs, ids) {
  const n = { easy: 0, normal: 0, hard: 0 }; ids.forEach(id => n[diffs[id] || 'normal']++);
  return ['hard', 'normal', 'easy'].reduce((a, d) => (n[d] > n[a] ? d : a), 'hard');
}
const WEEK = 7 * 24 * 3600 * 1000;
const entryTheme = e => e.theme || LEGACY_THEME;
function filtered(q) {
  const diff = DIFFS.includes(q.get('diff')) ? q.get('diff') : 'all', since = q.get('period') === 'week' ? Date.now() - WEEK : 0, theme = themeOf(q.get('theme')).id;
  return board.filter(e => entryTheme(e) === theme && e.at >= since && (diff === 'all' || e.mainDiff === diff));
}
// best entry per team (case-insensitive), highest first
function bestPerTeam(list, score) {
  const best = new Map();
  for (const e of list) { const k = (e.team || '—').toLowerCase(), s = score(e); if (s == null) continue; const cur = best.get(k); if (!cur || s > cur.s) best.set(k, { s, e }); }
  return [...best.values()].sort((a, b) => b.s - a.s);
}

async function api(req, res, url) {
  const q = url.searchParams;
  if (url.pathname === '/api/ping') return json(res, 200, { online: true, rooms: rooms.size });
  if (url.pathname === '/api/room') { const r = rooms.get(String(q.get('code') || '').toUpperCase()); return json(res, r ? 200 : 404, r ? { code: r.code, players: r.players.size } : { error: 'not found' }); }
  if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
    const limit = Math.min(100, Math.max(1, +q.get('limit') || 50));
    return json(res, 200, bestPerTeam(filtered(q), e => e.total).slice(0, limit).map(({ e }, i) => ({ rank: i + 1, team: e.team, members: e.members, total: e.total, rankName: e.rankName, mainDiff: e.mainDiff, scores: e.scores, diffs: e.diffs, at: e.at })));
  }
  if (url.pathname === '/api/leaderboard/rounds' && req.method === 'GET') {
    const theme = themeOf(q.get('theme')).id, ids = roundIds(theme);
    const round = ids.includes(q.get('round')) ? q.get('round') : ids[0], diff = DIFFS.includes(q.get('diff')) ? q.get('diff') : null;
    const since = q.get('period') === 'week' ? Date.now() - WEEK : 0;
    const list = board.filter(e => entryTheme(e) === theme && e.at >= since && e.scores[round] != null && (!diff || e.diffs[round] === diff));
    return json(res, 200, bestPerTeam(list, e => e.scores[round]).slice(0, 50).map(({ s, e }, i) => ({ rank: i + 1, team: e.team, members: e.members, score: s, diff: e.diffs[round], at: e.at })));
  }
  if (url.pathname === '/api/scores' && req.method === 'POST') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress, now = Date.now();
    const recent = (posts.get(ip) || []).filter(t => now - t < 60000); if (recent.length >= 20) return json(res, 429, { error: 'too many' });
    posts.set(ip, [...recent, now]);
    let b; try { b = JSON.parse(await readBody(req)); } catch (e) { return json(res, 400, { error: 'bad json' }); }
    const room = rooms.get(String(b.room || '').toUpperCase());
    if (!room) return json(res, 404, { error: 'room not found' });
    const key = `${room.code}:${room.created}:${b.epoch}:${b.game}`;
    if (room.games.has(key)) return json(res, 200, { ok: true, duplicate: true }); // replays and reconnects post again
    const scores = {}, diffs = {}, ids = roundIds(room.theme); // the room's theme, not what the browser claims
    for (const id of ids) {
      const v = Number(b.scores?.[id]); if (Number.isFinite(v) && v >= 0 && v <= 400) scores[id] = Math.round(v);
      diffs[id] = DIFFS.includes(b.diffs?.[id]) ? b.diffs[id] : 'normal';
    }
    if (Object.keys(scores).length < ids.length) return json(res, 400, { error: 'incomplete game' }); // only games with every round rank
    const total = Math.round(Number(b.total)); if (!Number.isFinite(total) || total < 0 || total > 2000) return json(res, 400, { error: 'bad total' });
    room.games.add(key);
    const entry = { theme: room.theme, team: clean(b.team, 24) || 'Đội không tên', members: (Array.isArray(b.members) ? b.members : []).slice(0, 6).map(m => clean(m, 14)).filter(Boolean),
      scores, diffs, mainDiff: mainDiff(diffs, ids), total, rankName: clean(b.rankName, 40), room: room.code, at: now };
    board.push(entry); if (board.length > MAX_ENTRIES) board.sort((a, c) => c.total - a.total).splice(MAX_ENTRIES);
    saveBoard();
    const better = bestPerTeam(filtered(new URLSearchParams({ diff: entry.mainDiff, theme: entry.theme })), e => e.total).findIndex(x => x.e === entry);
    return json(res, 200, { ok: true, place: better >= 0 ? better + 1 : null, mainDiff: entry.mainDiff });
  }
  return json(res, 404, { error: 'not found' });
}

module.exports = { upgrade, api, loadBoard };
