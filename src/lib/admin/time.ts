/** Số ngày (làm tròn) từ bây giờ tới `iso`; âm khi đã qua. */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.round((Date.parse(iso) - now) / 86_400_000);
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
