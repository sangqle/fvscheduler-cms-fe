'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Mail, Megaphone, MoreHorizontal, Pencil, Power, SearchX, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { hasActiveTemplateFilters, type TemplateFilterValues } from '@/components/admin/mail/MailFilters';
import { CategoryBadge, ContextChips, TemplateFlags, VersionChip } from '@/components/admin/mail/mailDisplay';
import { CreateCampaignDialog } from '@/components/admin/mail/CreateCampaignDialog';
import { TestSendDialog } from '@/components/admin/mail/TestSendDialog';
import { useMailTemplates, useSetMailTemplateActive } from '@/hooks/useAdminMail';
import { apiErrorMessage } from '@/lib/api/auth';
import { isSendableTemplate, isTestSendable } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/utils';
import type { AdminMailTemplateRow } from '@/types/admin';

/** Gửi thử chỉ vướng đúng một ca: `MailTemplateService.testSend` không hề đọc cờ `active`. */
function testSendBlockReason(t: AdminMailTemplateRow): string | undefined {
  if (t.category === 'PARTIAL') return 'PARTIAL là mảnh dùng chung để include, gửi trực tiếp trả 409.';
  return undefined;
}

/** Tạo chiến dịch mới là việc DUY NHẤT mà tắt template chặn được, nên nó có thêm điều kiện `active`. */
function campaignBlockReason(t: AdminMailTemplateRow): string | undefined {
  if (t.category === 'PARTIAL') return 'PARTIAL là mảnh dùng chung để include, không đặt làm template chiến dịch được.';
  if (!t.active) return 'Template đang tắt: chỉ chặn tạo chiến dịch mới, gửi thử vẫn dùng được.';
  return undefined;
}

/**
 * Danh sách template. Bộ lọc do `MailScreen` giữ trên URL và truyền xuống bằng `values` (cùng
 * khuôn `PlanTable` / `WorkspaceTable`); tìm theo mã hoặc tên chạy tại client vì backend chỉ lọc
 * `category` và `active`.
 */
