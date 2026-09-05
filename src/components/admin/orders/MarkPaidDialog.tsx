'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/ToastProvider';
import { DateTimeField, fromDateTimeLocal, toDateTimeLocal } from '@/components/admin/shared/DateTimeField';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { useMarkPaid } from '@/hooks/useAdminOrders';
import { BILLING_PERIOD } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency } from '@/lib/utils';
import type { AdminOrderDetail } from '@/types/admin';

const REFERENCE_MAX = 120;

/** CMS-08 Mark paid: kích hoạt gói ngay trong cùng transaction, nguồn SEPAY (ADM-RULE-010). */
export function MarkPaidDialog({ order, open, onOpenChange }: { order: AdminOrderDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const markPaid = useMarkPaid(order.orderCode);
  const { showToast } = useToast();
  const [note, setNote] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [paidAt, setPaidAt] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNote('');
      setReference('');
      setPaidAt('');
      setSubmitted(false);
      setServerError(null);
    }
  }, [open]);

  const paidDate = fromDateTimeLocal(paidAt);
  const errors = {
    note: validateNote(note),
    reference: reference.length > REFERENCE_MAX ? `Tối đa ${REFERENCE_MAX} ký tự.` : undefined,
    paidAt: paidAt && !paidDate ? 'Thời điểm không hợp lệ.' : paidDate && paidDate.getTime() > Date.now() ? 'Không được ở tương lai.' : undefined,
  };
  const invalid = Boolean(errors.note || errors.reference || errors.paidAt);

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    markPaid.mutate(
      {
        note: note.trim(),
        reference: reference.trim() || undefined,
        paidAt: paidDate ? paidDate.toISOString() : undefined,
      },
      {
        onSuccess: (r) => {
          showToast({
            title: 'Đã xác nhận thanh toán, gói đã được kích hoạt',
            description: `${order.orderCode} · ${order.workspace.name} → ${r.subscription.planName} · nguồn ${r.subscription.source}`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không thể xác nhận thanh toán. Vui lòng thử lại.')),
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
          <div>
            <DialogTitle>Xác nhận thanh toán thủ công</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{order.orderCode}</span> · {order.workspace.name} · {order.planName} · {BILLING_PERIOD[order.billingPeriod]} ·{' '}
              {formatCurrency(order.amount)}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertDescription>
              Xác nhận thanh toán sẽ kích hoạt ngay gói <b>{order.planName}</b> cho workspace <b>{order.workspace.name}</b>. Thao tác này không
              thể hoàn tác qua CMS. Gói mới mang nguồn SEPAY, cùng đường kích hoạt với webhook ngân hàng.
            </AlertDescription>
          </Alert>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>Không thể xác nhận thanh toán: {serverError}</AlertDescription>
            </Alert>
          )}
          <NoteField
            id="markpaid-note"
            value={note}
            onChange={setNote}
            placeholder="Khách chuyển khoản trễ, đối chiếu sao kê MB ngày 04/09/2026"
            hint="Ghi lại vì sao xác nhận tay; lưu vào rawPayload.manualMarkPaid cùng adminAccountId."
            error={submitted ? errors.note : undefined}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="markpaid-ref">Mã tham chiếu ngân hàng (tùy chọn)</Label>
            <Input id="markpaid-ref" value={reference} maxLength={REFERENCE_MAX} onChange={(e) => setReference(e.target.value)} placeholder="FT26090412345" error={!!errors.reference} />
            <p className="text-xs text-muted-foreground">Tối đa {REFERENCE_MAX} ký tự</p>
          </div>
          <DateTimeField
            id="markpaid-paidat"
            label="Thời điểm thanh toán (tùy chọn)"
            value={paidAt}
            onChange={setPaidAt}
            max={toDateTimeLocal(new Date())}
            hint="Mặc định là bây giờ · không được ở tương lai"
            error={submitted ? errors.paidAt : undefined}
          />
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={markPaid.isPending} autoFocus>
            Hủy
          </Button>
          <Button variant="success" onClick={submit} disabled={markPaid.isPending}>
            {markPaid.isPending ? <Spinner size="sm" /> : <CheckCircle2 className="size-4" />}
            Xác nhận thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
