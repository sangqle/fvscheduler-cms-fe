'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import { workspaceKeys } from '@/hooks/useAdminWorkspaces';
import type {
  AdjustSubscriptionInput,
  AdminSubscriptionRow,
  CancelSubscriptionInput,
  GrantSubscriptionInput,
} from '@/types/admin';

export const subscriptionKeys = {
  history: (workspaceId: string) => ['admin', 'workspaces', 'detail', workspaceId, 'subscriptions'] as const,
};

/** GET .../subscriptions: mảng phẳng, mới nhất trước, không có id dòng. */
export function useAdminSubscriptionHistory(workspaceId: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: subscriptionKeys.history(workspaceId),
    queryFn: () =>
      apiFetch<AdminSubscriptionRow[]>(`/api/admin/workspaces/${workspaceId}/subscriptions`, { headers }),
    enabled: enabled && !!workspaceId,
  });
}

/** Sau mỗi thao tác ghi: detail + lịch sử + list đều đổi trạng thái gói. */
function useInvalidateWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    void qc.invalidateQueries({ queryKey: ['admin', 'workspaces', 'list'] });
  };
}

/** POST .../subscriptions (201): đóng dòng live rồi chèn dòng mới. */
export function useGrantSubscription(workspaceId: string) {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationKey: ['admin', 'subscription', 'grant', workspaceId],
    mutationFn: (input: GrantSubscriptionInput) =>
      apiFetch<AdminSubscriptionRow>(`/api/admin/workspaces/${workspaceId}/subscriptions`, {
        method: 'POST',
        body: input,
        headers,
      }),
    onSuccess: invalidate,
  });
}

/** PATCH .../subscription: chỉ dời expiresAt + note của dòng non-CANCELED mới nhất. */
export function useExtendSubscription(workspaceId: string) {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationKey: ['admin', 'subscription', 'extend', workspaceId],
    mutationFn: (input: AdjustSubscriptionInput) =>
      apiFetch<AdminSubscriptionRow>(`/api/admin/workspaces/${workspaceId}/subscription`, {
        method: 'PATCH',
        body: input,
        headers,
      }),
    onSuccess: invalidate,
  });
}

/** POST .../subscription/cancel: workspace về NONE ngay lập tức. */
export function useCancelSubscription(workspaceId: string) {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationKey: ['admin', 'subscription', 'cancel', workspaceId],
    mutationFn: (input: CancelSubscriptionInput) =>
      apiFetch<AdminSubscriptionRow>(`/api/admin/workspaces/${workspaceId}/subscription/cancel`, {
        method: 'POST',
        body: input,
        headers,
      }),
    onSuccess: invalidate,
  });
}
