'use client';

import * as React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { CouponFormDialog } from '@/components/admin/coupons/CouponFormDialog';
import { CouponTable } from '@/components/admin/coupons/CouponTable';
import { useAdminCoupons } from '@/hooks/useAdminCoupons';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { COUPON_STATUS_OPTIONS } from '@/lib/admin/labels';
import { COUPON_CODE_MAX, normalizeCouponCode } from '@/lib/admin/coupons';
import { normalizeInputValue } from '@/lib/utils';
import type { CouponStatusFilter } from '@/types/admin';

const DEFAULT_SIZE = 20;

/** Danh sách mã giảm giá: `?status=` lọc trạng thái, `?q=` tìm theo đầu mã, phân trang server. */
export function CouponListScreen() {
  const { get, set, clear } = useUrlState();
  const statusParam = get('status') ?? '';
  const status = COUPON_STATUS_OPTIONS.some((o) => o.value === statusParam)
    ? (statusParam as CouponStatusFilter | '')
    : '';
  const qParam = get('q');
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE) || DEFAULT_SIZE;
  const [createOpen, setCreateOpen] = React.useState(false);

  const commitQ = React.useCallback((value: string | undefined) => set({ q: value }), [set]);
  const [q, setQ] = useDebouncedSearch(qParam, commitQ);

  const query = useAdminCoupons({ status: status || undefined, q: qParam, page, size });
  const filtered = !!(status || qParam);

  // Xóa mã cuối của trang cuối (hoặc link `?page=` cũ) để lại một trang rỗng: kéo về trang cuối còn
  // dữ liệu. Bỏ qua dữ liệu giữ chỗ của `keepPreviousData`, số trang của nó là của khóa trước.
  const totalPages = query.data?.totalPages;
  const isPlaceholder = query.isPlaceholderData;
  React.useEffect(() => {
    if (isPlaceholder || totalPages === undefined) return;
    if (page > 0 && page >= totalPages) set({ page: totalPages > 1 ? totalPages - 1 : undefined });
  }, [isPlaceholder, totalPages, page, set]);

  return (
    <>
      <PageHeader
        title="Mã giảm giá"
        description="Mã giảm theo phần trăm cho gói đăng ký · mỗi workspace dùng một mã một lần, đơn dùng mã không tính hoa hồng giới thiệu"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo mã giảm giá
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            leadingIcon={<Search className="size-4" />}
            placeholder="Tìm theo đầu mã, ví dụ TET"
            value={q}
            onChange={(e) => setQ(normalizeInputValue(e.target, normalizeCouponCode, COUPON_CODE_MAX))}
            aria-label="Tìm mã giảm giá theo đầu mã"
            autoComplete="off"
            containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
          />
          <SegmentedControl
            options={COUPON_STATUS_OPTIONS}
            value={status}
            onValueChange={(v) => set({ status: v || undefined })}
            size="sm"
            aria-label="Lọc theo trạng thái mã"
            className="max-w-full shrink-0 overflow-x-auto no-scrollbar"
          />
        </div>
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <CouponTable
            page={query.data}
            isLoading={query.isPending}
            pageIndex={page}
            pageSize={size}
            onPageChange={(p) => set({ page: p })}
            onPageSizeChange={(s) => set({ size: s, page: 0 })}
            filtered={filtered}
            onClearFilters={clear}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </div>
      <CouponFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
