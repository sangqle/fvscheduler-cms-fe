# Design Tokens

All visual values come from `src/styles/tokens/`. In `className`, use the **semantic Tailwind class** that maps to the token — never a raw color or palette class.

## Color (semantic — use these class names)

Theme is **dark by default**; light mode is a `.light` / `[data-theme='light']` override. Always use semantic names so both themes work.

| Purpose | Class examples |
|---|---|
| Page / app background | `bg-background`, `text-foreground` |
| Card / surface | `bg-card`, `text-card-foreground` |
| Popover / menu | `bg-popover`, `text-popover-foreground` |
| Brand / primary action | `bg-primary`, `text-primary-foreground`, `ring-primary` |
| Secondary surface | `bg-secondary`, `text-secondary-foreground` |
| Muted / subtle | `bg-muted`, `text-muted-foreground` |
| Accent (hover rows, chips) | `bg-accent`, `text-accent-foreground` |
| Danger / delete | `bg-destructive`, `text-destructive`, `text-destructive-foreground` |
| Warning | `bg-warning`, `text-warning-foreground` |
| Success | `bg-success`, `text-success-foreground` |
| Info | `bg-info`, `text-info-foreground` |
| Borders / inputs | `border-border`, `border-input` |
| Focus ring | `ring-ring` |

**Opacity modifiers are allowed** on tokens: `bg-primary/90`, `bg-primary/5`, `border-primary/30`, `bg-muted/50`. This is the idiomatic way to soften a token (see `Button.tsx`, `CreateBookingModal.tsx`).

**Brand gradient** (marketing/auth surfaces only): `--gradient-primary` (`#FF5A5F → #E341FF → #6A4BFF`). Reference the CSS var, do not inline the hex.

### Forbidden
- `bg-blue-500`, `text-red-600`, `border-gray-200`, any `*-{50..900}` palette class
- `style={{ color: '#fff' }}`, `className="bg-[#1a1a1a]"`, arbitrary hsl/rgb
- Hardcoding theme values that already exist as tokens

## Radius

`--radius-sm` 4px · `--radius` 6px (default `rounded`) · `--radius-md` 8px · `--radius-lg` 10px (cards/panels) · `--radius-xl` 12px · `--radius-2xl` 16px · `--radius-full` pills.
Classes: `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`.

## Spacing

Tailwind spacing scale maps 1:1 to `--space-*` (`0.25rem` step). Use the scale: `gap-1.5`, `gap-2`, `gap-3`, `gap-4`, `p-3`, `px-3 py-2.5`, `mt-2`, `mb-1`. Avoid arbitrary `p-[13px]`.

Common rhythm in this app: card padding `p-3`/`p-4`, row padding `px-3 py-2.5`, vertical stacks `flex flex-col gap-4`, tight clusters `gap-1.5`.

## Shadows

| Token | Class | Use |
|---|---|---|
| `--shadow-xs/sm` | `shadow-sm` | subtle lift |
| `--shadow` / `--shadow-md` | `shadow`, `shadow-md` | hover/raised |
| `--shadow-card` | `shadow-card` | cards |
| `--shadow-modal` | `shadow-modal` | dialogs/popovers |

## Typography

Type scale tokens (px in comments) — prefer the `Heading`/`Text` components, else map sizes:
- Display: `display-2xl` 60 · `display-xl` 48 · `display-lg` 36
- Headings: `h1` 30 · `h2` 24 · `h3` 20 · `h4` 18
- Body: `body-lg` 18 · `body` 16 · `body-sm` 14 · `caption` 12
- Weights: regular 400, medium 500, semibold 600, bold 700
- Leading: tight 1.25, snug 1.375, normal 1.5, relaxed 1.625
- Fonts: `--font-sans` (Geist Sans), `--font-mono` (Geist Mono)

Secondary text → `text-sm text-muted-foreground`; labels/eyebrows → `text-xs font-semibold uppercase tracking-wide text-muted-foreground`; captions/errors → `Text variant="caption"`.

## Locale & Currency

- Money: `formatCurrency(value)` from `src/lib/utils.ts` → Vietnamese Dong `₫`. Never format currency by hand.
- Dates/times: backend sends `timestamptz`; render in `vi-VN`.
- All visible copy is Vietnamese.
