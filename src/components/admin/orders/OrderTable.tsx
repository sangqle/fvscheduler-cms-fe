'use client';

import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { BILLING_PERIOD, ORDER_STATUS, isOrderPayable } from '@/lib/admin/labels';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminOrderRow } from '@/types/admin';

const columns: ColumnDef<AdminOrderRow>[] = [
  { id: 'code', header: 'Mã đơn', cell: (o) => <span className="font-mono text-xs font-semibold">{o.orderCode}</span> },
  { id: 'ws', header: 'Workspace', className: 'min-w-[12vw]', cell: (o) => <span className="font-medium">{o.workspace.name}</span> },
  {
    id: 'plan',
    header: 'Gói · chu kỳ',
    cell: (o) => (
      <span className="flex flex-col">
        <span>{o.planName}</span>
        <span className="text-[11.5px] text-muted-foreground">{BILLING_PERIOD[o.billingPeriod]}</span>
      </span>
    ),
  },
  { id: 'amount', header: 'Số tiền', className: 'font-mono text-xs', cell: (o) => formatCurrency(o.amount) },
  { id: 'status', header: 'Trạng thái', cell: (o) => <EnumBadge meta={ORDER_STATUS[o.status]} /> },
  { id: 'created', header: 'Tạo lúc', className: 'font-mono text-xs', cell: (o) => formatDateTime(o.createdAt) },
  { id: 'paid', header: 'Thanh toán lúc', className: 'font-mono text-xs', cell: (o) => (o.paidAt ? formatDateTime(o.paidAt) : '—') },
  {
    id: 'tx',
    header: 'Khớp SePay',
    cell: (o) =>
      o.sepayTxId ? (
        <span className="font-mono text-xs text-muted-foreground">tx {o.sepayTxId}</span>
      ) : o.status === 'PAID' ? (
        <span className="text-xs font-semibold text-primary-600">Xác nhận tay</span>
      ) : (
        <span className="text-xs text-muted-foreground/70">—</span>
      ),
  },
];

export function OrderTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpen,
  filtered,
  onClearFilters,
}: {
  page: PageResponse<AdminOrderRow> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onOpen: (code: string) => void;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  return (
    <DataTable
      columns={columns}
      data={page?.content ?? []}
      rowKey={(o) => o.orderCode}
      isLoading={isLoading}
      skeletonRows={8}
      onRowClick={(o) => onOpen(o.orderCode)}
      rowClassName={(o) => (isOrderPayable(o.status) ? undefined : 'opacity-60')}
      paginated
      manualPagination
      pageIndex={pageIndex}
      pageCount={page?.totalPages ?? 1}
      totalRows={page?.totalElements ?? 0}
      defaultPageSize={pageSize}
      pageSizeOptions={[12, 20, 30, 50]}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyContent={
        <EmptyState
          icon={<SearchX />}
          title={filtered ? 'Không có đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
          description={filtered ? 'CANCELED tồn tại trong enum nhưng chưa luồng nào ghi; lọc theo nó luôn ra 0 dòng.' : undefined}
          action={filtered && <Button variant="outline" onClick={onClearFilters}>Xóa bộ lọc</Button>}
        />
      }
    />
  );
}
