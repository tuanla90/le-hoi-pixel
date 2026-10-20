// Minimal WebSocket server helpers (RFC 6455, text frames), no dependencies. Shared by the LAN relay and online rooms.
const crypto = require('crypto');

// finish the HTTP upgrade handshake; returns false if the request is not a WebSocket upgrade
function wsAccept(req, sock) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { sock.destroy(); return false; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  return true;
}
function wsSend(sock, obj) {
  if (!sock || sock.destroyed || !sock.writable) return;
  const data = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj));
  const len = data.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) head = Buffer.from([0x81, 126, len >> 8, len & 255]);
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); } // big room histories
  sock.write(Buffer.concat([head, data]));
}
function wsReader(sock, onText, maxLen = 1 << 20) {
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 15, masked = buf[1] & 128;
      let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > maxLen) { sock.destroy(); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ m[i & 3])); }
      buf = buf.subarray(need);
      if (op === 8) { sock.end(Buffer.from([0x88, 0])); return; }
      if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
      if (op === 1) { let msg; try { msg = JSON.parse(payload.toString()); } catch (e) { continue; } onText(msg); }
    }
  });
}
module.exports = { wsAccept, wsSend, wsReader };
