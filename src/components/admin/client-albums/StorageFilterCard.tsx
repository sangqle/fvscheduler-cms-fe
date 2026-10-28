'use client';

import * as React from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Field } from '@/components/admin/shared/Field';
import {
  parseWorkspaceId,
  pickerToRange,
  rangeToPicker,
  type ResolvedStorageFilters,
  type StoragePreset,
} from '@/components/admin/client-albums/storageFilters';
import { useAdminWorkspaces } from '@/hooks/useAdminWorkspaces';
import { WORKSPACE_TYPE } from '@/lib/admin/labels';

/**
 * Số workspace nạp vào ô chọn, trần `size` của backend. Ô chọn lọc ở máy trên danh sách này, nên workspace
 * ngoài 100 tên đầu chỉ tới được bằng cách dán id (ô chọn nhận id `wk…` gõ tay).
 */
const WORKSPACE_CHOICE_LIMIT = 100;

/** Giá trị của dòng "Mọi workspace". Không bao giờ trùng một id thật (id luôn bắt đầu bằng `wk`). */
const ALL_WORKSPACES = '__all__';

const WORKSPACE_FIELD_ID = 'client-album-storage-workspace';

type QuickPreset = Exclude<StoragePreset, 'custom'>;

const PRESET_OPTIONS: { value: QuickPreset; label: string }[] = [
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'all', label: 'Toàn bộ thời gian' },
];

/** Nội dung hộp xác nhận trước mỗi lượt tính, đúng câu chủ dự án đưa (2026-10-28). */
const COMPUTE_CONFIRM_MESSAGE =
  'Mỗi lần tính phải quét toàn bộ ảnh của các album trong khoảng nên có thể mất vài chục giây, và chỉ chạy được ' +
  '10 lần mỗi phút. Chỉ tính album còn sống, album đã xóa không có trong con số này.';

/**
 * Thẻ bộ lọc của tab "Dung lượng": khoảng ngày tạo album, một workspace tùy chọn, và nút "Tính dung lượng",
 * tất cả trên một hàng.
 *
 * Sửa bộ lọc ở đây chỉ ghi URL, không bao giờ gọi API. Lượt tính duy nhất là một lần bấm nút rồi xác nhận
 * trong hộp thoại (hộp nói rõ cái giá của lượt tính), vì đó là route đắt nhất của module (backend quét mọi
 * ảnh còn sống của album trong khoảng) và chỉ chạy được 10 lượt mỗi phút. Nên mặc định là "Tháng này" chứ
 * không phải khoảng mở: khoảng mở quét nhiều nhất, phải do người dùng chọn rõ.
 *
 * Ô chọn workspace tìm theo tên trên 100 workspace đầu (xếp theo tên), và nhận id `wk…` dán tay cho workspace
 * ngoài danh sách đó. Id dán sai dạng bị chặn ngay tại chỗ: backend trả 400 cho nó và "Thử lại" không bao giờ sửa được.
 */
export function StorageFilterCard({
  filters,
  pending,
  onPreset,
  onRange,
  onWorkspace,
  onCompute,
}: {
  filters: ResolvedStorageFilters;
  /** Đang tính: nút khóa lại kèm vòng quay. */
  pending: boolean;
  onPreset: (preset: QuickPreset) => void;
  onRange: (range: { from?: string; to?: string }) => void;
  /** `undefined` là mọi workspace. */
  onWorkspace: (workspaceId: string | undefined) => void;
  /** `workspaceLabel`: tên workspace đang lọc để kết quả ghi lại nó là của ai (id nếu chưa biết tên); vắng là mọi workspace. */
  onCompute: (workspaceLabel?: string) => void;
}) {
  const workspaces = useAdminWorkspaces({ size: WORKSPACE_CHOICE_LIMIT, sort: 'name,asc' });
  const [idError, setIdError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const options = React.useMemo<ComboboxOption[]>(
    () => [
      { value: ALL_WORKSPACES, label: 'Mọi workspace' },
      ...(workspaces.data?.content ?? []).map((w) => ({
        value: w.id,
        label: w.name,
        description: `${WORKSPACE_TYPE[w.type]} · ${w.rawId}`,
      })),
    ],
    [workspaces.data],
  );

  const range = React.useMemo(() => rangeToPicker(filters.from, filters.to), [filters.from, filters.to]);

  function chooseWorkspace(value: number | string) {
    const text = String(value).trim();
    if (text === ALL_WORKSPACES) {
      setIdError(null);
      onWorkspace(undefined);
      return;
    }
    const id = parseWorkspaceId(text);
    if (!id) {
      setIdError(`“${text}” không phải id workspace. Id bắt đầu bằng wk, theo sau là 14 ký tự gồm chữ in hoa và số.`);
      return;
    }
    setIdError(null);
    onWorkspace(id);
  }

  const total = workspaces.data?.totalElements ?? 0;
  let hint: string | undefined;
  if (workspaces.isError) {
    hint = 'Không tải được danh sách workspace. Vẫn có thể dán id workspace vào ô tìm kiếm.';
  } else if (total > WORKSPACE_CHOICE_LIMIT) {
    hint = `Danh sách chỉ có ${WORKSPACE_CHOICE_LIMIT} workspace đầu theo tên. Với workspace khác, dán id vào ô tìm kiếm.`;
  }

  const workspaceLabel = filters.workspaceId
    ? (workspaces.data?.content.find((w) => w.id === filters.workspaceId)?.name ?? filters.workspaceId)
    : undefined;

  return (
    <Card>
      <CardContent standalone className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <Field label="Ngày tạo album">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={PRESET_OPTIONS}
                value={filters.preset}
                onValueChange={(v) => onPreset(v as QuickPreset)}
                size="sm"
                aria-label="Chọn nhanh khoảng ngày tạo album"
              />
              <DateRangePicker
                value={range}
                onChange={(next) => onRange(pickerToRange(next))}
                placeholder="Toàn bộ thời gian"
                className="w-auto"
              />
            </div>
          </Field>

          <Field
            id={WORKSPACE_FIELD_ID}
            label="Workspace"
            hint={hint}
            error={idError ?? undefined}
            className="w-full sm:w-80"
          >
            <Combobox
              id={WORKSPACE_FIELD_ID}
              options={options}
              value={filters.workspaceId ?? ALL_WORKSPACES}
              onChange={chooseWorkspace}
              allowCustom
              customLabel={(q) => `Dùng id “${q}”`}
              placeholder="Mọi workspace"
              searchPlaceholder="Tìm theo tên, hoặc dán id"
              emptyText="Không có workspace nào khớp"
            />
          </Field>

          <Button className="ml-auto self-end" onClick={() => setConfirmOpen(true)} disabled={pending}>
            {pending ? <Spinner size="sm" /> : <Calculator className="size-4" />}
            Tính dung lượng
          </Button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          icon={Calculator}
          title="Tính dung lượng?"
          description={COMPUTE_CONFIRM_MESSAGE}
          confirmLabel="Tính dung lượng"
          onConfirm={() => {
            setConfirmOpen(false);
            onCompute(workspaceLabel);
          }}
        />
      </CardContent>
    </Card>
  );
}
