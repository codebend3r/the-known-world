# Baseline: tkw-component-scaffold

First run of `.claude/skills/tkw-component-scaffold/audit-components.ts` against
`components/`, and the conformance work that followed. Both columns come from
the same tool, so before and after are directly comparable.

```bash
bun .claude/skills/tkw-component-scaffold/audit-components.ts
```

## Scope

40 component directories plus one shared stylesheet
(`components/listSearch.module.scss`), measured against 69 tokens parsed from
`styles/globals.scss`.

The 40 directories hold 44 React source files. `FamilyTreeViews`,
`TimelineCluster`, `ViewToggle`, and `WorldMap` each carry a satellite module
(`FamilyTreeViewSwitcher.tsx`, `TimelineClusterProvider.tsx`, `icons.tsx`,
`WorldMapSkeleton.tsx`) re-exported through the directory barrel. The audit
treats the directory as the unit, because the barrel is what consumers import.

## Totals

| Metric                         | Before | After |
| ------------------------------ | ------ | ----- |
| Components with zero findings  | 26/40  | 34/40 |
| Missing co-located tests       | 4      | 0     |
| Missing or empty barrels       | 1      | 0     |
| Raw values with an exact token | 7      | 0     |
| `display: flex` sites          | 13     | 11    |
| Margins used for spacing       | 1      | 1     |
| Unclassed `<div>`s             | 0      | 0     |

## Conformance table

Counts are findings per class. `-` means none.

| Component                         | Barrel | Test | Token | Flex | Margin | Div | Before | After     |
| --------------------------------- | ------ | ---- | ----- | ---- | ------ | --- | ------ | --------- |
| `Accordion`                       | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `BattleInfobox`                   | -      | 1    | -     | -    | -      | -   | 1      | **fixed** |
| `CharacterSearchInput`            | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `ComingSoonPage`                  | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `DragonInfobox`                   | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `DropCap`                         | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `FamilyTree`                      | -      | -    | -     | 3    | -      | -   | 3      | 3 left    |
| `FamilyTreeChart`                 | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `FamilyTreeViews`                 | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `Filigree`                        | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `FilteredCharacterList`           | -      | -    | 1     | -    | -      | -   | 1      | **fixed** |
| `FilteredDragonList`              | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `FilteredHouseList`               | -      | -    | -     | 1    | 1      | -   | 2      | 2 left    |
| `FilteredWeaponList`              | -      | -    | -     | 2    | -      | -   | 2      | 2 left    |
| `HouseInfobox`                    | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `HouseSearchInput`                | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `Infobox`                         | -      | 1    | 1     | -    | -      | -   | 2      | **fixed** |
| `ListSearchSkeleton`              | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `MainMenu`                        | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `MainMenuTile`                    | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `MapLayerToggle`                  | -      | -    | -     | 1    | -      | -   | 1      | 1 left    |
| `MapMarker`                       | -      | -    | 1     | -    | -      | -   | 1      | **fixed** |
| `MapStage`                        | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `PageHeading`                     | -      | -    | -     | 2    | -      | -   | 2      | 2 left    |
| `PlateLayout`                     | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `SearchCombobox`                  | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `SectionGlyphs`                   | 1      | 1    | -     | -    | -      | -   | 2      | **fixed** |
| `Sigil`                           | -      | 1    | -     | -    | -      | -   | 1      | **fixed** |
| `SiteFooter`                      | -      | -    | -     | 2    | -      | -   | 2      | 2 left    |
| `SiteHeader`                      | -      | -    | 1     | -    | -      | -   | 1      | **fixed** |
| `SiteMenu`                        | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `SortToggle`                      | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `Sources`                         | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `TimelineChart`                   | -      | -    | 2     | -    | -      | -   | 2      | **fixed** |
| `TimelineCluster`                 | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `TimelineExplorer`                | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `TimelineMinimap`                 | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `ViewToggle`                      | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `WeaponInfobox`                   | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `WorldMap`                        | -      | -    | -     | -    | -      | -   | 0      | clean     |
| `listSearch.module.scss` (shared) | -      | -    | 1     | 2    | -      | -   | 3      | **fixed** |

## What was fixed

### 1. Structure: one barrel, four tests

| Component       | Fix                                                                               |
| --------------- | --------------------------------------------------------------------------------- |
| `SectionGlyphs` | Added `index.ts`, then repointed all 10 consumers at `@/components/SectionGlyphs` |
| `SectionGlyphs` | Added `SectionGlyphs.test.tsx`, 19 assertions                                     |
| `Sigil`         | Added `Sigil.test.tsx`, 10 assertions                                             |
| `Infobox`       | Added `Infobox.test.tsx`, 10 assertions                                           |
| `BattleInfobox` | Added `BattleInfobox.test.tsx`, 15 assertions                                     |

