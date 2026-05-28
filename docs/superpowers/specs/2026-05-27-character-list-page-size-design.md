## Character list page-size selector — Design Spec

**Date:** 2026-05-27
**Status:** Approved for planning
**Scope:** `components/FilteredCharacterList.tsx`, `styles/list-search.css`, and the co-located test file. Houses list is untouched.

## Overview

Add a page-size `<select>` to the existing pagination bar on the characters list so users can switch between **10**, **30**, **60**, **100**, and **All**. The default stays at 30, the selector lives inline inside both the top and bottom pagination navs, and changing it resets the user to page 1.

## Goals

- Let users widen or narrow the page without leaving the keyboard / screen.
- Keep the existing API: `FilteredCharacterList` still accepts a `pageSize` prop, which now seeds the *initial* selected size.
- Match the parchment aesthetic — the new control reuses `--font-ui`, the existing button border, and the gold-leaf focus treatment.

## Non-goals

- ❌ Persisting the choice across reloads (localStorage, cookie, or URL param). Component state only.
- ❌ Mirroring the change onto `FilteredHouseList`, which has no pagination today.
- ❌ Animations or transitions on the select element.

## Behavior

- Options, in order: `10`, `30`, `60`, `100`, `All`. `All` means the whole filtered list renders on one page (internally `Infinity`).
- The selected size is held in `useState`, initialized from the existing `pageSize` prop (default 30).
- Changing the size always resets `page` to 1 — same reset behavior as a search-filter change.
- The pagination nav is shown whenever `filtered.length > 10` (the smallest selectable size), so the selector remains reachable even when the current size yields a single page. Inside the nav, Prev/Next disable correctly and the status reads `Page 1 of 1` when there is only one page.
- Existing behavior preserved: if the filtered list has 10 or fewer items, no pagination nav renders at all.

## Visual structure

Inside each pagination nav, in source order:

```
[ ← Prev ]   Page X of Y   Show [ 30 ▾ ] per page   [ Next → ]
```

- `Show ` and ` per page` are plain text inside a `<label>` wrapping the `<select>`. The label is visible (not visually hidden) so the sentence reads naturally; the select is the interactive element.
- The select shares `.pagination__button`'s border, background, padding rhythm, and focus ring. Native chevron is fine; no custom dropdown.
- Top and bottom navs render the same control. Changing one updates the other (single source of truth in state).

## Components

| File | Kind | Change |
|---|---|---|
| `components/FilteredCharacterList.tsx` | modify | Convert `pageSize` from a hardcoded constant to `useState(initialPageSize)`; extend `renderPagination` to include the page-size `<label>` + `<select>`; update the "show pagination" condition to `filtered.length > 10`. |
| `styles/list-search.css` | modify | Add `.pagination__page-size` (label wrapper) and `.pagination__page-size-select` (the select). Reuse existing tokens. |
| `components/FilteredCharacterList.test.tsx` | modify | Add coverage for the selector (see Testing). |

No new files. No changes to the houses list, page routes, or content schemas.

## Testing

Add to the existing Vitest suite:

- Renders all five options in the select (`10`, `30`, `60`, `100`, `All`) with `30` selected by default.
- Changing the size to `10` with 75 items shows 10 cards and reads `Page 1 of 8`.
- Changing the size to `All` with 75 items shows all 75 cards, reads `Page 1 of 1`, and disables Prev/Next.
- Changing the size resets to page 1: advance to page 2 with the default size, then change size, assert `Page 1 of …`.
- With 25 items at the default size (one page at 30), the pagination nav still renders so the selector is reachable, and Prev/Next are both disabled.
- The existing "hides pagination when list fits on one page" expectation is updated: the cutoff is now `filtered.length <= 10`.

## Risks and trade-offs

- **Selector always-visible when `filtered.length > 10` is a small behavior change.** Today, a filtered result of 25 items at the default pageSize hides the nav entirely; under this spec it would show a disabled-Prev/Next nav with the selector. Accepted — without it, a user who picks `All` would lose access to the control.
- **`pageSize` prop becomes "initial size" rather than "the size."** Existing tests pass it as a literal number; the new state still honors that as the starting value, so callers don't change.
- **No persistence.** Reloading or navigating away resets to the prop default. If users start asking for stickiness, add a URL param next (preserves the static-export model).

## File diff summary

```
Modify:
  components/FilteredCharacterList.tsx
  components/FilteredCharacterList.test.tsx
  styles/list-search.css
```
