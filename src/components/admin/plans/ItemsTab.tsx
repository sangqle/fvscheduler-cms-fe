'use client';

import * as React from 'react';
import { MoreHorizontal, Pencil, Power, Trash2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { hasActiveItemFilters, type ItemFilterValues } from '@/components/admin/plans/CatalogFilters';
import { DeleteItemDialog } from '@/components/admin/plans/DeleteItemDialog';
import { ItemFormDialog } from '@/components/admin/plans/ItemFormDialog';
import { useCatalogGroups, useCatalogItems, useFeatureKeys, useUpdateItem } from '@/hooks/useAdminCatalog';
import { apiErrorMessage } from '@/lib/api/auth';
import type { AdminCatalogItem, UpdateItemInput } from '@/types/admin';

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

/**
 * ADM-FLOW-10: danh mục item, gồm cả item đã tắt. Lọc phía client theo `values` (đọc từ URL ở màn
 * cha). Nhóm chỉ đọc, item thì đổi nhóm được. Mọi trường của item đều hiện trên hàng: nhãn, mã,
 * mô tả, nhóm (nhãn + mã), feature key, nhãn phụ, bật/tắt, sort, số nơi đang dùng.
 */
export function ItemsTab({
  values,
  createOpen,
  onCreateOpenChange,
}: {
  values: ItemFilterValues;
  createOpen: boolean;
  onCreateOpenChange: (o: boolean) => void;
}) {
  const { showToast } = useToast();
  const groups = useCatalogGroups();
  const items = useCatalogItems();
  const featureKeys = useFeatureKeys();
  const update = useUpdateItem();

  const [editing, setEditing] = React.useState<AdminCatalogItem | null>(null);
  const [deleting, setDeleting] = React.useState<AdminCatalogItem | null>(null);

  const rows = React.useMemo(() => {
    const needle = (values.q ?? '').trim().toLowerCase();
    return (items.data ?? []).filter((i) => {
      if (values.group && i.groupCode !== values.group) return false;
      if (values.status === 'active' && !i.isActive) return false;
      if (values.status === 'inactive' && i.isActive) return false;
      if (!needle) return true;
      return i.code.toLowerCase().includes(needle) || i.label.toLowerCase().includes(needle);
    });
  }, [items.data, values.q, values.group, values.status]);

  /** Số item active đang mang mỗi feature key: cảnh báo trước khi tắt item cuối cùng. */
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
      className: 'min-w-64',
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground">{i.label}</span>
            {!i.isActive && (
              <Badge variant="muted" size="sm">
                Đã tắt
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Sửa item ${i.label}`}
              className="-my-1.5"
              onClick={() => setEditing(i)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
          {i.description && (
            <Text variant="caption" muted as="span" className="line-clamp-2 max-w-md">
              {i.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      id: 'group',
      header: 'Nhóm',
      className: 'min-w-40',
      cell: (i) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="secondary" size="sm">
            {i.groupLabel}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">{i.groupCode}</span>
        </div>
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
        <div className="flex items-center gap-2">
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
          <span className="text-xs text-muted-foreground">{i.isActive ? 'Đang bật' : 'Đã tắt'}</span>
        </div>
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
          <span className="text-xs text-muted-foreground">
            {i.usage.links + i.usage.overrides === 0 ? 'xóa được' : 'không xóa được'}
          </span>
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
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(i) => i.code}
        isLoading={items.isPending}
        skeletonRows={8}
        mobileCards
        rowClassName={(i) => (i.isActive ? undefined : 'opacity-70')}
        emptyContent={
          hasActiveItemFilters(values) ? undefined : (
            <EmptyState
              title="Catalog chưa có item nào"
              description="Item là dòng khách thấy trên bảng giá, luôn nằm trong một nhóm."
              action={<Button onClick={() => onCreateOpenChange(true)}>Tạo item</Button>}
            />
          )
        }
        emptyMessage="Không có item nào khớp bộ lọc"
      />
      <Text variant="caption" muted className="flex flex-col gap-0.5">
        <span>Biểu tượng bút chì sửa nhãn, mô tả, nhóm và feature key của item ngay tại chỗ</span>
        <span>
          Sửa một item ảnh hưởng mọi gói mang nhóm của nó · backend xóa cache của tất cả gói sau mỗi lần ghi
        </span>
      </Text>

      <ItemFormDialog
        open={createOpen || editing !== null}
        item={editing}
        defaultGroupCode={values.group || (groups.data?.[0]?.code ?? '')}
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
