---
name: dates-and-eras
description: Use when authoring, correcting, or checking a date in this repo. Triggers include "what era should this be", "is this date right", "the timeline is stretched", "this entry sorts in the wrong place", "should this be BC or AC", "what precision do I use", "I only know roughly when this happened", "audit the dates", "check for bad dates", "died before they were born", "this character's age is wrong", or filling in any `born`, `died`, `founded`, `extinct`, `forged`, `destroyed`, `hatched`, `date`, `start`, or `end` field.
---

# Dates and Eras

## Overview

A date in this corpus is `{ year, era, precision }`, and the three parts are not independent labels on one fact. `year` and `era` are **two overlapping encodings of the same position in time**, and `precision` is a claim about how much of that position is real. Nothing validates that they agree.

Authoring one wrong throws nothing. `formatEraDate` prints the era label and `Math.abs(year)`, so a date with the sign inverted or the era mismatched **renders exactly as intended on the page**. Only the sort moves. That is why the corpus accumulated 99 defects across 1,325 dated fields before anyone noticed: every one of them looked correct on screen.

There are 1,325 dates across seven collections. `lib/date-integrity.ts` encodes the rules, `lib/content-integrity.test.ts` gates them in CI, and `audit-dates.ts` in this directory prints them grouped by class.

## The one axis everything sorts on

`absoluteYear` in `lib/battle-date.ts` is the whole ordering model:

```ts
export function absoluteYear(d: BattleDate): number {
  return d.era === "BC" ? -d.year : d.year;
}
```

Two rules fall straight out of that single line:

| Era             | How `year` is stored         | Example                                            |
| --------------- | ---------------------------- | -------------------------------------------------- |
| `BC`            | **Positive magnitude**       | 27 BC is `year: 27`, and lands at -27              |
| `AC`            | Positive year                | 299 AC is `year: 299`, and lands at 299            |
| Every named era | **Already-signed axis year** | Age of Heroes is `year: -8000`, and lands at -8000 |

So `BC` is the one era whose stored number is _not_ its axis position, and `targaryen-conquest` is the one era that straddles zero: `castles/harrenhal` is `{ year: -2, era: targaryen-conquest }` and the 18 houses chartered just after are `{ year: 1, era: targaryen-conquest }`.

**There is no year zero.** AC counts from 1, BC magnitudes count from 1, and 0 on the axis is Aegon's landing. A `year: 0` in any era is always a placeholder someone left behind, never a date.

Getting the sign wrong was the single largest defect class (42 of 99). It is invisible on the page and moves the entry to the far side of the Conquest in every sort.

## Which era to pick

**Use `BC` or `AC` whenever you can name a year.** The named eras are for entries where the source gives an era and nothing more. Reaching for `andal-invasion` on a date you can put in a year is what produced 21 of the 31 era-and-year disagreements.

| Era                  | Axis range       | Reach for it when                                       | Band marker when only the era is known |
| -------------------- | ---------------- | ------------------------------------------------------- | -------------------------------------- |
| `dawn-age`           | -12000 to -10000 | Before the Pact; children of the forest, the first men  | `-10000`                               |
| `age-of-heroes`      | -10000 to -2000  | First Men houses and heroes, pre-Andal Westeros         | `-8000` legendary, `-5000` era         |
| `long-night`         | -8100 to -7600   | The Long Night itself and what came out of it           | `-8000`                                |
| `andal-invasion`     | -6000 to -1000   | Andal houses of the Vale, Riverlands, Reach, Stormlands | `-2000`                                |
| `targaryen-conquest` | -3 to 3          | Aegon's landing through the crowning at Oldtown         | `1`                                    |
| `BC`                 | -12000 to -1     | Any year you can name before the Conquest               | not applicable                         |
| `AC`                 | 1 to 320         | Any year you can name after it                          | not applicable                         |
| `roberts-reign`      | 283 to 298       | Unused; 283 to 298 AC covers it better                  | not applicable                         |
| `game-of-thrones`    | 298 to 305       | Unused; 298 to 300 AC covers it better                  | not applicable                         |

The band markers are the corpus's own modes, not invention: 103 of the 128 `andal-invasion` era-precision dates sit at `-2000`, 75 of the 164 `age-of-heroes` legendary dates sit at `-8000`. **When only the era is known, use that era's band marker and set `precision` to `era` or `legendary`.** The number is then a marker for where the band sits, and the precision says so out loud. Picking a different round number instead is how you invent a fact.

