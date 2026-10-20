// Role buttons shared by the LAN phone controller (pad.html) and online play (js/online.js).
// Per round: what each role does and its buttons (k = the key code the game reads, l = big label, s = caption).
export const ROLES = [
  { name: 'Đào', paint: 'Sơn đỏ', icon: '🌸', c: '#ff7aa2', cd: '#d9507e' },
  { name: 'Mai', paint: 'Sơn vàng', icon: '🌼', c: '#ffcf3a', cd: '#d79a1e' },
  { name: 'Lan', paint: 'Sơn xanh dương', icon: '💠', c: '#4aa3ff', cd: '#2f72c9' },
];
// per round: what each role does (shown when picking) and its buttons (k = key code the big screen reads)
export const ROUNDS = {
  garden: { title: 'Vòng 1 · Trồng cây', roles: [
    { d: 'Đưa khung lên / xuống', col: 1, b: [{ k: 'ArrowUp', l: '▲', s: 'Khung lên' }, { k: 'ArrowDown', l: '▼', s: 'Khung xuống' }] },
    { d: 'Đưa khung trái / phải', b: [{ k: 'ArrowLeft', l: '◀', s: 'Khung trái' }, { k: 'ArrowRight', l: '▶', s: 'Khung phải' }] },
    { d: 'Chọn dụng cụ: tưới · bắt sâu · tỉa', col: 1, b: [{ k: 'Digit1', l: '💧', s: 'Tưới nước' }, { k: 'Digit2', l: '🐛', s: 'Bắt sâu' }, { k: 'Digit3', l: '✂️', s: 'Cắt tỉa' }] }] },
  carry: { title: 'Vòng 2 · Bê cây', roles: [
    { d: 'Dẫn nhóm lên / xuống', col: 1, b: [{ k: 'ArrowUp', l: '▲', s: 'Đi lên' }, { k: 'ArrowDown', l: '▼', s: 'Đi xuống' }] },
    { d: 'Dẫn nhóm trái / phải', b: [{ k: 'ArrowLeft', l: '◀', s: 'Sang trái' }, { k: 'ArrowRight', l: '▶', s: 'Sang phải' }] },
    { d: 'Giữ chậu thăng bằng', b: [{ k: 'KeyQ', l: '↶', s: 'Kéo về trái' }, { k: 'KeyE', l: '↷', s: 'Kéo về phải' }] }] },
  drive: { title: 'Vòng 3 · Chở cây', roles: [
    { d: 'Lái sang trái', b: [{ k: 'ArrowLeft', l: '◀', s: 'Giữ để lái trái' }] },
    { d: 'Lái sang phải', b: [{ k: 'ArrowRight', l: '▶', s: 'Giữ để lái phải' }] },
    { d: 'Giữ phanh · dừng đèn đỏ, giao hoa, qua đường hẹp (xe tự chạy)', b: [{ k: 'ArrowDown', l: '▼', s: 'Giữ để phanh' }] }] },
  sign: { title: 'Vòng 4 · Làm biển hiệu', roles: [
    { d: 'Sơn màu ĐỎ theo nhạc', b: [{ k: 'KeyJ', l: '🖌️', s: 'Sơn ĐỎ' }] },
    { d: 'Sơn màu VÀNG theo nhạc', b: [{ k: 'KeyK', l: '🖌️', s: 'Sơn VÀNG' }] },
    { d: 'Sơn màu XANH DƯƠNG theo nhạc', b: [{ k: 'KeyL', l: '🖌️', s: 'Sơn XANH DƯƠNG' }] }] },
  shop: { title: 'Vòng 5 · Ngày khai trương', roles: [
    { d: 'Cắm hoa đúng màu theo đơn', col: 1, b: [{ k: 'Digit1', l: '🌹', s: 'Hoa hồng' }, { k: 'Digit2', l: '🌻', s: 'Hướng dương' }, { k: 'Digit3', l: '💠', s: 'Cẩm tú cầu' }] },
    { d: 'Thêm đúng món đơn cần: gói giấy · thiệp · nơ', col: 1, b: [{ k: 'KeyQ', l: '🎁', s: 'Gói giấy' }, { k: 'KeyW', l: '💌', s: 'Thiệp' }, { k: 'KeyE', l: '🎀', s: 'Nơ' }] },
    { d: 'Chuyển đơn: khách → bàn Đào → bàn Mai → trả khách', col: 1, b: [{ k: 'ArrowUp', l: '📝', s: 'Nhận đơn → Đào' }, { k: 'ArrowRight', l: '➡️', s: 'Đào → Mai' }, { k: 'ArrowDown', l: '💐', s: 'Trả hoa cho khách' }] }] },
};