54 new tests, all asserting rendered output: resolved `href`s, `src` after the
sigil resolution order, custom-property styles on the rendered node, the DOM
shape of an empty render, `aria-label` text, and per-entry link-versus-text
branching. No snapshots, no placeholders.

`SectionGlyphs` had no barrel and 10 consumers importing
`@/components/SectionGlyphs/SectionGlyphs` directly. Adding `index.ts` alone
would have left a barrel nobody imports, so the consumers moved with it.

The `Sigil` tests pin behaviour that had never been covered: an unregistered
slug falling through to the regional sigil, `SLUG_ALIASES` redirecting
`durrandon` to `baratheon.png`, and `decorative` emptying the alt text. Those
are the failure classes `tkw-sigil-audit` describes, now gated in the suite.

### 2. Tokens: 7 raw values replaced

Every substitution is value-identical **and** role-consistent.

| Site                                            | Was                     | Now                 |
| ----------------------------------------------- | ----------------------- | ------------------- |
| `FilteredCharacterList.module.scss:202` `.name` | `font-size: 19px`       | `var(--fs-body)`    |
| `Infobox.module.scss:26` `dd`                   | `font-size: 15px`       | `var(--fs-section)` |
| `SiteHeader.module.scss:64` `.crest`            | `font-size: 15px`       | `var(--fs-section)` |
| `listSearch.module.scss:12` `.input`            | `font-size: 15px`       | `var(--fs-section)` |
| `TimelineChart.module.scss:37` `.columnHeading` | `font-size: 11px`       | `var(--fs-label)`   |
| `TimelineChart.module.scss:118` `.tickLabel`    | `font-size: 11px`       | `var(--fs-label)`   |
| `MapMarker.module.scss:61` `.label`             | `letter-spacing: 1.2px` | `var(--ls-label)`   |

### 3. Flex to grid: 2 of 13 converted

| Site                                   | Was    | Now                                                                |
| -------------------------------------- | ------ | ------------------------------------------------------------------ |
| `listSearch.module.scss` `.pagination` | `flex` | `grid` + `grid-auto-flow: column` (kept `justify-content: center`) |
| `listSearch.module.scss` `.pageSize`   | `flex` | `grid` + `grid-auto-flow: column` + `justify-content: start`       |

Both are block-level containers with several single-axis children, no
`flex-wrap`, and no child declaring `flex-grow` / `flex-shrink` / `flex-basis`.
Nothing else in the 13 met that bar.

`justify-content: start` is not cosmetic. Auto-sized grid tracks absorb free
space under the default `justify-content: normal`; flex items with
`flex-grow: 0` do not. `.pageSize` spans the full row at the small breakpoint,
so without it the label and select would have spread apart.

`.pagination` was already `display: grid` below `bp.$sm` via a media override
with explicit `grid-template-areas` and a `grid-area` on all four children, so
the conversion only changes the wide layout, and `grid-auto-flow: column` is
inert where every child is explicitly placed.

## What was deliberately skipped

There is no visual regression suite in this repo. A wrong conversion ships
broken layout with a green build, so anything not trivially equivalent was left
alone and is listed here.

### Flex sites kept as flex (11)

Five relied on wrap or explicit flex sizing:

| Site                                          | Reason                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `FamilyTree.module.scss:68` `.row`            | `flex-wrap: wrap`. Grid has no equivalent for wrapping variable-width children.                                     |
| `FilteredHouseList.module.scss:27` `.toggles` | `flex-wrap: wrap` across a variable number of filter chips.                                                         |
| `MapLayerToggle.module.scss:5` `.toggle`      | `flex-wrap: wrap` across a variable number of layer chips.                                                          |
| `SiteFooter.module.scss:60` `.credit`         | `flex-wrap: wrap` across name, separators, link, and version.                                                       |
| `FilteredWeaponList.module.scss:49` `.name`   | Its children declare `flex: none` (`.indicator`, `.sigil`), and the name text relies on shrink with `min-width: 0`. |

Three are baseline-aligned text inside a wrapping parent, relying on flex
shrink to compress before the parent wraps:

| Site                                   | Reason                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `FamilyTree.module.scss:101` `.person` | Grid `auto` tracks would overflow the wrapping `.row` rather than compress the name.         |
| `FamilyTree.module.scss:166` `.spouse` | Same shape as `.person`, same reason.                                                        |
| `PageHeading.module.scss:24` `h1`      | An intrinsic glyph box beside a page title; in grid the title overflows instead of wrapping. |

Three are inline-level boxes sitting on a text baseline. `inline-flex` and
`inline-grid` synthesize a baseline from different sources (first flex item
versus first grid row), and each of these sits beside text whose alignment
would silently shift. Converting them also buys nothing structural, since two
wrap a single child:

| Site                                         | Reason                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `SiteFooter.module.scss:77` `.link`          | Icon plus label inline in a wrapping credit line.                             |
| `PageHeading.module.scss:41` `.icon`         | Single-child box seated on the `h1` baseline; `inline-flex` only makes a box. |
| `FilteredWeaponList.module.scss:70` `.sigil` | Single-child box inline beside the weapon name.                               |

