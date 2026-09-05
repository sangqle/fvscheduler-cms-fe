import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// ---- Design-system guardrails ------------------------------------------------
// Keep the app on design tokens (docs/design-system.md). No raw Tailwind palette
// classes and no hardcoded hex in class strings — always go through a token.
const PALETTE =
  '(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const PREFIX =
  '(bg|text|border|ring|ring-offset|from|to|via|fill|stroke|shadow|divide|outline|decoration|accent|caret|placeholder)';
// e.g. bg-blue-500, text-red-600, from-violet-500
const PALETTE_RE = `\\b${PREFIX}-${PALETTE}-(50|100|200|300|400|500|600|700|800|900|950)\\b`;
// e.g. #fff, #B026C6, #1d1d1d80
const HEX_RE = '#[0-9a-fA-F]{3,8}\\b';
// className, wrapperClassName, triggerClassName, dotClassName, …
const CLASSNAME_ATTR = '/^[a-zA-Z]*[Cc]lassName$/';
const CLASSNAME_KEY = '/[Cc]lassName$/';

const PALETTE_MSG =
  'Use design tokens, not raw Tailwind palette classes. e.g. `bg-primary`, `text-muted-foreground`, `border-success`. See docs/design-system.md.';
const HEX_MSG =
  'No hardcoded hex in class strings — use a design token (e.g. `bg-primary`, `text-foreground`) or `hsl(var(--token))` in an arbitrary value. See docs/design-system.md.';

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        // Raw palette classes — anywhere they appear (JSX className, cva/cn args,
        // config objects like features/*/types.ts, template literals).
        { selector: `Literal[value=/${PALETTE_RE}/]`, message: PALETTE_MSG },
        { selector: `TemplateElement[value.raw=/${PALETTE_RE}/]`, message: PALETTE_MSG },
        // Hardcoded hex inside class strings (scoped to className-ish attrs/props so
        // it never flags SVG `fill=`, canvas colors, or `href="#anchor"`).
        {
          selector: `JSXAttribute[name.name=${CLASSNAME_ATTR}] Literal[value=/${HEX_RE}/]`,
          message: HEX_MSG,
        },
        {
          selector: `JSXAttribute[name.name=${CLASSNAME_ATTR}] TemplateElement[value.raw=/${HEX_RE}/]`,
          message: HEX_MSG,
        },
        {
          selector: `Property[key.name=${CLASSNAME_KEY}] Literal[value=/${HEX_RE}/]`,
          message: HEX_MSG,
        },
        {
          selector: `Property[key.name=${CLASSNAME_KEY}] TemplateElement[value.raw=/${HEX_RE}/]`,
          message: HEX_MSG,
        },
      ],
    },
  },
];

export default config;
