# Album khách

Updated: 2026-10-28 · Thiết kế: chưa có mockup · Backend: `ADM-FLOW-11-read-client-album-stats` (kiểu TypeScript và
ghi chú ngữ nghĩa ở `../fvscheduler/docs/features/admin/technical/fe-integration.md`)

## Mục đích

Chủ nền tảng đo mức dùng album khách lần đầu để ước chi phí. Album sống ở dịch vụ framevis-drive, ERP chỉ chuyển
tiếp, nên mọi con số do framevis-drive tính ngay lúc gọi, không có bộ đếm lưu sẵn. Framevis không lưu ảnh: ảnh gốc
nằm ở Google Drive hoặc NAS của nhiếp ảnh gia, và mỗi lần khách tải ảnh gốc thì dữ liệu chạy qua máy chủ Framevis.
Chi phí cần ước là băng thông tải xuống, nên GB của một album là **mức trần cho một lần khách tải trọn bộ**; hệ thống
chưa đếm lượt tải, người vận hành tự nhân GB với số lượt tải.

Ba câu hỏi, đều chỉ đọc: (1) mỗi tháng tạo bao nhiêu album và workspace nào tạo (tab Theo tháng); (2) album tạo trong
một khoảng ngày đang giữ bao nhiêu GB (tab Dung lượng, chỉ tính khi bấm); (3) một workspace có dùng album khách không và
là những album nào (ô thống kê, dòng quota và tab Album khách trong chi tiết workspace, xem [workspaces.md](./workspaces.md)).

**Không có** (đều là quyết định đã chốt khi thiết kế): thao tác ghi nào, cột hay bộ lọc album ở danh sách workspace,
cột booking liên kết hay công tắc hiện album đã xóa ở tab của workspace, đếm lượt tải, biểu đồ, polling.

## Màn hình

### `/client-albums`
- `ClientAlbumScreen`: `PageHeader` "Album khách" (câu mô tả đổi theo tab) + hai tab `?tab=monthly|storage` (mặc định
  `monthly` thì bỏ khỏi URL, giá trị lạ về `monthly`). Mỗi tab chỉ mount khi được chọn, nên tab Theo tháng không bao giờ
  đụng route Dung lượng; bản thân tab Dung lượng cũng không gọi gì khi mở (xem bên dưới). Khóa URL tách theo tab (`m…`,
  `s…`) để đổi tab không mất bộ lọc của tab kia; hằng số ở `clientAlbumTabs.ts`. Mỗi tab, bảng và khung có trạng thái
  riêng, nên một lần 503 chỉ làm hỏng đúng chỗ đó.
- Loading: `page.tsx` bọc `Suspense` với `loading.tsx`, cả hai là `ClientAlbumSkeleton` (tên màn và nhãn tab là chữ thật,
  thân là khung xương tab Theo tháng). Khung xương các khối còn lại ở `ClientAlbumSkeletons.tsx`, header cột khớp bảng thật.

#### Tab "Theo tháng" (`MonthlyTab`)
- Một lượt gọi rẻ, chạy ngay khi tab mở. URL: `?mFrom=&mTo=` (`yyyy-MM`) · `month=` (tháng đang mở khung workspace) ·
  `mPage=&mSize=` (trang 0-based, cỡ 10|20|50, mặc định 20 thì bỏ khỏi URL, giá trị lạ về 20).
- **Mặc định 6 tháng gần nhất**, tính cả tháng này theo giờ Việt Nam (`DEFAULT_MONTH_COUNT`, `defaultMonthRange` ở
  `monthlyFilters.ts`; ruling của owner 2026-10-28). CMS gửi `fromMonth`/`toMonth` tường minh, không dựa mặc định 12 tháng
  của backend và không theo múi giờ máy người xem. URL chỉ mang `mFrom`/`mTo` sau khi admin đổi khoảng và luôn ghi cả hai;
  một khóa lẻ, khóa sai dạng hoặc đầu vượt cuối thì coi như không có và về mặc định.
