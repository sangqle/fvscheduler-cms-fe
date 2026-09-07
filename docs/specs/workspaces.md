# Workspaces

Updated: 2026-09-08 · Thiết kế: CMS-01..04, CMS-08 · Backend: `ADM-FLOW-02, 03, 05, 06`

## Mục đích

Duyệt mọi workspace xuyên tenant, xem chi tiết (gói, quota, ghi đè, booking, thành viên, lịch sử
gói) và thực hiện 3 thao tác ghi: cấp gói / trial, gia hạn, hủy gói. Booking, thành viên và ghi đè
chỉ đọc.

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
  hữu, nút "Xem đơn hàng của workspace" → `/orders?workspaceId=`), Tabs qua
  `?tab=overview|booking|members|history` (tab Booking mang `TabsCount` = `stats.bookings`).
- 404 → `NotFoundState` ("Không tìm thấy workspace này", không tiết lộ id).
- **Tổng quan** `OverviewTab`: thẻ Gói hiện tại (tên, badge status/source, mã + giá từ catalog,
  Bắt đầu/Hết hạn, chế độ readOnly) + 3 nút: Cấp gói (luôn bật), Gia hạn và Hủy gói (bật khi
  status ≠ NONE); Quota (mỗi key trong `entitlement.limits ∪ unlimitedKeys`: usage/limit,
  `MeterBar`, cam khi chạm trần, ghi chú override); Ghi đè (limitOverrides, itemOverrides, chỉ
  đọc); Chủ sở hữu; Thống kê nhanh (booking, khách, TV, CN, trong đó **chỉ** ô Booking là link sang
  `?tab=booking`); Tính năng (`entitlement.features`).
- **Booking** `BookingTab` (chỉ đọc, hai endpoint, không một thao tác ghi nào):
  - `BookingSummaryStrip` đầu tab: ba ô bấm được total / deleted / unstaffed (`deleted` ghi rõ
    "ngoài N" vì nó không cộng vào `total`), cột `byRevenueMonth` kèm cảnh báo khi tổng các tháng
    thiếu so với `total`, rồi dải chip `byStatus` chỉ liệt kê trạng thái thật sự có booking.
    Bấm total = xóa bộ lọc, deleted = bật `includeDeleted`, unstaffed = lọc client.
  - Hàng lọc: ô tìm (`search`, debounce 300ms, khớp tên khách / số điện thoại / mã booking) ·
    `FilterSelect` trạng thái kèm số đếm từ `byStatus` · `DateRangePicker` ngày chụp ·
    `ChoiceSelect` sắp theo · `Switch` "Hiện cả đã xóa" · nút Xóa bộ lọc · `ReadOnlyHint` đẩy phải.
  - URL (tiền tố `bk` vì dùng chung query với màn chi tiết, `tab` và `from` đã có chủ):
    `?bkStatus=&bkQ=&bkFrom=&bkTo=&bkDeleted=1&bkSort=&bkOnly=unstaffed&bkPage=&bkSize=`.
    `bkFrom`/`bkTo` là `yyyy-MM-dd`, quy về đầu ngày và **đầu ngày kế tiếp** (`to` của backend loại
    trừ). Đổi filter tự reset `bkPage`.
  - `BookingTable` (`DataTable`, phân trang server, `mobileCards`), cột: `rawId` (`RawId`, luôn đứng
    đầu, cùng convention với danh sách workspace) · Booking (nhãn = `booking.name`, thiếu thì mượn
    `client.name` và gắn chip "tên khách"; dòng dưới là id mờ copy được, **không** lặp lại `rawId`) ·
    Ngày chụp · Khách hàng (tên + điện thoại) · Trạng thái (`BookingStatusBadge`) ·
    Hợp đồng · Đã thu · Còn lại (âm → badge `info` "trả dư") · Thu · Nhân sự (`assigned/total`,
    badge warning "trống" khi 0) · Buổi · chevron mở drawer.
  - Dòng `booking === null`: ba cột Ngày chụp / Khách hàng / Trạng thái **gộp làm một** ô nét đứt
    (`ColumnDef.colSpan`) nói rõ xóa lúc nào và vì sao trống; các cột tiền của `admin.totals` vẫn
    còn. Dòng đó **không bị làm mờ**, nó chỉ có rail xám đậm bên trái và nhãn ĐÃ XÓA: làm mờ thì mất
    luôn công dụng của cái công tắc người ta vừa bật để xem nó.
  - `BookingDrawer` (`SlideOver`, prev/next trong trang đang xem, không gọi API thêm vì dữ liệu đã
    nằm sẵn trong dòng): Booking này (bản sao lịch, chi nhánh, phòng·ca, địa điểm, người tạo,
    `grossProfit`, `extInfo`) · Khách hàng · Dòng dịch vụ · Phiếu thu · Buổi chụp (buổi 1 tô tint vì
    nó là nguồn của bản sao cấp trên) · Nhân sự thuê ngoài · Album khách · Ghi chú (cắt 3 dòng, mở
    tại chỗ, nhãn theo `audience`) · Chẩn đoán · Id kỹ thuật (copy raw id).
    Ba khối tiền đặt **số lưu sẵn cạnh tổng của danh sách sinh ra nó** (`contractTotal` ↔ `items[]`,
    `paidAmount` ↔ `payments[]`, `costTotal` ↔ `freelancers[]`), không cờ, không màu phán xét.
    Dòng đã xóa chỉ còn nửa `admin`: bốn cột tổng hợp đứng một mình, người xóa, chẩn đoán, id.
  - Rỗng: chưa có booking nào → `EmptyState` + link tab Thành viên; lọc không ra gì → `EmptyState` +
    "Xóa bộ lọc".
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
| `useAdminBookings(id, params)` | `GET …/{id}/bookings` | `[…,'detail',id,'bookings',params]` | |
| `useAdminBookingSummary(id, window)` | `GET …/{id}/bookings/summary` | `[…,'detail',id,'bookings','summary',window]` | |
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
- Booking: route nằm dưới `/workspaces/{id}/` là **bắt buộc**, đúng hình dạng đó backend mới giải
  mã id và đặt `TenantContext` (sàn tenant của lượt đọc).
