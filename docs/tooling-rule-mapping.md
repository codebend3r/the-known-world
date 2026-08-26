# Lint Rule Mapping: ESLint → Oxlint / Gale

Per FR-1 of the [tooling migration PRD](./tooling-migration-prd.md): every rule
enforced before the migration maps to an Oxlint rule, a Gale rule, or a
documented exception below.

## Previous setup

`eslint.config.mjs` extended exactly two presets, with no custom rules:

- `eslint-config-next/core-web-vitals` — `@next/next` recommended +
  core-web-vitals, `react` recommended subset, `react-hooks`, and a small
  `jsx-a11y` subset (`alt-text`, `aria-props`, `aria-proptypes`,
  `aria-unsupported-elements`, `role-has-required-aria-props`,
  `role-supports-aria-props`)
- `eslint-config-next/typescript` — `typescript-eslint` recommended (non
  type-aware)

There was no Stylelint; SCSS was previously unlinted.

## Mapping

| Previous rule set                | Now                            | Notes                                                                                                   |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `@next/next/*` (core-web-vitals) | Oxlint `nextjs` plugin         | Built-in port of `eslint-plugin-next` rules                                                             |
| `react` recommended subset       | Oxlint `react` plugin          | `react-in-jsx-scope` off — automatic JSX runtime, same as `eslint-config-next`                          |
| `react-hooks/rules-of-hooks`     | `react/rules-of-hooks` (error) | Explicit in `.oxlintrc.json`                                                                            |
| `react-hooks/exhaustive-deps`    | `react/exhaustive-deps` (warn) | Explicit in `.oxlintrc.json`; existing `eslint-disable` comments honored by Oxlint                      |
| `jsx-a11y` subset                | Oxlint `jsx-a11y` plugin       | Full plugin enabled — strictly more coverage than before (see exceptions)                               |
| `typescript-eslint` recommended  | Oxlint `typescript` plugin     | Plus net-new type-aware rules via `oxlint-tsgolint` (`--type-aware`) — coverage the old setup never had |
| — (SCSS unlinted)                | Gale `gale:recommended`        | Net-new coverage; found and fixed 2 duplicate-property bugs and 2 empty blocks on first run             |

## Exceptions

Rules disabled in `.oxlintrc.json`, and why:

| Rule                                                                                     | Reason                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-extra-boolean-cast`                                                                  | Repo convention prefers `!!value` for boolean conversion (`CLAUDE.md`)                                                                                                                                                                                                                                        |
| `react/react-in-jsx-scope`                                                               | Automatic JSX runtime; parity with `eslint-config-next`                                                                                                                                                                                                                                                       |
| `typescript/no-floating-promises`                                                        | Net-new type-aware rule; fires on every `nuqs` setter call — re-enable with a `void` sweep if desired                                                                                                                                                                                                         |
| `typescript/no-misused-spread`                                                           | Net-new type-aware rule; flags deliberate `[...string]` in `lib/portraits.ts`                                                                                                                                                                                                                                 |
| `typescript/unbound-method` (tests only)                                                 | Documented false positive on `expect(mock.method)` in vitest/jest suites                                                                                                                                                                                                                                      |
| `jsx-a11y/no-noninteractive-element-interactions`, `no-noninteractive-tabindex`          | Oxlint does not treat `role="application"` as interactive, so it flags the pan/zoom canvases in `WorldMap`, `MapStage` and `FamilyTreeChart`. Each is focusable, labelled, and handles arrow keys; `application` is the correct role. Not deferred work: enabling these would mean suppressing correct markup |
| `jsx-a11y/no-noninteractive-element-to-interactive-role`, `click-events-have-key-events` | Oxlint has no role allowlist, so `<ul role="listbox">` with `<li role="option">` in `SearchCombobox` is flagged. That is the ARIA combobox pattern, and `eslint-plugin-jsx-a11y` allows `ul`→`listbox` by default. Options are deliberately not focusable; the keyboard lives on the input                    |
| `jsx-a11y/no-static-element-interactions`                                                | Fires on the `onBlur` focus-containment wrapper in `TimelineCluster`. The rule is aimed at click and key handlers on static elements                                                                                                                                                                          |
| `jsx-a11y/prefer-tag-over-role`                                                          | Suggests `<fieldset>`/`<select>`/`<output>` for `role="group"`/`"listbox"`/`"status"`. Most sites are inside an SVG canvas, where those tags are not available                                                                                                                                                |

Rules tuned in `gale.json`, and why:

| Rule                                     | Reason                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `selector-pseudo-class-no-unknown`       | Gale 0.1.5 panics on multibyte chars in this rule (char-boundary bug in `selector_pseudo_class_no_unknown.rs`) — re-enable when fixed upstream |
| `no-descending-specificity`              | Noisy specificity-ordering rule; conflicts with idiomatic `:hover` child-selector patterns                                                     |
| `property-no-vendor-prefix`              | `-webkit-backdrop-filter`, `-webkit-mask-image`, `-webkit-appearance` are required for Safari                                                  |
| `value-keyword-case`                     | Repo uses `Georgia`, `currentColor` casing                                                                                                     |
| `shorthand-property-no-redundant-values` | Stylistic; deferred per PRD goal 6                                                                                                             |
| `property-no-unknown`                    | Kept on, with `corner-shape` allowed (CSS Borders L4, not yet in Gale's property DB)                                                           |

`block-no-empty` stays on; the intentional empty marker classes in
`components/listSearch.module.scss` carry `stylelint-disable-next-line`
comments explaining themselves.
