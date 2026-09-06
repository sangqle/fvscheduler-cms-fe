import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderListScreen } from '@/components/admin/orders/OrderListScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Đơn hàng' };

export default function OrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderListScreen />
    </Suspense>
  );
}
