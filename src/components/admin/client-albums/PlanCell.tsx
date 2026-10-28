import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { SUBSCRIPTION_SOURCE } from '@/lib/admin/labels';
import type { AdminSubscriptionSummary } from '@/types/admin';

/**
 * Ô "Gói" của một workspace: tên gói, rồi nguồn cấp và mã gói. Cùng khuôn với cột "Gói hiện tại" của
 * `WorkspaceTable`, tách ra để các bảng thống kê album không dựng lại một bản thứ hai.
 *
 * - `subscription === null`: không có workspace sống nào đứng sau dòng (dòng "Không thuộc workspace" hoặc
 *   workspace đã xóa) nên không có gói để nói, in ô trống.
 * - Có workspace mà `planCode` rỗng (trạng thái `NONE`): "Chưa từng có gói".
 *
 * Chỉ vẽ gói, không vẽ trạng thái: bảng danh sách workspace có cột Trạng thái riêng và bảng thống kê
 * album không đủ chỗ cho cả hai.
 */
export function PlanCell({ subscription }: { subscription: AdminSubscriptionSummary | null }) {
  if (!subscription) return <span className="text-muted-foreground">—</span>;
  if (!subscription.planCode) return <span className="text-sm italic text-muted-foreground">Chưa từng có gói</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-medium">{subscription.planName ?? subscription.planCode}</span>
      <span className="flex items-center gap-1.5">
        {subscription.source && <EnumBadge meta={SUBSCRIPTION_SOURCE[subscription.source]} />}
        <span className="font-mono text-[11px] text-muted-foreground">{subscription.planCode}</span>
      </span>
    </span>
  );
}
