import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CouponListScreen } from '@/components/admin/coupons/CouponListScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Mã giảm giá' };

/** Mã giảm giá gói đăng ký: danh sách, lọc trạng thái, tìm theo đầu mã, tạo mã mới. */
export default function CouponsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CouponListScreen />
    </Suspense>
  );
}
