'use client';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

/** `datetime-local` value (giờ máy) cho một Date. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ngược lại: `datetime-local` → Date (giờ máy), `null` nếu rỗng/không hợp lệ. */
export function fromDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Ô ngày giờ dùng `<input type="datetime-local">` qua primitive `Input`: mọi mốc của CMS
 * (hết hạn gói, thời điểm thanh toán) cần cả giờ, `DatePicker` chỉ có ngày.
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
  error?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="datetime-local" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} error={!!error} />
      {(error || hint) && (
        <p className={error ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>{error ?? hint}</p>
      )}
    </div>
  );
}
