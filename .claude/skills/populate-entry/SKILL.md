---
name: populate-entry
description: Use when populating, filling in, or writing up a battle, castle, event, weapon, or dragon in this repo. Triggers include "populate Moat Cailin", "fill in `deepwood-motte.md`", "write up the Battle of the Green Fork", "seed Casterly Rock", "this castle page is a stub", "the battles have no sources", "which castles still need work", "what is missing on the weapon entries", or any request to turn a thin entry under `content/battles`, `content/castles`, `content/events`, `content/weapons`, or `content/dragons` into a full one. Characters and houses have their own populate skills.
---

# Populate Entry

## Overview

Two populate skills already cover 1,388 of the repo's 1,696 content entries: `populate-character` (920) and `populate-house` (468). The remaining five collections hold 308 entries and had no skill at all.

| Collection | Entries | Schema         | Detail renderer               | Infobox         |
| ---------- | ------- | -------------- | ----------------------------- | --------------- |
| `castles`  | 146     | `CastleSchema` | `app/castles/[slug]/page.tsx` | none            |
| `battles`  | 72      | `BattleSchema` | `app/battles/[slug]/page.tsx` | `BattleInfobox` |
| `events`   | 53      | `EventSchema`  | `app/events/[slug]/page.tsx`  | none            |
| `weapons`  | 30      | `WeaponSchema` | `app/weapons/[slug]/page.tsx` | `WeaponInfobox` |
| `dragons`  | 7       | `DragonSchema` | `app/dragons/[slug]/page.tsx` | `DragonInfobox` |

The research half of the job is identical across all five: one AWOIAF article, one `sources` entry, prose in the same in-universe maester's voice the house and character entries use. That is why this is one skill and not five. The frontmatter half is not identical: every collection has its own Zod schema in `lib/schemas.ts`, its own renderer, and its own set of fields that are empty on purpose.

**The core insight: an empty field is not automatically a gap.** Several schema fields are empty on every entry in their collection because nothing renders them, so filling one in is noise, not progress:

| Field                  | Filled | Why it stays empty                                                                   |
| ---------------------- | ------ | ------------------------------------------------------------------------------------ |
| `castles.sworn-houses` | 0/146  | Only `lib/relations.ts` reads it, and nothing in `app/` calls `buildRelationGraph`.  |
| `battles.mentions`     | 0/72   | `buildProseLinkIndex` never runs on a battle page, so `mentions` cannot do anything. |
| `events.participants`  | 0/53   | The event page renders subtitle, body, and sources. Nothing else.                    |
| `events.casualties`    | 0/53   | Same.                                                                                |

`audit-entries.ts` encodes this: a field only counts against an entry when the rest of its own collection fills it. Score is deviation from the collection norm, not distance from the schema.

## Step 1: run the audit

```bash
bun .claude/skills/populate-entry/audit-entries.ts
bun .claude/skills/populate-entry/audit-entries.ts --collection castles
bun .claude/skills/populate-entry/audit-entries.ts --limit 40 --json
```

Read-only, takes under a second, resolves `@/lib/content` through `tsconfig.json` paths so it reads the same loaders and schemas the site does.

```
#  SCORE  COLLECTION  SLUG                    BODY  SRC  GAPS
1  9      castles     deepwood-motte (stub)   116   NO   -
2  4      dragons     cannibal                572   yes  house, riders, aliases, mentions
```

| Column  | Meaning                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------- |
| `SCORE` | 10 empty body, 6 stub, 2 thin, plus 3 unsourced, plus 4 draft, plus 1 per missing expected field.  |
| `BODY`  | Non-whitespace characters. `(stub)` is 200 or fewer, `(thin)` is under half the collection median. |
| `SRC`   | Has at least one `sources` entry.                                                                  |
| `GAPS`  | Expected fields (filled on at least half the collection) that this entry leaves empty.             |

A score of 1 or 2 is usually correct as it stands. Verify against canon before filling: King's Landing has no `liege-house`, the Cannibal has no house and no rider, and battles fought in Essos have no `region` on purpose (see below).

## Step 2: match the body shape (measured across the corpus)

