# Baseline: prose-style

First run of `.claude/skills/prose-style/check-prose.ts` and the corpus-wide
fix that followed. Base commit `d11fcfd` (`origin/main`).

```bash
bun .claude/skills/prose-style/check-prose.ts
```

## Before

**452 violations across 245 of 1,696 files.**

| Kind             | Count | Note                                             |
| ---------------- | ----: | ------------------------------------------------ |
| `em-dash`        |   435 | U+2014                                           |
| `en-dash`        |     3 | U+2013, all three the year range `59` to `60 AC` |
| `bare-weapon`    |    14 | named blades the corpus italicises elsewhere     |
| `smart-quote`    |     0 |                                                  |
| `double-space`   |     0 |                                                  |
| `trailing-space` |     0 |                                                  |
| `non-ascii`      |     0 | four acute-accented `e` characters, all allowed  |

The corpus was clean on five of seven checks. All the drift sat in one
character, which is what made it worth a skill: the em dash is the strongest
surface marker of unedited model prose, and the repo owner bans it absolutely.

### By collection

| Collection   | Files | Files with a long dash | Long dashes | Bare weapons |
| ------------ | ----: | ---------------------: | ----------: | -----------: |
| `characters` |   920 |                    145 |         267 |            5 |
| `houses`     |   468 |                     36 |          85 |            5 |
| `events`     |    53 |                     38 |          70 |            0 |
| `castles`    |   146 |                      6 |           8 |            1 |
| `weapons`    |    30 |                      7 |           8 |            1 |
| `battles`    |    72 |                      0 |           0 |            1 |
| `dragons`    |     7 |                      0 |           0 |            1 |
| **Total**    | 1,696 |                    232 |         438 |           14 |

`events` was the worst by density: 38 of 53 entries, 72%. `battles` and
`dragons` had no dashes at all.

### Dashes inside frontmatter

Four entries carried a dash inside an `outcome:` string rather than in prose:

- `content/events/great-council-of-101.md`
- `content/events/house-of-the-undying.md`
- `content/events/birth-of-the-dragons.md`
- `content/events/death-of-jon-arryn.md`

All four were rephrased in place. No key, slug, or quoting style changed.

## What was fixed

**245 files changed, 282 lines rewritten, no lines added or removed.**

Every dash was rephrased in context, not substituted. The work was partitioned
into twelve disjoint file sets so no two editors touched the same file.

| Recast                       | Where it was used                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Parentheses                  | Paired asides interrupting a clause, and lists whose items already carried commas   |
| Comma                        | Appositive noun phrases renaming the thing before them                              |
| Semicolon                    | A complete independent clause following the dash                                    |
| Full stop and a new sentence | The same, where the sentence already carried three or more commas                   |
| The word "to"                | The three `59` to `60 AC` year ranges, matching the form already used in the corpus |

The 14 bare weapon mentions were wrapped in `_..._`: `Longclaw` (2),
`Orphan-Maker` (3), `Dark Sister` (5), `Lady Forlorn` (4).

Balance checks after the sweep: parentheses, underscores, and double quotes all
pair evenly in every body, and no doubled or orphaned punctuation was
introduced.

## Deliberate decisions

**Four recasts used a colon rather than one of comma, semicolon, parenthesis, or
full stop.** In `content/houses/gardener.md`, `content/characters/sharis-footly.md`
and `content/events/election-of-jon-snow.md` the dash introduced an enumeration
or a naming, where a comma would have flattened the umbrella term into another
list item and parentheses would have demoted the payload. Colons are already
house usage in `content/houses/blount.md` and `content/weapons/flaming-sword.md`.

**Some recasts added a two-word subject.** Splitting a sentence at a dash
sometimes leaves a fragment, so "It was", "He was", "They are" were supplied.
Every such case preserved the fact and the referent; none added, dropped, or
reordered information.

**Weapon names the corpus has never italicised were left bare.** `Heartsbane`,
`Oathkeeper`, `Widow's Wail`, `Red Rain`, `Nightfall`, `Truth`, `Lightbringer`,
`Hearteater`, `Lion's Tooth`, `Dragonbinder` and the rest appear bare
everywhere, so there is no established convention to enforce. Italicising them
is a content decision, not a drift fix, and is out of scope here.

**`Blackfyre`, `Dawn` and `Ice` are excluded from the weapon rule by the
collision filter**, because each also names a house, an era, a war, or a battle.
The consequence is visible and accepted: `content/houses/dayne.md` still writes
"the greatsword Dawn" bare while `content/characters/arthur-dayne.md` writes
`_Dawn_`. Enforcing italics on `Blackfyre` would have touched 134 bare
occurrences, almost none of them the sword.

**A weapon's own entry is never flagged.** No `content/weapons/*.md` body
italicises its own name. That is the measured convention, so `Brightroar` on
`content/weapons/brightroar.md` stays bare.

**Section headings are never flagged.** `## Lady Forlorn` in
`content/castles/hearts-home.md` is a label, not a mention in prose.

**Four acute-accented `e` characters were left in place**, in `tenne` and
`rayonne` (`content/houses/moss.md`, `content/houses/chester.md`) and `nee`
(`content/characters/minisa-whent.md`). Accented Latin letters are legitimate in
proper nouns and the checker allows them by design.

**No prose was improved beyond the flagged violations.** Wording, paragraphing,
italics, hyphens, and frontmatter structure are otherwise untouched.

## After

```
CLEAN. 1696 files scanned, no violations.
```

Exit code `0`. The checker is now suitable as a CI gate; wiring it into the
`check` script is left as a separate change.
