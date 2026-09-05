'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { PageResponse } from '@/types/api';
import type { AdminOrderDetail, AdminOrderListParams, AdminOrderRow, MarkPaidInput, MarkPaidResult } from '@/types/admin';

export const orderKeys = {
  all: ['admin', 'orders'] as const,
  list: (params: AdminOrderListParams) => ['admin', 'orders', 'list', params] as const,
  detail: (code: string) => ['admin', 'orders', 'detail', code] as const,
};

/** GET /api/admin/orders: filter status/q/workspaceId (workspaceId là query, không phải path). */
export function useAdminOrders(params: AdminOrderListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminOrderRow>>('/api/admin/orders', { headers, params: { ...params } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/orders/{orderCode}: có thêm rawPayload + createdBy. */
export function useAdminOrder(orderCode: string | null) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: orderKeys.detail(orderCode ?? ''),
    queryFn: () => apiFetch<AdminOrderDetail>(`/api/admin/orders/${orderCode}`, { headers }),
    enabled: enabled && !!orderCode,
  });
}

/** POST /api/admin/orders/{orderCode}/mark-paid: 409 khi đơn không payable / gói ngừng bán. */
export function useMarkPaid(orderCode: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'orders', 'mark-paid', orderCode],
    mutationFn: (input: MarkPaidInput) =>
      apiFetch<MarkPaidResult>(`/api/admin/orders/${orderCode}/mark-paid`, { method: 'POST', body: input, headers }),
    onSuccess: (result) => {
      qc.setQueryData(orderKeys.detail(orderCode), result.order);
      void qc.invalidateQueries({ queryKey: ['admin', 'orders', 'list'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
    },
  });
}
