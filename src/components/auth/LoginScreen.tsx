'use client';

import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';


/**
 * Đăng nhập bằng đúng auth ERP (`POST /auth/login`). Allowlist được kiểm ở `(admin)/layout.tsx`
 * sau khi có session: tài khoản hợp lệ nhưng không phải admin sẽ rơi vào `/forbidden`.
 */
export function LoginScreen({ notice }: { notice?: string }) {
  return (
    <AuthCard title="" description="">
      {notice && (
        <Alert variant="warning">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        hoặc
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleAuthButton label="Tiếp tục với Google" />
    </AuthCard>
  );
}
