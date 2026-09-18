'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Info } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { NOTE_MAX } from '@/components/admin/shared/NoteField';
import { affiliateKeys, useMarkPayoutPaid } from '@/hooks/useAdminAffiliate';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency, shortId } from '@/lib/utils';
import { ApiError } from '@/types/api';
import type { AdminAffiliatePayoutRow } from '@/types/admin';

const REFERENCE_MAX = 120;
/** Mốc có thể phải khấu trừ thuế TNCN trên tiền hoa hồng (doc affiliate §8), hệ thống không tính. */
const TAX_HINT_THRESHOLD = 2_000_000;

/**
 * Đánh dấu một yêu cầu `REQUESTED` là đã trả, **sau** khi admin đã tự chuyển khoản. Không hoàn tác
 * được, và các dòng hoa hồng yêu cầu này gom giữ `payoutId` vĩnh viễn nên không bao giờ hủy được nữa.
 * Cả mã giao dịch lẫn ghi chú đều tùy chọn; người giới thiệu thấy cả hai ở lịch sử rút tiền của họ.
 */
export function MarkPayoutPaidDialog({
  payout,
  open,
  onOpenChange,
  onDone,
  onConflict,
}: {
  payout: AdminAffiliatePayoutRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Nhận dòng backend trả về (`PAID`) để drawer hiện ngay trạng thái mới. */
  onDone: (row: AdminAffiliatePayoutRow) => void;
  /** 409: yêu cầu đã được xử lý ở nơi khác, drawer không còn tin ảnh chụp `REQUESTED` của nó. */
  onConflict: () => void;
}) {
  const markPaid = useMarkPayoutPaid(payout.id);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReference('');
      setNote('');
      setServerError(null);
    }
  }, [open]);

  function submit() {
    setServerError(null);
    markPaid.mutate(
      { reference: reference.trim() || undefined, note: note.trim() || undefined },
      {
        onSuccess: (row) => {
          showToast({
            title: 'Đã đánh dấu đã trả',
            description: `${formatCurrency(row.amount)} · ${row.referrerEmail ?? shortId(row.referrerAccountId)}${row.reference ? ` · ${row.reference}` : ''}`,
            variant: 'success',
          });
          onDone(row);
          onOpenChange(false);
        },
        onError: (e) => {
          setServerError(apiErrorMessage(e, 'Không thể đánh dấu đã trả. Vui lòng thử lại.'));
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
    <Dialog open={open} onOpenChange={(o) => !markPaid.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <DialogIcon tone="success">
            <CheckCircle2 />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Đánh dấu đã chuyển khoản</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-foreground">{formatCurrency(payout.amount)}</span> · {payout.bankName} ·{' '}
              <span className="font-mono">{payout.bankAccountNumber}</span> · {payout.bankAccountHolder}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertDescription>
              Chỉ đánh dấu <b>sau khi</b> đã chuyển khoản thật tới đúng tài khoản trên. Thao tác không hoàn tác được, và{' '}
              {payout.commissionCount} dòng hoa hồng trong yêu cầu này sẽ không bao giờ hủy được nữa.
            </AlertDescription>
          </Alert>
          {payout.amount >= TAX_HINT_THRESHOLD && (
            <Alert variant="info">
              <Info className="size-4" />
              <AlertDescription>
                Từ {formatCurrency(TAX_HINT_THRESHOLD)} có thể phải khấu trừ thuế thu nhập cá nhân trước khi chuyển. Hệ thống không tính
                và không ghi khoản khấu trừ nào: nếu có trừ, ghi rõ số đã trừ vào ghi chú.
              </AlertDescription>
            </Alert>
          )}
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>Không thể đánh dấu đã trả: {serverError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payout-paid-ref">Mã giao dịch ngân hàng (tùy chọn)</Label>
            <Input
              id="payout-paid-ref"
              value={reference}
              maxLength={REFERENCE_MAX}
              onChange={(e) => setReference(e.target.value)}
              placeholder="FT26091712345"
              disabled={markPaid.isPending}
            />
            <p className="text-xs text-muted-foreground">Tối đa {REFERENCE_MAX} ký tự · người giới thiệu thấy mã này ở lịch sử rút tiền</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payout-paid-note">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="payout-paid-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX}
              showCount
              rows={3}
              placeholder="Chuyển khoản Vietcombank 17/09, đã đối chiếu sao kê"
              disabled={markPaid.isPending}
            />
            <p className="text-xs text-muted-foreground">Người giới thiệu cũng thấy ghi chú này</p>
          </div>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={markPaid.isPending} autoFocus>
            Hủy
          </Button>
          <Button variant="success" onClick={submit} disabled={markPaid.isPending}>
            {markPaid.isPending ? <Spinner size="sm" /> : <CheckCircle2 className="size-4" />}
            Đánh dấu đã trả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
