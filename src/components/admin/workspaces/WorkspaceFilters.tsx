'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectNative } from '@/components/ui/SelectNative';
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

export function hasActiveFilters(v: WorkspaceFilterValues): boolean {
  return !!(v.q || v.type || v.subscriptionStatus || v.planCode);
}

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Tìm theo tên workspace hoặc email chủ sở hữu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
          aria-label="Tìm workspace"
        />
        <SegmentedControl
          options={SORT_OPTIONS}
          value={values.sort}
          onValueChange={(v) => onChange({ sort: v as WorkspaceFilterValues['sort'] })}
          size="sm"
          className="shrink-0"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectNative size="sm" value={values.type ?? ''} onChange={(e) => onChange({ type: (e.target.value || undefined) as WorkspaceType | undefined })} aria-label="Loại">
          <option value="">Loại: Tất cả</option>
          {(Object.keys(WORKSPACE_TYPE) as WorkspaceType[]).map((t) => (
            <option key={t} value={t}>
              {WORKSPACE_TYPE[t]}
            </option>
          ))}
        </SelectNative>
        <SelectNative
          size="sm"
          value={values.subscriptionStatus ?? ''}
          onChange={(e) => onChange({ subscriptionStatus: (e.target.value || undefined) as SubscriptionStatus | undefined })}
          aria-label="Trạng thái gói"
        >
          <option value="">Trạng thái gói: Tất cả</option>
          {(Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectNative>
        <SelectNative size="sm" value={values.planCode ?? ''} onChange={(e) => onChange({ planCode: e.target.value || undefined })} aria-label="Gói">
          <option value="">Gói: Tất cả</option>
          {plans?.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} · {p.code}
              {p.isActive ? '' : ' (ngừng bán)'}
            </option>
          ))}
        </SelectNative>
        {hasActiveFilters(values) && (
          <Button variant="link" size="sm" onClick={onClear}>
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
