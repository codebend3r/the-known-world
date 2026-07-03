# Vertical Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/timeline/` coming-soon stub with a desktop-first vertical timeline of all battles: time down the y-axis at a linear 2px/year, landmass columns (Westeros | Essos | Summer Isles) across the x-axis, near-simultaneous events collapsed into hover-expandable clusters.

**Architecture:** A pure layout module (`lib/timeline.ts`) turns `Battle[]` into a positioned model (height, ticks, era bands, per-column nodes). A server component (`TimelineChart`) renders the model with absolute positioning; a small client component (`TimelineCluster`) handles hover/focus expansion of grouped events.

**Tech Stack:** Next.js App Router, TypeScript, SCSS modules, Vitest + Testing Library.

Spec: `docs/superpowers/specs/2026-07-03-vertical-timeline-design.md`

## Global Constraints

- No `any`, no casts; type guards / `unknown` only (CLAUDE.md).
- `Array.prototype` methods over loops; no `for/of` / `for/in`.
- Optional chaining always paired with `??`; `!!` for boolean conversion.
- Single object parameter for multi-arg functions.
- SCSS modules, named `grid-template-areas` (never positional line spans), tokens from `styles/globals.scss`, grid + `gap` over margins.
- Every commit subject starts with `TKW:`; no agent attribution.

---

### Task 1: `lib/timeline.ts` layout model

**Files:**

- Create: `lib/timeline.ts`
- Test: `lib/timeline.test.ts`

**Interfaces (produced):**

- `type Landmass = "westeros" | "essos" | "summer-isles"`
- `LANDMASSES: readonly Landmass[]` (render order), `LANDMASS_LABELS: Record<Landmass, string>`
- `landmassForBattle({ battle }: { battle: Battle }): Landmass` — `region` present → `westeros`; else Essos slug set (`century-of-blood`, `ghiscari-wars`, `rhoynish-wars`, `sack-of-astapor`, `taking-of-yunkai`, `sack-of-meereen`, `battle-of-meereen`, `war-of-the-ninepenny-kings`); else `westeros`.
- `buildTimeline({ battles }: { battles: Battle[] }): TimelineModel` with:
  - `PX_PER_YEAR = 2`, `CLUSTER_GAP_PX = 28`, top/bottom padding constants
  - `TimelineEvent = { slug, name, href, year, when }` (`href` = `/battles/<slug>/`, `when` from `formatBattleWhen`)
  - `TimelineNode = { kind: "single", y, event } | { kind: "cluster", y, label, when, events }`
  - `ticks: { y, label }[]` — BC millennia, `0 → "Aegon's Conquest"`, AC half-centuries
  - `eras: { label, top, height }[]` — Dawn Age, Age of Heroes, The Long Night, Andal Invasion bands
  - `columns: Record<Landmass, TimelineNode[]>`, `height: number`
- Clustering: per column sort by year, greedy-merge events within `CLUSTER_GAP_PX` of the previous event's y; groups of 1 stay singles, else cluster labelled `"N events"` with a year-range `when`.

- [ ] Write failing tests: Essos/Westeros landmass mapping incl. Ninepenny → essos and Wall battles → westeros; Δy proportional to Δyear; 299 AC battles cluster with correct count; empty `summer-isles` column; ticks include `12000 BC`, `Aegon's Conquest`, `300 AC`.
- [ ] Run `bun run test lib/timeline` — expect module-not-found failure.
- [ ] Implement `lib/timeline.ts`.
- [ ] Tests pass; commit `TKW: timeline layout model in lib/timeline.ts`.

### Task 2: `TimelineCluster` client component

**Files:**

- Create: `components/TimelineCluster/TimelineCluster.tsx`, `components/TimelineCluster/TimelineCluster.module.scss`, `components/TimelineCluster/index.ts`
- Test: `components/TimelineCluster/TimelineCluster.test.tsx`

**Interfaces:**

- Consumes: `TimelineEvent` from `lib/timeline`.
- Produces: `<TimelineCluster label={string} when={string} events={TimelineEvent[]} />` — collapsed pill button with `aria-expanded`; expands on mouseenter/focus, collapses on mouseleave/blur-outside/Escape; expanded list renders one `Link` per event.

- [ ] Write failing tests: collapsed by default (no links); mouseenter reveals N links; `aria-expanded` flips; Escape collapses; focus expands.
- [ ] Implement; blur-outside uses an `instanceof Node` type guard on `relatedTarget` (no casts).
- [ ] Tests pass; commit `TKW: TimelineCluster hover/focus event grouping`.

### Task 3: `TimelineChart` server component

**Files:**

- Create: `components/TimelineChart/TimelineChart.tsx`, `components/TimelineChart/TimelineChart.module.scss`, `components/TimelineChart/index.ts`
- Test: `components/TimelineChart/TimelineChart.test.tsx`

**Interfaces:**

- Consumes: `TimelineModel`, `LANDMASSES`, `LANDMASS_LABELS`, `TimelineCluster`.
- Produces: `<TimelineChart model={TimelineModel} />` — header row of landmass headings; body `position: relative` with inline `height`; absolutely positioned gridlines/era bands/nodes; singles are `Link`s to battle pages; clusters render `TimelineCluster`; axis + columns aligned by a shared grid (named areas `axis westeros essos summer`); desktop-first, `min-width` + horizontal scroll under `--bp-md`.

- [ ] Write failing tests: three column headings in order Westeros/Essos/Summer Isles; a known single event links to `/battles/<slug>/`; a cluster pill labelled `"15 events"` exists (299 AC); chart height matches `model.height`.
- [ ] Implement component + SCSS (globals tokens only).
- [ ] Tests pass; commit `TKW: TimelineChart vertical chart component`.

### Task 4: wire the page + drop the coming-soon pill

**Files:**

- Modify: `app/timeline/page.tsx` (replace `ComingSoonPage` with heading + `TimelineChart`; load via `loadAllBattles`, filter drafts, `buildTimeline`)
- Modify: `components/MainMenu/MainMenu.tsx` (remove `status="coming-soon"` from Timeline tile)
- Test: update `components/MainMenu/MainMenu.test.tsx` (pill count back to 0)

- [ ] Update page, menu, tests; add approximate-date footnote matching the battles index.
- [ ] `bun run test` all green; commit `TKW: timeline page renders the battle chart`.

### Task 5: verification

- [ ] `bun run test`, `bun run lint`, `tsc --noEmit` (pre-commit also runs all three).
- [ ] `bun dev` → `/timeline/` renders; spacing proportional; clusters expand on hover; links navigate.
- [ ] Push branch.
