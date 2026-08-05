---
name: tkw-content-populate
description: Use when populating, filling in, seeding, or writing up a house or a character in the-known-world repo — e.g. "populate House Crakehall", "fill in `crakehall.md`", "populate Eddard Stark", "seed Cersei", "write up Robert Baratheon" — i.e. turn a stub or thin `content/houses/<slug>.md` or `content/characters/<slug>.md` into a fully populated entry with AWOIAF-sourced frontmatter and a prose body.
---

# TKW Populate Content Entry

## Overview

`content/houses/` ships ~124 stubs and `content/characters/` ships ~288 entries. Populating one means filling its frontmatter from [AWOIAF](https://awoiaf.westeros.org) and writing a prose body in the in-universe maester's voice.

The workflow below is identical for both. The **field spec differs**, so read the matching reference before you touch the file:

| Entry type | Schema                                | Renderer                         | Field spec                           |
| ---------- | ------------------------------------- | -------------------------------- | ------------------------------------ |
| House      | `HouseSchema` in `lib/schemas.ts`     | `components/HouseInfobox.tsx`    | **`references/house-fields.md`**     |
| Character  | `CharacterSchema` in `lib/schemas.ts` | `app/characters/[slug]/page.tsx` | **`references/character-fields.md`** |

## Invariants

- **One entry per commit.** Never batch. Git history is the audit trail.
- **Don't commit until the user asks.** `CLAUDE.md` governs: no commits, pushes, branches, or PRs on your own initiative. When they do ask, follow `tkw-git-commit-and-pr-format`.
- **Run `bun run test`** before reporting done — the script is `bun test --isolate --dots`, and a bare `bun test` drops the isolation the suite is written against.
- **Never fabricate canon.** If AWOIAF doesn't record a field, leave it empty (`""`) or `null`. An invented motto or death scene is worse than a blank.

## The seven-step workflow

### 1. Read the existing file

```
content/houses/<slug>.md      or      content/characters/<slug>.md
```

Confirm it is a stub. For houses that means empty `seat`, `words`, `sigil.description`, and `year: 0`. For characters it means `born: null`, `died: null`, empty arrays, no body.

If the fields are already filled, **stop and ask** — the user may want an enhancement, not a populate. If the file doesn't exist at all, **stop and confirm the slug** before creating it; slug shape drives the family graph and the sigil allowlist.

### 2. Decide the shape

Houses have one shape. Characters have two — full character or placeholder — and picking wrong ships a broken family tree. See `references/character-fields.md` §"Full or placeholder".

### 3. Fetch the AWOIAF page

```
https://awoiaf.westeros.org/index.php/House_<Name>
https://awoiaf.westeros.org/index.php/<Name_With_Underscores>
```

Disambiguated articles use parens: `.../Lord_Bracken_(Hand_of_the_King)`. WebFetch the infobox plus the lede — one fetch resolves nearly every field. The reference file lists exactly what to pull.

### 4. Fill the frontmatter

Match the field order used across existing entries; the schema accepts any order but readers expect the conventional one. **Omit a key entirely when its value would be `[]`** — the schema defaults empty arrays. Don't write `parents: []` or invent a `seats:` array that just repeats `seat:`.

### 5. Wire the cross-references

Every slug you write points at another content file. Nothing validates these, but the renderers degrade visibly — a dangling slug leaks raw kebab-case into the page instead of a link.

| Field                                      | Points at                      | If missing                    |
| ------------------------------------------ | ------------------------------ | ----------------------------- |
| `seat`                                     | `content/castles/<slug>.md`    | humanized slug, no link       |
| `liege`, `cadet-houses[]`, `primary-house` | `content/houses/<slug>.md`     | raw slug as text, no link     |
| `also-of-houses[]`                         | `content/houses/<slug>.md`     | silently dropped              |
| `heads[].slug`                             | `content/characters/<slug>.md` | `name` renders plain, no link |
| `parents[]`, `spouses[]`, `children[]`     | `content/characters/<slug>.md` | raw slug as non-link text     |

`ls content/houses/`, `ls content/castles/`, `ls content/characters/` before guessing a slug. **Don't create stub files just to make a link work** — graceful fallback is the design — but do point at files that exist, or at placeholders you create in the same change.

### 6. Write the prose body

Two to three paragraphs after the closing `---`, separated by blank lines, in the in-universe maester's voice of _The World of Ice & Fire_. Length scales with importance; the reference file gives the per-tier sizing.

Style, both entry types:

- Straight quotes (`"`), em-dashes (`—`), no HTML, no headings inside the body.
- Italicize book titles, dragon names, and named weapons with `*asterisks*`: `*A Game of Thrones*`, `*Ice*`, `*Nymeria*`.
- Prefer concrete events over abstractions — "on the steps of the Great Sept of Baelor" beats "tragically".
- Never ship an empty body for a non-placeholder entry; the page renders the body as the article.

### 7. Add the source and verify

```yaml
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/<Article_Name>
    license: CC-BY-SA-3.0
```

One AWOIAF source is the convention, including for placeholders. Then:

```bash
bun run test
```

When the user asks for the commit, follow `tkw-git-commit-and-pr-format`:

```
TKW: populate `<slug>.md` from AWOIAF

- add sigil, words, seat, liege, founded date, status
- add `heads`, `titles`, `regions` info-entry arrays
- write 2-paragraph body covering founding and state at AGOT
```

## Shared date fields

Houses use `founded`; characters use `born` and `died`. All three take the same shape:

```yaml
year: <int> # negative for BC / pre-Conquest
era: <era-enum>
precision: <enum>
```

Allowed `era`: `dawn-age`, `age-of-heroes`, `long-night`, `andal-invasion`, `targaryen-conquest`, `roberts-reign`, `game-of-thrones`, `AC`, `BC`.
Allowed `precision`: `exact`, `year`, `decade`, `era`, `legendary`.

- Specific dated events (Baratheon founded 1 AC, Eddard born 263 AC) → `precision: year`.
- Ancient lines with a named-but-undated founder (Stark, Lannister, Hightower) → `precision: legendary`, era `age-of-heroes` or `dawn-age`, year the conventional rough estimate (`-8000`, `-10000`).
- "Around 200 AC" → `precision: decade`, `year: 200`.
- Unknown birth or death → the whole `born` / `died` key is `null`. There is no `precision: unknown`.
- `year: 0` is the house stub marker. Never leave it — pick a defensible number even if rough.

## Quick reference

| Step | Action                                                         |
| ---- | -------------------------------------------------------------- |
| 1    | Read the file, confirm it's a stub                             |
| 2    | House, full character, or placeholder                          |
| 3    | WebFetch the AWOIAF article                                    |
| 4    | Fill frontmatter per the reference file, omitting empty arrays |
| 5    | Verify every cross-referenced slug exists                      |
| 6    | Write the body, sized to importance                            |
| 7    | `bun run test`, then commit only when asked                    |

## Red flags — STOP and rewrite

| Thought                                                                                 | Reality                                                                                   |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "AWOIAF is slow, I'll write from training memory"                                       | No. Infobox + lede is one fetch and it is canonical. Verify before writing.               |
| "This minor entry has almost nothing on AWOIAF — let me invent a motto / a death scene" | No. Empty `words: ""` and `died: null` are correct answers. Don't fabricate canon.        |
| "The sigil description in my head is more vivid than AWOIAF's"                          | Use AWOIAF's phrasing, trimmed to charge-first, field-last. Vivid invention is non-canon. |
| "Founded `year: 0` is fine to keep"                                                     | No. `year: 0` is the stub marker. Replace it.                                             |
| "I'll set `born: 0` for an unknown birth"                                               | No. Unknown is `born: null`.                                                              |
| "I'll add `parents: []` to look complete"                                               | No. Omit keys whose value would be `[]`.                                                  |
| "I'll bundle three short entries in one commit"                                         | No. One entry per commit.                                                                 |
| "I'll mark it `draft: true` since the body is rough"                                    | No. Drafts aren't a workflow stage here. Polish it or don't ship it.                      |
| "I rewrote half the family graph / a dozen other stubs while I was in there"            | No. Drive-by edits ship separately.                                                       |
| "`bun test` is the right command"                                                       | No. `bun run test` — it adds `--isolate --dots`.                                          |
| "I'll add a `Co-Authored-By: Claude` trailer"                                           | No. `tkw-git-commit-and-pr-format` forbids it.                                            |
| "I'll work straight on `main` and commit when done"                                     | No. `CLAUDE.md` owns branching and committing — wait to be told.                          |

## Related skills

- `tkw-git-commit-and-pr-format` — the commit message for the populate
- `tkw-sigil-wiring` — registering a house's PNG so it stops rendering the regional fallback
