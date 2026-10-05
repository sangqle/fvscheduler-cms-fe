'use client';

import * as React from 'react';

export const SEARCH_DEBOUNCE_MS = 500;

/**
 * Ô tìm/lọc chữ: giữ giá trị gõ dở tại chỗ, chỉ `commit` (đẩy lên URL/state cha) sau `delayMs` ngừng gõ.
 *
 * Bẫy cũ: effect đồng bộ `committed → ô nhập` chạy cả khi URL đổi do chính lần commit trước
 * (URL dội về sau một nhịp render). Lúc đó người dùng đã gõ thêm, ô bị kéo lùi về giá trị
 * cũ, nuốt ký tự và bắn thêm request. `sent` nhớ giá trị vừa đẩy đi để bỏ qua tiếng vọng đó; chỉ thay
 * đổi từ ngoài (xóa bộ lọc, back/forward) mới ghi đè ô nhập.
 */
export function useDebouncedSearch(
  committed: string | undefined,
  commit: (value: string | undefined) => void,
  delayMs = SEARCH_DEBOUNCE_MS,
) {
  const [text, setText] = React.useState(committed ?? '');
  const sent = React.useRef(committed ?? '');

  // `commit` thường đổi identity mỗi lần URL đổi; giữ trong ref để không reset nhịp chờ.
  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });

  React.useEffect(() => {
    const next = committed ?? '';
    if (next === sent.current) return;
    sent.current = next;
    setText(next);
  }, [committed]);

  React.useEffect(() => {
    const value = text.trim();
    if (value === sent.current) return;
    const t = setTimeout(() => {
      // URL có thể đã tự về đúng giá trị này trong lúc chờ (vd. nút xóa bộ lọc vừa xóa cả ô lẫn URL).
      if (value === sent.current) return;
      sent.current = value;
      commitRef.current(value || undefined);
    }, delayMs);
    return () => clearTimeout(t);
  }, [text, delayMs]);

  return [text, setText] as const;
}
