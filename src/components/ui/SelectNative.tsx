import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { FIELD_SIZE_CLASSES } from '@/components/ui/field-size';

const selectNativeVariants = cva(
  'flex w-full border border-input bg-card text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: FIELD_SIZE_CLASSES,
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface SelectNativeProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectNativeVariants> {
  /** Viền đỏ + quầng đỏ khi trường có lỗi. */
  error?: boolean;
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, error, size, children, ...props }, ref) => {
    return (
      <select
        aria-invalid={error || undefined}
        className={cn(
          selectNativeVariants({ size }),
          error &&
            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
SelectNative.displayName = 'SelectNative';

export { SelectNative };