The ranges overlap deliberately. The Age of Heroes runs on through the Andal invasion, so a founding at -4000 could honestly be either. Containment is the rule; derivation is not.

`ERA_BANDS` in `lib/timeline.ts` is a _different, narrower_ table. Those are the four grey label strips drawn beside the ancient stretch of the chart, and `age-of-heroes` there stops at -8000. Do not use it to decide whether a date is valid.

## Which precision to use

| You actually know                                         | `precision` | Effect                                                           |
| --------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| The source pins the year, and the entry cites that source | `exact`     | The only value that renders **without** a trailing asterisk      |
| The year, and only the year                               | `year`      | Renders with an asterisk; still yields a printed age             |
| Roughly when, inside about a decade                       | `decade`    | Asterisk; suppresses the printed age; buys ±5 years of tolerance |
| Only which era                                            | `era`       | Asterisk; the `year` is a band marker, not a claim               |
| Only that it happened in myth                             | `legendary` | Same, plus `formatEraDate` appends "(legendary)"                 |

**The decision rule: when the source is ambiguous, widen `precision`. Never narrow the ambiguity into a year you picked yourself.** That is the entire reason the enum has five values. AWOIAF gives Aerion Targaryen's death as "27 to 2 BC"; the corpus had `{ year: 27, era: BC, precision: year }`, which turned the near end of a 25-year window into a stated fact and made his daughter Rhaenys posthumous by two years. The honest record is `{ year: 15, era: BC, precision: decade }`.

`exact` is not a confidence signal. It is a rendering decision: `isApproximate` returns false only for `exact`, so `formatBattleWhen` drops the asterisk and asserts the span is pinned. Twelve battle dates claimed `exact` on multi-year wars while citing no source at all.

## What each consumer does with the result

| Module               | Reads                                                                                        | What a bad date does there                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/era-date.ts`    | `era` and `Math.abs(year)`; `precision` only to append "(legendary)"                         | **Nothing.** It prints the intended label over the wrong number. This module is why defects survive review.                    |
| `lib/battle-date.ts` | `absoluteYear` for sorting; `precision` through `isApproximate`                              | A sign error relocates the entry across the Conquest. `formatBattleWhen` still prints the right years, so the list looks fine. |
| `lib/age.ts`         | Both dates must be `AC`/`BC` with `year` or `exact` precision, then subtracts `absoluteYear` | Returns `null` and the age vanishes from the page. Loosening `year` to `decade` deliberately removes a printed age.            |
| `lib/timeline.ts`    | `absoluteYear(battle.start)` and `absoluteYear(event.date)` for y placement and clustering   | `minYear` floors to the nearest 1000 and `PX_PER_YEAR` is 2, so one stray ancient date adds thousands of pixels of empty page. |

`ageAtDeath` subtracts `absoluteYear`, not the raw `year` fields. Subtracting the raw fields reads a birth in 27 BC and a death in 37 AC as ten years apart, which is what the module did before the `BC` sign convention was made consistent.

## The defect classes

`audit-dates.ts` groups every finding into one of seven classes. Each maps to one repair.

| Class       | What it means                                                                 | The repair                                                                                       |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `sign`      | `AC` or `BC` with a year at or below zero                                     | Flip to the positive magnitude. Display is unchanged; only the sort moves.                       |
| `era-range` | The era does not contain the year on the axis                                 | Move whichever one the source does **not** support. See the rule below.                          |
| `ordering`  | A terminal date falls before the date that opens it                           | Check for a `sign` defect on either endpoint first; most inversions are sign errors in disguise. |
| `lifespan`  | `ageAtDeath` would print more than 110 years                                  | One of the two years is a typo. Maester Aemon's 102 is the corpus maximum.                       |
| `lineage`   | A child predates a parent by 12 years, or outlives their death by more than 1 | Correct against the source, or widen `precision` on whichever date is the guess.                 |
| `status`    | A terminal date on an entry whose `status` says it never ended                | Either the date or the status is wrong; the prose usually says which.                            |
| `precision` | `precision: "exact"` with nothing in `sources`                                | Loosen to `year`, or add the citation that supports the claim.                                   |

**The `era-range` repair rule: fix the year when the era is sourced, fix the era when the year is sourced.** House Osgrey's prose says "In the Age of Heroes the Osgreys were Marshals of the Northmarch", so the era stands and the year moves to the band marker. House Karstark's prose says "founded a thousand years ago", so the year stands at -1000 and the era moves to `BC`. When neither is sourced, take the era's band marker and widen `precision`.

Moving a named era to `BC` **must flip the sign**: `{ year: -700, era: andal-invasion }` becomes `{ year: 700, era: BC }`. Both sit at -700 on the axis. Forgetting the flip trades an `era-range` defect for a `sign` defect.

`ordering`, `lineage`, and `lifespan` are precision-aware. `PRECISION_SLACK_YEARS` gives `decade` ±5 years and `era`/`legendary` hundreds, so widening precision genuinely silences a borderline finding rather than papering over it. `lifespan` uses the same gate as `lib/age.ts`: if no age would print, no age is checked.

## Quick reference

```bash
# every defect, grouped by class
bun .claude/skills/dates-and-eras/audit-dates.ts

