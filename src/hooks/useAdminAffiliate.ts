'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { PageResponse } from '@/types/api';
import type {
  AdminAffiliateCommissionRow,
  AdminAffiliatePayoutRow,
  AdminAffiliateRate,
  AffiliateCommissionListParams,
  AffiliatePayoutListParams,
  MarkPayoutPaidInput,
  RejectPayoutInput,
  UpdateAffiliateRateInput,
  VoidCommissionInput,
} from '@/types/admin';

export const affiliateKeys = {
  all: ['admin', 'affiliate'] as const,
  payouts: ['admin', 'affiliate', 'payouts'] as const,
  payoutList: (params: AffiliatePayoutListParams) => ['admin', 'affiliate', 'payouts', params] as const,
  commissions: ['admin', 'affiliate', 'commissions'] as const,
  commissionList: (params: AffiliateCommissionListParams) => ['admin', 'affiliate', 'commissions', params] as const,
  rates: ['admin', 'affiliate', 'rates'] as const,
};

/** GET /api/admin/affiliate/payouts: lọc `status`, phân trang server. */
export function useAffiliatePayouts(params: AffiliatePayoutListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: affiliateKeys.payoutList(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminAffiliatePayoutRow>>('/api/admin/affiliate/payouts', { headers, params: { ...params } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/affiliate/commissions: lọc `referrerAccountId` và/hoặc `payoutId`, không lọc theo trạng thái. */
export function useAffiliateCommissions(params: AffiliateCommissionListParams, options: { enabled?: boolean } = {}) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: affiliateKeys.commissionList(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminAffiliateCommissionRow>>('/api/admin/affiliate/commissions', {
        headers,
        params: { ...params },
      }),
    enabled: enabled && (options.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/affiliate/rates: mọi dòng, kể cả đang tắt. */
export function useAffiliateRates() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: affiliateKeys.rates,
    queryFn: () => apiFetch<AdminAffiliateRate[]>('/api/admin/affiliate/rates', { headers }),
    enabled,
  });
}

/**
 * POST …/payouts/{payoutId}/mark-paid: 409 khi yêu cầu không còn `REQUESTED`. Các dòng hoa hồng vẫn
 * giữ `payoutId`, nhưng danh sách hoa hồng vẫn làm mới để không ai thấy dữ liệu trước lúc trả.
 */
export function useMarkPayoutPaid(payoutId: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'affiliate', 'mark-paid', payoutId],
    mutationFn: (input: MarkPayoutPaidInput) =>
      apiFetch<AdminAffiliatePayoutRow>(`/api/admin/affiliate/payouts/${payoutId}/mark-paid`, {
        method: 'POST',
        body: input,
        headers,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: affiliateKeys.payouts });
      void qc.invalidateQueries({ queryKey: affiliateKeys.commissions });
    },
  });
}

/** POST …/payouts/{payoutId}/reject: gỡ `payoutId` khỏi mọi dòng đã gom, chúng trở lại khả dụng. */
export function useRejectPayout(payoutId: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'affiliate', 'reject', payoutId],
    mutationFn: (input: RejectPayoutInput) =>
      apiFetch<AdminAffiliatePayoutRow>(`/api/admin/affiliate/payouts/${payoutId}/reject`, {
        method: 'POST',
        body: input,
        headers,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: affiliateKeys.payouts });
      void qc.invalidateQueries({ queryKey: affiliateKeys.commissions });
    },
  });
}

/** POST …/commissions/{commissionId}/void: 409 khi dòng đã hủy hoặc đã bị một yêu cầu rút gom. */
export function useVoidCommission(commissionId: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'affiliate', 'void', commissionId],
    mutationFn: (input: VoidCommissionInput) =>
      apiFetch<AdminAffiliateCommissionRow>(`/api/admin/affiliate/commissions/${commissionId}/void`, {
        method: 'POST',
        body: input,
        headers,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: affiliateKeys.commissions });
    },
  });
}

/**
 * PUT …/rates/{planCode}: upsert, gói chưa có dòng tỷ lệ thì tạo mới. Không viết lại hoa hồng đã ghi
 * (tỷ lệ là ảnh chụp lúc ghi nhận). Chiết khấu mới cho đơn tạo sau khi lưu; tỷ lệ hoa hồng mới cho mọi
 * đơn thanh toán sau khi lưu, kể cả đơn đã tạo trước.
 */
export function useUpdateAffiliateRate(planCode: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'affiliate', 'rate', planCode],
    mutationFn: (input: UpdateAffiliateRateInput) =>
      apiFetch<AdminAffiliateRate>(`/api/admin/affiliate/rates/${encodeURIComponent(planCode)}`, {
        method: 'PUT',
        body: input,
        headers,
      }),
    onSuccess: (rate) => {
      qc.setQueryData<AdminAffiliateRate[]>(affiliateKeys.rates, (prev) =>
        prev ? (prev.some((r) => r.planCode === rate.planCode) ? prev.map((r) => (r.planCode === rate.planCode ? rate : r)) : [...prev, rate]) : prev,
      );
      void qc.invalidateQueries({ queryKey: affiliateKeys.rates });
    },
  });
}

/**
 * POST …/accounts/{accountId}/disable | enable. Idempotent, 404 khi tài khoản chưa từng có mã. Không
 * endpoint nào trả trạng thái hiện tại của mã nên không có query nào để làm mới.
 */
export function useSetAffiliateCodeEnabled(accountId: string) {
  const { headers } = useAuthHeaders();
  return useMutation({
    mutationKey: ['admin', 'affiliate', 'code', accountId],
    mutationFn: (enabled: boolean) =>
      apiFetch<null>(`/api/admin/affiliate/accounts/${accountId}/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
        headers,
      }),
  });
}
