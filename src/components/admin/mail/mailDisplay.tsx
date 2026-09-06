import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { MAIL_CATEGORY } from '@/lib/admin/labels';
import type { AdminMailTemplateRow, MailCategory, MailContextGroup } from '@/types/admin';

/**
 * Chip hiển thị dùng chung của module mail. Nhãn enum backend (`SYSTEM`, `PARTIAL`, `COMMON`) giữ
 * nguyên chữ hoa mono theo luật; chữ tiếng Việt chỉ dùng cho phần diễn giải quanh nó.
 */

/** Nhóm ngữ cảnh một template cần. `COMMON` luôn có nên đeo ổ khoá thay vì trông như bỏ được. */
export function ContextChips({ groups }: { groups: MailContextGroup[] }) {
  const rest = groups.filter((g) => g !== 'COMMON');
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="muted" size="sm" mono>
        <Lock className="mr-1 size-2.5" />
        COMMON
      </Badge>
      {rest.map((g) => (
        <Badge key={g} variant="info" size="sm" mono>
          {g}
        </Badge>
      ))}
    </div>
  );
}

/** Biến tự do của version hiện hành; chiến dịch phải cung cấp đủ, thiếu là 422 lúc tạo. */
export function CustomVariableChips({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {names.map((n) => (
        <Badge key={n} variant="outline" size="sm" className="font-mono">
          +{n}
        </Badge>
      ))}
    </div>
  );
}

/** Loại template, chip enum thuần. */
export function CategoryBadge({ category }: { category: MailCategory }) {
  return <EnumBadge meta={MAIL_CATEGORY[category]} />;
}

/** Hai trạng thái đọc được ngay cạnh tên: partial không gửi trực tiếp được, và template đã tắt. */
export function TemplateFlags({ template }: { template: Pick<AdminMailTemplateRow, 'active' | 'category'> }) {
  return (
    <>
      {template.category === 'PARTIAL' && (
        <Badge variant="warning" size="sm">
          <Lock className="mr-1 size-2.5" />
          không gửi trực tiếp
        </Badge>
      )}
      {!template.active && (
        <Badge variant="muted" size="sm">
          Đã tắt
        </Badge>
      )}
    </>
  );
}

/** Số version đang phát hành. */
export function VersionChip({ version }: { version: number }) {
  return (
    <Badge variant="secondary" size="sm" className="font-mono">
      v{version}
    </Badge>
  );
}
