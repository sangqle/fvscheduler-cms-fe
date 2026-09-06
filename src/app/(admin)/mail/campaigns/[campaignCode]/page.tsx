import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CampaignDetailScreen } from '@/components/admin/mail/CampaignDetailScreen';
import Loading from '../../../loading';

export const metadata: Metadata = { title: 'Chi tiết chiến dịch' };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignCode: string }>;
}) {
  const { campaignCode } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <CampaignDetailScreen campaignCode={campaignCode} />
    </Suspense>
  );
}