| Collection | Median body | Range           | Structure                                                               |
| ---------- | ----------- | --------------- | ----------------------------------------------------------------------- |
| `castles`  | 593         | 429 to 1,097    | Opening paragraph then one or two `## ` sections. 146/146 use headings. |
| `battles`  | 1,406       | roughly 3 paras | Plain paragraphs, no headings. 0/72 use headings.                       |
| `events`   | 688         | 1 paragraph     | One dense paragraph, no headings.                                       |
| `weapons`  | 547         | roughly 3 paras | Plain paragraphs, no headings.                                          |
| `dragons`  | 631         | 2 paragraphs    | Plain paragraphs, no headings.                                          |

Counts are non-whitespace characters. Castles are the only collection with `## ` sections: 77 entries carry one heading, 69 carry two. A lesser holdfast lands near 550, a great seat near 1,000. Anything past about 1,100 is longer than every other castle in the repo.

Voice notes, matching `harrenhal.md`, `dreadfort.md`, and `battle-of-the-blackwater.md`:

- Italicise book titles, dragon names, and named blades with `*asterisks*`.
- Straight quotes. No HTML. No headings outside castles.
- Name where, when, and who. Concrete beats atmospheric.
- Never invent canon. If AWOIAF does not record it, leave it out.
- No em dashes or en dashes anywhere in this repo.

Prose auto-linking runs on characters, houses, weapons, and dragons only. `app/castles/[slug]`, `app/battles/[slug]`, and `app/events/[slug]` call `renderMarkdown` without a `proseLinks` index, so nothing in those three bodies becomes a link. Write names freely there; also do not expect the reader to be able to click them.

## Step 3: frontmatter, per collection

Field names come straight from `lib/schemas.ts`. Shared enums: `era` is one of `dawn-age`, `age-of-heroes`, `long-night`, `andal-invasion`, `targaryen-conquest`, `roberts-reign`, `game-of-thrones`, `AC`, `BC`; `precision` is one of `exact`, `year`, `decade`, `era`, `legendary`; `region` is one of the nine slugs in `lib/regions.ts`.

**`precision: exact` is load-bearing.** `isApproximate` in `lib/battle-date.ts` treats anything other than `exact` as approximate and the timeline and infobox print a trailing asterisk. Use `exact` only for a year the source states outright.

### castles (`CastleSchema`)

| Field          | Required | Notes                                                                                    |
| -------------- | -------- | ---------------------------------------------------------------------------------------- |
| `type`         | yes      | `castle` (113) `ruin` (20) `town` (9) `holdfast` (2) `watchtower` (2).                   |
| `coords`       | yes      | `{ x, y }` on the map image. Never guess; copy from a neighbouring castle if adding new. |
| `sub-region`   | no       | 146/146 carry it. Free text slug (`the-neck`, `wolfswood`), not a region enum.           |
| `liege-house`  | no       | 142/146. Must resolve to `content/houses/<slug>.md`.                                     |
| `founded`      | no       | 39/146. Keep it consistent with the holding house's own `founded`.                       |
| `features`     | no       | 43/146. Kebab-case names of places inside the walls (`lions-mouth`, `stone-drum`).       |
| `sworn-houses` | no       | Leave empty. See the overview table.                                                     |

The page renders name, type, `liege-house`, body, and sources. Nothing else appears. Note that the subtitle prints the raw slug: Casterly Rock reads "Castle · Seat of House lannister". That is `app/castles/[slug]/page.tsx`, not your frontmatter.

### battles (`BattleSchema`)

The most complex frontmatter in the repo, and every field below renders in `BattleInfobox`.

| Field            | Required | Notes                                                                                                          |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `type`           | yes      | `battle`, `siege`, `war`, `campaign`, `raid`, `naval`, `massacre`, `rebellion`, `mutiny`, `skirmish`, `other`. |
| `start`, `end`   | yes      | Both required even for a one-day battle; set them equal and `formatBattleWhen` collapses them to a year.       |
| `war`            | no       | 72/72. The campaign label, quoted free text, repeated verbatim across every battle in that war.                |
| `location`       | no       | 71/72. Free text, run through `titleCase` by the renderer. Not a slug.                                         |
| `region`         | no       | 56/72. **Absence is meaningful**, see below.                                                                   |
| `participants[]` | no       | 71/72. `{ side: "Iron Throne", houses: [targaryen] }`. `side` is a label; `houses` are slugs.                  |
| `commanders[]`   | no       | 65/72. Character slugs. Placeholder characters render unlinked.                                                |
| `victor`         | no       | 63/72. The winning `side` label, spelled the same way. Omit only when the outcome was genuinely undecided.     |
| `outcome`        | no       | 69/72. One sentence, present tense.                                                                            |
| `casualties[]`   | no       | 33/72. Character slugs. Renders as "Fallen".                                                                   |
| `aliases[]`      | no       | 23/72. Renders as "Also called".                                                                               |
| `mentions[]`     | no       | Leave empty. See the overview table.                                                                           |

