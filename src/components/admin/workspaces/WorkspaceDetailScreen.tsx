'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { WorkspaceDetailSkeleton } from '@/components/admin/workspaces/WorkspaceSkeletons';
import { OverviewTab } from '@/components/admin/workspaces/OverviewTab';
import { MembersTab } from '@/components/admin/workspaces/MembersTab';
import { HistoryTab } from '@/components/admin/workspaces/HistoryTab';
import { useAdminWorkspace } from '@/hooks/useAdminWorkspaces';
import { useReturnHref, useUrlState } from '@/hooks/useUrlState';
import { SUBSCRIPTION_STATUS, WORKSPACE_TYPE } from '@/lib/admin/labels';
import { formatDateTime, shortId } from '@/lib/utils';

const TABS = ['overview', 'members', 'history'] as const;
type Tab = (typeof TABS)[number];

/** CMS-02..04: chi tiết workspace, tab sống trên `?tab=`. */
export function WorkspaceDetailScreen({ workspaceId }: { workspaceId: string }) {
  const { get, set } = useUrlState();
  const backHref = useReturnHref('/workspaces');
  const { showToast } = useToast();
  const tab: Tab = TABS.includes(get('tab') as Tab) ? (get('tab') as Tab) : 'overview';
  const query = useAdminWorkspace(workspaceId);

  if (query.isPending) return <WorkspaceDetailSkeleton />;
  if (query.error) {
    if (isNotFound(query.error)) {
      return (
        <NotFoundState
          title="Không tìm thấy workspace này"
          description={`${shortId(workspaceId)} không tồn tại hoặc đã bị xóa. Backend luôn trả cùng một thông điệp, không tiết lộ id.`}
          backHref={backHref}
          backLabel="Về danh sách workspace"
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const ws = query.data;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(ws.id);
      showToast({ title: 'Đã chép workspaceId', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="link" size="sm" className="self-start" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Danh sách workspace
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{ws.name}</h2>
              <Badge variant="secondary" size="sm">
                {WORKSPACE_TYPE[ws.type]}
              </Badge>
              <EnumBadge meta={SUBSCRIPTION_STATUS[ws.subscription.status]} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <button type="button" onClick={copyId} className="inline-flex items-center gap-1 font-mono hover:text-foreground" title={ws.id}>
                {shortId(ws.id)} <Copy className="size-3" />
              </button>
              <span>· Tạo {formatDateTime(ws.createdAt)}</span>
              <span>
                · Chủ sở hữu {ws.owner.displayName}
                {ws.owner.email && ` · ${ws.owner.email}`}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders?workspaceId=${ws.id}`}>
              Xem đơn hàng của workspace
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'overview' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="members">Thành viên</TabsTrigger>
          <TabsTrigger value="history">Lịch sử gói</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab ws={ws} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          {tab === 'members' && <MembersTab workspaceId={ws.id} />}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {tab === 'history' && <HistoryTab workspaceId={ws.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
