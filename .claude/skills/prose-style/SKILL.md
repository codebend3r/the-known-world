---
name: prose-style
description: Use when writing, editing, or reviewing prose bodies in `content/`, or when the corpus needs a typography pass. Triggers include "there are em dashes in the content", "clean up the punctuation", "check the prose style", "does this read like the rest of the corpus", "this entry sounds like a model wrote it", "the voice is off in this entry", "which entries have typographic drift", "add a style gate to CI", after a bulk populate run, or before merging a batch of new or rewritten entries.
---

# Prose Style

## Overview

1,696 markdown bodies were written across many populate sessions, and **nothing in the build or the test suite reads a single character of prose**. `lib/content-integrity.ts` validates slugs and cross-references. `lib/sigil-integrity.ts` validates art. Zod validates frontmatter shape. Punctuation is unchecked, so it drifted, and it drifted in exactly one direction.

Measured across all seven collections before this skill landed:

| Check                                   | Result               |
| --------------------------------------- | -------------------- |
| Long dashes (em U+2014, en U+2013)      | 438 across 232 files |
| Smart quotes and primes                 | 0                    |
| Double spaces between words             | 0                    |
| Trailing whitespace                     | 0                    |
| Non-ASCII beyond accented Latin letters | 0                    |
| Named weapons left unitalicised         | 14                   |

That shape is the whole insight. The corpus is not sloppy: it is clean on every axis but one. 435 of the 438 long dashes were em dashes, and the em dash is the single strongest surface marker of unedited model prose. The repo owner bans both dashes absolutely, in content and in code, so every one of them was a live violation that no gate would ever have caught.

`check-prose.ts` in this directory finds them. **It is read-only and rewrites nothing.** Removing a dash is a judgment call, not a substitution, which is why the script reports and stops.

## Where the drift sat

| Collection   | Files | Files with a long dash | Long dashes | Share of files |
| ------------ | ----: | ---------------------: | ----------: | -------------: |
| `events`     |    53 |                     38 |          70 |            72% |
| `weapons`    |    30 |                      7 |           8 |            23% |
| `characters` |   920 |                    145 |         267 |            16% |
| `houses`     |   468 |                     36 |          85 |             8% |
| `castles`    |   146 |                      6 |           8 |             4% |
| `battles`    |    72 |                      0 |           0 |             0% |
| `dragons`    |     7 |                      0 |           0 |             0% |

All three en dashes were in `content/characters/`, all three in the same year range (`59` to `60 AC`).

`battles` and `dragons` were already clean. They are the reference voice, not an accident of size. Read `content/battles/battle-of-the-blackwater.md` and `content/characters/jon-snow.md` before writing anything in this repo.

## The house voice

| Rule         | Detail                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register     | Third-person encyclopedia. Never "you", never "we", never address the reader.                                                                                  |
| Tense        | Past for history. Present for standing facts and for the state of the world at the opening of the books ("Bear Island is held by Jeor's sister").              |
| Hedging      | None. "It is said", "the maesters record", "the singers tell" are sourcing and are house style. "Perhaps", "arguably", "it seems" are hedging.                 |
| Italics      | `_underscore italics_` for named weapons, named dragons, and book titles (`_A Feast for Crows_`). Never asterisks; `remark` renders both, the corpus uses one. |
| Quotes       | Straight `"` and `'` only.                                                                                                                                     |
| Dashes       | Hyphens only. No em dash, no en dash, anywhere, including frontmatter strings.                                                                                 |
| Citation     | Facts come from AWOIAF. The `sources` frontmatter carries the citation; the prose never links out or names a URL.                                              |
| Paragraphing | Two to four long paragraphs for a populated entry, one for a thin one. No headings inside `content/characters/` or `content/houses/` bodies.                   |

## The violation classes

