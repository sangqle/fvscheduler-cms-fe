'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { AFFILIATE_URL_KEYS } from '@/components/admin/affiliate/affiliateTabs';
import {
  CommissionFilters,
  DEFAULT_COMMISSION_SORT,
  parseCommissionSort,
  parseOpaqueId,
  type CommissionIdFilter,
} from '@/components/admin/affiliate/CommissionFilters';
import { CommissionTable } from '@/components/admin/affiliate/CommissionTable';
import { ReferrerCodeActions } from '@/components/admin/affiliate/ReferrerCodeActions';
import { VoidCommissionDialog } from '@/components/admin/affiliate/VoidCommissionDialog';
import { useAffiliateCommissions } from '@/hooks/useAdminAffiliate';
import { toInt, useUrlState } from '@/hooks/useUrlState';
import { shortId } from '@/lib/utils';
import type { AdminAffiliateCommissionRow } from '@/types/admin';

const DEFAULT_SIZE = 20;

const URL_KEY: Record<CommissionIdFilter, string> = {
  referrer: AFFILIATE_URL_KEYS.referrer,
  inPayout: AFFILIATE_URL_KEYS.inPayout,
};

/**
 * Tab Hoa hồng: sổ mọi dòng hoa hồng, lọc theo người giới thiệu (`?referrer=ac…`) và/hoặc yêu cầu rút
 * (`?inPayout=ap…`), sắp xếp `?cSort=` (mặc định bỏ khỏi URL). Không đụng `clear()` của `useUrlState`
 * vì nó xóa luôn `?tab=` và đá người dùng về tab Yêu cầu rút tiền.
 */
export function CommissionsTab() {
  const { get, set } = useUrlState();
  const referrer = parseOpaqueId(get(AFFILIATE_URL_KEYS.referrer), 'ac');
  const inPayout = parseOpaqueId(get(AFFILIATE_URL_KEYS.inPayout), 'ap');
  const sort = parseCommissionSort(get(AFFILIATE_URL_KEYS.commissionSort));
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE) || DEFAULT_SIZE;
  const filtered = !!(referrer || inPayout);

  // Lúc đang lọc, backend ghim `ORDER BY id DESC` trước sort của trang nên sort không có tác dụng:
  // không gửi, để khóa query không tách thành nhiều bản giống hệt nhau.
  const query = useAffiliateCommissions({
    referrerAccountId: referrer,
    payoutId: inPayout,
    sort: filtered ? undefined : sort,
    page,
    size,
  });

  // Link `?page=` cũ, hoặc lọc theo một yêu cầu rút vừa bị từ chối (các dòng rời bộ lọc): kéo về trang
  // cuối còn dữ liệu thay vì một trang rỗng khóa cả hai nút lật trang (xem `PayoutsTab`).
  const totalPages = query.data?.totalPages;
  const isPlaceholder = query.isPlaceholderData;
  React.useEffect(() => {
    if (isPlaceholder || totalPages === undefined) return;
    if (page > 0 && page >= totalPages) set({ page: totalPages > 1 ? totalPages - 1 : undefined });
  }, [isPlaceholder, totalPages, page, set]);

  const [voidTarget, setVoidTarget] = React.useState<AdminAffiliateCommissionRow | null>(null);
  const [voidOpen, setVoidOpen] = React.useState(false);

  // Email chỉ có trên dòng dữ liệu, không endpoint nào tra tài khoản theo id. So đúng id chứ không
  // lấy mù dòng đầu: `keepPreviousData` còn giữ trang của bộ lọc trước trong lúc tải bộ lọc mới.
  const rows = query.data?.content;
  const referrerEmail = (referrer && rows?.find((r) => r.referrerAccountId === referrer)?.referrerEmail) || null;
  const payoutOwner = inPayout ? rows?.find((r) => r.payoutId === inPayout) : undefined;

  const applyFilter = (filter: CommissionIdFilter, id: string | undefined) => set({ [URL_KEY[filter]]: id });
  const clearFilters = () => set({ [AFFILIATE_URL_KEYS.referrer]: undefined, [AFFILIATE_URL_KEYS.inPayout]: undefined });

  return (
    <>
      <CommissionFilters
        referrer={referrer}
        inPayout={inPayout}
        sort={sort}
        onApply={applyFilter}
        onSortChange={(v) => set({ [AFFILIATE_URL_KEYS.commissionSort]: v === DEFAULT_COMMISSION_SORT ? undefined : v })}
      />

      {referrer && (
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="caption" muted>
            Đang lọc theo người giới thiệu{' '}
            {referrerEmail ? (
              <>
                <span className="font-medium text-foreground">{referrerEmail}</span> · <span className="font-mono">{shortId(referrer)}</span>
              </>
            ) : (
              <span className="font-mono font-medium text-foreground">{shortId(referrer)}</span>
            )}
          </Text>
          <Button variant="ghost" size="sm" onClick={() => applyFilter('referrer', undefined)}>
            <X className="size-3.5" /> Bỏ lọc
          </Button>
          <div className="sm:ml-auto">
            <ReferrerCodeActions accountId={referrer} email={referrerEmail} />
          </div>
        </div>
      )}

      {inPayout && (
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="caption" muted>
            Đang xem các lượt thuộc yêu cầu rút <span className="font-mono font-medium text-foreground">{shortId(inPayout)}</span>
            {payoutOwner && <> của {payoutOwner.referrerEmail ?? shortId(payoutOwner.referrerAccountId)}</>}
          </Text>
          <Button variant="ghost" size="sm" onClick={() => applyFilter('inPayout', undefined)}>
            <X className="size-3.5" /> Bỏ lọc
          </Button>
        </div>
      )}

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <CommissionTable
          page={query.data}
          isLoading={query.isPending}
          pageIndex={page}
          pageSize={size}
          onPageChange={(p) => set({ page: p || undefined })}
          onPageSizeChange={(s) => set({ size: s === DEFAULT_SIZE ? undefined : s, page: undefined })}
          referrer={referrer}
          inPayout={inPayout}
          onFilterReferrer={(id) => applyFilter('referrer', id)}
          onFilterPayout={(id) => applyFilter('inPayout', id)}
          onVoid={(row) => {
            setVoidTarget(row);
            setVoidOpen(true);
          }}
          onClearFilters={clearFilters}
        />
      )}

      {voidTarget && <VoidCommissionDialog commission={voidTarget} open={voidOpen} onOpenChange={setVoidOpen} />}
    </>
  );
}
