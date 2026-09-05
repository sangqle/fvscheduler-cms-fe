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
