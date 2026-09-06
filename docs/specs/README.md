# Specs

Một file cho mỗi module CMS. Đọc trước khi sửa, cập nhật sau khi đổi hành vi (skill `spec`).

| Module | File | Thiết kế |
|---|---|---|
| Auth + gate allowlist | [auth.md](./auth.md) | CMS-09 (403) |
| Workspace: list, detail, grant/extend/cancel | [workspaces.md](./workspaces.md) | CMS-01..04, CMS-08 |
| Đơn hàng: list, drawer, mark-paid | [orders.md](./orders.md) | CMS-05, 06, 08 |
| Catalog gói | [plans.md](./plans.md) | CMS-07 |

## Khung xương lúc tải (dùng chung)

Mỗi route trong `(admin)` có `loading.tsx` riêng, và file đó chỉ re-export một component skeleton
đặt cạnh màn (`components/admin/<module>/*Skeletons.tsx`), nên fallback của `Suspense` trong
`page.tsx`, `loading.tsx` của route và nhánh `isPending` của màn dùng chung đúng một khung.

Khối dựng sẵn ở `src/components/admin/shared/PageSkeleton.tsx`: `PageHeaderSkeleton` ·
`DetailHeaderSkeleton` · `FilterBarSkeleton` · `TabsListSkeleton` · `TableSkeleton` (chạy thẳng
`DataTable isLoading` nên viền, bề rộng cột và cách xếp thẻ trên phone không bao giờ lệch bảng
thật) · `CardSkeleton` / `CardGridSkeleton`. Chữ nào biết trước lúc build (tiêu đề màn, nhãn tab,
tên cột) thì hiện chữ thật, chỉ phần phụ thuộc dữ liệu mới là vệt xám.

`src/app/loading.tsx` là chỉ báo giữa trang cho khoảng chờ của `(admin)/layout.tsx` (đọc session +
probe allowlist): `loading.tsx` của một segment không bao bọc layout của chính segment đó.

Template: [_TEMPLATE.md](./_TEMPLATE.md). Thiết kế gốc: claude.ai/design project
`3edcc4b1-dd62-4c86-a0a9-ca6cc4417936`, file `CMS Platform Admin.dc.html`.

## `rawId`: khóa số song song với id mờ

`/api/admin/**` đính thêm khóa số nguyên thủy bên cạnh mỗi id mờ, vì người vận hành CMS đọc thẳng
DB nền tảng mà `wk…` thì không join được với kết quả SQL. Hiện chỉ có ở:

| Response | Trường |
|---|---|
| `AdminWorkspaceRowResponse` · `AdminWorkspaceDetailResponse` | `rawId`, `owner.rawMembershipId`, `owner.rawAccountId` |
| `AdminOrderRowResponse.WorkspaceRef` (dùng lại ở `AdminOrderDetailResponse`) | `workspace.rawId` |
| `AdminOrderDetailResponse.CreatedBy` | `rawAccountId` |

Gói, item catalog, template, chiến dịch và message **không** có: chúng khóa theo `code` chứ không
theo id mờ. Membership dùng chung DTO với tenant nên backend cố tình không mang shape này sang.
Hiển thị bằng `RawId` (`components/admin/shared/RawId.tsx`), không tự vẽ lại.
