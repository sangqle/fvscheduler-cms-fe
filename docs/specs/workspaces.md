# Workspaces

Updated: 2026-10-28 · Thiết kế: CMS-01..04, CMS-08 · Backend: `ADM-FLOW-02, 03, 05, 06, 11`

## Mục đích

Duyệt mọi workspace xuyên tenant, xem chi tiết (gói, quota, ghi đè, booking, album khách, thành viên,
lịch sử gói) và thực hiện 3 thao tác ghi: cấp gói / trial, gia hạn, hủy gói. Booking, album khách,
thành viên và ghi đè chỉ đọc.

## Màn hình

### `/workspaces` (CMS-01)
- `WorkspaceListScreen` → `WorkspaceFilters` + `WorkspaceTable` (DataTable, phân trang server).
- Hàng lọc một dòng (`flex-wrap`): ô tìm co giãn · `FilterSelect` Loại / Trạng thái gói / Gói (rộng
  theo nội dung, dấu check bên phải theo convention `Select`) · nút Xóa bộ lọc khi đang lọc. Sắp xếp là `WorkspaceSortControl` trong `PageHeader actions`.
- URL: `?q=&type=&subscriptionStatus=&planCode=&sort=createdAt,desc|name,asc&page=&size=15`
  (`useUrlState`; đổi filter reset `page`). Ô tìm debounce 500ms qua `useDebouncedSearch` (dùng chung mọi ô tìm; bỏ qua lần URL dội về từ chính lần commit nên không nuốt ký tự đang gõ).
- Cột: ô tích chọn · `rawId` (khóa số của `workspace.id`, `RawId`) · Workspace (tên, loại, id
  ngắn) · Chủ sở hữu (tên, email hoặc "Chưa có tài khoản đăng
  nhập") · TV · CN · Booking (`counts.bookings`:
  booking chưa xóa mềm, mọi trạng thái kể cả đã hủy; số 0 lùi màu để quét nhanh workspace chưa có
  booking nào) · Gói hiện tại (tên + badge nguồn + mã, hoặc "Chưa từng có gói") · Trạng thái ·
  Hết hạn (giờ + "còn/quá N ngày", đỏ khi quá, cam ≤ 7 ngày) · Tạo lúc.
- Click hàng → `/workspaces/{id}?from=<query hiện tại đã encode>` (`detailHref`), để nút quay lại ở
  chi tiết trả đúng trang/bộ lọc đang xem. Rỗng sau lọc → `EmptyState` + "Xóa bộ lọc" (ghi chú PAST_DUE).
- **Gửi mail hàng loạt** (thao tác ghi duy nhất của màn này): tích các hàng rồi bấm "Gửi email (N)"
  trên thanh hiện ra giữa bộ lọc và bảng, mở `CreateCampaignDialog` với `initialWorkspaceIds`. Mail
  đi tới **chủ sở hữu** của từng workspace, một tài khoản đứng tên nhiều workspace chỉ nhận một mail.
  Ô tích của hàng và của đầu bảng đều `stopPropagation`, nếu không thì mỗi lần chọn là điều hướng
  sang trang chi tiết. Lựa chọn **sống xuyên trang và xuyên bộ lọc** vì cách dùng thật là lọc nhiều
  đợt rồi gửi một lần; đổi lại thanh luôn hiện số đang chọn kèm nút "Bỏ chọn", để không gửi nhầm
  những id đã tích dưới một bộ lọc không còn thấy trên màn hình.

### `/workspaces/[workspaceId]` (CMS-02..04)
- `WorkspaceDetailScreen`: header (back về `useReturnHref('/workspaces')`, tức `?from=` nếu vào từ
  danh sách, còn không thì `/workspaces` trơn; tên, loại, badge trạng thái, id copy, tạo lúc, chủ sở
  hữu, nút "Xem đơn hàng của workspace" → `/orders?workspaceId=`), Tabs qua
  `?tab=overview|booking|albums|members|history` (tab Booking mang `TabsCount` = `stats.bookings`; tab
  Album khách không có số đếm, vì số album do framevis-drive tính mà dải tab nằm ngoài các tab nên không
  được đợi nó).
