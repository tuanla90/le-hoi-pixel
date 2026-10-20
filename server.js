// Tiệm Hoa 20/10 — game server (no dependencies, Node 18+).
//   • LAN party: relays phone controller presses to the big screen over WebSocket (/ws)
//   • Online: rooms anyone can join from anywhere + leaderboard (/room, /api/*) — see online-server.js
//   node server.js          → http://localhost:8020 ; on Render (or PUBLIC=1) only the online part is enabled
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { wsAccept, wsSend, wsReader } = require('./ws-lite.js');
const online = require('./online-server.js');

const PORT = +process.env.PORT || 8020;
const ROOT = __dirname;
const PUBLIC = !!process.env.RENDER || process.env.PUBLIC === '1'; // hosted on the internet: no LAN phone relay
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const PRIVATE = new Set(['server.js', 'online-server.js', 'ws-lite.js', 'package.json', 'render.yaml']);

function lanIPs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
  // likely Wi-Fi/LAN adapters first, virtual ones (VirtualBox, WSL, VPN) last
  const score = n => (/wi-?fi|wlan|wireless|ethernet|eth|en\d/i.test(n) ? 0 : 1) + (/virtual|vbox|vmware|wsl|hyper-v|docker|vpn|tailscale|zerotier/i.test(n) ? 2 : 0);
  return out.sort((a, b) => score(a.name) - score(b.name));
}

// ------------------------------------------------------------------ static files
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/info') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ port: PORT, lan: !PUBLIC, ips: PUBLIC ? [] : lanIPs() }));
    return;
  }
  if (url.pathname.startsWith('/api/')) { online.api(req, res, url).catch(e => { res.writeHead(500); res.end(); console.error(e); }); return; }
  let file;
  try { file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))); } catch (e) { res.writeHead(400); res.end(); return; }
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some(p => p.startsWith('.')) || PRIVATE.has(rel) || rel.split(path.sep)[0] === 'data' || rel.split(path.sep)[0] === 'node_modules') { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

// ------------------------------------------------------------------ relay
// The big screen ("host") is the authority: it keeps the player list and who plays which role.
// Phones ("pads") are identified by a random id they keep in localStorage, so a phone that
// locks and reconnects keeps its name and role.
const hosts = new Set();
const pads = new Map(); // pid -> socket
const hellos = new Map(); // pid -> last { t: 'hello', name } so a reloaded big screen still knows everyone
let lastState = null;
const toHosts = msg => hosts.forEach(h => wsSend(h, msg));

server.on('upgrade', (req, sock) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/room') { online.upgrade(req, sock, url); return; }
  if (url.pathname !== '/ws' || PUBLIC) { sock.destroy(); return; }
  if (!wsAccept(req, sock)) return;

  if (url.searchParams.get('role') === 'host') {
    hosts.add(sock);
    wsSend(sock, { t: 'pads', pids: [...pads.keys()] });
    hellos.forEach(h => wsSend(sock, h));
    if (lastState) wsSend(sock, { t: 'restore', roles: lastState.roles.map(r => r && r.pid) }); // keep roles across a big-screen reload
    wsReader(sock, msg => {
      if (msg.t === 'state') { lastState = msg; pads.forEach(p => wsSend(p, msg)); }
      else if (msg.to && pads.has(msg.to)) wsSend(pads.get(msg.to), msg);
    });
    const bye = () => hosts.delete(sock);
    sock.on('close', bye); sock.on('error', bye);
    return;
  }
  const pid = (url.searchParams.get('pid') || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || crypto.randomBytes(6).toString('hex');
  const old = pads.get(pid);
  if (old && old !== sock) { wsSend(old, { t: 'kicked' }); old.destroy(); }
  pads.set(pid, sock);
  toHosts({ t: 'join', pid });
  if (lastState) wsSend(sock, lastState);
  wsReader(sock, msg => { msg.pid = pid; if (msg.t === 'hello') hellos.set(pid, msg); toHosts(msg); });
  const gone = () => { if (pads.get(pid) === sock) { pads.delete(pid); toHosts({ t: 'leave', pid }); } };
  sock.on('close', gone); sock.on('error', gone);
});

online.loadBoard();
server.listen(PORT, '0.0.0.0', () => {
  const ips = PUBLIC ? [] : lanIPs();
  console.log('\n  🌸 Tiệm Hoa 20/10 đang chạy' + (PUBLIC ? ' (chế độ online)' : ''));
  console.log(`  Màn hình lớn:  http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Điện thoại:    http://${ip.address}:${PORT}   (${ip.name})`));
  if (!ips.length) console.log('  ⚠ Không thấy mạng LAN/Wi-Fi — điện thoại sẽ không vào được.');
  console.log('\n  Nếu Windows hỏi tường lửa, hãy bấm "Allow" (cho phép mạng Private).');
  console.log('  Đóng cửa sổ này để tắt game.\n');
});
