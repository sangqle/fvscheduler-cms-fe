import { Suspense } from 'react';
import { GoogleCallback } from '@/components/auth/GoogleCallback';
import { Spinner } from '@/components/ui/Spinner';

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <GoogleCallback />
    </Suspense>
  );
}
