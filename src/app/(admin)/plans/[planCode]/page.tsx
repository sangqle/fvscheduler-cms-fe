import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlanDetailScreen } from '@/components/admin/plans/PlanDetailScreen';
import Loading from '../../loading';

export const metadata: Metadata = { title: 'Chi tiết gói' };

export default async function PlanDetailPage({ params }: { params: Promise<{ planCode: string }> }) {
  const { planCode } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <PlanDetailScreen planCode={planCode} />
    </Suspense>
  );
}
