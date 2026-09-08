import type { Metadata } from 'next';
import { UtilsScreen } from '@/components/admin/utils/UtilsScreen';

export const metadata: Metadata = { title: 'Tiện ích' };

/**
 * Hộp công cụ vận hành. Không bọc `Suspense` như các route khác: màn này cố tình không giữ trạng
 * thái nào trên URL (id mờ chỉ đi trong body, không `?ids=`), nên không có `useSearchParams` để chờ.
 */
export default function UtilsPage() {
  return <UtilsScreen />;
}
