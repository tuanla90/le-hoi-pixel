# Tiệm Hoa 20/10

Chủ đề đầu tiên của [Lễ Hội Pixel](../../README.md). Bản dựng thử từ `GDD-Game-20-10.md`: một người chơi điều khiển cả ba vai **Đào · Mai · Lan** qua 5 vòng — trồng cây, bê cây, chở cây, làm biển hiệu và bán hàng ngày khai trương — rồi xem tổng kết và nhận thiệp 20/10.

Cách chạy game, tay cầm điện thoại và chơi online: xem [README chung](../../README.md).

## Điều khiển

| Vòng | Đào | Mai | Lan |
|---|---|---|---|
| 1 · Trồng cây (60s) | `W/S` hoặc `↑/↓`: đưa khung lên/xuống | `A/D` hoặc `←/→`: đưa khung trái/phải | `1` tưới · `2` bắt sâu · `3` tỉa |
| 2 · Bê cây (≤ 2 phút) | `↑/↓`: dẫn nhóm | `←/→`: dẫn nhóm | `Q/E`: giữ chậu thăng bằng |
| 3 · Chở cây (≤ 2:05) | `A` / `←`: lái trái | `D` / `→`: lái phải | Xe tự chạy · giữ `S` / `↓` / `Space`: phanh (đèn đỏ, giao hoa, đường hẹp) |
| 4 · Làm biển hiệu (~50s) | `J` / `A`: sơn **đỏ** | `K` / `S`: sơn **vàng** | `L` / `D`: sơn **xanh dương** |
| 5 · Ngày khai trương (75s) | `1` hồng · `2` hướng dương · `3` cẩm tú cầu: cắm hoa theo đơn | `Q` 🎁 gói giấy · `W` 💌 thiệp · `E` 🎀 nơ: chỉ thêm những món đơn cần | Chuyển đơn: `↑` nhận đơn → bàn Đào · `→` bàn Đào → bàn Mai · `↓` trả hoa cho khách |

`Esc`: tạm dừng · `M` (ở menu): bật/tắt âm thanh · `N` (ở menu và thẻ giới thiệu): đặt tên đội. Trên thẻ giới thiệu mỗi vòng: `H` đổi độ khó (Dễ → Thường → Thử thách) · `V` xem demo · `Space` bắt đầu.

## Demo hướng dẫn (khoảng 30 giây mỗi vòng)

Bấm **▶ Xem demo** (hoặc `V`) trên thẻ giới thiệu của vòng. Bot tự chơi bằng chính game, chạy chậm (×0.6; vòng 4 ×0.75; vòng 5 ×0.7):
- **Trên màn hình:** phụ đề giải thích từng bước, kèm vòng sáng soi vào chỗ cần nhìn (cây đang kêu cứu, khung chọn, thước thăng bằng, chướng ngại, bông hoa sắp rơi tới…).
- **Dưới màn hình:** bàn phím ảo của Đào · Mai · Lan, phím sáng lên đúng lúc người đó bấm.

`Space`/`Esc` để bỏ qua. Vòng 4 dùng một bản nhạc nốt rút gọn (màu đơn → màu pha → vòng hoa → chuyền cọ → cầu vồng). Demo là bản chạy thật trong game, không phải file video, nên luôn khớp luật khi chỉnh game. Mỗi cảnh định nghĩa demo bằng `demoKeys`, `demoStep()` (bot) và `demoScript` (phụ đề + vòng sáng).

## Độ khó và cách tính điểm

**Mỗi vòng chọn độ khó riêng** ngay trên thẻ giới thiệu (mặc định **Thường**, lựa chọn được nhớ theo từng vòng). Dưới thanh chọn có một dòng nói rõ mức đang chọn khác gì ở vòng đó; dòng này được ghép từ chính bảng thông số trong code nên luôn khớp luật.

| Độ khó | Hệ số | Khác biệt chính |
|---|---|---|
| 🌼 Dễ | ×0.9 | Cây chờ 9,5 giây, ít cây kêu cùng lúc · chậu nghiêng chậm, cầu treo 4 ô · đường rộng, ít chướng ngại, ổ gà không làm rơi chậu · nhạc 100 BPM, cửa sổ chấm rộng, không nốt nhanh, bấm sai màu chỉ mất combo · khách thưa, chờ 38 giây, bó 2 cành, ít món gói kèm |
| 🌷 Thường | ×1.0 | Cây chờ 8,2 giây · chậu nghiêng vừa, cầu treo 3 ô, khe đá 3 ô · đường hơi rộng · nhạc 106 BPM, có nốt nhanh, giữ chấm gợi ý màu, bấm sai màu −0,5 · khách chờ 34 giây, bó 2–3 cành |
| 🔥 Thử thách | ×1.1 | Cây chờ 7,8 giây, nhiều cây kêu cùng lúc · chậu nghiêng nhanh, gió mạnh, khe đá 2 ô · đường hẹp, chướng ngại dày · nhạc 112 BPM, bỏ gợi ý màu ở đoạn cuối · khách dày, chờ 28 giây, bó 2–4 cành, nhiều món gói kèm |

