import { register, game, go, input, K, el, uiRoot, W, H, cheer, bestKey, DIFF_MULT, onTeam } from '../../../core/main.js';
import { makeCanvas, drawAt, Particles } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { starsHTML, starsFor } from '../../../core/round.js';
import { theme, storeKey } from '../../../core/theme.js';
import { openLobby, openTeamDialog, openThemePicker, esc } from '../../../core/lobby.js';
import { net } from '../../../core/net.js';
import { night } from '../world.js';

const HOUSE_Y = 240;
// background shared with the finale: the haunted house on the hill, graves, dead trees
export function nightScene(seed = 4, houseX = 360) {
  return makeCanvas(W, H, g => {
    night(g, seed, 186);
    g.fillStyle = '#4a3a2e'; g.fillRect(0, 232, W, 22); g.fillStyle = '#3a2c22'; g.fillRect(0, 232, W, 2); g.fillRect(0, 252, W, 2);
    drawAt(g, S.hauntedHouse(), houseX, HOUSE_Y);
    drawAt(g, S.deadTree, 26, 196); drawAt(g, S.deadTree, 248, 190);
    [[60, 220, 0], [98, 214, 1], [140, 224, 2], [454, 228, 1]].forEach(([x, y, k]) => drawAt(g, S.grave[k], x, y));
    for (let x = 8; x < W; x += 16) if (Math.abs(x - houseX) > 72 && x < 470) drawAt(g, S.ironFence, x, 232); // a gap in front of the house
    [[186, 262, 0], [214, 264, 1], [300, 262, 2], [440, 264, 3]].forEach(([x, y, k]) => drawAt(g, k === 3 ? S.jackMini : S.candy[k], x, y));
  });
}

export default function () {
  register('title', () => {
    let bg, parts = new Particles(), walkers = [], bats = [], t = 0, leafT = 0;
    let menu = 'main';
    const s = {
      enter() {
        A.music('title');
        bg = nightScene();
        walkers = [0, 1, 2].map(i => ({ i, x: 150 + i * 22, y: 252, dir: 1, t: Math.random() * 2, wait: 0 }));
        bats = [0, 1, 2].map(i => ({ x: 60 + i * 140, y: 60 + i * 12, ph: i * 2 }));
        this.renderMenu();
        this.offTeam = onTeam(() => this.renderMenu()); // the team name can change from a phone too
      },
      renderMenu() {
        uiRoot.innerHTML = '';
        let best = 0; try { best = +localStorage.getItem(storeKey('best_final')) || 0; } catch (e) { /* ignore */ }
        const root = el(`<div class="title-ui hw"></div>`); uiRoot.appendChild(root);
        root.innerHTML = `
          <div class="logo pop"><span class="l1">Đêm</span><span class="l2">Hallo<i>ween</i></span>
            <div class="sub">Ba bạn nhỏ · Một đêm hội · Ba thử thách</div>${game.team ? `<div class="team-tag">🏷️ Đội ${esc(game.team)}</div>` : ''}</div>
          ${menu === 'main' ? `
          <div class="menu pop">
            <button class="btn big" data-a="play">🎃 Chơi cả ${theme.rounds.length} vòng <span class="key">Space</span></button>
            <button class="btn mint" data-a="practice">Luyện từng vòng</button>
            ${net.onlineAvailable ? `<div class="row"><button class="btn mint" data-a="online">🌐 ${net.online ? `Phòng ${esc(net.onlineRoom?.code || '')}` : 'Chơi online'}</button>
            <button class="btn alt" data-a="board">🏆 Xếp hạng</button></div>` : ''}
            ${net.online ? '' : `<button class="btn alt" data-a="phones">📱 Kết nối điện thoại <span class="key">P</span></button>`}
            <div class="row"><button class="btn alt" data-a="team">🏷️ ${game.team ? 'Đổi tên đội' : 'Đặt tên đội'} <span class="key">N</span></button>
            ${net.online ? '' : '<button class="btn alt" data-a="themes">🎭 Chủ đề khác</button>'}</div>
            <button class="btn alt" data-a="sound">${A.isMuted() ? '🔇 Âm thanh: Tắt' : '🔊 Âm thanh: Bật'} <span class="key">M</span></button>
            <div class="hint">Chơi một mình — bạn điều khiển cả <b>Bí</b>, <b>Dơi</b> và <b>Mèo</b>.<br>Chọn độ khó ở đầu mỗi vòng: 🌼 Dễ ×${DIFF_MULT.easy.toFixed(1)} · 🌷 Thường ×${DIFF_MULT.normal.toFixed(1)} · 🔥 Thử thách ×${DIFF_MULT.hard.toFixed(1)}${matchMedia('(pointer: coarse)').matches ? '<br><b style="color:#d9628f">⌨️ Game cần bàn phím — hãy mở trên máy tính nhé!</b>' : ''}${best ? `<br>Kỷ lục tổng: <b>${best}</b> điểm` : ''}</div>
          </div>` : `
          <div class="menu practice pop">
            ${theme.rounds.map(r => { let b = 0; try { b = Math.max(...['easy', 'normal', 'hard'].map(d => +localStorage.getItem(bestKey(r.id, d)) || 0)); } catch (e) { /* ignore */ } return `<button class="btn alt round-btn" data-a="r:${r.id}"><span>${r.icon} Vòng ${r.num}: ${r.title}</span>${starsHTML(starsFor(b))}</button>`; }).join('')}
            <button class="btn" data-a="back">← Quay lại <span class="key">Esc</span></button>
          </div>`}`;
        root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a)));
      },
      act(a) {
        A.unlock(); A.sfx.click();
        if (a === 'play') { game.campaign = { scores: {} }; go(theme.rounds[0].id); }
        if (a === 'practice') { menu = 'practice'; this.renderMenu(); }
        if (a === 'phones') openLobby();
        if (a === 'team') openTeamDialog();
        if (a === 'themes') openThemePicker();
        if (a === 'online') net.openOnline?.();
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
        for (const w of walkers) {
          w.t += dt;
          if (w.wait > 0) { w.wait -= dt; continue; }
          w.x += w.dir * 18 * dt;
          if (w.x > 320 || w.x < 140) { w.dir *= -1; w.wait = 1 + Math.random() * 2; if (Math.random() < .5) cheer(1, 0); }
        }
        leafT -= dt;
        if (leafT < 0) { leafT = 0.3; parts.add({ x: Math.random() * W, y: -4, vx: 10 + Math.random() * 10, vy: 12 + Math.random() * 10, g: 0, drag: 0, life: 14, img: S.leaf[(Math.random() * 4) | 0] }); }
        parts.update(dt);
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        for (const b of bats) { b.ph += 0.016; drawAt(g, S.bat[((t * 8) | 0) % 2], b.x + Math.sin(b.ph * .6) * 70, b.y + Math.sin(b.ph * 1.4) * 14, { ay: .5 }); }
        for (const w of [...walkers].sort((a, b) => a.y - b.y)) {
          const moving = w.wait <= 0, f = moving ? ((w.t * 6) | 0) % 4 : 0;
          drawAt(g, S.kid(w.i, moving ? 'side' : 'down', f, !moving), w.x, w.y - (f % 2 ? 1 : 0), { flip: w.dir < 0 });
        }
        parts.draw(g);
      },
      exit() { this.offTeam?.(); },
    };
    return s;
  });
}
