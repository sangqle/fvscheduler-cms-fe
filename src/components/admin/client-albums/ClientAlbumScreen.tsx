'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import {
  CLIENT_ALBUM_TABS,
  CLIENT_ALBUM_TAB_LABELS,
  type ClientAlbumTab,
} from '@/components/admin/client-albums/clientAlbumTabs';
import { MonthlyTab } from '@/components/admin/client-albums/MonthlyTab';
import { StorageTab, cachedStorageRun } from '@/components/admin/client-albums/StorageTab';
import type { StorageRun } from '@/components/admin/client-albums/storageFilters';
import { useUrlState } from '@/hooks/useUrlState';

const DESCRIPTION: Record<ClientAlbumTab, string> = {
  monthly:
    'Số album khách tạo mỗi tháng và workspace nào đã tạo · đếm theo lượt tạo, nên album đã xóa về sau vẫn nằm trong tháng nó được tạo',
  storage:
    'Dung lượng ảnh gốc của album còn sống, tạo trong một khoảng ngày · chỉ tính khi bấm Tính dung lượng, vì mỗi lần tính phải quét toàn bộ ảnh của các album',
};

/**
 * Vỏ màn Album khách: hai tab trên URL (`?tab=`, mặc định `monthly` thì bỏ khỏi URL). Mỗi tab tự giữ bộ
 * lọc và bảng của nó, khóa URL xem `clientAlbumTabs.ts`.
 *
 * Màn này không phải một danh sách thường, vì hai lý do. Một, tab "Theo tháng" đếm SỰ KIỆN TẠO (album tạo
 * rồi xóa vẫn tính) trong khi hạn mức hằng tháng của workspace và danh sách album chỉ đếm album CÒN SỐNG, nên
 * hai con số cùng tên có thể khác nhau và màn phải nói rõ. Hai, tab "Dung lượng" gọi route đắt nhất, và chỉ
 * một lần bấm nút mới được gọi nó: tab chỉ mount khi được chọn để mở màn không bao giờ kéo nó chạy.
 *
 * Số liệu do framevis-drive tính nên mỗi thẻ, bảng và khung có trạng thái lỗi riêng: một lần 503 chỉ làm hỏng
 * đúng chỗ đó, trang và tab kia vẫn chạy.
 */
export function ClientAlbumScreen() {
  const { get, set } = useUrlState();
  const rawTab = get('tab');
  const tab: ClientAlbumTab = CLIENT_ALBUM_TABS.includes(rawTab as ClientAlbumTab) ? (rawTab as ClientAlbumTab) : 'monthly';
  const [monthlyLabel, storageLabel] = CLIENT_ALBUM_TAB_LABELS;

  // Lượt "Tính dung lượng" gần nhất. Giữ ở đây chứ không ở `StorageTab` để kết quả sống sót qua việc đổi tab.
  // Khởi đầu lấy từ cache nếu bộ lọc trên URL khớp một kết quả đã tính, để Back từ trang chi tiết workspace
  // (bấm một dòng của bảng dung lượng) thấy lại kết quả thay vì phải quét lại. Chỉ đọc cache, không gọi API.
  const queryClient = useQueryClient();
  const [storageRun, setStorageRun] = React.useState<StorageRun | null>(() => cachedStorageRun(queryClient, get));

  return (
    <>
      <PageHeader title="Album khách" description={DESCRIPTION[tab]} />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'monthly' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="monthly">{monthlyLabel}</TabsTrigger>
          <TabsTrigger value="storage">{storageLabel}</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-4">
          {tab === 'monthly' && <MonthlyTab />}
        </TabsContent>
        <TabsContent value="storage" className="mt-4">
          {tab === 'storage' && <StorageTab run={storageRun} onRun={setStorageRun} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
