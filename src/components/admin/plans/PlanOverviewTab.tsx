'use client';

import * as React from 'react';
import { Info, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Kicker } from '@/components/ui/Kicker';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { DeletePlanDialog } from '@/components/admin/plans/DeletePlanDialog';
import { PriceGrid } from '@/components/admin/plans/PriceGrid';
import { RefStat, canDeletePlan } from '@/components/admin/plans/planDisplay';
import { useUpdatePlan } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import {
  PLAN_NAME_MAX,
  hasError,
  toPricePayload,
  validateName,
  validatePrices,
} from '@/lib/admin/catalog';
import type { AdminPlanDetail, UpdatePlanInput } from '@/types/admin';

interface FormState {
  name: string;
  sortOrder: string;
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
}

function fromPlan(plan: AdminPlanDetail): FormState {
  return {
    name: plan.name,
    sortOrder: String(plan.sortOrder),
    monthlyListPrice: plan.monthlyListPrice,
    monthlySalePrice: plan.monthlySalePrice,
    yearlyListPrice: plan.yearlyListPrice,
    yearlySalePrice: plan.yearlySalePrice,
  };
}

/**
 * ADM-FLOW-08: sửa 4 trường lõi + 4 cột giá của một gói. `code` không đổi được, và children
 * (nhóm / item / limits) không bị `PUT` này đụng tới — chúng nằm ở tab Thành phần.
 */
