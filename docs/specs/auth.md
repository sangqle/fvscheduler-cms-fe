# Auth + gate allowlist

Updated: 2026-09-05 · Thiết kế: CMS-09 (403) · Backend: `ADM-FLOW-01-sign-in-and-gate`

## Mục đích

Đăng nhập bằng đúng auth ERP; chỉ tài khoản trong allowlist `PLATFORM_ADMIN_ACCOUNT_IDS` của
backend mới thấy shell. FE không có role, không có permission key.

## Màn hình

### `/login`
- `components/auth/LoginScreen.tsx`: email + mật khẩu (RHF + Zod) → `signIn('credentials')`;
  nút Google → `GoogleAuthButton` → redirect Google → `/api/auth/callback/google` (bridge) →
  `/auth/callback/google` (`GoogleCallback.tsx`) → `signIn('google-backend', { code, redirectUri })`.
- `?reason=session-expired` hiện banner cảnh báo.
- Đã có session hợp lệ → `(auth)/layout.tsx` redirect `/workspaces`.

### `/forbidden`
- `components/admin/shared/ForbiddenScreen.tsx`: "Bạn không có quyền truy cập công cụ vận hành này"
  + email đang đăng nhập; nút "Đăng nhập tài khoản khác" (signOut) và "Về ERP" (`NEXT_PUBLIC_ERP_URL`).

### Gate `(admin)/layout.tsx`
- `auth()` → không session / `error` → `/login?reason=session-expired`.
- `probeAdminGate(token)` (`lib/admin/gate.server.ts`, `GET /api/admin/plans`, React `cache`):
  `forbidden` → `/forbidden`; `unauthorized` → login; `error` → vẫn render shell + banner
  "Không kết nối được máy chủ API".

## Hooks ↔ API

| Nơi gọi | Method · path | Ghi chú |
|---|---|---|
| `lib/auth.ts` authorize | `POST /auth/login` · `POST /auth/google/callback` → `GET /auth/me` | seed NextAuth user (id, email, name, token pair) |
| `lib/auth.ts` jwt callback | `POST /auth/refresh` | trước hạn 60s; thất bại → `session.error = RefreshTokenError` |
| `lib/auth.ts` events.signOut | `POST /auth/logout` | best-effort |
| `providers.tsx` guards | | `SessionExpiryGuard` (RefreshTokenError → signOut), `UnauthorizedGuard` (401 với token phiên → re-check rồi signOut), `RateLimitGuard` (toast 429 gộp 3s) |

## Rule FE phải giữ

- Token trơn (không claim workspace) là đủ; **không** gọi switch-workspace, không đọc permission.
- Mọi hook admin lấy header qua `useAuthHeaders()`; query chỉ `enabled` khi có token.
- 401 từ login sai mật khẩu không được đăng xuất phiên hiện tại (guard so sánh đúng bearer).
- Không lưu secret ở `.env.production`; `NEXTAUTH_SECRET` đặt ở Vercel.

## Types

`src/types/auth.ts`: `LoginResult`, `TokenPair`, `MeResult`, module augmentation `Session`/`JWT`.
