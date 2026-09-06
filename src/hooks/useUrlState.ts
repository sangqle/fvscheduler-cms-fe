'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Bộ lọc/phân trang sống trên URL (`?q=&status=&page=`) để reload/back giữ nguyên và link chia sẻ
 * được. `set` gộp nhiều key, giá trị rỗng/undefined thì xoá key; đổi filter luôn về trang 0
 * trừ khi chính `page` được set.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((key: string) => searchParams.get(key) ?? undefined, [searchParams]);

  const set = React.useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clear = React.useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  return { get, set, clear, searchParams };
}

export function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Key ghim query của danh sách vào link chi tiết, để nút quay lại không rơi về trang đầu. */
const RETURN_KEY = 'from';

/**
 * Link vào trang chi tiết, mang theo nguyên query của danh sách (`/workspaces/wk…?from=page%3D10`).
 * Gói trong một key duy nhất nên không đụng vào các param của chính trang chi tiết (`tab`, `page`).
 */
export function detailHref(href: string, listQuery: URLSearchParams | string): string {
  const qs = typeof listQuery === 'string' ? listQuery : listQuery.toString();
  return qs ? `${href}?${RETURN_KEY}=${encodeURIComponent(qs)}` : href;
}

/**
 * Href quay lại danh sách: gộp query mặc định của `fallback` với query đã ghim ở `?from=`
 * (bản ghim thắng). Vào thẳng bằng link ngoài, không có `from` thì về đúng `fallback`.
 */
export function useReturnHref(fallback: string): string {
  const searchParams = useSearchParams();
  const from = searchParams.get(RETURN_KEY);
  return React.useMemo(() => {
    if (!from) return fallback;
    const cut = fallback.indexOf('?');
    const path = cut === -1 ? fallback : fallback.slice(0, cut);
    const merged = new URLSearchParams(cut === -1 ? '' : fallback.slice(cut + 1));
    for (const [k, v] of new URLSearchParams(from)) merged.set(k, v);
    const qs = merged.toString();
    return qs ? `${path}?${qs}` : path;
  }, [fallback, from]);
}