export function TemplateTable({
  values,
  onCreate,
  onClearFilters,
}: {
  values: TemplateFilterValues;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const { data, isPending, error, refetch } = useMailTemplates({
    category: values.category,
    active: values.active === undefined ? undefined : values.active === 'true',
    sort: values.sort,
  });
  const setActive = useSetMailTemplateActive();

  const [testSend, setTestSend] = React.useState<AdminMailTemplateRow | null>(null);
  const [campaignFor, setCampaignFor] = React.useState<AdminMailTemplateRow | null>(null);

  const all = React.useMemo(() => data?.content ?? [], [data]);
  const rows = React.useMemo(() => {
    const needle = (values.q ?? '').trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (t) => t.code.toLowerCase().includes(needle) || t.name.toLowerCase().includes(needle),
    );
  }, [all, values.q]);

  function applyActive(template: AdminMailTemplateRow, active: boolean) {
    setActive.mutate(
      { code: template.code, active },
      {
        onSuccess: () =>
          showToast({
            title: active ? `Đã bật ${template.name}` : `Đã tắt ${template.name}`,
            description: active
              ? 'Template dùng được lại để tạo chiến dịch mới.'
              : 'Chỉ chiến dịch mới bị chặn (409). Xem trước và gửi thử vẫn chạy, chiến dịch đang chạy vẫn gửi nốt bằng version đã ghim.',
            variant: active ? 'success' : 'warning',
          }),
        onError: (e) =>
          showToast({
            title: 'Không đổi được trạng thái',
            description: apiErrorMessage(e, 'Vui lòng thử lại.'),
            variant: 'error',
          }),
      },
    );
  }

  const columns: ColumnDef<AdminMailTemplateRow>[] = [
    {
      id: 'template',
      header: 'Template',
      className: 'min-w-56',
      cell: (t) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground">{t.name}</span>
            <TemplateFlags template={t} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
          {t.description && (
            // Mô tả dài cắt ở một dòng: bảng này còn sáu cột nữa, cho nó xuống dòng là mỗi hàng
            // cao gấp đôi. Chuỗi đầy đủ vẫn đọc được bằng tooltip gốc của trình duyệt.
            <span className="block max-w-72 truncate text-xs text-muted-foreground" title={t.description}>
              {t.description}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Loại',
      cell: (t) => <CategoryBadge category={t.category} />,
    },
    {
      id: 'context',
      header: 'Ngữ cảnh cần',
      className: 'min-w-40',
      cell: (t) => <ContextChips groups={t.requiredContext} />,
    },
    { id: 'version', header: 'Bản hiện hành', cell: (t) => <VersionChip version={t.currentVersion} /> },
    {
      id: 'active',
      header: 'Bật',
      cell: (t) => (
        // Ghi thẳng, không hỏi lại: tắt một template chỉ chặn đúng một việc là tạo chiến dịch
        // mới bằng nó, và bật lại là một cú bấm. Dialog xác nhận để dành cho thao tác không lùi
        // được (mark-paid, hủy gói), không phải cho một cái công tắc.
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={t.active}
            disabled={setActive.isPending}
            onCheckedChange={(next) => applyActive(t, next)}
            aria-label={`Bật template ${t.name}`}
          />
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">{t.active ? 'Đang bật' : 'Đã tắt'}</span>
            {!t.active && (
              <span className="text-[11px] text-muted-foreground/80">không tạo chiến dịch mới được</span>
            )}
          </span>
        </div>
      ),
    },
    {
      id: 'updated',
      header: 'Sửa lần cuối',
      className: 'font-mono text-xs',
      cell: (t) => formatDateTime(t.updatedAt),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (t) => {
        // Hai điều kiện tách hẳn nhau: gửi thử chỉ kiêng PARTIAL, tạo chiến dịch kiêng thêm
        // template đã tắt. Gộp lại là khoá nhầm một nút mà backend không chặn.
        const testBlocked = testSendBlockReason(t);
        const campaignBlocked = campaignBlockReason(t);
        const blockNote = testBlocked ?? campaignBlocked;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với template ${t.name}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/mail/templates/${t.code}`}>
                    <Pencil className="mr-2 size-4" />
                    Soạn nội dung
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/mail/templates/${t.code}#versions`}>
                    <History className="mr-2 size-4" />
                    Xem lịch sử version
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Dòng bị khoá có `pointer-events-none`, nên tooltip phải bám vào thẻ bọc mới nhận
                    được hover: xem ghi chú "Disabled-trigger" trong `Tooltip.tsx`. */}
                <Tooltip content={testBlocked} side="left">
                  <span className="block">
                    <DropdownMenuItem disabled={!isTestSendable(t)} onSelect={() => setTestSend(t)}>
                      <Send className="mr-2 size-4" />
                      Gửi thử
                    </DropdownMenuItem>
                  </span>
                </Tooltip>
                <Tooltip content={campaignBlocked} side="left">
                  <span className="block">
                    <DropdownMenuItem disabled={!isSendableTemplate(t)} onSelect={() => setCampaignFor(t)}>
                      <Megaphone className="mr-2 size-4" />
                      Tạo chiến dịch từ template này
                    </DropdownMenuItem>
                  </span>
                </Tooltip>
                {blockNote && <DropdownMenuLabel className="whitespace-normal">{blockNote}</DropdownMenuLabel>}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={setActive.isPending}
                  onSelect={() => applyActive(t, !t.active)}
                >
                  <Power className="mr-2 size-4" />
                  {t.active ? 'Tắt template' : 'Bật template'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const filtered = hasActiveTemplateFilters(values);

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(t) => t.code}
        isLoading={isPending}
        skeletonRows={6}
        mobileCards
        onRowClick={(t) => router.push(`/mail/templates/${t.code}`)}
        rowClassName={(t) => (t.active ? undefined : 'opacity-70')}
        emptyContent={
          filtered ? (
            <EmptyState
              icon={<SearchX />}
              title="Không có template nào khớp bộ lọc"
              description="Ô tìm kiếm chạy tại client trên danh sách đã tải, chỉ so mã và tên."
              action={
                <Button variant="outline" onClick={onClearFilters}>
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Mail />}
              title="Chưa có template nào ngoài chân trang chung"
              description="Seed chỉ dựng sẵn footer-vi. Tạo template đầu tiên rồi soạn nội dung, mỗi lần lưu sinh version mới và hai replica nhận ngay."
              action={<Button onClick={onCreate}>Tạo template</Button>}
            />
          )
        }
      />

      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>
          PARTIAL là khung dùng chung, gọi bằng{' '}
          <code className="font-mono">{'{% include "footer-vi" %}'}</code> · mọi đường gửi từ chối gửi trực tiếp
          partial
        </span>
        <span>
          Tắt một template chỉ chặn tạo chiến dịch mới bằng nó · xem trước và gửi thử vẫn chạy, chiến
          dịch đang chạy không bị ảnh hưởng
        </span>
        <span>
          Năm mail giao dịch cũ (booking-confirmed, booking-updated, invitation, password-reset,
          schedule-reminder) vẫn nằm trong code, không quản lý ở đây
        </span>
        <span>Ba mail subscription tự động thuộc phase 2, chưa có template nào ở đây</span>
      </Text>

      <TestSendDialog
        templateCode={testSend?.code ?? null}
        templateName={testSend?.name}
        onOpenChange={(o) => !o && setTestSend(null)}
      />
      <CreateCampaignDialog
        open={campaignFor !== null}
        onOpenChange={(o) => !o && setCampaignFor(null)}
        initialTemplateCode={campaignFor?.code}
      />
    </div>
  );
}
