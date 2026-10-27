# Mã giảm giá

Updated: 2026-10-27 · Thiết kế: chưa có mockup · Backend: `../fvscheduler/docs/features/subscription-coupons.md`
(mục 3.2..3.7, 4, 8), bản đọc tiếng Việt `../fvscheduler/docs/vi/subscription-coupons.md`

## Mục đích

Admin nền tảng phát mã giảm theo phần trăm để đẩy workspace mua gói: tạo, sửa, bật/tắt, xóa mã chưa
dùng, và soát sổ lượt dùng của từng mã. Khách nhập mã ở bước thanh toán của ERP (không thuộc repo
này). Mỗi workspace dùng một mã một lần; checkout giữ chỗ trong lúc đơn chờ chuyển khoản (khoảng 25
giờ), tiền về thì chỗ thành lượt đã dùng, checkout bỏ dở để lại lượt giữ chỗ đã hết hạn. Đơn dùng mã
giảm giá không tính hoa hồng, và một đơn mang mã giảm giá hoặc mã giới thiệu, không bao giờ cả hai.

**Không có**: mã giảm số tiền cố định, lô mã dùng một lần, cộng dồn với mã giới thiệu, đổi `code` sau
khi tạo, lọc sổ lượt dùng theo trạng thái, audit log riêng.

## Màn hình

### `/coupons`
- `CouponListScreen` → hàng lọc một dòng: ô tìm theo **đầu mã** (debounce 500ms, viết hoa khi gõ) +
  `SegmentedControl` trạng thái (Tất cả/ACTIVE/SCHEDULED/EXPIRED/INACTIVE); dưới là `CouponTable`
  (phân trang server, size 20). "Tạo mã giảm giá" ở `PageHeader.actions`.
