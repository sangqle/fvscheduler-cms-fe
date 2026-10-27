import { Heading } from '@/components/ui/Heading';
import {
  CardGridSkeleton,
  CardSkeleton,
  DetailHeaderSkeleton,
  FilterBarSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from '@/components/admin/shared/PageSkeleton';

/** Cột lấy đúng từ `CouponTable`. */
export const COUPON_COLUMNS = [
  { header: 'Mã' },
  { header: 'Giảm' },
  { header: 'Gói · chu kỳ', className: 'min-w-[12vw]' },
  { header: 'Hiệu lực' },
  { header: 'Lượt dùng' },
  { header: 'Đã giảm' },
  { header: 'Đã thu' },
  { header: 'Trạng thái' },
];

/** Cột lấy đúng từ `RedemptionTable`. */
export const REDEMPTION_COLUMNS = [
  { header: 'Workspace', className: 'min-w-[12vw]' },
  { header: 'Đơn hàng' },
  { header: 'Gói · chu kỳ' },
  { header: 'Giá niêm yết' },
  { header: 'Giảm' },
  { header: 'Đã trả' },
  { header: 'Trạng thái' },
  { header: 'Tạo lúc' },
];

/** `/coupons` lúc tải: ô tìm theo đầu mã rồi dải trạng thái, như `/orders`. */
export function CouponListSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Mã giảm giá" actions={1} />
      <div className="flex flex-col gap-4">
        <FilterBarSkeleton fields={1} />
        <TableSkeleton columns={COUPON_COLUMNS} rows={8} mobileCards />
      </div>
    </>
  );
}

/** `/coupons/[code]` lúc tải: dùng chung cho `loading.tsx` và nhánh `isPending` của màn. */
export function CouponDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Ba nút `size="sm"` ngắn (Sửa · Tắt mã · Xóa) cộng lại chừng 250px: giữ một dòng tới 320px */}
      <DetailHeaderSkeleton badges={1} actions={3} actionClassName="w-20" />
      <CardGridSkeleton count={4} />
      <CardSkeleton lines={6} />
      <section className="flex flex-col gap-2">
        <Heading level="3">Sổ lượt dùng</Heading>
        <TableSkeleton columns={REDEMPTION_COLUMNS} rows={5} mobileCards />
      </section>
    </div>
  );
}
