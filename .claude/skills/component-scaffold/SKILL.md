---
name: component-scaffold
description: Use when adding, moving, renaming, or reviewing a React component in this repo. Triggers include "add a component", "scaffold a new component", "create components/Foo", "does this component follow the conventions", "why is there no test for X", "check the components for drift", "audit the component structure", "am I using the right token", "should this be flex or grid", "which components are missing tests", or any review that touches a `components/<Name>/` directory or a `*.module.scss`.
---

# Component Scaffold

## Overview

Forty component directories live under `components/`, each expected to hold the
same four files. Nothing in the toolchain enforces that. `bun run check` runs
`tsgo`, `oxlint --type-aware`, `gale`, and `bun test`; none of them know a
component is missing its barrel, that a font size was typed as `15px` when
`--fs-section` is exactly `15px`, or that a `<div>` shipped with no class. The
convention is enforced by review, so it drifts.

`audit-components.ts` in this directory makes the drift countable. **It is
read-only and writes nothing.**

The measured state at the time this skill was written: **34 of 40 components
clean**, 69 tokens declared in `styles/globals.scss`, 101 raw
`font-size` / `border-radius` / `letter-spacing` declarations across component
stylesheets, of which zero still match a token exactly.

## The core insight

The four-file convention is not filing discipline, it is the reason
`@/components/Foo` resolves at all. Every consumer outside a component's own
directory imports the barrel, never the implementation file:

```tsx
import { SortToggle } from "@/components/SortToggle"; // yes
import { SortToggle } from "@/components/SortToggle/SortToggle"; // no
```

A missing `index.ts` does not break the build; it silently pushes every
consumer onto the deep path, and the component's public surface stops being a
decision anyone made. The exception is a component reaching for its own
sibling: `FamilyTreeViews` importing `FamilyTreeViewSwitcher` and
`TimelineCluster` importing `TimelineClusterProvider` both go direct, because
routing an intra-directory import through the barrel is a cycle.

The same is true of the CSS rules: grid, `gap`, and
tokens are not stylistic preferences here, they are what makes a child
relocatable. A child positioned by its container can move to another container
and lay out per that container. A child that positions itself with margins
cannot.

## The four files

Every `components/<Name>/` holds exactly these, named off the directory:

| File               | Required       | Holds                                    |
| ------------------ | -------------- | ---------------------------------------- |
| `Name.tsx`         | always         | the component, named export, no default  |
| `Name.module.scss` | see exemptions | its styles, tokens only                  |
| `index.ts`         | always         | the barrel, one `export *` line          |
| `Name.test.tsx`    | always         | co-located assertions on rendered output |

Two sanctioned exemptions from `Name.module.scss`, both reported by the audit
as advisory rather than as findings:

| Exemption         | Example                                 | Why                                                                  |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------- |
| Shares a module   | `CharacterSearchInput`, `WeaponInfobox` | Consumes `listSearch.module.scss` or `Infobox.module.scss`           |
| Renders no markup | `HouseSearchInput`, `SectionGlyphs`     | Composition-only wrapper, or an SVG glyph module the container tints |

### Worked example: `components/SortToggle/`

`SortToggle.tsx`

```tsx
"use client";

import styles from "@/components/SortToggle/SortToggle.module.scss";

export type SortDirection = "asc" | "desc";

type Props = {
  value: SortDirection;
  onChange: (value: SortDirection) => void;
};

export function SortToggle({ value, onChange }: Props) {
  const handleSelect = (next: SortDirection) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className={styles.toggle} role="group" aria-label="Sort direction">
      <button
        type="button"
        className={styles.button}
        aria-pressed={value === "asc"}
        onClick={() => handleSelect("asc")}
      >
        <AscIcon />
      </button>
    </div>
  );
}
```

Note the self-referential import path. Modules are imported through the `@/`
alias even from inside their own directory; `./SortToggle.module.scss` is not
the house form.

`SortToggle.module.scss`

