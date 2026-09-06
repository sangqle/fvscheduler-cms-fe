'use client';

import { Braces } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { useMailVariables } from '@/hooks/useAdminMail';

/**
 * Catalog biến do server cung cấp (GET /variables). Thêm nhóm mới là thêm một provider ở backend,
 * không đổi schema, nên màn này chỉ đọc.
 */
export function VariableCatalogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending, error, refetch } = useMailVariables();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <Braces />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Catalog biến</DialogTitle>
            <DialogDescription>Biến server tự điền · biến tự do phải khai trong template</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {error && <ErrorState error={error} onRetry={() => void refetch()} />}
          {isPending && !error && <Skeleton className="h-48 w-full" />}
          {data?.map((group) => (
            <div key={group.group} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm" mono>
                  {group.group}
                </Badge>
                {group.group === 'COMMON' && (
                  <Text variant="caption" muted>
                    luôn có, không cần khai
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                {group.variables.map((v) => (
                  <div key={v.name} className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-semibold">{`{{ ${v.name} }}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.description} · ví dụ {v.sample}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Text variant="caption" muted>
            Nhóm SUBSCRIPTION (packName, endDate, daysLeft…) thuộc phase 2 nên chưa có ở đây.
          </Text>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
