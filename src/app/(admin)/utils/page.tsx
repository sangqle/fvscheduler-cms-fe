import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UtilsScreen } from '@/components/admin/utils/UtilsScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Tiện ích' };

/**
 * Hộp công cụ vận hành. Bọc `Suspense` vì màn đọc `?tab=` qua `useSearchParams`. Chỉ `tab` lên URL:
 * id mờ của tab giải mã vẫn chỉ đi trong body, không bao giờ `?ids=`.
 */
export default function UtilsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UtilsScreen />
    </Suspense>
  );
}
