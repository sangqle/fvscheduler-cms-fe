'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { AdminPlan } from '@/types/admin';

export const planKeys = { all: ['admin', 'plans'] as const };

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
