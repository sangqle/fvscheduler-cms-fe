'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import { isCampaignLive } from '@/lib/admin/mail';
import type { PageResponse } from '@/types/api';
import type {
  AdminMailCampaignDetail,
  AdminMailCampaignRow,
  AdminMailMessageListParams,
  AdminMailMessageRow,
  AdminMailTemplate,
  AdminMailTemplateListParams,
  AdminMailTemplateRow,
  AdminMailTemplateVersion,
  AdminMailVariableGroup,
  CampaignActionResult,
  CreateCampaignInput,
  CreateCampaignResult,
  MailContextInput,
  MailPreviewResult,
  MailTemplateInput,
  MailTestSendInput,
  MailTestSendResult,
} from '@/types/admin';

export const mailKeys = {
  all: ['admin', 'mail'] as const,
  templates: (params: AdminMailTemplateListParams) => ['admin', 'mail', 'templates', params] as const,
  template: (code: string) => ['admin', 'mail', 'template', code] as const,
  versions: (code: string) => ['admin', 'mail', 'template', code, 'versions'] as const,
  variables: ['admin', 'mail', 'variables'] as const,
  campaigns: (page: number, size: number) => ['admin', 'mail', 'campaigns', page, size] as const,
  campaign: (code: string) => ['admin', 'mail', 'campaign', code] as const,
  messages: (params: AdminMailMessageListParams) => ['admin', 'mail', 'messages', params] as const,
};

// ─── Template ────────────────────────────────────────────────────────────────

/** GET /api/admin/mail/templates: chỉ metadata, nội dung nằm ở endpoint chi tiết. */
export function useMailTemplates(
  params: AdminMailTemplateListParams = {},
  /** Hoãn tải khi danh sách chỉ cần lúc mở dialog: dialog đóng vẫn mount nên mặc định sẽ gọi thừa. */
  options: { enabled?: boolean } = {},
) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.templates(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminMailTemplateRow>>('/api/admin/mail/templates', {
        headers,
        params: { size: 100, ...params },
      }),
    enabled: enabled && options.enabled !== false,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/admin/mail/templates/{code}: metadata + nội dung bản đang phát hành. */
export function useMailTemplate(code: string | null) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.template(code ?? ''),
    queryFn: () => apiFetch<AdminMailTemplate>(`/api/admin/mail/templates/${code}`, { headers }),
    enabled: enabled && !!code,
  });
}

/** GET /api/admin/mail/templates/{code}/versions: mới nhất trước, bản đã phát hành là bất biến. */
export function useMailTemplateVersions(code: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.versions(code),
    queryFn: () =>
      apiFetch<AdminMailTemplateVersion[]>(`/api/admin/mail/templates/${code}/versions`, { headers }),
    enabled: enabled && !!code,
  });
}

/** GET /api/admin/mail/variables: catalog biến (nhóm → tên, mô tả, giá trị mẫu). */
export function useMailVariables() {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.variables,
    queryFn: () => apiFetch<AdminMailVariableGroup[]>('/api/admin/mail/variables', { headers }),
    enabled,
    staleTime: 30 * 60_000,
  });
}

function useInvalidateTemplates() {
  const qc = useQueryClient();
  return (code?: string) => {
    void qc.invalidateQueries({ queryKey: ['admin', 'mail', 'templates'] });
    if (code) {
      void qc.invalidateQueries({ queryKey: mailKeys.template(code) });
      void qc.invalidateQueries({ queryKey: mailKeys.versions(code) });
    }
  };
}

/** POST /api/admin/mail/templates (201): 409 trùng code, 422 biến sai hoặc cú pháp hỏng. */
export function useCreateMailTemplate() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationKey: ['admin', 'mail', 'template', 'create'],
    mutationFn: (input: MailTemplateInput) =>
      apiFetch<AdminMailTemplate>('/api/admin/mail/templates', { method: 'POST', body: input, headers }),
    onSuccess: (t) => invalidate(t.code),
  });
}

/** PUT /api/admin/mail/templates/{code}: sinh version mới; 409 khi có người lưu trước. */
export function useUpdateMailTemplate() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationKey: ['admin', 'mail', 'template', 'update'],
    mutationFn: ({ code, input }: { code: string; input: MailTemplateInput }) =>
      apiFetch<AdminMailTemplate>(`/api/admin/mail/templates/${code}`, { method: 'PUT', body: input, headers }),
    onSuccess: (t) => invalidate(t.code),
  });
}

/**
 * PATCH /api/admin/mail/templates/{code}/active. Nhận `code` trong biến thể chứ không khoá theo
 * hook, để cả bảng bật/tắt bằng **một** mutation (`variables.code` cho biết hàng nào đang chạy).
 */
