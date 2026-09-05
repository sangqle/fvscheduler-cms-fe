'use client';

import * as React from 'react';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { WorkspaceFilters, hasActiveFilters, type WorkspaceFilterValues } from '@/components/admin/workspaces/WorkspaceFilters';
import { WorkspaceTable } from '@/components/admin/workspaces/WorkspaceTable';
import { useAdminWorkspaces } from '@/hooks/useAdminWorkspaces';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import type { SubscriptionStatus, WorkspaceType } from '@/types/admin';

const DEFAULT_SIZE = 15;

/** CMS-01: danh sách workspace, filter + phân trang server, không có thao tác ghi. */
export function WorkspaceListScreen() {
  const { get, set, clear } = useUrlState();
  const values: WorkspaceFilterValues = {
    q: get('q'),
    type: get('type') as WorkspaceType | undefined,
    subscriptionStatus: get('subscriptionStatus') as SubscriptionStatus | undefined,
    planCode: get('planCode'),
    sort: (get('sort') as WorkspaceFilterValues['sort']) ?? 'createdAt,desc',
  };
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE);

  const query = useAdminWorkspaces({ ...values, page, size });
  const onChange = React.useCallback((patch: Partial<WorkspaceFilterValues>) => set(patch), [set]);

  return (
    <>
      <PageHeader
        title="Danh sách workspace"
        description={
          query.data
            ? `${query.data.totalElements} workspace trên toàn nền tảng · trạng thái gói suy theo đồng hồ lúc đọc, không phải giá trị lưu DB`
            : 'Trạng thái gói suy theo đồng hồ lúc đọc, không phải giá trị lưu DB'
        }
      />
      <div className="flex flex-col gap-4">
        <WorkspaceFilters values={values} onChange={onChange} onClear={clear} />
        <p className="text-xs text-muted-foreground">Không có thao tác ghi ở màn này · grant / extend / cancel nằm trong chi tiết</p>
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <WorkspaceTable
            page={query.data}
            isLoading={query.isPending}
            pageIndex={page}
            pageSize={size}
            onPageChange={(p) => set({ page: p })}
            onPageSizeChange={(s) => set({ size: s, page: 0 })}
            filtered={hasActiveFilters(values)}
            onClearFilters={clear}
          />
        )}
      </div>
    </>
  );
}