| Kind             | What it catches                                                  | What to do                                                                                |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `em-dash`        | U+2014                                                           | Rephrase, never substitute. See the next section.                                         |
| `en-dash`        | U+2013                                                           | Rephrase. A year range becomes "59 to 60 AC", the form the corpus already uses elsewhere. |
| `smart-quote`    | Curly quotes, low quotes, primes                                 | Swap for the straight equivalent. This one is a safe mechanical fix.                      |
| `double-space`   | Two or more spaces wedged between words                          | Collapse to one. Leading YAML indentation is never flagged.                               |
| `trailing-space` | Whitespace at end of line                                        | Strip it.                                                                                 |
| `non-ascii`      | Any codepoint outside ASCII that is not an accented Latin letter | Almost always a pasted ellipsis or a non-breaking space. Replace with the ASCII form.     |
| `bare-weapon`    | A named weapon the corpus italicises elsewhere, left bare here   | Wrap it in `_..._`.                                                                       |

The first six rules run over **frontmatter as well as body**. Four `content/events/` entries carried a dash inside an `outcome:` string. Rephrase the string exactly as you would prose; never touch a key, a slug, or the quoting style.

Accented Latin letters are allowed on purpose. The corpus legitimately carries an acute accent in `tenne`, `rayonne` and `nee`. Everything else outside ASCII is drift.

## Removing a dash without leaving a scar

Blind substitution is the failure mode. Replacing every dash with a comma manufactures comma splices and buries appositives inside sentences that already carry four commas. Work out what the dash is doing, then pick the mark that does the same job.

The banned character is written `[dash]` in the examples below so this file stays clean.

| What the dash is doing                                  | Recast with                                  |
| ------------------------------------------------------- | -------------------------------------------- |
| Introducing a noun phrase that renames what precedes it | comma                                        |
| Introducing a complete independent clause               | semicolon, or a full stop and a new sentence |
| Wrapping an aside mid-sentence (paired dashes)          | parentheses, or a comma on each side         |
| Introducing a list whose items already carry commas     | parentheses                                  |
| Marking a contrast or a turn                            | comma, or a full stop                        |
| Joining a year range                                    | the word "to"                                |

Worked examples, all taken from the fix:

**Appositive, so a comma.**

- Before: `when Lannister forces broke its walls [dash] the same column under Ser Gregor Clegane that took Barbara from the rubble.`
- After: `when Lannister forces broke its walls, the same column under Ser Gregor Clegane that took Barbara from the rubble.`

**Independent clause, so a semicolon.**

- Before: `The babe was frail in her cradle and tall in her childhood [dash] by sixteen she stood an inch short of six feet.`
- After: `The babe was frail in her cradle and tall in her childhood; by sixteen she stood an inch short of six feet.`

**Paired aside carrying its own commas, so parentheses.**

- Before: `She bore him five trueborn children [dash] Jonnel One-Eye, Edric, Lyanna, Barthogan Blacksword, and Brandon [dash] and through them every Stark of Winterfell descends.`
- After: `She bore him five trueborn children (Jonnel One-Eye, Edric, Lyanna, Barthogan Blacksword, and Brandon), and through them every Stark of Winterfell descends.`

**Sentence already comma-heavy, so break it.**

- Before: `held at the altar to ensure her vows came out right [dash] she was the youngest of the three so-called Black Brides he wed in one night.`
- After: `held at the altar to ensure her vows came out right. She was the youngest of the three so-called Black Brides he wed in one night.`

**Long trailing gloss, so fold it in rather than stack another clause.**

- Before: `reckoned the most beautiful of all the queen's daughters [dash] deep purple eyes, silver-gold hair, flawless white skin, a grace uncanny in one so young.`
- After: `reckoned the most beautiful of all the queen's daughters, with deep purple eyes, silver-gold hair, flawless white skin, and a grace uncanny in one so young.`

Rules of thumb:

- If the sentence already carries three or more commas, do not add a fourth. Break it or use parentheses.
- A new sentence may take a two-word subject ("It was", "He was", "They are") to stand up. That is a recast, not an invention.
- Never let the recast change who or what an appositive attaches to. That is the one way this edit silently changes a fact.
- Preserve meaning exactly. No facts added, dropped, or reordered.

## The weapon italics rule derives itself

The rule is not a hardcoded list. `buildWeaponRules` reads `content/weapons/` and keeps a name only when both hold:

1. Some body in the corpus already writes it as `_Name_`. That is what makes italics the established convention for that blade rather than the script's opinion.
2. The name does not appear inside the `name` or `aliases` of any non-weapon entry.

