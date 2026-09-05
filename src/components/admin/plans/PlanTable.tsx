'use client';

import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { formatCurrency } from '@/lib/utils';
import type { AdminPlan } from '@/types/admin';

/** `∞` = key có trong limits với giá trị null; `—` = key không có trong limits. */
function limitCell(plan: AdminPlan, key: string): string {
  if (!(key in plan.limits)) return '—';
  const v = plan.limits[key];
  return v === null ? '∞' : String(v);
}

/** Giá niêm yết gạch → giá bán; giá bán null thì gạch nguyên giá niêm yết. */
function PriceCell({ list, sale }: { list: number | null; sale: number | null }) {
  if (list === null && sale === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col font-mono text-xs">
      {sale !== null ? (
        <>
          <span className="font-semibold text-foreground">{formatCurrency(sale)}</span>
          {list !== null && list !== sale && <span className="text-muted-foreground line-through">{formatCurrency(list)}</span>}
        </>
      ) : (
        <>
          <span className="text-muted-foreground line-through">{formatCurrency(list!)}</span>
          <span className="text-muted-foreground">null</span>
        </>
      )}
    </span>
  );
}

const columns: ColumnDef<AdminPlan>[] = [
  { id: 'code', header: 'Mã', cell: (p) => <span className="font-mono text-xs font-semibold">{p.code}</span> },
  { id: 'name', header: 'Tên gói', cell: (p) => <span className="font-medium">{p.name}</span> },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: (p) => (
      <Badge variant={p.isActive ? 'success' : 'destructive'} size="sm">
        {p.isActive ? 'Đang bán' : 'Đã ngừng bán'}
      </Badge>
    ),
  },
  { id: 'month', header: 'Giá tháng · niêm yết → bán', cell: (p) => <PriceCell list={p.monthlyListPrice} sale={p.monthlySalePrice} /> },
  { id: 'year', header: 'Giá năm · niêm yết → bán', cell: (p) => <PriceCell list={p.yearlyListPrice} sale={p.yearlySalePrice} /> },
  { id: 'seats', header: 'Seats', className: 'font-mono text-xs', cell: (p) => limitCell(p, 'SEATS') },
  { id: 'branches', header: 'Branches', className: 'font-mono text-xs', cell: (p) => limitCell(p, 'BRANCHES') },
  { id: 'albums', header: 'Albums / tháng', className: 'font-mono text-xs', cell: (p) => limitCell(p, 'ALBUMS_PER_MONTH') },
  { id: 'sort', header: 'Sort', className: 'font-mono text-xs text-muted-foreground', cell: (p) => p.sortOrder },
];

export function PlanTable() {
  const { data, isLoading, error, refetch } = useAdminPlans();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(p) => p.code}
        isLoading={isLoading}
        skeletonRows={8}
        rowClassName={(p) => (p.isActive ? undefined : 'opacity-60')}
        emptyMessage="Catalog trống"
      />
      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>∞ = key có trong limits với giá trị null (không giới hạn)</span>
        <span>— = key không có trong limits (gói không mang giới hạn này)</span>
        <span>Giá bán gạch = gói không có giá ở bậc đó (null)</span>
      </Text>
    </div>
  );
}
