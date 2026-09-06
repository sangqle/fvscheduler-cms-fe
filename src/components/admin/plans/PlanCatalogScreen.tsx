'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import {
  ItemFilters,
  PlanFilters,
  PlanSortControl,
  parseActiveFilter,
  parsePlanSort,
  type ItemFilterValues,
  type PlanFilterValues,
} from '@/components/admin/plans/CatalogFilters';
import { ItemsTab } from '@/components/admin/plans/ItemsTab';
import { PlanTable } from '@/components/admin/plans/PlanTable';
import { SystemKeysTab } from '@/components/admin/plans/SystemKeysTab';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { useCatalogItems } from '@/hooks/useAdminCatalog';
import { useUrlState } from '@/hooks/useUrlState';

const TABS = ['plans', 'items', 'keys'] as const;
type Tab = (typeof TABS)[number];

const DESCRIPTION: Record<Tab, string> = {
  plans: 'Sửa ở đây ghi thẳng vào catalog · sau khi lưu, cache gói và trang giá công khai tự xóa',
  items: 'Item là dòng khách thấy trên bảng giá · sửa item ảnh hưởng mọi gói mang nhóm của nó',
  keys: 'Hai danh sách khóa cố định nằm trong code backend · màn này chỉ để tra cứu khi soạn gói',
};

/**
 * CMS-07: catalog gói quản lý được: gói, nhóm & item, khóa hệ thống. Tab và mọi bộ lọc sống trên URL:
 * `?tab=` · tab Gói dùng `q` / `status` / `sort` · tab Item dùng `itemQ` / `group` / `itemStatus`,
 * tách khóa để chuyển tab không làm mất bộ lọc của tab kia.
 */
export function PlanCatalogScreen() {
  const { get, set } = useUrlState();
  const tab: Tab = TABS.includes(get('tab') as Tab) ? (get('tab') as Tab) : 'plans';
  const plans = useAdminPlans();
  const items = useCatalogItems();

  const [createPlanOpen, setCreatePlanOpen] = React.useState(false);
  const [createItemOpen, setCreateItemOpen] = React.useState(false);

  const planValues: PlanFilterValues = {
    q: get('q'),
    status: parseActiveFilter(get('status')),
    sort: parsePlanSort(get('sort')),
  };
  const itemValues: ItemFilterValues = {
    q: get('itemQ'),
    group: get('group'),
    status: parseActiveFilter(get('itemStatus')),
  };

  /** Chỉ chạm vào khóa có trong `patch`; sắp xếp mặc định thì bỏ khỏi URL cho gọn. */
  const onPlanChange = React.useCallback(
    (patch: Partial<PlanFilterValues>) => {
      const next: Record<string, string | undefined> = {};
      if ('q' in patch) next.q = patch.q;
      if ('status' in patch) next.status = patch.status;
      if ('sort' in patch) next.sort = patch.sort === 'sort' ? undefined : patch.sort;
      set(next);
    },
    [set],
  );
  const clearPlanFilters = React.useCallback(() => set({ q: undefined, status: undefined }), [set]);

  const onItemChange = React.useCallback(
    (patch: Partial<ItemFilterValues>) => {
      const next: Record<string, string | undefined> = {};
      if ('q' in patch) next.itemQ = patch.q;
      if ('group' in patch) next.group = patch.group;
      if ('status' in patch) next.itemStatus = patch.status;
      set(next);
    },
    [set],
  );
  const clearItemFilters = React.useCallback(
    () => set({ itemQ: undefined, group: undefined, itemStatus: undefined }),
    [set],
  );

  return (
    <>
      <PageHeader
        title="Catalog gói"
        description={DESCRIPTION[tab]}
        actions={
          tab === 'plans' ? (
            <>
              <PlanSortControl value={planValues.sort} onChange={(sort) => onPlanChange({ sort })} />
              <Button onClick={() => setCreatePlanOpen(true)}>
                <Plus className="size-4" />
                Tạo gói
              </Button>
            </>
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
          <TabsTrigger value="keys">Khóa hệ thống</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4 flex flex-col gap-4">
          <PlanFilters values={planValues} onChange={onPlanChange} onClear={clearPlanFilters} />
          <PlanTable values={planValues} createOpen={createPlanOpen} onCreateOpenChange={setCreatePlanOpen} />
        </TabsContent>
        <TabsContent value="items" className="mt-4 flex flex-col gap-4">
          {tab === 'items' && (
            <>
              <ItemFilters values={itemValues} onChange={onItemChange} onClear={clearItemFilters} />
              <ItemsTab values={itemValues} createOpen={createItemOpen} onCreateOpenChange={setCreateItemOpen} />
            </>
          )}
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          {tab === 'keys' && <SystemKeysTab />}
        </TabsContent>
      </Tabs>
    </>
  );
}