Condition 2 is what makes the check safe. It drops `Blackfyre` (House Blackfyre, three Blackfyre Rebellions, five Blackfyre pretenders), `Dawn` (the Great Empire of the Dawn, the War for the Dawn, and by extension every "Dawn Age") and `Ice` (the Battle of Ice). Without it the check would rewrite prose about houses, wars and eras as if it were prose about swords: `Blackfyre` alone appears bare 134 times and almost none of them are the sword.

What survives is eight surface forms, of which five ever fire: `Longclaw`, `Orphan-Maker`, `Dark Sister`, `Lady Forlorn`, and `Brightroar`.

Three further exclusions, all measured from the corpus rather than assumed:

- **A weapon's own entry is skipped.** No `content/weapons/*.md` body italicises its own name anywhere. That is the convention, not drift.
- **Headings are skipped.** `## Lady Forlorn` in `content/castles/hearts-home.md` is a section label.
- **Text already inside `_..._` is skipped**, including a name that falls inside a longer emphasis span.

Known limitation: a blade the corpus has never italicised is never flagged. `Heartsbane`, `Oathkeeper`, `Widow's Wail`, `Red Rain` and `Nightfall` are all bare everywhere, so the script has no evidence of a convention and stays quiet. Italicising them is a content decision, not a drift fix.

## Quick reference

```bash
# whole corpus, human-readable
bun .claude/skills/prose-style/check-prose.ts

# one collection at a time
bun .claude/skills/prose-style/check-prose.ts --collection houses

# machine-readable, for batching a fix
bun .claude/skills/prose-style/check-prose.ts --json

# grep-level spot check on a single file
grep -nP '[\x{2013}\x{2014}]' content/houses/stark.md
```

Run from the repo root. It resolves `@/lib/content` through `tsconfig.json` paths, so it reads the same loaders and Zod schemas the site does. It takes about a second over all 1,696 files.

Exit codes: `0` clean, `1` violations found, `2` bad `--collection` argument. The `1` is deliberate, so the command can be dropped into the CI `check` script as a gate once the corpus is clean.

Output is grouped by file with `line:column`, a kind, the offending text, and a 84-character window of context:

```
content/castles/claw-isle.md
    23:70   em-dash        "-"  ...over a castle famed for its treasures [dash] Myrish carpets, Valyrian glass...
```

## Batching a large fix

For a sweep on the scale of the original 232 files, partition by file and run parallel agents, one disjoint file set each. Files are independent, there is no shared state, and nothing needs a lock. Do not partition by violation: two agents editing different dashes in the same paragraph will clobber each other.

Re-run the checker after the sweep rather than trusting the reports. It is the only thing that counts.

## Common mistakes

| Mistake                                                         | Why it goes wrong                                                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sed`-ing every dash to a comma                                 | Manufactures comma splices and misattached appositives. Every one of the 438 needed reading.                                           |
| Substituting a dash with " - "                                  | A spaced hyphen is not a house-style mark and renders as a hyphen mid-sentence. Use a real punctuation mark.                           |
| Assuming a dash only appears in prose                           | Four `content/events/` entries had one inside an `outcome:` frontmatter string. The checker reads frontmatter for exactly that reason. |
| Treating a hyphen as a violation                                | `Orphan-Maker`, `silver-gold`, `master-at-arms` and every slug use hyphens. Only U+2013 and U+2014 are banned.                         |
| Fixing the dash and quietly polishing the surrounding sentence  | Balloons the diff and hides the real change from review. Change only what the checker flags.                                           |
| Adding an em dash to a SKILL.md, a commit message, or a PR body | The ban is absolute and applies to everything written in this repo, not only to `content/`.                                            |
| Italicising every weapon name found in prose                    | `Blackfyre`, `Dawn` and `Ice` are also a house, two eras and a battle. The collision filter exists for that; do not widen it by hand.  |
| Italicising a weapon on its own entry page                      | No weapon entry names itself in italics. That is the measured convention.                                                              |
| Expecting `bun run test` to catch any of this                   | It never has. The suite covers schemas, cross-references and sigils, and reads no prose.                                               |

## Related skills

- `populate-character` and `populate-house`: write the prose in the first place; both should be read alongside the voice table above
- `content-triage`: picks which entries to write next
- `sigil-audit`: the same read-only, report-and-stop shape applied to art wiring
