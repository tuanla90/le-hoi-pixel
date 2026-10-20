// "Kết nối điện thoại" overlay: one QR for everyone, live list of who holds which role.
import { game, el, uiRoot, setTeam, TEAM_MAX } from './main.js';
import { net, onNet, padURL, CAPTAIN } from './net.js';
import { theme } from './theme.js';

function qrImg(text) {
  if (!text || typeof window.qrcode !== 'function') return '';
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  return `<img class="qr" src="${q.createDataURL(8, 2)}" alt="Mã QR vào tay cầm">`;
}

// small "who plays what" chips, reused on intro cards
export function roleChip(i) {
  const pid = net.roles[i];
  if (!net.ok && !net.online) return '';
  if (!pid) return `<span class="rp empty">📱 trống · ⌨️ bàn phím</span>`;
  const pl = net.players.get(pid);
  return `<span class="rp ${pl?.on ? '' : 'off'}">📱 ${esc(pl?.name || 'Người chơi')}${pl?.on ? '' : ' · mất kết nối'}</span>`;
}
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openLobby() {
  if (net.online) { net.openRoom?.(); return; } // online: the room panel instead of the LAN QR code
  if (game.modal) return;
  let ipIdx = 0;
  const box = el(`<div class="lobby"><div class="card lobby-card pop"><div class="ribbon">📱 Kết nối điện thoại</div><div class="lobby-body"></div>
    <button class="btn" data-x>Xong <span class="key">Esc</span></button></div></div>`);
  uiRoot.appendChild(box);
  const body = box.querySelector('.lobby-body');
  const render = () => {
    if (!net.ok) {
      body.innerHTML = `<p class="lobby-off">Chưa bật máy chủ cho điện thoại.<br>Hãy mở game bằng <b>Choi-game.bat</b> (cần cài Node.js) trên laptop quản trò, rồi mở lại cửa sổ này.<br><small>Không có máy chủ thì vẫn chơi được bằng bàn phím.</small></p>`;
      return;
    }
    const ip = net.ips[ipIdx]?.address, url = padURL(ip);
    const players = [...net.players.entries()].filter(([, p]) => p.name || p.on);
    body.innerHTML = `
      <div class="lobby-qr">${url ? qrImg(url) : '<p>Không tìm thấy mạng Wi‑Fi/LAN trên máy này.</p>'}
        <div class="url">${esc(url)}</div>
        ${net.ips.length > 1 ? `<div class="ips">${net.ips.map((x, i) => `<button class="seg ${i === ipIdx ? 'on' : ''}" data-ip="${i}">${esc(x.name)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="lobby-info">
        <ol><li>Điện thoại bắt <b>cùng Wi‑Fi</b> với máy này</li><li>Quét mã, nhập tên</li><li>Chọn vai trên điện thoại — <b>đổi được trước mỗi vòng</b></li></ol>
        <div class="lobby-roles">${theme.roles.map((R, i) => `<div class="lr" style="--rc:${R.c}"><b>${R.name}</b>${roleChip(i) || ''}</div>`).join('')}</div>
        <div class="lobby-team">🏷️ Tên đội: <b>${esc(game.team || 'chưa đặt')}</b> <button class="seg" data-team>✏️ Đổi <span class="key">N</span></button> <small>(bạn giữ vai ${theme.roles[CAPTAIN].name} cũng đổi được trên điện thoại)</small></div>
        <div class="lobby-players"><small>Đã vào (${players.length}):</small> ${players.map(([, p]) => `<span class="pl ${p.on ? '' : 'off'}">${esc(p.name || '…đang nhập tên')}</span>`).join('') || '<small>chưa có ai</small>'}</div>
      </div>`;
    body.querySelectorAll('[data-ip]').forEach(b => b.addEventListener('click', () => { ipIdx = +b.dataset.ip; render(); }));
    body.querySelector('[data-team]')?.addEventListener('click', () => { close(); openTeamDialog(openLobby); });
  };
  const off = onNet(render); render();
  const close = () => { off(); box.remove(); game.modal = null; document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.code === 'KeyN' && net.ok) { e.preventDefault(); close(); openTeamDialog(openLobby); } };
  document.addEventListener('keydown', onKey);
  box.querySelector('[data-x]').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  game.modal = { close };
}

// MC dialog for the team name (title screen, intro cards, phone lobby). `then` runs after it closes (e.g. reopen the lobby).
export function openTeamDialog(then) {
  if (game.modal) return;
  const box = el(`<div class="lobby"><form class="card team-card pop"><div class="ribbon">🏷️ Tên đội</div>
    <p>Tên đội hiện trên thẻ kết quả, bảng tổng kết và ${theme.cardName.toLowerCase()} của mọi người.</p>
    <input class="team-input" maxlength="${TEAM_MAX}" placeholder="VD: ${esc(theme.teamExample)}" value="${esc(game.team)}" autocomplete="off">
    <div class="btns"><button class="btn" type="submit">Lưu <span class="key">Enter</span></button><button class="btn alt" type="button" data-x>Huỷ <span class="key">Esc</span></button></div>
  </form></div>`);
  uiRoot.appendChild(box);
  const input = box.querySelector('input');
  const close = () => { box.remove(); game.modal = null; then && then(); };
  box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); if (net.online) net.sendTeam(input.value); else setTeam(input.value); close(); }); // online: the rename reaches every browser as an event
  box.querySelector('[data-x]').addEventListener('click', close);
  game.modal = { close };
  setTimeout(() => { input.focus(); input.select(); }, 30);
}
