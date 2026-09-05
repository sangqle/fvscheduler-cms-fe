'use client';

import * as React from 'react';

/**
 * Auto load trang kế của một `useInfiniteQuery` khi sentinel cuối danh sách lọt
 * vào vùng nhìn (IntersectionObserver, đệm mặc định 200px). Trả về **callback
 * ref** để gắn lên sentinel — nhờ đó observer tự gắn lại khi sentinel
 * mount/unmount (vd. nằm trong Popover chỉ render lúc mở). Dùng cặp với
 * `<LoadMoreSentinel />` (`src/components/ui/`).
 *
 * `root`: container cuộn bao quanh sentinel (vd. list của dropdown). Bỏ trống
 * thì tính theo viewport — đúng cho danh sách cuộn theo trang.
 */
export function useAutoLoadMore(opts: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
  root?: React.RefObject<HTMLElement | null>;
}) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin = '200px', root } = opts;
  const [node, setNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: root?.current ?? null, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, root]);

  return setNode as (node: HTMLElement | null) => void;
}
