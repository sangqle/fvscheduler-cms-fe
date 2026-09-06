'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState } from '@/components/admin/shared/QueryState';
import type { CampaignFilterValues } from '@/components/admin/mail/MailFilters';
import { VersionChip } from '@/components/admin/mail/mailDisplay';
import { useMailCampaigns } from '@/hooks/useAdminMail';
import { MAIL_CAMPAIGN_STATUS } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/utils';
import type { AdminMailCampaignRow } from '@/types/admin';

/**
 * Danh sách chiến dịch, mới nhất trước. Endpoint không nhận bộ lọc nào (chỉ `page`/`size` và
 * `createdAt,desc`), nên ô lọc trạng thái dưới đây chạy **tại client trên trang đang xem** và
 * phải nói thẳng điều đó, kẻo người vận hành tưởng đã quét hết mọi trang.
 */
export function CampaignTable({
  values,
  onCreate,
  onClearFilters,
}: {
  values: CampaignFilterValues;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const router = useRouter();
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(20);
  const query = useMailCampaigns(page, size);

  const status = values.status;
  const loaded = React.useMemo(() => query.data?.content ?? [], [query.data]);
  const rows = React.useMemo(
    () => (status ? loaded.filter((c) => c.status === status) : loaded),
    [loaded, status],
  );

  const columns: ColumnDef<AdminMailCampaignRow>[] = [
    {
      id: 'campaign',
      header: 'Chiến dịch',
      className: 'min-w-56',
      cell: (c) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{c.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{c.campaignCode}</span>
        </div>
      ),
    },
    {
      id: 'template',
      header: 'Template đã ghim',
      cell: (c) => (
        <span className="flex items-center gap-1.5">
          {/* Mở thẳng template đã ghim, nhưng không kéo theo click hàng (hàng mở chi tiết chiến dịch). */}
          <Link
            href={`/mail/templates/${c.templateCode}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs text-primary underline-offset-2 hover:underline"
          >
            {c.templateCode}
          </Link>
          <VersionChip version={c.templateVersion} />
        </span>
      ),
    },
    { id: 'status', header: 'Trạng thái', cell: (c) => <EnumBadge meta={MAIL_CAMPAIGN_STATUS[c.status]} /> },
    {
      id: 'total',
      header: 'Người nhận',
      cell: (c) =>
        c.total === 0 ? (
          <span className="flex flex-col">
            <span className="font-mono text-xs">0</span>
            <span className="text-xs text-muted-foreground">không có người nhận hợp lệ</span>
          </span>
        ) : (
          <span className="font-mono text-xs">{c.total}</span>
        ),
    },
    {
      id: 'created',
      header: 'Tạo lúc',
      className: 'font-mono text-xs',
      cell: (c) => formatDateTime(c.createdAt),
    },
  ];

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.campaignCode}
        isLoading={query.isPending}
        skeletonRows={6}
        mobileCards
        onRowClick={(c) => router.push(`/mail/campaigns/${c.campaignCode}`)}
        rowClassName={(c) => (c.status === 'CANCELED' ? 'opacity-70' : undefined)}
        paginated
        manualPagination
        pageIndex={page}
        pageCount={query.data?.totalPages ?? 1}
        totalRows={query.data?.totalElements ?? 0}
        defaultPageSize={size}
        pageSizeOptions={[20, 30, 50]}
        onPageChange={setPage}
        // Đổi cỡ trang phải hạ về trang đầu: `manualPagination` không tự làm, giữ nguyên page là
        // ở lại một trang không còn tồn tại và bảng trông như hết dữ liệu.
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(0);
        }}
        emptyContent={
          status ? (
            <EmptyState
              icon={<SearchX />}
              title={`Trang này không có chiến dịch nào ở trạng thái ${status}`}
              description="Bộ lọc chỉ soi trang đang xem. Sang trang khác hoặc bỏ lọc để thấy phần còn lại."
              action={
                <Button variant="outline" onClick={onClearFilters}>
                  Bỏ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Megaphone />}
              title="Chưa có chiến dịch nào"
              description="Tạo chiến dịch từ một template đang bật, người nhận chọn theo workspace hoặc theo tài khoản."
              action={<Button onClick={onCreate}>Tạo chiến dịch</Button>}
            />
          )
        }
      />

      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>
          DONE chỉ có nghĩa không còn mail nào chờ gửi, vẫn có thể có mail thất bại · danh sách không
          mang số thất bại, mở chi tiết chiến dịch mới thấy đủ năm con số
        </span>
        <span>
          Version ghim lúc tạo: sửa template giữa chừng không làm nửa danh sách nhận bản cũ, nửa nhận
          bản mới
        </span>
      </Text>
    </div>
  );
}
