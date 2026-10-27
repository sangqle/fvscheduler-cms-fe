'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { KeyValue, KeyValueList } from '@/components/admin/shared/KeyValue';
import { ScopeList, UsageMeter, validitySentence } from '@/components/admin/coupons/couponDisplay';
import { couponPeriodLabel } from '@/lib/admin/labels';
import type { AdminCoupon, AdminPlan } from '@/types/admin';

/** Cấu hình đang lưu của một mã, chỉ đọc; sửa đi qua `CouponFormDialog`. */
export function CouponConfigCard({ coupon, plans }: { coupon: AdminCoupon; plans: AdminPlan[] | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle size="md">Cấu hình</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 lg:grid-cols-2">
          <KeyValueList>
            <KeyValue label="Mức giảm">
              <span className="font-mono font-semibold">{coupon.percentOff}%</span>{' '}
              <span className="text-xs text-muted-foreground">trên giá bán của gói</span>
            </KeyValue>
            <KeyValue label="Gói áp dụng">
              <ScopeList planCodes={coupon.planCodes} plans={plans} />
            </KeyValue>
            <KeyValue label="Kỳ thanh toán">{couponPeriodLabel(coupon.billingPeriod)}</KeyValue>
            <KeyValue label="Đối tượng">
              {coupon.firstPurchaseOnly ? 'Chỉ workspace mua lần đầu' : 'Mọi workspace'}
            </KeyValue>
          </KeyValueList>
          <KeyValueList>
            <KeyValue label="Hiệu lực">
              {validitySentence(coupon)}
              {(coupon.startsAt || coupon.endsAt) && (
                <span className="text-xs text-muted-foreground"> · giờ Việt Nam</span>
              )}
            </KeyValue>
            <KeyValue label="Tổng lượt">
              {/* `dd` co theo nội dung, nên thước cần bề ngang riêng chứ không ăn theo dòng chữ */}
              <span className="flex w-56 max-w-full flex-col gap-1.5">
                <span>
                  {coupon.maxRedemptions === null ? 'Không giới hạn' : `${coupon.maxRedemptions} workspace`}
                </span>
                <UsageMeter coupon={coupon} />
              </span>
            </KeyValue>
            <KeyValue label="Công tắc">{coupon.active ? 'Đang bật' : 'Đã tắt'}</KeyValue>
            <KeyValue label="Ghi chú nội bộ">
              {coupon.note ? (
                <span className="whitespace-pre-line">{coupon.note}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </KeyValue>
          </KeyValueList>
        </div>
      </CardContent>
    </Card>
  );
}
