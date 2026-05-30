# CLAUDE.md

Operating rules for this repo. The README covers stack, layout, and routes; this file is conventions only.

## Workflow

- Work directly on `main`. Don't create branches unless explicitly asked.
- Auto-commit each logical change without asking. Subject must start with `GOTA:` (see the `gota-commit-format` skill).
- Run `bun run test` before committing (this invokes `vitest run`; `bun test` uses Bun's built-in runner, which is not configured for this repo's jsdom-based component tests and reports false failures).

## Tooling

- All scripts run through Bun: `bun install`, `bun dev`, `bun run test`, `bun run build`, `bun run lint`. Never invoke npm or yarn.
- Pin every `package.json` dependency to an exact version, with no `^` or `~`.

## Architecture

- The site is a fully static export (`output: 'export'`). No server actions, no route handlers, no dynamic rendering: every route must pre-render at build time.
- Styles are CSS modules co-located with the component or page that owns them (`components/SiteHeader.module.css` next to `components/SiteHeader.tsx`; `app/houses/[slug]/page.module.css` next to its `page.tsx`). The only global stylesheet is `styles/globals.css` (resets, CSS custom properties, `html`/`body`/`h1-h3` rules, and the `.subtitle` typographic primitive). No Tailwind, no CSS-in-JS: preserve the parchment aesthetic.
- Class names inside modules are `camelCase` — no BEM. Drop the redundant `block__element--modifier` because the file scope already isolates them. Compose multiple classes with `lib/cx.ts`; do not add `clsx`.
- Cross-module styling is done by passing a `className` prop to the child component (e.g. `<Sigil className={styles.sigilFill} />`), never by reaching into another module's class names from a selector.
- Two filtered list components share `components/listSearch.module.css` for the search + pagination apparatus they both render. When adding genuinely shared styles, prefer a single shared module imported by both consumers over duplicating rules; reserve `globals.css` for design tokens and true typographic primitives.
- Never use `margin` for layout spacing. Prefer `display: grid` with `gap` and `padding`. Only reach for `margin` when there is genuinely no other option.
- Never use `grid-column: 1 / -1` (or other `1 / -1` line shortcuts) to span a child across columns. Declare `grid-template-areas` on the parent alongside `grid-template-columns` and use a named `grid-area` on the child, so the grid's shape is readable from the parent rule.
- All in-repo imports use the `@/` alias (`@/components/Sigil`, `@/lib/schemas`, `@/components/SiteHeader.module.css`) — never relative paths like `./Foo` or `../package.json`. Applies to source, tests, and CSS-module imports alike. Third-party imports (`next/link`, `react`, etc.) stay bare.

## Content + tests

- All markdown frontmatter in `content/` must validate against the Zod schemas in `lib/schemas.ts`. Cross-references between entries are by slug.
- Tests are co-located: `lib/foo.ts` ↔ `lib/foo.test.ts`, `components/Foo.tsx` ↔ `components/Foo.test.tsx`.

## Specs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Check them before extending an existing feature.
