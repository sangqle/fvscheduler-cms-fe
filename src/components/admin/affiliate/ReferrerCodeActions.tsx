'use client';

import * as React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useSetAffiliateCodeEnabled } from '@/hooks/useAdminAffiliate';
import { apiErrorMessage } from '@/lib/api/auth';
import { shortId } from '@/lib/utils';

/**
 * Khóa / mở lại mã giới thiệu của một tài khoản. Không endpoint nào trả trạng thái hiện tại của mã,
 * nên luôn hiện cả hai nút: cả hai đều idempotent, khóa một mã đã khóa không đổi gì.
 */
export function ReferrerCodeActions({ accountId, email }: { accountId: string; email: string | null }) {
  const mutation = useSetAffiliateCodeEnabled(accountId);
  const { showToast } = useToast();
  const [pending, setPending] = React.useState<'disable' | 'enable' | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const who = email ?? shortId(accountId);

  function open(action: 'disable' | 'enable') {
    setServerError(null);
    setPending(action);
  }

  function confirm() {
    if (!pending) return;
    const enabled = pending === 'enable';
    setServerError(null);
    mutation.mutate(enabled, {
      onSuccess: () => {
        showToast({
          title: enabled ? 'Đã mở lại mã giới thiệu' : 'Đã khóa mã giới thiệu',
          description: who,
          variant: 'success',
        });
        setPending(null);
      },
      onError: (e) => setServerError(apiErrorMessage(e, 'Không thể đổi trạng thái mã. Vui lòng thử lại.')),
    });
  }

  const onOpenChange = (o: boolean) => {
    if (!o && !mutation.isPending) setPending(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => open('disable')}>
          <Lock className="size-3.5" />
          Khóa mã
        </Button>
        <Button variant="ghost" size="sm" onClick={() => open('enable')}>
          <LockOpen className="size-3.5" />
          Mở lại mã
        </Button>
      </div>

      <ConfirmDialog
        open={pending === 'disable'}
        onOpenChange={onOpenChange}
        variant="destructive"
        icon={Lock}
        title="Khóa mã giới thiệu?"
        description={
          <>
            Mã của <b>{who}</b> bị từ chối ngay ở bước thanh toán cho mọi đơn mới, và người này không gửi được yêu cầu rút
            tiền nữa, kể cả với số dư đã có. Hoa hồng đã ghi giữ nguyên: muốn hủy thì hủy từng dòng.
          </>
        }
        confirmLabel="Khóa mã"
        onConfirm={confirm}
        isPending={mutation.isPending}
      >
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={pending === 'enable'}
        onOpenChange={onOpenChange}
        variant="success"
        icon={LockOpen}
        title="Mở lại mã giới thiệu?"
        description={
          <>
            Mã của <b>{who}</b> dùng lại được cho đơn mới và người này rút tiền được trở lại. Các dòng hoa hồng đã ghi VOIDED
            trong lúc khóa không tự khôi phục.
          </>
        }
        confirmLabel="Mở lại mã"
        onConfirm={confirm}
        isPending={mutation.isPending}
      >
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
}
