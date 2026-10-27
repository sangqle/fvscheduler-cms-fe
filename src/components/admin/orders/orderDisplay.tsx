import Link from 'next/link';
import { HandCoins, TicketPercent } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import type { AdminOrderRow } from '@/types/admin';

/**
 * Mã mà đơn đã dùng: mã giảm giá (bấm để mở trang của mã) hoặc mã giới thiệu, không bao giờ cả hai.
 * Icon cùng bộ với thanh điều hướng để hai loại không chỉ khác nhau ở màu. Không có mã thì không vẽ gì.
 */
export function OrderCodeChip({ order }: { order: Pick<AdminOrderRow, 'couponCode' | 'affiliateCode'> }) {
  if (order.couponCode) {
    return (
      <Badge variant="info-soft" size="sm" mono interactive asChild className="gap-1">
        <Link href={`/coupons/${order.couponCode}`} onClick={(e) => e.stopPropagation()} title="Mã giảm giá">
          <TicketPercent aria-hidden className="size-3" />
          <span className="sr-only">Mã giảm giá </span>
          {order.couponCode}
        </Link>
      </Badge>
    );
  }
  if (order.affiliateCode) {
    return (
      <Badge variant="outline" size="sm" mono title="Mã giới thiệu" className="gap-1">
        <HandCoins aria-hidden className="size-3" />
        <span className="sr-only">Mã giới thiệu </span>
        {order.affiliateCode}
      </Badge>
    );
  }
  return null;
}

/** Ô "Số tiền" của bảng đơn: số khách trả, dòng dưới là mã đã dùng và số đã giảm khi có. */
export function OrderAmountCell({ order }: { order: AdminOrderRow }) {
  const hasCode = !!(order.couponCode || order.affiliateCode);
  return (
    <span className="flex flex-col items-start gap-1">
      <span>{formatCurrency(order.amount)}</span>
      {hasCode && (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <OrderCodeChip order={order} />
          {order.discountAmount > 0 && (
            <span className="text-muted-foreground">−{formatCurrency(order.discountAmount)}</span>
          )}
        </span>
      )}
    </span>
  );
}
