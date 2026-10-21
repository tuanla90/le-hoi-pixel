// Tiệm Hoa 8/3 — the light part of the theme, shared by the big screen (theme.js), the LAN phone controller
// (pad.html) and online play. Same three sisters as Tiệm Hoa 20/10 (their roles come from there); three rounds of its own.
export { ROLES } from '../20-10/meta.js';
export const INFO = {
  id: '8-3', name: 'Tiệm Hoa 8/3', shopName: 'Tiệm Hoa Ba Chị Em',
  cardName: 'Thiệp 8/3', cardFile: 'thiep-8-3', teamExample: 'Hoa Tulip', joinIcon: '🌷',
};
// per round: what each role does (shown when picking) and its buttons (k = key code the big screen reads)
export const CONTROLS = {
  carry: { title: 'Vòng 1 · Bê chậu lan', roles: [
    { d: 'Dẫn nhóm lên / xuống', col: 1, b: [{ k: 'ArrowUp', l: '▲', s: 'Đi lên' }, { k: 'ArrowDown', l: '▼', s: 'Đi xuống' }] },
    { d: 'Dẫn nhóm trái / phải', b: [{ k: 'ArrowLeft', l: '◀', s: 'Sang trái' }, { k: 'ArrowRight', l: '▶', s: 'Sang phải' }] },
    { d: 'Giữ chậu thăng bằng', b: [{ k: 'KeyQ', l: '↶', s: 'Kéo về trái' }, { k: 'KeyE', l: '↷', s: 'Kéo về phải' }] }] },
  sign: { title: 'Vòng 2 · Vẽ thiệp 8/3', roles: [
    { d: 'Sơn màu ĐỎ lên thiệp theo nhạc', b: [{ k: 'KeyJ', l: '🖌️', s: 'Sơn ĐỎ' }] },
    { d: 'Sơn màu VÀNG lên thiệp theo nhạc', b: [{ k: 'KeyK', l: '🖌️', s: 'Sơn VÀNG' }] },
    { d: 'Sơn màu XANH DƯƠNG lên thiệp theo nhạc', b: [{ k: 'KeyL', l: '🖌️', s: 'Sơn XANH DƯƠNG' }] }] },
  gifts: { title: 'Vòng 3 · Tháp quà 8/3', roles: [
    { d: 'Đẩy móc cẩu trái / phải (đẩy êm tay cho hộp bớt đung đưa)', b: [{ k: 'ArrowLeft', l: '◀', s: 'Đẩy sang trái' }, { k: 'ArrowRight', l: '▶', s: 'Đẩy sang phải' }] },
    { d: 'Thả hộp quà đúng lúc nó nằm ngay trên đỉnh tháp', b: [{ k: 'ArrowDown', l: '🎁', s: 'Thả hộp' }] },
    { d: 'Giữ tháp quà thăng bằng', b: [{ k: 'KeyQ', l: '↶', s: 'Đỡ về trái' }, { k: 'KeyE', l: '↷', s: 'Đỡ về phải' }] }] },
};
