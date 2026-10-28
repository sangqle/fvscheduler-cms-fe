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

// ─── Mốc naive giờ Việt Nam ───────────────────────────────────────────────────
// framevis-drive trả `createdAt` là GIỜ TƯỜNG Việt Nam dạng `yyyy-MM-ddTHH:mm:ss` (giây có thể vắng,
// có thể kèm giây lẻ), KHÔNG offset: đó không phải một mốc tuyệt đối. Đưa vào `new Date`, `formatDate`,
// `formatDateTime` hay `formatVn*` là bị đọc như giờ máy hoặc UTC rồi dịch theo múi giờ người xem, lệch
// tới nửa ngày. Nên chỉ tách chuỗi, không bao giờ qua `Date`.

const NAIVE_VN_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/** `dd/MM/yyyy HH:mm` của một mốc naive giờ Việt Nam. Chuỗi sai dạng (kể cả có offset hay `Z`) in nguyên văn, không đoán. */
export function formatNaiveVnDateTime(value: string): string {
  const m = NAIVE_VN_TIMESTAMP.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : value;
}

/** `dd/MM/yyyy` của một mốc naive giờ Việt Nam. Chuỗi sai dạng in nguyên văn. */
export function formatNaiveVnDate(value: string): string {
  const m = NAIVE_VN_TIMESTAMP.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

// ─── Khóa ngày và tháng lịch ──────────────────────────────────────────────────
// API album nhận `yyyy-MM-dd` (ngày lịch Việt Nam, cả hai đầu bao gồm) và `yyyy-MM`. Mọi phép tính ở
// đây là số học trên năm, tháng, ngày chứ không qua `Date` theo giờ máy, nên múi giờ của người xem
// không làm lệch một ngày. Tuyệt đối không dựng khóa bằng `new Date(...).toISOString()`.

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function monthKeyOf(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}`;
}

/** `yyyy-MM-dd` của một ngày lịch: khóa trên URL và tham số `from`/`to` của API album. */
export function calendarDayKey({ year, month, day }: CalendarDay): string {
  return `${monthKeyOf(year, month)}-${pad2(day)}`;
}

/** Ngược lại với `calendarDayKey`. null khi sai dạng hoặc ngày không có thật (`2026-02-30`). */
export function parseCalendarDayKey(key: string | null | undefined): CalendarDay | null {
  const m = key ? DAY_KEY.exec(key) : null;
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  const real = probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  return real ? { year, month, day } : null;
}

/** `yyyy-MM` thành năm và tháng (1 tới 12). null khi sai dạng; dùng để kiểm một giá trị đọc từ URL. */
export function parseMonthKey(key: string | null | undefined): { year: number; month: number } | null {
  const m = key ? MONTH_KEY.exec(key) : null;
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : null;
}

/** Tháng lịch Việt Nam đang diễn ra, `yyyy-MM`. */
export function vnMonthKey(now: number = Date.now()): string {
  const { year, month } = vnToday(now);
  return monthKeyOf(year, month);
}

/** Lùi (âm) hoặc tiến (dương) `delta` tháng, tự qua năm: (`2026-01`, -1) cho `2025-12`. Key sai dạng trả nguyên văn. */
export function shiftMonthKey(key: string, delta: number): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const index = parsed.year * 12 + (parsed.month - 1) + delta;
  return monthKeyOf(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** `count` tháng gần nhất kết thúc ở tháng Việt Nam hiện tại, tháng hiện tại đứng đầu (mới tới cũ). */
export function recentMonthKeys(count: number, now: number = Date.now()): string[] {
  const current = vnMonthKey(now);
  return Array.from({ length: Math.max(0, count) }, (_, i) => shiftMonthKey(current, -i));
}

/** "Tháng 10/2026" cho `2026-10`. Key sai dạng trả nguyên văn. */
export function formatMonthKey(key: string): string {
  const parsed = parseMonthKey(key);
  return parsed ? `Tháng ${pad2(parsed.month)}/${parsed.year}` : key;
}

/**
 * Ngày đầu và ngày cuối của một tháng `yyyy-MM`, dạng `yyyy-MM-dd`: dùng thẳng làm `from` và `to` của
 * API album, vốn bao gồm cả hai đầu (`2026-02` cho `2026-02-01` tới `2026-02-28`). null khi sai dạng.
 */
export function monthDayKeys(key: string): { from: string; to: string } | null {
  const parsed = parseMonthKey(key);
  if (!parsed) return null;
  const { year, month } = parsed;
  const nextFirst: CalendarDay = month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
  return { from: calendarDayKey({ year, month, day: 1 }), to: calendarDayKey(addCalendarDays(nextFirst, -1)) };
}