# one collection: battles castles characters dragons events houses weapons
bun .claude/skills/dates-and-eras/audit-dates.ts --collection houses

# machine-readable, for batching repairs
bun .claude/skills/dates-and-eras/audit-dates.ts --json

# what CI runs; date defects surface through contentIntegrityErrors
bun run test
bun test lib/date-integrity.test.ts
```

```yaml
# a year you can name, from a source that pins it and is cited
born: { year: 262, era: AC, precision: year }

# 27 BC: positive magnitude, never -27
born: { year: 27, era: BC, precision: year }

# the source gives a window, not a year
died: { year: 15, era: BC, precision: decade }

# the source gives an era and nothing more: band marker plus era precision
founded: { year: -2000, era: andal-invasion, precision: era }

# myth, with no year behind it at all
forged: { year: -8000, era: age-of-heroes, precision: legendary }
```

The audit is read-only. Report the findings and the repair for each; do not widen `ERA_YEAR_BOUNDS` or drop a rule to make the suite green.

## Common mistakes

| Mistake                                                    | Why it goes wrong                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Writing `year: -27` for 27 BC                              | `absoluteYear` negates `BC`, so this lands at +27, i.e. 27 AC. `formatEraDate` still prints "27 BC", so the page looks right.                   |
| Writing `year: 8000` for the Age of Heroes                 | Named eras store the signed axis year. It needs `-8000`. Only `BC` uses a magnitude.                                                            |
| Trusting the rendered page to catch a date error           | `formatEraDate` and `eraYearLabel` both call `Math.abs`. Sign errors are invisible there by construction.                                       |
| Leaving `year: 0` with a real era                          | Zero is Aegon's landing. Six entries had it, including Dawn and Lightbringer, which put two legendary weapons on the Conquest year.             |
| Picking a plausible-looking year for an undated entry      | Use the era's band marker with `precision: era` or `legendary`. A specific-looking number with `precision: era` beside it is still a lie.       |
| Using `precision: exact` to mean "I am confident"          | It means the source pins it and the entry cites the source. It is the only value that renders without an asterisk.                              |
| Using `roberts-reign` or `game-of-thrones`                 | Both are in the enum and neither is used anywhere in the corpus. `283 AC` and `299 AC` say the same thing and sort correctly.                   |
| Validating a date against `ERA_BANDS` in `lib/timeline.ts` | Those are the chart's four label strips, deliberately narrower. `ERA_YEAR_BOUNDS` in `lib/date-integrity.ts` is the validity table.             |
| Adding a rule to `audit-dates.ts`                          | The script only prints. Rules belong in `lib/date-integrity.ts` so CI enforces them; a rule that lives only in the script never gates anything. |
| Fixing an `ordering` defect by swapping the two dates      | Check both endpoints for a `sign` defect first. All three baseline inversions were sign errors, not reversed pairs.                             |
| Changing `lib/age.ts` to subtract raw `year` fields        | It must map through `absoluteYear` or every life spanning the Conquest is off by twice the BC magnitude.                                        |

## Related

- `docs/superpowers/baselines/dates-and-eras.md`: the 99-defect baseline run and how each correction was sourced
- `docs/superpowers/specs/2026-07-03-vertical-timeline-design.md`: why `absoluteYear` exists and what the y-axis does with it
- `populate-character` and `populate-house`: the AWOIAF pipeline for sourcing a date in the first place
