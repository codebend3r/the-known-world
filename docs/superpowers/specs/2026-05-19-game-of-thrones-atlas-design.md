# Game of Thrones Atlas — Design Spec

**Date:** 2026-05-19
**Status:** Approved for planning

## Overview

A static, parchment-themed web atlas of **the North** — Westeros's largest region. Three first-class views reachable from a top-level mode toggle:

- **Map** — pannable, zoomable SVG of the North with pins for castles, towns, ruins, watchtowers, and notable battle sites
- **Timeline** — vertical era-segmented chronicle from the Age of Heroes to 300 AC
- **Houses** — grid of every Northern house, each with its own detail page and full-screen family tree

Every castle, house, event, and person has a routed, statically-rendered URL — shareable on Reddit, indexable by Google, deep-linkable. Shipped as a Next.js static export on **Netlify**, installable as a PWA on phones.

## Goals

- Capture the North at depth (~500–1000 words per castle, ~ same per house, full canonical genealogies)
- Feel like *holding a piece of history* — the visual reference is the World of Ice and Fire interior pages and the Yi Ti / Ghiscari empire chapter openings
- Solo, passive, part-time-friendly: ship and iterate without external services to babysit
- Zero recurring cost beyond a domain
- Source content from A Wiki of Ice and Fire (CC-BY-SA-4.0) with proper attribution

## Non-goals (explicit fence)

- ❌ Essos, the Stepstones, the Summer Isles, Sothoryos — North only at launch
- ❌ User accounts, comments, forums, "favorite" lists
- ❌ Runtime backend or database — everything is built statically from Markdown in the repo
- ❌ Real-time updates — content changes ship via redeploy
- ❌ Search across external content — local index of our own pages only
- ❌ Native iOS/Android apps — PWA only; Capacitor stays as a deferred future option
- ❌ Image hosting at scale — only small CC-licensed sigils/illustrations

## System architecture

```
┌──────────────────────────────────────────────────────────┐
│  AUTHORING  (local laptop, run on demand)                │
│                                                          │
│  scripts/scrape.ts ──► hits AWOIAF MediaWiki API         │
│       │                                                  │
│       ▼                                                  │
│  content/                                                │
│  ├── castles/winterfell.md     ◄── you edit prose        │
│  ├── houses/stark.md           ◄── you edit prose        │
│  ├── people/eddard-stark.md    ◄── you edit prose        │
│  ├── events/red-wedding.md     ◄── you edit prose        │
│  └── map/north.svg             ◄── traced or sourced     │
└────────────────────┬─────────────────────────────────────┘
                     │  git push
                     ▼
┌──────────────────────────────────────────────────────────┐
│  BUILD  (Netlify on push)                                │
│                                                          │
│  next build →                                            │
│    1. parse all .md (gray-matter + remark)               │
│    2. validate frontmatter with zod                      │
│    3. resolve relation graph                             │
│    4. compute family tree layouts (dagre)                │
│    5. generate static pages per entity                   │
│    6. emit local search index (~50KB)                    │
│    7. emit service worker + PWA manifest                 │
└────────────────────┬─────────────────────────────────────┘
                     │  static files
                     ▼
┌──────────────────────────────────────────────────────────┐
│  RUNTIME  (user's browser, no server)                    │
│                                                          │
│  visits /castles/winterfell                              │
│       ▼                                                  │
│  static HTML + SVG map + cached assets                   │
└──────────────────────────────────────────────────────────┘
```

**Key property:** no runtime backend. Scraping is offline, building is offline, serving is static. Nothing to maintain or pay for between updates.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (app router) with `output: 'export'` | Static export → Netlify, indexable URLs, future Capacitor option |
| Language | TypeScript | Build-time safety on schemas and relations |
| Content | Markdown + YAML frontmatter | Writer-friendly + machine-readable; scraper writes it directly |
| Markdown parser | `gray-matter` + `remark` (with custom `[[slug]]` plugin) | Standard, well-supported |
| Schema validation | `zod` | Build fails fast on invalid frontmatter |
| Map | Inline SVG + `react-svg-pan-zoom` | Full parchment styling via CSS, no licensing risk |
| Family tree | `react-flow` + `dagre` layout | Custom node styling, built-in pan/zoom, computed layout cached at build |
| Timeline | Custom component, era-segmented | The 8000-year span needs non-linear compression |
| PWA | `next-pwa` (Workbox under the hood) | Service worker, manifest, offline cache |
| Fonts | Cinzel (headings), EB Garamond (body), Inter (UI chrome) | All Google Fonts, self-hosted |
| Deploy | Netlify (static) | Free tier, git-push-to-deploy |

