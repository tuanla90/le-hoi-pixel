// Shared flow for every mini game: intro card → 3·2·1 → play → result card.
// The intro card also picks the round's difficulty and can play a ~30s guided demo.
import { game, go, input, K, el, img, uiRoot, cheer, bestKey, DIFF_NAME, DIFF_MULT, DIFF_ICON, DIFFS, diffOf, setDiffOf, softCap, onTeam, teamTag } from './main.js';
import { C } from './gfx.js';
import * as A from './audio.js';
import * as S from './sprites.js';
import { net, playerName, buzz } from './net.js';
import { openLobby, openTeamDialog, roleChip, esc } from './lobby.js';

export const ROUNDS = [
  { id: 'garden', num: 1, title: 'Trồng cây', spr: () => S.plant('hong', 3) },
  { id: 'carry', num: 2, title: 'Bê cây', spr: () => S.bigPot },
  { id: 'drive', num: 3, title: 'Chở cây', spr: () => S.truckSide },
  { id: 'sign', num: 4, title: 'Làm biển hiệu', spr: () => S.signPost },
  { id: 'shop', num: 5, title: 'Ngày khai trương', spr: () => S.potBloom(12) },
];
// pixel-art round icons (emoji like 🪴 are missing on older Windows fonts)
ROUNDS.forEach(r => { let c; Object.defineProperty(r, 'icon', { get: () => c || (c = img(r.spr(), 'ricon')) }); });

export function starsFor(score) { return score >= 80 ? 3 : score >= 50 ? 2 : score >= 20 ? 1 : 0; }
export function starsHTML(n, cls = '') {
  return `<span class="stars ${cls}">${[0, 1, 2].map(i => img(i < n ? S.star : S.starEmpty, 'star' + (i < n ? ' lit' : ''))).join('')}</span>`;
}
const ROLE_COLORS = ['#e0507e', '#e0a92a', '#3f86cf'];

export class Round {
  constructor(meta, params) {
    this.meta = ROUNDS.find(r => r.id === meta.id); Object.assign(this, meta);
    this.params = params || {}; this.state = 'intro'; this.t = 0; this.score = 0; this.stateT = 0;
  }
  // ------------------------------------------------ lifecycle
  enter() {
    game.diff = diffOf(this.id);
    this.tested = [false, false, false]; // which roles have pressed one of their keys on the intro card
    A.music('calm');
    this.init();
    this.root = el(`<div class="round"></div>`); uiRoot.appendChild(this.root);
    this.showIntro();
    this.offTeam = onTeam(() => { if (this.state === 'intro') this.showIntro(); }); // renamed from the MC dialog or Lan's phone
  }
  exit() { A.engine(-1); input.setVirtual(null); this.offTeam?.(); }
  setState(s) { this.state = s; this.stateT = 0; }

