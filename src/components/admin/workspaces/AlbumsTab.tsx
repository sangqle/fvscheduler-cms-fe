'use client';

import * as React from 'react';
import { Images, RotateCcw, SearchX, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, DEFAULT_PAGE_SIZE_OPTIONS, type ColumnDef } from '@/components/ui/DataTable';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoTip } from '@/components/ui/InfoTip';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { AlbumSizeCell } from '@/components/admin/workspaces/AlbumSizeCell';
import { AlbumTotalsStrip } from '@/components/admin/workspaces/AlbumTotalsStrip';
import { AlbumTableSkeleton, AlbumsTabSkeleton } from '@/components/admin/workspaces/WorkspaceSkeletons';
import { useAdminWorkspaceAlbums } from '@/hooks/useAdminClientAlbums';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { ALBUM_TAB_KEYS, formatCount } from '@/lib/admin/clientAlbums';
import { clientAlbumProviderMeta } from '@/lib/admin/labels';
import {
  calendarDayKey,
  calendarDayOfPicker,
  formatCalendarDay,
  formatNaiveVnDateTime,
  parseCalendarDayKey,
  pickerDateOf,
} from '@/lib/admin/time';
import { cn } from '@/lib/utils';
import type { AdminWorkspaceAlbumRow } from '@/types/admin';

const DEFAULT_SIZE = 20;

const SIZE_HEADER_HINT =
  'Chưa rõ dung lượng: album có ảnh nhưng Google Drive chưa báo dung lượng của ảnh nào, gồm mọi album NAS và một số album Drive cũ. Album chỉ biết dung lượng một phần ảnh thì số GB là mức tối thiểu, kèm số ảnh đã biết.';

/**
 * Ngày trên URL chỉ được dùng khi là một ngày có thật. Sai dạng (gõ tay, link cũ) thì coi như không có
 * và không gửi lên API, để khỏi ăn một lỗi 400 vì chuỗi mà chính màn này không thể tạo ra.
 */
function validDayKey(raw: string | undefined): string | undefined {
  const day = parseCalendarDayKey(raw);
  return day ? calendarDayKey(day) : undefined;
}

function dayLabel(key: string): string {
  const day = parseCalendarDayKey(key);
  return day ? formatCalendarDay(day) : key;
}

/** Câu nói dải tổng đang tính cho khoảng nào. Hai đầu đều bao gồm; thiếu một đầu là mở. */
function scopeLabel(from: string | undefined, to: string | undefined): string {
  if (from && to) {
    return from === to
      ? `Album còn sống tạo ngày ${dayLabel(from)}`
      : `Album còn sống tạo từ ${dayLabel(from)} đến ${dayLabel(to)}`;
  }
  if (from) return `Album còn sống tạo từ ${dayLabel(from)}`;
  if (to) return `Album còn sống tạo đến ${dayLabel(to)}`;
  return 'Tất cả album còn sống';
}

