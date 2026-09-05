/**
 * Bridge from "the backend rejected our token" to "sign the user out".
 *
 * `apiFetch` lives below React and cannot call `signOut()` itself, so a 401 is published here and
 * `UnauthorizedGuard` (see `src/app/providers.tsx`) subscribes. This closes the gap that
 * `session.error === 'RefreshTokenError'` cannot cover: that flag is only set when a refresh is
 * *attempted and fails*, and NextAuth only attempts one once the access token's own `exp` claim has
 * passed. When the backend rotates its JWT signing secret, the token still looks valid locally —
 * every request 401s while the session happily reports itself healthy, and (since react-query does
 * not retry 401) the whole app parks on error screens forever.
 *
 * Client-only: `notifyUnauthorized` is a no-op on the server, where there is no session to end and
 * server components already redirect at render time.
 */

export interface UnauthorizedEvent {
  /** Path of the request that 401'd — for the console breadcrumb only. */
  path: string;
  /**
   * The `Authorization` header the failing request actually sent, if any. The guard compares this
   * against the current session's bearer token so that a 401 from something *else* — a login
   * attempt with a bad password, a client-review share link, an unauthenticated public endpoint —
   * can never sign a legitimately logged-in user out.
   */
  authorization?: string;
}

type UnauthorizedHandler = (event: UnauthorizedEvent) => void;

let handler: UnauthorizedHandler | null = null;

/**
 * Registers the single 401 handler. Returns an unsubscribe function that only clears the handler
 * if it is still the one that was registered (so a remount's cleanup can't unregister its
 * successor).
 */
export function setUnauthorizedHandler(next: UnauthorizedHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** Publishes a 401. Never throws — the caller is already on its way to throwing an `ApiError`. */
export function notifyUnauthorized(event: UnauthorizedEvent): void {
  if (typeof window === 'undefined' || !handler) return;
  try {
    handler(event);
  } catch (e) {
    console.error('[auth] unauthorized handler threw:', e);
  }
}
