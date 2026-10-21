# Tiệm Hoa 8/3

Chủ đề thứ ba của [Lễ Hội Pixel](../../README.md). Vẫn là ba chị em **Đào · Mai · Lan** của [Tiệm Hoa 20/10](../20-10/README.md), giờ lo mùa quà 8/3 ở tiệm qua 3 vòng: bê chậu lan khách đặt lên xe, vẽ tấm thiệp 8/3 khổng lồ dán cửa kính, và xếp tháp quà 8/3 trưng ở cửa sổ. Cuối ván mỗi điện thoại nhận một tấm thiệp 8/3.

Mở bằng `/?theme=8-3`, hoặc bấm **🎭 Chủ đề khác** ở màn hình chính. Cách chạy game, tay cầm điện thoại và chơi online: xem [README chung](../../README.md).

Chủ đề này mượn của 20/10: nhân vật và hình vẽ ([sprites.js](../20-10/sprites.js)), màn chính, màn tổng kết và mẫu thiệp (đọc logo, lời chúc, chữ to "8 / 3" từ `look` trong [theme.js](theme.js)), mốc xếp hạng `FLOWER_RANKS`. Vòng 1 và 2 trước đây là vòng 2 và 4 của 20/10.

## Điều khiển

| Vòng | Đào | Mai | Lan |
|---|---|---|---|
| 1 · Bê chậu lan (≤ 2 phút) | `↑/↓`: dẫn nhóm | `←/→`: dẫn nhóm | `Q/E`: giữ chậu thăng bằng |
| 2 · Vẽ thiệp 8/3 (~50s) | `J` / `A`: sơn **đỏ** | `K` / `S`: sơn **vàng** | `L` / `D`: sơn **xanh dương** |
| 3 · Tháp quà 8/3 (60s) | `←/→` hoặc `A/D`: đẩy móc cẩu | `↓` hoặc `S`: thả hộp | `Q/E`: giữ tháp thăng bằng |

## Vòng 3 · Tháp quà 8/3 (thể loại mới: xếp chồng)

Khuôn [mechanics/stack-tower.js](../../mechanics/stack-tower.js), bộ áo [scenes/gifts.js](scenes/gifts.js).
- Móc cẩu chạy trên thanh ray, **tự ra kệ hai bên lấy hộp quà**. Hộp treo trên móc và **đung đưa** mỗi khi móc chạy rồi dừng.
- **Đào** đẩy móc về ngay trên đỉnh tháp; đẩy êm tay thì hộp bớt lắc. Vạch chấm chỉ chỗ hộp sẽ rơi, chuyển xanh khi hộp đang ngay giữa.
- **Mai** thả hộp. Mỗi hộp nằm lại trên tháp +10; **trúng giữa** (lệch tối đa 5 / 4 / 3 px) được thêm +5 nhân với combo liên tiếp, tối đa +15. Lệch quá thì hộp trượt rơi.
- **Lan** giữ tháp: hộp đặt lệch kéo tháp nghiêng về phía đó, khối hộp lệch tâm làm tháp nghiêng dần, tháp càng cao càng dễ nghiêng. Thước thăng bằng hiện cạnh đỉnh tháp; nghiêng quá là **đổ 3 hộp trên cùng** (−6 mỗi hộp).

**Điểm vòng = điểm thô ÷ 2,8 (Dễ) / 2,0 (Thường) / 1,25 (Thử thách)**, đo bằng bot (60 giây, mỗi bot nhìn lại sau một khoảng thời gian rồi nhấp phím vừa đủ quãng cần đi):

| Bot | Dễ | Thường | Thử thách |
|---|---|---|---|
| Chỉ thả khi trúng giữa | 410 (17 hộp) → 146 | 260 (11 hộp) → 130 | 160 (7 hộp) → 128 |
| Đội giỏi (0,15 giây, lệch ≤ 6 px là thả) | 350 (18 hộp) → 125 | 250 (16 hộp) → 125 | 130 (12 hộp) → 104 |
| Đội khá (0,35 giây, bỏ lỡ 15%, lệch ≤ 9 px) | 245 (17 hộp) → 88 | 225 (17 hộp) → 112 | 160 (14 hộp) → 128 |
| Đội mới (0,6 giây, bỏ lỡ 30%, lệch ≤ 14 px) | 220 (15 hộp) → 79 | 175 (15 hộp) → 88 | 122 (10 hộp) → 98 |

Chưa thử với người thật: nên cho một nhóm chơi thử trước khi dùng ở sự kiện.

## Ghi chú cách tính điểm từng vòng

