# Tiếp thị liên kết

Updated: 2026-09-17 · Thiết kế: chưa có mockup admin (ERP có "Tiếp thị liên kết.dc.html" cho phía
người giới thiệu) · Backend: `../fvscheduler/docs/features/affiliate.md`

## Mục đích

Duyệt yêu cầu rút tiền của người giới thiệu (chuyển khoản tay ngoài hệ thống rồi đánh dấu đã trả),
soát và hủy từng dòng hoa hồng, chỉnh tỷ lệ hoa hồng/chiết khấu theo gói, khóa/mở mã giới thiệu bị
nghi gian lận.

**Không có**: danh sách mã giới thiệu hay đọc trạng thái ACTIVE/DISABLED của một mã (chỉ hai nút
khóa/mở, cả hai idempotent và luôn hiện đồng thời); lọc hoa hồng theo trạng thái (API chỉ lọc theo id
người giới thiệu và/hoặc id yêu cầu rút, trạng thái hiển thị suy tại FE theo đồng hồ lúc xem); GET
một yêu cầu rút theo id (drawer dựng từ ảnh chụp dòng danh sách); tính hay khấu trừ thuế TNCN (chỉ có
gợi ý trong dialog, admin tự ghi số đã trừ vào ghi chú).

## Màn hình

### `/affiliate?tab=payouts|commissions|rates`

`AffiliateScreen` giữ ba tab trên `?tab=` (mặc định `payouts`, bỏ khỏi URL), cùng khuôn `/plans?tab=`
và `/mail?tab=`. `page`/`size` dùng chung giữa ba tab vì mỗi lúc chỉ một bảng hiện.

- **Tab "Yêu cầu rút tiền"** (`PayoutsTab` + `PayoutTable`) - lọc `?pStatus=` (`SegmentedControl`,
  rỗng là tất cả), phân trang server. Dòng PAID/REJECTED mờ đi. Bấm hàng mở `PayoutDrawer` (state
  cục bộ, không lên URL vì không có GET theo id); drawer giữ ảnh chụp dòng cuối cùng biết được, chọn
  bản mới hơn giữa dòng đang cache và ảnh chụp bằng hàm `fresher`.
- **Tab "Hoa hồng"** (`CommissionsTab` + `CommissionTable`) - lọc `?referrer=ac…` và/hoặc
  `?inPayout=ap…` (dán id, tự nhận dạng theo tiền tố), sort `?cSort=` (mặc định bỏ khỏi URL; backend
  ghim `ORDER BY id DESC` khi đang lọc nên dropdown sort ẩn lúc đó). Mỗi dòng hiện chặng suy ra
  (`affiliateCommissionStage`): Khả dụng, Giữ tới ..., Trong yêu cầu ..., hoặc Đã hủy.
- **Tab "Tỷ lệ theo gói"** (`RatesTab` + `RateTable`) - mọi dòng `affiliate_plan_rate` ghép với
  catalog gói (`joinRates`); dòng tắt mờ đi, dòng mất khỏi catalog gắn nhãn "không còn trong
  catalog". Cột: Gói · Hoa hồng · Chiết khấu cho khách · Ví dụ gói tháng · Ví dụ gói năm (khách trả
  và hoa hồng theo giá catalog của chu kỳ đó, `—` khi gói không bán chu kỳ đó) · Áp dụng. Banner báo
  gói trong catalog chưa có tỷ lệ. Nút "Thêm tỷ lệ cho gói" nằm ở `PageHeader.actions`.

Trạng thái mọi màn: loading = khung xương (`AffiliateSkeletons.tsx`, khớp tab `payouts`) · empty =
`EmptyState` theo từng bộ lọc · error = `ErrorState` · pending khi ghi = nút disabled + `Spinner`.

## Dialog

- **`MarkPayoutPaidDialog`** - chỉ mở khi `payout.status === 'REQUESTED'`. Mã giao dịch (≤120) và
  ghi chú (≤400) đều tùy chọn; từ 2.000.000 ₫ hiện gợi ý thuế TNCN, hệ thống không tính. Không hoàn
  tác: các dòng hoa hồng đã gom giữ `payoutId` vĩnh viễn, không bao giờ hủy được nữa. 409 (yêu cầu đã
  xử lý ở nơi khác) invalidate `payouts` + `commissions`, báo drawer ảnh chụp đã cũ.
- **`RejectPayoutDialog`** - lý do bắt buộc 3..400 (`NoteField`). Gỡ `payoutId` khỏi mọi dòng đã gom,
  chúng trở lại Khả dụng ngay và người giới thiệu gửi được yêu cầu mới. Nghi gian lận: khóa mã
  trước, rồi mới từ chối, rồi mới hủy hoa hồng, vì từ chối trước thì dòng vừa nhả có thể bị một yêu
  cầu mới gom lại và hủy sẽ bị 409. 409 xử lý giống mark-paid.
