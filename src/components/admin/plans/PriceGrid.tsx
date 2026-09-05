'use client';

import { Badge } from '@/components/ui/Badge';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Field } from '@/components/admin/shared/Field';
import type { PriceErrors } from '@/lib/admin/catalog';

/** Bốn cột giá của một gói. `null` = gói không có giá ở bậc đó, khác hẳn 0. */
export interface PriceFields {
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
}

/**
 * Lưới bốn ô giá, dùng chung giữa dialog tạo gói và form sửa gói ở trang chi tiết — hai chỗ này
 * gửi cùng một payload lên backend nên chúng phải là cùng một khối nhập.
 */
export function PriceGrid({
  value,
  onChange,
  errors,
  idPrefix,
  disabled,
}: {
  value: PriceFields;
  onChange: (next: Partial<PriceFields>) => void;
  errors: PriceErrors;
  idPrefix: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field id={`${idPrefix}-ml`} label="Niêm yết tháng" error={errors.monthlyListPrice}>
        <CurrencyInput
          id={`${idPrefix}-ml`}
          value={value.monthlyListPrice}
          onChange={(v) => onChange({ monthlyListPrice: v })}
          error={!!errors.monthlyListPrice}
          disabled={disabled}
        />
      </Field>
      <Field id={`${idPrefix}-ms`} label="Giá bán tháng" error={errors.monthlySalePrice}>
        <CurrencyInput
          id={`${idPrefix}-ms`}
          value={value.monthlySalePrice}
          onChange={(v) => onChange({ monthlySalePrice: v })}
          error={!!errors.monthlySalePrice}
          disabled={disabled}
        />
      </Field>
      <Field
        id={`${idPrefix}-yl`}
        label="Niêm yết năm"
        badge={
          <Badge variant="warning" size="sm">
            bắt buộc
          </Badge>
        }
        error={errors.yearlyListPrice}
      >
        <CurrencyInput
          id={`${idPrefix}-yl`}
          value={value.yearlyListPrice}
          onChange={(v) => onChange({ yearlyListPrice: v })}
          error={!!errors.yearlyListPrice}
          disabled={disabled}
        />
      </Field>
      <Field id={`${idPrefix}-ys`} label="Giá bán năm" error={errors.yearlySalePrice}>
        <CurrencyInput
          id={`${idPrefix}-ys`}
          value={value.yearlySalePrice}
          onChange={(v) => onChange({ yearlySalePrice: v })}
          error={!!errors.yearlySalePrice}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
