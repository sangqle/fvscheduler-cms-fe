import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/utils';
import type { AdminPlan } from '@/types/admin';

/**
 * Mấy mảnh hiển thị dùng chung giữa bảng gói, trang chi tiết và các dialog. Chỉ compose primitive,
 * không tự vẽ hộp.
 */

/** Giá bán thực tế của một bậc: bỏ trống giá bán nghĩa là bán đúng giá niêm yết. */
export function effectivePrice(list: number | null, sale: number | null): number | null {
  return sale ?? list;
}

/** Giá bán đậm, giá niêm yết gạch ngang bên dưới khi hai giá khác nhau; bậc không có giá thì `—`. */
export function PriceCell({ list, sale }: { list: number | null; sale: number | null }) {
  const effective = effectivePrice(list, sale);
  if (effective === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col font-mono text-xs">
      <span className="font-semibold text-foreground">{formatCurrency(effective)}</span>
      {list !== null && list !== effective && (
        <span className="text-muted-foreground line-through">{formatCurrency(list)}</span>
      )}
    </span>
  );
}

/** Một chip cho mỗi limit gói đang mang; `∞` = key có nhưng giá trị null. Không có key nào thì báo rõ. */
export function LimitChips({ limits }: { limits: Record<string, number | null> }) {
  const keys = Object.keys(limits);
  if (keys.length === 0) return <span className="text-xs text-muted-foreground">chưa có limit</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <Badge key={key} variant="secondary" size="sm" className="gap-1 font-mono">
          <span className="text-muted-foreground">{key}</span>
          <span className="font-bold text-foreground">{limits[key] === null ? '∞' : limits[key]}</span>
        </Badge>
      ))}
    </div>
  );
}

/** Chip trạng thái bán, kèm nhãn "GÓI TRIAL" và "Nháp" (chưa mở bán, chưa ai dùng). */
export function PlanStateBadges({ plan }: { plan: AdminPlan }) {
  return (
    <>
      {plan.isTrialPlan && (
        <Badge variant="info-soft" size="sm" mono>
          Gói trial
        </Badge>
      )}
      {!plan.isActive && isDraft(plan) && (
        <Badge variant="muted" size="sm">
          Nháp
        </Badge>
      )}
    </>
  );
}

/**
 * Một con số tham chiếu kèm nhãn — ô nhỏ dùng trong dialog xóa và thẻ "Đang được tham chiếu".
 * Không phải `StatCard` (thẻ đó cần icon và là một `Card` đầy đủ), chỉ là hai ô nằm trong một khối
 * đã có khung sẵn.
 */
export function RefStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
      {/* `text-xl` = 1.25rem = --text-h3, `text-xs` = --text-caption: hai bậc có sẵn của thang chữ. */}
      <span className="font-mono text-xl font-bold text-foreground">{value}</span>
      <Text variant="caption" muted as="span">
        {label}
      </Text>
    </div>
  );
}

/** Gói chưa mở bán và chưa ai từng dùng: vẫn còn sửa thoải mái, xóa được. */
export function isDraft(plan: AdminPlan): boolean {
  return !plan.isActive && referenceCount(plan) === 0;
}

export function referenceCount(plan: AdminPlan): number {
  return plan.usage.subscriptions + plan.usage.orders;
}

/** Backend từ chối xóa gói trial, và từ chối xóa gói còn subscription hoặc đơn hàng nào trỏ vào. */
export function canDeletePlan(plan: AdminPlan): boolean {
  return !plan.isTrialPlan && referenceCount(plan) === 0;
}
