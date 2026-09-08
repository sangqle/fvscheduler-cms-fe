import { CardSkeleton, PageHeaderSkeleton } from '@/components/admin/shared/PageSkeleton';

/** Màn tiện ích lúc tải: tiêu đề thật rồi khung của thẻ công cụ đầu tiên. */
export function UtilsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Tiện ích" actions={0} />
      <div className="flex flex-col gap-4">
        <CardSkeleton lines={5} />
      </div>
    </>
  );
}
