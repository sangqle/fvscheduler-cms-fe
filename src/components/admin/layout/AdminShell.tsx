'use client';

import { usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Sidebar } from '@/components/admin/layout/Sidebar';
import { Topbar } from '@/components/admin/layout/Topbar';
import { isFullWidthRoute } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';

export interface ShellUser {
  name: string;
  email: string;
}

/** App-shell: document không cuộn, `main` là vùng cuộn duy nhất (giống ERP). */
export function AdminShell({
  user,
  backendUnavailable,
  children,
}: {
  user: ShellUser;
  backendUnavailable?: boolean;
  children: React.ReactNode;
}) {
  const fullWidth = isFullWidthRoute(usePathname());

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar user={user} className="hidden lg:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        {/*
          Đệm nằm ở khối trong chứ KHÔNG ở `main`. Hộp mà `position: sticky` bám vào là **content
          box** của vùng cuộn, không phải padding box: để `p-4 sm:p-6` trên `main` thì mọi thanh
          `sticky top-0` dừng lại thấp hơn mép trên nhìn thấy được đúng bằng đệm đó, chừa một dải
          trong suốt cho nội dung cuộn lọt qua bên trên thanh. Chuyển đệm vào trong thì content box
          của `main` trùng padding box và `top-0` bám đúng mép.
        */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {backendUnavailable && (
              <Alert variant="warning" className="mb-4">
                <WifiOff className="size-4" aria-hidden="true" />
                <AlertDescription>Không kết nối được máy chủ API. Dữ liệu bên dưới có thể không tải được.</AlertDescription>
              </Alert>
            )}
            <div className={cn('mx-auto w-full', fullWidth ? 'max-w-none' : 'max-w-350')}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
