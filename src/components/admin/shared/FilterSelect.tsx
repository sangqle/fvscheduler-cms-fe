'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Radix `Select` không nhận `value=""` (chuỗi rỗng dành riêng cho "clear"), nên "Tất cả" đi bằng
 * sentinel này và được dịch về `undefined` trước khi lên URL/query.
 */
const ALL = '__ALL__';

/**
 * Dropdown lọc dùng chung cho mọi filter bar: nhãn mờ đứng trước giá trị đang chọn nên một lưới
 * bốn dropdown vẫn đọc được là đang lọc theo cái gì. Chỉ **compose** `Select` (hàng rộng, dấu
 * check bên phải, popover bo lớn) chứ không style lại; cỡ mặc định `md` để khớp `Input` cùng hàng.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'Tất cả',
  className,
}: {
  label: string;
  /** `undefined` = không lọc (hiện `allLabel`). */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={label} className={cn('min-w-0', className)}>
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <span className="truncate font-medium">{selected?.label ?? allLabel}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Bản luôn có giá trị (sắp xếp, chu kỳ…): không có mục "Tất cả", `onChange` luôn trả về một
 * option thật.
 */
export function ChoiceSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn('min-w-0', className)}>
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <span className="truncate font-medium">{selected?.label ?? ''}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