- 404 → `NotFoundState` ("Không tìm thấy workspace này", không tiết lộ id).
- **Tổng quan** `OverviewTab`: thẻ Gói hiện tại (tên, badge status/source, mã + giá từ catalog,
  Bắt đầu/Hết hạn, chế độ readOnly) + 3 nút: Cấp gói (luôn bật), Gia hạn và Hủy gói (bật khi
  status ≠ NONE); Quota (mỗi key trong `entitlement.limits ∪ unlimitedKeys`: usage/limit,
  `MeterBar`, cam khi chạm trần, ghi chú override; usage `null` hay vắng key đều là chưa đo: ô usage
  hiện dấu gạch ngắn, không thanh, không "còn N"; riêng dòng `ALBUMS_PER_MONTH` xem bên dưới); Ghi đè (limitOverrides,
  itemOverrides, chỉ đọc); Chủ sở hữu; Thống kê nhanh (booking, khách, TV, CN trong lưới 2 cột, rồi
  hàng Album khách riêng chiếm cả hàng; **chỉ** ô Booking và ô số album sống của hàng đó là link, sang
  `?tab=booking` và `?tab=albums`); Tính năng (`entitlement.features`).
  - Số liệu album của tab này đi bằng MỘT query riêng (`useAdminWorkspaceAlbumSummary`), không đi chung
    với chi tiết workspace: route chi tiết không bao giờ gọi framevis-drive, nên trang và các con số khác
    không đợi nó, và lỗi của nó chỉ làm hỏng đúng hai chỗ dưới đây.
  - Ô `AlbumQuickStat` (hàng cuối thẻ Thống kê nhanh): **Album khách** (album còn sống, kèm "N đã xóa"
    nhỏ khi từng xóa; đây là ô link sang `?tab=albums`) · **Tạo tháng này** (`createdThisMonth`, kèm
    "N đã xóa" khi `deletedThisMonth` > 0, InfoTip nói đây là số ERP dùng để khóa nút Tạo album mới) ·
    **Gần nhất** (`lastCreatedAt`, chỉ ngày `dd/MM/yyyy`, ô trống khi null). "Chưa dùng" (không link)
    chỉ khi album còn sống = 0 **và** đã xóa = 0; 0 album còn sống mà từng xóa thì vẫn in 0 kèm số đã xóa.
    Loading = `AlbumQuickStatSkeleton`; error = `Alert` "Không tải được số liệu album khách" + message
    backend + nút "Thử lại" ngay trong hàng.
  - Dòng quota `ALBUMS_PER_MONTH` ("Album mỗi tháng") lấy usage từ `createdThisMonth` của cùng lượt gọi:
    có số thì chạy như các dòng khác (thanh + "còn N" khi có limit, số trên "Không giới hạn" khi không).
    Đang chờ hoặc lỗi thì về chưa đo (ô usage hiện dấu gạch ngắn, không `MeterBar`, không "còn N") kèm InfoTip nói vì sao
    ("Đang lấy số album đã tạo trong tháng từ dịch vụ album." hoặc "Chưa lấy được số album đã tạo trong
    tháng." + message backend), kể cả khi lỗi là của một lần tải lại sau khi đã có số, để ô thống kê và
    dòng quota không bao giờ lệch nhau. Không đọc `usage.ALBUMS_PER_MONTH` của response chi tiết: nó luôn
    null, có chủ đích.
- **Booking** `BookingTab` (chỉ đọc, hai endpoint, không một thao tác ghi nào):
  - `BookingSummaryStrip` đầu tab: ba ô bấm được total / deleted / unstaffed (`deleted` ghi rõ
    "ngoài N" vì nó không cộng vào `total`), cột `byRevenueMonth` kèm cảnh báo khi tổng các tháng
    thiếu so với `total`, rồi dải chip `byStatus` chỉ liệt kê trạng thái thật sự có booking.
    Bấm total = xóa bộ lọc, deleted = bật `includeDeleted`, unstaffed = lọc client.
  - Hàng lọc: ô tìm (`search`, debounce 500ms, khớp tên khách / số điện thoại / mã booking) ·
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
    nằm sẵn trong dòng): Thông tin chung (lịch chụp, chi nhánh, phòng và ca lấy theo buổi chính, địa
    điểm, người tạo, lãi gộp, dữ liệu tích hợp = `extInfo`) · Khách hàng (tên, điện thoại, email, chi
    nhánh, id) · Dịch vụ · Phiếu thu · Buổi chụp (buổi chính tô tint vì lịch ở Thông tin chung lấy từ
    nó) · Nhân sự thuê ngoài · Album khách · Ghi chú (cắt 3 dòng, mở tại chỗ, nhãn theo `audience`) ·
    Tháng báo cáo (ngày chụp ↔ tháng chụp, xác nhận ↔ tháng ký, hoàn tất ↔ tháng ghi nhận) · Id trong
    cơ sở dữ liệu (chép id số).
    Ba khối tiền đặt **số lưu sẵn cạnh tổng của danh sách sinh ra nó** (`contractTotal` ↔ `items[]`,
    `paidAmount` ↔ `payments[]`, `costTotal` ↔ `freelancers[]`), không cờ, không màu phán xét.
    Dòng đã xóa chỉ còn nửa `admin`: số tiền đã lưu đứng một mình, thông tin xóa, tháng báo cáo, id.
  - Rỗng: chưa có booking nào → `EmptyState` + link tab Thành viên; lọc không ra gì → `EmptyState` +
    "Xóa bộ lọc".
