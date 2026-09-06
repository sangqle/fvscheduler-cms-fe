'use client';

import * as React from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { useAdminWorkspaces } from '@/hooks/useAdminWorkspaces';

/**
 * Chọn workspace lấy ngữ cảnh thật cho preview / gửi thử. Nạp 50 workspace mới nhất và lọc tại
 * client; `allowCustom` để dán thẳng một id mờ (`wk…`) không nằm trong 50 dòng đó.
 */
export function WorkspacePicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { data, isPending } = useAdminWorkspaces({ size: 50 });

  const options = React.useMemo(
    () => (data?.content ?? []).map((w) => ({ value: w.id, label: w.name, description: w.id })),
    [data],
  );

  return (
    <Combobox
      id={id}
      options={options}
      value={value || null}
      onChange={(v) => onChange(String(v))}
      allowCustom
      customLabel={(q) => `Dùng id "${q}"`}
      placeholder={isPending ? 'Đang tải workspace…' : 'Bỏ trống để dùng dữ liệu mẫu'}
      searchPlaceholder="Tìm theo tên, hoặc dán id"
      emptyText="Không có workspace nào khớp"
      disabled={disabled}
      className="w-full"
    />
  );
}
