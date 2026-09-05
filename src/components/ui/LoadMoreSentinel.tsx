'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Text } from '@/components/ui/Text';

interface LoadMoreSentinelProps {
  /** Ref từ `useAutoLoadMore()` — observer bám vào chính hàng này. */
  ref?: React.Ref<HTMLDivElement>;
  isFetching: boolean;
  label?: string;
}

/**
 * Hàng sentinel dưới một danh sách infinite scroll: vô hình khi rảnh, hiện
 * spinner + nhãn khi đang nạp trang kế. Chỉ render khi còn trang kế
 * (`hasNextPage && <LoadMoreSentinel …/>`) để observer tự ngắt khi hết dữ liệu.
 */
export function LoadMoreSentinel({ ref, isFetching, label = 'Đang tải thêm…' }: LoadMoreSentinelProps) {
  return (
    <div ref={ref} className="flex items-center justify-center gap-2 py-3">
      {isFetching && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <Text variant="body-sm" className="text-muted-foreground">
            {label}
          </Text>
        </>
      )}
    </div>
  );
}
