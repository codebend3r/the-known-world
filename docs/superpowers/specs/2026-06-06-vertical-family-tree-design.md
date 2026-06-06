## Vertical (chart) family tree view: Design Spec

**Date:** 2026-06-06
**Status:** Draft, pending user approval
**Scope:**

- New: `lib/family-tree-portraits.ts`, `lib/family-tree-layout.ts`, `components/FamilyTreeChart/`, `components/FamilyTreeViews/`.
- Edited: `components/ViewToggle/ViewToggle.tsx` (made polymorphic), `components/ViewToggle/index.ts` (re-exports), new `components/ViewToggle/icons.tsx`, `components/FilteredCharacterList/FilteredCharacterList.tsx`, `components/FilteredHouseList/FilteredHouseList.tsx`, `app/houses/[slug]/page.tsx`, and the co-located test files for each.
- Unchanged: `lib/family-tree.ts`, `components/FamilyTree/` (the list view stays as-is), `lib/portraits.ts`.

## Overview

The current `Family Tree` section on a house page renders a list-style indented hierarchy where each row is a person plus their spouse(s). It reads as text, with horizontal sprawl from spouse rows and right-ward indentation per generation.

This spec adds a second, opt-in view: a vertical top-down genealogy chart, rendered as SVG, contained inside a fixed bounding box with pan and zoom (like a mini Google Maps). Each person is a small dot, optionally filled with their portrait. A compact "First L." label sits above each dot. Hovering or focusing a dot reveals the full name as a tooltip. The two views are togglable via a small button group next to the `Family Tree` heading, with the chosen view persisted in the URL as `?tree=list` or `?tree=chart`. List remains the default.

## Goals

- Offer a visually richer, more compact view of large family trees that fits at a glance and supports inspection through zoom/pan.
- Keep the list view unchanged and the default, so nothing regresses for existing users.
- Render the chart entirely from data already on disk (no new content schema fields).
- Reuse the existing `ViewToggle` styling by making it polymorphic, so the same component drives the houses list, characters list, and family tree views.
- Stay within the static export constraint (`output: 'export'`): no server actions, no route handlers, all interactivity client-side.
- Add zero new runtime dependencies.

## Non-goals

- Changing the list view's content, ordering, or styling.
- Adding a portrait field to the character markdown frontmatter (portraits remain convention-based: `public/characters/<slug>.<ext>`).
- Showing dragons, weapons, castles, or events inside the chart.
- Animated drawing of the tree, particle effects, or other flourishes.
- Replacing the list view on character pages or anywhere outside the house page.
- Generic interactive zoomable canvas usable across the site.
- Server-side caching of computed layout (recomputed per request is fine for static export).

## UX & visual structure

### Heading row

```
+--------------------------------------------------------+
|  Family Tree                          [ ≡ ] [ ⤴ ]      |
+--------------------------------------------------------+
```

The toggle sits to the right of the `Family Tree` `<h2>`, justified opposite the heading on the same row. `[ ≡ ]` is the list icon, `[ ⤴ ]` is the chart icon (a small org-chart glyph: one node connecting to three children). The heading row uses CSS grid with `grid-template-areas: "heading toggle"` and the toggle right-aligned. Below it, exactly one view is visible at any time.

### List view

Unchanged from today. The `FamilyTree` component renders the same hierarchical `<ul>` of `NodeRow`s with spouses, lifespans, gender glyphs, and crown marks.

### Chart view

Rendered inside a fixed bounding box: responsive width (parent column width), aspect ratio 4:3, `overflow: hidden` so the chart is always contained. Parchment-styled border matching the list view's `.row` border.

The SVG fills the bounding box. Its `viewBox` is fixed to the bounding-box dimensions (NOT the chart bounds) — the chart is rendered inside an inner `<g>` whose `transform="translate(tx, ty) scale(s)"` is driven by pan/zoom state.

**Per-person rendering:**

