'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { InfoTip } from '@/components/ui/InfoTip';
import { detailHref } from '@/hooks/useUrlState';
import {
  MISSING_WORKSPACE_LABEL,
  PERSONAL_ALBUM_HINT,
  PERSONAL_ALBUM_LABEL,
  albumWorkspaceKind,
  workspaceAlbumsHref,
} from '@/lib/admin/clientAlbums';
import { shortId } from '@/lib/utils';
import type { AdminAlbumWorkspaceRef } from '@/types/admin';

/** Khoảng ngày `yyyy-MM-dd` (cả hai đầu bao gồm) mang theo vào tab Album khách của workspace. Thiếu đầu nào là mở đầu đó. */
export interface AlbumRange {
  from?: string;
  to?: string;
}

/**
 * Dựng link của một dòng thống kê vào tab Album khách của workspace đứng sau nó, kèm khoảng ngày của
 * chính bảng đang xem. Chỉ dòng `live` mới có link: không có workspace (dòng "Không thuộc workspace")
 * hay workspace đã mất thì trả `null`, và bảng phải đánh dấu dòng đó bằng `isRowDisabled`.
 *
 * Bọc `detailHref` như mọi link vào chi tiết khác: query của màn này đi theo trong `?from=` (khóa `from` là
 * khóa đường về, không bao giờ là một ngày: ngày nằm ở `alFrom` và `alTo`). Lưu ý `useReturnHref` ghép
 * `from` vào đường dẫn dự phòng `/workspaces`, nên mũi tên "Danh sách workspace" của trang chi tiết vẫn
 * về danh sách workspace chứ không về màn này; nút Back của trình duyệt mới trả đúng tab và bộ lọc, vì
 * `useUrlState` ghi URL bằng `replaceState`.
 */
export function useAlbumWorkspaceHref() {
  const searchParams = useSearchParams();
  return React.useCallback(
    (workspace: AdminAlbumWorkspaceRef | null, range?: AlbumRange | null): string | null => {
      if (!workspace || albumWorkspaceKind(workspace) !== 'live') return null;
      return detailHref(workspaceAlbumsHref(workspace.id, range), searchParams);
    },
    [searchParams],
  );
}

/**
 * Ô "Workspace" của mọi bảng thống kê album. Ba loại dòng khác hẳn nhau và không dòng nào là lỗi:
 *
 * - `personal`: album không thuộc workspace nào, một dòng riêng kèm giải thích; không link.
 * - `missing`: framevis-drive còn album dưới một id mà ERP không còn workspace nào; chỉ còn `rawId`
 *   là có nghĩa (đọc thẳng DB nền tảng), không link.
 * - `live`: tên là link thật (bàn phím mở được) sang tab Album khách.
 *
 * Ô này không in `rawId`: mọi bảng thống kê album có cột `rawId` riêng đứng ngay trước nó, như danh sách
 * workspace, nên lặp lại dưới tên chỉ thêm nhiễu.
 *
 * Link chặn nổi bọt vì hàng cũng bấm được và làm đúng việc đó: không chặn thì một lần bấm điều hướng hai lần.
 */
export function AlbumWorkspaceCell({
  workspace,
  href,
}: {
  workspace: AdminAlbumWorkspaceRef | null;
  href: string | null;
}) {
  if (!workspace) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        {PERSONAL_ALBUM_LABEL}
        <InfoTip content={PERSONAL_ALBUM_HINT} />
      </span>
    );
  }

  if (albumWorkspaceKind(workspace) === 'missing') {
    return <span className="text-sm italic text-muted-foreground">{MISSING_WORKSPACE_LABEL}</span>;
  }

  const name = workspace.name ?? shortId(workspace.id);
  if (!href) return <span className="font-medium">{name}</span>;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  );
}