- Hàng lọc gọn một dòng: hai `ChoiceSelect` cỡ nhỏ (`size="sm"`) "Từ" và "Đến", liệt kê 36 tháng gần nhất cộng tháng đang
  chọn (mới nhất trước, nhãn `MM/yyyy`). Chọn "Từ" vượt "Đến" thì kéo "Đến" theo, và ngược lại, nên không bao giờ gửi khoảng
  ngược. Nút "6 tháng gần nhất" (về mặc định và đóng khung workspace) chỉ hiện khi khoảng đã đổi. Đổi khoảng mà tháng đang
  mở rơi ra ngoài thì cũng đóng khung. `ReadOnlyHint` "Chỉ đọc" đẩy phải.
- `MonthlyTable` (`DataTable`, `mobileCards`): mỗi tháng một dòng, cũ nhất trước, rồi dòng **Tổng**. Cột: Tháng (nút dạng
  link "Tháng MM/yyyy") · Album tạo mới (InfoTip: đếm lượt tạo kể cả album đã xóa về sau, nên có thể cao hơn số mà hạn mức
  hằng tháng của một workspace đang tính) · Thuộc workspace · Không thuộc workspace (InfoTip) · Google Drive · NAS · Đã xóa
  sau đó (InfoTip, số 0 lùi màu). Chỉ in số, không thanh so sánh (ruling của owner 2026-10-28). Dòng tháng đang mở tô nhạt,
  dòng Tổng không bấm được.
- Bấm một tháng (nút hoặc cả hàng) ghi `month`, đưa `mPage` về trang đầu và cuộn tới khung workspace (chỉ khi chính admin vừa
  bấm; mở link có sẵn `month` thì không cuộn). Khung hiện ngay dưới bảng, trên cùng trang: không drawer, không trang mới.
- `MonthWorkspacesPanel`: "Workspace tạo album trong Tháng MM/yyyy" + nút Đóng. Gọi `workspaces` với `from`/`to` là ngày đầu
  và ngày cuối của tháng (số học lịch trên chuỗi `yyyy-MM`, `monthDayKeys`), nhiều album nhất trước, phân trang server. Cột:
  Workspace (`AlbumWorkspaceCell`) · Gói (`PlanCell`) · Album tạo · Đã xóa sau đó. Đổi tháng hay trang thì khung mờ đi
  (`keepPreviousData`); trang quá cuối (link cũ) tự về trang đầu. Bấm dòng hoặc tên workspace mở tab Album khách của workspace
  với khoảng là chính tháng đó.
- Trạng thái tab: loading = `MonthlyTabSkeleton` lượt đầu (hàng chọn + bảng 7 dòng), sau đó giữ bảng cũ mờ đi · empty = "Chưa có
  album nào được tạo trong khoảng này" · error = `ErrorState` + "Thử lại" (đang thử lại thì hiện khung xương bảng, hàng chọn
  tháng vẫn dùng được). Khung workspace có đủ bốn trạng thái riêng: skeleton · empty khi tháng không có album (**không gọi route**)
  hoặc danh sách trống · error cục bộ (bảng tháng bên trên đứng nguyên) · data.

#### Tab "Dung lượng" (`StorageTab`)
- Route đắt nhất của module (backend quét mọi ảnh còn sống của album trong khoảng): **chỉ một lần bấm "Tính dung lượng" rồi xác
  nhận mới gọi**. URL chỉ nhớ bộ lọc đang soạn: `?sFrom=&sTo=` (`yyyy-MM-dd`, ngày lịch Việt Nam, cả hai đầu bao gồm) · `sAll=1`
  (toàn bộ thời gian, khoảng mở) · `sWs=` (id mờ `wk…` của một workspace). Vắng cả `sFrom`, `sTo` và `sAll` là **tháng này tới hôm
  nay**, không phải khoảng mở: khoảng mở quét nhiều nhất nên phải do người dùng chọn rõ.
