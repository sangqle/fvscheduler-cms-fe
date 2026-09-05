'use client';

import * as React from 'react';
import { CalendarPlus } from 'lucide-react';
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
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { DateTimeField, fromDateTimeLocal, toDateTimeLocal } from '@/components/admin/shared/DateTimeField';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { useExtendSubscription } from '@/hooks/useAdminSubscriptions';
import { SUBSCRIPTION_SOURCE, SUBSCRIPTION_STATUS } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { addDays, daysUntil, relativeDays } from '@/lib/admin/time';
import { formatDateTime, shortId } from '@/lib/utils';
import type { AdminWorkspaceDetail } from '@/types/admin';

/** CMS-08 Extend: chỉ dời expiresAt của dòng live; dòng đã hết hạn theo đồng hồ sẽ sống lại ngay. */
export function ExtendDialog({ ws, open, onOpenChange }: { ws: AdminWorkspaceDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const extend = useExtendSubscription(ws.id);
  const { showToast } = useToast();
  const sub = ws.subscription;
  const oldExpiry = sub.expiresAt ? new Date(sub.expiresAt) : new Date();
  const expiredByClock = sub.status === 'EXPIRED';

  const [expiresAt, setExpiresAt] = React.useState(() => toDateTimeLocal(addDays(oldExpiry, 30)));
  const [note, setNote] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setExpiresAt(toDateTimeLocal(addDays(sub.expiresAt ? new Date(sub.expiresAt) : new Date(), 30)));
    setNote('');
    setSubmitted(false);
    setServerError(null);
  }, [open, sub.expiresAt]);

  const newDate = fromDateTimeLocal(expiresAt);
  const errors = {
    expiresAt: !newDate ? 'Nhập ngày hết hạn mới.' : newDate.getTime() <= Date.now() ? `Phải sau thời điểm hiện tại (${formatDateTime(new Date().toISOString())}).` : undefined,
    note: validateNote(note),
  };
  const invalid = Boolean(errors.expiresAt || errors.note);
  const deltaDays = newDate ? Math.round((newDate.getTime() - oldExpiry.getTime()) / 86_400_000) : 0;

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid || !newDate) return;
    extend.mutate(
      { expiresAt: newDate.toISOString(), note: note.trim() },
      {
        onSuccess: (row) => {
          showToast({ title: 'Đã gia hạn', description: `${ws.name} · ${row.planName} → hết hạn ${formatDateTime(row.expiresAt)}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không thể gia hạn. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !extend.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <DialogIcon tone="info">
            <CalendarPlus />
          </DialogIcon>
          <div>
            <DialogTitle>Gia hạn subscription</DialogTitle>
            <DialogDescription>
              {ws.name} · <span className="font-mono">{shortId(ws.id)}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg border border-border p-3">
            <Text variant="caption" muted className="mb-1.5">Dòng sẽ được gia hạn</Text>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{sub.planName}</span>
              <EnumBadge meta={SUBSCRIPTION_STATUS[sub.status]} />
              {sub.source && <EnumBadge meta={SUBSCRIPTION_SOURCE[sub.source]} />}
            </div>
            {sub.expiresAt && (
              <Text variant="caption" muted className="mt-1 font-mono">
                Hết hạn {formatDateTime(sub.expiresAt)} · {relativeDays(sub.expiresAt)}
              </Text>
            )}
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              <li>· Gia hạn chỉ đổi ngày hết hạn, không đổi gói hay nguồn hiện tại.</li>
              {expiredByClock && <li>· Gói này đã hết hạn theo đồng hồ; gia hạn sẽ kích hoạt lại ngay khi lưu, không cần bước riêng.</li>}
            </ul>
          </div>
          <DateTimeField
            id="extend-expires"
            label="Ngày hết hạn mới"
            value={expiresAt}
            onChange={setExpiresAt}
            min={toDateTimeLocal(new Date())}
            error={submitted ? errors.expiresAt : undefined}
            hint={
              newDate ? (
                <span className="font-mono">
                  {deltaDays >= 0 ? '+' : ''}
                  {deltaDays} ngày kể từ hạn cũ · còn {daysUntil(newDate.toISOString())} ngày
                </span>
              ) : undefined
            }
          />
          <NoteField
            id="extend-note"
            value={note}
            onChange={setNote}
            placeholder="Gia hạn 30 ngày bù thời gian gián đoạn webhook, ticket hỗ trợ #88"
            hint="3 đến 400 ký tự · lưu vào workspace_subscription.note"
            error={submitted ? errors.note : undefined}
          />
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={extend.isPending} autoFocus>
            Hủy
          </Button>
          <Button onClick={submit} disabled={extend.isPending}>
            {extend.isPending && <Spinner size="sm" />}
            Gia hạn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
