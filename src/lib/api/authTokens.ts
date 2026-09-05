export function formatBearerToken(token: string): string {
  if (token.startsWith('Bearer ')) return token;
  return `Bearer ${token}`;
}

/**
 * Reads the `exp` claim of a JWT without verifying it (returns epoch ms).
 * Returns `null` when the token cannot be decoded.
 */
export function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

