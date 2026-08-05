---
name: tkw-content-triage
description: Use when deciding which content entries to populate next in this repo. Triggers include "what should I write next", "which characters are still stubs", "how many placeholders are left", "find the empty entries", "what's worth populating", "prioritize the content backlog", "which stubs matter most", or any request to plan or batch a populating session rather than fill in one named entry.
---

# Content Triage

## Overview

`content/characters/` holds 920 entries and a large minority are unwritten. The hard part is not writing one entry, `tkw-populate-character` already does that. The hard part is that a raw count of unwritten entries is misleading in two directions at once, so picking targets by eye picks wrong.

`triage.ts` in this directory ranks the writable ones by how much the rest of the corpus already points at them. **It is read-only and modifies nothing.**

## The two counts that mislead

**Most "placeholders" are not backlog.** `placeholder-reason` splits into two populations that look identical to `grep`:

| Reason      | Count | Meaning                                                                     |
| ----------- | ----- | --------------------------------------------------------------------------- |
| `unnamed`   | 133   | A person the source material never named. Exists so a family tree connects. |
| `unwritten` | 23    | A named person nobody has written up yet.                                   |

An `unnamed` node is **correct as it stands**. No research populates "the daughter of Marla Prester" because she has no recorded name, deeds, or dates. Counting these as backlog invents ~130 tasks that cannot be completed. They are stored with a surname-only `name` (`name: Stark`), which is what gives them away.

**Not every stub is a placeholder.** Entries with `placeholder: false` and an empty body exist too. Filtering on the `placeholder` flag alone misses them.

Together: 202 character entries have thin or empty bodies, but only **72 are writable work** (18 empty, 54 stub). Run the script rather than trusting a `grep` count.

## Why demand ranking beats alphabetical

`buildProseLinkIndex` in `lib/prose-links.ts` drops any character whose frontmatter has `placeholder: true` or `draft: true`:

```ts
if (fm.placeholder || fm.draft) return [];
```

So prose auto-linking is **off** for every placeholder. When another entry's body says "Edmure Tully", the reader gets plain text, not a link. Populating that entry does two things at once: it fills the page, and it switches on auto-links to it from every body that already names it.

That makes "how many other entries name this person" a real measure of payoff, not a proxy. It is the `PROSE` column.

## Running it

```bash
bun .claude/skills/tkw-content-triage/triage.ts              # top 25
bun .claude/skills/tkw-content-triage/triage.ts --limit 40
bun .claude/skills/tkw-content-triage/triage.ts --state empty  # only zero-body entries
bun .claude/skills/tkw-content-triage/triage.ts --json         # machine-readable
```

Run from the repo root. It resolves `@/lib/content` through `tsconfig.json` paths, so it reads the same loaders and Zod schemas the site does. Takes under a second.

## Reading the output

```
#  DEMAND  REFS  PROSE  TREE  SLUG                       HOUSE
1  28      3     25     -     edmure-tully               tully
2  25      2     23     yes   brandon-stark-son-of-artos (stub)  stark
```

| Column   | Meaning                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REFS`   | Frontmatter links pointing here: `parents`, `spouses`, `children`, house `heads` and `notable-members`, weapon `wielders`, dragon `riders`, battle `commanders`, any `mentions`. Explicit editorial intent. |
| `PROSE`  | Other entries whose body names this character but cannot link to it yet. Latent links.                                                                                                                      |
| `DEMAND` | `REFS + PROSE`. The ranking key.                                                                                                                                                                            |
| `TREE`   | Has family edges, so the stub renders as a node readers traverse in `FamilyTree`.                                                                                                                           |
| `(stub)` | Body exists but is under 200 non-whitespace characters. Absent marker means the body is empty.                                                                                                              |

The `REFS` field list mirrors the character-slug references validated in `lib/content-integrity.ts`. **If a new character-referencing field is added to a schema, add it to `countStructuredReferences` too** or the ranking silently under-counts.

## Batching the work

The validated approach for runs of this size is sequential single-fork batches with a shared scratchpad file for cross-references, not one fork per entry in parallel. Populating is research-bound against AWOIAF, and parallel forks duplicate lookups and collide on the same house pages.

1. Pull a batch off the top: `--limit 10 --json`.
2. Populate each with `tkw-populate-character`.
3. Re-run the script. Demand shifts as you go: filling a hub entry adds its `mentions` and family edges, which raises neighbours.

Re-running between batches is the point. A static list from one run goes stale after the first few entries.

## Common mistakes

| Mistake                                             | Why it goes wrong                                                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Treating all 156 placeholders as backlog            | 133 are `unnamed` tree nodes. They are already correct.                                                                                      |
| Filtering only on `placeholder: true`               | Misses non-placeholder entries with empty bodies.                                                                                            |
| Prose-matching a surname-only name                  | `name: Stark` matches every body mentioning the house. The script suppresses forms that collide with a house name; do not remove that guard. |
| Clearing `placeholder: true` without writing a body | Turns on auto-linking to a page that is still blank, which is worse than no link.                                                            |
| Working alphabetically                              | `antario-jast` (demand 4) before `edmure-tully` (demand 28) spends the same effort for a fraction of the payoff.                             |

## Scope

The script ranks `content/characters/` only, because that is where the drift is. The other six collections are effectively fully populated: houses, dragons, events, and weapons have zero thin bodies; castles have 6. Those need sourcing attention rather than triage. For a whole-corpus completeness check use `bun run test`, which runs `lib/content-integrity.test.ts`.
