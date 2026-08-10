# Baseline: tkw-populate-entry

**Date:** 2026-08-05
**Skill:** `.claude/skills/tkw-populate-entry/`
**Script:** `bun .claude/skills/tkw-populate-entry/audit-entries.ts`

The first run of the audit that ships with the skill, and the content work it produced. Scope is the five collections no populate skill covered: battles, castles, dragons, events, weapons (308 entries).

## Before

```
COLLECTION  ENTRIES  MEDIAN  EMPTY  STUB  THIN  UNSOURCED  DRAFT
battles     72       1406    0      0     0     6          0
castles     146      572     0      6     2     9          0
dragons     7        631     0      0     0     0          0
events      53       688     0      0     0     0          0
weapons     30       547     0      0     0     0          0

55 entries scored above zero. Showing 25.

#   SCORE  COLLECTION  SLUG                                BODY  SRC  GAPS
1   9      castles     deepwood-motte (stub)               116   NO   -
2   9      castles     bear-island (stub)                  127   NO   -
3   9      castles     casterly-rock (stub)                153   NO   -
4   9      castles     moat-cailin (stub)                  163   NO   -
5   9      castles     karhold (stub)                      171   NO   -
6   9      castles     last-hearth (stub)                  173   NO   -
7   5      castles     dragonstone (thin)                  210   NO   -
8   5      castles     highgarden (thin)                   219   NO   -
9   4      dragons     cannibal                            572   yes  house, riders, aliases, mentions
10  4      battles     century-of-blood                    1278  yes  region, participants, commanders, victor
11  4      battles     death-of-rhaenys-at-the-hellholt    1433  NO   victor
12  3      weapons     caggos-arakh                        408   yes  origin-house, current-house, mentions
13  3      weapons     the-just-maid                       448   yes  origin-house, wielders, mentions
14  3      castles     winterfell                          489   NO   -
15  3      weapons     catspaw-dagger                      790   yes  origin-house, current-house, wielders
16  3      battles     the-dragons-wroth                   1335  NO   -
17  3      battles     vulture-kings-uprising              1356  NO   -
18  3      battles     mutiny-at-crasters-keep             1359  yes  region, victor, outcome
19  3      battles     battle-beneath-the-gods-eye         1552  NO   -
20  3      battles     first-dornish-war-invasion          1768  NO   -
21  3      battles     faith-militant-uprising             1832  NO   -
22  3      battles     battle-of-meereen                   1865  yes  region, victor, outcome
23  3      battles     wars-of-the-first-men-and-children  1911  yes  region, commanders, victor
24  2      weapons     sandoqs-blade                       400   yes  origin-house, mentions
25  2      weapons     truth                               514   yes  origin-house, mentions
```

Two clusters, and they are the whole story:

1. **Six castle stubs** (116 to 173 non-whitespace characters against a collection median of 572), all six of them unsourced, all six major seats: Casterly Rock, Moat Cailin, and four northern houses' seats.
2. **Fifteen unsourced entries** (9 castles, 6 battles) whose bodies were otherwise complete. The `Sources` component rendered nothing on those pages.

Everything below score 5 was a field-level gap, and most of those turned out to be correct as written.

## What was populated

### Castles: 8 entries brought to full length, all sourced

| Slug             | Body before | Body after | Frontmatter changes                                            |
| ---------------- | ----------- | ---------- | -------------------------------------------------------------- |
| `moat-cailin`    | 163         | 1,029      | `features` (4 towers and causeway), `sources`                  |
| `bear-island`    | 127         | 811        | `features`, `sources`                                          |
| `last-hearth`    | 173         | 922        | `sources`                                                      |
| `deepwood-motte` | 116         | 865        | `features` (longhall, watchtower, godswood), `sources`         |
| `karhold`        | 171         | 936        | `founded` corrected to -1000 age-of-heroes, `sources`          |
| `casterly-rock`  | 153         | 1,069      | `features` extended (golden-gallery, stone-garden), `sources`  |
| `dragonstone`    | 210         | 1,087      | `founded` corrected to -314 BC, `features` extended, `sources` |
| `highgarden`     | 219         | 1,097      | `features` extended (three-singers), `sources`                 |

Each body is an opening paragraph plus two `## ` sections, the shape 69 of 146 castles already used. All eight are AWOIAF-sourced through the Wayback CDX pipeline (direct fetches are Cloudflare-blocked) and cite the canonical `awoiaf.westeros.org` URL.

