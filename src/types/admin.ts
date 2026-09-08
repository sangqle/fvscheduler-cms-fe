/**
 * DTO của `/api/admin/**` (Spring Boot `admin/dto/*.java`). Mọi id đều là id mờ (string);
 * dòng subscription KHÔNG có id, đơn hàng địa chỉ bằng `orderCode`.
 * Spec: docs/specs/*.md.
 */

import type { BookingPaymentStatus, BookingResponse, BookingStatus } from '@/types/booking';

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
  /** Khóa số của membership, chỉ có trên `/api/admin/**`; xem `RawId`. */
  rawMembershipId: number;
  displayName: string;
  /** null khi chủ sở hữu chưa có tài khoản đăng nhập. */
  accountId: string | null;
  /** null cùng lúc với `accountId`. */
  rawAccountId: number | null;
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
  /** Khóa số của `workspace.id`, chỉ có trên `/api/admin/**`; xem `RawId`. */
  rawId: number;
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

// ─── Bookings (drill-down của một workspace) ─────────────────────────────────

/**
 * Bốn cột tổng hợp writer giữ sẵn trên chính dòng `booking`. Chúng **không** nằm trong
 * `BookingResponse` (bản đó mang các dòng chi tiết), nên đặt cạnh nhau là đọc được ngay con số lưu
 * sẵn có còn khớp danh sách nó khai là mình tổng kết hay không.
 */
export interface AdminBookingTotals {
  contractTotal: number;
  paidAmount: number;
  /** `contractTotal - paidAmount`; âm khi khách trả dư, đó là thông tin chứ không phải lỗi. */
  outstandingAmount: number;
  costTotal: number;
  paymentStatus: BookingPaymentStatus;
}

/**
 * Nửa **chỉ CMS** của một dòng. Không bao giờ trộn vào `booking`: nửa kia là hợp đồng của tenant.
 *
 * Backend đánh `@JsonInclude(NON_NULL)` nên trường null biến mất khỏi payload; mọi chỗ đọc phải
 * kiểm tra bằng truthy chứ đừng so `=== null`.
 */
export interface AdminBookingMeta {
  /** Lặp lại từ `booking` để dòng đã tombstone vẫn địa chỉ hóa được. */
  id: string;
  rawId: number;
  rawBranchId: number;
  rawRoomId: number | null;
  rawShiftId: number | null;
  rawClientId: number;
  rawCreatedByMembershipId: number | null;
  totals: AdminBookingTotals;
  /**
   * Đóng dấu một lần lúc khách chốt, không bao giờ đóng lại, nên doanh thu đã ký không thể bị đẩy
   * sang tháng khác bằng cách bật tắt trạng thái. Booking đã qua `pending_confirm` mà `confirmedAt`
   * null là một bug nhìn thấy được từ đây.
   */
  confirmedAt: string | null;
  completedAt: string | null;
  /** Khóa rollup, mỗi cái là ngày đầu một tháng: suy từ `startAt` / `confirmedAt` / `completedAt`. */
  revenueMonth: string | null;
  signedMonth: string | null;
  recognitionMonth: string | null;
  /** Chỉ có khi request truyền `includeDeleted=true` **và** dòng này đúng là một tombstone. */
  deletedAt?: string;
  deletedByMembershipId?: string;
  rawDeletedByMembershipId?: number;
}

/**
 * GET /api/admin/workspaces/{id}/bookings → PageResponse<AdminBookingRow>, mỗi dòng hai nửa.
 *
 * `booking` là `BookingResponse` của tenant **nguyên văn**; `null` với booking đã xóa mềm vì cả cây
 * con đã tombstone, không còn gì để dựng. `admin` là overlay chỉ CMS mới thấy.
 */
export interface AdminBookingRow {
  booking: BookingResponse | null;
  admin: AdminBookingMeta;
}

/**
 * GET /api/admin/workspaces/{id}/bookings/summary — đếm, và chỉ đếm.
 *
 * Bản trước còn mang khối `inconsistent`; bỏ theo ruling của owner ngày 2026-09-07 vì nó chạy bốn
 * truy vấn con tương quan cho mỗi booking trên toàn cửa sổ. Endpoint này phải rẻ đủ để một màn hình
 * cứ thế gọi.
 */
