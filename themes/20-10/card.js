// The personal card of the flower-shop themes (20/10, 8/3), drawn on a canvas so it can be saved as a picture (phones in LAN play, every player online).
export function drawCard(c) {
  const W = 720, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), F = '"Baloo 2", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#ffe3ec'); grd.addColorStop(0.55, '#fff6e3'); grd.addColorStop(1, '#ffd6e4');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // scattered petals and a double frame
  const petals = ['#ff8fb1', '#ffd23f', '#b79ced', '#6fd3b8', '#ffc4d6'];
  let seed = c.name.length * 97 + c.total; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 70; i++) { g.fillStyle = petals[i % petals.length]; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 7 + rnd() * 9, 4 + rnd() * 5, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = '#d9628f'; g.lineWidth = 8; g.strokeRect(24, 24, W - 48, H - 48); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
  g.textAlign = 'center'; g.fillStyle = '#3b2a3a';
  const text = (t, y, size, color = '#3b2a3a', weight = 800) => { g.font = `${weight} ${size}px ${F}`; g.fillStyle = color; g.fillText(t, W / 2, y); };
  text(c.headline || '20 / 10', 175, 128, '#d9628f'); // the big date on top (cards sent before themes had one say 20 / 10)
  text('Thiệp tặng', 245, 34, '#6b4a5a', 700);
  text(c.name, 320, 72, '#3b2a3a');
  if (c.team) text(`🏷️ Đội ${c.team}`, 358, 28, '#9a5b3c', 700);
  const icon = ['🌸', '🌼', '💠'][c.girl] || '🎉', col = ['#d9507e', '#d79a1e', '#2f72c9'][c.girl] || '#8b6bd0';
  g.fillStyle = col; const bw = 520; const by = c.team ? 376 : 350; g.beginPath(); g.roundRect ? g.roundRect((W - bw) / 2, by, bw, 70, 35) : g.rect((W - bw) / 2, by, bw, 70); g.fill();
  text(`${icon} ${c.title}`, by + 48, 36, '#fff');
  // rounds played, with stars
  let y = by + 130;
  if (c.rounds.length) {
    text('Bạn đã cùng ba chị em:', y, 30, '#6b4a5a', 700); y += 46;
    for (const r of c.rounds) { text(`${['🌸 Đào', '🌼 Mai', '💠 Lan'][r.girl]} · ${r.title}  ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`, y, 29, '#3b2a3a', 700); y += 42; }
  } else { text('Cảm ơn bạn đã cổ vũ hết mình!', y, 32, '#6b4a5a', 700); y += 50; }
  y += 16; text(`${c.rankIcon} ${c.shop} — ${c.rank}`, y, 28, '#d9628f'); y += 44; text(`${c.total} điểm`, y, 40, '#3b2a3a');
  // the wish, wrapped
  g.font = `italic 600 28px ${F}`; g.fillStyle = '#6b4a5a';
  const words = c.wish.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 160) { lines.push(line); line = w; } else line = t; }
  // the wish sits between the score and the footer, never over the footer
  lines.push(line); y = Math.min(Math.max(y + 64, 880 - lines.length * 38), H - 100 - lines.length * 38);
  for (const l of lines) { g.fillText(l, W / 2, y); y += 38; }
  text(`💐 ${c.shop} · ${c.date}`, H - 58, 26, '#9a5b3c', 700);
  return cv.toDataURL('image/png');
}
