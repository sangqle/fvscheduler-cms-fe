'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState, isNotFound } from '@/components/admin/shared/QueryState';
import { hasActiveMessageFilters, type MessageFilterValues } from '@/components/admin/mail/MailFilters';
import { useMailMessages } from '@/hooks/useAdminMail';
import { MAIL_MESSAGE_STATUS } from '@/lib/admin/labels';
import { formatDateTime, shortId } from '@/lib/utils';
import type { AdminMailMessageRow } from '@/types/admin';

/** Số lần thử tối đa trước khi worker bỏ cuộc (`mail.dispatch.max-attempts`). */
const MAX_ATTEMPTS = 5;

/**
 * Mốc thời gian đọc theo trạng thái: `nextAttemptAt` chỉ có nghĩa với dòng đang chờ **thử lại**,
 * dòng đã gửi thì mốc đáng đọc là `sentAt`, còn lại để trống.
 */
function moment(m: AdminMailMessageRow): string {
  if (m.status === 'SENT') return m.sentAt ? `gửi ${formatDateTime(m.sentAt)}` : '—';
  if (m.status !== 'PENDING') return '—';
  // Chưa thử lần nào thì không có nấc backoff nào để chờ, chỉ đợi lượt worker gần nhất.
  return m.attempts === 0 ? 'nhịp kế tiếp' : formatDateTime(m.nextAttemptAt);
}

function attemptsLabel(m: AdminMailMessageRow): string {
  if (m.status === 'FAILED') return `${m.attempts} · dừng hẳn`;
  if (m.status === 'PENDING' || m.status === 'SENDING') return `${m.attempts} / ${MAX_ATTEMPTS}`;
  return `${m.attempts}`;
}

/**
 * Outbox chỉ đọc: ai đã nhận gì. `mail_message` không lộ định danh nào ra API nên bảng này không
 * có hàng bấm được, và mọi thao tác sửa nằm ở mức chiến dịch.
 */
