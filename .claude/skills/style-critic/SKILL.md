---
name: style-critic
description: Use when SCSS/CSS is the subject of review or authoring in this repo. Triggers include "audit the CSS", "review the styles", "run style-critic", "is this stylesheet compliant", "check the CSS conventions", any new or edited `*.module.scss`, a diff touching `styles/`, a hardcoded color / font size / border radius, a `margin` appearing in a stylesheet, an unguarded `transition` or `animation`, a `:global()` without a comment, or before shipping any component's styles.
---

# Style Critic

## Overview

Enforces the **CSS section of `CLAUDE.md`** — the twelve conventions are the
source of truth; this skill is how they get checked. `gale` lints SCSS syntax,
but nothing in the toolchain enforces the conventions themselves: tokens over
literals, gap over margins, named areas, reduced-motion guards. Convention held
only by review drifts, so this skill makes every rule mechanically checkable
where possible and names the judgment calls where not.

**Violating the letter of the rules is violating the spirit of the rules.**

Measured baseline when this skill was written (48 SCSS files):

- **clean**: module-only styles, aliased imports, two global stylesheets, zero
  positional grid placement, zero `id` selectors, zero hardcoded breakpoints,
  all 26 motion files guarded, both `:global()` uses commented
- **debt**: 136 non-token `font-size`, 49 non-token `border-radius`, 68
  non-token `line-height`/`letter-spacing`, 32 hardcoded colors, 6 margins
  (four of them `margin: 0 auto` centerings)

## The rules and their checks

Run every check from the repo root. A rule is **clean** when its check prints
nothing (or the stated expected output). Read every flagged line before calling
it a violation — greps find candidates, the critic renders the verdict.

### R1 — component styles live in `*.module.scss`

```bash
find components app lib -name "*.scss" ! -name "*.module.scss"
```

Expected: empty.

### R2 — modules imported through `@/`, never relatively

```bash
grep -rn "import.*module\.scss" components app --include="*.tsx" | grep -v "@/"
```

Expected: empty. The `react-ts-css` extension flagging aliased imports is a
tooling bug — never "fix" it by relativizing the import.

### R3 — exactly two global stylesheets

```bash
ls styles/
```

Expected: `_breakpoints.scss` and `globals.scss`, nothing else. New global
files need a CLAUDE.md change first.

### R4 — container-driven sizing (judgment)

No grep catches this. When reviewing a module, check the component's root
class: it must not set its own external width to suit one parent, and must not
carry outer margins. The container defines available width and height, padding,
and spacing between children; children only care about their content.

### R5 — gap for spacing, margins banned at all cost

```bash
grep -rnE "margin[a-z-]*:" components app styles --include="*.scss" | grep -vE ": 0;"
```

Expected: empty. `margin: 0` resets are the only sanctioned margin. This
includes prose: rendered-markdown containers are grids, element margins stay
zeroed, gap sets the rhythm. `margin: 0 auto` centering is also a violation —
center with the container (`place-items`, `justify-self`).

### R6 — grid first, flex for runs (judgment)

Grid when the container defines the tracks; flex for one-dimensional,
content-sized runs — toolbars, inline rows, baseline alignment. Flag flex
containers doing two-dimensional layout and grids faking a single content-sized
row.

### R7 — named areas in fixed layouts, no positional spans

```bash
grep -rnE "grid-(area|row|column): *[0-9-]" components app styles --include="*.scss"
```

Expected: empty. Fixed regional layouts place children with
`grid-template-areas` + `grid-area: <name>`. Auto-placed collections
(`repeat(auto-fill, ...)`, `grid-auto-flow`) are exempt — dynamic children
can't be named. Overlays: give multiple children the same named area.

### R8 — style by class, never by `id`

```bash
grep -rnE "^\s*#[a-zA-Z][a-zA-Z0-9_-]* *[{,]" components app styles --include="*.scss"
```

Expected: empty. (Hex colors also start with `#` but never open a block — the
anchor and brace keep them out.)

