'use client';

import * as React from 'react';
import { MoreHorizontal, Pencil, Power, Search, Trash2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
import { ErrorState } from '@/components/admin/shared/QueryState';
import { DeleteItemDialog } from '@/components/admin/plans/DeleteItemDialog';
import { ItemFormDialog } from '@/components/admin/plans/ItemFormDialog';
import { useCatalogGroups, useCatalogItems, useFeatureKeys, useUpdateItem } from '@/hooks/useAdminCatalog';
import { useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import type { AdminCatalogItem, UpdateItemInput } from '@/types/admin';

const ALL_GROUPS = '';

function itemPayload(item: AdminCatalogItem, patch: Partial<UpdateItemInput> = {}): UpdateItemInput {
  return {
    groupCode: item.groupCode,
    label: item.label,
    description: item.description,
    featureKey: item.featureKey,
    badge: item.badge,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    ...patch,
  };
}

/** ADM-FLOW-10: danh mục item, gồm cả item đã tắt. Nhóm chỉ đọc, item thì đổi nhóm được. */
export function ItemsTab({ createOpen, onCreateOpenChange }: { createOpen: boolean; onCreateOpenChange: (o: boolean) => void }) {
  const { get, set } = useUrlState();
  const { showToast } = useToast();
  const groups = useCatalogGroups();
  const items = useCatalogItems();
  const featureKeys = useFeatureKeys();
  const update = useUpdateItem();

  const groupFilter = get('group') ?? ALL_GROUPS;
  const qParam = get('itemQ');
  const [q, setQ] = React.useState(qParam ?? '');
  React.useEffect(() => setQ(qParam ?? ''), [qParam]);
  React.useEffect(() => {
    if (q === (qParam ?? '')) return;
    const t = setTimeout(() => set({ itemQ: q || undefined }), 300);
    return () => clearTimeout(t);
  }, [q, qParam, set]);

  const [editing, setEditing] = React.useState<AdminCatalogItem | null>(null);
  const [deleting, setDeleting] = React.useState<AdminCatalogItem | null>(null);

  const rows = React.useMemo(() => {
    const needle = (qParam ?? '').trim().toLowerCase();
    return (items.data ?? []).filter((i) => {
      if (groupFilter && i.groupCode !== groupFilter) return false;
      if (!needle) return true;
      return i.code.toLowerCase().includes(needle) || i.label.toLowerCase().includes(needle);
    });
  }, [items.data, groupFilter, qParam]);

  const countByGroup = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items.data ?? []) counts.set(i.groupCode, (counts.get(i.groupCode) ?? 0) + 1);
    return counts;
  }, [items.data]);

  /** Số item active đang mang mỗi feature key — cảnh báo trước khi tắt item cuối cùng. */
  const carriersByKey = React.useMemo(
    () => new Map((featureKeys.data ?? []).map((k) => [k.key, k.activeCarriers])),
    [featureKeys.data],
  );

  function isLastCarrier(item: AdminCatalogItem): boolean {
    return item.featureKey !== null && item.isActive && (carriersByKey.get(item.featureKey) ?? 0) <= 1;
  }

  function toggleActive(item: AdminCatalogItem, isActive: boolean) {
    update.mutate(
      { code: item.code, input: itemPayload(item, { isActive }) },
      {
        onSuccess: () =>
          showToast({
            title: isActive ? `Đã bật ${item.label}` : `Đã tắt ${item.label}`,
            description: 'Cache của mọi gói và trang giá công khai đã được xóa.',
            variant: isActive ? 'success' : 'warning',
          }),
        onError: (e) =>
          showToast({
            title: 'Không đổi được trạng thái item',
            description: apiErrorMessage(e, 'Vui lòng thử lại.'),
            variant: 'error',
          }),
      },
    );
  }

  const columns: ColumnDef<AdminCatalogItem>[] = [
    {
      id: 'item',
      header: 'Item',
      className: 'min-w-52',
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground">{i.label}</span>
            {!i.isActive && (
              <Badge variant="muted" size="sm">
                Đã tắt
              </Badge>
            )}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
        </div>
      ),
    },
    {
      id: 'group',
      header: 'Nhóm',
      cell: (i) => (
        <Badge variant="secondary" size="sm">
          {i.groupLabel}
        </Badge>
      ),
    },
    {
      id: 'featureKey',
      header: 'Feature key',
      className: 'min-w-40',
      cell: (i) =>
        i.featureKey === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold">{i.featureKey}</span>
            {isLastCarrier(i) && (
              <span className="inline-flex items-center gap-1 text-xs text-warning-deep">
                <TriangleAlert className="size-3" />
                Item duy nhất mang khóa
              </span>
            )}
          </div>
        ),
    },
    {
      id: 'badge',
      header: 'Nhãn phụ',
      cell: (i) =>
        i.badge ? (
          <Badge variant="info-soft" size="sm">
            {i.badge}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'active',
      header: 'Bật',
      cell: (i) => (
        <Tooltip
          content={
            isLastCarrier(i)
              ? `Tắt sẽ bị từ chối: không còn item nào mang khóa ${i.featureKey}`
              : undefined
          }
        >
          <span className="inline-flex">
            <Switch
              checked={i.isActive}
              disabled={update.isPending}
              onCheckedChange={(next) => toggleActive(i, next)}
              aria-label={`Bật item ${i.label}`}
            />
          </span>
        </Tooltip>
      ),
    },
    { id: 'sort', header: 'Sort', className: 'font-mono text-xs text-muted-foreground', cell: (i) => i.sortOrder },
    {
      id: 'usage',
      header: 'Đang dùng',
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">
            {i.usage.links} link · {i.usage.overrides} ghi đè
          </span>
          {i.usage.links + i.usage.overrides === 0 && (
            <span className="text-xs text-muted-foreground">xóa được</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với item ${i.label}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(i)}>
              <Pencil className="mr-2 size-4" />
              Sửa item
            </DropdownMenuItem>
            <DropdownMenuItem disabled={update.isPending} onSelect={() => toggleActive(i, !i.isActive)}>
              <Power className="mr-2 size-4" />
              {i.isActive ? 'Tắt item' : 'Bật item'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(i)}>
              <Trash2 className="mr-2 size-4" />
              Xóa item vĩnh viễn
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (items.error) return <ErrorState error={items.error} onRetry={() => void items.refetch()} />;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="p-3 lg:w-60 lg:shrink-0">
        <Text variant="overline" muted className="px-2 pb-2">
          Nhóm
        </Text>
        <div className="flex flex-wrap gap-1 lg:flex-col">
          <GroupFilterButton
            label="Tất cả item"
            count={items.data?.length ?? 0}
            active={groupFilter === ALL_GROUPS}
            onClick={() => set({ group: undefined })}
          />
          {(groups.data ?? []).map((g) => (
            <GroupFilterButton
              key={g.code}
              label={g.label}
              count={countByGroup.get(g.code) ?? 0}
              inactive={!g.isActive}
              active={groupFilter === g.code}
              onClick={() => set({ group: g.code })}
            />
          ))}
        </div>
        <Text variant="caption" muted className="px-2 pt-3">
          Nhóm chỉ tạo được ở backend. Item thì đổi nhóm được ngay từ đây.
        </Text>
      </Card>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Tìm theo mã hoặc nhãn item"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm item"
          containerClassName="w-full sm:max-w-80"
        />
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(i) => i.code}
          isLoading={items.isPending}
          skeletonRows={8}
          mobileCards
          rowClassName={(i) => (i.isActive ? undefined : 'opacity-70')}
          emptyContent={
            (items.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="Catalog chưa có item nào"
                description="Item là dòng khách thấy trên bảng giá, luôn nằm trong một nhóm."
                action={<Button onClick={() => onCreateOpenChange(true)}>Tạo item</Button>}
              />
            ) : undefined
          }
          emptyMessage="Không có item nào khớp bộ lọc"
        />
        <Text variant="caption" muted>
          Sửa một item ảnh hưởng mọi gói mang nhóm của nó · backend xóa cache của tất cả gói sau mỗi lần ghi
        </Text>
      </div>

      <ItemFormDialog
        open={createOpen || editing !== null}
        item={editing}
        defaultGroupCode={groupFilter || (groups.data?.[0]?.code ?? '')}
        onOpenChange={(o) => {
          if (o) return;
          setEditing(null);
          onCreateOpenChange(false);
        }}
      />
      <DeleteItemDialog
        item={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onRetire={(i) => {
          setDeleting(null);
          toggleActive(i, false);
        }}
      />
    </div>
  );
}

/** Một dòng lọc theo nhóm: nhãn bên trái, số item bên phải. */
function GroupFilterButton({
  label,
  count,
  active,
  inactive,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  inactive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'primary-outline' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={cn('justify-between gap-2 lg:w-full', inactive && 'opacity-60')}
    >
      <span className="truncate">{label}</span>
      <Badge variant={active ? 'default' : 'secondary'} size="sm">
        {count}
      </Badge>
    </Button>
  );
}
