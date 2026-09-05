import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent disabled:shadow-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-primary hover:bg-primary-600',
        secondary:
          'border border-border bg-card text-foreground hover:bg-secondary',
        outline:
          'border border-border bg-card text-foreground hover:bg-secondary',
        // Quiet "selected" state for pick-one chips (period / time-slot / duration selectors):
        // primary-tinted outline instead of a loud filled primary, so several selected chips
        // don't compete with the rest of the form. Sibling of `destructive-outline`.
        'primary-outline':
          'border border-primary bg-primary-50 text-primary-700 hover:bg-primary-100',
        ghost: 'text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        'destructive-outline':
          'border border-destructive-soft bg-card text-destructive-deep hover:bg-destructive-soft',
        // `ghost` mang màu nguy hiểm — cho hàng "Xóa…" trong một danh sách hành động (bottom sheet,
        // menu dựng tay), nơi một cái viền sẽ tách nó ra khỏi các hàng còn lại của cùng danh sách.
        'destructive-ghost': 'text-destructive-deep hover:bg-destructive-soft',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Một cỡ ở mọi bề ngang — không còn cặp phone-first `h-9 sm:h-8`. Lý do đầy đủ nằm trong
        // `field-size.ts`; `sm`/`md`/`lg` ở đây bám đúng `FIELD_HEIGHT` để nút và ô nhập cùng hàng
        // luôn cao bằng nhau.
        sm: 'h-8 rounded-md px-3 text-[13px]',
        md: 'h-9 rounded-lg px-4 text-sm',
        lg: 'h-11 rounded-lg px-5 text-[15px]',
        // 40px — cố ý to hơn `md` (36px): `icon` là nút hành động đứng một mình (topbar, toolbar),
        // không phải nút nằm trong hàng field. Cần khớp chiều cao với field md thì `size="icon-sm"`
        // (32px) hoặc `className="h-9 w-9"`.
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        // 56px tròn — nút nổi (FAB) neo góc màn hình trên phone, không nằm trong luồng nội dung
        // nên không phải khớp chiều cao với bất kỳ field nào. Cỡ riêng vì `icon` (40px) đặt nổi
        // trên nền cuộn thì mất hút, mà một `icon` bị className kéo to lại phá luật thang cỡ.
        fab: 'h-14 w-14 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
