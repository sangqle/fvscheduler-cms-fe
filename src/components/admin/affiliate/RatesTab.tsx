'use client';

import * as React from 'react';
import { BadgePercent, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { RateFormDialog } from '@/components/admin/affiliate/RateFormDialog';
import { RateTable } from '@/components/admin/affiliate/RateTable';
import { joinRates, unratedPlans, type RateRow } from '@/components/admin/affiliate/rateMath';
import { useAffiliateRates } from '@/hooks/useAdminAffiliate';
import { useAdminPlans } from '@/hooks/useAdminPlans';

/** Số tên gói liệt kê trong banner trước khi gộp thành "và N gói khác". */
const NAMED_MAX = 4;

function unratedSummary(names: string[]): string {
  const shown = names.slice(0, NAMED_MAX).join(' · ');
  return names.length > NAMED_MAX ? `${shown} và ${names.length - NAMED_MAX} gói khác` : shown;
}

/**
 * Tab "Tỷ lệ theo gói": mọi dòng `affiliate_plan_rate` ghép với catalog gói để có thứ tự, trạng thái
 * bán và giá cho cột ví dụ. Không có endpoint xóa dòng tỷ lệ, muốn đưa gói ra khỏi chương trình thì
 * tắt áp dụng. `createOpen` do nút "Thêm tỷ lệ cho gói" trên PageHeader của `AffiliateScreen` bật.
 */
export function RatesTab({
  createOpen,
  onCreateOpenChange,
}: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const rates = useAffiliateRates();
  const plans = useAdminPlans();
  const [editing, setEditing] = React.useState<RateRow | null>(null);

  const rows = React.useMemo(() => joinRates(rates.data ?? [], plans.data ?? []), [rates.data, plans.data]);
  const unrated = React.useMemo(() => unratedPlans(rates.data ?? [], plans.data ?? []), [rates.data, plans.data]);

  const error = rates.error ?? plans.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          if (rates.error) void rates.refetch();
          if (plans.error) void plans.refetch();
        }}
      />
    );
  }

  // Cột ví dụ và nhãn "không còn trong catalog" cần cả hai query, nên bảng chờ đủ cả hai mới vẽ.
  const loaded = rates.data !== undefined && plans.data !== undefined;
  const openCreate = () => onCreateOpenChange(true);

  return (
    <>
      {loaded && rows.length > 0 && unrated.length > 0 && (
        <NoticeBanner
          intent="info"
          icon={<Info />}
          title={`${unrated.length} gói trong catalog chưa có tỷ lệ, mã giới thiệu không áp dụng cho các gói đó`}
          description={unratedSummary(unrated.map((p) => p.name))}
          action={
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Thêm tỷ lệ
            </Button>
          }
        />
      )}

      <RateTable
        rows={rows}
        isLoading={!loaded}
        onEdit={setEditing}
        emptyContent={
          <EmptyState
            icon={<BadgePercent />}
            title="Chưa gói nào có tỷ lệ giới thiệu"
            description="Gói chưa có tỷ lệ thì khách nhập mã giới thiệu sẽ bị từ chối. Thêm tỷ lệ cho từng gói muốn đưa vào chương trình."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Thêm tỷ lệ cho gói
              </Button>
            }
          />
        }
      />

      {loaded && rows.length > 0 && (
        <Text variant="caption" muted className="flex flex-col gap-0.5">
          <span>
            Ví dụ tính cho đơn mua đầu tiên có mã, trên giá tháng và giá năm hiện tại của catalog (giá bán, không có thì
            giá niêm yết)
          </span>
          <span>Chiết khấu làm tròn xuống bội số 1.000 ₫ · hoa hồng tính trên số khách thực trả, làm tròn xuống tới đồng</span>
          <span>Gói ngừng bán không tạo được đơn mới, nên tỷ lệ của gói đó chỉ có tác dụng khi gói mở bán lại</span>
          <span>Không xóa được dòng tỷ lệ · muốn đưa gói ra khỏi chương trình thì tắt áp dụng</span>
        </Text>
      )}

      {loaded && (
        <RateFormDialog
          open={createOpen || editing !== null}
          row={editing}
          catalog={plans.data}
          rates={rates.data}
          onOpenChange={(o) => {
            if (o) return;
            setEditing(null);
            onCreateOpenChange(false);
          }}
        />
      )}
    </>
  );
}
