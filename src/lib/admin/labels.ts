import type { BadgeVariant } from '@/components/ui/Badge';
import type {
  BillingPeriod,
  GrantSource,
  MembershipStatus,
  OrderStatus,
  SubscriptionDbStatus,
  SubscriptionSource,
  SubscriptionStatus,
  WorkspaceType,
} from '@/types/admin';

/**
 * Enum backend → nhãn hiển thị + variant `Badge`. Một chỗ duy nhất, mọi màn dùng chung.
 * Màu theo legend thiết kế: NONE xám trung tính, TRIALING xanh dương, ACTIVE xanh lá,
 * PAST_DUE cam, EXPIRED đỏ; MANUAL tím (có bàn tay người can thiệp).
 */

export interface EnumMeta {
  label: string;
  variant: BadgeVariant;
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, EnumMeta> = {
  NONE: { label: 'NONE', variant: 'muted' },
  TRIALING: { label: 'TRIALING', variant: 'info' },
  ACTIVE: { label: 'ACTIVE', variant: 'success' },
  PAST_DUE: { label: 'PAST_DUE', variant: 'warning' },
  EXPIRED: { label: 'EXPIRED', variant: 'destructive' },
};

export const SUBSCRIPTION_DB_STATUS: Record<SubscriptionDbStatus, EnumMeta> = {
  TRIALING: SUBSCRIPTION_STATUS.TRIALING,
  ACTIVE: SUBSCRIPTION_STATUS.ACTIVE,
  PAST_DUE: SUBSCRIPTION_STATUS.PAST_DUE,
  EXPIRED: SUBSCRIPTION_STATUS.EXPIRED,
  CANCELED: { label: 'CANCELED', variant: 'muted' },
};

export const SUBSCRIPTION_SOURCE: Record<SubscriptionSource, EnumMeta> = {
  TRIAL: { label: 'TRIAL', variant: 'info' },
  SEPAY: { label: 'SEPAY', variant: 'success' },
  MANUAL: { label: 'MANUAL', variant: 'default' },
  LEGACY: { label: 'LEGACY', variant: 'secondary' },
};

export const GRANT_SOURCE_OPTIONS: { value: GrantSource; label: string; hint: string }[] = [
  { value: 'MANUAL', label: 'MANUAL', hint: 'Đối soát tay → ACTIVE' },
  { value: 'LEGACY', label: 'LEGACY', hint: 'Kế thừa dữ liệu cũ → ACTIVE' },
  { value: 'TRIAL', label: 'TRIAL', hint: 'Dùng thử → TRIALING' },
];

export const ORDER_STATUS: Record<OrderStatus, EnumMeta> = {
  PENDING: { label: 'PENDING', variant: 'warning' },
  PAID: { label: 'PAID', variant: 'success' },
  EXPIRED: { label: 'EXPIRED', variant: 'destructive' },
  CANCELED: { label: 'CANCELED', variant: 'muted' },
};

export const MEMBERSHIP_STATUS: Record<MembershipStatus, EnumMeta> = {
  invited: { label: 'Đã mời', variant: 'warning' },
  active: { label: 'Hoạt động', variant: 'success' },
  disabled: { label: 'Vô hiệu', variant: 'muted' },
};

export const WORKSPACE_TYPE: Record<WorkspaceType, string> = {
  studio: 'Studio',
  freelancer: 'Freelancer',
};

export const BILLING_PERIOD: Record<BillingPeriod, string> = {
  MONTH: 'Tháng',
  YEAR: 'Năm',
};

/** Nhãn tiếng Việt cho key giới hạn của gói. */
export const LIMIT_LABEL: Record<string, string> = {
  SEATS: 'Thành viên',
  BRANCHES: 'Chi nhánh',
  ALBUMS_PER_MONTH: 'Album mỗi tháng',
};

/** Đơn hàng còn xác nhận tay được (mark-paid nhận PENDING lẫn EXPIRED). */
export function isOrderPayable(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'EXPIRED';
}
