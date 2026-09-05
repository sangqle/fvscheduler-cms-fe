---
name: ui-ux-promax
description: 'Pro-level UI/UX workflow for the framevis-admin design system. USE WHEN building, styling, refactoring, or reviewing any React/Tailwind UI — pages, modals, forms, tables, cards, buttons, badges, empty/loading/error states, responsive layouts, accessibility, or motion — and WHENEVER implementing a design/mockup from claude.ai/design, Figma, or pasted HTML. Enforces base components from src/components/ui/ over hand-written Tailwind (size/variant props, never h-*/px-*/color classes on a primitive), design tokens (no hardcoded colors), Tailwind v4, Vietnamese (vi-VN) locale, and ₫ currency. Triggers: "build a screen", "implement this design", "làm theo mockup", "style this component", "make it look better", "polish the UI", "fix spacing/contrast", "review my UI", "accessibility", "responsive layout".'
argument-hint: 'Describe the screen/component to build or review (e.g. "polish the booking detail panel")'
---

# UI/UX Pro Max — framevis-admin

A repeatable workflow for producing **consistent, accessible, token-driven UI** in this studio ERP. The codebase has a strict design system: a dark-default theme expressed entirely through CSS variables, shadcn/ui primitives in `src/components/ui/`, Tailwind v4, and Vietnamese-locale formatting. This skill encodes that system so every screen looks like it belongs.

## When to Use

- Building a new page, panel, modal, form, table, or card
- Styling or restyling an existing component
- "Make it look better / more polished / more premium"
- Fixing spacing, hierarchy, contrast, or alignment
- Adding empty / loading / error / disabled states
- Responsive and accessibility passes
- Reviewing a diff for design-system compliance

## Non-Negotiable Rules

