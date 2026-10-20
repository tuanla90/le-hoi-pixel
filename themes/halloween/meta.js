// Đêm Halloween — the light part of the theme, shared by the big screen (theme.js), the LAN phone controller
// (pad.html) and online play: names, the three roles, and each round's phone buttons. No sprites here, so phones load fast.
export const INFO = {
  id: 'halloween', name: 'Đêm Halloween', shopName: 'Hội Ma Nhí',
  cardName: 'Thiệp Halloween', cardFile: 'thiep-halloween', teamExample: 'Bí Ngô Láu Lỉnh', joinIcon: '🎃',
};
// three kids in costume; each owns one torch colour in the ghost round
// c / cd: button colour and its shade (phones, lobby, beams) · ink: the name colour on cards · desc: shown before a round is picked
export const ROLES = [
  { name: 'Bí', desc: 'Đèn cam', icon: '🎃', c: '#ff9a3c', cd: '#d0722b', ink: '#e07a1f' },
  { name: 'Dơi', desc: 'Đèn tím', icon: '🦇', c: '#b58cff', cd: '#7e5bc2', ink: '#7e5bc2' },
  { name: 'Mèo', desc: 'Đèn xanh', icon: '🐱', c: '#5fd38a', cd: '#2f9a5a', ink: '#2f9a5a' },
];
// per round: what each role does (shown when picking) and its buttons (k = key code the big screen reads)
const turn = (l, r, what) => ({ d: `Xoay đèn ${what} — đuổi ma ${what} (ma to cần 2 đèn, vua ma cần cả 3)`, b: [{ k: l, l: '◀', s: 'Xoay trái' }, { k: r, l: '▶', s: 'Xoay phải' }] });
export const CONTROLS = {
  pumpkin: { title: 'Vòng 1 · Vườn bí ngô', roles: [
    { d: 'Đưa khung lên / xuống', col: 1, b: [{ k: 'ArrowUp', l: '▲', s: 'Khung lên' }, { k: 'ArrowDown', l: '▼', s: 'Khung xuống' }] },
    { d: 'Đưa khung trái / phải', b: [{ k: 'ArrowLeft', l: '◀', s: 'Khung trái' }, { k: 'ArrowRight', l: '▶', s: 'Khung phải' }] },
    { d: 'Chọn dụng cụ: thắp nến · quét mạng nhện · rung chuông đuổi dơi', col: 1, b: [{ k: 'Digit1', l: '🔥', s: 'Thắp nến' }, { k: 'Digit2', l: '🧹', s: 'Quét mạng nhện' }, { k: 'Digit3', l: '🔔', s: 'Đuổi dơi' }] }] },
  ghosts: { title: 'Vòng 2 · Soi đèn đuổi ma', roles: [turn('KeyA', 'KeyD', 'cam'), turn('ArrowLeft', 'ArrowRight', 'tím'), turn('KeyJ', 'KeyL', 'xanh')] },
  potion: { title: 'Vòng 3 · Tiệm thuốc phù thủy', roles: [
    { d: 'Bỏ đúng nguyên liệu theo đơn', col: 1, b: [{ k: 'Digit1', l: '🍄', s: 'Nấm độc' }, { k: 'Digit2', l: '🌿', s: 'Rêu ma' }, { k: 'Digit3', l: '🦇', s: 'Cánh dơi' }] },
    { d: 'Hoàn thiện đúng món đơn cần: nút chai · nhãn · bụi phép', col: 1, b: [{ k: 'KeyQ', l: '🍾', s: 'Nút chai' }, { k: 'KeyW', l: '🏷️', s: 'Dán nhãn' }, { k: 'KeyE', l: '✨', s: 'Bụi phép' }] },
    { d: 'Chuyển đơn: khách → bàn Bí → bàn Dơi → trao khách', col: 1, b: [{ k: 'ArrowUp', l: '📜', s: 'Nhận đơn → Bí' }, { k: 'ArrowRight', l: '➡️', s: 'Bí → Dơi' }, { k: 'ArrowDown', l: '🧪', s: 'Trao thuốc' }] }] },
};
