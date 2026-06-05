# CLAUDE.md

Operating rules for this repo. The README covers stack, layout, and routes; this file is conventions only.

## Workflow

- Work directly on `main`. Don't create branches unless explicitly asked.
- Auto-commit each logical change without asking. Subject must start with `TKW:` (see the `tkw-commit-format` skill).

## Tooling

- All scripts run through Bun: `bun install`, `bun dev`, `bun run test`, `bun run build`, `bun run lint`. Never invoke npm or yarn.
- Pin every `package.json` dependency to an exact version, with no `^` or `~`.

## Architecture

- The site is a fully static export (`output: 'export'`). No server actions, no route handlers, no dynamic rendering: every route must pre-render at build time.
- Each component lives in its own folder under `components/`, with its `*.tsx`, `*.module.scss`, and `*.test.tsx` co-located (e.g. `components/SiteHeader/SiteHeader.tsx`, `components/SiteHeader/SiteHeader.module.scss`, `components/SiteHeader/SiteHeader.test.tsx`). Each folder also contains an `index.ts` that re-exports the component (`export * from "@/components/SiteHeader/SiteHeader";`) so consumers can keep importing from `@/components/SiteHeader`. Page-owned styles follow the same co-location rule (`app/houses/[slug]/page.module.scss` next to its `page.tsx`).
- Styles are SCSS modules (`*.module.scss`) compiled by Next.js's built-in Sass support (the `sass` devDependency). The only global stylesheet is `styles/globals.scss` (resets, CSS custom properties, `html`/`body`/`h1-h3` rules, and the `.subtitle` typographic primitive). No Tailwind, no CSS-in-JS: preserve the parchment aesthetic.
- Class names inside modules are `camelCase` — no BEM. Drop the redundant `block__element--modifier` because the file scope already isolates them. Compose multiple classes with `lib/cx.ts`; do not add `clsx`.
- Cross-module styling is done by passing a `className` prop to the child component (e.g. `<Sigil className={styles.sigilFill} />`), never by reaching into another module's class names from a selector.
- The four `Filtered*List` components share `components/listSearch.module.scss` at the `components/` root for the search + pagination apparatus they all render. Shared SCSS modules that don't belong to any single component live at the `components/` root rather than inside one component's folder. When adding genuinely shared styles, prefer a single shared module imported by every consumer over duplicating rules; reserve `globals.scss` for design tokens and true typographic primitives.
- Never use `margin` for layout spacing. Prefer `display: grid` with `gap` and `padding`. Only reach for `margin` when there is genuinely no other option.
- Never use `grid-column: 1 / -1` (or other `1 / -1` line shortcuts) to span a child across columns. Declare `grid-template-areas` on the parent alongside `grid-template-columns` and use a named `grid-area` on the child, so the grid's shape is readable from the parent rule.
- All in-repo imports use the `@/` alias (`@/components/Sigil`, `@/lib/schemas`, `@/components/SiteHeader/SiteHeader.module.scss`) — never relative paths like `./Foo` or `../package.json`. Component consumers import from the folder (`@/components/Sigil`) and let the folder's `index.ts` resolve to the implementation file; only intra-folder asset imports (a component's own SCSS module) name the file explicitly. Applies to source, tests, and SCSS-module imports alike. Third-party imports (`next/link`, `react`, etc.) stay bare.

## Code style

- Prefer `reduce` over `for` loops when possible. Never use `for/in` or `for/of` loops; reach for `Array.prototype` methods (`map`, `filter`, `reduce`, `flatMap`, etc.) when the value is an array.
- Prefer double-bang (`!!value`) for boolean conversion.
- Prefer optional chaining (`?.`). When optional chaining is used, ALWAYS pair it with nullish coalescing (`??`) to supply a fallback.
- Prefer a single configurable object parameter over multiple positional parameters so argument order doesn't matter. Don't: `doSomething(foo, bar, hello)`. Do: `doSomething({ foo, bar, hello })`.

## Content + tests

- All markdown frontmatter in `content/` must validate against the Zod schemas in `lib/schemas.ts`. Cross-references between entries are by slug.
- Tests are co-located: `lib/foo.ts` ↔ `lib/foo.test.ts`, `components/Foo/Foo.tsx` ↔ `components/Foo/Foo.test.tsx`.

## Specs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Check them before extending an existing feature.

## Commits

- Create a commit after every discrete change; do not batch.
- Subject must start with `TKW:` followed by a short title (e.g., `TKW: a short title`).
- Favor bullet points in the body. Keep it concise and easy to read.
