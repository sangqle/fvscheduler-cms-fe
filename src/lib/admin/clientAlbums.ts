import type { AdminAlbumStorageFigures, AdminAlbumWorkspaceRef } from '@/types/admin';

/**
 * Luật hiển thị của module album khách, dùng chung cho màn toàn nền tảng (`/client-albums`) và tab
 * Album khách trong chi tiết workspace. Một luật cho dung lượng và một hợp đồng URL, để hai màn không
 * bao giờ lệch nhau.
 */

// ─── Dung lượng ───────────────────────────────────────────────────────────────

/**
 * GB thập phân (10^9 byte), không phải GiB (2^30): băng thông CDN tính theo GB thập phân, và con số
 * này sinh ra để ước lượng chi phí đó. Byte trên dây là số JSON thường, chính xác tới 2^53.
 */
export const BYTES_PER_GB = 1_000_000_000;

/**
 * Số hàng xin trong MỘT lượt "Tính dung lượng" (trần `size` của backend). Mỗi trang của route
 * `storage` quét lại toàn bộ và tốn một trong 10 lượt mỗi phút, nên màn xin đúng một lần chừng này
 * hàng rồi tự phân trang ở máy. `rows.totalElements` lớn hơn con số này nghĩa là chỉ liệt kê được
 * chừng này workspace nặng nhất (`totals` vẫn phủ hết).
 */
export const ALBUM_STORAGE_ROW_LIMIT = 100;

const GB_FORMAT = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COUNT_FORMAT = new Intl.NumberFormat('vi-VN');

/** Byte sang GB thập phân, chưa làm tròn. */
export function bytesToGb(bytes: number): number {
  return bytes / BYTES_PER_GB;
}

/**
 * "12,35 GB": kiểu vi-VN, hai số lẻ. Đúng 0 byte là "0 GB". Giá trị khác 0 mà làm tròn xuống 0,00
 * thì hiện "< 0,01 GB", để một con số có thật không bao giờ đọc thành không.
 *
 * Chỉ dùng cho byte đã BIẾT. Album hay tổng có ảnh mà chưa ảnh nào có dung lượng phải đi qua
 * `describeSize`, nếu không sẽ in "0 GB" cho thứ thật ra là chưa rõ.
 */
export function formatGb(bytes: number): string {
  if (!(bytes > 0)) return '0 GB';
  const gb = bytesToGb(bytes);
  if (gb < 0.005) return '< 0,01 GB';
  return `${GB_FORMAT.format(gb)} GB`;
}

/** Số nguyên kiểu vi-VN, nhóm hàng nghìn bằng dấu chấm: 12345 thành "12.345". */
export function formatCount(n: number): string {
  return COUNT_FORMAT.format(n);
}

/**
 * Phần trăm ảnh đã có dung lượng, số nguyên từ 0 tới 100. null khi không có ảnh nào (ô trống, không
 * phải 0%). Làm tròn không nói dối: chưa đủ thì không bao giờ ra 100 (999/1000 là 99), đã có thì
 * không bao giờ ra 0 (1/1000 là 1).
 */
export function sizeCoveragePercent(sizedPhotos: number, photos: number): number | null {
  if (!(photos > 0)) return null;
  if (sizedPhotos >= photos) return 100;
  if (!(sizedPhotos > 0)) return 0;
  return Math.min(99, Math.max(1, Math.round((sizedPhotos / photos) * 100)));
}

/** "90%", hoặc null khi không có ảnh nào (xem `sizeCoveragePercent`): nơi gọi in ô trống. */
export function formatCoverage(sizedPhotos: number, photos: number): string | null {
  const percent = sizeCoveragePercent(sizedPhotos, photos);
  return percent === null ? null : `${percent}%`;
}

/**
 * Độ phủ dạng đếm, "1.234/1.300 ảnh có dung lượng"; null khi không có ảnh nào. Một câu duy nhất cho
 * dòng phụ dưới ô GB và cho thẻ tổng, để hai nơi không bao giờ diễn đạt khác nhau.
 */
export function coverageCaption(sizedPhotos: number, photos: number): string | null {
  if (!(photos > 0)) return null;
  return `${formatCount(sizedPhotos)}/${formatCount(photos)} ảnh có dung lượng`;
}

/** Dòng chính khi có ảnh mà chưa ảnh nào có dung lượng (album NAS, album Drive cũ). Không bao giờ là "0 GB". */
export const SIZE_UNKNOWN_LABEL = 'Chưa rõ dung lượng';

/**
 * - `empty`: không có ảnh nào, nên 0 GB là đúng.
 * - `unknown`: có ảnh nhưng chưa ảnh nào có dung lượng, không đoán, không ước lượng theo trung bình.
 * - `partial`: một phần ảnh có dung lượng; số GB là mức sàn, hiện kèm độ phủ.
 * - `full`: mọi ảnh đều có dung lượng.
 */
export type SizeKind = 'empty' | 'unknown' | 'partial' | 'full';

