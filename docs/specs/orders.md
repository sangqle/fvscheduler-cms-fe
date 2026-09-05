# Đơn hàng

Updated: 2026-09-05 · Thiết kế: CMS-05, 06, 08 · Backend: `ADM-FLOW-07-reconcile-orders`

## Mục đích

Đối soát đơn tự thanh toán qua SePay xuyên workspace; xác nhận tay (mark-paid) khi webhook bỏ sót.

## Màn hình

### `/orders` (CMS-05)
- `OrderListScreen` → ô tìm (debounce) + `SegmentedControl` status (Tất cả/PENDING/PAID/EXPIRED/CANCELED)
  + `OrderTable` (phân trang server, size 12).
- URL: `?status=&q=&workspaceId=&page=&size=&code=`. `workspaceId` chỉ là query filter; khi có,
  hiện dòng "Đang lọc theo workspace <tên>" + nút bỏ lọc.
- Hàng PAID/CANCELED mờ đi; cột "Khớp SePay": `tx <id>` · "Xác nhận tay" (PAID không có tx) · "—".
- Click hàng → `?code=<orderCode>` mở drawer.

### Drawer chi tiết (CMS-06) `OrderDrawer` (`SlideOver`)
- Header: mã đơn + badge; workspace (link) · tạo bởi · id ngắn.
- Thông tin: gói (+ đang bán/ngừng bán từ catalog), chu kỳ · số tiền, tạo lúc, thanh toán lúc,
  sepayTxId, gói hiện tại của workspace (badge + còn/quá N ngày), ghi chú EXPIRED, `rawPayload` (pre).
- Footer: Đóng + "Xác nhận đã thanh toán" (`variant="success"`), chỉ bật với PENDING/EXPIRED và
  gói còn đang bán; tooltip giải thích khi disabled.
- 404 → `NotFoundState`.

### `MarkPaidDialog` (CMS-08)
- Cảnh báo kích hoạt ngay, không hoàn tác, nguồn SEPAY. Ghi chú 3..400 (bắt buộc), mã tham chiếu
  ≤ 120 (tùy chọn), thời điểm thanh toán (tùy chọn, không tương lai, mặc định bây giờ).
- Thành công → toast "Đã xác nhận thanh toán, gói đã được kích hoạt" + set cache detail + invalidate
  list đơn và workspaces. 409 → `Alert` giữ nguyên message backend ("Order is PAID, not payable",
  "Plan X is inactive or missing").

## Hooks ↔ API

| Hook | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useAdminOrders(params)` | `GET /api/admin/orders` | `['admin','orders','list',params]` | |
| `useAdminOrder(code)` | `GET /api/admin/orders/{orderCode}` | `['admin','orders','detail',code]` | |
| `useMarkPaid(code)` | `POST /api/admin/orders/{orderCode}/mark-paid` | | setQueryData detail; orders list; `['admin','workspaces']` |

## Rule FE phải giữ

- Mark-paid nhận cả PENDING lẫn EXPIRED; PAID/CANCELED disabled, không gửi.
- Không tự submit lại thao tác ghi khi mất mạng (chỉ read được retry).
- Sort chỉ `createdAt`/`paidAt`/`status`.

## Types

`src/types/admin.ts`: `AdminOrderRow`, `AdminOrderDetail`, `MarkPaidInput`, `MarkPaidResult`.
