import { register, game, go, input, K, el, uiRoot, W, cheer, DIFF_MULT, teamTag } from '../../../core/main.js';
import { C, drawAt, Particles } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { starsHTML, starsFor } from '../../../core/round.js';
import { theme, storeKey } from '../../../core/theme.js';
import { nightScene } from './title.js';

const HOUSE_X = 140; // the board card takes the right side, so the house stands on the left
import { net, onNet, sendTo } from '../../../core/net.js';
import { esc } from '../../../core/lobby.js';
import { INFO } from '../meta.js';

// personal Halloween cards: each phone gets its own, titled after the costume its player wore most often
const TITLES = ['Bí Ngô tinh nghịch', 'Dơi Nhỏ lanh lợi', 'Mèo Đen bí ẩn'];
const WISHES = [
  'Chúc bạn một đêm Halloween thật nhiều kẹo và không bị ma nào hù!',
  'Cảm ơn bạn đã cùng Hội Ma Nhí đi qua đêm hội — chúc bạn luôn gan dạ và vui vẻ!',
  'Chúc bạn sáng như đèn bí ngô, ngọt như kẹo và vui như đêm hội!',
  'Kẹo hay ghẹo? Chúc bạn chọn được thật nhiều kẹo và thật nhiều tiếng cười!',
  'Chúc bạn luôn có những người bạn sẵn sàng dồn đèn giúp mình lúc khó!',
];
// cards for every named phone: rounds played (which costume, how many stars), the team's total and rank, a wish
function makeCards(camp, rows, total, rank) {
  const cast = camp.cast || {}, out = [];
  net.players.forEach((pl, pid) => {
    if (!pl.name) return;
    const played = rows.map(x => ({ title: x.r.title, stars: starsFor(x.sc), girl: (cast[x.r.id] || []).indexOf(pid) })).filter(x => x.girl >= 0);
    const count = [0, 1, 2].map(i => played.filter(x => x.girl === i).length), most = count.indexOf(Math.max(...count));
    out.push([pid, {
      t: 'card', name: pl.name, girl: played.length ? most : -1, title: played.length ? TITLES[most] : 'Cổ động viên số 1',
      rounds: played, total, rank: rank[1], rankIcon: rank[2], shop: INFO.shopName, team: game.team || '',
      wish: WISHES[(pl.name.length + total) % WISHES.length], date: `31/10/${new Date().getFullYear()}`,
    }]);
  });
  return out;
}

const RANKS = [
  // compared against the weighted total of all 3 rounds (each counted after softCap); scaled from the 20/10 thresholds
  [375, 'Hội Ma Nhí Thần thoại', '👑'], [330, 'Hội Ma Nhí Huyền thoại', '🎃'], [276, 'Hội Ma Nhí Nổi tiếng', '🦇'], [216, 'Hội Ma Nhí Gan dạ', '🕯️'], [0, 'Hội Ma Nhí Tập sự', '👻'],
];

