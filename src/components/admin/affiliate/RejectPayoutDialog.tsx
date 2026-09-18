'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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
import { useToast } from '@/components/ui/ToastProvider';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { affiliateKeys, useRejectPayout } from '@/hooks/useAdminAffiliate';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency, shortId } from '@/lib/utils';
import { ApiError } from '@/types/api';
import type { AdminAffiliatePayoutRow } from '@/types/admin';

/**
 * Từ chối một yêu cầu `REQUESTED`: backend gỡ `payoutId` khỏi mọi dòng đã gom, số tiền trở lại
 * khả dụng và người giới thiệu gửi lại được ngay. Từ chối không phạt ai: nghi gian lận thì **khóa mã
 * trước** (chỉ mã bị khóa mới chặn yêu cầu mới), rồi từ chối, rồi hủy hoa hồng. Từ chối trước thì các
 * dòng vừa nhả có thể bị một yêu cầu mới gom lại ngay, và hủy chúng sẽ bị 409.
 */
export function RejectPayoutDialog({
  payout,
  open,
  onOpenChange,
  onDone,
  onConflict,
}: {
  payout: AdminAffiliatePayoutRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Nhận dòng backend trả về (`REJECTED`) để drawer hiện ngay trạng thái mới. */
  onDone: (row: AdminAffiliatePayoutRow) => void;
  /** 409: yêu cầu đã được xử lý ở nơi khác, drawer không còn tin ảnh chụp `REQUESTED` của nó. */
  onConflict: () => void;
}) {
  const reject = useRejectPayout(payout.id);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [reason, setReason] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setSubmitted(false);
      setServerError(null);
    }
  }, [open]);

  const error = validateNote(reason, 'Lý do');

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (error) return;
    reject.mutate(
      { reason: reason.trim() },
      {
        onSuccess: (row) => {
          showToast({
            title: 'Đã từ chối yêu cầu rút tiền',
            description: `${formatCurrency(row.amount)} · ${row.referrerEmail ?? shortId(row.referrerAccountId)} · ${row.commissionCount} dòng hoa hồng trở lại Khả dụng`,
            variant: 'success',
          });
          onDone(row);
          onOpenChange(false);
        },
        onError: (e) => {
          setServerError(apiErrorMessage(e, 'Không thể từ chối yêu cầu. Vui lòng thử lại.'));
          // 409: yêu cầu đã được xử lý ở nơi khác. Làm mới danh sách lẫn hoa hồng, và báo drawer tắt nút:
          // dưới bộ lọc REQUESTED dòng đó rời danh sách nên drawer không tự thấy trạng thái thật.
          if (e instanceof ApiError && e.status === 409) {
            void qc.invalidateQueries({ queryKey: affiliateKeys.payouts });
            void qc.invalidateQueries({ queryKey: affiliateKeys.commissions });
            onConflict();
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !reject.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <DialogIcon tone="destructive">
            <XCircle />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Từ chối yêu cầu rút tiền</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-foreground">{formatCurrency(payout.amount)}</span> ·{' '}
              {payout.referrerEmail ?? <span className="font-mono">{shortId(payout.referrerAccountId)}</span>} · {payout.bankName} ·{' '}
              <span className="font-mono">{payout.bankAccountNumber}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertDescription>
              {payout.commissionCount} dòng hoa hồng trong yêu cầu này trở lại <b>Khả dụng</b>, và người giới thiệu gửi được yêu cầu
              mới ngay. Nếu nghi gian lận: khóa mã giới thiệu trước (chặn yêu cầu mới), rồi mới từ chối, sau đó hủy các dòng đó ở
              tab Hoa hồng.
            </AlertDescription>
          </Alert>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>Không thể từ chối: {serverError}</AlertDescription>
            </Alert>
          )}
          <NoteField
            id="payout-reject-reason"
            label="Lý do từ chối (bắt buộc)"
            value={reason}
            onChange={setReason}
            placeholder="Tên chủ tài khoản không khớp, cần người giới thiệu cập nhật lại ngân hàng"
            hint="3 đến 400 ký tự · người giới thiệu thấy lý do này ở lịch sử rút tiền"
            error={submitted ? error : undefined}
          />
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reject.isPending} autoFocus>
            Hủy
          </Button>
          <Button variant="destructive" onClick={submit} disabled={reject.isPending}>
            {reject.isPending ? <Spinner size="sm" /> : <XCircle className="size-4" />}
            Từ chối yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