**Điểm vòng:** 100 là mốc chuẩn. Phần vượt 100 **chỉ tính một nửa** (`softCap` trong [core/main.js](../../core/main.js)): thô 140 → 120. Thẻ kết quả ghi rõ dòng quy đổi. Nhờ vậy không vòng nào kéo tổng điểm đi quá xa.

**Điểm cuối = Σ (điểm vòng × hệ số của vòng đó)**, mỗi vòng làm tròn. Hệ số chỉ chênh ±10% nên đội mới chơi được điểm gần như nhau ở cả ba mức, còn Thử thách chỉ có lợi rõ khi đội chơi giỏi. Xếp hạng (tổng 5 vòng): ≥625 Thần thoại · ≥550 Huyền thoại · ≥460 Nổi tiếng · ≥360 Dễ thương · còn lại Mới mở. Kỷ lục tổng dùng chung; kỷ lục từng vòng lưu riêng theo độ khó. Hệ số sửa ở `DIFF_MULT`, tỷ lệ tính phần vượt chuẩn ở `OVERPAR` trong [core/main.js](../../core/main.js); mốc hạng ở `RANKS` trong [final.js](scenes/final.js).

## Ghi chú cách tính điểm từng vòng

| Vòng | Càng… càng tốt | Điểm thưởng / phạt |
|---|---|---|
| 1 · Trồng cây | chăm **nhiều** cây (60 giây) | Mỗi lần chăm 10 điểm vườn (+5 nếu cây đã lớn hết cỡ). **Combo cùng dụng cụ** +5, +10, +15, tối đa +20 mỗi lần. Dùng sai dụng cụ, hoặc bấm nhiều dụng cụ cùng lúc, thì khựng lại và mất combo. Điểm vườn chia 5 / 5,5 / 6 ra điểm vòng |
| 2 · Bê cây | về đích **sớm**, ít đổ chậu | Về đúng mốc 44 / 40 / 37 giây được 100; sớm hơn mỗi giây +1 / +2 / +3. **18 bông hoa** dọc đường, mỗi bông +1,5 / +1,5 / +2. Đổ chậu −3 / −4 / −5 và mất 1,2 giây hốt đất |
| 3 · Chở cây | về đích **sớm**, giao nhiều hoa, ít va chạm | **Xe tự chạy**, Lan giữ phanh khi cần. Đường cong dần về cuối (Dễ nhẹ, Thử thách gắt). **Đoạn đường hẹp** hình phễu: 1 / 2 / 3 đoạn, có biển báo trước và đồng hồ góc trái; giữa đoạn hẹp có 3 sao; ở Thử thách hai mép là cọc tiêu, đụng là rơi chậu. Về đúng mốc 78 / 66 / 64 giây được 70 điểm thời gian; sớm hơn mỗi giây +1 / +2 / +3. **5 khách**: lái sát lề, phanh dưới 25 km/h qua ô GIAO → +8 / +10 / +12 mỗi chậu (chậu mang về tiệm +4). **5 cột đèn** (xanh 5 giây, vàng 1,5, đỏ 5): khi sắp tới một cột đèn sẽ đỏ lúc xe tới nơi, giữa màn hình hiện băng đỏ nhấp nháy **“🚦 SẮP ĐẾN ĐÈN ĐỎ — LAN PHANH!”** kèm khoảng cách và tiếng bíp; vượt đèn đỏ bị chú công an **giữ xe 5 giây** (đứng chờ thật, có đếm ngược trên đầu xe; đồng hồ không bị cộng thêm). Sao +1,5 / +1,5 / +2. Mỗi lần va chạm −0 / −1 / −3 |
| 4 · Làm biển hiệu | vẽ **nhiều** hoa đúng nhịp | 1 điểm mỗi bông (71 bông ở Dễ, 84 ở Thường/Thử thách). Mốc combo chung +3 ở 5, 15, 25…; +6 / +6 / +7 ở 10, 20, 30… Bấm sai màu luôn mất combo; ở Thường và Thử thách bị trừ thêm 0,5 điểm, nên bấm bừa mọi bông mà không nhìn màu chỉ được khoảng 15 điểm |
| 5 · Ngày khai trương | giao **nhiều** bó hoa, khách chờ ít, **không bấm bừa** (bấm bừa thì khựng tay) | Mỗi vai 3 nút. Lan là người chuyển đơn: ↑ nhận đơn của khách sắp hết kiên nhẫn nhất (mũi tên xanh) đưa sang bàn Đào → Đào cắm đúng màu hoa → Lan → chuyển bó hoa sang bàn Mai (bó đã cắm xong chờ ở cuối bàn Đào, có mũi tên nhấp nháy) → Mai thêm **đúng những món đơn cần** trong ba món gói giấy, thiệp, nơ (đơn nào cũng có ít nhất một món, bấm thứ tự nào cũng được) → Lan ↓ trả hoa. Bảng treo tối đa 3 đơn. Mỗi bó 10 điểm tiệm + tiền boa tới 5. **Bấm sai hoặc bấm vô ích chỉ bị phạt thời gian, không trừ điểm:** người đó khựng tay 1 / 1,5 / 2 giây (Dễ / Thường / Thử thách) khi cắm nhầm màu, thêm món thừa, thêm món đã có, bấm lúc bàn mình chưa có việc, hoặc bấm nhiều nút cùng lúc; trong lúc khựng, bấm thêm không làm khựng lâu hơn. Phạt hiện rõ: chữ “Khựng 1,5s!” đỏ kèm lý do, bàn chớp đỏ, nhân vật rung với 💫 và đồng hồ đếm ngược trên đầu, HUD đếm “sai”, lần đầu có thông báo nhắc luật. Bot bấm bừa liên tục chỉ giao được 5–7 bó (khoảng 25 điểm) so với 22 bó khi chơi đúng. Khách chờ hết kiên nhẫn bỏ về −5. Khách đi từ cửa tới quầy khoảng 1 giây; lúc mở cửa đã có sẵn 2 khách bước vào. Thứ tự khách cố định nên các lần chơi so được với nhau. Điểm tiệm chia 2,2 / 2,4 / 3 ra điểm vòng |

