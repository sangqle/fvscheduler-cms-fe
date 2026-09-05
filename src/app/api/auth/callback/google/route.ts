import { NextRequest, NextResponse } from 'next/server';

/**
 * Cầu nối: Google redirect về đây (URI đã đăng ký), chuyển tiếp query (code, state, error) sang
 * trang client `/auth/callback/google`. Route cụ thể luôn thắng catch-all `[...nextauth]`.
 */
export function GET(request: NextRequest) {
  const destination = new URL('/auth/callback/google', request.url);
  request.nextUrl.searchParams.forEach((value, key) => destination.searchParams.set(key, value));
  return NextResponse.redirect(destination);
}
