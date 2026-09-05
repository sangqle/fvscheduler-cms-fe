import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ForbiddenScreen } from '@/components/admin/shared/ForbiddenScreen';

/** 403: đăng nhập hợp lệ nhưng không nằm trong allowlist platform-admin (CMS-09). */
export default async function ForbiddenPage() {
  const session = await auth();
  if (!session || session.error) redirect('/login');
  return <ForbiddenScreen email={session.user.email ?? ''} />;
}
