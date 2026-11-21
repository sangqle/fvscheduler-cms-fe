'use client';

import * as React from 'react';
import { Ban, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bảng màu chọn nhanh cho những trường lưu **mã màu người dùng đặt** (màu nhấn phiếu, màu nhãn…).
 *
 * Đây là dữ liệu chứ không phải một quyết định thiết kế, nên màu của từng ô đi qua inline `style`
 * — giống cách `DocumentSheet` tô màu nhấn — còn mọi thứ khác (viền, quầng focus, dấu tick) vẫn
 * chạy bằng token. Component không tự giữ state: nó là input có kiểm soát, ô đang chọn được suy ra
 * từ `value` nên gõ tay vào ô hex hay bấm ô màu đều ra cùng một kết quả.
 */

export interface ColorSwatch {
  /** Mã màu `#RRGGBB` hoặc `#RRGGBBAA`. */
  hex: string;
  /** Tên tiếng Việt, dùng cho `aria-label` và tooltip. */
  label: string;
}

type SwatchSize = 'sm' | 'md';

/** Ô màu bên trong; nút bọc ngoài cộng thêm 4px viền quầng → 32px (`sm`) / 36px (`md`). */
const SWATCH_DISC: Record<SwatchSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
};

const SWATCH_ICON: Record<SwatchSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

/**
 * Độ sáng tương đối (WCAG) của một mã hex, để dấu tick chọn màu tối hay sáng. Ngưỡng 0.45 thay vì
 * 0.5 vì mắt đọc chữ trắng trên nền màu dễ hơn chữ đen trên nền màu ở cùng độ sáng.
 */
function isLightHex(hex: string): boolean {
  const raw = hex.replace('#', '');
  if (raw.length < 6) return false;
  const channel = (start: number) => {
    const c = parseInt(raw.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4) > 0.45;
}

export interface ColorSwatchPickerProps {
  /** Mã màu đang chọn. Chuỗi rỗng / `null` = chưa chọn (khớp ô "không màu" nếu bật `clearable`). */
  value?: string | null;
  onChange: (hex: string) => void;
  colors: readonly ColorSwatch[];
  /** Thêm ô đầu tiên để bỏ chọn, trả về chuỗi rỗng. */
  clearable?: boolean;
  /** Nhãn của ô bỏ chọn, mặc định "Không đặt màu". */
  clearLabel?: string;
  disabled?: boolean;
  size?: SwatchSize;
  className?: string;
  'aria-label'?: string;
}

export function ColorSwatchPicker({
  value,
  onChange,
  colors,
  clearable = false,
  clearLabel = 'Không đặt màu',
  disabled = false,
  size = 'sm',
  className,
  'aria-label': ariaLabel,
}: ColorSwatchPickerProps) {
  const options = React.useMemo<ColorSwatch[]>(
    () => (clearable ? [{ hex: '', label: clearLabel }, ...colors] : [...colors]),
    [clearable, clearLabel, colors],
  );

  const current = (value ?? '').trim().toUpperCase();
  const selectedIndex = options.findIndex((opt) => opt.hex.toUpperCase() === current);
  // Radiogroup chỉ chiếm **một** điểm dừng Tab: ô đang chọn, chưa chọn gì thì ô đầu tiên.
  const tabIndexAt = selectedIndex >= 0 ? selectedIndex : 0;

  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const moveTo = (index: number) => {
    const wrapped = ((index % options.length) + options.length) % options.length;
    const next = options[wrapped];
    if (!next) return;
    refs.current[wrapped]?.focus();
    onChange(next.hex);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step !== 0) {
      event.preventDefault();
      moveTo(index + step);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(options.length - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {options.map((opt, index) => {
        const selected = index === selectedIndex;
        const none = opt.hex === '';
        return (
          <button
            key={opt.hex || '__none'}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={none ? opt.label : `${opt.label} · ${opt.hex.toUpperCase()}`}
            tabIndex={index === tabIndexAt ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(opt.hex)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'rounded-full p-0.5 ring-2 transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'ring-primary' : 'ring-transparent hover:ring-border',
              // Ô đang chọn đã đeo quầng tím, nên riêng lúc focus quầng phải tách khỏi ô màu một
              // khoảng nền — không thì bàn phím di qua ô đang chọn mà nhìn không thấy gì đổi.
              'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <span
              style={none ? undefined : { backgroundColor: opt.hex }}
              className={cn(
                'flex items-center justify-center rounded-full',
                SWATCH_DISC[size],
                none
                  ? 'border border-dashed border-input bg-card text-muted-foreground'
                  : 'ring-1 ring-inset ring-foreground/10',
              )}
            >
              {none ? (
                <Ban className={SWATCH_ICON[size]} aria-hidden />
              ) : selected ? (
                <Check
                  aria-hidden
                  className={cn(
                    SWATCH_ICON[size],
                    isLightHex(opt.hex) ? 'text-foreground' : 'text-primary-foreground',
                  )}
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
