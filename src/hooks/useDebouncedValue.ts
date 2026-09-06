'use client';

import * as React from 'react';

/**
 * Trả về `value` sau khi nó đứng yên `delayMs`. Dùng cho xem trước bản nháp: mỗi ký tự gõ vào ô HTML
 * đổi `srcDoc` là iframe **tải lại cả tài liệu**, gõ liên tục thì khung thư nhấp nháy và mất chỗ
 * đang cuộn. Chặn ở giá trị chứ không chặn ở lượt render: hàm render vẫn chạy mỗi ký tự (con trỏ,
 * số dòng, đếm ký tự phải nhạy), chỉ riêng thứ đắt tiền là bản dựng mới đợi.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    // Lần đầu `settled` đã bằng `value` nên không có nhịp chờ thừa lúc mở màn.
    if (settled === value) return;
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs, settled]);

  return settled;
}
