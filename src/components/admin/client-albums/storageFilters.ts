import type { DateRange } from 'react-day-picker';
import { CLIENT_ALBUM_URL_KEYS } from '@/components/admin/client-albums/clientAlbumTabs';
import { ALBUM_STORAGE_ROW_LIMIT } from '@/lib/admin/clientAlbums';
import {
  calendarDayKey,
  calendarDayOfPicker,
  formatCalendarDay,
  monthDayKeys,
  parseCalendarDayKey,
  pickerDateOf,
  shiftMonthKey,
  vnMonthKey,
  vnToday,
} from '@/lib/admin/time';
import type { AdminAlbumStorageParams } from '@/types/admin';

/**
 * Bộ lọc của tab "Dung lượng", phần thuần (không React) để tab và hàng lọc dùng chung một cách đọc URL.
 *
 * Bộ lọc sống trên URL (`sFrom`, `sTo`, `sAll`, `sWs`) nhưng đọc URL KHÔNG BAO GIỜ gọi API: lượt tính
 * duy nhất là một lần bấm "Tính dung lượng". URL chỉ nhớ bộ lọc đang soạn, kết quả đã tính (và bộ lọc
 * nó tính cho) nằm ở state của màn.
 */

/** Mốc nhanh của hàng chọn khoảng ngày. `custom` là khoảng tự chọn, không khớp mốc nào. */
export type StoragePreset = 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export interface StorageFilterValues {
  /** `yyyy-MM-dd`, ngày lịch Việt Nam, bao gồm. Thiếu là mở. */
  from?: string;
  to?: string;
  /** Id mờ `wk…` của một workspace; thiếu là mọi workspace. */
  workspaceId?: string;
}

export interface ResolvedStorageFilters extends StorageFilterValues {
  preset: StoragePreset;
}

/** Giá trị thô đọc từ URL. */
export interface RawStorageFilters {
  from: string | undefined;
  to: string | undefined;
  all: string | undefined;
  workspace: string | undefined;
}

// ─── Id workspace ─────────────────────────────────────────────────────────────

/**
 * Id mờ đúng dạng `PublicIdCodec`: tiền tố `wk` + đúng 14 ký tự base32 Crockford viết hoa (không I, L,
 * O, U). Sai dạng thì backend trả 400 mà "Thử lại" không bao giờ sửa được, nên chặn trước khi gọi.
 */
const WORKSPACE_ID_PATTERN = /^wk[0-9A-HJKMNP-TV-Z]{14}$/;

/** Thân id luôn viết hoa và backend giải mã phân biệt hoa thường: dán nhầm chữ thường vẫn ra đúng id. */
export function normalizeWorkspaceId(raw: string): string {
  const id = raw.trim();
  return id.slice(0, 2).toLowerCase() + id.slice(2).toUpperCase();
}

/** Id đã chuẩn hóa nếu đúng dạng, còn không là `undefined` (giá trị trên URL là chuỗi tự do). */
export function parseWorkspaceId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const id = normalizeWorkspaceId(value);
  return WORKSPACE_ID_PATTERN.test(id) ? id : undefined;
}

// ─── Khoảng ngày ──────────────────────────────────────────────────────────────

function validDay(key: string | undefined): string | undefined {
  return parseCalendarDayKey(key) ? key : undefined;
}

/**
 * Khoảng của hai mốc nhanh, tính bằng số học trên ngày lịch Việt Nam (không qua `Date` theo giờ máy).
 * "Tháng này" là từ mùng 1 tới hôm nay: album không tạo được trong tương lai nên cuối tháng không khác gì.
 */
export function presetRange(
  preset: 'thisMonth' | 'lastMonth',
  now: number = Date.now(),
): { from: string; to: string } {
  const today = calendarDayKey(vnToday(now));
  const month = vnMonthKey(now);
  if (preset === 'thisMonth') return { from: monthDayKeys(month)?.from ?? today, to: today };
  return monthDayKeys(shiftMonthKey(month, -1)) ?? { from: today, to: today };
}

function matchPreset(from: string | undefined, to: string | undefined, now: number): StoragePreset {
  const lastMonth = presetRange('lastMonth', now);
  if (from === lastMonth.from && to === lastMonth.to) return 'lastMonth';
  const thisMonth = presetRange('thisMonth', now);
  if (from === thisMonth.from && to === thisMonth.to) return 'thisMonth';
  return 'custom';
}

/**
 * URL → bộ lọc hiệu lực. Không khóa nào trên URL là "tháng này tính tới hôm nay" (mặc định gọn, không
 * phải khoảng mở: khoảng mở quét nhiều nhất nên phải do người dùng chọn rõ, `sAll=1`). Ngày sai dạng
 * hoặc không có thật coi như không có.
 */
export function resolveStorageFilters(raw: RawStorageFilters, now: number = Date.now()): ResolvedStorageFilters {
  const workspaceId = parseWorkspaceId(raw.workspace);
  if (raw.all === '1') return { workspaceId, preset: 'all' };
  const from = validDay(raw.from);
  const to = validDay(raw.to);
  if (!from && !to) return { ...presetRange('thisMonth', now), workspaceId, preset: 'thisMonth' };
  return { from, to, workspaceId, preset: matchPreset(from, to, now) };
}

type UrlPatch = Record<string, string | undefined>;

