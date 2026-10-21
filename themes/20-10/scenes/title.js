import { register, game, go, input, K, el, img, uiRoot, W, H, cheer, bestKey, DIFF_MULT, onTeam } from '../../../core/main.js';
import { C, makeCanvas, drawAt, rng, Particles } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { starsHTML, starsFor } from '../../../core/round.js';
import { theme, storeKey } from '../../../core/theme.js';
import { openLobby, openTeamDialog, openThemePicker, esc } from '../../../core/lobby.js';
import { net } from '../../../core/net.js';
import { INFO } from '../meta.js';

const SHOP_NAME = INFO.shopName;

// background shared with the finale
export function skyScene(seed = 4) {
  return makeCanvas(W, H, g => {
    const bands = ['#bfe6ff', '#c9eaff', '#d3eeff', '#ddf2ff', '#e7f6ff', '#f0f9ff', '#fff2f6', '#ffe8f0'];
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 18, W, 18); });
    // dithered band edges
    for (let i = 1; i < bands.length; i++) { g.fillStyle = bands[i]; for (let x = 0; x < W; x += 2) g.fillRect(x + (i % 2), i * 18 - 1, 1, 1); }
    // far hills
    const hill = (col, base, amp, f, ph) => { g.fillStyle = col; for (let x = 0; x < W; x++) { const y = base - Math.round(Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph) * amp * .4); g.fillRect(x, y, 1, H - y); } };
    hill('#bfe3c6', 150, 14, 0.012, 1); hill('#9fd6a7', 172, 12, 0.018, 3);
    // ground
    g.fillStyle = C.grass; g.fillRect(0, 186, W, H - 186);
    const r = rng(seed);
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < .5 ? C.grassD : C.grassL; g.fillRect((r() * W) | 0, 186 + ((r() * (H - 186)) | 0), 1, 2); }
    // path
    g.fillStyle = '#ecdcb4'; g.fillRect(0, 232, W, 22); g.fillStyle = '#d9c39a'; g.fillRect(0, 232, W, 2); g.fillRect(0, 252, W, 2);
    for (let x = 0; x < W; x += 12) { g.fillStyle = '#e2cfa3'; g.fillRect(x + ((x / 12) % 2) * 6, 240, 7, 5); }
  });
}

