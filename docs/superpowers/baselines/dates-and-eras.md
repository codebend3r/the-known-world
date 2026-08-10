# Dates and Eras: baseline run

Date: 2026-08-05
Skill: `.claude/skills/dates-and-eras/`
Gate: `lib/date-integrity.ts`, surfaced through `contentIntegrityErrors` and gated by `lib/content-integrity.test.ts`

## Corpus shape before the run

1,325 dated fields across seven collections: character `born` and `died`, castle `founded`, house `founded` and `extinct`, weapon `forged` and `destroyed`, dragon `hatched` and `died`, event `date`, battle `start` and `end`.

| Era                  | Dates | Year range on the axis |
| -------------------- | ----- | ---------------------- |
| `AC`                 | 784   | 1 to 700               |
| `age-of-heroes`      | 212   | -10000 to 0            |
| `andal-invasion`     | 182   | -6000 to -100          |
| `BC`                 | 103   | -4700 to 12000         |
| `dawn-age`           | 21    | -12000 to -200         |
| `targaryen-conquest` | 19    | -2 to 2                |
| `long-night`         | 4     | -8000 to 0             |

| Precision   | Dates |
| ----------- | ----- |
| `year`      | 519   |
| `legendary` | 268   |
| `era`       | 264   |
| `exact`     | 153   |
| `decade`    | 121   |

`roberts-reign` and `game-of-thrones` are in the enum and used zero times.

## Defects by class, before

99 defects. `bun .claude/skills/dates-and-eras/audit-dates.ts`:

| Class       | Count | What was wrong                                                             |
| ----------- | ----- | -------------------------------------------------------------------------- |
| `sign`      | 42    | `era: BC` storing a negative year, so `absoluteYear` put it on the AC side |
| `era-range` | 31    | The era did not contain the year on the axis                               |
| `precision` | 12    | `precision: exact` on entries citing no sources                            |
| `lineage`   | 11    | Children predating parents or born long after a parent's death             |
| `ordering`  | 3     | Terminal date before the date that opens it                                |
| `lifespan`  | 0     | Maester Aemon's 102 years is the corpus maximum, under the 110 bound       |
| `status`    | 0     | No entry carried a terminal date while its status said otherwise           |

### The root cause

The corpus held **two contradictory sign conventions for `BC`** and each was load-bearing in a different module.

- `absoluteYear` in `lib/battle-date.ts` returns `-d.year` for `BC`, so it needs a positive magnitude. All 32 battle `BC` dates and all 25 event `BC` dates already stored one, and the whole vertical timeline sorts on it.
- `ageAtDeath` in `lib/age.ts` subtracted the raw `year` fields, which only produces the right answer across the Conquest if `BC` years are stored negative. 42 dates, mostly characters and houses, stored them that way.

Both rendered correctly: `formatEraDate` and `eraYearLabel` both call `Math.abs`, so `{ year: -27, era: BC }` and `{ year: 27, era: BC }` print the identical "27 BC". Nothing on any page distinguished them.

## What was fixed, and how each correction was sourced

84 files changed: 48 houses, 17 characters, 6 battles, 4 weapons, 3 castles, 3 dragons, plus `lib/age.ts`, `lib/age.test.ts`, and `lib/content-integrity.ts`.

AWOIAF was read through the Wayback CDX plus `curl` plus `textutil` pipeline (direct fetches are Cloudflare-blocked).

### `sign`: 42 dates, mechanical

Every `era: BC` date storing a negative year was flipped to the positive magnitude. Rendered output is byte-identical; only `absoluteYear` changes, and it now agrees with the battles and events that were already correct.

The convention chosen is **`BC` stores a positive magnitude**, because that is what `absoluteYear` implements, what the majority of the corpus already did, and what the entire timeline sorts on.

That made `lib/age.ts` wrong, so it was changed to subtract `absoluteYear(died) - absoluteYear(born)` rather than the raw fields. Ages printed for the 42 flipped entries are unchanged; the four `BC` character dates that were already stored positive now compute correctly for the first time. `lib/age.test.ts` gained a two-BC-dates case and its crossing-the-Conquest case was restated in the corrected convention.

### `era-range`: 31 dates

