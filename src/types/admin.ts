/**
 * DTO của `/api/admin/**` (Spring Boot `admin/dto/*.java`). Mọi id đều là id mờ (string);
 * dòng subscription KHÔNG có id, đơn hàng địa chỉ bằng `orderCode`.
 * Spec: docs/specs/*.md.
 */

export type WorkspaceType = 'freelancer' | 'studio';

/** Trạng thái gói suy theo đồng hồ lúc đọc (không phải giá trị lưu DB). */
export type SubscriptionStatus = 'NONE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
/** Giá trị lưu DB của một dòng `workspace_subscription`. */
export type SubscriptionDbStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED';
export type SubscriptionSource = 'TRIAL' | 'SEPAY' | 'MANUAL' | 'LEGACY';
/** Nguồn được phép khi cấp tay (SEPAY bị từ chối 400). */
export type GrantSource = 'MANUAL' | 'LEGACY' | 'TRIAL';

export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELED';
export type BillingPeriod = 'MONTH' | 'YEAR';
export type MembershipStatus = 'invited' | 'active' | 'disabled';

// ─── Workspaces ───────────────────────────────────────────────────────────────

export interface AdminWorkspaceOwner {
  membershipId: string;
  displayName: string;
  /** null khi chủ sở hữu chưa có tài khoản đăng nhập. */
  accountId: string | null;
  email: string | null;
}

export interface AdminWorkspaceCounts {
  activeMembers: number;
  activeBranches: number;
}

export interface AdminSubscriptionSummary {
  planCode: string | null;
  planName: string | null;
  status: SubscriptionStatus;
  source: SubscriptionSource | null;
  startsAt: string | null;
  expiresAt: string | null;
}

/** GET /api/admin/workspaces → PageResponse<AdminWorkspaceRow> */
export interface AdminWorkspaceRow {
  id: string;
  name: string;
  type: WorkspaceType;
  createdAt: string;
  owner: AdminWorkspaceOwner;
  counts: AdminWorkspaceCounts;
  subscription: AdminSubscriptionSummary;
}

export interface AdminEntitlement {
  features: string[];
  /** Giới hạn hiệu lực; key không có = gói không mang giới hạn này. */
  limits: Record<string, number>;
  /** Key có giá trị null trong catalog = không giới hạn. */
  unlimitedKeys: string[];
  readOnly: boolean;
}

export interface AdminLimitOverride {
  limitKey: string;
  value: number | null;
  note: string | null;
}

export interface AdminItemOverride {
  itemCode: string;
  enabled: boolean;
  note: string | null;
}

/** GET /api/admin/workspaces/{workspaceId} */
export interface AdminWorkspaceDetail extends AdminWorkspaceRow {
  entitlement: AdminEntitlement;
  usage: Record<string, number>;
  limitOverrides: AdminLimitOverride[];
  itemOverrides: AdminItemOverride[];
  stats: { bookings: number; clients: number };
}

export interface AdminWorkspaceListParams {
  q?: string;
  type?: WorkspaceType;
  subscriptionStatus?: SubscriptionStatus;
  planCode?: string;
  page?: number;
  size?: number;
  /** `createdAt,desc` (mặc định) hoặc `name,asc`. */
  sort?: string;
}

// ─── Memberships (cùng shape MembershipResponse của GET /api/memberships) ─────

export interface AdminMembership {
  id: string;
  workspaceId: string;
  accountId: string | null;
  account: { id: string; displayName: string | null; email: string | null; status: string } | null;
  displayName: string | null;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  branches: { branchId: string; branchName: string; isHome: boolean | null }[];
  roles: {
    roleId: string;
    name: string;
    code: string | null;
    isSystem: boolean;
    scopeType: string;
    branchId: string | null;
    branchName: string | null;
  }[];
}

export interface AdminMembershipListParams {
  status?: MembershipStatus;
  page?: number;
  size?: number;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** GET /api/admin/workspaces/{id}/subscriptions → AdminSubscriptionRow[] (mảng phẳng, không id). */
export interface AdminSubscriptionRow {
  planCode: string;
  planName: string;
  /** Giá trị lưu DB. */
  status: SubscriptionDbStatus;
  /** Suy theo đồng hồ; CANCELED luôn ra NONE. */
  effectiveStatus: SubscriptionStatus;
  source: SubscriptionSource;
  startsAt: string;
  expiresAt: string;
  note: string | null;
  createdAt: string;
}

export interface GrantSubscriptionInput {
  planCode: string;
  source: GrantSource;
  /** ISO, phải ở tương lai. */
  expiresAt: string;
  /** 3..400 ký tự. */
  note: string;
}

export interface AdjustSubscriptionInput {
  expiresAt: string;
  note: string;
}

export interface CancelSubscriptionInput {
  note: string;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

/** GET /api/admin/plans → AdminPlan[] */
export interface AdminPlan {
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  yearlyListPrice: number | null;
  yearlySalePrice: number | null;
  /** value null = không giới hạn; key vắng = gói không mang giới hạn này. */
  limits: Record<string, number | null>;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface AdminOrderRow {
  orderCode: string;
  workspace: { id: string; name: string };
  planCode: string;
  planName: string;
  billingPeriod: BillingPeriod;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  /** null với đơn xác nhận tay. */
  sepayTxId: string | null;
}

/** GET /api/admin/orders/{orderCode} */
export interface AdminOrderDetail extends AdminOrderRow {
  rawPayload: Record<string, unknown> | null;
  createdBy: { accountId: string; email: string | null } | null;
}

export interface AdminOrderListParams {
  status?: OrderStatus;
  q?: string;
  workspaceId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MarkPaidInput {
  note: string;
  /** Tối đa 120 ký tự. */
  reference?: string;
  /** ISO, không được ở tương lai; mặc định là bây giờ. */
  paidAt?: string;
}

export interface MarkPaidResult {
  order: AdminOrderDetail;
  subscription: AdminSubscriptionRow;
}
