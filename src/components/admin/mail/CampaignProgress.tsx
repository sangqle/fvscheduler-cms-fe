import { MeterBar } from '@/components/ui/MeterBar';
import { cn } from '@/lib/utils';
import type { AdminMailCampaignDetail } from '@/types/admin';

/** Chỉ cần năm con số đếm và tổng, nhận `AdminMailCampaignDetail` nguyên vẹn cũng được. */
export type CampaignCounts = Pick<
  AdminMailCampaignDetail,
  'total' | 'sent' | 'failed' | 'canceled' | 'sending' | 'pending'
>;

/**
 * Năm đoạn theo đúng thứ tự của brief, màu bám `MAIL_MESSAGE_STATUS`: SENT success ·
 * FAILED destructive · CANCELED muted · SENDING info · PENDING warning. `CANCELED` phải
 * pha mờ vì track cũng là `bg-muted`, tô đặc thì không thấy đoạn.
 */
const SEGMENTS = [
  { key: 'sent', label: 'đã gửi', color: 'bg-success' },
  { key: 'failed', label: 'thất bại', color: 'bg-destructive' },
  { key: 'canceled', label: 'đã hủy', color: 'bg-muted-foreground/50' },
  { key: 'sending', label: 'đang gửi', color: 'bg-info' },
  { key: 'pending', label: 'chờ gửi', color: 'bg-warning' },
] as const satisfies readonly { key: keyof CampaignCounts; label: string; color: string }[];

/**
 * Thanh tiến độ xếp chồng của một chiến dịch. Màu không bao giờ là kênh thông tin duy nhất:
 * mỗi đoạn có một dòng legend kèm con số ngay dưới, và cả thanh mang `aria-label` đọc đủ
 * năm con số cho screen reader.
 */
export function CampaignProgress({
  campaign,
  className,
}: {
  campaign: CampaignCounts;
  className?: string;
}) {
  const rows = SEGMENTS.map((s) => ({ ...s, value: campaign[s.key] }));
  const summary = `Tiến độ trên tổng ${campaign.total} mail: ${rows
    .map((r) => `${r.value} ${r.label}`)
    .join(', ')}`;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Tổng 0 vẫn vẽ được: MeterBar chặn mẫu số ở 1 nên không có phép chia cho 0, mọi đoạn
          bằng 0 bị lọc đi và còn lại đúng một track rỗng. */}
      <div role="img" aria-label={summary}>
        <MeterBar
          size="sm"
          max={campaign.total}
          segments={rows.map((r) => ({ value: r.value, className: r.color }))}
        />
      </div>
      {/* Legend liệt kê đủ năm trạng thái kể cả khi bằng 0: con số mới là nguồn sự thật, đoạn màu
          chỉ để quét nhanh, và một trạng thái biến mất khỏi legend sẽ đọc như "không áp dụng". */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-full', r.color)} />
            <span className="text-[13px] font-semibold tabular-nums text-foreground">{r.value}</span>
            <span className="text-xs text-muted-foreground">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
