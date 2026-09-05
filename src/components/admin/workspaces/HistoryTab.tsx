'use client';

import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Text } from '@/components/ui/Text';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { useAdminSubscriptionHistory } from '@/hooks/useAdminSubscriptions';
import { SUBSCRIPTION_DB_STATUS, SUBSCRIPTION_SOURCE, SUBSCRIPTION_STATUS } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/utils';
import type { AdminSubscriptionRow } from '@/types/admin';

function isLive(r: AdminSubscriptionRow): boolean {
  return r.status !== 'CANCELED';
}

const columns: ColumnDef<AdminSubscriptionRow>[] = [
  {
    id: 'plan',
    header: 'Gói',
    cell: (r) => (
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold">{r.planName}</span>
          {isLive(r) && (
            <Badge variant="primary" size="sm">
              Đang sống
            </Badge>
          )}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{r.planCode}</span>
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: (r) => (
      <span className="flex flex-col gap-0.5">
        {isLive(r) ? <EnumBadge meta={SUBSCRIPTION_STATUS[r.effectiveStatus]} /> : <EnumBadge meta={SUBSCRIPTION_DB_STATUS.CANCELED} />}
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {isLive(r) ? (r.effectiveStatus === r.status ? `lưu DB: ${r.status} · hiệu lực trùng` : `lưu DB: ${r.status}`) : 'hiệu lực: NONE'}
        </span>
      </span>
    ),
  },
  { id: 'source', header: 'Nguồn', cell: (r) => <EnumBadge meta={SUBSCRIPTION_SOURCE[r.source]} /> },
  { id: 'starts', header: 'Bắt đầu', className: 'font-mono text-xs', cell: (r) => formatDateTime(r.startsAt) },
  { id: 'expires', header: 'Hết hạn', className: 'font-mono text-xs', cell: (r) => formatDateTime(r.expiresAt) },
  {
    id: 'note',
    header: 'Ghi chú',
    className: 'min-w-[16vw]',
    cell: (r) => <span className={r.note ? 'text-xs' : 'text-xs text-muted-foreground/70'}>{r.note ?? '—'}</span>,
  },
  { id: 'created', header: 'Tạo lúc', className: 'font-mono text-xs text-muted-foreground', cell: (r) => formatDateTime(r.createdAt) },
];

/** CMS-04: lịch sử gói, mảng phẳng, dòng không có id → key ghép từ createdAt + planCode. */
export function HistoryTab({ workspaceId }: { workspaceId: string }) {
  const query = useAdminSubscriptionHistory(workspaceId);
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const rows = query.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Text variant="caption" muted>
        {rows.length} dòng · mới nhất trước · trả nguyên mảng, không phân trang · dòng subscription không có id
      </Text>
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => `${r.createdAt}-${r.planCode}`}
        isLoading={query.isPending}
        rowClassName={(r) => (isLive(r) ? 'bg-primary-50/40' : 'opacity-70')}
        emptyMessage="Workspace này chưa từng có gói"
      />
      <Text variant="caption" muted className="inline-flex items-start gap-1.5">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Badge chính là effectiveStatus (suy theo đồng hồ). Khi lệch với giá trị lưu DB, dòng phụ ghi lưu DB: ACTIVE, giải thích vì
          sao Gia hạn vẫn dùng được trên một dòng đã hết hạn. Dòng CANCELED giữ badge CANCELED, hiệu lực = NONE.
        </span>
      </Text>
    </div>
  );
}
