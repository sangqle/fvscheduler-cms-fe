'use client';

import * as React from 'react';
import { Braces, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { CampaignTable } from '@/components/admin/mail/CampaignTable';
import { CreateCampaignDialog } from '@/components/admin/mail/CreateCampaignDialog';
import {
  CampaignFilters,
  MessageFilters,
  TemplateFilters,
  TemplateSortControl,
  parseActiveFilter,
  parseCampaignStatus,
  parseCategory,
  parseMessageSort,
  parseMessageStatus,
  parseTemplateSort,
  type CampaignFilterValues,
  type MessageFilterValues,
  type TemplateFilterValues,
} from '@/components/admin/mail/MailFilters';
import { MessageTable } from '@/components/admin/mail/MessageTable';
import { TemplateFormDialog } from '@/components/admin/mail/TemplateFormDialog';
import { TemplateTable } from '@/components/admin/mail/TemplateTable';
import { VariableCatalogDialog } from '@/components/admin/mail/VariableCatalogDialog';
import { useMailCampaigns, useMailTemplates } from '@/hooks/useAdminMail';
import { useUrlState } from '@/hooks/useUrlState';

const TABS = ['templates', 'campaigns', 'messages'] as const;
type Tab = (typeof TABS)[number];

const DESCRIPTION: Record<Tab, string> = {
  templates: 'Lưu template là sinh version mới, hai replica nhận ngay, không cần restart',
  campaigns: 'Chiến dịch ghim version lúc tạo, sửa template sau đó không đổi nội dung đang gửi',
  messages: 'Ai đã nhận mail gì, lúc nào, lỗi gì · lọc email là khớp chính xác cả địa chỉ',
};

/**
 * Số chiến dịch chỉ mount khi tab đang mở: dùng lại đúng trang đầu `CampaignTable` hỏi nên
 * không phát sinh request chỉ để hiện badge.
 */
function CampaignCount() {
  const { data } = useMailCampaigns(0, 20);
  return data ? <TabsCount>{data.totalElements}</TabsCount> : null;
}

/**
 * CMS-10: vỏ màn Email hệ thống. Ba tab và **toàn bộ bộ lọc** sống trên URL (`?tab=`, mặc định
 * `templates` thì bỏ khỏi URL), cùng khuôn `PlanCatalogScreen`: màn cha giữ giá trị lọc, hàng lọc
 * là một component riêng đặt trên bảng, còn bảng chỉ nhận `values`. Khóa URL tách theo tab
 * (`q`/`category`/`active`/`sort` cho template, `cStatus` cho chiến dịch, `m*` cho nhật ký) để
 * chuyển tab không làm mất bộ lọc của tab kia.
 */
export function MailScreen() {
  const { get, set } = useUrlState();
  const tab: Tab = TABS.includes(get('tab') as Tab) ? (get('tab') as Tab) : 'templates';

  const [createTemplateOpen, setCreateTemplateOpen] = React.useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = React.useState(false);
  const [variablesOpen, setVariablesOpen] = React.useState(false);

  const templateValues: TemplateFilterValues = {
    q: get('q'),
    category: parseCategory(get('category')),
    active: parseActiveFilter(get('active')),
    sort: parseTemplateSort(get('sort')),
  };
  const campaignValues: CampaignFilterValues = { status: parseCampaignStatus(get('cStatus')) };
  const messageValues: MessageFilterValues = {
    campaignCode: get('mCode'),
    status: parseMessageStatus(get('mStatus')),
    email: get('mEmail'),
    sort: parseMessageSort(get('mSort')),
  };

  /** Chỉ chạm vào khóa có trong `patch`; sắp xếp mặc định thì bỏ khỏi URL cho gọn. */
  const onTemplateChange = React.useCallback(
    (patch: Partial<TemplateFilterValues>) => {
      const next: Record<string, string | undefined> = {};
      if ('q' in patch) next.q = patch.q;
      if ('category' in patch) next.category = patch.category;
      if ('active' in patch) next.active = patch.active;
      if ('sort' in patch) next.sort = patch.sort === 'code' ? undefined : patch.sort;
      set(next);
    },
    [set],
  );
  const clearTemplateFilters = React.useCallback(
    () => set({ q: undefined, category: undefined, active: undefined }),
    [set],
  );

  const onCampaignChange = React.useCallback(
    (patch: Partial<CampaignFilterValues>) => set({ cStatus: patch.status }),
    [set],
  );
  const clearCampaignFilters = React.useCallback(() => set({ cStatus: undefined }), [set]);

  const onMessageChange = React.useCallback(
    (patch: Partial<MessageFilterValues>) => {
      const next: Record<string, string | undefined> = {};
      if ('campaignCode' in patch) next.mCode = patch.campaignCode;
      if ('status' in patch) next.mStatus = patch.status;
      if ('email' in patch) next.mEmail = patch.email;
      if ('sort' in patch) next.mSort = patch.sort === 'createdAt,desc' ? undefined : patch.sort;
      set(next);
    },
    [set],
  );
  const clearMessageFilters = React.useCallback(
    () => set({ mCode: undefined, mStatus: undefined, mEmail: undefined }),
    [set],
  );

  // Cùng query key với `TemplateTable` nên badge và ghi chú đếm dùng chung một lượt tải, không
  // phát sinh request chỉ vì con số.
  const templates = useMailTemplates({
    category: templateValues.category,
    active: templateValues.active === undefined ? undefined : templateValues.active === 'true',
    sort: templateValues.sort,
  });
  const loadedTemplates = templates.data?.content;
  const templateCounts = loadedTemplates
    ? {
        active: loadedTemplates.filter((t) => t.active).length,
        partial: loadedTemplates.filter((t) => t.category === 'PARTIAL').length,
        off: loadedTemplates.filter((t) => !t.active).length,
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="Email hệ thống"
        description={DESCRIPTION[tab]}
        actions={
          <>
            {tab === 'templates' && (
              <TemplateSortControl
                value={templateValues.sort}
                onChange={(sort) => onTemplateChange({ sort })}
              />
            )}
            <Button variant="outline" onClick={() => setVariablesOpen(true)}>
              <Braces className="size-4" />
              Catalog biến
            </Button>
            {tab === 'templates' && (
              <Button onClick={() => setCreateTemplateOpen(true)}>
                <Plus className="size-4" />
                Tạo template
              </Button>
            )}
            {tab === 'campaigns' && (
              <Button onClick={() => setCreateCampaignOpen(true)}>
                <Plus className="size-4" />
                Tạo chiến dịch
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'templates' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="templates">
            Template
            {loadedTemplates && <TabsCount>{loadedTemplates.length}</TabsCount>}
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            Chiến dịch
            {tab === 'campaigns' && <CampaignCount />}
          </TabsTrigger>
          <TabsTrigger value="messages">Nhật ký gửi</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-4 flex flex-col gap-4">
          <TemplateFilters
            values={templateValues}
            onChange={onTemplateChange}
            onClear={clearTemplateFilters}
            counts={templateCounts}
          />
          <TemplateTable
            values={templateValues}
            onCreate={() => setCreateTemplateOpen(true)}
            onClearFilters={clearTemplateFilters}
          />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4 flex flex-col gap-4">
          {tab === 'campaigns' && (
            <>
              <CampaignFilters values={campaignValues} onChange={onCampaignChange} />
              <CampaignTable
                values={campaignValues}
                onCreate={() => setCreateCampaignOpen(true)}
                onClearFilters={clearCampaignFilters}
              />
            </>
          )}
        </TabsContent>
        <TabsContent value="messages" className="mt-4 flex flex-col gap-4">
          {tab === 'messages' && (
            <>
              <MessageFilters
                values={messageValues}
                onChange={onMessageChange}
                onClear={clearMessageFilters}
              />
              <MessageTable values={messageValues} onClearFilters={clearMessageFilters} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <TemplateFormDialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen} />
      <CreateCampaignDialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen} />
      <VariableCatalogDialog open={variablesOpen} onOpenChange={setVariablesOpen} />
    </>
  );
}