  showIntro() {
    this.setState('intro');
    const c = game.campaign;
    const roles = this.roles.map((r, i) => `
      <div class="role">
        <div class="role-ava">${img(S.girl(r.girl ?? i, 'down', 0))}</div>
        <div class="role-name" style="--c:${ROLE_COLORS[r.girl ?? i]}">${S.GIRLS[r.girl ?? i].name}</div>
        <div class="role-act">${r.act}</div>
        <div class="role-keys">${r.keys}</div>
        <div class="role-player" data-rp="${r.girl ?? i}">${roleChip(r.girl ?? i)}</div>
        <div class="role-test ${this.tested[r.girl ?? i] ? 'ok' : ''}" data-rt="${r.girl ?? i}">${this.tested[r.girl ?? i] ? '✓ Phím chạy tốt' : '👆 Bấm thử phím'}</div>
      </div>`).join('');
    const seg = d => `<button class="seg ${game.diff === d ? 'on' : ''}" data-act="diff:${d}">${DIFF_ICON[d]} ${DIFF_NAME[d]} <small>×${DIFF_MULT[d].toFixed(1)}</small></button>`;
    this.card(`
      <div class="card intro pop">
        <div class="ribbon">${c ? `Vòng ${this.meta.num}/${ROUNDS.length}` : 'Luyện tập'}${teamTag() ? ` · ${esc(teamTag())}` : ''}</div>
        <h1>${this.meta.title}</h1>
        <p class="lead">${this.desc}</p>
        <div class="roles">${roles}</div>
        <p class="tip">💡 ${this.tip}</p>
        <div class="diffbar"><span>Độ khó vòng này <span class="key">H</span></span>${DIFFS.map(seg).join('')}</div>
        ${this.diffInfo ? `<div class="diffinfo">${DIFF_ICON[game.diff]} <b>${DIFF_NAME[game.diff]}:</b> ${this.diffInfo[game.diff]}</div>` : ''}
        <div class="btns">
          ${net.ok || net.online ? `<button class="btn alt" data-act="phones">${net.online ? '🌐 Phòng' : '📱 Mã QR'} <span class="key">P</span></button>` : ''}
          <button class="btn alt" data-act="team">🏷️ Tên đội <span class="key">N</span></button>
          ${this.demoStep ? `<button class="btn mint" data-act="demo">▶ Xem demo <span class="key">V</span></button>` : ''}
          <button class="btn big" data-act="start">Bắt đầu! <span class="key">Space</span></button>
        </div>
      </div>`);
  }
  card(html) {
    this.root.innerHTML = html;
    this.root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => this.action(b.dataset.act)));
  }
  action(a) {
    A.sfx.click();
    if (a === 'start') this.beginCount();
    if (a === 'demo') this.startDemo();
    if (a === 'phones') openLobby();
    if (a === 'team') openTeamDialog();
    if (a.startsWith('diff:')) this.setDiff(a.slice(5));
    if (a === 'resume') { this.root.querySelector('.pause')?.remove(); this.setState('play'); this.state = 'play'; }
    if (a === 'retry') go(this.id, this.params);
    if (a === 'menu') { game.campaign = null; go('title'); }
    if (a === 'next') this.next();
  }
  setDiff(d) {
    if (d === game.diff) return;
    game.diff = d; setDiffOf(this.id, d);
    this.init(); this.showIntro(); // every round reads its tuning in init()
  }
  beginCount() {
    this.setState('count'); this.count = 3; A.sfx.count();
    if (this.ownMusic) A.stopMusic(); // rounds with their own soundtrack (round 4) must not stack two songs
    this.root.innerHTML = ''; this.buildHud();
    this.bigText('3');
  }
  bigText(t, cls = '') {
    this.root.querySelector('.bigtext')?.remove();
    const d = el(`<div class="bigtext ${cls}">${t}</div>`); this.root.appendChild(d);
    return d;
  }
  buildHud() {
    const roles = this.roles.map((r, i) => `
      <div class="hrole" data-r="${i}">
        ${img(S.girl(r.girl ?? i, 'down', 0))}
        <div><b>${S.GIRLS[r.girl ?? i].name}${net.roles[r.girl ?? i] ? ` <em>· ${playerName(net.roles[r.girl ?? i]).replace(/</g, '')}</em>` : ''}</b><small>${r.short || r.act}</small></div>
        <div class="hkeys">${r.keys}</div>
      </div>`).join('');
    this.hud = el(`
      <div class="hud">
        <div class="hud-top">
          <div class="pill title">${this.meta.icon} ${this.meta.title} <small class="dtag">${DIFF_NAME[game.diff]}</small></div>
          <div class="pill timer"><span>0</span></div>
          <div class="pill score"><span class="lbl">${this.scoreLabel || 'Điểm'}</span> <b>0</b></div>
        </div>
        <div class="hud-roles">${roles}</div>
        <div class="hud-esc">${'<span class="key">Esc</span>'} tạm dừng</div>
      </div>`);
    this.root.appendChild(this.hud);
    this.$timer = this.hud.querySelector('.timer span'); this.$timerPill = this.hud.querySelector('.timer');
    this.$score = this.hud.querySelector('.score b');
    this.roleEls = [...this.hud.querySelectorAll('.hrole')];
    if (this.initialScore !== undefined) this.$score.textContent = this.initialScore;
  }
  pulse(i) {
    const e = this.roleEls && this.roleEls[i]; if (!e) return;
    e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 160);
  }
  setTimer(text, warn = false) { if (this.$timer && this.$timer.textContent !== text) { this.$timer.textContent = text; this.$timerPill.classList.toggle('warn', warn); } }
  setScoreText(text) { if (this.$score && this.$score.textContent !== String(text)) { this.$score.textContent = text; this.$score.classList.remove('bump'); void this.$score.offsetWidth; this.$score.classList.add('bump'); } }
  toast(text, cls = '') {
    const t = el(`<div class="toast ${cls}">${text}</div>`); this.root.appendChild(t);
    setTimeout(() => t.remove(), 1400);
  }

  // ------------------------------------------------ guided demo
  // A scene opts in by defining demoKeys (per role: [[code, label], …]), demoStep(dt) (the bot) and
  // demoScript ([{ at, text, focus: () => ({ x, y, r }) }]) or its own demoCaption(t).
  startDemo() {
    if (!this.demoStep) return;
    this.demo = { t: 0, len: this.demoLen || 30, speed: this.demoSpeed || 0.6, vin: { down: new Set(), hits: new Set() }, rel: [], flash: {}, capText: null };
    this.init(); this.t = 0;
    input.setVirtual(this.demo.vin);
    if (this.ownMusic) A.stopMusic(); else A.music('play');
    this.root.innerHTML = '';
    this.demoSetup && this.demoSetup();
    const keys = this.demoKeys.map((ks, i) => `
      <div class="dk-role" style="--c:${ROLE_COLORS[i]}">
        ${img(S.girl(i, 'down', 0))}
        <b>${S.GIRLS[i].name}</b>
        <div class="dk-keys">${ks.map(([code, label]) => `<span class="dk" data-code="${code}">${label}</span>`).join('')}</div>
      </div>`).join('');
    this.root.appendChild(el(`
      <div class="demo-ui">
        <div class="demo-badge">▶ DEMO · chạy chậm ×${this.demo.speed} <span class="key">Space</span> bỏ qua</div>
        <div class="demo-cap"></div>
        <div class="demo-bar"><i></i></div>
        <div class="demo-keys">${keys}</div>
      </div>`));
    this.$cap = this.root.querySelector('.demo-cap');
    this.$bar = this.root.querySelector('.demo-bar i');
    this.$dk = [...this.root.querySelectorAll('.dk')];
    this.setState('demo');
  }
  vpress(code) { const d = this.demo; d.vin.down.add(code); d.vin.hits.add(code); d.rel.push(code); d.flash[code] = 0.3; }
  vhold(code, on) { const d = this.demo; if (on) { if (!d.vin.down.has(code)) d.flash[code] = 0.3; d.vin.down.add(code); } else d.vin.down.delete(code); }
  updateDemo(dt) {
    if (input.rawHit('Escape', 'Space', 'Enter', 'KeyV')) { this.stopDemo(); return; }
    const d = this.demo; d.t += dt;
    const gdt = dt * d.speed;
    d.vin.hits.clear(); d.rel.forEach(c => d.vin.down.delete(c)); d.rel = [];
    this.demoStep(gdt);
    this.t += gdt; this.play(gdt);
    if (this.state !== 'demo') return; // the round ended inside play() — stopDemo already ran
    // caption + spotlight
    const cap = this.demoCaption(d.t);
    if (cap && cap.text !== d.capText) { d.capText = cap.text; this.$cap.innerHTML = cap.text; this.$cap.classList.remove('pop'); void this.$cap.offsetWidth; this.$cap.classList.add('pop'); }
    this.demoFocus = cap && cap.focus ? cap.focus() : null;
    // move the caption down when the spotlight is near the top — unless the scene needs the bottom clear
    const f = this.demoFocus;
    this.$cap.classList.toggle('low', !this.demoCapTop && !!f && f.y - f.r < 42 && f.y + f.r < 192);
    // virtual keyboard
    for (const k in d.flash) d.flash[k] = Math.max(0, d.flash[k] - dt);
    this.$dk.forEach(e => e.classList.toggle('on', d.vin.down.has(e.dataset.code) || d.flash[e.dataset.code] > 0));
    this.$bar.style.width = Math.min(100, d.t / d.len * 100) + '%';
    if (d.t >= d.len) this.stopDemo();
  }
  demoCaption(t) {
    const s = this.demoScript || []; let cur = null;
    for (const c of s) if (t >= c.at) cur = c;
    return cur;
  }
  stopDemo() {
    input.setVirtual(null); A.engine(-1);
    this.demo = null; this.demoFocus = null;
    if (this.ownMusic) A.stopMusic();
    A.music('calm');
    this.init(); this.t = 0; this.showIntro();
  }
  drawDemo(g) {
    const f = this.demoFocus; if (!f) return;
    const pulse = 1 + Math.sin(this.demo.t * 6) * 0.06, r = Math.round(f.r * pulse);
    g.fillStyle = 'rgba(40,24,48,0.5)'; g.beginPath(); g.rect(0, 0, 480, 270); g.arc(f.x, f.y, r, 0, Math.PI * 2, true); g.fill('evenodd');
    g.strokeStyle = C.yellow; g.lineWidth = 2; g.setLineDash([4, 3]); g.lineDashOffset = -this.demo.t * 12;
    g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  }

  // ------------------------------------------------ main update
  update(dt) {
    this.stateT += dt;
    if (this.state === 'intro') {
      this.idle && this.idle(dt);
      // phones pick their roles while the intro card is up: keep the names on the card live
      this.rpT = (this.rpT || 0) - dt;
      if (this.rpT <= 0) { this.rpT = 0.25; this.root.querySelectorAll('[data-rp]').forEach(e => { const h = roleChip(+e.dataset.rp); if (e.innerHTML !== h) e.innerHTML = h; }); }
      this.keyTest();
      if (input.hit('KeyP')) this.action('phones');
      if (input.hit('KeyN')) this.action('team');
      if (input.hit(...K.ok)) this.action('start');
      if (input.hit('KeyV')) this.action('demo');
      if (input.hit('KeyH')) this.action('diff:' + DIFFS[(DIFFS.indexOf(game.diff) + 1) % DIFFS.length]);
      if (input.hit(...K.back)) this.action('menu');
      return;
    }
    if (this.state === 'demo') { this.updateDemo(dt); return; }
    if (this.state === 'count') {
      this.idle && this.idle(dt);
      if (this.stateT >= 0.8) {
        this.stateT = 0; this.count--;
        if (this.count > 0) { this.bigText(String(this.count)); A.sfx.count(); }
        else { this.bigText('Bắt đầu!', 'go'); A.sfx.go(); buzz('all', [60, 40, 60]); if (!this.ownMusic) A.music('play'); this.setState('play'); setTimeout(() => this.root.querySelector('.bigtext.go')?.remove(), 700); }
      }
      return;
    }
    if (this.state === 'play') {
      if (input.hit(...K.back)) { this.pause(); return; }
      this.t += dt;
      this.play(dt);
      return;
    }
    if (this.state === 'paused') {
      if (input.hit(...K.back, ...K.ok)) this.action('resume');
      return;
    }
    if (this.state === 'ending') {
      this.idle && this.idle(dt);
      if (this.stateT > 1.6) this.showResult();
      return;
    }
    if (this.state === 'result') {
      this.idle && this.idle(dt);
      if (this.stateT > 0.6 && input.hit(...K.ok)) this.action(game.campaign ? 'next' : 'retry');
      if (input.hit(...K.back)) this.action('menu');
    }
  }
  // phone vibration cue for the given roles, only during real play (never from a demo)
  cue(who, pattern, tag, gap) { if (this.state === 'play') buzz(who, pattern, tag, gap); }
  // intro card: whoever presses one of their role's keys (keyboard or phone) makes their girl hop and gets a ✓,
  // so the team knows every controller works before the round starts
  keyTest() {
    const codes = this.roleCodes || (this.demoKeys || []).map(ks => ks.map(k => k[0]));
    codes.forEach((cs, i) => {
      if (!cs || !input.hit(...cs)) return;
      const card = this.root.querySelectorAll('.role')[i]; if (!card) return;
      const ava = card.querySelector('.role-ava'); ava.classList.remove('hop'); void ava.offsetWidth; ava.classList.add('hop');
      A.tone(A.N([72, 76, 79][i]), 0.1, { type: 'triangle', vol: 0.15 });
      if (!this.tested[i]) { this.tested[i] = true; const t = card.querySelector('.role-test'); t.classList.add('ok'); t.textContent = '✓ Phím chạy tốt'; }
    });
  }
  pause() {
    this.setState('paused'); A.engine(-1);
    this.root.appendChild(el(`<div class="pause"><div class="card pop small"><h2>Tạm dừng</h2>
      <button class="btn" data-act="resume">Chơi tiếp <span class="key">Esc</span></button>
      <button class="btn alt" data-act="retry">Chơi lại vòng này</button>
      <button class="btn alt" data-act="menu">Về màn hình chính</button></div></div>`));
    this.root.querySelectorAll('.pause [data-act]').forEach(b => b.addEventListener('click', () => this.action(b.dataset.act)));
  }
  // call from subclass when the round is over
  end(banner, result) {
    if (this.state === 'demo') { this.stopDemo(); return; }
    if (this.state === 'ending' || this.state === 'result') return;
    A.engine(-1);
    // no hard ceiling: 100 is par, bonuses go beyond it but only half of the excess counts
    const raw = Math.max(0, Math.round(result.score));
    this.result = result; this.result.raw = raw; this.result.score = Math.round(softCap(raw));
    if (raw > 100) this.result.lines.push([`Vượt chuẩn 100: ${raw - 100} điểm, tính một nửa`, `${raw} → ${this.result.score}`]);
    this.result.stars = starsFor(this.result.score);
    this.result.diff = game.diff; this.result.counted = Math.round(this.result.score * DIFF_MULT[game.diff]);
    this.setState('ending'); this.bigText(banner, 'end'); A.sfx.timeup(); buzz('all', 220);
    if (game.campaign) {
      game.campaign.scores[this.id] = this.result.score; (game.campaign.diffs ||= {})[this.id] = game.diff;
      (game.campaign.cast ||= {})[this.id] = net.roles.slice(); // who held which role, for the personal cards at the end
    }
    try {
      const k = bestKey(this.id), b = +localStorage.getItem(k) || 0;
      this.result.best = Math.max(b, this.result.score); this.result.newBest = this.result.score > b;
      localStorage.setItem(k, this.result.best);
    } catch (e) { this.result.best = this.result.score; }
  }
  showResult() {
    this.setState('result'); A.music('calm');
    const r = this.result; this.hud?.remove();
    if (r.stars >= 2) { A.sfx.fanfare(); cheer(10); } else A.sfx.ok();
    const msg = ['Không sao, thử lại nhé! 💪', 'Khá lắm! 🌼', 'Tuyệt vời! 🌷', 'Xuất sắc! 👑'][r.stars];
    const isLast = game.campaign && this.meta.num === ROUNDS.length;
    this.card(`
      <div class="card result pop">
        <div class="ribbon">${this.meta.icon} ${this.meta.title}${teamTag() ? ` · ${esc(teamTag())}` : ''}</div>
        ${starsHTML(r.stars, 'big')}
        <div class="msg">${msg}</div>
        <div class="bigscore"><b data-count="${r.score}">0</b><small>điểm</small></div>
        ${r.score > 100 ? `<div class="overpar">🌟 Vượt chuẩn 100 thêm ${r.score - 100} điểm!</div>` : ''}
        <ul class="lines">${r.lines.map(l => `<li><span>${l[0]}</span><b>${l[1]}</b></li>`).join('')}
          <li class="mult"><span>Độ khó ${DIFF_NAME[r.diff]} (×${DIFF_MULT[r.diff].toFixed(1)})</span><b>${r.score} × ${DIFF_MULT[r.diff].toFixed(1)} = ${r.counted} điểm</b></li></ul>
        ${r.extra || ''}
        <div class="best">${r.newBest ? '🏆 Kỷ lục mới!' : `Kỷ lục (${DIFF_NAME[r.diff]}): ${r.best}`}</div>
        <div class="btns">
          ${game.campaign
            ? `<button class="btn big" data-act="next">${isLast ? 'Xem tổng kết!' : 'Vòng tiếp theo'} <span class="key">Space</span></button>`
            : `<button class="btn big" data-act="retry">Chơi lại <span class="key">Space</span></button>`}
          <button class="btn alt" data-act="menu">Menu</button>
        </div>
      </div>`);
    const b = this.root.querySelector('[data-count]'); const target = r.score; const t0 = performance.now();
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / 900); b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  next() {
    const i = ROUNDS.findIndex(r => r.id === this.id);
    if (i < ROUNDS.length - 1) go(ROUNDS[i + 1].id, {}); else go('final', {});
  }
  draw(g) { this.drawWorld(g); if (this.state === 'demo') this.drawDemo(g); }
}
