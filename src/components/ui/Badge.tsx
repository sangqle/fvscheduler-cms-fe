import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full font-semibold transition-colors',
  {
    variants: {
      /**
       * `sm` cho chip **phụ** nằm trong một thẻ đã chật (thẻ pipeline, hàng lịch trong ngày): ở đó
       * chip là chú thích cho dòng chữ bên trên nó, để bằng cỡ `md` thì nó tranh mất tiêu điểm của
       * chính cái tên job. Cỡ đi bằng prop chứ không bằng `className="text-[10px]"` — một chuỗi như
       * thế nằm trong feature là chỗ để thang cỡ trôi khỏi tay design system.
       */
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
      },
      variant: {
        default: 'bg-primary/15 text-primary',
        /**
         * Bản **đặc** của `default`. Dùng khi chip phải nổi hơn cả tiêu đề nó đứng cạnh, cụ thể là
         * nhãn "MỚI" của hệ thông báo tính năng: đặt trong nav hay trong banner thì bản tint
         * (`bg-primary/15`) chìm mất giữa nền `bg-primary-50` cùng tông.
         */
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/15 text-destructive',
        success: 'bg-success/15 text-success',
        /**
         * Bản **đặc** của `success` (nền `success-soft` opaque thay vì tint 15%). Dùng khi chip
         * nằm trên một bề mặt có màu — ví dụ nhãn "tặng 2 tháng" trong nút toggle đang active
         * (nền primary): tint trong suốt trộn với nền magenta thành màu đục, bản soft đặc thì
         * giữ nguyên cặp xanh trên mọi nền.
         */
        'success-soft': 'bg-success-soft text-success-deep',
        /**
         * Bản **đặc** của `info`, cùng lý do với `success-soft`: chip nổi vắt qua mép một `Card`
         * (badge "Gói hiện tại" trên thẻ gói) mà nền tint 15% thì đường border của card hiện
         * xuyên qua sau lưng chip; nền `info-soft` opaque che kín.
         */
        'info-soft': 'bg-info-soft text-info-deep',
        warning: 'bg-warning/15 text-warning',
        info: 'bg-info/15 text-info',
        muted: 'bg-muted text-muted-foreground',
        outline: 'border border-border text-foreground',
      },
      /**
       * Chữ mono in hoa, dãn chữ — dành cho **nhãn phân loại** chứ không phải trạng thái: "MỚI",
       * mã, số hiệu. Đây là một quyết định typography nên nó ở đây dưới dạng variant, không phải
       * một `className="font-mono uppercase"` rải trong feature (xem CLAUDE.md: IBM Plex Mono cho
       * nhãn và số).
       */
      mono: {
        true: 'font-mono uppercase tracking-wider',
        false: '',
      },
      /**
       * Chip **bấm được** — vẫn là chip, không phải nút. Dùng khi chính cái trạng thái là thứ đổi
       * được (đã trả ⇄ chưa trả, bật ⇄ tắt một nhãn): người dùng nhìn thấy trạng thái, và bấm
       * ngay vào nó để đổi. Đừng thay bằng một `Button` bọc quanh chip — hai hộp lồng nhau,
       * padding cộng dồn, canh lề không bao giờ khớp.
       *
       * Luôn đi cùng `asChild` + một `<button>` thật bên trong, để có bàn phím và `disabled`.
       * **Không có sàn chạm riêng cho phone**: `min-h-9 sm:min-h-0` cũ làm chip bấm được cao gần
       * gấp rưỡi chip chỉ-để-đọc nằm ngay cạnh nó trong cùng hàng — hai chip cùng cỡ chữ mà lệch
       * chiều cao thì hàng đó trông lỗi, không trông "dễ bấm hơn". Nó vẫn cao ~26px nhờ `py-0.5`
       * của base + `gap-1.5`, và luôn nằm trong một hàng thưa nên không bấm nhầm sang chip khác.
       */
      interactive: {
        true: 'cursor-pointer gap-1.5 transition-shadow hover:ring-1 hover:ring-current/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60',
        false: '',
      },
    },
    defaultVariants: { variant: 'default', size: 'md', mono: false, interactive: false },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render con trực tiếp thay vì `<span>` — dùng để chip trở thành `<button>`/`<a>` thật. */
  asChild?: boolean;
}

/**
 * Thẻ mặc định là `<span>`, không phải `<div>`: chip là **nội dung inline**, nên nó phải đặt được
 * vào trong `<p>`, `<h*>`, `<label>` — những chỗ HTML cấm thẻ block. Một `<div>` nằm trong `<p>`
 * bị trình duyệt tự đóng thẻ `<p>` lại, khiến DOM của server và của client lệch nhau → hydration
 * error. `inline-flex` giữ nguyên nên nhìn không đổi gì.
 */
function Badge({ className, variant, size, mono, interactive, asChild, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp className={cn(badgeVariants({ variant, size, mono, interactive }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
