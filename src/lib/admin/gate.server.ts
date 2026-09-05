import 'server-only';
import { cache } from 'react';
import { apiFetch } from '@/lib/api/http';
import { formatBearerToken } from '@/lib/api/authTokens';
import { ApiError } from '@/types/api';

export type AdminGate = 'ok' | 'forbidden' | 'unauthorized' | 'error';

/**
 * Thăm dò allowlist bằng endpoint rẻ nhất (`GET /api/admin/plans`). Backend chặn ở filter chain,
 * nên 403 ở đây nghĩa là tài khoản không phải platform-admin (ADM-RULE-001). `cache()` để một
 * request render chỉ gọi một lần dù layout + page cùng hỏi.
 */
export const probeAdminGate = cache(async (accessToken: string): Promise<AdminGate> => {
  try {
    await apiFetch('/api/admin/plans', {
      headers: { Authorization: formatBearerToken(accessToken) },
      timeoutMs: 8_000,
    });
    return 'ok';
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 403) return 'forbidden';
      if (e.status === 401) return 'unauthorized';
    }
    console.error('[admin] gate probe failed:', e);
    return 'error';
  }
});
