'use client';

import * as React from 'react';
import { CircleX, Trash2 } from 'lucide-react';
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
import { useDeleteItem, useFeatureKeys } from '@/hooks/useAdminCatalog';
import { apiErrorMessage } from '@/lib/api/auth';
import type { AdminCatalogItem } from '@/types/admin';

/**
 * Xóa vĩnh viễn một item (DELETE /api/admin/catalog/items/{code}). Backend từ chối khi item còn
 * `plan_item_link` hoặc `workspace_item_override` nào trỏ vào, và khi nó là item active cuối cùng
 * mang feature key của mình, kể cả khóa reserved.
 */
export function DeleteItemDialog({
  item,
  onOpenChange,
  onRetire,
}: {
  item: AdminCatalogItem | null;
  onOpenChange: (open: boolean) => void;
  onRetire: (item: AdminCatalogItem) => void;
}) {
  const { showToast } = useToast();
  const featureKeys = useFeatureKeys();
  const remove = useDeleteItem();
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (item) setServerError(null);
  }, [item]);

  if (!item) return null;

  const references = item.usage.links + item.usage.overrides;
  const carriers = featureKeys.data?.find((k) => k.key === item.featureKey)?.activeCarriers ?? 0;
  const lastCarrier = item.featureKey !== null && item.isActive && carriers <= 1;
  const deletable = references === 0 && !lastCarrier;

  function submit() {
    if (!item) return;
    setServerError(null);
    remove.mutate(item.code, {
      onSuccess: () => {
        showToast({
          title: `Đã xóa item ${item.label}`,
          description: 'Cache của mọi gói và trang giá công khai đã được xóa.',
          variant: 'success',
        });
        onOpenChange(false);
      },
      onError: (e) => setServerError(apiErrorMessage(e, 'Không xóa được item. Vui lòng thử lại.')),
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
            <DialogTitle>Xóa item {item.label}</DialogTitle>
            <DialogDescription className="font-mono">{item.code}</DialogDescription>
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
          {lastCarrier && !serverError && (
            <Alert variant="warning">
              <AlertDescription>
                Đây là item active duy nhất mang khóa <span className="font-mono">{item.featureKey}</span>. Cho
                một item khác mang khóa này trước, hoặc chấp nhận route đó vẫn do một mình item này gác.
              </AlertDescription>
            </Alert>
          )}
          <Text variant="body-sm" muted>
            Đang có <b className="font-mono text-foreground">{item.usage.links}</b> gói link tới item và{' '}
            <b className="font-mono text-foreground">{item.usage.overrides}</b> ghi đè ở workspace.{' '}
            {deletable
              ? 'Không còn tham chiếu nào nên xóa được. Thao tác không hoàn tác được.'
              : 'Còn tham chiếu thì tắt item thay vì xóa: item biến khỏi mọi gói mà lịch sử vẫn nguyên.'}
          </Text>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Đóng
          </Button>
          {!deletable && item.isActive && (
            <Button variant="secondary" onClick={() => onRetire(item)} disabled={remove.isPending}>
              Tắt item thay vì xóa
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
