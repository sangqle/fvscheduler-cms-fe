# Catalog gói

Updated: 2026-09-05 · Thiết kế: CMS-07 · Backend: `ADM-FLOW-04-read-catalog`, `ADM-FLOW-08-manage-plans`,
`ADM-FLOW-09-compose-pack`, `ADM-FLOW-10-manage-items`

## Mục đích

Quản trị toàn bộ catalog `subscription_plan`: tạo / sửa / bật tắt bán / xóa gói, soạn thành phần
gói (nhóm, ghi đè item, limits), và tạo / sửa / bật tắt / xóa item. Sau mỗi lần ghi, backend tự xóa
cache gói và cache trang giá công khai.

**Không có**: CRUD nhóm (`item_group` chỉ tạo được ở backend), thêm feature key / limit key mới
(hai từ vựng đóng), đổi mã gói hoặc mã item sau khi tạo, audit log riêng.

## Màn hình

### `/plans` (CMS-07)
`components/admin/plans/PlanCatalogScreen.tsx` · ba tab sống trên `?tab=` (`plans` mặc định, `items`,
`vocabulary`); nút hành động ở `PageHeader` đổi theo tab (Tạo gói / Tạo item).

**Tab Gói** → `PlanTable`. Filter/URL: `?q=&status=active|inactive&sort=sort|code|price` (lọc và sắp
xếp phía client trên danh sách đã tải).
- Cột: Gói (tên + mã + chip `Gói trial` / `Nháp`) · Bán (`Switch` ghi thẳng) · Giá tháng · Giá năm ·
  Limits (chip mỗi khóa) · Thành phần (link sang tab Thành phần) · Đang dùng (`N sub · M đơn` +
  "xóa được" / "không xóa được") · menu `⋯`.
- Menu hàng: Sửa thông tin gói · Sửa thành phần · Mở bán / Ngừng bán · Xóa gói vĩnh viễn.
- Hỏi lại trước khi: ngừng bán gói còn tham chiếu, và mở bán gói chưa có limit nào.
- Bấm vào hàng mở `/plans/{code}`.

**Tab Nhóm & item** → `ItemsTab`. Filter/URL: `?group=<groupCode>&itemQ=`.
- Rail trái: danh sách nhóm kèm số item (chỉ đọc). Bảng phải: Item · Nhóm · Feature key (kèm cảnh
  báo "Item duy nhất mang khóa") · Nhãn phụ · Bật (`Switch`) · Sort · Đang dùng (`N link · M ghi đè`)
  · menu `⋯` (Sửa item · Bật/Tắt · Xóa item vĩnh viễn).

**Tab Từ vựng** → `VocabularyTab`: hai bảng chỉ đọc, feature key (kèm `reserved` + số item đang mang)
và limit key.

### `/plans/[planCode]`
`PlanDetailScreen` · hai tab trên `?tab=` (`overview` mặc định, `composition`). Header: tên, chip
trạng thái, mã bấm để chép, `createdAt` / `updatedAt`, link `/workspaces?planCode=`.

**Tab Tổng quan** → `PlanOverviewTab`: form 4 trường lõi + 4 cột giá (`Hoàn tác` / `Lưu thay đổi`,
chỉ bật khi dirty) · thẻ Trạng thái bán (`Switch` riêng, gửi giá trị **đã lưu** chứ không kèm form
đang sửa dở) · thẻ Đang được tham chiếu (2 con số + nút xóa) · ghi chú cache.

**Tab Thành phần** → `PlanCompositionTab`: banner cảnh báo "lưu là thay toàn bộ" · chọn nhóm
(`Checkbox`) · bảng ghi đè item (bật/tắt, giá trị hiển thị, sort, thêm bằng `Combobox`, bỏ bằng `✕`) ·
limits (`SegmentedControl` 3 chế độ: Số · ∞ Không giới hạn · Không mang) · thẻ "Kết quả sau khi lưu"
dựng lại phía client bằng `resolvePreview` · thanh chân trang sticky (`Hoàn tác` / `Lưu thành phần`).

Trạng thái mọi màn: loading = `Skeleton` / `DataTable isLoading` · empty = `EmptyState` · error =
`ErrorState` · 404 = `NotFoundState` · pending khi ghi = nút disabled + `Spinner`.

