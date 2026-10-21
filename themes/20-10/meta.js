// Tiệm Hoa 20/10 — the light part of the theme, shared by the big screen (theme.js), the LAN phone controller
// (pad.html) and online play: names, the three roles, and each round's phone buttons. No sprites here, so phones load fast.
export const INFO = {
  id: '20-10', name: 'Tiệm Hoa 20/10', shopName: 'Tiệm Hoa Ba Chị Em',
  cardName: 'Thiệp 20/10', cardFile: 'thiep-20-10', teamExample: 'Hoa Hướng Dương', joinIcon: '🌸',
};
// c / cd: button colour and its shade (phones, lobby) · ink: the name colour on cards · desc: what the role is when no round is picked
export const ROLES = [
  { name: 'Đào', desc: 'Sơn đỏ', icon: '🌸', c: '#ff7aa2', cd: '#d9507e', ink: '#e0507e' },
  { name: 'Mai', desc: 'Sơn vàng', icon: '🌼', c: '#ffcf3a', cd: '#d79a1e', ink: '#e0a92a' },
  { name: 'Lan', desc: 'Sơn xanh dương', icon: '💠', c: '#4aa3ff', cd: '#2f72c9', ink: '#3f86cf' },
];
// per round: what each role does (shown when picking) and its buttons (k = key code the big screen reads)
export const CONTROLS = {
  garden: { title: 'Vòng 1 · Trồng cây', roles: [
    { d: 'Đưa khung lên / xuống', col: 1, b: [{ k: 'ArrowUp', l: '▲', s: 'Khung lên' }, { k: 'ArrowDown', l: '▼', s: 'Khung xuống' }] },
    { d: 'Đưa khung trái / phải', b: [{ k: 'ArrowLeft', l: '◀', s: 'Khung trái' }, { k: 'ArrowRight', l: '▶', s: 'Khung phải' }] },
    { d: 'Chọn dụng cụ: tưới · bắt sâu · tỉa', col: 1, b: [{ k: 'Digit1', l: '💧', s: 'Tưới nước' }, { k: 'Digit2', l: '🐛', s: 'Bắt sâu' }, { k: 'Digit3', l: '✂️', s: 'Cắt tỉa' }] }] },
  drive: { title: 'Vòng 2 · Chở cây', roles: [
    { d: 'Lái sang trái', b: [{ k: 'ArrowLeft', l: '◀', s: 'Giữ để lái trái' }] },
    { d: 'Lái sang phải', b: [{ k: 'ArrowRight', l: '▶', s: 'Giữ để lái phải' }] },
    { d: 'Giữ phanh · dừng đèn đỏ, giao hoa, qua đường hẹp (xe tự chạy)', b: [{ k: 'ArrowDown', l: '▼', s: 'Giữ để phanh' }] }] },
  shop: { title: 'Vòng 3 · Ngày khai trương', roles: [
    { d: 'Cắm hoa đúng màu theo đơn', col: 1, b: [{ k: 'Digit1', l: '🌹', s: 'Hoa hồng' }, { k: 'Digit2', l: '🌻', s: 'Hướng dương' }, { k: 'Digit3', l: '💠', s: 'Cẩm tú cầu' }] },
    { d: 'Thêm đúng món đơn cần: gói giấy · thiệp · nơ', col: 1, b: [{ k: 'KeyQ', l: '🎁', s: 'Gói giấy' }, { k: 'KeyW', l: '💌', s: 'Thiệp' }, { k: 'KeyE', l: '🎀', s: 'Nơ' }] },
    { d: 'Chuyển đơn: khách → bàn Đào → bàn Mai → trả khách', col: 1, b: [{ k: 'ArrowUp', l: '📝', s: 'Nhận đơn → Đào' }, { k: 'ArrowRight', l: '➡️', s: 'Đào → Mai' }, { k: 'ArrowDown', l: '💐', s: 'Trả hoa cho khách' }] }] },
};