- A `<circle>` dot of radius 14 (at 100% zoom) centered on its laid-out point. Stroke is parchment ink (`rgba(107, 68, 35, 0.6)`), fill is parchment background by default.
- If a portrait file exists for the slug, an `<image>` is overlaid, clipped to the circle via a per-person `clipPath`. The image is sized to the bounding square of the circle and uses `preserveAspectRatio="xMidYMid slice"` for a center-cropped fit.
- A `<text>` label is positioned above the dot, font size 9 (in viewBox units), font family `var(--font-ui)`, color `var(--ink-faded)`, text-anchor middle. Content is `"<first name> <last initial>."`, computed at build time by splitting the character's `name` on whitespace. Single-word names render as just the first name. The label is rendered above the dot regardless of zoom level (it scales with the chart).
- A `<title>` child of the person `<g>` carries the full name plus alias in parentheses if any (e.g. `"Eddard Stark (Ned)"`). Browsers render this as a native tooltip on hover/focus.
- The entire person `<g>` is wrapped in an `<a href="/characters/<slug>/">` (SVG anchor element) for click-through. External and placeholder characters render with the same faded styling as the list view (dotted stroke for placeholders, lower opacity for external) and are not wrapped in an anchor if they have no character page.

**Spouses:**

- Each person's first in-house or external spouse renders as a second `<circle>` adjacent to the person's dot (to the right, separated by 24 viewBox units). A small `⚭` glyph as a `<text>` sits between the two dots.
- The spouse pair is treated as a single layout unit during sibling packing.
- Their joint children's connector line descends from the midpoint between the two dots.
- Additional spouses (rare) are stacked vertically below the first spouse with the same `⚭` joiner. The same children-line midpoint is used.

**Connector lines:**

- Orthogonal connectors: from each parent dot (or spouse-pair midpoint) a vertical line drops to a horizontal cross-bar that spans all children, then a vertical line rises from the cross-bar to each child dot.
- All connectors are `<line>` or `<path>` elements with `stroke="rgba(107, 68, 35, 0.5)"` and `stroke-width="1"` (in viewBox units, so they scale with zoom).

### Control panel (chart only)

Anchored bottom-right inside the bounding box, parchment-styled with a translucent background:

```
                                +--------------+
                                | [ + ]  [ − ] |
                                | 25 50 100 200|
                                | [ ⟲ Reset ]  |
                                +--------------+
```

- `+` / `−` buttons: continuous zoom in/out by factor 1.25 / 0.8, anchored on the box center, animated.
- `25 · 50 · 100 · 200`: preset percentages. The active preset is `aria-pressed="true"` and visually highlighted (parchment-gold underline).
- Reset: re-applies the initial-fit transform (centers and scales to show the whole chart with 5% padding).

All buttons are real `<button>`s with visible `aria-label`s. Whole control panel has `role="group"` and `aria-label="Chart controls"`.

### Empty / edge states

- Empty tree: same `<p>No members of this house have yet been recorded.</p>` as today. Toggle still renders; selecting `chart` is a no-op aside from the empty message.
- Single root with no children: chart bounds are just the root unit + padding; fit logic still works.
- Single root with one child: trivial vertical line.
- Spouse missing/external: smaller adjacent dot with faded fill, no portrait, no link if external and no `primary-house` page.
- Portrait file missing: the existing `findPortrait` fallback (`/characters/unknown-{m,f}.png`) is used as-is.

## Architecture

### File layout

