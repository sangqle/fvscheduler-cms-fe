'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarOff, RotateCcw, Search, SearchX, Users, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { ChoiceSelect, FilterSelect } from '@/components/admin/shared/FilterSelect';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { BookingDrawer } from '@/components/admin/workspaces/BookingDrawer';
import { BookingSummaryStrip } from '@/components/admin/workspaces/BookingSummaryStrip';
import { BookingTable } from '@/components/admin/workspaces/BookingTable';
import { useAdminBookings, useAdminBookingSummary } from '@/hooks/useAdminBookings';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { BOOKING_SORT_OPTIONS, BOOKING_STATUS_LABEL } from '@/lib/admin/labels';
import { bookingStaffing } from '@/lib/admin/booking';
import type { AdminBookingRow } from '@/types/admin';
import type { BookingStatus } from '@/types/booking';

const DEFAULT_SORT = 'createdAt,desc';
const DEFAULT_SIZE = 20;
const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];

/** `yyyy-MM-dd` (giá trị trên URL) → `Date` giờ máy. */
function parseDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayMonth(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function startOfDayIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

/** `to` của backend là mốc **loại trừ**, nên "đến hết ngày X" là 00:00 của ngày X+1. */
function endOfDayExclusiveIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).toISOString();
}

/**
 * CMS-02 tab Booking: soi booking của một workspace đúng như chủ workspace nhìn thấy.
 *
 * Chỉ đọc, hai endpoint, không một thao tác ghi nào. Bộ lọc sống trên URL với tiền tố `bk` vì tab
 * này dùng chung query string với màn chi tiết workspace, nơi `tab` và `from` (khóa đường về danh
 * sách) đã có chủ.
 */