```scss
@use "breakpoints" as bp;

// A segmented pair of filter chips. Unselected is a surfaced hairline chip;
// the pressed segment inverts to solid gold on the page ground.
.toggle {
  display: grid;
  grid-auto-flow: column;
  grid-area: sort;
  width: max-content;
  border: 1px solid var(--tkw-hairline-firm);
  background: var(--tkw-surface);

  @media (max-width: bp.$md) {
    justify-self: start;
  }
}

.button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 38px;
  color: var(--tkw-ink-muted);

  &[aria-pressed="true"] {
    color: var(--tkw-bg);
    background: var(--tkw-gold);
  }
}
```

`index.ts`

```ts
export * from "@/components/SortToggle/SortToggle";
```

Use a named re-export instead of `export *` only to narrow a directory's public
surface deliberately. `Filigree`, `PageHeading`, `TimelineExplorer`, and
`WorldMap` do this; the other 36 use `export *`.

`SortToggle.test.tsx`

```tsx
import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { SortToggle } from "@/components/SortToggle";

describe("SortToggle", () => {
  it("calls onChange when the unselected direction is clicked", () => {
    const onChange = jest.fn();
    render(<SortToggle value="asc" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(onChange).toHaveBeenCalledWith("desc");
  });
});
```

The test imports through the barrel, like every other consumer. Importing the
implementation file in a test hides a broken barrel from the suite.

## The CSS rules

### Grid is the default, flex is the fallback

| Do                                                                            | Don't                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------- |
| `display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px;`       | `display: flex; gap: 16px;`                       |
| `display: grid; grid-auto-flow: column; justify-content: start; gap: 0.5rem;` | `display: flex; align-items: center; gap: .5rem;` |
| `grid-template-areas: "portrait name sigil";` with `grid-area` on each child  | source order plus `order:` on flex items          |

**`grid-auto-flow: column` needs `justify-content: start`.** Auto-sized grid
tracks absorb free space under the default `justify-content: normal`; flex
items with `flex-grow: 0` do not. Dropping the `justify-content` is the single
most common way a flex-to-grid conversion silently changes layout.

Flex is still correct for four things, and the audit reports them so the choice
is visible, not so it is removed:

| Keep flex when                            | Live example               |
| ----------------------------------------- | -------------------------- |
| `flex-wrap: wrap` on variable-width chips | `MapLayerToggle .toggle`   |
| Items declare `flex: none` / `flex: 1`    | `FilteredWeaponList .name` |
| Baseline-aligned text relying on shrink   | `FamilyTree .person`       |
| An intrinsic box beside wrapping text     | `PageHeading h1`           |

Converting any of those without a visual check ships broken layout. There is no
visual regression suite here.

### Space with gap and container padding, not margins

| Do                                                 | Don't                                |
| -------------------------------------------------- | ------------------------------------ |
| `gap: 16px` on the container                       | `margin-bottom: 16px` on each child  |
| `padding: 18px` on the container                   | `margin: 18px` on the container      |
| `margin: 0` as a reset, `margin: 0 auto` to centre | `margin-top: 4px` to nudge one child |

`margin: 0` and `margin: 0 auto` are not spacing and the audit ignores both.
Everything else is a finding.

### Container-driven layout

The container declares width, height, and track structure. Children declare
`grid-area` and self-alignment only. This is what lets `FilteredHouseList`
re-place the same `.card` children into a completely different template under
`.listView` without touching a child rule.

```scss
// Container owns the tracks.
.card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding: 18px;
}

// Child owns only its placement within whatever container it lands in.
.body {
  min-width: 0;
}
```

### No unclassed divs

```tsx
<div>{children}</div>                      // no
<div className={styles.row}>{children}</div> // yes
```

Zero exist today across all component TSX. Keep it that way.

## Token lookup table

Never type one of these values; the token is the value. Reach for
`styles/globals.scss` for anything not listed.

