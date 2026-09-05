export class ApiError extends Error {
  /** Backend business code, when present in the error payload (`payload.error.code` / `payload.code`). */
  public readonly code?: number;

  constructor(
    public readonly status: number,
    public readonly payload: unknown,
    message?: string,
    /**
     * The backend's `traceId` for this request — the same value it stamps on every log line
     * (`[traceId=...]` in dev, a `traceId` JSON field in prod ELK). Sourced from the echoed
     * `X-Request-Id` response header when present, so it reflects the id the backend actually
     * used even if it replaced an invalid one the client sent.
     */
    public readonly traceId?: string,
    /**
     * The `sessionId` this request belonged to — one value for the user's whole visit, so it stays
     * useful for support after they've navigated away from the error. Client-minted; see
     * `src/lib/api/sessionId.ts`.
     */
    public readonly sessionId?: string,
    /**
     * Với `429`: số giây `Retry-After` backend yêu cầu chờ, đã quy về giây (header có thể là số
     * giây hoặc một mốc thời gian HTTP). Vắng mặt khi backend không gửi header, khi đó bề mặt
     * hiển thị rơi về câu mặc định "thử lại sau 1 phút".
     */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
    const p = payload as { code?: unknown; error?: { code?: unknown } } | null;
    const rawCode = p?.error?.code ?? p?.code;
    this.code = typeof rawCode === 'number' ? rawCode : undefined;
  }

  /** Alias for {@link payload} — the parsed error body. */
  get data(): unknown {
    return this.payload;
  }
}

/**
 * True khi lỗi là **403 thiếu quyền** — ca duy nhất mà "thử lại sau" là lời khuyên sai: thử bao
 * nhiêu lần cũng vẫn 403 cho tới khi có người cấp quyền. Dùng để tách nhánh hiển thị "chưa có
 * quyền, liên hệ Admin" khỏi nhánh lỗi máy chủ/kết nối chung.
 *
 * Lưu ý backend FGAC **fail-closed trên instance check**: một id không tồn tại / khác workspace /
 * đã xóa mềm cũng trả 403 chứ không phải 404, nên ở các màn *chi tiết theo id*, 403 mang hai nghĩa
 * và phải diễn đạt gộp thay vì khẳng định chắc là thiếu quyền.
 */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/**
 * True khi backend chặn vì gọi quá nhiều (`429`). Toast giải thích đã do `RateLimitGuard` ở
 * `src/app/providers.tsx` hiện một lần cho toàn app, nên nơi gọi dùng hàm này để **thoát sớm**
 * khỏi nhánh báo lỗi của riêng mình, tránh hiện hai toast chồng nhau cho cùng một sự việc.
 */
export function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

/**
 * Generic paged-list envelope returned by top-level collection `GET` endpoints
 * (as the `data` of the standard `{ success, message, data }` response).
 */
export interface PageResponse<T> {
  content: T[];
  /** 0-based index of this page. */
  page: number;
  /** Requested page size. */
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Spring Data pagination query params: 0-based `page`, `size` capped at 100. */
export interface PageParams {
  page?: number;
  size?: number;
  /** `field` or `field,asc` / `field,desc`. */
  sort?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
