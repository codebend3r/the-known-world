# new-content-type baseline

First run of `bun .claude/skills/new-content-type/audit-wiring.ts` against `origin/main` (`d11fcfd`), and the fix that followed. The events detail route landed on 2026-07-04 in `4b6eb1c`; the gap survived every commit since.

## Before

23 required touchpoints per collection, 7 collections, 161 checks.

| Collection | Entries | Required | Missing                                                                                                             |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| battles    | 72      | 23/23    | -                                                                                                                   |
| castles    | 146     | 23/23    | -                                                                                                                   |
| characters | 920     | 23/23    | -                                                                                                                   |
| dragons    | 7       | 23/23    | -                                                                                                                   |
| events     | 53      | 13/23    | index-route, index-metadata, index-plate, index-heading, index-glyph, index-list, glyph, nav, home-tile, drawer-art |
| houses     | 468     | 23/23    | -                                                                                                                   |
| weapons    | 30      | 23/23    | -                                                                                                                   |

**10 gaps, all in `events`, all in the route and discovery layers.** Data and integrity were complete: `EventSchema`, `loadEvent`/`loadAllEvents`, the `Collections` key, the `buildSlugSets` entry, the shared `[...battles, ...events]` reference walk, and `loadAllEvents()` in `lib/content-integrity.test.ts` were all already there, and `app/events/[slug]/page.tsx` prerendered all 53 pages.

The result was 53 pages with no way in: `/events/` returned 404, no nav entry, no home tile, no drawer link. The only route to an event page was an inbound prose link from another entry's body. Nothing in `bun run check` or `bun run build` reports this, because Next.js file routing treats an absent `app/events/page.tsx` as "no route", never as an error.

Variant touchpoints before the fix:

| Variant          | battles | castles | characters | dragons | events | houses | weapons |
| ---------------- | ------- | ------- | ---------- | ------- | ------ | ------ | ------- |
| nav-visible      | yes     | yes     | yes        | -       | -      | yes    | yes     |
| filtered-list    | -       | -       | yes        | yes     | -      | yes    | yes     |
| index-scss       | yes     | yes     | -          | -       | -      | -      | -       |
| infobox          | yes     | -       | -          | yes     | -      | yes    | yes     |
| detail-back-link | yes     | -       | yes        | yes     | -      | yes    | yes     |
| prose-links      | -       | -       | yes        | yes     | -      | yes    | yes     |
| menu-icon        | yes     | -       | yes        | yes     | -      | yes    | yes     |

## Fixed

| Touchpoint       | File                                         | Change                                                                                                                                    |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `glyph`          | `components/SectionGlyphs/SectionGlyphs.tsx` | added `events: COMET`, a 32x32 `currentColor` line mark in the existing grammar                                                           |
| `index-route`    | `app/events/page.tsx`                        | new index, chronological, oldest first, matching how the timeline reads events                                                            |
| `index-metadata` | `app/events/page.tsx`                        | `metadata.title` / `metadata.description`, mirrored into `PageHeading.subtitle` as the siblings do                                        |
| `index-plate`    | `app/events/page.tsx`                        | `<PlateLayout>`                                                                                                                           |
| `index-heading`  | `app/events/page.tsx`                        | `<PageHeading eyebrow="Collection 09" />`, the next free plate number after Dragons 08                                                    |
| `index-glyph`    | `app/events/page.tsx`                        | `icon={sectionGlyphs.events}`                                                                                                             |
| `index-list`     | `components/FilteredEventList/`              | 4 files, following `FilteredDragonList`: `?search=` via nuqs, 300ms debounce, `filterByName`, `listSearch.module.scss` input row          |
| `nav`            | `lib/nav.ts`                                 | `{ href: "/events/", label: "Events", visible: true }`                                                                                    |
| `home-tile`      | `components/MainMenu/MainMenu.tsx`           | `<MainMenuTile ... plate="09" />`, plus `app/page.tsx` index count from `07 collections` to `08`                                          |
| `drawer-art`     | `components/SiteMenu/SiteMenu.tsx`           | `"/events/": { glyph: sectionGlyphs.events }`; `MenuArt.icon` became optional so the entry does not have to name art that was never drawn |

Two follow-ons in the same class:

- `app/events/[slug]/page.tsx` back link moved from `← Timeline` to `← All Events`. It pointed at a neighbouring section only because no index existed; the other five collections that carry a back link point at their own index.
- The index reproduces the battles index legend (`* approximate or legendary date`), because `formatBattleWhen` appends the asterisk for any non-`exact` precision and events share that date shape. It is computed from the filtered items, so a search that leaves only exact dates drops the legend.

