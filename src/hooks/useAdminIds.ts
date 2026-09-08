'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/http';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { AdminDecodedId, DecodeIdsInput } from '@/types/admin';

export const idKeys = {
  decode: ['admin', 'ids', 'decode'] as const,
};

/**
 * POST /api/admin/ids/decode: id mờ → khóa số trong DB nền tảng.
 *
 * Là một phép đọc nhưng đi `POST` và là `useMutation` chứ không phải `useQuery`, vì hai lý do đều
 * đến từ backend: id nằm trong body để không lọt vào access log, proxy trace hay lịch sử trình
 * duyệt (query key hay URL đều là chỗ nó bị ghi lại), và endpoint không chạm repository nào nên
 * không có cache của ai để hỏng, cũng không có gì để invalidate sau đó.
 *
 * Id sai KHÔNG phải lỗi HTTP: request vẫn `200`, dòng đó mang `error` thay cho `type`/`rawId`.
 * Chỉ `ids` rỗng hoặc quá 200 phần tử mới ra `400`.
 */
export function useDecodeIds() {
  const { headers } = useAuthHeaders();
  return useMutation({
    mutationKey: idKeys.decode,
    mutationFn: (input: DecodeIdsInput) =>
      apiFetch<AdminDecodedId[]>('/api/admin/ids/decode', { method: 'POST', body: input, headers }),
  });
}
