'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import { planKeys } from '@/hooks/useAdminPlans';
import type {
  AdminCatalogGroup,
  AdminCatalogItem,
  AdminFeatureKey,
  AdminLimitKey,
  CreateItemInput,
  UpdateItemInput,
} from '@/types/admin';

export const catalogKeys = {
  groups: ['admin', 'catalog', 'groups'] as const,
  items: ['admin', 'catalog', 'items'] as const,
  featureKeys: ['admin', 'catalog', 'feature-keys'] as const,
  limitKeys: ['admin', 'catalog', 'limit-keys'] as const,
};

/** Khóa hệ thống và danh mục đổi rất chậm; 5 phút là đủ để một phiên soạn gói không gọi lại liên tục. */
const CATALOG_STALE_MS = 5 * 60_000;

/** GET /api/admin/catalog/groups: nhóm kèm item con. Nhóm không có CRUD, chỉ đọc. */
export function useCatalogGroups() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: catalogKeys.groups,
    queryFn: () => apiFetch<AdminCatalogGroup[]>('/api/admin/catalog/groups', { headers }),
    enabled,
    staleTime: CATALOG_STALE_MS,
  });
}

/** GET /api/admin/catalog/items: mọi item kể cả đã tắt, sắp theo sort nhóm rồi sort item. */
export function useCatalogItems() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: catalogKeys.items,
    queryFn: () => apiFetch<AdminCatalogItem[]>('/api/admin/catalog/items', { headers }),
    enabled,
    staleTime: CATALOG_STALE_MS,
  });
}

/** GET /api/admin/catalog/feature-keys: danh sách khóa cố định + số item đang mang khóa (tính lúc đọc). */
export function useFeatureKeys() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: catalogKeys.featureKeys,
    queryFn: () => apiFetch<AdminFeatureKey[]>('/api/admin/catalog/feature-keys', { headers }),
    enabled,
    staleTime: CATALOG_STALE_MS,
  });
}

/** GET /api/admin/catalog/limit-keys: danh sách khóa giới hạn cố định, thêm khóa phải sửa backend. */
export function useLimitKeys() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: catalogKeys.limitKeys,
    queryFn: () => apiFetch<AdminLimitKey[]>('/api/admin/catalog/limit-keys', { headers }),
    enabled,
    staleTime: CATALOG_STALE_MS,
  });
}

/**
 * Ghi một item ảnh hưởng MỌI gói mang nhóm của nó (backend evict cache của tất cả gói), nên
 * làm mới luôn danh sách gói và mọi detail gói đang giữ trong cache, không chỉ danh mục item.
 */
function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: catalogKeys.items });
    void qc.invalidateQueries({ queryKey: catalogKeys.groups });
    void qc.invalidateQueries({ queryKey: catalogKeys.featureKeys });
    void qc.invalidateQueries({ queryKey: planKeys.all });
  };
}

/** POST /api/admin/catalog/items (201). */
export function useCreateItem() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationKey: ['admin', 'catalog', 'items', 'create'],
    mutationFn: (input: CreateItemInput) =>
      apiFetch<AdminCatalogItem>('/api/admin/catalog/items', { method: 'POST', body: input, headers }),
    onSuccess: invalidate,
  });
}

/** PUT /api/admin/catalog/items/{code}: đổi được cả `groupCode`, item nhảy nhóm ngay. */
export function useUpdateItem() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationKey: ['admin', 'catalog', 'items', 'update'],
    mutationFn: ({ code, input }: { code: string; input: UpdateItemInput }) =>
      apiFetch<AdminCatalogItem>(`/api/admin/catalog/items/${code}`, {
        method: 'PUT',
        body: input,
        headers,
      }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/admin/catalog/items/{code} (204). */
export function useDeleteItem() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationKey: ['admin', 'catalog', 'items', 'delete'],
    mutationFn: (code: string) =>
      apiFetch<void>(`/api/admin/catalog/items/${code}`, { method: 'DELETE', headers }),
    onSuccess: invalidate,
  });
}
