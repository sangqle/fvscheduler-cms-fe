'use client';

import * as React from 'react';
import { BadgePercent, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import {
  bpToPercentInput,
  catalogAmount,
  percentToBp,
  quoteFor,
  unratedPlans,
  validatePercent,
  type RateRow,
} from '@/components/admin/affiliate/rateMath';
import { useUpdateAffiliateRate } from '@/hooks/useAdminAffiliate';
import { BILLING_PERIOD, formatBasisPoints } from '@/lib/admin/labels';
import { apiErrorMessage } from '@/lib/api/auth';
import { formatCurrency } from '@/lib/utils';
import { ApiError } from '@/types/api';
import type { AdminAffiliateRate, AdminPlan, BillingPeriod } from '@/types/admin';

interface FormState {
  planCode: string;
  commission: string;
  discount: string;
  active: boolean;
}

/** Gói mới vào chương trình mặc định 15% / 10%, cùng mức migration V96 seed cho mọi gói đang bán. */
function initial(row: RateRow | null): FormState {
  return {
    planCode: row?.rate.planCode ?? '',
    commission: row ? bpToPercentInput(row.rate.commissionRateBp) : '15',
    discount: row ? bpToPercentInput(row.rate.discountRateBp) : '10',
    active: row?.rate.active ?? true,
  };
}

/** Một dòng trong khối ví dụ: nhãn trái, số tiền mono phải. */
function PreviewLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-mono font-semibold text-foreground' : 'font-mono text-foreground'}>{value}</span>
    </div>
  );
}

