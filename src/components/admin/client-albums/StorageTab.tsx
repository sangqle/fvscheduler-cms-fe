'use client';

import * as React from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { HardDrive } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { StorageResultSkeleton } from '@/components/admin/client-albums/ClientAlbumSkeletons';
import { CLIENT_ALBUM_URL_KEYS } from '@/components/admin/client-albums/clientAlbumTabs';
import { StorageFilterCard } from '@/components/admin/client-albums/StorageFilterCard';
import {
  presetPatch,
  rangePatch,
  resolveStorageFilters,
  sameStorageRequest,
  storageRequest,
  type StorageRun,
} from '@/components/admin/client-albums/storageFilters';
import { StorageResult } from '@/components/admin/client-albums/StorageResult';
import { clientAlbumKeys, useAdminAlbumStorage } from '@/hooks/useAdminClientAlbums';
import { useUrlState } from '@/hooks/useUrlState';
import { isRateLimitError } from '@/types/api';
import type { AdminAlbumStorage } from '@/types/admin';

const { storageFrom, storageTo, storageAll, storageWorkspace } = CLIENT_ALBUM_URL_KEYS;

type UrlReader = (key: string) => string | undefined;

function readFilters(get: UrlReader) {
  return resolveStorageFilters({
    from: get(storageFrom),
    to: get(storageTo),
    all: get(storageAll),
    workspace: get(storageWorkspace),
  });
}

/**
 * Lượt tính còn nằm trong cache cho đúng bộ lọc trên URL, hoặc null. Màn dùng nó làm giá trị khởi đầu của
 * `run` để quay lại từ trang chi tiết workspace (bấm một dòng của bảng rồi bấm Back) thấy lại kết quả đã
 * tính thay vì trạng thái chờ: kết quả giữ trong cache của hook vô thời hạn, chỉ có `run` là mất khi màn
 * gỡ khỏi cây. Chỉ ĐỌC cache, không bao giờ gọi API: tải lại trang hay dán một link thì cache trống và
 * hàm này trả null.
 */
export function cachedStorageRun(queryClient: QueryClient, get: UrlReader): StorageRun | null {
  const params = storageRequest(readFilters(get));
  const cached = queryClient.getQueryData<AdminAlbumStorage>(clientAlbumKeys.storage(params));
  return cached ? { params } : null;
}

/**
 * Tab "Dung lượng": GB mà album còn sống tạo trong một khoảng ngày đang giữ. Đây là route ĐẮT nhất của
 * module (backend quét mọi ảnh còn sống của album trong khoảng, tối đa 10 lượt mỗi phút), nên CHỈ MỘT
 * lần bấm "Tính dung lượng" mới gọi nó:
 *
 * - Mở tab, tải lại trang, dán một link có sẵn bộ lọc: không có request album nào. Bộ lọc sống trên URL
 *   (`sFrom`, `sTo`, `sAll`, `sWs`) nhưng chỉ là bộ lọc đang soạn. (Ô chọn workspace tự đọc danh sách
 *   workspace của ERP để có gì mà chọn; đó là CSDL của ERP, không phải framevis-drive.)
 * - Sửa bộ lọc không tự tính lại. Kết quả luôn ghi rõ bộ lọc nó đã tính cho, và có dòng nhắc khi bộ lọc
 *   ở trên đã khác.
 * - Bấm lại đúng bộ lọc đang hiện là `refetch`; bấm với bộ lọc khác là một lượt gọi mới. Cả hai đều là một
 *   lần quét mới thật: cache của khóa mới bị xóa trước, nếu không việc quay lại bộ lọc cũ sẽ lặng lẽ trả số
 *   cũ mà không quét gì.
 * - Một lượt tính xin ĐÚNG MỘT LẦN 100 hàng và phân trang ở máy (`StorageTable`), vì mỗi trang của route là
 *   một lần quét lại và tốn một lượt trong hạn mức.
 *
 * Lượt tính gần nhất (`run`) do màn giữ, không phải tab: đổi tab gỡ tab này khỏi cây, và kết quả quay lại từ
 * cache của hook (không bao giờ tự gọi lại) chứ không từ một lượt gọi mới.
 */
export function StorageTab({ run, onRun }: { run: StorageRun | null; onRun: (run: StorageRun) => void }) {
  const { get, set } = useUrlState();
  const queryClient = useQueryClient();

  const filters = readFilters(get);
  const current = storageRequest(filters);

  const query = useAdminAlbumStorage(run?.params ?? null);
  // Nút khóa theo `isFetching`, không theo `isLoading`: bấm lại giữ số cũ trong lúc tính nên `isLoading` là false.
  const busy = query.isFetching;
  const filtersChanged = !!run && !sameStorageRequest(run.params, current);

  function compute(workspaceLabel?: string) {
    if (busy) return;
    if (run && sameStorageRequest(run.params, current)) {
      void query.refetch();
      return;
    }
    queryClient.removeQueries({ queryKey: clientAlbumKeys.storage(current), exact: true });
    onRun({ params: current, workspaceLabel });
  }

  // 429: toast chung của app đã giải thích rồi, không thêm một khung lỗi thứ hai. Nút mở lại ngay.
  const rateLimited = !busy && isRateLimitError(query.error);

  let body: React.ReactNode;
  if (!run || rateLimited) {
    body = (
      <Card>
        <EmptyState
          icon={<HardDrive />}
          title="Chưa tính dung lượng"
          description="Chọn khoảng ngày tạo album và workspace (nếu cần), rồi bấm Tính dung lượng. Kết quả hiện ở đây."
        />
      </Card>
    );
  } else if (busy && (!query.data || query.error)) {
    body = <StorageResultSkeleton />;
  } else if (query.error) {
    body = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  } else if (query.data) {
    body = (
      <StorageResult
        run={run}
        data={query.data}
        updatedAt={query.dataUpdatedAt}
        busy={busy}
        filtersChanged={filtersChanged}
      />
    );
  } else {
    // Đã bấm nhưng chưa có request nào chạy (phiên đăng nhập chưa sẵn sàng): chờ chứ không để trống.
    body = <StorageResultSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <StorageFilterCard
        filters={filters}
        pending={busy}
        onPreset={(preset) => set(presetPatch(preset))}
        onRange={(range) => set(rangePatch(range))}
        onWorkspace={(workspaceId) => set({ [storageWorkspace]: workspaceId })}
        onCompute={compute}
      />
      {body}
    </div>
  );
}