export interface SizeSummary {
  kind: SizeKind;
  /** Dòng chính: "12,35 GB", hoặc `SIZE_UNKNOWN_LABEL`. */
  text: string;
  /** Dòng phụ cỡ nhỏ `coverageCaption`, chỉ có khi `partial`. Ở `full` độ phủ là 100% nên không cần nhắc. */
  caption: string | null;
}

/**
 * MỘT luật hiển thị dung lượng cho mọi nơi: thẻ tổng, bảng workspace, bảng album.
 *
 * `bytes` là con số cần in (`figures.bytes`, hoặc `figures.downloadableBytes` cho ô "album cho phép
 * tải"); `counts` là `photos` và `sizedPhotos` của CÙNG tập đó. Nhận cả `AdminAlbumStorageFigures` lẫn
 * `AdminWorkspaceAlbumRow` vì cả hai mang hai trường này. Ví dụ: `describeSize(row.figures, row.figures.bytes)`.
 */
export function describeSize(counts: Pick<AdminAlbumStorageFigures, 'photos' | 'sizedPhotos'>, bytes: number): SizeSummary {
  const { photos, sizedPhotos } = counts;
  if (!(photos > 0)) return { kind: 'empty', text: formatGb(bytes), caption: null };
  if (!(sizedPhotos > 0)) return { kind: 'unknown', text: SIZE_UNKNOWN_LABEL, caption: null };
  if (sizedPhotos < photos) return { kind: 'partial', text: formatGb(bytes), caption: coverageCaption(sizedPhotos, photos) };
  return { kind: 'full', text: formatGb(bytes), caption: null };
}

// ─── Workspace đứng sau một dòng ──────────────────────────────────────────────

/**
 * - `personal`: `workspace` là null, album không thuộc workspace nào. Là một dòng riêng, không phải lỗi.
 * - `missing`: có id nhưng không còn workspace sống (đã xóa hoặc chưa từng có): chỉ `id` và `rawId` có nghĩa.
 * - `live`: workspace còn đó, link được sang chi tiết.
 */
export type AlbumWorkspaceKind = 'personal' | 'missing' | 'live';

/** Chỉ dòng `live` mới link được; dùng cho `DataTable.isRowDisabled` và ô tên workspace ở mọi bảng thống kê. */
export function albumWorkspaceKind(workspace: AdminAlbumWorkspaceRef | null): AlbumWorkspaceKind {
  if (!workspace) return 'personal';
  return workspace.exists ? 'live' : 'missing';
}

// ─── Chữ dùng chung ───────────────────────────────────────────────────────────

/** Tên dòng có `workspace: null`. */
export const PERSONAL_ALBUM_LABEL = 'Không thuộc workspace';

/** Tooltip (`InfoTip`) của dòng `PERSONAL_ALBUM_LABEL`. */
export const PERSONAL_ALBUM_HINT =
  'Album tạo thẳng trên Framevis, hoặc album NAS nhập qua ERP và chưa được gắn vào workspace nào.';

/** Tên dòng `missing`; ngay dưới nó in `RawId` vì chỉ có id số là còn nghĩa. */
export const MISSING_WORKSPACE_LABEL = 'Workspace không còn tồn tại';

/** Chú thích dưới mọi con số GB: nói rõ nó là mức trần của một lần tải, không phải băng thông đã đo. */
export const STORAGE_CAPTION =
  'Dung lượng ảnh gốc. Framevis không lưu ảnh, ảnh nằm ở Google Drive hoặc NAS của nhiếp ảnh gia; đây là mức trần cho một lần khách tải trọn bộ.';

// ─── Hợp đồng URL giữa hai màn ────────────────────────────────────────────────

/** Giá trị `?tab=` của tab Album khách trong chi tiết workspace. */
export const WORKSPACE_ALBUM_TAB = 'albums';

/**
 * Khóa URL của tab Album khách. Tiền tố `al` vì tab dùng chung query với màn chi tiết, nơi `tab` và
 * `from` đã có chủ. `alFrom` và `alTo` là `yyyy-MM-dd`, ngày lịch Việt Nam, cả hai đầu bao gồm
 * (một ngày thì bằng nhau); thiếu là mở. Tuyệt đối không dùng `from` cho một ngày: đó là khóa đường về
 * của danh sách (`detailHref`, `useReturnHref`).
 */
export const ALBUM_TAB_KEYS = { from: 'alFrom', to: 'alTo', page: 'alPage', size: 'alSize' } as const;

/**
 * Link vào tab Album khách của một workspace, `/workspaces/{id}?tab=albums&alFrom=…&alTo=…`. Bỏ khóa
 * nào có giá trị rỗng nên khoảng mở thì link không mang ngày. Muốn Back trả về đúng chỗ như mọi bảng
 * khác thì bọc thêm `detailHref(workspaceAlbumsHref(…), searchParams)`.
 */
export function workspaceAlbumsHref(workspaceId: string, range?: { from?: string; to?: string } | null): string {
  const qs = new URLSearchParams({ tab: WORKSPACE_ALBUM_TAB });
  if (range?.from) qs.set(ALBUM_TAB_KEYS.from, range.from);
  if (range?.to) qs.set(ALBUM_TAB_KEYS.to, range.to);
  return `/workspaces/${workspaceId}?${qs.toString()}`;
}
