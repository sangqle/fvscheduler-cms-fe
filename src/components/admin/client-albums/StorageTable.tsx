'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { InfoTip } from '@/components/ui/InfoTip';
import { RawId } from '@/components/admin/shared/RawId';
import {
  AlbumWorkspaceCell,
  useAlbumWorkspaceHref,
  type AlbumRange,
} from '@/components/admin/client-albums/AlbumWorkspaceCell';
import { CountCell } from '@/components/admin/client-albums/CountCell';
import { PlanCell } from '@/components/admin/client-albums/PlanCell';
import { AlbumSizeCell } from '@/components/admin/workspaces/AlbumSizeCell';
import { formatCoverage, formatCount } from '@/lib/admin/clientAlbums';
import type { AdminAlbumStorageFigures, AdminAlbumStorageRow } from '@/types/admin';

/** Cỡ trang của bảng, phân trang ở máy trên tối đa 100 hàng đã về trong một lượt tính. */
const PAGE_SIZE = 20;
const PAGE_SIZES = [20, 50, 100];

const SIZE_HEADER_HINT =
  'Chưa rõ dung lượng: có ảnh nhưng Google Drive chưa báo dung lượng của ảnh nào, gồm ảnh trên NAS và một số album Drive cũ. Nếu chỉ biết dung lượng một phần ảnh thì số GB là mức tối thiểu, kèm số ảnh đã biết.';

const DOWNLOADABLE_HEADER_HINT = 'Phần dung lượng nằm trong các album đang bật cho khách tải về.';

const COVERAGE_HEADER_HINT =
  'Tỷ lệ ảnh mà Google Drive đã báo dung lượng. Dưới 100% thì số GB chỉ là mức tối thiểu.';

/**
 * Độ phủ dung lượng: chỉ in phần trăm, không vẽ thanh (chủ dự án bỏ thanh ngày 2026-10-28). Không có ảnh nào
 * thì ô trống.
 */
function CoverageCell({ figures }: { figures: AdminAlbumStorageFigures }) {
  const label = formatCoverage(figures.sizedPhotos, figures.photos);
  if (label === null) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs tabular-nums">{label}</span>;
}

/**
 * Bảng dung lượng theo workspace của kết quả "Tính dung lượng", nặng nhất trước (thứ tự do backend giữ, kể
 * cả dòng "Không thuộc workspace"). Phân trang ở máy: kết quả về một lượt tối đa 100 hàng, vì mỗi trang
 * của route là một lần quét lại toàn bộ.
 *
 * Mọi con số GB đi qua cùng một luật (`describeSize` trong `AlbumSizeCell`): có ảnh mà chưa ảnh nào có dung
 * lượng thì đọc "Chưa rõ dung lượng", không bao giờ "0 GB". Cột Độ phủ nói thẳng tỷ lệ ảnh đã biết dung lượng.
 *
 * Dòng có workspace sống là link sang tab Album khách của workspace, mang theo `range`: khoảng ngày mà kết
 * quả này ĐÃ ĐƯỢC TÍNH cho (không phải bộ lọc đang sửa ở trên). Dòng không thuộc workspace hay workspace đã
 * mất không link được và bị `isRowDisabled` loại khỏi việc bấm hàng.
 *
 * Header phải khớp `STORAGE_COLUMNS` ở `ClientAlbumSkeletons.tsx`.
 */
export function StorageTable({ rows, range }: { rows: AdminAlbumStorageRow[]; range: AlbumRange }) {
  const router = useRouter();
  const albumHref = useAlbumWorkspaceHref();
  const rowHref = (r: AdminAlbumStorageRow) => albumHref(r.workspace, range);

  const columns: ColumnDef<AdminAlbumStorageRow>[] = [
    // Cột đầu tiên như danh sách workspace; dòng "Không thuộc workspace" không có khóa số nên ô trống.
    { id: 'rawId', header: 'rawId', className: 'w-20', cell: (r) => <RawId value={r.workspace?.rawId} /> },
    {
      id: 'workspace',
      header: 'Workspace',
      className: 'min-w-[14vw]',
      cell: (r) => <AlbumWorkspaceCell workspace={r.workspace} href={rowHref(r)} />,
    },
    { id: 'plan', header: 'Gói', cell: (r) => <PlanCell subscription={r.workspace?.subscription ?? null} /> },
    {
      id: 'albums',
      header: 'Album',
      className: 'text-right',
      cell: (r) => (
        <span className="flex flex-col items-end gap-px">
          <CountCell value={r.figures.albums} />
          {r.figures.nasAlbums > 0 && (
            <span className="text-[11px] text-muted-foreground">{formatCount(r.figures.nasAlbums)} album NAS</span>
          )}
        </span>
      ),
    },
    { id: 'photos', header: 'Ảnh', className: 'text-right', cell: (r) => <CountCell value={r.figures.photos} /> },
    {
      id: 'size',
      header: (
        <span className="inline-flex items-center gap-1">
          Dung lượng
          <InfoTip content={SIZE_HEADER_HINT} />
        </span>
      ),
      className: 'text-right',
      cell: (r) => <AlbumSizeCell counts={r.figures} bytes={r.figures.bytes} align="end" />,
    },
    {
      id: 'downloadable',
      header: (
        <span className="inline-flex items-center gap-1">
          Dung lượng album cho phép tải
          <InfoTip content={DOWNLOADABLE_HEADER_HINT} />
        </span>
      ),
      className: 'text-right',
      cell: (r) => <AlbumSizeCell counts={r.figures} bytes={r.figures.downloadableBytes} align="end" />,
    },
    {
      id: 'coverage',
      header: (
        <span className="inline-flex items-center gap-1">
          Độ phủ
          <InfoTip content={COVERAGE_HEADER_HINT} />
        </span>
      ),
      className: 'text-right',
      cell: (r) => <CoverageCell figures={r.figures} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.workspace?.id ?? 'personal'}
      mobileCards
      paginated
      defaultPageSize={PAGE_SIZE}
      pageSizeOptions={PAGE_SIZES}
      onRowClick={(r) => {
        const href = rowHref(r);
        if (href) router.push(href);
      }}
      isRowDisabled={(r) => rowHref(r) === null}
    />
  );
}