## Data model

Four primary entity types (`castles`, `houses`, `people`, `events`), each as one `.md` file with structured YAML frontmatter and free-form prose body.

### Castle

`content/castles/winterfell.md`

```yaml
slug: winterfell
name: Winterfell
type: castle                  # castle | town | ruin | watchtower | holdfast
sub-region: northern-mountains
liege-house: stark
founded:
  year: -8000                 # negative = BC, positive = AC
  era: age-of-heroes
  precision: legendary        # exact | year | decade | era | legendary
sworn-houses: [karstark, umber, mormont, bolton]
features: [godswood, hot-springs, broken-tower, glass-gardens, crypt]
coords: { x: 412, y: 280 }    # SVG coordinates on content/map/north.svg
sources:
  - { type: awoiaf, url: "...", license: CC-BY-SA-4.0 }
  - { type: book, ref: "AGoT, Catelyn I" }
draft: false
```

### House

`content/houses/stark.md`

```yaml
slug: stark
name: House Stark
seat: winterfell              # slug of castle
liege: null                   # null = Great House
words: "Winter is Coming"
sigil: { description: "A grey direwolf on a white field" }
founded: { year: -8000, era: age-of-heroes, precision: legendary }
status: extant                # extant | extinct | exiled | hidden
sworn-from: [karstark, umber, mormont, bolton, ...]
cadet-houses: [karstark, greystark]
sources: [...]
draft: false
```

### Person

`content/people/eddard-stark.md`

```yaml
slug: eddard-stark
name: Eddard Stark
born: { year: 263, era: AC, precision: year }
died: { year: 299, era: AC, precision: year }
primary-house: stark
also-of-houses: []            # for people of multiple houses by marriage
parents: [rickard-stark, lyarra-stark]
spouses: [catelyn-tully]
children: [robb-stark, sansa-stark, arya-stark, bran-stark, rickon-stark]
titles: ["Lord of Winterfell", "Warden of the North", "Hand of the King"]
placeholder: false            # true = canonical but unnamed/unwritten
placeholder-reason: null      # unnamed | unwritten | uncertain
sources: [...]
draft: false
```

### Event

`content/events/red-wedding.md`

```yaml
slug: red-wedding
name: The Red Wedding
type: betrayal                # battle | siege | treaty | wedding | death | other
date: { year: 299, era: AC, precision: year }
location: the-twins           # slug of castle/town, OR { x, y } for field battles
participants:
  - { side: stark, houses: [stark, tully] }
  - { side: frey,  houses: [frey, bolton] }
outcome: stark-defeat
casualties: [robb-stark, catelyn-stark, grey-wind]
sources: [...]
draft: false
```

### Cross-linking

A custom `remark` plugin rewrites `[[slug]]` references in any Markdown body to typed links with the correct route. So in prose:

```markdown
The seat of [[stark]] for ~8000 years, Winterfell faced its
darkest hour during the aftermath of the [[red-wedding]].
```

Renders as proper links with hover preview cards. This is where the "deep" content depth pays off — the atlas should feel like a wiki you can fall into.

## Views

### Map view

- Single SVG of the North inside a `<MapStage>` React component
- Pan/zoom via `react-svg-pan-zoom` (pointer events handle trackpad + touch together)
- Markers = React components, positioned by `coords` from castle frontmatter
- Marker glyphs by `type`: filled circle (castle), hollow circle (town), X (ruin), tower icon (watchtower), crossed swords (battle from event frontmatter)
- Hover → label tooltip; click → route push to `/castles/{slug}`
- **Layer toggles** (parchment-styled panel): Castles · Towns · Battle sites · Sub-regions (shaded overlays)
- **Placeholder map at launch:** ship a hand-traced SVG of the North; wiring is the actual work, swapping in a better SVG later is one file change
- Mobile: same SVG, gestures via pointer events

### Timeline view

- Vertical scrubbable timeline
- **Era-segmented compression** rather than linear scaling (8000 BC → 300 AC literal would be ~99% prehistory dots)
- Era bands: Dawn Age · Age of Heroes · Long Night · Andal Invasion · Targaryen Conquest · Robert's Reign · Game of Thrones
- Event nodes plotted by `date`, sized by significance, colored by `type`
- **Filters** (sticky top): event types · houses involved · date range
- Click event → its detail page, which includes an **inset map** showing the location
- "Battle" event pages get a sub-panel: sides, houses on each, outcome, casualties (with links to person pages)

### Houses view

