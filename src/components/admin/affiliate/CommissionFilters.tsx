'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ChoiceSelect } from '@/components/admin/shared/FilterSelect';
import { AFFILIATE_COMMISSION_SORT_OPTIONS } from '@/lib/admin/labels';

/**
 * Hàng lọc của tab Hoa hồng, cùng khuôn với `MailFilters`: ô nhập co giãn, dropdown rộng theo nội
 * dung, ghi chú đẩy sát phải. Endpoint chỉ lọc theo **id** người giới thiệu và id yêu cầu rút, không
 * lọc theo trạng thái hay email, nên ở đây không có dropdown trạng thái: lọc tại client trên trang
 * đang xem sẽ nói dối khi có phân trang. Bộ lọc đang áp và nút bỏ lọc nằm ở các dòng "Đang lọc theo …"
 * của `CommissionsTab` (cùng kiểu màn Đơn hàng), không nhân đôi thành chip ở đây.
 */

export const DEFAULT_COMMISSION_SORT = 'createdAt,desc';

const SORT_VALUES = AFFILIATE_COMMISSION_SORT_OPTIONS.map((o) => o.value);

/**
 * Id mờ đúng dạng `PublicIdCodec`: tiền tố hai chữ thường + đúng 14 ký tự base32 Crockford viết hoa
 * (không I, L, O, U), luôn 16 ký tự. Sai dạng thì backend trả 400 mà "Thử lại" không bao giờ sửa được,
 * nên chặn trước khi gọi API. Id đúng dạng nhưng sai checksum vẫn 400, chấp nhận.
 */
const OPAQUE_ID = { ac: /^ac[0-9A-HJKMNP-TV-Z]{14}$/, ap: /^ap[0-9A-HJKMNP-TV-Z]{14}$/ } as const;

/** Giá trị trên URL là chuỗi tự do: sai tiền tố hoặc sai dạng thì coi như không lọc. */
export function parseOpaqueId(value: string | undefined, prefix: keyof typeof OPAQUE_ID): string | undefined {
  return value && OPAQUE_ID[prefix].test(value) ? value : undefined;
}

export function parseCommissionSort(value: string | undefined): string {
  return value && SORT_VALUES.includes(value) ? value : DEFAULT_COMMISSION_SORT;
}

export type CommissionIdFilter = 'referrer' | 'inPayout';

/** Chuỗi dán vào ô lọc → bộ lọc nào, hoặc câu lỗi hiện ngay dưới ô. */
export function classifyCommissionId(raw: string): { filter: CommissionIdFilter; id: string } | { error: string } {
  const id = raw.trim();
  // Thân id luôn viết hoa, backend giải mã phân biệt hoa thường: dán nhầm chữ thường vẫn ra đúng id.
  const normalized = id.slice(0, 2) + id.slice(2).toUpperCase();
  if (parseOpaqueId(normalized, 'ac')) return { filter: 'referrer', id: normalized };
  if (parseOpaqueId(normalized, 'ap')) return { filter: 'inPayout', id: normalized };
  if (id.includes('@')) {
    return { error: 'API không tìm theo email. Bấm vào email ở cột Người giới thiệu để lọc, hoặc dán id ac… của tài khoản đó.' };
  }
  if (id.startsWith('af')) {
    return { error: 'Id af… là của một dòng hoa hồng, API không lọc theo nó. Dán id người giới thiệu (ac…) hoặc yêu cầu rút (ap…).' };
  }
  return { error: 'Id không đúng dạng: chỉ nhận id người giới thiệu (ac…) hoặc yêu cầu rút (ap…).' };
}

const NOTE_CLASS = 'w-full sm:ml-auto sm:w-auto sm:max-w-72 sm:text-right';
const ERROR_ID = 'commission-id-filter-error';

export function CommissionFilters({
  referrer,
  inPayout,
  sort,
  onApply,
  onSortChange,
}: {
  referrer?: string;
  inPayout?: string;
  sort: string;
  onApply: (filter: CommissionIdFilter, id: string) => void;
  onSortChange: (sort: string) => void;
}) {
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const filtered = !!(referrer || inPayout);

  function apply() {
    if (!text.trim()) return;
    const result = classifyCommissionId(text);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    onApply(result.filter, result.id);
    setText('');
    setError(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Dán id người giới thiệu (ac…) hoặc yêu cầu rút (ap…)"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            apply();
          }}
          error={!!error}
          aria-label="Lọc theo id người giới thiệu hoặc id yêu cầu rút"
          aria-describedby={error ? ERROR_ID : undefined}
          containerClassName="w-full min-w-52 flex-1 basis-80 sm:w-auto lg:max-w-md"
        />
        <Button variant="outline" onClick={apply} disabled={!text.trim()}>
          Lọc
        </Button>
        {/* Các truy vấn có lọc ghim sẵn `ORDER BY id DESC` trước sort của trang (id là duy nhất), nên
            chọn sắp xếp lúc đang lọc không đổi gì: ẩn đi thay vì để một dropdown chết. */}
        {filtered ? (
          <Text variant="caption" muted>
            Đang lọc theo id: luôn xếp lượt ghi nhận mới nhất trước
          </Text>
        ) : (
          <ChoiceSelect
            label="Sắp xếp"
            value={sort}
            onChange={onSortChange}
            options={AFFILIATE_COMMISSION_SORT_OPTIONS}
            className="w-auto"
          />
        )}
        <Text variant="caption" muted className={NOTE_CLASS}>
          API không lọc theo trạng thái · khả dụng hay đang giữ suy theo đồng hồ lúc xem
        </Text>
      </div>
      {error && (
        <p id={ERROR_ID} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