| Raw value                                              | Token                                                                        | Applies to                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------- |
| `98px`                                                 | `--fs-display`                                                               | `font-size`                        |
| `68px`                                                 | `--fs-h1`                                                                    | `font-size`                        |
| `24px`                                                 | `--fs-h2`                                                                    | `font-size`                        |
| `21px`                                                 | `--fs-quote`                                                                 | `font-size`                        |
| `19px`                                                 | `--fs-body`                                                                  | `font-size`                        |
| `15px`                                                 | `--fs-section`                                                               | `font-size`                        |
| `11px`                                                 | `--fs-label`                                                                 | `font-size`                        |
| `0.98` / `1.75`                                        | `--lh-display` / `--lh-body`                                                 | `line-height`                      |
| `4.5px` / `2.6px` / `2.2px` / `1.6px` / `1.2px`        | `--ls-eyebrow` / `--ls-section` / `--ls-caption` / `--ls-nav` / `--ls-label` | `letter-spacing`                   |
| `7px`                                                  | `--tkw-radius`                                                               | `border-radius`                    |
| `56px`                                                 | `--tkw-gutter`                                                               | `padding`, `gap`, `margin`         |
| `1240px` / `1400px`                                    | `--tkw-measure` / `--tkw-measure-wide`                                       | `max-width`                        |
| `#14100e` / `#0c0a08`                                  | `--tkw-bg` / `--tkw-bg-deep`                                                 | any colour                         |
| `rgba(29,24,19,.86)` / `#1d1813` / `rgba(45,38,30,.9)` | `--tkw-surface` / `--tkw-surface-solid` / `--tkw-surface-raised`             | any colour                         |
| `#c8a24a` / `#e6c15c`                                  | `--tkw-gold` / `--tkw-gold-bright`                                           | any colour                         |
| `rgba(200,162,74,.2)` / `.28` / `.14`                  | `--tkw-hairline` / `--tkw-hairline-firm` / `--tkw-hairline-faint`            | `border`, `outline` only           |
| `#f4ecd6` / `#ded6c4` / `#9c937f` / `#6b6350`          | `--tkw-ink` / `--tkw-ink-body` / `--tkw-ink-muted` / `--tkw-ink-dim`         | any colour                         |
| a house colour                                         | `--house-<slug>`                                                             | banners, shields, swatches, pins   |
| a region tint                                          | `--region-color-<slug>`                                                      | same, resolved from a house region |

Two rules the audit encodes and you should too:

- **Role beats value.** `--tkw-hairline-faint` is `rgba(200,162,74,0.14)`, and
  so is the gold wash behind an active combobox option. They are not the same
  thing. Binding the wash to the hairline token makes retuning one move the
  other. The audit only offers hairline tokens for `border` and `outline`.
- **Resets are not ramp steps.** `margin: 0`, `line-height: 0`, and
  `line-height: 1` are resets. `--lh-title` happens to be `1`; an icon button
  zeroing its line box is not opting into the title ramp.

### Token gaps

Some values are hardcoded everywhere because no token covers them. Currently in
component stylesheets: `font-size: 9px` (15 sites) and `10px` (14 sites), both
below `--fs-label: 11px`; `border-radius: 4px` (13), `5px` (8), `8px` (4), `3px`
(4), none of which is `--tkw-radius: 7px`; `letter-spacing: 1px` (9).

**Leave a gap raw and report it.** Minting a token is a design decision that
belongs to whoever owns `app/design/page.tsx`, which is the in-repo source of
truth for Iron Throne v1 and must be updated in step with any new token.

## Test conventions

- Runner: `bun test` (`bun run test` adds `--isolate --dots`). Never Vitest, never Jest.
- DOM: `@happy-dom/global-registrator`, registered once in `test/preload.ts` via
  `bunfig.toml`. Individual tests never register it.
- Queries: `@testing-library/react`. Cleanup is registered globally in the
  preload, so no test calls `cleanup` itself.
- `styles.foo` resolves to the literal string `"foo"` under a CSS-module stub in
  the preload, which is why `expect(el.className).toBe("dropCap")` works.
- `next/image` is mocked to a pass-through `<img>`, so `src`, `alt`, and `sizes`
  are assertable as plain attributes.
