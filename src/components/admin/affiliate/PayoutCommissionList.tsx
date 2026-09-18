'use client';

import { AlertTriangle, ArrowRight, CheckCircle2, Info, SearchX, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kicker } from '@/components/ui/Kicker';
import { Text } from '@/components/ui/Text';
import { useAffiliateCommissions } from '@/hooks/useAdminAffiliate';
import { billingPeriodLabel, formatBasisPoints } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { AdminAffiliateCommissionRow, AdminAffiliatePayoutRow } from '@/types/admin';

/** Một yêu cầu gom trọn số dư nên hiếm khi quá con số này; vượt thì báo thiếu chứ không tự lật trang. */
const LIST_SIZE = 100;

const columns: ColumnDef<AdminAffiliateCommissionRow>[] = [
  { id: 'customer', header: 'Khách hàng', cell: (c) => <span className="font-medium">{c.customerDisplayName}</span> },
  {
    id: 'plan',
    header: 'Gói · chu kỳ',
    cell: (c) => (
      <span className="flex flex-col">
        <span className="font-mono text-xs">{c.planCode}</span>
        <span className="text-xs text-muted-foreground">{billingPeriodLabel(c.billingPeriod)}</span>
      </span>
    ),
  },
  { id: 'paid', header: 'Khách trả', className: 'font-mono text-xs', cell: (c) => formatCurrency(c.paidAmount) },
  {
    id: 'commission',
    header: 'Hoa hồng',
    cell: (c) => (
      <span className="flex flex-col">
        <span className="font-mono text-xs font-semibold">{formatCurrency(c.commissionAmount)}</span>
        <span className="font-mono text-xs text-muted-foreground">{formatBasisPoints(c.commissionRateBp)}</span>
      </span>
    ),
  },
  { id: 'created', header: 'Ghi nhận', className: 'font-mono text-xs', cell: (c) => formatDateTime(c.createdAt) },
];

/**
 * Các dòng hoa hồng một yêu cầu rút đang gom, để đối chiếu trước khi chuyển tiền: tổng hoa hồng phải
 * khớp số tiền yêu cầu, và tên chủ tài khoản đặt cạnh tên khách để soát tự giới thiệu (doc §8).
 * `REJECTED` không truy vấn: từ chối đã gỡ `payoutId` khỏi các dòng nên lọc theo yêu cầu luôn ra 0.
 */
export function PayoutCommissionList({
  payout,
  onOpenInTab,
}: {
  payout: AdminAffiliatePayoutRow;
  /** Chuyển sang tab Hoa hồng, lọc sẵn theo yêu cầu này. */
  onOpenInTab: () => void;
}) {
  const rejected = payout.status === 'REJECTED';
  const query = useAffiliateCommissions({ payoutId: payout.id, size: LIST_SIZE }, { enabled: !rejected });

  // Hook giữ dữ liệu cũ khi đổi key: lúc drawer chuyển sang yêu cầu khác, các dòng của yêu cầu trước
  // không được đem ra so với số tiền của yêu cầu mới.
  const loading = query.isPending || query.isPlaceholderData;
  const rows = loading ? [] : (query.data?.content ?? []);
  const total = loading ? 0 : (query.data?.totalElements ?? 0);
  const sum = rows.reduce((s, c) => s + c.commissionAmount, 0);
  const truncated = total > rows.length;
  const mismatch = !truncated && (sum !== payout.amount || total !== payout.commissionCount);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker tone="muted" as="h4">
          Hoa hồng trong yêu cầu
        </Kicker>
        {!rejected && (
          <Button variant="link" size="sm" onClick={onOpenInTab}>
            Mở trong tab Hoa hồng
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>

      {rejected ? (
        <Text variant="caption" muted className="inline-flex items-start gap-1.5 rounded-lg bg-muted p-3">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {/* Chỉ thân trả về của reject mang số đã gom; dòng danh sách đếm sống nên luôn là 0. */}
            Từ chối đã gỡ yêu cầu này khỏi {payout.commissionCount > 0 ? payout.commissionCount : 'các'} dòng hoa hồng nó từng gom,
            các dòng đó trở lại Khả dụng (hoặc đã nằm trong một yêu cầu mới). Xem chúng qua mọi hoa hồng của người giới thiệu ở trên.
          </span>
        </Text>
      ) : query.error ? (
        <Alert variant="destructive" align="center">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{apiErrorMessage(query.error, 'Không tải được các dòng hoa hồng.')}</span>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Text variant="caption" muted className="inline-flex items-start gap-1.5">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Soát tự giới thiệu: so tên chủ tài khoản <b className="text-foreground">{payout.bankAccountHolder}</b> với tên khách bên
              dưới (đã che bớt). Trùng họ tên hoặc nhiều khách cùng một kiểu tên là dấu hiệu cần xem kỹ trước khi chuyển.
            </span>
          </Text>

          <DataTable
            columns={columns}
            data={rows}
            rowKey={(c) => c.id}
            isLoading={loading}
            skeletonRows={Math.min(Math.max(payout.commissionCount, 1), 5)}
            emptyContent={
              <EmptyState
                icon={<SearchX />}
                title="Không có dòng hoa hồng nào gắn với yêu cầu này"
                description={`Yêu cầu ghi ${payout.commissionCount} dòng. Đối chiếu lại trước khi chuyển khoản.`}
              />
            }
          />

          {!loading &&
            (truncated ? (
              <Alert variant="info">
                <Info className="size-4" />
                <AlertDescription>
                  Chỉ hiện {rows.length} trên {total} dòng, tổng {formatCurrency(sum)} chưa đủ để so với số tiền yêu cầu. Mở trong tab
                  Hoa hồng để xem hết.
                </AlertDescription>
              </Alert>
            ) : mismatch ? (
              <Alert variant="warning">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Không khớp: liệt kê {total} dòng, tổng <span className="font-mono">{formatCurrency(sum)}</span>; yêu cầu ghi{' '}
                  {payout.commissionCount} dòng, <span className="font-mono">{formatCurrency(payout.amount)}</span>. Đối chiếu trước khi
                  chuyển khoản.
                </AlertDescription>
              </Alert>
            ) : (
              <Text variant="caption" muted className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                <span>
                  {total} dòng · tổng <span className="font-mono font-semibold text-foreground">{formatCurrency(sum)}</span> khớp số
                  tiền yêu cầu
                </span>
              </Text>
            ))}
        </>
      )}
    </section>
  );
}
