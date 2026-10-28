'use client';

import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import { workspaceKeys } from '@/hooks/useAdminWorkspaces';
import type { PageResponse } from '@/types/api';
import type {
  AdminAlbumMonthly,
  AdminAlbumMonthlyParams,
  AdminAlbumStorage,
  AdminAlbumStorageParams,
  AdminAlbumWorkspaceCountRow,
  AdminAlbumWorkspaceListParams,
  AdminWorkspaceAlbumListParams,
  AdminWorkspaceAlbums,
  AdminWorkspaceAlbumSummary,
} from '@/types/admin';

/**
 * Mỗi lượt gọi là một lượt hỏi framevis-drive. Backend chờ nó tới 30 giây (cộng 5 giây nối máy) rồi
 * mới trả 503, dài hơn mặc định 30 giây của `apiFetch`; không nới thì trình duyệt bỏ cuộc trước khi
 * backend kịp báo lỗi thật. Cả năm hook cũng đặt `retry: false`: bộ retry toàn app (thêm hai lần) sẽ
 * kéo lượt chờ quá một phút trước khi lỗi hiện ra, và một 503 là framevis-drive đang không trả lời nên
 * thử lại ngay cũng không giúp được gì. Thử lại là nút "Thử lại" của khung lỗi.
 */
const ALBUM_STATS_TIMEOUT_MS = 45_000;

export const clientAlbumKeys = {
  /** Gốc của ba route toàn nền tảng. */
  all: ['admin', 'client-albums'] as const,
  monthly: (params: AdminAlbumMonthlyParams) => ['admin', 'client-albums', 'monthly', params] as const,
  workspaces: (params: AdminAlbumWorkspaceListParams) => ['admin', 'client-albums', 'workspaces', params] as const,
  storage: (params: AdminAlbumStorageParams | null) => ['admin', 'client-albums', 'storage', params] as const,
  /**
   * Hai route của một workspace lồng dưới `workspaceKeys.detail(id)` giống `bookingKeys`, nên mọi thao
   * tác ghi đã invalidate `detail(id)` cũng cuốn theo hai query này mà không phải khai thêm.
   */
  workspaceSummary: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'client-albums', 'summary'] as const,
  workspaceAlbums: (workspaceId: string, params: AdminWorkspaceAlbumListParams) =>
    [...workspaceKeys.detail(workspaceId), 'client-albums', 'list', params] as const,
};

/**
 * GET /api/admin/client-albums/monthly: album tạo mỗi tháng, một lượt gọi rẻ. Đếm SỰ KIỆN TẠO, nên một
 * album tạo rồi xóa vẫn nằm trong tháng tạo (và trong `deleted`).
 *
 * `{}` là 12 tháng gần nhất do backend định nghĩa theo giờ Việt Nam; chỉ truyền `fromMonth`/`toMonth`
 * sau khi admin đổi khoảng. Đổi khoảng giữ bảng cũ (`isPlaceholderData`) tới khi bảng mới về.
 */
export function useAdminAlbumMonthly(params: AdminAlbumMonthlyParams = {}) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: clientAlbumKeys.monthly(params),
    queryFn: () =>
      apiFetch<AdminAlbumMonthly>('/api/admin/client-albums/monthly', {
        headers,
        params: { ...params },
        timeoutMs: ALBUM_STATS_TIMEOUT_MS,
      }),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * GET /api/admin/client-albums/workspaces: workspace nào đã tạo album trong khoảng, nhiều album nhất
 * trước, kể cả dòng `workspace: null` ("không thuộc workspace"). Cũng đếm sự kiện tạo. `totalElements`
 * là số nhóm (workspace cộng dòng không-thuộc-workspace), không phải số album.
 *
 * `options.enabled: false` cho tháng không có album nào (hiện trạng thái rỗng, không gọi route); khi
 * đó `data` là undefined chứ không mượn hàng của tháng trước. Đổi giữa hai tháng đều có album thì giữ
 * hàng của tháng cũ (`isPlaceholderData`) tới khi tháng mới về: panel nên mờ đi chứ không để số của
 * tháng cũ đứng dưới tiêu đề tháng mới như thể là của nó.
 */
