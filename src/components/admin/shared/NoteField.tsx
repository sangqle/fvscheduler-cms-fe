'use client';

import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

export const NOTE_MIN = 3;
export const NOTE_MAX = 400;

/**
 * Ô "Ghi chú (bắt buộc)" dùng chung cho 4 dialog ghi: 3 đến 400 ký tự, là bằng chứng duy nhất
 * của thao tác (lưu vào workspace_subscription.note hoặc rawPayload.manualMarkPaid).
 */
export function NoteField({
  id,
  value,
  onChange,
  hint,
  placeholder,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Ghi chú (bắt buộc)</Label>
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

export function validateNote(value: string): string | undefined {
  const len = value.trim().length;
  if (len < NOTE_MIN) return `Ghi chú cần ít nhất ${NOTE_MIN} ký tự.`;
  if (len > NOTE_MAX) return `Ghi chú tối đa ${NOTE_MAX} ký tự.`;
  return undefined;
}
