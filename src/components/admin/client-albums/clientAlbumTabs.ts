/**
 * Hai tab của màn Album khách và khóa URL của từng tab.
 *
 * Khóa tách theo tab (tiền tố `m` cho "Theo tháng", `s` cho "Dung lượng") để chuyển tab không làm mất
 * bộ lọc của tab kia. Tuyệt đối không dùng khóa trần của danh sách workspace (`q`, `type`, `page`,
 * `size`, `sort`...) và không dùng `from` cho một ngày: link vào chi tiết workspace mang nguyên query
 * của màn này trong `?from=` (xem `detailHref`), và nút quay lại của chi tiết dựng lại danh sách
 * workspace từ đó.
 */
export const CLIENT_ALBUM_TABS = ['monthly', 'storage'] as const;
export type ClientAlbumTab = (typeof CLIENT_ALBUM_TABS)[number];

export const CLIENT_ALBUM_TAB_LABELS = ['Theo tháng', 'Dung lượng'] as const;

export const CLIENT_ALBUM_URL_KEYS = {
  /** Tab `monthly`: tháng đầu và tháng cuối của bảng, `yyyy-MM`. Vắng cả hai là 12 tháng gần nhất do backend định nghĩa. */
  fromMonth: 'mFrom',
  toMonth: 'mTo',
  /** Tab `monthly`: tháng đang mở ở khung workspace bên dưới bảng, `yyyy-MM`. */
  month: 'month',
  /** Tab `monthly`: trang (tính từ 0) và cỡ trang của khung workspace trong tháng. */
  monthPage: 'mPage',
  monthSize: 'mSize',
  /** Tab `storage`: khoảng ngày tạo album `yyyy-MM-dd`, cả hai đầu bao gồm. Vắng cả hai là tháng này tính tới hôm nay. */
  storageFrom: 'sFrom',
  storageTo: 'sTo',
  /** Tab `storage`: `1` là toàn bộ thời gian (khoảng mở). Phải ghi rõ vì vắng khóa nghĩa là tháng này. */
  storageAll: 'sAll',
  /** Tab `storage`: id mờ `wk…` của một workspace. */
  storageWorkspace: 'sWs',
} as const;

/** Cỡ trang mặc định của khung workspace trong tháng. */
export const MONTH_PANEL_PAGE_SIZE = 20;
export const MONTH_PANEL_PAGE_SIZES = [10, 20, 50];

/** Số tháng gần nhất mà hai ô chọn tháng liệt kê (backend không giới hạn khoảng, nên đây là giới hạn của giao diện). */
export const MONTH_CHOICE_COUNT = 36;

/**
 * Tab "Theo tháng" mặc định xem bao nhiêu tháng gần nhất, tính cả tháng này (giờ Việt Nam). Chủ dự án chọn 6
 * (2026-10-28) để bảng ngắn: khung workspace của tháng được bấm hiện ngay bên dưới mà không phải cuộn xa.
 */
export const DEFAULT_MONTH_COUNT = 6;
