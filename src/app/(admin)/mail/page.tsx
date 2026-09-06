import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MailScreen } from '@/components/admin/mail/MailScreen';
import Loading from '../loading';

export const metadata: Metadata = { title: 'Email hệ thống' };

/** CMS-10: template, chiến dịch và nhật ký gửi của `/api/admin/mail/**` gom vào ba tab. */
export default function MailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MailScreen />
    </Suspense>
  );
}
