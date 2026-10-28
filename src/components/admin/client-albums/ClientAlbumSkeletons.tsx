import { Text } from '@/components/ui/Text';
import {
  FilterBarSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  TabsListSkeleton,
} from '@/components/admin/shared/PageSkeleton';
import { CLIENT_ALBUM_TAB_LABELS, DEFAULT_MONTH_COUNT } from '@/components/admin/client-albums/clientAlbumTabs';
import { AlbumTotalsSkeleton } from '@/components/admin/workspaces/WorkspaceSkeletons';

/** Cột lấy đúng từ `MonthlyTable`, bảng đếm album tạo mỗi tháng. */
export const MONTH_COLUMNS = [
  { header: 'Tháng' },
  { header: 'Album tạo mới', className: 'text-right' },
  { header: 'Thuộc workspace', className: 'text-right' },
  { header: 'Không thuộc workspace', className: 'text-right' },
  { header: 'Google Drive', className: 'text-right' },
  { header: 'NAS', className: 'text-right' },
  { header: 'Đã xóa sau đó', className: 'text-right' },
];

/** Cột lấy đúng từ `MonthWorkspacesPanel`, bảng workspace đã tạo album trong một tháng. */
export const MONTH_WORKSPACE_COLUMNS = [
  { header: 'Workspace', className: 'min-w-[14vw]' },
  { header: 'Gói' },
  { header: 'Album tạo', className: 'text-right' },
  { header: 'Đã xóa sau đó', className: 'text-right' },
];

/** Cột lấy đúng từ `StorageTable`, bảng dung lượng theo workspace. */
export const STORAGE_COLUMNS = [
  { header: 'Workspace', className: 'min-w-[14vw]' },
  { header: 'Gói' },
  { header: 'Album', className: 'text-right' },
  { header: 'Ảnh', className: 'text-right' },
  { header: 'Dung lượng', className: 'text-right' },
  { header: 'Dung lượng album cho phép tải', className: 'text-right' },
  { header: 'Độ phủ', className: 'text-right' },
];

/** Bảng theo tháng: `DEFAULT_MONTH_COUNT` tháng mặc định cộng dòng Tổng. */
export function MonthlyTableSkeleton() {
  return <TableSkeleton columns={MONTH_COLUMNS} rows={DEFAULT_MONTH_COUNT + 1} mobileCards />;
}

/** Bảng workspace trong tháng, dùng trong lúc khung tháng đang tải hoặc đang bấm "Thử lại". */
export function MonthPanelTableSkeleton() {
  return <TableSkeleton columns={MONTH_WORKSPACE_COLUMNS} rows={6} mobileCards />;
}

/** Tab "Theo tháng" lúc tải lượt đầu: hàng chọn tháng (hai ô) rồi bảng. */
export function MonthlyTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <FilterBarSkeleton fields={2} search={false} />
      <MonthlyTableSkeleton />
    </div>
  );
}

/**
 * Kết quả "Tính dung lượng" lúc đang quét: dải tổng rồi bảng. Lượt quét có thể chờ tới 35 giây mới có
 * kết quả hoặc báo lỗi, nên có một dòng nói rõ máy đang làm gì thay vì để khung xương đứng im.
 */
export function StorageResultSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <Text variant="body-sm" muted>
        Đang quét ảnh của các album trong khoảng đã chọn, có thể mất vài chục giây.
      </Text>
      <AlbumTotalsSkeleton />
      <TableSkeleton columns={STORAGE_COLUMNS} rows={6} mobileCards />
    </div>
  );
}

/**
 * `/client-albums` lúc tải: tab mặc định "Theo tháng" với tên màn và nhãn tab là chữ thật. Dùng chung
 * cho `loading.tsx` và `Suspense` của `page.tsx`.
 */
export function ClientAlbumSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Album khách" actions={0} />
      <TabsListSkeleton labels={CLIENT_ALBUM_TAB_LABELS} />
      <div className="mt-4">
        <MonthlyTabSkeleton />
      </div>
    </>
  );
}