Repaired by the rule the skill states: **fix the year when the era is sourced, fix the era when the year is sourced.**

Year kept, era moved to the one containing it (18 dates). No fact changed; the axis position is identical before and after.

| Entries                                                                            | Change                                        | Basis                                                      |
| ---------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `martell`, `allyrion`, `blackmont`, `gargalen`, `manwoody`, `merryweather` at -700 | `andal-invasion` to `BC`, year flipped to 700 | Dornish houses of Nymeria's arrival; -700 is post-invasion |
| `footly` at -500, `harroway` at -100                                               | `andal-invasion` to `BC`, sign flipped        | Prose puts both well after the invasion                    |
| `karstark` at -1000                                                                | `age-of-heroes` to `BC`, year flipped to 1000 | Prose: "founded a thousand years ago"                      |
| `amber`, `frost`, `greengood`, `greenwood`, `harclay` at -9000                     | `dawn-age` to `age-of-heroes`                 | First Men houses; -9000 is after the Pact                  |
| `woodfoot` at -8000, `wade` at -6000                                               | `dawn-age` to `age-of-heroes`                 | Same                                                       |
| `shell-dorne`, `lake-dorne` at -2500                                               | `dawn-age` to `age-of-heroes`                 | Prose: First Men houses of the Greenblood                  |

Era kept, year moved to that era's band marker (7 dates). The era is what the source states; the stored year was a placeholder.

| Entry                           | Was   | Now    | Basis                                                                     |
| ------------------------------- | ----- | ------ | ------------------------------------------------------------------------- |
| `weapons/dawn.forged`           | 0     | -10000 | AWOIAF: "possibly been wielded by Daynes for ten thousand years"          |
| `weapons/horn-of-winter.forged` | 0     | -8000  | Joramun, Age of Heroes; matches the corpus's legendary band marker        |
| `weapons/lightbringer.forged`   | 0     | -8000  | Azor Ahai during the Long Night                                           |
| `weapons/the-just-maid.forged`  | 0     | -8000  | AWOIAF: Galladon of Morne "a warrior from the Age of Heroes"              |
| `characters/night-king.born`    | 0     | -8000  | The Long Night, roughly 8,000 years before the Conquest                   |
| `houses/chester.founded`        | 0     | -5000  | Prose: Greenshield granted by Garth VII Gardener in the Age of Heroes     |
| `houses/osgrey.founded`         | -1000 | -8000  | Prose: "In the Age of Heroes the Osgreys were Marshals of the Northmarch" |
| `houses/greenfield.founded`     | -9000 | -10000 | Prose: "a relic of the Dawn Age, built before the Pact"                   |
| `houses/stout.founded`          | -100  | -2000  | Prose: "ancient First Men house"; era moved to `age-of-heroes` as well    |

One date corrected against a source rather than moved:

| Entry                     | Was      | Now             | Basis                                                                                                                                                         |
| ------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `houses/manderly.founded` | `700 AC` | `1000 BC` (era) | AWOIAF: Yandel and Wylla Manderly both date the flight north to "a thousand years before the Conquest". `700 AC` is four centuries after the story's present. |

### `lineage`: 11 findings

Six were symptoms of the sign class (Maegor, Aenys twice, Lyman Lannister, Argella Durrandon) and cleared once the signs were flipped. Two more cleared once the audit's precision-aware tolerance was applied, which is the point of the tolerance: `jeyne-poole`/`vayon-poole` and `daemon-sand`/`ryon-allyrion` are both `decade`-precision guesses whose gap is inside the slack.

Three needed real corrections:

| Entry                                  | Was             | Now               | Basis                                                                                               |
| -------------------------------------- | --------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `characters/viserys-ii-targaryen.born` | `125 AC` (year) | `122 AC` (year)   | AWOIAF infobox: born 122 AC. Cleared both the Aegon IV and Aemon the Dragonknight findings at once. |
| `characters/tygett-lannister.died`     | `282 AC` (year) | `285 AC` (decade) | AWOIAF: "In or after 285 AC". The old value put Tyrek's birth four years posthumous.                |

### `precision`: 12 dates

