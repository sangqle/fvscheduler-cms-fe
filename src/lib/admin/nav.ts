import { Building2, Package, Receipt, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Ba khu vực của CMS v1 (thiết kế CMS-01..07). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/workspaces', label: 'Workspace', icon: Building2 },
  { href: '/orders', label: 'Đơn hàng', icon: Receipt },
  { href: '/plans', label: 'Catalog gói', icon: Package },
];

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