- `StorageFilterCard`: "Ngày tạo album" = `SegmentedControl` Tháng này · Tháng trước · Toàn bộ thời gian + `DateRangePicker` (bỏ trống
  cả hai đầu cũng là toàn bộ thời gian) · "Workspace" = `Combobox` tìm theo tên trên 100 workspace đầu (xếp theo tên), có dòng
  "Mọi workspace", nhận id `wk…` dán tay cho workspace ngoài danh sách (sai dạng thì báo ngay dưới ô và không ghi gì, vì backend sẽ
  trả 400) · nút "Tính dung lượng" (khóa kèm `Spinner` khi đang tính) mở `ConfirmDialog` nói rõ cái giá: quét toàn bộ ảnh, có thể mất
  vài chục giây, 10 lần mỗi phút, chỉ tính album còn sống. Sửa bộ lọc chỉ ghi URL, không gọi API. (Ô workspace tự đọc danh sách
  workspace của ERP để có gì mà chọn; đó là CSDL của ERP, không phải framevis-drive.)
- Một lượt tính = **đúng một request** (`page=0`, `size=100`, `ALBUM_STORAGE_ROW_LIMIT`), bảng phân trang ở máy. Bấm lại đúng bộ lọc
  đang hiện là `refetch`; bộ lọc khác là khóa mới, xóa cache của khóa đó trước để không lặng lẽ trả số cũ. Cả hai đều là một lần quét thật.
- Lượt tính gần nhất (`StorageRun`) do `ClientAlbumScreen` giữ chứ không phải tab, nên kết quả sống qua việc đổi tab (đọc từ cache,
  không gọi lại). Lúc mở màn, bộ lọc trên URL khớp một kết quả đang có trong cache thì hiện lại luôn (`cachedStorageRun`, chỉ đọc
  cache), để bấm Back từ chi tiết workspace không phải quét lại.
- Kết quả (`StorageResult`): dòng "Tính lúc <ngày giờ Việt Nam> · Ảnh có dung lượng: N%" (kèm nhắc khi bộ lọc đang soạn đã khác kết quả)
  · `AlbumTotalsStrip` (dùng chung với tab của workspace, phủ MỌI workspace của khoảng, ghi rõ khoảng và workspace lúc BẤM) · "Dung lượng
  theo workspace" (`StorageTable`): Workspace · Gói · Album (kèm "N album NAS" khi có) · Ảnh · Dung lượng · Dung lượng album cho phép
  tải · Độ phủ (chỉ phần trăm, ô trống khi không có ảnh). Nặng nhất trước, kể cả dòng "Không thuộc workspace"; phân trang ở máy
  20|50|100 (mặc định 20), về trang đầu sau mỗi lượt tính. Bấm dòng hoặc tên mở tab Album khách của workspace với khoảng ngày mà kết quả
  này ĐÃ ĐƯỢC TÍNH (không phải bộ lọc đang sửa). `rows.totalElements` lớn hơn 100 thì nói thẳng "Chỉ liệt kê N workspace có dung lượng
  lớn nhất trong tổng số M. Các con số tổng ở trên vẫn tính cho tất cả."; không tự gọi thêm trang.
- Trạng thái: idle (chưa bấm, hoặc vừa bị 429) = `EmptyState` "Chưa tính dung lượng", không phải khung xương · pending =
  `StorageResultSkeleton` (có dòng "Đang quét ảnh ... có thể mất vài chục giây") + nút khóa · error = `ErrorState` ("Thử lại" chạy
  lại đúng bộ lọc đó) · empty = "Không có album nào còn sống trong khoảng này" (bỏ dải tổng toàn số 0) · data. Với 429, toast chung
  của app đã nói nên về idle và mở lại nút, không thêm khung lỗi thứ hai. Tính lại đúng bộ lọc cũ giữ số cũ, mờ đi, tới khi số mới về.

### Trong chi tiết workspace
Ba chỗ, mỗi chỗ gọi riêng và lỗi riêng, mô tả đầy đủ ở [workspaces.md](./workspaces.md): ô "Album khách" ở Thống kê nhanh và dòng
quota "Album mỗi tháng" (chung một lượt gọi `workspaceSummary`), và tab "Album khách" (`?tab=albums`, lượt gọi `workspaceAlbums`).

