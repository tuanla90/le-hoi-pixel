# Lễ Hội Pixel

Bộ mini game pixel chơi theo đội 3 người, mỗi dịp lễ một chủ đề. Mọi chủ đề dùng chung một lõi: vòng lặp game, tay cầm điện thoại qua Wi‑Fi, chơi online theo phòng, độ khó, demo tự chơi, rung báo lượt, bảng xếp hạng và thiệp cuối ván. Mỗi chủ đề chỉ cần mang nhân vật, các vòng chơi, hình vẽ, chữ và mẫu thiệp riêng.

| Chủ đề | Thư mục | Mở | Nội dung |
|---|---|---|---|
| 🌸 Tiệm Hoa 20/10 | [themes/20-10](themes/20-10/README.md) | `/?theme=20-10` | Ba chị em Đào · Mai · Lan mở tiệm hoa qua 5 vòng |

Không ghi `?theme=` thì game mở chủ đề đầu tiên trong [themes/themes.json](themes/themes.json).

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

Mở thẳng một chủ đề hoặc một màn để thử: `/?theme=20-10&scene=garden` (tên màn là id một vòng của chủ đề, hoặc `title`, `final`).

## Chơi online (mỗi người một máy, ở đâu cũng được)

Khi game chạy bằng `server.js` (trên laptop, Railway hoặc Render), màn hình chính có thêm **🌐 Chơi online** và **🏆 Bảng xếp hạng**.

**Cách chơi**
1. Một người bấm **🌐 Chơi online → ✨ Tạo phòng mới**, nhập tên. Người tạo phòng là **chủ phòng 👑**.
2. Chủ phòng bấm **🌐 Phòng** (phím `P`) để lấy **mã phòng 4 ký tự**, **link mời** (`…/?theme=20-10&room=ABCD`; link thiếu chủ đề thì game tự chuyển sang chủ đề của phòng) hoặc **mã QR**, rồi gửi cho mọi người.
3. Người khác mở link, hoặc bấm **Chơi online** và gõ mã phòng. Ba người vào đầu tiên tự nhận **ba vai** của chủ đề (20/10: Đào · Mai · Lan); trong bảng phòng bấm vào vai để nhận hoặc bỏ. Người vào sau làm khán giả. Vai trống do chủ phòng điều khiển, nên 1–2 người vẫn chơi được.
4. **Chủ phòng điều khiển menu và các thẻ**: chọn độ khó, xem demo, bắt đầu, sang vòng sau. Mỗi người chỉ bấm được phím của vai mình.
5. **Trên điện thoại**: nút cảm ứng của vai hiện ngay dưới màn chơi khi cầm dọc, hoặc thành cột bên phải khi xoay ngang. Thẻ giới thiệu và thẻ kết quả dùng phần màn hình phía trên hàng nút. **Trên máy tính**: dùng bàn phím như bản thường.
6. Hết ván, mỗi người bấm **💌 Xem thiệp** (20/10: “Xem thiệp 20/10 của bạn”) để lưu thiệp. Chủ phòng tự gửi kết quả lên **bảng xếp hạng**; chỉ ván chơi đủ mọi vòng mới được tính.

**Bảng xếp hạng** (`/leaderboard.html?theme=20-10`): mỗi chủ đề một bảng, lấy điểm cao nhất của mỗi đội. Có tab **Tổng các vòng** và **Từng vòng**, lọc theo **độ khó** (mức được chọn ở nhiều vòng nhất) và **mọi lúc / 7 ngày qua**. Không cần đăng nhập, chỉ cần tên đội và tên người chơi.

**Cách đồng bộ (lockstep)**
- Mọi máy trong phòng cùng chạy một trận. Máy chủ giữ đồng hồ (60 nhịp/giây) và đóng dấu mỗi lần bấm nút bằng số nhịp mà mọi máy phải áp dụng.
- Để mọi trình duyệt tính ra kết quả giống hệt nhau, trong lúc mô phỏng `Math.random`, `sin`, `cos`, `atan2`, `pow`, `hypot` được thay bằng bản tự viết (`core/detmath.js`, dựa trên fdlibm), kèm hạt giống ngẫu nhiên của phòng.
- Người vào sau hoặc mất mạng nối lại sẽ nhận lịch sử các lần bấm và tự tua lại trong im lặng.
- Mỗi 2 giây các máy gửi dấu vân tay trạng thái lên máy chủ; nếu lệch, máy đó hiện thông báo để chạm vào và đồng bộ lại.
- Khi phòng đứng yên ở màn hình chính quá 20 giây, máy chủ bắt đầu lại đồng hồ để người vào sau không phải tua lâu.

