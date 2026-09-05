import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';

/** Tiêu đề màn: h2 + mô tả + slot hành động bên phải. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Heading level="2">{title}</Heading>
        {description && (
          <Text variant="body-sm" muted className="mt-1">
            {description}
          </Text>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
