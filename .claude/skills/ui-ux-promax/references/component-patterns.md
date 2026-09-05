# Component Patterns

Recipes that match the existing `framevis-erp` look. **Compose `src/components/ui/` primitives** —
see [component-inventory.md](./component-inventory.md) for the full map. Appearance comes from
`variant`/`size` props; `className` is for layout only. Use `cn()` from `@/lib/utils` to merge.

## Surface / Card

```tsx
<Card className="flex flex-col gap-3 p-4">
  <Text variant="body-sm" className="font-semibold">Tiêu đề</Text>
  <Text variant="body-sm" muted>Nội dung phụ</Text>
</Card>
```
With header/footer slots, prefer the sub-components: `<CardHeader><CardTitle>…</CardTitle></CardHeader><CardContent>…</CardContent>`.
Clickable card → `<Card interactive>`. Highlighted/selected → `className="border-primary/30 bg-primary/5"`.

> Don't re-create the surface by hand (`rounded-lg border border-border bg-card`). `Card` owns the
> radius (`rounded-2xl`) and `shadow-card`; a hand-rolled copy silently drifts when the DS changes.

## Section header (eyebrow)

```tsx
<Text variant="overline" muted>Thông tin khách hàng</Text>
```

## Form field

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="name">Họ tên *</Label>
  <Input id="name" placeholder="Nguyễn Văn A" error={!!errors.name} {...register('name')} />
  {errors.name && (
    <Text variant="caption" className="text-destructive">{errors.name.message}</Text>
  )}
</div>
```
- **Never** set the field's height/padding/font in `className` — `<Input size="sm|md|lg">` only.
  `md` is the default and is correct for almost every form; `sm` for dense toolbars/filters; `lg`
  for a primary field on a phone-first screen. Why: [component-inventory.md](./component-inventory.md#the-one-rule-that-breaks-people).
- Two-up rows: `grid grid-cols-1 md:grid-cols-2 gap-4`.
- Searchable select → `<Combobox options={...} value={...} onChange={...} />`; native → `<SelectNative>`;
  money → `<CurrencyInput>`; multi-line → `<Textarea showCount maxLength={…}>`.
- Validate with React Hook Form + Zod (`zodResolver`); pass `error` to the field for the red ring.

## Buttons & action bars

- One **primary** per view (`<Button>` default). Cancel/back → `variant="outline"`; tertiary → `ghost`.
- Destructive → `variant="destructive"`, gated by `ConfirmDialog`. Permission-gated → `<PermissionButton>`.
- Submitting state: `disabled={isSubmitting}` + `<Spinner size="sm" className="mr-1.5" />`.
- Icon-only buttons need `aria-label`/`title`; size `icon`/`icon-sm`.
- Height comes from `size` (`sm` · `md` default · `lg`) — **never** `className="h-11"`. A full-width
  CTA is `<Button size="lg" className="w-full">`: `w-full` is layout (fine), `h-11` is sizing (not).

```tsx
<DialogFooter className="mt-6">
  <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
  <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
    {isSubmitting && <Spinner size="sm" className="mr-1.5" />}
    Lưu
  </Button>
</DialogFooter>
```

## Badge / status

```tsx
<Badge variant="muted">{label}</Badge>
```
Map booking statuses to intent variants (success/warning/info/destructive/muted) — keep one variant per status app-wide for consistency. Status machine: `pending_confirm → confirmed → shooting → retouching → retouched → printing → printed → done` (any non-terminal `→ cancelled`).

## Table

**Use `<DataTable>`.** It already handles loading skeletons, empty message, pagination, row click,
expanded rows, and the `md` table↔card swap via `mobileCards`.

```tsx
<DataTable
  columns={columns}
  data={rows}
  rowKey={(r) => r.id}
  isLoading={isLoading}
  emptyMessage="Chưa có booking nào"
  mobileCards
  onRowClick={openDetail}
/>
```
Numeric/currency cells right-aligned inside the column's `cell`. Hand-rolled `<table>` only for a
genuinely bespoke layout (calendar timetable, merged cells) — then `hidden md:block` + a `md:hidden`
card list reusing the same cells, and no hard-pixel widths on wide tables.

## List row with remove

```tsx
<div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
  <Text variant="body-sm" className="truncate">{label}</Text>
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={onRemove}
    aria-label="Xóa"
    className="shrink-0 text-muted-foreground hover:text-destructive"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```
A raw `<button>` here would lose the focus ring, the disabled styling and its place on the shared
height scale — that's why the action is a `Button`, even when it looks like a bare icon.

## Required states

| State | Pattern |
|---|---|
| Loading | `<Spinner />` centered, or `<Skeleton>` placeholders matching final layout |
| Empty | `<EmptyState icon title description action={<Button>…</Button>} />` |
| Error | `<Alert variant="destructive">` or `Text variant="caption" className="text-destructive"` |
| Disabled | `disabled` on the primitive — it already carries `disabled:` styling; don't re-add it |
| Selected/active | `border-primary/30 bg-primary/5`, `bg-accent`, or `<Button variant="primary-outline">` |

## Multi-step modal (see `CreateBookingModal.tsx`)

- `Dialog` + `DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"`.
- Step indicator: numbered circles `bg-primary text-primary-foreground` when `i <= step`, else `bg-muted text-muted-foreground`; connectors `h-px bg-border`.
- Footer adapts: back/cancel left, next/submit right.

## Icons

Use `lucide-react`. Size with `h-3.5 w-3.5` (inline), `h-4 w-4` (buttons). Color inherits via `currentColor` — drive it with text token classes (`text-muted-foreground`), never hardcoded fills.

## Motion

`transition-colors` for hover/state on interactive elements; `transition` for transforms. Keep durations default and subtle. Respect reduced-motion — avoid large continuous animations.
