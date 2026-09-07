import {
  CardSkeleton,
  DetailHeaderSkeleton,
  FilterBarSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  TabsListSkeleton,
} from '@/components/admin/shared/PageSkeleton';

/** Cột và bề rộng lấy đúng từ `WorkspaceTable`. */
const COLUMNS = [
  { header: 'rawId', className: 'w-20' },
  { header: 'Workspace', className: 'min-w-[14vw]' },
  { header: 'Chủ sở hữu', className: 'min-w-[14vw]' },
  { header: 'TV', className: 'w-12' },
  { header: 'CN', className: 'w-12' },
  { header: 'Gói hiện tại' },
  { header: 'Trạng thái' },
  { header: 'Hết hạn' },
  { header: 'Tạo lúc' },
];

/** CMS-01 lúc tải: tiêu đề thật, hàng lọc và bảng để trống. */
export function WorkspaceListSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Danh sách workspace" actions={1} />
      <div className="flex flex-col gap-4">
        <FilterBarSkeleton fields={3} />
        <TableSkeleton columns={COLUMNS} rows={8} />
      </div>
    </>
  );
}

/** CMS-02..04 lúc tải: dùng chung cho `loading.tsx` và nhánh `isPending` của màn chi tiết. */
export function WorkspaceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <DetailHeaderSkeleton badges={2} actions={1} />
      <TabsListSkeleton labels={['Tổng quan', 'Booking', 'Thành viên', 'Lịch sử gói']} />
      {/* Cùng lưới với `OverviewTab`: thẻ gói chiếm hai cột, thẻ hạn mức đứng bên phải */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CardSkeleton lines={6} className="lg:col-span-2" />
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}
