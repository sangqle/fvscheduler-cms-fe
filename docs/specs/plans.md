# Catalog gói

Updated: 2026-09-05 · Thiết kế: CMS-07 · Backend: `ADM-FLOW-04-read-catalog`

## Mục đích

Xem catalog `subscription_plan` chỉ đọc, gồm gói đã ngừng bán. Thay đổi catalog đi qua migration/seed.

## Màn hình

### `/plans` (CMS-07)
- `PlanTable`: DataTable sắp theo mã; cột Mã · Tên · Trạng thái (Đang bán / Đã ngừng bán) · Giá
  tháng · Giá năm (niêm yết gạch → bán; bán null thì gạch niêm yết + "null") · Seats · Branches ·
  Albums/tháng · Sort. Hàng ngừng bán mờ.
- Chú thích: `∞` = key có với giá trị null; `—` = key không có trong limits.

## Hooks ↔ API

| Hook | Method · path | Query key |
|---|---|---|
| `useAdminPlans()` | `GET /api/admin/plans` | `['admin','plans']` (staleTime 5 phút) |

Cũng dùng cho: dropdown gói trong `GrantDialog`, filter "Gói" ở `/workspaces`, giá gói ở
`OverviewTab`, trạng thái đang bán ở `OrderDrawer`, và probe allowlist ở `gate.server.ts`.

## Rule FE phải giữ

- Không có nút tạo/sửa/xóa gói.
- Gói ngừng bán: grant vẫn chọn được, mark-paid sẽ bị 409.

## Types

`src/types/admin.ts`: `AdminPlan`.
