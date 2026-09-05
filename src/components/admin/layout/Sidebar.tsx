'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NAV_ITEMS } from '@/lib/admin/nav';
import { cn, getInitials } from '@/lib/utils';
import type { ShellUser } from '@/components/admin/layout/AdminShell';

/**
 * Sidebar tối để phân biệt CMS nội bộ với ERP (sidebar trắng). Màu đi bằng token đảo:
 * nền `foreground`, chữ `background` với opacity.
 */
export function Sidebar({ user, className }: { user: ShellUser; className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn('w-58 shrink-0 flex-col bg-foreground text-background', className)}>
      <div className="flex items-baseline gap-1.5 px-5 pt-5 pb-3">
        <span className="font-family-logo text-xl font-semibold leading-none">framevis</span>
        <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-background/60">admin</span>
      </div>

      <p className="px-5 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-background/45">Vận hành</p>
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                active ? 'bg-background/10 font-semibold text-background' : 'font-medium text-background/65 hover:bg-background/5 hover:text-background',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active ? 'text-primary-300' : 'text-background/50')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-4 rounded-lg bg-background/5 p-3 text-[11.5px] leading-relaxed text-background/70">
        <p className="mb-0.5 font-semibold text-background/85">Phạm vi v1</p>
        Chỉ đọc xuyên tenant. Ghi: cấp / gia hạn / hủy gói, mark-paid.
      </div>

      <div className="mt-auto flex items-center gap-2.5 border-t border-background/10 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {getInitials(user.name) || 'AD'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.name || 'Platform admin'}</p>
          <p className="truncate text-[11px] text-background/55">{user.email} · allowlist</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-background/55 hover:bg-background/10 hover:text-background"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={() => void signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
