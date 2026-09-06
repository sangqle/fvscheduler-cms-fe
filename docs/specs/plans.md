# Catalog gói

Updated: 2026-09-06 · Thiết kế: CMS-07 · Backend: `ADM-FLOW-04-read-catalog`, `ADM-FLOW-08-manage-plans`,
`ADM-FLOW-09-compose-pack`, `ADM-FLOW-10-manage-items`

## Mục đích

Quản trị toàn bộ catalog `subscription_plan`: tạo / sửa / bật tắt bán / xóa gói, soạn thành phần
gói (nhóm, ghi đè item, limits), và tạo / sửa / bật tắt / xóa item. Sau mỗi lần ghi, backend tự xóa
cache gói và cache trang giá công khai.

**Không có**: CRUD nhóm (`item_group` chỉ tạo được ở backend), thêm feature key / limit key mới
(hai danh sách khóa cố định trong code backend), đổi mã gói hoặc mã item sau khi tạo, audit log riêng.

## Màn hình

### `/plans` (CMS-07)
`components/admin/plans/PlanCatalogScreen.tsx` · ba tab sống trên `?tab=` (`plans` mặc định, `items`,
`keys`); slot `actions` của `PageHeader` đổi theo tab (sắp xếp gói + Tạo gói / Tạo item).
Hàng lọc của hai tab (`CatalogFilters.tsx`) cùng khuôn với `/workspaces`: ô tìm co giãn, dropdown
`FilterSelect` rộng theo nội dung, nút "Xóa bộ lọc" chỉ hiện khi đang lọc, ghi chú số đếm sát phải.
Mọi bộ lọc sống trên URL; màn cha đọc URL và truyền `values` xuống bảng.

**Tab Gói** → `PlanFilters` + `PlanTable`. URL: `?q=&status=active|inactive&sort=sort|code|price`
(lọc và sắp xếp phía client trên danh sách đã tải). Sắp xếp là `SegmentedControl` cạnh tiêu đề
(Thứ tự trang giá · Mã gói · Giá năm), không nằm trong hàng lọc.
- Cột: Gói (tên + chip `Gói trial` / `Nháp` + nút bút chì, mã mono) · Bán (`Switch` ghi thẳng) ·
  Giá tháng · Giá năm · Limits (chip mỗi khóa) · Sort · Thành phần (link sang tab Thành phần) ·
  Đang dùng (`N sub · M đơn` + "xóa được" / "không xóa được") · menu `⋯`.
- Nút bút chì và mục "Sửa tên và giá" mở `PlanFormDialog` ở chế độ sửa ngay trên danh sách: tên,
  sort, 4 cột giá; mã `readOnly`; **không** có switch bán (PUT gửi lại `isActive` đã lưu).
- Menu hàng: Sửa tên và giá · Sửa thành phần · Mở bán / Ngừng bán · Xóa gói vĩnh viễn.
- Hỏi lại trước khi: ngừng bán gói còn tham chiếu, và mở bán gói chưa có limit nào.
- Bấm vào hàng mở `/plans/{code}?from=<query hiện tại đã encode>` (`detailHref`); nút quay lại ở
  chi tiết đọc `?from=` bằng `useReturnHref('/plans')` nên về đúng tab và bộ lọc đang xem.

**Tab Nhóm & item** → `ItemFilters` + `ItemsTab`. URL: `?itemQ=&group=<groupCode>&itemStatus=active|inactive`
(khóa tách riêng với tab Gói để chuyển tab không mất bộ lọc). Dropdown Nhóm liệt kê mọi nhóm kèm
số item; nhóm đã tắt ghi rõ "nhóm đã tắt".
- Cột: Item (nhãn + chip `Đã tắt` + nút bút chì, mã mono, mô tả 2 dòng) · Nhóm (nhãn + mã) ·
  Feature key (kèm cảnh báo "Item duy nhất mang khóa") · Nhãn phụ · Bật (`Switch` + chữ trạng thái)
  · Sort · Đang dùng (`N link · M ghi đè` + "xóa được" / "không xóa được") · menu `⋯` (Sửa item ·
  Bật/Tắt · Xóa item vĩnh viễn). Mọi trường của `AdminCatalogItem` đều hiện trên hàng.
- Nút bút chì và "Sửa item" mở `ItemFormDialog` ở chế độ sửa (nhãn, mô tả, nhóm, feature key, nhãn
  phụ, sort, bật/tắt).

**Tab Khóa hệ thống** → `SystemKeysTab`: hai thẻ chỉ đọc, "Khóa tính năng" (feature key, kèm chip
`reserved` + số item đang mang) và "Khóa giới hạn" (limit key + nhãn tiếng Việt). Wording tránh chữ
"từ vựng" / "tập đóng": người đọc màn này là admin, không phải người viết backend.

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

Trạng thái mọi màn: loading = khung xương khớp bố cục (`loading.tsx` của route + nhánh `isPending`
dùng chung component ở `*Skeletons.tsx`, xem [README](./README.md)) · empty = `EmptyState` · error =
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
