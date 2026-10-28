'use client';

import { Images } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { StorageTable } from '@/components/admin/client-albums/StorageTable';
import { storageAlbumScope, storageRangeLabel, type StorageRun } from '@/components/admin/client-albums/storageFilters';
import { AlbumTotalsStrip } from '@/components/admin/workspaces/AlbumTotalsStrip';
import { formatCount, formatCoverage } from '@/lib/admin/clientAlbums';
import { formatVnDateTime } from '@/lib/admin/time';
import { cn } from '@/lib/utils';
import type { AdminAlbumStorage } from '@/types/admin';

/**
 * Tên để nói workspace mà lượt này đã lọc, hoặc null khi lượt này tính mọi workspace. Ưu tiên tên backend vừa
 * trả (đúng cả khi lượt này khôi phục từ cache và không mang nhãn), rồi nhãn lúc bấm, cuối cùng là chính id.
 */
function filteredWorkspaceName(run: StorageRun, data: AdminAlbumStorage): string | null {
  const id = run.params.workspaceId;
  if (!id) return null;
  return data.rows.content.find((r) => r.workspace?.id === id)?.workspace?.name ?? run.workspaceLabel ?? id;
}

/**
 * Kết quả của MỘT lượt "Tính dung lượng": dải tổng, bảng theo workspace, và những câu nói rõ kết quả này
 * là của khoảng ngày và workspace nào (lấy từ `run`, bộ lọc lúc BẤM chứ không phải bộ lọc đang sửa ở trên),
 * tính lúc mấy giờ, và có thiếu hàng không.
 *
 * - Dải tổng phủ MỌI workspace của khoảng, kể cả những workspace không có hàng trong bảng.
 * - Backend chỉ trả tối đa 100 hàng nặng nhất. Nếu còn nữa thì nói thẳng, không tự gọi thêm trang: mỗi
 *   trang là một lần quét lại và tốn một trong 10 lượt mỗi phút.
 * - Không có album còn sống nào thì chỉ hiện trạng thái rỗng, bỏ dải tổng toàn số 0.
 */
export function StorageResult({
  run,
  data,
  updatedAt,
  busy,
  filtersChanged,
}: {
  run: StorageRun;
  data: AdminAlbumStorage;
  /** Mốc (ms) lượt tính này về, để người xem biết số liệu cũ hay mới. */
  updatedAt: number;
  /** Đang tính lại đúng bộ lọc này: giữ số cũ nhưng mờ đi cho tới khi số mới về. */
  busy: boolean;
  /** Bộ lọc đang sửa ở trên đã khác bộ lọc của kết quả này. */
  filtersChanged: boolean;
}) {
  const { totals, rows } = data;
  const { from, to } = run.params;
  const workspaceName = filteredWorkspaceName(run, data);

  if (totals.albums === 0 || rows.content.length === 0) {
    const range = storageRangeLabel(from, to);
    const workspace = workspaceName ? ` của workspace ${workspaceName}` : '';
    return (
      <EmptyState
        icon={<Images />}
        title="Không có album nào còn sống trong khoảng này"
        description={`Không có album còn sống nào${range ? ` được tạo ${range}` : ''}${workspace}. Album đã xóa không được tính. Thử chọn khoảng dài hơn hoặc Toàn bộ thời gian.`}
      />
    );
  }

  const scope = `${storageAlbumScope(from, to)} · ${workspaceName ? `Workspace ${workspaceName}` : 'Mọi workspace'}`;
  const listed = rows.content.length;
  const truncated = rows.totalElements > listed;
  // Độ phủ của cả khoảng, dạng phần trăm: con số này nói GB ở dải tổng đáng tin tới đâu. Không có ảnh nào thì bỏ.
  const coverage = formatCoverage(totals.sizedPhotos, totals.photos);

  return (
    <div aria-busy={busy} className={cn('flex flex-col gap-4 transition-opacity', busy && 'opacity-60')}>
      <div className="flex flex-col gap-1">
        <Text variant="caption" muted>
          Tính lúc {formatVnDateTime(new Date(updatedAt).toISOString())}
          {coverage && ` · Ảnh có dung lượng: ${coverage}`}
        </Text>
        {filtersChanged && (
          <Text variant="caption" muted>
            Bộ lọc phía trên đã khác với kết quả này. Bấm Tính dung lượng để tính lại theo bộ lọc mới.
          </Text>
        )}
      </div>

      <AlbumTotalsStrip totals={totals} scope={scope} />

      <section className="flex flex-col gap-3">
        <div>
          <Heading level="3">Dung lượng theo workspace</Heading>
          <Text variant="body-sm" muted className="mt-1">
            Workspace có dung lượng lớn nhất xếp trước · bấm một dòng để xem album còn sống của workspace trong khoảng
            này
          </Text>
        </div>
        {truncated && (
          <Text variant="body-sm" muted>
            Chỉ liệt kê {formatCount(listed)} workspace có dung lượng lớn nhất trong tổng số{' '}
            {formatCount(rows.totalElements)}. Các con số tổng ở trên vẫn tính cho tất cả.
          </Text>
        )}
        {/* `key` đổi theo mỗi lượt tính để bảng về trang đầu, không giữ trang của kết quả trước. */}
        <StorageTable key={`${updatedAt}`} rows={rows.content} range={{ from, to }} />
      </section>
    </div>
  );
}
