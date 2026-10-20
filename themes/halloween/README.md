# Đêm Halloween

Chủ đề thứ hai của [Lễ Hội Pixel](../../README.md). Ba bạn nhỏ hoá trang **Bí** (bí ngô, màu cam) · **Dơi** (màu tím) · **Mèo** (mèo đen, màu xanh) qua một đêm Halloween gồm 3 vòng, rồi xem tổng kết và nhận thiệp Halloween trên điện thoại.

Mở bằng `/?theme=halloween`, hoặc bấm **🎭 Chủ đề khác** ở màn hình chính. Cách chạy game, tay cầm điện thoại và chơi online: xem [README chung](../../README.md).

## Ba vòng

| Vòng | Cách chơi | Bí | Dơi | Mèo |
|---|---|---|---|---|
| 1 · Vườn bí ngô (60s) | Khuôn **lưới chăm sóc** ([grid-care](../../mechanics/grid-care.js)), cùng luật với vòng Trồng cây của 20/10 | `W/S` hoặc `↑/↓`: đưa khung lên/xuống | `A/D` hoặc `←/→`: đưa khung trái/phải | `1` 🔥 thắp nến · `2` 🧹 quét mạng nhện · `3` 🔔 rung chuông đuổi dơi |
| 2 · Soi đèn đuổi ma (60s) | **Cách chơi mới**: khuôn **soi đèn** ([beam-guard](../../mechanics/beam-guard.js)) | `A` / `D`: xoay đèn cam | `←` / `→`: xoay đèn tím | `J` / `L`: xoay đèn xanh |
| 3 · Tiệm thuốc phù thủy (75s) | Khuôn **dây chuyền** ([assembly-line](../../mechanics/assembly-line.js)), cùng luật với vòng Ngày khai trương của 20/10 | `1` 🍄 nấm độc · `2` 🌿 rêu ma · `3` 🦇 cánh dơi | `Q` 🍾 nút chai · `W` 🏷️ nhãn · `E` ✨ bụi phép (chỉ những món đơn cần) | `↑` nhận đơn → bàn Bí · `→` bàn Bí → bàn Dơi · `↓` trao thuốc |

### Vòng 2 · Soi đèn đuổi ma

Ba bạn đứng giữa nghĩa địa tối om, mỗi bạn cầm một đèn pin. Ma bay tới từ bóng tối, mắt ma sáng theo màu:
- **Ma nhỏ** mang màu của một bạn: chỉ **đèn cùng màu** mới đuổi được (giữ đèn trên ma tới khi vòng sáng quanh ma đầy). +10 điểm.
- **Ma to** (trắng) cần **2 đèn** chiếu cùng lúc; số đèn đang chiếu hiện trên đầu ma. +25 điểm.
- **Vua bí ngô** 👑 cần **cả 3 đèn**. +50 điểm. Xuất hiện vào giây 32 (Dễ), 24 và 46 (Thường), 20, 36 và 50 (Thử thách).
- Đèn nào chiếu vào ma cũng làm ma **đi chậm lại**, nên một bạn có thể giữ chân ma của bạn khác trong lúc bạn ấy xoay đèn tới.
- Ma chạm tới các bạn là bị **hù**: −10 điểm.

Điện thoại rung khi ma màu của mình tới gần, và rung cả đội khi ma to hay vua bí ngô tới gần.

| Độ khó | Ma bay | Ma mới mỗi | Độ rộng đèn | Ma to | Vua bí ngô |
|---|---|---|---|---|---|
| 🌼 Dễ | 17 px/giây | 2,6 → 1,9 giây | 30° | 20% | 1 lần |
| 🌷 Thường | 21 px/giây | 2,3 → 1,6 giây | 26° | 28% | 2 lần |
| 🔥 Thử thách | 25 px/giây | 2,0 → 1,3 giây | 22° | 33% | 3 lần |

Thông số ở bảng `TUNE` đầu [mechanics/beam-guard.js](../../mechanics/beam-guard.js); điểm từng loại ma ở `KINDS`, điểm trừ khi bị hù ở `SCARE`.

**Điểm vòng = điểm thô ÷ 2,4 (Dễ) / 3,3 (Thường) / 4,4 (Thử thách)**, đo bằng bot nhắm đèn chạy trong chính game (`aimKeys()` của khuôn):

| Bot | Dễ | Thường | Thử thách |
|---|---|---|---|
| Đội giỏi (nhắm ngay, không bỏ lỡ) | 330 → 138 | 470 → 142 | 660 → 150 |
| Đội khá (0,35 giây mới nhìn lại, bỏ lỡ 15%) | 290 → 121 | 280 → 85 | 445 → 101 |
| Đội lóng ngóng (0,7 giây, bỏ lỡ 35%) | 115 → 48 | 55 → 17 | 25 → 6 |

Vòng này phân hoá rõ hơn các vòng khác: đội phối hợp kém bị ma hù liên tục. Đội mới chơi nên chọn mức Dễ.

## Điểm và xếp hạng

Mỗi vòng vẫn lấy 100 làm chuẩn, phần vượt chuẩn tính một nửa, nhân hệ số độ khó như 20/10. Xếp hạng theo tổng 3 vòng (mốc của 20/10 quy về 3 vòng): ≥375 Thần thoại · ≥330 Huyền thoại · ≥276 Nổi tiếng · ≥216 Gan dạ · còn lại Tập sự. Mốc ở `RANKS` trong [scenes/final.js](scenes/final.js).

## Tập tin

- `theme.js`: khai báo chủ đề, 3 vòng, nhạc rùng rợn (giọng La thứ, tự soạn).
- `meta.js`: tên, 3 vai, nút điện thoại từng vòng.
- `sprites.js`, `world.js`: toàn bộ pixel art vẽ bằng code (nhân vật hoá trang, bí ngô, ma, quái vật, tiệm thuốc, cảnh đêm).
- `scenes/`: màn chính, 3 bộ áo cho 3 khuôn luật, màn tổng kết.
- `card.js`: thiệp Halloween cuối ván.
