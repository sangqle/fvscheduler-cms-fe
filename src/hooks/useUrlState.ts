'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Bộ lọc/phân trang sống trên URL (`?q=&status=&page=`) để reload/back giữ nguyên và link chia sẻ
 * được. `set` gộp nhiều key, giá trị rỗng/undefined thì xoá key; đổi filter luôn về trang 0
 * trừ khi chính `page` được set.
 *
 * Ghi URL bằng `window.history.replaceState`, không qua `router.replace`: Next vẫn đồng bộ vào
 * `useSearchParams`, nhưng không gọi lại server (request `_rsc`) mỗi lần đổi filter. Mọi trang admin
 * đọc query ở client nên không cần server render lại.
 */
export function useUrlState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((key: string) => searchParams.get(key) ?? undefined, [searchParams]);

  const set = React.useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      // Đọc URL lúc gọi chứ không lấy `searchParams` của lần render: hai lần `set` liền nhau không đè nhau.
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      const qs = next.toString();
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const clear = React.useCallback(() => window.history.replaceState(null, '', pathname), [pathname]);

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