```
lib/
  family-tree.ts                       (existing, unchanged)
  family-tree-portraits.ts             (NEW)
  family-tree-portraits.test.ts        (NEW)
  family-tree-layout.ts                (NEW)
  family-tree-layout.test.ts           (NEW)
  portraits.ts                         (existing, unchanged)

components/
  ViewToggle/
    ViewToggle.tsx                     (edited — made polymorphic)
    ViewToggle.module.scss             (unchanged)
    ViewToggle.test.tsx                (rewritten around generic API)
    icons.tsx                          (NEW — GridIcon, ListIcon, TreeChartIcon)
    index.ts                           (re-exports component + icons + ViewMode)

  FamilyTree/                          (existing, unchanged)

  FamilyTreeChart/                     (NEW)
    FamilyTreeChart.tsx                (client component)
    FamilyTreeChart.module.scss
    FamilyTreeChart.test.tsx
    index.ts

  FamilyTreeViews/                     (NEW)
    FamilyTreeViews.tsx                (server component)
    FamilyTreeViewSwitcher.tsx         (client component)
    FamilyTreeViews.module.scss
    FamilyTreeViews.test.tsx
    index.ts

  FilteredCharacterList/
    FilteredCharacterList.tsx          (edited — passes options array)
    FilteredCharacterList.test.tsx     (unchanged behavior)

  FilteredHouseList/
    FilteredHouseList.tsx              (edited — passes options array)
    FilteredHouseList.test.tsx         (unchanged behavior)

app/houses/[slug]/page.tsx             (edited — swaps FamilyTree for FamilyTreeViews)
```

### Server / client boundary

- **Server (runs at build time during `next build`):**
  - `app/houses/[slug]/page.tsx` calls `buildFamilyTree(slug, characters)` (existing), then `enrichTreeWithPortraits(tree)` (new), then `layoutFamilyTree(enriched)` (new).
  - `FamilyTreeViews` is a server component that takes `roots` (the enriched list-view data) and `chart` (the laid-out chart data) and renders both `<FamilyTree>` and `<FamilyTreeChart>` as children.
  - The list view (`<FamilyTree>`) stays a server component and continues to render Next.js `<Link>`s.

- **Client (`"use client"`):**
  - `FamilyTreeViewSwitcher` reads `useSearchParams()`, picks the active mode (`list` or `chart`), renders the `<ViewToggle>` and conditionally shows the matching child. Default mode is `list`; the URL is updated via `router.replace()` with the same `?tree=` pattern the existing filtered lists use for URL state.
  - `FamilyTreeChart` is the SVG island. It receives pre-laid-out data as props, owns pan/zoom state, and renders the SVG + control panel. It uses plain `<a href="/characters/<slug>/">` (SVG anchor, not Next.js `<Link>`) which is fine for static export — the trailing slash matches the export output.

### Data flow

```
app/houses/[slug]/page.tsx (server)
  ↓ buildFamilyTree                     → TreeNode[]                 (existing)
  ↓ enrichTreeWithPortraits             → EnrichedTreeNode[]         (NEW)
  ↓ layoutFamilyTree                    → LaidOutChart               (NEW)
  ↓ pass roots + chart as props
FamilyTreeViews (server)
  ├── FamilyTree roots={roots}                 (server, hidden when mode=chart)
  └── FamilyTreeChart chart={chart}            (client, hidden when mode=list)
  wrapped in FamilyTreeViewSwitcher (client)
```

`useSearchParams` is the same client-side runtime the filtered lists use; it reads the live URL without breaking static export.

## Data shapes

### Enriched tree (server-side)

```ts
// lib/family-tree-portraits.ts
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

export interface EnrichedTreeSpouse extends TreeSpouse {
  portrait: string | null; // null for placeholder, external-with-no-asset, etc.
}

export interface EnrichedTreeNode extends Omit<
  TreeNode,
  "spouses" | "children"
> {
  portrait: string | null;
  spouses: EnrichedTreeSpouse[];
  children: EnrichedTreeNode[];
}

export async function enrichTreeWithPortraits(
  roots: TreeNode[],
): Promise<EnrichedTreeNode[]>;
```

Implementation: a depth-first walk over the tree. For each person, `portrait` is:

