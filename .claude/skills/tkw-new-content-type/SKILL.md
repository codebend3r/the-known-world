---
name: tkw-new-content-type
description: Use when adding a new content collection to this repo, or checking that an existing one is fully wired. Triggers include "add a prophecies content type", "new collection for religions/orders/ships", "scaffold content/X", "I added content/X but nothing renders", "why does /events 404", "the new section isn't in the nav or the menu", "is this collection wired up", "audit the collection wiring", or reviewing a change that introduces a `content/<name>/` directory.
---

# New Content Type

## Overview

A collection is not one feature. It is **23 required edits across 12 files in four layers**, and the build fails on none of them:

| Layer     | What a missing edit costs                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Data      | Loud. A bad schema throws at load, so the build stops.                                                      |
| Integrity | Silent. Cross-collection `mentions` stop being validated; broken slugs ship green.                          |
| Routes    | Silent. Next.js file routing makes an absent `app/<name>/page.tsx` a 404, never a build error.              |
| Discovery | Silent. No nav entry, no home tile, no drawer link; the pages exist but nothing on the site points at them. |

That asymmetry is the whole problem. `events` shipped **53 detail pages with 10 of the 23 touchpoints missing**, reachable only through inbound prose links, and CI stayed green over every commit from the day they landed.

`audit-wiring.ts` in this directory checks all 23 against every collection in `content/`. **Run it before you start and again before you commit.** It is read-only, discovers collections from the filesystem, and exits 1 on a gap.

## The touchpoint checklist

In dependency order. `<name>` is the plural directory name (`events`), `<Name>` the Pascal singular (`Event`), `<Names>` the Pascal plural (`Events`).

### Layer 1: data

| #   | File              | Add                                                                                                                                             | Audit id                                   |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `content/<name>/` | one `<slug>.md` per entry, filename matching frontmatter `slug`                                                                                 | `content-dir`                              |
| 2   | `lib/schemas.ts`  | `export const <Name>Schema = z.object({ ... })` reusing `DateSchema`, `SourceSchema`, `CoordsSchema`, `ParticipantSchema`; `export type <Name>` | `schema`, `schema-type`                    |
| 3   | `lib/content.ts`  | the name in **both** `type` unions (`loadFile` and `loadAll` each declare their own), then `load<Name>` and `loadAll<Names>`                    | `loader-union`, `loader-one`, `loader-all` |

### Layer 2: integrity

| #   | File                            | Add                                                                                          | Audit id                                                    |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 4   | `lib/content-integrity.ts`      | a `Collections` key, a `buildSlugSets` entry, and a walk validating every slug-bearing field | `integrity-collection`, `integrity-slugs`, `integrity-refs` |
| 5   | `lib/content-integrity.test.ts` | `loadAll<Names>()` in the `Promise.all` that feeds the checks                                | `integrity-test`                                            |

The `buildSlugSets` entry is the one people skip. It feeds `allEntitySlugs`, which is what every collection's `mentions` field resolves against. Without it, `mentions: [<a slug in the new collection>]` is reported missing everywhere in the corpus.

### Layer 3: routes

| #   | File                         | Add                                                                                                                                           | Audit id                                                                       |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 6   | `app/<name>/[slug]/page.tsx` | `generateStaticParams` filtering `draft`, `generateMetadata`, `notFound()` on a miss, `PlateLayout`, `<Sources />`, a back link to `/<name>/` | `detail-route`, `detail-static-params`, `detail-metadata`                      |
| 7   | `app/<name>/page.tsx`        | `export const metadata`, `<PlateLayout>`, `<PageHeading eyebrow="Collection NN" icon={sectionGlyphs.<name>} />`                               | `index-route`, `index-metadata`, `index-plate`, `index-heading`, `index-glyph` |
| 8   | the browse list              | either `components/Filtered<Name>List/` (4 files, `?search=` client list) or an inline list plus `app/<name>/page.module.scss`                | `index-list`                                                                   |

### Layer 4: discovery

| #   | File                                         | Add                                                            | Audit id                                                               |
| --- | -------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 9   | `components/SectionGlyphs/SectionGlyphs.tsx` | a 32x32 `currentColor` glyph keyed by the collection name      | `glyph`                                                                |
| 10  | `lib/nav.ts`                                 | `{ href: "/<name>/", label, visible }` in `NAV_ITEMS`          | `nav`                                                                  |
| 11  | `components/MainMenu/MainMenu.tsx`           | a `<MainMenuTile>` with the next `plate` number                | `home-tile`                                                            |
| 12  | `components/SiteMenu/SiteMenu.tsx`           | an `ART` entry keyed by href: `{ icon }`, `{ glyph }`, or both | `drawer-art`                                                           |
| 13  | `app/page.tsx`                               | bump the `NN collections` count to the new visible-tile total  | not audited; it is one global counter, not a per-collection touchpoint |

Step 9 comes before 11 and 12: `sectionGlyphs` is declared `satisfies Record<string, ReactNode>`, so `sectionGlyphs.<name>` does not typecheck until the glyph exists.

### Optional, pick deliberately

These are real splits in the existing seven, not oversights. The audit reports them as **variant** and never fails on them.

