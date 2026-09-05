'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Layers, MoreHorizontal, Pencil, Power, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { ChoiceSelect, FilterSelect } from '@/components/admin/shared/FilterSelect';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { DeletePlanDialog } from '@/components/admin/plans/DeletePlanDialog';
import {
  LimitChips,
  PlanStateBadges,
  PriceCell,
  canDeletePlan,
  effectivePrice,
  referenceCount,
} from '@/components/admin/plans/planDisplay';
import { useAdminPlans, useUpdatePlan } from '@/hooks/useAdminPlans';
import { useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/auth';
import type { AdminPlan, UpdatePlanInput } from '@/types/admin';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
];

const SORT_OPTIONS = [
  { value: 'sort', label: 'Sort của trang giá' },
  { value: 'code', label: 'Mã gói' },
  { value: 'price', label: 'Giá năm' },
];

/** Chỉ 4 trường lõi được `PUT`, giá giữ nguyên khi bảng chỉ bật/tắt bán. */
function corePayload(plan: AdminPlan, patch: Partial<UpdatePlanInput> = {}): UpdatePlanInput {
  return {
    name: plan.name,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    monthlyListPrice: plan.monthlyListPrice,
    monthlySalePrice: plan.monthlySalePrice,
    yearlyListPrice: plan.yearlyListPrice ?? 0,
    yearlySalePrice: plan.yearlySalePrice,
    ...patch,
  };
}