These last three were converted, reviewed, and reverted before commit. With no
visual regression suite in the repo and the build gate deferred, a baseline
shift beside text is exactly the class of change nothing here would catch.

### Margin kept (1)

`FilteredHouseList.module.scss:187` `.status { margin-top: 4px }`. The status
pill sits in `.body`, a single-column grid with `gap: 5px`, so the margin adds
4px above **one** child. Raising the container `gap` would move every sibling,
and `padding-top` would grow the pill's own painted box because it carries a
background and a `border-radius`. There is no equivalent expression, so it
stays and is reported.

## Token gaps found

Values hardcoded across component stylesheets with no token that covers them.
Left raw on purpose. Minting a token is a design decision, and a new token has
to land in `styles/globals.scss` and `app/design/page.tsx` together, since that
page is the in-repo source of truth for Iron Throne v1.

| Property         | Value   | Sites | Nearest token           |
| ---------------- | ------- | ----- | ----------------------- |
| `font-size`      | `9px`   | 15    | `--fs-label` is `11px`  |
| `font-size`      | `10px`  | 14    | `--fs-label` is `11px`  |
| `font-size`      | `20px`  | 4     | `--fs-body` is `19px`   |
| `font-size`      | `13px`  | 2     | none                    |
| `border-radius`  | `4px`   | 13    | `--tkw-radius` is `7px` |
| `border-radius`  | `5px`   | 8     | `--tkw-radius` is `7px` |
| `border-radius`  | `8px`   | 4     | `--tkw-radius` is `7px` |
| `border-radius`  | `3px`   | 4     | `--tkw-radius` is `7px` |
| `letter-spacing` | `1px`   | 9     | `--ls-label` is `1.2px` |
| `letter-spacing` | `0.6px` | 2     | `--ls-label` is `1.2px` |

The `9px` / `10px` mono label size is the largest single gap: 29 sites across
the register rows, chips, pagination, map labels, and infobox captions, all
below the smallest token on the ramp. The radius family is the second: 29 sites
across four values, none of which is `--tkw-radius`, which is used in only 5
component stylesheets.

## Two false-positive classes the audit deliberately suppresses

Both were real findings on the first pass and both are wrong to fix.

1. **Role mismatch.** `SearchCombobox.module.scss:54` sets
   `background: rgba(200, 162, 74, 0.14)`, byte-identical to
   `--tkw-hairline-faint`. Substituting would bind an active-option fill to a
   hairline token, so retuning one would silently move the other. The gold-wash
   background family (`0.04`, `0.05`, `0.06`, `0.08`, `0.12`, `0.14`, `0.16`)
   has no token at all; that is a token gap, not a violation. Hairline tokens
   are now only offered for `border` and `outline`.

2. **Resets read as ramp steps.** Three `line-height: 1` declarations matched
   `--lh-title: 1` (`SiteHeader .crest`, `SiteHeader .title`,
   `TimelineExplorer` button). Unitless `0` and `1` are resets, in the same
   class as `margin: 0`. An icon button zeroing its line box is not opting into
   the title ramp. Both are now excluded.

A third suppression covers the stylesheet file itself: `HouseSearchInput`
renders no host elements (it is a composition wrapper around `SearchCombobox`)
and `SectionGlyphs` renders only SVG primitives tinted by the consuming
container. Neither owes a `.module.scss`, and both are reported as advisory
exemptions rather than missing files.

## A gap in the tooling worth knowing

`audit-components.ts` is **not** covered by `bun run typecheck`. `tsconfig.json`
includes `**/*.ts`, but TypeScript's wildcards skip directories whose name
begins with `.`, so nothing under `.claude/` enters the program. Verified by
appending `const broken: string = 42;` to the script: `tsgo --noEmit` passed,
and `tsgo --listFiles | grep -c audit-components` returned `0`.

`oxlint --type-aware` **does** read it (the same experiment produced
`no-unused-vars` on that line), so the script is linted but not fully
typechecked. Treat a green `bun run check` as covering lint only for anything
in `.claude/`; run the script itself to exercise it.

## Verification

```
bun install --frozen-lockfile   207 packages
bun format                      2074 files
bun run check                   typecheck + lint:ts + lint:css + test, 700 pass / 0 fail
bun run build                   not observed
```

**Local build skipped due to concurrent-agent load; build verification deferred
to CI.** `bun run build` was attempted once. Nine agents were running builds on
this machine at load average 156, and Next.js began failing individual pages
with "took more than 60 seconds" at roughly 290 of 1554 static pages. Every
timeout was a per-page contention timeout, none traceable to this diff, which
touches only SCSS declarations, four new test files, one new barrel, and ten
import specifiers. No green build was observed here, and none is claimed.
