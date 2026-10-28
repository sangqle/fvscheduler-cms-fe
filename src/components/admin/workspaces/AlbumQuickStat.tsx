'use client';

import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InfoTip } from '@/components/ui/InfoTip';
import { Spinner } from '@/components/ui/Spinner';
import { AlbumQuickStatSkeleton } from '@/components/admin/workspaces/WorkspaceSkeletons';
import { formatCount, workspaceAlbumsHref } from '@/lib/admin/clientAlbums';
import { formatNaiveVnDate } from '@/lib/admin/time';
import { apiErrorMessage } from '@/lib/api/auth';
import type { AdminWorkspaceAlbumSummary } from '@/types/admin';

const THIS_MONTH_HINT =
  'Album còn sống tạo trong tháng này, đúng số ERP dùng để khóa nút Tạo album mới: xóa một album là trả lại một chỗ. Số nhỏ bên cạnh là album tạo trong tháng này rồi đã bị xóa.';

/**
 * Hàng "Album khách" của thẻ Thống kê nhanh: album còn sống, số tạo trong tháng và ngày tạo gần nhất.
 *
 * Số liệu do framevis-drive tính nên đi bằng query riêng của nó (route chi tiết workspace không bao
 * giờ gọi framevis-drive): chờ hay lỗi thì chỉ hàng này đổi, mấy con số còn lại của thẻ và cả trang
 * không đợi nó. Lưới cha là 2 cột nên mọi nhánh ở đây đều chiếm trọn hàng (`col-span-2`).
 *
 * "Chưa dùng" chỉ khi vừa chưa có album sống vừa chưa từng xóa album nào. Còn 0 album sống mà đã từng
 * xóa thì vẫn in 0 kèm số đã xóa, vì workspace đó đã dùng và đang trống chứ không phải chưa dùng.
 */
export function AlbumQuickStat({
  workspaceId,
  summary,
}: {
  workspaceId: string;
  summary: UseQueryResult<AdminWorkspaceAlbumSummary, Error>;
}) {
  if (summary.isPending) return <AlbumQuickStatSkeleton />;

  if (summary.isError) {
    return (
      <div className="col-span-2 flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Album khách</span>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertDescription>
            Không tải được số liệu album khách. {apiErrorMessage(summary.error, 'Vui lòng thử lại.')}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={summary.isFetching}
          onClick={() => void summary.refetch()}
        >
          {summary.isFetching && <Spinner size="sm" />}
          Thử lại
        </Button>
      </div>
    );
  }

  const s = summary.data;

  if (s.albums === 0 && s.deleted === 0) {
    return (
      <div className="col-span-2 flex flex-col border-t border-border pt-3">
        <span className="text-base font-medium leading-7 text-muted-foreground">Chưa dùng</span>
        <span className="text-xs text-muted-foreground">Album khách</span>
      </div>
    );
  }

  return (
    <div className="col-span-2 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3 border-t border-border pt-3">
      {/* Giống ô Booking: chỉ ô này bấm được, dẫn sang tab Album khách. */}
      <Link
        href={workspaceAlbumsHref(workspaceId)}
        className="group flex min-w-0 flex-col rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-mono text-xl font-semibold text-primary">{formatCount(s.albums)}</span>
          {s.deleted > 0 && (
            <span className="text-[11px] text-muted-foreground" title="Album đã bị xóa, tính từ trước tới nay">
              {formatCount(s.deleted)} đã xóa
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
          Album khách
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-mono text-xl font-semibold text-foreground">{formatCount(s.createdThisMonth)}</span>
          {s.deletedThisMonth > 0 && (
            <span className="text-[11px] text-muted-foreground">{formatCount(s.deletedThisMonth)} đã xóa</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Tạo tháng này
          <InfoTip content={THIS_MONTH_HINT} />
        </span>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-sm leading-7 text-foreground">
          {s.lastCreatedAt ? formatNaiveVnDate(s.lastCreatedAt) : '—'}
        </span>
        <span className="text-xs text-muted-foreground">Gần nhất</span>
      </div>
    </div>
  );
}
