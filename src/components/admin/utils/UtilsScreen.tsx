'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { DecodeIdsCard } from '@/components/admin/utils/DecodeIdsCard';
import { FrameTool } from '@/components/admin/utils/frame/FrameTool';
import { UTILS_TABS, UTILS_TAB_LABELS, type UtilsTab } from '@/components/admin/utils/utilsTabs';
import { useUrlState } from '@/hooks/useUrlState';

const DESCRIPTION: Record<UtilsTab, string> = {
  decode: 'Giải mã id mờ thành khóa số của DB nền tảng, chạy thẳng trên API admin và không ghi gì vào hệ thống',
  frame:
    'Đặt ảnh chụp màn hình vào khung đúng tỉ lệ mạng xã hội để feed hiện trọn ảnh · chạy trong trình duyệt, ảnh không rời máy bạn',
};

/**
 * Hộp công cụ vận hành, hai tab trên URL (`?tab=`, mặc định `decode` thì bỏ khỏi URL). Không công cụ nào
 * ghi gì vào hệ thống. Tab "Khung ảnh" giữ ảnh trong store cấp module nên đổi tab không mất ảnh.
 */
export function UtilsScreen() {
  const { get, set } = useUrlState();
  const raw = get('tab');
  const tab: UtilsTab = UTILS_TABS.includes(raw as UtilsTab) ? (raw as UtilsTab) : 'decode';

  return (
    <>
      <PageHeader title="Tiện ích" description={DESCRIPTION[tab]} />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'decode' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="decode">{UTILS_TAB_LABELS.decode}</TabsTrigger>
          <TabsTrigger value="frame">{UTILS_TAB_LABELS.frame}</TabsTrigger>
        </TabsList>
        <TabsContent value="decode" className="mt-4">
          {tab === 'decode' && (
            <div className="flex flex-col gap-4">
              <DecodeIdsCard />
            </div>
          )}
        </TabsContent>
        <TabsContent value="frame" className="mt-4">
          {tab === 'frame' && <FrameTool />}
        </TabsContent>
      </Tabs>
    </>
  );
}
