import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TemplateEditorScreen } from '@/components/admin/mail/TemplateEditorScreen';
import Loading from './loading';

export const metadata: Metadata = { title: 'Soạn template' };

export default async function TemplateEditorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <TemplateEditorScreen code={code} />
    </Suspense>
  );
}
