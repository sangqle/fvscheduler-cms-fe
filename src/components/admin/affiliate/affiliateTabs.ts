/**
 * Ba tab của màn tiếp thị liên kết và khóa URL của từng tab. Khóa tách theo tab để chuyển tab không
 * làm mất bộ lọc của tab kia; `page`/`size` dùng chung vì mỗi lúc chỉ một bảng hiện và đổi tab
 * (`set({ tab })`) đã tự về trang đầu.
 */
export const AFFILIATE_TABS = ['payouts', 'commissions', 'rates'] as const;
export type AffiliateTab = (typeof AFFILIATE_TABS)[number];

export const AFFILIATE_TAB_LABELS = ['Yêu cầu rút tiền', 'Hoa hồng', 'Tỷ lệ theo gói'] as const;

export const AFFILIATE_URL_KEYS = {
  /** Tab `payouts`: `REQUESTED` | `PAID` | `REJECTED`, trống là tất cả. */
  payoutStatus: 'pStatus',
  /** Tab `commissions`: id mờ `ac…` của người giới thiệu. */
  referrer: 'referrer',
  /** Tab `commissions`: id mờ `ap…` của yêu cầu rút. */
  inPayout: 'inPayout',
  /** Tab `commissions`: một giá trị của `AFFILIATE_COMMISSION_SORT_OPTIONS`, mặc định bỏ khỏi URL. */
  commissionSort: 'cSort',
} as const;
