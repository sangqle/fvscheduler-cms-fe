import { ApiError, type PageResponse } from '@/types/api';
import { notifyRateLimited, parseRetryAfter, rateLimitRetryMessage } from '@/lib/api/rateLimited';
import { notifyUnauthorized } from '@/lib/api/unauthorized';

export { ApiError } from '@/types/api';

/**
 * Client HTTP duy nhất của app (bản rút gọn của `framevis-erp/src/lib/api/http.ts`, cùng
 * contract). Tự bóc envelope `{ success, message, data }`, ném `ApiError` với status + payload,
 * phát sự kiện 401 / 429 cho các guard ở `providers.tsx`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 30_000;

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** Query params; giá trị `undefined`/`null`/`''` bị bỏ qua. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Object/array được JSON hoá; string/FormData gửi nguyên. */
  body?: unknown;
  timeoutMs?: number;
};

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function isEnvelope<T>(json: unknown): json is ApiEnvelope<T> {
  return typeof json === 'object' && json !== null && 'success' in json && 'data' in json;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = /^https?:\/\//i.test(path)
    ? new URL(path)
    : new URL(path, API_URL.endsWith('/') ? API_URL : `${API_URL}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function shouldJsonStringify(body: unknown): boolean {
  if (body === null || typeof body !== 'object') return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return false;
  return true;
}

/** `X-Request-Id` ngắn để khớp log backend; không cần mạnh về mật mã. */
function newTraceId(): string {
  return `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const m = (payload as { message?: unknown }).message;
  return typeof m === 'string' && m.length > 0 ? m : undefined;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, timeoutMs = DEFAULT_TIMEOUT_MS, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('X-Request-Id')) headers.set('X-Request-Id', newTraceId());

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (shouldJsonStringify(body)) {
      headers.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    } else {
      payload = body as BodyInit;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), { ...init, headers, body: payload, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError(0, null, 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    }
    throw new ApiError(0, null, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  clearTimeout(timer);

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const traceId = res.headers.get('X-Request-Id') ?? undefined;
    if (res.status === 401) {
      notifyUnauthorized({ path, authorization: headers.get('Authorization') ?? undefined });
    }
    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfter(res.headers.get('Retry-After'));
      notifyRateLimited({ path, retryAfterSeconds });
      throw new ApiError(429, json, rateLimitRetryMessage(retryAfterSeconds), traceId, undefined, retryAfterSeconds);
    }
    throw new ApiError(res.status, json, extractMessage(json) ?? `API error ${res.status}`, traceId);
  }

  if (isEnvelope<T>(json)) {
    if (!json.success) throw new ApiError(res.status, json, json.message);
    return json.data;
  }
  return json as T;
}

/** Tiện ích cho hook phân trang: `PageResponse<T>` của Spring. */
export type { PageResponse };