export interface AdminBookingSummary {
  /** Booking còn sống có `startAt` rơi vào cửa sổ. */
  total: number;
  /** Booking đã tombstone trong cùng cửa sổ, đếm riêng, không bao giờ trộn vào `total`. */
  deleted: number;
  /** Trạng thái không có booking nào thì **vắng mặt**, không phải 0. */
  byStatus: Partial<Record<BookingStatus, number>>;
  /** Key là ngày đầu tháng `YYYY-MM-DD`; booking chưa suy ra tháng bị bỏ khỏi map. */
  byRevenueMonth: Record<string, number>;
  /** Booking còn sống mà không chỗ crew nào gọi tên người. */
  unstaffed: number;
}

export interface AdminBookingListParams {
  status?: BookingStatus;
  /** ISO instant trên `startAt`: `from` bao gồm, `to` loại trừ. */
  from?: string;
  to?: string;
  /**
   * Tên khách, số điện thoại, hoặc mã booking. Toàn chữ số và không bắt đầu bằng 0 thì backend hiểu
   * là id; còn lại khớp tên/điện thoại. Đúng luật danh sách booking của tenant dùng.
   */
  search?: string;
  includeDeleted?: boolean;
  /** `createdAt,desc` (mặc định), `startAt,asc|desc` hoặc `status,asc`. */
  sort?: string;
  page?: number;
  size?: number;
}

