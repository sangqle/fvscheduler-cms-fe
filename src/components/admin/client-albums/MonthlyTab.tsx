'use client';

import * as React from 'react';
import { Images, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { ChoiceSelect } from '@/components/admin/shared/FilterSelect';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { MonthlyTabSkeleton, MonthlyTableSkeleton } from '@/components/admin/client-albums/ClientAlbumSkeletons';
import { CLIENT_ALBUM_URL_KEYS, DEFAULT_MONTH_COUNT } from '@/components/admin/client-albums/clientAlbumTabs';
import { MonthlyTable } from '@/components/admin/client-albums/MonthlyTable';
import { MonthWorkspacesPanel } from '@/components/admin/client-albums/MonthWorkspacesPanel';
import {
  defaultMonthRange,
  monthChoices,
  monthInRange,
  resolveMonth,
  resolveMonthRange,
  withFromMonth,
  withToMonth,
  type MonthRange,
} from '@/components/admin/client-albums/monthlyFilters';
import { useAdminAlbumMonthly } from '@/hooks/useAdminClientAlbums';
import { useUrlState } from '@/hooks/useUrlState';
import { formatMonthKey } from '@/lib/admin/time';
import { cn } from '@/lib/utils';

const {
  fromMonth: FROM_KEY,
  toMonth: TO_KEY,
  month: MONTH_KEY,
  monthPage: PAGE_KEY,
} = CLIENT_ALBUM_URL_KEYS;

/**
 * Tab "Theo tháng": album khách tạo mỗi tháng (một lượt gọi rẻ, chạy ngay khi tab mở), và bấm một tháng
 * để xem workspace nào đã tạo chúng.
 *
 * Mọi con số ở tab này là SỰ KIỆN TẠO: album tạo hồi tháng 10 rồi xóa vẫn nằm ở tháng 10. Khác hẳn
 * hạn mức hằng tháng của workspace (chỉ đếm album còn sống), nên bảng có chú thích riêng về chuyện đó.
 *
 * Khoảng tháng sống trên URL (`mFrom`, `mTo`) NHƯNG chỉ sau khi admin đổi nó. Lần đầu không có khóa nào và
 * màn này tự gửi `DEFAULT_MONTH_COUNT` tháng gần nhất theo giờ Việt Nam (`defaultMonthRange`), để bảng ngắn
 * và khung workspace của tháng được bấm hiện ngay bên dưới. Tháng đang mở khung workspace sống ở `month`,
 * trang của khung ở `mPage`/`mSize`.
 */
export function MonthlyTab() {
  const { get, set } = useUrlState();
  const range = resolveMonthRange(get(FROM_KEY), get(TO_KEY));
  const selected = resolveMonth(get(MONTH_KEY));
  // Khoảng đang áp dụng: khoảng trên URL, hoặc mặc định. Hai ô chọn luôn hiện đúng khoảng này.
  const shown: MonthRange = range ?? defaultMonthRange();

  const query = useAdminAlbumMonthly(shown);
  const data = query.data;
  // `keepPreviousData` giữ bảng của khoảng cũ trong lúc khoảng mới đang tải. Mờ đi để số của khoảng cũ
  // không đứng dưới ô chọn của khoảng mới như thể là của nó.
  const stale = query.isPlaceholderData;

  const choices = React.useMemo(
    () => monthChoices(shown.fromMonth, shown.toMonth),
    [shown.fromMonth, shown.toMonth],
  );

  const monthRow = selected && data ? data.months.find((m) => m.month === selected) : undefined;

  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const revealPending = React.useRef(false);
  const revealPanel = React.useCallback(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  // Khung workspace nằm dưới bảng, ngoài tầm nhìn ở 12 dòng: không cuộn tới thì bấm một tháng trông như
  // không có gì xảy ra. Chỉ cuộn khi chính admin vừa bấm, không cuộn khi mở link có sẵn `month`.
  React.useEffect(() => {
    if (!selected || !revealPending.current) return;
    revealPending.current = false;
    revealPanel();
  }, [selected, revealPanel]);

  const select = React.useCallback(
    (month: string) => {
      if (month === selected) {
        revealPanel();
        return;
      }
      revealPending.current = true;
      // Đổi tháng luôn về trang đầu; `useUrlState` chỉ tự làm việc đó cho khóa `page` trơn.
      set({ [MONTH_KEY]: month, [PAGE_KEY]: undefined });
    },
    [selected, set, revealPanel],
  );

  const closePanel = React.useCallback(() => set({ [MONTH_KEY]: undefined, [PAGE_KEY]: undefined }), [set]);

  const changeRange = (next: MonthRange) =>
    set({
      [FROM_KEY]: next.fromMonth,
      [TO_KEY]: next.toMonth,
      // Tháng đang mở mà rơi ra ngoài khoảng mới thì đóng khung: bảng không còn dòng nào để làm nổi nó.
      [MONTH_KEY]: selected && monthInRange(selected, next) ? selected : undefined,
      [PAGE_KEY]: undefined,
    });

  const resetRange = () =>
    set({ [FROM_KEY]: undefined, [TO_KEY]: undefined, [MONTH_KEY]: undefined, [PAGE_KEY]: undefined });

  // Lượt đầu vào tab: khung xương cả hàng chọn tháng và bảng. Sau lượt đầu `keepPreviousData` giữ dữ liệu
  // cũ nên đổi khoảng không rơi lại vào nhánh này. Lỗi thì `isPending` cũng tắt nên không kẹt.
  if (query.isPending) return <MonthlyTabSkeleton />;

  let body: React.ReactNode;
  if (query.error) {
    // Đang bấm "Thử lại" thì hiện khung xương: route có thể chờ tới 35 giây mới báo 503, một nút đứng yên
    // suốt chừng đó thời gian trông như không làm gì cả.
    body = query.isFetching ? (
      <MonthlyTableSkeleton />
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  } else if (data && data.totals.created === 0) {
    body = (
      <EmptyState
        icon={<Images />}
        title="Chưa có album nào được tạo trong khoảng này"
        description={`Không có album khách nào được tạo từ ${formatMonthKey(shown.fromMonth)} đến ${formatMonthKey(shown.toMonth)}. Thử chọn khoảng dài hơn.`}
      />
    );
  } else if (data) {
    body = (
      <div aria-busy={stale} className={cn('flex flex-col gap-2 transition-opacity', stale && 'opacity-60')}>
        <MonthlyTable months={data.months} totals={data.totals} selected={selected} onSelect={select} />
        <Text variant="caption" muted>
          Bấm một tháng để xem workspace nào đã tạo album.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChoiceSelect
          label="Từ"
          value={shown.fromMonth}
          options={choices}
          onChange={(v) => changeRange(withFromMonth(shown, v))}
          size="sm"
          className="w-36"
        />
        <ChoiceSelect
          label="Đến"
          value={shown.toMonth}
          options={choices}
          onChange={(v) => changeRange(withToMonth(shown, v))}
          size="sm"
          className="w-36"
        />
        {range && (
          <Button variant="ghost" size="sm" onClick={resetRange}>
            <RotateCcw className="size-3.5" />
            {DEFAULT_MONTH_COUNT} tháng gần nhất
          </Button>
        )}
        <ReadOnlyHint className="ml-auto">Chỉ đọc</ReadOnlyHint>
      </div>

      {body}

      {selected && monthRow && data && data.totals.created > 0 && !query.error && (
        <div ref={panelRef} className="scroll-mt-4">
          <MonthWorkspacesPanel month={selected} stats={monthRow} onClose={closePanel} />
        </div>
      )}
    </div>
  );
}
