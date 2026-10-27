'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import { ApiError, type PageResponse } from '@/types/api';
import type {
  AdminCoupon,
  AdminCouponListParams,
  AdminCouponRedemptionRow,
  CouponRedemptionListParams,
  CreateCouponInput,
  UpdateCouponInput,
} from '@/types/admin';

export const couponKeys = {
  all: ['admin', 'coupons'] as const,
  lists: ['admin', 'coupons', 'list'] as const,
  list: (params: AdminCouponListParams) => ['admin', 'coupons', 'list', params] as const,
  detail: (code: string) => ['admin', 'coupons', 'detail', code] as const,
  redemptions: (code: string) => ['admin', 'coupons', 'redemptions', code] as const,
  redemptionList: (code: string, params: CouponRedemptionListParams) =>
    ['admin', 'coupons', 'redemptions', code, params] as const,
};

/** GET /api/admin/coupons: lọc `status` và tiền tố mã `q` ngay trong query, kèm bộ đếm từng mã. */
export function useAdminCoupons(params: AdminCouponListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: couponKeys.list(params),
    queryFn: () => apiFetch<PageResponse<AdminCoupon>>('/api/admin/coupons', { headers, params: { ...params } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/coupons/{code}: backend đọc mã như mã gõ tay (trim, viết hoa); 404 khi không có. */
export function useAdminCoupon(code: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: couponKeys.detail(code),
    queryFn: () => apiFetch<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(code)}`, { headers }),
    enabled: enabled && !!code,
  });
}

/** GET /api/admin/coupons/{code}/redemptions: mỗi workspace từng giữ chỗ hay dùng mã là một dòng, mọi trạng thái. */
export function useCouponRedemptions(code: string, params: CouponRedemptionListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: couponKeys.redemptionList(code, params),
    queryFn: () =>
      apiFetch<PageResponse<AdminCouponRedemptionRow>>(`/api/admin/coupons/${encodeURIComponent(code)}/redemptions`, {
        headers,
        params: { ...params },
      }),
    enabled: enabled && !!code,
    placeholderData: keepPreviousData,
  });
}

/** POST /api/admin/coupons: 201 kèm mã mới (bộ đếm 0); 409 khi trùng mã. */
export function useCreateCoupon() {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'coupons', 'create'],
    mutationFn: (input: CreateCouponInput) =>
      apiFetch<AdminCoupon>('/api/admin/coupons', { method: 'POST', body: input, headers }),
    onSuccess: (coupon) => {
      qc.setQueryData(couponKeys.detail(coupon.code), coupon);
      void qc.invalidateQueries({ queryKey: couponKeys.lists });
    },
  });
}

/** 404 khi ghi: mã đã bị xóa ở nơi khác, làm mới để màn chi tiết và danh sách thôi hiện nó. */
function useRefreshOnNotFound() {
  const qc = useQueryClient();
  return (error: unknown, code: string) => {
    if (!(error instanceof ApiError) || error.status !== 404) return;
    void qc.invalidateQueries({ queryKey: couponKeys.detail(code) });
    void qc.invalidateQueries({ queryKey: couponKeys.lists });
  };
}

/**
 * PUT /api/admin/coupons/{code}: thay mọi trường sửa được, kể cả bật / tắt. Chỉ ảnh hưởng đơn tạo sau
 * khi lưu; 409 khi hạ trần xuống dưới số chỗ đang chiếm. Thân trả về là đúng bản GET detail (kèm bộ
 * đếm), nên ghi thẳng vào cache detail thay vì gọi lại.
 */
export function useUpdateCoupon() {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  const refreshOnNotFound = useRefreshOnNotFound();
  return useMutation({
    mutationKey: ['admin', 'coupons', 'update'],
    mutationFn: ({ code, input }: { code: string; input: UpdateCouponInput }) =>
      apiFetch<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(code)}`, { method: 'PUT', body: input, headers }),
    onSuccess: (coupon) => {
      qc.setQueryData(couponKeys.detail(coupon.code), coupon);
      void qc.invalidateQueries({ queryKey: couponKeys.lists });
      void qc.invalidateQueries({ queryKey: couponKeys.redemptions(coupon.code) });
    },
    onError: (e, { code }) => refreshOnNotFound(e, code),
  });
}

/** DELETE /api/admin/coupons/{code}: 204 chỉ khi chưa workspace nào từng giữ chỗ hay dùng mã, còn lại 409. */
export function useDeleteCoupon() {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  const refreshOnNotFound = useRefreshOnNotFound();
  return useMutation({
    mutationKey: ['admin', 'coupons', 'delete'],
    mutationFn: (code: string) =>
      apiFetch<void>(`/api/admin/coupons/${encodeURIComponent(code)}`, { method: 'DELETE', headers }),
    onSuccess: (_data, code) => {
      // Màn chi tiết vẫn mount tới khi chuyển trang xong. Gỡ query khỏi cache thì lần render kế tiếp dựng
      // query rỗng, hiện khung xương và gọi lại hai GET ra 404; nên chỉ đánh dấu cũ mà không refetch, gc
      // dọn sau khi rời màn, còn ghé lại thì refetch và gặp 404 đúng như mong đợi.
      void qc.cancelQueries({ queryKey: couponKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: couponKeys.detail(code), refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: couponKeys.redemptions(code), refetchType: 'none' });
      // Bỏ dòng khỏi các trang danh sách đang cache, để `/coupons` không hiện lại mã vừa xóa trong lúc refetch.
      qc.setQueriesData<PageResponse<AdminCoupon>>({ queryKey: couponKeys.lists }, (old) =>
        old
          ? {
              ...old,
              content: old.content.filter((c) => c.code !== code),
              totalElements: Math.max(0, old.totalElements - 1),
            }
          : old,
      );
      void qc.invalidateQueries({ queryKey: couponKeys.lists });
    },
    onError: (e, code) => refreshOnNotFound(e, code),
  });
}
