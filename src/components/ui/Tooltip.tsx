'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Token-styled Radix tooltip. Mirrors the `Popover`/`DropdownMenu` wrapper conventions.
 *
 * Two ways to use it:
 *  - Primitives (`TooltipProvider` + `TooltipRoot`/`TooltipTrigger`/`TooltipContent`) for full control.
 *  - The `<Tooltip content>` convenience below, which bundles its own provider so callers don't need a
 *    global one — used by `PermissionButton` to explain *why* a control is disabled.
 *
 * Disabled-trigger note: a disabled `<button>` has `pointer-events: none`, so it can't be the hover
 * target. Wrap it in a plain element (e.g. `<span className="inline-flex">`) and put that on the
 * trigger — the wrapper receives hover while the inner button stays disabled.
 */
const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 12, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        'z-50 max-w-xs rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-[var(--shadow-modal)] data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface TooltipProps {
  /** Tooltip body. When falsy, the children render bare (no tooltip). */
  content?: React.ReactNode;
  children: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['side'];
  sideOffset?: number;
  delayDuration?: number;
}

/** Self-contained tooltip (bundles its own provider). Renders children bare when `content` is empty. */
function Tooltip({ content, children, side = 'top', sideOffset, delayDuration = 200 }: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={sideOffset}>
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };
