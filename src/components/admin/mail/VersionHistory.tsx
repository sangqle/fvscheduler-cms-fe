'use client';

import * as React from 'react';
import { Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { CodeBlock } from '@/components/ui/CodeEditor';
import { Heading } from '@/components/ui/Heading';
import { Skeleton } from '@/components/ui/Skeleton';
import { SlideOver } from '@/components/ui/SlideOver';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { useMailTemplateVersions } from '@/hooks/useAdminMail';
import { formatDateTime } from '@/lib/utils';
import type { AdminMailTemplateVersion } from '@/types/admin';

/**
 * Lịch sử version, mở từ nút trên thanh tiêu đề trình soạn (brief 4.3). Bản đã phát hành là bất
 * biến, nên "Dùng lại" chỉ nạp nội dung bản cũ vào form để lưu thành version mới, không ghi đè bản
 * nào.
 *
 * Panel thay cho cột phải cũ: danh sách này chỉ đọc vài lần trong một buổi soạn, không đáng chiếm
 * chỗ thường trực của khung xem trước.
 */
export function VersionHistory({
  open,
  onOpenChange,
  code,
  currentVersion,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  currentVersion: number;
  onRestore: (version: AdminMailTemplateVersion) => void;
}) {
  const { data, isPending, error, refetch } = useMailTemplateVersions(code);
  const [viewing, setViewing] = React.useState<AdminMailTemplateVersion | null>(null);

  return (
    <>
      <SlideOver open={open} onOpenChange={onOpenChange} title={`Lịch sử version ${code}`}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <Heading level="3">Lịch sử version</Heading>
            <Text variant="caption" muted className="mt-1">
              Bản đã phát hành là bất biến · <span className="font-mono">{code}</span>
            </Text>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2">
            {isPending && <Skeleton className="h-28 w-full" />}
            {error && <ErrorState error={error} onRetry={() => void refetch()} />}
            {data?.length === 0 && (
              <Text variant="caption" muted>
                Chưa có version nào được ghi cho template này.
              </Text>
            )}

            {data?.map((v) => {
              const live = v.version === currentVersion;
              return (
                <div
                  key={v.version}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <Badge variant={live ? 'success' : 'secondary'} size="sm" mono="plain">
                    v{v.version}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    {live && <p className="text-xs font-semibold text-success-deep">Đang phát hành</p>}
                    <p className="font-mono text-[11px] text-muted-foreground">{formatDateTime(v.createdAt)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(v)}>
                    Xem
                  </Button>
                  {!live && (
                    <Button variant="outline" size="sm" onClick={() => onRestore(v)}>
                      Dùng lại
                    </Button>
                  )}
                </div>
              );
            })}

            <Text variant="caption" muted>
              &quot;Dùng lại&quot; nạp nội dung bản cũ vào form, lưu xong thành version mới, không ghi đè bản nào.
            </Text>

            {/* Ghi chú 409 sống ở đây vì nó chỉ có nghĩa lúc đi tìm bản của người kia, tức là đúng
                lúc mở panel này; để thường trực cạnh ô soạn thì nó chỉ chiếm chỗ. */}
            <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-border px-3 py-3">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Có người khác đang sửa?</p>
                <Text variant="caption" muted>
                  Hai người lưu cùng lúc thì người sau nhận 409 kèm số version hiện hành. Chữ đang gõ vẫn
                  còn nguyên, mở Lịch sử version xem bản kia rồi lưu tiếp. Không bản ghi nào bị mất.
                </Text>
              </div>
            </div>
          </div>
        </div>
      </SlideOver>

      {/*
        Dialog nằm ngoài <SlideOver> nhưng cùng portal về body, và cả băng dialog là `z-50` trong khi
        panel cao nhất mới `z-48` (xem SlideOverLayer): hộp "Xem" luôn nổi trên panel mà không cần
        đổi `layer`. `layer="stacked"` là dành cho panel mở trên panel, dùng ở đây là sai nấc.
      */}
      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>
              {code} · v{viewing?.version}
            </DialogTitle>
            <DialogDescription>
              {viewing ? `Ghi lúc ${formatDateTime(viewing.createdAt)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Text variant="caption" muted>
                Tiêu đề
              </Text>
              <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs">
                {viewing?.subjectTemplate || '—'}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Text variant="caption" muted>
                Thân HTML
              </Text>
              <CodeBlock code={viewing?.htmlBody ?? ''} className="max-h-80" />
            </div>
            {viewing && viewing.customVariables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Text variant="caption" muted>
                  Biến tự do:
                </Text>
                {viewing.customVariables.map((n) => (
                  <Badge key={n} variant="outline" size="sm" mono="plain">
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
