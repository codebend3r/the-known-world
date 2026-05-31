# Main Menu: Design Spec

**Date:** 2026-05-26
**Status:** Approved for planning
**Supersedes (partially):** the homepage portion of `2026-05-19-game-of-thrones-atlas-design.md`. That spec described a region-picker homepage; this spec promotes the front door one level higher to a section picker. The region picker concept is deferred until more than one region exists.

## Overview

Replace the current region-picker homepage with a three-tile main menu that exposes the three top-level sections of the atlas: **Map**, **Timeline**, **Encyclopedia**. All three tiles ship in a "coming soon" state and route to identical placeholder pages. The existing North map at `/the-north/` and the castle detail pages stay reachable by direct URL but are no longer linked from the homepage.

The Encyclopedia tile is the next thing slated to be built and will be designed in its own spec.

## Goals

- Establish the three-section information architecture at the door so future work has an obvious home.
- Ship as a self-contained, low-risk unit: no content schema changes, no data layer changes, no client-side state.
- Hold the parchment aesthetic: Cinzel headings, EB Garamond subtitles, ink-faded text, gold-leaf accent.
- Keep the existing routes (`/the-north/`, `/castles/[slug]/`) working unchanged.

## Non-goals

- ❌ Encyclopedia content, layout, or browse/search (its own spec, next).
- ❌ A region picker for the Map section (deferred until a second region exists).
- ❌ A persistent top navigation on every page (out of scope; the menu lives at `/` only).
- ❌ Real Timeline view (only a stub).
- ❌ Reworking `ParchmentLayout`, fonts, palette, or any other site chrome.

## Routes

```
/                  three-tile main menu (replaces today's region picker)
/map/              coming-soon stub
/timeline/         coming-soon stub
/encyclopedia/     coming-soon stub (replaced when the encyclopedia ships)

/the-north/        unchanged; reachable by direct URL, no longer linked from /
/castles/[slug]/   unchanged
```

Three new static routes, one rewritten page. Static export emits one `index.html` per route.

## Encyclopedia scope (forward reference)

The Encyclopedia is a unified browse-and-search surface over all four entity types from the original spec: **castles, houses, people, events**. The original spec's "Houses view" becomes one tab inside it. This menu spec does not implement any of that; it just commits to the name and ensures the tile routes somewhere coherent.

## Components

| File                            | Kind                  | Purpose                                                                                                                                                                 |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                  | rewrite               | Render `<MainMenu />` inside `ParchmentLayout`.                                                                                                                         |
| `components/MainMenu.tsx`       | new, server component | Three-up grid of three `<MainMenuTile>`s with fixed content (Map / Timeline / Encyclopedia).                                                                            |
| `components/MainMenuTile.tsx`   | new, server component | Single tile. Props: `title`, `subtitle`, `glyph`, `href`, `status?: "coming-soon"`. Wraps everything in a single `<Link>` so the whole surface is one focusable anchor. |
| `components/ComingSoonPage.tsx` | new, server component | Shared body for all three stubs. Props: `title`. Renders the section name, one sentence of body copy, and a "← Return to the menu" link back to `/`.                    |
| `app/map/page.tsx`              | new                   | One-liner: `<ComingSoonPage title="Map" />` inside `ParchmentLayout`.                                                                                                   |
| `app/timeline/page.tsx`         | new                   | `<ComingSoonPage title="Timeline" />`.                                                                                                                                  |
| `app/encyclopedia/page.tsx`     | new                   | `<ComingSoonPage title="Encyclopedia" />`.                                                                                                                              |
| `styles/main-menu.css`          | new                   | Tile grid, hover/focus treatment, glyph sizing, wax-seal pill. Imported once from `app/layout.tsx`.                                                                     |

No client components. No state. No data fetching.

## Visual structure

Three tiles. Desktop: three-column CSS grid (`grid-template-columns: repeat(3, 1fr)` at `≥720px`, gap `1.5rem`). Below 720px: single column.

```
┌────────────────────────────────┐
│   ✦ glyph (gold leaf)          │  ← compass / hourglass / book
│                                │
│   MAP                          │  ← Cinzel, small-caps feel, ink primary
│   Survey the realm.            │  ← EB Garamond italic, ink-faded
│                                │
│                   ⊙ Coming soon │  ← wax-seal pill, Inter, ink-faded
└────────────────────────────────┘
```

