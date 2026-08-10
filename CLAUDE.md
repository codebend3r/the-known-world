# CLAUDE.md

Operating rules for this repo.

## Workflow

- Do not commit anything until I tell you to. Finishing a change is not permission to commit it.
- Do not push anything until I tell you to. Once I have told you to commit on a branch that already tracks a remote, push it in the same step — don't ask again.
- Do not merge anything until I tell you to.
- Do not create a PR until I tell you to.

## Branching

- Do not create a branch until I tell you to.
- Branch names are flat. Never put a branch in a folder — no `feature/`, `fix/`, `bug/`, or any other prefix folder, and no slashes anywhere in the name.
- Branch names are kebab-case and 1 to 5 words, describing what the branch is for: `sigil-integrity`, `broken-house-links`, `skills-cleanup`. See the `git-branch-naming` skill.

## Commits and pull requests

- Scope each commit to one logical change; batch only closely related changes. This governs how you _slice_ the work — it is not permission to commit, which is covered under Workflow above.
- Commit subjects and PR titles must both start with `TKW:` followed by a short title (e.g. `TKW: a short title`).
- Favor bullet points in commit bodies and PR descriptions. Keep them concise and easy to scan.
- Never mention any AI tool or agent in a commit message or PR — no `Co-Authored-By` trailer, no "Generated with" footer.
- A husky pre-commit hook runs `format:check`, `typecheck`, both lints, and `test`; a commit fails if any of them do.
- The full rules live in the `git-commit-and-pr-format` skill.

## Tooling

- All scripts run through Bun. Never invoke npm or yarn.
- The scripts that exist:
  - Run: `bun install`, `bun dev` (port 46642), `bun run build`, `bun run start`, `bun run clean`
  - Verify: `bun run test`, `bun run typecheck`, `bun run lint:ts`, `bun run lint:css`, `bun run format:check`
  - Fix: `bun run lint:ts:fix`, `bun run lint:css:fix`, `bun run format`
  - Watch: `bun run test:watch`, `bun run coverage`
  - Batch: `bun run check` (typecheck + both lints + test in parallel), `bun run system-check` (clean + format:check + check + build)
- There is no `bun run lint`.
- Pin every `package.json` dependency to an exact version, with no `^` or `~`.
- Keep `typescript` on 6.x. TypeScript 7 / `tsgo` as the compiler is not yet compatible with this Next version; `tsgo` is only used for the fast `typecheck` script.

## TypeScript

- Use type guards wherever possible.
- Never use `any` types; prefer type narrowing or type guards.
- Never under any circumstance cast types and never double cast: `as any as string`.
- If a type can't be inferred and type narrowing is not an option, use `unknown` types.
- Model alternatives as discriminated unions so invalid states are unrepresentable. Switch on the discriminant and exhaustiveness-check the `default` case by assigning to `never`.
- No enums. Use `as const` arrays or objects and derive the union from them: `(typeof X)[number]`, `keyof typeof X`.
- Prefer `type` aliases over `interface`. Reach for `interface` only when declaration merging is genuinely required.
- Use `as const satisfies <Type>` to check a literal value against a type without widening it.
- Derive types from their single source of truth instead of writing a parallel shape by hand — `z.infer` for schemas, `typeof` for values.
- Never use a non-null assertion (`!`) outside a test file; narrow the value or fail explicitly instead.
- Never `@ts-ignore`. If a suppression is truly unavoidable, use `@ts-expect-error` with a reason on the same line.
- Validate untrusted data — frontmatter, route params, fetch responses — with a Zod schema at the boundary. Code past the boundary trusts the inferred types; it does not re-check.

## Code style

- Prefer `reduce` over `for` loops when possible. Never use `for/in` or `for/of` loops; reach for `Array.prototype` methods (`map`, `filter`, `reduce`, `flatMap`, etc.) when the value is an array.
- Prefer double-bang (`!!value`) for boolean conversion.
- Prefer optional chaining (`?.`). When optional chaining is used, ALWAYS pair it with nullish coalescing (`??`) to supply a fallback.
- Prefer a single configurable object parameter over multiple positional parameters so argument order doesn't matter. Don't: `doSomething(foo, bar, hello)`. Do: `doSomething({ foo, bar, hello })`.
- Don't write comments that restate what the code already says. Comment only a non-obvious _why_ — a workaround, a constraint, a gotcha.
- Return early with guard clauses instead of nesting; don't write `else` after a branch that returns.
- `const` by default. Use `let` only when reassignment is required; never `var`.
- Don't mutate inputs or shared values. Prefer the non-mutating operations: spread, `toSorted`, `toReversed`, `with`.
- Use `??` for defaults, not `||`, unless coercing every falsy value is the actual intent.
- Never leave a promise floating: `await` it or handle rejection explicitly. The linter does not catch this (`no-floating-promises` is off), so it is on you.
- Throw only `Error` instances (or subclasses) — never strings or plain objects.
- Prefer named exports. Default exports only where Next.js requires them (`page.tsx`, `layout.tsx`, and the other route files).
- Name booleans as predicates: `is`, `has`, `should`, `can`.

## CSS

- Use SCSS modules (`*.module.scss`) for component styles.
- Import `*.module.scss` through the `@/` alias, never a relative path. The `react-ts-css` editor extension flags aliased imports as unresolved — that is a tooling bug to fix in tooling, not a reason to relativize the import.
- The global stylesheets are `styles/globals.scss` (design tokens, resets, typographic primitives) and `styles/_breakpoints.scss` (breakpoint thresholds). Everything else belongs in a component module.
- Use a container driven approach: the container defines the child's available width and height, padding and spacing between children, the children only care about their content. Moving a child to a different container may lay it out differently, because the container specifies the layout.
- Prefer CSS display grid for layout, with the gap property for spacing between grid items; avoid margins for spacing at all cost. This includes prose: a rendered-markdown container is a grid too — element margins stay zeroed and gap sets the rhythm between blocks.
- Use grid when the container defines the tracks; use flex for one-dimensional, content-sized runs — toolbars, inline rows, baseline alignment.
- In fixed regional layouts, place grid children with named `grid-template-areas` and `grid-area: <name>`; never positional line spans like `grid-area: 1 / -1`. Auto-placed collections (`repeat(auto-fill, ...)`, `grid-auto-flow`) are exempt — dynamic children can't be named. For overlays, give multiple children the same named area.
- Reach for a semantic element (`nav`, `section`, `ul`, `button`) before a `div`. A `div` is a styling hook of last resort — give it a class, and style by class, never by `id`.
- Colors, fonts, font sizes, line heights, letter spacing, border radius, and transitions come from the tokens in `styles/globals.scss` (`--tkw-*`, `--font-*`, `--fs-*`, `--lh-*`, `--ls-*`). Never hardcode a literal where a token exists; if none fits, extend the scale in `globals.scss` instead of inlining a value. There is no spacing scale yet — gap and padding are judgment calls until one lands.
- Responsive styles are desktop-first through `styles/_breakpoints.scss`: `@use "breakpoints" as bp;` then `@media (max-width: bp.$md)`. Never hardcode a breakpoint value.
- Guard every animation and transition with `@media (prefers-reduced-motion: reduce)`.
- `:global()` is an escape hatch, not a tool — avoid it, and comment the _why_ on the rare occasion it is unavoidable.

## Content + tests

- All markdown frontmatter in `content/` must validate against the Zod schemas in `lib/schemas.ts`. Cross-references between entries are by slug.
- Tests are co-located: `lib/foo.ts` ↔ `lib/foo.test.ts`, `components/Foo/Foo.tsx` ↔ `components/Foo/Foo.test.tsx`.
