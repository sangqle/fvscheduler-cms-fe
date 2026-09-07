/**
 * DTO **của tenant**, không phải của `/api/admin/**`.
 *
 * `GET /api/admin/workspaces/{id}/bookings` trả về nguyên văn `BookingResponse` mà ERP của studio
 * tự đọc, dựng bằng đúng cái mapper `GET /api/bookings/{id}` dùng. CMS soi lại chính thứ chủ
 * workspace nhìn thấy, nên nó phải mang đúng shape đó chứ không phải một bản chép tay song song sẽ
 * trôi khỏi ERP lúc nào không hay. Nửa còn lại của một dòng (`admin`) nằm ở `types/admin.ts`.
 *
 * Hệ quả cần nói thẳng: kênh này để lộ tên, số điện thoại, email khách và toàn bộ số tiền của mọi
 * tenant, chỉ chắn bằng allowlist một tài khoản (ruling của owner ngày 2026-09-07).
 */

export type BookingStatus =
  | 'pending_confirm'
  | 'confirmed'
  | 'shooting'
  | 'client_selection'
  | 'selection_completed'
  | 'retouching'
  | 'retouched'
  | 'printing'
  | 'printed'
  | 'done'
  | 'cancelled';

export type BookingPaymentStatus = 'unpaid' | 'partial' | 'paid';

export type BookingItemType = 'PACKAGE' | 'CUSTOM' | 'SURCHARGE' | 'CONCEPT';

export type BookingPaymentKind = 'deposit' | 'balance' | 'refund' | 'forfeit';

export type BookingNoteAudience = 'customer_support' | 'photographer' | 'all';

export type ClientAlbumRole = 'proofing' | 'raw' | 'deliverable' | 'other';

/** Địa điểm chụp: nhãn người đọc được + link bản đồ, hai trường độc lập và đều có thể vắng. */
export interface ShootingLocation {
  label: string | null;
  mapUrl: string | null;
}

/** Một membership (thành viên trong workspace), dùng cho người tạo, tác giả ghi chú và crew. */
export interface BookingMemberSummary {
  id: string;
  accountId: string | null;
  displayName: string | null;
  status: string | null;
}

export interface BookingClientSummary {
  id: string;
  workspaceId: string;
  branchId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface BookingItemSummary {
  id: string;
  packageId: string | null;
  nameSnapshot: string | null;
  /** Giá chốt của dòng. Tổng các dòng này là thứ `admin.totals.contractTotal` khai là mình bằng. */
  unitPriceSnapshot: number | null;
  /** Giá niêm yết trước giảm; `null` với dòng cũ chưa có cột này. */
  listPrice: number | null;
  itemType: BookingItemType;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPaymentSummary {
  id: string;
  amount: number;
  kind: BookingPaymentKind;
  fileKey: string | null;
  fileUrl: string | null;
  extInfo: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingNote {
  id: string;
  bookingId: string;
  content: string;
  audience: BookingNoteAudience;
  /** `null` khi không tra được tác giả. */
  createdBy: BookingMemberSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** Một chỗ crew của buổi chụp. `member === null` nghĩa là chỗ còn trống, chưa ai nhận. */
export interface BookingSlot {
  id: string;
  bookingId: string;
  bookingSessionId: string | null;
  role: { id: string; name: string | null; code: string | null } | null;
  membershipId: string | null;
  member: BookingMemberSummary | null;
  status: string | null;
  commissionAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Một buổi chụp. **Nguồn thật của lịch**: `startAt`/`endAt`/`roomId`/`shiftId` ở cấp booking chỉ
 * chép lại buổi sớm nhất, giữ cho client cũ chạy đúng.
 */
export interface BookingSession {
  id: string;
  seq: number | null;
  name: string | null;
  startAt: string;
  endAt: string;
  roomId: string | null;
  shiftId: string | null;
  /** `null` → dùng địa điểm của cả booking. */
  shootingLocation: ShootingLocation | null;
  note: string | null;
  slots: BookingSlot[];
}

/** API chỉ trả id album và vai trò, không có tên album. */
export interface BookingClientAlbumLink {
  albumId: string;
  role: ClientAlbumRole;
  createdAt: string;
}

/**
 * Người thuê ngoài. Khác hẳn `slots[]`: những người này không có tài khoản trong hệ thống và không
 * bao giờ xuất hiện trên bảng phân công.
 */
export interface BookingFreelancer {
  /** Id của **dòng chi**, không phải id freelancer: mọi mutation đều địa chỉ hóa dòng chi. */
  costId: string;
  freelancerId: string;
  name: string | null;
  phone: string | null;
  /** Chữ tự do gõ trên form booking; rỗng thì rơi về `name`. */
  role: string | null;
  /** Vắng mặt khi người gọi không được xem tiền; với admin CMS thì luôn có. */
  amount?: number | null;
  /** `null` = chưa trả. */
  paidAt: string | null;
}

/** Nguyên văn `BookingResponse` của tenant. */
export interface BookingResponse {
  id: string;
  branchId: string | null;
  status: BookingStatus;
  /** Tiêu đề tự do của booking; khác `client.name` và thường vắng. */
  name: string | null;
  /** Bản sao của buổi sớm nhất, không phải nguồn: nguồn là `sessions[]`. */
  startAt: string;
  endAt: string;
  roomId: string | null;
  shiftId: string | null;
  createdByMembership: BookingMemberSummary | null;
  createdAt: string;
  updatedAt: string;
  extInfo: Record<string, unknown> | null;
  client: BookingClientSummary | null;
  items: BookingItemSummary[];
  payments: BookingPaymentSummary[];
  /** Mới nhất trước. */
  notes: BookingNote[];
  slots: BookingSlot[];
  clientAlbums: BookingClientAlbumLink[];
  freelancers: BookingFreelancer[];
  shootingLocation: ShootingLocation | null;
  /** Vắng mặt khi `costVisible` false; với admin CMS backend ép `costVisible = true`. */
  costTotal?: number | null;
  /** `contractTotal - costTotal`, tính lúc đọc. Vắng mặt cùng lúc với `costTotal`. */
  grossProfit?: number | null;
  costVisible: boolean;
  /** Luôn có ít nhất một phần tử. */
  sessions: BookingSession[];
}
