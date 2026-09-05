'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { useFeatureKeys, useLimitKeys } from '@/hooks/useAdminCatalog';

/** Một dòng khóa: mã mono bên trái, chú thích bên phải. */
function KeyRow({ code, badge, right }: { code: string; badge?: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-foreground">{code}</span>
        {badge}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{right}</span>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

/**
 * Hai từ vựng đóng của catalog: feature key (gác route) và limit key (giới hạn số). Thêm khóa mới
 * phải sửa backend, nên màn này chỉ đọc, đứng đây để soạn gói không phải đoán tên khóa.
 */
export function VocabularyTab() {
  const featureKeys = useFeatureKeys();
  const limitKeys = useLimitKeys();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Feature key</CardTitle>
            <ReadOnlyHint>Tập đóng, thêm khóa phải sửa backend</ReadOnlyHint>
          </div>
          <CardDescription>
            Khóa gác route phía backend · số item là số item đang bật mang khóa đó, tính lúc đọc
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featureKeys.error ? (
            <ErrorState error={featureKeys.error} onRetry={() => void featureKeys.refetch()} />
          ) : featureKeys.isPending ? (
            <RowsSkeleton />
          ) : (
            <div className="flex flex-col">
              {featureKeys.data.map((k) => (
                <KeyRow
                  key={k.key}
                  code={k.key}
                  badge={
                    k.reserved ? (
                      <Badge variant="muted" size="sm">
                        reserved
                      </Badge>
                    ) : undefined
                  }
                  right={
                    <span className={k.activeCarriers <= 1 ? 'font-semibold text-warning-deep' : undefined}>
                      {k.activeCarriers} item
                    </span>
                  }
                />
              ))}
            </div>
          )}
          <Text variant="caption" muted className="mt-3">
            Khóa còn đúng 1 item mang: tắt hoặc xóa item đó sẽ bị backend từ chối.
          </Text>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Limit key</CardTitle>
            <ReadOnlyHint>Tập đóng, thêm khóa phải sửa backend</ReadOnlyHint>
          </div>
          <CardDescription>Giới hạn số của một gói · chọn được ở tab Thành phần của từng gói</CardDescription>
        </CardHeader>
        <CardContent>
          {limitKeys.error ? (
            <ErrorState error={limitKeys.error} onRetry={() => void limitKeys.refetch()} />
          ) : limitKeys.isPending ? (
            <RowsSkeleton />
          ) : (
            <div className="flex flex-col">
              {limitKeys.data.map((k) => (
                <KeyRow key={k.key} code={k.key} right={k.label} />
              ))}
            </div>
          )}
          <Text variant="caption" muted className="mt-3">
            Gói mang khóa với giá trị null = không giới hạn (∞) · không mang khóa = gói không có giới hạn đó.
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
