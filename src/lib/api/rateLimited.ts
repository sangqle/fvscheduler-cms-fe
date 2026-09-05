/**
 * Cầu nối từ "backend chặn vì gọi quá nhiều" sang một thông báo duy nhất cho người dùng.
 *
 * Cùng khuôn với `unauthorized.ts`: `apiFetch` nằm dưới React nên không tự hiện toast được, nó
 * phát sự kiện ở đây và `RateLimitGuard` (xem `src/app/providers.tsx`) lắng nghe.
 *
 * Vì sao xử lý ở tầng chung thay vì từng nơi gọi: 429 không phải lỗi của một tính năng cụ thể mà
 * là hạn mức của cả phiên làm việc, và câu trả lời luôn giống nhau ("chờ một chút rồi thử lại").
 * Bắt mỗi `onError` trong app tự nhận diện 429 thì chỉ cần bỏ sót một chỗ là người dùng thấy
 * "thất bại, vui lòng thử lại" rồi bấm lại ngay, làm tình hình tệ thêm.
 *
 * Chỉ chạy phía client: trên server không có ai để hiện toast.
 */

/** Cửa sổ gộp: các 429 dồn dập trong khoảng này chỉ hiện một thông báo. */
export const RATE_LIMIT_DEDUPE_MS = 3_000;

export interface RateLimitedEvent {
  /** Đường dẫn của request bị chặn, dùng cho log lần vết. */
  path: string;
  /** Giá trị `Retry-After` đã quy về giây, khi backend có gửi. */
  retryAfterSeconds?: number;
}

type RateLimitedHandler = (event: RateLimitedEvent) => void;

let handler: RateLimitedHandler | null = null;

/**
 * Đăng ký handler 429 duy nhất. Trả về hàm huỷ đăng ký, và hàm đó chỉ xoá handler nếu nó vẫn là
 * cái đã đăng ký, để cleanup của một lần remount không gỡ mất handler kế nhiệm.
 */
export function setRateLimitedHandler(next: RateLimitedHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** Phát một sự kiện 429. Không bao giờ ném: nơi gọi vốn đã đang trên đường ném `ApiError`. */
export function notifyRateLimited(event: RateLimitedEvent): void {
  if (typeof window === 'undefined' || !handler) return;
  try {
    handler(event);
  } catch (e) {
    console.error('[api] rate-limit handler threw:', e);
  }
}

/**
 * Đọc `Retry-After` theo cả hai dạng RFC 9110: số giây, hoặc một mốc thời gian HTTP. Trả `undefined`
 * khi thiếu header hoặc không đọc được, để nơi gọi rơi về câu mặc định.
 */
export function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;

  // Mọi chuỗi đọc ra được thành số đều xử lý ở đây, kể cả số âm. Nếu để số âm rơi xuống nhánh
  // dưới thì `Date.parse('-5')` lại nhận nó là một mốc thời gian hợp lệ trong quá khứ.
  // Làm tròn lên: chờ thiếu một nhịp là ăn 429 lần nữa.
  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));

  const at = Date.parse(headerValue);
  if (Number.isNaN(at)) return undefined;
  // Mốc đã qua thì coi như không phải chờ nữa.
  return Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

/**
 * Câu giải thích **tiếng Việt** dùng ngoài React, nơi không với tới được `LocaleProvider`:
 * `apiFetch` gọi nó để thay chuỗi kỹ thuật "API error 429" trong `ApiError.message`. Toast mà
 * người dùng thật sự đọc thì do `RateLimitGuard` dựng qua `t()`, nên có cả hai ngôn ngữ; hai chỗ
 * dùng chung một cách chọn đơn vị (dưới 60 giây thì nói giây, còn lại nói phút, làm tròn lên).
 *
 * Bám theo `Retry-After` khi backend có gửi, còn không thì nói "1 phút" cho khớp hạn mức mặc định.
 */
export function rateLimitRetryMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds == null || retryAfterSeconds <= 0) {
    return 'Vui lòng thử lại sau 1 phút.';
  }
  if (retryAfterSeconds < 60) {
    return `Vui lòng thử lại sau ${retryAfterSeconds} giây.`;
  }
  return `Vui lòng thử lại sau ${Math.ceil(retryAfterSeconds / 60)} phút.`;
}

/** Tiêu đề dùng chung cho mọi bề mặt hiển thị 429. */
export const RATE_LIMIT_TITLE = 'Quá nhiều yêu cầu';