## Bảng chốt điểm (đo bằng bot, mức Thường)

Vòng 2, 3 và 5 đo bằng bot chạy trong chính game (gọi `__step`), vòng 1 và 4 đo bằng mô phỏng chép lại luật tính điểm. Điểm ghi theo dạng **thô → tính** (sau khi tính nửa phần vượt 100). Người thật thường chậm hơn bot, nên coi đây là mức trần của từng nhóm.

| Vòng | Đội mới | Đội khá | Đội giỏi |
|---|---|---|---|
| 1 · Trồng cây | 83 (đuổi cây sắp héo: 65) | 122 → 111 | 154 → 127 |
| 2 · Bê cây | 101–108 → ~102 | 121 → 111 | 138 → 119 |
| 3 · Chở cây | 129 → 115 | 133 → 116 | 140 → 120 |
| 4 · Vẽ hoa | 81 (mỗi người trúng 80%) | 111 → 106 | 137 → 118 |
| 5 · Ngày khai trương | 110 (21 bó; đội chậm 18 bó → 95) | 135 → 117 | 137 → 118 |
| **Tổng** | **~470** | **~555** | **~600** |

Ở mức Thử thách, đội giỏi được tổng khoảng 650–700 điểm, đội mới khoảng 400–430. Ở mức Dễ, đội mới được gần bằng mức Thường nhưng đỡ áp lực hơn.

**Phân vai:** vườn hình vuông 4×4 nên Đào (lên/xuống) và Mai (trái/phải) bước khung số lần như nhau, còn Lan bấm dụng cụ một lần mỗi cây. Bản đồ vòng 2 là ba dải đường dọc nối nhau hình chữ S (xuống, lên, xuống), có các bờ rào lệch nhau để buộc nhóm đi vòng sang ngang. Bot đo được thời gian giữ phím dọc và ngang gần bằng nhau (khoảng 22 giây so với 24 giây). Ở vòng 3 xe tự chạy nên Lan không còn phải giữ ga suốt vòng: bot đo được Đào và Mai mỗi người giữ phím lái 12–31 giây (đường cong và đoạn hẹp), Lan giữ phanh 12–21 giây (trước đây Lan giữ ga khoảng 52 trên 56 giây). Ở vòng 5, mỗi bó hoa cần cả ba người, mỗi vai 3 nút; bot đo được số lần bấm Đào / Mai / Lan khoảng 46 / 39 / 48 ở mức Thường. Bot bấm bừa liên tục bị khựng gần như cả vòng.

## Điểm khác với GDD (vì chỉ có một người chơi)

