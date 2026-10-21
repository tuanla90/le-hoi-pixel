import { register, game, go, input, K, el, uiRoot, W, H, cheer, DIFF_NAME, DIFF_MULT, teamTag } from '../../../core/main.js';
import { C, makeCanvas, drawAt, Particles } from '../../../core/gfx.js';
import * as S from '../sprites.js';
import * as A from '../../../core/audio.js';
import { starsHTML, starsFor } from '../../../core/round.js';
import { theme, storeKey } from '../../../core/theme.js';
import { skyScene } from './title.js';
import { net, onNet, sendTo } from '../../../core/net.js';
import { esc } from '../../../core/lobby.js';

// the flower-shop finale, shared by Tiệm Hoa 20/10 and Tiệm Hoa 8/3: theme.look.finale holds each one's card titles
// (one per sister: the one its player was most often), wishes, date, card headline, ranks and banner
// cards for every named phone: rounds played (which sister, how many stars), the team's total and rank, a wish
function makeCards(camp, rows, total, rank) {
  const F = theme.look.finale, cast = camp.cast || {}, out = [];
  net.players.forEach((pl, pid) => {
    if (!pl.name) return;
    const played = rows.map(x => ({ title: x.r.title, stars: starsFor(x.sc), girl: (cast[x.r.id] || []).indexOf(pid) })).filter(x => x.girl >= 0);
    const count = [0, 1, 2].map(i => played.filter(x => x.girl === i).length), most = count.indexOf(Math.max(...count));
    out.push([pid, {
      t: 'card', name: pl.name, girl: played.length ? most : -1, title: played.length ? F.titles[most] : 'Cổ động viên số 1',
      rounds: played, total, rank: rank[1], rankIcon: rank[2], shop: theme.shopName, team: game.team || '', headline: F.headline,
      wish: F.wishes[(pl.name.length + total) % F.wishes.length], date: `${F.date}/${new Date().getFullYear()}`,
    }]);
  });
  return out;
}


export default function () {
  register('final', () => {
    const F = theme.look.finale, camp = game.campaign || { scores: Object.fromEntries(theme.rounds.map((r, i) => [r.id, [92, 78, 64][i % 3]])) };
    // every round counts with the multiplier of the difficulty it was played at
    const rows = theme.rounds.map(r => { const sc = camp.scores[r.id] || 0, d = (camp.diffs || {})[r.id] || 'normal'; return { r, sc, d, pts: Math.round(sc * DIFF_MULT[d]) }; });
    const raw = rows.reduce((s, x) => s + x.sc, 0), total = rows.reduce((s, x) => s + x.pts, 0);
    const rank = F.ranks.find(r => total >= r[0]);
    let bg, parts = new Particles(), t = 0, petalT = 0, confT = 0;
    const SHOP_X = 168, SHOP_Y = 238;
    return {
      enter() {
        A.music('title'); A.sfx.fanfare(); cheer(14);
        let best = 0, newBest = false;
        try { best = +localStorage.getItem(storeKey('best_final')) || 0; if (total > best) { localStorage.setItem(storeKey('best_final'), total); newBest = true; best = total; } } catch (e) { best = total; }
        // send every phone its card now, and again to anyone who reconnects while the finale is on screen
        const sent = new Set();
        const sendCards = () => {
          if (!net.ok) return;
          net.players.forEach((pl, pid) => { if (!pl.on) sent.delete(pid); }); // a phone that drops off gets its card again when it is back
          for (const [pid, card] of makeCards(camp, rows, total, rank)) if (!sent.has(pid) && net.players.get(pid)?.on) { sendTo(pid, card); sent.add(pid); }
        };
        sendCards(); this.offNet = onNet(sendCards);
        // online: every player sees this screen on their own device and opens their card here; the host posts the score
        const cardNote = net.online ? `<div class="btns"><button class="btn mint" data-local="card">💌 Xem ${theme.cardName.toLowerCase()} của bạn</button></div>` : net.ok && [...net.players.values()].some(p => p.name) ? `<div class="best">💌 ${theme.cardName} đã gửi về điện thoại của từng bạn — mở điện thoại để lưu ảnh nhé!</div>` : '';
        const shop = S.shopFacade();
        bg = makeCanvas(W, H, g => {
          g.drawImage(skyScene(8), 0, 0);
          drawAt(g, S.tree, 30, 236); drawAt(g, S.treeRound, 300, 226); drawAt(g, S.bush, 296, 244);
          drawAt(g, shop, SHOP_X, SHOP_Y);
          [[40, 252, 0], [70, 262, 1], [260, 258, 2], [290, 266, 3]].forEach(([x, y, k]) => drawAt(g, S.flowerTuft[k], x, y));
        });
        const root = el(`<div class="final-ui"></div>`); uiRoot.appendChild(root);
        root.innerHTML = `
          <div class="shop-sign final-sign" style="left:calc(var(--u)*${SHOP_X - 70});top:calc(var(--u)*${SHOP_Y - 168 + 44});width:calc(var(--u)*140);height:calc(var(--u)*20)">
            <b>${theme.shopName}</b></div>
          <div class="opening pop">${F.opening}</div>
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
        petalT -= dt; confT -= dt;
        if (petalT < 0) { petalT = 0.12; parts.add({ x: Math.random() * W, y: -4, vx: 6 + Math.random() * 12, vy: 14 + Math.random() * 14, g: 0, drag: 0, life: 14, img: S.petal[(Math.random() * 4) | 0] }); }
        if (confT < 0) { confT = 1.4; const x = 60 + Math.random() * 220; parts.burst(x, 60 + Math.random() * 40, 18, { colors: [C.pink, C.yellow, C.mint, C.lav, C.white], speed: 80, g: 50, life: 1.4, size: 2 }); A.sfx.pop(); if (Math.random() < .5) cheer(2); }
        parts.update(dt);
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        [0, 1, 2].forEach(i => {
          const ph = t * 6 + i * 2, hop = Math.max(0, Math.sin(ph)) * 5;
          drawAt(g, S.girl(i, 'down', 0, Math.sin(ph) > 0), SHOP_X - 30 + i * 30, 256 - hop);
        });
        parts.draw(g);
      },
      exit() { this.offNet?.(); },
    };
  });
}
