'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ItemsTab } from '@/components/admin/plans/ItemsTab';
import { PlanFormDialog } from '@/components/admin/plans/PlanFormDialog';
import { PlanTable } from '@/components/admin/plans/PlanTable';
import { VocabularyTab } from '@/components/admin/plans/VocabularyTab';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { useCatalogItems } from '@/hooks/useAdminCatalog';
import { useUrlState } from '@/hooks/useUrlState';

const TABS = ['plans', 'items', 'vocabulary'] as const;
type Tab = (typeof TABS)[number];

const DESCRIPTION: Record<Tab, string> = {
  plans: 'Sửa ở đây ghi thẳng vào catalog · sau khi lưu, cache gói và trang giá công khai tự xóa',
  items: 'Item là dòng khách thấy trên bảng giá · sửa item ảnh hưởng mọi gói mang nhóm của nó',
  vocabulary: 'Hai tập khóa đóng của catalog · thêm khóa mới phải sửa backend',
};

/** CMS-07: catalog gói quản lý được — gói, nhóm & item, từ vựng. Tab sống trên `?tab=`. */
export function PlanCatalogScreen() {
  const { get, set } = useUrlState();
  const tab: Tab = TABS.includes(get('tab') as Tab) ? (get('tab') as Tab) : 'plans';
  const plans = useAdminPlans();
  const items = useCatalogItems();

  const [createPlanOpen, setCreatePlanOpen] = React.useState(false);
  const [createItemOpen, setCreateItemOpen] = React.useState(false);

  return (
    <>
      <PageHeader
        title="Catalog gói"
        description={DESCRIPTION[tab]}
        actions={
          tab === 'plans' ? (
            <Button onClick={() => setCreatePlanOpen(true)}>
              <Plus className="size-4" />
              Tạo gói
            </Button>
          ) : tab === 'items' ? (
            <Button onClick={() => setCreateItemOpen(true)}>
              <Plus className="size-4" />
              Tạo item
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'plans' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="plans">
            Gói
            {plans.data && <TabsCount>{plans.data.length}</TabsCount>}
          </TabsTrigger>
          <TabsTrigger value="items">
            Nhóm &amp; item
            {items.data && <TabsCount>{items.data.length}</TabsCount>}
          </TabsTrigger>
          <TabsTrigger value="vocabulary">Từ vựng</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <PlanTable onCreate={() => setCreatePlanOpen(true)} />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          {tab === 'items' && <ItemsTab createOpen={createItemOpen} onCreateOpenChange={setCreateItemOpen} />}
        </TabsContent>
        <TabsContent value="vocabulary" className="mt-4">
          {tab === 'vocabulary' && <VocabularyTab />}
        </TabsContent>
      </Tabs>

      <PlanFormDialog open={createPlanOpen} onOpenChange={setCreatePlanOpen} />
    </>
  );
}
