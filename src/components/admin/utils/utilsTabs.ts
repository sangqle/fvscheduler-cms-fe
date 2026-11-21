/**
 * Các tab của trang Tiện ích. Chỉ `tab` lên URL (`?tab=frame`; `decode` là mặc định nên bỏ khỏi URL):
 * id mờ của tab "Giải mã id" vẫn không bao giờ lên URL, xem `docs/specs/utils.md`.
 */
export const UTILS_TABS = ['decode', 'frame'] as const;
export type UtilsTab = (typeof UTILS_TABS)[number];

export const UTILS_TAB_LABELS: Record<UtilsTab, string> = {
  decode: 'Giải mã id',
  frame: 'Khung ảnh',
};
