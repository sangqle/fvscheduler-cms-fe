import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Nhãn "mắt" đứng trên tiêu đề: mono, in hoa, dãn chữ, tông primary. Dùng cho nhãn phân mục và
 * đánh số bước ("BƯỚC 01 / 03", "CẬP NHẬT 2.4 · 12 THÁNG 8", "TÍNH NĂNG · 02").
 *
 * Là primitive chứ không phải một chuỗi `className` lặp lại ở từng overlay, vì đây là **một quyết
 * định typography của design system** (IBM Plex Mono cho nhãn và số, xem CLAUDE.md): đổi cách nhãn
 * mắt trông ra sao thì phải đổi một chỗ.
 */
export interface KickerProps extends React.HTMLAttributes<HTMLElement> {
  /** `muted` cho nhãn phụ không cần hút mắt (nhãn cột, nhãn phần trong thẻ). */
  tone?: 'primary' | 'muted';
  as?: React.ElementType;
}

export function Kicker({ tone = 'primary', as: Tag = 'p', className, ...props }: KickerProps) {
  return (
    <Tag
      className={cn(
        'font-mono text-[0.6875rem] font-semibold uppercase leading-normal tracking-[0.12em]',
        tone === 'primary' ? 'text-primary' : 'text-muted-foreground',
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    />
  );
}
