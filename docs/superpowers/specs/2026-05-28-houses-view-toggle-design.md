## Houses grid/list view toggle: Design Spec

**Date:** 2026-05-28
**Status:** Approved for planning
**Scope:** `components/FilteredHouseList.tsx`, `lib/regions.ts`, `styles/houses.css`, `styles/list-search.css`, and the co-located test file. Characters list is untouched.

## Overview

Add a two-button toggle to `/houses/` so users can switch the existing card grid into a dense one-row-per-house list. The toggle sits immediately right of the in-page search input. Default view stays grid; the user's choice persists across reloads via `localStorage`.

## Goals

- Offer a denser way to scan the full roster without losing the sigil-led aesthetic.
- Keep the toggle on the same row as the search so it never displaces the grid vertically.
- Persist the user's choice across visits while staying compatible with the static export (no server state, no cookies).

## Non-goals

- ❌ Applying the same toggle to `/characters/` (copy later if it lands well).
- ❌ A `?view=list` URL param. `localStorage` is the only persistence channel.
- ❌ Transition animations between grid and list.
- ❌ Per-column sorts inside the list view (still alphabetical, like the grid).
- ❌ Showing house words / motto on list rows (asked and rejected during brainstorming).

## Behavior

- Two icon-only `<button>`s (one grid, one list) share a single segmented control with `role="group"` and `aria-label="View"`. Each button has an `aria-pressed` reflecting current view and a visible `aria-label` (`"Grid view"`, `"List view"`).
- Initial render uses the SSR-safe default: `'grid'`. After mount, a `useEffect` reads `localStorage['gota:houses-view']` and updates the state if a valid stored value exists. This causes one transient grid to list swap on first paint for users whose stored choice is `list`, which is accepted to avoid hydration mismatch.
- Clicking a button updates the state and writes the new value to `localStorage` synchronously.
- Search and view are independent: filtering applies to both views, the empty-state message renders the same way in both.
- Reduced-motion users get the same no-transition treatment already applied elsewhere; these buttons have no hover transform to suppress, but their `border-color` transition matches the existing pattern.

## Visual structure

```
+-----------------------------------------------+---------+
|  Search houses…                               | [▦] [≡] |
+-----------------------------------------------+---------+
```

- Search row becomes a flex container: input grows (`flex: 1`), segmented toggle sits at the end. Gap matches existing `.parchment-page` rhythm (no margins per `CLAUDE.md`).
- Grid view: existing `.house-list` markup unchanged.
- List view: same `<ul>` gains `.house-list--list`. Each `<li>` is a single-row link, inline-grid:

```
[sigil 2rem] [House name]                        [Region label]
```

  - 3-column row grid: `2.5rem 1fr auto`.
  - Sigil renders smaller (`size="2rem"`) in list mode.
  - Region label is `var(--ink-faded)`, small-caps, right-aligned, lives in a `<span>` after the name.
  - The regional color tint moves from a full border to a 3px left border on the row, keeping the kingdom palette intact without the framed-card look.
  - Row hover/focus mirrors the grid card: gold-leaf border, no transform.

## Components

| File | Kind | Change |
|---|---|---|
| `components/FilteredHouseList.tsx` | modify | Add `view` state, `useEffect` hydration from `localStorage`, render new `ViewToggle`. Each item now also receives a `regionLabel` prop so list rows can show the region name. |
| `components/ViewToggle.tsx` | **new** | Stateless segmented control. Props: `value: 'grid' \| 'list'`, `onChange: (v) => void`. Renders two `<button>`s with inline-SVG icons. |
| `lib/regions.ts` | modify | Export a `regionLabel(slug)` helper returning the display name for a `RegionSlug` (e.g. `'north'` → `'The North'`). Reuses the existing `REGIONS` map. |
| `app/houses/page.tsx` | modify | Pass `regionLabel` alongside `region` in each `HouseItem`. |
| `styles/houses.css` | modify | Add `.house-list--list`, `.house-list__card--row`, region-tinted left-border rules for list rows. |
| `styles/list-search.css` | modify | Add `.list-search-row` (flex container) and `.view-toggle` / `.view-toggle__button` styles. |
| `components/FilteredHouseList.test.tsx` | modify | Add coverage for the toggle (see Testing). |
| `components/ViewToggle.test.tsx` | **new** | Renders both buttons, `aria-pressed` reflects value, clicking fires `onChange`. |

No content schema changes. No route changes. No changes to `/characters/`.

## Data

`HouseItem` (in `components/FilteredHouseList.tsx`) extended:

```ts
export type HouseItem = {
  slug: string;
  name: string;
  region: RegionSlug | null;       // existing, used for color tint
  regionLabel: string | null;      // new, displayed in list view
};
```

`regionLabel` is computed in `app/houses/page.tsx` from the same `REGIONS` map, so the component stays presentational.

## Storage

- Key: `gota:houses-view`
- Values: `'grid'` or `'list'` (any other string is ignored)
- Read: `useEffect` on mount; never read again
- Write: in the `onChange` handler, immediately after `setView`
- Guarded by `typeof window !== 'undefined'` for SSR safety, even though the component is `'use client'`.

## Testing

Add to `FilteredHouseList.test.tsx`:

- Renders a `View` segmented control with two buttons.
- `aria-pressed="true"` on the grid button by default; on the list button after click.
- Clicking list applies `.house-list--list` to the `<ul>` and writes `'list'` to `localStorage`.
- Mounting with `localStorage['gota:houses-view'] === 'list'` starts in list view after the hydration effect runs.
- Mounting with an invalid stored value (`'kanban'`) falls back to grid.
- List rows show the region label text for houses with a region; omit it for region-less houses.

New `ViewToggle.test.tsx`:

- Renders two buttons with the expected `aria-label`s.
- The currently-selected button has `aria-pressed="true"`, the other `"false"`.
- Clicking the unselected button calls `onChange` with the other value; clicking the already-selected button is a no-op (no `onChange` call).

## Risks and trade-offs

- **One-frame flash from grid to list on first paint** for users whose stored choice is list. Accepted, because the alternative (inline `<script>` in `<head>` to pre-set a class) is out of proportion for a single-page feature and complicates the static export.
- **`localStorage` is per-origin**, not per-device synced. Users on multiple devices won't see consistent choice. Acceptable for this site.
- **Region color treatment differs by view** (border on cards, left bar on rows). This is intentional (applying a full row border looked busy in early sketches) but it means the regional palette has two visual languages now. If we add list view elsewhere, reuse the same modifier pattern to keep them consistent.

## File diff summary

```
Add:
  components/ViewToggle.tsx
  components/ViewToggle.test.tsx

Modify:
  app/houses/page.tsx
  components/FilteredHouseList.tsx
  components/FilteredHouseList.test.tsx
  lib/regions.ts
  styles/houses.css
  styles/list-search.css
```
