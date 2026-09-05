import * as React from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = '1' | '2' | '3' | '4';

const levelClasses: Record<HeadingLevel, string> = {
  '1': 'text-[1.875rem] font-bold leading-tight',
  '2': 'text-[1.5rem] font-semibold leading-tight',
  '3': 'text-[1.25rem] font-semibold leading-snug',
  '4': 'text-[1.125rem] font-medium leading-snug',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel;
}

export function Heading({ level, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  return (
    <Tag
      className={cn('text-foreground', levelClasses[level], className)}
      {...props}
    />
  );
}
