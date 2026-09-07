'use client';

import { TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import {
  BOOKING_LIFECYCLE,
  BOOKING_STATUS_LABEL,
  bookingStatusVariant,
} from '@/lib/admin/labels';
import { cn } from '@/lib/utils';
import type { AdminBookingSummary } from '@/types/admin';
import type { BookingStatus } from '@/types/booking';

/** Thứ tự đọc của dải "Theo trạng thái": theo tiến trình, không theo số lượng. */
const STATUS_ORDER: readonly BookingStatus[] = [...BOOKING_LIFECYCLE, 'cancelled'];

/** `2026-09-01` → `09`; năm nằm ở tooltip vì trục ngang chỉ có chỗ cho hai chữ số. */
function monthLabel(key: string): string {
  return key.slice(5, 7);
}

function monthTitle(key: string): string {
  return `Tháng ${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

function Tile({
  value,
  label,
  hint,
  onClick,
  tone = 'default',
}: {
  value: number;
  label: string;
  hint: string;
  onClick: () => void;
  /** `warning` khi con số là thứ cần người nhìn tới, `quiet` khi nó chỉ là bối cảnh. */
  tone?: 'default' | 'quiet' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-m-1.5 flex flex-col items-start gap-px rounded-xl p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        tone === 'warning' ? 'bg-warning/10 hover:bg-warning/20' : 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'font-mono text-2xl font-semibold leading-tight tabular-nums',
          tone === 'warning' ? 'text-warning-deep' : tone === 'quiet' ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span className={cn('text-xs', tone === 'warning' ? 'font-semibold text-warning-deep' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className={cn('font-mono text-[10px]', tone === 'warning' ? 'text-warning-deep' : 'text-muted-foreground')}>
        {hint}
      </span>
    </button>
  );
}

/**
 * `GET …/bookings/summary` vẽ thành một dải: ba con số, biểu đồ tháng, rồi dải chip trạng thái.
 *
 * `deleted` **không** cộng vào `total` — xóa booking là tombstone cả cây con, nó không còn là
 * booking đang sống của workspace nữa, nên nhãn nói thẳng "ngoài N".
 */
export function BookingSummaryStrip({
  summary,
  isPending,
  error,
  onRetry,
  onPickTotal,
  onPickDeleted,
  onPickUnstaffed,
}: {
  summary: AdminBookingSummary | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onPickTotal: () => void;
  onPickDeleted: () => void;
  onPickUnstaffed: () => void;
}) {
  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (isPending || !summary) {
    return (
      <Card>
        <div className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-3 lg:grid-cols-[repeat(3,auto)_minmax(0,1fr)]">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-28" />
          ))}
          <Skeleton className="h-14 w-full" />
        </div>
      </Card>
    );
  }

  const months = Object.keys(summary.byRevenueMonth).sort();
  const monthMax = Math.max(1, ...months.map((m) => summary.byRevenueMonth[m]));
  const monthSum = months.reduce((sum, m) => sum + summary.byRevenueMonth[m], 0);
  const missingMonth = summary.total - monthSum;
  const statuses = STATUS_ORDER.filter((s) => (summary.byStatus[s] ?? 0) > 0);

  return (
    <Card>
      <div className="grid grid-cols-2 items-start gap-5 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-[repeat(3,auto)_minmax(0,1fr)]">
        <Tile value={summary.total} label="Booking còn sống" hint="total" onClick={onPickTotal} />
        <Tile
          value={summary.deleted}
          label="Đã xóa mềm"
          hint={`deleted · ngoài ${summary.total}`}
          tone="quiet"
          onClick={onPickDeleted}
        />
        <Tile
          value={summary.unstaffed}
          label="Chưa xếp người"
          hint={summary.unstaffed > 0 ? 'unstaffed · lọc bảng' : 'unstaffed'}
          tone={summary.unstaffed > 0 ? 'warning' : 'quiet'}
          onClick={onPickUnstaffed}
        />

        <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:col-span-3 lg:col-span-1 lg:border-l lg:border-border lg:pl-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-xs font-semibold text-foreground">Theo tháng doanh thu</span>
            <Text variant="caption" muted className="font-mono">
              byRevenueMonth
            </Text>
          </div>
          {months.length === 0 ? (
            <Text variant="caption" muted>
              Chưa booking nào suy ra được tháng doanh thu.
            </Text>
          ) : (
            <ul className="flex items-end gap-2 overflow-x-auto">
              {months.map((m) => {
                const v = summary.byRevenueMonth[m];
                const ratio = v / monthMax;
                return (
                  <li
                    key={m}
                    className="flex min-w-5 flex-1 flex-col items-center gap-1"
                    title={`${monthTitle(m)}: ${v} booking`}
                  >
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{v}</span>
                    {/* Cột cao theo tỷ lệ, nên phải có track cao cố định để phần trăm quy chiếu vào */}
                    <span className="flex h-5 w-full items-end">
                      <span
                        style={{ height: `${Math.max(ratio * 100, 12)}%` }}
                        className={cn(
                          'w-full rounded-sm',
                          ratio >= 0.9 ? 'bg-primary' : ratio >= 0.5 ? 'bg-primary-400' : 'bg-primary-200',
                        )}
                      />
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{monthLabel(m)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {missingMonth > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] leading-snug text-warning-deep">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>
                Cộng các tháng được <b className="font-mono">{monthSum}</b>, thiếu{' '}
                <b className="font-mono">{missingMonth}</b> so với <span className="font-mono">total</span>: từng ấy
                booking chưa có <span className="font-mono">revenueMonth</span> nên không nằm trong map.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-3 sm:px-5">
        <span className="mr-0.5 text-xs font-semibold text-foreground">Theo trạng thái</span>
        <Text variant="caption" muted className="font-mono">
          byStatus · chỉ {statuses.length}/{STATUS_ORDER.length} trạng thái có booking
        </Text>
        {statuses.map((s) => (
          <Badge key={s} variant={bookingStatusVariant(s)} size="md" mono={false} className="gap-1.5 font-normal">
            {BOOKING_STATUS_LABEL[s]}
            <b className="font-mono font-semibold tabular-nums">{summary.byStatus[s]}</b>
          </Badge>
        ))}
      </div>
    </Card>
  );
}
