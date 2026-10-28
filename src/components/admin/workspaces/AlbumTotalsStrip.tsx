import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { STORAGE_CAPTION, coverageCaption, describeSize, formatCount } from '@/lib/admin/clientAlbums';
import { cn } from '@/lib/utils';
import type { AdminAlbumStorageFigures } from '@/types/admin';

/** Chữ biết trước lúc build, để khung xương (`AlbumTotalsSkeleton`) hiện chữ thật chứ không vệt xám. */
export const ALBUM_TOTALS_TITLE = 'Tổng cộng';
export const ALBUM_TOTALS_LABELS = [
  'Album',
  'Ảnh',
  'Dung lượng',
  'Dung lượng album cho phép tải',
  'Album NAS chưa rõ dung lượng',
] as const;

const [ALBUMS_LABEL, PHOTOS_LABEL, SIZE_LABEL, DOWNLOADABLE_LABEL, NAS_LABEL] = ALBUM_TOTALS_LABELS;

/**
 * Một ô số: số to, nhãn, rồi dòng phụ tùy chọn. Chiều cao dòng số cố định để nhãn của cả hàng thẳng
 * nhau dù có ô phải in chữ "Chưa rõ dung lượng" (nhỏ hơn, nhạt) thay cho một con số.
 */
function Figure({
  value,
  label,
  caption,
  quiet,
}: {
  value: string;
  label: string;
  caption?: string | null;
  /** Giá trị là một câu (chưa rõ), không phải con số: nhỏ và nhạt. */
  quiet?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-px">
      <span
        className={cn(
          'flex h-8 items-center tabular-nums',
          quiet ? 'text-base font-semibold text-muted-foreground' : 'font-mono text-2xl font-semibold text-foreground',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {caption && <span className="text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

/**
 * Dải tổng của khoảng ngày đang lọc ở tab Album khách: số liệu của MỌI album còn sống trong khoảng,
 * không chỉ trang bảng đang xem.
 *
 * Dung lượng đi qua cùng luật `describeSize` với từng dòng của bảng. Riêng ô "Dung lượng" chính luôn
 * kèm độ phủ (kể cả khi đủ 100%), vì đây là con số người vận hành nhân với số lượt tải; ô "cho phép
 * tải" theo đúng luật chung (chỉ hiện dòng phụ khi thiếu).
 */
export function AlbumTotalsStrip({ totals, scope }: { totals: AdminAlbumStorageFigures; scope: string }) {
  const size = describeSize(totals, totals.bytes);
  const downloadable = describeSize(totals, totals.downloadableBytes);

  return (
    <Card>
      <div className="flex flex-wrap items-baseline gap-x-2 px-4 pt-4 sm:px-5 sm:pt-5">
        <span className="text-xs font-semibold text-foreground">{ALBUM_TOTALS_TITLE}</span>
        <Text variant="caption" muted>
          {scope}
        </Text>
      </div>
      <div className="grid grid-cols-2 items-start gap-5 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
        <Figure value={formatCount(totals.albums)} label={ALBUMS_LABEL} />
        <Figure value={formatCount(totals.photos)} label={PHOTOS_LABEL} />
        <Figure
          value={size.text}
          label={SIZE_LABEL}
          quiet={size.kind === 'unknown'}
          caption={size.caption ?? coverageCaption(totals.sizedPhotos, totals.photos)}
        />
        <Figure
          value={downloadable.text}
          label={DOWNLOADABLE_LABEL}
          quiet={downloadable.kind === 'unknown'}
          caption={downloadable.caption}
        />
        <Figure value={formatCount(totals.nasAlbums)} label={NAS_LABEL} />
      </div>
      <div className="border-t border-border px-4 py-3 sm:px-5">
        <Text variant="caption" muted>
          {STORAGE_CAPTION}
        </Text>
      </div>
    </Card>
  );
}