- Grid of parchment cards. Each: sigil description, house name, words italicized, seat name
- **Sort:** alphabetical · by age · by status · by region
- **Filter:** status (extant/extinct/exiled) · sworn-to (e.g., all Stark bannermen) · cadet branches
- Click → house detail page
- House detail: words, sigil, seat (linked), liege chain, sworn vassals (chip list), notable members, events involving them, related castles
- House detail page has a prominent **"View Family Tree"** CTA → `/houses/{slug}/tree`

### Family Tree view

`/houses/{slug}/tree` — full-screen pan/zoom genealogy.

- Rendered with **react-flow**, custom parchment-card nodes, hand-styled ink-line edges
- Layout computed at build time with `dagre`, shipped pre-positioned (react-flow just renders)
- **Node treatments:**
  - Canonical, named: solid parchment card with name + birth/death dates
  - Canonical but unnamed/unwritten (e.g., "Cregan Stark's third daughter, name unrecorded"): dashed border, italic placeholder name
  - Cadet branch: red-outlined card linking to the founded house's own tree
- **Edge treatments:**
  - Solid line: parent → child
  - Double horizontal line: marriage
  - Red dashed line: cadet branch
- Cross-house relationships are first-class — marriages from House Tully (e.g., Catelyn) show "↗ House Tully" annotation
- Performance: trees per house are tiny (rarely > 50 nodes), so no virtualization needed

### Coverage at launch

All Northern houses get at least a stub page even when little is canon: Stark, Bolton, Karstark, Greystark (extinct cadet), Umber, Mormont, Reed, Manderly, Glover, Cerwyn, Tallhart, Hornwood, Ryswell, Dustin, Locke, Flint (multiple), and any others surfaced by AWOIAF's "Northern houses" category.

## Aesthetic & visual system

Anchored on the **Aged Parchment** direction (chosen during brainstorming): the World of Ice and Fire interior pages and the Yi Ti / Ghiscari chapter openings.

### Palette

```
Parchment           #f4e4c1 → #e8d3a0   (page bg, gradient)
Ink (primary)       #3d2817               (body text)
Ink (faded)         #6b4423               (secondary, captions)
Wax seal            #8b1a1a               (accent, pins, sigil red)
Gold leaf           #d4a259               (highlights, drop caps)
Vellum              #f8ecd0               (cards, raised surfaces)
```

### Type

