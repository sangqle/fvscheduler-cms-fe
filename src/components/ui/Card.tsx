'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Mật độ padding của thẻ. `md` là mật độ cũ (`p-4` trên phone, `p-6` từ 640px); `sm` là `p-4` phẳng,
 * không có bậc `sm:`, cho thẻ nằm trong một pane hẹp mà `p-6` ăn mất chỗ của nội dung.
 *
 * Phải đi bằng prop chứ không phải `className="p-4 pb-3"` tại call site: tailwind-merge chỉ khử xung
 * đột trong cùng một bộ modifier, nên `p-4` truyền vào không đụng được `sm:p-6` của primitive và từ
 * 640px trở lên primitive vẫn thắng cascade. Thẻ chỉ đặc lại trên phone, còn desktop y như cũ, và
 * không có lỗi nào báo ra.
 */
export type CardPadding = 'md' | 'sm';

/**
 * `Card` tự nó không có padding, nó chỉ truyền mật độ xuống ba khối con để một thẻ đặc khai `padding`
 * đúng một lần thay vì lặp ở cả header, content lẫn footer. Context là lý do file này phải là client
 * component: `createContext`/`useContext` không chạy trong Server Component.
 */
const CardPaddingContext = React.createContext<CardPadding>('md');

const HEADER_PADDING: Record<CardPadding, string> = {
  md: 'p-4 sm:p-6',
  sm: 'p-4',
};

/** `pt-0` để khối này dính liền khối phía trên; content và footer dùng chung vì cùng nằm dưới header. */
const BODY_PADDING: Record<CardPadding, string> = {
  md: 'p-4 pt-0 sm:p-6 sm:pt-0',
  sm: 'p-4 pt-0',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hover nhấc lên: viền tím + bóng pop + con trỏ pointer. */
  interactive?: boolean;
  /** Mật độ mặc định cho `CardHeader`/`CardContent`/`CardFooter` bên trong. */
  padding?: CardPadding;
}

/** Prop chung của ba khối con: bỏ trống `padding` thì lấy theo `Card` cha. */
export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, padding = 'md', ...props }, ref) => (
    <CardPaddingContext.Provider value={padding}>
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-border bg-card text-card-foreground shadow-card',
          interactive &&
            'cursor-pointer transition-all hover:border-primary/40 hover:shadow-pop',
          className,
        )}
        {...props}
      />
    </CardPaddingContext.Provider>
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding, ...props }, ref) => {
    const inherited = React.useContext(CardPaddingContext);
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5', HEADER_PADDING[padding ?? inherited], className)}
        {...props}
      />
    );
  },
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * `lg` (mặc định) cho tiêu đề của một thẻ đứng riêng; `md` cho tiêu đề một pane trong lưới nhiều
   * thẻ, ở đó `text-lg` to ngang tiêu đề màn hình nên pane nào cũng đòi làm nhân vật chính. Cỡ đi
   * bằng prop để thang cỡ nằm trong design system, thay cho `className="text-base"` rải ở feature.
   */
  size?: 'lg' | 'md';
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, size = 'lg', ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-bold leading-none tracking-tight',
        size === 'lg' ? 'text-lg' : 'text-base',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding, ...props }, ref) => {
    const inherited = React.useContext(CardPaddingContext);
    return <div ref={ref} className={cn(BODY_PADDING[padding ?? inherited], className)} {...props} />;
  },
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padding, ...props }, ref) => {
    const inherited = React.useContext(CardPaddingContext);
    return (
      <div
        ref={ref}
        className={cn('flex items-center', BODY_PADDING[padding ?? inherited], className)}
        {...props}
      />
    );
  },
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
