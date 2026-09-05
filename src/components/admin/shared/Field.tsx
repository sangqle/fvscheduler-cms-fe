import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';

/**
 * Một trường trong biểu mẫu: nhãn, control, và **một** dòng chú thích ở dưới đổi thành lỗi khi có
 * lỗi. Gom lại ở đây vì các form catalog gói có hàng chục trường cùng khuôn; `NoteField` và
 * `DateTimeField` là hai biến thể chuyên dụng đã có sẵn từ trước.
 */
export function Field({
  id,
  label,
  badge,
  hint,
  error,
  children,
  className,
}: {
  /** Trỏ vào control bên trong; bỏ trống khi control không phải một phần tử form đơn lẻ. */
  id?: string;
  label: React.ReactNode;
  /** Chip nhỏ cạnh nhãn: "bắt buộc", "không đổi được"… */
  badge?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {badge}
      </div>
      {children}
      {(error || hint) && (
        <p className={error ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
