import { Spinner } from '@/components/ui/Spinner';

/**
 * Chỉ đỡ khoảng chờ của `(admin)/layout.tsx`: đọc session rồi probe allowlist chạy trước khi shell
 * kịp dựng, mà `loading.tsx` của một segment không bao bọc layout của chính segment đó. Lúc này
 * chưa biết người dùng vào màn nào nên không vẽ khung xương màn, chỉ một chỉ báo giữa trang.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