- **Album khách** `AlbumsTab` (chỉ đọc, một endpoint: dải tổng và bảng về cùng một lượt; chạy ngay khi tab
  mở vì một workspace là rẻ, không có nút bấm). Vào tab từ ô thống kê (không kèm khoảng) và từ mọi dòng
  workspace sống của màn [Album khách](./client-albums.md) (kèm khoảng ngày của bảng đó):
  - `AlbumTotalsStrip` đầu tab ("Tổng cộng" + câu nói khoảng đang tính): Album · Ảnh · Dung lượng (luôn kèm
    độ phủ) · Dung lượng album cho phép tải · Album NAS chưa rõ dung lượng, phủ MỌI album còn sống của
    khoảng chứ không chỉ trang đang xem; cuối dải là chú thích mức trần của GB. Khoảng không có album nào
    thì bỏ dải (toàn số 0) và để trạng thái rỗng nói.
  - Hàng lọc: `DateRangePicker` ngày tạo album ("Ngày tạo album: toàn bộ") · nút Xóa bộ lọc khi đang lọc ·
    `ReadOnlyHint` đẩy phải.
  - URL (tiền tố `al`, cùng lý do như `bk`): `?alFrom=&alTo=&alPage=&alSize=`. `alFrom`/`alTo` là `yyyy-MM-dd`,
    ngày lịch Việt Nam, cả hai đầu **bao gồm** (khác `bkTo` loại trừ): ngày trên URL chính là ngày gửi API.
    `alPage` 0-based, `alSize` thuộc 20|30|40|50 (mặc định 20 thì bỏ khỏi URL, giá trị lạ về 20). Đổi
    khoảng tự về trang đầu; `alPage` quá cuối (album bị xóa nên ít trang đi) cũng tự về trang đầu.
  - `DataTable` phân trang server (`mobileCards`), mới nhất trước, thứ tự cố định, không ô sắp xếp. Cột: Tên
    album ("Chưa đặt tên" nghiêng, nhạt khi trống) · Khách (ô trống khi không có) · Trạng thái (nguyên văn
    chữ hoa mono của spring-a7c trong `Badge` outline, null thì ô trống nhạt) · Drive / NAS (`EnumBadge`) ·
    Tạo lúc (`dd/MM/yyyy HH:mm`, giờ tường Việt Nam) · Ảnh · Dung lượng (`AlbumSizeCell`: GB kèm "N/M ảnh
    có dung lượng", hoặc "Chưa rõ dung lượng") · Cho tải về (`Badge` mono: "True" `success`, "False" `muted`;
    ruling của owner 2026-10-28). Không cột booking liên kết, không công tắc "hiện cả đã xóa".
  - Rỗng: workspace chưa có album còn sống nào → `EmptyState` "Workspace này chưa có album khách nào"; lọc
    không ra gì → `EmptyState` + "Xóa bộ lọc". Lỗi → `ErrorState` + "Thử lại" (lúc thử lại hiện
    `AlbumTableSkeleton`, hàng lọc vẫn dùng được); đổi khoảng hay trang thì giữ dữ liệu cũ, mờ đi.
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

**Chuyển tab cũng phải có khung xương.** Booking / Album khách / Thành viên / Lịch sử gói chỉ mount khi
được chọn và mỗi tab tự gọi API của mình, nên mỗi lần bấm sang là một lượt tải mới: dùng
`BookingTabSkeleton` · `AlbumsTabSkeleton` · `MembersTabSkeleton` · `HistoryTabSkeleton` ở nhánh
`isPending` của từng tab. Tab Booking đợi **cả hai** truy vấn (danh sách + summary) rồi hiện một lần,
thay vì để dải tóm tắt, hàng lọc và bảng nhỏ giọt ra ba nhịp (tab Album khách chỉ có một truy vấn, dải
tổng và bảng về cùng lượt). Header và dải tab nằm ngoài, chúng đã tải xong nên không được nháy lại;
sau lượt đầu `keepPreviousData` giữ dữ liệu cũ nên đổi bộ lọc không rơi lại vào khung xương.

## Hooks ↔ API

