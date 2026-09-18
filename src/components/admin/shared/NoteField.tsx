'use client';

import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

export const NOTE_MIN = 3;
export const NOTE_MAX = 400;

/**
 * Ô "Ghi chú (bắt buộc)" dùng chung cho các dialog ghi: 3 đến 400 ký tự, là bằng chứng duy nhất
 * của thao tác (lưu vào workspace_subscription.note hoặc rawPayload.manualMarkPaid). `label` đổi
 * nhãn cho các thao tác gọi nó là lý do (từ chối yêu cầu rút, hủy hoa hồng).
 */
export function NoteField({
  id,
  label = 'Ghi chú (bắt buộc)',
  value,
  onChange,
  hint,
  placeholder,
  error,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={NOTE_MAX}
        showCount
        rows={3}
        placeholder={placeholder}
        error={!!error}
      />
      <p className={error ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>{error ?? hint}</p>
    </div>
  );
}

export function validateNote(value: string, noun = 'Ghi chú'): string | undefined {
  const len = value.trim().length;
  if (len < NOTE_MIN) return `${noun} cần ít nhất ${NOTE_MIN} ký tự.`;
  if (len > NOTE_MAX) return `${noun} tối đa ${NOTE_MAX} ký tự.`;
  return undefined;
}