function sortPlans(plans: AdminPlan[], by: string): AdminPlan[] {
  const rows = [...plans];
  if (by === 'code') return rows.sort((a, b) => a.code.localeCompare(b.code));
  if (by === 'price') {
    return rows.sort(
      (a, b) =>
        (effectivePrice(a.yearlyListPrice, a.yearlySalePrice) ?? 0) -
        (effectivePrice(b.yearlyListPrice, b.yearlySalePrice) ?? 0),
    );
  }
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

/** CMS-07: danh sách gói quản lý được — bật/tắt bán ngay trên hàng, tạo, xóa khi chưa ai dùng. */
export function PlanTable({ onCreate }: { onCreate: () => void }) {
  const router = useRouter();
  const { get, set } = useUrlState();
  const { showToast } = useToast();
  const { data, isPending, error, refetch } = useAdminPlans();
  const update = useUpdatePlan();

  const qParam = get('q');
  const status = get('status');
  const sortBy = get('sort') ?? 'sort';

  const [q, setQ] = React.useState(qParam ?? '');
  React.useEffect(() => setQ(qParam ?? ''), [qParam]);
  React.useEffect(() => {
    if (q === (qParam ?? '')) return;
    const t = setTimeout(() => set({ q: q || undefined }), 300);
    return () => clearTimeout(t);
  }, [q, qParam, set]);

  /** Gói đang chờ xác nhận trước khi đổi trạng thái bán (ngừng bán, hoặc mở bán gói còn rỗng). */
  const [pendingToggle, setPendingToggle] = React.useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = React.useState<AdminPlan | null>(null);

  const rows = React.useMemo(() => {
    const needle = (qParam ?? '').trim().toLowerCase();
    const filtered = (data ?? []).filter((p) => {
      if (status === 'active' && !p.isActive) return false;
      if (status === 'inactive' && p.isActive) return false;
      if (!needle) return true;
      return p.code.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle);
    });
    return sortPlans(filtered, sortBy);
  }, [data, qParam, status, sortBy]);

  const activeCount = (data ?? []).filter((p) => p.isActive).length;
  const draftCount = (data ?? []).filter((p) => !p.isActive && referenceCount(p) === 0).length;
  const filtered = Boolean(qParam || status);

  function applyActive(plan: AdminPlan, isActive: boolean) {
    update.mutate(
      { code: plan.code, input: corePayload(plan, { isActive }) },
      {
        onSuccess: () =>
          showToast({
            title: isActive ? `Đã mở bán ${plan.name}` : `Đã ngừng bán ${plan.name}`,
            description: isActive
              ? 'Gói hiện lại trên trang giá công khai và tạo được đơn tự phục vụ.'
              : 'Gói mất khỏi trang giá công khai. Workspace đang dùng không bị ảnh hưởng.',
            variant: isActive ? 'success' : 'warning',
          }),
        onError: (e) =>
          showToast({
            title: 'Không đổi được trạng thái bán',
            description: apiErrorMessage(e, 'Vui lòng thử lại.'),
            variant: 'error',
          }),
      },
    );
  }

  /** Ngừng bán gói đang có người dùng, và mở bán gói chưa có limit nào, đều hỏi lại trước. */
  function requestToggle(plan: AdminPlan, next: boolean) {
    const risky = next
      ? Object.keys(plan.limits).length === 0
      : referenceCount(plan) > 0;
    if (risky) setPendingToggle(plan);
    else applyActive(plan, next);
  }

  const columns: ColumnDef<AdminPlan>[] = [
    {
      id: 'plan',
      header: 'Gói',
      className: 'min-w-52',
      cell: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground">{p.name}</span>
            <PlanStateBadges plan={p} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
        </div>
      ),
    },
    {
      id: 'active',
      header: 'Bán',
      cell: (p) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Switch bị disabled không nhận hover, nên trigger tooltip là khối bọc chứ không phải nó. */}
          <Tooltip content={p.isTrialPlan ? 'Gói trial cấu hình sẵn, backend từ chối tắt bán' : undefined}>
            <span className="inline-flex">
              <Switch
                checked={p.isActive}
                disabled={p.isTrialPlan || update.isPending}
                onCheckedChange={(next) => requestToggle(p, next)}
                aria-label={`Bán gói ${p.name}`}
              />
            </span>
          </Tooltip>
          <span className="text-xs text-muted-foreground">{p.isActive ? 'Đang bán' : 'Ngừng bán'}</span>
        </div>
      ),
    },
    {
      id: 'monthly',
      header: 'Giá tháng',
      cell: (p) => <PriceCell list={p.monthlyListPrice} sale={p.monthlySalePrice} />,
    },
    {
      id: 'yearly',
      header: 'Giá năm',
      cell: (p) => <PriceCell list={p.yearlyListPrice} sale={p.yearlySalePrice} />,
    },
    { id: 'limits', header: 'Limits', className: 'min-w-44', cell: (p) => <LimitChips limits={p.limits} /> },
    {
      id: 'composition',
      header: 'Thành phần',
      cell: (p) => (
        <Button variant="link" size="sm" asChild onClick={(e) => e.stopPropagation()}>
          <Link href={`/plans/${p.code}?tab=composition`}>
            Soạn thành phần
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      ),
    },
    {
      id: 'usage',
      header: 'Đang dùng',
      cell: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">
            {p.usage.subscriptions} sub · {p.usage.orders} đơn
          </span>
          <span className="text-xs text-muted-foreground">
            {canDeletePlan(p) ? 'xóa được' : 'không xóa được'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với gói ${p.name}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/plans/${p.code}`}>
                  <Pencil className="mr-2 size-4" />
                  Sửa thông tin gói
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/plans/${p.code}?tab=composition`}>
                  <Layers className="mr-2 size-4" />
                  Sửa thành phần
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={p.isTrialPlan || update.isPending}
                onSelect={() => requestToggle(p, !p.isActive)}
              >
                <Power className="mr-2 size-4" />
                {p.isActive ? 'Ngừng bán' : 'Mở bán'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(p)}>
                <Trash2 className="mr-2 size-4" />
                Xóa gói vĩnh viễn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const toggleTarget = pendingToggle;
  const toggleToActive = toggleTarget ? !toggleTarget.isActive : false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Tìm theo mã hoặc tên gói"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm gói"
          containerClassName="w-full min-w-52 flex-1 basis-60 sm:w-auto lg:max-w-80"
        />
        <FilterSelect
          label="Trạng thái"
          value={status}
          onChange={(v) => set({ status: v })}
          options={STATUS_OPTIONS}
          className="shrink-0"
        />
        <ChoiceSelect
          label="Sắp theo"
          value={sortBy}
          onChange={(v) => set({ sort: v === 'sort' ? undefined : v })}
          options={SORT_OPTIONS}
          className="shrink-0"
        />
        <Text variant="caption" muted className="ml-auto">
          {activeCount} gói đang bán · {draftCount} nháp chưa mở bán
        </Text>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(p) => p.code}
        isLoading={isPending}
        skeletonRows={8}
        mobileCards
        onRowClick={(p) => router.push(`/plans/${p.code}`)}
        rowClassName={(p) => (p.isActive ? undefined : 'opacity-70')}
        emptyContent={
          filtered ? undefined : (
            <EmptyState
              title="Catalog chưa có gói nào"
              description="Tạo một gói ở trạng thái nháp, soạn thành phần, rồi mới mở bán."
              action={<Button onClick={onCreate}>Tạo gói</Button>}
            />
          )
        }
        emptyMessage="Không có gói nào khớp bộ lọc"
      />

      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>∞ = giới hạn có trong gói nhưng không chặn · thiếu chip = gói không mang giới hạn đó</span>
        <span>Bỏ trống giá bán = bán đúng giá niêm yết · giá gạch ngang là giá niêm yết</span>
        <span>
          Xóa vĩnh viễn chỉ được khi 0 subscription và 0 đơn, tính cả đơn đã hủy và đã hết hạn · còn tham chiếu
          thì ngừng bán
        </span>
        <span>Gói trial lấy theo cấu hình backend: không tắt bán và không xóa được</span>
      </Text>

      {toggleTarget && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPendingToggle(null)}
          variant="warning"
          title={toggleToActive ? `Mở bán ${toggleTarget.name}?` : `Ngừng bán ${toggleTarget.name}?`}
          description={
            toggleToActive
              ? 'Gói này chưa có limit nào. Mở bán ngay là khách mua được một gói rỗng, nên soạn thành phần trước.'
              : `${toggleTarget.usage.subscriptions} subscription và ${toggleTarget.usage.orders} đơn đang trỏ vào gói này. Gói sẽ mất khỏi trang giá công khai ngay sau khi lưu và không tạo được đơn tự phục vụ mới. Workspace đang dùng giữ nguyên quyền tới khi hết hạn, và bạn vẫn cấp tay được gói này.`
          }
          confirmLabel={toggleToActive ? 'Mở bán' : 'Ngừng bán'}
          isPending={update.isPending}
          onConfirm={() => {
            applyActive(toggleTarget, toggleToActive);
            setPendingToggle(null);
          }}
        />
      )}

      <DeletePlanDialog
        plan={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onRetire={(plan) => {
          setDeleting(null);
          applyActive(plan, false);
        }}
      />
    </div>
  );
}
