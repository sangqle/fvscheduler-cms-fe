import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Thanh đo phân đoạn: một track `bg-muted` và các đoạn tô màu theo tỷ lệ `value / max`.
 *
 * Dùng cho các thẻ tài chính vẽ "phần của một tổng" (phân bổ doanh thu, dòng tiền vào/ra).
 * Màu của từng đoạn là quyết định của caller và **phải là token class** (`bg-success`,
 * `bg-destructive/70`…), không bao giờ là màu thô.
 *
 * Đoạn có `children` sẽ hiện nhãn nằm trong lòng đoạn (chỉ dùng khi đoạn đủ rộng, ví dụ
 * "giữ lại 74%"); nhãn bị cắt gọn khi hết chỗ chứ không tràn ra ngoài.
 */

export interface MeterBarSegment {
  value: number;
  /** Token bg class của đoạn (`bg-success`, `bg-destructive/40`…). */
  className: string;
  /** Nhãn nằm trong đoạn — tự cắt khi đoạn quá hẹp. */
  children?: React.ReactNode;
}

const sizeClass = {
  /** Thanh mảnh cho legend đứng cạnh (phân bổ doanh thu). */
  sm: 'h-3 rounded-full',
  /** Thanh dày đọc được nhãn bên trong (sổ dòng tiền). */
  md: 'h-7 rounded-lg',
} as const;

export interface MeterBarProps {
  segments: MeterBarSegment[];
  /** Mẫu số của thước đo — mọi đoạn tính % trên cùng con số này. */
  max: number;
  size?: keyof typeof sizeClass;
  className?: string;
}

export function MeterBar({ segments, max, size = 'md', className }: MeterBarProps) {
  // Chặn mẫu số ở 1 để tháng trống vẽ ra track rỗng thay vì chia cho 0.
  const base = Math.max(max, 1);
  return (
    <div className={cn('flex w-full overflow-hidden bg-muted', sizeClass[size], className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <span
            key={i}
            style={{ width: `${Math.min((s.value / base) * 100, 100)}%` }}
            className={cn('flex shrink-0 items-center overflow-hidden', s.className)}
          >
            {s.children}
          </span>
        ))}
    </div>
  );
}