const columns: ColumnDef<AdminWorkspaceAlbumRow>[] = [
  {
    id: 'title',
    header: 'Tên album',
    className: 'min-w-[12vw]',
    cell: (a) =>
      a.title?.trim() ? (
        <span className="font-medium text-foreground">{a.title}</span>
      ) : (
        <span className="text-sm italic text-muted-foreground">Chưa đặt tên</span>
      ),
  },
  {
    id: 'client',
    header: 'Khách',
    className: 'min-w-[9vw]',
    cell: (a) =>
      a.clientName?.trim() ? (
        <span className="text-sm text-foreground">{a.clientName}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    // Trạng thái do spring-a7c giữ, không thuộc ERP nên không có bảng nhãn: in nguyên văn chữ hoa mono.
    cell: (a) =>
      a.status ? (
        <Badge variant="outline" size="sm" mono>
          {a.status}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'provider',
    header: 'Drive / NAS',
    cell: (a) => <EnumBadge meta={clientAlbumProviderMeta(a.provider)} mono={false} />,
  },
  {
    id: 'createdAt',
    header: 'Tạo lúc',
    className: 'w-36',
    // Giờ tường Việt Nam không offset: chỉ tách chuỗi, không qua Date nên múi giờ người xem không làm lệch.
    cell: (a) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatNaiveVnDateTime(a.createdAt)}</span>
    ),
  },
  {
    id: 'photos',
    header: 'Ảnh',
    className: 'w-20 text-right',
    cell: (a) => <span className="font-mono text-xs tabular-nums">{formatCount(a.photos)}</span>,
  },
  {
    id: 'size',
    header: (
      <span className="inline-flex items-center gap-1">
        Dung lượng
        <InfoTip content={SIZE_HEADER_HINT} />
      </span>
    ),
    className: 'text-right',
    cell: (a) => <AlbumSizeCell counts={a} bytes={a.bytes} align="end" />,
  },
  {
    id: 'download',
    header: 'Cho tải về',
    className: 'w-24',
    cell: (a) =>
      a.allowDownload ? (
        <Badge variant="success" size="sm" mono>
          True
        </Badge>
      ) : (
        <Badge variant="muted" size="sm" mono>
          False
        </Badge>
      ),
  },
];

/**
 * Tab Album khách của chi tiết workspace: album còn sống của workspace, mới nhất trước, kèm dải tổng
 * cho cả khoảng ngày đang lọc. Chỉ đọc, một lời gọi (`totals` và bảng cùng về một lượt), chạy ngay khi
 * tab mở vì một workspace là rẻ.
 *
 * Bộ lọc sống trên URL với tiền tố `al` (xem `ALBUM_TAB_KEYS`) vì tab dùng chung query với màn chi
 * tiết, nơi `tab` và `from` (khóa đường về danh sách) đã có chủ. `alFrom` và `alTo` là ngày lịch Việt
 * Nam `yyyy-MM-dd`, cả hai đầu BAO GỒM: khác hẳn tab Booking vốn quy `to` về đầu ngày kế tiếp, ở đây
 * ngày trên URL chính là ngày gửi API.
 *
 * Số liệu này do framevis-drive tính nên lỗi (503) chỉ làm hỏng riêng tab này.
 */
