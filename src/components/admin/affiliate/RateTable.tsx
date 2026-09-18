'use client';

import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { catalogAmount, quoteFor, type RateRow } from '@/components/admin/affiliate/rateMath';
import { formatBasisPoints } from '@/lib/admin/labels';
import { formatCurrency } from '@/lib/utils';
import type { BillingPeriod } from '@/types/admin';

/** Ví dụ một đơn theo giá catalog hiện tại của chu kỳ đó; gói không bán theo chu kỳ đó thì `—`. */
function PeriodExample({ row, period }: { row: RateRow; period: BillingPeriod }) {
  const amount = row.plan ? catalogAmount(row.plan, period) : null;
  if (amount === null) return <span className="text-muted-foreground">—</span>;
  const quote = quoteFor(amount, row.rate);
  return (
    <span className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      <span>
        khách trả <span className="font-mono font-semibold text-foreground">{formatCurrency(quote.payable)}</span>
      </span>
      <span>
        hoa hồng <span className="font-mono font-semibold text-foreground">{formatCurrency(quote.commission)}</span>
      </span>
    </span>
  );
}

/**
 * Bảng tỷ lệ theo gói: mỗi dòng `affiliate_plan_rate`, kể cả dòng đang tắt (mờ đi) và dòng mà gói
 * đã mất khỏi catalog. Bấm hàng hoặc nút "Sửa" đều mở dialog sửa.
 */
export function RateTable({
  rows,
  isLoading,
  onEdit,
  emptyContent,
}: {
  rows: RateRow[];
  isLoading: boolean;
  onEdit: (row: RateRow) => void;
  emptyContent?: React.ReactNode;
}) {
  const columns: ColumnDef<RateRow>[] = [
    {
      id: 'plan',
      header: 'Gói',
      className: 'min-w-[16vw]',
      cell: ({ rate, plan }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{rate.planName ?? plan?.name ?? rate.planCode}</span>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{rate.planCode}</span>
            {!plan ? ' · không còn trong catalog' : !plan.isActive ? ' · ngừng bán' : null}
          </span>
        </div>
      ),
    },
    {
      id: 'commission',
      header: 'Hoa hồng',
      className: 'font-mono font-semibold',
      cell: ({ rate }) => formatBasisPoints(rate.commissionRateBp),
    },
    {
      id: 'discount',
      header: 'Chiết khấu cho khách',
      className: 'font-mono font-semibold',
      cell: ({ rate }) => formatBasisPoints(rate.discountRateBp),
    },
    { id: 'exampleMonth', header: 'Ví dụ gói tháng', className: 'min-w-44', cell: (row) => <PeriodExample row={row} period="MONTH" /> },
    { id: 'exampleYear', header: 'Ví dụ gói năm', className: 'min-w-44', cell: (row) => <PeriodExample row={row} period="YEAR" /> },
    {
      id: 'active',
      header: 'Áp dụng',
      cell: ({ rate }) =>
        rate.active ? (
          <Badge variant="success" size="sm">
            Đang áp dụng
          </Badge>
        ) : (
          <Badge variant="muted" size="sm">
            Đã tắt
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-20',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Sửa tỷ lệ gói ${row.rate.planCode}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
        >
          <Pencil className="size-3.5" />
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => row.rate.planCode}
      isLoading={isLoading}
      skeletonRows={5}
      mobileCards
      onRowClick={onEdit}
      rowClassName={(row) => (row.rate.active ? undefined : 'opacity-60')}
      emptyContent={emptyContent}
      emptyMessage="Chưa gói nào có tỷ lệ"
    />
  );
}
