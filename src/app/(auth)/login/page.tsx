import { LoginScreen } from '@/components/auth/LoginScreen';

const LOGIN_NOTICES: Record<string, string> = {
  'session-expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginScreen notice={reason ? LOGIN_NOTICES[reason] : undefined} />;
}
