import {
  CardSkeleton,
  DetailHeaderSkeleton,
  FilterBarSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  TabsListSkeleton,
} from '@/components/admin/shared/PageSkeleton';

/** Cột lấy đúng từ `PlanTable`, kể cả cột hành động cuối hàng. */
const COLUMNS = [
  { header: 'Gói', className: 'min-w-56' },
  { header: 'Bán' },
  { header: 'Giá tháng' },
  { header: 'Giá năm' },
  { header: 'Limits', className: 'min-w-44' },
  { header: 'Sort' },
  { header: 'Thành phần' },
  { header: 'Đang dùng' },
  { header: '', className: 'w-12' },
];

/** CMS-07 lúc tải: khung của tab `plans`, tab mặc định khi vào màn. */
export function PlanCatalogSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Catalog gói" actions={2} />
      <TabsListSkeleton labels={['Gói', 'Nhóm & item', 'Khóa hệ thống']} />
      <div className="mt-4 flex flex-col gap-4">
        <FilterBarSkeleton fields={1} />
        <TableSkeleton columns={COLUMNS} rows={8} mobileCards />
      </div>
    </>
  );
}

/** CMS-07 chi tiết lúc tải: dùng chung cho `loading.tsx` và nhánh `isPending` của màn. */
export function PlanDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <DetailHeaderSkeleton badges={2} actions={1} />
      <TabsListSkeleton labels={['Tổng quan', 'Thành phần']} />
      {/* Cùng lưới với `PlanOverviewTab`: thông tin gói bên trái, khối phụ hẹp bên phải */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CardSkeleton lines={7} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}