export function useSetMailTemplateActive() {
  const { headers } = useAuthHeaders();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationKey: ['admin', 'mail', 'template', 'active'],
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      apiFetch<AdminMailTemplate>(`/api/admin/mail/templates/${code}/active`, {
        method: 'PATCH',
        body: { active },
        headers,
      }),
    onSuccess: (t) => invalidate(t.code),
  });
}

/**
 * POST /api/admin/mail/templates/{code}/preview: render **bản đang phát hành**, không gửi gì và
 * không thấy được thay đổi chưa lưu.
 */
export function useMailPreview(code: string) {
  const { headers } = useAuthHeaders();
  return useMutation({
    mutationKey: ['admin', 'mail', 'template', 'preview', code],
    mutationFn: (input: MailContextInput) =>
      apiFetch<MailPreviewResult>(`/api/admin/mail/templates/${code}/preview`, {
        method: 'POST',
        body: input,
        headers,
      }),
  });
}

/** POST /api/admin/mail/templates/{code}/test-send: một địa chỉ, đi thẳng không qua outbox. */
export function useMailTestSend(code: string) {
  const { headers } = useAuthHeaders();
  return useMutation({
    mutationKey: ['admin', 'mail', 'template', 'test-send', code],
    mutationFn: (input: MailTestSendInput) =>
      apiFetch<MailTestSendResult>(`/api/admin/mail/templates/${code}/test-send`, {
        method: 'POST',
        body: input,
        headers,
      }),
  });
}

// ─── Chiến dịch ──────────────────────────────────────────────────────────────

export function useMailCampaigns(page: number, size: number) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.campaigns(page, size),
    queryFn: () =>
      apiFetch<PageResponse<AdminMailCampaignRow>>('/api/admin/mail/campaigns', {
        headers,
        params: { page, size },
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/**
 * GET /api/admin/mail/campaigns/{code}. Worker chạy mỗi 5 giây nên tiến độ tự làm mới khi chiến
 * dịch còn dòng chưa gửi; xong thì thôi hỏi lại.
 */
export function useMailCampaign(campaignCode: string) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.campaign(campaignCode),
    queryFn: () =>
      apiFetch<AdminMailCampaignDetail>(`/api/admin/mail/campaigns/${campaignCode}`, { headers }),
    enabled: enabled && !!campaignCode,
    // Cùng vị từ với chỉ báo "đang theo dõi" trên màn chi tiết, để không có cảnh màn báo số liệu
    // đã chốt trong lúc query vẫn đang tự đọc lại.
    refetchInterval: (query) => {
      const d = query.state.data;
      return d && isCampaignLive(d) ? 5_000 : false;
    },
  });
}

/** POST /api/admin/mail/campaigns: `dryRun` chỉ đếm người nhận, không chèn dòng nào. */
export function useCreateMailCampaign() {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'mail', 'campaign', 'create'],
    mutationFn: (input: CreateCampaignInput) =>
      apiFetch<CreateCampaignResult>('/api/admin/mail/campaigns', { method: 'POST', body: input, headers }),
    onSuccess: (result) => {
      if (result.dryRun) return;
      void qc.invalidateQueries({ queryKey: ['admin', 'mail', 'campaigns'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'mail', 'messages'] });
    },
  });
}

/** cancel: đặt mọi dòng PENDING thành CANCELED · retry-failed: đưa FAILED về PENDING, attempts = 0. */
export function useCampaignAction(campaignCode: string) {
  const { headers } = useAuthHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['admin', 'mail', 'campaign', 'action', campaignCode],
    mutationFn: (action: 'cancel' | 'retry-failed') =>
      apiFetch<CampaignActionResult>(`/api/admin/mail/campaigns/${campaignCode}/${action}`, {
        method: 'POST',
        headers,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mailKeys.campaign(campaignCode) });
      void qc.invalidateQueries({ queryKey: ['admin', 'mail', 'campaigns'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'mail', 'messages'] });
    },
  });
}

// ─── Outbox ──────────────────────────────────────────────────────────────────

/** GET /api/admin/mail/messages: ai đã nhận gì, lọc theo chiến dịch / trạng thái / email. */
export function useMailMessages(params: AdminMailMessageListParams) {
  const { headers, enabled } = useAuthHeaders();
  return useQuery({
    queryKey: mailKeys.messages(params),
    queryFn: () =>
      apiFetch<PageResponse<AdminMailMessageRow>>('/api/admin/mail/messages', { headers, params: { ...params } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}
