'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { RefStat, canDeletePlan } from '@/components/admin/plans/planDisplay';
import { useDeletePlan } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import type { AdminPlan } from '@/types/admin';

/**
 * Xóa gói vĩnh viễn (DELETE /api/admin/plans/{code}): xóa luôn limits, item link và group link.
 * Backend từ chối khi gói là gói trial, hoặc còn bất kỳ subscription / đơn hàng nào trỏ vào —
 * lúc đó lối ra là ngừng bán, không phải xóa.
 */
export function DeletePlanDialog({
  plan,
  onOpenChange,
  onRetire,
  /** Sau khi xóa xong thì rời khỏi trang chi tiết (danh sách thì ở lại). */
  redirectToList = false,
}: {
  plan: AdminPlan | null;
  onOpenChange: (open: boolean) => void;
  onRetire: (plan: AdminPlan) => void;
  redirectToList?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const remove = useDeletePlan();
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (plan) setServerError(null);
  }, [plan]);

  if (!plan) return null;

  const deletable = canDeletePlan(plan);
  const blockedReason = plan.isTrialPlan
    ? 'Đây là gói trial cấu hình sẵn của hệ thống, backend không cho xóa kể cả khi không còn ai dùng.'
    : 'Gói còn được tham chiếu nên không xóa được, tính cả đơn đã hủy và đã hết hạn.';

  function submit() {
    if (!plan) return;
    setServerError(null);
    remove.mutate(plan.code, {
      onSuccess: () => {
        showToast({
          title: `Đã xóa gói ${plan.name}`,
          description: 'Gói cùng limits, item link và nhóm của nó đã bị xóa khỏi catalog.',
          variant: 'success',
        });
        onOpenChange(false);
        if (redirectToList) router.replace('/plans');
      },
      onError: (e) => setServerError(apiErrorMessage(e, 'Không xóa được gói. Vui lòng thử lại.')),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !remove.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="destructive">
            <Trash2 />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Xóa gói {plan.name}</DialogTitle>
            <DialogDescription>Xóa cả limits, item link và nhóm của gói</DialogDescription>
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
          {!deletable && !serverError && (
            <Alert variant="warning">
              <AlertDescription>{blockedReason}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <RefStat value={plan.usage.subscriptions} label={`subscription tham chiếu ${plan.code}`} />
            <RefStat value={plan.usage.orders} label="đơn hàng, tính cả đã hủy" />
          </div>
          <Text variant="body-sm" muted>
            {deletable
              ? 'Không có bản ghi nào ngoài catalog trỏ vào gói này nên xóa được. Thao tác không hoàn tác được.'
              : 'Muốn gói không bán nữa mà vẫn giữ lịch sử thì ngừng bán. Gói biến khỏi trang giá công khai, workspace đang dùng không bị ảnh hưởng.'}
          </Text>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Đóng
          </Button>
          {!deletable && plan.isActive && !plan.isTrialPlan && (
            <Button variant="secondary" onClick={() => onRetire(plan)} disabled={remove.isPending}>
              <PowerOff className="size-4" />
              Ngừng bán thay vì xóa
            </Button>
          )}
          <Button variant="destructive" onClick={submit} disabled={!deletable || remove.isPending}>
            {remove.isPending && <Spinner size="sm" />}
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
