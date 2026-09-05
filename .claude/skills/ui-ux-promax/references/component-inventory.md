# Component Inventory — `src/components/ui/` (framevis-admin)

Bản đồ "cần X" → primitive đã có + prop. **Đọc trước khi viết markup.** Không có trong danh sách →
thêm primitive mới (copy từ `../framevis-erp/src/components/ui/` nếu ERP đã có), không inline Tailwind.

> Luôn kiểm tra lại bằng `ls src/components/ui/`.

## Luật cỡ

`size` trên field/button **không** thay bằng `h-*`. Thang: 32px (`sm`, `icon-sm`) · 36px (`md`) ·
40px (`icon`) · 44px (`lg`), một cỡ ở mọi bề ngang. `text-sm` trần trên `Input` chỉ đè nửa phone
(`FIELD_FONT` = `text-base sm:text-sm`). Nguồn: `src/components/ui/field-size.ts`.

## Fields (`size?: 'sm' | 'md' | 'lg'`)

| Cần | Primitive | Ghi chú |
|---|---|---|
| Text/email/number/`datetime-local` | `Input` | `error?`, `leadingIcon?`, `leadingAddon?`; ngày giờ: bọc trong `components/admin/shared/DateTimeField` |
| Nhiều dòng | `Textarea` | `error?`, `showCount?` + `maxLength`; ghi chú bắt buộc: `components/admin/shared/NoteField` |
| Dropdown native (list ngắn) | `SelectNative` | dùng cho filter bar |
| Dropdown Radix | `Select` (+ `SelectTrigger size`) | |
| Tìm được / list dài | `Combobox` | `options: {value,label,description?,keywords?}` |
| Chọn 1 trong vài | `SegmentedControl` | `options`, `size="sm|md"`, `fullWidth` |
| Ngày (không giờ) | `DatePicker` / `Calendar` | |
| On/off | `Switch` | |
| Nhãn | `Label` | pair với `id` |

## Actions

| Cần | Dùng |
|---|---|
| Nút | `Button` — `variant`: `default · secondary · outline · primary-outline · ghost · destructive · destructive-outline · destructive-ghost · success · link`; `size`: `sm · md · lg · icon · icon-sm` |
| Icon only | `Button variant="ghost" size="icon-sm"` + `aria-label` |
| Xác nhận nguy hiểm | `ConfirmDialog` (`variant="destructive"`, `children` cho form phụ, `confirmDisabled`, `isPending`) |
| Menu | `DropdownMenu` |

## Surfaces & layout

| Cần | Dùng |
|---|---|
| Thẻ | `Card` + `CardHeader/CardTitle/CardDescription/CardContent/CardFooter` |
| KPI | `StatCard` |
| Modal | `Dialog` + `DialogContent/DialogHeader/DialogIcon(tone)/DialogTitle/DialogDescription/DialogBody/DialogFooter` |
| Panel phải | `SlideOver` (`title` sr-only, tự dựng header/footer bên trong) |
| Tabs | `Tabs/TabsList/TabsTrigger/TabsContent/TabsCount` |
| Bảng | `DataTable` — `columns`, `data`, `rowKey`, `isLoading`, `emptyContent`, `onRowClick`, `rowClassName`; server paging: `paginated manualPagination pageIndex pageCount totalRows defaultPageSize onPageChange onPageSizeChange` |
| Popover / tooltip | `Popover` · `Tooltip content=` · `InfoTip` |

## Display & feedback

| Cần | Dùng |
|---|---|
| Tiêu đề | `Heading level="1".."4"` (string) · màn: `components/admin/shared/PageHeader` |
| Chữ | `Text variant="body|body-sm|body-lg|caption|overline"` + `muted`/`subtle` |
| Kicker mono | `Kicker` |
| Chip | `Badge variant="default|primary|secondary|destructive|success|success-soft|info|info-soft|warning|muted|outline"` `size="sm|md"` `mono` |
| Enum backend | `components/admin/shared/EnumBadge` + bảng `lib/admin/labels.ts` |
| Người | `Avatar name size="sm|md|lg|xl"` |
| Thanh mức | `MeterBar segments max size` · `Progress` |
| Loading | `Spinner size` · `Skeleton` |
| Rỗng / lỗi / 404 | `EmptyState` · `components/admin/shared/QueryState` (`ErrorState`, `NotFoundState`, `isNotFound`) |
| Thông báo inline | `Alert variant="default|destructive|warning|success|info|primary"` + `AlertDescription` |
| Banner | `NoticeBanner intent` |
| Toast | `useToast().showToast({ title, description, variant, duration })` |
| Chip lọc | `FilterChip tone count` |
| Chỉ đọc | `components/admin/shared/ReadOnlyHint` |
| Cặp nhãn/giá trị | `components/admin/shared/KeyValue` + `KeyValueList` |

## Thêm primitive

1. Có ở ERP → copy nguyên file từ `../framevis-erp/src/components/ui/` (kiểm tra import phụ thuộc).
2. Mới hoàn toàn → `src/components/ui/<Name>.tsx`, `cva` cho variant, `cn()`, tokens only, cỡ
   theo thang 32/36/40/44, không `sm:` cho chiều cao.
3. Ghi vào file này.