export function useAdminAlbumWorkspaces(
  params: AdminAlbumWorkspaceListParams,
  options: { enabled?: boolean } = {},
) {
  const { headers, enabled } = useAuthHeaders();
  const active = options.enabled ?? true;
  return useQuery({
    queryKey: clientAlbumKeys.workspaces(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminAlbumWorkspaceCountRow>>('/api/admin/client-albums/workspaces', {
        headers,
        params: { ...params },
        timeoutMs: ALBUM_STATS_TIMEOUT_MS,
      }),
    enabled: enabled && active,
    retry: false,
    placeholderData: active ? keepPreviousData : undefined,
  });
}

/**
 * GET /api/admin/client-albums/storage: dung lượng của album CÒN SỐNG tạo trong khoảng, theo từng
 * workspace, nặng nhất trước. Là route ĐẮT nhất của module (backend quét mọi ảnh còn sống), giới hạn
 * 10 lượt mỗi phút, nên hook này chỉ chạy khi nơi gọi CHỦ ĐỘNG đưa `params` vào:
 *
 * - `params === null` là trạng thái chờ, trước lần bấm "Tính dung lượng" đầu tiên: `skipToken` tắt query
 *   nên không có request nào. Đừng gọi `refetch()` ở trạng thái này: nó không phải no-op mà bị từ chối với
 *   "Missing queryFn" (và đẩy khóa chờ sang trạng thái lỗi). Ở trạng thái chờ `isPending` vẫn là true,
 *   nên khung xương phải dựa vào `isLoading` (đang tải thật, chưa có dữ liệu), không dựa vào
 *   `isPending`. Nút bị khóa thì dựa vào `isFetching`, vì lượt `refetch()` giữ dữ liệu cũ nên
 *   `isLoading` là false trong lúc đó.
 * - Đưa `params` mới vào (bấm với bộ lọc khác) là một lượt gọi mới. Bấm lại đúng bộ lọc cũ thì khóa
 *   không đổi nên không có gì xảy ra: gọi `refetch()`, cũng là cách "Thử lại" của khung lỗi.
 * - Chỉ một lần bấm mới quét: `staleTime: 'static'` khiến query không bao giờ bị coi là cũ, nên không có
 *   lượt gọi lại nào khi mount lại (đổi tab), khi cửa sổ lấy lại focus hay mạng về. Đang mở thì
 *   `invalidateQueries()` và `refetchQueries()` cũng không refetch nó, kể cả lệnh không bộ lọc mà
 *   `UnauthorizedGuard` chạy sau khi tự làm mới token. `staleTime: Infinity` không đủ: invalidate vẫn
 *   refetch query đang mở bất kể staleTime. Query đang lỗi cũng không tự thử lại khi mount lại
 *   (`retryOnMount: false`). Chỉ `refetch()` gọi tay (bấm lại đúng bộ lọc cũ, nút "Thử lại") mới quét
 *   lại. Kết quả giữ trong cache vô thời hạn (`gcTime: Infinity`), nên mount lại với cùng `params` đọc
 *   từ cache chứ không gọi.
 * - Không dùng `keepPreviousData`: hàng của lượt trước không được mượn tạm cho một khoảng khác.
 *
 * Nên xin `{ ...bộLọc, page: 0, size: ALBUM_STORAGE_ROW_LIMIT }` đúng một lần rồi phân trang ở máy, vì
 * mỗi trang là một lần quét lại toàn bộ. Cũng không được đổi `staleTime: 'static'` sang `Infinity` hay
 * một số, và không thao tác nào nên invalidate `clientAlbumKeys.all` hay khóa này: với staleTime khác,
 * invalidate là refetch ngay, tức một lần quét ngoài ý muốn.
 */
export function useAdminAlbumStorage(params: AdminAlbumStorageParams | null) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: clientAlbumKeys.storage(params),
    queryFn: params
      ? () =>
          apiFetch<AdminAlbumStorage>('/api/admin/client-albums/storage', {
            headers,
            params: { ...params },
            timeoutMs: ALBUM_STATS_TIMEOUT_MS,
          })
      : skipToken,
    enabled,
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // 'static', không phải Infinity: chỉ 'static' làm invalidateQueries/refetchQueries bỏ qua query này.
    staleTime: 'static',
    gcTime: Infinity,
  });
}

/**
 * GET /api/admin/workspaces/{id}/client-albums/summary: số liệu album của một workspace, cho ô "Album
 * khách" ở Thống kê nhanh và dòng quota `ALBUMS_PER_MONTH` (`createdThisMonth`).
 *
 * Cố ý là query riêng, không đi chung với chi tiết workspace: route chi tiết không bao giờ gọi
 * framevis-drive, nên trang và các con số khác không phải chờ route này, và nó lỗi thì chỉ mất đúng
 * thẻ của nó. Đường dẫn phải nằm dưới `/workspaces/{id}/` (backend chỉ giải mã id và đặt
 * `TenantContext` đúng hình dạng đó). Workspace chưa từng tạo album trả các số 0, không phải 404.
 */
export function useAdminWorkspaceAlbumSummary(workspaceId: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: clientAlbumKeys.workspaceSummary(workspaceId),
    queryFn: () =>
      apiFetch<AdminWorkspaceAlbumSummary>(`/api/admin/workspaces/${workspaceId}/client-albums/summary`, {
        headers,
        timeoutMs: ALBUM_STATS_TIMEOUT_MS,
      }),
    enabled: enabled && !!workspaceId,
    retry: false,
  });
}

/**
 * GET /api/admin/workspaces/{id}/client-albums: album CÒN SỐNG của một workspace, mới nhất trước
 * (thứ tự cố định, không có tham số sắp xếp), kèm `totals` của cả khoảng. Chạy khi tab Album khách mở,
 * không cần nút bấm vì một workspace là rẻ. Mất kết nối với framevis-drive (503) chỉ làm hỏng tab này.
 */
export function useAdminWorkspaceAlbums(workspaceId: string, params: AdminWorkspaceAlbumListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: clientAlbumKeys.workspaceAlbums(workspaceId, params),
    queryFn: () =>
      apiFetch<AdminWorkspaceAlbums>(`/api/admin/workspaces/${workspaceId}/client-albums`, {
        headers,
        params: { ...params },
        timeoutMs: ALBUM_STATS_TIMEOUT_MS,
      }),
    enabled: enabled && !!workspaceId,
    retry: false,
    placeholderData: keepPreviousData,
  });
}
