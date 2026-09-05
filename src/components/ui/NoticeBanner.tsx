import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Banner cảnh báo đầu trang: icon + tiêu đề + mô tả, kèm con số và nút hành động ở đuôi.
 *
 * Mobile-first: trên phone xếp thành hai tầng — khối chữ chiếm trọn bề ngang, số tiền + nút
 * xuống hàng riêng thẳng lề với chữ — vì để chung một hàng thì khối chữ (`flex-1 min-w-0`)
 * bị bóp thành một cột hẹp vài từ thay vì đẩy phần đuôi xuống dòng. Từ `sm` trở lên gộp lại
 * một hàng ngang như cũ.
 */

export type NoticeBannerIntent = 'warning' | 'destructive' | 'info';

/** Map tĩnh (không nội suy) để Tailwind JIT luôn thấy đủ class. */
const intentSurface: Record<NoticeBannerIntent, string> = {
  warning: 'border-warning/40 bg-warning/10',
  destructive: 'border-destructive/40 bg-destructive/10',
  info: 'border-info/40 bg-info/10',
};

const intentText: Record<NoticeBannerIntent, string> = {
  warning: 'text-warning-deep',
  destructive: 'text-destructive-deep',
  info: 'text-info-deep',
};

const intentTextSoft: Record<NoticeBannerIntent, string> = {
  warning: 'text-warning-deep/80',
  destructive: 'text-destructive-deep/80',
  info: 'text-info-deep/80',
};

export interface NoticeBannerProps {
  intent: NoticeBannerIntent;
  /** Lucide icon, tile 32px nền `bg-card`. */
  icon: React.ReactNode;
  /** Tiêu đề; có thể kèm `<Badge>` — hàng tiêu đề tự wrap. */
  title: React.ReactNode;
  description: React.ReactNode;
  /** Con số ở đuôi banner (đã format sẵn, ví dụ `formatCurrency(...)`). */
  value?: string;
  /** Nút hành động ở đuôi banner. */
  action?: React.ReactNode;
  className?: string;
}

export function NoticeBanner({
  intent,
  icon,
  title,
  description,
  value,
  action,
  className,
}: NoticeBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:p-4',
        intentSurface[intent],
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card [&_svg]:h-4 [&_svg]:w-4',
            intentText[intent],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          {/* `div` chứ không phải `p`: hàng tiêu đề là một flex-wrap ôm node tuỳ ý (chip, nút nhỏ),
              mà `p` chỉ chứa được nội dung inline — lồng thẻ block vào là hydration error. */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 text-[13px] font-semibold',
              intentText[intent],
            )}
          >
            {title}
          </div>
          <p className={cn('mt-0.5 text-xs', intentTextSoft[intent])}>{description}</p>
        </div>
      </div>

      {(value !== undefined || action) && (
        /* pl-11 = tile 32px + gap 12px, để hàng đuôi thẳng lề với khối chữ trên phone. */
        <div className="flex items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
          {value !== undefined && (
            <span
              className={cn(
                'whitespace-nowrap font-mono text-[15px] font-semibold tabular-nums',
                intentText[intent],
              )}
            >
              {value}
            </span>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
