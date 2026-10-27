'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CircleX, PowerOff, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { couponKeys, useDeleteCoupon } from '@/hooks/useAdminCoupons';
import { apiErrorMessage } from '@/lib/api/auth';
import { ApiError } from '@/types/api';
import type { AdminCoupon } from '@/types/admin';

/**
 * Xóa cứng một mã (DELETE /api/admin/coupons/{code}). Backend chỉ cho xóa mã chưa workspace nào từng
 * giữ chỗ hay dùng: bất kỳ dòng sổ lượt dùng nào, kể cả lượt giữ chỗ đã bỏ dở, đều chặn (409). Lối ra
 * lúc đó là tắt mã, cùng nguyên tắc "tắt thay vì xóa" của catalog gói.
 */
export function DeleteCouponDialog({
  coupon,
  ledgerCount,
  open,
  onOpenChange,
  onRetire,
}: {
  coupon: AdminCoupon;
  /** Số dòng sổ lượt dùng (`totalElements`, mọi trạng thái); undefined khi sổ chưa tải xong. */
  ledgerCount: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mở hộp tắt mã thay cho xóa. */
  onRetire: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const remove = useDeleteCoupon();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setServerError(null);
    setConflict(false);
  }, [open]);

  const used = (ledgerCount ?? 0) > 0;

  function submit() {
    setServerError(null);
    remove.mutate(coupon.code, {
      onSuccess: () => {
        showToast({ title: `Đã xóa mã ${coupon.code}`, variant: 'success' });
        onOpenChange(false);
        router.replace('/coupons');
      },
      onError: (e) => {
        const message = apiErrorMessage(e, 'Không xóa được mã. Vui lòng thử lại.');
        setServerError(
          e instanceof ApiError && e.status === 404
            ? `Mã này không còn tồn tại, có thể đã bị xóa ở nơi khác (${message}).`
            : message,
        );
        if (e instanceof ApiError && e.status === 409) {
          setConflict(true);
          void qc.invalidateQueries({ queryKey: couponKeys.detail(coupon.code) });
          void qc.invalidateQueries({ queryKey: couponKeys.redemptions(coupon.code) });
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !remove.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="destructive">
            <Trash2 />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Xóa mã {coupon.code}</DialogTitle>
            <DialogDescription>Chỉ xóa được mã chưa workspace nào từng giữ chỗ hay dùng</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <CircleX className="size-4" />
              <AlertTitle>Backend từ chối</AlertTitle>
              <AlertDescription className="font-mono text-xs">{serverError}</AlertDescription>
            </Alert>
          )}
          {used && !serverError && (
            <Alert variant="warning">
              <AlertDescription>
                Sổ lượt dùng có {ledgerCount} workspace, tính cả lượt giữ chỗ đã bỏ dở, nên backend sẽ không cho xóa.
              </AlertDescription>
            </Alert>
          )}
          <Text variant="body-sm" muted>
            {used || conflict
              ? coupon.active
                ? 'Muốn khách không dùng mã nữa mà vẫn giữ lịch sử thì tắt mã. Đơn đã tạo kèm mã vẫn thanh toán được.'
                : 'Mã đã tắt sẵn, khách không dùng được nữa; sổ lượt dùng được giữ làm lịch sử.'
              : 'Mã cùng phạm vi gói của nó bị xóa hẳn. Thao tác không hoàn tác được.'}
          </Text>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Đóng
          </Button>
          {(used || conflict) && coupon.active && (
            <Button variant="secondary" onClick={onRetire} disabled={remove.isPending}>
              <PowerOff className="size-4" />
              Tắt mã thay vì xóa
            </Button>
          )}
          <Button variant="destructive" onClick={submit} disabled={used || conflict || remove.isPending}>
            {remove.isPending && <Spinner size="sm" />}
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