export default function () {
  register('final', () => {
    const camp = game.campaign || { scores: { pumpkin: 92, ghosts: 81, potion: 74 } };
    const rows = theme.rounds.map(r => { const sc = camp.scores[r.id] || 0, d = (camp.diffs || {})[r.id] || 'normal'; return { r, sc, d, pts: Math.round(sc * DIFF_MULT[d]) }; });
    const raw = rows.reduce((s, x) => s + x.sc, 0), total = rows.reduce((s, x) => s + x.pts, 0);
    const rank = RANKS.find(r => total >= r[0]);
    let bg, parts = new Particles(), t = 0, leafT = 0, confT = 0;
    return {
      enter() {
        A.music('title'); A.sfx.fanfare(); cheer(14);
        let best = 0, newBest = false;
        try { best = +localStorage.getItem(storeKey('best_final')) || 0; if (total > best) { localStorage.setItem(storeKey('best_final'), total); newBest = true; best = total; } } catch (e) { best = total; }
        // send every phone its card now, and again to anyone who reconnects while the finale is on screen
        const sent = new Set();
        const sendCards = () => {
          if (!net.ok) return;
          net.players.forEach((pl, pid) => { if (!pl.on) sent.delete(pid); });
          for (const [pid, card] of makeCards(camp, rows, total, rank)) if (!sent.has(pid) && net.players.get(pid)?.on) { sendTo(pid, card); sent.add(pid); }
        };
        sendCards(); this.offNet = onNet(sendCards);
        const cardNote = net.online ? '<div class="btns"><button class="btn mint" data-local="card">💌 Xem thiệp Halloween của bạn</button></div>' : net.ok && [...net.players.values()].some(p => p.name) ? '<div class="best">💌 Thiệp Halloween đã gửi về điện thoại của từng bạn — mở điện thoại để lưu ảnh nhé!</div>' : '';
        bg = nightScene(8, HOUSE_X);
        const root = el(`<div class="final-ui hw"></div>`); uiRoot.appendChild(root);
        root.innerHTML = `
          <div class="opening pop">🎃 Kẹo hay ghẹo! 🍬</div>
          <div class="card board-card pop">
            <div class="ribbon">Bảng tổng kết${teamTag() ? ` · ${esc(teamTag())}` : ''}</div>
            <ul class="lines tot">${rows.map(x => `<li><span>${x.r.icon} ${x.r.title}</span><span>${starsHTML(starsFor(x.sc))} <em>${x.sc}×${DIFF_MULT[x.d].toFixed(1)}</em> <b>${x.pts}</b></span></li>`).join('')}</ul>
            <div class="calc">Điểm vòng × hệ số độ khó (🌼 Dễ ×${DIFF_MULT.easy.toFixed(1)} · 🌷 Thường ×${DIFF_MULT.normal.toFixed(1)} · 🔥 Thử thách ×${DIFF_MULT.hard.toFixed(1)}) · tổng điểm gốc ${raw} (chuẩn mỗi vòng 100)</div>
            <div class="bigscore"><b>${total}</b><small>điểm</small></div>
            <div class="rank">${rank[2]} ${rank[1]}</div>
            <div class="best">${newBest ? '🏆 Kỷ lục mới!' : `Kỷ lục: ${best} điểm`}</div>
            ${cardNote}
            <div class="btns">
              <button class="btn big" data-a="again">Chơi lại <span class="key">Space</span></button>
              <button class="btn alt" data-a="menu">Menu</button>
            </div>
          </div>`;
        root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a)));
        root.querySelector('[data-local="card"]')?.addEventListener('click', () => { const mine = makeCards(camp, rows, total, rank).find(([pid]) => pid === net.myPid); net.showCard?.(mine ? mine[1] : null); });
        net.onFinal?.({ scores: camp.scores, diffs: camp.diffs || {}, total, rankName: rank[1], team: game.team });
      },
      act(a) {
        if (a === 'again') { game.campaign = { scores: {} }; go(theme.rounds[0].id); }
        if (a === 'menu') { game.campaign = null; go('title'); }
      },
      update(dt) {
        t += dt;
        if (t > 1 && input.hit(...K.ok)) this.act('again');
        if (input.hit(...K.back)) this.act('menu');
        leafT -= dt; confT -= dt;
        if (leafT < 0) { leafT = 0.15; parts.add({ x: Math.random() * W, y: -4, vx: 6 + Math.random() * 12, vy: 14 + Math.random() * 14, g: 0, drag: 0, life: 14, img: S.leaf[(Math.random() * 4) | 0] }); }
        if (confT < 0) { confT = 1.4; const x = 40 + Math.random() * 240; parts.burst(x, 60 + Math.random() * 40, 18, { colors: [S.N.pumpkin, S.N.glow, S.N.purpleL, C.mint, C.white], speed: 80, g: 50, life: 1.4, size: 2 }); A.sfx.pop(); if (Math.random() < .5) cheer(2); }
        parts.update(dt);
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // the kids at the haunted house door, holding up their candy bags
        [0, 1, 2].forEach(i => {
          const ph = t * 6 + i * 2, hop = Math.max(0, Math.sin(ph)) * 5;
          drawAt(g, S.kid(i, 'down', 0, Math.sin(ph) > 0), HOUSE_X - 30 + i * 30, 262 - hop);
          drawAt(g, S.candy[i], HOUSE_X - 30 + i * 30 + 8, 252 - hop);
        });
        parts.draw(g);
      },
      exit() { this.offNet?.(); },
    };
  });
}
