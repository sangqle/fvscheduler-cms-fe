'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>;

/**
 * Ô tích chọn nhiều — dựng trên `<input type="checkbox">` thật (không thêm phụ thuộc Radix), nên
 * bàn phím, `disabled`, `form` và nhãn `<label htmlFor>` hoạt động sẵn. Dấu ✓ là một lớp phủ ăn
 * theo `peer-checked`, còn hộp vuông là chính cái input đã `appearance-none`.
 *
 * `className` ở đây chỉ để layout; màu và bo góc đã theo token.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <span className={cn('relative inline-flex size-4.5 shrink-0 items-center justify-center', className)}>
    <input
      type="checkbox"
      ref={ref}
      className="peer size-4.5 cursor-pointer appearance-none rounded-md border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
    <Check
      aria-hidden="true"
      className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
    />
  </span>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
