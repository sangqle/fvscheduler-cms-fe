# Tiện ích › Khung ảnh mạng xã hội

Updated: 2026-11-21 · Thiết kế: chưa có mockup · Backend: không có (chạy hoàn toàn trong trình duyệt)

## Mục đích

Đặt ảnh chụp màn hình điện thoại/desktop vào giữa một khung có tỉ lệ an toàn cho mạng xã hội, để feed
Threads/Facebook hiện trọn giao diện thay vì cắt mất. Nền mặc định đen. Công cụ vẽ bằng canvas ngay
trong trình duyệt: **không upload, không backend, không gọi `/api/admin/**`**.

**Không có**: lưu ảnh hay khung qua lần tải lại trang, đăng thẳng lên mạng xã hội, chỉnh sửa ảnh
(cắt, xoay), chữ, logo hay watermark trên khung, khung thiết bị, nhiều lô song song.

## Màn hình

### `/utils?tab=frame`
- Trang và tab: xem [utils.md](./utils.md). Thành phần: `components/admin/utils/frame/FrameTool.tsx`.
- Bố cục: `lg:grid-cols-[minmax(0,1fr)_360px]`. Trái: thẻ xem trước (`FramePreview`) + dải khung
  (`FrameStrip`). Phải: `FramePanel` trong `Card`, `lg:sticky` và cuộn trong thẻ trên desktop.
- `FramePreview`: canvas xem trước + lớp DOM phủ để kéo từng ảnh, bàn phím, đường gióng, vùng feed.
- `FrameStrip`: các ô khung thu nhỏ, chọn khung, nút "Thêm ảnh" · "Dán ảnh" · "Ảnh mẫu".
- `FramePanel`: thiết lập (khung, nền, bố cục), thao tác theo khung, thiết lập cả lô, xuất.
- Trạng thái:
  - empty: `EmptyState` làm vùng thả (dán, kéo thả, chọn file; trên cảm ứng đổi câu sang "Dán ảnh").
  - loading: `Skeleton` thay ô khung đang giải mã, `Spinner` "Đang đọc ảnh…" ở xem trước.
  - error: ảnh không giải mã được thành ô/xem trước báo lỗi kèm "Xóa khung này"; khung có ảnh lỗi
    bị bỏ qua khi xuất lô. Lỗi xuất/chép/chia sẻ ra toast.
  - pending: nút Chép/Tải/Chia sẻ/zip disabled + `Spinner`, nhãn tiến độ "Đang xuất 2/7".

### Nhập ảnh
- Dán: listener `paste` trên `document`, bỏ qua khi focus đang ở `input`/`textarea`/`select`/
  contenteditable. Kéo thả vào bất kỳ đâu trên trang. Chọn file: `accept="image/png,image/jpeg,image/webp"`
  (PNG đứng đầu; không dùng `image/*`, không `image/heic`). Nút "Dán ảnh" đọc `navigator.clipboard.read()`.
  "Ảnh mẫu" sinh ảnh thử bằng `lib/frame/samples.ts`.
- Trần cứng 40 ảnh mỗi lô: file thừa bị bỏ, toast nêu tên. Hơn 20 khung thì cảnh báo (carousel
  Threads/Instagram/LinkedIn tối đa 20).

### Thiết lập khung ("Áp cho" `Cả lô`, hoặc `Khung N` = ghi đè riêng khung đang chọn, chấm vàng trên dải khung)
- Tỉ lệ: 4:5 (mặc định) · 3:4 · 2:3 · 1:1 · tùy chỉnh; dọc/ngang.
- Nền: đặc (`#000000` mặc định) · gradient · mờ từ ảnh (không dùng `ctx.filter`, thu nhỏ rồi phóng lại).
- Lề 4% (0..20% cạnh ngắn của khung) · khoảng cách hai ảnh 3% (0..10%) · bo góc tự động (khoảng 4%
  chỉ cho ảnh dạng điện thoại, W/H < 0,6; ngoài ra 0) hoặc tay 0..15% · bóng tắt · tràn tắt.
- Nhãn nền tảng (Threads, Facebook, Instagram, X, LinkedIn): ✓ hiện trọn, ✗ cắt, ? chưa chắc.
  Luật nằm ở hằng `PLATFORM_RULES` duy nhất trong `lib/frame/platforms.ts`, tra cứu 11/2026.
- Vùng feed: khi khung cao hơn 4:5, xem trước vẽ hai dải che và nhãn "che Npx trên, Mpx dưới của ảnh
  chụp màn hình". Chỉ vẽ trên xem trước, không vào file xuất.

### Thiết lập cả lô
- "Ảnh mỗi khung" 1 hoặc 2: chỉ áp cho ảnh thêm sau. Tự ghép đôi chỉ ghép ảnh dọc, ảnh ngang luôn
  đứng riêng. "Xếp lại cả lô" dựng lại mọi khung; hỏi `ConfirmDialog` khi có khung đã chỉnh tay
  (`edited`) hoặc có ghi đè riêng.
- "Cho phóng to ảnh nhỏ": tắt mặc định; bật thì hiện nhãn cảnh báo "có thể nhòe".

