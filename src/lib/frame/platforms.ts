/**
 * Nền tảng nào hiện trọn một ảnh đơn trong feed, theo tỉ lệ W/H. Một hằng số duy nhất, có ngày tra
 * cứu, để sửa một chỗ khi nền tảng đổi luật. Nguồn: tra cứu 11/2026 (Meta ads spec, LinkedIn Help,
 * X Help qua Buffer/Sked, Instagram thay đổi 3:4 tháng 5/2025, các bảng cỡ ảnh 2025-2026).
 */
export const PLATFORM_CHECKED_AT = '11/2026';

export interface PlatformRule {
  name: string;
  min: number;
  max: number;
  /** Dải "chưa chắc" bên dưới `min` (nguồn trái nhau). */
  maybeMin?: number;
  tip: string;
}

export const PLATFORM_RULES: PlatformRule[] = [
  { name: 'Threads', min: 0.8, max: 1.91, maybeMin: 0.75, tip: 'Hiện trọn từ 4:5 tới 1,91:1. Quanh 3:4 các nguồn trái nhau.' },
  { name: 'Facebook', min: 0.8, max: 1.91, tip: 'Hiện trọn từ 4:5 tới 1,91:1. Cao hơn 4:5 bị cắt về 4:5.' },
  { name: 'Instagram', min: 0.75, max: 1.91, tip: 'App nhận tới 3:4 (từ 5/2025); API và công cụ hẹn giờ chỉ tới 4:5.' },
  { name: 'X', min: 0.75, max: 2, tip: 'Hiện trọn từ 3:4 tới 2:1.' },
  { name: 'LinkedIn', min: 0.8, max: 3, tip: 'Hiện trọn từ 4:5 tới 3:1.' },
];

export type PlatformFit = 'ok' | 'maybe' | 'no';

export function platformFits(ratio: number): { rule: PlatformRule; fit: PlatformFit; label: string }[] {
  const E = 0.003;
  return PLATFORM_RULES.map((rule) => {
    let fit: PlatformFit = 'no';
    if (ratio >= rule.min - E && ratio <= rule.max + E) fit = 'ok';
    else if (rule.maybeMin && ratio >= rule.maybeMin - E && ratio < rule.min) fit = 'maybe';
    const label = rule.name === 'Instagram' && fit === 'ok' && ratio < 0.8 - E ? 'Instagram (app)' : rule.name;
    return { rule, fit, label };
  });
}

/** Feed Facebook/Threads chỉ hiện phần 4:5 ở giữa khi khung cao hơn 4:5. */
export const FEED_MAX_TALL_RATIO = 0.8;
