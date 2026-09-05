import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { probeAdminGate } from '@/lib/admin/gate.server';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Cổng admin: cần session hợp lệ + qua allowlist (ADM-FLOW-01). Probe chạy server-side một lần
 * mỗi request nên người ngoài allowlist không bao giờ thấy shell.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.error) redirect('/login?reason=session-expired');

  const gate = await probeAdminGate(session.user.accessToken);
  if (gate === 'forbidden') redirect('/forbidden');
  if (gate === 'unauthorized') redirect('/login?reason=session-expired');

  return (
    <AdminShell
      user={{ name: session.user.name ?? '', email: session.user.email ?? '' }}
      backendUnavailable={gate === 'error'}
    >
      {children}
    </AdminShell>
  );
}