export interface AdminBookingSummaryParams {
  from?: string;
  to?: string;
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
  workspace: { id: string; rawId: number; name: string };
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

// ─── Mail (email hệ thống) ────────────────────────────────────────────────────

/** `PARTIAL` là khung dùng chung, mọi đường gửi từ chối gửi trực tiếp nó. */
export type MailCategory = 'SYSTEM' | 'ANNOUNCEMENT' | 'PARTIAL';
/** Nhóm biến catalog; `COMMON` luôn có, `SUBSCRIPTION` thuộc phase 2 nên backend chưa trả về. */
export type MailContextGroup = 'COMMON' | 'ACCOUNT' | 'WORKSPACE';
export type MailCampaignStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'CANCELED';
export type MailMessageStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED';

/** GET /api/admin/mail/templates → PageResponse<AdminMailTemplateRow> (chỉ metadata, không nội dung). */
export interface AdminMailTemplateRow {
  code: string;
  name: string;
  description: string | null;
  category: MailCategory;
  requiredContext: MailContextGroup[];
  active: boolean;
  currentVersion: number;
  updatedAt: string;
}

/** GET /api/admin/mail/templates/{code}: metadata + nội dung của bản đang phát hành. */
export interface AdminMailTemplate extends AdminMailTemplateRow {
  subjectTemplate: string;
  htmlBody: string;
  /** Biến tự do khai tường minh cho version này; không suy ra từ nội dung. */
  customVariables: string[];
  createdAt: string;
}

/** GET /api/admin/mail/templates/{code}/versions — bản đã phát hành là bất biến. */
export interface AdminMailTemplateVersion {
  version: number;
  subjectTemplate: string;
  htmlBody: string;
  customVariables: string[];
  createdAt: string;
}

/** POST /templates (kèm `code`) và PUT /templates/{code} (bỏ `code`) dùng chung body này. */
export interface MailTemplateInput {
  /** `^[a-z0-9][a-z0-9-]{2,63}$`, chỉ gửi lúc tạo và không đổi được sau đó. */
  code?: string;
  name: string;
  description: string | null;
  category: MailCategory;
  requiredContext: MailContextGroup[];
  subjectTemplate: string;
  htmlBody: string;
  customVariables: string[];
}

export interface AdminMailVariable {
  name: string;
  description: string;
  sample: string;
}

/** GET /api/admin/mail/variables — catalog biến cho trình soạn thảo. */
export interface AdminMailVariableGroup {
  group: MailContextGroup;
  variables: AdminMailVariable[];
}

/** Ngữ cảnh thật cho preview / test-send; bỏ trống thì dùng giá trị mẫu của catalog. */
export interface MailContextInput {
  workspaceId?: string;
  accountId?: string;
  variables?: Record<string, string>;
}

/** POST /templates/{code}/preview — render bản đang phát hành, KHÔNG gửi gì. */
export interface MailPreviewResult {
  subject: string;
  html: string;
}

export interface MailTestSendInput extends MailContextInput {
  to: string;
}

export interface MailTestSendResult {
  /** Địa chỉ đã yêu cầu; ở dev SES có thể bị đổi hướng mà API không báo. */
  to: string;
  providerMessageId: string;
}

/** GET /api/admin/mail/campaigns → PageResponse<AdminMailCampaignRow> */
export interface AdminMailCampaignRow {
  campaignCode: string;
  templateCode: string;
  /** Version ghim lúc tạo; sửa template sau đó không đổi nội dung chiến dịch đang chạy. */
  templateVersion: number;
  name: string;
  status: MailCampaignStatus;
  total: number;
  createdAt: string;
}

/** GET /api/admin/mail/campaigns/{code}: thêm số dòng theo từng trạng thái. */
export interface AdminMailCampaignDetail extends AdminMailCampaignRow {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  canceled: number;
}

/**
 * POST /api/admin/mail/campaigns: đúng một trong nhắm-workspace (`workspaceIds` hoặc
 * `rawWorkspaceIds`) và `accountIds`, khác đi là 400.
 */
export interface CreateCampaignInput {
  templateCode: string;
  name: string;
  workspaceIds?: string[];
  /**
   * Id workspace dạng số thô, dán thẳng từ một truy vấn SQL. Khác rỗng thì backend dùng nó và
   * BỎ QUA `workspaceIds`, không gộp hai danh sách. Chỉ gửi một trong hai.
   */
  rawWorkspaceIds?: number[];
  accountIds?: string[];
  variables?: Record<string, string>;
  /** true = chỉ đếm người nhận, không chèn dòng nào. */
  dryRun: boolean;
}

export interface CreateCampaignResult {
  /** Vắng hẳn khỏi JSON khi `dryRun` (không phải null). */
  campaignCode?: string;
  templateCode: string;
  templateVersion: number;
  queued: number;
  skippedDuplicate: number;
  skippedNoEmail: number;
  dryRun: boolean;
}

export interface CampaignActionResult {
  campaignCode: string;
  affected: number;
  status: MailCampaignStatus;
}

/** GET /api/admin/mail/messages — outbox, chỉ đọc; message không lộ định danh nào. */
export interface AdminMailMessageRow {
  campaignCode: string | null;
  templateCode: string;
  templateVersion: number;
  toEmail: string;
  workspaceId: string | null;
  accountId: string | null;
  status: MailMessageStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface AdminMailTemplateListParams {
  category?: MailCategory;
  active?: boolean;
  page?: number;
  size?: number;
  /** `code` (mặc định), `name` hoặc `updatedAt,desc`. */
  sort?: string;
}

export interface AdminMailMessageListParams {
  campaignCode?: string;
  status?: MailMessageStatus;
  email?: string;
  page?: number;
  size?: number;
  sort?: string;
}

// ─── Tiện ích: giải mã id mờ ──────────────────────────────────────────────────

/**
 * POST /api/admin/ids/decode — thân request. 1..200 id, gửi **nguyên chuỗi** người vận hành dán
 * vào, kể cả chuỗi rác: backend báo lỗi tại đúng dòng đó chứ không hỏng cả lô.
 */
export interface DecodeIdsInput {
  ids: string[];
}

/**
 * Một dòng kết quả, đúng thứ tự của `ids` gửi lên. Có `{ type, rawId }` HOẶC `error`, không bao
 * giờ cả hai và không bao giờ thiếu cả hai.
 */
export interface AdminDecodedId {
  /** Chuỗi gửi lên, backend echo lại để khớp kết quả theo vị trí. */
  id: string;
  /** Tên hằng `PublicIdType` (`WORKSPACE`, `BOOKING`, `CLIENT`…), KHÔNG phải tên bảng. */
  type?: string;
  /** Khóa số trong DB nền tảng. Endpoint không đụng repository nên id của bản ghi đã xóa vẫn ra số. */
  rawId?: number;
  /** Chỉ có khi id không giải mã được; luôn cùng một câu, cố tình không nói sai ở đâu. */
  error?: string;
}
