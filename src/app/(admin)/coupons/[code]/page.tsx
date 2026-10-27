import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CouponDetailScreen } from '@/components/admin/coupons/CouponDetailScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Chi tiết mã giảm giá' };

export default async function CouponDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <CouponDetailScreen code={code} />
    </Suspense>
  );
}