- **Mỗi vòng tính trên thang 100.** Bản gốc của vòng 2–3 quy thứ hạng giữa các đội ra điểm. Ở đây chỉ có một đội nên điểm được quy theo thời gian hoàn thành; quá thời gian tối đa thì chỉ còn chút điểm theo quãng đường đã đi.
- **Vòng 2:** Đào dẫn lên/xuống, Mai dẫn trái/phải, Lan chỉ giữ chậu thăng bằng bằng `Q`/`E`. Chậu luôn chao đảo, và mọi chướng ngại (va hàng rào, cún xô, vòi tưới xoay, vũng nước, cầu treo lắc, đá trơn, bùn) đều làm chậu nghiêng. Nghiêng quá thì đổ chậu: nhóm tự hốt đất mất 1,2 giây và bị trừ điểm. Đường đi qua hai cầu treo (đi dọc) và một khe đá (đi ngang). Đích đến là phía sau xe giao hàng, nối sang vòng 3.
- **Vòng 4:** thay trò vẽ–đoán bằng trò nhịp điệu **vẽ hoa trang trí biển hiệu**, chỉ bấm nút và mỗi người một màu sơn. Hoa rơi theo một dòng xuống bảng pha màu. Hoa màu pha phải nhiều người bấm cùng lúc (Cam = Đỏ+Vàng, Xanh lá = Vàng+Xanh dương, Tím = Đỏ+Xanh dương, Cầu vồng = cả ba). Vòng hoa dài phải giữ phím, tới chỗ đổi màu thì chuyền cho người khác. Combo tính chung cả đội. Tên tiệm cố định là **Tiệm Hoa Ba Chị Em** (bỏ phần ghép tên ngẫu nhiên của GDD).
- Phần “khán giả thả emoji” được thay bằng tim/sao/nốt nhạc pixel bay lên khi chơi tốt.

## Chỉnh cân bằng nhanh

Mỗi vòng gom thông số theo độ khó vào một bảng `TUNE` ở đầu file; dòng mô tả độ khó trên thẻ giới thiệu đọc từ bảng này.

- Chung: hệ số `DIFF_MULT`, phần vượt chuẩn `OVERPAR` ([core/main.js](../../core/main.js)); mốc hạng `RANKS` ([final.js](scenes/final.js)).
- Vòng 1: `TUNE` (thời gian chờ `wait`, nhịp `gap`, số cây kêu `max/ramp`, khựng `stun`, quy đổi `div`), kích thước vườn `COLS/ROWS`, `DURATION` ([garden.js](scenes/garden.js)).
- Vòng 2: `TUNE` (mốc, tốc độ, cún, độ chao `TIP/DAMP/FIX/GUST`, điểm phạt, bề rộng cầu treo và khe đá, điểm hoa và điểm về sớm), bản đồ `buildMap()`, đường đi `ROUTE`, vùng đất xấu `GATES`, vùng gió `WINDY`, `STARS`, `SPRINKLERS` ([carry.js](scenes/carry.js)).
- Vòng 3: `TUNE` (mốc, bề rộng đường, mật độ chướng ngại, lực phanh, giao hoa, ổ gà, sao, điểm trừ va chạm, độ cong `curve`, vị trí đoạn hẹp `funnels`, độ hẹp `narrow`, cọc tiêu `cones`), độ dài phễu `F_FLAT/F_TAPER`, chu kỳ đèn `CYCLE`, `POT_PTS`, thời gian giữ xe khi vượt đèn đỏ `PULL_OVER`, `LEN`, `VMAX` ([drive.js](scenes/drive.js)).
- Vòng 5: `TUNE` (nhịp khách đến `gap/gapEnd`, sức chờ `patience`, số cành `stems`, tỷ lệ món gói kèm `extra`, khựng `stun`, quy đổi `div`), điểm `BOUQUET/TIP/LEAVE/WRONG`, số đơn treo tối đa `MAX_TICKETS`, `DURATION` ([shop.js](scenes/shop.js)).
- Rung: các lệnh `this.cue(vai, kiểu rung, …)` trong từng vòng; hàm `buzz()` ở [core/net.js](../../core/net.js). Thiệp: lời chúc và danh hiệu ở đầu [final.js](scenes/final.js), cách vẽ thiệp trong `drawCard()` của [card.js](card.js).
- Vòng 4: bản nhạc nốt trong `buildChart()`, nhịp `BPM`, tốc độ rơi `SPEED`, cửa sổ chấm và điểm phạt `WIN/PERFECT/SYNC/WRONG` (đặt theo độ khó trong `init()`) ([sign.js](scenes/sign.js)).
