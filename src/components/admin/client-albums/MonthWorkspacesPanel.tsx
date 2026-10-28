'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Images, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { AlbumWorkspaceCell, useAlbumWorkspaceHref } from '@/components/admin/client-albums/AlbumWorkspaceCell';
import { MonthPanelTableSkeleton } from '@/components/admin/client-albums/ClientAlbumSkeletons';
import {
  CLIENT_ALBUM_URL_KEYS,
  MONTH_PANEL_PAGE_SIZE,
  MONTH_PANEL_PAGE_SIZES,
} from '@/components/admin/client-albums/clientAlbumTabs';
import { CountCell } from '@/components/admin/client-albums/CountCell';
import { PlanCell } from '@/components/admin/client-albums/PlanCell';
import { useAdminAlbumWorkspaces } from '@/hooks/useAdminClientAlbums';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { formatCount } from '@/lib/admin/clientAlbums';
import { formatMonthKey, monthDayKeys } from '@/lib/admin/time';
import { cn } from '@/lib/utils';
import type { AdminAlbumMonth, AdminAlbumWorkspaceCountRow } from '@/types/admin';

const { monthPage: PAGE_KEY, monthSize: SIZE_KEY } = CLIENT_ALBUM_URL_KEYS;

/**
 * Khung bên dưới bảng tháng: workspace nào đã tạo album trong tháng được chọn, nhiều album nhất trước,
 * kể cả dòng "Không thuộc workspace". Đếm SỰ KIỆN TẠO như bảng tháng, nên số ở đây cộng lại bằng số
 * "Album tạo mới" của tháng (không phải số album còn sống: cột "Đã xóa sau đó" là phần chênh).
 *
 * Có đủ bốn trạng thái của riêng nó. Tháng không có album nào thì hiện trạng thái rỗng và KHÔNG gọi
 * route (`enabled: false`). Lỗi 503 chỉ làm hỏng khung này, bảng tháng bên trên vẫn đứng nguyên. Từ tháng
 * này sang tháng khác (`keepPreviousData`) khung mờ đi chứ không để hàng của tháng cũ đứng dưới tiêu đề
 * tháng mới như thể là của nó, và trang luôn về 0 (xem `MonthlyTab`, hàm `select`).
 *
 * Header phải khớp `MONTH_WORKSPACE_COLUMNS` ở `ClientAlbumSkeletons.tsx`.
 */
export function MonthWorkspacesPanel({
  month,
  stats,
  onClose,
}: {
  /** `yyyy-MM`, đã kiểm là tháng có thật và nằm trong khoảng đang xem. */
  month: string;
  /** Dòng của tháng này trong bảng tháng: biết trước tháng có album hay không để khỏi gọi route thừa. */
  stats: AdminAlbumMonth;
  onClose: () => void;
}) {
  const router = useRouter();
  const { get, set } = useUrlState();
  const albumHref = useAlbumWorkspaceHref();

  const days = monthDayKeys(month);
  const hasAlbums = stats.created > 0 && days !== null;
  const page = toInt(get(PAGE_KEY), 0);
  const requestedSize = toInt(get(SIZE_KEY), MONTH_PANEL_PAGE_SIZE);
  // Cỡ trang lạ gõ tay trên URL thì về mặc định thay vì để ô chọn cỡ trang trống không.
  const size = MONTH_PANEL_PAGE_SIZES.includes(requestedSize) ? requestedSize : MONTH_PANEL_PAGE_SIZE;

  const list = useAdminAlbumWorkspaces({ from: days?.from, to: days?.to, page, size }, { enabled: hasAlbums });
  const data = list.data;
  const stale = list.isPlaceholderData;

  // Link cũ trỏ vào một trang không còn nữa. Trang đầu của một tháng có album thì luôn có dòng, nên trang
  // sau đó mà rỗng nghĩa là đã quá cuối: về trang đầu thay vì báo "không có workspace" cho một tháng có album.
  const pastTheEnd = page > 0 && !!data && !stale && data.content.length === 0;
  React.useEffect(() => {
    if (pastTheEnd) set({ [PAGE_KEY]: undefined });
  }, [pastTheEnd, set]);

  const rowHref = (r: AdminAlbumWorkspaceCountRow) => albumHref(r.workspace, days);

  const columns: ColumnDef<AdminAlbumWorkspaceCountRow>[] = [
    {
      id: 'workspace',
      header: 'Workspace',
      className: 'min-w-[14vw]',
      cell: (r) => <AlbumWorkspaceCell workspace={r.workspace} href={rowHref(r)} />,
    },
    { id: 'plan', header: 'Gói', cell: (r) => <PlanCell subscription={r.workspace?.subscription ?? null} /> },
    { id: 'albums', header: 'Album tạo', className: 'text-right', cell: (r) => <CountCell value={r.albums} /> },
    {
      id: 'deleted',
      header: 'Đã xóa sau đó',
      className: 'text-right',
      cell: (r) => <CountCell value={r.deleted} dimZero />,
    },
  ];

  let body: React.ReactNode;
  if (!hasAlbums) {
    body = (
      <EmptyState
        icon={<Images />}
        title={`Không có album nào được tạo trong ${formatMonthKey(month)}`}
        description="Tháng này không có album khách nào được tạo, nên không có workspace nào để liệt kê."
      />
    );
  } else if (list.error) {
    // Đang bấm "Thử lại" thì hiện khung xương: route có thể chờ tới 35 giây mới báo 503, một nút đứng yên
    // suốt chừng đó thời gian trông như không làm gì cả.
    body = list.isFetching ? (
      <MonthPanelTableSkeleton />
    ) : (
      <ErrorState error={list.error} onRetry={() => void list.refetch()} />
    );
  } else if (!data) {
    body = <MonthPanelTableSkeleton />;
  } else {
    body = (
      <div aria-busy={stale} className={cn('transition-opacity', stale && 'opacity-60')}>
        <DataTable
          columns={columns}
          data={data.content}
          rowKey={(r) => r.workspace?.id ?? 'personal'}
          mobileCards
          paginated
          manualPagination
          pageIndex={page}
          pageCount={data.totalPages}
          totalRows={data.totalElements}
          defaultPageSize={size}
          pageSizeOptions={MONTH_PANEL_PAGE_SIZES}
          onPageChange={(p) => set({ [PAGE_KEY]: p || undefined })}
          onPageSizeChange={(s) =>
            set({ [SIZE_KEY]: s === MONTH_PANEL_PAGE_SIZE ? undefined : s, [PAGE_KEY]: undefined })
          }
          onRowClick={(r) => {
            const href = rowHref(r);
            if (href) router.push(href);
          }}
          isRowDisabled={(r) => rowHref(r) === null}
          emptyContent={
            <EmptyState
              icon={<Images />}
              title="Không có workspace nào trong tháng này"
              description="Tháng này có album được tạo nhưng danh sách workspace đang trống. Thử tải lại sau ít phút."
            />
          }
        />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label={`Workspace tạo album trong ${formatMonthKey(month)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading level="3">Workspace tạo album trong {formatMonthKey(month)}</Heading>
          <Text variant="body-sm" muted className="mt-1">
            {formatCount(stats.created)} album tạo mới, {formatCount(stats.deleted)} đã xóa sau đó · workspace tạo
            nhiều album nhất xếp trước · bấm một dòng để xem album còn sống của workspace trong tháng này
          </Text>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
          Đóng
        </Button>
      </div>
      {body}
    </section>
  );
}