Two `founded` corrections, both sourced:

- `karhold`: was `-2000 age-of-heroes legendary`. AWOIAF dates the castle to Karlon Stark "a thousand years ago", and `content/houses/karstark.md` already carried `-1000 age-of-heroes era`. The castle now matches its house.
- `dragonstone`: was `-200 BC era`. AWOIAF gives roughly 314 BC, two centuries before the Doom of 114 BC.

### Sources added to 7 complete entries

`winterfell` (castle), and 6 battles: `faith-militant-uprising`, `vulture-kings-uprising`, `battle-beneath-the-gods-eye`, `the-dragons-wroth`, `first-dornish-war-invasion`, `death-of-rhaenys-at-the-hellholt`.

Each AWOIAF article name was confirmed against the Wayback CDX index before being cited. `death-of-rhaenys-at-the-hellholt` has no dedicated article, so it cites `Meraxes`, which covers the death in full.

### One field gap closed

`death-of-rhaenys-at-the-hellholt` gained `victor: "Dorne"`, matching its own `participants[].side` label. The infobox now renders a Victor row.

## Deliberately left

| Finding                                                                                        | Why                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kings-landing`, `stoney-sept`, `ghaston-grey`, `queenscrown` missing `liege-house`            | None of the four is a house seat. King's Landing is the crown's, Ghaston Grey is a Dornish prison, Queenscrown is abandoned.                                   |
| 16 battles missing `region` (`century-of-blood`, `battle-of-meereen`, `war-for-the-dawn`, ...) | `landmassForBattle` in `lib/timeline.ts` treats any `region` as proof of Westeros. Adding one to an Essos or beyond-the-Wall battle moves the timeline column. |
| 9 battles missing `victor`                                                                     | Wars and campaigns that ended without a decisive winner. Inventing one would misstate canon.                                                                   |
| `cannibal` missing `house`, `riders`, `aliases`, `mentions`                                    | It is a wild dragon with no house and no rider. The gaps are the entry's content.                                                                              |
| Weapons missing `origin-house` (`caggos-arakh`, `sandoqs-blade`, `truth`, `lightbringer`)      | Essosi or legendary blades with no Westerosi house of origin.                                                                                                  |
| Weapons missing `wielders` (`brightroar`, `heartsbane`, `the-just-maid`, `lamentation`)        | Lost or ancestral blades whose named wielders have no character entry. Creating stub characters to satisfy the field would be worse.                           |
| All 920 character entries                                                                      | Covered by `tkw-populate-character` and ranked by `tkw-content-triage`. The audit deliberately excludes them.                                                  |

## After

```
COLLECTION  ENTRIES  MEDIAN  EMPTY  STUB  THIN  UNSOURCED  DRAFT
battles     72       1406    0      0     0     0          0
castles     146      593     0      0     0     0          0
dragons     7        631     0      0     0     0          0
events      53       688     0      0     0     0          0
weapons     30       547     0      0     0     0          0

40 entries scored above zero. Showing 10.

#   SCORE  COLLECTION  SLUG                                BODY  SRC  GAPS
1   4      dragons     cannibal                            572   yes  house, riders, aliases, mentions
2   4      battles     century-of-blood                    1278  yes  region, participants, commanders, victor
3   3      weapons     caggos-arakh                        408   yes  origin-house, current-house, mentions
4   3      weapons     the-just-maid                       448   yes  origin-house, wielders, mentions
5   3      weapons     catspaw-dagger                      790   yes  origin-house, current-house, wielders
6   3      battles     mutiny-at-crasters-keep             1359  yes  region, victor, outcome
7   3      battles     battle-of-meereen                   1865  yes  region, victor, outcome
8   3      battles     wars-of-the-first-men-and-children  1911  yes  region, commanders, victor
9   2      weapons     sandoqs-blade                       400   yes  origin-house, mentions
10  2      weapons     truth                               514   yes  origin-house, mentions
```

All five collections: zero empty bodies, zero stubs, zero thin bodies, zero unsourced entries, zero drafts. The 40 remaining findings are field-level only, and the top of that list is the deliberately-left set above.

Castle body distribution moved from min 116 / median 572 / max 748 to min 429 / median 593 / max 1,097.

## Notes for the next run

- The audit computes expected fields from each collection's own fill rate, so the bar moves as the corpus fills. Re-run it rather than working from this document.
- `bun run build` after content edits. The static export prerenders every entry, and a bad slug reference fails `lib/content-integrity.test.ts` first.
