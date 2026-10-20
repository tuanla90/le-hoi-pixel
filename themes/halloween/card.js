// The personal Halloween card, drawn on a canvas so it can be saved as a picture (phones in LAN play, every player online).
export function drawCard(c) {
  const W = 720, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), F = '"Baloo 2", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1b1230'); grd.addColorStop(0.55, '#2d1f45'); grd.addColorStop(1, '#43305c');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // stars, a moon, a row of little pumpkins at the bottom, and a double frame
  let seed = c.name.length * 97 + c.total; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 90; i++) { g.fillStyle = rnd() < .7 ? '#cfc4ff' : '#fffaf2'; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(rnd() * W, rnd() * H * 0.8, 3, 3); }
  g.globalAlpha = 1; g.fillStyle = '#fff4c9'; g.beginPath(); g.arc(W - 130, 150, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2d1f45'; g.beginPath(); g.arc(W - 105, 132, 58, 0, Math.PI * 2); g.fill();
  for (let x = 70; x < W - 40; x += 96) {
    g.fillStyle = '#f58a2a'; g.beginPath(); g.ellipse(x, H - 92, 30, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe066'; g.fillRect(x - 15, H - 100, 8, 8); g.fillRect(x + 7, H - 100, 8, 8); g.fillRect(x - 12, H - 84, 24, 5);
    g.fillStyle = '#2f7a3a'; g.fillRect(x - 3, H - 122, 6, 10);
  }
  g.strokeStyle = '#f58a2a'; g.lineWidth = 8; g.strokeRect(24, 24, W - 48, H - 48); g.strokeStyle = '#b58cff'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
  g.textAlign = 'center';
  const text = (t, y, size, color = '#fff6e3', weight = 800) => { g.font = `${weight} ${size}px ${F}`; g.fillStyle = color; g.fillText(t, W / 2, y); };
  text('HALLOWEEN', 170, 100, '#ff9a3c');
  text('Thiệp tặng', 240, 34, '#cfc4ff', 700);
  text(c.name, 315, 72, '#fff6e3');
  if (c.team) text(`🏷️ Đội ${c.team}`, 355, 28, '#ffe066', 700);
  const icon = ['🎃', '🦇', '🐱'][c.girl] || '👻', col = ['#e07a1f', '#7e5bc2', '#2f9a5a'][c.girl] || '#5f5c78';
  g.fillStyle = col; const bw = 520; const by = c.team ? 376 : 350; g.beginPath(); g.roundRect ? g.roundRect((W - bw) / 2, by, bw, 70, 35) : g.rect((W - bw) / 2, by, bw, 70); g.fill();
  text(`${icon} ${c.title}`, by + 48, 36, '#fff');
  // rounds played, with stars
  let y = by + 130;
  if (c.rounds.length) {
    text('Bạn đã cùng Hội Ma Nhí:', y, 30, '#cfc4ff', 700); y += 46;
    for (const r of c.rounds) { text(`${['🎃 Bí', '🦇 Dơi', '🐱 Mèo'][r.girl]} · ${r.title}  ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`, y, 29, '#fff6e3', 700); y += 42; }
  } else { text('Cảm ơn bạn đã cổ vũ hết mình!', y, 32, '#cfc4ff', 700); y += 50; }
  y += 16; text(`${c.rankIcon} ${c.rank}`, y, 30, '#ff9a3c'); y += 46; text(`${c.total} điểm`, y, 40, '#fff6e3');
  // the wish, wrapped, above the pumpkins
  g.font = `italic 600 28px ${F}`; g.fillStyle = '#e8e0ff';
  const words = c.wish.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 160) { lines.push(line); line = w; } else line = t; }
  lines.push(line); y = Math.min(Math.max(y + 60, 830 - lines.length * 38), H - 180 - lines.length * 38);
  for (const l of lines) { g.fillText(l, W / 2, y); y += 38; }
  text(`🎃 ${c.shop} · ${c.date}`, H - 50, 26, '#ffe066', 700);
  return cv.toDataURL('image/png');
}
