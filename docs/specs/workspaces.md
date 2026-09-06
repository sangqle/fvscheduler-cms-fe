# Workspaces

Updated: 2026-09-06 · Thiết kế: CMS-01..04, CMS-08 · Backend: `ADM-FLOW-02, 03, 05, 06`

## Mục đích

Duyệt mọi workspace xuyên tenant, xem chi tiết (gói, quota, ghi đè, thành viên, lịch sử gói) và
thực hiện 3 thao tác ghi: cấp gói / trial, gia hạn, hủy gói. Thành viên và ghi đè chỉ đọc.

## Màn hình

### `/workspaces` (CMS-01)
- `WorkspaceListScreen` → `WorkspaceFilters` + `WorkspaceTable` (DataTable, phân trang server).
- Hàng lọc một dòng (`flex-wrap`): ô tìm co giãn · `FilterSelect` Loại / Trạng thái gói / Gói (rộng
  theo nội dung, dấu check bên phải theo convention `Select`) · nút Xóa bộ lọc khi đang lọc · ghi chú
  "không có thao tác ghi" đẩy sát phải. Sắp xếp là `WorkspaceSortControl` trong `PageHeader actions`.
- URL: `?q=&type=&subscriptionStatus=&planCode=&sort=createdAt,desc|name,asc&page=&size=15`
  (`useUrlState`; đổi filter reset `page`). Ô tìm debounce 300ms.
- Cột: `rawId` (khóa số của `workspace.id`, `RawId`, luôn đứng đầu) · Workspace (tên, loại, id
  ngắn) · Chủ sở hữu (tên, email hoặc "Chưa có tài khoản đăng
  nhập") · TV · CN · Gói hiện tại (tên + badge nguồn + mã, hoặc "Chưa từng có gói") · Trạng thái ·
  Hết hạn (giờ + "còn/quá N ngày", đỏ khi quá, cam ≤ 7 ngày) · Tạo lúc.
- Click hàng → `/workspaces/{id}?from=<query hiện tại đã encode>` (`detailHref`), để nút quay lại ở
  chi tiết trả đúng trang/bộ lọc đang xem. Rỗng sau lọc → `EmptyState` + "Xóa bộ lọc" (ghi chú PAST_DUE).

### `/workspaces/[workspaceId]` (CMS-02..04)
- `WorkspaceDetailScreen`: header (back về `useReturnHref('/workspaces')`, tức `?from=` nếu vào từ
  danh sách, còn không thì `/workspaces` trơn; tên, loại, badge trạng thái, id copy, tạo lúc, chủ sở
  hữu, nút "Xem đơn hàng của workspace" → `/orders?workspaceId=`), Tabs qua `?tab=overview|members|history`.
- 404 → `NotFoundState` ("Không tìm thấy workspace này", không tiết lộ id).
- **Tổng quan** `OverviewTab`: thẻ Gói hiện tại (tên, badge status/source, mã + giá từ catalog,
  Bắt đầu/Hết hạn, chế độ readOnly) + 3 nút: Cấp gói (luôn bật), Gia hạn và Hủy gói (bật khi
  status ≠ NONE); Quota (mỗi key trong `entitlement.limits ∪ unlimitedKeys`: usage/limit,
  `MeterBar`, cam khi chạm trần, ghi chú override); Ghi đè (limitOverrides, itemOverrides, chỉ
  đọc); Chủ sở hữu; Số liệu (booking, khách, TV, CN); Tính năng (`entitlement.features`).
- **Thành viên** `MembersTab`: `FilterSelect` trạng thái + DataTable phân trang server, chỉ đọc.
- **Lịch sử gói** `HistoryTab`: mảng phẳng; badge = `effectiveStatus`, dòng phụ "lưu DB: X";
  dòng CANCELED badge CANCELED + "hiệu lực: NONE", mờ đi; dòng live nền primary nhạt.

### Dialog ghi (CMS-08), đều trong `components/admin/workspaces/`
- `GrantDialog`: cảnh báo nếu đang có gói live; chọn gói (`Combobox`, gồm gói ngừng bán, đánh
  dấu); nguồn `MANUAL/LEGACY/TRIAL` (`SegmentedControl` + hint); ngày hết hạn (`datetime-local`,
  mặc định +30 ngày, phải ở tương lai); ghi chú 3..400.
- `ExtendDialog`: hiện dòng sẽ gia hạn; ngày mới mặc định hạn cũ +30 ngày, phải sau bây giờ;
  ghi chú. Ghi rõ nếu gói đã hết hạn theo đồng hồ thì sẽ sống lại ngay.
- `CancelDialog` (`ConfirmDialog` destructive): nêu hệ quả về NONE; ghi chú bắt buộc; nút "Giữ gói"
  là focus mặc định.
- Focus mặc định luôn ở nút Hủy; lỗi 4xx hiện `Alert` trong dialog với message backend; thành
  công → toast + đóng + invalidate.

Trạng thái mọi màn: loading = khung xương khớp bố cục (`loading.tsx` của route + nhánh `isPending`
dùng chung component ở `WorkspaceSkeletons.tsx`, xem [README](./README.md)) · empty = `EmptyState` · error =
`ErrorState` · 404 = `NotFoundState` · pending khi ghi = nút disabled + `Spinner`.

## Hooks ↔ API

| Hook | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useAdminWorkspaces(params)` | `GET /api/admin/workspaces` | `['admin','workspaces','list',params]` | |
| `useAdminWorkspace(id)` | `GET /api/admin/workspaces/{id}` | `['admin','workspaces','detail',id]` | |
| `useAdminMemberships(id, params)` | `GET …/{id}/memberships` | `[…,'detail',id,'members',params]` | |
| `useAdminSubscriptionHistory(id)` | `GET …/{id}/subscriptions` | `[…,'detail',id,'subscriptions']` | |
| `useGrantSubscription(id)` | `POST …/{id}/subscriptions` (201) | | detail + list |
| `useExtendSubscription(id)` | `PATCH …/{id}/subscription` | | detail + list |
| `useCancelSubscription(id)` | `POST …/{id}/subscription/cancel` | | detail + list |

Invalidate `detail(id)` cũng bắt lịch sử/thành viên vì key lồng dưới nó.

## Rule FE phải giữ

- `subscription.status` là **suy theo đồng hồ**; không tự tính lại từ `expiresAt` ở FE ngoài
  nhãn "còn/quá N ngày".
- Grant: `source` không được là `SEPAY`; `expiresAt` tương lai; gói ngừng bán vẫn chọn được.
- Extend/Cancel chỉ có nghĩa khi có dòng live; nút disabled khi `status === 'NONE'`.
- Không có endpoint ghi override, không mời/vô hiệu thành viên từ CMS.
- Sort chỉ `createdAt` hoặc `name`; membership sort chỉ `createdAt`/`status`.
- `?from=` chỉ là bộ nhớ đường về, không phải state của màn chi tiết: đọc bằng `useReturnHref`,
  không parse ra để lọc gì thêm; vào thẳng bằng link ngoài (không có `from`) vẫn phải chạy đúng.

## Types

`src/types/admin.ts`: `AdminWorkspaceRow`, `AdminWorkspaceDetail`, `AdminMembership`,
`AdminSubscriptionRow`, `GrantSubscriptionInput`, `AdjustSubscriptionInput`, `CancelSubscriptionInput`.