Đã thử với 2 tab Chrome cùng phòng: tất cả 5 vòng, cả lúc vào lại giữa trận, có 95 điểm so trạng thái và không lệch điểm nào.

**Giới hạn hiện tại**
- Chưa thử trên Safari/iPhone thật.
- Hình hiện chậm hơn lúc bấm khoảng 50–150 ms. Vòng 4 chấm theo thời điểm người chơi thực sự bấm nên không bị trừ oan.
- Trên điện thoại cầm dọc, thẻ chữ vẫn khá nhỏ; xoay ngang hoặc dùng máy tính sẽ đọc rõ hơn.
- Bảng xếp hạng tin kết quả do máy chủ phòng gửi lên, chưa có chống gian lận.

### Đưa lên mạng bằng Railway
1. Vào [railway.com](https://railway.com) và đăng nhập bằng GitHub. Chọn **New Project → Deploy from GitHub repo → `le-hoi-pixel`** và cho Railway quyền đọc repo nếu được hỏi.
2. Railway tự nhận ra dự án Node (`package.json`), rồi chạy `npm start`, tức `node server.js`. Không cần lệnh build hay biến môi trường nào: máy chủ đọc cổng `PORT` của Railway và tự tắt chế độ tay cầm cùng Wi‑Fi khi thấy biến `RAILWAY_ENVIRONMENT_NAME`.
3. Mở dịch vụ → **Settings → Networking → Generate Domain**. Railway hỏi cổng thì nhập cổng hiện trong log (`Deploy Logs` có dòng “đang chạy (chế độ online) trên cổng …”, thường là `8080`). Bạn sẽ có địa chỉ dạng `https://le-hoi-pixel-production.up.railway.app`.
4. **Giữ bảng xếp hạng qua các lần deploy:** trong project bấm **+ Create → Volume**, gắn vào dịch vụ, mount path `/data`. Máy chủ tự ghi `leaderboard.json` vào volume (biến `RAILWAY_VOLUME_MOUNT_PATH`). Không gắn volume thì mỗi lần deploy lại bảng sẽ trống. Có thể dùng Upstash Redis như phần Render bên dưới thay cho volume.
5. Mỗi lần `git push` lên nhánh `main`, Railway tự deploy lại.
6. **(Không bắt buộc)** Healthcheck: **Settings → Deploy → Healthcheck Path** = `/api/ping`.

Railway không cho dịch vụ ngủ như Render nên không phải chờ khởi động, nhưng không có gói miễn phí lâu dài: tài khoản mới có tín dụng dùng thử, sau đó gói Hobby khoảng 5 USD/tháng. Game này rất nhẹ: một tiến trình Node, không có cơ sở dữ liệu.

### Đưa lên mạng bằng Render (miễn phí)
1. Tạo kho GitHub (riêng tư cũng được) và đẩy toàn bộ thư mục game lên. Thư mục `data/` đã nằm trong `.gitignore`.
2. Vào [render.com](https://render.com) và đăng nhập bằng GitHub. Chọn **New → Blueprint**, chọn kho vừa tạo; Render đọc `render.yaml` và tạo dịch vụ web `node server.js`. Cách khác: **New → Web Service**, Start Command `node server.js`, thêm biến môi trường `PUBLIC=1`.
3. Sau vài phút sẽ có địa chỉ dạng `https://tiem-hoa-20-10.onrender.com`; gửi địa chỉ đó cho mọi người.
4. **Giữ bảng xếp hạng qua các lần khởi động lại:** gói miễn phí của Render xoá ổ đĩa mỗi lần dịch vụ ngủ hoặc deploy lại.
   - Tạo một database **Upstash Redis** miễn phí ([upstash.com](https://upstash.com)).
   - Chép `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` vào mục *Environment* của dịch vụ trên Render.
   - Không có hai biến này thì bảng lưu vào `data/leaderboard.json`, dùng được khi chạy trên laptop.
5. Gói miễn phí **ngủ sau 15 phút không có ai**; người vào đầu tiên phải chờ khoảng 30–60 giây để máy chủ thức dậy. Trước sự kiện nên mở trang trước vài phút.

Trên Railway, Render (hoặc khi đặt `PUBLIC=1`), chế độ tay cầm cùng Wi‑Fi (`pad.html`, mã QR LAN) tự tắt vì không dùng được qua internet. Chạy trên laptop thì cả hai chế độ đều có.

**Thử trên máy mình:** chạy `node server.js`, mở `http://localhost:8020` ở hai cửa sổ hoặc trình duyệt khác nhau, một bên tạo phòng, bên kia vào bằng mã. Hai tab cùng một trình duyệt dùng chung mã người chơi, nên nên dùng hai trình duyệt khác nhau hoặc một cửa sổ ẩn danh.

## Cấu trúc

```
index.html, style.css      màn hình lớn (nạp core/main.js)
pad.html                   tay cầm điện thoại: tải tên vai, nút bấm và mẫu thiệp của chủ đề đang chơi
leaderboard.html           bảng xếp hạng online, mỗi chủ đề một bảng (?theme=)
server.js                  máy chủ Node không cần thư viện: phát file, chuyển phím từ điện thoại (LAN), gắn phần online
online-server.js           phòng online (lockstep, mỗi phòng một chủ đề) và API bảng xếp hạng
ws-lite.js                 WebSocket tối giản dùng chung
vendor/qrcode.js           tạo mã QR (MIT, Kazuhiko Arase)
core/                      lõi dùng chung, không nhắc tới dịp lễ nào
  main.js                  vòng lặp, phóng to pixel, input bàn phím + điện thoại, chuyển cảnh, độ khó, tên đội
  theme.js                 nạp chủ đề (?theme=) và mô tả những gì một chủ đề phải có
  round.js                 luồng mỗi vòng: thẻ giới thiệu → 3·2·1 → chơi → kết quả, HUD, demo, tạm dừng
  net.js, lobby.js         phía màn hình lớn của tay cầm LAN: người chơi, ai giữ vai nào, mã QR, tên đội
  online.js                phía trình duyệt khi chơi online: phòng, nút cảm ứng, phát lại sự kiện, thiệp, gửi điểm
  gfx.js, ui-sprites.js    bảng màu, vẽ pixel, hạt; icon dùng chung (sao, tim, nốt nhạc)
  audio.js, detmath.js     âm thanh WebAudio; toán và ngẫu nhiên tất định cho lockstep
themes/
  themes.json              danh mục chủ đề và id các vòng (máy chủ và bảng xếp hạng đọc file này)
  20-10/
    theme.js               khai báo chủ đề: vai, các vòng, hình đại diện, danh sách màn
    meta.js                phần nhẹ, điện thoại cũng tải: tên, 3 vai, nút bấm từng vòng
    card.js                vẽ thiệp cá nhân cuối ván
    sprites.js, world.js   pixel art vẽ bằng code
    scenes/                màn chính, 5 vòng chơi, màn tổng kết
    sprites.html           xem toàn bộ sprite khi chỉnh đồ hoạ
    thiep-moi.html         thiệp mời sự kiện
```

## Thêm một chủ đề mới

1. Chép thư mục `themes/20-10` thành `themes/<id>` (ví dụ `themes/noel`). Đổi tên, vai và nút bấm trong `meta.js`, danh sách vòng trong `theme.js`.
2. Thêm một mục vào `themes/themes.json`: `id`, `name` và `rounds` (id + nhãn từng vòng, đúng thứ tự trong `theme.js`). Máy chủ dùng danh sách này để nhận điểm lên bảng xếp hạng.
3. Vẽ lại `sprites.js`, viết lại các màn trong `scenes/` (có thể giữ luật của vòng cũ, chỉ thay hình và chữ) và mẫu thiệp trong `card.js`.
4. Mở `/?theme=<id>` để chơi thử. Kỷ lục, độ khó và tên đội của mỗi chủ đề được lưu riêng (`store` trong `theme.js`, mặc định `lhp_<id>_`).

Lõi luôn coi vai thứ ba (số 2) là đội trưởng: người giữ vai này được đặt tên đội trên điện thoại.
