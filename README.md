# Tiệm Hoa 20/10 — bản MVP chơi một người

Bản dựng thử từ `GDD-Game-20-10.md`: một người chơi điều khiển cả ba vai **Đào · Mai · Lan** qua 5 vòng — trồng cây, bê cây, chở cây, làm biển hiệu và bán hàng ngày khai trương — rồi xem tổng kết và nhận thiệp 20/10.

## Chạy game

**Chơi bằng điện thoại (sự kiện):** cần cài [Node.js](https://nodejs.org) (bản LTS) trên laptop quản trò.
1. Nhấp đúp `Choi-game.bat`. Một cửa sổ đen hiện địa chỉ mạng; trình duyệt tự mở `http://localhost:8020`. Lần đầu Windows hỏi tường lửa → bấm **Allow** cho mạng Private.
2. Nối laptop với máy chiếu. Trên màn hình chính bấm **📱 Kết nối điện thoại** (phím `P`) để hiện **một mã QR chung**.
3. Mỗi người: điện thoại bắt **cùng Wi‑Fi** với laptop → quét QR → nhập tên → **chọn vai Đào / Mai / Lan**.
4. Ở thẻ giới thiệu mỗi vòng, mọi người **đổi vai được** trên điện thoại (vai vòng trước được giữ sẵn); thẻ hiện tên ai đang giữ vai nào. Đã chọn vai thì điện thoại hiện luôn các nút của vòng để **bấm thử**: nhân vật của bạn nhảy lên trên màn hình lớn và thẻ ghi “✓ Phím chạy tốt” (bàn phím cũng thử được). Quản trò bấm **Bắt đầu** trên laptop. Trong lúc chơi vai bị khoá; người không có vai chỉ xem.
5. Vai chưa ai nhận thì điều khiển bằng bàn phím laptop như cũ. Điện thoại mất kết nối thì tự nối lại; nếu tắt hẳn, vai đó hiện “vắng” và người khác nhận thay được.
6. **Rung báo lượt:** điện thoại rung khi đến việc của đúng người đó, ví dụ: khung chọn dừng trên cây cần chăm (Lan), cây sắp héo (Đào, Mai), chậu nghiêng nguy hiểm (Lan), khách vẫy tay ở phía mình lái, đèn sắp đỏ (Lan), sắp tới đoạn đường hẹp (cả ba), tới lượt chuyền vòng hoa, có đơn mới hoặc bó hoa chuyển sang khâu của mình. Mọi người cùng rung khi vòng bắt đầu, khi kết thúc và khi có sự cố (đổ chậu, va chạm, khách bỏ về). Rung chỉ chạy trên Android; iPhone không cho trang web rung.
7. **Tên đội:** admin bấm **🏷️ Đặt tên đội** (phím `N`) ở màn hình chính, trên thẻ giới thiệu mỗi vòng, hoặc nút **✏️ Đổi** trong bảng mã QR. Người đang giữ **vai Lan** trên điện thoại cũng đặt được (nút “🏷️ Đặt tên đội” dưới danh sách vai hoặc màn hình bấm thử). Tên đội (tối đa 24 ký tự, gõ “Đội X” hay “X” đều được) được nhớ trên máy quản trò, hiện ở màn hình chính, thẻ giới thiệu, thẻ kết quả từng vòng, bảng tổng kết, đầu màn hình mọi điện thoại và trên thiệp 20/10.
8. **Thiệp 20/10:** tới màn tổng kết, mỗi điện thoại tự nhận một tấm thiệp riêng gồm tên người chơi, tên đội, danh hiệu theo vai chơi nhiều nhất (Bông Đào rạng rỡ · Nàng Mai khéo tay · Đoá Lan tinh tế; ai chỉ xem là Cổ động viên số 1), các vòng đã chơi kèm số sao, hạng và tổng điểm của tiệm, và một lời chúc. Bấm **Lưu ảnh thiệp** để tải về (iPhone: nhấn giữ vào ảnh). Điện thoại nối lại giữa chừng vẫn nhận lại thiệp.

Lưu ý mạng: một số Wi‑Fi công ty chặn các máy nói chuyện với nhau (client isolation) — khi đó dùng điểm phát Wi‑Fi từ một điện thoại hoặc một router riêng cho cả laptop và các điện thoại. Vòng 4 (nhịp điệu) chấm theo thời điểm bấm trên điện thoại (có đồng bộ đồng hồ), nên trễ mạng không làm lệch điểm.

**Chơi một mình bằng bàn phím:** vẫn dùng `Choi-game.bat` (không có Node.js thì tự chạy chế độ bàn phím bằng Python), hoặc tự chạy `python -m http.server 8020` rồi mở `http://localhost:8020`. Không mở trực tiếp `index.html` bằng file://.

Cần Internet để tải font Baloo 2 / VT323 từ Google Fonts; không có mạng thì game dùng font hệ thống. Mã QR được tạo ngay trên máy (không cần Internet).

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

**Điểm vòng:** 100 là mốc chuẩn. Phần vượt 100 **chỉ tính một nửa** (`softCap` trong [main.js](js/main.js)): thô 140 → 120. Thẻ kết quả ghi rõ dòng quy đổi. Nhờ vậy không vòng nào kéo tổng điểm đi quá xa.

**Điểm cuối = Σ (điểm vòng × hệ số của vòng đó)**, mỗi vòng làm tròn. Hệ số chỉ chênh ±10% nên đội mới chơi được điểm gần như nhau ở cả ba mức, còn Thử thách chỉ có lợi rõ khi đội chơi giỏi. Xếp hạng (tổng 5 vòng): ≥625 Thần thoại · ≥550 Huyền thoại · ≥460 Nổi tiếng · ≥360 Dễ thương · còn lại Mới mở. Kỷ lục tổng dùng chung; kỷ lục từng vòng lưu riêng theo độ khó. Hệ số sửa ở `DIFF_MULT`, tỷ lệ tính phần vượt chuẩn ở `OVERPAR` trong [main.js](js/main.js); mốc hạng ở `RANKS` trong [final.js](js/scenes/final.js).

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

## Chơi online (mỗi người một máy, ở đâu cũng được)

Khi game chạy bằng `server.js` (trên laptop hoặc trên Render), màn hình chính có thêm **🌐 Chơi online** và **🏆 Bảng xếp hạng**.

**Cách chơi**
1. Một người bấm **🌐 Chơi online → ✨ Tạo phòng mới**, nhập tên. Người tạo phòng là **chủ phòng 👑**.
2. Chủ phòng bấm **🌐 Phòng** (phím `P`) để lấy **mã phòng 4 ký tự**, **link mời** (`…/?room=ABCD`) hoặc **mã QR**, rồi gửi cho mọi người.
3. Người khác mở link, hoặc bấm **Chơi online** và gõ mã phòng. Ba người vào đầu tiên tự nhận vai **Đào · Mai · Lan**; trong bảng phòng bấm vào vai để nhận hoặc bỏ. Người vào sau làm khán giả. Vai trống do chủ phòng điều khiển, nên 1–2 người vẫn chơi được.
4. **Chủ phòng điều khiển menu và các thẻ**: chọn độ khó, xem demo, bắt đầu, sang vòng sau. Mỗi người chỉ bấm được phím của vai mình.
5. **Trên điện thoại**: nút cảm ứng của vai hiện ngay dưới màn chơi khi cầm dọc, hoặc thành cột bên phải khi xoay ngang. Thẻ giới thiệu và thẻ kết quả dùng phần màn hình phía trên hàng nút. **Trên máy tính**: dùng bàn phím như bản thường.
6. Hết ván 5 vòng, mỗi người bấm **💌 Xem thiệp 20/10 của bạn** để lưu thiệp. Chủ phòng tự gửi kết quả lên **bảng xếp hạng**; chỉ ván đủ 5 vòng mới được tính.

**Bảng xếp hạng** (`/leaderboard.html`): lấy điểm cao nhất của mỗi đội. Có tab **Tổng 5 vòng** và **Từng vòng**, lọc theo **độ khó** (mức được chọn ở nhiều vòng nhất) và **mọi lúc / 7 ngày qua**. Không cần đăng nhập, chỉ cần tên đội và tên người chơi.

**Cách đồng bộ (lockstep)**
- Mọi máy trong phòng cùng chạy một trận. Máy chủ giữ đồng hồ (60 nhịp/giây) và đóng dấu mỗi lần bấm nút bằng số nhịp mà mọi máy phải áp dụng.
- Để mọi trình duyệt tính ra kết quả giống hệt nhau, trong lúc mô phỏng `Math.random`, `sin`, `cos`, `atan2`, `pow`, `hypot` được thay bằng bản tự viết (`js/detmath.js`, dựa trên fdlibm), kèm hạt giống ngẫu nhiên của phòng.
- Người vào sau hoặc mất mạng nối lại sẽ nhận lịch sử các lần bấm và tự tua lại trong im lặng.
- Mỗi 2 giây các máy gửi dấu vân tay trạng thái lên máy chủ; nếu lệch, máy đó hiện thông báo để chạm vào và đồng bộ lại.
- Khi phòng đứng yên ở màn hình chính quá 20 giây, máy chủ bắt đầu lại đồng hồ để người vào sau không phải tua lâu.

Đã thử với 2 tab Chrome cùng phòng: tất cả 5 vòng, cả lúc vào lại giữa trận, có 95 điểm so trạng thái và không lệch điểm nào.

**Giới hạn hiện tại**
- Chưa thử trên Safari/iPhone thật.
- Hình hiện chậm hơn lúc bấm khoảng 50–150 ms. Vòng 4 chấm theo thời điểm người chơi thực sự bấm nên không bị trừ oan.
- Trên điện thoại cầm dọc, thẻ chữ vẫn khá nhỏ; xoay ngang hoặc dùng máy tính sẽ đọc rõ hơn.
- Bảng xếp hạng tin kết quả do máy chủ phòng gửi lên, chưa có chống gian lận.

### Đưa lên mạng bằng Render (miễn phí)
1. Tạo kho GitHub (riêng tư cũng được) và đẩy toàn bộ thư mục game lên. Thư mục `data/` đã nằm trong `.gitignore`.
2. Vào [render.com](https://render.com) và đăng nhập bằng GitHub. Chọn **New → Blueprint**, chọn kho vừa tạo; Render đọc `render.yaml` và tạo dịch vụ web `node server.js`. Cách khác: **New → Web Service**, Start Command `node server.js`, thêm biến môi trường `PUBLIC=1`.
3. Sau vài phút sẽ có địa chỉ dạng `https://tiem-hoa-20-10.onrender.com`; gửi địa chỉ đó cho mọi người.
4. **Giữ bảng xếp hạng qua các lần khởi động lại:** gói miễn phí của Render xoá ổ đĩa mỗi lần dịch vụ ngủ hoặc deploy lại.
   - Tạo một database **Upstash Redis** miễn phí ([upstash.com](https://upstash.com)).
   - Chép `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` vào mục *Environment* của dịch vụ trên Render.
   - Không có hai biến này thì bảng lưu vào `data/leaderboard.json`, dùng được khi chạy trên laptop.
5. Gói miễn phí **ngủ sau 15 phút không có ai**; người vào đầu tiên phải chờ khoảng 30–60 giây để máy chủ thức dậy. Trước sự kiện nên mở trang trước vài phút.

Trên Render (hoặc khi đặt `PUBLIC=1`), chế độ tay cầm cùng Wi‑Fi (`pad.html`, mã QR LAN) tự tắt vì không dùng được qua internet. Chạy trên laptop thì cả hai chế độ đều có.

**Thử trên máy mình:** chạy `node server.js`, mở `http://localhost:8020` ở hai cửa sổ hoặc trình duyệt khác nhau, một bên tạo phòng, bên kia vào bằng mã. Hai tab cùng một trình duyệt dùng chung mã người chơi, nên nên dùng hai trình duyệt khác nhau hoặc một cửa sổ ẩn danh.

## Cấu trúc

- `server.js`: máy chủ nhỏ (Node, không cần cài thư viện) phát game, chuyển phím bấm từ điện thoại sang màn hình lớn qua WebSocket (LAN), và gắn phần online.
- `online-server.js`: phòng online (mã phòng, đồng hồ nhịp, lịch sử, so trạng thái, đổi chủ phòng khi vắng) và API bảng xếp hạng (`/api/leaderboard`, `/api/leaderboard/rounds`, `/api/scores`). `ws-lite.js`: WebSocket tối giản dùng chung.
- `js/online.js`: phía trình duyệt khi chơi online (sảnh, bảng phòng, nút cảm ứng, phát lại sự kiện, thiệp, gửi điểm). `js/detmath.js`: toán và ngẫu nhiên tất định cho lockstep.
- `js/controls.js`, `js/card.js`: bộ nút từng vai và hàm vẽ thiệp 20/10, dùng chung cho `pad.html` và bản online.
- `leaderboard.html`: trang bảng xếp hạng. `package.json`, `render.yaml`: để deploy lên Render.
- `pad.html`: trang tay cầm trên điện thoại (nhập tên, chọn vai, nút bấm theo vòng).
- `js/net.js`, `js/lobby.js`: phía màn hình lớn — danh sách người chơi, ai giữ vai nào, màn hình mã QR.
- `vendor/qrcode.js`: thư viện tạo mã QR (MIT, Kazuhiko Arase).
- `js/main.js`: vòng lặp game, phóng to pixel, input (bàn phím + điện thoại), chuyển cảnh.
- `js/round.js`: luồng chung của mỗi vòng (giới thiệu vai → 3·2·1 → chơi → kết quả), HUD, tạm dừng.
- `js/sprites.js`: toàn bộ pixel art, vẽ bằng code từ hình khối và tự viền 1px nên không cần file ảnh.
- `js/audio.js`: hiệu ứng âm thanh và nhạc chiptune tổng hợp bằng WebAudio.
- `js/scenes/*.js`: màn chính, 5 vòng chơi (vòng 5 là `shop.js`) và màn tổng kết (`final.js`, gửi thiệp về điện thoại).
- `sprites.html`: trang xem toàn bộ sprite, dùng khi chỉnh đồ họa.

Mở thẳng một màn để thử: `index.html?scene=garden` (hoặc `carry`, `drive`, `sign`, `final`).

## Chỉnh cân bằng nhanh

Mỗi vòng gom thông số theo độ khó vào một bảng `TUNE` ở đầu file; dòng mô tả độ khó trên thẻ giới thiệu đọc từ bảng này.

- Chung: hệ số `DIFF_MULT`, phần vượt chuẩn `OVERPAR` ([main.js](js/main.js)); mốc hạng `RANKS` ([final.js](js/scenes/final.js)).
- Vòng 1: `TUNE` (thời gian chờ `wait`, nhịp `gap`, số cây kêu `max/ramp`, khựng `stun`, quy đổi `div`), kích thước vườn `COLS/ROWS`, `DURATION` ([garden.js](js/scenes/garden.js)).
- Vòng 2: `TUNE` (mốc, tốc độ, cún, độ chao `TIP/DAMP/FIX/GUST`, điểm phạt, bề rộng cầu treo và khe đá, điểm hoa và điểm về sớm), bản đồ `buildMap()`, đường đi `ROUTE`, vùng đất xấu `GATES`, vùng gió `WINDY`, `STARS`, `SPRINKLERS` ([carry.js](js/scenes/carry.js)).
- Vòng 3: `TUNE` (mốc, bề rộng đường, mật độ chướng ngại, lực phanh, giao hoa, ổ gà, sao, điểm trừ va chạm, độ cong `curve`, vị trí đoạn hẹp `funnels`, độ hẹp `narrow`, cọc tiêu `cones`), độ dài phễu `F_FLAT/F_TAPER`, chu kỳ đèn `CYCLE`, `POT_PTS`, thời gian giữ xe khi vượt đèn đỏ `PULL_OVER`, `LEN`, `VMAX` ([drive.js](js/scenes/drive.js)).
- Vòng 5: `TUNE` (nhịp khách đến `gap/gapEnd`, sức chờ `patience`, số cành `stems`, tỷ lệ món gói kèm `extra`, khựng `stun`, quy đổi `div`), điểm `BOUQUET/TIP/LEAVE/WRONG`, số đơn treo tối đa `MAX_TICKETS`, `DURATION` ([shop.js](js/scenes/shop.js)).
- Rung: các lệnh `this.cue(vai, kiểu rung, …)` trong từng vòng; hàm `buzz()` ở [net.js](js/net.js). Thiệp: lời chúc và danh hiệu ở đầu [final.js](js/scenes/final.js), cách vẽ thiệp trong `drawCard()` của [pad.html](pad.html).
- Vòng 4: bản nhạc nốt trong `buildChart()`, nhịp `BPM`, tốc độ rơi `SPEED`, cửa sổ chấm và điểm phạt `WIN/PERFECT/SYNC/WRONG` (đặt theo độ khó trong `init()`) ([sign.js](js/scenes/sign.js)).
