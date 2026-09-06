'use client';

import * as React from 'react';
import { ListPlus, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { useCatalogGroups, useCreateItem, useFeatureKeys, useUpdateItem } from '@/hooks/useAdminCatalog';
import { apiErrorMessage } from '@/lib/api/auth';
import {
  ITEM_BADGE_MAX,
  ITEM_DESCRIPTION_MAX,
  ITEM_LABEL_MAX,
  hasError,
  validateItemCode,
  validateName,
} from '@/lib/admin/catalog';
import type { AdminCatalogItem } from '@/types/admin';

/** Radix Select không nhận `value=""`, nên "không có feature key" đi bằng sentinel này. */
const NO_FEATURE_KEY = '__NONE__';

interface FormState {
  code: string;
  groupCode: string;
  label: string;
  description: string;
  featureKey: string;
  badge: string;
  isActive: boolean;
  sortOrder: string;
}

function initial(item: AdminCatalogItem | null, defaultGroup: string): FormState {
  return {
    code: item?.code ?? '',
    groupCode: item?.groupCode ?? defaultGroup,
    label: item?.label ?? '',
    description: item?.description ?? '',
    featureKey: item?.featureKey ?? '',
    badge: item?.badge ?? '',
    isActive: item?.isActive ?? true,
    sortOrder: String(item?.sortOrder ?? 0),
  };
}

/**
 * Tạo / sửa một item của catalog (ADM-FLOW-10). Mã không đổi được sau khi tạo; đổi `groupCode` là
 * hợp lệ và có hiệu lực ngay với mọi gói mang nhóm cũ lẫn nhóm mới.
 *
 * Luật "item cuối cùng mang khóa": tắt item, hoặc đổi feature key sang giá trị khác, khi đó là
 * item **active duy nhất** mang khóa hiện tại thì backend trả 409. Màn cảnh báo trước, nhưng
 * quyết định vẫn là của backend.
 */
export function ItemFormDialog({
  open,
  item,
  defaultGroupCode = '',
  onOpenChange,
}: {
  open: boolean;
  /** null = tạo mới. */
  item: AdminCatalogItem | null;
  defaultGroupCode?: string;
  onOpenChange: (o: boolean) => void;
}) {
  const { showToast } = useToast();
  const groups = useCatalogGroups();
  const featureKeys = useFeatureKeys();
  const create = useCreateItem();
  const update = useUpdateItem();
  const isEdit = item !== null;
  const pending = create.isPending || update.isPending;

  const [form, setForm] = React.useState<FormState>(() => initial(item, defaultGroupCode));
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(initial(item, defaultGroupCode));
    setSubmitted(false);
    setServerError(null);
  }, [open, item, defaultGroupCode]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const errors = {
    code: isEdit ? undefined : validateItemCode(form.code),
    groupCode: form.groupCode ? undefined : 'Chọn nhóm cho item.',
    label: validateName(form.label, ITEM_LABEL_MAX, 'nhãn item'),
    sortOrder: Number.isInteger(Number(form.sortOrder)) ? undefined : 'Sort phải là số nguyên.',
  };
  const invalid = hasError(errors);

  /** Cảnh báo trước khi chạm vào item active duy nhất đang mang một feature key. */
  const currentKey = item?.featureKey ?? null;
  const carriers = featureKeys.data?.find((k) => k.key === currentKey)?.activeCarriers ?? 0;
  const losesCarrier = isEdit && currentKey !== null && (!form.isActive || form.featureKey !== currentKey);
  const lastCarrierWarning = losesCarrier && carriers <= 1;

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    const payload = {
      groupCode: form.groupCode,
      label: form.label.trim(),
      description: form.description.trim() || null,
      featureKey: form.featureKey || null,
      badge: form.badge.trim() || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };
    const onSuccess = (saved: AdminCatalogItem) => {
      showToast({
        title: isEdit ? `Đã lưu item ${saved.label}` : `Đã tạo item ${saved.label}`,
        description: 'Cache của mọi gói và trang giá công khai đã được xóa.',
        variant: 'success',
      });
      onOpenChange(false);
    };
    const onError = (e: unknown) =>
      setServerError(apiErrorMessage(e, 'Không lưu được item. Vui lòng thử lại.'));

    if (isEdit) update.mutate({ code: item.code, input: payload }, { onSuccess, onError });
    else create.mutate({ code: form.code.trim(), ...payload }, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <ListPlus />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>{isEdit ? `Sửa item ${item.code}` : 'Tạo item mới'}</DialogTitle>
            <DialogDescription>
              Item là một dòng khách thấy trên bảng giá · sửa item ảnh hưởng mọi gói mang nhóm của nó
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          {lastCarrierWarning && (
            <Alert variant="warning">
              <TriangleAlert className="size-4" />
              <AlertDescription>
                Đây là item active duy nhất mang khóa <span className="font-mono">{currentKey}</span>. Tắt nó
                hoặc đổi khóa sẽ bị backend từ chối cho tới khi có item khác mang khóa này.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <Field
              id="item-code"
              label="Mã item"
              hint={isEdit ? 'Không đổi được sau khi tạo' : 'a-z, 0-9 và gạch nối · 2 đến 64 ký tự'}
              error={submitted ? errors.code : undefined}
            >
              <Input
                id="item-code"
                value={form.code}
                onChange={(e) => patch({ code: e.target.value.toLowerCase() })}
                placeholder="tools-ai-retouch"
                className="font-mono"
                autoComplete="off"
                readOnly={isEdit}
                disabled={isEdit}
                error={submitted && !!errors.code}
              />
            </Field>
            <Field
              id="item-sort"
              label="Sort"
              hint="Thứ tự trong nhóm"
              error={submitted ? errors.sortOrder : undefined}
            >
              <Input
                id="item-sort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => patch({ sortOrder: e.target.value.replace(/[^\d-]/g, '') })}
                error={submitted && !!errors.sortOrder}
              />
            </Field>
          </div>

          <Field
            id="item-label"
            label="Nhãn"
            hint="Dòng chữ khách đọc trên bảng giá · tối đa 160 ký tự"
            error={submitted ? errors.label : undefined}
          >
            <Input
              id="item-label"
              value={form.label}
              onChange={(e) => patch({ label: e.target.value })}
              maxLength={ITEM_LABEL_MAX}
              placeholder="Retouch AI"
              error={submitted && !!errors.label}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="item-group"
              label="Nhóm"
              hint="Nhóm chỉ tạo được ở backend, nhưng item thì đổi nhóm được ngay"
              error={submitted ? errors.groupCode : undefined}
            >
              <Select value={form.groupCode} onValueChange={(v) => patch({ groupCode: v })}>
                <SelectTrigger id="item-group" aria-label="Nhóm của item">
                  <SelectValue placeholder="Chọn nhóm" />
                </SelectTrigger>
                <SelectContent>
                  {(groups.data ?? []).map((g) => (
                    <SelectItem key={g.code} value={g.code}>
                      {g.label} · {g.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="item-feature-key"
              label="Feature key"
              hint="Danh sách khóa cố định · để trống nếu item chỉ là dòng quảng bá, không mở tính năng nào"
            >
              <Select
                value={form.featureKey || NO_FEATURE_KEY}
                onValueChange={(v) => patch({ featureKey: v === NO_FEATURE_KEY ? '' : v })}
              >
                <SelectTrigger id="item-feature-key" aria-label="Feature key">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FEATURE_KEY}>Không có</SelectItem>
                  {(featureKeys.data ?? []).map((k) => (
                    <SelectItem key={k.key} value={k.key}>
                      <span className="font-mono">{k.key}</span>
                      <span className="ml-2 text-muted-foreground">{k.activeCarriers} item</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            id="item-description"
            label="Mô tả"
            hint="Không bắt buộc · tối đa 400 ký tự"
          >
            <Textarea
              id="item-description"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              maxLength={ITEM_DESCRIPTION_MAX}
              showCount
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="item-badge" label="Nhãn phụ" hint="Chip nhỏ cạnh nhãn, vd sắp ra mắt · tối đa 40 ký tự">
              <Input
                id="item-badge"
                value={form.badge}
                onChange={(e) => patch({ badge: e.target.value })}
                maxLength={ITEM_BADGE_MAX}
                placeholder="sắp ra mắt"
              />
            </Field>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
              <Switch
                id="item-active"
                checked={form.isActive}
                onCheckedChange={(v) => patch({ isActive: v })}
                aria-label="Item đang bật"
              />
              <div className="min-w-0">
                <Label htmlFor="item-active" className="flex items-center gap-2 font-semibold">
                  Bật
                  {!form.isActive && (
                    <Badge variant="muted" size="sm">
                      Đã tắt
                    </Badge>
                  )}
                </Label>
                <Text variant="caption" muted>
                  Item tắt biến khỏi mọi gói mang nhóm của nó, nhưng vẫn nằm trong catalog.
                </Text>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Spinner size="sm" />}
            {isEdit ? 'Lưu item' : 'Tạo item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