| Vòng | Càng… càng tốt | Điểm thưởng / phạt |
|---|---|---|
| 1 · Bê chậu lan | về đích **sớm**, ít đổ chậu | Về đúng mốc 44 / 40 / 37 giây được 100; sớm hơn mỗi giây +1 / +2 / +3. **18 bông hoa** dọc đường, mỗi bông +1,5 / +1,5 / +2. Đổ chậu −3 / −4 / −5 và mất 1,2 giây hốt đất |
| 2 · Vẽ thiệp 8/3 | vẽ **nhiều** hoa đúng nhịp | 1 điểm mỗi bông (71 bông ở Dễ, 84 ở Thường/Thử thách). Mốc combo chung +3 ở 5, 15, 25…; +6 / +6 / +7 ở 10, 20, 30… Bấm sai màu luôn mất combo; ở Thường và Thử thách bị trừ thêm 0,5 điểm, nên bấm bừa mọi bông mà không nhìn màu chỉ được khoảng 15 điểm |
| 3 · Tháp quà 8/3 | xếp **nhiều** hộp, thả **trúng giữa** liên tiếp, không để tháp đổ | Xem mục trên |

Độ khó, hệ số và xếp hạng giống 20/10: mỗi vòng 100 là chuẩn, phần vượt tính một nửa, nhân hệ số ×0.9 / ×1.0 / ×1.1; xếp hạng theo tổng 3 vòng ≥375 · ≥330 · ≥276 · ≥216.

## Bảng chốt điểm (đo bằng bot, mức Thường)

| Vòng | Đội mới | Đội khá | Đội giỏi |
|---|---|---|---|
| 1 · Bê chậu lan | 101–108 → ~102 | 121 → 111 | 138 → 119 |
| 2 · Vẽ thiệp 8/3 | 81 (mỗi người trúng 80%) | 111 → 106 | 137 → 118 |
| 3 · Tháp quà 8/3 | 175 → 88 | 225 → 112 | 250 → 125 |

## Khác với GDD

- **Bê chậu lan** (vòng Bê cây của bản 20/10 gốc): Đào dẫn lên/xuống, Mai dẫn trái/phải, Lan chỉ giữ chậu thăng bằng bằng `Q`/`E`. Chậu luôn chao đảo, và mọi chướng ngại (va hàng rào, cún xô, vòi tưới xoay, vũng nước, cầu treo lắc, đá trơn, bùn) đều làm chậu nghiêng. Nghiêng quá thì đổ chậu: nhóm tự hốt đất mất 1,2 giây và bị trừ điểm. Đường đi qua hai cầu treo (đi dọc) và một khe đá (đi ngang). Đích đến là phía sau xe giao hàng.
- **Vẽ thiệp 8/3** (vòng Làm biển hiệu của bản 20/10 gốc): trò nhịp điệu **vẽ hoa lên tấm thiệp 8/3 khổng lồ**, chỉ bấm nút và mỗi người một màu sơn. Hoa rơi theo một dòng xuống bảng pha màu. Hoa màu pha phải nhiều người bấm cùng lúc (Cam = Đỏ+Vàng, Xanh lá = Vàng+Xanh dương, Tím = Đỏ+Xanh dương, Cầu vồng = cả ba). Vòng hoa dài phải giữ phím, tới chỗ đổi màu thì chuyền cho người khác. Combo tính chung cả đội.

## Chỉnh cân bằng nhanh

- Vòng 1: luật nằm ở khuôn [mechanics/carry-balance.js](../../mechanics/carry-balance.js): `TUNE` (mốc `par`, tốc độ, cún `chase`, độ chao `tip/damp/fix/gust`, điểm phạt `drop`, bề rộng cầu treo `bridge` và khe đá `stones`, điểm hoa `flower` và điểm về sớm `fast`), `MAX_TIME`, `DROP_TIME`. Màn chơi nằm ở [carry.js](scenes/carry.js): bản đồ `buildMap()`, đường đi `ROUTE`, vùng đất xấu `gates`, vùng gió `windy`, cây, vòi tưới, hoa, đường tuần của cún.
- Vòng 2: luật nằm ở khuôn [mechanics/rhythm-color.js](../../mechanics/rhythm-color.js): bản nhạc nốt trong `buildChart()`, nhịp `BPM`, tốc độ rơi `SPEED`, cửa sổ chấm và điểm phạt `WIN/PERFECT/SYNC/WRONG` (đặt theo độ khó trong `init()`), nhạc nền trong `music()`. Tên màu sơn, chữ, hình hoa và tấm thiệp nằm ở [sign.js](scenes/sign.js).
- Vòng 3: luật nằm ở khuôn [mechanics/stack-tower.js](../../mechanics/stack-tower.js): `TUNE` (tốc độ móc `trolley`, độ đung đưa `swing/damp`, bề rộng hộp `w`, ngưỡng trúng giữa `perfect`, ngưỡng trượt `slide`, độ nghiêng `torque/com/tip/tipH`, lực đỡ `fix/ldamp`, quy đổi `div`), điểm `PTS/BONUS/BONUS_MAX/LOSS`, `DURATION`. Màu hộp, chữ và hình (tiệm, móc cẩu, hộp quà, bàn trưng bày) nằm ở [gifts.js](scenes/gifts.js).
- Thiệp và màn tổng kết: lời chúc, danh hiệu, chữ to "8 / 3" ở `look.finale` trong [theme.js](theme.js).
