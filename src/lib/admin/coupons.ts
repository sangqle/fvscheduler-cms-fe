import {
  addCalendarDays,
  formatCalendarDay,
  formatVnDate,
  formatVnDateTime,
  isVnMidnight,
  vnCalendarDay,
  vnMidnightIso,
  type CalendarDay,
} from '@/lib/admin/time';
import type { AdminCoupon, AdminPlan, UpdateCouponInput } from '@/types/admin';

/**
 * Luật FE của mã giảm giá, chép đúng theo backend (`AdminCouponService`, `docs/features/
 * subscription-coupons.md` mục 3.3 và 3.6). Mọi thông điệp ở đây chỉ để chặn sớm tại chỗ nhập; lỗi
 * thật vẫn giữ nguyên `message` của backend.
 */

/** `^[A-Z0-9]{3,20}$` sau khi trim và viết hoa; không đổi được sau khi tạo. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9]{3,20}$/;
/**
 * Dạng mã giới thiệu: `FV` + 8 ký tự của bảng chữ giới thiệu (không có I, L, O, U). Backend từ chối
 * mọi mã giảm giá mang dạng này để hai không gian tên không bao giờ đụng nhau.
 */
export const REFERRAL_CODE_SHAPE = /^FV[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;
export const COUPON_CODE_MAX = 20;
export const COUPON_NOTE_MAX = 500;
/**
 * Mã của gói Free nền (`subscription.free-floor.plan-code`, mặc định `FREE`). DTO gói không mang cờ
 * nào cho nó nên FE nhận theo mã; cấu hình khác mặc định thì backend vẫn chặn bằng 400.
 */
export const FREE_FLOOR_PLAN_CODE = 'FREE';

/** Chuẩn hóa lúc gõ: viết hoa và bỏ mọi khoảng trắng, như backend trim + viết hoa. */
export function normalizeCouponCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}

export function validateCouponCode(code: string): string | undefined {
  if (!code) return 'Nhập mã giảm giá.';
  if (!COUPON_CODE_PATTERN.test(code)) return 'Mã: 3 đến 20 ký tự, chỉ chữ A-Z không dấu và số 0-9.';
  if (REFERRAL_CODE_SHAPE.test(code)) return 'Mã trùng dạng mã giới thiệu (FV và 8 ký tự), hãy chọn mã khác.';
  return undefined;
}

/** Số nguyên 1..99. Không bao giờ 100: đơn 0 ₫ không khớp được với chuyển khoản nào. */
export function validatePercentOff(value: string): string | undefined {
  if (!value) return 'Nhập phần trăm giảm.';
  if (!/^\d+$/.test(value)) return 'Chỉ nhập số nguyên, ví dụ 10.';
  const n = Number(value);
  if (n < 1 || n > 99) return 'Từ 1 đến 99%.';
  return undefined;
}

/** Bỏ trống là không giới hạn. */
export function validateMaxRedemptions(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value) || Number(value) < 1) return 'Từ 1 lượt trở lên, hoặc để trống nếu không giới hạn.';
  return undefined;
}

/** `endsAt` phải sau hẳn `startsAt` khi có cả hai; chọn theo ngày thì nghĩa là không trước ngày bắt đầu. */
export function validateWindow(startsAt: string | null, endsAt: string | null): string | undefined {
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return 'Ngày kết thúc không được trước ngày bắt đầu.';
  }
  return undefined;
}

// ─── Khung hiệu lực theo ngày lịch Việt Nam ───────────────────────────────────
// `startsAt` tính cả mốc của nó, `endsAt` thì không: đúng mốc `endsAt` là mã đã hết hạn. Admin chọn
// theo ngày, nên "từ ngày D" là 00:00 ngày D và "đến hết ngày D" là 00:00 ngày D+1, giờ Việt Nam.

/** Ngày bắt đầu → `startsAt`: 00:00 giờ Việt Nam của ngày đó. */
export function startsAtOf(day: CalendarDay): string {
  return vnMidnightIso(day);
}

/** "Hiệu lực đến hết ngày D" → `endsAt`: hết 31/01/2027 là `2027-01-31T17:00:00Z`. */
export function endsAtOf(lastDay: CalendarDay): string {
  return vnMidnightIso(addCalendarDays(lastDay, 1));
}

