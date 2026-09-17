import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AffiliateScreen } from '@/components/admin/affiliate/AffiliateScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Tiếp thị liên kết' };

/** Duyệt yêu cầu rút tiền, soát hoa hồng và chỉnh tỷ lệ theo gói của `/api/admin/affiliate/**`. */
export default function AffiliatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AffiliateScreen />
    </Suspense>
  );
}
