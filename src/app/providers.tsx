'use client';

import * as React from 'react';
import { SessionProvider, getSession, signOut, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { ToastProvider, useToast } from '@/components/ui/ToastProvider';
import { formatBearerToken } from '@/lib/api/authTokens';
import { setUnauthorizedHandler } from '@/lib/api/unauthorized';
import { RATE_LIMIT_DEDUPE_MS, RATE_LIMIT_TITLE, rateLimitRetryMessage, setRateLimitedHandler } from '@/lib/api/rateLimited';

const SESSION_EXPIRED_URL = '/login?reason=session-expired';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status === 401 || status === 403 || status === 404 || status === 429) return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

/** Refresh token thất bại → đăng xuất về /login kèm lý do. */
function SessionExpiryGuard() {
  const { data: session } = useSession();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (session?.error === 'RefreshTokenError' && !done.current) {
      done.current = true;
      void signOut({ callbackUrl: SESSION_EXPIRED_URL });
    }
  }, [session?.error]);
  return null;
}

/** 401 với đúng token của phiên này: thử lấy lại session một lần, vẫn hỏng thì đăng xuất. */
function UnauthorizedGuard() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const tokenRef = React.useRef<string | undefined>(undefined);
  const handling = React.useRef(false);

  React.useEffect(() => {
    tokenRef.current = session?.user.accessToken;
  }, [session?.user.accessToken]);

  React.useEffect(
    () =>
      setUnauthorizedHandler(({ authorization }) => {
        const token = tokenRef.current;
        if (!token || authorization !== formatBearerToken(token)) return;
        if (handling.current) return;
        handling.current = true;
        void (async () => {
          try {
            const fresh = await getSession();
            const next = fresh?.user.accessToken;
            if (fresh && !fresh.error && next && next !== token) {
              tokenRef.current = next;
              handling.current = false;
              void qc.invalidateQueries();
              return;
            }
          } catch (e) {
            console.error('[auth] session re-check failed:', e);
          }
          void signOut({ callbackUrl: SESSION_EXPIRED_URL });
        })();
      }),
    [qc],
  );
  return null;
}

/** Một toast cho cả chùm 429 (60 request/phút mỗi route). */
function RateLimitGuard() {
  const { showToast } = useToast();
  const lastShown = React.useRef(0);
  React.useEffect(
    () =>
      setRateLimitedHandler(({ retryAfterSeconds }) => {
        const now = Date.now();
        if (now - lastShown.current < RATE_LIMIT_DEDUPE_MS) return;
        lastShown.current = now;
        showToast({ title: RATE_LIMIT_TITLE, description: rateLimitRetryMessage(retryAfterSeconds), variant: 'warning' });
      }),
    [showToast],
  );
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider refetchInterval={60}>
          <SessionExpiryGuard />
          <UnauthorizedGuard />
          <ToastProvider>
            <RateLimitGuard />
            {children}
          </ToastProvider>
        </SessionProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