## Hooks ↔ API

| Hook (`src/hooks/useAdminClientAlbums.ts`) | Method · path | Query key (`clientAlbumKeys`) | Invalidate sau ghi |
|---|---|---|---|
| `useAdminAlbumMonthly(params)` | `GET /api/admin/client-albums/monthly?fromMonth=&toMonth=` | `monthly(params)` | |
| `useAdminAlbumWorkspaces(params, { enabled })` | `GET /api/admin/client-albums/workspaces?from=&to=&page=&size=` | `workspaces(params)` | |
| `useAdminAlbumStorage(params)` | `GET /api/admin/client-albums/storage?from=&to=&workspaceId=&page=&size=` | `storage(params)` | không bao giờ (xem Rule) |
| `useAdminWorkspaceAlbumSummary(id)` | `GET /api/admin/workspaces/{id}/client-albums/summary` | `workspaceSummary(id)` | cuốn theo `detail(id)` |
| `useAdminWorkspaceAlbums(id, params)` | `GET /api/admin/workspaces/{id}/client-albums?from=&to=&page=&size=` | `workspaceAlbums(id, params)` | cuốn theo `detail(id)` |

Module không có thao tác ghi. Ba khóa toàn nền tảng nằm dưới `['admin','client-albums', …]` (`clientAlbumKeys.all`); hai khóa của workspace
lồng dưới `workspaceKeys.detail(id)` như `bookingKeys`, nên cấp / gia hạn / hủy gói (invalidate `detail(id)`) làm mới luôn ô thống kê và tab.
Đường dẫn hai route con phải nằm dưới `/api/admin/workspaces/{id}/` (backend chỉ giải mã id và đặt tenant đúng hình dạng đó).
`keepPreviousData` ở `monthly`, `workspaces` và `workspaceAlbums`; `workspaces` với `enabled: false` (tháng không có album) trả `data` là
`undefined`, không mượn hàng của tháng trước. `storage(null)` là chờ, không request. Màn Theo tháng luôn truyền cả `fromMonth` và `toMonth`.

## Rule FE phải giữ

- **Hai cách đếm, không trộn.** Tab Theo tháng và khung workspace trong tháng đếm SỰ KIỆN TẠO: album tạo hồi tháng 10 rồi xóa vẫn nằm
  ở tháng 10 và được đếm thêm ở "Đã xóa sau đó". Tab Dung lượng và danh sách album của workspace chỉ đếm album và ảnh CÒN SỐNG. "Tạo
  tháng này" của workspace theo luật hạn mức của studio (album còn sống, đúng số ERP web dùng để khóa "Tạo album mới", xóa một album là
  trả lại một chỗ) nên có thể thấp hơn "Album tạo mới" của cùng tháng; màn nói rõ điều đó ở chú thích cột.
- **GB không bao giờ chính xác.** Dung lượng một ảnh do Google Drive báo; ảnh NAS không bao giờ có, một số album Drive cũ cũng thiếu.
  `bytes` chỉ cộng ảnh có dung lượng nên là mức sàn: mọi số GB đi kèm độ phủ `sizedPhotos / photos`, không đoán, không ước lượng theo
  trung bình. Byte trên dây là byte thô; GB là **thập phân** (`bytes / 1e9`, băng thông CDN tính theo GB thập phân, không phải 2^30), kiểu
  vi-VN hai số lẻ ("12,35 GB"), khác 0 mà dưới 0,005 GB thì "< 0,01 GB".
