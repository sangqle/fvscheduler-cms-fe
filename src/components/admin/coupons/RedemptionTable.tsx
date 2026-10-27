'use client';

import * as React from 'react';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { RawId } from '@/components/admin/shared/RawId';
import { BILLING_PERIOD, COUPON_REDEMPTION_STATUS } from '@/lib/admin/labels';
import { formatVnDateTime } from '@/lib/admin/time';
import { formatCurrency, shortId } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminCouponRedemptionRow, AdminPlan } from '@/types/admin';

/** Mốc đi kèm trạng thái: thanh toán lúc nào, giữ chỗ tới bao giờ, hay hết hạn giữ chỗ lúc nào. */
function statusCaption(r: AdminCouponRedemptionRow): string | null {
  if (r.status === 'REDEEMED') return r.redeemedAt ? `thanh toán ${formatVnDateTime(r.redeemedAt)}` : null;
  if (!r.heldUntil) return null;
  return r.status === 'HELD'
    ? `giữ tới ${formatVnDateTime(r.heldUntil)}`
    : `hết hạn giữ chỗ ${formatVnDateTime(r.heldUntil)}`;
}

/** Header phải khớp `REDEMPTION_COLUMNS` ở `CouponSkeletons.tsx`. */
function buildColumns(plans: AdminPlan[] | undefined): ColumnDef<AdminCouponRedemptionRow>[] {
  return [
    {
      id: 'ws',
      header: 'Workspace',
      className: 'min-w-[12vw]',
      cell: (r) => (
        <span className="flex flex-col">
          <Link href={`/workspaces/${r.workspace.id}`} className="font-medium text-primary hover:underline">
            {r.workspace.name ?? shortId(r.workspace.id)}
          </Link>
          <RawId value={r.workspace.rawId} />
        </span>
      ),
    },
    {
      id: 'order',
      header: 'Đơn hàng',
      // Mở drawer đơn ở `/orders`, danh sách phía sau lọc sẵn theo workspace của dòng này.
      cell: (r) => (
        <Link
          href={`/orders?workspaceId=${r.workspace.id}&code=${r.orderCode}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {r.orderCode}
        </Link>
      ),
    },
    {
      id: 'plan',
      header: 'Gói · chu kỳ',
      cell: (r) => {
        const plan = plans?.find((p) => p.code === r.planCode);
        return (
          <span className="flex flex-col">
            {plan ? <span>{plan.name}</span> : <span className="font-mono text-xs">{r.planCode}</span>}
            <span className="text-xs text-muted-foreground">
              {BILLING_PERIOD[r.billingPeriod]}
              {plans && !plan && ' · không còn trong catalog'}
            </span>
          </span>
        );
      },
    },
    { id: 'list', header: 'Giá niêm yết', className: 'font-mono text-xs', cell: (r) => formatCurrency(r.listAmount) },
    { id: 'discount', header: 'Giảm', className: 'font-mono text-xs', cell: (r) => `−${formatCurrency(r.discountAmount)}` },
    {
      id: 'paid',
      header: 'Đã trả',
      className: 'font-mono text-xs',
      cell: (r) => (r.paidAmount !== null ? formatCurrency(r.paidAmount) : '—'),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (r) => {
        const caption = statusCaption(r);
        return (
          <span className="flex flex-col items-start gap-1">
            <EnumBadge meta={COUPON_REDEMPTION_STATUS[r.status]} />
            {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
          </span>
        );
      },
    },
    { id: 'created', header: 'Tạo lúc', className: 'font-mono text-xs', cell: (r) => formatVnDateTime(r.createdAt) },
  ];
}

/** Sổ lượt dùng của một mã: mỗi workspace từng giữ chỗ hay dùng mã là một dòng, phân trang server. */
export function RedemptionTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  plans,
}: {
  page: PageResponse<AdminCouponRedemptionRow> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  plans: AdminPlan[] | undefined;
}) {
  const columns = React.useMemo(() => buildColumns(plans), [plans]);
  return (
    <DataTable
      columns={columns}
      data={page?.content ?? []}
      rowKey={(r) => r.workspace.id}
      isLoading={isLoading}
      skeletonRows={5}
      mobileCards
      rowClassName={(r) => (r.status === 'LAPSED' ? 'opacity-60' : undefined)}
      paginated
      manualPagination
      pageIndex={pageIndex}
      pageCount={page?.totalPages ?? 1}
      totalRows={page?.totalElements ?? 0}
      defaultPageSize={pageSize}
      pageSizeOptions={[20, 30, 50]}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyContent={
        <EmptyState
          icon={<Inbox />}
          title="Chưa workspace nào dùng mã này"
          description="Mỗi checkout kèm mã thêm một dòng giữ chỗ ở đây; khi tiền về, dòng chuyển thành REDEEMED."
        />
      }
    />
  );
}