- `window.matchMedia` is deliberately left `undefined`. A test that needs a real
  answer stubs it itself.

Assert on **rendered output**, not implementation:

| Do                                                         | Don't                                        |
| ---------------------------------------------------------- | -------------------------------------------- |
| `screen.getByRole("link", { name: "House Stark" })`        | `expect(wrapper.find(Link)).toHaveLength(1)` |
| `expect(link.getAttribute("href")).toBe("/houses/stark/")` | snapshot the whole tree                      |
| `expect(container.innerHTML).toBe("")` for a null render   | `expect(result).toBeTruthy()`                |
| `fireEvent.click(...)` then assert the callback payload    | call the handler directly                    |

Trailing slashes matter: `next.config.ts` sets `trailingSlash: true` and the
preload mirrors it, so hrefs assert as `/houses/stark/`.

## Quick Reference

```bash
# Audit every component against the convention and the CSS rules.
bun .claude/skills/component-scaffold/audit-components.ts
bun .claude/skills/component-scaffold/audit-components.ts --json

# Scaffold a new one.
mkdir -p components/Foo
printf 'export * from "@/components/Foo/Foo";\n' > components/Foo/index.ts

# Verify. All four must pass before committing.
bun install --frozen-lockfile
bun format
bun run check          # typecheck + lint:ts + lint:css + test
bun run build

# Narrower loops.
bun test components/Foo
bun run lint:css:fix
```

The audit exits 1 when it reports anything, so it can gate a hook or a CI step.
Sections it prints: `MISSING FILES`, `BARRELS`, `NO CO-LOCATED TEST`,
`RAW VALUES WITH AN EXACT TOKEN`, `DISPLAY FLEX`, `MARGIN USED FOR SPACING`,
`UNCLASSED DIVS`, and an advisory `NO OWN STYLESHEET`.

**`bun run typecheck` does not cover this script.** `tsconfig.json` includes
`**/*.ts`, but TypeScript wildcards skip directories starting with `.`, so
nothing under `.claude/` enters the program. `oxlint --type-aware` does read it.
Editing the script means running it, not trusting `bun run check`.

## Common mistakes

| Mistake                                                             | Fix                                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Adding `index.ts` but leaving consumers on the deep path            | A barrel nobody imports is decoration. Point consumers at `@/components/Foo`.                            |
| Importing the implementation file in the test                       | It hides a broken barrel from the suite. Import `@/components/Foo`.                                      |
| `export default` from `Foo.tsx`                                     | Nothing in `components/` uses default exports; `export *` cannot re-export one usefully.                 |
| Converting `display: flex` to grid without `justify-content: start` | Auto tracks stretch, flex items do not. The row spreads out.                                             |
| Converting a `flex-wrap: wrap` container to grid                    | Grid has no wrap equivalent for variable-width children. Leave it.                                       |
| Substituting a token because the value matches                      | Check the role first. `--tkw-hairline-faint` on a background couples a fill to a rule.                   |
| Minting a token to make the audit go quiet                          | Report the gap. New tokens have to land in `styles/globals.scss` **and** `app/design/page.tsx` together. |
| Replacing a per-child `margin-top` with container `gap`             | `gap` moves every sibling. Only equivalent when the offset applies to all of them.                       |
| Assuming a `9px` or `10px` font size is a violation                 | Neither has a token. Only exact matches are findings; the audit already filters this.                    |
| Writing `./Foo.module.scss`                                         | The house form is the `@/` alias, even inside the component's own directory.                             |
| Treating `bun run check` as proof the convention holds              | It never looks at file structure, barrels, tokens, or `<div>` classes. Run the audit.                    |
| Running `npm` or `yarn`                                             | Bun only, and dependencies are pinned exactly with no `^` or `~`.                                        |

## Related skills

- `sigil-audit`: the other structural audit in this repo, for sigil wiring
- `image-optimize`: `public/` asset audit, same read-only shape
- `commit-format` and `pr-format`: the `TKW:` conventions for shipping the fix
