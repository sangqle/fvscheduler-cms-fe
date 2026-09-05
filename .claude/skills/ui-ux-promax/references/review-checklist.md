# UI/UX Review Checklist

Run before declaring any UI work done. Fix every failing item.

## Primitives & structure (check this first)
- [ ] Every visual element maps to a `src/components/ui/` primitive — no hand-rolled `<button>`, `<input>`, `<table>`, or `rounded-… border-border bg-card` surface where `Button`/`Input`/`DataTable`/`Card` exists.
- [ ] Nothing new was styled inline that should have been a **new primitive or a new `variant`** (would a second screen want this look? then it belongs in `src/components/ui/`).
- [ ] **No sizing classes on a primitive**: no `h-*`, `min-h-*`, `px-*`, `py-*`, `rounded-*`, `text-[Npx]` passed to `Button`/`Input`/`Textarea`/`SelectNative`/`Combobox`/`CurrencyInput`/`Badge`. Height and shape come from `size=`.
  ```bash
  grep -nE '<(Button|Input|Textarea|SelectNative|Combobox|CurrencyInput|Badge)\b[^>]*className="[^"]*\b(h|min-h|px|py|rounded|text)-' <changed files>
  ```
  Any hit must be justified: a bare `h-N` puts the control off the 32/36/40/44 scale, where no design-system change can reach it. Need 44px → `size="lg"`. A bare `text-*` on a field is worse — it can't cross `FIELD_FONT`'s `sm:` step, so it only wins below 640px, and it drops phone text under the 16px iOS-zoom floor.
- [ ] No color classes on a primitive that a `variant` already provides.
- [ ] `className` on primitives is layout only (`w-full`, `flex-1`, `mt-*`, `gap-*`, `shrink-0`, `truncate`, `col-span-*`).
- [ ] Radius/shadow/spacing from the scale (`rounded-lg`, `shadow-card`, `gap-4`, `px-3 py-2.5`) — no arbitrary `p-[13px]`.
- [ ] Consistent with existing screens (cards, rows, headers match the app's rhythm).

## Mockup translation (if a claude.ai/design or Figma reference was used)
- [ ] No className pasted from the mockup — every value was translated to a token / `size` / `variant`.
- [ ] Mockup hex → semantic token; mockup px heights → `size` prop; mockup `<div>` surfaces → `<Card>`.
- [ ] Copy is Vietnamese and currency/dates were re-localised (mockups often ship `$` / `en-US`).
- [ ] Layout is mobile-first, not the mockup's fixed desktop width.

## Tokens & color
- [ ] No hex/rgb/hsl in `className` or `style` (search changed files for `#`, `rgb(`, `hsl(`).
- [ ] No raw palette classes (`bg-blue-500`, `text-red-600`, any `*-{50..900}`).
- [ ] Colors use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, …); softening via `/opacity` only.
- [ ] Works in both dark (default) and light themes — nothing assumes a fixed background.

## Hierarchy & layout
- [ ] Exactly one primary action; secondary actions are `outline`/`ghost`.
- [ ] Clear heading → body → meta hierarchy; secondary text is `text-muted-foreground`.
- [ ] Aligned, balanced spacing; numeric/currency right-aligned in tables.

## States
- [ ] Loading (`Spinner`/`Skeleton`), empty (centered + CTA), and error (`Alert`/destructive) states present.
- [ ] Submitting/disabled handled (spinner + disabled).
- [ ] Selected/active state visually distinct.

## Content & locale
- [ ] All user-facing copy is Vietnamese.
- [ ] Currency via `formatCurrency()` (₫); no manual formatting.
- [ ] Dates/times rendered in `vi-VN`.

## Accessibility
- [ ] Keyboard reachable; visible `focus-visible` ring (`ring-ring`).
- [ ] Inputs have associated `Label`; icon-only buttons have `aria-label`/`title`.
- [ ] Text contrast ≥ 4.5:1 against its surface.
- [ ] Control heights come off the 32/36/40/44 scale and **match across a row** — no control 4px taller than its neighbour, and no phone-only `sm:` height step.

## Responsive & motion
- [ ] Mobile-first; multi-column grids collapse (`grid-cols-1 md:grid-cols-2`).
- [ ] No horizontal overflow; long text uses `truncate`/wrapping.
- [ ] Transitions are subtle (`transition-colors`); no jarring motion.

## Final
- [ ] `npx eslint src` and `npx tsc --noEmit` pass (`npm run lint` is broken on Next 16); `npm run lint:ds` for the design-system guardrails.
- [ ] Diff contains only intended changes.
