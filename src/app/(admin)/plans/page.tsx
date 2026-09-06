import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlanCatalogScreen } from '@/components/admin/plans/PlanCatalogScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Catalog gói' };

/** CMS-07: catalog quản lý được: gói (ADM-FLOW-08), nhóm & item (ADM-FLOW-10), khóa hệ thống. */
export default function PlansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PlanCatalogScreen />
    </Suspense>
  );
}
