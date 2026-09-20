'use client';

import * as React from 'react';
import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { CreateCampaignDialog } from '@/components/admin/mail/CreateCampaignDialog';
import {
  WorkspaceFilters,
  WorkspaceSortControl,
  hasActiveFilters,
  type WorkspaceFilterValues,
} from '@/components/admin/workspaces/WorkspaceFilters';
import { WorkspaceTable } from '@/components/admin/workspaces/WorkspaceTable';
import { useAdminWorkspaces } from '@/hooks/useAdminWorkspaces';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import type { SubscriptionStatus, WorkspaceType } from '@/types/admin';

const DEFAULT_SIZE = 15;

/** CMS-01: danh sách workspace, filter + phân trang server. Thao tác ghi duy nhất là gửi mail hàng loạt. */
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

  // Lựa chọn sống xuyên trang và xuyên bộ lọc, vì cách dùng thật là "lọc một nhóm, tích, đổi bộ lọc,
  // tích tiếp, rồi gửi một lần". Đổi lại thì phải luôn hiện con số đang chọn và một nút bỏ chọn hết:
  // thiếu nó là gửi kèm những id đã tích từ một bộ lọc không còn nhìn thấy trên màn hình nữa.
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [campaignOpen, setCampaignOpen] = React.useState(false);

  const toggle = React.useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const togglePage = React.useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  // Thứ tự ổn định để chữ ký chạy thử trong dialog không đổi chỉ vì người dùng bỏ rồi tích lại.
  const selectedIds = React.useMemo(() => [...selected].sort(), [selected]);

  return (
    <>
      <PageHeader
        title="Danh sách workspace"
        description={
          query.data
            ? `${query.data.totalElements} workspace trên toàn nền tảng · trạng thái gói suy theo đồng hồ lúc đọc, không phải giá trị lưu DB`
            : 'Trạng thái gói suy theo đồng hồ lúc đọc, không phải giá trị lưu DB'
        }
        actions={<WorkspaceSortControl value={values.sort} onChange={(sort) => set({ sort })} />}
      />
      <div className="flex flex-col gap-4">
        <WorkspaceFilters values={values} onChange={onChange} onClear={clear} />

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <Text variant="caption">
              Đang chọn <span className="font-semibold text-foreground">{selectedIds.length}</span> workspace
              {' · '}mail gửi tới chủ sở hữu của từng workspace
            </Text>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                <X className="size-4" />
                Bỏ chọn
              </Button>
              <Button size="sm" onClick={() => setCampaignOpen(true)}>
                <Mail className="size-4" />
                Gửi email ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

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
            selectedIds={selected}
            onToggle={toggle}
            onTogglePage={togglePage}
          />
        )}
      </div>

      <CreateCampaignDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        initialWorkspaceIds={selectedIds}
      />
    </>
  );
}
