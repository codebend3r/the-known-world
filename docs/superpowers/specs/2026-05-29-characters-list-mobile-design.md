## Characters list mobile layout — Design Spec

**Date:** 2026-05-29
**Status:** Approved for planning
**Scope:** `styles/characters.css` and `styles/list-search.css`. CSS-only. Character row component and pagination markup are untouched.

## Overview

The `/characters` page renders fine on desktop but breaks down on a narrow viewport. Two visible issues:

1. **Character row overflows the right edge.** Each row packs `portrait + sigil + name + alias` into one flex line. On a ~375 px viewport the portrait (5.75 rem) plus the sigil (3.25 rem) plus the gap eat most of the horizontal space, so the alias text gets clipped or truncated mid-word.
2. **Pagination row is cramped.** `Prev / Page X of Y / Show N per page / Next` are flexed onto a single line. The status and the page-size label end up wrapping their own internal text awkwardly (`Page 1 OF 8` stacks vertically, `per page` slips to its own line).

Fix both with a `(max-width: 639.98px)` media query in the existing stylesheets. No JSX or test changes — the DOM order is already correct for what we want to express with grid.

## Goals

- Character rows fit any mobile viewport ≥ 320 px with no horizontal overflow and no clipped alias.
- Pagination controls stay reachable and readable, with related controls visually grouped.
- Desktop layout, behavior, and tests are unchanged.

## Non-goals

- ❌ Touching `FilteredCharacterList.tsx` JSX, props, or behavior.
- ❌ Updating `FilteredCharacterList.test.tsx`.
- ❌ Adjusting the houses list — out of scope for this pass.
- ❌ Changing portrait or sigil rendering on desktop.

## Character row layout

**Mobile (`max-width: 639.98px`):** switch `.character-list__card` from flex to CSS grid.

```
┌─────────────────────────────────────┐
│           AEGON I TARGARYEN         │
│ [portrait]                          │
│           (The Conqueror)           │
└─────────────────────────────────────┘
```

- 2 columns / 2 rows: `grid-template-columns: auto 1fr` and `grid-template-areas: "portrait name" "portrait alias"`.
- `.character-list__portrait` is assigned `grid-area: portrait` and `align-self: stretch` so the image continues to define the row's vertical rhythm (5.75 rem tall, same as today).
- `.character-list__sigil` is hidden via `display: none`. The sigil is redundant on mobile — the portrait already conveys identity, and the user accepted this trade-off explicitly.
- `.character-list__name` is `grid-area: name`, `align-self: end`. `.character-list__alias` is `grid-area: alias`, `align-self: start`. Together they read like a stacked name + subtitle, vertically centered as a pair.
- **No-alias fallback:** when there is no `.character-list__alias` in the DOM, the name becomes the last child of the card (sigil is hidden but still present, so order is portrait → sigil → name). Add `.character-list__name:last-child { grid-row: 1 / 3; align-self: center; }` so the name spans both rows and centers vertically.
- Card padding: keep `padding: 0 1rem 0 0` (right gutter) so the portrait still sits flush left.
- Letter-spacing on `.character-list__name` is currently `2px` — fine on desktop, slightly tight against mobile text. Leave it; revisit if a future pass introduces small-screen typography tweaks elsewhere.

**Desktop:** untouched. The current flex layout (`portrait + sigil + name + alias` in one row) remains the default.

## Pagination layout

**Mobile (`max-width: 639.98px`):** switch `.pagination` from flex to CSS grid.

```
┌─────────────────────────────────────┐
│ [← Prev]   Page 1 of 8   [Next →]   │
│         Show [30 ▾] per page        │
└─────────────────────────────────────┘
```

- `display: grid; grid-template-columns: auto 1fr auto; grid-template-areas: "prev status next" "size size size"; gap: 0.5rem 0.6rem; align-items: center; justify-items: center;`.
- Assign areas by DOM order (JSX order is stable: button, span, label, button):
  - `.pagination > :nth-child(1) { grid-area: prev; justify-self: start; }`
  - `.pagination > :nth-child(2) { grid-area: status; }`
  - `.pagination > :nth-child(3) { grid-area: size; }`
  - `.pagination > :nth-child(4) { grid-area: next; justify-self: end; }`
- Status line (`Page X of Y`) gets a small `white-space: nowrap` so it can't fall into a 3-line stack again.
- Page-size label keeps `white-space: nowrap` for the same reason.

**Desktop:** untouched. The current single-row flex layout remains the default.

## Components

| File | Kind | Change |
|---|---|---|
| `styles/characters.css` | modify | Add a `@media (max-width: 639.98px)` block defining the grid layout for `.character-list__card` and its children. |
| `styles/list-search.css` | modify | Add a `@media (max-width: 639.98px)` block defining the grid layout for `.pagination` and its `:nth-child` mapping. |

No new files. No changes to components, content, or tests.

## Testing

- Existing Vitest suite (`FilteredCharacterList.test.tsx`) must continue to pass with no changes — the DOM structure is preserved.
- Manual verification at 375 px and 320 px widths (Safari/Chrome responsive mode):
  - No horizontal overflow on the character rows or the pagination bar.
  - Alias renders in full on its own line under the name, with no clipping at the right edge.
  - Sigil is not rendered.
  - Pagination Prev / status / Next sit on one line; page-size selector is centered on a second line.
  - A character with no alias (e.g., Arya Stark) centers vertically alongside the portrait — no awkward top-alignment.
  - Desktop (≥ 640 px) is visually unchanged from before.

## Risks and trade-offs

- **Hiding the sigil on mobile loses a small signal** (sigil hints at house affiliation before the user clicks). Mitigated by the portrait's region-tinted backdrop (`character-list__card--region-*`), which still telegraphs region. User explicitly approved this trade-off.
- **`:nth-child` for pagination areas couples the CSS to DOM order.** Acceptable: the JSX order is asserted in tests (`renders portrait, sigil, name, then alias in that order …`) and the pagination buttons + status + select are emitted in the same order in `renderPagination`. If we ever reorder them, this rule has to move with them.
- **`align-self: stretch` on the portrait** assumes the image's intrinsic aspect ratio still fits the 5.75 rem cell height — same assumption as desktop. If a tall portrait ever shipped, the grid row would stretch and so would desktop already, so no new risk.

## File diff summary

```
Modify:
  styles/characters.css
  styles/list-search.css
```
