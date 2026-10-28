import { formatCount } from '@/lib/admin/clientAlbums';
import { cn } from '@/lib/utils';

/**
 * Một số đếm trong ô bảng thống kê: mono, số cùng độ rộng, nhóm hàng nghìn kiểu vi-VN. Một chỗ duy
 * nhất để ba bảng của màn không lệch nhau về cách in số. `dimZero` cho cột mà số 0 là bối cảnh chứ
 * không phải thông tin (đã xóa sau đó): lùi màu để dòng có số thật nổi lên khi quét mắt.
 */
export function CountCell({ value, dimZero = false }: { value: number; dimZero?: boolean }) {
  return (
    <span className={cn('font-mono text-xs tabular-nums', dimZero && value === 0 && 'text-muted-foreground')}>
      {formatCount(value)}
    </span>
  );
}