- **Một luật hiển thị dung lượng** (`describeSize` ở `lib/admin/clientAlbums.ts`, qua `AlbumSizeCell` và `AlbumTotalsStrip`): không có ảnh
  là "0 GB"; có ảnh mà chưa ảnh nào có dung lượng là "Chưa rõ dung lượng" (nghiêng, nhạt, **không bao giờ** "0 GB"); một phần là GB (mức
  tối thiểu) + dòng phụ "N/M ảnh có dung lượng"; đủ là GB. Độ phủ % làm tròn không nói dối (chưa đủ thì không ra 100, đã có thì không ra
  0; không có ảnh thì ô trống). Ô "Dung lượng" của dải tổng luôn kèm độ phủ, kể cả khi 100%. Dải tổng luôn có chú thích mức trần
  (`STORAGE_CAPTION`): ảnh gốc, Framevis không lưu ảnh, một lần khách tải trọn bộ.
- **Route Dung lượng chỉ chạy khi bấm** (không request lúc mở tab, tải lại, dán link; sửa bộ lọc không tự tính lại). `useAdminAlbumStorage(null)`
  là chờ (`skipToken`): **đừng gọi `refetch()` ở trạng thái đó** (bị từ chối "Missing queryFn"). Query đặt `staleTime: 'static'`,
  `gcTime: Infinity`, không refetch khi mount/focus/reconnect, `retryOnMount: false`, không `keepPreviousData`. **Không đổi `'static'` thành
  `Infinity` hay một số, và không thao tác nào được invalidate `clientAlbumKeys.all` hay khóa storage** (kể cả lệnh invalidate toàn app sau khi
  làm mới token): với staleTime khác, invalidate refetch ngay query đang mở, tức một lần quét ngoài ý muốn. Mỗi trang của route là một lần quét
  lại và tốn một trong 10 lượt mỗi phút, nên xin một lần 100 hàng, phân trang ở máy, không tự gọi thêm trang.
- **Ngày "naive"**: `createdAt`, `firstCreatedAt`, `lastCreatedAt` là giờ tường Việt Nam `yyyy-MM-ddTHH:mm:ss`, KHÔNG offset (giây có thể vắng
  hoặc kèm giây lẻ), không phải mốc tuyệt đối. Chỉ in bằng `formatNaiveVnDateTime` / `formatNaiveVnDate` (tách chuỗi); không bao giờ qua
  `new Date`, `formatDate`, `formatDateTime` hay `formatVn*` vì chúng dịch theo múi giờ người xem. Chuỗi sai dạng in nguyên văn.
- **Ngày truy vấn** là ngày lịch Việt Nam `yyyy-MM-dd`, cả hai đầu **bao gồm** (một ngày thì `from = to`), khác tab Booking (`to` loại trừ). Tháng
  là `yyyy-MM`, hiện "Tháng MM/yyyy". Mọi phép tính là số học trên năm, tháng, ngày (`lib/admin/time.ts`: `calendarDayKey`, `monthDayKeys`,
  `recentMonthKeys`...), ngày từ picker lấy bằng phần ngày theo giờ máy; **không** dựng bằng `toISOString()` vì nó lệch theo múi giờ.
- **Khóa URL**: Theo tháng `mFrom` `mTo` `month` `mPage` `mSize`; Dung lượng `sFrom` `sTo` `sAll` `sWs`; tab của workspace `alFrom` `alTo` `alPage`
  `alSize` (`ALBUM_TAB_KEYS` và `WORKSPACE_ALBUM_TAB` ở `lib/admin/clientAlbums.ts`, vì hai màn cùng dùng). Không dùng khóa trần của danh sách
  workspace (`q`, `type`, `page`, `size`, `sort`...) và **không dùng `from` cho một ngày**: `from` là khóa đường về. Giá trị sai dạng coi như không có.
- **Ba loại dòng workspace** (`albumWorkspaceKind`, `AlbumWorkspaceCell`): `personal` (`workspace` null: "Không thuộc workspace" + InfoTip, không
  link); `missing` (`exists = false`: framevis-drive còn album nhưng ERP không còn workspace, hiện "Workspace không còn tồn tại" + `RawId`, không
  link); `live` (tên là link thật, `RawId` ngay dưới). Chỉ `live` mới link; bảng đánh dấu phần còn lại bằng `isRowDisabled`. Link chặn nổi bọt vì cả
  hàng cũng bấm được, không thì một lần bấm điều hướng hai lần. `PlanCell` cùng khuôn với cột Gói hiện tại của danh sách workspace và chỉ vẽ gói
  (không vẽ trạng thái): ô trống khi không có workspace sống, "Chưa từng có gói" khi `planCode` rỗng.
