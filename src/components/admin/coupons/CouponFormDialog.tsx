'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, TicketPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
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
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { useCreateCoupon, useUpdateCoupon } from '@/hooks/useAdminCoupons';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import { hasError } from '@/lib/admin/catalog';
import {
  COUPON_CODE_MAX,
  COUPON_NOTE_MAX,
  endsAtOf,
  isScopeSelectable,
  lastDayOf,
  normalizeCouponCode,
  resolveScope,
  startDayOf,
  startsAtOf,
  takenSlots,
  validateCouponCode,
  validateMaxRedemptions,
  validatePercentOff,
  validateWindow,
} from '@/lib/admin/coupons';
import { COUPON_STATE } from '@/lib/admin/labels';
import { calendarDayOfPicker, formatVnDateTime, isPast, isVnMidnight, pickerDateOf, vnToday } from '@/lib/admin/time';
import { normalizeInputValue } from '@/lib/utils';
import { ApiError } from '@/types/api';
import type { AdminCoupon, BillingPeriod, UpdateCouponInput } from '@/types/admin';

type ScopeMode = 'all' | 'some';

interface FormState {
  code: string;
  percentOff: string;
  scopeMode: ScopeMode;
  /** Giữ cả khi đang ở "Mọi gói đang bán", để chuyển qua lại không mất các gói đã tích. */
  planCodes: string[];
  /** Rỗng là cả hai kỳ. */
  period: '' | BillingPeriod;
  maxRedemptions: string;
  firstPurchaseOnly: boolean;
  /**
   * Mốc ISO, giữ nguyên văn tới khi admin chọn lại ngày: PUT gửi mọi trường, nên một mốc lẻ giờ không
   * ai đụng tới cũng không bị làm tròn về nửa đêm.
   */
  startsAt: string | null;
  endsAt: string | null;
  note: string;
  active: boolean;
}

function initial(coupon: AdminCoupon | null): FormState {
  return {
    code: coupon?.code ?? '',
    percentOff: coupon ? String(coupon.percentOff) : '',
    scopeMode: coupon && coupon.planCodes.length > 0 ? 'some' : 'all',
    planCodes: coupon?.planCodes ?? [],
    period: coupon?.billingPeriod ?? '',
    maxRedemptions: coupon?.maxRedemptions != null ? String(coupon.maxRedemptions) : '',
    firstPurchaseOnly: coupon?.firstPurchaseOnly ?? false,
    startsAt: coupon?.startsAt ?? null,
    endsAt: coupon?.endsAt ?? null,
    note: coupon?.note ?? '',
    active: coupon?.active ?? true,
  };
}

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Mọi gói đang bán' },
  { value: 'some', label: 'Chỉ một số gói' },
];

const PERIOD_OPTIONS = [
  { value: '', label: 'Cả hai' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'YEAR', label: 'Năm' },
];

function startHint(startsAt: string | null): string {
  if (!startsAt) return 'Bỏ trống: hiệu lực ngay từ lúc lưu';
  if (isVnMidnight(startsAt)) return 'Từ 00:00 ngày này, giờ Việt Nam';
  return `Đang bắt đầu lúc ${formatVnDateTime(startsAt)}; chọn lại ngày sẽ đổi về 00:00`;
}

function endHint(endsAt: string | null): string {
  if (!endsAt) return 'Bỏ trống: không có ngày kết thúc';
  // Mốc lẻ giờ luôn hiện giờ thật trước: ngày trên ô có thể là hôm nay dù giờ kết thúc đã qua.
  if (!isVnMidnight(endsAt)) {
    return `${isPast(endsAt) ? 'Đã kết thúc' : 'Đang kết thúc'} lúc ${formatVnDateTime(endsAt)}; chọn lại ngày sẽ đổi về hết ngày đã chọn`;
  }
  if (isPast(endsAt)) return 'Ngày này đã qua, mã sẽ hết hạn ngay khi lưu';
  return 'Dùng được tới 23:59 ngày này, giờ Việt Nam';
}

