import * as React from 'react';
import { cn } from '@/lib/utils';

type TextVariant = 'body' | 'body-sm' | 'caption' | 'overline' | 'body-lg';

const variantClasses: Record<TextVariant, string> = {
  'body-lg': 'text-[1.125rem] leading-relaxed',
  body: 'text-[1rem] leading-relaxed',
  'body-sm': 'text-[0.875rem] leading-normal',
  caption: 'text-[0.75rem] leading-normal',
  overline: 'text-[0.75rem] font-semibold uppercase tracking-widest leading-normal',
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  muted?: boolean;
  subtle?: boolean;
  as?: React.ElementType;
}

export function Text({
  variant = 'body',
  muted,
  subtle,
  as: Tag = 'p',
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(
        variantClasses[variant],
        muted ? 'text-muted-foreground' : subtle ? 'text-muted-foreground/70' : 'text-foreground',
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    />
  );
}
