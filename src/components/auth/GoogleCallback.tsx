'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AuthCard } from '@/components/auth/AuthCard';
import { GOOGLE_CALLBACK_PATH, GOOGLE_OAUTH_STATE_KEY } from '@/lib/api/auth';

export function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      if (searchParams.get('error')) return setError('Google đã từ chối yêu cầu đăng nhập. Vui lòng thử lại.');
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      if (!code || !state) return setError('Thiếu thông tin xác thực từ Google. Vui lòng thử lại.');
      const saved = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
      if (!saved || saved !== state) return setError('Phiên đăng nhập không hợp lệ (state không khớp). Vui lòng thử lại.');
      const result = await signIn('google-backend', {
        code,
        redirectUri: `${window.location.origin}${GOOGLE_CALLBACK_PATH}`,
        redirect: false,
      });
      if (result?.error) return setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      router.replace('/workspaces');
      router.refresh();
    })();
  }, [router, searchParams]);

  return (
    <AuthCard title={error ? 'Đăng nhập chưa hoàn tất' : 'Đang xác thực với Google'}>
      {error ? (
        <>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Quay lại đăng nhập</Link>
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Vui lòng đợi trong giây lát…
        </div>
      )}
    </AuthCard>
  );
}
