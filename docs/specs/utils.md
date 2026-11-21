# Tiện ích: hộp công cụ vận hành

Updated: 2026-11-21 · Thiết kế: chưa có mockup (dựng theo `Card` + `DataTable` sẵn có) ·
Backend: `../fvscheduler/docs/features/admin/technical/fe-integration.md` (ADM-FLOW-03)

## Mục đích

Chỗ cho những thao tác vận hành không thuộc màn nghiệp vụ nào. Hai tab: **Giải mã id** (tra cứu một
lần của người trực hỗ trợ: giải mã id mờ thành khóa số của DB nền tảng, để trả lời câu "khách gửi cái
`wk…` này, chạy SQL nào bây giờ") và **Khung ảnh** (tiện ích dựng ảnh đăng mạng xã hội, chạy trong
trình duyệt, xem [utils-frame.md](./utils-frame.md)). Không tab nào ghi gì vào hệ thống.

**Không có (tab Giải mã id)**: tra ngược khóa số thành id mờ (backend không mở chiều đó), kiểm tra bản ghi có tồn
tại không, tên bảng SQL đi kèm mỗi loại, lịch sử các lần đã giải mã.

## Màn hình

### `/utils`
- Thành phần: `components/admin/utils/UtilsScreen.tsx` (client, `PageHeader` + `Tabs`; mô tả
  `PageHeader` đổi theo tab) → `DecodeIdsCard.tsx` hoặc `frame/FrameTool.tsx`. Chỉ tab đang chọn mới
  mount nội dung. Nhãn và danh sách tab ở `utilsTabs.ts`.
- Filter/URL: chỉ `?tab=decode|frame`; `decode` là mặc định nên bị bỏ khỏi URL khi chọn. Giá trị lạ
  rơi về `decode`. Id mờ **không bao giờ** lên URL (xem "Rule FE phải giữ"). `page.tsx` bọc
  `Suspense` (fallback `loading.tsx`) vì màn đọc `useSearchParams` qua `useUrlState`.
- Các mục Trạng thái và "Thử lại" dưới đây là của tab Giải mã id; tab Khung ảnh ở `utils-frame.md`.
- Trạng thái: chưa chạy (chỉ có ô nhập) · pending (nút `Spinner` + disabled, bảng ở chế độ
  `isLoading`) · lỗi tải (`ErrorState` thay **cả** khối kết quả, kể cả dòng tổng kết: hỏng thì
  không có số nào để tổng kết, mà "0 id · 0 ra khóa số" đứng trên hộp lỗi đọc như kết luận của
  backend) · id sai **không** phải trạng thái lỗi mà là một dòng trong bảng.
- "Thử lại" chạy lại đúng lô đã hỏng (`decode.variables`), không phải nội dung ô nhập lúc bấm:
  người dùng có thể vừa sửa ô nhập trong lúc đọc lỗi, và nút của một hộp lỗi thì phải thử lại
  chính thứ đã lỗi.

### `DecodeIdsCard`
- Ô nhập: `Textarea mono` (prop `mono` thêm vào primitive cho ô dữ liệu máy đọc), `Ctrl/⌘ + Enter`
  chạy luôn. `parseDecodeIds` (`lib/admin/ids.ts`) tách theo xuống dòng / khoảng trắng / dấu phẩy /
  chấm phẩy, bóc nháy và ngoặc vuông ở hai đầu (dán từ mảng JSON), **bỏ id trùng** và giữ nguyên
  phần lõi kể cả chuỗi rác, để dòng báo lỗi hiện đúng thứ người dùng đã dán.
- Quá `MAX_DECODE_IDS` (200) thì chặn tại client: `Field` báo lỗi, nút disabled, không bắn request
  để ăn `400`.
- Bảng kết quả: `Id mờ` (mono) · `Loại` (`Badge` mono với tên hằng `PublicIdType`, hoặc câu lỗi màu
  `destructive`) · `rawId` (`RawId` + nút chép). `rowKey` là chính chuỗi id, an toàn vì đầu vào đã
  bỏ trùng. Dòng tổng kết: `N id · X ra khóa số · Y không hợp lệ`, kèm nút "Chép N rawId" nối bằng
  `, ` để dán thẳng vào `WHERE id IN (…)`.

## Hooks ↔ API

| Hook (`src/hooks/`) | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useDecodeIds` | `POST /api/admin/ids/decode` | `['admin','ids','decode']` (mutation key) | không có: endpoint không đụng repository nào |

## Rule FE phải giữ

- **Id mờ không bao giờ lên URL, query key hay log.** Endpoint đi `POST` cho một phép đọc chính vì
  lý do đó: path/query sẽ bị access log, proxy trace và lịch sử trình duyệt chép lại. Vì thế màn
  này là `useMutation` chứ không phải `useQuery` (query key mang id là một bản sao khác), và không
  có `?ids=` để chia sẻ link kết quả.
- **Id sai không phải lỗi HTTP.** Vẫn `200`; dòng đó mang `error` thay cho `type`/`rawId`. Chỉ
  `ids` rỗng hoặc quá 200 mới ra `400`. Đừng biến một dòng `error` thành `ErrorState` của cả bảng.
- **Giữ nguyên câu lỗi của backend, không diễn giải thêm.** Mọi kiểu sai (sai độ dài, sai tag, hỏng
  MAC) đều trả đúng một câu: nói rõ sai ở đâu là chấm bài giúp người đang dò id giả.
- **`type` là tên hằng `PublicIdType`, không phải tên bảng.** Không map sang tên bảng SQL: bảng
  đúng thì cũng chỉ là một bảng tra tay không ai kiểm, bảng sai thì đẩy người vận hành đi truy vấn
  thứ không tồn tại. Giữ chữ hoa mono như mọi enum backend khác.
- **Ra số không có nghĩa là bản ghi còn sống.** Endpoint không kiểm tra tồn tại, id của bản ghi đã
  xóa vẫn giải mã được; câu trả lời cuối cùng là truy vấn SQL của người vận hành. Mô tả trên thẻ
  phải nói điều này.
- **Không route theo `rawId`.** Mọi path và query param của `/api/admin/**` vẫn dùng id mờ; khóa số
  chỉ để hiện, chép và join tay với kết quả SQL.

## Types

`src/types/admin.ts`: `DecodeIdsInput`, `AdminDecodedId` (`{ type, rawId }` **hoặc** `error`, không
bao giờ cả hai).
