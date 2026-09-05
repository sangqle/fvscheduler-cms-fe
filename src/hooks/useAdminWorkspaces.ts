'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { PageResponse } from '@/types/api';
import type {
  AdminMembership,
  AdminMembershipListParams,
  AdminWorkspaceDetail,
  AdminWorkspaceListParams,
  AdminWorkspaceRow,
} from '@/types/admin';

export const workspaceKeys = {
  all: ['admin', 'workspaces'] as const,
  list: (params: AdminWorkspaceListParams) => ['admin', 'workspaces', 'list', params] as const,
  detail: (id: string) => ['admin', 'workspaces', 'detail', id] as const,
  members: (id: string, params: AdminMembershipListParams) =>
    ['admin', 'workspaces', 'detail', id, 'members', params] as const,
};

/** GET /api/admin/workspaces: list xuyên tenant, filter q/type/subscriptionStatus/planCode. */
export function useAdminWorkspaces(params: AdminWorkspaceListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: workspaceKeys.list(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminWorkspaceRow>>('/api/admin/workspaces', {
        headers,
        params: { ...params },
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/workspaces/{id}: 404 khi id sai/đã xoá (backend không tiết lộ id). */
export function useAdminWorkspace(workspaceId: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => apiFetch<AdminWorkspaceDetail>(`/api/admin/workspaces/${workspaceId}`, { headers }),
    enabled: enabled && !!workspaceId,
  });
}

/** GET /api/admin/workspaces/{id}/memberships: cùng shape MembershipResponse của ERP. */
export function useAdminMemberships(workspaceId: string, params: AdminMembershipListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId, params),
    queryFn: () =>
      apiFetch<PageResponse<AdminMembership>>(`/api/admin/workspaces/${workspaceId}/memberships`, {
        headers,
        params: { ...params },
      }),
    enabled: enabled && !!workspaceId,
    placeholderData: keepPreviousData,
  });
}
