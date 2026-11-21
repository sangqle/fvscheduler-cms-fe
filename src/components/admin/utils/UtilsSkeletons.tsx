import { CardSkeleton, PageHeaderSkeleton, TabsListSkeleton } from '@/components/admin/shared/PageSkeleton';
import { UTILS_TAB_LABELS } from '@/components/admin/utils/utilsTabs';

/**
 * `/utils` lúc tải: tên màn và nhãn tab là chữ thật, rồi khung của tab mặc định "Giải mã id". Dùng chung
 * cho `loading.tsx` và `Suspense` của `page.tsx`.
 */
export function UtilsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Tiện ích" actions={0} />
      <TabsListSkeleton labels={[UTILS_TAB_LABELS.decode, UTILS_TAB_LABELS.frame]} />
      <div className="mt-4 flex flex-col gap-4">
        <CardSkeleton lines={5} />
      </div>
    </>
  );
}