export default function () {
  register('title', () => {
    let bg, shop, parts = new Particles(), clouds = [], walkers = [], bflies = [], t = 0, petalT = 0;
    let menu = 'main';
    const s = {
      enter() {
        A.music('title');
        bg = skyScene(); shop = S.shopFacade();
        const deco = makeCanvas(W, H, g => {
          g.drawImage(bg, 0, 0);
          // garden beds on the left
          for (let i = 0; i < 3; i++) { drawAt(g, S.soilPlot(i === 1), 30 + i * 36, 222, {}); drawAt(g, S.plant(S.PLANT_TYPES[i], 3), 30 + i * 36, 214); }
          drawAt(g, S.fenceH, 6, 226); drawAt(g, S.fenceH, 128, 226);
          drawAt(g, S.tree, 20, 190); drawAt(g, S.treeRound, 452, 196); drawAt(g, S.bush, 470, 232);
          drawAt(g, shop, 330, 232);
          drawAt(g, S.truckSide, 186, 234);
          drawAt(g, S.lampPost, 222, 232);
          [[150, 228, 0], [242, 230, 1], [440, 236, 2], [8, 240, 3], [104, 262, 4], [300, 264, 0], [380, 262, 2]].forEach(([x, y, k]) => drawAt(g, S.flowerTuft[k], x, y));
          drawAt(g, S.rock, 90, 236); drawAt(g, S.mushroom, 60, 266);
        });
        bg = deco;
        for (let i = 0; i < 5; i++) clouds.push({ x: Math.random() * W, y: 12 + Math.random() * 60, s: 0.6 + Math.random() * 0.8, v: 3 + Math.random() * 5 });
        walkers = [0, 1, 2].map(i => ({ i, x: 140 + i * 22, y: 250, dir: 1, t: Math.random() * 2, wait: 0 }));
        bflies = [0, 1].map(i => ({ x: 60 + i * 300, y: 200, ph: i * 2 }));
        this.renderMenu();
        this.offTeam = onTeam(() => this.renderMenu()); // the team name can change from a phone too
      },
      renderMenu() {
        uiRoot.innerHTML = '';
        let best = 0; try { best = +localStorage.getItem(storeKey('best_final')) || 0; } catch (e) { /* ignore */ }
        const root = el(`<div class="title-ui"></div>`); uiRoot.appendChild(root);
        root.innerHTML = `
          <div class="shop-sign" style="left:calc(var(--u)*260);top:calc(var(--u)*108);width:calc(var(--u)*140);height:calc(var(--u)*19);font-size:calc(var(--u)*10)">${SHOP_NAME}</div>
          <div class="logo pop"><span class="l1">Tiệm Hoa</span><span class="l2">20<i>/</i>10</span>
            <div class="sub">Ba chị em · Một cửa hàng · Năm thử thách</div>${game.team ? `<div class="team-tag">🏷️ Đội ${esc(game.team)}</div>` : ''}</div>
          ${menu === 'main' ? `
          <div class="menu pop">
            <button class="btn big" data-a="play">🌷 Chơi cả ${theme.rounds.length} vòng <span class="key">Space</span></button>
            <div class="row"><button class="btn mint" data-a="practice">Luyện từng vòng</button>${net.online ? '' : '<button class="btn mint" data-a="pvp">⚔️ Đấu PvP</button>'}</div>
            ${net.onlineAvailable ? `<div class="row"><button class="btn mint" data-a="online">🌐 ${net.online ? `Phòng ${esc(net.onlineRoom?.code || '')}` : 'Chơi online'}</button>
            <button class="btn alt" data-a="board">🏆 Xếp hạng</button></div>` : ''}
            ${net.online ? '' : `<button class="btn alt" data-a="phones">📱 Kết nối điện thoại <span class="key">P</span></button>`}
            <div class="row"><button class="btn alt" data-a="team">🏷️ ${game.team ? 'Đổi tên đội' : 'Đặt tên đội'} <span class="key">N</span></button>
            ${net.online ? '' : '<button class="btn alt" data-a="themes">🎭 Chủ đề khác</button>'}</div>
            <button class="btn alt" data-a="sound">${A.isMuted() ? '🔇 Âm thanh: Tắt' : '🔊 Âm thanh: Bật'} <span class="key">M</span></button>
            <div class="hint">Chơi một mình — bạn điều khiển cả <b>Đào</b>, <b>Mai</b> và <b>Lan</b>.<br>Chọn độ khó ở đầu mỗi vòng: 🌼 Dễ ×${DIFF_MULT.easy.toFixed(1)} · 🌷 Thường ×${DIFF_MULT.normal.toFixed(1)} · 🔥 Thử thách ×${DIFF_MULT.hard.toFixed(1)}${matchMedia('(pointer: coarse)').matches ? '<br><b style="color:#d9628f">⌨️ Game cần bàn phím — hãy mở trên máy tính nhé!</b>' : ''}${best ? `<br>Kỷ lục tổng: <b>${best}</b> điểm` : ''}</div>
          </div>` : `
          <div class="menu practice pop">
            ${theme.rounds.map(r => { let b = 0; try { b = Math.max(...['easy', 'normal', 'hard'].map(d => +localStorage.getItem(bestKey(r.id, d)) || 0)); } catch (e) { /* ignore */ } return `<button class="btn alt round-btn" data-a="r:${r.id}"><span>${r.icon} Vòng ${r.num}: ${r.title}</span>${starsHTML(starsFor(b))}</button>`; }).join('')}
            <button class="btn" data-a="back">← Quay lại <span class="key">Esc</span></button>
          </div>`}`;
        root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a)));
      },
      act(a) {
        A.unlock(); A.sfx.click();
        if (a === 'play') { game.campaign = { scores: {}, words: null }; go('garden'); }
        if (a === 'practice') { menu = 'practice'; this.renderMenu(); }
        if (a === 'phones') openLobby();
        if (a === 'team') openTeamDialog();
        if (a === 'themes') openThemePicker();
        if (a === 'online') net.openOnline?.();
        if (a === 'pvp') location.href = `/pvp.html?theme=${encodeURIComponent(theme.id)}`; // two boards side by side (pvp.html)
        if (a === 'board') window.open(`/leaderboard.html?theme=${encodeURIComponent(theme.id)}`, '_blank', 'noopener');
        if (a === 'back') { menu = 'main'; this.renderMenu(); }
        if (a === 'sound') { A.toggleMute(); this.renderMenu(); }
        if (a.startsWith('r:')) { game.campaign = null; go(a.slice(2)); }
      },
      update(dt) {
        t += dt;
        if (input.hit('KeyM')) this.act('sound');
        if (input.hit('KeyP')) this.act('phones');
        if (input.hit('KeyN')) this.act('team');
        if (menu === 'main' && input.hit(...K.ok)) this.act('play');
        if (menu === 'practice' && input.hit(...K.back)) this.act('back');
        for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 40) c.x = -60; }
        for (const w of walkers) {
          w.t += dt;
          if (w.wait > 0) { w.wait -= dt; continue; }
          w.x += w.dir * 18 * dt;
          if (w.x > 300 || w.x < 120) { w.dir *= -1; w.wait = 1 + Math.random() * 2; if (Math.random() < .5) cheer(1, 0); }
        }
        petalT -= dt;
        if (petalT < 0) { petalT = 0.25; parts.add({ x: Math.random() * W, y: -4, vx: 8 + Math.random() * 10, vy: 12 + Math.random() * 10, g: 0, drag: 0, life: 14, img: S.petal[(Math.random() * 4) | 0] }); }
        parts.update(dt);
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        for (const c of clouds) {
          g.fillStyle = '#fff';
          const x = Math.round(c.x), y = Math.round(c.y), s = c.s;
          g.fillRect(x, y + 4 * s, 40 * s, 6 * s); g.fillRect(x + 6 * s, y, 18 * s, 10 * s); g.fillRect(x + 20 * s, y + 2 * s, 14 * s, 8 * s);
          g.fillStyle = '#e3f1fb'; g.fillRect(x, y + 9 * s, 40 * s, 1 * s + 1);
        }
        // walkers in depth order
        for (const w of [...walkers].sort((a, b) => a.y - b.y)) {
          const moving = w.wait <= 0, f = moving ? ((w.t * 6) | 0) % 4 : 0;
          drawAt(g, S.girl(w.i, moving ? 'side' : 'down', f), w.x, w.y - (f % 2 ? 1 : 0), { flip: w.dir < 0 });
        }
        for (const b of bflies) { b.ph += 0.016; drawAt(g, S.butterfly[((t * 8) | 0) % 2], b.x + Math.sin(b.ph * .7) * 60, b.y + Math.sin(b.ph * 1.3) * 18, { ay: .5 }); }
        parts.draw(g);
      },
      exit() { this.offTeam?.(); },
    };
    return s;
  });
}
