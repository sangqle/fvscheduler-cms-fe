'use client';

import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/Input';

/** Nhóm hàng nghìn kiểu Việt: `328000 → "328.000"`. Ký hiệu ₫ đi bằng addon nên không nằm trong chuỗi. */
const GROUPED = new Intl.NumberFormat('vi-VN');

/** Số chữ số tối đa nhận vào — chặn ngay tại chỗ gõ trước khi vượt ngưỡng an toàn của `Number`. */
const MAX_DIGITS = 15;

export interface CurrencyInputProps
  extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'trailingAddon' | 'inputMode'> {
  /** null = ô trống, tức là "gói không có giá ở bậc này". */
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Ô nhập tiền Việt: chỉ nhận chữ số, tự chấm phân cách khi gõ, ký hiệu ₫ dính mép phải.
 *
 * Giá trị ra ngoài là `number | null` chứ không phải chuỗi — ô trống mang nghĩa **null** (bậc giá
 * không tồn tại), khác hẳn với 0 (miễn phí), và backend phân biệt hai thứ đó.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => (
    <Input
      ref={ref}
      inputMode="numeric"
      value={value === null ? '' : GROUPED.format(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
        onChange(digits === '' ? null : Number(digits));
      }}
      trailingAddon="₫"
      {...props}
    />
  ),
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