Six battles claimed `precision: exact` on both endpoints of multi-year wars while citing no source: the Faith Militant Uprising (41 to 48 AC), the First Dornish War (4 to 13 AC), the Dragon's Wroth (10 to 13 AC), the Vulture King's Uprising (4 to 5 AC), the Battle Beneath the God's Eye, and the Death of Rhaenys at the Hellholt. `exact` is the only value `isApproximate` treats as pinned, so `formatBattleWhen` was printing "4 to 13 AC" with no asterisk for a decade-long war. All twelve were loosened to `year`.

### `ordering`: 3 findings

`rhaenys-targaryen`, `balerion`, and `meraxes` all cleared once their `BC` signs were flipped. None was a genuinely reversed pair.

## Loosened rather than guessed

Where AWOIAF gives a window instead of a year, the window was honoured by widening `precision`. No year was invented to close one.

| Entry                                                  | Source says          | Recorded as       | Note                                                                                                                            |
| ------------------------------------------------------ | -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `characters/aerion-targaryen-lord-of-dragonstone.died` | "In 27 to 2 BC"      | `15 BC` (decade)  | Was `27 BC` (year), the near edge of a 25-year window asserted as fact. That made his daughter Rhaenys posthumous by two years. |
| `characters/daeron-targaryen-son-of-maekar.died`       | "221 to 233 AC"      | `227 AC` (decade) | Was `209 AC` (year), which predates his daughter Vaella's canon birth in 222 AC by thirteen years.                              |
| `characters/tygett-lannister.died`                     | "In or after 285 AC" | `285 AC` (decade) | A floor, not a year                                                                                                             |
| `characters/vayon-poole.born`                          | "275 AC or before"   | `275 AC` (decade) | Year unchanged; only the precision claim was wrong                                                                              |

Six house dates had neither a sourced year nor a sourced era. Those took their era's band marker with `precision: era`, which states plainly that the number marks a band: `houses/inchfield.founded` and both ends of `houses/shell-vale`.

## Defects by class, after

```
$ bun .claude/skills/dates-and-eras/audit-dates.ts
0 date defects in all collections.
```

99 to 0.

## What now gates it

`lib/date-integrity.ts` holds the rules and `contentIntegrityErrors` returns them alongside the existing slug and cross-reference errors, so `lib/content-integrity.test.ts` fails CI on any new date defect. `lib/date-integrity.test.ts` covers each of the seven classes with synthetic fixtures parsed through the real Zod schemas, plus the wiring itself.

The audit script contains no rules of its own. It imports `dateIntegrityDefects` and only groups and prints, so a rule cannot exist in the report without also gating CI.

Constants worth knowing about, all exported and all tested:

| Constant                | Value                     | Why                                                                       |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `ERA_YEAR_BOUNDS`       | see the table in SKILL.md | Validity ranges, deliberately wider than `ERA_BANDS` in `lib/timeline.ts` |
| `PRECISION_SLACK_YEARS` | 0, 0, 5, 500, 1000        | Widening precision genuinely silences a borderline finding                |
| `MAX_LIFESPAN_YEARS`    | 110                       | Maester Aemon's 102 is the corpus maximum                                 |
| `MIN_PARENT_AGE_YEARS`  | 12                        |                                                                           |
| `MAX_POSTHUMOUS_YEARS`  | 1                         |                                                                           |

## Deliberate non-findings

- **27 houses have `status: extinct` and no `extinct` date.** That is a completeness gap, not a contradiction, and flagging it would bury the real defects. The `status` rule only fires the other way: a terminal date on an entry whose status says it never ended.
- **`decade` precision on years that are not multiples of ten.** 85 dates do this. `decade` means "within about ten years of this year", not "rounded to a decade", and the tolerance code treats it that way.
- **`andal-invasion` foundings at -1000.** The lower bound was set at -1000 rather than -2000 on purpose. The invasion's tail ran late in the Riverlands and the Vale, so foundings there are defensible; the ten entries at -700 and later are not.

## Follow-up left undone

`content/characters/daeron-targaryen-son-of-maekar.md` still says he was "carried off by the pox at nineteen" in its prose body, which no longer matches the corrected `died: 227 AC` (he was born 190 AC and died in his late thirties). The prose was left alone under the run's scope guard, which limited edits to date fields. It needs a one-clause correction.