- Mỗi dòng **hai nửa**. `booking` là `BookingResponse` của tenant nguyên văn (types ở
  `src/types/booking.ts`), dựng bằng đúng mapper ERP của studio gọi; `admin` là overlay chỉ CMS mới
  có. Không cắt bỏ gì: đối chiếu một workspace với thứ chủ nó thấy thì không làm được từ bản đã bôi
  đen. Hệ quả phải nói thẳng, kênh này để lộ tên, điện thoại, email khách và toàn bộ số tiền của mọi
  tenant, chỉ chắn bằng allowlist một tài khoản (ruling của owner 2026-09-07).
- `booking === null` với dòng đã xóa mềm: xóa booking là tombstone cả cây con. Mọi chỗ đọc phải kiểm
  tra bằng truthy, đừng so `=== null` (backend `@JsonInclude(NON_NULL)` bỏ hẳn trường null).
- Màn này **không phán xét dữ liệu**: bỏ hẳn khối `consistency`/`inconsistent` của bản trước (cùng
  ruling 2026-09-07, nó chạy bốn truy vấn con tương quan mỗi booking). Thay vào đó đặt số lưu sẵn
  cạnh danh sách sinh ra nó và để người đọc tự trừ, không cờ, không màu.
- `deleted` đếm riêng, không bao giờ cộng vào `total`. Trạng thái không có booking thì **vắng mặt**
  khỏi `byStatus`, không phải 0; `byRevenueMonth` bỏ qua booking chưa suy ra tháng nên nó chỉ bằng
  `total` khi mọi dòng đều có khóa tháng, chênh lệch phải nói ra chứ không im lặng.
- `search` khớp tên khách / số điện thoại, hoặc là mã booking khi chuỗi toàn chữ số và không bắt đầu
  bằng 0, đúng luật danh sách booking của tenant dùng. `from` bao gồm, `to` **loại trừ**.
- `bkOnly=unstaffed` lọc **phía client trên trang đang xem**: API danh sách không có tham số nào
  theo chỗ trống nhân sự. Bề mặt phải nói rõ điều đó.
- Sort booking chỉ `createdAt`, `startAt`, `status`; `AdminSort` gạt bỏ mọi key khác.
- `?from=` chỉ là bộ nhớ đường về, không phải state của màn chi tiết: đọc bằng `useReturnHref`,
  không parse ra để lọc gì thêm; vào thẳng bằng link ngoài (không có `from`) vẫn phải chạy đúng.

## Types

`src/types/admin.ts`: `AdminWorkspaceRow`, `AdminWorkspaceDetail`, `AdminMembership`,
`AdminSubscriptionRow`, `GrantSubscriptionInput`, `AdjustSubscriptionInput`, `CancelSubscriptionInput`,
`AdminBookingRow`, `AdminBookingMeta`, `AdminBookingTotals`, `AdminBookingSummary`,
`AdminBookingListParams`. Nửa tenant của một dòng booking nằm ở `src/types/booking.ts`
(`BookingResponse` và cây con của nó, `BookingStatus`, `BookingPaymentStatus`).