- **Headings** — Cinzel (small-caps feel, free, Google Fonts)
- **Body** — EB Garamond (readable, slightly aged)
- **UI / chips / data** — Inter (small sizes only, for chrome that shouldn't look historic)

### Texture & motion

- Subtle ink-fleck dots over backgrounds (CSS radial-gradients, ~5% opacity)
- Drop caps on first paragraph of every content page
- Soft sepia vignette on map and timeline backgrounds
- Page transitions: 200ms parchment fade — no slides or flips
- Pin hover: gold-leaf ring expansion

### Design rule that keeps it tight

Chrome (nav, filters, settings) uses Inter and muted ink. Content (prose, headings, the actual atlas) uses serif + parchment fully. Two design languages, deliberately separated.

## Scraping pipeline

A separate Node.js TypeScript CLI inside the same repo (under `scripts/`). Runs locally on demand.

**Commands:**

```bash
bun run scrape:castle winterfell        # one castle
bun run scrape:house  stark             # one house (+ enumerate its known members)
bun run scrape:event  red-wedding       # one event
bun run scrape:person eddard-stark      # one person
bun run scrape:north  --all             # bulk-seed all known Northern entities
```

**Mechanics:**

- Hits AWOIAF via the **MediaWiki API** (`action=parse&format=json`), not HTML
- Parses infobox into frontmatter; preserves body Markdown (headings, quotes), drops wiki-only markup
- Writes `content/{type}/{slug}.md` with `draft: true` and `sources[]` populated
- **Idempotent:** re-running merges new frontmatter, leaves body untouched unless `--force-prose`
- **Rate-limited:** 1 req/sec with exponential backoff
- **Cached:** raw API responses go to `.cache/` so parser iteration doesn't re-hit AWOIAF
- **Draft flow:** entries with `draft: true` are excluded from the production build but visible at `localhost:3000/_drafts`

**Pipeline shape: semi-automated.** Scraper handles facts (infoboxes, relations, citations); human handles voice and editorial choices on the prose body. LLM-assisted draft generation is *not* part of the production pipeline — too high a hallucination/canon-violation risk for unattended runs.

### Attribution (CC-BY-SA-4.0)

- Every content page footer auto-renders sources from frontmatter: "Sourced from A Wiki of Ice and Fire under CC-BY-SA-4.0 · [original]"
- Dedicated `/credits` page aggregates all source attributions across the site
- The site itself is shared under CC-BY-SA-4.0 to satisfy ShareAlike

## PWA & offline

- `next-pwa` plugin → service worker auto-generated at build
- **Cache strategy:**
  - App shell, fonts, map SVG → cache-first (won't change often)
  - Content pages → stale-while-revalidate
  - Images → cache-first with size cap
- **Manifest:** name, icons, theme color matched to parchment palette, `display: standalone`
- Subtle "Add to Home Screen" prompt on iOS Safari (dismissible, shown once)
- Works fully offline once a page has been visited

## Routing

All routes statically pre-rendered via `output: 'export'`.

```
/                              landing — region picker (only the North active at launch)
/the-north                     region home (defaults to Map view)
/the-north/timeline            timeline view
/the-north/houses              houses grid
/castles/{slug}                castle detail
/houses/{slug}                 house overview
/houses/{slug}/tree            family tree (full-screen)
/events/{slug}                 event detail (with mini-map)
/people/{slug}                 person detail
/credits                       attribution & sources
/_drafts                       dev-only, drafts list
```

Each content page emits meta tags, an OG image (auto-generated at build from sigil + title), and JSON-LD structured data. Sitemap.xml auto-generated.

## Project structure

```
game-of-thrones-atlas/
├── content/                    # the atlas data (Markdown + map)
│   ├── castles/                ├── houses/      ├── people/
│   ├── events/                 └── map/north.svg
├── lib/                        # build-time logic
│   ├── content.ts              # gray-matter + remark + slug resolution
│   ├── relations.ts            # builds the graph (sworn, parent-of, etc.)
│   ├── tree-layout.ts          # dagre layout for family trees
│   ├── search.ts               # build-time search index
│   └── schemas.ts              # zod frontmatter validation
├── components/
│   ├── MapStage.tsx            ├── MapMarker.tsx
│   ├── Timeline.tsx            ├── EraBand.tsx
│   ├── HouseCard.tsx           ├── FamilyTree.tsx     # react-flow wrapper
│   ├── PersonNode.tsx          ├── DropCap.tsx
│   ├── ParchmentLayout.tsx     ├── ModeToggle.tsx
│   └── Sources.tsx
├── app/                        # Next.js app router
│   ├── (site)/
│   │   ├── castles/[slug]/page.tsx
│   │   ├── houses/[slug]/page.tsx
│   │   ├── houses/[slug]/tree/page.tsx
│   │   ├── events/[slug]/page.tsx
│   │   └── people/[slug]/page.tsx
│   ├── the-north/page.tsx
│   ├── the-north/timeline/page.tsx
│   ├── the-north/houses/page.tsx
│   └── credits/page.tsx
├── scripts/
│   ├── scrape.ts               # entry + subcommand router
│   ├── scrape-castle.ts        ├── scrape-house.ts
│   ├── scrape-event.ts         ├── scrape-person.ts
│   └── lib/
│       ├── awoiaf.ts           # MediaWiki API client + cache
│       └── parse-infobox.ts
├── public/
│   ├── icons/                  └── manifest.webmanifest
├── styles/
│   ├── globals.css             └── parchment.css
├── next.config.js              # output: 'export', images.unoptimized: true
├── netlify.toml
└── package.json
```

## Testing posture (deliberately minimal)

- **Schema validation:** zod validates every frontmatter file at build — invalid file fails the build. Catches most real bugs.
- **Relation graph tests:** Vitest suite checking every `sworn-houses` reference resolves, no orphan slugs, no cycles in parent-child, every `location` slug exists.
- **No component unit tests.** Solo passive project; manual testing on real North data is faster feedback than maintaining a component suite.
- **Visual regression:** out of scope.

## Open questions / deferred decisions

These do not block planning, but will need answers before relevant work begins:

1. **Map sourcing.** No verified CC-licensed SVG of Westeros is currently known. Path forward: trace the North in Inkscape over a reference image, OR hunt for a community CC-BY SVG. The app shell can ship with a placeholder and the real map can be swapped in later without code changes.
2. **AWOIAF MediaWiki API access details.** Confirm the API endpoint, rate-limit policy, and User-Agent requirements before bulk scraping.
3. **OG image generation.** Decide whether to use `@vercel/og` (works in Next.js but adds a dependency) or pre-render OG images as part of the build script. Both fit static export.
4. **Domain name.** Out of scope for the spec but needed before deploy.
