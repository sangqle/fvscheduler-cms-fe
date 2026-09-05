import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkspaceDetailScreen } from '@/components/admin/workspaces/WorkspaceDetailScreen';
import Loading from '../../loading';

export const metadata: Metadata = { title: 'Chi tiết workspace' };

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <WorkspaceDetailScreen workspaceId={workspaceId} />
    </Suspense>
  );
}
