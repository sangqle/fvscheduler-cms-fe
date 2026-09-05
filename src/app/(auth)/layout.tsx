import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session && !session.error) redirect('/workspaces');
  return <div className="flex min-h-dvh items-center justify-center bg-background p-4">{children}</div>;
}
