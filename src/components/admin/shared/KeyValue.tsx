import { cn } from '@/lib/utils';

/** Một dòng nhãn/giá trị trong khối thông tin (drawer đơn hàng, thẻ gói). */
export function KeyValue({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3', className)}>
      <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-36">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function KeyValueList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn('flex flex-col gap-2.5', className)}>{children}</dl>;
}