export function BookingTab({ workspaceId }: { workspaceId: string }) {
  const { get, set } = useUrlState();

  const status = (get('bkStatus') as BookingStatus | undefined) ?? undefined;
  const searchParam = get('bkQ');
  const fromDay = get('bkFrom');
  const toDay = get('bkTo');
  const includeDeleted = get('bkDeleted') === '1';
  const sort = get('bkSort') ?? DEFAULT_SORT;
  const onlyUnstaffed = get('bkOnly') === 'unstaffed';
  const page = toInt(get('bkPage'), 0);
  const size = toInt(get('bkSize'), DEFAULT_SIZE);

  const [search, setSearch] = React.useState(searchParam ?? '');
  React.useEffect(() => setSearch(searchParam ?? ''), [searchParam]);
  React.useEffect(() => {
    if (search === (searchParam ?? '')) return;
    const t = setTimeout(() => set({ bkQ: search || undefined, bkPage: undefined }), 300);
    return () => clearTimeout(t);
  }, [search, searchParam, set]);

  const range: DateRange | undefined = React.useMemo(() => {
    const from = parseDay(fromDay);
    const to = parseDay(toDay);
    return from || to ? { from, to } : undefined;
  }, [fromDay, toDay]);

  // Không đặt tên là `window`: trùng biến toàn cục của trình duyệt trong chính file này.
  const apiWindow = React.useMemo(
    () => ({
      from: range?.from ? startOfDayIso(range.from) : undefined,
      to: range?.to ? endOfDayExclusiveIso(range.to) : undefined,
    }),
    [range],
  );

  const list = useAdminBookings(workspaceId, {
    status,
    search: searchParam,
    ...apiWindow,
    includeDeleted: includeDeleted || undefined,
    sort,
    page,
    size,
  });
  const summary = useAdminBookingSummary(workspaceId, apiWindow);

  /** Đổi bộ lọc luôn kéo về trang đầu; `useUrlState` chỉ tự làm việc đó cho khóa `page` trơn. */
  const setFilter = React.useCallback(
    (patch: Record<string, string | number | undefined>) => set({ ...patch, bkPage: undefined }),
    [set],
  );

  const clearFilters = React.useCallback(() => {
    setSearch('');
    set({
      bkStatus: undefined,
      bkQ: undefined,
      bkFrom: undefined,
      bkTo: undefined,
      bkDeleted: undefined,
      bkOnly: undefined,
      bkPage: undefined,
    });
  }, [set]);

  const filtered = !!(status || searchParam || fromDay || toDay || includeDeleted || onlyUnstaffed);
  const rows = React.useMemo(() => list.data?.content ?? [], [list.data]);

  /**
   * "Chưa xếp người" lọc **phía client trên trang đang xem**: API danh sách không có tham số nào
   * theo chỗ trống nhân sự, nên con số ở dải tóm tắt là của cả cửa sổ còn bảng thì chỉ lọc được
   * những gì trang này đang giữ.
   */
  const visible: AdminBookingRow[] = React.useMemo(() => {
    if (!onlyUnstaffed) return rows;
    return rows.filter((r) => {
      if (!r.booking) return false;
      const { assigned, total } = bookingStaffing(r.booking);
      return total > 0 && assigned === 0;
    });
  }, [rows, onlyUnstaffed]);

  const [openedId, setOpenedId] = React.useState<string | null>(null);
  const openedIndex = visible.findIndex((r) => r.admin.id === openedId);
  const opened = openedIndex >= 0 ? visible[openedIndex] : null;
  // Dòng đang mở biến mất khỏi trang (đổi bộ lọc, sang trang khác) thì đóng drawer thay vì treo
  // một panel trỏ vào bản ghi không còn ở đây.
  React.useEffect(() => {
    if (openedId && !visible.some((r) => r.admin.id === openedId)) setOpenedId(null);
  }, [visible, openedId]);

  const windowLabel = range?.from
    ? `${dayMonth(range.from)}${range.to ? ` → ${dayMonth(range.to)}` : ''}`
    : 'toàn bộ';

  const statusOptions = STATUSES.map((s) => ({
    value: s,
    label: BOOKING_STATUS_LABEL[s],
    count: summary.data?.byStatus[s],
  }));

  const neverHadBooking = !filtered && !list.isPending && rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <BookingSummaryStrip
        summary={summary.data}
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        onPickTotal={clearFilters}
        onPickDeleted={() => setFilter({ bkDeleted: '1', bkOnly: undefined })}
        onPickUnstaffed={() => setFilter({ bkOnly: 'unstaffed' })}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Tên khách, số điện thoại, hoặc mã booking"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tìm booking"
          containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-80"
        />
        <FilterSelect
          label="Trạng thái"
          value={status}
          onChange={(v) => setFilter({ bkStatus: v })}
          options={statusOptions}
          className="w-auto"
        />
        <DateRangePicker
          value={range}
          onChange={(r) =>
            setFilter({
              bkFrom: r?.from ? toDayKey(r.from) : undefined,
              bkTo: r?.to ? toDayKey(r.to) : undefined,
            })
          }
          placeholder="Ngày chụp: toàn bộ"
          className="w-auto"
        />
        <ChoiceSelect
          label="Sắp theo"
          value={sort}
          onChange={(v) => setFilter({ bkSort: v === DEFAULT_SORT ? undefined : v })}
          options={BOOKING_SORT_OPTIONS}
          className="w-auto"
        />
        <span className="inline-flex items-center gap-2">
          <Switch
            id="bk-deleted"
            checked={includeDeleted}
            onCheckedChange={(c) => setFilter({ bkDeleted: c ? '1' : undefined })}
          />
          <Label htmlFor="bk-deleted">Hiện cả đã xóa</Label>
        </span>
        {onlyUnstaffed && (
          <Button variant="outline" size="sm" onClick={() => setFilter({ bkOnly: undefined })}>
            Chỉ dòng chưa xếp người
            <X className="size-3.5" />
          </Button>
        )}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5" />
            Xóa bộ lọc
          </Button>
        )}
        <ReadOnlyHint className="ml-auto">Chỉ đọc</ReadOnlyHint>
      </div>

      {onlyUnstaffed && (
        <Text variant="caption" muted>
          Lọc phía client trên trang đang xem: API danh sách không có tham số nào theo chỗ trống nhân sự. Trang này còn{' '}
          <b className="font-mono text-foreground">
            {visible.length}/{rows.length}
          </b>{' '}
          dòng; muốn quét cả workspace thì tăng cỡ trang hoặc thu hẹp khoảng ngày.
        </Text>
      )}

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <BookingTable
          rows={visible}
          isLoading={list.isPending}
          onOpen={(r) => setOpenedId(r.admin.id)}
          openedId={openedId}
          page={page}
          pageCount={list.data?.totalPages ?? 1}
          totalRows={list.data?.totalElements ?? 0}
          pageSize={size}
          onPageChange={(p) => set({ bkPage: p || undefined })}
          onPageSizeChange={(s) => setFilter({ bkSize: s === DEFAULT_SIZE ? undefined : s })}
          emptyContent={
            neverHadBooking ? (
              <EmptyState
                icon={<CalendarOff />}
                title="Workspace này chưa có booking nào"
                description="Studio đã mở workspace nhưng chưa dùng phần lịch chụp."
                action={
                  <Button variant="outline" asChild>
                    <Link href={`/workspaces/${workspaceId}?tab=members`}>
                      <Users className="size-4" />
                      Xem thành viên
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<SearchX />}
                title="Không có booking nào khớp bộ lọc"
                description={
                  summary.data
                    ? `Workspace vẫn có ${summary.data.total} booking còn sống trong khoảng ${windowLabel}, nhưng không cái nào khớp phần còn lại của bộ lọc.`
                    : 'Không có booking nào khớp bộ lọc này.'
                }
                action={
                  filtered && (
                    <Button variant="outline" onClick={clearFilters}>
                      <RotateCcw className="size-4" />
                      Xóa bộ lọc
                    </Button>
                  )
                }
              />
            )
          }
        />
      )}

      <BookingDrawer
        row={opened}
        open={!!opened}
        onClose={() => setOpenedId(null)}
        onPrev={() => openedIndex > 0 && setOpenedId(visible[openedIndex - 1].admin.id)}
        onNext={() => openedIndex < visible.length - 1 && setOpenedId(visible[openedIndex + 1].admin.id)}
        position={openedIndex + 1}
        total={visible.length}
      />
    </div>
  );
}