| Variant            | Who has it                                    | Take it when                                                                                               |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `filtered-list`    | characters, dragons, houses, weapons, events  | the collection is browsed by name; battles and castles group statically instead                            |
| `index-scss`       | battles, castles                              | the index renders its own list; a `Filtered*List` owns its styles                                          |
| `infobox`          | battles, dragons, houses, weapons             | entries have structured fields worth an aside                                                              |
| `prose-links`      | characters, dragons, houses, weapons          | bodies should auto-link here; `ProseLinkTarget["kind"]` in `lib/prose-links.ts` has to gain the kind first |
| `detail-back-link` | all but castles                               | always, in practice                                                                                        |
| `menu-icon`        | battles, characters, dragons, houses, weapons | painted drawer art exists; otherwise pass only a `glyph`                                                   |
| `nav-visible`      | all but dragons                               | the section is finished; `visible: false` parks a done section                                             |

## Conventions each touchpoint enforces

| Touchpoint       | Convention                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema           | kebab-case keys quoted (`"liege-house"`), arrays `.default([])`, `sources` and `draft` on every schema                                                  |
| Loaders          | `loadAll` returns `[]` for a missing directory, so a new collection is safe to wire before content lands                                                |
| Every route      | filter `draft` before rendering or generating params                                                                                                    |
| Index route      | `metadata.title` is `"<Names> · Atlas of the Known World"`; `PageHeading.subtitle` repeats `metadata.description`                                       |
| Plate numbers    | unique and shared: `eyebrow="Collection NN"` matches `MainMenuTile plate="NN"`. Maps 01 through Events 09; take the next                                |
| Trailing slashes | `trailingSlash: true`, so every href ends in `/`, including `NAV_ITEMS` and `ART` keys                                                                  |
| Filtered lists   | `"use client"`, `useQueryState("search", searchParser)`, a 300ms debounce, `filterByName`, `listSearch.module.scss` for the input row                   |
| Components       | four files: `Name.tsx`, `Name.module.scss`, `index.ts`, `Name.test.tsx`                                                                                 |
| SCSS             | tokens from `styles/globals.scss` only, `display: grid` with `gap`, no margins                                                                          |
| Tests            | co-located next to the source. `app/` routes have no tests anywhere in the repo; cover a route through its list component and through `lib/nav.test.ts` |

## Quick reference

```bash
# The conformance gate. Exit 1 on any required gap.
bun .claude/skills/tkw-new-content-type/audit-wiring.ts
bun .claude/skills/tkw-new-content-type/audit-wiring.ts --json

# Shape of the seven existing collections, to copy from
rg -n '"(battles|castles|characters|dragons|events|houses|weapons)"' lib/content.ts
rg -n 'eyebrow="Collection' app

# Verify. `check` is typecheck + lint:ts + lint:css + test.
bun run check
bun run build      # the only thing that proves the new routes prerender
```

## Common mistakes

| Mistake                                                          | What actually happens                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shipping the detail route, deferring the index route             | `/<name>/` is a 404, not a build error. This is the events bug: 53 pages, no way in.                                                                   |
| Trusting `bun run check` or `bun run build` to catch the gap     | Neither knows a route was meant to exist. Only the audit does.                                                                                         |
| Adding the loader but only one `type` union                      | `loadFile` and `loadAll` declare the union separately. Half the loaders stop compiling.                                                                |
| Skipping the `buildSlugSets` entry                               | Every `mentions` reference into the new collection reports as missing across the whole corpus.                                                         |
| Adding the walk but not the reference checks for each field      | Slug typos in the new frontmatter ship silently. Mirror what the sibling collection validates.                                                         |
| Adding the nav entry and stopping                                | The header rail and drawer link it; the home page Index still does not. Nav, tile, and ART are three separate tables.                                  |
| Reusing an existing plate number                                 | Plate numbers are the site's ordering. Take the next one and bump `NN collections` in `app/page.tsx`.                                                  |
| Writing an `ART` entry that names a PNG that does not exist      | `icon` is optional. Pass `{ glyph: sectionGlyphs.<name> }` alone rather than a dangling `/menu-icons/<name>.png`. `castles` still carries such a path. |
| Pointing the detail back link at a neighbouring section          | Events pointed at `/timeline/` because it had no index. Point it at `/<name>/`.                                                                        |
| Assuming a `Filtered<Name>List` is mandatory                     | Battles and castles use static grouped lists with a page-level `page.module.scss`. Both shapes pass.                                                   |
| Adding a `mentions` field without adding the kind to prose-links | `ProseLinkTarget["kind"]` is a closed union of four. Frontmatter `mentions` and prose auto-linking are separate systems.                               |
| Editing `MainMenu.tsx` or `SiteMenu.tsx` without their tests     | Both assert the exact href and label lists. So does `lib/nav.test.ts`.                                                                                 |

## Scope of the audit

The probes are **textual**: they prove a touchpoint is present, not that it is correct. A glyph that renders nothing, a schema field with the wrong type, or a `PageHeading` with a duplicated plate number all pass. `bun run check` and `bun run build` cover correctness; the audit covers presence, which is the part nothing else checks.

It reads sources rather than importing them, deliberately: most of this wiring lives in unexported object literals and JSX, and the audit has to run against a tree that does not typecheck yet.

## Related skills

- `tkw-content-triage`: what to populate once the collection is wired
- `tkw-sigil-audit`: the same silent-drift problem, for `public/sigils/`
- `tkw-image-optimize`: finds the dangling `/menu-icons/*.png` references this checklist can create
