'use client';

import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Sidebar } from '@/components/admin/layout/Sidebar';
import { Topbar } from '@/components/admin/layout/Topbar';

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
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar user={user} className="hidden lg:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {backendUnavailable && (
            <Alert variant="warning" className="mb-4">
              <WifiOff className="size-4" aria-hidden="true" />
              <AlertDescription>Không kết nối được máy chủ API. Dữ liệu bên dưới có thể không tải được.</AlertDescription>
            </Alert>
          )}
          <div className="mx-auto w-full max-w-350">{children}</div>
        </main>
      </div>
    </div>
  );
}
