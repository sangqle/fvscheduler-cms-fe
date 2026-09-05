import type {
  AdminCatalogGroup,
  AdminCatalogItem,
  PlanItemLinkInput,
  PlanItemSource,
  PlanPriceInput,
} from '@/types/admin';

/**
 * Luật FE của catalog gói, chép đúng theo backend (ADM-FLOW-08/09/10). Mọi thông điệp ở đây chỉ
 * để chặn sớm tại chỗ nhập; lỗi thật vẫn giữ nguyên `message` của backend.
 */

/** `^[A-Z][A-Z0-9_]{1,31}$` — không đổi được sau khi tạo (ADM-RULE-014). */
export const PLAN_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;
/** `^[a-z][a-z0-9-]{1,63}$` — không đổi được sau khi tạo. */
export const ITEM_CODE_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

export const PLAN_NAME_MAX = 120;
export const ITEM_LABEL_MAX = 160;
export const ITEM_DESCRIPTION_MAX = 400;
export const ITEM_BADGE_MAX = 40;
export const ITEM_DISPLAY_VALUE_MAX = 120;

export function validatePlanCode(code: string): string | undefined {
  if (!code.trim()) return 'Nhập mã gói.';
  if (!PLAN_CODE_PATTERN.test(code)) return 'Mã gói: chữ hoa, số và gạch dưới, 2 đến 32 ký tự, bắt đầu bằng chữ.';
  return undefined;
}

export function validateItemCode(code: string): string | undefined {
  if (!code.trim()) return 'Nhập mã item.';
  if (!ITEM_CODE_PATTERN.test(code)) return 'Mã item: chữ thường, số và gạch nối, 2 đến 64 ký tự, bắt đầu bằng chữ.';
  return undefined;
}

export function validateName(name: string, max: number, what: string): string | undefined {
  const len = name.trim().length;
  if (len === 0) return `Nhập ${what}.`;
  if (len > max) return `${what[0].toUpperCase()}${what.slice(1)} tối đa ${max} ký tự.`;
  return undefined;
}

export interface PriceErrors {
  monthlyListPrice?: string;
  monthlySalePrice?: string;
  yearlyListPrice?: string;
  yearlySalePrice?: string;
}

/**
 * Ba luật chéo của backend: mọi giá `>= 0`, giá bán không vượt giá niêm yết cùng bậc, và có giá
 * bán tháng thì phải có giá niêm yết tháng. Giá năm niêm yết là bắt buộc.
 */
export function validatePrices(prices: {
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
}): PriceErrors {
  const errors: PriceErrors = {};
  const negative = 'Giá không được âm.';
  if (prices.monthlyListPrice !== null && prices.monthlyListPrice < 0) errors.monthlyListPrice = negative;
  if (prices.monthlySalePrice !== null && prices.monthlySalePrice < 0) errors.monthlySalePrice = negative;
  if (prices.yearlySalePrice !== null && prices.yearlySalePrice < 0) errors.yearlySalePrice = negative;

  if (prices.yearlyListPrice === null) errors.yearlyListPrice = 'Giá niêm yết năm là bắt buộc.';
  else if (prices.yearlyListPrice < 0) errors.yearlyListPrice = negative;

  if (prices.monthlySalePrice !== null && prices.monthlyListPrice === null) {
    errors.monthlySalePrice = 'Có giá bán tháng thì phải có giá niêm yết tháng.';
  } else if (
    prices.monthlySalePrice !== null &&
    prices.monthlyListPrice !== null &&
    prices.monthlySalePrice > prices.monthlyListPrice
  ) {
    errors.monthlySalePrice = 'Giá bán không được cao hơn giá niêm yết cùng bậc.';
  }
  if (
    prices.yearlySalePrice !== null &&
    prices.yearlyListPrice !== null &&
    prices.yearlySalePrice > prices.yearlyListPrice
  ) {
    errors.yearlySalePrice = 'Giá bán không được cao hơn giá niêm yết cùng bậc.';
  }
  return errors;
}

export function hasError(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Ép về shape backend nhận: `yearlyListPrice` đã qua `validatePrices` nên chắc chắn không null. */
export function toPricePayload(prices: {
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
}): PlanPriceInput {
  return {
    monthlyListPrice: prices.monthlyListPrice,
    monthlySalePrice: prices.monthlySalePrice,
    yearlyListPrice: prices.yearlyListPrice ?? 0,
    yearlySalePrice: prices.yearlySalePrice,
  };
}

// ─── Xem trước kết quả resolve ────────────────────────────────────────────────

export interface ResolvedPreviewItem {
  code: string;
  label: string;
  displayValue: string | null;
  source: PlanItemSource;
  sortOrder: number;
}

/**
 * Dựng lại phía client kết quả `PlanResolveService.resolve`: hợp mọi item **đang bật** của các
 * nhóm đã chọn, rồi áp từng dòng ghi đè lên trên (một link `enabled=false` ẩn item khỏi gói, một
 * link tới item ngoài nhóm thì thêm item đó vào). Chỉ để xem trước trước khi bấm lưu, con số
 * chính thức vẫn là response của backend sau khi ghi.
 */
export function resolvePreview(
  groups: AdminCatalogGroup[],
  items: AdminCatalogItem[],
  selectedGroupCodes: string[],
  links: PlanItemLinkInput[],
): ResolvedPreviewItem[] {
  const selected = new Set(selectedGroupCodes);
  const byCode = new Map<string, ResolvedPreviewItem>();

  for (const group of groups) {
    if (!selected.has(group.code)) continue;
    for (const item of group.items) {
      if (!item.isActive) continue;
      byCode.set(item.code, {
        code: item.code,
        label: item.label,
        displayValue: null,
        source: 'GROUP',
        sortOrder: item.sortOrder,
      });
    }
  }

  const itemByCode = new Map(items.map((i) => [i.code, i]));
  for (const link of links) {
    const base = byCode.get(link.code);
    const catalogItem = itemByCode.get(link.code);
    if (link.enabled === false) {
      byCode.delete(link.code);
      continue;
    }
    if (!base && (!catalogItem || !catalogItem.isActive)) continue;
    byCode.set(link.code, {
      code: link.code,
      label: base?.label ?? catalogItem?.label ?? link.code,
      displayValue: link.displayValue,
      source: 'LINK',
      sortOrder: link.sortOrder ?? base?.sortOrder ?? catalogItem?.sortOrder ?? 0,
    });
  }

  return [...byCode.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

/** `1 nhóm · 4 item` — dòng tóm tắt thành phần dùng ở nhiều chỗ. */
export function compositionSummary(groupCount: number, itemCount: number): string {
  return `${groupCount} nhóm · ${itemCount} item`;
}
