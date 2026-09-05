import { Badge } from '@/components/ui/Badge';
import type { EnumMeta } from '@/lib/admin/labels';

/** Chip enum backend (trạng thái gói, nguồn, đơn hàng, thành viên) từ bảng `labels.ts`. */
export function EnumBadge({ meta, mono = true }: { meta: EnumMeta; mono?: boolean }) {
  return (
    <Badge variant={meta.variant} size="sm" mono={mono}>
      {meta.label}
    </Badge>
  );
}
