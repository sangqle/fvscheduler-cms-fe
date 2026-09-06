import { cn } from '@/lib/utils';

/**
 * Khóa số nguyên thủy của bản ghi trong DB nền tảng (`Long`).
 *
 * Backend chỉ đính `rawId` trên `/api/admin/**` và cố tình không mang shape này sang DTO của
 * tenant (javadoc `AdminWorkspaceRowResponse`): id mờ `wk…` sinh ra để người ngoài không dò được
 * khóa tuần tự, còn người vận hành CMS thì đọc thẳng DB nên cần con số để join với kết quả SQL mà
 * không phải giải mã từng id một.
 */
export function RawId({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className={cn('font-mono text-xs tabular-nums text-muted-foreground', className)}>{value}</span>;
}
