'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useSuppressHoverOnScroll } from '@/hooks/useSuppressHoverOnScroll';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Mặc định `DialogContent` cuộn chính nó (`overflow-y-auto` dưới đây), nên nó là vùng cần chặn
  // ripple hover khi cuộn. Hợp nhất callback ref của hook với ref mà caller truyền vào.
  const suppressHoverRef = useSuppressHoverOnScroll<HTMLDivElement>();
  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      suppressHoverRef(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref, suppressHoverRef],
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          // Trần chiều cao phải là `dvh`, KHÔNG phải `vh`: trên iOS Safari `vh` là chiều cao
          // viewport *lớn* (đo như lúc thanh công cụ đã ẩn), nên một `max-h-[90vh]` cho ra hộp cao
          // hơn vùng thực sự nhìn thấy — dialog căn giữa bị thanh công cụ dưới nuốt mất phần chân,
          // đúng chỗ đặt hàng nút. Caller ghi đè `max-h` thì cũng phải dùng `dvh` (xem
          // `PackageFormModal`, `InviteFormModal`…). Đây chỉ là **trần**: chiều cao thật do nội
          // dung quyết định, không đặt cứng.
          'fixed left-[50%] top-[50%] z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 shadow-modal duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Vùng cuộn **duy nhất** của một dialog có khung header / body / footer, để footer luôn ghim ở đáy
 * thay vì cuộn mất theo nội dung.
 *
 * Dùng kèm `overflow-y-hidden` trên `DialogContent` để tắt scroller mặc định của nó — phải là
 * `overflow-y-hidden` chứ KHÔNG phải `overflow-hidden`: `tailwind-merge` xếp `overflow` và
 * `overflow-y` vào hai nhóm khác nhau, nên `overflow-hidden` không thay thế `overflow-y-auto` ở
 * base; hai class cùng tồn tại và ai thắng là tuỳ thứ tự trong stylesheet. Đó là nguồn gốc của
 * đúng hai lỗi: dialog không cuộn được, và dialog lồng hai thanh cuộn.
 */
const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const suppressHoverRef = useSuppressHoverOnScroll<HTMLDivElement>();
    const bodyRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        suppressHoverRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref, suppressHoverRef],
    );

    return (
      <div
        ref={bodyRef}
        className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
        {...props}
      />
    );
  },
);
DialogBody.displayName = 'DialogBody';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('shrink-0 pb-4 flex flex-col gap-1.5 text-center sm:text-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const dialogIconVariants = cva(
  'flex flex-none items-center justify-center rounded-xl',
  {
    variants: {
      /** Cặp nền mềm + chữ đậm theo token ngữ nghĩa — trùng bảng `tile` của `ConfirmDialog`. */
      tone: {
        primary: 'bg-primary-50 text-primary-600',
        destructive: 'bg-destructive-soft text-destructive-deep',
        warning: 'bg-warning-soft text-warning-deep',
        success: 'bg-success-soft text-success-deep',
        info: 'bg-info-soft text-info-deep',
        muted: 'bg-muted text-muted-foreground',
      },
      size: {
        md: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
        lg: 'h-11 w-11 [&_svg]:h-5.5 [&_svg]:w-5.5',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md' },
  },
);

/**
 * Ô icon vuông bo góc đứng trước tiêu đề dialog — nhận diện nhanh dialog đang mở là loại gì.
 *
 * Cỡ icon do `size` quyết định (`[&_svg]`), nên đừng truyền `className="h-4 w-4"` cho icon con.
 *
 * @example
 * <DialogHeader className="text-left">
 *   <div className="flex items-start gap-3 pr-8">
 *     <DialogIcon tone="destructive"><Receipt /></DialogIcon>
 *     <div className="min-w-0">
 *       <DialogTitle>…</DialogTitle>
 *       <DialogDescription>…</DialogDescription>
 *     </div>
 *   </div>
 * </DialogHeader>
 */
const DialogIcon = ({
  className,
  tone,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof dialogIconVariants>) => (
  <span className={cn(dialogIconVariants({ tone, size }), className)} {...props} />
);
DialogIcon.displayName = 'DialogIcon';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight text-foreground', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogIcon,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
