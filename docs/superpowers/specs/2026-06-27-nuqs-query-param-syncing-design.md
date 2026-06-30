# Migrate query-param syncing to nuqs

- **Date:** 2026-06-27
- **Status:** Approved (pending spec review)
- **Branch:** `nuqs-integration`

## Goal

Replace the hand-rolled URL-state layer (`lib/listUrlState.ts`) with [`nuqs`](https://nuqs.dev), so all query-param state syncing goes through one well-maintained, type-safe library. The user-visible URL contract is preserved; the dragon and weapon lists — which today keep their search in local React state only — are brought onto the same URL-synced model.

## Background: what exists today

`lib/listUrlState.ts` implements URL state by hand:

- `useSyncExternalStore(subscribeToUrlChange, readUrlSearch, getServerSnapshot)` reads `window.location.search`.
- Writes go through `writeUrlParam(s)` → `history.replaceState` → a synthetic `tkw:urlchange` event (because `replaceState` does not fire `popstate`), which the subscriber listens for alongside `popstate`.
- Helpers parse/validate params and omit defaults for clean URLs.

Consumers:

| Component                | Params                          | Notes                                                                                                                                             |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FilteredCharacterList`  | `search`, `dir`, `size`, `page` | Search debounced 300ms before filtering **and** URL write; changing search/dir/size resets `page` → 1. View toggle (grid/list) in `localStorage`. |
| `FilteredHouseList`      | `search`, `dir`, `size`, `page` | Identical pattern to the character list.                                                                                                          |
| `FamilyTreeViewSwitcher` | `tree` (`list`/`chart`)         | Rendered via `components/FamilyTreeViews/FamilyTreeViews.tsx` on the house page.                                                                  |
| `FilteredDragonList`     | — (local only)                  | Local `value` + 300ms `debounced` state; **no URL today**.                                                                                        |
| `FilteredWeaponList`     | — (local only)                  | Same local-only pattern as dragons.                                                                                                               |

The URL contract is pinned by ~50 behavior tests in `FilteredCharacterList.test.tsx` / `FilteredHouseList.test.tsx`:

- Defaults are omitted (`?` cleared when a value returns to default).
- `dir` accepts only `asc`/`desc`; `size` only `{16,32,64,128}`; `page` only integers ≥ 1; invalid values fall back to defaults.
- Unrelated query params **and** the `#hash` are preserved on every write (e.g. `?sort=name#top` + typing search → `?sort=name&search=arya` + `#top`).

## The architecture-defining constraint: static export + Suspense

The app builds with `output: 'export'` (fully static). nuqs's App Router adapter reads through `useSearchParams`, so **every component calling `useQueryState`/`useQueryStates` must sit inside a `<Suspense>` boundary**. Under `output: 'export'` an unwrapped `useSearchParams` is a hard build error (`missing-suspense-with-csr-bailout`), not a warning.

Consequences:

1. All five consumers must be wrapped in a `<Suspense>` boundary at their render site.
2. Whatever the boundary's fallback renders is what lands in the prerendered static HTML; the real component renders on hydration.
3. `bun run build` (static export) is the definitive proof the boundaries are correct and becomes a required acceptance check.

## Decisions

1. **Scope — dragons/weapons:** bring `FilteredDragonList` and `FilteredWeaponList` onto nuqs too. They gain a single `search` query param (no sort/size/pagination — those features don't exist on those pages and adding them is out of scope).
2. **Static fallback — minimal skeleton:** list pages render a layout-stable skeleton (the search row) in static HTML; the real list renders on hydration. The data is already shipped to the client as props, so hydration is near-instant. The default first-page list is no longer in the prerendered HTML for these index pages; the SEO-critical entity pages (`/characters/[slug]`, `/houses/[slug]`, …) remain fully prerendered and are unaffected. The family-tree switcher's fallback renders its default `list` view (trivial, preserves that content).
3. **Filter timing — preserve 300ms debounce:** keep today's behavior exactly. A local debounce continues to gate **both** filtering and the nuqs URL write, so the list only re-filters after 300ms. nuqs replaces the read/write mechanism, not the debounce. No filter-timing tests change.
4. **View toggle stays in `localStorage`:** grid/list view is not a query param today; moving it to the URL is out of scope.

## Detailed design

### 1. Dependency

Add `nuqs` pinned to an exact version (`2.8.9`) — no `^`/`~`, per repo rules. Install with Bun.

### 2. Adapter

Wrap the layout's children in `NuqsAdapter` (`nuqs/adapters/next/app`). The layout is a server component; `NuqsAdapter` is a client provider but renders fine from a server component.

```tsx
// app/layout.tsx
import { NuqsAdapter } from "nuqs/adapters/next/app";
// ...
<body>
  <SiteHeader />
  <SiteMenu />
  <NuqsAdapter>{children}</NuqsAdapter>
  <SiteFooter />
</body>;
```

### 3. Shared param contract — `lib/listSearchParams.ts`

`lib/listUrlState.ts` is removed and replaced by `lib/listSearchParams.ts`, which centralizes the nuqs parser definitions and the page-size constants the lists still need:

- `searchParser` — `parseAsString.withDefault("")` (shared by all four lists).
- `listSearchParsers` — a map `{ search, dir, size, page }` for `useQueryStates`, used by the character and house lists:
  - `dir` — string-literal parser over `["asc","desc"]`, default `"asc"`.
  - `size` — number-literal parser over `[16,32,64,128]` (validate exact API; fall back to integer-parser + guard if `parseAsNumberLiteral` is unavailable), default = the list's configured `pageSize`.
  - `page` — integer parser, default `1`, with a guard that values < 1 fall back to 1.
- Re-export the still-needed constants: `PAGE_SIZE_OPTIONS`, `MIN_PAGE_SIZE`, page-size default.

nuqs's `.withDefault(...)` omits the default from the URL automatically, matching the current clean-URL behavior. The `tree` parser stays local to the switcher (it is unrelated to the list contract).

### 4. Component rewrites

**`FilteredCharacterList` / `FilteredHouseList`** — replace `useSyncExternalStore` + `parseUrlSearch` + `writeUrlParam(s)` with nuqs hooks reading `listSearchParsers`:

- `dir`, `size`, `page` are read/written via nuqs directly (instant). Changing `dir` or `size`, and paginating, set their value and reset `page` → 1; nuqs batches concurrent setter calls in one handler into a single URL update, preserving today's single-write behavior.
- **Search keeps its local debounce** to satisfy decision 3: the input is controlled by an instant local `value`; a 300ms `debounced` local value drives filtering; an effect writes the debounced value to the nuqs `search` state (and resets `page` → 1). On mount, the local values initialize from the nuqs `search` value so `?search=` still hydrates the input and filter.
- The grid/list view-toggle `localStorage` logic is untouched.

**`FilteredDragonList` / `FilteredWeaponList`** — keep their existing instant `value` + 300ms `debounced` filtering; add nuqs `search` sync by initializing the local values from the nuqs `search` on mount and writing the debounced value back through nuqs. Result: their search now lives in the URL with the same debounced behavior the character/house lists use.

**`FamilyTreeViewSwitcher`** — replace `useSyncExternalStore`/`parseMode` with a single `useQueryState("tree", parseAsStringLiteral(["list","chart"]).withDefault("list"))`. The mobile-only branch and `ViewToggle` wiring are unchanged.

### 5. Suspense boundaries

Wrap each consumer in `<Suspense>` at its render site:

- `app/characters/page.tsx`, `app/houses/page.tsx`, `app/dragons/page.tsx`, `app/weapons/page.tsx` → wrap the `<Filtered*List>` with a minimal skeleton fallback (the search-row markup; reuses `listSearch.module.scss` so layout is stable).
- House page (via `components/FamilyTreeViews/FamilyTreeViews.tsx`) → wrap the switcher with a fallback that renders the default `list` view node.

A small shared fallback component (e.g. `ListSearchSkeleton`) keeps the four list fallbacks consistent.

### 6. Removal

Delete `lib/listUrlState.ts` after migrating its still-used constants into `lib/listSearchParams.ts`. It has no co-located test. Update the three importers accordingly.

## URL contract preservation

| Param            | Today                                    | After                                         |
| ---------------- | ---------------------------------------- | --------------------------------------------- |
| `search`         | string, default `""`, omitted when empty | `parseAsString.withDefault("")` — same        |
| `dir`            | `asc`/`desc`, default `asc`              | string-literal parser, default `asc` — same   |
| `size`           | `{16,32,64,128}`, default = page size    | number-literal parser — same                  |
| `page`           | int ≥ 1, default 1                       | integer parser + ≥1 guard — same              |
| `tree`           | `list`/`chart`, default `list`           | string-literal parser — same                  |
| unrelated params | preserved                                | nuqs only touches keys it manages — preserved |
| `#hash`          | preserved                                | preserved by nuqs (verify during impl) — same |

## Testing strategy

- Adopt `nuqs/adapters/testing` (`withNuqsTestingAdapter`). Add a small render helper that wraps components in the testing adapter; tests that need an initial URL pass `searchParams`, and tests asserting writes pass an `onUrlUpdate` spy. Every test rendering a nuqs consumer needs the adapter (the hooks require an adapter in context).
- Migrate the ~50 existing assertions from reading `window.location.search` / `window.location.hash` to asserting the nuqs `onUrlUpdate` result. These assertions become **order-independent** (assert `searchParams.get("search")`, that unrelated params survive, and that the hash survives) rather than matching an exact query string.
- The local-debounce filter tests (`fake timers`, "does not filter until 300ms", "filters once 300ms elapses") are preserved unchanged, since the local debounce is kept.
- Add URL tests for `FilteredDragonList` and `FilteredWeaponList` (hydrate from `?search=`, write debounced search, clear to remove the param).
- Add/extend `FamilyTreeViews.test.tsx` for the `tree` param via the testing adapter.
- **Risk to verify:** nuqs applies an internal throttle to URL writes; under `vi.useFakeTimers()` the `onUrlUpdate` spy may fire after a timer tick. Confirm whether tests must advance/flush timers after a write, and adjust the helper accordingly.

## Behavior changes (explicit)

- **Filter timing:** none — 300ms debounced filtering is preserved.
- **List index static HTML:** the four list pages now ship a skeleton in their prerendered HTML instead of the default first-page list; the list renders on hydration. Entity detail pages are unaffected.
- **Dragons/weapons:** their search is now reflected in the URL (new `search` param), shareable/bookmarkable like the other lists.

## Out of scope

- Moving the grid/list view toggle from `localStorage` to the URL.
- Adding sort/size/pagination to the dragon/weapon lists.
- Map pan/zoom or family-tree chart transform state (local UI state, not query params).

## Acceptance criteria

- `bun run build` succeeds (static export — proves Suspense boundaries are correct).
- `bun run typecheck`, `bun run lint`, and `bun run test` all pass.
- `lib/listUrlState.ts` is gone; no remaining imports of it.
- The five components read/write their params through nuqs; the URL contract above is unchanged for `search`/`dir`/`size`/`page`/`tree`, including default omission, validation fallbacks, and hash/unrelated-param preservation.
- Dragons and weapons sync `search` to the URL.

## Risks

- **`parseAsNumberLiteral` availability / exact API** — verify against nuqs 2.8.9; fall back to integer parser + validation if needed.
- **Hash preservation** — nuqs preserves the hash by default; confirm with a test.
- **Fake-timer interaction with nuqs's throttle** — see testing risk above.
- **Static-export build** — the primary integration risk; caught by `bun run build` in CI/pre-push.
