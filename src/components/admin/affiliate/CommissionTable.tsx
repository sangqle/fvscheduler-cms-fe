'use client';

import { Ban, Coins, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import {
  AFFILIATE_COMMISSION_STATUS,
  affiliateCommissionStage,
  billingPeriodLabel,
  formatBasisPoints,
  isCommissionVoidable,
} from '@/lib/admin/labels';
import { formatCurrency, formatDate, formatDateTime, shortId } from '@/lib/utils';
import type { PageResponse } from '@/types/api';
import type { AdminAffiliateCommissionRow } from '@/types/admin';

const IN_PAYOUT_HINT =
  'Dòng này nằm trong một yêu cầu rút tiền: từ chối yêu cầu đó trước rồi mới hủy được. Nếu yêu cầu đã PAID thì dòng không bao giờ hủy được nữa.';

/**
 * Sổ hoa hồng, phân trang server. Mỗi dòng là ảnh chụp lúc ghi nhận (tỷ lệ, số tiền, tên khách đã
 * che), không join sống sang đơn hàng. Chặng hiển thị (khả dụng / đang giữ / trong yêu cầu / đã hủy)
 * suy từ `status` + `payoutId` + `availableAt` với **một** mốc `now` cho cả trang, để hai dòng cùng
 * `availableAt` không lệch chặng chỉ vì render cách nhau vài mili giây.
 */
export function CommissionTable({
  page,
  isLoading,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  referrer,
  inPayout,
  onFilterReferrer,
  onFilterPayout,
  onVoid,
  onClearFilters,
}: {
  page: PageResponse<AdminAffiliateCommissionRow> | undefined;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  referrer?: string;
  inPayout?: string;
  onFilterReferrer: (accountId: string) => void;
  onFilterPayout: (payoutId: string) => void;
  onVoid: (row: AdminAffiliateCommissionRow) => void;
  onClearFilters: () => void;
}) {
  const now = Date.now();
  const filtered = !!(referrer || inPayout);

  const columns: ColumnDef<AdminAffiliateCommissionRow>[] = [
    { id: 'created', header: 'Ghi nhận', className: 'font-mono text-xs', cell: (c) => formatDateTime(c.createdAt) },
    {
      id: 'referrer',
      header: 'Người giới thiệu',
      className: 'min-w-[12vw]',
      cell: (c) => {
        const who = c.referrerEmail ?? <span className="font-mono text-xs">{shortId(c.referrerAccountId)}</span>;
        // Đang lọc đúng người này thì email chỉ là chữ, bấm vào cũng không đổi gì.
        if (c.referrerAccountId === referrer) return <span className="font-medium">{who}</span>;
        return (
          <Button
            variant="link"
            size="sm"
            className="-mx-3 -my-1.5"
            onClick={() => onFilterReferrer(c.referrerAccountId)}
            aria-label={`Lọc hoa hồng của ${c.referrerEmail ?? c.referrerAccountId}`}
          >
            {who}
          </Button>
        );
      },
    },
    { id: 'customer', header: 'Khách hàng', cell: (c) => <span className="font-medium">{c.customerDisplayName}</span> },
    {
      id: 'plan',
      header: 'Gói · chu kỳ',
      cell: (c) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs font-semibold">{c.planCode}</span>
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
          <span className="text-xs text-muted-foreground">{formatBasisPoints(c.commissionRateBp)}</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      className: 'min-w-40',
      cell: (c) => (
        <span className="flex flex-col items-start gap-1">
          <EnumBadge meta={AFFILIATE_COMMISSION_STATUS[c.status]} />
          <StageCaption row={c} now={now} inPayout={inPayout} onFilterPayout={onFilterPayout} />
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-20 text-right',
      cell: (c) =>
        isCommissionVoidable(c) ? (
          <Button variant="ghost" size="sm" onClick={() => onVoid(c)} aria-label={`Hủy hoa hồng của ${c.customerDisplayName}`}>
            <Ban className="size-3.5" />
            Hủy
          </Button>
        ) : c.status === 'EARNED' ? (
          // Nút disabled không nhận hover (xem ghi chú "Disabled-trigger" trong `Tooltip.tsx`).
          <Tooltip content={IN_PAYOUT_HINT} side="left">
            <span className="inline-flex" tabIndex={0}>
              <Button variant="ghost" size="sm" disabled aria-label="Không hủy được dòng đang nằm trong yêu cầu rút">
                <Ban className="size-3.5" />
                Hủy
              </Button>
            </span>
          </Tooltip>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={page?.content ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        skeletonRows={8}
        mobileCards
        rowClassName={(c) => (c.status === 'VOIDED' ? 'opacity-60' : undefined)}
        paginated
        manualPagination
        pageIndex={pageIndex}
        pageCount={page?.totalPages ?? 1}
        totalRows={page?.totalElements ?? 0}
        defaultPageSize={pageSize}
        pageSizeOptions={[20, 30, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        emptyContent={
          filtered ? (
            <EmptyState
              icon={<SearchX />}
              title="Không có hoa hồng phù hợp"
              description={
                inPayout && referrer
                  ? 'Yêu cầu rút này không thuộc người giới thiệu đang lọc, hoặc đã bị từ chối nên không còn giữ dòng nào. Bỏ một trong hai bộ lọc để xem.'
                  : inPayout
                    ? 'Yêu cầu này không tồn tại hoặc đã REJECTED: từ chối gỡ id yêu cầu khỏi mọi dòng nó từng gom, nên lọc theo nó luôn ra 0 dòng. Các dòng đó đã trở lại khả dụng, lọc theo người giới thiệu để xem.'
                    : 'Tài khoản này chưa có dòng hoa hồng nào, kể cả dòng đã hủy.'
              }
              action={
                <Button variant="outline" onClick={onClearFilters}>
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Coins />}
              title="Chưa có hoa hồng nào"
              description="Mỗi đơn mua đầu tiên có mã giới thiệu ghi một dòng ở đây ngay khi đơn được thanh toán."
            />
          )
        }
      />

      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>
          Khách trả là số đã trừ chiết khấu · tỷ lệ và hoa hồng là ảnh chụp lúc ghi nhận, sửa tỷ lệ gói không viết lại
          dòng cũ
        </span>
        <span>
          Trong yêu cầu gộp cả yêu cầu đang chờ lẫn đã trả, API không trả trạng thái của yêu cầu · chỉ hủy được dòng
          EARNED chưa nằm trong yêu cầu nào
        </span>
      </Text>
    </div>
  );
}

/** Dòng chú thích dưới chip trạng thái: dòng này đang ở chặng nào và vì sao. */
function StageCaption({
  row,
  now,
  inPayout,
  onFilterPayout,
}: {
  row: AdminAffiliateCommissionRow;
  now: number;
  inPayout?: string;
  onFilterPayout: (payoutId: string) => void;
}) {
  const stage = affiliateCommissionStage(row, now);

  if (stage === 'AVAILABLE') return <span className="text-xs text-success-deep">Khả dụng</span>;

  if (stage === 'HOLDING') {
    return (
      <Tooltip content={`Rút được từ ${formatDateTime(row.availableAt)}`}>
        <span className="text-xs text-warning-deep" tabIndex={0}>
          Giữ tới {formatDate(row.availableAt)}
        </span>
      </Tooltip>
    );
  }

  if (stage === 'IN_PAYOUT' && row.payoutId) {
    const payoutId = row.payoutId;
    if (payoutId === inPayout) {
      return (
        <span className="text-xs text-muted-foreground">
          Trong yêu cầu <span className="font-mono">{shortId(payoutId)}</span>
        </span>
      );
    }
    return (
      <Button
        variant="link"
        size="sm"
        className="-mx-3 -my-2"
        onClick={() => onFilterPayout(payoutId)}
        aria-label={`Xem các lượt thuộc yêu cầu rút ${payoutId}`}
      >
        Trong yêu cầu <span className="font-mono">{shortId(payoutId)}</span>
      </Button>
    );
  }

  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-0.5">
          <span>{row.voidReason ?? 'Không có lý do'}</span>
          {row.voidedAt && <span className="text-muted-foreground">Hủy lúc {formatDateTime(row.voidedAt)}</span>}
          <span className="text-muted-foreground">
            {row.voidedBy ? (
              <>
                Bởi admin <span className="font-mono">{shortId(row.voidedBy)}</span>
              </>
            ) : (
              'Hệ thống tự hủy lúc ghi nhận'
            )}
          </span>
        </span>
      }
    >
      <span className="max-w-48 truncate text-xs text-muted-foreground" tabIndex={0}>
        {row.voidReason ?? 'Đã hủy'}
      </span>
    </Tooltip>
  );
}
