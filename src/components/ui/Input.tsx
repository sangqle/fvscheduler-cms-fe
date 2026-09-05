import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  FIELD_ADDON_PADDING,
  FIELD_FONT,
  FIELD_HEIGHT,
  FIELD_RADIUS,
  FIELD_SIZE_CLASSES,
  type FieldSize,
} from '@/components/ui/field-size';

const inputVariants = cva(
  'flex w-full border border-input bg-card text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: FIELD_SIZE_CLASSES,
      variant: {
        default: '',
        /**
         * Ô đọc/chép một mã ngắn: mã đơn, nội dung chuyển khoản, mã mời. Chữ mono giãn nét, canh
         * giữa, nền primary nhạt cho nổi khỏi các dòng thông tin quanh nó. Đi cùng `readOnly` —
         * để là `<input>` chứ không phải `<div>` vì người dùng cần bôi đen chép tay được khi
         * clipboard bị chặn. Chiều cao vẫn do `size` quyết định, nên nó luôn bằng nút `Copy` cạnh
         * bên nếu hai bên cùng một `size`.
         */
        code: 'border-primary/30 bg-primary-50 text-center font-mono font-semibold tracking-[0.12em] text-primary-700',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Viền đỏ + quầng đỏ khi trường có lỗi. */
  error?: boolean;
  /** Icon trái (vd Search) — tự thêm padding-left và bọc relative. */
  leadingIcon?: React.ReactNode;
  /**
   * Class layout cho khối bọc ngoài khi có `leadingIcon` hoặc addon (`w-*`, `flex-*`, `shrink-0`,
   * `col-span-*`).
   * Lúc đó phần tử con của flex/grid cha là khối bọc chứ không phải `<input>`, nên bề ngang phải đặt
   * ở đây; `className="sm:w-64"` chỉ thu nhỏ ô nhập bên trong còn khối bọc vẫn `w-full` và nuốt hết
   * hàng, đẩy phần tử cạnh nó (vd `SegmentedControl`) về 0. Không có `leadingIcon` thì thừa: `<input>`
   * chính là phần tử con, dùng `className` như thường.
   */
  containerClassName?: string;
  /**
   * Nhãn dính liền mép ô nhập: `https://`, `.chonanh.vn`, `@`, `₫`. Khác `leadingIcon` ở chỗ nó
   * chiếm chỗ thật trong hàng chứ không nổi đè lên ô, nên chữ người dùng gõ không bao giờ chui
   * xuống dưới nó.
   *
   * Viền, nền, chiều cao và quầng focus chuyển lên khối bọc, `<input>` bên trong chỉ còn phần chữ —
   * nên cả cụm vẫn theo đúng `size` và cao bằng một `Input` trần hay một `Button` cùng `size` đứng
   * cạnh. Đừng tự dựng lại bằng một `<div className="flex h-10 border …">` bọc `Input`: làm thế là
   * mất quầng focus (phải `outline-none` cái `<input>` mà khối bọc lại không có `focus-within`) và
   * chiều cao rơi ra ngoài thang 32/36/44.
   */
  leadingAddon?: React.ReactNode;
  /** Nhãn dính mép phải. Xem {@link InputProps.leadingAddon}. */
  trailingAddon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      type,
      error,
      leadingIcon,
      leadingAddon,
      trailingAddon,
      size,
      variant,
      ...props
    },
    ref,
  ) => {
    const hasAddon = leadingAddon != null || trailingAddon != null;
    const fieldSize: FieldSize = size ?? 'md';
    const addonClass = cn(
      'flex shrink-0 items-center bg-muted/50 text-muted-foreground',
      FIELD_FONT[fieldSize],
    );

    const input = (
      <input
        type={type}
        aria-invalid={error || undefined}
        className={cn(
          hasAddon
            ? // Chrome của trường đã nằm ở khối bọc; ở đây chỉ giữ lại phần chữ.
              cn(
                'min-w-0 flex-1 bg-transparent px-1 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
                FIELD_FONT[fieldSize],
              )
            : cn(
                inputVariants({ size, variant }),
                error &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
              ),
          leadingIcon && 'pl-10',
          className,
        )}
        ref={ref}
        {...props}
      />
    );

    if (hasAddon) {
      return (
        <div
          className={cn(
            'flex w-full items-stretch overflow-hidden border border-input bg-card transition-colors',
            FIELD_HEIGHT[fieldSize],
            FIELD_RADIUS[fieldSize],
            'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
            error &&
              'border-destructive focus-within:border-destructive focus-within:ring-destructive/15',
            props.disabled && 'cursor-not-allowed opacity-50',
            containerClassName,
          )}
        >
          {leadingAddon != null && (
            <span className={cn(addonClass, FIELD_ADDON_PADDING[fieldSize].leading)}>
              {leadingAddon}
            </span>
          )}
          {input}
          {trailingAddon != null && (
            <span className={cn(addonClass, FIELD_ADDON_PADDING[fieldSize].trailing)}>
              {trailingAddon}
            </span>
          )}
        </div>
      );
    }

    if (!leadingIcon) return input;

    return (
      <div className={cn('relative w-full', containerClassName)}>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {leadingIcon}
        </span>
        {input}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