**The `region` and Essos trap.** `landmassForBattle` in `lib/timeline.ts` puts a battle in the Westeros timeline column when it has any `region`, and otherwise checks a hardcoded `ESSOS_SLUGS` set. So an Essos battle needs **both** no `region` **and** an entry in `ESSOS_SLUGS`. Adding `region: crownlands` to `battle-of-meereen` to clear an audit gap would silently move it to the wrong column. Battles beyond the Wall and realm-wide wars correctly carry no `region` either.

### events (`EventSchema`)

| Field      | Required | Notes                                                                                                                        |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`     | yes      | `battle`, `siege`, `treaty`, `wedding`, `death`, `betrayal`, `founding`, `migration`, `legend`, `disaster`, `omen`, `other`. |
| `date`     | yes      | Single date, not a span.                                                                                                     |
| `location` | yes      | 53/53 store a **display string** ("King's Landing", "Vaes Dothrak"), never a slug.                                           |
| `landmass` | yes      | `westeros`, `essos`, `summer-isles`. This alone picks the timeline column; events need no `ESSOS_SLUGS`.                     |
| `outcome`  | no       | 53/53 carry it even though nothing renders it. Keep the convention.                                                          |

`buildRelationGraph` in `lib/relations.ts` keys `eventsByLocation` off `location` as though it were a castle slug. No entry stores a slug there, so that map is empty. Do not "fix" one entry to a slug; the page prints `location` verbatim in the subtitle.

### weapons (`WeaponSchema`)

| Field                 | Required | Notes                                                                                   |
| --------------------- | -------- | --------------------------------------------------------------------------------------- |
| `type`                | yes      | `sword`, `greatsword`, `longsword`, `dagger`, `axe`, `spear`, `bow`, `horn`, `other`.   |
| `material`            | yes      | `valyrian-steel`, `dragonglass`, `dragonbone`, `steel`, `other`.                        |
| `status`              | yes      | `extant`, `lost`, `destroyed`.                                                          |
| `current-house`       | yes      | Nullable and must be written out. `null` for a lost or destroyed blade.                 |
| `origin-house`        | no       | 24/30. House slug.                                                                      |
| `forged`, `destroyed` | no       | `destroyed` only for `status: destroyed`.                                               |
| `wielders[]`          | no       | 25/30. Character slugs, in historical order.                                            |
| `mentions[]`          | no       | 26/30. Widens the prose linker: a mentioned character also matches by first name alone. |

### dragons (`DragonSchema`)

Seven entries, all populated. Use this section when adding an eighth.

| Field             | Required | Notes                                                                           |
| ----------------- | -------- | ------------------------------------------------------------------------------- |
| `status`          | yes      | `extant`, `dead`, `lost`, `wild`.                                               |
| `hatched`, `died` | yes      | Nullable and must be written out. `died: null` for a living dragon.             |
| `house`           | yes      | Nullable. `null` for a wild dragon such as the Cannibal.                        |
| `color`, `size`   | no       | 7/7 carry both. `size` is `hatchling`, `young`, `mature`, `great`, `monstrous`. |
| `riders[]`        | no       | 6/7. Character slugs, in order.                                                 |

## Cross references are gated in CI

`lib/content-integrity.ts` fails `lib/content-integrity.test.ts` on any slug that does not resolve. Nothing here falls back gracefully.

| Field                                           | Must resolve to       |
| ----------------------------------------------- | --------------------- |
| `castles.liege-house`, `castles.sworn-houses`   | `content/houses/`     |
| `battles.participants[].houses`                 | `content/houses/`     |
| `battles.commanders[]`                          | `content/characters/` |
| `events.participants[].houses`                  | `content/houses/`     |
| `weapons.origin-house`, `weapons.current-house` | `content/houses/`     |
| `weapons.wielders[]`                            | `content/characters/` |
| `dragons.house`                                 | `content/houses/`     |
| `dragons.riders[]`                              | `content/characters/` |
| `weapons.mentions[]`, `dragons.mentions[]`      | any entity slug       |

Check before writing a slug: `ls content/houses/<slug>.md`. Do not create a stub in another collection just to satisfy a reference; drop the reference instead.

## Sourcing from AWOIAF

Direct fetches to `awoiaf.westeros.org` return 403 (Cloudflare), and `WebFetch` also refuses `web.archive.org`. Use the CDX pipeline from Bash:

```bash
curl -s "https://web.archive.org/cdx/search/cdx?url=awoiaf.westeros.org/index.php/Moat_Cailin&output=json&filter=statuscode:200&limit=-3"
curl -sL "https://web.archive.org/web/<timestamp>/https://awoiaf.westeros.org/index.php/Moat_Cailin" -o /tmp/x.html
textutil -convert txt -stdin -stdout < /tmp/x.html > /tmp/x.txt
```

- Query CDX first for a real `statuscode:200` timestamp. The shorthand `/web/2024/<url>` form can land on a snapshot that captured the block page.
- archive.org rate-limits hard. Interleave fetches with the writing work rather than looping; on failure retry once or twice a few seconds apart.
- CDX is also the cheapest way to confirm an article name exists before citing it.
- Cite the canonical URL, never the archive mirror:

```yaml
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Moat_Cailin
    license: CC-BY-SA-3.0
