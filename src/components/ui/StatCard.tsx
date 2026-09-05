import * as React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export type StatIntent = 'primary' | 'success' | 'warning' | 'info' | 'destructive';

/**
 * Static intent → token-class maps. Kept as full literal strings (never
 * interpolated) so Tailwind's JIT scanner always emits them.
 */
const intentTile: Record<StatIntent, string> = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-soft text-success-deep',
  warning: 'bg-warning-soft text-warning-deep',
  info: 'bg-info-soft text-info-deep',
  destructive: 'bg-destructive-soft text-destructive-deep',
};

/** Value text in the intent's own colour — opt-in via `emphasizeValue`. */
const intentValue: Record<StatIntent, string> = {
  primary: 'text-primary-600',
  success: 'text-success-deep',
  warning: 'text-warning-deep',
  info: 'text-info-deep',
  destructive: 'text-destructive-deep',
};

const intentBorder: Record<StatIntent, string> = {
  primary: 'border-primary/20',
  success: 'border-success/20',
  warning: 'border-warning/20',
  info: 'border-info/20',
  destructive: 'border-destructive/20',
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Optional caption under the value. */
  sublabel?: string;
  /** A lucide icon; sized to 20px by the tile. */
  icon: React.ReactNode;
  intent?: StatIntent;
  /**
   * Tô màu số theo `intent` thay vì màu chữ mặc định. Dùng khi một hàng KPI cần đọc được
   * "vào / ra / lãi" chỉ bằng màu (trang Tài chính); để mặc định khi các số cùng hạng.
   */
  emphasizeValue?: boolean;
  isLoading?: boolean;
  className?: string;
  /**
   * Biến cả thẻ thành một nút bấm (kèm cursor, hover và focus ring, điều khiển được bằng bàn
   * phím). Dùng khi thẻ dẫn tới nơi xử lý con số nó đang hiển thị — ví dụ thẻ nợ mở bảng chi tiết.
   */
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  intent = 'primary',
  emphasizeValue,
  isLoading,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        intentBorder[intent],
        onClick &&
          'cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Symmetric padding — p-3.5 sm:p-5 overrides CardContent's header-coupled
          pt-0 / sm:pt-0 default so a standalone stat card isn't cramped at the top.
          Tighter on phones because these tiles sit two-up there. */}
      <CardContent className="p-3.5 sm:p-5">
        {/* Label + icon on the top row; the big value gets its own full-width line
            below so a long currency never collides with the icon or card edge.
            The label wraps to two lines instead of truncating (a 2-up phone tile
            leaves it ~100px) — `items-center` + the icon tile keep the row at the
            icon's height either way, so the values stay aligned across a row. */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <p className="min-w-0 line-clamp-2 text-xs font-medium leading-tight text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 sm:h-10 sm:w-10 sm:[&_svg]:h-5 sm:[&_svg]:w-5',
              intentTile[intent],
            )}
          >
            {icon}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-6 w-20 sm:mt-3 sm:h-7 sm:w-24" />
        ) : (
          // No `truncate`: a ₫ amount too wide for a phone tile wraps rather than
          // getting clipped. text-lg keeps eight-figure sums on one line at 360px.
          <p
            className={cn(
              'mt-1.5 text-lg font-bold leading-tight tracking-tight tabular-nums sm:mt-2 sm:text-2xl',
              emphasizeValue ? intentValue[intent] : 'text-foreground',
            )}
          >
            {value ?? '—'}
          </p>
        )}
        {sublabel && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
