import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
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

/**
 * Khung xương lúc **chuyển tab**, không phải lúc mở màn.
 *
 * Ba tab dưới đây mỗi tab tự gọi API của mình và chỉ mount khi được chọn, nên mỗi lần bấm sang là
 * một lượt tải mới. Không có khung xương thì nội dung nhỏ giọt từng mảnh (dải tóm tắt trước, hàng
 * lọc sau, bảng cuối) và bố cục nhảy hai ba nhịp; có rồi thì khung đứng yên đúng chỗ, dữ liệu về là
 * điền vào. Header và dải tab nằm ngoài, chúng đã tải xong từ trước và không được nháy lại.
 *
 * Sau lượt đầu, `keepPreviousData` giữ dữ liệu cũ nên đổi bộ lọc **không** rơi lại vào đây: khung
 * xương chỉ xuất hiện đúng một lần cho mỗi lần vào tab.
 */

/** Cột lấy đúng từ `BookingTable`, kể cả bề rộng ràng buộc. */
const BOOKING_COLUMNS = [
  { header: 'rawId', className: 'w-16' },
  { header: 'Booking', className: 'min-w-[10vw]' },
  { header: 'Ngày chụp', className: 'w-36' },
  { header: 'Khách hàng', className: 'min-w-[9vw]' },
  { header: 'Trạng thái' },
  { header: 'Hợp đồng', className: 'text-right' },
  { header: 'Đã thu', className: 'text-right' },
  { header: 'Còn lại', className: 'text-right' },
  { header: 'Thu' },
  { header: 'Nhân sự' },
  { header: 'Buổi', className: 'w-14' },
  { header: '', className: 'w-10' },
];

/** Cột lấy đúng từ `MembersTab`. */
const MEMBER_COLUMNS = [
  { header: 'Thành viên', className: 'min-w-[12vw]' },
  { header: 'Email đăng nhập' },
  { header: 'Trạng thái' },
  { header: 'Chi nhánh' },
  { header: 'Vai trò' },
  { header: 'Tham gia' },
];

/** Cột lấy đúng từ `HistoryTab`. */
const HISTORY_COLUMNS = [
  { header: 'Gói' },
  { header: 'Trạng thái' },
  { header: 'Nguồn' },
  { header: 'Bắt đầu' },
  { header: 'Hết hạn' },
  { header: 'Ghi chú', className: 'min-w-[16vw]' },
  { header: 'Tạo lúc' },
];

/** Một ô số của dải tóm tắt: số to, nhãn, rồi tên trường mono bên dưới. */
function TileSkeleton() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Skeleton className="h-7 w-10" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

/**
 * Dải `BookingSummaryStrip` lúc tải. Hai tiêu đề nhỏ là chữ biết trước lúc build nên hiện chữ thật,
 * chỉ con số và cột biểu đồ mới là vệt xám.
 */
export function BookingSummarySkeleton() {
  return (
    <Card>
      <div className="grid grid-cols-2 items-start gap-5 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-[repeat(3,auto)_minmax(0,1fr)]">
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
        <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:col-span-3 lg:col-span-1 lg:border-l lg:border-border lg:pl-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">Theo tháng doanh thu</span>
            <Text variant="caption" muted className="font-mono">
              byRevenueMonth
            </Text>
          </div>
          {/* Cột cao lệch nhau để khung xương đọc ra là một biểu đồ, không phải một khối xám */}
          <div className="flex items-end gap-2">
            {['h-4', 'h-7', 'h-6', 'h-11', 'h-9', 'h-5'].map((h, i) => (
              <span key={i} className="flex h-11 flex-1 items-end">
                <Skeleton className={`w-full ${h}`} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-3 sm:px-5">
        <span className="mr-0.5 text-xs font-semibold text-foreground">Theo trạng thái</span>
        <Text variant="caption" muted className="font-mono">
          byStatus
        </Text>
        {['w-28', 'w-24', 'w-20'].map((w) => (
          <Skeleton key={w} className={`h-6 rounded-full ${w}`} />
        ))}
      </div>
    </Card>
  );
}

/** Tab Booking lúc tải: dải tóm tắt, hàng lọc, rồi bảng với tên cột thật. */
export function BookingTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <BookingSummarySkeleton />
      <FilterBarSkeleton fields={3} />
      <TableSkeleton columns={BOOKING_COLUMNS} rows={6} mobileCards />
    </div>
  );
}

/** Tab Thành viên lúc tải: một ô lọc trạng thái rồi bảng. */
export function MembersTabSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <FilterBarSkeleton fields={1} search={false} />
      <TableSkeleton columns={MEMBER_COLUMNS} rows={6} />
    </div>
  );
}

/** Tab Lịch sử gói lúc tải: dòng đếm ở trên, bảng ở dưới, không có hàng lọc. */
export function HistoryTabSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-96 max-w-full" />
      <TableSkeleton columns={HISTORY_COLUMNS} rows={5} />
    </div>
  );
}
