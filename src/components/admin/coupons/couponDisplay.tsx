import * as React from 'react';
import { MeterBar } from '@/components/ui/MeterBar';
import { couponPeriodLabel } from '@/lib/admin/labels';
import {
  formatCouponEnd,
  formatCouponStart,
  overshoot,
  resolveScope,
  takenSlots,
} from '@/lib/admin/coupons';
import type { AdminCoupon, AdminPlan } from '@/types/admin';

/** Phạm vi gói của một dòng danh sách: tên gói (hoặc "Mọi gói đang bán"), dòng dưới là kỳ thanh toán. */
export function ScopeSummary({ coupon, plans }: { coupon: AdminCoupon; plans: AdminPlan[] | undefined }) {
  const entries = resolveScope(coupon.planCodes, plans);
  return (
    <span className="flex flex-col">
      <span>
        {entries.length === 0
          ? 'Mọi gói đang bán'
          : entries.map((e, i) => (
              <React.Fragment key={e.code}>
                {i > 0 && ', '}
                {e.plan ? (
                  e.plan.name
                ) : (
                  <span
                    className="font-mono text-xs text-muted-foreground"
                    title={e.missing ? 'Không còn trong catalog' : undefined}
                  >
                    {e.code}
                  </span>
                )}
              </React.Fragment>
            ))}
      </span>
      <span className="text-xs text-muted-foreground">{couponPeriodLabel(coupon.billingPeriod)}</span>
    </span>
  );
}

/**
 * Phạm vi gói ở trang chi tiết, mỗi gói một dòng. Gói đã bị xóa khỏi catalog hiện mã thô kèm chú
 * thích (backend không có cờ nào, FE tự đối chiếu `GET /api/admin/plans`).
 */
export function ScopeList({ planCodes, plans }: { planCodes: string[]; plans: AdminPlan[] | undefined }) {
  if (planCodes.length === 0) {
    return (
      <span>
        Mọi gói đang bán{' '}
        <span className="text-xs text-muted-foreground">· gồm cả gói mở bán sau này, không bao giờ gồm gói Free</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-1">
      {resolveScope(planCodes, plans).map((e) => (
        <span key={e.code} className="flex flex-wrap items-baseline gap-x-1.5">
          {e.plan && <span>{e.plan.name}</span>}
          <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
          {e.missing && <span className="text-xs text-warning-deep">· không còn trong catalog</span>}
          {e.plan && !e.plan.isActive && <span className="text-xs text-warning-deep">· ngừng bán</span>}
        </span>
      ))}
    </span>
  );
}

/** Khung hiệu lực theo giờ Việt Nam, mỗi mốc một dòng. */
export function ValidityText({ startsAt, endsAt }: Pick<AdminCoupon, 'startsAt' | 'endsAt'>) {
  if (!startsAt && !endsAt) return <span className="text-muted-foreground">Không thời hạn</span>;
  return (
    <span className="flex flex-col">
      {startsAt && <span>Từ {formatCouponStart(startsAt)}</span>}
      {endsAt && <span>Đến {formatCouponEnd(endsAt)}</span>}
    </span>
  );
}

/** Khung hiệu lực thành một câu, vd "Hiệu lực đến hết 31/01/2027", cho trang chi tiết. */
export function validitySentence({ startsAt, endsAt }: Pick<AdminCoupon, 'startsAt' | 'endsAt'>): string {
  if (startsAt && endsAt) return `Từ ${formatCouponStart(startsAt)} đến ${formatCouponEnd(endsAt)}`;
  if (startsAt) return `Từ ${formatCouponStart(startsAt)}, không có ngày kết thúc`;
  if (endsAt) return `Hiệu lực đến ${formatCouponEnd(endsAt)}`;
  return 'Không thời hạn';
}

/** "đã dùng / tối đa", dòng dưới là lượt đang giữ và số còn lại. Vượt trần hiện thẳng, không tô như lỗi. */
export function UsageSummary({ coupon }: { coupon: AdminCoupon }) {
  const over = overshoot(coupon);
  const parts = [
    `${coupon.heldCount} đang giữ`,
    coupon.remaining === null ? 'Không giới hạn' : `còn ${coupon.remaining}`,
  ];
  if (over > 0) parts.push(`vượt trần ${over}`);
  return (
    <span className="flex flex-col">
      <span className="font-mono text-xs font-semibold">
        {coupon.redeemedCount} / {coupon.maxRedemptions ?? '∞'}
      </span>
      <span className="text-xs text-muted-foreground">{parts.join(' · ')}</span>
    </span>
  );
}

/** Thước lượt dùng: đã dùng (xanh) rồi đang giữ (vàng) trên trần. Không giới hạn thì không có thước. */
export function UsageMeter({ coupon }: { coupon: AdminCoupon }) {
  if (coupon.maxRedemptions === null) return null;
  return (
    <MeterBar
      size="sm"
      max={Math.max(coupon.maxRedemptions, takenSlots(coupon))}
      segments={[
        { value: coupon.redeemedCount, className: 'bg-success' },
        { value: coupon.heldCount, className: 'bg-warning' },
      ]}
    />
  );
}