/** Ngày lịch hiện trên ô "Ngày bắt đầu" cho một `startsAt`. */
export function startDayOf(startsAt: string): CalendarDay {
  return vnCalendarDay(startsAt);
}

/**
 * Ngày lịch hiện trên ô "Hiệu lực đến hết ngày" cho một `endsAt`: rơi đúng nửa đêm thì là ngày
 * trước đó; mốc lẻ giờ (dữ liệu cũ, hay tạo thẳng qua API) thì là chính ngày chứa mốc.
 */
export function lastDayOf(endsAt: string): CalendarDay {
  const day = vnCalendarDay(endsAt);
  return isVnMidnight(endsAt) ? addCalendarDays(day, -1) : day;
}

/** "01/12/2026", kèm giờ khi mốc không rơi đúng nửa đêm. */
export function formatCouponStart(startsAt: string): string {
  return isVnMidnight(startsAt) ? formatVnDate(startsAt) : formatVnDateTime(startsAt);
}

/** "hết 31/01/2027", hoặc giờ chính xác khi mốc không rơi đúng nửa đêm. */
export function formatCouponEnd(endsAt: string): string {
  return isVnMidnight(endsAt) ? `hết ${formatCalendarDay(lastDayOf(endsAt))}` : formatVnDateTime(endsAt);
}

// ─── Phạm vi gói ──────────────────────────────────────────────────────────────

/** Gói chọn được cho phạm vi: đang bán và không phải gói Free nền. */
export function isScopeSelectable(plan: AdminPlan): boolean {
  return plan.isActive && plan.code !== FREE_FLOOR_PLAN_CODE;
}

export interface ScopeEntry {
  code: string;
  /** Vắng khi catalog chưa tải xong, hoặc khi gói không còn trong catalog. */
  plan?: AdminPlan;
  /** Catalog đã tải mà không có mã này: gói đã bị xóa sau khi được gắn vào mã giảm giá. */
  missing: boolean;
}

/** Ghép phạm vi của mã với catalog; backend trả mã gói nguyên văn, không đánh dấu gói đã bị xóa. */
export function resolveScope(planCodes: string[], plans: AdminPlan[] | undefined): ScopeEntry[] {
  return planCodes.map((code) => {
    const plan = plans?.find((p) => p.code === code);
    return { code, plan, missing: !!plans && !plan };
  });
}

// ─── Lượt dùng ────────────────────────────────────────────────────────────────

/** Số chỗ đang chiếm: dòng REDEEMED cộng lượt giữ chỗ còn hạn, đúng cách đếm của checkout và của luật hạ trần. */
export function takenSlots(c: Pick<AdminCoupon, 'redeemedCount' | 'heldCount'>): number {
  return c.redeemedCount + c.heldCount;
}

/**
 * Số lượt đã dùng vượt trần: một đơn được thanh toán sau khi hạn giữ chỗ đã qua và chỗ đã về tay
 * workspace khác. Xảy ra khi admin xác nhận tay một đơn trả muộn, hoặc khi job hết hạn đơn ngừng chạy
 * và webhook SePay chốt một lượt giữ chỗ đã hết hạn. Chuyện đã chấp nhận: hiện thẳng, không coi là lỗi.
 */
export function overshoot(c: Pick<AdminCoupon, 'redeemedCount' | 'maxRedemptions'>): number {
  return c.maxRedemptions === null ? 0 : Math.max(0, c.redeemedCount - c.maxRedemptions);
}

/** Thân `PUT` dựng lại từ mã đang lưu. PUT thay mọi trường, nên bật / tắt cũng phải gửi đủ. */
export function couponToUpdateInput(c: AdminCoupon, patch: Partial<UpdateCouponInput> = {}): UpdateCouponInput {
  return {
    percentOff: c.percentOff,
    planCodes: c.planCodes,
    billingPeriod: c.billingPeriod,
    maxRedemptions: c.maxRedemptions,
    firstPurchaseOnly: c.firstPurchaseOnly,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    active: c.active,
    note: c.note,
    ...patch,
  };
}
