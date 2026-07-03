# Vertical Timeline — Design

Date: 2026-07-03
Status: approved

## Goal

Replace the `/timeline/` coming-soon stub with a desktop-first vertical timeline
in the style of the usefulcharts "Timeline of World History" poster: dates run
down the y-axis, geography runs across the x-axis. Populated with the 72
battles already in `content/battles/`; other event types come later.

## Requirements

- Y-axis is time. Vertical space between events is proportional to the time
  between them (linear scale). The page may grow as tall as it needs; users
  scroll.
- X-axis is landmass, three fixed columns, left to right: **Westeros**,
  **Essos**, **Summer Isles**.
- Every event is clickable and leads to more info (the existing
  `/battles/<slug>/` detail page).
- Events in the same year or a small window of years collapse into a clickable
  grouping (e.g. "4 events"); hovering or focusing the grouping expands it to
  reveal the individual events.
- Desktop-first. On narrow viewports the chart keeps a minimum width and
  scrolls horizontally inside its own container.

## Data

- Battles span 12000 BC → 300 AC (`absoluteYear` in `lib/battle-date.ts`
  already maps eras onto one signed axis). Distribution is lopsided: 9
  legendary battles across 12000–700 BC, then dense clusters (15 battles in
  299 AC, 6 in 298 AC, 5 in 300 AC).
- Landmass derivation: any battle with a `region` (all `REGION_SLUGS` are
  Westerosi, including Wall battles) → `westeros`. The 16 region-less battles
  get an explicit slug → landmass map in code: the Slaver's Bay, Rhoynish,
  Ghiscari, and Century of Blood battles → `essos`; the War of the Ninepenny
  Kings (Stepstones, fought against an Essosi alliance) → `essos`; the rest
  (Wall / beyond-the-Wall / continental legendary wars) → `westeros`.
- Summer Isles has no battles today; the column renders empty and awaits
  future events.

## Architecture

### `lib/timeline.ts` (pure, co-located tests)

- `type Landmass = "westeros" | "essos" | "summer-isles"`.
- `landmassForBattle({ battle })` — region present → `westeros`, else explicit
  slug map, else `westeros`.
- `buildTimeline({ battles })` — returns the full layout model:
  - `height` — chart height in px: `(maxYear − minYear) × PX_PER_YEAR` plus
    top/bottom padding. `PX_PER_YEAR = 2`, so ~25,000px for today's corpus.
  - `ticks` — `{ y, label }[]`: millennium lines through the BC stretch,
    half-century lines from 1 AC on, plus a line at year 0 labelled
    "Aegon's Conquest".
  - `eras` — `{ label, top, height }[]` bands for the ancient stretch (Dawn
    Age, Age of Heroes, Long Night, Andal Invasion) rendered along the axis
    so the sparse millennia read as eras rather than dead space.
  - `columns` — `Record<Landmass, TimelineNode[]>` where `TimelineNode` is
    either `{ kind: "single", y, event }` or
    `{ kind: "cluster", y, label, events }`. Events carry `slug`, `name`,
    `href`, and a `when` label from `formatBattleWhen`.
  - Clustering: per column, sort by year; greedily merge any event whose y
    lands within `CLUSTER_GAP_PX` (28px ≈ 14 years) of the previous node in
    the running group. Groups of one render as singles; larger groups become
    clusters labelled "N events" with a year-range sublabel.

### `components/TimelineChart/` (server)

Renders the model: a horizontally scrollable container holding a grid of
[year axis | Westeros | Essos | Summer Isles]. Sticky header row with the
three landmass titles. Chart body is `position: relative` with the computed
height inline (runtime value, so inline style, not SCSS); gridlines and era
bands are absolutely positioned full-width strips; each column positions its
nodes absolutely by `y`. Parchment styling from `styles/globals.scss` tokens.

### `components/TimelineCluster/` (client)

The "N events" pill. Expands on mouseenter and on focus-within (keyboard
reachable), collapses on mouseleave/blur/Escape, with `aria-expanded` on the
pill and the expanded stack listing each event as a link.

### Page + menus

- `app/timeline/page.tsx` — drops `ComingSoonPage`; loads battles via
  `loadAllBattles`, filters drafts, renders heading + `TimelineChart` inside
  `ParchmentLayout`.
- `MainMenu` Timeline tile loses `status="coming-soon"`; MainMenu tests update
  (pill count back to 0).

## Testing

- `lib/timeline.test.ts` — landmass mapping (region → westeros, the 8 Essos
  slugs, Ninepenny → essos), proportional spacing (Δy ratios match Δyear
  ratios), clustering (the 299 AC battles collapse into one cluster with the
  right count), tick/era coverage, height.
- `TimelineChart.test.tsx` — three column headers in order, single events are
  links with `/battles/<slug>/` hrefs, a cluster pill exists for 299 AC.
- `TimelineCluster.test.tsx` — collapsed by default, expands on hover/focus,
  `aria-expanded` flips, expanded stack exposes N links.

## Out of scope

- Non-battle event types (weddings, deaths, treaties) — schema groundwork
  exists (`EventSchema`) but content and loaders come later.
- Zoom controls, era compression, mobile-specific layout.
