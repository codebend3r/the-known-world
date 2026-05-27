# Atlas of the Known World

An interactive atlas of George R. R. Martin's world of Ice and Fire — map, timeline, encyclopedia, and the rolls of the great houses. Statically generated from a corpus of markdown files with Zod-validated frontmatter, rendered through a parchment-styled UI.

## Stack

- **Next.js 16** (App Router) with `output: 'export'` — every route is pre-rendered to static HTML.
- **React 19**.
- **TypeScript 5**.
- **Bun** for install, scripts, and the Netlify build.
- **Zod 4** for content schemas.
- **gray-matter** + **remark** / **remark-html** for markdown.
- **react-svg-pan-zoom** for the regional map view.
- **Vitest 4** + **jsdom** + **@testing-library/react** for unit and component tests.
- **Netlify** for hosting (build = `bun run build`, publish = `out/`).

## Getting started

```bash
bun install
bun dev          # http://localhost:3000
bun test         # vitest run
bun test:watch
bun run build    # static export → out/
bun run lint
```

## Project layout

```
app/                Next.js App Router routes
  page.tsx          Home — main menu of atlas sections
  the-north/        Regional view: interactive North map
  map/              Coming-soon stub
  timeline/         Coming-soon stub
  encyclopedia/     Coming-soon stub
  houses/           Index + per-house pages
    [slug]/         Per-house page with family tree
  castles/[slug]/   Per-castle page
  layout.tsx        Root layout (Cinzel / EB Garamond / Inter fonts)
  not-found.tsx

components/         React components
  ParchmentLayout, MainMenu, MainMenuTile, ComingSoonPage,
  MapStage, MapMarker, MapLayerToggle, NorthMapView,
  FamilyTree, DropCap, Sources

lib/                Domain logic (loaders, schemas, helpers)
  schemas.ts        Zod schemas for Castle / House / Person / Event
  content.ts        Markdown loaders + renderer
  family-tree.ts    buildFamilyTree
  map.ts            Map coord helpers
  relations.ts      House / person relation helpers
  *.test.ts         Co-located vitest specs

content/            Markdown source of truth
  castles/          9 entries (Winterfell, Casterly Rock, Highgarden, …)
  houses/           4 entries (Stark, Lannister, Targaryen, Tyrell)
  people/           63 entries — characters with parents/spouses/children

styles/             Hand-written CSS (parchment aesthetic)
  globals.css, parchment.css, map.css, main-menu.css, houses.css

public/map/         westeros.svg basemap

docs/superpowers/   Design specs + implementation plans
netlify.toml        Build config + 404 redirect
next.config.ts      output: 'export', trailingSlash: true
```

## Content model

All content is markdown with frontmatter validated by Zod (`lib/schemas.ts`). Cross-references between entries are by slug.

- **`House`** — `slug`, `name`, `seat` (castle slug), `liege`, `words`, `sigil.description`, `founded` (date), `status` (`extant` / `extinct` / `exiled` / `hidden`), `sworn-from`, `cadet-houses`, `sources`.
- **`Castle`** — `slug`, `name`, `type` (`castle` / `town` / `ruin` / `watchtower` / `holdfast`), `sub-region`, `liege-house`, `founded`, `sworn-houses`, `features`, `coords` (`{x, y}` on the basemap), `sources`.
- **`Person`** — `slug`, `name`, `born` / `died` (date or `null`), `primary-house`, `also-of-houses`, `parents`, `spouses`, `children`, `titles`, `placeholder` (+ reason), `sources`. Placeholder people fill unnamed slots in family trees.
- **`Event`** — `slug`, `name`, `type` (`battle` / `siege` / `treaty` / `wedding` / `death` / `betrayal` / `other`), `date`, `location` (castle slug or coords), `participants` (sides + houses), `outcome`, `casualties`, `sources`. Schema is in place; no event entries yet.

Dates use `{year, era, precision}` where `era` is one of `dawn-age`, `age-of-heroes`, `long-night`, `andal-invasion`, `targaryen-conquest`, `roberts-reign`, `game-of-thrones`, `AC`, `BC`, and `precision` is `exact` / `year` / `decade` / `era` / `legendary`.

Sources point back to AWOIAF (CC-BY-SA-3.0) or to a book / show / other reference.

## Routes today

| Route | Status | Notes |
| --- | --- | --- |
| `/` | live | Atlas main menu (Map · Timeline · Encyclopedia · Houses) |
| `/houses/` | live | A–Z list of houses, alphabetized by short name |
| `/houses/[slug]/` | live | Per-house page: words, seat link, sigil, founded, status, body, family tree |
| `/castles/[slug]/` | live | Per-castle page |
| `/the-north/` | live | Pan/zoom map of the North with layer toggle |
| `/map/` | stub | Coming soon |
| `/timeline/` | stub | Coming soon |
| `/encyclopedia/` | stub | Coming soon |

Per-house and per-castle pages are pre-rendered via `generateStaticParams` from the content directory.

## Family tree

`lib/family-tree.ts` builds a hierarchical tree for a house from the `parents` / `children` graph in `content/people/`. Placeholder ancestors fill in unnamed slots (e.g. unknown mothers). Rendered by `components/FamilyTree.tsx` on each house page.

## Testing

Vitest runs in jsdom with the React plugin and native tsconfig path resolution. Unit tests live next to the modules they cover (`lib/*.test.ts`, `components/*.test.tsx`).

```bash
bun test         # one shot
bun test:watch   # watch mode
```

## Deployment

Netlify builds with `bun run build` and publishes `out/`. The Next config sets `output: 'export'` and `trailingSlash: true`, so every page ships as an `index.html` under a directory. `netlify.toml` includes a catch-all 404 redirect.

## Design + planning docs

`docs/superpowers/` holds the specs and implementation plans the work has followed:

- `specs/2026-05-19-game-of-thrones-atlas-design.md` — overall atlas design
- `specs/2026-05-26-main-menu-design.md` — three-tile main menu
- `plans/2026-05-19-foundation-and-first-castle.md`
- `plans/2026-05-19-map-view.md`
- `plans/2026-05-26-main-menu.md`

## Convention notes

This repo uses a newer Next.js than most training data — read `node_modules/next/dist/docs/` for current APIs before writing route handlers, params, or metadata. See `AGENTS.md`.
