'use client';

import { Input } from '@/components/ui/Input';

/**
 * Ô nhập giá trị cho **biến tự do** của một template, dùng chung cho gửi thử và tạo chiến dịch.
 * Danh sách ô sinh từ `customVariables` của version hiện hành, không có ô "thêm biến": backend
 * từ chối 422 cả khi thiếu lẫn khi thừa một khóa.
 */
export function CustomVariableInputs({
  names,
  values,
  onChange,
  disabled,
  placeholder,
}: {
  names: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {names.map((name) => (
        <Input
          key={name}
          value={values[name] ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          leadingAddon={name}
          aria-label={`Giá trị của biến ${name}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

/** Biến đã khai nhưng chưa có giá trị. Chiến dịch bắt buộc đủ, gửi thử thì không. */
export function missingVariables(names: string[], values: Record<string, string>): string[] {
  return names.filter((name) => !(values[name] ?? '').trim());
}

/**
 * Body của `POST /campaigns`: đúng tập khóa mà version khai, không hơn không kém. Lấy từ `names`
 * chứ không từ `values` để giá trị còn sót lại của template chọn trước đó không lọt vào body.
 */
export function campaignVariables(
  names: string[],
  values: Record<string, string>,
): Record<string, string> | undefined {
  if (names.length === 0) return undefined;
  return Object.fromEntries(names.map((name) => [name, (values[name] ?? '').trim()]));
}

/**
 * Body của preview / test-send: `variables` là **ghi đè** tùy chọn, bỏ trống thì biến render thành
 * `[tên biến]`. Nên chỉ gửi ô nào người dùng thực sự điền.
 */
export function contextVariables(
  names: string[],
  values: Record<string, string>,
): Record<string, string> | undefined {
  const filled = names
    .map((name) => [name, (values[name] ?? '').trim()] as const)
    .filter(([, value]) => value.length > 0);
  return filled.length > 0 ? Object.fromEntries(filled) : undefined;
}
