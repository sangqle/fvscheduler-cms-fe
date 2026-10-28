import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClientAlbumScreen } from '@/components/admin/client-albums/ClientAlbumScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Album khách' };

/** Thống kê album khách: số album tạo mỗi tháng và dung lượng ảnh gốc, đọc từ framevis-drive qua `/api/admin/client-albums/**`. */
export default function ClientAlbumsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClientAlbumScreen />
    </Suspense>
  );
}
