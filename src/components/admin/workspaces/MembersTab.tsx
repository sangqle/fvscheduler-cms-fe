'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Text } from '@/components/ui/Text';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { FilterSelect } from '@/components/admin/shared/FilterSelect';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { MembersTabSkeleton } from '@/components/admin/workspaces/WorkspaceSkeletons';
import { useAdminMemberships } from '@/hooks/useAdminWorkspaces';
import { MEMBERSHIP_STATUS } from '@/lib/admin/labels';
import { formatDate, shortId } from '@/lib/utils';
import type { AdminMembership, MembershipStatus } from '@/types/admin';

const STATUS_OPTIONS = (Object.keys(MEMBERSHIP_STATUS) as MembershipStatus[]).map((s) => ({
  value: s,
  label: MEMBERSHIP_STATUS[s].label,
}));

function memberName(m: AdminMembership): string {
  return m.displayName || m.account?.displayName || 'Chưa đặt tên';
}

const columns: ColumnDef<AdminMembership>[] = [
  {
    id: 'member',
    header: 'Thành viên',
    className: 'min-w-[12vw]',
    cell: (m) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={memberName(m)} size="sm" />
        <span className="flex flex-col">
          <span className="font-medium">{memberName(m)}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{shortId(m.id)}</span>
        </span>
      </span>
    ),
  },
  {
    id: 'email',
    header: 'Email đăng nhập',
    cell: (m) =>
      m.account?.email ? (
        <span className="text-sm">{m.account.email}</span>
      ) : (
        <span className="text-xs italic text-muted-foreground/70">Chưa nhận lời mời · chưa có tài khoản</span>
      ),
  },
  { id: 'status', header: 'Trạng thái', cell: (m) => <EnumBadge meta={MEMBERSHIP_STATUS[m.status]} mono={false} /> },
  {
    id: 'branches',
    header: 'Chi nhánh',
    cell: (m) => (
      <span className="flex flex-wrap gap-1">
        {m.branches.map((b) => (
          <Badge key={b.branchId} variant="secondary" size="sm">
            {b.branchName}
          </Badge>
        ))}
      </span>
    ),
  },
  {
    id: 'roles',
    header: 'Vai trò',
    cell: (m) => (
      <span className="flex flex-wrap gap-1">
        {m.roles.map((r) => (
          <Badge key={`${r.roleId}-${r.branchId ?? 'ws'}`} variant={r.isSystem ? 'default' : 'secondary'} size="sm">
            {r.name}
          </Badge>
        ))}
      </span>
    ),
  },
  { id: 'joined', header: 'Tham gia', className: 'font-mono text-xs text-muted-foreground', cell: (m) => formatDate(m.createdAt) },
];

/** CMS-03: thành viên chỉ đọc, cùng shape MembershipResponse của GET /api/memberships. */
export function MembersTab({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = React.useState<MembershipStatus | ''>('');
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(20);
  const query = useAdminMemberships(workspaceId, { status: status || undefined, page, size });

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isPending) return <MembersTabSkeleton />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FilterSelect
            label="Trạng thái"
            value={status || undefined}
            onChange={(v) => {
              setStatus((v ?? '') as MembershipStatus | '');
              setPage(0);
            }}
            options={STATUS_OPTIONS}
            className="w-auto"
          />
          {query.data && (
            <Text variant="caption" muted>
              {query.data.totalElements} thành viên
            </Text>
          )}
        </div>
        <ReadOnlyHint>Chỉ đọc · mời / vô hiệu thành viên thực hiện trong ERP</ReadOnlyHint>
      </div>
      <DataTable
        columns={columns}
        data={query.data?.content ?? []}
        rowKey={(m) => m.id}
        isLoading={query.isPending}
        paginated
        manualPagination
        pageIndex={page}
        pageCount={query.data?.totalPages ?? 1}
        totalRows={query.data?.totalElements ?? 0}
        defaultPageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setSize(s);
          setPage(0);
        }}
        emptyMessage="Không có thành viên nào khớp bộ lọc"
      />
    </div>
  );
}
