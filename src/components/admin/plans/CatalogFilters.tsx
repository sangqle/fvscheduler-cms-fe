'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { FilterSelect } from '@/components/admin/shared/FilterSelect';
import { isDraft } from '@/components/admin/plans/planDisplay';
import { useCatalogGroups, useCatalogItems } from '@/hooks/useAdminCatalog';
import { useAdminPlans } from '@/hooks/useAdminPlans';

/**
 * Hàng lọc của hai tab catalog, cùng khuôn với `WorkspaceFilters`: ô tìm co giãn, dropdown rộng
 * theo nội dung, nút "Xóa bộ lọc" chỉ hiện khi có lọc, ghi chú đẩy sát phải. Sắp xếp không nằm
 * trong hàng lọc mà đứng cạnh tiêu đề màn (`PlanSortControl` trong slot `actions` của `PageHeader`).
 */

export type PlanSort = 'sort' | 'code' | 'price';
/** Lọc theo cờ `isActive`: gói đang bán / ngừng bán, item đang bật / đã tắt. */
export type ActiveFilter = 'active' | 'inactive';

export interface PlanFilterValues {
  q?: string;
  status?: ActiveFilter;
  sort: PlanSort;
}

export interface ItemFilterValues {
  q?: string;
  group?: string;
  status?: ActiveFilter;
}

const PLAN_SORTS: PlanSort[] = ['sort', 'code', 'price'];

const PLAN_SORT_OPTIONS = [
  { value: 'sort', label: 'Thứ tự trang giá' },
  { value: 'code', label: 'Mã gói' },
  { value: 'price', label: 'Giá năm' },
];

const PLAN_STATUS_OPTIONS = [
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
];

const ITEM_STATUS_OPTIONS = [
  { value: 'active', label: 'Đang bật' },
  { value: 'inactive', label: 'Đã tắt' },
];

/** Giá trị trên URL là chuỗi tự do, quy về union hợp lệ trước khi dùng. */
export function parsePlanSort(value: string | undefined): PlanSort {
  return PLAN_SORTS.includes(value as PlanSort) ? (value as PlanSort) : 'sort';
}

export function parseActiveFilter(value: string | undefined): ActiveFilter | undefined {
  return value === 'active' || value === 'inactive' ? value : undefined;
}

export function hasActivePlanFilters(v: PlanFilterValues): boolean {
  return !!(v.q || v.status);
}

export function hasActiveItemFilters(v: ItemFilterValues): boolean {
  return !!(v.q || v.group || v.status);
}

/** Ô tìm giữ giá trị gõ dở tại chỗ, chỉ đẩy lên URL sau 300ms ngừng gõ. */
function useDebouncedSearch(committed: string | undefined, commit: (q: string | undefined) => void) {
  const [q, setQ] = React.useState(committed ?? '');
  React.useEffect(() => setQ(committed ?? ''), [committed]);
  React.useEffect(() => {
    if (q === (committed ?? '')) return;
    const t = setTimeout(() => commit(q || undefined), 300);
    return () => clearTimeout(t);
  }, [q, committed, commit]);
  return [q, setQ] as const;
}

const NOTE_CLASS = 'w-full sm:ml-auto sm:w-auto sm:max-w-72 sm:text-right';

/** Sắp xếp gói, đứng cạnh nút "Tạo gói" trên tiêu đề màn. */
export function PlanSortControl({ value, onChange }: { value: PlanSort; onChange: (v: PlanSort) => void }) {
  return (
    <SegmentedControl
      options={PLAN_SORT_OPTIONS}
      value={value}
      onValueChange={(v) => onChange(v as PlanSort)}
      size="sm"
      aria-label="Sắp xếp gói"
    />
  );
}

export function PlanFilters({
  values,
  onChange,
  onClear,
}: {
  values: PlanFilterValues;
  onChange: (patch: Partial<PlanFilterValues>) => void;
  onClear: () => void;
}) {
  const { data: plans } = useAdminPlans();
  const commitQ = React.useCallback((q: string | undefined) => onChange({ q }), [onChange]);
  const [q, setQ] = useDebouncedSearch(values.q, commitQ);

  const selling = (plans ?? []).filter((p) => p.isActive).length;
  const drafts = (plans ?? []).filter(isDraft).length;
  const retired = (plans ?? []).length - selling - drafts;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        leadingIcon={<Search className="size-4" />}
        placeholder="Tìm theo tên hoặc mã gói"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Tìm gói"
        containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
      />
      <FilterSelect
        label="Trạng thái bán"
        value={values.status}
        onChange={(v) => onChange({ status: parseActiveFilter(v) })}
        options={PLAN_STATUS_OPTIONS}
        className="w-auto"
      />
      {hasActivePlanFilters(values) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      {plans && (
        <Text variant="caption" muted className={NOTE_CLASS}>
          {selling} gói đang bán · {drafts} nháp chưa mở bán · {retired} đã ngừng bán
        </Text>
      )}
    </div>
  );
}

export function ItemFilters({
  values,
  onChange,
  onClear,
}: {
  values: ItemFilterValues;
  onChange: (patch: Partial<ItemFilterValues>) => void;
  onClear: () => void;
}) {
  const { data: groups } = useCatalogGroups();
  const { data: items } = useCatalogItems();
  const commitQ = React.useCallback((q: string | undefined) => onChange({ q }), [onChange]);
  const [q, setQ] = useDebouncedSearch(values.q, commitQ);

  const groupOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items ?? []) counts.set(i.groupCode, (counts.get(i.groupCode) ?? 0) + 1);
    return (groups ?? []).map((g) => ({
      value: g.code,
      label: g.isActive ? g.label : `${g.label} · nhóm đã tắt`,
      count: counts.get(g.code) ?? 0,
    }));
  }, [groups, items]);

  const enabled = (items ?? []).filter((i) => i.isActive).length;
  const disabled = (items ?? []).length - enabled;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        leadingIcon={<Search className="size-4" />}
        placeholder="Tìm theo nhãn hoặc mã item"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Tìm item"
        containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
      />
      <FilterSelect
        label="Nhóm"
        value={values.group}
        onChange={(v) => onChange({ group: v })}
        options={groupOptions}
        className="w-auto max-w-64"
      />
      <FilterSelect
        label="Trạng thái"
        value={values.status}
        onChange={(v) => onChange({ status: parseActiveFilter(v) })}
        options={ITEM_STATUS_OPTIONS}
        className="w-auto"
      />
      {hasActiveItemFilters(values) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      {items && (
        <Text variant="caption" muted className={NOTE_CLASS}>
          {enabled} item đang bật · {disabled} đã tắt · nhóm chỉ tạo được ở backend
        </Text>
      )}
    </div>
  );
}
