import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/admin/shared/PageSkeleton';

/** Cột lấy đúng từ `OrderTable`. */
const COLUMNS = [
  { header: 'rawId', className: 'w-20' },
  { header: 'Mã đơn' },
  { header: 'Workspace', className: 'min-w-[12vw]' },
  { header: 'Gói · chu kỳ' },
  { header: 'Số tiền' },
  { header: 'Trạng thái' },
  { header: 'Tạo lúc' },
  { header: 'Thanh toán lúc' },
  { header: 'Khớp SePay' },
];

/** CMS-05/06 lúc tải: ô tìm rồi dải trạng thái, chỉ một control chứ không phải ba dropdown. */
export function OrderListSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Danh sách đơn hàng" actions={0} />
      <div className="flex flex-col gap-4">
        <FilterBarSkeleton fields={1} />
        <TableSkeleton columns={COLUMNS} rows={8} />
      </div>
    </>
  );
}
