'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
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
import { useToast } from '@/components/ui/ToastProvider';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { affiliateKeys, useVoidCommission } from '@/hooks/useAdminAffiliate';
import { billingPeriodLabel, formatBasisPoints } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency, shortId } from '@/lib/utils';
import { ApiError } from '@/types/api';
import type { AdminAffiliateCommissionRow } from '@/types/admin';

/**
 * Hủy một dòng hoa hồng (§3.11): `EARNED` → `VOIDED`, một chiều. Backend trả 409 với ba câu cố định
 * (dòng đã nằm trong yêu cầu PAID, trong yêu cầu đang chờ, hoặc đã hủy rồi); câu đó hiện nguyên văn
 * trong dialog và bảng tải lại, vì 409 nghĩa là dòng trên màn đã cũ so với DB.
 */
export function VoidCommissionDialog({
  commission,
  open,
  onOpenChange,
}: {
  commission: AdminAffiliateCommissionRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const voidCommission = useVoidCommission(commission.id);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [reason, setReason] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<{ message: string; stale: boolean } | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setSubmitted(false);
      setServerError(null);
    }
  }, [open]);

  const who = commission.referrerEmail ?? shortId(commission.referrerAccountId);
  const reasonError = validateNote(reason, 'Lý do');

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (reasonError) return;
    voidCommission.mutate(
      { reason: reason.trim() },
      {
        onSuccess: () => {
          showToast({
            title: 'Đã hủy hoa hồng',
            description: `${commission.customerDisplayName} · ${formatCurrency(commission.commissionAmount)} · ${who}`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (e) => {
          const stale = e instanceof ApiError && e.status === 409;
          if (stale) void qc.invalidateQueries({ queryKey: affiliateKeys.commissions });
          setServerError({ message: apiErrorMessage(e, 'Không thể hủy hoa hồng. Vui lòng thử lại.'), stale });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !voidCommission.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <DialogIcon tone="destructive">
            <Ban />
          </DialogIcon>
          <div>
            <DialogTitle>Hủy hoa hồng</DialogTitle>
            <DialogDescription>
              {commission.customerDisplayName} · <span className="font-mono">{commission.planCode}</span> ·{' '}
              {billingPeriodLabel(commission.billingPeriod)} ·{' '}
              <span className="font-mono font-semibold text-foreground">{formatCurrency(commission.commissionAmount)}</span> (
              {formatBasisPoints(commission.commissionRateBp)} của {formatCurrency(commission.paidAmount)}) · {who}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertDescription>
              Hủy là thao tác một chiều: dòng chuyển VOIDED, không khôi phục được và thôi tính vào số dư của <b>{who}</b>.
              Hệ thống không bao giờ trừ ngược số dư, nên hoa hồng đã chuyển khoản ở các yêu cầu PAID trước đó phải thu hồi
              ngoài hệ thống.
            </AlertDescription>
          </Alert>
          {serverError && (
            <Alert variant="destructive">
              <AlertTitle>Không thể hủy hoa hồng</AlertTitle>
              <AlertDescription>
                {serverError.message}
                {serverError.stale && <p>Bảng đã tải lại trạng thái mới nhất của dòng này.</p>}
              </AlertDescription>
            </Alert>
          )}
          <NoteField
            id="void-commission-reason"
            label="Lý do hủy (bắt buộc)"
            value={reason}
            onChange={setReason}
            placeholder="Khách hủy gói trong tuần đầu, đã hoàn tiền thủ công"
            hint="Lưu vào voidReason cùng id admin. Chỉ admin thấy lý do, người giới thiệu chỉ thấy dòng đã hủy."
            error={submitted ? reasonError : undefined}
          />
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={voidCommission.isPending} autoFocus>
            Đóng
          </Button>
          <Button variant="destructive" onClick={submit} disabled={voidCommission.isPending}>
            {voidCommission.isPending ? <Spinner size="sm" /> : <Ban className="size-4" />}
            Hủy hoa hồng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