**Tile content (fixed in v1)**

| Tile | Title        | Subtitle             | Glyph     | Href             | Status      |
| ---- | ------------ | -------------------- | --------- | ---------------- | ----------- |
| 1    | Map          | Survey the realm.    | compass   | `/map/`          | coming-soon |
| 2    | Timeline     | Trace the centuries. | hourglass | `/timeline/`     | coming-soon |
| 3    | Encyclopedia | Consult the scribes. | book      | `/encyclopedia/` | coming-soon |

**Hover/focus:** 1px gold-leaf border, scale `1.01`, `150ms ease`. Cursor `pointer`. The whole tile is one anchor; tabbing lands on it once. Focus ring is visible (browser default plus the gold-leaf border).

**Glyphs:** Inline SVG strings (no extra HTTP fetches for a three-glyph page). Hand-drawn in the parchment style, ~32×32, `fill="currentColor"`, color set to `var(--gold-leaf)`.

**Wax-seal "Coming soon" pill:** Bottom-right of the tile. Inter, ink-faded color, tiny circle bullet (`⊙`) prefix. Tile remains clickable; the pill is informational only.

**Page chrome:** `ParchmentLayout` wraps everything (unchanged). Above the tile grid: an `<h1>` ("Atlas of the Known World") and a one-line italic EB Garamond subtitle ("Choose a path."). Nothing else.

## Coming-soon stub

The three stub pages render an identical layout via `<ComingSoonPage title=… />`:

```
Atlas of the Known World            (small caption, ink-faded, links to /)

MAP                                  (h1, Cinzel)
This section of the atlas has not yet been transcribed.   (EB Garamond)

← Return to the menu                 (text link to /)
```

Plain prose. No glyph. No grid. The "Atlas of the Known World" caption at the top doubles as a breadcrumb-style link home.

## Testing

**Static build:** `bun run build` succeeds and emits:

- `out/index.html`
- `out/map/index.html`
- `out/timeline/index.html`
- `out/encyclopedia/index.html`

The build is the strongest gate: a broken `<Link>` or missing import fails it.

**Vitest component tests**, same setup as `lib/*.test.ts`:

- `components/MainMenuTile.test.tsx`: renders title, subtitle, glyph; the whole tile is one anchor with the expected `href`; "Coming soon" pill renders only when `status === "coming-soon"`.
- `components/MainMenu.test.tsx`: renders exactly three tiles with the expected titles, hrefs, and `coming-soon` status on all three.
- `components/ComingSoonPage.test.tsx`: renders the title and a "Return to the menu" link with `href="/"`.

No tests against `app/*/page.tsx`, since they are one-line component wrappers; the build covers them.

**Manual verification (acceptance walk)**

- Visit `/`, click each tile, land on the matching stub, click "Return to the menu", land back at `/`.
- Resize below 720px wide; tiles stack into one column.
- Visit `/the-north/` directly; the existing map still loads.

**Out of scope:** axe a11y audit, visual regression snapshots, Lighthouse budget. Worth adding repo-wide later.

## Risks and trade-offs

- **`/the-north/` is no longer linked from the front door.** Direct URL still works; internal links from castle pages back to it are unaffected. We accept it as orphaned-from-home until the Map section is built and links to it from `/map/`.
- **Three "coming soon" tiles is a deliberately quiet front door.** It signals work in progress without faking completion. The encyclopedia work that follows immediately replaces the encyclopedia stub.
- **No persistent nav.** A user landing on `/castles/winterfell/` directly has no top-level link back to the menu. Acceptable for v1 because (a) castle pages already have content-level navigation, and (b) adding chrome to every page is a separate concern with its own design choices.

## File diff summary

```
Add:
  components/MainMenu.tsx
  components/MainMenuTile.tsx
  components/ComingSoonPage.tsx
  app/map/page.tsx
  app/timeline/page.tsx
  app/encyclopedia/page.tsx
  styles/main-menu.css
  components/MainMenuTile.test.tsx
  components/MainMenu.test.tsx
  components/ComingSoonPage.test.tsx

Modify:
  app/page.tsx         # replace region picker with <MainMenu />
  app/layout.tsx       # import styles/main-menu.css
```
