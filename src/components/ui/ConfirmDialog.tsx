'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Check,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from './Dialog';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'success' | 'info';

interface VariantStyle {
  /** Ô icon: nền mềm + chữ đậm theo token. */
  tile: string;
  /** Icon mặc định của variant (override bằng prop `icon`). */
  icon: LucideIcon;
  /** Variant của nút xác nhận. */
  button: React.ComponentProps<typeof Button>['variant'];
  /** Override màu nút khi Button chưa có variant tương ứng (warning/info). */
  buttonClass?: string;
}

const VARIANTS: Record<ConfirmVariant, VariantStyle> = {
  default: {
    tile: 'bg-primary-50 text-primary-600',
    icon: HelpCircle,
    button: 'default',
  },
  destructive: {
    tile: 'bg-destructive-soft text-destructive-deep',
    icon: AlertTriangle,
    button: 'destructive',
  },
  warning: {
    tile: 'bg-warning-soft text-warning-deep',
    icon: AlertTriangle,
    button: 'default',
    buttonClass: 'bg-warning text-warning-foreground hover:bg-warning/90',
  },
  success: {
    tile: 'bg-success-soft text-success-deep',
    icon: CheckCircle2,
    button: 'success',
  },
  info: {
    tile: 'bg-info-soft text-info-deep',
    icon: Info,
    button: 'default',
    buttonClass: 'bg-info text-info-foreground hover:bg-info/90',
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Bộ màu của ô icon + nút xác nhận. Mặc định `default`. */
  variant?: ConfirmVariant;
  /**
   * @deprecated Dùng `variant="destructive"`. Giữ để tương thích ngược — khi `true`
   * sẽ ép variant về `destructive`.
   */
  destructive?: boolean;
  /** Icon tuỳ chỉnh cho ô icon (mặc định theo `variant`). Truyền component Lucide. */
  icon?: LucideIcon;
  /** Ẩn hẳn ô icon. */
  hideIcon?: boolean;
  /** Ẩn icon ✓ trên nút xác nhận. */
  hideConfirmIcon?: boolean;
  /**
   * Nội dung thêm giữa mô tả và hàng nút — dành cho hành động cần **một mẩu thông tin** trước khi
   * chạy (ô lý do khi huỷ một giao dịch, ô ghi chú, một checkbox "tôi hiểu"). Chỉ dùng cho trường
   * hợp đó; cần cả một biểu mẫu thì đó là `Dialog`, không phải hộp xác nhận nữa.
   */
  children?: React.ReactNode;
  /** Khoá nút xác nhận (vd trường bắt buộc trong `children` chưa hợp lệ). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  isPending?: boolean;
}

/**
 * Dialog xác nhận dùng chung cho 1 hành động (đổi trạng thái, xóa, hủy…).
 * Màu sắc theo `variant`; icon mặc định theo variant nhưng có thể override bằng `icon`.
 *
 * @example
 * <ConfirmDialog open={open} onOpenChange={setOpen} variant="destructive" icon={Trash2}
 *   title="Xóa mục này?" description="Không thể khôi phục." confirmLabel="Xóa"
 *   onConfirm={handleDelete} isPending={isDeleting} />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onCancel,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'default',
  destructive,
  icon,
  hideIcon,
  hideConfirmIcon,
  children,
  confirmDisabled,
  onConfirm,
  isPending,
}: ConfirmDialogProps) {
  const v = VARIANTS[destructive ? 'destructive' : variant];
  const Icon = icon ?? v.icon;

  function handleCancel() {
    onCancel?.();
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col gap-4">
        <div className="flex items-start gap-3.5 pr-8">
          {!hideIcon && (
            <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-xl', v.tile)}>
              <Icon className="h-5.5 w-5.5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1.5 leading-relaxed">{description}</DialogDescription>
            )}
          </div>
        </div>

        {children}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={v.button}
            className={v.buttonClass}
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
          >
            {isPending ? <Spinner size="sm" /> : !hideConfirmIcon && <Check className="h-4 w-4" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
