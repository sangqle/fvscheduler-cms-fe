'use client';

import { Inbox, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { AFFILIATE_PAYOUT_STATUS } from '@/lib/admin/labels';
import { formatCurrency, formatDateTime, shortId } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminAffiliatePayoutRow, AffiliatePayoutStatus } from '@/types/admin';

// Tên cột và `min-w` phải khớp `PAYOUT_COLUMNS` trong `AffiliateSkeletons.tsx`.
const columns: ColumnDef<AdminAffiliatePayoutRow>[] = [
  {
    id: 'referrer',
    header: 'Người giới thiệu',
    className: 'min-w-[14vw]',
    cell: (p) =>
      p.referrerEmail ? (
        <span className="flex flex-col">
          <span className="font-medium">{p.referrerEmail}</span>
          <span className="font-mono text-xs text-muted-foreground" title={p.referrerAccountId}>
            {shortId(p.referrerAccountId)}
          </span>
        </span>
      ) : (
        <span className="font-mono text-xs" title={p.referrerAccountId}>
          {shortId(p.referrerAccountId)}
        </span>
      ),
  },
  { id: 'amount', header: 'Số tiền', className: 'font-mono text-xs font-semibold', cell: (p) => formatCurrency(p.amount) },
  {
    id: 'count',
    header: 'Số lượt',
    className: 'font-mono text-xs tabular-nums',
    // Đếm sống: từ chối đã gỡ `payoutId` khỏi các dòng nên `REJECTED` luôn ra 0, không phải số đã gom.
    cell: (p) => (p.status === 'REJECTED' ? '—' : p.commissionCount),
  },
  {
    id: 'bank',
    header: 'Chuyển tới',
    className: 'min-w-[14vw]',
    cell: (p) => (
      <span className="flex flex-col">
        <span>
          {p.bankName} · <span className="font-mono text-xs">{p.bankAccountNumber}</span>
        </span>
        <span className="text-xs text-muted-foreground">{p.bankAccountHolder}</span>
      </span>
    ),
  },
  { id: 'status', header: 'Trạng thái', cell: (p) => <EnumBadge meta={AFFILIATE_PAYOUT_STATUS[p.status]} /> },
  { id: 'created', header: 'Gửi lúc', className: 'font-mono text-xs', cell: (p) => formatDateTime(p.createdAt) },
  {
    id: 'processed',
    header: 'Xử lý lúc',
    className: 'font-mono text-xs',
    cell: (p) => (p.processedAt ? formatDateTime(p.processedAt) : '—'),
  },
];

/** Hàng đợi yêu cầu rút tiền, phân trang server; dòng đã chốt (`PAID`/`REJECTED`) mờ đi như đơn không còn xác nhận được. */
export function PayoutTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpen,
  status,
  onClearFilters,
}: {
  page: PageResponse<AdminAffiliatePayoutRow> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onOpen: (row: AdminAffiliatePayoutRow) => void;
  /** Bộ lọc đang áp, rỗng là tất cả: quyết định câu chữ của trạng thái trống. */
  status: AffiliatePayoutStatus | '';
  onClearFilters: () => void;
}) {
  return (
    <DataTable
      columns={columns}
      data={page?.content ?? []}
      rowKey={(p) => p.id}
      isLoading={isLoading}
      skeletonRows={8}
      onRowClick={onOpen}
      rowClassName={(p) => (p.status === 'REQUESTED' ? undefined : 'opacity-60')}
      paginated
      manualPagination
      pageIndex={pageIndex}
      pageCount={page?.totalPages ?? 1}
      totalRows={page?.totalElements ?? 0}
      defaultPageSize={pageSize}
      // Cùng bộ với `CommissionTable`: `?size=` dùng chung giữa các tab (xem `affiliateTabs.ts`).
      pageSizeOptions={[20, 30, 50]}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyContent={
        status ? (
          <EmptyState
            icon={<SearchX />}
            title={status === 'REQUESTED' ? 'Không còn yêu cầu nào chờ xử lý' : `Không có yêu cầu ${status} nào`}
            description={status === 'REQUESTED' ? 'Hàng đợi trống: mọi yêu cầu đã được đánh dấu đã trả hoặc từ chối.' : undefined}
            action={<Button variant="outline" onClick={onClearFilters}>Xem tất cả</Button>}
          />
        ) : (
          <EmptyState
            icon={<Inbox />}
            title="Chưa có yêu cầu rút tiền nào"
            description="Người giới thiệu gửi yêu cầu khi số dư khả dụng từ 200.000 ₫ và đã lưu tài khoản ngân hàng."
          />
        )
      }
    />
  );
}
