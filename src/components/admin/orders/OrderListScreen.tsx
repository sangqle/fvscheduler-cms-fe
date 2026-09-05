'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { OrderDrawer } from '@/components/admin/orders/OrderDrawer';
import { OrderTable } from '@/components/admin/orders/OrderTable';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useAdminWorkspace } from '@/hooks/useAdminWorkspaces';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { shortId } from '@/lib/utils';
import type { OrderStatus } from '@/types/admin';

const DEFAULT_SIZE = 12;
const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'PAID', label: 'PAID' },
  { value: 'EXPIRED', label: 'EXPIRED' },
  { value: 'CANCELED', label: 'CANCELED' },
];

/** CMS-05/06: đối soát đơn SePay; `?code=` mở drawer, `?workspaceId=` lọc theo workspace. */
export function OrderListScreen() {
  const { get, set, clear } = useUrlState();
  const status = (get('status') ?? '') as OrderStatus | '';
  const qParam = get('q');
  const workspaceId = get('workspaceId');
  const code = get('code') ?? null;
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE);

  const [q, setQ] = React.useState(qParam ?? '');
  React.useEffect(() => setQ(qParam ?? ''), [qParam]);
  React.useEffect(() => {
    if (q === (qParam ?? '')) return;
    const t = setTimeout(() => set({ q: q || undefined }), 300);
    return () => clearTimeout(t);
  }, [q, qParam, set]);

  const query = useAdminOrders({ status: status || undefined, q: qParam, workspaceId, page, size });
  const wsScope = useAdminWorkspace(workspaceId ?? '');
  const filtered = !!(status || qParam || workspaceId);

  return (
    <>
      <PageHeader title="Danh sách đơn hàng" description="Đối soát đơn tự thanh toán qua SePay · PENDING và EXPIRED là nhóm cần chú ý, PAID mờ đi" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            leadingIcon={<Search className="size-4" />}
            placeholder="Mã đơn, tên workspace hoặc email chủ sở hữu"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm đơn hàng"
            containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
          />
          <SegmentedControl
            options={STATUS_TABS}
            value={status}
            onValueChange={(v) => set({ status: v || undefined })}
            size="sm"
            aria-label="Lọc theo trạng thái đơn"
            className="max-w-full shrink-0 overflow-x-auto no-scrollbar"
          />
        </div>
        {workspaceId && (
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="caption" muted>
              Đang lọc theo workspace{' '}
              <Link href={`/workspaces/${workspaceId}`} className="font-medium text-primary hover:underline">
                {wsScope.data?.name ?? shortId(workspaceId)}
              </Link>{' '}
              · workspaceId chỉ là query filter, không phải path
            </Text>
            <Button variant="ghost" size="sm" onClick={() => set({ workspaceId: undefined })}>
              <X className="size-3.5" /> Bỏ lọc
            </Button>
          </div>
        )}
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <OrderTable
            page={query.data}
            isLoading={query.isPending}
            pageIndex={page}
            pageSize={size}
            onPageChange={(p) => set({ page: p })}
            onPageSizeChange={(s) => set({ size: s, page: 0 })}
            onOpen={(c) => set({ code: c, page })}
            filtered={filtered}
            onClearFilters={clear}
          />
        )}
      </div>
      <OrderDrawer orderCode={code} onClose={() => set({ code: undefined, page })} />
    </>
  );
}