### Thao tác theo khung
- Kéo (pointer events trên lớp DOM): hít vào tâm và đường vùng an toàn (8px màn hình), kẹp trong
  khung, hai ảnh không đè nhau trừ khi bật tràn. Phím mũi tên 0,5%, Shift 5%. Nhấp đúp hoặc "Căn
  giữa lại" về vị trí tự động.
- Thu phóng 30% tới mức tối đa còn nằm trong khung và không đè ảnh kia. Thay ảnh (giữ vị trí và
  zoom) · Đổi chỗ · Tách · Ghép với khung sau · Dời ←/→ · Xóa khung.

### Xuất
- Cỡ: Chuẩn (ngang 1440, cạnh dài ≤ 2048) · Lớn (cạnh dài 2048) · Gốc (ảnh vẽ 100% điểm ảnh gốc;
  cặp thì ảnh thấp hơn là mốc 100%; trần 16.777.216 điểm ảnh). Làm tròn không bao giờ làm khung dọc
  cao hơn (hay khung ngang dẹt hơn) tỉ lệ đích, ví dụ Lớn 4:5 ra 1639×2048.
- Định dạng: PNG (mặc định) · JPEG chất lượng 0,92 (chữ màu hơi nhòe). Dung lượng hiện là số thật
  đo từ blob xuất (có debounce), không ước lượng.
- Chép ảnh: luôn PNG qua `ClipboardItem`, Promise blob tạo ngay trong cú bấm. Tải xuống: một khung.
  "Tải tất cả (.zip)": zip kiểu lưu thẳng tự viết ở `lib/frame/output.ts`, không thêm gói.
  Chia sẻ: một khung; "Chuẩn bị chia sẻ tất cả" hai bước, chia lô ≤ 10 file và ≤ 50 MB. Chỉ hiện khi
  `navigator.canShare({ files })` đúng.

## Hooks ↔ API

Không có endpoint, không `apiFetch`, không TanStack Query. Hook phía client:

| Hook | Vai trò |
|---|---|
| `useFrameTool` (`lib/frame/store.ts`) | store cấp module qua `useSyncExternalStore` (không Zustand) |
| `useFrameExport` | chép, tải, chia sẻ, zip, chuẩn bị chia sẻ cả lô |
| `useFrameInput` | dán, kéo thả; hàm `readClipboardImages` cho nút "Dán ảnh" |
| `useMeasuredSize` | dung lượng thật của file xuất: vẽ lại ở cỡ xuất sau 650 ms không đổi, bỏ kết quả cũ |

## Rule FE phải giữ

- **Ảnh xuất phải nét (yêu cầu cứng của chủ sản phẩm).** Xuất luôn vẽ từ file gốc giải mã đủ độ
  phân giải, không bao giờ từ canvas xem trước hay ảnh chụp DOM (không html-to-image). Canvas xuất
  có đúng cỡ điểm ảnh đầu ra. Thu nhỏ bằng nhiều bước chia đôi rồi một bước cuối
  `imageSmoothingQuality = 'high'`.
- **Không phóng to ngầm.** Chỉ phóng khi bật công tắc hoặc zoom tay, và khi đó có nhãn cảnh báo. Ở
  hệ số đúng 1 (cỡ Gốc), ảnh vẽ ở tọa độ nguyên, không nội suy (đã kiểm chứng giống từng điểm ảnh
  trên Chrome).
- Bo góc bằng `roundRect` + `clip` trên `HTMLCanvasElement`. Xem trước dùng chính `drawFrame` với
  bản thu nhỏ ~1400px; dải khung và nền mờ dùng bản ~320px.
- **Ảnh không rời máy và không được lưu.** Thiết lập (look + batch) lưu `localStorage` (bọc
  try/catch, khóa `framevis-admin:khung-anh:v1`). Ảnh và khung sống ở store cấp module nên còn khi
  đổi tab hay điều hướng phía client, mất khi tải lại hoặc đóng tab.
- `beforeunload` chỉ đăng ký khi đang có khung (chỉ desktop; Safari iOS không có).
- Nhãn nền tảng chỉ sửa ở `PLATFORM_RULES`, ghi lại ngày tra cứu.
- `window.__khung` là cửa sau kiểm thử, chỉ có khi `NODE_ENV !== 'production'`.

## Types

`src/types/imageFrame.ts`: `FrameLook`, `FrameBatchSettings`, `SourceImage`, `FrameSlot`, `ImageFrame`,
`FrameLayout`. Primitive mới (copy 1:1 từ framevis-erp): `ui/Slider.tsx`, `ui/ColorSwatchPicker.tsx`.

## Chưa kiểm chứng

- Chép clipboard và chia sẻ file trên Safari, Firefox và di động.
- Chia sẻ nhiều ảnh thẳng vào app Threads/Facebook.
- Threads với 3:4: các nguồn trái nhau (nhãn "?"). Nên đăng thử 4:5, 3:4, 2:3 ở chế độ "Chỉ mình
  tôi" trước khi tin nhãn.
