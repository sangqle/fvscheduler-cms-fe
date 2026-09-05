/**
 * Design-system CSS guardrail. Colors live as tokens in src/styles/tokens/ (the
 * only place source hex is allowed); everywhere else, compose via hsl(var(--token)).
 * See docs/design-system.md.
 */
export default {
  rules: {
    'color-no-hex': true,
  },
  overrides: [
    {
      // tokens/ is the single source of truth for raw color values (hex → HSL).
      files: ['src/styles/tokens/**/*.css'],
      rules: { 'color-no-hex': null },
    },
  ],
};
