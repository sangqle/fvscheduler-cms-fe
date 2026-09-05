import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Dòng chú thích "Chỉ đọc · lý do" cạnh tiêu đề bảng/khối. */
export function ReadOnlyHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