### R9 — tokens for color, type, radius; extend the scale when none fits

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" components app --include="*.scss" | grep -v "var(--"
grep -rn "font-size:" components app --include="*.scss" | grep -v "var(--fs"
grep -rn "border-radius:" components app --include="*.scss" | grep -v "var(--tkw-radius)"
grep -rnE "line-height: [0-9]|letter-spacing: [0-9.]" components app --include="*.scss"
```

Expected: empty. The token families are `--tkw-*`, `--font-*`, `--fs-*`,
`--lh-*`, `--ls-*` in `styles/globals.scss`. If no token fits, extend the scale
in `globals.scss` — never inline the value. **Exempt until a spacing scale
lands**: `gap` and `padding` values. Judgment call to surface rather than
auto-flag: `#000`/`#fff` inside `mask-image` gradients are alpha stops, not
visual color — report them, let the human rule.

### R10 — breakpoints only through `_breakpoints.scss`

```bash
grep -rnE "@media[^{]*[0-9]+px" components app --include="*.scss" | grep -v "bp\.\$"
```

Expected: empty. Desktop-first, `@use "breakpoints" as bp;` then
`@media (max-width: bp.$md)`.

### R11 — every motion file guards `prefers-reduced-motion`

```bash
for f in $(grep -rlE "transition:|animation:" components app --include="*.scss"); do
  grep -q "prefers-reduced-motion" "$f" || echo "MISSING GUARD: $f"
done
```

Expected: empty.

### R12 — `:global()` is a commented escape hatch

```bash
grep -rn -B2 ":global" components app --include="*.scss"
```

Expected: every use has a `//` comment directly above explaining _why_ the
scope escape is unavoidable.

## Verdict discipline

- **New violation in the diff under review** → must fix before ship. No
  severity haggling; the rules have no minor tier.
- **Pre-existing debt** → report the count and the worst files; do **not**
  bulk-fix unrequested. Scope stays with what was asked.
- Every ❌ names `file:line`. A verdict without a location is a vibe, not a
  finding.

## Report format

One line per rule, ❌ first, counts and worst offenders inline:

```markdown
## style-critic — <scope audited>

- ❌ R9 tokens — 136 `font-size` off-scale; worst `app/design/page.module.scss` (43)
- ❌ R5 margins — `components/FilteredHouseList/FilteredHouseList.module.scss:187`
- ✅ R7 grid placement — 0 positional spans, 9 files on named areas
- ✅ R11 reduced motion — 26/26 motion files guarded
```

Close the report by separating **new-in-diff** violations (blocking) from
**pre-existing debt** (counted, not fixed).

## Red flags — STOP and re-read the rule

| Thought                                            | Reality                                                     |
| -------------------------------------------------- | ----------------------------------------------------------- |
| "4px is too small to deserve a token"              | The scale exists to kill exactly this drift                 |
| "I'll tokenize it in a follow-up"                  | The follow-up never comes. Extend `globals.scss` now        |
| "gap has no scale, so tokens are optional here"    | `gap`/`padding` are exempt; color, type, and radius are not |
| "this page is a showcase, it's special"            | No file is exempt until CLAUDE.md says so                   |
| "the editor says the aliased import is broken"     | Tooling bug. Never relativize a module import               |
| "a margin is easier than restructuring the parent" | Margins are banned at all cost. The container owns spacing  |
| "`margin: 0 auto` is centering, not spacing"       | Still a margin. Center with the container                   |
| "`:global` is quicker than threading a class"      | Escape hatch. Needs a `//` why-comment or it's a violation  |
| "the grep found nothing, ship it"                  | R4 and R6 are judgment rules — greps can't clear them       |

## Related skills

- `component-scaffold` — the four-file component structure, plus its own
  token-drift counter (`audit-components.ts`) scoped to `components/`
- `a11y-audit` — motion guards overlap; that skill owns the wider WCAG
  sweep
