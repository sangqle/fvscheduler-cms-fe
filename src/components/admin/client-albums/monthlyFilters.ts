import { DEFAULT_MONTH_COUNT, MONTH_CHOICE_COUNT } from '@/components/admin/client-albums/clientAlbumTabs';
import { parseMonthKey, recentMonthKeys } from '@/lib/admin/time';

/**
 * Bộ lọc của tab "Theo tháng", phần thuần (không React). Mọi tháng ở đây là chuỗi `yyyy-MM`, nên so
 * sánh chuỗi cũng là so sánh thời gian.
 *
 * URL chỉ mang khoảng tháng SAU KHI admin đổi nó. Chưa đổi thì không có khóa nào và giao diện tự gửi
 * {@link defaultMonthRange}: `DEFAULT_MONTH_COUNT` tháng gần nhất theo giờ Việt Nam (`vnMonthKey`, không
 * theo múi giờ của máy người xem). Mặc định của backend (12 tháng) không còn được dùng ở màn này.
 */

/** Khoảng tháng cả hai đầu bao gồm. */
export interface MonthRange {
  fromMonth: string;
  toMonth: string;
}

/** `DEFAULT_MONTH_COUNT` tháng gần nhất, tính cả tháng này theo giờ Việt Nam. */
export function defaultMonthRange(now?: number): MonthRange {
  const keys = recentMonthKeys(DEFAULT_MONTH_COUNT, now);
  return { fromMonth: keys[keys.length - 1], toMonth: keys[0] };
}

/**
 * URL → khoảng tháng hiệu lực, hoặc `undefined` là dùng {@link defaultMonthRange}. Chỉ nhận khi CẢ HAI đầu
 * đều là tháng có thật và đầu không vượt cuối: giao diện luôn ghi cả hai cùng lúc, còn một khóa lẻ (gõ
 * tay) sẽ bị backend hiểu theo cách khác ("chỉ fromMonth" là tới tháng hiện tại), và đầu vượt cuối
 * chỉ ăn 400 mà "Thử lại" không bao giờ sửa được.
 */
export function resolveMonthRange(rawFrom: string | undefined, rawTo: string | undefined): MonthRange | undefined {
  const fromMonth = parseMonthKey(rawFrom) ? rawFrom : undefined;
  const toMonth = parseMonthKey(rawTo) ? rawTo : undefined;
  if (!fromMonth || !toMonth || fromMonth > toMonth) return undefined;
  return { fromMonth, toMonth };
}

/** Tháng đang mở ở khung workspace bên dưới bảng; giá trị sai dạng coi như không có. */
export function resolveMonth(raw: string | undefined): string | undefined {
  return parseMonthKey(raw) ? raw : undefined;
}

export interface MonthChoice {
  value: string;
  /** `MM/yyyy`, không kèm chữ "Tháng": ô chọn đã có nhãn "Từ" / "Đến" đứng trước. */
  label: string;
}

function shortMonthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  return parsed ? `${String(parsed.month).padStart(2, '0')}/${parsed.year}` : key;
}

/**
 * Các tháng hai ô chọn liệt kê, mới nhất trước: `MONTH_CHOICE_COUNT` tháng gần nhất cộng thêm những
 * tháng đang được chọn (`pinned`). Backend không giới hạn khoảng, nên một link cũ có thể mang tháng
 * nằm ngoài danh sách; không ghim thì ô chọn trống không dù bảng bên dưới vẫn đúng.
 */
export function monthChoices(...pinned: (string | null | undefined)[]): MonthChoice[] {
  const keys = new Set<string>(recentMonthKeys(MONTH_CHOICE_COUNT));
  for (const key of pinned) {
    if (key && parseMonthKey(key)) keys.add(key);
  }
  return Array.from(keys)
    .sort()
    .reverse()
    .map((value) => ({ value, label: shortMonthLabel(value) }));
}

/** Đổi đầu "từ tháng". Vượt qua đầu "đến tháng" thì kéo đầu kia theo, để không bao giờ gửi khoảng ngược. */
export function withFromMonth(range: MonthRange, fromMonth: string): MonthRange {
  return { fromMonth, toMonth: fromMonth > range.toMonth ? fromMonth : range.toMonth };
}

/** Đổi đầu "đến tháng", cùng luật với `withFromMonth`. */
export function withToMonth(range: MonthRange, toMonth: string): MonthRange {
  return { fromMonth: toMonth < range.fromMonth ? toMonth : range.fromMonth, toMonth };
}

export function monthInRange(month: string, range: MonthRange): boolean {
  return month >= range.fromMonth && month <= range.toMonth;
}
