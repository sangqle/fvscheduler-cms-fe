'use client';

import { useSession } from 'next-auth/react';
import { formatBearerToken } from '@/lib/api/authTokens';

/**
 * Header `Authorization` từ session hiện tại cho mọi hook admin. `enabled` = có token; hook gọi
 * `apiFetch` chỉ chạy khi `enabled` để tránh bắn request trước khi session hydrate.
 */
export function useAuthHeaders(): { headers: Record<string, string>; enabled: boolean } {
  const { data: session } = useSession();
  const token = session?.user.accessToken;
  return {
    headers: token ? { Authorization: formatBearerToken(token) } : {},
    enabled: !!token,
  };
}
