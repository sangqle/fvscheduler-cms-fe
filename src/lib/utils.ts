import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Tiền Việt: `179000 → "179.000 ₫"`. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** `dd/MM/yyyy` theo giờ máy người xem. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

/** `dd/MM/yyyy HH:mm` theo giờ máy người xem. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Tối đa hai chữ cái đầu của tên; chịu được `null`/rỗng. */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

/**
 * Giá trị mới của một ô tự chuẩn hóa lúc gõ (viết hoa, bỏ ký tự lạ), cắt độ dài SAU khi chuẩn hóa.
 * Các ô này không dùng `maxLength` gốc: trình duyệt cắt chuỗi dán vào trước khi chuẩn hóa, nên dán
 * " 15" chỉ còn " 1". React ghi giá trị đã chuẩn hóa vào DOM làm con trỏ nhảy về cuối, nên con trỏ
 * được đặt lại (tính trên phần trước nó, đã chuẩn hóa) sau khi DOM cập nhật.
 */
export function normalizeInputValue(
  input: HTMLInputElement,
  normalize: (raw: string) => string,
  maxLength: number,
): string {
  const raw = input.value;
  const caret = Math.min(normalize(raw.slice(0, input.selectionStart ?? raw.length)).length, maxLength);
  requestAnimationFrame(() => {
    if (document.activeElement === input) input.setSelectionRange(caret, caret);
  });
  return normalize(raw).slice(0, maxLength);
}

/** Rút gọn id mờ dài: `wkNN0TC1ZMG8NMMP → wkNN0T…NMMP`. */
export function shortId(id: string | null | undefined): string {
  if (!id) return '';
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
