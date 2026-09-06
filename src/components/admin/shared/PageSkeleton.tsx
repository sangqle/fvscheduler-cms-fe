'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Heading } from '@/components/ui/Heading';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

/**
 * Khung xương dùng chung cho `loading.tsx` của từng route và cho nhánh `isPending` của các màn.
 *
 * Hai luật của file này:
 * 1. Mỗi khối bám đúng khung của thứ nó thay thế (`PageHeader`, hàng lọc, `TabsList`, `DataTable`)
 *    để lúc dữ liệu về bố cục không nhảy một nhịp nào.
 * 2. Chữ nào biết trước lúc build (tiêu đề màn, nhãn tab, tên cột) thì hiện luôn chữ thật, chỉ phần
 *    phụ thuộc dữ liệu mới là vệt xám. Người dùng biết mình đang ở đâu ngay từ khung xương.
 */

/** Tiêu đề màn: khớp khung của `PageHeader`, mô tả và nút hành động để trống. */
export function PageHeaderSkeleton({
  title,
  actions = 1,
}: {
  /** Bỏ trống thì tiêu đề cũng là vệt xám (màn chi tiết chưa biết tên bản ghi). */
  title?: string;
  /** Số nút giả ở slot bên phải. */
  actions?: number;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {title ? <Heading level="2">{title}</Heading> : <Skeleton className="h-6 w-52" />}
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      {actions > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Đầu màn chi tiết: nút quay lại, tên + badge trạng thái, dòng meta mono, nút hành động bên phải.
 * Dùng chung cho workspace, gói và chiến dịch vì ba màn đó cùng một khuôn.
 */
export function DetailHeaderSkeleton({
  badges = 2,
  actions = 1,
}: {
  badges?: number;
  actions?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Nút `variant="link" size="sm"` cao 32px, giữ đúng chiều cao đó cho khỏi giật */}
      <div className="flex h-8 items-center">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-64 max-w-full" />
            {Array.from({ length: badges }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-2 h-3 w-96 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-40" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Hàng lọc: ô tìm co giãn rồi tới các dropdown, mọi control cao 36px như control thật. */
export function FilterBarSkeleton({
  fields = 3,
  search = true,
}: {
  fields?: number;
  search?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && <Skeleton className="h-9 w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96" />}
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-32 shrink-0" />
      ))}
    </div>
  );
}

/**
 * Dải tab thật với nhãn thật, chỉ khác là chưa tab nào active và không bấm được: `value` cố tình
 * không khớp trigger nào. Nhãn tab không phụ thuộc dữ liệu nên vẽ vệt xám ở đây là phí.
 */
export function TabsListSkeleton({ labels }: { labels: readonly string[] }) {
  return (
    <Tabs value="__loading__">
      <TabsList aria-hidden>
        {labels.map((label) => (
          <TabsTrigger key={label} value={label} disabled tabIndex={-1}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Cột của bảng giả: chỉ cần tên cột (và `className` nếu cột thật có ràng buộc bề rộng). */
export type SkeletonColumn = string | { header: string; className?: string };

/**
 * Bảng đang tải: dùng thẳng `DataTable` ở chế độ `isLoading` chứ không vẽ lại khung bảng, nên viền,
 * bề rộng cột và cách xếp dọc trên phone luôn khớp bảng thật.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  mobileCards = false,
  className,
}: {
  columns: readonly SkeletonColumn[];
  rows?: number;
  /** Bật đúng bằng bảng thật: bảng nào xếp thẻ trên phone thì khung xương cũng phải xếp thẻ. */
  mobileCards?: boolean;
  className?: string;
}) {
  return (
    <DataTable
      columns={columns.map((col, i) => {
        const { header, className: colClassName } = typeof col === 'string' ? { header: col, className: undefined } : col;
        return { id: `c${i}`, header, className: colClassName, cell: () => null };
      })}
      data={[]}
      rowKey={() => ''}
      isLoading
      skeletonRows={rows}
      mobileCards={mobileCards}
      className={className}
    />
  );
}

/** Một thẻ nội dung: tiêu đề nhỏ rồi vài dòng chữ, cho các tab tổng quan và khối thống kê. */
export function CardSkeleton({
  lines = 4,
  title = true,
  className,
}: {
  lines?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent standalone className="flex flex-col gap-3">
        {title && <Skeleton className="h-5 w-44" />}
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Lưới thẻ cạnh nhau, dùng cho hàng số liệu ở đầu màn chi tiết. */
export function CardGridSkeleton({ count = 4, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}
