/** Số ngày (làm tròn) từ bây giờ tới `iso`; âm khi đã qua. */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.round((Date.parse(iso) - now) / 86_400_000);
}

/** Mốc đã qua; đúng bằng bây giờ cũng tính là đã qua. */
export function isPast(iso: string, now: number = Date.now()): boolean {
  return Date.parse(iso) <= now;
}

/** "còn 12 ngày" / "quá 4 ngày" / "hôm nay". */
export function relativeDays(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = daysUntil(iso);
  if (d === 0) return 'hôm nay';
  return d < 0 ? `quá ${-d} ngày` : `còn ${d} ngày`;
}

/** Mức cảnh báo của hạn: quá hạn → destructive, ≤7 ngày → warning, còn lại muted. */
export function expiryTone(iso: string | null | undefined): 'destructive' | 'warning' | 'muted' {
  if (!iso) return 'muted';
  const d = daysUntil(iso);
  if (d < 0) return 'destructive';
  if (d <= 7) return 'warning';
  return 'muted';
}

/** Cộng `days` ngày vào một mốc (giữ giờ). */
export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Giờ Việt Nam ─────────────────────────────────────────────────────────────
// Các helper ở trên và `formatDate`/`formatDateTime` (`lib/utils`) theo giờ máy người xem. Phần dưới
// ghim `Asia/Ho_Chi_Minh` cho dữ liệu mà nghiệp vụ định nghĩa theo ngày lịch Việt Nam (khung hiệu
// lực của mã giảm giá), để máy đặt múi giờ khác cũng không lệch một ngày. Việt Nam cố định UTC+7,
// không có giờ mùa hè, nên đổi qua lại chỉ là cộng trừ 7 giờ.

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Một ngày lịch, không giờ, không múi giờ. `month` từ 1 tới 12. */
export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

const vnDate = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: VN_TIME_ZONE,
});

const vnDateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: VN_TIME_ZONE,
});

/** `dd/MM/yyyy` theo giờ Việt Nam. */
export function formatVnDate(iso: string): string {
  return vnDate.format(new Date(iso));
}

/** Ngày và giờ theo giờ Việt Nam, cùng khuôn với `formatDateTime`. */
export function formatVnDateTime(iso: string): string {
  return vnDateTime.format(new Date(iso));
}

/** `dd/MM/yyyy` của một ngày lịch. */
export function formatCalendarDay({ year, month, day }: CalendarDay): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/** Ngày lịch ở Việt Nam chứa mốc `iso`. */
export function vnCalendarDay(iso: string): CalendarDay {
  const d = new Date(Date.parse(iso) + VN_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Hôm nay theo lịch Việt Nam, cho ô "hôm nay" của lịch chọn ngày. */
export function vnToday(now: number = Date.now()): CalendarDay {
  return vnCalendarDay(new Date(now).toISOString());
}

/** 00:00 giờ Việt Nam của một ngày lịch, dạng ISO UTC: 01/02/2027 → `2027-01-31T17:00:00.000Z`. */
export function vnMidnightIso({ year, month, day }: CalendarDay): string {
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS).toISOString();
}

/** Mốc rơi đúng 00:00 giờ Việt Nam. */
export function isVnMidnight(iso: string): boolean {
  return (Date.parse(iso) + VN_OFFSET_MS) % DAY_MS === 0;
}

/** Cộng `days` ngày lịch (âm là lùi), tự qua tháng và năm. */
export function addCalendarDays({ year, month, day }: CalendarDay, days: number): CalendarDay {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Ngày lịch người dùng bấm trên `DatePicker` (picker trả nửa đêm giờ máy). */
export function calendarDayOfPicker(date: Date): CalendarDay {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Giá trị cho `DatePicker` hiện đúng một ngày lịch, bất kể múi giờ của máy. */
export function pickerDateOf({ year, month, day }: CalendarDay): Date {
  return new Date(year, month - 1, day);
}