### Tests added

| File                                                      | Covers                                                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/FilteredEventList/FilteredEventList.test.tsx` | 11 tests: default render, detail hrefs, labelled search, meta line composition, legend on and off, debounce, empty state, `?search=` hydrate/write/clear |
| `lib/nav.test.ts`                                         | 3 tests: every `NAV_ITEMS` href resolves to an `app/<segment>/page.tsx` on disk, the visible list including Events, Dragons still registered and hidden  |

The first of those nav tests is the regression gate for this exact bug class: any future nav entry without an index route now fails `bun run test`.

`app/` routes have no co-located tests anywhere in this repo, so the index route is covered through its list component and through `lib/nav.test.ts` rather than by breaking that convention.

Two existing suites asserted the old nav shape and were updated: `MainMenu.test.tsx` (7 tiles to 8) and `SiteMenu.test.tsx` (the href and label arrays).

## Deliberately left

| Finding                                                                                                  | Why it stays                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/nav.ts` has `{ href: "/dragons/", visible: false }`                                                 | Dragons is wired 23/23 and hidden on purpose. Hiding a finished section is a product decision, not a wiring bug. `lib/nav.test.ts` now pins it as intentional.                             |
| `castles` has no `detail-back-link`                                                                      | Real inconsistency, out of scope here. Recorded as a variant so the audit reports it without failing.                                                                                      |
| `castles` has no `infobox` and no `menu-icon`                                                            | Two of the four splits that are genuine design choices across the seven, not oversights.                                                                                                   |
| `components/SiteMenu/SiteMenu.tsx` points `/castles/` at `/menu-icons/castles.png`, which does not exist | Harmless today: castles also supplies a `glyph`, and `art?.glyph ?? <Image>` means the PNG is never requested. It is a dangling reference for `image-optimize` to sweep, not a wiring gap. |
| `events` has no `infobox` and no `prose-links`                                                           | Neither is required. Events carry no slug-bearing frontmatter beyond `participants[].houses`, and `ProseLinkTarget["kind"]` is a closed union of four that would have to widen first.      |
| The `NN collections` counter in `app/page.tsx` is not audited                                            | It is one global number, not a per-collection touchpoint. Listed as step 13 of the checklist instead.                                                                                      |

## After

| Collection | Entries | Required | Missing |
| ---------- | ------- | -------- | ------- |
| battles    | 72      | 23/23    | -       |
| castles    | 146     | 23/23    | -       |
| characters | 920     | 23/23    | -       |
| dragons    | 7       | 23/23    | -       |
| events     | 53      | 23/23    | -       |
| houses     | 468     | 23/23    | -       |
| weapons    | 30      | 23/23    | -       |

**0 gaps.** The audit exits 0.

Variant table after the fix, unchanged except for the four cells `events` gained:

| Variant          | battles | castles | characters | dragons | events | houses | weapons |
| ---------------- | ------- | ------- | ---------- | ------- | ------ | ------ | ------- |
| nav-visible      | yes     | yes     | yes        | -       | yes    | yes    | yes     |
| filtered-list    | -       | -       | yes        | yes     | yes    | yes    | yes     |
| index-scss       | yes     | yes     | -          | -       | -      | -      | -       |
| infobox          | yes     | -       | -          | yes     | -      | yes    | yes     |
| detail-back-link | yes     | -       | yes        | yes     | yes    | yes    | yes     |
| prose-links      | -       | -       | yes        | yes     | -      | yes    | yes     |
| menu-icon        | yes     | -       | yes        | yes     | -      | yes    | yes     |

### Verification

| Command                         | Result                                                                      |
| ------------------------------- | --------------------------------------------------------------------------- |
| `bun install --frozen-lockfile` | 207 packages                                                                |
| `bun format:check`              | 2076 files, all correctly formatted                                         |
| `bun run check`                 | exit 0: typecheck, `lint:ts`, `lint:css`, 661 pass / 0 fail across 68 files |
| `bun run build`                 | exit 0, 1,554 static pages, `/events` and `/events/[slug]` both prerendered |

**One caveat on the build, stated plainly.** The observed green build ran on the final application source, before two markdown files were added, one variant check was appended to `audit-wiring.ts`, and `oxfmt` reformatted the tree. `bun run check` was re-run after all of that and passed, and none of those later edits touch anything Next compiles. A confirming re-run was started and then abandoned: nine agents were building this repo concurrently, the machine sat at a load average above 150, and pages began failing the 60 second per-page budget for reasons unrelated to this diff. That re-run was never observed green and is not claimed as one. CI runs `bun run build` on every push, so the branch gets its uncontended build verification there.