const stripSpaces = (raw: string) => raw.replace(/\s+/g, '');
const digitsOnly = (raw: string) => raw.replace(/\D/g, '');

/**
 * Tạo mã giảm giá (POST /api/admin/coupons) hoặc sửa một mã (PUT /api/admin/coupons/{code}).
 *
 * Mã chỉ nhập được lúc tạo. PUT thay mọi trường nên form luôn gửi đủ, và chỉ ảnh hưởng đơn tạo sau
 * khi lưu. Phạm vi gói tách hai chế độ thay vì "không tích gì là mọi gói": bỏ tích hết thì báo lỗi,
 * không âm thầm nới phạm vi ra toàn bộ catalog. Ngày chọn theo lịch Việt Nam: bắt đầu tính từ 00:00,
 * kết thúc là hết ngày đã chọn (`endsAt` = 00:00 hôm sau).
 */
export function CouponFormDialog({
  open,
  coupon = null,
  onOpenChange,
}: {
  open: boolean;
  /** null = tạo mới. Truyền ảnh chụp lúc mở, đừng truyền dữ liệu query sống: refetch nền sẽ xóa phần đang gõ. */
  coupon?: AdminCoupon | null;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const plansQuery = useAdminPlans();
  const isEdit = coupon !== null;
  const pending = create.isPending || update.isPending;

  const [form, setForm] = React.useState<FormState>(() => initial(coupon));
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(initial(coupon));
    setSubmitted(false);
    setServerError(null);
  }, [open, coupon]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function togglePlan(code: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      planCodes: checked ? [...prev.planCodes, code] : prev.planCodes.filter((c) => c !== code),
    }));
  }

  const selectable = (plansQuery.data ?? [])
    .filter(isScopeSelectable)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  // Mọi mã sẽ gửi đi mà không chọn mới được nữa (ngừng bán, hoặc bị xóa khỏi catalog, kể cả khi catalog
  // đổi trong lúc form đang mở): vẫn liệt kê kèm lý do để admin bỏ ra được. Không gửi mã nào không thấy.
  const retired = resolveScope(
    Array.from(new Set([...(coupon?.planCodes ?? []), ...form.planCodes])),
    plansQuery.data,
  ).filter((e) => !(e.plan && isScopeSelectable(e.plan)));
  const today = pickerDateOf(vnToday());

  const errors = {
    code: isEdit ? undefined : validateCouponCode(form.code),
    percentOff: validatePercentOff(form.percentOff),
    planCodes:
      form.scopeMode === 'some' && form.planCodes.length === 0
        ? 'Tích ít nhất một gói, hoặc chọn Mọi gói đang bán.'
        : undefined,
    maxRedemptions: validateMaxRedemptions(form.maxRedemptions),
    endsAt: validateWindow(form.startsAt, form.endsAt),
  };
  const invalid = hasError(errors);

  function submit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    const input: UpdateCouponInput = {
      percentOff: Number(form.percentOff),
      planCodes: form.scopeMode === 'all' ? [] : form.planCodes,
      billingPeriod: form.period || null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      firstPurchaseOnly: form.firstPurchaseOnly,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      active: form.active,
      note: form.note.trim() || null,
    };
    if (isEdit) {
      update.mutate(
        { code: coupon.code, input },
        {
          onSuccess: (saved) => {
            showToast({
              title: `Đã lưu mã ${saved.code}`,
              description: 'Áp dụng cho đơn tạo từ bây giờ; đơn đang chờ chuyển khoản giữ nguyên giá.',
              variant: 'success',
            });
            onOpenChange(false);
          },
          onError: (e) => {
            const message = apiErrorMessage(e, 'Không lưu được mã. Vui lòng thử lại.');
            setServerError(
              e instanceof ApiError && e.status === 404
                ? `Mã này không còn tồn tại, có thể đã bị xóa ở nơi khác (${message}).`
                : message,
            );
          },
        },
      );
      return;
    }
    create.mutate(
      { code: form.code, ...input },
      {
        onSuccess: (saved) => {
          showToast({
            title: `Đã tạo mã ${saved.code}`,
            description: `${saved.state} · ${COUPON_STATE[saved.state].hint}`,
            variant: 'success',
          });
          onOpenChange(false);
          router.push(`/coupons/${saved.code}`);
        },
        onError: (e) => setServerError(apiErrorMessage(e, 'Không tạo được mã. Vui lòng thử lại.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">{isEdit ? <Pencil /> : <TicketPlus />}</DialogIcon>
          <div className="min-w-0">
            <DialogTitle>{isEdit ? `Sửa mã ${coupon.code}` : 'Tạo mã giảm giá'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Chỉ áp dụng cho đơn tạo sau khi lưu · đơn đang chờ chuyển khoản giữ nguyên giá'
                : 'Khách nhập mã ở bước thanh toán gói · mỗi workspace dùng một lần'}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className={isEdit ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]'}>
            {!isEdit && (
              <Field
                id="coupon-code"
                label="Mã"
                hint="3 đến 20 ký tự A-Z và 0-9 · không đổi được sau khi tạo"
                error={submitted ? errors.code : undefined}
              >
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => patch({ code: normalizeInputValue(e.target, normalizeCouponCode, COUPON_CODE_MAX) })}
                  placeholder="TET2027"
                  className="font-mono"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  error={submitted && !!errors.code}
                />
              </Field>
            )}
            <Field
              id="coupon-percent"
              label="Giảm"
              hint="Số nguyên từ 1 đến 99"
              error={submitted ? errors.percentOff : undefined}
            >
              <Input
                id="coupon-percent"
                inputMode="numeric"
                value={form.percentOff}
                // Chỉ bỏ khoảng trắng: "1.5" phải ra lỗi số nguyên chứ không âm thầm thành 15.
                onChange={(e) => patch({ percentOff: normalizeInputValue(e.target, stripSpaces, 3) })}
                placeholder="10"
                trailingAddon="%"
                autoComplete="off"
                error={submitted && !!errors.percentOff}
              />
            </Field>
          </div>

          <Field
            label="Gói áp dụng"
            hint={
              form.scopeMode === 'all'
                ? 'Mọi gói đang bán, gồm cả gói mở bán sau này · không bao giờ gồm gói Free'
                : 'Chỉ các gói được tích · gói Free không bao giờ nằm trong phạm vi'
            }
            error={submitted ? errors.planCodes : undefined}
          >
            <SegmentedControl
              options={SCOPE_OPTIONS}
              value={form.scopeMode}
              onValueChange={(v) => patch({ scopeMode: v as ScopeMode })}
              size="sm"
              aria-label="Phạm vi gói"
            />
            {form.scopeMode === 'some' &&
              (plansQuery.isPending ? (
                <div className="flex flex-col gap-2 py-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : plansQuery.error ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-destructive">Không tải được catalog gói.</p>
                  <Button variant="link" size="sm" onClick={() => void plansQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              ) : (
                <div role="group" aria-label="Các gói áp dụng" className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  {selectable.length === 0 && retired.length === 0 && (
                    <Text variant="caption" muted>
                      Catalog chưa có gói nào đang bán.
                    </Text>
                  )}
                  {selectable.map((p) => (
                    <label key={p.code} className="flex cursor-pointer items-start gap-2.5 py-1">
                      <Checkbox
                        className="mt-0.5"
                        checked={form.planCodes.includes(p.code)}
                        onChange={(e) => togglePlan(p.code, e.target.checked)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      </span>
                    </label>
                  ))}
                  {retired.map((e) => (
                    <label key={e.code} className="flex cursor-pointer items-start gap-2.5 py-1">
                      <Checkbox
                        className="mt-0.5"
                        checked={form.planCodes.includes(e.code)}
                        onChange={(ev) => togglePlan(e.code, ev.target.checked)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{e.plan?.name ?? e.code}</span>
                        <span className="text-xs text-warning-deep">
                          <span className="font-mono">{e.code}</span>
                          {e.missing ? ' · không còn trong catalog' : ' · ngừng bán'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kỳ thanh toán" hint="Áp cho gói tháng, gói năm, hay cả hai">
              <SegmentedControl
                options={PERIOD_OPTIONS}
                value={form.period}
                onValueChange={(v) => patch({ period: v as FormState['period'] })}
                size="sm"
                aria-label="Kỳ thanh toán"
              />
            </Field>
            <Field
              id="coupon-max"
              label="Tổng số lượt"
              hint={
                isEdit
                  ? `Đang chiếm ${takenSlots(coupon)} chỗ (${coupon.redeemedCount} đã dùng, ${coupon.heldCount} đang giữ) · hạ trần xuống dưới số này sẽ bị từ chối`
                  : 'Số workspace được dùng mã · để trống là không giới hạn'
              }
              error={submitted ? errors.maxRedemptions : undefined}
            >
              <Input
                id="coupon-max"
                inputMode="numeric"
                value={form.maxRedemptions}
                // Bỏ dấu chấm nghìn ("1.000" là 1000); 9 chữ số còn dưới trần `Integer` của Java.
                onChange={(e) => patch({ maxRedemptions: normalizeInputValue(e.target, digitsOnly, 9) })}
                placeholder="Không giới hạn"
                trailingAddon="lượt"
                autoComplete="off"
                error={submitted && !!errors.maxRedemptions}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="coupon-starts" label="Ngày bắt đầu" hint={startHint(form.startsAt)}>
              <DatePicker
                id="coupon-starts"
                value={form.startsAt ? pickerDateOf(startDayOf(form.startsAt)) : undefined}
                onChange={(d) => patch({ startsAt: d ? startsAtOf(calendarDayOfPicker(d)) : null })}
                max={form.endsAt ? pickerDateOf(lastDayOf(form.endsAt)) : undefined}
                today={today}
                placeholder="Hiệu lực ngay"
                clearable
              />
            </Field>
            <Field
              id="coupon-ends"
              label="Hiệu lực đến hết ngày"
              hint={endHint(form.endsAt)}
              error={submitted ? errors.endsAt : undefined}
            >
              <DatePicker
                id="coupon-ends"
                value={form.endsAt ? pickerDateOf(lastDayOf(form.endsAt)) : undefined}
                onChange={(d) => patch({ endsAt: d ? endsAtOf(calendarDayOfPicker(d)) : null })}
                min={form.startsAt ? pickerDateOf(startDayOf(form.startsAt)) : undefined}
                today={today}
                placeholder="Không có ngày kết thúc"
                clearable
                error={submitted && !!errors.endsAt}
              />
            </Field>
          </div>

          <Field id="coupon-note" label="Ghi chú nội bộ" hint="Khách không bao giờ thấy">
            <Textarea
              id="coupon-note"
              value={form.note}
              onChange={(e) => patch({ note: e.target.value })}
              maxLength={COUPON_NOTE_MAX}
              showCount
              rows={2}
              placeholder="Ví dụ: Tết 2027, đăng trên fanpage"
            />
          </Field>

          <div className="flex items-start gap-3">
            <Switch
              id="coupon-first-purchase"
              checked={form.firstPurchaseOnly}
              onCheckedChange={(v) => patch({ firstPurchaseOnly: v })}
              aria-label="Chỉ lần mua đầu"
            />
            <div className="min-w-0">
              <Label htmlFor="coupon-first-purchase" className="font-semibold">
                Chỉ lần mua đầu
              </Label>
              <Text variant="caption" muted>
                Chỉ workspace chưa từng thanh toán gói nào (và không có kỳ MANUAL hay LEGACY đang chạy) mới dùng được.
              </Text>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Switch
              id="coupon-active"
              checked={form.active}
              onCheckedChange={(v) => patch({ active: v })}
              aria-label="Bật mã"
            />
            <div className="min-w-0">
              <Label htmlFor="coupon-active" className="font-semibold">
                Bật mã
              </Label>
              <Text variant="caption" muted>
                Tắt thì khách không nhập được mã dù đang trong thời hạn. Đơn đã tạo kèm mã vẫn giữ giá và vẫn
                thanh toán được.
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Spinner size="sm" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo mã'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
