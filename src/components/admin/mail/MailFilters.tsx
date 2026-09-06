'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { ChoiceSelect, FilterSelect } from '@/components/admin/shared/FilterSelect';
import { MAIL_CAMPAIGN_STATUS, MAIL_MESSAGE_STATUS } from '@/lib/admin/labels';
import type { MailCampaignStatus, MailCategory, MailMessageStatus } from '@/types/admin';

/**
 * Hàng lọc của ba tab mail, cùng khuôn với `WorkspaceFilters` và `CatalogFilters`: **một hàng
 * duy nhất**, ô tìm co giãn, dropdown rộng theo nội dung (`w-auto` chứ không phải `shrink-0`:
 * `SelectTrigger` có `w-full` ở base nên `shrink-0` không ghi đè được và mỗi dropdown sẽ chiếm
 * trọn một dòng), nút "Xóa bộ lọc" chỉ hiện khi đang lọc, ghi chú đẩy sát phải.
 *
 * Sắp xếp của tab Template không nằm trong hàng lọc mà đứng cạnh tiêu đề màn (slot `actions` của
 * `PageHeader`), giống `PlanSortControl`. Tab Nhật ký gửi có tới bốn trường sort nên nó ở lại
 * trong hàng lọc dưới dạng dropdown, vì một `SegmentedControl` năm nhánh dài hơn cả hàng.
 */

export type TemplateSort = 'code' | 'name' | 'updatedAt,desc';
export type MessageSort =
  | 'createdAt,desc'
  | 'createdAt,asc'
  | 'sentAt,desc'
  | 'status,asc'
  | 'toEmail,asc';
/** Lọc theo cờ `active` của template; URL giữ chuỗi nên union cũng là chuỗi. */
export type ActiveFilter = 'true' | 'false';

export interface TemplateFilterValues {
  q?: string;
  category?: MailCategory;
  active?: ActiveFilter;
  sort: TemplateSort;
}

export interface CampaignFilterValues {
  status?: MailCampaignStatus;
}

export interface MessageFilterValues {
  campaignCode?: string;
  status?: MailMessageStatus;
  email?: string;
  sort: MessageSort;
}

const TEMPLATE_SORTS: TemplateSort[] = ['code', 'name', 'updatedAt,desc'];
const MESSAGE_SORTS: MessageSort[] = [
  'createdAt,desc',
  'createdAt,asc',
  'sentAt,desc',
  'status,asc',
  'toEmail,asc',
];

/**
 * Ba trường duy nhất `AdminSort.allow` nhận cho template; tên khác bị bỏ qua **im lặng** rồi rơi
 * về `code` asc, nên không mở thêm lựa chọn để người dùng chọn hụt.
 */
const TEMPLATE_SORT_OPTIONS = [
  { value: 'code', label: 'Mã A→Z' },
  { value: 'name', label: 'Tên A→Z' },
  { value: 'updatedAt,desc', label: 'Sửa gần nhất' },
];

const MESSAGE_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất trước' },
  { value: 'createdAt,asc', label: 'Cũ nhất trước' },
  { value: 'sentAt,desc', label: 'Gửi gần nhất' },
  { value: 'status,asc', label: 'Theo trạng thái' },
  { value: 'toEmail,asc', label: 'Email A→Z' },
];

const CATEGORY_OPTIONS = [
  { value: 'ANNOUNCEMENT', label: 'ANNOUNCEMENT' },
  { value: 'SYSTEM', label: 'SYSTEM' },
  { value: 'PARTIAL', label: 'PARTIAL' },
];

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Đang bật' },
  { value: 'false', label: 'Đã tắt' },
];

const MESSAGE_STATUS_OPTIONS = (Object.keys(MAIL_MESSAGE_STATUS) as MailMessageStatus[]).map((s) => ({
  value: s,
  label: MAIL_MESSAGE_STATUS[s].label,
}));

/** Giá trị trên URL là chuỗi tự do, quy về union hợp lệ trước khi dùng. */
export function parseTemplateSort(value: string | undefined): TemplateSort {
  return TEMPLATE_SORTS.includes(value as TemplateSort) ? (value as TemplateSort) : 'code';
}

export function parseMessageSort(value: string | undefined): MessageSort {
  return MESSAGE_SORTS.includes(value as MessageSort) ? (value as MessageSort) : 'createdAt,desc';
}

export function parseActiveFilter(value: string | undefined): ActiveFilter | undefined {
  return value === 'true' || value === 'false' ? value : undefined;
}

export function parseCategory(value: string | undefined): MailCategory | undefined {
  return value === 'SYSTEM' || value === 'ANNOUNCEMENT' || value === 'PARTIAL' ? value : undefined;
}

export function parseCampaignStatus(value: string | undefined): MailCampaignStatus | undefined {
  return value !== undefined && value in MAIL_CAMPAIGN_STATUS ? (value as MailCampaignStatus) : undefined;
}

export function parseMessageStatus(value: string | undefined): MailMessageStatus | undefined {
  return value !== undefined && value in MAIL_MESSAGE_STATUS ? (value as MailMessageStatus) : undefined;
}

export function hasActiveTemplateFilters(v: TemplateFilterValues): boolean {
  return !!(v.q || v.category || v.active);
}

export function hasActiveMessageFilters(v: MessageFilterValues): boolean {
  return !!(v.campaignCode || v.status || v.email);
}

