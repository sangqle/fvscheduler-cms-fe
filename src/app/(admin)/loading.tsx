import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/admin/shared/PageSkeleton';

/**
 * Khung xương mặc định của khu admin: mọi route đều có `loading.tsx` riêng bám sát bố cục của nó,
 * file này chỉ đỡ cho route mới chưa kịp có bản riêng.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton actions={1} />
      <div className="flex flex-col gap-4">
        <FilterBarSkeleton fields={3} />
        <TableSkeleton columns={['', '', '', '', '', '']} rows={8} />
      </div>
    </>
  );
}
