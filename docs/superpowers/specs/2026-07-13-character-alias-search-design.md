# Character alias search: Design Spec

**Date:** 2026-07-13
**Status:** Approved for implementation
**Scope:** `lib/search.ts`, `components/FilteredCharacterList/`,
`components/CharacterSearchInput/`, `app/characters/page.tsx`,
`app/characters/[slug]/page.tsx`, and a one-time bulk edit of `aliases:`
frontmatter across `content/characters/*.md`. No schema changes — the
`aliases: string[]` field already exists on `CharacterSchema`.

## Overview

Two related gaps:

1. Character search (`filterByName`) only ranks against `name`. A query like
   "kingslayer" or "imp" never surfaces Jaime or Tyrion, even though the
   `aliases` field exists precisely for this.
2. Of ~920 character files, only 236 have `aliases` populated. The other
   ~684 haven't been checked against their cited AWOIAF source for
   nicknames/bynames the field was designed to hold.

This spec covers making search alias-aware, and a one-time bulk audit to
fill in missing aliases from each character's already-cited AWOIAF source.

## Goals

- Typing a known nickname/alias/byname in the character search input (both
  the filter-mode index and the autocomplete combobox) finds the character.
- Name matches always outrank alias-only matches for the same query.
- Every character file with a citable AWOIAF source has its `aliases` field
  checked against that source and updated if it's missing known bynames.
- Existing curated aliases are preserved (union, not replace).

## Non-goals

- ❌ No schema change — `aliases: string[]` already exists on
  `CharacterSchema` and is already displayed (first entry only) on the list
  card, autocomplete option, and detail page.
- ❌ No change to what's _displayed_ — the character card/autocomplete still
  shows only the first alias as a `(Alias)` badge. Only the matching logic
  changes to consider the full array.
- ❌ No change to `houses`/`weapons`/`dragons` search behavior. `weapons` and
  `dragons` already have an `aliases` schema field but don't wire it into
  search today — out of scope here, since this task is about characters.
- ❌ No aliases invented from general knowledge — only names explicitly
  present on the character's cited AWOIAF page (infobox "Alias(es)" line or
  clearly-stated bynames in the lead prose) get added.
- ❌ No auto-commit. Edits land in the working tree for manual review.

## Part 1 — Search matching

`filterByName<T extends { name: string }>` in `lib/search.ts` becomes
`filterByName<T extends { name: string; aliases?: readonly string[] }>`.
Internally, each item's rank is
`min(rankOf(name, q), rankOf(bestAlias, q) + ALIAS_PENALTY)`, where
`rankOf` is the existing exact/prefix/word-start/substring tiering (0-3,
`Infinity` for no match) and `ALIAS_PENALTY` (4) guarantees any name match
outranks any alias-only match, while still beating `Infinity` (no match at
all) so alias-only hits surface. Items with no `aliases` (or an empty array)
behave exactly as before — this keeps `houses`/`weapons`/`dragons` call
sites unaffected since they never pass the field.

`CharacterItem` (`FilteredCharacterList`) and `CharacterSuggestion`
(`CharacterSearchInput`) each gain an `aliases: string[]` field alongside
the existing `alias: string | null` (kept as-is for the display badge).
`app/characters/page.tsx` and `app/characters/[slug]/page.tsx` pass
`c.frontmatter.aliases` through when constructing these.

Tests: extend `lib/search.test.ts` with cases for alias-only matches,
name-beats-alias tie-breaking, and the no-aliases-field backward
compatibility case. Extend `CharacterSearchInput.test.tsx` /
`FilteredCharacterList.test.tsx` if they cover search behavior today.

## Part 2 — Bulk alias audit

**Input list:** computed once, up front (plain script, not part of the
Workflow — Workflow scripts have no filesystem access), from
`content/characters/*.md`: `{ slug, filePath, existingAliases, awoiafUrl }`
for every file that cites a `type: awoiaf` source (~892 of 920). The ~28
files with no citable source are skipped and logged, not processed.

**Mechanism:** a `pipeline()` Workflow, one `agent()` per character
(concurrency auto-capped at 16). Each agent:

1. Fetches the character's cited AWOIAF URL.
2. Looks for an infobox "Alias(es)" entry and/or unambiguous bynames stated
   in the lead prose (e.g. "commonly called the Kingslayer").
3. Skips anything that's a formal title/style (already captured by the
   separate `titles` field) — only bynames/nicknames/alternate names belong
   in `aliases`.
4. If new aliases are found, edits that character's frontmatter `aliases:`
   array via a union with the existing list (preserve order of existing
   entries, append new ones, no duplicates) — matching the file's existing
   style convention (`The X` for epithets, bare short names like `Egg`).
5. Returns a small structured result: `{ slug, outcome: "added" | "unchanged" | "no-source-match" | "error", addedAliases }`.

After the pipeline completes, a final step logs a summary: counts per
outcome, and the full list of `error`/`no-source-match` slugs so those can
be spot-checked manually if desired.

**Cost expectation:** ~890 agent calls, each doing one web fetch. This is a
large, long-running operation (realistically tens of minutes, a large
token budget) — expected and accepted given the scope decision to audit
all characters rather than a hand-picked subset.

**Validation after the audit:** run `bun run lint` and the existing content
schema/integrity tests (`lib/schemas.test.ts`,
`lib/content-integrity.test.ts`) to confirm every edited file still
validates — these tests already run over all of `content/characters/`, so
no new test is needed to catch a malformed edit.

## Open risks

- **Hallucination risk** is mitigated by requiring each agent to actually
  fetch the page and only transcribe what's present, but isn't eliminated
  by an automated check — spot-checking a sample of "added" results after
  the run is worth doing before committing.
- **AWOIAF page drift/unavailability** for a handful of URLs is expected;
  those become `error` outcomes in the summary rather than blocking the run.