- URL: `?status=active|scheduled|expired|inactive&q=&page=&size=`; `status` vắng là tất cả.
- Cột: Mã (mono, kèm "Chỉ lần mua đầu") · Giảm · Gói · chu kỳ (tên gói hoặc "Mọi gói đang bán", dòng
  dưới Tháng/Năm/Cả hai) · Hiệu lực · Lượt dùng (`đã dùng / tối đa`, `N đang giữ · còn M` hoặc "Không
  giới hạn") · Đã giảm · Đã thu · Trạng thái (badge + tooltip tiếng Việt). Dòng EXPIRED/INACTIVE mờ đi.
- Bấm hàng, hoặc mã (link thật, để bàn phím cũng mở được) → `/coupons/{code}?from=<query đã encode>`
  (`detailHref`).

### `/coupons/[code]`
`CouponDetailScreen` · mã trên URL được chuẩn hóa viết hoa. `?page=&size=` phân trang sổ lượt dùng.
- Header: nút quay lại (`useReturnHref('/coupons')`), mã mono + nút chép, badge trạng thái + câu giải
  thích, `Giảm N%`, tạo / sửa lần cuối. Hành động: Sửa · Tắt mã / Bật mã · Xóa.
- `CouponStats`: Đã dùng (`đã dùng / tối đa`, phụ đề còn N lượt / không giới hạn / vượt trần) · Đang
  giữ chỗ · Tổng đã giảm · Tổng đã thu.
- `CouponConfigCard`: mức giảm, gói áp dụng (đối chiếu `useAdminPlans()`: gói đã xóa hiện mã thô +
  "không còn trong catalog", gói ngừng bán ghi "ngừng bán"), kỳ thanh toán, đối tượng, hiệu lực, tổng
  lượt + `MeterBar` (đã dùng xanh, đang giữ vàng), công tắc, ghi chú nội bộ.
- `RedemptionTable` (sổ lượt dùng): Workspace (link `/workspaces/{id}` + `RawId`) · Đơn hàng (link
  `/orders?workspaceId=…&code=…`, mở drawer đơn) · Gói · chu kỳ · Giá niêm yết · Giảm · Đã trả (ô trống
  tới khi trả) · Trạng thái (HELD/LAPSED/REDEEMED + mốc giữ tới / hết hạn giữ chỗ / thanh toán) · Tạo lúc.
- 404 → `NotFoundState`. Tải lại hỏng mà dữ liệu cũ còn trong cache thì chỉ hiện `Alert` cảnh báo dưới
  header (kiểu `TemplateEditorScreen`), không thay cả màn, để dialog sửa đang mở không mất phần đang gõ.

Trạng thái mọi màn: loading = khung xương (`CouponSkeletons.tsx`, dùng chung cho `loading.tsx` và nhánh
`isPending`) · empty = `EmptyState` (chưa có mã + nút tạo, hoặc không khớp bộ lọc + xóa bộ lọc; sổ
trống) · error = `ErrorState` · pending khi ghi = nút disabled + `Spinner`.

## Dialog

- **`CouponFormDialog`** - tạo và sửa chung một form (khuôn `PlanFormDialog`: `useState` + validator
  thuần ở `lib/admin/coupons.ts`). Mã chỉ có lúc tạo. Phạm vi gói là hai chế độ "Mọi gói đang bán"
  (gửi `[]`) và "Chỉ một số gói" (bắt buộc tích ít nhất một): không tích gì **không** ngầm là mọi gói.
  Danh sách tích lấy gói đang bán, trừ gói `FREE`; mọi mã sẽ gửi đi mà không chọn mới được (ngừng bán,
  đã xóa, kể cả khi catalog đổi lúc form đang mở) vẫn hiện kèm lý do để bỏ ra. Kỳ thanh toán Cả hai/Tháng/Năm, tổng lượt (trống = không giới hạn; lúc sửa hiện
  số chỗ đang chiếm), ngày bắt đầu / hiệu lực đến hết ngày (`DatePicker clearable`), ghi chú nội bộ
  ≤500, hai switch: chỉ lần mua đầu, bật mã. Tạo xong mở trang chi tiết. 400/409 hiện trong dialog.
- **`ToggleCouponDialog`** - `ConfirmDialog`, `PUT` lại nguyên mã đang lưu với `active` đảo.
- **`DeleteCouponDialog`** - đếm sổ lượt dùng (`totalElements`, mọi trạng thái) trước: có dòng nào là
  khóa nút xóa và đưa "Tắt mã thay vì xóa". 409 từ backend xử lý giống hệt, kèm invalidate detail + sổ.

## Hooks ↔ API

| Hook (`src/hooks/useAdminCoupons.ts`) | Method · path | Query key (`couponKeys`) | Invalidate sau ghi |
|---|---|---|---|
| `useAdminCoupons(params)` | `GET /api/admin/coupons` | `list(params)` | |
| `useAdminCoupon(code)` | `GET /api/admin/coupons/{code}` | `detail(code)` | |
| `useCouponRedemptions(code, params)` | `GET /api/admin/coupons/{code}/redemptions` | `redemptionList(code, params)` | |
| `useCreateCoupon()` | `POST /api/admin/coupons` | | setQueryData detail; list |
| `useUpdateCoupon()` | `PUT /api/admin/coupons/{code}` | | setQueryData detail (thân PUT là đúng bản GET detail); list + sổ của mã |
| `useDeleteCoupon()` | `DELETE /api/admin/coupons/{code}` | | detail + sổ đánh dấu cũ, không refetch (màn còn mount tới khi chuyển trang); bỏ dòng khỏi list đang cache rồi invalidate list |

`useMarkPaid` (đơn hàng) invalidate `couponKeys.all` khi đơn mang `couponCode`: thanh toán là chốt lượt
dùng, kể cả khi hạn giữ chỗ đã qua.

## Rule FE phải giữ

- **Không tự tính `state`**: luôn đọc từ response (ưu tiên INACTIVE → EXPIRED → SCHEDULED → ACTIVE).
- **Mã**: trim + viết hoa ngay lúc gõ, `^[A-Z0-9]{3,20}$`, không mang dạng mã giới thiệu
  `^FV[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$`; trùng mã giới thiệu đang có là 400 của backend. Không đổi được.
- **Giảm** 1..99, số nguyên. **Tổng lượt** ≥ 1 hoặc trống. **Ghi chú** ≤ 500, khách không thấy.
- **PUT gửi đủ mọi trường**; bật/tắt cũng vậy (`couponToUpdateInput`). Sửa chỉ ảnh hưởng đơn tạo sau
  đó; đơn đang chờ giữ giá và vẫn thanh toán được.
- **Hạ trần** xuống dưới số chỗ đang chiếm (`redeemedCount + heldCount`) là 409; trần bằng đúng số đó
  hoặc bỏ trần thì được. Form chỉ nhắc con số, không tự chặn: backend quyết định.
- **Giờ Việt Nam**: hiện và sửa theo `Asia/Ho_Chi_Minh` (`lib/admin/time.ts`). `startsAt` tính cả mốc,
  `endsAt` thì không: "hiệu lực đến hết 31/01/2027" là `endsAt = 2027-01-31T17:00:00Z`. Mốc không rơi
  đúng nửa đêm (dữ liệu cũ, tạo qua API) hiện giờ chính xác, và form giữ nguyên văn mốc đó tới khi
  admin chọn lại ngày.
- **Vượt trần** (`redeemedCount > maxRedemptions`, `remaining` = 0) là chuyện đã chấp nhận: một đơn được
  thanh toán sau khi hết hạn giữ chỗ (admin xác nhận tay đơn trả muộn, hoặc webhook chốt lượt giữ chỗ đã
  hết hạn khi job hết hạn đơn ngừng chạy). Hiện thẳng con số, không tô như lỗi, không đoán nguyên nhân.
- **Gói trong phạm vi** là liên kết mềm theo mã: gói bị xóa sau đó vẫn nằm trong `planCodes`, FE tự đối
  chiếu catalog. Gói `FREE` không bao giờ nằm trong phạm vi.
- **Xóa** chỉ khi sổ lượt dùng rỗng ở mọi trạng thái; còn lại thì tắt mã.
- Lỗi ghi giữ nguyên `message` backend (`apiErrorMessage`); 404 (mã đã bị xóa ở nơi khác) thêm câu dẫn
  tiếng Việt, giữ message trong ngoặc, và làm mới detail + list.
- Ô mã, ô tìm và ô số chuẩn hóa lúc gõ bằng `normalizeInputValue` (`lib/utils.ts`), không dùng `maxLength`
  gốc: trình duyệt cắt chuỗi dán trước khi chuẩn hóa. Ô Giảm chỉ bỏ khoảng trắng, "1.5" báo lỗi chứ không
  thành 15.
- Lịch chọn ngày tô "hôm nay" theo lịch Việt Nam (`DatePicker today`), khớp với ngày lịch mà ô gửi đi.

## Types

`src/types/admin.ts`: `AdminCoupon`, `AdminCouponRedemptionRow`, `AdminCouponListParams`,
`CouponRedemptionListParams`, `CreateCouponInput`, `UpdateCouponInput`, `CouponState`,
`CouponStatusFilter`, `CouponRedemptionStatus`.

Nhãn enum: `src/lib/admin/labels.ts` (`COUPON_STATE`, `COUPON_REDEMPTION_STATUS`, `COUPON_STATUS_OPTIONS`,
`couponPeriodLabel`). Luật dùng chung: `src/lib/admin/coupons.ts` (regex, validator, khung hiệu lực theo
ngày, `resolveScope`, `couponToUpdateInput`, `FREE_FLOOR_PLAN_CODE`).