- **Link vào chi tiết workspace** là `detailHref(workspaceAlbumsHref(id, khoảng), searchParams)`, tức `/workspaces/{id}?tab=albums&alFrom=&alTo=&from=<query
  của màn này>` (khoảng mở thì bỏ hai khóa ngày). `useReturnHref` ghép `from` vào `/workspaces`, nên mũi tên quay lại của chi tiết vẫn về danh sách
  workspace, không về màn này; nút Back của trình duyệt mới trả đúng tab và bộ lọc, vì `useUrlState` ghi URL bằng `replaceState`.
- **Mỗi chỗ một trạng thái lỗi; mọi lượt gọi `retry: false` và `timeoutMs` 45 giây.** Backend chờ framevis-drive tới 30 giây (cộng 5 giây nối máy) rồi
  mới trả 503, dài hơn mặc định 30 giây của `apiFetch`, và bộ retry toàn app sẽ kéo lượt chờ quá một phút. Thử lại là nút "Thử lại" của khung lỗi, trong
  lúc chờ đổi thành khung xương. Lỗi giữ nguyên `message` backend (`apiErrorMessage`): 400 giá trị sai dạng (FE chặn trước id workspace sai dạng và khoảng
  tháng ngược), 404 ở hai route con khi workspace không còn, 429 (60 lượt mỗi phút mỗi route, riêng Dung lượng 10), 503 khi framevis-drive không trả lời.
- **Nhà cung cấp và trạng thái**: `provider` hiện "Drive" (info) hoặc "NAS" (secondary) qua `CLIENT_ALBUM_PROVIDER` (`labels.ts`), giá trị lạ in nguyên
  văn. `status` của album do spring-a7c giữ nên không có bảng nhãn: in nguyên chữ hoa mono, kiểu `string | null`, null thì ô trống nhạt. `AdminWorkspaceAlbumRow.id`
  là id album của framevis-drive, chỉ làm React key (không phải id mờ, không có khóa số).
- Lời văn trên màn là tiếng Việt nghiệp vụ, không lộ tên trường API trong chú thích. `ChoiceSelect` có prop `size` tùy chọn (bỏ trống là cỡ mặc định);
  chỉ tab Theo tháng dùng `sm`.

## Types

`src/types/admin.ts` (mục Client albums): `ClientAlbumProvider`, `AdminAlbumMonth`, `AdminAlbumMonthly`, `AdminAlbumWorkspaceRef`,
`AdminAlbumWorkspaceCountRow`, `AdminAlbumStorageFigures`, `AdminAlbumStorageRow`, `AdminAlbumStorage`, `AdminWorkspaceAlbumSummary`,
`AdminWorkspaceAlbumRow`, `AdminWorkspaceAlbums`; tham số `AdminAlbumMonthlyParams`, `AdminAlbumWorkspaceListParams`, `AdminAlbumStorageParams`,
`AdminWorkspaceAlbumListParams`.

Nhãn enum: `src/lib/admin/labels.ts` (`CLIENT_ALBUM_PROVIDER`, `clientAlbumProviderMeta`). Luật dùng chung: `src/lib/admin/clientAlbums.ts` (GB, độ phủ,
`describeSize`, loại dòng workspace, khóa URL, `workspaceAlbumsHref`) và `src/lib/admin/time.ts` (giờ naive, khóa ngày và tháng). Phần thuần của bộ lọc:
`components/admin/client-albums/monthlyFilters.ts`, `storageFilters.ts`. Dùng chung với tab của workspace: `AlbumTotalsStrip`, `AlbumSizeCell` ở
`components/admin/workspaces/`.
