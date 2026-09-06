'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SearchX, UserX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { RawId } from '@/components/admin/shared/RawId';
import { detailHref } from '@/hooks/useUrlState';
import { SUBSCRIPTION_SOURCE, SUBSCRIPTION_STATUS, WORKSPACE_TYPE } from '@/lib/admin/labels';
import { expiryTone, relativeDays } from '@/lib/admin/time';
import { cn, formatDate, formatDateTime, shortId } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminWorkspaceRow } from '@/types/admin';

const TONE_CLASS = { destructive: 'text-destructive-deep', warning: 'text-warning-deep', muted: 'text-muted-foreground' } as const;

export function ExpiryCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col">
      <span className="font-mono text-xs">{formatDateTime(iso)}</span>
      <span className={cn('text-[11px] font-semibold', TONE_CLASS[expiryTone(iso)])}>{relativeDays(iso)}</span>
    </span>
  );
}

const columns: ColumnDef<AdminWorkspaceRow>[] = [
  // Cột đầu tiên: người vận hành đọc thẳng DB nền tảng nên khóa số là thứ họ quét mắt trước nhất.
  { id: 'rawId', header: 'rawId', className: 'w-20', cell: (w) => <RawId value={w.rawId} /> },
  {
    id: 'name',
    header: 'Workspace',
    className: 'min-w-[14vw]',
    cell: (w) => (
      <span className="flex flex-col">
        <span className="font-semibold text-foreground">{w.name}</span>
        <span className="text-[11.5px] text-muted-foreground">
          {WORKSPACE_TYPE[w.type]} · <span className="font-mono">{shortId(w.id)}</span>
        </span>
      </span>
    ),
  },
  {
    id: 'owner',
    header: 'Chủ sở hữu',
    className: 'min-w-[14vw]',
    cell: (w) => (
      <span className="flex flex-col">
        <span>{w.owner.displayName}</span>
        {w.owner.email ? (
          <span className="text-[11.5px] text-muted-foreground">{w.owner.email}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11.5px] italic text-muted-foreground/70">
            <UserX className="size-3" /> Chưa có tài khoản đăng nhập
          </span>
        )}
      </span>
    ),
  },
  { id: 'members', header: 'TV', className: 'w-12 font-mono text-xs', cell: (w) => w.counts.activeMembers },
  { id: 'branches', header: 'CN', className: 'w-12 font-mono text-xs', cell: (w) => w.counts.activeBranches },
  {
    id: 'plan',
    header: 'Gói hiện tại',
    cell: (w) =>
      w.subscription.planCode ? (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{w.subscription.planName}</span>
          <span className="flex items-center gap-1.5">
            {w.subscription.source && <EnumBadge meta={SUBSCRIPTION_SOURCE[w.subscription.source]} />}
            <span className="font-mono text-[11px] text-muted-foreground">{w.subscription.planCode}</span>
          </span>
        </span>
      ) : (
        <span className="text-sm italic text-muted-foreground">Chưa từng có gói</span>
      ),
  },
  { id: 'status', header: 'Trạng thái', cell: (w) => <EnumBadge meta={SUBSCRIPTION_STATUS[w.subscription.status]} /> },
  { id: 'expires', header: 'Hết hạn', cell: (w) => <ExpiryCell iso={w.subscription.expiresAt} /> },
  { id: 'created', header: 'Tạo lúc', className: 'font-mono text-xs text-muted-foreground', cell: (w) => formatDate(w.createdAt) },
];

export function WorkspaceTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  filtered,
  onClearFilters,
}: {
  page: PageResponse<AdminWorkspaceRow> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <DataTable
      columns={columns}
      data={page?.content ?? []}
      rowKey={(w) => w.id}
      isLoading={isLoading}
      skeletonRows={8}
      onRowClick={(w) => router.push(detailHref(`/workspaces/${w.id}`, searchParams))}
      paginated
      manualPagination
      pageIndex={pageIndex}
      pageCount={page?.totalPages ?? 1}
      totalRows={page?.totalElements ?? 0}
      defaultPageSize={pageSize}
      pageSizeOptions={[15, 20, 30, 50]}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyContent={
        <EmptyState
          icon={<SearchX />}
          title={filtered ? 'Không tìm thấy workspace phù hợp' : 'Chưa có workspace nào'}
          description={
            filtered
              ? 'PAST_DUE là trạng thái đã mô hình hóa nhưng chưa có luồng nào ghi (chưa có dunning); lọc theo nó hôm nay luôn ra 0 dòng, không phải lỗi.'
              : undefined
          }
          action={filtered && <Button variant="outline" onClick={onClearFilters}>Xóa bộ lọc</Button>}
        />
      }
    />
  );
}
