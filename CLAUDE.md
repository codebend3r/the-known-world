# CLAUDE.md

Operating rules for this repo.

## Workflow

- Do not commit anything until I tell you to. Finishing a change is not permission to commit it.
- Do not push anything until I tell you to. Once I have told you to commit on a branch that already tracks a remote, push it in the same step — don't ask again.
- Do not merge anything until I tell you to.
- Do not create a PR until I tell you to.
- Do not create a branch until I tell you to.
- Branch names are flat. Never put a branch in a folder — no `feature/`, `fix/`, `bug/`, or any other prefix folder, and no slashes anywhere in the name.
- Branch names are kebab-case and 1 to 5 words, describing what the branch is for: `sigil-integrity`, `broken-house-links`, `skills-cleanup`. See the `tkw-git-branch-naming` skill.

## Tooling

- All scripts run through Bun. Never invoke npm or yarn.
- The scripts that exist: `bun install`, `bun dev`, `bun run build`, `bun run test`, `bun run typecheck`, `bun run lint:ts`, `bun run lint:css`, `bun run format:check`, `bun run check` (typecheck + both lints + test in parallel). There is no `bun run lint`.
- Pin every `package.json` dependency to an exact version, with no `^` or `~`.
- Keep `typescript` on 6.x. TypeScript 7 / `tsgo` as the compiler is not yet compatible with this Next version; `tsgo` is only used for the fast `typecheck` script.

## Typescript

- Use type guards wherever possible.
- Never use `any` types; prefer type narrowing or type guards
- Never under any circumstance cast types and never double cast: `as any as string`
- If type can't be inferred and type narrowing is not an option, use `unknown` types

## CSS

- Use SCSS modules (`*.module.scss`) for component styles
- Import `*.module.scss` through the `@/` alias, never a relative path. The `react-ts-css` editor extension flags aliased imports as unresolved — that is a tooling bug to fix in tooling, not a reason to relativize the import
- Only use global stylesheets (`styles/globals.scss`) for design tokens and true typographic primitives
- Use a container driven approach: the container defines width and height, the children position themselves within it. Moving a child to a different container may lay it out differently, because the container specifies the layout
- Prefer CSS display grid for layout, with the gap property for spacing between grid items; avoid using margins for spacing
- Second preferred display value is flex
- Place grid children with named `grid-template-areas` and `grid-area: <name>`. Never use positional line spans like `grid-area: 1 / -1`
- Avoid plain divs, meaning divs with no class or id defined
- Always use token values from `styles/globals.scss` when defining font sizes, colors, and other design tokens like padding, margin, gap, and border radius

## Code style

- Prefer `reduce` over `for` loops when possible. Never use `for/in` or `for/of` loops; reach for `Array.prototype` methods (`map`, `filter`, `reduce`, `flatMap`, etc.) when the value is an array.
- Prefer double-bang (`!!value`) for boolean conversion.
- Prefer optional chaining (`?.`). When optional chaining is used, ALWAYS pair it with nullish coalescing (`??`) to supply a fallback.
- Prefer a single configurable object parameter over multiple positional parameters so argument order doesn't matter. Don't: `doSomething(foo, bar, hello)`. Do: `doSomething({ foo, bar, hello })`.
- Don't write comments that restate what the code already says. Comment only a non-obvious _why_ — a workaround, a constraint, a gotcha.

## Content + tests

- All markdown frontmatter in `content/` must validate against the Zod schemas in `lib/schemas.ts`. Cross-references between entries are by slug.
- Tests are co-located: `lib/foo.ts` ↔ `lib/foo.test.ts`, `components/Foo/Foo.tsx` ↔ `components/Foo/Foo.test.tsx`.

## Specs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Check them before extending an existing feature.

## Skills

Repo-specific agent skills live in `.claude/skills/`, grouped by prefix — `tkw-git-*` (branch names, commit and PR format), `tkw-content-*` (populating `content/` entries), `tkw-sigil-*` (sigil resolution and drift). See `.claude/skills/README.md` for the index.

## Commits and pull requests

- Scope each commit to one logical change; batch only closely related changes. This governs how you _slice_ the work — it is not permission to commit, which is covered under Workflow above.
- Commit subjects and PR titles must both start with `TKW:` followed by a short title (e.g. `TKW: a short title`).
- Favor bullet points in commit bodies and PR descriptions. Keep them concise and easy to scan.
- Never mention any AI tool or agent in a commit message or PR — no `Co-Authored-By` trailer, no "Generated with" footer.
- The full rules live in the `tkw-git-commit-and-pr-format` skill.
