'use client';

import * as React from 'react';
import { Plus, Save, TriangleAlert, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { Input } from '@/components/ui/Input';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { useCatalogGroups, useCatalogItems, useLimitKeys } from '@/hooks/useAdminCatalog';
import { useReplaceComposition } from '@/hooks/useAdminPlans';
import { apiErrorMessage } from '@/lib/api/auth';
import { ITEM_DISPLAY_VALUE_MAX, resolvePreview } from '@/lib/admin/catalog';
import { cn } from '@/lib/utils';
import type { AdminPlanDetail, PlanItemLinkInput } from '@/types/admin';

type LimitMode = 'value' | 'unlimited' | 'absent';

const LIMIT_MODES = [
  { value: 'value', label: 'Số' },
  { value: 'unlimited', label: '∞ Không giới hạn' },
  { value: 'absent', label: 'Không mang' },
];

interface LimitState {
  mode: LimitMode;
  /** Chuỗi để ô nhập giữ được trạng thái rỗng khi đang gõ; chỉ đọc khi `mode === 'value'`. */
  value: string;
}

interface Draft {
  groups: string[];
  links: PlanItemLinkInput[];
  limits: Record<string, LimitState>;
}

/**
 * Dựng bản nháp từ định nghĩa gói đang lưu. `sortOrder` của một dòng ghi đè lấy theo giá trị
 * **hiệu lực** mà backend trả về (link.sortOrder nếu có, không thì sort của item), nên một link
 * vốn để trống sort sẽ được ghim thành số khi lưu lại — cùng thứ tự, chỉ khác là nó thôi đi theo
 * item gốc.
 */
function draftFrom(plan: AdminPlanDetail, limitKeys: string[]): Draft {
  const limits: Record<string, LimitState> = {};
  for (const key of limitKeys) {
    if (!(key in plan.limits)) {
      limits[key] = { mode: 'absent', value: '' };
      continue;
    }
    const value = plan.limits[key];
    limits[key] = value === null ? { mode: 'unlimited', value: '' } : { mode: 'value', value: String(value) };
  }
  return {
    groups: plan.groups.map((g) => g.code),
    links: plan.items
      .filter((i) => i.source === 'LINK')
      .map((i) => ({
        code: i.code,
        enabled: i.enabled,
        displayValue: i.displayValue,
        sortOrder: i.sortOrder,
      })),
    limits,
  };
}

/** ADM-FLOW-09: chọn nhóm, ghi đè item, đặt limits — lưu một lần thay TOÀN BỘ thành phần gói. */
export function PlanCompositionTab({ plan }: { plan: AdminPlanDetail }) {
  const { showToast } = useToast();
  const groups = useCatalogGroups();
  const items = useCatalogItems();
  const limitKeys = useLimitKeys();
  const replace = useReplaceComposition(plan.code);

  const limitKeyCodes = React.useMemo(() => (limitKeys.data ?? []).map((k) => k.key), [limitKeys.data]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  /**
   * Nạp bản nháp khi danh sách khóa giới hạn tải xong, và nạp lại khi gói **thật sự** được ghi lại
   * (`updatedAt` đổi) — không neo vào identity của `plan`, nếu không thì một lần refetch lúc quay
   * lại tab trình duyệt sẽ xóa sạch bản nháp đang soạn.
   */
  const planRef = React.useRef(plan);
  planRef.current = plan;
  React.useEffect(() => {
    if (limitKeys.data === undefined) return;
    setDraft(draftFrom(planRef.current, limitKeyCodes));
    setServerError(null);
  }, [plan.code, plan.updatedAt, limitKeyCodes, limitKeys.data]);

  const loading = groups.isPending || items.isPending || limitKeys.isPending || draft === null;
  const loadError = groups.error ?? items.error ?? limitKeys.error;

  if (loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void groups.refetch();
          void items.refetch();
          void limitKeys.refetch();
        }}
      />
    );
  }
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const linkedCodes = new Set(draft.links.map((l) => l.code));
  const initial = draftFrom(plan, limitKeyCodes);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function patchLink(code: string, next: Partial<PlanItemLinkInput>) {
    setDraft((d) => (d ? { ...d, links: d.links.map((l) => (l.code === code ? { ...l, ...next } : l)) } : d));
  }

  const limitErrors = Object.entries(draft.limits)
    .filter(([, state]) => state.mode === 'value')
    .filter(([, state]) => {
      const n = Number(state.value);
      return state.value === '' || !Number.isInteger(n) || n < 0;
    })
    .map(([key]) => key);

  function submit() {
    if (!draft || limitErrors.length > 0) return;
    setServerError(null);
    replace.mutate(
      {
        groups: draft.groups,
        items: draft.links.map((l) => ({
          code: l.code,
          enabled: l.enabled,
          displayValue: l.displayValue?.trim() || null,
          sortOrder: l.sortOrder,
        })),
        limits: Object.entries(draft.limits)
          .filter(([, state]) => state.mode !== 'absent')
          .map(([key, state]) => ({ key, value: state.mode === 'unlimited' ? null : Number(state.value) })),
      },
      {
        onSuccess: (saved) =>
          showToast({
            title: `Đã lưu thành phần gói ${saved.name}`,
            description: 'Cache gói này và cache trang giá công khai đã được xóa.',
            variant: 'success',
          }),
        onError: (e) =>
          setServerError(apiErrorMessage(e, 'Không lưu được thành phần. Vui lòng thử lại.')),
      },
    );
  }

  const preview = resolvePreview(groups.data ?? [], items.data ?? [], draft.groups, draft.links);
  const overrideOptions = (items.data ?? [])
    .filter((i) => !linkedCodes.has(i.code))
    .map((i) => ({
      value: i.code,
      label: `${i.label} · ${i.code}`,
      description: `${i.groupLabel}${i.isActive ? '' : ' · đã tắt'}`,
      keywords: i.featureKey ?? undefined,
    }));

  return (
    <div className="flex flex-col gap-4">
      <NoticeBanner
        intent="warning"
        icon={<TriangleAlert />}
        title="Lưu là thay toàn bộ thành phần"
        description="Nhóm, item ghi đè và limits đều được viết lại đúng theo những gì đang thấy trên màn này. Thứ bạn bỏ khỏi danh sách sẽ bị xóa khỏi gói."
      />

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhóm item</CardTitle>
              <CardDescription>
                Đã chọn {draft.groups.length} / {groups.data?.length ?? 0} · gói nhận hợp của mọi item trong
                nhóm đã chọn
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(groups.data ?? []).map((group) => {
                const checked = draft.groups.includes(group.code);
                return (
                  <label
                    key={group.code}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      checked ? 'border-primary bg-primary-50' : 'border-border hover:bg-secondary/50',
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                groups: e.target.checked
                                  ? [...d.groups, group.code]
                                  : d.groups.filter((c) => c !== group.code),
                              }
                            : d,
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <Text variant="body-sm" as="span" className="font-semibold">
                          {group.label}
                        </Text>
                        <span className="font-mono text-xs text-muted-foreground">{group.code}</span>
                        <span className="text-xs text-muted-foreground">· {group.items.length} item</span>
                        {!group.isActive && (
                          <Badge variant="muted" size="sm">
                            Nhóm đang tắt
                          </Badge>
                        )}
                      </div>
                      {checked && group.items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {group.items.map((item) => (
                            <span
                              key={item.code}
                              className={cn(
                                'rounded bg-card px-1.5 py-0.5 font-mono text-xs text-muted-foreground',
                                !item.isActive && 'line-through',
                              )}
                            >
                              {item.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ghi đè item</CardTitle>
              <CardDescription>Chỉ liệt kê item cần khác mặc định của nhóm</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {draft.links.length === 0 ? (
                <Text variant="body-sm" muted>
                  Chưa có dòng ghi đè nào. Gói đang nhận đúng mặc định của các nhóm đã chọn.
                </Text>
              ) : (
                <div className="flex flex-col gap-3">
                  {draft.links.map((link) => {
                    const item = items.data?.find((i) => i.code === link.code);
                    const inSelectedGroup = (groups.data ?? []).some(
                      (g) => draft.groups.includes(g.code) && g.items.some((i) => i.code === link.code),
                    );
                    return (
                      <div key={link.code} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Text variant="body-sm" as="span" className="font-semibold">
                                {item?.label ?? link.code}
                              </Text>
                              <Badge variant="secondary" size="sm" mono>
                                LINK
                              </Badge>
                              {!inSelectedGroup && (
                                <Badge variant="info-soft" size="sm">
                                  ngoài nhóm đã chọn
                                </Badge>
                              )}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">{link.code}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Bỏ ghi đè ${link.code}`}
                            onClick={() =>
                              setDraft((d) =>
                                d ? { ...d, links: d.links.filter((l) => l.code !== link.code) } : d,
                              )
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_6rem]">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={link.enabled !== false}
                              onCheckedChange={(v) => patchLink(link.code, { enabled: v })}
                              aria-label={`Bật item ${link.code} trong gói`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {link.enabled === false ? 'ẩn khỏi gói' : 'hiện trong gói'}
                            </span>
                          </div>
                          <Input
                            size="sm"
                            value={link.displayValue ?? ''}
                            onChange={(e) => patchLink(link.code, { displayValue: e.target.value })}
                            maxLength={ITEM_DISPLAY_VALUE_MAX}
                            placeholder="Giá trị hiển thị, theo mặc định nếu để trống"
                            aria-label={`Giá trị hiển thị của ${link.code}`}
                          />
                          <Input
                            size="sm"
                            inputMode="numeric"
                            value={link.sortOrder ?? ''}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/[^\d-]/g, '');
                              patchLink(link.code, { sortOrder: digits === '' ? null : Number(digits) });
                            }}
                            placeholder="Sort"
                            aria-label={`Sort của ${link.code}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Combobox
                  aria-label="Thêm item ghi đè"
                  options={overrideOptions}
                  value={null}
                  onChange={(code) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            links: [
                              ...d.links,
                              { code: String(code), enabled: true, displayValue: null, sortOrder: null },
                            ],
                          }
                        : d,
                    )
                  }
                  placeholder="Thêm item ghi đè"
                  searchPlaceholder="Lọc theo mã hoặc nhãn item"
                  emptyText="Không còn item nào để thêm"
                />
                <Text variant="caption" muted className="inline-flex items-center gap-1">
                  <Plus className="size-3" />
                  Item nằm ngoài nhóm đã chọn cũng thêm được ở đây
                </Text>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
              <CardDescription>
                Danh sách cố định: {limitKeyCodes.length} khóa. Thêm khóa mới phải sửa backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(limitKeys.data ?? []).map((key) => {
                const state = draft.limits[key.key] ?? { mode: 'absent' as LimitMode, value: '' };
                const invalid = limitErrors.includes(key.key);
                return (
                  <div key={key.key} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Text variant="body-sm" as="span" className="font-semibold">
                        {key.label}
                      </Text>
                      <span className="font-mono text-xs text-muted-foreground">{key.key}</span>
                    </div>
                    <SegmentedControl
                      options={LIMIT_MODES}
                      value={state.mode}
                      onValueChange={(mode) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                limits: {
                                  ...d.limits,
                                  [key.key]: { mode: mode as LimitMode, value: state.value },
                                },
                              }
                            : d,
                        )
                      }
                      size="sm"
                      fullWidth
                      aria-label={`Chế độ của limit ${key.key}`}
                    />
                    {state.mode === 'value' && (
                      <Input
                        size="sm"
                        inputMode="numeric"
                        value={state.value}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  limits: {
                                    ...d.limits,
                                    [key.key]: { mode: 'value', value: e.target.value.replace(/\D/g, '') },
                                  },
                                }
                              : d,
                          )
                        }
                        error={invalid}
                        aria-label={`Giá trị của limit ${key.key}`}
                      />
                    )}
                    <Text variant="caption" muted>
                      {state.mode === 'unlimited'
                        ? 'Khóa có trong gói, giá trị null: hệ thống không chặn số lượng.'
                        : state.mode === 'absent'
                          ? 'Gói không mang khóa này.'
                          : invalid
                            ? 'Nhập một số nguyên từ 0 trở lên.'
                            : 'Số tối đa gói cho phép.'}
                    </Text>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kết quả sau khi lưu</CardTitle>
              <CardDescription>
                {preview.length} item workspace thấy được, sau khi hợp nhóm và áp ghi đè
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col">
              {preview.length === 0 ? (
                <Text variant="body-sm" muted>
                  Gói sẽ không mang item nào. Workspace dùng gói này nhận một entitlement rỗng.
                </Text>
              ) : (
                preview.slice(0, 8).map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-0"
                  >
                    <Text variant="body-sm" as="span" className="min-w-0 truncate">
                      {item.label}
                      {item.displayValue && (
                        <span className="text-muted-foreground"> · {item.displayValue}</span>
                      )}
                    </Text>
                    <Badge variant={item.source === 'LINK' ? 'info-soft' : 'muted'} size="sm" mono>
                      {item.source}
                    </Badge>
                  </div>
                ))
              )}
              {preview.length > 8 && (
                <Text variant="caption" muted className="pt-2">
                  và {preview.length - 8} item khác
                </Text>
              )}
              <Text variant="caption" muted className="pt-3">
                Dựng lại phía client theo đúng luật hợp nhóm rồi áp ghi đè. Con số chính thức là kết quả
                backend trả về sau khi lưu.
              </Text>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* `bottom-4 sm:bottom-6` khớp đệm của `main`: đệm đó đã chuyển vào khối trong (xem `AdminShell`)
          nên vùng cuộn hết tự chừa chỗ, `bottom-0` sẽ dán thẻ sát mép dưới cửa sổ. */}
      <Card className="sticky bottom-4 z-10 flex flex-col gap-3 p-3 sm:bottom-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <Text variant="body-sm" as="span" className="font-semibold">
            {draft.groups.length} nhóm · {draft.links.length} ghi đè ·{' '}
            {Object.values(draft.limits).filter((l) => l.mode !== 'absent').length} limits
          </Text>
          <Text variant="caption" muted as="span" className="font-mono">
            PUT /api/admin/plans/{plan.code}/composition
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDraft(draftFrom(plan, limitKeyCodes))}
            disabled={!dirty || replace.isPending}
          >
            Hoàn tác
          </Button>
          <Button onClick={submit} disabled={!dirty || limitErrors.length > 0 || replace.isPending}>
            {replace.isPending ? <Spinner size="sm" /> : <Save className="size-4" />}
            Lưu thành phần
          </Button>
        </div>
      </Card>
    </div>
  );
}
