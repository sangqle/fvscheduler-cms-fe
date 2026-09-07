'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { PageResponse } from '@/types/api';
import type {
  AdminBookingListParams,
  AdminBookingRow,
  AdminBookingSummary,
  AdminBookingSummaryParams,
} from '@/types/admin';

/**
 * Lồng dưới `['admin','workspaces','detail',id]` giống thành viên và lịch sử gói, nên mọi thao tác
 * ghi trên workspace đã invalidate `detail(id)` cũng cuốn theo booking mà không phải khai thêm.
 */
export const bookingKeys = {
  list: (workspaceId: string, params: AdminBookingListParams) =>
    ['admin', 'workspaces', 'detail', workspaceId, 'bookings', params] as const,
  summary: (workspaceId: string, params: AdminBookingSummaryParams) =>
    ['admin', 'workspaces', 'detail', workspaceId, 'bookings', 'summary', params] as const,
};

/**
 * GET /api/admin/workspaces/{id}/bookings.
 *
 * Route nằm dưới `/workspaces/{id}/` là **cố ý**, không phải cho đẹp: đúng hình dạng đường dẫn đó
 * mới khiến backend giải mã id và đặt `TenantContext` — sàn tenant của lượt đọc.
 *
 * Mỗi dòng hai nửa. `booking` là `BookingResponse` của tenant nguyên văn, dựng bằng đúng cái mapper
 * ERP của studio gọi, nên CMS soi lại chính thứ chủ workspace nhìn thấy; `admin` là overlay chỉ CMS
 * mới có. Không cắt bỏ gì cả: đối chiếu một workspace với thứ chủ nó thấy thì không làm được từ một
 * bản đã bôi đen.
 */
export function useAdminBookings(workspaceId: string, params: AdminBookingListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: bookingKeys.list(workspaceId, params),
    queryFn: () =>
      apiFetch<PageResponse<AdminBookingRow>>(`/api/admin/workspaces/${workspaceId}/bookings`, {
        headers,
        params: { ...params },
      }),
    enabled: enabled && !!workspaceId,
    placeholderData: keepPreviousData,
  });
}

/**
 * GET /api/admin/workspaces/{id}/bookings/summary: đếm cả workspace trong một lời gọi, thay cho
 * việc lật hết từng trang danh sách để cộng.
 *
 * Chỉ nhận cửa sổ `startAt`, không nhận `status`: response đã nhóm THEO status, lọc theo một cái
 * thì còn đúng một xô và một `total` không còn nghĩa gì.
 */
export function useAdminBookingSummary(workspaceId: string, params: AdminBookingSummaryParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: bookingKeys.summary(workspaceId, params),
    queryFn: () =>
      apiFetch<AdminBookingSummary>(`/api/admin/workspaces/${workspaceId}/bookings/summary`, {
        headers,
        params: { ...params },
      }),
    enabled: enabled && !!workspaceId,
    placeholderData: keepPreviousData,
  });
}
