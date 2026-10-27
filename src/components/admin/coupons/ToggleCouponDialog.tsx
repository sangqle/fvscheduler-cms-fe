'use client';

import * as React from 'react';
import { Power, PowerOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useUpdateCoupon } from '@/hooks/useAdminCoupons';
import { apiErrorMessage } from '@/lib/api/auth';
import { couponToUpdateInput } from '@/lib/admin/coupons';
import { COUPON_STATE } from '@/lib/admin/labels';
import { ApiError } from '@/types/api';
import type { AdminCoupon } from '@/types/admin';

/**
 * Tắt / bật mã: một `PUT` gửi lại nguyên mã đang lưu với `active` đảo lại, vì PUT thay mọi trường.
 * Tắt không đụng tới đơn đã tạo: đơn đang chờ chuyển khoản giữ giá và vẫn thanh toán được.
 */
export function ToggleCouponDialog({
  coupon,
  open,
  onOpenChange,
}: {
  coupon: AdminCoupon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showToast } = useToast();
  const update = useUpdateCoupon();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const turningOff = coupon.active;

  React.useEffect(() => {
    if (open) setServerError(null);
  }, [open]);

  function confirm() {
    setServerError(null);
    update.mutate(
      { code: coupon.code, input: couponToUpdateInput(coupon, { active: !coupon.active }) },
      {
        onSuccess: (saved) => {
          showToast(
            turningOff
              ? {
                  title: `Đã tắt mã ${saved.code}`,
                  description: 'Đơn đã tạo kèm mã vẫn giữ giá và vẫn thanh toán được.',
                  variant: 'success',
                }
              : {
                  title: `Đã bật mã ${saved.code}`,
                  description: `${saved.state} · ${COUPON_STATE[saved.state].hint}`,
                  variant: saved.state === 'ACTIVE' ? 'success' : 'warning',
                },
          );
          onOpenChange(false);
        },
        onError: (e) => {
          const message = apiErrorMessage(e, `Không ${turningOff ? 'tắt' : 'bật'} được mã. Vui lòng thử lại.`);
          setServerError(
            e instanceof ApiError && e.status === 404
              ? `Mã này không còn tồn tại, có thể đã bị xóa ở nơi khác (${message}).`
              : message,
          );
        },
      },
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !update.isPending && onOpenChange(o)}
      variant={turningOff ? 'warning' : 'success'}
      icon={turningOff ? PowerOff : Power}
      title={turningOff ? `Tắt mã ${coupon.code}?` : `Bật mã ${coupon.code}?`}
      description={
        turningOff
          ? 'Checkout mới không dùng được mã nữa. Đơn đã tạo kèm mã vẫn giữ giá và vẫn thanh toán được: QR khách đang cầm không bị vô hiệu.'
          : 'Khách nhập được mã trở lại cho đơn mới, trong khung hiệu lực và số lượt còn lại của mã.'
      }
      confirmLabel={turningOff ? 'Tắt mã' : 'Bật mã'}
      onConfirm={confirm}
      isPending={update.isPending}
    >
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
    </ConfirmDialog>
  );
}
