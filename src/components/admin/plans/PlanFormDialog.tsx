'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PackagePlus } from 'lucide-react';
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
import { useCreatePlan } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import {
  PLAN_NAME_MAX,
  hasError,
  toPricePayload,
  validateName,
  validatePlanCode,
  validatePrices,
} from '@/lib/admin/catalog';

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

const EMPTY: FormState = {
  code: '',
  name: '',
  sortOrder: '0',
  isActive: false,
  monthlyListPrice: null,
  monthlySalePrice: null,
  yearlyListPrice: null,
  yearlySalePrice: null,
};

/**
 * Tạo gói mới (POST /api/admin/plans). Mã không đổi được sau khi tạo, nên nó là trường duy nhất
 * cần cân nhắc kỹ; sau khi tạo, màn nhảy thẳng sang tab Thành phần vì gói mới chưa mang nhóm hay
 * limit nào.
 */
export function PlanFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const create = useCreatePlan();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setSubmitted(false);
    setServerError(null);
  }, [open]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const priceErrors = validatePrices(form);
  const errors = {
    code: validatePlanCode(form.code),
    name: validateName(form.name, PLAN_NAME_MAX, 'tên gói'),
    sortOrder: Number.isInteger(Number(form.sortOrder)) ? undefined : 'Sort phải là số nguyên.',
    ...priceErrors,
  };
  const invalid = hasError(errors);

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    create.mutate(
      {
        code: form.code.trim(),
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        ...toPricePayload(form),
      },
      {
        onSuccess: (plan) => {
          showToast({
            title: `Đã tạo gói ${plan.name}`,
            description: 'Gói chưa có nhóm, item hay limit nào. Soạn thành phần trước khi mở bán.',
            variant: 'success',
          });
          onOpenChange(false);
          router.push(`/plans/${plan.code}?tab=composition`);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không tạo được gói. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <PackagePlus />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Tạo gói mới</DialogTitle>
            <DialogDescription>Tạo xong thì soạn thành phần, rồi mới mở bán</DialogDescription>
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
              hint="A-Z, 0-9 và _ · 2 đến 32 ký tự"
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
            hint="Mã không đổi được sau khi tạo, tên thì đổi lúc nào cũng được"
            error={submitted ? errors.name : undefined}
          >
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              maxLength={PLAN_NAME_MAX}
              placeholder="Studio Max"
              error={submitted && !!errors.name}
            />
          </Field>

          <PriceGrid
            value={form}
            onChange={patch}
            errors={submitted ? priceErrors : {}}
            idPrefix="plan-new"
          />

          <Text variant="caption" muted>
            Giá bán không cao hơn giá niêm yết cùng bậc · có giá bán tháng thì phải có giá niêm yết tháng
          </Text>

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
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Spinner size="sm" />}
            Tạo gói
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
