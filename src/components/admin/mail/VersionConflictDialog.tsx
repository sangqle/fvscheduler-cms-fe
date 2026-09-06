'use client';

import { Copy, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';

/**
 * 409 lúc PUT: một admin khác đã lưu trước. Không tự thử lại và không nạp đè nội dung đang soạn,
 * vì v1 không có công cụ hợp nhất hai bản: gõ lại là mất chữ thật. Đổi lại, tải lại KHÔNG hiện
 * nội dung của người kia ở đâu cả, nên lời văn phải chỉ thẳng người dùng sang Lịch sử version để
 * đối chiếu, thay vì hứa một "bản mới" mà màn hình không bao giờ hiện ra.
 */
export function VersionConflictDialog({
  version,
  reloading,
  onReload,
  onCopyDraft,
  onOpenChange,
}: {
  /** Version hiện hành backend báo trong message; `null` là đóng. */
  version: number | null;
  reloading?: boolean;
  onReload: () => void;
  /** Chép tiêu đề + thân HTML đang soạn ra clipboard, phòng khi người dùng đóng tab trước khi lưu. */
  onCopyDraft?: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={version !== null} onOpenChange={(o) => !reloading && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="warning">
            <Users />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Template vừa được người khác lưu thành v{version}</DialogTitle>
            <DialogDescription>
              Lần lưu vừa rồi không ghi gì cả. Nội dung bạn đang soạn vẫn nằm nguyên trong trình soạn, tải lại
              cũng không đụng vào nó.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Text variant="caption" muted>
          Tải lại chỉ cập nhật số bản đang phát hành và danh sách version, nó không hiện nội dung của người
          kia. Muốn xem họ sửa gì, bấm <b>Lịch sử version</b> trên thanh công cụ của trình soạn rồi bấm{' '}
          <b>Xem</b> ở v{version} trong panel vừa mở, để đối chiếu trước khi lưu. Bấm Lưu lần nữa sẽ ghi đúng
          chữ trong trình soạn thành v{(version ?? 0) + 1}, và v{version} thôi làm bản phát hành, dù nó vẫn
          còn trong lịch sử.
        </Text>

        {onCopyDraft && (
          <Button variant="outline" size="sm" className="mt-3 self-start" onClick={onCopyDraft}>
            <Copy className="size-4" />
            Sao chép nội dung đang soạn
          </Button>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reloading}>
            Để sau
          </Button>
          <Button onClick={onReload} disabled={reloading}>
            {reloading ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Tải lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
