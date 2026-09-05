import { apiFetch } from '@/lib/api/http';
import { formatBearerToken } from '@/lib/api/authTokens';
import { ApiError } from '@/types/api';
import type { LoginResult, MeResult, TokenPair } from '@/types/auth';

/** sessionStorage key giữ `state` OAuth giữa hai chặng redirect (chống CSRF). */
export const GOOGLE_OAUTH_STATE_KEY = 'framevis-admin.google-oauth-state';
/** Phải trùng redirect URI đã đăng ký trên Google Cloud Console. */
export const GOOGLE_CALLBACK_PATH = '/api/auth/callback/google';

interface AuthEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Auth endpoint có thể trả HTTP 200 với `success:false`; bắt lại thành ApiError. */
async function authFetch<T>(path: string, init?: Parameters<typeof apiFetch>[1]): Promise<T> {
  const raw = await apiFetch<T | AuthEnvelope<T>>(path, init);
  if (raw !== null && typeof raw === 'object' && 'success' in raw && !(raw as AuthEnvelope<T>).success) {
    throw new ApiError(200, raw);
  }
  return raw as T;
}

export function buildGoogleAuthUrl(redirectUri: string): { url: string; state: string } {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
}

export function exchangeGoogleCode(code: string, redirectUri: string): Promise<LoginResult> {
  return authFetch<LoginResult>('/auth/google/callback', { method: 'POST', body: { code, redirectUri } });
}

export function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  return authFetch<LoginResult>('/auth/login', { method: 'POST', body: { email, password } });
}

export function getMe(accessToken: string): Promise<MeResult> {
  return authFetch<MeResult>('/auth/me', { headers: { Authorization: formatBearerToken(accessToken) } });
}

export function refreshTokens(refreshToken: string): Promise<TokenPair> {
  return authFetch<TokenPair>('/auth/refresh', { method: 'POST', body: { refreshToken } });
}

/** Server stateless: chỉ báo cho có, client vẫn xoá token dù thất bại. */
export async function logoutBackend(accessToken?: string): Promise<void> {
  try {
    await apiFetch<AuthEnvelope<null>>('/auth/logout', {
      method: 'POST',
      headers: accessToken ? { Authorization: formatBearerToken(accessToken) } : undefined,
    });
  } catch {
    // bỏ qua
  }
}

/** Lấy `message` backend từ ApiError, có fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const p = error.payload as { message?: unknown } | null;
    if (p && typeof p.message === 'string' && p.message) return p.message;
    if (error.message && !error.message.startsWith('API error')) return error.message;
  }
  return fallback;
}
