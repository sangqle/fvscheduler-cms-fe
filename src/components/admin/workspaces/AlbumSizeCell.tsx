import { describeSize } from '@/lib/admin/clientAlbums';
import { cn } from '@/lib/utils';
import type { AdminAlbumStorageFigures } from '@/types/admin';

/**
 * Ô dung lượng của một album: MỘT luật hiển thị cho mọi dòng, nằm trong `describeSize`.
 *
 * - Chưa ảnh nào có dung lượng (album NAS, album Drive cũ): chữ "Chưa rõ dung lượng", nhạt và nghiêng
 *   như mọi ô thiếu dữ liệu. Không bao giờ in "0 GB" cho thứ thật ra là chưa biết.
 * - Có một phần: số GB là mức tối thiểu, kèm dòng phụ "N/M ảnh có dung lượng" ngay dưới.
 * - Đủ ảnh: chỉ số GB.
 *
 * `counts` là `photos` và `sizedPhotos` của CÙNG tập với `bytes`, nên truyền thẳng cả dòng album.
 */
export function AlbumSizeCell({
  counts,
  bytes,
  align = 'start',
}: {
  counts: Pick<AdminAlbumStorageFigures, 'photos' | 'sizedPhotos'>;
  bytes: number;
  align?: 'start' | 'end';
}) {
  const size = describeSize(counts, bytes);
  return (
    <span className={cn('flex flex-col gap-px', align === 'end' ? 'items-end' : 'items-start')}>
      <span
        className={cn(
          'text-xs',
          size.kind === 'unknown'
            ? 'italic text-muted-foreground'
            : cn('font-mono tabular-nums', size.kind === 'empty' ? 'text-muted-foreground' : 'text-foreground'),
        )}
      >
        {size.text}
      </span>
      {size.caption && <span className="text-[11px] text-muted-foreground">{size.caption}</span>}
    </span>
  );
}
