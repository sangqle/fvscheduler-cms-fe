import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  // Lưới 2 cột thay cho icon `absolute` + `pl-7`: cột icon chỉ mở ra khi thật sự có `<svg>`, còn
  // tiêu đề/nội dung luôn nằm ở cột 2 nên xếp thành hàng chứ không tràn xuống dưới icon. Icon được
  // đẩy xuống 2px = (20px line-height của `text-sm` − 16px icon) / 2, tức canh **giữa dòng chữ đầu
  // tiên** thay vì canh mép trên hộp — cách cũ neo icon ở `top-4` rồi kéo riêng phần mô tả lên 3px,
  // làm icon thấp hơn chữ 5px ở mọi alert chỉ có mô tả.
  'relative grid w-full grid-cols-[0_1fr] gap-y-1 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:col-start-1 [&>svg]:row-start-1',
  {
    variants: {
      /**
       * Cách canh icon theo nội dung.
       *
       * - `start` (mặc định): icon canh **giữa dòng chữ đầu tiên** — đúng cho alert nhiều dòng
       *   (có tiêu đề, hoặc mô tả dài xuống dòng), vì icon phải đi cùng dòng đầu chứ không trôi
       *   xuống giữa khối chữ. 2px = (20px line-height của `text-sm` − 16px icon) / 2.
       * - `center`: icon canh **giữa cả hàng** — dùng khi hàng nội dung cao hơn một dòng chữ
       *   *không phải* vì chữ dài, mà vì có phần tử cao hơn nằm cùng hàng (nút "Thử lại" 32px).
       *   Lúc đó chữ tự canh giữa hàng, nên `start` sẽ treo icon lên cao hơn chữ ~6px.
       */
      align: {
        start: 'items-start [&>svg]:translate-y-0.5',
        center: 'items-center',
      },
      variant: {
        default: 'bg-card border-border text-foreground',
        destructive:
          'border-destructive/50 bg-destructive/10 text-destructive-deep [&>svg]:text-destructive',
        warning:
          'border-warning/50 bg-warning/10 text-warning-deep [&>svg]:text-warning',
        success:
          'border-success/50 bg-success/10 text-success-deep [&>svg]:text-success',
        info: 'border-info/50 bg-info/10 text-info-deep [&>svg]:text-info',
        /**
         * Tone thương hiệu, cho ghi chú **về chính sản phẩm** chứ không phải một trạng thái dữ
         * liệu: luật "mỗi người một đánh giá" trong form testimonial là ví dụ. Để `info` ở đó thì
         * đọc ra như một cảnh báo hệ thống, trong khi nó chỉ là cách sản phẩm vận hành.
         */
        primary: 'border-primary-200 bg-primary-50 text-primary-700 [&>svg]:text-primary',
      },
    },
    defaultVariants: { variant: 'default', align: 'start' },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, align, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant, align }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  // `leading-5` (khớp line-height của `text-sm`) thay cho `leading-none`: dòng tiêu đề cao bằng dòng
  // mô tả nên cùng một mức đẩy 2px canh được icon cho cả alert có tiêu đề lẫn alert chỉ có mô tả.
  // `mb-1` bỏ đi vì khoảng cách tiêu đề/mô tả giờ do `gap-y-1` của lưới lo.
  <h5 ref={ref} className={cn('col-start-2 font-medium leading-5 tracking-tight', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('col-start-2 text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
