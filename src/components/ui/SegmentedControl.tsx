'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption {
  value: string;
  /**
   * Nhãn tab. Nhận node để một tab có thể mang chip phụ (vd toggle chu kỳ thanh toán với nhãn
   * "tặng 2 tháng"); chuỗi thuần vẫn là dạng thường gặp.
   */
  label: React.ReactNode;
  /** Hiện badge số bên phải nhãn (vd bộ lọc lịch hẹn). */
  count?: number;
}

/**
 * Kế thừa `React.HTMLAttributes<HTMLDivElement>` và spread phần còn lại xuống khối `role="tablist"`:
 * trước đây component chỉ nhận đúng các prop nó khai báo, nên một thuộc tính hợp lệ truyền từ ngoài
 * (`data-coach` của chỉ dẫn tại chỗ, `id`, `data-testid`…) bị bỏ **im lặng** — TS không chặn mà DOM
 * cũng không có, tức là một điểm neo trông như đã gắn nhưng không bao giờ tìm thấy.
 */
export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  options: SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Trải các tab kín bề ngang khối cha thay vì co theo nội dung. Nhãn vẫn giữ `min-content`
   * nên khi màn quá hẹp thanh tab chuyển sang cuộn ngang chứ không bóp chữ.
   */
  fullWidth?: boolean;
  /**
   * Khoá cả thanh: người dùng không đủ quyền, hoặc đang có thao tác lưu chạy dở. Từng tab thành
   * `<button disabled>` chứ không chỉ mờ đi bằng `opacity` — thiếu `disabled` thật thì bàn phím
   * vẫn Tab tới được và Enter vẫn đổi giá trị, tức là một control "trông như đã khoá" mà vẫn sửa
   * được dữ liệu.
   */
  disabled?: boolean;
  /**
   * `md` (mặc định, ~40px) cho thanh tab đứng một mình dưới tiêu đề; `sm` (36px = khay 4px + tab 32px)
   * khi thanh tab nằm **cùng hàng** với nút `size="sm"`/`icon-sm` và ô nhập `md`: cùng một hàng mà
   * cao lệch nhau 4px thì đọc ra lỗi canh lề, không đọc ra "tab to hơn cho dễ bấm".
   */
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

export function SegmentedControl({
  options,
  value,
  onValueChange,
  fullWidth = false,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
  ...rest
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      {...rest}
      className={cn(
        'items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card no-scrollbar',
        size === 'sm' ? 'p-0.5' : 'p-1',
        // `w-full` tách khỏi `flex`: consumer có thể trả bề ngang về auto ở breakpoint lớn
        // (`className="sm:w-auto"`) mà tab vẫn `flex-1`, tức là co theo nội dung chứ không vỡ.
        fullWidth ? 'flex w-full' : 'inline-flex max-w-full',
        disabled && 'opacity-50',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
              size === 'sm' ? 'h-8 px-3' : 'px-3.5 py-1.5',
              fullWidth ? 'flex-1 justify-center' : 'shrink-0',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'inline-flex h-4.5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                  active
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
