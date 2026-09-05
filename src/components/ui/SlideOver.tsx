'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/**
 * Nấc xếp tầng trong *băng panel* (`z-40`–`z-49`):
 * - `base` — overlay `z-40` / panel `z-45`, cùng băng với {@link BottomSheet} và
 *   `ClientDetailDrawer`.
 * - `stacked` — overlay `z-46` / panel `z-48`: panel mở *từ* một panel base đang mở, nên phải đè
 *   lên nó (và làm mờ nó) một cách tường minh thay vì trông chờ thứ tự portal trong DOM.
 *
 * Cả hai nấc đều nằm **dưới** băng `z-50` của dialog, dropdown, popover, select, tooltip — những
 * thứ portal *bên trong* panel và vì vậy phải luôn nổi trên nó.
 */
export type SlideOverLayer = 'base' | 'stacked';

const LAYER_Z: Record<SlideOverLayer, { overlay: string; panel: string }> = {
  base: { overlay: 'z-40', panel: 'z-45' },
  stacked: { overlay: 'z-46', panel: 'z-48' },
};

interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title (visually hidden — the panel renders its own header). */
  title: string;
  children: React.ReactNode;
  className?: string;
  /** @see SlideOverLayer — mặc định `base`. */
  layer?: SlideOverLayer;
}

/**
 * Right-anchored slide-over panel (drawer) built on Radix Dialog — keeps focus
 * trapping, Escape-to-close and scroll lock, styled as a 600px sheet.
 *
 * **Tầng z:** xem {@link SlideOverLayer}.
 *
 * **Chuyển động:** `animate-slideover-in|out` cho panel và `animate-scrim-in|out` cho lớp nền mờ,
 * keyframe của riêng dự án trong `src/styles/globals.css`. Đừng thay lại bằng `animate-in` /
 * `slide-in-from-right`: những lớp đó thuộc plugin `tailwindcss-animate`, không cài ở đây, nên
 * biên dịch ra rỗng và panel hiện ra tức thời.
 */
export function SlideOver({
  open,
  onOpenChange,
  title,
  children,
  className,
  layer = 'base',
}: SlideOverProps) {
  const z = LAYER_Z[layer];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 bg-foreground/30',
            'data-[state=open]:animate-scrim-in data-[state=closed]:animate-scrim-out',
            z.overlay,
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 flex h-full w-full flex-col border-l border-border bg-card shadow-modal outline-none sm:w-[88vw] lg:w-180 lg:max-w-[94vw]',
            z.panel,
            'data-[state=open]:animate-slideover-in data-[state=closed]:animate-slideover-out',
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