/** Ô nhập giữ giá trị gõ dở tại chỗ, chỉ đẩy lên state cha sau 300ms ngừng gõ. */
function useDebouncedText(committed: string | undefined, commit: (value: string | undefined) => void) {
  const [text, setText] = React.useState(committed ?? '');
  React.useEffect(() => setText(committed ?? ''), [committed]);
  React.useEffect(() => {
    if (text === (committed ?? '')) return;
    const t = setTimeout(() => commit(text.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [text, committed, commit]);
  return [text, setText] as const;
}

const NOTE_CLASS = 'w-full sm:ml-auto sm:w-auto sm:max-w-72 sm:text-right';

// ─── Template ────────────────────────────────────────────────────────────────

/** Sắp xếp template, đứng cạnh nút "Tạo template" trên tiêu đề màn. */
export function TemplateSortControl({
  value,
  onChange,
}: {
  value: TemplateSort;
  onChange: (v: TemplateSort) => void;
}) {
  return (
    <SegmentedControl
      options={TEMPLATE_SORT_OPTIONS}
      value={value}
      onValueChange={(v) => onChange(v as TemplateSort)}
      size="sm"
      aria-label="Sắp xếp template"
    />
  );
}

export function TemplateFilters({
  values,
  onChange,
  onClear,
  counts,
}: {
  values: TemplateFilterValues;
  onChange: (patch: Partial<TemplateFilterValues>) => void;
  onClear: () => void;
  /** Đếm trên danh sách đã tải; bỏ trống khi chưa có dữ liệu. */
  counts?: { active: number; partial: number; off: number };
}) {
  const commitQ = React.useCallback((q: string | undefined) => onChange({ q }), [onChange]);
  const [q, setQ] = useDebouncedText(values.q, commitQ);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        leadingIcon={<Search className="size-4" />}
        placeholder="Tìm theo mã hoặc tên template"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Tìm template"
        containerClassName="w-full min-w-52 flex-1 basis-64 sm:w-auto lg:max-w-96"
      />
      <FilterSelect
        label="Loại"
        value={values.category}
        onChange={(v) => onChange({ category: parseCategory(v) })}
        options={CATEGORY_OPTIONS}
        className="w-auto"
      />
      <FilterSelect
        label="Trạng thái"
        value={values.active}
        onChange={(v) => onChange({ active: parseActiveFilter(v) })}
        options={ACTIVE_OPTIONS}
        className="w-auto"
      />
      {hasActiveTemplateFilters(values) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      {counts && (
        <Text variant="caption" muted className={NOTE_CLASS}>
          {counts.active} đang bật · {counts.partial} partial · {counts.off} đã tắt
        </Text>
      )}
    </div>
  );
}

// ─── Chiến dịch ──────────────────────────────────────────────────────────────

/**
 * Endpoint danh sách chiến dịch không nhận bộ lọc nào, nên dropdown này chỉ lọc **trang đang
 * xem**; ghi chú nói thẳng điều đó để không ai hiểu nhầm là đã quét hết mọi trang.
 */
export function CampaignFilters({
  values,
  onChange,
}: {
  values: CampaignFilterValues;
  onChange: (patch: Partial<CampaignFilterValues>) => void;
}) {
  const options = (Object.keys(MAIL_CAMPAIGN_STATUS) as MailCampaignStatus[]).map((s) => ({
    value: s,
    label: MAIL_CAMPAIGN_STATUS[s].label,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="Trạng thái"
        value={values.status}
        onChange={(v) => onChange({ status: parseCampaignStatus(v) })}
        options={options}
        className="w-auto"
      />
      {values.status && (
        <Button variant="ghost" onClick={() => onChange({ status: undefined })}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      <Text variant="caption" muted className={NOTE_CLASS}>
        Lọc trạng thái chạy trên trang đang xem, API chưa có bộ lọc nào cho danh sách chiến dịch
      </Text>
    </div>
  );
}

// ─── Nhật ký gửi ─────────────────────────────────────────────────────────────

export function MessageFilters({
  values,
  onChange,
  onClear,
  scoped,
}: {
  values: MessageFilterValues;
  onChange: (patch: Partial<MessageFilterValues>) => void;
  onClear: () => void;
  /** Đang nằm trong chi tiết một chiến dịch: mã chiến dịch cố định nên ẩn ô nhập mã. */
  scoped?: boolean;
}) {
  const commitEmail = React.useCallback((email: string | undefined) => onChange({ email }), [onChange]);
  const [email, setEmail] = useDebouncedText(values.email, commitEmail);
  const commitCode = React.useCallback(
    (campaignCode: string | undefined) => onChange({ campaignCode }),
    [onChange],
  );
  const [code, setCode] = useDebouncedText(values.campaignCode, commitCode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        leadingIcon={<Search className="size-4" />}
        placeholder="Nhập đúng địa chỉ email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Lọc theo email người nhận"
        containerClassName="w-full min-w-52 flex-1 basis-56 sm:w-auto lg:max-w-72"
      />
      {!scoped && (
        <Input
          placeholder="Mã chiến dịch, ví dụ CMP-20260905-K7QX2M"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          aria-label="Lọc theo mã chiến dịch"
          className="font-mono"
          containerClassName="w-full min-w-52 flex-1 basis-56 sm:w-auto lg:max-w-72"
        />
      )}
      <FilterSelect
        label="Trạng thái"
        value={values.status}
        onChange={(v) => onChange({ status: parseMessageStatus(v) })}
        options={MESSAGE_STATUS_OPTIONS}
        className="w-auto"
      />
      <ChoiceSelect
        label="Sắp xếp"
        value={values.sort}
        onChange={(v) => onChange({ sort: parseMessageSort(v) })}
        options={MESSAGE_SORT_OPTIONS}
        className="w-auto"
      />
      {hasActiveMessageFilters(values) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          Xóa bộ lọc
        </Button>
      )}
      <Text variant="caption" muted className={NOTE_CLASS}>
        Ô email so khớp chính xác cả địa chỉ, không phân biệt hoa thường, không phải tìm chuỗi con
      </Text>
    </div>
  );
}
