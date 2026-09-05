'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiErrorMessage } from '@/lib/api/auth';
import { ApiError } from '@/types/api';

/** 404 khi gõ thẳng URL với id sai: backend trả cùng một thông điệp, không tiết lộ id. */
export function NotFoundState({ title, description, backHref, backLabel }: { title: string; description: string; backHref: string; backLabel: string }) {
  return (
    <EmptyState
      icon={<SearchX />}
      title={title}
      description={description}
      action={
        <Button variant="outline" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
      }
    />
  );
}

/** Lỗi tải chung, giữ nguyên message backend nếu có. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : undefined;
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title={status === 0 ? 'Mất kết nối, không tải được dữ liệu' : 'Không tải được dữ liệu'}
      description={apiErrorMessage(error, status ? `Máy chủ trả về lỗi ${status}.` : 'Vui lòng thử lại.')}
      action={onRetry && <Button variant="outline" onClick={onRetry}>Thử lại</Button>}
    />
  );
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
