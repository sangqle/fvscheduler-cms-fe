import { Badge } from '@/components/ui/Badge';
import {
  BOOKING_LIFECYCLE,
  BOOKING_STATUS_LABEL,
  bookingStage,
  bookingStatusVariant,
} from '@/lib/admin/labels';
import type { BookingStatus } from '@/types/booking';

/**
 * Chip trạng thái booking, dùng chung ở bảng, header drawer và dải "Theo trạng thái".
 *
 * Ba màu cho mười một trạng thái, và **số bước mono gánh phần vị trí**: mười một màu thì không ai
 * nhớ nổi màu nào đứng trước màu nào, còn `6/10` thì đọc một cái là biết đang ở đâu. `cancelled`
 * không có số bước vì nó nằm ngoài chuỗi.
 */
export function BookingStatusBadge({ status, showStep = true }: { status: BookingStatus; showStep?: boolean }) {
  const step = bookingStage(status);
  return (
    <Badge variant={bookingStatusVariant(status)} size="sm" mono={false} className="gap-1.5">
      {BOOKING_STATUS_LABEL[status]}
      {showStep && step > 0 && (
        <span className="font-mono text-[9.5px] font-medium opacity-75">
          {step}/{BOOKING_LIFECYCLE.length}
        </span>
      )}
    </Badge>
  );
}
