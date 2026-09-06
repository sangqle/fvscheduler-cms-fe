'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PackagePlus, Pencil } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { PriceGrid } from '@/components/admin/plans/PriceGrid';
import { useCreatePlan, useUpdatePlan } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import {
  PLAN_NAME_MAX,
  hasError,
  toPricePayload,
  validateName,
  validatePlanCode,
  validatePrices,
} from '@/lib/admin/catalog';
import type { AdminPlan } from '@/types/admin';

interface FormState {
  code: string;
  name: string;
  sortOrder: string;
  isActive: boolean;
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
}

function initial(plan: AdminPlan | null): FormState {
  return {
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    sortOrder: String(plan?.sortOrder ?? 0),
    isActive: plan?.isActive ?? false,
    monthlyListPrice: plan?.monthlyListPrice ?? null,
    monthlySalePrice: plan?.monthlySalePrice ?? null,
    yearlyListPrice: plan?.yearlyListPrice ?? null,
    yearlySalePrice: plan?.yearlySalePrice ?? null,
  };
}

/**
 * Tạo gói mới (POST /api/admin/plans), hoặc sửa tên / thứ tự / giá của một gói ngay từ bảng
 * (PUT /api/admin/plans/{code}) mà không phải rời danh sách.
 *
 * Mã không đổi được sau khi tạo, nên nó là trường duy nhất cần cân nhắc kỹ; sau khi tạo, màn nhảy
 * thẳng sang tab Thành phần vì gói mới chưa mang nhóm hay limit nào. Ở chế độ sửa, trạng thái bán
 * **không** nằm trong form: `PUT` gửi lại giá trị đã lưu, còn bật / tắt bán đi bằng `Switch` trên
 * hàng (cùng luật với `PlanOverviewTab`).
 */
export function PlanFormDialog({
  open,
  plan = null,
  onOpenChange,
}: {
  open: boolean;
  /** null = tạo mới. */
  plan?: AdminPlan | null;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const isEdit = plan !== null;
  const pending = create.isPending || update.isPending;

  const [form, setForm] = React.useState<FormState>(() => initial(plan));
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(initial(plan));
    setSubmitted(false);
    setServerError(null);
  }, [open, plan]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const priceErrors = validatePrices(form);
  const errors = {
    code: isEdit ? undefined : validatePlanCode(form.code),
    name: validateName(form.name, PLAN_NAME_MAX, 'tên gói'),
    sortOrder: Number.isInteger(Number(form.sortOrder)) ? undefined : 'Sort phải là số nguyên.',
    ...priceErrors,
  };
  const invalid = hasError(errors);

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    const core = {
      name: form.name.trim(),
      sortOrder: Number(form.sortOrder),
      ...toPricePayload(form),
    };
    if (isEdit) {
      update.mutate(
        { code: plan.code, input: { ...core, isActive: plan.isActive } },
        {
          onSuccess: (saved) => {
            showToast({
              title: `Đã lưu gói ${saved.name}`,
              description: 'Cache gói và trang giá công khai đã được xóa.',
              variant: 'success',
            });
            onOpenChange(false);
          },
          onError: (e) => setServerError(apiErrorMessage(e, 'Không lưu được gói. Vui lòng thử lại.')),
        },
      );
      return;
    }
    create.mutate(
      { code: form.code.trim(), isActive: form.isActive, ...core },
      {
        onSuccess: (saved) => {
          showToast({
            title: `Đã tạo gói ${saved.name}`,
            description: 'Gói chưa có nhóm, item hay limit nào. Soạn thành phần trước khi mở bán.',
            variant: 'success',
          });
          onOpenChange(false);
          router.push(`/plans/${saved.code}?tab=composition`);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không tạo được gói. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">{isEdit ? <Pencil /> : <PackagePlus />}</DialogIcon>
          <div className="min-w-0">
            <DialogTitle>{isEdit ? `Sửa gói ${plan.code}` : 'Tạo gói mới'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Tên, thứ tự và giá · bật tắt bán ở hàng, thành phần ở trang chi tiết'
                : 'Tạo xong thì soạn thành phần, rồi mới mở bán'}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <Field
              id="plan-code"
              label="Mã gói"
              hint={isEdit ? 'Không đổi được sau khi tạo' : 'A-Z, 0-9 và _ · 2 đến 32 ký tự'}
              error={submitted ? errors.code : undefined}
            >
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                placeholder="STUDIO_MAX"
                className="font-mono"
                autoCapitalize="characters"
                autoComplete="off"
                readOnly={isEdit}
                disabled={isEdit}
                error={submitted && !!errors.code}
              />
            </Field>
            <Field
              id="plan-sort"
              label="Sort"
              hint="Thứ tự trên trang giá"
              error={submitted ? errors.sortOrder : undefined}
            >
              <Input
                id="plan-sort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => patch({ sortOrder: e.target.value.replace(/[^\d-]/g, '') })}
                error={submitted && !!errors.sortOrder}
              />
            </Field>
          </div>

          <Field
            id="plan-name"
            label="Tên gói"
            hint={
              isEdit
                ? 'Tên khách thấy trên trang giá và hóa đơn · tối đa 120 ký tự'
                : 'Mã không đổi được sau khi tạo, tên thì đổi lúc nào cũng được'
            }
            error={submitted ? errors.name : undefined}
          >
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              maxLength={PLAN_NAME_MAX}
              placeholder="Studio Max"
              autoFocus={isEdit}
              error={submitted && !!errors.name}
            />
          </Field>

          <PriceGrid
            value={form}
            onChange={patch}
            errors={submitted ? priceErrors : {}}
            idPrefix={isEdit ? 'plan-edit' : 'plan-new'}
          />

          <Text variant="caption" muted>
            Giá bán không cao hơn giá niêm yết cùng bậc · có giá bán tháng thì phải có giá niêm yết tháng
          </Text>

          {!isEdit && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
              <Switch
                id="plan-active"
                checked={form.isActive}
                onCheckedChange={(v) => patch({ isActive: v })}
                aria-label="Mở bán ngay"
              />
              <div className="min-w-0">
                <Label htmlFor="plan-active" className="font-semibold">
                  Mở bán ngay
                </Label>
                <Text variant="caption" muted>
                  Nên để tắt. Gói mới chưa có nhóm hay limit nào, mở bán ngay là khách mua được một gói rỗng.
                </Text>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Spinner size="sm" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo gói'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