## Hooks ↔ API

| Hook (`src/hooks/`) | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useAdminPlans()` | `GET /api/admin/plans` | `['admin','plans']` (staleTime 5 phút) | — |
| `useAdminPlan(code)` | `GET /api/admin/plans/{code}` | `['admin','plans','detail',code]` | — |
| `useCreatePlan()` | `POST /api/admin/plans` | — | list + detail gói mới |
| `useUpdatePlan()` | `PUT /api/admin/plans/{code}` | — | list + detail |
| `useDeletePlan()` | `DELETE /api/admin/plans/{code}` | — | xóa detail khỏi cache + list |
| `useReplaceComposition(code)` | `PUT /api/admin/plans/{code}/composition` | — | list + detail |
| `useCatalogGroups()` | `GET /api/admin/catalog/groups` | `['admin','catalog','groups']` | — |
| `useCatalogItems()` | `GET /api/admin/catalog/items` | `['admin','catalog','items']` | — |
| `useFeatureKeys()` | `GET /api/admin/catalog/feature-keys` | `['admin','catalog','feature-keys']` | — |
| `useLimitKeys()` | `GET /api/admin/catalog/limit-keys` | `['admin','catalog','limit-keys']` | — |
| `useCreateItem()` / `useUpdateItem()` / `useDeleteItem()` | `POST` / `PUT` / `DELETE /api/admin/catalog/items[/{code}]` | — | items + groups + feature-keys + **list gói** |

Ghi một item xóa cache của **mọi** gói ở backend, nên hook item cũng invalidate `['admin','plans']`.

`useAdminPlans()` còn dùng cho: dropdown gói trong `GrantDialog`, filter "Gói" ở `/workspaces`, giá
gói ở `OverviewTab`, trạng thái đang bán ở `OrderDrawer`, và probe allowlist ở `gate.server.ts`.

## Rule FE phải giữ

- **Mã không đổi được** sau khi tạo: `^[A-Z][A-Z0-9_]{1,31}$` cho gói, `^[a-z][a-z0-9-]{1,63}$` cho
  item. Ô mã ở form sửa là `readOnly`.
- **Giá**: mọi giá `>= 0`; `yearlyListPrice` bắt buộc; có giá bán tháng thì phải có giá niêm yết
  tháng; giá bán không vượt giá niêm yết cùng bậc. Bỏ trống giá bán = bán đúng giá niêm yết.
- **Gói trial** (`isTrialPlan`): `Switch` bán bị khóa và nút xóa bị khóa; đổi tên / giá vẫn được.
- **Xóa gói** chỉ khi `usage.subscriptions + usage.orders === 0`; còn tham chiếu thì lối ra là ngừng
  bán. Dialog xóa giữ nguyên `message` 409 của backend.
- **Composition là thay toàn bộ**: thứ bị bỏ khỏi màn sẽ bị xóa khỏi gói. Limits có 3 chế độ —
  có khóa + số, có khóa + null (∞), và không mang khóa (vắng khỏi mảng).
- **Item cuối cùng mang một feature key**: tắt, đổi khóa hoặc xóa đều bị 409. FE cảnh báo trước bằng
  `activeCarriers` nhưng không tự chặn — backend mới là nơi quyết định.
- Form ở trang chi tiết chỉ nạp lại khi `updatedAt` đổi, không nạp lại theo identity của query, để
  một lần refetch lúc quay lại tab không xóa nội dung đang gõ dở.
- Gói ngừng bán: grant vẫn chọn được, mark-paid sẽ bị 409.
- `∞` = key có trong limits với giá trị null; thiếu chip = gói không mang giới hạn đó.

## Types

`src/types/admin.ts`: `AdminPlan`, `AdminPlanDetail`, `AdminPlanUsage`, `AdminPlanGroupRef`,
`AdminPlanItemView`, `CreatePlanInput`, `UpdatePlanInput`, `PlanCompositionInput`,
`PlanItemLinkInput`, `PlanLimitInput`, `AdminCatalogGroup`, `AdminCatalogItem`, `CreateItemInput`,
`UpdateItemInput`, `AdminFeatureKey`, `AdminLimitKey`.

Luật dùng chung: `src/lib/admin/catalog.ts` (regex mã, validate giá, `resolvePreview`).
