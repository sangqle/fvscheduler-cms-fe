'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type {
  AdminPlan,
  AdminPlanDetail,
  CreatePlanInput,
  PlanCompositionInput,
  UpdatePlanInput,
} from '@/types/admin';

export const planKeys = {
  all: ['admin', 'plans'] as const,
  detail: (code: string) => ['admin', 'plans', 'detail', code] as const,
};

/** GET /api/admin/plans: catalog gói, gồm cả gói ngừng bán; sắp theo mã. */
export function useAdminPlans() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: planKeys.all,
    queryFn: async () => {
      const plans = await apiFetch<AdminPlan[]>('/api/admin/plans', { headers });
      return [...plans].sort((a, b) => a.code.localeCompare(b.code));
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** GET /api/admin/plans/{code}: định nghĩa đầy đủ (groups / items đã resolve / limits / usage). */
export function useAdminPlan(code: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: planKeys.detail(code),
    queryFn: () => apiFetch<AdminPlanDetail>(`/api/admin/plans/${code}`, { headers }),
    enabled: enabled && !!code,
  });
}

/**
 * Mọi thao tác ghi catalog đều đổi danh sách gói (và gián tiếp filter "Gói" ở /workspaces),
 * nên list luôn phải làm mới; detail thì chỉ gói vừa ghi.
 */
function useInvalidatePlans() {
  const qc = useQueryClient();
  return (code?: string) => {
    void qc.invalidateQueries({ queryKey: planKeys.all });
    if (code) void qc.invalidateQueries({ queryKey: planKeys.detail(code) });
  };
}

/** POST /api/admin/plans (201): gói mới, children rỗng. Nên tạo với `isActive=false`. */
export function useCreatePlan() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationKey: ['admin', 'plans', 'create'],
    mutationFn: (input: CreatePlanInput) =>
      apiFetch<AdminPlanDetail>('/api/admin/plans', { method: 'POST', body: input, headers }),
    onSuccess: (plan) => invalidate(plan.code),
  });
}

/**
 * PUT /api/admin/plans/{code}: chỉ 4 trường lõi + giá; groups/items/limits không đụng tới.
 * Nhận `code` trong biến thể chứ không khoá theo hook, để một bảng nhiều hàng bật/tắt bán được
 * bằng **một** mutation dùng chung (`variables.code` cho biết hàng nào đang chạy).
 */
export function useUpdatePlan() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationKey: ['admin', 'plans', 'update'],
    mutationFn: ({ code, input }: { code: string; input: UpdatePlanInput }) =>
      apiFetch<AdminPlanDetail>(`/api/admin/plans/${code}`, { method: 'PUT', body: input, headers }),
    onSuccess: (plan) => invalidate(plan.code),
  });
}

/** DELETE /api/admin/plans/{code} (204): xóa cả limits, item link và group link của gói. */
export function useDeletePlan() {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'plans', 'delete'],
    mutationFn: (code: string) =>
      apiFetch<void>(`/api/admin/plans/${code}`, { method: 'DELETE', headers }),
    onSuccess: (_data, code) => {
      qc.removeQueries({ queryKey: planKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

/** PUT /api/admin/plans/{code}/composition: thay TOÀN BỘ nhóm + ghi đè item + limits một lần. */
export function useReplaceComposition(code: string) {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationKey: ['admin', 'plans', 'composition', code],
    mutationFn: (input: PlanCompositionInput) =>
      apiFetch<AdminPlanDetail>(`/api/admin/plans/${code}/composition`, {
        method: 'PUT',
        body: input,
        headers,
      }),
    onSuccess: () => invalidate(code),
  });
}
