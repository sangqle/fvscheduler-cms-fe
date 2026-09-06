'use client';

import * as React from 'react';
import Link from 'next/link';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  MailX,
  Pin,
  RefreshCw,
  RotateCcw,
  Send,
  Slash,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heading } from '@/components/ui/Heading';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { CampaignProgress } from '@/components/admin/mail/CampaignProgress';
import { MessageFilters, type MessageFilterValues } from '@/components/admin/mail/MailFilters';
import { MessageTable } from '@/components/admin/mail/MessageTable';
import { VersionChip } from '@/components/admin/mail/mailDisplay';
import { useCampaignAction, useMailCampaign } from '@/hooks/useAdminMail';
import { apiErrorMessage } from '@/lib/api/auth';
import { MAIL_CAMPAIGN_STATUS } from '@/lib/admin/labels';
import { isCampaignLive } from '@/lib/admin/mail';
import { formatDateTime } from '@/lib/utils';

const CAMPAIGNS_HREF = '/mail?tab=campaigns';

/** Query key gốc của outbox: bảng người nhận sống ở nhiều bộ lọc nên phải invalidate cả nhánh. */
const MESSAGES_KEY = ['admin', 'mail', 'messages'] as const;

/**
 * Bảng người nhận ở đây đã bị khoá vào một chiến dịch nên bộ lọc là state cục bộ, không lên URL:
 * link chia sẻ của màn này là chính mã chiến dịch, không phải một lát cắt của nhật ký gửi.
 */
const NO_MESSAGE_FILTERS: MessageFilterValues = { sort: 'createdAt,desc' };

/** Chỉ cần giờ phút giây: dòng này luôn nói về "vừa nãy", ngày tháng đã có ở phần đầu màn. */
function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour12: false });
}

