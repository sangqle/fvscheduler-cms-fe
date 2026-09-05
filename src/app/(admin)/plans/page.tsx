import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { PlanTable } from '@/components/admin/plans/PlanTable';

export const metadata: Metadata = { title: 'Catalog gói' };

/** CMS-07: catalog chỉ đọc, gồm cả gói đã ngừng bán (vẫn cấp tay được, mark-paid từ chối). */
export default function PlansPage() {
  return (
    <>
      <PageHeader
        title="Catalog gói"
        description="Sắp theo mã · gồm cả gói đã ngừng bán (vẫn cấp được bằng tay, nhưng mark-paid sẽ từ chối)"
        actions={<ReadOnlyHint>Chỉ đọc · thay đổi catalog đi qua migration / seed</ReadOnlyHint>}
      />
      <PlanTable />
    </>
  );
}