export function PlanOverviewTab({ plan }: { plan: AdminPlanDetail }) {
  const { showToast } = useToast();
  const update = useUpdatePlan();

  const [form, setForm] = React.useState<FormState>(() => fromPlan(plan));
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [retiring, setRetiring] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  /**
   * Nạp lại form khi gói **thật sự** được ghi lại (`updatedAt` đổi), chứ không phải mỗi lần query
   * trả về một object mới: `refetchOnWindowFocus` là mặc định, và nếu neo vào identity của `plan`
   * thì chỉ cần chuyển sang tab khác rồi quay lại là mất sạch những gì đang gõ dở.
   */
  const planRef = React.useRef(plan);
  planRef.current = plan;
  React.useEffect(() => {
    setForm(fromPlan(planRef.current));
    setSubmitted(false);
    setServerError(null);
  }, [plan.code, plan.updatedAt]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const priceErrors = validatePrices(form);
  const errors = {
    name: validateName(form.name, PLAN_NAME_MAX, 'tên gói'),
    sortOrder: Number.isInteger(Number(form.sortOrder)) ? undefined : 'Sort phải là số nguyên.',
    ...priceErrors,
  };
  const invalid = hasError(errors);
  const dirty = JSON.stringify(form) !== JSON.stringify(fromPlan(plan));

  function mutate(input: UpdatePlanInput, successTitle: string, successDescription: string) {
    setServerError(null);
    update.mutate(
      { code: plan.code, input },
      {
        onSuccess: () =>
          showToast({ title: successTitle, description: successDescription, variant: 'success' }),
        onError: (e) => setServerError(apiErrorMessage(e, 'Không lưu được gói. Vui lòng thử lại.')),
      },
    );
  }

  function save() {
    setSubmitted(true);
    if (invalid) return;
    mutate(
      {
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder),
        isActive: plan.isActive,
        ...toPricePayload(form),
      },
      `Đã lưu gói ${form.name.trim()}`,
      'Cache gói này và cache trang giá công khai đã được xóa.',
    );
  }

  /**
   * Bật/tắt bán gửi **giá trị đã lưu** của gói chứ không phải nội dung form đang sửa dở: hai khối
   * này là hai thao tác riêng, gạt công tắc không được lén lưu luôn một cái giá chưa ai xác nhận.
   */
  function setActive(isActive: boolean) {
    mutate(
      {
        name: plan.name,
        sortOrder: plan.sortOrder,
        isActive,
        monthlyListPrice: plan.monthlyListPrice,
        monthlySalePrice: plan.monthlySalePrice,
        yearlyListPrice: plan.yearlyListPrice ?? 0,
        yearlySalePrice: plan.yearlySalePrice,
      },
      isActive ? `Đã mở bán ${plan.name}` : `Đã ngừng bán ${plan.name}`,
      isActive
        ? 'Gói hiện lại trên trang giá công khai và tạo được đơn tự phục vụ.'
        : 'Gói mất khỏi trang giá công khai. Workspace đang dùng không bị ảnh hưởng.',
    );
  }

  /** Ngừng bán khi còn người dùng thì hỏi lại; mở bán và các trường hợp còn lại thì ghi thẳng. */
  function requestActive(next: boolean) {
    if (!next && plan.usage.subscriptions > 0) setRetiring(true);
    else setActive(next);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>Thông tin gói</CardTitle>
            <Text variant="caption" muted as="span" className="font-mono">
              PUT /api/admin/plans/{plan.code}
            </Text>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <Field id="plan-edit-code" label="Mã gói" hint="Không đổi được sau khi tạo">
              <Input id="plan-edit-code" value={plan.code} readOnly disabled className="font-mono" />
            </Field>
            <Field
              id="plan-edit-sort"
              label="Sort"
              hint="Thứ tự trên trang giá, không cần duy nhất"
              error={submitted ? errors.sortOrder : undefined}
            >
              <Input
                id="plan-edit-sort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => patch({ sortOrder: e.target.value.replace(/[^\d-]/g, '') })}
                error={submitted && !!errors.sortOrder}
              />
            </Field>
          </div>

          <Field
            id="plan-edit-name"
            label="Tên gói"
            hint="1 đến 120 ký tự"
            error={submitted ? errors.name : undefined}
          >
            <Input
              id="plan-edit-name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              maxLength={PLAN_NAME_MAX}
              error={submitted && !!errors.name}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Kicker tone="muted" as="h4">Giá</Kicker>
              <Text variant="caption" muted>
                Bỏ trống giá bán = bán đúng giá niêm yết
              </Text>
            </div>
            <PriceGrid
              value={form}
              onChange={patch}
              errors={submitted ? priceErrors : {}}
              idPrefix="plan-edit"
              disabled={update.isPending}
            />
            <Text variant="caption" muted className="flex flex-col gap-0.5">
              <span>Giá bán không được cao hơn giá niêm yết cùng bậc</span>
              <span>Có giá bán tháng thì phải có giá niêm yết tháng</span>
              <span>Mọi giá phải từ 0 trở lên</span>
            </Text>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setForm(fromPlan(plan))}
              disabled={!dirty || update.isPending}
            >
              Hoàn tác
            </Button>
            <Button onClick={save} disabled={!dirty || update.isPending}>
              {update.isPending && <Spinner size="sm" />}
              Lưu thay đổi
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái bán</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Tooltip content={plan.isTrialPlan ? 'Gói trial cấu hình sẵn, backend từ chối tắt bán' : undefined}>
                <span className="inline-flex">
                  <Switch
                    checked={plan.isActive}
                    disabled={plan.isTrialPlan || update.isPending}
                    onCheckedChange={requestActive}
                    aria-label="Trạng thái bán của gói"
                  />
                </span>
              </Tooltip>
              <Text variant="body-sm" as="span" className="font-semibold">
                {plan.isActive ? 'Đang bán' : 'Ngừng bán'}
              </Text>
              {plan.isTrialPlan && (
                <Badge variant="muted" size="sm" className="gap-1">
                  <Lock className="size-3" />
                  Khóa
                </Badge>
              )}
            </div>
            {plan.isTrialPlan ? (
              <Alert variant="info">
                <Info className="size-4" />
                <AlertDescription>
                  Đây là gói trial cấu hình sẵn của hệ thống. Tắt bán sẽ bị backend từ chối. Đổi tên hoặc đổi
                  giá vẫn được.
                </AlertDescription>
              </Alert>
            ) : (
              <Text variant="body-sm" muted>
                Tắt là ngừng bán: gói mất khỏi trang giá công khai và không tạo được đơn tự phục vụ mới.
                Workspace đang dùng không bị ảnh hưởng, và vẫn cấp tay được.
              </Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đang được tham chiếu</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <RefStat value={plan.usage.subscriptions} label="subscription" />
              <RefStat value={plan.usage.orders} label="đơn hàng" />
            </div>
            <Button
              variant="destructive-outline"
              disabled={!canDeletePlan(plan)}
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="size-4" />
              Xóa gói vĩnh viễn
            </Button>
            <Text variant="caption" muted>
              {canDeletePlan(plan)
                ? 'Không còn bản ghi nào ngoài catalog trỏ vào gói này nên xóa được, cùng với limits, item link và nhóm của nó.'
                : 'Còn tham chiếu nên không xóa được, tính cả đơn đã hủy và đã hết hạn. Gói trial thì không xóa được kể cả khi về 0.'}
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 pt-4 sm:pt-6">
            <RefreshCw className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <Text variant="body-sm" className="font-semibold">Sau khi lưu</Text>
              <Text variant="caption" muted>
                Cache gói này và cache trang giá công khai tự xóa. Workspace đang dùng nhận giới hạn mới ở
                request kế tiếp, không phải chờ hết TTL.
              </Text>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={retiring}
        onOpenChange={setRetiring}
        variant="warning"
        title={`Ngừng bán ${plan.name}?`}
        description={`${plan.usage.subscriptions} subscription đang trỏ vào gói này. Gói mất khỏi trang giá công khai ngay sau khi lưu và không tạo được đơn tự phục vụ mới. Workspace đang dùng giữ nguyên quyền tới khi hết hạn, và bạn vẫn cấp tay được gói này.`}
        confirmLabel="Ngừng bán"
        isPending={update.isPending}
        onConfirm={() => {
          setActive(false);
          setRetiring(false);
        }}
      />

      <DeletePlanDialog
        plan={deleting ? plan : null}
        onOpenChange={(o) => !o && setDeleting(false)}
        onRetire={() => {
          setDeleting(false);
          requestActive(false);
        }}
        redirectToList
      />
    </div>
  );
}
