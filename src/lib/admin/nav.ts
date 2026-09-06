import { Building2, Mail, Package, Receipt, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Các khu vực của CMS v1 (thiết kế CMS-01..07) cộng email hệ thống. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/workspaces', label: 'Workspace', icon: Building2 },
  { href: '/orders', label: 'Đơn hàng', icon: Receipt },
  { href: '/plans', label: 'Catalog gói', icon: Package },
  { href: '/mail', label: 'Email hệ thống', icon: Mail },
];

/**
 * Route cần trọn bề ngang: trình soạn template đặt trình soạn mã và khung xem trước cạnh nhau, bó
 * vào 1400px là ép mỗi cột xuống dưới 700px, hẹp hơn cả khung thư 600px mà preview phải dựng.
 */
export function isFullWidthRoute(pathname: string): boolean {
  return pathname.startsWith('/mail/templates/');
}

/** Nhãn breadcrumb cấp 1 theo pathname. */
export function sectionLabel(pathname: string): string {
  return NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? 'Admin';
}

/** Host API để hiện chip môi trường trên topbar. */
export function apiEnvironment(): { env: 'PROD' | 'DEV'; host: string } {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
  let host = raw;
  try {
    host = new URL(raw).host;
  } catch {
    // giữ nguyên chuỗi
  }
  return { env: host.endsWith('framevis.com') ? 'PROD' : 'DEV', host };
}