1. **Base component first — always.** Before writing a single line of markup, find the primitive in `src/components/ui/` that already does this (`ls src/components/ui/` if unsure). Feature components **compose**; they don't style. If nothing fits, **add or extend a primitive** — a new look is a new `variant`/`size` in its `cva`, never a `className` string living in a feature file. See [component-inventory.md](./references/component-inventory.md).
2. **Size & shape via props, never `className`.** `size="sm|md|lg"` + `variant="…"` drive height, padding, radius, type scale. Heights are flat — 32px (`sm`, `icon-sm`) · 36px (`md`) · 40px (`icon`) · 44px (`lg`) — the same at every width, so a control's size is a design-system decision, not a feature's. Never pass `h-*`, `min-h-*`, `px-*`, `rounded-*`, `text-[Npx]` to re-size a primitive. **Fonts on fields are still a `sm:` pair** (`FIELD_FONT` = `text-base sm:text-sm`, a 16px floor so iOS Safari doesn't auto-zoom): `tailwind-merge` treats `text-sm` and `sm:text-sm` as different keys, so a bare `text-sm` **wins on phone and loses from 640px up** — and brings the zoom back. `className` on a primitive is for **layout only** (`w-full`, `flex-1`, `mt-4`, `gap-2`, `shrink-0`, `truncate`, `col-span-2`). Source of truth: `src/components/ui/field-size.ts`.
3. **No raw colors.** Never write hex/rgb/hsl in `className` or `style`. Never use raw palette classes (`bg-blue-500`, `text-red-600`). Use only semantic token classes — `bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive`, etc. See [design-tokens.md](./references/design-tokens.md).
4. **Mockups are references, not source.** Anything from claude.ai/design (or Figma, or a pasted HTML snippet) ships raw hex, raw px, and hand-rolled markup. **Translate it** — never paste its classNames into `src/`. See [Translating a mockup](#translating-a-mockup) below.
5. **Tokens for everything visual.** Color, radius (`rounded`, `rounded-lg`), spacing (Tailwind scale = spacing tokens), shadow (`shadow-card`, `shadow-modal`), and type scale all come from `src/styles/tokens/`.
6. **Vietnamese UI.** All user-facing copy is Vietnamese. Currency via `formatCurrency()` (₫). Dates/times in `vi-VN`, from backend `timestamptz`.
7. **Accessible by default.** Keyboard reachable, visible `focus-visible` ring, labelled controls, ≥ 4.5:1 text contrast, `aria-*` on icon-only buttons.

### Banned in a feature component's `className`

| Banned | Why | Do instead |
|---|---|---|
| `h-10`, `h-11`, `min-h-9` on a primitive | a size the design system can no longer change; drifts off the 32/36/40/44 scale | `size="sm\|md\|lg"` |
| `text-[13px]`, `text-sm` to resize a field | same breakpoint trap; also skips the 16px iOS-zoom floor | `size=` |
| `px-4`, `rounded-md` on a primitive | drifts from the shared field shape | `size=` |
| `bg-*`, `text-*`, `border-*` colors on a primitive | that's what `variant` is for | `variant=` (or add one) |
| a hand-rolled `<button className="…">` | no focus ring, no disabled state, off the height scale | `<Button variant="ghost" size="icon-sm">` |
| `<div className="rounded-xl border … bg-card">` | duplicate surface that won't follow a DS change | `<Card>` |

Exception: a genuinely one-off **layout** tweak (`w-full`, `flex-1`, margins, grid placement) is fine — that's not styling.

## Workflow

### 1. Frame the screen
Identify the layout archetype (list, detail panel, multi-step modal, dashboard, form). Decide the **visual hierarchy**: one primary action, supporting actions as `outline`/`ghost`, destructive as `destructive`. Sketch the section order before writing markup.

### 2. Take inventory (do this before typing markup)
List every visual element the screen needs, then map each to an existing primitive — `ls src/components/ui/` and check [component-inventory.md](./references/component-inventory.md). Only after that mapping is complete do you know what actually has to be built.

For each element the map leaves empty, decide **explicitly**:
- **Extend a primitive** — the element is a variation of something we have (a new `variant`/`size` in its `cva`). Preferred.
- **New primitive in `src/components/ui/`** — it'll be used more than once, or it's a shared shape (a row, a chip, a picker).
- **Local markup** — genuinely one-off *layout*, no reusable visual identity. Rare; still tokens-only.

State which of the three you picked and why. "I'll just style it here for now" is not one of the three.

### 3. Build with primitives + props
- Pull components from `src/components/ui/`. Drive appearance with **props** (`variant`, `size`); use `className` only for layout (`w-full`, `flex-1`, `mt-4`, `gap-2`, `col-span-2`).
- Layout with flex/grid and the spacing scale (`gap-2`, `gap-4`, `p-3`, `px-3 py-2.5`). Surfaces are `<Card>`; borders `border-border`.
- Typography: `Heading` / `Text` (with `muted`), not hand-tuned `text-[Npx] font-…` stacks.
- Follow the recipes in [component-patterns.md](./references/component-patterns.md).

<a id="translating-a-mockup"></a>
### 3b. Translating a mockup (claude.ai/design, Figma, pasted HTML)
Mockups encode the *intent*, not the implementation. Never copy their classNames. Translate line by line:

| Mockup ships | Becomes |
|---|---|
| `#B026C6`, `rgb(…)`, `bg-violet-600` | the semantic token — `bg-primary`, `text-muted-foreground`, `border-success` (tra `docs/design-system.md`) |
| `h-[44px] px-5 rounded-lg text-[15px]` on a button | `<Button size="lg">` |
| `h-9 px-3 text-[13px]` on an input | `<Input size="sm">` |
| `<div class="rounded-xl border bg-white shadow p-6">` | `<Card>` + `<CardHeader>/<CardContent>` |
| `<button class="…">` / `<input class="…">` | `<Button>` / `<Input>` |
| a bespoke pill / status dot | `<Badge variant>` / `<StatusPill>` / `<PositionChip>` |
| a desktop-only fixed layout | mobile-first base + `sm:`/`md:`/`lg:` steps |
| hardcoded `$`/`en-US` dates | `formatCurrency()` (₫) + `vi-VN` |

If the mockup shows something with **no** primitive equivalent, that's a signal to add a primitive — not a licence to inline its CSS. Pixel-matching a mockup is never a reason to break rules 1–3; if a value truly can't be expressed in the system, raise it and get a token/variant added.

### 4. Handle every state
A "pro max" screen always covers: **loading** (`Spinner`/`Skeleton`), **empty** (`EmptyState`, or centered muted message + primary CTA), **error** (`Alert`/`destructive` text), **disabled/submitting** (opacity + spinner), and **success/active** highlighting. Never ship only the happy path.

### 5. Responsive + motion
Mobile-first. Use `grid-cols-1 md:grid-cols-2`, collapse side panels. Controls do **not** grow on phone — one height at every width (32/36/40/44px). Making a phone control 4px taller than its neighbour buys nothing and reads as a bug; when an action deserves more room on phone, give it `size="lg"` + `w-full`, not a bespoke height. Use `transition-colors`/`transition` for hover and state changes — subtle, never flashy.

### 6. Review before done
Run the [review-checklist.md](./references/review-checklist.md). If any item fails, fix it before declaring the work complete. Two greps over the changed files:

```bash
# raw colors
grep -nE '#[0-9a-fA-F]{3,8}|rgb\(|hsl\(|-(50|100|200|300|400|500|600|700|800|900|950)\b' <files>
# primitives being re-sized by className (the sm:-breakpoint trap)
grep -nE '<(Button|Input|Textarea|SelectNative|Combobox|Badge)\b[^>]*className="[^"]*\b(h|min-h|px|py|rounded|text)-' <files>
```
Then `npm run lint` and `npm run typecheck`.

## Quick Reference

| Need | Use |
|------|-----|
| Primary action | `<Button>` (default variant) |
| Secondary / cancel | `<Button variant="outline">` / `"ghost"` |
| Dangerous action | `<Button variant="destructive">` + `ConfirmDialog` |
| Icon-only action | `<Button variant="ghost" size="icon-sm" aria-label="…">` |
| Permission-gated action | `<PermissionButton>` |
| Status label | `<Badge variant="…">` / `<StatusPill>` / `<PositionChip>` |
| Money | `formatCurrency(amount)` → `₫`; money input → `<CurrencyInput>` |
| Surface / panel | `<Card>` (+ `CardHeader`/`CardContent`/`CardFooter`) |
| Modal | `<Dialog>` family; side panel `<SlideOver>`; phone sheet `<BottomSheet>` |
| Tabular data | `<DataTable>` (pass `mobileCards`) |
| Searchable select | `<Combobox>`; native → `<SelectNative>` |
| Text | `<Heading level>` / `<Text variant muted>` |
| Loading | `<Spinner>` / `<Skeleton>` |
| Empty | `<EmptyState>` |
| Inline feedback | `<Alert>` / `text-destructive` caption |

Full list: `ls src/components/ui/` — and [component-inventory.md](./references/component-inventory.md) for the sizing/variant APIs.

Load the reference files only when you need their detail — keep context lean.
