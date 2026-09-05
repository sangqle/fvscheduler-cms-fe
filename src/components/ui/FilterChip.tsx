'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Họ màu của một chip lọc. `neutral` là chip không mang màu ngữ nghĩa ("Tất cả") — nó dùng
 * `primary` khi được chọn, và không có chấm.
 */
export type FilterChipTone =
  | 'neutral'
  | 'primary'
  | 'warning'
  | 'info'
  | 'success'
  | 'destructive'
  | 'muted';

/**
 * Hai trạng thái của chip là **hai ngôn ngữ màu khác nhau**, nên `tone` phải nhân với `active`
 * bằng `compoundVariants` chứ không cộng vào nhau:
 *
 * - chưa chọn — chip trắng viền mảnh, chữ phụ, màu ngữ nghĩa chỉ còn đọng ở cái chấm. Cả hàng
 *   8 chip mà chip nào cũng tô màu thì không chip nào nổi;
 * - đang chọn — tô đặc bằng cặp token `bg-<tone> text-<tone>-foreground`, để trong một hàng
 *   wrap 2–3 dòng trên phone vẫn thấy ngay đang lọc theo cái gì.
 */
const filterChipVariants = cva(
  'inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      tone: {
        neutral: '',
        primary: '',
        warning: '',
        info: '',
        success: '',
        destructive: '',
        muted: '',
      },
      active: { true: 'border-transparent', false: 'border-border bg-card text-muted-foreground hover:bg-secondary' },
    },
    compoundVariants: [
      { tone: 'neutral', active: true, className: 'bg-primary text-primary-foreground' },
      { tone: 'primary', active: true, className: 'bg-primary text-primary-foreground' },
      { tone: 'warning', active: true, className: 'bg-warning text-warning-foreground' },
      { tone: 'info', active: true, className: 'bg-info text-info-foreground' },
      { tone: 'success', active: true, className: 'bg-success text-success-foreground' },
      { tone: 'destructive', active: true, className: 'bg-destructive text-destructive-foreground' },
      { tone: 'muted', active: true, className: 'bg-muted-foreground text-background' },
    ],
    defaultVariants: { tone: 'neutral', active: false },
  },
);

/** Màu chấm khi chip chưa được chọn — dấu hiệu duy nhất còn lại của họ màu ở trạng thái nghỉ. */
const DOT_CLASSES: Record<FilterChipTone, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof filterChipVariants> {
  /** Số bên phải nhãn (số bản ghi khớp bộ lọc). Bỏ trống thì không hiện ô đếm. */
  count?: number;
  /**
   * Chấm màu bên trái nhãn. Mặc định hiện khi `tone` mang màu ngữ nghĩa và chip **chưa** được chọn
   * — chip đã tô đặc rồi thì cái chấm chỉ là một đốm nhiễu trên nền màu.
   */
  dot?: boolean;
}

/**
 * Chip lọc bấm được — một lựa chọn trong nhóm lọc (trạng thái album, hạn giao ảnh, …), có chấm màu
 * và số đếm.
 *
 * Là `<button aria-pressed>` chứ không phải tab: các nhóm dùng nó cho phép **bỏ chọn** bằng cách
 * bấm lại chip đang bật, và trên phone chúng wrap thành nhiều dòng — hai thứ `SegmentedControl`
 * (một `tablist` cuộn ngang, luôn có đúng một tab bật) không diễn được.
 */
export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, tone: toneProp, active: activeProp, count, dot, children, ...props }, ref) => {
    // `VariantProps` cho phép `null` (cách cva nói "dùng mặc định"), còn `aria-pressed` thì không —
    // nên quy về boolean/tone thật ở đây thay vì rải `?? false` xuống dưới.
    const tone = toneProp ?? 'neutral';
    const active = activeProp ?? false;
    const showDot = dot ?? (!active && tone !== 'neutral');
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={active}
        className={cn(filterChipVariants({ tone, active }), className)}
        {...props}
      >
        {showDot && (
          <span
            className={cn('h-1.5 w-1.5 flex-none rounded-full', DOT_CLASSES[tone])}
            aria-hidden
          />
        )}
        {children}
        {count !== undefined && (
          <span
            className={cn(
              'rounded px-1 font-mono text-[11px] font-semibold tabular-nums',
              active ? 'bg-current/20' : 'bg-secondary text-muted-foreground',
            )}
          >
            {count}
          </span>
        )}
      </button>
    );
  },
);
FilterChip.displayName = 'FilterChip';
