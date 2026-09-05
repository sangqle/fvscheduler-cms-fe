'use client';

import { signOut } from 'next-auth/react';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const ERP_URL = process.env.NEXT_PUBLIC_ERP_URL ?? 'https://studio.framevis.com';

export function ForbiddenScreen({ email }: { email: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <EmptyState
        icon={<ShieldOff />}
        title="Bạn không có quyền truy cập công cụ vận hành này"
        description={`Tài khoản ${email} đăng nhập hợp lệ nhưng không phải tài khoản platform-admin. Không có nội dung nào được tải phía sau.`}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void signOut({ callbackUrl: '/login' })}>Đăng nhập tài khoản khác</Button>
            <Button variant="outline" asChild>
              <a href={ERP_URL}>Về ERP</a>
            </Button>
          </div>
        }
      />
    </div>
  );
}
