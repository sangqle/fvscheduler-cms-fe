'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/ToastProvider';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { PlanDetailSkeleton } from '@/components/admin/plans/PlanSkeletons';
import { PlanCompositionTab } from '@/components/admin/plans/PlanCompositionTab';
import { PlanOverviewTab } from '@/components/admin/plans/PlanOverviewTab';
import { PlanStateBadges } from '@/components/admin/plans/planDisplay';
import { useAdminPlan } from '@/hooks/useAdminPlans';
import { useReturnHref, useUrlState } from '@/hooks/useUrlState';
import { formatDateTime } from '@/lib/utils';

const TABS = ['overview', 'composition'] as const;
type Tab = (typeof TABS)[number];

/** CMS-07 chi tiết: sửa thông tin gói (ADM-FLOW-08) và soạn thành phần (ADM-FLOW-09). */
export function PlanDetailScreen({ planCode }: { planCode: string }) {
  const { get, set } = useUrlState();
  const backHref = useReturnHref('/plans');
  const { showToast } = useToast();
  const tab: Tab = TABS.includes(get('tab') as Tab) ? (get('tab') as Tab) : 'overview';
  const query = useAdminPlan(planCode);

  if (query.isPending) return <PlanDetailSkeleton />;
  if (query.error) {
    if (isNotFound(query.error)) {
      return (
        <NotFoundState
          title="Không tìm thấy gói này"
          description={`Mã ${planCode} không có trong catalog. Mã gói phân biệt hoa thường và không đổi được sau khi tạo.`}
          backHref={backHref}
          backLabel="Về catalog gói"
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const plan = query.data;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(plan.code);
      showToast({ title: 'Đã chép mã gói', variant: 'success', duration: 2000 });
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
            Catalog gói
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading level="2">{plan.name}</Heading>
              <Badge variant={plan.isActive ? 'success' : 'muted'} size="sm">
                {plan.isActive ? 'Đang bán' : 'Ngừng bán'}
              </Badge>
              <PlanStateBadges plan={plan} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 font-mono hover:text-foreground"
              >
                {plan.code} <Copy className="size-3" />
              </button>
              <span>· Tạo {formatDateTime(plan.createdAt)}</span>
              <span>· Sửa lần cuối {formatDateTime(plan.updatedAt)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces?planCode=${plan.code}`}>
              Workspace dùng gói này
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'overview' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="composition">
            Thành phần
            <TabsCount>{plan.items.length}</TabsCount>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <PlanOverviewTab plan={plan} />
        </TabsContent>
        <TabsContent value="composition" className="mt-4">
          {tab === 'composition' && <PlanCompositionTab plan={plan} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
