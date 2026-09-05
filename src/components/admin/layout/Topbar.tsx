'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { NAV_ITEMS, apiEnvironment, sectionLabel } from '@/lib/admin/nav';
import type { ShellUser } from '@/components/admin/layout/AdminShell';

function useClock(): string {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return '';
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const offset = -now.getTimezoneOffset() / 60;
  return `${hh}:${mm} · GMT${offset >= 0 ? '+' : ''}${offset}`;
}

/** Thanh trên: breadcrumb cấp 1, chip môi trường, đồng hồ; dưới `lg` thêm menu điều hướng. */
export function Topbar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const clock = useClock();
  const { env, host } = apiEnvironment();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Mở menu">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href}>
                <Icon className="size-4" />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: '/login' })}>
            <LogOut className="size-4" />
            Đăng xuất · {user.email}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-sm font-semibold text-foreground">{sectionLabel(pathname)}</span>

      <div className="ml-auto flex items-center gap-3">
        <Badge variant={env === 'PROD' ? 'destructive' : 'muted'} mono size="sm" className="hidden sm:inline-flex">
          {env} · {host}
        </Badge>
        <span className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
          {clock}
        </span>
      </div>
    </header>
  );
}