/** CMS-13: theo dõi tiến độ một chiến dịch, hủy phần chưa gửi, xếp lại phần lỗi. */
export function CampaignDetailScreen({ campaignCode }: { campaignCode: string }) {
  const { showToast } = useToast();
  const query = useMailCampaign(campaignCode);
  const action = useCampaignAction(campaignCode);
  const queryClient = useQueryClient();
  // Bảng người nhận dùng hook riêng, không có nhịp polling; đếm số request đang bay để nút tải
  // lại biết lúc nào phải tự khóa.
  const messagesFetching = useIsFetching({ queryKey: MESSAGES_KEY });
  const [dialog, setDialog] = React.useState<'cancel' | 'retry' | null>(null);
  const [messageFilters, setMessageFilters] = React.useState<MessageFilterValues>(NO_MESSAGE_FILTERS);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.error) {
    if (isNotFound(query.error)) {
      return (
        <NotFoundState
          title="Không có chiến dịch này"
          description={`Mã ${campaignCode} không có trong hệ thống. Mã chiến dịch do backend sinh lúc tạo và không đổi được.`}
          backHref={CAMPAIGNS_HREF}
          backLabel="Về danh sách chiến dịch"
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const c = query.data;
  const canceled = c.status === 'CANCELED';
  const processed = c.sent + c.failed + c.canceled;
  // Dùng chung vị từ với `useMailCampaign` để chỉ báo và nhịp đọc lại không bao giờ lệch nhau:
  // vẽ chấm "đang sống", còn lại phải nói thẳng là số liệu đã đứng yên.
  const polling = isCampaignLive(c);
  const updatedAt = clockTime(query.dataUpdatedAt);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(c.campaignCode);
      showToast({ title: 'Đã chép mã chiến dịch', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  function run(kind: 'cancel' | 'retry') {
    action.mutate(kind === 'cancel' ? 'cancel' : 'retry-failed', {
      // `affected: 0` là một kết cục hợp lệ (hủy một chiến dịch đã DONE, xếp lại khi không còn
      // dòng lỗi), không phải lỗi: đổi câu chữ chứ không in ra "0 mail".
      onSuccess: (result) => {
        const empty = result.affected === 0;
        showToast({
          title:
            kind === 'cancel'
              ? empty
                ? 'Chiến dịch đã được đánh dấu CANCELED, không còn mail nào đang chờ'
                : `Đã hủy ${result.affected} mail đang chờ`
              : empty
                ? 'Không còn mail lỗi để xếp lại'
                : `Đã xếp lại ${result.affected} mail lỗi`,
          variant: empty ? 'info' : 'success',
        });
      },
      // 409 ở đây là một kết cục thật (xếp lại một chiến dịch đã hủy), không phải sự cố:
      // đọc nguyên văn message backend rồi đóng hộp, số liệu đã tự làm mới.
      onError: (error) => {
        showToast({ title: apiErrorMessage(error, 'Không thực hiện được'), variant: 'error' });
      },
      onSettled: () => setDialog(null),
    });
  }

  const retryBlockedReason = canceled
    ? 'Chiến dịch đã hủy, không thể gửi lại'
    : c.failed === 0
      ? 'Không có mail lỗi để xếp lại'
      : undefined;
  // Backend không kiểm trạng thái khi hủy: một chiến dịch DONE vẫn hủy được (chỉ đổi nhãn,
  // `affected = 0`), chỉ CANCELED mới là gọi lại vô nghĩa. Hết `pending` là một lời nhắc, không
  // phải điều kiện khóa nút.
  const cancelBlockedReason = canceled ? 'Chiến dịch đã ở CANCELED, hủy lại không đổi gì' : undefined;
  const cancelHint =
    !canceled && c.pending === 0
      ? 'Không còn mail nào đang chờ, hủy lúc này chỉ đánh dấu chiến dịch là CANCELED'
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="link" size="sm" className="self-start" asChild>
          <Link href={CAMPAIGNS_HREF}>
            <ArrowLeft className="size-4" />
            Chiến dịch
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading level="2">{c.name}</Heading>
              <EnumBadge meta={MAIL_CAMPAIGN_STATUS[c.status]} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 font-mono hover:text-foreground"
              >
                {c.campaignCode} <Copy className="size-3" />
              </button>
              <span className="inline-flex items-center gap-1">
                · template
                <Link href={`/mail/templates/${c.templateCode}`} className="font-mono hover:text-foreground hover:underline">
                  {c.templateCode}
                </Link>
                <VersionChip version={c.templateVersion} />
              </span>
              <span>· tạo {formatDateTime(c.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút disabled không nhận hover nên tooltip phải bám vào span bọc ngoài. */}
            <Tooltip content={retryBlockedReason}>
              <span className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!retryBlockedReason || action.isPending}
                  onClick={() => setDialog('retry')}
                >
                  <RotateCcw className="size-4" />
                  Gửi lại phần lỗi
                </Button>
              </span>
            </Tooltip>
            <Tooltip content={cancelBlockedReason ?? cancelHint}>
              <span className="inline-flex">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!!cancelBlockedReason || action.isPending}
                  onClick={() => setDialog('cancel')}
                >
                  <Ban className="size-4" />
                  Hủy phần chưa gửi
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      <NoticeBanner
        intent="info"
        icon={<Pin />}
        title={
          <>
            Chiến dịch ghim <VersionChip version={c.templateVersion} />
          </>
        }
        description={`Mọi mail của chiến dịch render bằng bản v${c.templateVersion} chốt lúc tạo, template sửa sau đó không đổi nội dung đang gửi.`}
      />

      <Card>
        <CardContent standalone className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading level="4">Tiến độ</Heading>
              {polling && <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-info" />}
              <Text variant="caption" muted>
                {polling
                  ? `Đang theo dõi, cập nhật lúc ${updatedAt}, tự đọc lại mỗi 5 giây`
                  : `Số liệu chốt lúc ${updatedAt}, không còn đọc lại tự động`}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Text variant="caption" muted className="tabular-nums">
                {processed} / {c.total} người nhận đã xử lý
              </Text>
              {!polling && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  {query.isFetching ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
                  Tải lại
                </Button>
              )}
            </div>
          </div>

          <CampaignProgress campaign={c} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Đã gửi"
              value={c.sent}
              sublabel="SES đã nhận"
              icon={<CheckCircle2 />}
              intent="success"
            />
            <StatCard
              label="Chờ gửi"
              value={c.pending}
              sublabel="worker kéo mỗi 5 giây"
              icon={<Clock />}
              intent="warning"
            />
            <StatCard
              label="Đang gửi"
              value={c.sending}
              sublabel="quá 5 phút sẽ tự thu hồi"
              icon={<Send />}
              intent="info"
            />
            <StatCard
              label="Thất bại"
              value={c.failed}
              sublabel="hết 5 lần thử"
              icon={<AlertTriangle />}
              intent="destructive"
            />
            <StatCard
              label="Đã hủy"
              value={c.canceled}
              sublabel="dừng trước khi gửi"
              icon={<Slash />}
              intent="muted"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Heading level="3">Người nhận</Heading>
          {c.total > 0 && (
            <Tooltip content="Bảng này không có nhịp tự đọc lại như các con số phía trên nên có thể chậm hơn chúng vài nhịp">
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY })}
                  disabled={messagesFetching > 0}
                >
                  {messagesFetching > 0 ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
                  Tải lại danh sách người nhận
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
        {c.total === 0 ? (
          <Card>
            <EmptyState
              icon={<MailX />}
              title="Không có người nhận hợp lệ"
              description="Lúc tạo, không ai trong danh sách có email dùng được: workspace không có chủ sở hữu kèm email, hoặc tài khoản được chọn chưa có email. Đây vẫn là một chiến dịch hợp lệ, chốt DONE ngay với 0 mail. Tạo lại với danh sách khác nếu cần gửi."
            />
          </Card>
        ) : (
          <>
            <MessageFilters
              values={messageFilters}
              onChange={(patch) => setMessageFilters((prev) => ({ ...prev, ...patch }))}
              onClear={() => setMessageFilters(NO_MESSAGE_FILTERS)}
              scoped
            />
            <MessageTable
              values={messageFilters}
              onClearFilters={() => setMessageFilters(NO_MESSAGE_FILTERS)}
              campaignCode={campaignCode}
              hideCampaignColumn
            />
          </>
        )}
        <Text variant="caption" muted>
          Mail lỗi tự thử lại theo nhịp 1 phút, 5 phút, 30 phút, 2 giờ, 6 giờ, quá 5 lần thì dừng
          hẳn ở thất bại. Chiến dịch chạy vài phút là bình thường.
        </Text>
      </div>

      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        variant="destructive"
        icon={Ban}
        title="Hủy phần chưa gửi?"
        description={
          c.pending === 0
            ? `Không còn mail nào đang chờ nên sẽ không có dòng nào đổi trạng thái, hủy lúc này chỉ đánh dấu chiến dịch là CANCELED. Mail đã gửi hoặc đang gửi dở (${c.sending}) không thu hồi được, và chiến dịch đã hủy thì không xếp lại phần lỗi được nữa.`
            : `Hủy sẽ dừng ${c.pending} mail đang chờ. Mail đã gửi hoặc đang gửi dở (${c.sending}) vẫn đến tay người nhận, không thu hồi được. Chiến dịch đã hủy không gửi lại phần lỗi được.`
        }
        confirmLabel="Hủy phần chưa gửi"
        cancelLabel="Đóng"
        onConfirm={() => run('cancel')}
        isPending={action.isPending}
      />
      <ConfirmDialog
        open={dialog === 'retry'}
        onOpenChange={(o) => !o && setDialog(null)}
        variant="warning"
        icon={RotateCcw}
        title="Gửi lại phần lỗi?"
        description={`Xếp lại ${c.failed} mail lỗi vào hàng đợi, đếm lại số lần thử từ 0. Chiến dịch chuyển về RUNNING.`}
        confirmLabel="Xếp lại"
        onConfirm={() => run('retry')}
        isPending={action.isPending}
      />
    </div>
  );
}
