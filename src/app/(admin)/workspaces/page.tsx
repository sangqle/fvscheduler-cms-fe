import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkspaceListScreen } from '@/components/admin/workspaces/WorkspaceListScreen';
import Loading from '../loading';

export const metadata: Metadata = { title: 'Workspace' };

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkspaceListScreen />
    </Suspense>
  );
}
