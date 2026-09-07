import type { BadgeVariant } from '@/components/ui/Badge';
import type {
  BillingPeriod,
  GrantSource,
  MailCampaignStatus,
  MailCategory,
  MailContextGroup,
  MailMessageStatus,
  MembershipStatus,
  OrderStatus,
  SubscriptionDbStatus,
  SubscriptionSource,
  SubscriptionStatus,
  WorkspaceType,
} from '@/types/admin';
import type {
  BookingItemType,
  BookingNoteAudience,
  BookingPaymentKind,
  BookingPaymentStatus,
  BookingStatus,
  ClientAlbumRole,
} from '@/types/booking';

/**
 * Enum backend → nhãn hiển thị + variant `Badge`. Một chỗ duy nhất, mọi màn dùng chung.
 * Màu theo legend thiết kế: NONE xám trung tính, TRIALING xanh dương, ACTIVE xanh lá,
 * PAST_DUE cam, EXPIRED đỏ; MANUAL tím (có bàn tay người can thiệp).
 */

export interface EnumMeta {
  label: string;
  variant: BadgeVariant;
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, EnumMeta> = {
  NONE: { label: 'NONE', variant: 'muted' },
  TRIALING: { label: 'TRIALING', variant: 'info' },
  ACTIVE: { label: 'ACTIVE', variant: 'success' },
  PAST_DUE: { label: 'PAST_DUE', variant: 'warning' },
  EXPIRED: { label: 'EXPIRED', variant: 'destructive' },
};

export const SUBSCRIPTION_DB_STATUS: Record<SubscriptionDbStatus, EnumMeta> = {
  TRIALING: SUBSCRIPTION_STATUS.TRIALING,
  ACTIVE: SUBSCRIPTION_STATUS.ACTIVE,
  PAST_DUE: SUBSCRIPTION_STATUS.PAST_DUE,
  EXPIRED: SUBSCRIPTION_STATUS.EXPIRED,
  CANCELED: { label: 'CANCELED', variant: 'muted' },
};

export const SUBSCRIPTION_SOURCE: Record<SubscriptionSource, EnumMeta> = {
  TRIAL: { label: 'TRIAL', variant: 'info' },
  SEPAY: { label: 'SEPAY', variant: 'success' },
  MANUAL: { label: 'MANUAL', variant: 'default' },
  LEGACY: { label: 'LEGACY', variant: 'secondary' },
};

export const GRANT_SOURCE_OPTIONS: { value: GrantSource; label: string; hint: string }[] = [
  { value: 'MANUAL', label: 'MANUAL', hint: 'Đối soát tay → ACTIVE' },
  { value: 'LEGACY', label: 'LEGACY', hint: 'Kế thừa dữ liệu cũ → ACTIVE' },
  { value: 'TRIAL', label: 'TRIAL', hint: 'Dùng thử → TRIALING' },
];

export const ORDER_STATUS: Record<OrderStatus, EnumMeta> = {
  PENDING: { label: 'PENDING', variant: 'warning' },
  PAID: { label: 'PAID', variant: 'success' },
  EXPIRED: { label: 'EXPIRED', variant: 'destructive' },
  CANCELED: { label: 'CANCELED', variant: 'muted' },
};

export const MEMBERSHIP_STATUS: Record<MembershipStatus, EnumMeta> = {
  invited: { label: 'Đã mời', variant: 'warning' },
  active: { label: 'Hoạt động', variant: 'success' },
  disabled: { label: 'Vô hiệu', variant: 'muted' },
};

export const WORKSPACE_TYPE: Record<WorkspaceType, string> = {
  studio: 'Studio',
  freelancer: 'Freelancer',
};

export const BILLING_PERIOD: Record<BillingPeriod, string> = {
  MONTH: 'Tháng',
  YEAR: 'Năm',
};

/** Nhãn tiếng Việt cho key giới hạn của gói. */
export const LIMIT_LABEL: Record<string, string> = {
  SEATS: 'Thành viên',
  BRANCHES: 'Chi nhánh',
  ALBUMS_PER_MONTH: 'Album mỗi tháng',
};

/** Đơn hàng còn xác nhận tay được (mark-paid nhận PENDING lẫn EXPIRED). */
export function isOrderPayable(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'EXPIRED';
}

// ─── Mail (email hệ thống) ────────────────────────────────────────────────────

/** Màu theo brief thiết kế mục 5: SYSTEM tím (có cơ chế máy), PARTIAL xám đậm (mảnh dùng chung). */
export const MAIL_CATEGORY: Record<MailCategory, EnumMeta> = {
  SYSTEM: { label: 'SYSTEM', variant: 'default' },
  ANNOUNCEMENT: { label: 'ANNOUNCEMENT', variant: 'info' },
  PARTIAL: { label: 'PARTIAL', variant: 'secondary' },
};

/**
 * `RUNNING` là xanh dương chứ không phải cam: chiến dịch chạy vài phút là chuyện bình thường của
 * bộ giới hạn tốc độ gửi, không phải trạng thái cần cảnh báo. `DONE` xanh lá cũng KHÔNG có nghĩa
 * mọi mail đều tới, phải xem số `failed` ở chi tiết chiến dịch.
 */
export const MAIL_CAMPAIGN_STATUS: Record<MailCampaignStatus, EnumMeta> = {
  QUEUED: { label: 'QUEUED', variant: 'muted' },
  RUNNING: { label: 'RUNNING', variant: 'info' },
  DONE: { label: 'DONE', variant: 'success' },
  CANCELED: { label: 'CANCELED', variant: 'secondary' },
};

/** `PENDING` vàng (đang chờ, có thể chờ tới vài giờ giữa hai nấc backoff), `SENDING` xanh dương. */
export const MAIL_MESSAGE_STATUS: Record<MailMessageStatus, EnumMeta> = {
  PENDING: { label: 'PENDING', variant: 'warning' },
  SENDING: { label: 'SENDING', variant: 'info' },
  SENT: { label: 'SENT', variant: 'success' },
  FAILED: { label: 'FAILED', variant: 'destructive' },
  CANCELED: { label: 'CANCELED', variant: 'muted' },
};

export const MAIL_CATEGORY_OPTIONS: { value: MailCategory; label: string; hint: string }[] = [
  { value: 'ANNOUNCEMENT', label: 'ANNOUNCEMENT', hint: 'Thông báo gửi tay theo chiến dịch' },
  { value: 'SYSTEM', label: 'SYSTEM', hint: 'Mail hệ thống, phase 2 sẽ gửi tự động theo sự kiện' },
  { value: 'PARTIAL', label: 'PARTIAL', hint: 'Mảnh dùng chung, chèn vào template khác bằng include, không gửi riêng' },
];

/** Nhóm ngữ cảnh admin bật tắt được; `COMMON` luôn có nên không nằm trong danh sách. */
export const MAIL_CONTEXT_GROUPS: { value: MailContextGroup; hint: string }[] = [
  { value: 'ACCOUNT', hint: 'Biến về người nhận: recipientName, recipientEmail' },
  { value: 'WORKSPACE', hint: 'Biến về workspace: workspaceName, workspaceType, ownerName' },
];

/**
 * Điều kiện **tạo chiến dịch**: template phải đang bật và không phải partial (409 nếu khác).
 * KHÔNG dùng cho gửi thử: `active` chỉ gác đúng một việc là tạo chiến dịch.
 */
export function isSendableTemplate(t: { active: boolean; category: MailCategory }): boolean {
  return t.active && t.category !== 'PARTIAL';
}

/**
 * Điều kiện **gửi thử**: backend chỉ từ chối `PARTIAL` (`MailTemplateService.testSend`), template
 * đã tắt vẫn xem trước và gửi thử được. Tách hẳn khỏi `isSendableTemplate` vì trộn hai điều kiện
 * là khoá nhầm một nút mà backend không hề chặn.
 */
export function isTestSendable(t: { category: MailCategory }): boolean {
  return t.category !== 'PARTIAL';
}

// ─── Bookings (drill-down của một workspace) ─────────────────────────────────

/**
 * Nhãn tiếng Việt cho `booking.status`. Enum này là của **tenant** chứ không phải enum nền tảng,
 * nên nó được dịch chứ không giữ chữ hoa mono như `ACTIVE`/`SEPAY`: người vận hành đọc
 * "Đang retouch", không đọc `retouching`.
 */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending_confirm: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shooting: 'Đang chụp',
  client_selection: 'Khách chọn ảnh',
  selection_completed: 'Chọn xong',
  retouching: 'Đang retouch',
  retouched: 'Retouch xong',
  printing: 'Đang in',
  printed: 'In xong',
  done: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

/**
 * Đường đi thẳng của một booking, đúng thứ tự. `cancelled` **không** nằm trong này: hủy là rời khỏi
 * đường ray chứ không phải một nấc xa hơn trên đó, cho nó số bước là nói dối rằng booking bị hủy đã
 * đi hết mọi khâu.
 */
export const BOOKING_LIFECYCLE: readonly BookingStatus[] = [
  'pending_confirm',
  'confirmed',
  'shooting',
  'client_selection',
  'selection_completed',
  'retouching',
  'retouched',
  'printing',
  'printed',
  'done',
];

/**
 * Chuỗi 11 trạng thái chỉ dùng **ba màu**: xám cho chưa bắt đầu, magenta cho 8 bước đang chạy, xanh
 * cho đã xong; `cancelled` xám đậm vì nó nằm ngoài chuỗi. Vị trí trong chuỗi do số mono `n/10` gánh,
 * không phải màu: mười một màu thì không ai nhớ nổi màu nào đứng trước màu nào.
 */
export function bookingStatusVariant(status: BookingStatus): BadgeVariant {
  if (status === 'cancelled') return 'secondary';
  if (status === 'done') return 'success';
  if (status === 'pending_confirm') return 'muted';
  return 'default';
}

/** Nấc hiện tại trên `BOOKING_LIFECYCLE` (1-based); `cancelled` trả 0 vì nó không ở trên đường ray. */
export function bookingStage(status: BookingStatus): number {
  return BOOKING_LIFECYCLE.indexOf(status) + 1;
}

/** `unpaid` xám chứ không đỏ: chưa thu là trạng thái bình thường của booking mới, không phải sự cố. */
export const BOOKING_PAYMENT_STATUS: Record<BookingPaymentStatus, EnumMeta> = {
  unpaid: { label: 'Chưa thu', variant: 'muted' },
  partial: { label: 'Một phần', variant: 'warning' },
  paid: { label: 'Đủ', variant: 'success' },
};

/** Bản dài của `BOOKING_PAYMENT_STATUS`, dùng ở header drawer nơi có chỗ cho cả cụm từ. */
export const BOOKING_PAYMENT_STATUS_LONG: Record<BookingPaymentStatus, string> = {
  unpaid: 'Chưa thu',
  partial: 'Thu một phần',
  paid: 'Đã thu đủ',
};

/** `itemType` giữ nguyên chữ hoa: đây là enum máy đọc, in ra để dán vào câu SQL. */
export const BOOKING_ITEM_TYPE: Record<BookingItemType, string> = {
  PACKAGE: 'PACKAGE',
  CUSTOM: 'CUSTOM',
  SURCHARGE: 'SURCHARGE',
  CONCEPT: 'CONCEPT',
};

export const BOOKING_PAYMENT_KIND: Record<BookingPaymentKind, string> = {
  deposit: 'Đặt cọc',
  balance: 'Thanh toán',
  refund: 'Hoàn tiền',
  forfeit: 'Mất cọc',
};

/**
 * `audience` quyết định nhãn và màu viền của một ghi chú. `all` không có nhãn: ghi chú ai cũng đọc
 * được là mặc định, gắn thêm chữ "tất cả" chỉ tổ làm nhiễu hai loại kia.
 */
export const BOOKING_NOTE_AUDIENCE: Record<BookingNoteAudience, { label: string | null; variant: BadgeVariant }> = {
  photographer: { label: 'Nhiếp ảnh', variant: 'default' },
  customer_support: { label: 'CSKH', variant: 'secondary' },
  all: { label: null, variant: 'muted' },
};

/** API album chỉ trả id và vai trò, không có tên album. */
export const CLIENT_ALBUM_ROLE: Record<ClientAlbumRole, string> = {
  proofing: 'PROOFING',
  raw: 'RAW',
  deliverable: 'DELIVERABLE',
  other: 'OTHER',
};

/** Backend chỉ nhận `createdAt`, `startAt`, `status`; mọi key khác bị `AdminSort` gạt bỏ. */
export const BOOKING_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Ngày tạo, mới nhất' },
  { value: 'createdAt,asc', label: 'Ngày tạo, cũ nhất' },
  { value: 'startAt,desc', label: 'Ngày chụp, muộn nhất' },
  { value: 'startAt,asc', label: 'Ngày chụp, sớm nhất' },
  { value: 'status,asc', label: 'Trạng thái' },
];
