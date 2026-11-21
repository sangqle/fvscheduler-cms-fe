'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FIELD_HEIGHT, type FieldSize } from '@/components/ui/field-size';

/**
 * Thanh trượt chọn một số trong khoảng liên tục: cỡ chữ watermark, độ mờ, góc xoay, mức thu phóng
 * khung cắt ảnh.
 *
 * Dựng trên `<input type="range">` thật chứ không phải `div` + pointer event: bàn phím (mũi tên,
 * PageUp/PageDown, Home/End), `aria-valuenow` cho trình đọc màn hình và cách nhập của từng nền tảng
 * đều có sẵn, dựng lại bằng tay là dựng lại cả một control đã đúng.
 *
 * ### Vì sao KHÔNG có `appearance-none`
 *
 * Cách thường thấy là `appearance-none` rồi tự vẽ lại track và thumb bằng
 * `::-webkit-slider-runnable-track` / `::-moz-range-track`. Bản đầu của primitive này làm vậy và ra
 * lỗi: `appearance-none` xoá luôn cái track do trình duyệt vẽ, mà `accent-color` thì chỉ tô những
 * phần trình duyệt còn vẽ, nên trên màn hình chỉ còn mỗi nút tròn màu tím **trôi lơ lửng, không có
 * đường ray nào**. Muốn tự vẽ thì phải viết đủ cả sáu pseudo-element của ba engine, và quên một cái
 * là hỏng im lặng đúng kiểu đó.
 *
 * Giữ nguyên giao diện gốc và chỉ đặt `accent-color` là đủ: Chrome, Safari, Firefox và Edge đều tô
 * đúng tông thương hiệu cho cả nút trượt lẫn đoạn track đã đi qua, đúng thanh trượt quen tay của
 * từng hệ điều hành. `FIELD_HEIGHT` đặt ở khối bọc chứ không đặt lên `<input>` vì control gốc có
 * chiều cao nội tại riêng; khối bọc canh giữa nó theo đúng thang 32/36/44.
 */

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'value' | 'onChange' | 'type' | 'defaultValue'
  > {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: FieldSize;
  /** Đơn vị nối sau số đọc: `"%"`, `"°"`. Bỏ trống thì chỉ hiện số. */
  unit?: string;
  /** Tự định dạng số đọc, đè cả `unit`. */
  formatValue?: (value: number) => string;
  /** Ẩn ô số đọc bên phải khi nơi gọi tự vẽ số ở chỗ khác. */
  hideValue?: boolean;
  /** Class layout cho khối bọc ngoài (`flex-1`, `col-span-2`); `className` đi vào chính `<input>`. */
  containerClassName?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      containerClassName,
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      size = 'md',
      unit,
      formatValue,
      hideValue,
      disabled,
      ...props
    },
    ref,
  ) => {
    const readout = formatValue ? formatValue(value) : `${value}${unit ?? ''}`;

    return (
      <div className={cn('flex min-w-0 items-center gap-3', containerClassName)}>
        {/* Chiều cao nằm ở đây, không nằm trên `<input>`: control gốc có chiều cao nội tại riêng,
            ép `h-9` thẳng lên nó chỉ kéo dài vùng chạm mà không canh giữa được đường ray. */}
        <span className={cn('flex min-w-0 flex-1 items-center', FIELD_HEIGHT[size])}>
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(Number(event.target.value))}
            className={cn(
              'w-full min-w-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            {...props}
          />
        </span>
        {hideValue ? null : (
          <output
            // `<output>` mang role=status (live region ngầm), nên mỗi lần kéo là trình đọc màn
            // hình đọc số hai lần: một từ `aria-valuenow` của chính thanh trượt, một từ đây. Số
            // này chỉ là bản sao nhìn thấy được.
            aria-hidden
            className={cn(
              'w-14 shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums text-foreground',
              disabled && 'text-muted-foreground',
            )}
          >
            {readout}
          </output>
        )}
      </div>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
