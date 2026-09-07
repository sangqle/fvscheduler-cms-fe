import type { AdminBookingRow } from '@/types/admin';
import type { BookingResponse } from '@/types/booking';

/**
 * Nhãn của một booking trong bảng.
 *
 * `booking.name` là tiêu đề tự do và **thường vắng**, nên rơi về tên khách chứ không để trống một
 * cột nhận diện. Cờ `fromClient` để bề mặt nói rõ nó đang mượn tên khách, tránh người đọc tưởng
 * studio đặt tên booking bằng tên người.
 */
export function bookingLabel(row: AdminBookingRow): { text: string; fromClient: boolean } {
  const name = row.booking?.name?.trim();
  if (name) return { text: name, fromClient: false };
  const client = row.booking?.client?.name?.trim();
  if (client) return { text: client, fromClient: true };
  return { text: `#${row.admin.rawId}`, fromClient: false };
}

/**
 * Chỗ crew của cả booking: `slots[]` ở cấp trên đã gom mọi buổi, đếm lại từ `sessions[].slots` là
 * đếm hai lần. Một chỗ được tính là đã xếp khi nó gọi tên một người thật.
 */
export function bookingStaffing(booking: BookingResponse): { assigned: number; total: number } {
  const total = booking.slots.length;
  const assigned = booking.slots.filter((s) => !!s.member).length;
  return { assigned, total };
}

/** Cộng dồn một danh sách, bỏ qua phần tử chưa có số (giá dòng cũ, phí chưa chốt). */
export function sumOf<T>(rows: T[], pick: (row: T) => number | null | undefined): number {
  return rows.reduce<number>((sum, row) => sum + (pick(row) ?? 0), 0);
}
