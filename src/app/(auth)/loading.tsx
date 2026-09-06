import { AuthCard } from '@/components/auth/AuthCard';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Khung xương màn auth: logo và khung thẻ hiện ngay, chỉ phần chờ đọc session mới là vệt xám.
 * Nút cao 44px đúng bằng `GoogleAuthButton` để lúc màn thật vào chỗ, thẻ không đổi chiều cao.
 */
export default function Loading() {
  return (
    <AuthCard title="">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-11 w-full" />
    </AuthCard>
  );
}
