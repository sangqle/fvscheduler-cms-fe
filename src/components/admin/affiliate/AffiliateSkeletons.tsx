import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton, TabsListSkeleton } from '@/components/admin/shared/PageSkeleton';
import { AFFILIATE_TAB_LABELS } from '@/components/admin/affiliate/affiliateTabs';

/** Cột lấy đúng từ `PayoutTable`, bảng của tab mặc định. */
export const PAYOUT_COLUMNS = [
  { header: 'Người giới thiệu', className: 'min-w-[14vw]' },
  { header: 'Số tiền' },
  { header: 'Số lượt' },
  { header: 'Chuyển tới', className: 'min-w-[14vw]' },
  { header: 'Trạng thái' },
  { header: 'Gửi lúc' },
  { header: 'Xử lý lúc' },
];

/** Màn tiếp thị liên kết lúc tải: khung của tab `payouts`, tab mặc định khi vào màn. */
export function AffiliateSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Tiếp thị liên kết" actions={0} />
      <TabsListSkeleton labels={AFFILIATE_TAB_LABELS} />
      <div className="mt-4 flex flex-col gap-4">
        {/* Hàng lọc của tab payouts là một `SegmentedControl size="sm"` cao 36px, giữ đúng chiều cao đó */}
        <FilterBarSkeleton fields={1} search={false} />
        <TableSkeleton columns={PAYOUT_COLUMNS} rows={8} />
      </div>
    </>
  );
}
