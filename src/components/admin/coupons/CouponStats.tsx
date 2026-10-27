'use client';

import { BadgePercent, Hourglass, TicketCheck, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { overshoot } from '@/lib/admin/coupons';
import { formatCurrency } from '@/lib/utils';
import type { AdminCoupon } from '@/types/admin';

/** Bốn con số của một mã: lượt đã dùng, lượt đang giữ, tổng đã giảm, tổng đã thu. */
export function CouponStats({ coupon }: { coupon: AdminCoupon }) {
  const over = overshoot(coupon);
  const usedSublabel =
    coupon.maxRedemptions === null
      ? 'Không giới hạn lượt'
      : over > 0
        ? `Vượt trần ${over}: có đơn thanh toán sau khi hết hạn giữ chỗ`
        : `Còn ${coupon.remaining ?? 0} lượt`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Đã dùng"
        value={
          coupon.maxRedemptions === null
            ? coupon.redeemedCount
            : `${coupon.redeemedCount} / ${coupon.maxRedemptions}`
        }
        sublabel={usedSublabel}
        icon={<TicketCheck />}
        intent="success"
      />
      <StatCard
        label="Đang giữ chỗ"
        value={coupon.heldCount}
        sublabel="Checkout đang chờ chuyển khoản"
        icon={<Hourglass />}
        intent="warning"
      />
      <StatCard
        label="Tổng đã giảm"
        value={formatCurrency(coupon.totalDiscount)}
        sublabel="Trên các lượt đã thanh toán"
        icon={<BadgePercent />}
        intent="info"
      />
      <StatCard
        label="Tổng đã thu"
        value={formatCurrency(coupon.totalPaid)}
        sublabel="Khách thực trả"
        icon={<Wallet />}
        intent="primary"
      />
    </div>
  );
}
