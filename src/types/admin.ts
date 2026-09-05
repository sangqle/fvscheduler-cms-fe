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

// ─── Plans (catalog) ─────────────────────────────────────────────────────────

/** Số bản ghi ngoài catalog còn trỏ vào gói/item — quyết định gói có xóa vĩnh viễn được không. */
export interface AdminPlanUsage {
  subscriptions: number;
  orders: number;
}

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
  usage: AdminPlanUsage;
  /** Gói trial cấu hình sẵn: không tắt bán và không xóa được (ADM-RULE-016). */
  isTrialPlan: boolean;
}

/** Item trong gói đến từ nhóm (`GROUP`) hay từ một dòng ghi đè (`LINK`). */
export type PlanItemSource = 'GROUP' | 'LINK';

export interface AdminPlanGroupRef {
  code: string;
  label: string;
  isActive: boolean;
}

export interface AdminPlanItemView {
  code: string;
  label: string;
  groupCode: string;
  featureKey: string | null;
  enabled: boolean;
  displayValue: string | null;
  sortOrder: number;
  source: PlanItemSource;
}

/** GET /api/admin/plans/{code} — cũng là response của POST / PUT / PUT composition. */
export interface AdminPlanDetail extends AdminPlan {
  groups: AdminPlanGroupRef[];
  items: AdminPlanItemView[];
  createdAt: string;
  updatedAt: string;
}

/** Bốn cột giá, dùng chung cho create và update. */
export interface PlanPriceInput {
  monthlyListPrice: number | null;
  monthlySalePrice: number | null;
  /** Bắt buộc, `>= 0`. */
  yearlyListPrice: number;
  yearlySalePrice: number | null;
}

export interface CreatePlanInput extends PlanPriceInput {
  /** `^[A-Z][A-Z0-9_]{1,31}$`, không đổi được sau khi tạo. */
  code: string;
  /** 1..120 ký tự. */
  name: string;
  isActive: boolean;
  sortOrder: number;
}

/** PUT /api/admin/plans/{code}: không có `code`, children không bị đụng tới. */
export type UpdatePlanInput = Omit<CreatePlanInput, 'code'>;

export interface PlanItemLinkInput {
  code: string;
  /** null = mặc định (true). */
  enabled: boolean | null;
  /** Tối đa 120 ký tự; null = theo mặc định của item. */
  displayValue: string | null;
  sortOrder: number | null;
}

export interface PlanLimitInput {
  key: string;
  /** null = không giới hạn; key vắng khỏi mảng = gói không mang giới hạn này. */
  value: number | null;
}

/** PUT /api/admin/plans/{code}/composition: thay TOÀN BỘ children của gói. */
export interface PlanCompositionInput {
  groups: string[];
  items: PlanItemLinkInput[];
  limits: PlanLimitInput[];
}

// ─── Catalog: nhóm, item, từ vựng ────────────────────────────────────────────

export interface AdminCatalogGroupItem {
  code: string;
  label: string;
  featureKey: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** GET /api/admin/catalog/groups — nhóm chỉ đọc, không có CRUD nhóm ở backend. */
export interface AdminCatalogGroup {
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  items: AdminCatalogGroupItem[];
}

export interface AdminCatalogItemUsage {
  links: number;
  overrides: number;
}

/** GET /api/admin/catalog/items — gồm cả item đã tắt, sắp theo sort nhóm rồi sort item. */
export interface AdminCatalogItem {
  code: string;
  groupCode: string;
  groupLabel: string;
  label: string;
  description: string | null;
  featureKey: string | null;
  badge: string | null;
  isActive: boolean;
  sortOrder: number;
  usage: AdminCatalogItemUsage;
}

export interface CreateItemInput {
  /** `^[a-z][a-z0-9-]{1,63}$`, không đổi được sau khi tạo. */
  code: string;
  groupCode: string;
  /** 1..160 ký tự. */
  label: string;
  /** Tối đa 400 ký tự. */
  description: string | null;
  /** null hoặc một khóa trong từ vựng đóng. */
  featureKey: string | null;
  /** Tối đa 40 ký tự. */
  badge: string | null;
  isActive: boolean;
  sortOrder: number;
}

export type UpdateItemInput = Omit<CreateItemInput, 'code'>;

/** GET /api/admin/catalog/feature-keys — từ vựng đóng + số item đang mang khóa lúc đọc. */
export interface AdminFeatureKey {
  key: string;
  /** Khóa không gác route nào, chỉ nằm trong `FeatureCatalog.RESERVED_KEYS`. */
  reserved: boolean;
  activeCarriers: number;
}

/** GET /api/admin/catalog/limit-keys — từ vựng đóng của limits. */
export interface AdminLimitKey {
  key: string;
  label: string;
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