/** Ví dụ một chu kỳ: Giá gói → Chiết khấu → Khách trả → Hoa hồng, đúng phép tính backend. */
function PeriodPreview({
  plan,
  period,
  commissionBp,
  discountBp,
}: {
  plan: AdminPlan;
  period: BillingPeriod;
  commissionBp: number | null;
  discountBp: number | null;
}) {
  const amount = catalogAmount(plan, period);
  const listPrice = period === 'MONTH' ? plan.monthlyListPrice : plan.yearlyListPrice;
  const quote = amount !== null && commissionBp !== null && discountBp !== null ? quoteFor(amount, { commissionRateBp: commissionBp, discountRateBp: discountBp }) : null;

  return (
    <Card padding="sm">
      <CardContent standalone className="flex flex-col gap-1.5">
        <Text variant="overline" muted>
          Gói {BILLING_PERIOD[period].toLowerCase()}
        </Text>
        {amount === null ? (
          <Text variant="caption" muted>
            Gói không bán theo {BILLING_PERIOD[period].toLowerCase()}
          </Text>
        ) : (
          <>
            <PreviewLine label={listPrice !== null && listPrice !== amount ? 'Giá gói (giá bán)' : 'Giá gói'} value={formatCurrency(amount)} />
            <PreviewLine label="Chiết khấu" value={quote ? `−${formatCurrency(quote.discount)}` : '—'} />
            <PreviewLine label="Khách trả" value={quote ? formatCurrency(quote.payable) : '—'} strong />
            <PreviewLine label="Hoa hồng" value={quote ? formatCurrency(quote.commission) : '—'} strong />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Thêm tỷ lệ cho một gói chưa có, hoặc sửa tỷ lệ của một gói, cả hai cùng `PUT …/rates/{planCode}`
 * (upsert). Nhập phần trăm, gửi basis point `Math.round(pct × 100)`.
 *
 * Hai nửa của một thỏa thuận được chốt ở hai thời điểm khác nhau (đã kiểm ở backend): chiết khấu chốt
 * vào đơn **lúc tạo đơn**, còn hoa hồng đọc tỷ lệ **lúc đơn được thanh toán** và không xét `active`.
 * Vì vậy câu chữ trong dialog nói rõ đơn đang chờ thanh toán nhận tỷ lệ hoa hồng mới, và tắt áp dụng
 * không chặn hoa hồng của đơn đã tạo kèm mã trước đó.
 */
export function RateFormDialog({
  open,
  row,
  catalog,
  rates,
  onOpenChange,
}: {
  open: boolean;
  /** null = thêm mới. */
  row: RateRow | null;
  /** Catalog gói (gồm cả gói ngừng bán) để lấy giá cho ví dụ và danh sách gói chưa có tỷ lệ. */
  catalog: AdminPlan[];
  rates: AdminAffiliateRate[];
  onOpenChange: (o: boolean) => void;
}) {
  const { showToast } = useToast();
  const isEdit = row !== null;
  const [form, setForm] = React.useState<FormState>(() => initial(row));
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const update = useUpdateAffiliateRate(form.planCode);
  const pending = update.isPending;

  React.useEffect(() => {
    if (!open) return;
    setForm(initial(row));
    setSubmitted(false);
    setServerError(null);
  }, [open, row]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  /**
   * Gói đang chọn luôn nằm trong danh sách: lưu xong, cache tỷ lệ có thêm dòng của nó ngay khi dialog
   * còn đang đóng dần, bỏ nó ra thì khối "mọi gói đã có tỷ lệ" chớp lên trong lúc đó.
   */
  const choices = React.useMemo(
    () => unratedPlans(rates.filter((r) => r.planCode !== form.planCode), catalog),
    [rates, catalog, form.planCode],
  );
  const plan = isEdit ? row.plan : (catalog.find((p) => p.code === form.planCode) ?? null);
  /** Dòng tỷ lệ mà gói đã mất khỏi catalog: backend trả 404 cho mọi lần lưu nên chặn luôn ở đây. */
  const missingPlan = isEdit && row.plan === null;
  const noChoice = !isEdit && choices.length === 0;

  const errors = {
    planCode: !isEdit && !form.planCode ? 'Chọn một gói.' : undefined,
    commission: validatePercent(form.commission),
    discount: validatePercent(form.discount),
  };
  const invalid = Boolean(errors.planCode || errors.commission || errors.discount);
  const commissionBp = errors.commission ? null : percentToBp(form.commission);
  const discountBp = errors.discount ? null : percentToBp(form.discount);
  const planLabel = row ? (row.rate.planName ?? row.plan?.name ?? row.rate.planCode) : (plan?.name ?? '');

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid || commissionBp === null || discountBp === null || missingPlan || noChoice) return;
    update.mutate(
      { commissionRateBp: commissionBp, discountRateBp: discountBp, active: form.active },
      {
        onSuccess: (saved) => {
          const name = saved.planName ?? saved.planCode;
          showToast({
            title: isEdit ? `Đã lưu tỷ lệ gói ${name}` : `Đã thêm tỷ lệ cho gói ${name}`,
            description: saved.active
              ? `Hoa hồng ${formatBasisPoints(saved.commissionRateBp)} · chiết khấu ${formatBasisPoints(saved.discountRateBp)}`
              : 'Đã tắt áp dụng: đơn mới cho gói này không dùng được mã giới thiệu.',
            variant: saved.active ? 'success' : 'warning',
          });
          onOpenChange(false);
        },
        onError: (e) => {
          const message = apiErrorMessage(e, 'Không lưu được tỷ lệ. Vui lòng thử lại.');
          setServerError(
            e instanceof ApiError && e.status === 404
              ? `Gói ${form.planCode} không còn trong catalog, kể cả gói ngừng bán (${message}).`
              : message,
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">{isEdit ? <Pencil /> : <BadgePercent />}</DialogIcon>
          <div className="min-w-0">
            <DialogTitle>{isEdit ? `Sửa tỷ lệ gói ${planLabel}` : 'Thêm tỷ lệ cho gói'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Hoa hồng cho người giới thiệu và chiết khấu cho khách dùng mã'
                : 'Gói chưa có tỷ lệ thì mã giới thiệu không áp dụng cho gói đó'}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>Không lưu được tỷ lệ: {serverError}</AlertDescription>
            </Alert>
          )}

          {isEdit ? (
            <Field id="rate-plan" label="Gói" hint="Không đổi được gói của một dòng tỷ lệ">
              <Input id="rate-plan" value={`${planLabel} · ${row.rate.planCode}`} readOnly disabled />
            </Field>
          ) : noChoice ? (
            <Alert variant="info">
              <AlertTitle>{catalog.length === 0 ? 'Catalog chưa có gói nào' : 'Mọi gói trong catalog đã có tỷ lệ'}</AlertTitle>
              <AlertDescription>
                {catalog.length === 0
                  ? 'Tạo gói ở màn Catalog gói trước, rồi mới thêm tỷ lệ giới thiệu cho gói đó.'
                  : 'Không còn gói nào để thêm. Muốn đổi tỷ lệ thì bấm Sửa ở hàng của gói trong bảng.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Field
              id="rate-plan"
              label="Gói"
              hint={`${choices.length} gói trong catalog chưa có tỷ lệ`}
              error={submitted ? errors.planCode : undefined}
            >
              <Select value={form.planCode} onValueChange={(v) => patch({ planCode: v })} disabled={pending}>
                <SelectTrigger id="rate-plan" aria-label="Gói" error={submitted && !!errors.planCode}>
                  <SelectValue placeholder="Chọn gói" />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name} · <span className="font-mono">{p.code}</span>
                      {!p.isActive && <span className="ml-2 text-muted-foreground">ngừng bán</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {missingPlan && (
            <Alert variant="warning">
              <AlertDescription>
                Gói <span className="font-mono">{row.rate.planCode}</span> không còn trong catalog. Backend từ chối lưu tỷ
                lệ cho gói không tồn tại, và mã giới thiệu cũng không áp dụng được cho gói này.
              </AlertDescription>
            </Alert>
          )}
          {plan && !plan.isActive && (
            <Alert variant="warning">
              <AlertDescription>
                Gói đang ngừng bán: khách không tạo được đơn mới cho gói này, nên tỷ lệ lưu ở đây chỉ có tác dụng khi gói
                mở bán lại.
              </AlertDescription>
            </Alert>
          )}

          {!noChoice && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="rate-commission"
                  label="Hoa hồng cho người giới thiệu (%)"
                  hint="Tính trên số khách thực trả · 0 đến 100, tối đa 2 chữ số lẻ"
                  error={submitted ? errors.commission : undefined}
                >
                  <Input
                    id="rate-commission"
                    inputMode="decimal"
                    autoComplete="off"
                    value={form.commission}
                    onChange={(e) => patch({ commission: e.target.value.replace(/[^\d.,]/g, '') })}
                    trailingAddon="%"
                    disabled={pending || missingPlan}
                    error={submitted && !!errors.commission}
                  />
                </Field>
                <Field
                  id="rate-discount"
                  label="Chiết khấu cho khách (%)"
                  hint="Tính trên giá gói, làm tròn xuống bội số 1.000 ₫"
                  error={submitted ? errors.discount : undefined}
                >
                  <Input
                    id="rate-discount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={form.discount}
                    onChange={(e) => patch({ discount: e.target.value.replace(/[^\d.,]/g, '') })}
                    trailingAddon="%"
                    disabled={pending || missingPlan}
                    error={submitted && !!errors.discount}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-2">
                <Text variant="caption" muted>
                  Ví dụ đơn mua đầu tiên có mã, theo giá catalog hiện tại
                </Text>
                {plan ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <PeriodPreview plan={plan} period="MONTH" commissionBp={commissionBp} discountBp={discountBp} />
                    <PeriodPreview plan={plan} period="YEAR" commissionBp={commissionBp} discountBp={discountBp} />
                  </div>
                ) : (
                  <Text variant="caption" subtle>
                    {missingPlan ? 'Gói không còn trong catalog nên không có giá để tính.' : 'Chọn gói để xem ví dụ.'}
                  </Text>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Switch
                  id="rate-active"
                  checked={form.active}
                  onCheckedChange={(v) => patch({ active: v })}
                  disabled={pending || missingPlan}
                  aria-label="Áp dụng cho đơn mới"
                />
                <div className="min-w-0">
                  <Label htmlFor="rate-active" className="font-semibold">
                    Áp dụng cho đơn mới
                  </Label>
                  <Text variant="caption" muted>
                    {form.active
                      ? 'Khách nhập mã giới thiệu khi mua gói này được chiết khấu, gói hiện trong bảng tỷ lệ của người giới thiệu.'
                      : 'Đang tắt: mã giới thiệu không dùng được cho đơn mới của gói này.'}
                  </Text>
                </div>
              </div>

              {!form.active && (
                <Alert variant="warning">
                  <AlertTitle>Tắt áp dụng không chặn đơn đã tạo</AlertTitle>
                  <AlertDescription>
                    Từ lúc lưu, khách nhập mã cho gói này bị từ chối với lý do &quot;Mã giới thiệu không áp dụng cho gói
                    này&quot;, và gói biến mất khỏi bảng tỷ lệ trên trang người giới thiệu. Đơn đã tạo kèm mã trước đó vẫn
                    giữ chiết khấu, và khi được thanh toán vẫn ghi hoa hồng theo tỷ lệ hoa hồng lưu ở đây. Muốn không trả
                    khoản đó thì hủy dòng hoa hồng ở tab Hoa hồng khi nó chưa nằm trong yêu cầu rút nào.
                  </AlertDescription>
                </Alert>
              )}

              <Alert variant="info">
                <AlertDescription>
                  Không đụng tới hoa hồng đã ghi nhận, mỗi dòng giữ tỷ lệ lúc ghi. Chiết khấu mới chỉ áp dụng cho đơn tạo
                  sau khi lưu. Hoa hồng tính theo tỷ lệ tại lúc đơn được thanh toán, nên đơn kèm mã đang chờ thanh toán
                  cũng nhận tỷ lệ hoa hồng mới.
                </AlertDescription>
              </Alert>
            </>
          )}
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending || noChoice || missingPlan}>
            {pending && <Spinner size="sm" />}
            {isEdit ? 'Lưu tỷ lệ' : 'Thêm tỷ lệ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