```

One AWOIAF source per entry is the convention. When no dedicated article exists, cite the nearest one that actually covers the subject (`Meraxes` for the death of Rhaenys at the Hellholt) rather than inventing a URL.

## Quick Reference

```bash
bun .claude/skills/populate-entry/audit-entries.ts                       # rank all five collections
bun .claude/skills/populate-entry/audit-entries.ts --collection battles  # one collection
bun .claude/skills/populate-entry/audit-entries.ts --limit 40 --json     # machine readable

ls content/houses/<slug>.md          # confirm a house slug before referencing it
ls content/characters/<slug>.md      # confirm a character slug

bun run test                         # includes lib/content-integrity.test.ts
bun run check                        # typecheck + lint:ts + lint:css + test
bun run build                        # static export; run it after touching content/
```

| Step | Action                                                     |
| ---- | ---------------------------------------------------------- |
| 1    | Run the audit, take the top of the list                    |
| 2    | Fetch AWOIAF through the CDX pipeline                      |
| 3    | Fill the collection's frontmatter, omitting empty arrays   |
| 4    | Verify every referenced slug exists                        |
| 5    | Write the body to the collection's measured shape          |
| 6    | Add the `sources` entry                                    |
| 7    | `bun run test`, then re-run the audit to confirm it clears |

## Common mistakes

| Mistake                                                           | Why it goes wrong                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Filling every empty field the schema allows                       | `sworn-houses`, `battles.mentions`, `events.participants`, and `events.casualties` are empty corpus-wide. |
| Adding `region` to an Essos battle to clear a gap                 | Moves it to the Westeros timeline column. `region` plus `ESSOS_SLUGS` decide the column together.         |
| Writing a castle slug into `events.location`                      | All 53 entries store a display string, and the page prints it verbatim.                                   |
| Putting `## ` headings in a battle, event, weapon, or dragon body | 0 of those 162 entries use headings. Only castles do.                                                     |
| Writing a castle body of three or four sections                   | The longest castle in the repo is 1,097 non-whitespace characters. Median is 593.                         |
| `precision: exact` on a legendary date                            | Drops the asterisk the timeline uses to mark approximate dates.                                           |
| Referencing a character or house slug that does not exist         | `lib/content-integrity.test.ts` fails the build. There is no graceful fallback here.                      |
| Expecting names in a castle or battle body to auto-link           | Those pages call `renderMarkdown` without a `proseLinks` index.                                           |
| Retrying plain `WebFetch` on awoiaf.westeros.org                  | Cloudflare 403s every page. Go straight to the CDX pipeline.                                              |
| Citing the `web.archive.org` URL in `sources`                     | The mirror is the fetch mechanism, not the citation.                                                      |
| `bun test` instead of `bun run test`                              | The script is `bun test --isolate --dots`; the bare form mis-reports the DOM suite.                       |
| Committing without `bun format`                                   | `oxfmt` covers `.claude/**/*.ts` and markdown, and CI fails on drift.                                     |

## Related skills

- `populate-character`, `populate-house`: the other two collections, same AWOIAF pipeline
- `content-triage`: ranks the 920 character entries, which this audit deliberately excludes
- `commit-format`, `pr-format`: the `TKW:` conventions for shipping the work