export function MessageTable({
  values,
  onClearFilters,
  campaignCode,
  hideCampaignColumn,
}: {
  values: MessageFilterValues;
  onClearFilters: () => void;
  /** Khoá bảng vào một chiến dịch; bỏ trống là tra cứu toàn hệ thống. */
  campaignCode?: string;
  hideCampaignColumn?: boolean;
}) {
  const { showToast } = useToast();
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(20);
  const [errorRow, setErrorRow] = React.useState<AdminMailMessageRow | null>(null);

  // Mã chiến dịch của màn chi tiết thắng ô lọc, vì ở đó bảng bị khoá vào đúng một chiến dịch.
  const effectiveCampaign = campaignCode ?? values.campaignCode;
  const { status, email, sort } = values;

  React.useEffect(() => setPage(0), [status, email, sort, effectiveCampaign]);

  const query = useMailMessages({
    campaignCode: effectiveCampaign,
    status,
    email,
    sort,
    page,
    size,
  });

  // Mã chiến dịch không tồn tại trả 404 chứ không trả trang rỗng, nên nó là một trạng thái riêng
  // chứ không phải lỗi tải: bảng vẫn đứng nguyên để người dùng sửa lại mã.
  const notFound = isNotFound(query.error);

  async function copyWorkspace(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      showToast({ title: 'Đã chép workspaceId', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  const columns: ColumnDef<AdminMailMessageRow>[] = [
    {
      id: 'email',
      header: 'Email',
      className: 'min-w-52',
      cell: (m) => <span className="font-medium">{m.toEmail}</span>,
    },
    ...(hideCampaignColumn
      ? []
      : [
          {
            id: 'campaign',
            header: 'Chiến dịch',
            cell: (m: AdminMailMessageRow) =>
              m.campaignCode ? (
                <Link
                  href={`/mail/campaigns/${m.campaignCode}`}
                  className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                >
                  {m.campaignCode}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          } satisfies ColumnDef<AdminMailMessageRow>,
        ]),
    {
      id: 'template',
      header: 'Template',
      cell: (m) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs">{m.templateCode}</span>
          <span className="font-mono text-xs text-muted-foreground">v{m.templateVersion}</span>
        </span>
      ),
    },
    {
      id: 'workspace',
      header: 'Workspace',
      cell: (m) => {
        const wsId = m.workspaceId;
        // Chiến dịch gửi theo accountIds không gắn workspace nào, đây là null thật chứ không phải thiếu dữ liệu.
        if (!wsId) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground" title={wsId}>
              {shortId(wsId)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Chép workspaceId ${wsId}`}
              onClick={() => void copyWorkspace(wsId)}
            >
              <Copy className="size-3.5" />
            </Button>
          </span>
        );
      },
    },
    { id: 'status', header: 'Trạng thái', cell: (m) => <EnumBadge meta={MAIL_MESSAGE_STATUS[m.status]} /> },
    {
      id: 'attempts',
      header: 'Lần thử',
      className: 'font-mono text-xs',
      cell: (m) => attemptsLabel(m),
    },
    {
      id: 'next',
      header: 'Mốc kế tiếp',
      className: 'font-mono text-xs',
      cell: (m) => moment(m),
    },
    {
      id: 'note',
      header: 'Ghi chú',
      className: 'min-w-40',
      // `lastError` chỉ là kết luận khi FAILED. Dòng PENDING cũng mang lỗi của nấc backoff trước,
      // đọc nguyên văn ở đó là tưởng mail đã hỏng trong khi worker vẫn còn lượt thử.
      cell: (m) =>
        m.status === 'FAILED' && m.lastError ? (
          <Button
            variant="link"
            size="sm"
            className="max-w-56"
            onClick={() => setErrorRow(m)}
            aria-label={`Xem lỗi đầy đủ của ${m.toEmail}`}
          >
            <span className="min-w-0 truncate">{m.lastError.split('\n')[0]}</span>
          </Button>
        ) : m.status === 'PENDING' && m.lastError ? (
          <span className="text-xs text-muted-foreground">lỗi tạm, chờ thử lại</span>
        ) : m.providerMessageId ? (
          <span className="font-mono text-xs text-muted-foreground">ses {m.providerMessageId}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const filtered = hasActiveMessageFilters(values);

  const emptyContent = notFound ? (
    <EmptyState
      icon={<SearchX />}
      title="Không có chiến dịch này"
      description={`Mã ${effectiveCampaign} không tồn tại. Bộ lọc theo chiến dịch trả 404 chứ không trả danh sách rỗng, hãy chép lại mã dạng CMP-yyyyMMdd-XXXXXX.`}
      action={
        campaignCode ? undefined : (
          <Button variant="outline" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        )
      }
    />
  ) : query.error ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState
      icon={<SearchX />}
      title={filtered ? 'Không có mail nào khớp bộ lọc' : 'Chưa có mail nào'}
      description={
        filtered
          ? 'Ô email so khớp chính xác cả địa chỉ, gõ nửa chừng luôn ra 0 dòng.'
          : 'Mail xuất hiện ở đây ngay khi một chiến dịch xếp hàng người nhận.'
      }
      action={
        filtered ? (
          <Button variant="outline" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={query.error ? [] : (query.data?.content ?? [])}
        rowKey={(m) => `${m.campaignCode ?? '-'}:${m.toEmail}:${m.createdAt}`}
        isLoading={query.isPending}
        skeletonRows={6}
        mobileCards
        rowClassName={(m) => (m.status === 'CANCELED' ? 'opacity-60' : undefined)}
        paginated
        manualPagination
        pageIndex={page}
        pageCount={query.data?.totalPages ?? 1}
        totalRows={query.error ? 0 : (query.data?.totalElements ?? 0)}
        defaultPageSize={size}
        pageSizeOptions={[20, 30, 50]}
        onPageChange={setPage}
        // `manualPagination` để trang cho cha giữ: đổi cỡ mà quên hạ page là trỏ ra ngoài vùng dữ
        // liệu, mà `keepPreviousData` lại nuốt skeleton nên màn hình ra một trang rỗng giả.
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(0);
        }}
        emptyContent={emptyContent}
      />

      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>
          Worker kéo 50 mail mỗi 5 giây, tối đa 10 mail mỗi giây · backoff 1 phút, 5 phút, 30 phút,
          2 giờ, 6 giờ rồi thất bại
        </span>
        <span>
          Dòng chờ gửi nằm lâu giữa hai nấc backoff là bình thường · dòng đang gửi quá 5 phút được
          thu hồi về chờ gửi
        </span>
        <span>
          Message không có id riêng nên không có trang chi tiết và không gửi lại được từng dòng, mọi
          can thiệp nằm ở mức chiến dịch
        </span>
      </Text>

      <Dialog open={errorRow !== null} onOpenChange={(o) => !o && setErrorRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-left">
            <DialogTitle>Lỗi gần nhất</DialogTitle>
            <DialogDescription>
              {errorRow?.toEmail} · lần thử {errorRow?.attempts}
              {errorRow ? ` · ${MAIL_MESSAGE_STATUS[errorRow.status].label}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {/* Nguyên văn kỹ thuật từ SES, giữ tiếng Anh: dịch ra là mất chuỗi để tra cứu. */}
            <div className="rounded-lg border border-border bg-muted p-3">
              <code className="whitespace-pre-wrap wrap-break-word font-mono text-xs text-destructive-deep">
                {errorRow?.lastError}
              </code>
            </div>
            {errorRow?.providerMessageId && (
              <Text variant="caption" muted className="mt-2">
                Mã nhà cung cấp ghi kèm: <span className="font-mono">{errorRow.providerMessageId}</span>. SES có
                thể đã gửi thật rồi mới hỏng ở bước ghi trạng thái, nên gửi lại là chấp nhận rủi ro trùng mail.
              </Text>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorRow(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
