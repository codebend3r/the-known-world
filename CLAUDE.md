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
- Styles are hand-written CSS in `styles/`. No Tailwind, no CSS-in-JS: preserve the parchment aesthetic.
- Never use `margin` for layout spacing. Prefer `display: grid` with `gap` and `padding`. Only reach for `margin` when there is genuinely no other option.

## Content + tests

- All markdown frontmatter in `content/` must validate against the Zod schemas in `lib/schemas.ts`. Cross-references between entries are by slug.
- Tests are co-located: `lib/foo.ts` ↔ `lib/foo.test.ts`, `components/Foo.tsx` ↔ `components/Foo.test.tsx`.

## Specs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Check them before extending an existing feature.
