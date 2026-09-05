'use client';

import * as React from 'react';
import { Ban } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { NoteField, validateNote } from '@/components/admin/shared/NoteField';
import { useCancelSubscription } from '@/hooks/useAdminSubscriptions';
import { SUBSCRIPTION_SOURCE, SUBSCRIPTION_STATUS } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatDateTime } from '@/lib/utils';
import type { AdminWorkspaceDetail } from '@/types/admin';

/** CMS-08 Cancel: workspace về NONE ngay; không hoàn tác được qua CMS. */
export function CancelDialog({ ws, open, onOpenChange }: { ws: AdminWorkspaceDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const cancel = useCancelSubscription(ws.id);
  const { showToast } = useToast();
  const sub = ws.subscription;
  const [note, setNote] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNote('');
      setSubmitted(false);
      setServerError(null);
    }
  }, [open]);

  const noteError = validateNote(note);

  function confirm() {
    setSubmitted(true);
    setServerError(null);
    if (noteError) return;
    cancel.mutate(
      { note: note.trim() },
      {
        onSuccess: () => {
          showToast({ title: 'Đã hủy subscription', description: `${ws.name} về trạng thái NONE`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không thể hủy gói. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !cancel.isPending && onOpenChange(o)}
      variant="destructive"
      icon={Ban}
      title="Hủy subscription"
      description={
        <>
          Hủy gói sẽ đưa workspace <b>{ws.name}</b> về trạng thái KHÔNG CÓ GÓI (NONE) ngay lập tức. Hãy chắc chắn đã trao đổi với khách
          hàng trước khi thực hiện.
        </>
      }
      confirmLabel="Hủy subscription"
      cancelLabel="Giữ gói"
      hideConfirmIcon
      onConfirm={confirm}
      isPending={cancel.isPending}
      confirmDisabled={submitted && !!noteError}
    >
      <div className="flex flex-col gap-3">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-lg border border-border p-3">
          <Text variant="caption" muted className="mb-1.5">Dòng sẽ bị đóng</Text>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{sub.planName}</span>
            <EnumBadge meta={SUBSCRIPTION_STATUS[sub.status]} />
            {sub.source && <EnumBadge meta={SUBSCRIPTION_SOURCE[sub.source]} />}
          </div>
          <Text variant="caption" muted className="mt-1">
            {sub.expiresAt && `hết hạn ${formatDateTime(sub.expiresAt)} · `}
            {ws.counts.activeMembers} thành viên đang hoạt động
          </Text>
        </div>
        <NoteField
          id="cancel-note"
          value={note}
          onChange={setNote}
          placeholder="Chấm dứt theo yêu cầu chủ sở hữu (email ngày 03/09/2026)"
          hint="Không thể hoàn tác qua CMS; muốn khôi phục phải cấp gói mới."
          error={submitted ? noteError : undefined}
        />
      </div>
    </ConfirmDialog>
  );
}
