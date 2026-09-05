'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
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
import { Label } from '@/components/ui/Label';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/ToastProvider';
import { DateTimeField, fromDateTimeLocal, toDateTimeLocal } from '@/components/admin/shared/DateTimeField';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { useGrantSubscription } from '@/hooks/useAdminSubscriptions';
import { GRANT_SOURCE_OPTIONS } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { addDays, daysUntil } from '@/lib/admin/time';
import { formatCurrency, formatDateTime, shortId } from '@/lib/utils';
import type { AdminPlan, AdminWorkspaceDetail, GrantSource } from '@/types/admin';

function priceOf(p: AdminPlan): string {
  const m = p.monthlySalePrice ?? p.monthlyListPrice;
  const y = p.yearlySalePrice ?? p.yearlyListPrice;
  return `${m !== null ? formatCurrency(m) : '—'}/tháng · ${y !== null ? formatCurrency(y) : '—'}/năm`;
}

/** CMS-08 Grant: cấp gói / trial, thay dòng live ngay lập tức (ADM-RULE-007). */
export function GrantDialog({ ws, open, onOpenChange }: { ws: AdminWorkspaceDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: plans } = useAdminPlans();
  const grant = useGrantSubscription(ws.id);
  const { showToast } = useToast();

  const [planCode, setPlanCode] = React.useState<string>('');
  const [source, setSource] = React.useState<GrantSource>('MANUAL');
  const [expiresAt, setExpiresAt] = React.useState(() => toDateTimeLocal(addDays(new Date(), 30)));
  const [note, setNote] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPlanCode(ws.subscription.planCode ?? '');
    setSource('MANUAL');
    setExpiresAt(toDateTimeLocal(addDays(new Date(), 30)));
    setNote('');
    setSubmitted(false);
    setServerError(null);
  }, [open, ws.subscription.planCode]);

  const options = React.useMemo(
    () =>
      (plans ?? []).map((p) => ({
        value: p.code,
        label: `${p.name} · ${p.code}${p.isActive ? '' : ' · Đã ngừng bán'}`,
        description: priceOf(p),
      })),
    [plans],
  );

  const expiresDate = fromDateTimeLocal(expiresAt);
  const errors = {
    plan: planCode ? undefined : 'Chọn một gói.',
    expiresAt: !expiresDate ? 'Nhập ngày hết hạn.' : expiresDate.getTime() <= Date.now() ? 'Ngày hết hạn phải ở tương lai.' : undefined,
    note: validateNote(note),
  };
  const invalid = Boolean(errors.plan || errors.expiresAt || errors.note);
  const hasLive = ws.subscription.status !== 'NONE';

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid || !expiresDate) return;
    grant.mutate(
      { planCode, source, expiresAt: expiresDate.toISOString(), note: note.trim() },
      {
        onSuccess: (row) => {
          showToast({ title: 'Đã cấp gói mới', description: `${ws.name} → ${row.planName} · nguồn ${row.source}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không thể cấp gói. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !grant.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <DialogIcon tone="primary">
            <Sparkles />
          </DialogIcon>
          <div>
            <DialogTitle>Cấp gói cho workspace</DialogTitle>
            <DialogDescription>
              {ws.name} · <span className="font-mono">{shortId(ws.id)}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {hasLive && ws.subscription.expiresAt && (
            <Alert variant="warning">
              <AlertDescription>
                Workspace này đang dùng gói <b>{ws.subscription.planName}</b> (hết hạn {formatDateTime(ws.subscription.expiresAt)}). Cấp gói mới sẽ
                ĐÓNG gói đang chạy ngay lập tức và thay bằng gói này.
              </AlertDescription>
            </Alert>
          )}
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grant-plan">Gói</Label>
            <Combobox
              id="grant-plan"
              options={options}
              value={planCode || null}
              onChange={(v) => setPlanCode(String(v))}
              placeholder="Chọn gói"
              searchPlaceholder="Lọc theo tên hoặc mã gói"
              emptyText="Không có gói khớp"
            />
            <p className={submitted && errors.plan ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
              {(submitted && errors.plan) ?? 'Danh sách gồm cả gói đã ngừng bán, đánh dấu rõ nhưng vẫn chọn được.'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nguồn cấp</Label>
            <SegmentedControl
              options={GRANT_SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={source}
              onValueChange={(v) => setSource(v as GrantSource)}
              size="sm"
              fullWidth
            />
            <p className="text-xs text-muted-foreground">{GRANT_SOURCE_OPTIONS.find((o) => o.value === source)?.hint}</p>
          </div>
          <DateTimeField
            id="grant-expires"
            label="Ngày hết hạn"
            value={expiresAt}
            onChange={setExpiresAt}
            min={toDateTimeLocal(new Date())}
            error={submitted ? errors.expiresAt : undefined}
            hint={
              <>
                {expiresDate && expiresDate.getTime() > Date.now() && <b className="font-mono">còn {daysUntil(expiresDate.toISOString())} ngày · </b>}
                Phải ở tương lai. Số ngày còn lại sẽ cộng dồn nếu khách mua gói sau này; chỉ cấp đúng số ngày bạn định cho.
              </>
            }
          />
          <NoteField
            id="grant-note"
            value={note}
            onChange={setNote}
            placeholder="Khách thanh toán 6 tháng ngoài hệ thống, biên nhận #BN-0912"
            hint="3 đến 400 ký tự · đây là bằng chứng duy nhất của thao tác (lưu vào workspace_subscription.note)"
            error={submitted ? errors.note : undefined}
          />
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={grant.isPending} autoFocus>
            Hủy
          </Button>
          <Button onClick={submit} disabled={grant.isPending}>
            {grant.isPending && <Spinner size="sm" />}
            Cấp gói mới
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