- `null` if the person is a `placeholder` or is `external` (no portrait shown in the chart — the bare circle reads as "unknown / not of this house").
- `await findPortrait(slug, sex)` otherwise. The existing helper always returns a string (the slug's portrait if present, else the `unknown-{m,f}.png` fallback).

Spouses: in-house spouses get the same treatment as persons (`findPortrait` or `null`). External spouses are always `null`. Spouses with no slug (rare; placeholder spouse referenced by name only) are always `null`.

Memoize the per-slug lookup so the same character (e.g. a spouse appearing in both branches) doesn't hit the filesystem twice.

### Laid-out chart (server-side)

```ts
// lib/family-tree-layout.ts

export interface LayoutPerson {
  slug: string;
  name: string;
  alias: string | null;
  sex: "m" | "f" | null;
  placeholder: boolean;
  external: boolean;
  portrait: string | null;
  titles: string[];
  born: number | null;
  died: number | null;
  x: number; // viewBox units, dot center
  y: number;
}

export interface LayoutSpouseEdge {
  person: LayoutPerson; // the in-house person
  spouse: LayoutPerson; // their pair partner
}

export interface LayoutChildEdge {
  from: { x: number; y: number }; // parent midpoint
  to: { x: number; y: number }; // child dot center
  busY: number; // y of the horizontal cross-bar
}

export interface LaidOutChart {
  persons: LayoutPerson[]; // every dot, including spouses
  spouseEdges: LayoutSpouseEdge[]; // ⚭ joiners
  childEdges: LayoutChildEdge[]; // parent → child connectors
  bounds: { width: number; height: number };
}

export function layoutFamilyTree(roots: EnrichedTreeNode[]): LaidOutChart;
```

**Layout algorithm (Reingold-Tilford-lite):**

1. **Constants** (all in viewBox units): `DOT_R = 14`, `LABEL_GAP = 10`, `LABEL_HEIGHT = 12`, `H_SPACING = 24` (between siblings), `V_SPACING = 80` (between generations), `SPOUSE_GAP = 24` (between a person and their spouse dot).
2. **Bottom-up pass:** compute each subtree's `width` as the sum of children's widths plus `H_SPACING` gaps, or the unit's own width if it's a leaf. A unit's own width is `2 * DOT_R + (numSpouses * (SPOUSE_GAP + 2 * DOT_R))` to account for spouse pairs.
3. **Top-down pass:** assign x to each subtree by laying children out side by side under the parent. The parent x is the midpoint of its children's x-range (or its own width center if leaf). The spouse dot x is `personX + SPOUSE_GAP + 2 * DOT_R`. y is `depth * V_SPACING + topPadding`.
4. **Child edges:** for each parent with children, the `busY` is `parent.y + DOT_R + (V_SPACING - 2*DOT_R) / 2`. From is the parent midpoint (or spouse-pair midpoint), to is each child's `(x, y - DOT_R)`.
5. **Bounds:** track min/max x and y across all persons (including labels), add padding.

The function is **pure**: no DOM, no async, no globals. Fully unit-testable.

### Search-param shape

- `?tree=list` (default, can be omitted)
- `?tree=chart`
- Any other value falls back to `list` and the URL is rewritten via `router.replace` to clear the bogus param.

## Polymorphic ViewToggle

```ts
// components/ViewToggle/ViewToggle.tsx
"use client";

export type ViewMode = "grid" | "list"; // shared union for list pages

type Option<T extends string> = {
  value: T;
  label: string; // becomes aria-label
  icon: React.ReactNode;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string; // defaults to "View"
};

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "View",
}: Props<T>): JSX.Element;
```

Existing visual styling (`.toggle`, `.button`) is untouched. The component maps over `options`, rendering a `<button>` per entry with `aria-pressed={value === option.value}` and clicking calls `onChange(option.value)` only when the value differs.

### Icons module

```tsx
// components/ViewToggle/icons.tsx
export function GridIcon(); // existing four-square glyph
export function ListIcon(); // existing three-bar glyph
export function TreeChartIcon(); // NEW — one node above three children connected by lines
```

The `TreeChartIcon` is a 16-unit-viewBox SVG: a top circle at (8, 3), three child circles at (3, 13), (8, 13), (13, 13), and vertical/horizontal connector lines drawn with `stroke="currentColor"`.

### Migration of existing callers

Both `FilteredCharacterList` and `FilteredHouseList`:

```tsx
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  type ViewMode,
} from "@/components/ViewToggle";

const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];

// existing state + handlers unchanged
<ViewToggle options={VIEW_OPTIONS} value={view} onChange={handleViewChange} />;
```

No other behavior changes; their existing tests for grid/list switching still pass.

## Pan / zoom mechanics

All state lives in `FamilyTreeChart`. The inner `<g>` uses the SVG `transform` **attribute** (not CSS), set to `translate(${tx} ${ty}) scale(${scale})`. SVG attribute notation is the unambiguous choice here: it operates in viewBox units, doesn't fight CSS transform-origin defaults, and matches how every other SVG renderer in this repo's stack handles transforms.

The outer SVG has `width="100%"` `height="100%"` `viewBox="0 0 boxW boxH"` and `preserveAspectRatio="xMidYMid meet"`. The bounding-box DOM element has `overflow: hidden`.

### State

```ts
type Transform = { scale: number; tx: number; ty: number };
const [transform, setTransform] = useState<Transform>(() =>
  initialFit(chart.bounds, boxAspect),
);
const animationRef = useRef<number | null>(null); // in-flight rAF id, used to cancel
```

`initialFit` computes the scale that fits the chart inside the box with 5% padding, then centers it: `scale = min(boxW / chartW, boxH / chartH) * 0.95`, `tx = (boxW - chartW * scale) / 2`, `ty = (boxH - chartH * scale) / 2`. This is also what the Reset button re-applies.

### Constants

```ts
const MIN_SCALE_FACTOR = 0.5; // can zoom out to half the fit scale
const MAX_SCALE = 4;
const WHEEL_SENSITIVITY = 0.0015;
const BUTTON_ZOOM_STEP = 1.25;
const ANIM_MS = 200;
```

### Pan

- Single `pointerdown` on the SVG (not on a dot or anchor): record `{ startX, startY, startTx, startTy }`. Set `pointer-events` on the SVG; do not capture on dots so anchor clicks still fire.
- `pointermove` while dragging: `setTransform({ ...transform, tx: startTx + (e.clientX - startX), ty: startTy + (e.clientY - startY) })`. Clamp via `clampTranslate`.
- `pointerup` / `pointercancel` / `pointerleave`: end drag.
- A small movement threshold (3px) distinguishes drag from click so dots remain clickable.
- `touch-action: none` on the SVG via CSS so the browser doesn't intercept the gesture for scrolling.
- Cursor: `grab` idle, `grabbing` during drag.

### Wheel zoom

- `onWheel` with `passive: false` (registered via a `useEffect` calling `addEventListener` directly so React's passive default doesn't apply): `e.preventDefault()`, compute the chart-space point under the cursor (`px = (e.clientX - boxLeft - tx) / scale`), apply `newScale = clamp(scale * (1 - e.deltaY * WHEEL_SENSITIVITY), minScale, MAX_SCALE)`, then adjust `tx` / `ty` so the same chart-space point lands under the same cursor pixel:
  - `tx = cursorX - px * newScale`
  - `ty = cursorY - py * newScale`

### Pinch zoom

- Track active pointers in `useRef<Map<number, { x: number; y: number }>>`.
- On the second `pointerdown`, capture a snapshot: midpoint of the two pointers in box coords, current distance, current `{ scale, tx, ty }`.
- On `pointermove` while two pointers are down, recompute distance and midpoint; `newScale = clamp(snapshot.scale * (distance / snapshot.distance), minScale, MAX_SCALE)`; anchor on the midpoint using the same math as wheel zoom.
- On a `pointerup` that drops to one pointer, drop back to single-finger pan starting from the remaining pointer's current position.

### Buttons

- `+`: `animateTransform(transform, zoomBy(transform, BUTTON_ZOOM_STEP, boxCenter), ANIM_MS, setTransform)`
- `−`: `animateTransform(transform, zoomBy(transform, 1 / BUTTON_ZOOM_STEP, boxCenter), ANIM_MS, setTransform)`
- `25 / 50 / 100 / 200`: `animateTransform(transform, zoomTo(transform, 0.25 | 0.5 | 1 | 2, boxCenter), ANIM_MS, setTransform)` — these are absolute viewBox-unit scales, not relative to the fit. At 100% the chart renders at its laid-out size (1 viewBox unit = 1 viewBox unit).
- Reset: `animateTransform(transform, initialFit(...), ANIM_MS, setTransform)`
- Active-preset highlight: the preset whose value matches `transform.scale` (within a small epsilon) gets `aria-pressed="true"`.

### Bounds clamping

`clampTranslate(scale, tx, ty, chart.bounds, boxW, boxH)` ensures at least half the chart's scaled width/height stays inside the box:

- `minTx = boxW - chartW * scale * 0.5`
- `maxTx = -chartW * scale * 0.5`
- (analogous for ty)
- If `chartW * scale < boxW`, just center: `tx = (boxW - chartW * scale) / 2` (same for ty).

This is the "Google Maps stays in view" feel.

### Animation

Drag, wheel, and pinch are never animated — they need to feel direct, and the new transform is applied immediately each frame.

Button-driven zooms (`+`, `−`, presets, Reset) animate by interpolating between the current and target transform over `ANIM_MS` (200ms) using `requestAnimationFrame`. A small helper:

```ts
function animateTransform(
  from: Transform,
  to: Transform,
  durationMs: number,
  onUpdate: (t: Transform) => void,
) {
  const start = performance.now();
  function tick(now: number) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    onUpdate({
      scale: from.scale + (to.scale - from.scale) * eased,
      tx: from.tx + (to.tx - from.tx) * eased,
      ty: from.ty + (to.ty - from.ty) * eased,
    });
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

A `useRef<number | null>` tracks the in-flight rAF id so a second button press cancels the prior animation. If `prefers-reduced-motion: reduce` is set, the helper short-circuits to a single `onUpdate(to)` call (no animation). The media query is read once with a `useEffect` registering a `matchMedia` listener.

## Accessibility

- Toggle: two real `<button>`s in a `role="group"` with `aria-label="Family tree view"`. Each has `aria-pressed` and a visible `aria-label`.
- Chart anchors: every dot is wrapped in `<a href="/characters/<slug>/">`. Tab order follows DOM order, which follows the laid-out top-down generations (left-to-right within a generation).
- Tooltips: native SVG `<title>` for full name. Screen readers announce on focus.
- Control panel buttons: real `<button>`s with `aria-label`s; reset button labelled "Reset zoom".
- Reduced motion: zoom transitions are skipped.
- Color contrast: dot stroke and connector lines reuse existing parchment-ink tokens already used in the list view.
- The chart has `role="img"` and `aria-label="Family tree chart for House <name>"` on the outer SVG for screen-reader users who don't want to crawl the dots.

## Testing strategy

All tests use Vitest + Testing Library, co-located.

### `lib/family-tree-portraits.test.ts`

- Walks a small tree and asserts portraits are added to every node and in-house spouse.
- In-house person with a portrait file: portrait equals the path the stub returns.
- In-house person whose `findPortrait` returns the unknown fallback: portrait equals the fallback path (not `null`).
- Placeholder person: portrait is `null`, `findPortrait` is NOT called.
- External spouse: portrait is `null`, `findPortrait` is NOT called.
- Memoization: the same slug appearing twice is fetched once (assert call count on the stub).

### `lib/family-tree-layout.test.ts`

- Single root: bounds equal one unit + padding.
- Root with three same-height children: parent x is centroid; children evenly spaced.
- Deep linear lineage: y values are `depth * V_SPACING` cumulative.
- Spouse pair: unit width includes the spouse; child edges descend from the pair midpoint.
- Mixed subtree widths: parent x is the centroid of children's spans, not the literal midpoint of their positions.
- Placeholder + external nodes are laid out (they're not filtered).
- Snapshot of bounds plus a handful of expected coords per case (small, hand-computed expected values to keep snapshots readable).

### `components/ViewToggle/ViewToggle.test.tsx`

- Rewritten around the generic API.
- Renders 2 options with the icons it's given.
- Renders 3 options (smoke test for the generic).
- `aria-pressed` reflects current value.
- Clicking the active button does NOT call `onChange`.
- Clicking an inactive button calls `onChange` with that value.
- `ariaLabel` prop overrides the default `"View"`.

### `components/FamilyTreeChart/FamilyTreeChart.test.tsx`

- Renders one `<circle>` per person (including spouses).
- Renders the label as "First L." (and just "First" for single-word names).
- `<title>` carries `"Full Name (Alias)"` when alias is present, just `"Full Name"` otherwise.
- Portrait `<image>` exists when `portrait` is non-null; absent otherwise.
- Anchor `<a>` `href` is `/characters/<slug>/` for non-external, non-placeholder persons; absent for placeholders.
- Control panel renders all 7 buttons (+, −, 25, 50, 100, 200, Reset).
- Pan: `pointerdown` + `pointermove` + `pointerup` updates the inner-g `transform` attribute (assert via `getAttribute("transform")`).
- Wheel zoom: `wheel` event updates the scale and re-anchors at the cursor position (assert tx/ty math).
- Button zoom: clicking `+` increases scale by ~25%; clicking `100` sets it to exactly 1.
- Reset: clicking Reset restores the initial-fit transform.
- Active preset is highlighted (`aria-pressed="true"`) for the matching scale.
- Pinch: simulated two-pointer move scales correctly (use `pointerdown`/`pointermove` with `pointerId`s 1 and 2).

### `components/FamilyTreeViews/FamilyTreeViews.test.tsx`

- Default URL (no `?tree=`) renders the list view; chart is hidden.
- `?tree=chart` renders the chart view; list is hidden.
- `?tree=garbage` falls back to list view.
- Toggle buttons reflect the active mode via `aria-pressed`.
- Clicking the chart-mode button calls `router.replace` with `?tree=chart`.

### Existing list tests

`FilteredCharacterList.test.tsx` and `FilteredHouseList.test.tsx` need no functional updates beyond ensuring they still find both toggle buttons and still trigger the existing `handleViewChange` behavior. The mechanical change to `VIEW_OPTIONS` is transparent at the DOM level.

## Open questions

None at design time. The following are explicit choices already made:

- Initial chart mode is `list` (not chart), to preserve the current default experience and SEO crawl path.
- `?tree=` URL state, not `localStorage`, so the chosen view is shareable and deep-linkable. (The houses list uses `localStorage` for its own toggle; the family tree intentionally picks URL state for parity with the filtered-list URL-state pattern already in this repo.)
- No new dependency: pan/zoom is hand-rolled. If Safari pinch turns out to be flaky in practice, `react-zoom-pan-pinch` is the documented fallback.
- The list view stays the canonical view for accessibility / no-JS / print. The chart degrades gracefully (static SVG with no interactivity) without JS.

## Risks

- **Pinch zoom on Safari iOS**: pointer events with two-finger gestures can interact badly with the browser's native pinch on the surrounding page. Mitigation: `touch-action: none` on the SVG plus `e.preventDefault()` in the pointer handlers, and explicit testing on iOS Safari in QA. Fallback: `react-zoom-pan-pinch` is well-tested across browsers if hand-rolled proves brittle.
- **Wide trees at 25% zoom**: a Targaryen-sized tree may still feel cramped at 25%. Mitigation: the initial-fit scale is the lower bound (`fitScale * 0.5`), so the user can zoom further out than 25% if needed; the preset is a convenience, not a floor.
- **Portrait load count on first paint**: a house with 60 members triggers 60 `<image>` requests. Acceptable for a one-time view but worth monitoring; can be optimized later (lazy load offscreen, sprite sheet) if it bites.
- **SSR/CSR mismatch**: the initial transform must be deterministic so SSR and the first client render agree. Computing it from `chart.bounds` and a known boxAspect (`4 / 3`) keeps it pure; no `window.innerWidth` reads in the initial `useState`.

## Out of scope (future work)

- Toggle on character pages or anywhere outside house pages.
- Showing dragon/weapon ownership annotations in the chart.
- Interactive search ("jump to character") inside the chart.
- Bloodline highlighting (click a dot, highlight ancestors).
- Exporting the chart as PNG/SVG.
