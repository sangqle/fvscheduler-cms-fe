'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { AFFILIATE_TABS, AFFILIATE_TAB_LABELS, type AffiliateTab } from '@/components/admin/affiliate/affiliateTabs';
import { CommissionsTab } from '@/components/admin/affiliate/CommissionsTab';
import { PayoutsTab } from '@/components/admin/affiliate/PayoutsTab';
import { RatesTab } from '@/components/admin/affiliate/RatesTab';
import { useAffiliatePayouts, useAffiliateRates } from '@/hooks/useAdminAffiliate';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { useUrlState } from '@/hooks/useUrlState';

const DESCRIPTION: Record<AffiliateTab, string> = {
  payouts: 'Người giới thiệu rút trọn số dư khả dụng một lần · chuyển khoản tay tới đúng tài khoản trên yêu cầu rồi mới đánh dấu đã trả',
  commissions: 'Mỗi đơn mua đầu tiên có mã giới thiệu ghi một dòng hoa hồng · chỉ hủy được dòng chưa nằm trong yêu cầu rút nào',
  rates:
    'Hoa hồng cho người giới thiệu và chiết khấu cho khách theo từng gói · chiết khấu mới áp dụng cho đơn tạo sau khi sửa, hoa hồng mới áp dụng cho đơn thanh toán sau khi sửa',
};

/** Số yêu cầu đang chờ duyệt: trang 1 dòng chỉ để lấy `totalElements`. */
function RequestedCount() {
  const { data } = useAffiliatePayouts({ status: 'REQUESTED', page: 0, size: 1 });
  return data && data.totalElements > 0 ? <TabsCount>{data.totalElements}</TabsCount> : null;
}

/**
 * `RatesTab` chỉ gắn dialog khi đủ cả hai query và thay cả tab bằng `ErrorState` khi một query lỗi:
 * bấm lúc đó không có gì hiện ra, rồi dialog tự bật khi thử lại xong. Nên nút tắt tới khi dùng được.
 * Cùng query key với `RatesTab`, không gọi thêm request nào.
 */
function CreateRateButton({ onClick }: { onClick: () => void }) {
  const rates = useAffiliateRates();
  const plans = useAdminPlans();
  const ready = rates.data !== undefined && plans.data !== undefined && !rates.error && !plans.error;
  return (
    <Button onClick={onClick} disabled={!ready}>
      <Plus className="size-4" />
      Thêm tỷ lệ cho gói
    </Button>
  );
}

/**
 * Vỏ màn tiếp thị liên kết: ba tab trên URL (`?tab=`, mặc định `payouts` thì bỏ khỏi URL). Mỗi tab
 * tự giữ bộ lọc, bảng và dialog của nó, khóa URL xem `affiliateTabs.ts`.
 */
export function AffiliateScreen() {
  const { get, set } = useUrlState();
  const tab: AffiliateTab = AFFILIATE_TABS.includes(get('tab') as AffiliateTab) ? (get('tab') as AffiliateTab) : 'payouts';
  const [createRateOpen, setCreateRateOpen] = React.useState(false);
  const [payoutsLabel, commissionsLabel, ratesLabel] = AFFILIATE_TAB_LABELS;

  return (
    <>
      <PageHeader
        title="Tiếp thị liên kết"
        description={DESCRIPTION[tab]}
        actions={tab === 'rates' && <CreateRateButton onClick={() => setCreateRateOpen(true)} />}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setCreateRateOpen(false);
          set({ tab: v === 'payouts' ? undefined : v });
        }}
      >
        <TabsList>
          <TabsTrigger value="payouts">
            {payoutsLabel}
            <RequestedCount />
          </TabsTrigger>
          <TabsTrigger value="commissions">{commissionsLabel}</TabsTrigger>
          <TabsTrigger value="rates">{ratesLabel}</TabsTrigger>
        </TabsList>
        <TabsContent value="payouts" className="mt-4 flex flex-col gap-4">
          {tab === 'payouts' && <PayoutsTab />}
        </TabsContent>
        <TabsContent value="commissions" className="mt-4 flex flex-col gap-4">
          {tab === 'commissions' && <CommissionsTab />}
        </TabsContent>
        <TabsContent value="rates" className="mt-4 flex flex-col gap-4">
          {tab === 'rates' && <RatesTab createOpen={createRateOpen} onCreateOpenChange={setCreateRateOpen} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