- **`VoidCommissionDialog`** - lý do bắt buộc 3..400. Chỉ hủy được dòng `EARNED` chưa nằm trong yêu
  cầu rút nào (`isCommissionVoidable`); một chiều, không khôi phục, không trừ ngược số dư. 409 giữ
  message backend nguyên văn (đã PAID, đang trong yêu cầu, hoặc đã hủy), invalidate `commissions`.
- **`RateFormDialog`** - thêm hoặc sửa cùng một `PUT` (upsert). Nhập phần trăm, gửi basis point
  (`percentToBp`). Ví dụ tiền tính tại FE bằng đúng công thức backend (`rateMath.ts`): chiết khấu
  `floor` xuống bội số 1.000 ₫, hoa hồng `floor` xuống tới đồng. Tắt "Áp dụng" chỉ chặn đơn **mới**;
  đơn đã tạo kèm mã trước đó vẫn giữ chiết khấu, và khi thanh toán vẫn ghi hoa hồng theo tỷ lệ **đang
  lưu lúc thanh toán**, không phải tỷ lệ lúc tạo đơn. Không xóa được dòng tỷ lệ.
- **`ReferrerCodeActions`** (khóa/mở mã) - hai `ConfirmDialog` riêng, cả hai idempotent. Không đọc
  được trạng thái hiện tại của mã nên luôn hiện cả hai nút. Khóa không hủy hoa hồng đã ghi (hủy là
  thao tác riêng từng dòng); mở lại không tự khôi phục dòng đã VOIDED trong lúc khóa.

## Hooks ↔ API

| Hook (`src/hooks/useAdminAffiliate.ts`) | Method · path | Query key (`affiliateKeys`) | Invalidate sau ghi |
|---|---|---|---|
| `useAffiliatePayouts(params)` | `GET /api/admin/affiliate/payouts` | `payoutList(params)` | |
| `useAffiliateCommissions(params, opts)` | `GET /api/admin/affiliate/commissions` | `commissionList(params)` | |
| `useAffiliateRates()` | `GET /api/admin/affiliate/rates` | `rates` | |
| `useMarkPayoutPaid(payoutId)` | `POST .../payouts/{payoutId}/mark-paid` | | `payouts` + `commissions` |
| `useRejectPayout(payoutId)` | `POST .../payouts/{payoutId}/reject` | | `payouts` + `commissions` |
| `useVoidCommission(commissionId)` | `POST .../commissions/{commissionId}/void` | | `commissions` |
| `useUpdateAffiliateRate(planCode)` | `PUT .../rates/{planCode}` | | setQueryData `rates` + invalidate `rates` |
| `useSetAffiliateCodeEnabled(accountId)` | `POST .../accounts/{accountId}/enable` \| `/disable` | | không có query nào để làm mới |

## Rule FE phải giữ

- Mark-paid/reject chỉ nhận yêu cầu `REQUESTED`; hai nút bị ẩn hoàn toàn với PAID/REJECTED, không
  disabled giả.
- Void chỉ cho dòng `EARNED` và `payoutId` rỗng; dòng đang trong yêu cầu phải từ chối yêu cầu đó
  trước, dòng đã PAID không bao giờ hủy được nữa.
- Rate: nhập phần trăm 0..100 (tối đa 2 chữ số lẻ) ở FE, gửi basis point `Math.round(pct × 100)`.
  Sửa tỷ lệ không viết lại hoa hồng cũ, đó là ảnh chụp lúc ghi nhận.
- Mọi ghi chú/lý do 3..400 ký tự qua `NoteField`/`validateNote`; mã giao dịch mark-paid ≤120.
- Id dán vào ô lọc hoa hồng phải đúng dạng `ac…`/`ap…` (`PublicIdCodec`, 16 ký tự), sai dạng chặn
  ngay ở FE trước khi gọi API vì "Thử lại" không sửa được lỗi 400 đó.
- 409 luôn giữ nguyên message backend, không suy diễn thêm, và luôn invalidate cả `payouts` lẫn
  `commissions` vì hai bảng chia sẻ cùng dữ liệu qua `payoutId`.

## Types

`src/types/admin.ts`: `AdminAffiliatePayoutRow`, `AdminAffiliateCommissionRow`, `AdminAffiliateRate`,
`AffiliatePayoutListParams`, `AffiliateCommissionListParams`, `MarkPayoutPaidInput`,
`RejectPayoutInput`, `VoidCommissionInput`, `UpdateAffiliateRateInput`, `AffiliatePayoutStatus`,
`AffiliateCommissionStatus`.

Nhãn enum: `src/lib/admin/labels.ts` (`AFFILIATE_PAYOUT_STATUS`, `AFFILIATE_COMMISSION_STATUS`,
`affiliateCommissionStage`, `isCommissionVoidable`, `formatBasisPoints`,
`AFFILIATE_PAYOUT_STATUS_OPTIONS`, `AFFILIATE_COMMISSION_SORT_OPTIONS`).

Phép tính tiền dùng chung: `src/components/admin/affiliate/rateMath.ts` (chép đúng công thức
backend, `percentToBp`/`bpToPercentInput` cho ô nhập, `joinRates`/`unratedPlans` ghép tỷ lệ với
catalog).
