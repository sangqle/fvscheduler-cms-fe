'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FilterSelect } from '@/components/admin/shared/FilterSelect';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { SUBSCRIPTION_STATUS, WORKSPACE_TYPE } from '@/lib/admin/labels';
import type { SubscriptionStatus, WorkspaceType } from '@/types/admin';

export interface WorkspaceFilterValues {
  q?: string;
  type?: WorkspaceType;
  subscriptionStatus?: SubscriptionStatus;
  planCode?: string;
  sort: 'createdAt,desc' | 'name,asc';
}

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất' },
  { value: 'name,asc', label: 'Tên A→Z' },
];

const TYPE_OPTIONS = (Object.keys(WORKSPACE_TYPE) as WorkspaceType[]).map((t) => ({ value: t, label: WORKSPACE_TYPE[t] }));
const STATUS_OPTIONS = (Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((s) => ({ value: s, label: s }));

export function hasActiveFilters(v: WorkspaceFilterValues): boolean {
  return !!(v.q || v.type || v.subscriptionStatus || v.planCode);
}

/** Sắp xếp đứng cạnh tiêu đề màn (slot `actions` của `PageHeader`), không nằm trong hàng lọc. */
export function WorkspaceSortControl({ value, onChange }: { value: WorkspaceFilterValues['sort']; onChange: (v: WorkspaceFilterValues['sort']) => void }) {
  return (
    <SegmentedControl
      options={SORT_OPTIONS}
      value={value}
      onValueChange={(v) => onChange(v as WorkspaceFilterValues['sort'])}
      size="sm"
      aria-label="Sắp xếp"
    />
  );
}

/**
 * Một hàng duy nhất: ô tìm co giãn, ba dropdown rộng theo nội dung, ghi chú đẩy sát phải.
 * Không xếp dọc từng dòng một control nữa; wrap tự nhiên khi hẹp. Mọi control cao 36px.
 */
export function WorkspaceFilters({
  values,
  onChange,
  onClear,
}: {
  values: WorkspaceFilterValues;
  onChange: (patch: Partial<WorkspaceFilterValues>) => void;
  onClear: () => void;
}) {
  const { data: plans } = useAdminPlans();
  const [q, setQ] = React.useState(values.q ?? '');
  React.useEffect(() => setQ(values.q ?? ''), [values.q]);

  // Debounce ô tìm kiếm 300ms để không bắn request mỗi phím.
  React.useEffect(() => {
    if (q === (values.q ?? '')) return;
    const t = setTimeout(() => onChange({ q: q || undefined }), 300);
    return () => clearTimeout(t);
  }, [q, values.q, onChange]);

  const planOptions = React.useMemo(
    () => (plans ?? []).map((p) => ({ value: p.code, label: `${p.name}${p.isActive ? '' : ' · ngừng bán'}` })),
    [plans],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        leadingIcon={<Search className="size-4" />}
        placeholder="Tìm theo tên workspace hoặc email chủ sở hữu"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Tìm workspace"
        containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
      />
      <FilterSelect label="Loại" value={values.type} onChange={(v) => onChange({ type: v as WorkspaceType | undefined })} options={TYPE_OPTIONS} className="w-auto" />
      <FilterSelect
        label="Trạng thái gói"
        value={values.subscriptionStatus}
        onChange={(v) => onChange({ subscriptionStatus: v as SubscriptionStatus | undefined })}
        options={STATUS_OPTIONS}
        className="w-auto"
      />
      <FilterSelect label="Gói" value={values.planCode} onChange={(v) => onChange({ planCode: v })} options={planOptions} className="w-auto max-w-56" />
      {hasActiveFilters(values) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      <p className="w-full text-xs leading-snug text-muted-foreground sm:ml-auto sm:w-auto sm:max-w-64 sm:text-right">
        Không có thao tác ghi ở màn này · grant / extend / cancel nằm trong chi tiết
      </p>
    </div>
  );
}
