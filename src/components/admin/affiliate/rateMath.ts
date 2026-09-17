import type { AdminAffiliateRate, AdminPlan, BillingPeriod } from '@/types/admin';

/**
 * Phép tính tiền của mã giới thiệu, chép **đúng** từ backend để ví dụ trên màn khớp từng đồng với
 * đơn thật. Đổi ở backend thì đổi ở đây:
 *
 * - Giá gói: `SubscriptionOrderService.amountFor`, giá bán nếu có, không thì giá niêm yết.
 * - Chiết khấu: `AffiliateQuoteService.discountFor`, `floor(giá × bp / 10000)` rồi làm tròn
 *   **xuống** bội số 1.000 ₫. Chốt vào đơn lúc tạo đơn.
 * - Hoa hồng: `AffiliateCommissionService.commissionFor`, `floor(khách trả × bp / 10000)`, chỉ làm
 *   tròn xuống tới đồng. Đọc tỷ lệ lúc đơn được **thanh toán**, không phải lúc tạo đơn.
 *
 * Tích `giá × bp` luôn là số nguyên dưới 2^53 (giá cỡ trăm triệu × 10000), nên `Math.floor` trên
 * number cho cùng kết quả với `BigDecimal … RoundingMode.FLOOR` của Java.
 */

const BASIS = 10_000;
const ROUND_TO = 1_000;

/** Basis point hợp lệ theo `UpdateAffiliateRateRequest` và CHECK của `affiliate_plan_rate`. */
export const BP_MAX = 10_000;

export function catalogAmount(
  plan: Pick<AdminPlan, 'monthlyListPrice' | 'monthlySalePrice' | 'yearlyListPrice' | 'yearlySalePrice'>,
  period: BillingPeriod,
): number | null {
  return period === 'MONTH'
    ? (plan.monthlySalePrice ?? plan.monthlyListPrice)
    : (plan.yearlySalePrice ?? plan.yearlyListPrice);
}

export function discountFor(listAmount: number, discountRateBp: number): number {
  const raw = Math.floor((listAmount * discountRateBp) / BASIS);
  return Math.floor(raw / ROUND_TO) * ROUND_TO;
}

export function commissionFor(paidAmount: number, commissionRateBp: number): number {
  return Math.floor((paidAmount * commissionRateBp) / BASIS);
}

export interface RateQuote {
  /** Giá gói theo catalog (giá bán, không có thì niêm yết). */
  listAmount: number;
  discount: number;
  /** Số tiền trên đơn, cũng là gốc tính hoa hồng. */
  payable: number;
  commission: number;
}

/** Một đơn mua đầu tiên có mã giới thiệu, từ giá gói tới hoa hồng. */
export function quoteFor(listAmount: number, rate: Pick<AdminAffiliateRate, 'commissionRateBp' | 'discountRateBp'>): RateQuote {
  const discount = discountFor(listAmount, rate.discountRateBp);
  const payable = listAmount - discount;
  return { listAmount, discount, payable, commission: commissionFor(payable, rate.commissionRateBp) };
}

// ─── Ô nhập phần trăm ─────────────────────────────────────────────────────────

/**
 * `0`, `15`, `12,5`, `12.75`, `100`, `0015`: tối đa 2 chữ số lẻ, dấu phẩy hoặc chấm. Không giới hạn số
 * chữ số nguyên: độ lớn do `percentToBp` chặn trong `0..BP_MAX`, để `1000` báo sai khoảng chứ không báo
 * sai số lẻ.
 */
const PERCENT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

/** Chuỗi phần trăm → basis point (`Math.round(pct × 100)`), null khi không hợp lệ. */
export function percentToBp(value: string): number | null {
  const trimmed = value.trim();
  if (!PERCENT_PATTERN.test(trimmed)) return null;
  const bp = Math.round(Number(trimmed.replace(',', '.')) * 100);
  return bp >= 0 && bp <= BP_MAX ? bp : null;
}

/** Basis point → chuỗi điền sẵn vào ô: `1250 → "12,5"`, dấu phẩy thập phân kiểu Việt. */
export function bpToPercentInput(bp: number): string {
  return String(bp / 100).replace('.', ',');
}

export function validatePercent(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Nhập tỷ lệ phần trăm.';
  if (!/^\d+(?:[.,]\d+)?$/.test(v)) return 'Chỉ nhập số, ví dụ 15 hoặc 12,5.';
  if (/[.,]\d{3,}$/.test(v)) return 'Tối đa 2 chữ số thập phân.';
  return percentToBp(v) === null ? 'Từ 0 đến 100%.' : undefined;
}

// ─── Ghép tỷ lệ với catalog ───────────────────────────────────────────────────

export interface RateRow {
  rate: AdminAffiliateRate;
  /** null: `planCode` không còn trong catalog (dòng tỷ lệ là liên kết mềm, sống lâu hơn gói). */
  plan: AdminPlan | null;
}

/**
 * Gói có trong catalog xếp theo `sortOrder` (hòa thì theo mã), gói đã mất khỏi catalog dồn xuống
 * cuối theo mã.
 */
export function joinRates(rates: AdminAffiliateRate[], plans: AdminPlan[]): RateRow[] {
  const byCode = new Map(plans.map((p) => [p.code, p]));
  return rates
    .map((rate) => ({ rate, plan: byCode.get(rate.planCode) ?? null }))
    .sort((a, b) => {
      if (a.plan && b.plan) return a.plan.sortOrder - b.plan.sortOrder || a.rate.planCode.localeCompare(b.rate.planCode);
      if (a.plan) return -1;
      if (b.plan) return 1;
      return a.rate.planCode.localeCompare(b.rate.planCode);
    });
}

/** Gói trong catalog chưa có dòng tỷ lệ, cùng thứ tự với trang giá. */
export function unratedPlans(rates: AdminAffiliateRate[], plans: AdminPlan[]): AdminPlan[] {
  const rated = new Set(rates.map((r) => r.planCode));
  return plans
    .filter((p) => !rated.has(p.code))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}
