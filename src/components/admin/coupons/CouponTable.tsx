'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchX, TicketPercent } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tooltip } from '@/components/ui/Tooltip';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ScopeSummary, UsageSummary, ValidityText } from '@/components/admin/coupons/couponDisplay';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { detailHref } from '@/hooks/useUrlState';
import { COUPON_STATE } from '@/lib/admin/labels';
import { formatCurrency } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminCoupon, AdminPlan } from '@/types/admin';

/** Header phải khớp `COUPON_COLUMNS` ở `CouponSkeletons.tsx`. */
function buildColumns(plans: AdminPlan[] | undefined, listQuery: URLSearchParams | string): ColumnDef<AdminCoupon>[] {
  return [
    {
      id: 'code',
      header: 'Mã',
      // Hàng bấm được chỉ bằng chuột (`onRowClick` gắn lên `<tr>`): mã là link thật để bàn phím cũng mở được.
      cell: (c) => (
        <span className="flex flex-col">
          <Link
            href={detailHref(`/coupons/${c.code}`, listQuery)}
            onClick={(e) => e.stopPropagation()}
            className="font-mono font-semibold text-primary underline-offset-2 hover:underline"
          >
            {c.code}
          </Link>
          {c.firstPurchaseOnly && <span className="text-xs text-muted-foreground">Chỉ lần mua đầu</span>}
        </span>
      ),
    },
    { id: 'percent', header: 'Giảm', className: 'font-mono text-xs font-semibold', cell: (c) => `${c.percentOff}%` },
    {
      id: 'scope',
      header: 'Gói · chu kỳ',
      className: 'min-w-[12vw]',
      cell: (c) => <ScopeSummary coupon={c} plans={plans} />,
    },
    {
      id: 'window',
      header: 'Hiệu lực',
      className: 'text-xs',
      cell: (c) => <ValidityText startsAt={c.startsAt} endsAt={c.endsAt} />,
    },
    { id: 'usage', header: 'Lượt dùng', cell: (c) => <UsageSummary coupon={c} /> },
    { id: 'discount', header: 'Đã giảm', className: 'font-mono text-xs', cell: (c) => formatCurrency(c.totalDiscount) },
    { id: 'paid', header: 'Đã thu', className: 'font-mono text-xs', cell: (c) => formatCurrency(c.totalPaid) },
    {
      id: 'state',
      header: 'Trạng thái',
      cell: (c) => (
        <Tooltip content={COUPON_STATE[c.state].hint}>
          <span className="inline-flex">
            <EnumBadge meta={COUPON_STATE[c.state]} />
          </span>
        </Tooltip>
      ),
    },
  ];
}

/** Bảng mã giảm giá, phân trang server. Bấm hàng mở trang chi tiết, mang theo bộ lọc để quay lại. */
export function CouponTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  filtered,
  onClearFilters,
  onCreate,
}: {
  page: PageResponse<AdminCoupon> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: plans } = useAdminPlans();
  const columns = React.useMemo(() => buildColumns(plans, searchParams), [plans, searchParams]);

  return (
    <DataTable
      columns={columns}
      data={page?.content ?? []}
      rowKey={(c) => c.code}
      isLoading={isLoading}
      skeletonRows={8}
      mobileCards
      onRowClick={(c) => router.push(detailHref(`/coupons/${c.code}`, searchParams))}
      rowClassName={(c) => (c.state === 'ACTIVE' || c.state === 'SCHEDULED' ? undefined : 'opacity-60')}
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
        filtered ? (
          <EmptyState
            icon={<SearchX />}
            title="Không có mã nào khớp bộ lọc"
            description="Ô tìm khớp theo đầu mã, không tìm chuỗi nằm giữa mã."
            action={
              <Button variant="outline" onClick={onClearFilters}>
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<TicketPercent />}
            title="Chưa có mã giảm giá nào"
            description="Khách nhập mã ở bước thanh toán gói; mỗi workspace dùng một mã một lần."
            action={<Button onClick={onCreate}>Tạo mã giảm giá</Button>}
          />
        )
      }
    />
  );
}