| Hook | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useAdminWorkspaces(params)` | `GET /api/admin/workspaces` | `['admin','workspaces','list',params]` | |
| `useAdminWorkspace(id)` | `GET /api/admin/workspaces/{id}` | `['admin','workspaces','detail',id]` | |
| `useAdminMemberships(id, params)` | `GET …/{id}/memberships` | `[…,'detail',id,'members',params]` | |
| `useAdminSubscriptionHistory(id)` | `GET …/{id}/subscriptions` | `[…,'detail',id,'subscriptions']` | |
| `useAdminBookings(id, params)` | `GET …/{id}/bookings` | `[…,'detail',id,'bookings',params]` | |
| `useAdminBookingSummary(id, window)` | `GET …/{id}/bookings/summary` | `[…,'detail',id,'bookings','summary',window]` | |
| `useAdminWorkspaceAlbumSummary(id)` | `GET …/{id}/client-albums/summary` | `[…,'detail',id,'client-albums','summary']` | |
| `useAdminWorkspaceAlbums(id, params)` | `GET …/{id}/client-albums` | `[…,'detail',id,'client-albums','list',params]` | |
| `useGrantSubscription(id)` | `POST …/{id}/subscriptions` (201) | | detail + list |
| `useExtendSubscription(id)` | `PATCH …/{id}/subscription` | | detail + list |
| `useCancelSubscription(id)` | `POST …/{id}/subscription/cancel` | | detail + list |

Invalidate `detail(id)` cũng bắt lịch sử/thành viên và hai query album vì key lồng dưới nó. Hai query album
hỏi framevis-drive qua ERP nên `retry: false` và `timeoutMs` 45 giây (lý do ở [client-albums.md](./client-albums.md)).

## Rule FE phải giữ

- Nhãn trong `BookingDrawer` viết bằng tiếng Việt nghiệp vụ, **không lộ tên trường API**
  (`items[]`, `unitPriceSnapshot`, `grossProfit = …`): người đọc là người vận hành, không phải người
  đọc code. Enum backend (`PACKAGE`, `PROOFING`, mã vai trò) vẫn giữ chữ hoa mono.
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
- Số liệu album do framevis-drive tính nên tách hẳn khỏi route chi tiết: ô Album khách, dòng quota
  `ALBUMS_PER_MONTH` và tab Album khách mỗi chỗ có trạng thái lỗi riêng, một lần 503 chỉ làm hỏng đúng chỗ
  đó. Ô thống kê và dòng quota dùng chung đúng một query; không bao giờ gọi hai route album theo từng dòng
  của một bảng. Danh sách `/workspaces` không có cột hay bộ lọc album.
- Quota `ALBUMS_PER_MONTH` đo album CÒN SỐNG tạo trong tháng Việt Nam hiện tại (xóa một album là trả lại một
  chỗ), nên khác số "Album tạo mới" của tab Theo tháng ở [Album khách](./client-albums.md), vốn đếm cả album
  đã xóa về sau.
- Tab Album khách: không dùng `from` cho một ngày (`alFrom`/`alTo` mới là khóa ngày); `createdAt` và
  `lastCreatedAt` là giờ tường Việt Nam không offset, chỉ in bằng `formatNaiveVnDateTime` /
  `formatNaiveVnDate`; mọi con số GB đi qua `describeSize` (một luật, độ phủ đi kèm, "Chưa rõ dung lượng"
  chứ không "0 GB"), xem [client-albums.md](./client-albums.md). Chỉ album còn sống, không cột booking, không
  công tắc hiện album đã xóa (quyết định đã chốt khi thiết kế).
- `?from=` chỉ là bộ nhớ đường về, không phải state của màn chi tiết: đọc bằng `useReturnHref`,
  không parse ra để lọc gì thêm; vào thẳng bằng link ngoài (không có `from`) vẫn phải chạy đúng.

## Types

`src/types/admin.ts`: `AdminWorkspaceRow`, `AdminWorkspaceDetail`, `AdminMembership`,
`AdminSubscriptionRow`, `GrantSubscriptionInput`, `AdjustSubscriptionInput`, `CancelSubscriptionInput`,
`AdminBookingRow`, `AdminBookingMeta`, `AdminBookingTotals`, `AdminBookingSummary`,
`AdminBookingListParams`, `AdminWorkspaceAlbumSummary`, `AdminWorkspaceAlbums`, `AdminWorkspaceAlbumRow`,
`AdminWorkspaceAlbumListParams`, `AdminAlbumStorageFigures` (phần `totals` của `AdminWorkspaceAlbums`),
`ClientAlbumProvider`. Nửa tenant của một dòng booking nằm ở `src/types/booking.ts`
(`BookingResponse` và cây con của nó, `BookingStatus`, `BookingPaymentStatus`). Nhãn nhà cung cấp album:
`CLIENT_ALBUM_PROVIDER` ở `src/lib/admin/labels.ts`; luật dung lượng, khóa URL `al*` và `workspaceAlbumsHref`:
`src/lib/admin/clientAlbums.ts`.
