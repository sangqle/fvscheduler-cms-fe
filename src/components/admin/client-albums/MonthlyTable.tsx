'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { InfoTip } from '@/components/ui/InfoTip';
import { CountCell } from '@/components/admin/client-albums/CountCell';
import { PERSONAL_ALBUM_HINT } from '@/lib/admin/clientAlbums';
import { formatMonthKey } from '@/lib/admin/time';
import type { AdminAlbumMonth } from '@/types/admin';

type MonthTableRow =
  | { kind: 'month'; month: string; stats: AdminAlbumMonth }
  | { kind: 'total'; stats: AdminAlbumMonth };

const DELETED_HINT = 'Trong số album tạo trong tháng, bao nhiêu album đã bị xóa kể từ đó.';

const CREATED_HINT =
  'Đếm lượt tạo trong tháng, kể cả album đã xóa về sau, nên có thể cao hơn số album mà hạn mức hằng tháng ' +
  'của một workspace đang tính (hạn mức chỉ tính album còn tồn tại).';

/**
 * Bảng album tạo mỗi tháng, mỗi tháng một dòng rồi dòng Tổng. Đây là bảng đếm SỰ KIỆN TẠO: album tạo
 * hồi tháng 10 rồi xóa vẫn nằm ở tháng 10 và được đếm thêm ở "Đã xóa sau đó".
 *
 * Bấm một tháng là mở khung workspace của tháng đó bên dưới. Ô tên tháng là nút thật để bàn phím mở được,
 * hàng cũng bấm được và làm đúng việc đó; nút chặn nổi bọt vì không chặn thì một lần bấm chạy hai lần.
 * Chỉ in con số, không vẽ thanh so sánh (chủ dự án bỏ thanh đó ngày 2026-10-28).
 *
 * Header phải khớp `MONTH_COLUMNS` ở `ClientAlbumSkeletons.tsx`.
 */
export function MonthlyTable({
  months,
  totals,
  selected,
  onSelect,
}: {
  months: AdminAlbumMonth[];
  totals: AdminAlbumMonth;
  /** Tháng đang mở khung bên dưới, `yyyy-MM`. */
  selected: string | undefined;
  onSelect: (month: string) => void;
}) {
  const rows = React.useMemo<MonthTableRow[]>(
    () => [
      ...months.flatMap((m) => (m.month ? [{ kind: 'month' as const, month: m.month, stats: m }] : [])),
      { kind: 'total' as const, stats: totals },
    ],
    [months, totals],
  );

  const columns = React.useMemo<ColumnDef<MonthTableRow>[]>(
    () => [
      {
        id: 'month',
        header: 'Tháng',
        cell: (r) =>
          r.kind === 'total' ? (
            'Tổng'
          ) : (
            <Button
              variant="link"
              size="sm"
              className="-mx-3"
              aria-current={r.month === selected ? 'true' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.month);
              }}
            >
              {formatMonthKey(r.month)}
            </Button>
          ),
      },
      {
        id: 'created',
        header: (
          <span className="inline-flex items-center gap-1">
            Album tạo mới
            <InfoTip content={CREATED_HINT} />
          </span>
        ),
        className: 'text-right',
        cell: (r) => <CountCell value={r.stats.created} />,
      },
      {
        id: 'inWorkspace',
        header: 'Thuộc workspace',
        className: 'text-right',
        cell: (r) => <CountCell value={r.stats.inWorkspace} />,
      },
      {
        id: 'personal',
        header: (
          <span className="inline-flex items-center gap-1">
            Không thuộc workspace
            <InfoTip content={PERSONAL_ALBUM_HINT} />
          </span>
        ),
        className: 'text-right',
        cell: (r) => <CountCell value={r.stats.personal} />,
      },
      { id: 'drive', header: 'Google Drive', className: 'text-right', cell: (r) => <CountCell value={r.stats.drive} /> },
      { id: 'nas', header: 'NAS', className: 'text-right', cell: (r) => <CountCell value={r.stats.nas} /> },
      {
        id: 'deleted',
        header: (
          <span className="inline-flex items-center gap-1">
            Đã xóa sau đó
            <InfoTip content={DELETED_HINT} />
          </span>
        ),
        className: 'text-right',
        cell: (r) => <CountCell value={r.stats.deleted} dimZero />,
      },
    ],
    [selected, onSelect],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => (r.kind === 'total' ? 'total' : r.month)}
      mobileCards
      onRowClick={(r) => {
        if (r.kind === 'month') onSelect(r.month);
      }}
      isRowDisabled={(r) => r.kind === 'total'}
      rowClassName={(r) =>
        r.kind === 'total' ? 'bg-muted/40 font-semibold' : r.month === selected ? 'bg-primary-50/40' : undefined
      }
    />
  );
}
