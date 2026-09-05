import type { DefaultSession } from 'next-auth';

/** POST /auth/login & POST /auth/google/callback */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  workspaces: unknown[];
  needsOnboarding: boolean;
}

/** POST /auth/refresh */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** GET /auth/me: chỉ giữ các trường CMS cần. */
export interface MeResult {
  accountId: string;
  email: string;
  displayName: string;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      accessToken: string;
    } & DefaultSession['user'];
    /** Refresh token thất bại: client phải đăng nhập lại. */
    error?: 'RefreshTokenError';
  }

  interface User {
    id?: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    /** Epoch ms lúc access token backend hết hạn. */
    accessTokenExpires: number;
    error?: 'RefreshTokenError';
  }
}
