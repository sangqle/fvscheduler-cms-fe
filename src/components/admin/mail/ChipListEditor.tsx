'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMailVariables } from '@/hooks/useAdminMail';
import { validateCustomVariable } from '@/lib/admin/mail';

/**
 * Danh sách biến tự do dưới dạng chip thêm/bớt được. Biến phải khai tường minh chứ không suy ra
 * từ nội dung, nên đây là nơi duy nhất tên biến tự do sinh ra.
 */
export function ChipListEditor({
  values,
  onChange,
  disabled,
  placeholder = 'thêm tên biến',
}: {
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { data: catalog } = useMailVariables();
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();

  function add() {
    const name = draft.trim();
    // Backend từ chối tên trùng biến catalog ở BẤT KỲ nhóm nào, kể cả nhóm chưa khai; chặn tại đây
    // để người dùng không phải đợi 422 mới biết.
    const problem = validateCustomVariable(name, catalog, values);
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...values, name]);
    setDraft('');
    setError(undefined);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((name) => (
          <Badge key={name} variant="outline" size="sm" interactive asChild>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(values.filter((v) => v !== name))}
              aria-label={`Bỏ biến ${name}`}
            >
              <span className="font-mono">{name}</span>
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            add();
          }}
          placeholder={placeholder}
          aria-label="Tên biến tự do"
          disabled={disabled}
          error={!!error}
          className="font-mono"
          containerClassName="w-40"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={disabled || !draft.trim()}>
          <Plus className="size-3.5" />
          Thêm
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

/** Bật tắt một nhóm ngữ cảnh. `COMMON` luôn có nên nó đứng ngoài danh sách này. */
export function ToggleChip({
  label,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Badge variant={active ? 'info' : 'muted'} size="sm" mono interactive asChild>
      <button type="button" disabled={disabled} onClick={onToggle} aria-pressed={active}>
        {label}
        {active ? <X className="size-2.5" /> : <Plus className="size-2.5" />}
      </button>
    </Badge>
  );
}
