import NextAuth from 'next-auth';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import { exchangeGoogleCode, getMe, loginWithPassword, logoutBackend, refreshTokens } from '@/lib/api/auth';
import { decodeJwtExpiry } from '@/lib/api/authTokens';
import { ApiError } from '@/types/api';
import type { LoginResult } from '@/types/auth';

/**
 * Cùng pattern `framevis-erp/src/lib/auth.ts`: NextAuth JWT bọc cặp token của backend, tự refresh
 * trước hạn. Bỏ phần switch-workspace / permission snapshot: cổng admin nhận token trơn, không cần
 * claim workspace (ADM-FLOW-01).
 */

const DEFAULT_ACCESS_TOKEN_TTL = 10 * 60_000;
const EXPIRY_BUFFER = 60_000;

function logAuthFailure(provider: string, e: unknown): void {
  if (e instanceof ApiError) {
    console.error(`[auth][${provider}] backend rejected (HTTP ${e.status}):`, e.payload);
  } else {
    console.error(`[auth][${provider}] failed:`, e);
  }
}

async function toAuthUser(login: LoginResult): Promise<User> {
  const me = await getMe(login.accessToken);
  return {
    id: me.accountId,
    email: me.email,
    name: me.displayName,
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
  };
}

async function refreshBackendTokens(token: JWT): Promise<JWT> {
  try {
    const pair = await refreshTokens(token.refreshToken);
    return {
      ...token,
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      accessTokenExpires: decodeJwtExpiry(pair.accessToken) ?? Date.now() + DEFAULT_ACCESS_TOKEN_TTL,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshTokenError' as const };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          return await toAuthUser(await loginWithPassword(String(credentials.email), String(credentials.password)));
        } catch (e) {
          logAuthFailure('credentials', e);
          return null;
        }
      },
    }),
    /** Google OAuth do backend đổi code: trang callback đưa `code` vào provider này. */
    Credentials({
      id: 'google-backend',
      name: 'Google',
      credentials: { code: { type: 'text' }, redirectUri: { type: 'text' } },
      async authorize(credentials) {
        if (!credentials?.code || !credentials?.redirectUri) return null;
        try {
          return await toAuthUser(
            await exchangeGoogleCode(String(credentials.code), String(credentials.redirectUri)),
          );
        } catch (e) {
          logAuthFailure('google-backend', e);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = decodeJwtExpiry(user.accessToken) ?? Date.now() + DEFAULT_ACCESS_TOKEN_TTL;
        return token;
      }
      if (Date.now() < token.accessTokenExpires - EXPIRY_BUFFER) return token;
      return refreshBackendTokens(token);
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? '';
      session.user.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const tokenObj = 'token' in message ? message.token : null;
      await logoutBackend(tokenObj?.accessToken as string | undefined);
    },
  },
});