/** Phần URL cần ghi khi bấm một mốc nhanh. "Tháng này" là mặc định nên chỉ xóa khóa. */
export function presetPatch(preset: 'thisMonth' | 'lastMonth' | 'all', now: number = Date.now()): UrlPatch {
  const keys = CLIENT_ALBUM_URL_KEYS;
  if (preset === 'thisMonth') {
    return { [keys.storageFrom]: undefined, [keys.storageTo]: undefined, [keys.storageAll]: undefined };
  }
  if (preset === 'all') {
    return { [keys.storageFrom]: undefined, [keys.storageTo]: undefined, [keys.storageAll]: '1' };
  }
  const { from, to } = presetRange('lastMonth', now);
  return { [keys.storageFrom]: from, [keys.storageTo]: to, [keys.storageAll]: undefined };
}

/** Phần URL cần ghi khi chọn ngày ở lịch. Bỏ trống cả hai đầu là không giới hạn, và hiện đúng như vậy ("Toàn bộ thời gian"). */
export function rangePatch(range: { from?: string; to?: string }): UrlPatch {
  const keys = CLIENT_ALBUM_URL_KEYS;
  if (!range.from && !range.to) {
    return { [keys.storageFrom]: undefined, [keys.storageTo]: undefined, [keys.storageAll]: '1' };
  }
  return { [keys.storageFrom]: range.from, [keys.storageTo]: range.to, [keys.storageAll]: undefined };
}

/** Khóa ngày → giá trị cho `DateRangePicker`, hiện đúng ngày lịch bất kể múi giờ của máy. */
export function rangeToPicker(from: string | undefined, to: string | undefined): DateRange | undefined {
  const start = parseCalendarDayKey(from);
  const end = parseCalendarDayKey(to);
  if (!start && !end) return undefined;
  return { from: start ? pickerDateOf(start) : undefined, to: end ? pickerDateOf(end) : undefined };
}

/** Ngày người dùng bấm ở lịch → khóa `yyyy-MM-dd` bằng các phần ngày theo giờ máy, không qua ISO. */
export function pickerToRange(range: DateRange | undefined): { from?: string; to?: string } {
  return {
    from: range?.from ? calendarDayKey(calendarDayOfPicker(range.from)) : undefined,
    to: range?.to ? calendarDayKey(calendarDayOfPicker(range.to)) : undefined,
  };
}

/**
 * Một đoạn câu cho khoảng ngày, đứng sau chữ "tạo": "từ 01/10/2026 đến 28/10/2026", "ngày 05/10/2026",
 * "từ 01/10/2026", "đến hết 28/10/2026". null là khoảng mở (không đoạn nào đọc xuôi được).
 */
export function storageRangeLabel(from: string | undefined, to: string | undefined): string | null {
  const start = parseCalendarDayKey(from);
  const end = parseCalendarDayKey(to);
  const f = start ? formatCalendarDay(start) : null;
  const t = end ? formatCalendarDay(end) : null;
  if (f && t) return f === t ? `ngày ${f}` : `từ ${f} đến ${t}`;
  if (f) return `từ ${f}`;
  if (t) return `đến hết ${t}`;
  return null;
}

/** Câu nói kết quả tính cho tập album nào: "Album còn sống tạo từ 01/10/2026 đến 28/10/2026", hoặc "Tất cả album còn sống". */
export function storageAlbumScope(from: string | undefined, to: string | undefined): string {
  const range = storageRangeLabel(from, to);
  return range ? `Album còn sống tạo ${range}` : 'Tất cả album còn sống';
}

// ─── Lượt gọi ─────────────────────────────────────────────────────────────────

/**
 * Tham số của MỘT lượt gọi: luôn trang 0 và đủ `ALBUM_STORAGE_ROW_LIMIT` hàng, màn tự phân trang ở
 * máy. Mỗi trang của route `storage` là một lần quét lại toàn bộ và tốn một trong 10 lượt mỗi phút.
 */
export function storageRequest(values: StorageFilterValues): AdminAlbumStorageParams {
  return { from: values.from, to: values.to, workspaceId: values.workspaceId, page: 0, size: ALBUM_STORAGE_ROW_LIMIT };
}

/** Hai lượt gọi cùng bộ lọc thì cùng khóa query: bấm lại là `refetch`, không phải một khóa mới. */
export function sameStorageRequest(a: AdminAlbumStorageParams, b: AdminAlbumStorageParams): boolean {
  return a.from === b.from && a.to === b.to && a.workspaceId === b.workspaceId;
}

/**
 * Lượt "Tính dung lượng" gần nhất: bộ lọc nó tính cho. Sống ở state của màn chứ không ở tab, vì đổi tab gỡ
 * tab Dung lượng khỏi cây: giữ ở tab thì quay lại sẽ mất `params`, và kết quả vẫn nằm trong cache nhưng
 * không còn khóa nào để đọc nó ra.
 */
export interface StorageRun {
  params: AdminAlbumStorageParams;
  /**
   * Tên workspace lấy từ danh sách chọn lúc bấm, chỉ để hiển thị. Vắng thì màn đọc tên từ chính kết quả, rồi
   * tới id. Có hay không `params.workspaceId` mới là thứ nói lượt này lọc một workspace hay mọi workspace.
   */
  workspaceLabel?: string;
}