export function AlbumsTab({ workspaceId }: { workspaceId: string }) {
  const { get, set } = useUrlState();

  const fromKey = validDayKey(get(ALBUM_TAB_KEYS.from));
  const toKey = validDayKey(get(ALBUM_TAB_KEYS.to));
  const page = toInt(get(ALBUM_TAB_KEYS.page), 0);
  const requestedSize = toInt(get(ALBUM_TAB_KEYS.size), DEFAULT_SIZE);
  // Cỡ trang lạ gõ tay trên URL (7, 0, 500) thì về mặc định thay vì để ô chọn cỡ trang trống không.
  const size = DEFAULT_PAGE_SIZE_OPTIONS.includes(requestedSize) ? requestedSize : DEFAULT_SIZE;
  const filtered = !!(fromKey || toKey);

  const range = React.useMemo<DateRange | undefined>(() => {
    const from = parseCalendarDayKey(fromKey);
    const to = parseCalendarDayKey(toKey);
    return from || to ? { from: from ? pickerDateOf(from) : undefined, to: to ? pickerDateOf(to) : undefined } : undefined;
  }, [fromKey, toKey]);

  const list = useAdminWorkspaceAlbums(workspaceId, { from: fromKey, to: toKey, page, size });
  const data = list.data;
  // `keepPreviousData` giữ số liệu của khoảng cũ trong lúc khoảng mới đang tải. Mờ đi để dải tổng và
  // bảng không đứng dưới nhãn khoảng mới như thể là số của nó.
  const stale = list.isPlaceholderData;

  /** Đổi bộ lọc luôn kéo về trang đầu; `useUrlState` chỉ tự làm việc đó cho khóa `page` trơn. */
  const setRange = React.useCallback(
    (next?: DateRange) =>
      set({
        [ALBUM_TAB_KEYS.from]: next?.from ? calendarDayKey(calendarDayOfPicker(next.from)) : undefined,
        [ALBUM_TAB_KEYS.to]: next?.to ? calendarDayKey(calendarDayOfPicker(next.to)) : undefined,
        [ALBUM_TAB_KEYS.page]: undefined,
      }),
    [set],
  );

  const clearFilters = React.useCallback(
    () =>
      set({
        [ALBUM_TAB_KEYS.from]: undefined,
        [ALBUM_TAB_KEYS.to]: undefined,
        [ALBUM_TAB_KEYS.page]: undefined,
      }),
    [set],
  );

  // Link cũ trỏ vào một trang không còn nữa (album bị xóa nên ít trang đi). Trang đầu của một tập
  // không rỗng thì luôn có dòng, nên trang sau trang đầu mà rỗng nghĩa là đã quá cuối: về trang đầu
  // thay vì báo "chưa có album" cho một workspace vẫn còn album.
  const pastTheEnd = page > 0 && !!data && !stale && data.albums.content.length === 0;
  React.useEffect(() => {
    if (pastTheEnd) set({ [ALBUM_TAB_KEYS.page]: undefined });
  }, [pastTheEnd, set]);

  // Lượt đầu vào tab: khung xương cả dải tổng, hàng lọc và bảng. Sau lượt đầu `keepPreviousData` giữ
  // dữ liệu cũ nên đổi bộ lọc không rơi lại vào nhánh này. Lỗi thì `isPending` cũng tắt nên không kẹt.
  if (list.isPending) return <AlbumsTabSkeleton />;

  const rows = data?.albums.content ?? [];
  const staleClass = cn('transition-opacity', stale && 'opacity-60');

  return (
    <div className="flex flex-col gap-4">
      {/* Không có album nào trong khoảng thì dải tổng chỉ toàn số 0, bỏ đi và để trạng thái rỗng nói. */}
      {!list.error && data && data.totals.albums > 0 && (
        <div className={staleClass}>
          <AlbumTotalsStrip totals={data.totals} scope={scopeLabel(fromKey, toKey)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker value={range} onChange={setRange} placeholder="Ngày tạo album: toàn bộ" className="w-auto" />
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5" />
            Xóa bộ lọc
          </Button>
        )}
        <ReadOnlyHint className="ml-auto">Chỉ đọc</ReadOnlyHint>
      </div>

      {list.error ? (
        list.isFetching ? (
          <AlbumTableSkeleton />
        ) : (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        )
      ) : (
        <div aria-busy={stale} className={staleClass}>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(a) => a.id}
            mobileCards
            paginated
            manualPagination
            pageIndex={page}
            pageCount={data?.albums.totalPages ?? 1}
            totalRows={data?.albums.totalElements ?? 0}
            defaultPageSize={size}
            onPageChange={(p) => set({ [ALBUM_TAB_KEYS.page]: p || undefined })}
            onPageSizeChange={(s) =>
              set({ [ALBUM_TAB_KEYS.size]: s === DEFAULT_SIZE ? undefined : s, [ALBUM_TAB_KEYS.page]: undefined })
            }
            emptyContent={
              filtered ? (
                <EmptyState
                  icon={<SearchX />}
                  title="Không có album nào trong khoảng này"
                  description="Workspace không có album còn sống nào được tạo trong khoảng ngày đã chọn. Album đã xóa không hiện ở đây."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      <RotateCcw className="size-4" />
                      Xóa bộ lọc
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Images />}
                  title="Workspace này chưa có album khách nào"
                  description="Chưa tạo album nào, hoặc các album đã tạo đều đã bị xóa. Album đã xóa không hiện ở đây."
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
}
