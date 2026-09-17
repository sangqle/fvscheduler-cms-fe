'use client';

import * as React from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { AFFILIATE_URL_KEYS } from '@/components/admin/affiliate/affiliateTabs';
import { PayoutDrawer } from '@/components/admin/affiliate/PayoutDrawer';
import { PayoutTable } from '@/components/admin/affiliate/PayoutTable';
import { useAffiliatePayouts } from '@/hooks/useAdminAffiliate';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { AFFILIATE_PAYOUT_STATUS_OPTIONS } from '@/lib/admin/labels';
import type { AdminAffiliatePayoutRow, AffiliatePayoutStatus } from '@/types/admin';

const DEFAULT_SIZE = 20;

/**
 * Chọn bản mới hơn giữa dòng trong danh sách đang cache và ảnh chụp giữ ở drawer. Trạng thái yêu cầu
 * chỉ đi một chiều (`REQUESTED` → `PAID`/`REJECTED`), nên một dòng danh sách còn `REQUESTED` trong khi
 * ảnh chụp đã chốt là dữ liệu cũ đang chờ refetch sau mutation, không phải sự thật mới. Cả hai cùng
 * `REJECTED` thì giữ ảnh chụp: `REJECTED` là điểm cuối, và `commissionCount` của dòng danh sách đếm
 * sống nên luôn là 0, còn ảnh chụp từ thân trả về của reject mang số đã gom.
 */
function fresher(live: AdminAffiliatePayoutRow | undefined, snapshot: AdminAffiliatePayoutRow | null) {
  if (!live) return snapshot;
  if (snapshot && live.status === 'REQUESTED' && snapshot.status !== 'REQUESTED') return snapshot;
  if (snapshot && live.status === 'REJECTED' && snapshot.status === 'REJECTED') return snapshot;
  return live;
}

/**
 * Tab "Yêu cầu rút tiền": hàng đợi admin chuyển khoản tay. Lọc trạng thái và phân trang sống trên URL
 * (`pStatus`, `page`, `size`); dòng đang mở ở drawer thì **không**: backend không có GET một yêu cầu
 * theo id, nên một URL tải lại không dựng lại được drawer. Drawer giữ ảnh chụp dòng cuối cùng biết
 * được, để sau khi đánh dấu đã trả / từ chối nó vẫn hiện trạng thái mới dù dòng đã rời bộ lọc hiện tại.
 */
export function PayoutsTab() {
  const { get, set } = useUrlState();
  const statusParam = get(AFFILIATE_URL_KEYS.payoutStatus) ?? '';
  const status = AFFILIATE_PAYOUT_STATUS_OPTIONS.some((o) => o.value === statusParam)
    ? (statusParam as AffiliatePayoutStatus | '')
    : '';
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE) || DEFAULT_SIZE;

  const query = useAffiliatePayouts({ status: status || undefined, page, size });

  // Đánh dấu đã trả / từ chối dòng cuối của trang cuối (hoặc link `?page=` cũ) để lại một trang rỗng
  // mà DataTable báo "hàng đợi trống" và khóa cả hai nút lật trang: kéo về trang cuối còn dữ liệu.
  // Bỏ qua dữ liệu giữ chỗ của `keepPreviousData`, số trang của nó là của khóa trước.
  const totalPages = query.data?.totalPages;
  const isPlaceholder = query.isPlaceholderData;
  React.useEffect(() => {
    if (isPlaceholder || totalPages === undefined) return;
    if (page > 0 && page >= totalPages) set({ page: totalPages > 1 ? totalPages - 1 : undefined });
  }, [isPlaceholder, totalPages, page, set]);

  const [open, setOpen] = React.useState(false);
  // Giữ lại cả lúc đóng để nội dung không biến mất giữa nhịp trượt ra của drawer.
  const [snapshot, setSnapshot] = React.useState<AdminAffiliatePayoutRow | null>(null);
  const live = snapshot ? query.data?.content.find((r) => r.id === snapshot.id) : undefined;
  const payout = fresher(live, snapshot);

  // Dòng danh sách mới hơn thì thành ảnh chụp mới; so tham chiếu nên không lặp (TanStack giữ nguyên
  // object khi dữ liệu không đổi).
  React.useEffect(() => {
    if (live && payout === live && live !== snapshot) setSnapshot(live);
  }, [live, payout, snapshot]);

  function openPayout(row: AdminAffiliatePayoutRow) {
    setSnapshot(row);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          options={AFFILIATE_PAYOUT_STATUS_OPTIONS}
          value={status}
          onValueChange={(v) => set({ [AFFILIATE_URL_KEYS.payoutStatus]: v || undefined })}
          size="sm"
          aria-label="Lọc theo trạng thái yêu cầu rút tiền"
          className="max-w-full shrink-0 overflow-x-auto no-scrollbar"
        />
        <Text variant="caption" muted className="hidden md:ml-auto md:block">
          Mới gửi trước · bấm một dòng để đối chiếu và xử lý
        </Text>
      </div>

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <PayoutTable
          page={query.data}
          isLoading={query.isPending}
          pageIndex={page}
          pageSize={size}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ size: s, page: 0 })}
          onOpen={openPayout}
          status={status}
          onClearFilters={() => set({ [AFFILIATE_URL_KEYS.payoutStatus]: undefined })}
        />
      )}

      <PayoutDrawer payout={payout} open={open && !!payout} onClose={() => setOpen(false)} onUpdated={setSnapshot} />
    </>
  );
}
